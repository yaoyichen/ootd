import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzePersonImage, enhancePersonImage } from "@/lib/person-enhance";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const person = await prisma.personImage.findUnique({ where: { id } });
  if (!person) {
    return NextResponse.json({ error: "人像不存在" }, { status: 404 });
  }

  // Skip if already processed
  if (person.description && person.enhancedImagePath) {
    return NextResponse.json(person);
  }

  console.log(`[PersonEnhance] starting for ${id}`);

  const [description, enhancedDataUrl] = await Promise.allSettled([
    person.description ? Promise.reject("skip") : analyzePersonImage(person.imagePath),
    person.enhancedImagePath ? Promise.reject("skip") : enhancePersonImage(person.imagePath),
  ]);

  const updateData: Record<string, string> = {};

  if (description.status === "fulfilled") {
    updateData.description = JSON.stringify(description.value);
    console.log(`[PersonEnhance] analysis done for ${id}:`, description.value.summary);
  } else if (description.reason !== "skip") {
    console.error(`[PersonEnhance] analysis failed for ${id}:`, description.reason);
  }

  if (enhancedDataUrl.status === "fulfilled") {
    const outDir = path.join(process.cwd(), "public", "uploads", "persons-enhanced");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const base64Data = enhancedDataUrl.value.replace(/^data:image\/\w+;base64,/, "");
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

    updateData.enhancedImagePath = `/uploads/persons-enhanced/${filename}`;
    console.log(`[PersonEnhance] enhancement saved for ${id}: ${updateData.enhancedImagePath}`);
  } else if (enhancedDataUrl.reason !== "skip") {
    console.error(`[PersonEnhance] enhancement failed for ${id}:`, enhancedDataUrl.reason);
  }

  if (Object.keys(updateData).length > 0) {
    const updated = await prisma.personImage.update({
      where: { id },
      data: updateData,
    });
    console.log(`[PersonEnhance] DB updated for ${id}`);
    return NextResponse.json(updated);
  }

  return NextResponse.json(person);
}
