import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const persons = await prisma.personImage.findMany({
      where: { userId: user.userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(persons);
  } catch (err) {
    console.error("GET /api/persons error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, imagePath } = body;

    if (!name || !imagePath) {
      return NextResponse.json(
        { error: "name and imagePath are required" },
        { status: 400 }
      );
    }

    const count = await prisma.personImage.count({ where: { userId: user.userId } });
    const isDefault = count === 0;

    const person = await prisma.personImage.create({
      data: { name, imagePath, isDefault, userId: user.userId },
    });

    return NextResponse.json(person, { status: 201 });
  } catch (err) {
    console.error("Create person error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create person" },
      { status: 500 }
    );
  }
}
