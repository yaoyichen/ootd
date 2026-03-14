import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const persons = await prisma.personImage.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(persons);
  } catch (err) {
    console.error("GET /api/persons error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, imagePath } = body;

    if (!name || !imagePath) {
      return NextResponse.json(
        { error: "name and imagePath are required" },
        { status: 400 }
      );
    }

    const count = await prisma.personImage.count();
    const isDefault = count === 0;

    const person = await prisma.personImage.create({
      data: { name, imagePath, isDefault },
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
