import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { itemId } = body;

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  // Verify the post exists
  const post = await prisma.showcasePost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const sourceItem = await prisma.item.findUnique({ where: { id: itemId } });
  if (!sourceItem) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const newItem = await prisma.item.create({
    data: {
      name: sourceItem.name,
      category: sourceItem.category,
      subcategory: sourceItem.subcategory,
      color: sourceItem.color,
      style: sourceItem.style,
      season: sourceItem.season,
      occasion: sourceItem.occasion,
      material: sourceItem.material,
      fit: sourceItem.fit,
      pattern: sourceItem.pattern,
      thickness: sourceItem.thickness,
      description: sourceItem.description,
      imagePath: sourceItem.imagePath,
    },
  });

  return NextResponse.json(newItem, { status: 201 });
}
