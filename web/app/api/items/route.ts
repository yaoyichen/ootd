import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category");
    const search = req.nextUrl.searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const items = await prisma.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/items error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, imagePath, ...rest } = body;

    if (!name || !category || !imagePath) {
      return NextResponse.json(
        { error: "name, category, imagePath are required" },
        { status: 400 }
      );
    }

    const item = await prisma.item.create({
      data: { name, category, imagePath, ...rest },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("Create item error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create item" },
      { status: 500 }
    );
  }
}
