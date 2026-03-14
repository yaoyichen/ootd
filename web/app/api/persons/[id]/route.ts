import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "node:fs";
import path from "node:path";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const person = await prisma.personImage.findUnique({ where: { id } });
  if (!person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(person);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const body = await req.json();

    if (body.isDefault === true) {
      await prisma.personImage.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const person = await prisma.personImage.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(person);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const person = await prisma.personImage.findUnique({ where: { id } });
    if (!person) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (person.imagePath) {
      const filePath = path.join(process.cwd(), "public", person.imagePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.personImage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
