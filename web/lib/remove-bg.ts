import { resolveImage } from "./tryon";

const API_KEY = process.env.DASHSCOPE_API_KEY ?? "";
const MODEL = "qwen-image-edit";
const API_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

const PROMPT =
  "去除图片中的背景和人物模特，只保留衣物/服装单品本身，输出透明或纯白背景的平铺商品图";

/**
 * Remove background from a clothing image using DashScope qwen-image-edit.
 * Accepts a base64 data-url or file path; returns a base64 PNG data-url.
 */
export async function removeBackground(image: string): Promise<string> {
  if (!API_KEY) throw new Error("DASHSCOPE_API_KEY not configured");

  const resolvedImage = resolveImage(image);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: {
        messages: [
          {
            role: "user",
            content: [{ image: resolvedImage }, { text: PROMPT }],
          },
        ],
      },
      parameters: {
        n: 1,
        prompt_extend: false,
        watermark: false,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok || data.code) {
    throw new Error(data.message || "背景去除失败");
  }

  const imageUrl: string | undefined =
    data.output?.choices?.[0]?.message?.content?.find(
      (c: { image?: string }) => c.image
    )?.image;

  if (!imageUrl) throw new Error("响应中未找到处理后的图片");

  // Download the result image and convert to base64 data-url
  const downloadRes = await fetch(imageUrl);
  if (!downloadRes.ok) throw new Error("Failed to download processed image");

  const buffer = Buffer.from(await downloadRes.arrayBuffer());
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
