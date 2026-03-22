import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const sp = req.nextUrl.searchParams;
    const favorites = sp.get("favorites");

    if (favorites === "true") {
      const outfits = await prisma.outfit.findMany({
        where: { isFavorite: true, userId: user.userId },
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
        userId: user.userId,
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
