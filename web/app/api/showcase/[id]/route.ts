import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  const post = await prisma.showcasePost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.userId !== user.userId) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  await prisma.showcasePost.update({
    where: { id },
    data: { isPublic: false },
  });

  return NextResponse.json({ success: true });
}
