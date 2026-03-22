import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { resolveImage } from "@/lib/tryon";
import { TRYON_NEGATIVE_PROMPT, buildTryonPrompt } from "@/lib/prompts/tryon";
import { requireAuth } from "@/lib/api-auth";

const API_KEY = process.env.DASHSCOPE_API_KEY ?? "";
const MODEL = "qwen-image-2.0-pro";
const API_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

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

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  if (!API_KEY) {
    return NextResponse.json(
      { error: "DASHSCOPE_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const {
      person_image,
      top_garment_image,
      bottom_garment_image,
      personImageId,
      topItemId,
      bottomItemId,
    } = body;

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

    // Fetch item names for better prompt context
    let topName: string | undefined;
    let bottomName: string | undefined;
    if (topItemId) {
      const topItem = await prisma.item.findUnique({ where: { id: topItemId }, select: { name: true } });
      if (topItem) topName = topItem.name;
    }
    if (bottomItemId) {
      const bottomItem = await prisma.item.findUnique({ where: { id: bottomItemId }, select: { name: true } });
      if (bottomItem) bottomName = bottomItem.name;
    }

    const content: { image?: string; text?: string }[] = [
      { image: resolveImage(person_image) },
    ];
    if (hasTop) content.push({ image: resolveImage(top_garment_image) });
    if (hasBottom) content.push({ image: resolveImage(bottom_garment_image) });
    content.push({ text: buildTryonPrompt({ hasTop, hasBottom, topName, bottomName }) });

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
          negative_prompt: TRYON_NEGATIVE_PROMPT,
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

    const localPath = await downloadImage(imageUrl);

    let outfit = null;
    if (personImageId) {
      outfit = await prisma.outfit.upsert({
        where: {
          personImageId_topItemId_bottomItemId: {
            personImageId,
            topItemId: topItemId || null,
            bottomItemId: bottomItemId || null,
          },
        },
        update: {
          resultImagePath: localPath,
          updatedAt: new Date(),
        },
        create: {
          personImageId,
          topItemId: topItemId || null,
          bottomItemId: bottomItemId || null,
          resultImagePath: localPath,
          isFavorite: true,
          userId: user.userId,
        },
      });
    }

    return NextResponse.json({
      image_url: localPath,
      outfit_id: outfit?.id ?? null,
      isFavorite: outfit?.isFavorite ?? false,
    });
  } catch (err) {
    console.error("Tryon error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
