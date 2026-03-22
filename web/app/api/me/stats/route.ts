import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const payload = await getCurrentUser(request);
  if (!payload) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const userId = payload.userId;

  const [itemCount, outfitCount, favoriteCount, personCount] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.outfit.count({ where: { userId } }),
    prisma.outfit.count({ where: { userId, isFavorite: true } }),
    prisma.personImage.count({ where: { userId } }),
  ]);

  return NextResponse.json({ itemCount, outfitCount, favoriteCount, personCount });
}
