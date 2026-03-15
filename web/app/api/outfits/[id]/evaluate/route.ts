import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreOutfit } from "@/lib/qwen";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const outfit = await prisma.outfit.findUnique({ where: { id } });
    if (!outfit) {
      return NextResponse.json({ error: "穿搭不存在" }, { status: 404 });
    }

    if (
      outfit.score !== null &&
      outfit.scoredAt &&
      Date.now() - outfit.scoredAt.getTime() < CACHE_TTL_MS
    ) {
      return NextResponse.json({
        score: outfit.score,
        scoreDims: outfit.scoreDims ? JSON.parse(outfit.scoreDims) : null,
        evaluation: outfit.evaluation,
        scoredAt: outfit.scoredAt,
        cached: true,
      });
    }

    const result = await scoreOutfit(outfit.resultImagePath);
    const dimsJson = JSON.stringify(result.dims);

    const updated = await prisma.outfit.update({
      where: { id },
      data: {
        score: result.score,
        scoreDims: dimsJson,
        evaluation: result.evaluation,
        scoredAt: new Date(),
      },
    });

    return NextResponse.json({
      score: updated.score,
      scoreDims: result.dims,
      evaluation: updated.evaluation,
      scoredAt: updated.scoredAt,
      cached: false,
    });
  } catch (err) {
    console.error("Evaluate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "评分失败" },
      { status: 500 }
    );
  }
}
