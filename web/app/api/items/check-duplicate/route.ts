import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { imageHash } = (await req.json()) as { imageHash: string };

    if (!imageHash) {
      return NextResponse.json(
        { error: "imageHash is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.item.findFirst({
      where: { imageHash, userId: user.userId },
      select: {
        id: true,
        name: true,
        category: true,
        color: true,
        imagePath: true,
      },
    });

    if (existing) {
      return NextResponse.json({ duplicate: true, item: existing });
    }

    return NextResponse.json({ duplicate: false });
  } catch (err) {
    console.error("Check duplicate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Check failed" },
      { status: 500 }
    );
  }
}
