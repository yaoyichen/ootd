import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const favorites = sp.get("favorites");

    if (favorites === "true") {
      const outfits = await prisma.outfit.findMany({
        where: { isFavorite: true },
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(outfits);
    }

    const personImageId = sp.get("personImageId");
    const topItemId = sp.get("topItemId") || null;
    const bottomItemId = sp.get("bottomItemId") || null;

    if (!personImageId) {
      return NextResponse.json(null);
    }

    const outfit = await prisma.outfit.findFirst({
      where: {
        personImageId,
        topItemId: topItemId ?? null,
        bottomItemId: bottomItemId ?? null,
      },
    });

    return NextResponse.json(outfit);
  } catch (err) {
    console.error("GET /api/outfits error:", err);
    return NextResponse.json(null);
  }
}
