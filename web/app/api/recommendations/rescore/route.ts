import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreOutfit } from "@/lib/qwen";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const date =
      (body.date as string) || new Date().toISOString().slice(0, 10);

    const recs = await prisma.dailyRecommendation.findMany({
      where: { date, userId: user.userId },
      orderBy: { rank: "asc" },
    });

    if (recs.length === 0) {
      return NextResponse.json(
        { error: "当天没有推荐记录，请先生成推荐" },
        { status: 404 }
      );
    }

    const outfitIds = recs.map((r) => r.outfitId);
    const outfits = await prisma.outfit.findMany({
      where: { id: { in: outfitIds } },
    });
    const outfitMap = new Map(outfits.map((o) => [o.id, o]));

    const scored = await Promise.all(
      outfits.map(async (outfit) => {
        try {
          const result = await scoreOutfit(outfit.resultImagePath);
          const dimsJson = JSON.stringify(result.dims);

          await prisma.outfit.update({
            where: { id: outfit.id },
            data: {
              score: result.score,
              scoreDims: dimsJson,
              evaluation: result.evaluation,
              scoredAt: new Date(),
            },
          });

          return { outfitId: outfit.id, score: result.score };
        } catch (err) {
          console.error(`Rescore failed for outfit ${outfit.id}:`, err);
          return { outfitId: outfit.id, score: outfit.score ?? 70 };
        }
      })
    );

    scored.sort((a, b) => b.score - a.score);
    for (let i = 0; i < scored.length; i++) {
      const rec = recs.find((r) => r.outfitId === scored[i].outfitId);
      if (rec && rec.rank !== i + 1) {
        await prisma.dailyRecommendation.update({
          where: { id: rec.id },
          data: { rank: i + 1 },
        });
      }
    }

    const updatedRecs = await prisma.dailyRecommendation.findMany({
      where: { date },
      orderBy: { rank: "asc" },
    });

    const updatedOutfits = await prisma.outfit.findMany({
      where: { id: { in: outfitIds } },
    });
    const updatedOutfitMap = new Map(updatedOutfits.map((o) => [o.id, o]));

    const allItemIds = updatedOutfits.flatMap((o) =>
      [o.topItemId, o.bottomItemId].filter(Boolean) as string[]
    );
    const items = await prisma.item.findMany({
      where: { id: { in: allItemIds } },
    });
    const itemMap = new Map(items.map((it) => [it.id, it]));

    const recommendations = updatedRecs.map((rec) => {
      const outfit = updatedOutfitMap.get(rec.outfitId);
      const topItem = outfit?.topItemId ? itemMap.get(outfit.topItemId) : null;
      const bottomItem = outfit?.bottomItemId
        ? itemMap.get(outfit.bottomItemId)
        : null;

      let scoreDims = null;
      if (outfit?.scoreDims) {
        try {
          scoreDims = JSON.parse(outfit.scoreDims);
        } catch { /* ignore */ }
      }

      return {
        rank: rec.rank,
        outfitId: rec.outfitId,
        reason: rec.reason,
        imagePath: outfit?.resultImagePath ?? null,
        score: outfit?.score ?? null,
        scoreDims,
        evaluation: outfit?.evaluation ?? null,
        isFavorite: outfit?.isFavorite ?? false,
        topItem: topItem
          ? {
              id: topItem.id,
              name: topItem.name,
              imagePath: topItem.imagePath,
              category: topItem.category,
            }
          : null,
        bottomItem: bottomItem
          ? {
              id: bottomItem.id,
              name: bottomItem.name,
              imagePath: bottomItem.imagePath,
              category: bottomItem.category,
            }
          : null,
      };
    });

    return NextResponse.json({ date, recommendations });
  } catch (err) {
    console.error("Rescore error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "重新打分失败" },
      { status: 500 }
    );
  }
}
