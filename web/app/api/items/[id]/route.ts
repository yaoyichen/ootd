import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "node:fs";
import path from "node:path";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const item = await prisma.item.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.imagePath) {
      const filePath = path.join(process.cwd(), "public", item.imagePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.item.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
