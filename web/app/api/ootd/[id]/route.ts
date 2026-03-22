import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import fs from "fs/promises";
import path from "path";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { id } = await params;

    const checkin = await prisma.ootdCheckin.findUnique({
      where: { id },
    });

    if (!checkin) {
      return NextResponse.json(
        { error: "Checkin not found" },
        { status: 404 }
      );
    }

    if (checkin.userId !== user.userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Delete the image file from disk, ignore errors
    try {
      const filePath = path.join(process.cwd(), "public", checkin.realPhotoPath);
      await fs.unlink(filePath);
    } catch {
      // Ignore file deletion errors
    }

    await prisma.ootdCheckin.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[OOTD DELETE]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
