import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const date =
      req.nextUrl.searchParams.get("date") ??
      new Date().toISOString().slice(0, 10);

    const recs = await prisma.dailyRecommendation.findMany({
      where: { date },
      orderBy: { rank: "asc" },
    });

    if (recs.length === 0) {
      return NextResponse.json({ date, recommendations: [] });
    }

    const outfitIds = recs.map((r) => r.outfitId);
    const outfits = await prisma.outfit.findMany({
      where: { id: { in: outfitIds } },
    });
    const outfitMap = new Map(outfits.map((o) => [o.id, o]));

    const allItemIds = outfits.flatMap((o) =>
      [o.topItemId, o.bottomItemId].filter(Boolean) as string[]
    );
    const items = await prisma.item.findMany({
      where: { id: { in: allItemIds } },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const recommendations = recs.map((rec) => {
      const outfit = outfitMap.get(rec.outfitId);
      const topItem = outfit?.topItemId ? itemMap.get(outfit.topItemId) : null;
      const bottomItem = outfit?.bottomItemId
        ? itemMap.get(outfit.bottomItemId)
        : null;

      const scoreDimsRaw = outfit?.scoreDims;
      let scoreDims = null;
      if (scoreDimsRaw) {
        try { scoreDims = JSON.parse(scoreDimsRaw); } catch { /* ignore */ }
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
    console.error("Recommendations GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "获取推荐失败" },
      { status: 500 }
    );
  }
}
