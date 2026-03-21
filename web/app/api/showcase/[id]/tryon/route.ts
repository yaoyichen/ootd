import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Increment tryonCount for a showcase post
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const post = await prisma.showcasePost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.showcasePost.update({
      where: { id },
      data: { tryonCount: post.tryonCount + 1 },
    });

    return NextResponse.json({ tryonCount: post.tryonCount + 1 });
  } catch (err) {
    console.error("[Showcase tryon count]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
