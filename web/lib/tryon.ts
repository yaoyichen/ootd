import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { TRYON_NEGATIVE_PROMPT, buildTryonPrompt } from "./prompts/tryon";

const API_KEY = process.env.DASHSCOPE_API_KEY ?? "";
const MODEL = "qwen-image-2.0-pro";
const API_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

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
}

interface TryonResult {
  imagePath: string;
  outfitId: string;
  isFavorite: boolean;
  cached: boolean;
}

/**
 * Generate a tryon image. Returns cached result if one exists.
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

  const content: { image?: string; text?: string }[] = [
    { image: resolveImage(input.personImagePath) },
  ];
  if (hasTop) content.push({ image: resolveImage(input.topImagePath!) });
  if (hasBottom) content.push({ image: resolveImage(input.bottomImagePath!) });
  content.push({ text: buildTryonPrompt({ hasTop, hasBottom, topName, bottomName }) });

  const res = await fetch(API_URL, {
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

  const localPath = await downloadImage(imageUrl);

  const outfit = await prisma.outfit.create({
    data: {
      personImageId: input.personImageId,
      topItemId: input.topItemId || null,
      bottomItemId: input.bottomItemId || null,
      resultImagePath: localPath,
    },
  });

  return {
    imagePath: localPath,
    outfitId: outfit.id,
    isFavorite: false,
    cached: false,
  };
}
