import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.DASHSCOPE_API_KEY ?? "";
const MODEL = "qwen-image-2.0-pro";
const API_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

function resolveImage(input: string): string {
  if (input.startsWith("data:") || input.startsWith("http")) return input;
  const absPath = path.join(process.cwd(), "public", input);
  if (!fs.existsSync(absPath)) throw new Error(`Image not found: ${input}`);
  const ext = path.extname(absPath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const data = fs.readFileSync(absPath).toString("base64");
  return `data:${mime};base64,${data}`;
}

const NEGATIVE_PROMPT =
  "面部变化, 五官变形, 姿势改变, 身材变化, 模糊, 低质量, 卡通, AI感, 多余肢体";

function buildPrompt(hasTop: boolean, hasBottom: boolean): string {
  const garmentDesc =
    hasTop && hasBottom
      ? "图2中的上衣和图3中的裤子/裙子"
      : hasTop
        ? "图2中的上衣"
        : "图2中的裤子/裙子";

  return (
    `图1是一个人的全身正面照。请让这个人穿上${garmentDesc}。` +
    "严格保持人物的面部五官、发型、身材比例和站立姿势完全不变，仅替换身上的衣服。" +
    "输出一张高质量的全身照，真实摄影风格，光线自然。"
  );
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "DASHSCOPE_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { person_image, top_garment_image, bottom_garment_image } = body;

    if (!person_image) {
      return NextResponse.json(
        { error: "person_image is required" },
        { status: 400 }
      );
    }
    if (!top_garment_image && !bottom_garment_image) {
      return NextResponse.json(
        { error: "至少提供一张服装图片（上衣或下装）" },
        { status: 400 }
      );
    }

    const hasTop = !!top_garment_image;
    const hasBottom = !!bottom_garment_image;

    const content: { image?: string; text?: string }[] = [
      { image: resolveImage(person_image) },
    ];
    if (hasTop) content.push({ image: resolveImage(top_garment_image) });
    if (hasBottom) content.push({ image: resolveImage(bottom_garment_image) });
    content.push({ text: buildPrompt(hasTop, hasBottom) });

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: {
          messages: [{ role: "user", content }],
        },
        parameters: {
          n: 1,
          size: "768*1152",
          negative_prompt: NEGATIVE_PROMPT,
          prompt_extend: false,
          watermark: false,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || data.code) {
      console.error("Qwen-Image API error:", data);
      return NextResponse.json(
        { error: data.message || "图像生成失败" },
        { status: 500 }
      );
    }

    const imageUrl =
      data.output?.choices?.[0]?.message?.content?.find(
        (c: { image?: string }) => c.image
      )?.image;

    if (!imageUrl) {
      console.error("Qwen-Image no image in response:", data);
      return NextResponse.json(
        { error: "响应中未找到生成图片" },
        { status: 500 }
      );
    }

    return NextResponse.json({ image_url: imageUrl });
  } catch (err) {
    console.error("Tryon error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
