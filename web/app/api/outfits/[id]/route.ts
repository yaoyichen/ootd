import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "node:fs";
import path from "node:path";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await prisma.outfit.update({
      where: { id },
      data: {
        ...(typeof body.isFavorite === "boolean" && {
          isFavorite: body.isFavorite,
        }),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/outfits/[id] error:", err);
    return NextResponse.json(
      { error: "更新失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outfit = await prisma.outfit.findUnique({ where: { id } });
    if (!outfit) {
      return NextResponse.json({ error: "未找到" }, { status: 404 });
    }

    if (outfit.resultImagePath) {
      const filePath = path.join(
        process.cwd(),
        "public",
        outfit.resultImagePath
      );
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.outfit.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/outfits/[id] error:", err);
    return NextResponse.json(
      { error: "删除失败" },
      { status: 500 }
    );
  }
}
