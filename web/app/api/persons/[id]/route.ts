import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import fs from "node:fs";
import path from "node:path";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await ctx.params;
  const person = await prisma.personImage.findUnique({ where: { id } });
  if (!person || person.userId !== user.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(person);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await ctx.params;
  try {
    const existing = await prisma.personImage.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();

    if (body.isDefault === true) {
      await prisma.personImage.updateMany({
        where: { isDefault: true, userId: user.userId },
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

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await ctx.params;
  try {
    const person = await prisma.personImage.findUnique({ where: { id } });
    if (!person || person.userId !== user.userId) {
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
