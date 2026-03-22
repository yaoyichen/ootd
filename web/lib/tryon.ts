import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { TRYON_NEGATIVE_PROMPT, buildTryonPrompt } from "./prompts/tryon";

const API_KEY = process.env.DASHSCOPE_API_KEY ?? "";
const MODEL = process.env.TRYON_MODEL ?? "qwen-image-2.0";

// Models using the async image2image endpoint (submit + poll)
const ASYNC_MODELS = new Set(["wan2.5-i2i-preview"]);

const MULTIMODAL_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
const IMAGE2IMAGE_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis";
const TASK_URL = (taskId: string) =>
  `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // ~3 minutes

export function resolveImage(input: string): string {
  if (input.startsWith("data:") || input.startsWith("http")) return input;
  const absPath = path.join(process.cwd(), "public", input);
  if (!fs.existsSync(absPath)) throw new Error(`Image not found: ${input}`);
  const ext = path.extname(absPath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const data = fs.readFileSync(absPath).toString("base64");
  return `data:${mime};base64,${data}`;
}

async function downloadImage(url: string): Promise<string> {
  const outDir = path.join(process.cwd(), "public", "uploads", "outfits");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = url.includes(".png") ? ".png" : ".jpg";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, buffer);

  return `/uploads/outfits/${filename}`;
}

interface TryonInput {
  personImagePath: string;
  topImagePath?: string | null;
  bottomImagePath?: string | null;
  personImageId: string;
  topItemId?: string | null;
  bottomItemId?: string | null;
  userId: string;
}

interface TryonResult {
  imagePath: string;
  outfitId: string;
  isFavorite: boolean;
  cached: boolean;
}

/**
 * Sync call via multimodal-generation endpoint (qwen-image-2.0 / qwen-image-2.0-pro)
 */
async function callMultimodal(images: string[], prompt: string): Promise<string> {
  const content: { image?: string; text?: string }[] = images.map((img) => ({ image: img }));
  content.push({ text: prompt });

  const res = await fetch(MULTIMODAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: { messages: [{ role: "user", content }] },
      parameters: {
        n: 1,
        size: "768*1152",
        negative_prompt: TRYON_NEGATIVE_PROMPT,
        prompt_extend: false,
        watermark: false,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok || data.code) {
    throw new Error(data.message || "图像生成失败");
  }

  const imageUrl = data.output?.choices?.[0]?.message?.content?.find(
    (c: { image?: string }) => c.image
  )?.image;

  if (!imageUrl) throw new Error("响应中未找到生成图片");
  return imageUrl;
}

/**
 * Async call via image2image endpoint (wan2.5-i2i-preview)
 * Submit task → poll until SUCCEEDED
 */
async function callImage2Image(images: string[], prompt: string): Promise<string> {
  const submitRes = await fetch(IMAGE2IMAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({
      model: MODEL,
      input: {
        images,
        prompt,
        negative_prompt: TRYON_NEGATIVE_PROMPT,
      },
      parameters: {
        n: 1,
        size: "768*1152",
      },
    }),
  });

  const submitData = await submitRes.json();

  if (!submitRes.ok || submitData.code) {
    throw new Error(submitData.message || "图像生成任务提交失败");
  }

  const taskId = submitData.output?.task_id;
  if (!taskId) throw new Error("响应中未找到 task_id");

  console.log(`[Tryon] ${MODEL} 异步任务已提交, task_id: ${taskId}`);

  // Poll for result
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(TASK_URL(taskId), {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const pollData = await pollRes.json();
    const status = pollData.output?.task_status;

    if (status === "SUCCEEDED") {
      const resultUrl =
        pollData.output?.results?.[0]?.url ||
        pollData.output?.result_url ||
        pollData.output?.image_url;

      if (!resultUrl) throw new Error("任务成功但未找到结果图片 URL");
      return resultUrl;
    }

    if (status === "FAILED") {
      throw new Error(pollData.output?.message || "图像生成任务失败");
    }

    // PENDING / RUNNING — continue polling
  }

  throw new Error(`图像生成超时（已等待 ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s）`);
}

/**
 * Generate a tryon image. Returns cached result if one exists.
 * Automatically selects sync or async API based on TRYON_MODEL.
 */
export async function generateTryon(input: TryonInput): Promise<TryonResult> {
  if (!API_KEY) throw new Error("DASHSCOPE_API_KEY not configured");

  const topId = input.topItemId ?? null;
  const bottomId = input.bottomItemId ?? null;

  const existing = await prisma.outfit.findUnique({
    where: {
      personImageId_topItemId_bottomItemId: {
        personImageId: input.personImageId,
        topItemId: topId as string,
        bottomItemId: bottomId as string,
      },
    },
  });

  if (existing) {
    return {
      imagePath: existing.resultImagePath,
      outfitId: existing.id,
      isFavorite: existing.isFavorite,
      cached: true,
    };
  }

  const hasTop = !!input.topImagePath;
  const hasBottom = !!input.bottomImagePath;

  // Fetch item names for better prompt context
  let topName: string | undefined;
  let bottomName: string | undefined;
  if (topId) {
    const topItem = await prisma.item.findUnique({ where: { id: topId }, select: { name: true } });
    if (topItem) topName = topItem.name;
  }
  if (bottomId) {
    const bottomItem = await prisma.item.findUnique({ where: { id: bottomId }, select: { name: true } });
    if (bottomItem) bottomName = bottomItem.name;
  }

  if (!hasTop && !hasBottom) {
    throw new Error("至少提供一张服装图片");
  }

  // Resolve all images
  const images: string[] = [resolveImage(input.personImagePath)];
  if (hasTop) images.push(resolveImage(input.topImagePath!));
  if (hasBottom) images.push(resolveImage(input.bottomImagePath!));

  const prompt = buildTryonPrompt({ hasTop, hasBottom, topName, bottomName });

  // Dispatch to the right API based on model
  const isAsync = ASYNC_MODELS.has(MODEL);
  console.log(`[Tryon] model=${MODEL}, mode=${isAsync ? "async" : "sync"}`);

  const imageUrl = isAsync
    ? await callImage2Image(images, prompt)
    : await callMultimodal(images, prompt);

  const localPath = await downloadImage(imageUrl);

  const outfit = await prisma.outfit.create({
    data: {
      personImageId: input.personImageId,
      topItemId: input.topItemId || null,
      bottomItemId: input.bottomItemId || null,
      resultImagePath: localPath,
      userId: input.userId,
    },
  });

  return {
    imagePath: localPath,
    outfitId: outfit.id,
    isFavorite: false,
    cached: false,
  };
}
