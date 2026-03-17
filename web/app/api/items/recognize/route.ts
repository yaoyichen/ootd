import { NextRequest, NextResponse } from "next/server";
import {
  VALID_CATEGORIES,
  VALID_SEASONS,
  VALID_OCCASIONS,
  buildRecognizePrompt,
} from "@/lib/prompts/recognize";
import { chatCompletion } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const { image } = await req.json();
  if (!image) {
    return NextResponse.json({ error: "image is required" }, { status: 400 });
  }

  const prompt = buildRecognizePrompt();

  try {
    const { content: text } = await chatCompletion({
      model: "vision",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "识别结果解析失败" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const result = {
      name: String(parsed.name || ""),
      category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "",
      color: String(parsed.color || ""),
      style: String(parsed.style || ""),
      season: VALID_SEASONS.includes(parsed.season) ? parsed.season : "",
      occasion: VALID_OCCASIONS.includes(parsed.occasion) ? parsed.occasion : "",
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Recognize error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "识别失败" },
      { status: 500 }
    );
  }
}
