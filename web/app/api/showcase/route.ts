import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const sort = searchParams.get("sort") || "newest";
    const limit = Math.min(Number(searchParams.get("limit") || 20), 50);

    const posts = await prisma.showcasePost.findMany({
      where: { isPublic: true },
      orderBy:
        sort === "hottest"
          ? { likes: "desc" }
          : sort === "random"
            ? { createdAt: "desc" }
            : { createdAt: "desc" },
      take: sort === "random" ? 100 : limit,
      include: { outfit: true },
    });

    // For random sort, shuffle and slice
    const finalPosts =
      sort === "random"
        ? posts.sort(() => Math.random() - 0.5).slice(0, limit)
        : posts;

    // Load item info for each post
    const results = await Promise.all(
      finalPosts.map(async (post) => {
        const [topItem, bottomItem] = await Promise.all([
          post.outfit.topItemId
            ? prisma.item.findUnique({
                where: { id: post.outfit.topItemId },
                select: { id: true, name: true, imagePath: true, category: true, color: true, style: true, season: true, material: true },
              })
            : null,
          post.outfit.bottomItemId
            ? prisma.item.findUnique({
                where: { id: post.outfit.bottomItemId },
                select: { id: true, name: true, imagePath: true, category: true, color: true, style: true, season: true, material: true },
              })
            : null,
        ]);

        return {
          id: post.id,
          outfitId: post.outfitId,
          caption: post.caption,
          likes: post.likes,
          tryonCount: post.tryonCount,
          createdAt: post.createdAt,
          outfit: {
            resultImagePath: post.outfit.resultImagePath,
            score: post.outfit.score,
            scoreDims: post.outfit.scoreDims,
            evaluation: post.outfit.evaluation,
          },
          topItem,
          bottomItem,
        };
      })
    );

    return NextResponse.json(results);
  } catch (err) {
    console.error("[Showcase GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { outfitId, caption } = body;

  if (!outfitId) {
    return NextResponse.json({ error: "outfitId is required" }, { status: 400 });
  }

  const outfit = await prisma.outfit.findUnique({ where: { id: outfitId } });
  if (!outfit || !outfit.resultImagePath) {
    return NextResponse.json({ error: "Outfit not found or has no result image" }, { status: 404 });
  }

  // Check for duplicate public post
  const existing = await prisma.showcasePost.findFirst({
    where: { outfitId, isPublic: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Already published", post: existing }, { status: 409 });
  }

  const post = await prisma.showcasePost.create({
    data: {
      outfitId,
      caption: caption || null,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
