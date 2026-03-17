import { NextRequest, NextResponse } from "next/server";
import {
  parseTaobaoInput,
  resolveTkl,
  fetchProductDetail,
  selectBestImage,
  downloadProductImage,
} from "@/lib/taobao";
import { chatCompletion } from "@/lib/llm";
import {
  VALID_CATEGORIES,
  VALID_SEASONS,
  VALID_OCCASIONS,
  buildRecognizePrompt,
} from "@/lib/prompts/recognize";

export async function POST(req: NextRequest) {
  const { input } = await req.json();
  if (!input || typeof input !== "string") {
    return NextResponse.json(
      { error: "input is required" },
      { status: 400 },
    );
  }

  try {
    // 1. 解析用户输入
    const parsed = parseTaobaoInput(input);
    if (parsed.type === "unknown") {
      return NextResponse.json(
        { error: "无法识别淘宝链接或淘口令，请检查输入" },
        { status: 400 },
      );
    }

    // 2. 获取商品 ID
    let itemId: string;
    if (parsed.type === "item_url") {
      itemId = parsed.value;
    } else {
      // tkl 或 short_url 都通过订单侠解析
      itemId = await resolveTkl(parsed.value);
    }

    // 3. 获取商品详情
    const product = await fetchProductDetail(itemId);

    // 4. 选择最佳图片
    const selected = selectBestImage(product);
    if (!selected.url) {
      return NextResponse.json(
        { error: "未找到商品图片" },
        { status: 404 },
      );
    }

    // 5. 下载图片
    const image = await downloadProductImage(selected.url);

    // 6. AI 识别分类
    let recognition = {
      name: "",
      category: "",
      color: "",
      style: "",
      season: "",
      occasion: "",
    };

    try {
      const prompt = buildRecognizePrompt();
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
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        recognition = {
          name: String(parsed.name || ""),
          category: VALID_CATEGORIES.includes(parsed.category)
            ? parsed.category
            : "",
          color: String(parsed.color || ""),
          style: String(parsed.style || ""),
          season: VALID_SEASONS.includes(parsed.season) ? parsed.season : "",
          occasion: VALID_OCCASIONS.includes(parsed.occasion)
            ? parsed.occasion
            : "",
        };
      }
    } catch (e) {
      console.error("Taobao import: AI recognition failed, continuing", e);
      // Non-fatal — user can fill manually
    }

    return NextResponse.json({
      image,
      title: product.title,
      price: product.price,
      imageSource: selected.source,
      recognition,
    });
  } catch (err) {
    console.error("Taobao import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "导入失败" },
      { status: 500 },
    );
  }
}
