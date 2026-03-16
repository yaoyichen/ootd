import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.DASHSCOPE_API_KEY ?? "";
const CHAT_API_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

const VALID_CATEGORIES = ["TOP", "BOTTOM", "OUTERWEAR", "ONEPIECE", "SHOES", "ACCESSORY"];
const VALID_SEASONS = ["春", "夏", "秋", "冬", "四季"];
const VALID_OCCASIONS = ["日常", "上班", "约会", "运动", "正式", "出行"];

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "DASHSCOPE_API_KEY not configured" }, { status: 500 });
  }

  const { image } = await req.json();
  if (!image) {
    return NextResponse.json({ error: "image is required" }, { status: 400 });
  }

  const prompt = `你是一个服装识别助手。请观察图片中的服装/鞋子/配饰，识别以下信息：

1. name: 简短名称（如"白色圆领T恤"、"黑色牛仔裤"）
2. category: 分类，只能是以下之一：TOP(上衣)、BOTTOM(下装)、OUTERWEAR(外套)、ONEPIECE(连体)、SHOES(鞋子)、ACCESSORY(配饰)
3. color: 主要颜色（如"白色"、"深蓝色"）
4. style: 风格（如"休闲"、"正式"、"运动"、"街头"、"复古"）
5. season: 适合季节，只能是以下之一：春、夏、秋、冬、四季
6. occasion: 适合场合，只能是以下之一：日常、上班、约会、运动、正式、出行

请严格以JSON格式回复，不要输出其他内容：
{"name": "", "category": "", "color": "", "style": "", "season": "", "occasion": ""}`;

  try {
    const res = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "qwen-vl-plus",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: image } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Recognize API error:", data);
      return NextResponse.json({ error: data.error?.message || "识别失败" }, { status: 500 });
    }

    const text: string = data.choices?.[0]?.message?.content ?? "";
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
