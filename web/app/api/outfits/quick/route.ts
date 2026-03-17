import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 5;

/** 季节映射：月份 → 匹配的 season 值 */
function getSeasonsForMonth(month: number): string[] {
  if (month >= 3 && month <= 5) return ["春", "四季"];
  if (month >= 6 && month <= 8) return ["夏", "四季"];
  if (month >= 9 && month <= 11) return ["秋", "四季"];
  return ["冬", "四季"]; // 12, 1, 2
}

/** 加权随机洗牌：weight = (score - threshold)，isFavorite ×1.5 */
function weightedShuffle<T extends { score: number | null; isFavorite: boolean }>(
  items: T[],
  threshold: number,
  limit: number
): T[] {
  const pool = [...items];
  const result: T[] = [];
  while (result.length < limit && pool.length > 0) {
    const weights = pool.map((it) => {
      const base = (it.score ?? threshold) - threshold + 1;
      return it.isFavorite ? base * 1.5 : base;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) { idx = i; break; }
    }
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

type OutfitRow = {
  id: string;
  resultImagePath: string;
  score: number | null;
  scoreDims: string | null;
  evaluation: string | null;
  isFavorite: boolean;
  topItemId: string | null;
  bottomItemId: string | null;
};

async function enrichOutfits(outfits: OutfitRow[], reason: string) {
  return Promise.all(
    outfits.map(async (o) => {
      const [topItem, bottomItem] = await Promise.all([
        o.topItemId ? prisma.item.findUnique({ where: { id: o.topItemId } }) : null,
        o.bottomItemId ? prisma.item.findUnique({ where: { id: o.bottomItemId } }) : null,
      ]);
      return formatOutfit(o, reason, topItem, bottomItem);
    })
  );
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const excludeRaw = sp.get("excludeIds") || "";
    const excludeIds = excludeRaw ? excludeRaw.split(",").filter(Boolean) : [];
    const limit = Math.min(Number(sp.get("limit")) || DEFAULT_LIMIT, 20);
    const dateStr = sp.get("date") || new Date().toISOString().slice(0, 10);
    const month = new Date(dateStr + "T00:00:00").getMonth() + 1;
    const seasons = getSeasonsForMonth(month);
    const dateKey = dateStr.replace(/-/g, "");

    const results: ReturnType<typeof formatOutfit>[] = [];
    const usedIds = new Set(excludeIds);
    let remaining = 0;

    // ---------- Layer 1: DailyRecommendation ----------
    const dailyRecs = await prisma.dailyRecommendation.findMany({
      where: {
        date: dateKey,
        ...(usedIds.size > 0 ? { outfitId: { notIn: Array.from(usedIds) } } : {}),
      },
      orderBy: { rank: "asc" },
    });

    for (const rec of dailyRecs) {
      if (results.length >= limit) break;
      const outfit = await prisma.outfit.findUnique({ where: { id: rec.outfitId } });
      if (outfit && outfit.resultImagePath) {
        const [topItem, bottomItem] = await Promise.all([
          outfit.topItemId ? prisma.item.findUnique({ where: { id: outfit.topItemId } }) : null,
          outfit.bottomItemId ? prisma.item.findUnique({ where: { id: outfit.bottomItemId } }) : null,
        ]);
        results.push(formatOutfit(outfit, rec.reason || "今日推荐", topItem, bottomItem));
        usedIds.add(outfit.id);
      }
    }

    // ---------- Layer 2: score ≥ 75 + season match ----------
    if (results.length < limit) {
      const seasonalOutfits = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          resultImagePath: string;
          score: number | null;
          scoreDims: string | null;
          evaluation: string | null;
          isFavorite: number;
          topItemId: string | null;
          bottomItemId: string | null;
        }>
      >(
        `SELECT o.id, o.resultImagePath, o.score, o.scoreDims, o.evaluation, o.isFavorite,
                o.topItemId, o.bottomItemId
         FROM Outfit o
         WHERE o.score >= 75
           AND o.resultImagePath IS NOT NULL
           ${usedIds.size > 0 ? `AND o.id NOT IN (${Array.from(usedIds).map((id) => `'${id}'`).join(",")})` : ""}
           AND (
             EXISTS (SELECT 1 FROM Item i WHERE i.id = o.topItemId AND (${seasons.map((s) => `i.season LIKE '%${s}%'`).join(" OR ")} OR i.season IS NULL))
             OR o.topItemId IS NULL
           )
           AND (
             EXISTS (SELECT 1 FROM Item i WHERE i.id = o.bottomItemId AND (${seasons.map((s) => `i.season LIKE '%${s}%'`).join(" OR ")} OR i.season IS NULL))
             OR o.bottomItemId IS NULL
           )`
      );

      const mapped = seasonalOutfits.map((o) => ({ ...o, isFavorite: !!o.isFavorite }));
      const need = limit - results.length;
      const picks = weightedShuffle(mapped, 75, need);
      const enriched = await enrichOutfits(picks, "应季高分搭配");
      results.push(...enriched);
      picks.forEach((p) => usedIds.add(p.id));
      remaining += seasonalOutfits.length - picks.length;
    }

    // ---------- Layer 3: score ≥ 70, no season filter ----------
    if (results.length < limit) {
      const highScoreOutfits = await prisma.outfit.findMany({
        where: {
          score: { gte: 70 },
          resultImagePath: { not: "" },
          id: { notIn: Array.from(usedIds) },
        },
      });

      const need = limit - results.length;
      const picks = weightedShuffle(highScoreOutfits, 70, need);
      const enriched = await enrichOutfits(picks, "历史高分搭配");
      results.push(...enriched);
      picks.forEach((p) => usedIds.add(p.id));
      remaining += highScoreOutfits.length - picks.length;
    }

    // ---------- Layer 4: any with resultImagePath ----------
    if (results.length < limit) {
      const cachedOutfits = await prisma.outfit.findMany({
        where: {
          resultImagePath: { not: "" },
          id: { notIn: Array.from(usedIds) },
        },
      });

      const need = limit - results.length;
      const shuffled = cachedOutfits.sort(() => Math.random() - 0.5).slice(0, need);
      const enriched = await enrichOutfits(shuffled, "历史搭配");
      results.push(...enriched);
      remaining += cachedOutfits.length - shuffled.length;
    }

    return NextResponse.json({
      outfits: results,
      remaining,
    });
  } catch (err) {
    console.error("GET /api/outfits/quick error:", err);
    return NextResponse.json(
      { error: "获取快速穿搭失败" },
      { status: 500 }
    );
  }
}

function formatOutfit(
  outfit: {
    id: string;
    resultImagePath: string;
    score: number | null;
    scoreDims: string | null;
    evaluation: string | null;
    isFavorite: boolean;
  },
  reason: string,
  topItem: { id: string; name: string; imagePath: string; category: string } | null,
  bottomItem: { id: string; name: string; imagePath: string; category: string } | null
) {
  let scoreDims = null;
  if (outfit.scoreDims) {
    try {
      scoreDims = JSON.parse(outfit.scoreDims);
    } catch {}
  }

  return {
    outfitId: outfit.id,
    imagePath: outfit.resultImagePath,
    score: outfit.score,
    scoreDims,
    evaluation: outfit.evaluation,
    reason,
    isFavorite: outfit.isFavorite,
    topItem: topItem
      ? { id: topItem.id, name: topItem.name, imagePath: topItem.imagePath, category: topItem.category }
      : null,
    bottomItem: bottomItem
      ? { id: bottomItem.id, name: bottomItem.name, imagePath: bottomItem.imagePath, category: bottomItem.category }
      : null,
  };
}
