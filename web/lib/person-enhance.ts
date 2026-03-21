import { resolveImage } from "./tryon";
import { chatCompletion } from "./llm";
import { PERSON_ANALYZE_PROMPT } from "./prompts/person-analyze";
import { PERSON_ENHANCE_PROMPT, PERSON_ENHANCE_NEGATIVE_PROMPT } from "./prompts/person-enhance";

const API_KEY = process.env.DASHSCOPE_API_KEY ?? "";
const ENHANCE_MODEL = "qwen-image-edit-max";
const API_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

export interface PersonDescription {
  gender: string;
  bodyType: string;
  skinTone: string;
  hairStyle: string;
  vibe: string;
  background: string;
  summary: string;
}

/**
 * Analyze a person image using qwen-vl-max to extract structured appearance description.
 */
export async function analyzePersonImage(
  imagePath: string
): Promise<PersonDescription> {
  const imageUrl = resolveImage(imagePath);

  const { content: text } = await chatCompletion({
    model: "vision",
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: PERSON_ANALYZE_PROMPT },
        ],
      },
    ],
  });

  console.log("[AnalyzePerson] raw response:", text);

  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    console.error("[AnalyzePerson] no JSON found in response:", text);
    return defaultDescription();
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      gender: parsed.gender || "未知",
      bodyType: parsed.bodyType || "匀称",
      skinTone: parsed.skinTone || "自然肤色",
      hairStyle: parsed.hairStyle || "未知",
      vibe: parsed.vibe || "未知",
      background: parsed.background || "未知",
      summary: parsed.summary || "暂无分析",
    };
  } catch {
    console.error("[AnalyzePerson] JSON parse failed:", jsonMatch[0]);
    return defaultDescription();
  }
}

function defaultDescription(): PersonDescription {
  return {
    gender: "未知",
    bodyType: "匀称",
    skinTone: "自然肤色",
    hairStyle: "未知",
    vibe: "未知",
    background: "未知",
    summary: "暂无分析",
  };
}

/**
 * Enhance a person image using qwen-image-edit for light beautification.
 * Returns a base64 PNG data-url.
 */
export async function enhancePersonImage(imagePath: string): Promise<string> {
  if (!API_KEY) throw new Error("DASHSCOPE_API_KEY not configured");

  const resolvedImage = resolveImage(imagePath);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: ENHANCE_MODEL,
      input: {
        messages: [
          {
            role: "user",
            content: [{ image: resolvedImage }, { text: PERSON_ENHANCE_PROMPT }],
          },
        ],
      },
      parameters: {
        n: 1,
        size: "1536*2048",
        negative_prompt: PERSON_ENHANCE_NEGATIVE_PROMPT,
        prompt_extend: false,
        watermark: false,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok || data.code) {
    throw new Error(data.message || "人像美化失败");
  }

  const imageUrl: string | undefined =
    data.output?.choices?.[0]?.message?.content?.find(
      (c: { image?: string }) => c.image
    )?.image;

  if (!imageUrl) throw new Error("响应中未找到美化后的图片");

  const downloadRes = await fetch(imageUrl);
  if (!downloadRes.ok) throw new Error("Failed to download enhanced image");

  const buffer = Buffer.from(await downloadRes.arrayBuffer());
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
