import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { image, outfitId, caption } = body;

    if (!image) {
      return NextResponse.json(
        { error: "image is required" },
        { status: 400 }
      );
    }

    // Save base64 image to disk
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const dir = path.join(process.cwd(), "public/uploads/ootd");
    await fs.mkdir(dir, { recursive: true });

    const filename = `checkin-${crypto.randomUUID()}.png`;
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buffer);

    const realPhotoPath = `/uploads/ootd/${filename}`;

    const checkin = await prisma.ootdCheckin.create({
      data: {
        userId: user.userId,
        outfitId: outfitId || null,
        realPhotoPath,
        caption: caption || null,
      },
    });

    return NextResponse.json(checkin, { status: 201 });
  } catch (err) {
    console.error("[OOTD POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { searchParams } = req.nextUrl;
    const monthParam = searchParams.get("month");

    // Default to current month
    const now = new Date();
    let year: number;
    let month: number;

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      year = y;
      month = m;
    } else {
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const checkins = await prisma.ootdCheckin.findMany({
      where: {
        userId: user.userId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        outfit: {
          select: {
            id: true,
            resultImagePath: true,
            score: true,
          },
        },
      },
    });

    return NextResponse.json(checkins);
  } catch (err) {
    console.error("[OOTD GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
