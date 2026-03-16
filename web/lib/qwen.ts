import fs from "node:fs";
import path from "node:path";
import { SCORING_SYSTEM_PROMPT, SCORING_USER_PROMPT } from "./prompts/scoring";
import { buildMatchingPrompt, type ItemMeta } from "./prompts/matching";

const API_KEY = process.env.DASHSCOPE_API_KEY ?? "";
const CHAT_API_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export interface ScoreDims {
  colorHarmony: number;
  styleCohesion: number;
  trendiness: number;
  practicality: number;
  creativity: number;
}

export interface ScoreResult {
  score: number;
  dims: ScoreDims;
  evaluation: string;
}

interface CombinationSuggestion {
  topItemId: string;
  bottomItemId: string;
  reason: string;
}

function imagePathToDataUrl(imagePath: string): string {
  if (imagePath.startsWith("data:") || imagePath.startsWith("http"))
    return imagePath;
  const absPath = path.join(process.cwd(), "public", imagePath);
  if (!fs.existsSync(absPath)) throw new Error(`Image not found: ${imagePath}`);
  const ext = path.extname(absPath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const data = fs.readFileSync(absPath).toString("base64");
  return `data:${mime};base64,${data}`;
}

const DEFAULT_DIMS: ScoreDims = {
  colorHarmony: 70,
  styleCohesion: 70,
  trendiness: 70,
  practicality: 70,
  creativity: 70,
};

const DIM_KEYS: (keyof ScoreDims)[] = [
  "colorHarmony",
  "styleCohesion",
  "trendiness",
  "practicality",
  "creativity",
];

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function scoreOutfit(imagePath: string): Promise<ScoreResult> {
  if (!API_KEY) throw new Error("DASHSCOPE_API_KEY not configured");

  const imageUrl = imagePathToDataUrl(imagePath);

  const systemPrompt = SCORING_SYSTEM_PROMPT;
  const userPrompt = SCORING_USER_PROMPT;

  const res = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "qwen-vl-max",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: userPrompt },
          ],
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Qwen-VL scoring error:", data);
    throw new Error(data.error?.message || "评分请求失败");
  }

  const text: string = data.choices?.[0]?.message?.content ?? "";
  console.log("[ScoreOutfit] raw response:", text);

  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    console.error("Qwen-VL unexpected response (no JSON):", text);
    return { score: 70, dims: { ...DEFAULT_DIMS }, evaluation: text.slice(0, 200) };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    const dims: ScoreDims = { ...DEFAULT_DIMS };
    let allValid = true;
    for (const key of DIM_KEYS) {
      if (typeof parsed[key] === "number") {
        dims[key] = clampScore(parsed[key]);
      } else {
        allValid = false;
      }
    }

    const score = allValid
      ? clampScore(DIM_KEYS.reduce((sum, k) => sum + dims[k], 0) / DIM_KEYS.length)
      : clampScore(Number(parsed.score) || 70);

    const evaluation = String(parsed.evaluation || "");

    console.log("[ScoreOutfit] parsed score:", score, "dims:", dims);

    return { score, dims, evaluation };
  } catch {
    console.error("Qwen-VL JSON parse failed:", jsonMatch[0]);
    return { score: 70, dims: { ...DEFAULT_DIMS }, evaluation: text.slice(0, 200) };
  }
}

export async function suggestCombinations(
  items: ItemMeta[],
  weatherContext?: string
): Promise<CombinationSuggestion[]> {
  if (!API_KEY) throw new Error("DASHSCOPE_API_KEY not configured");

  const tops = items.filter(
    (i) => i.category === "TOP" || i.category === "OUTERWEAR"
  );
  const bottoms = items.filter(
    (i) => i.category === "BOTTOM" || i.category === "ONEPIECE"
  );

  if (tops.length === 0 || bottoms.length === 0) {
    throw new Error("衣橱中上衣或下装不足，无法生成推荐");
  }

  const prompt = buildMatchingPrompt(tops, bottoms, weatherContext);

  const res = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "qwen-max",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Qwen-Max suggestion error:", data);
    throw new Error(data.error?.message || "搭配推荐请求失败");
  }

  const text: string = data.choices?.[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Qwen-Max unexpected response:", text);
    throw new Error("搭配推荐返回格式异常");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as CombinationSuggestion[];
    const validTopIds = new Set(tops.map((t) => t.id));
    const validBottomIds = new Set(bottoms.map((b) => b.id));
    return parsed
      .filter(
        (c) => validTopIds.has(c.topItemId) && validBottomIds.has(c.bottomItemId)
      )
      .slice(0, 5);
  } catch {
    throw new Error("搭配推荐返回 JSON 解析失败");
  }
}
