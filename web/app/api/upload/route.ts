import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { removeBackground } from "@/lib/remove-bg";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, folder } = body as { image: string; folder: string };

    if (!image || !folder) {
      return NextResponse.json(
        { error: "image and folder are required" },
        { status: 400 }
      );
    }

    if (!["items", "persons"].includes(folder)) {
      return NextResponse.json(
        { error: "folder must be 'items' or 'persons'" },
        { status: 400 }
      );
    }

    // Remove background for clothing items
    let processedImage = image;
    if (folder === "items") {
      processedImage = await removeBackground(image);
    }

    const raw = processedImage.startsWith("data:")
      ? processedImage.split(",")[1]
      : processedImage;
    const buffer = Buffer.from(raw, "base64");

    const ext = folder === "items" ? ".png" : processedImage.startsWith("data:image/png") ? ".png" : ".jpg";
    const filename = `${crypto.randomUUID()}${ext}`;

    const dir = path.join(UPLOAD_ROOT, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);

    const publicPath = `/uploads/${folder}/${filename}`;

    return NextResponse.json({
      path: publicPath,
      ...(folder === "items" && { processedImage: processedImage }),
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
