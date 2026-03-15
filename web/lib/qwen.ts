import fs from "node:fs";
import path from "node:path";

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

interface ItemMeta {
  id: string;
  name: string;
  category: string;
  color?: string | null;
  style?: string | null;
  season?: string | null;
  occasion?: string | null;
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

  const systemPrompt = `你是一位资深时尚编辑，拥有20年从业经验，评分非常严格且精准。
你的评分必须基于图片中的真实观察，每套搭配的分数必须不同。
你绝不会给所有搭配相同的分数——每张图片都有独特的优缺点。
五个维度的分数必须各有高低，绝不能相同。`;

  const userPrompt = `请仔细观察这张穿搭效果图，分别对以下五个维度独立评分（每项1-100分）：

1. colorHarmony（色彩和谐）：颜色搭配是否和谐，对比色/互补色/同色系是否运用得当
2. styleCohesion（风格统一）：上下装风格体系是否一致，混搭是否合理
3. trendiness（时尚度）：是否符合当季流行趋势，有无设计感或潮流元素
4. practicality（实穿性）：日常穿着是否方便舒适，场景适用范围是否广
5. creativity（创意度）：搭配是否有巧思亮点，是否展现个人风格

评分参考：
- 93分：该维度堪称完美
- 85分：该维度表现优秀
- 75分：该维度表现中等
- 63分：该维度有明显短板
- 50分以下：该维度表现差

重要：五个维度的分数必须各不相同，不要给出相同的数字。一套保守经典的搭配，实穿性和风格统一可能高分，但创意度应该低分。一套大胆前卫的搭配，创意度和时尚度可能高分，但实穿性应该低分。

请严格按以下JSON格式回复，不要输出任何其他内容：
{"colorHarmony": 82, "styleCohesion": 76, "trendiness": 71, "practicality": 88, "creativity": 65, "evaluation": "2-3句评语"}

以下是两个评分示例供参考：

示例1（经典通勤搭配）：
{"colorHarmony": 89, "styleCohesion": 92, "trendiness": 74, "practicality": 95, "creativity": 61, "evaluation": "黑色西装配同色系阔腿裤，剪裁利落比例极佳，内搭白T提亮整体。搭配经典实用但缺乏亮点，创意度一般。"}

示例2（大胆撞色搭配）：
{"colorHarmony": 58, "styleCohesion": 63, "trendiness": 82, "practicality": 52, "creativity": 88, "evaluation": "荧光绿上衣与红色格纹裙撞色大胆，创意十足但和谐感不足。整体风格前卫，日常穿着场景有限，适合街拍或派对。"}

现在请评价图片中的穿搭：`;

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
  items: ItemMeta[]
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

  const formatItem = (i: ItemMeta) =>
    `  - id="${i.id}" ${i.name}${i.color ? ` 颜色:${i.color}` : ""}${i.style ? ` 风格:${i.style}` : ""}${i.season ? ` 季节:${i.season}` : ""}${i.occasion ? ` 场合:${i.occasion}` : ""}`;

  const prompt = `你是一位专业的时尚搭配师。以下是用户衣橱中的单品：

【上衣/外套】
${tops.map(formatItem).join("\n")}

【下装/连体】
${bottoms.map(formatItem).join("\n")}

请从中选出 5 种最佳搭配组合（每组一件上衣+一件下装），优先考虑：
1. 颜色协调（同色系、互补色、中性色搭配）
2. 风格统一
3. 多样性（尽量覆盖不同风格）

请严格以如下 JSON 数组格式回复，不要包含其他内容：
[{"topItemId": "上衣id", "bottomItemId": "下装id", "reason": "简短搭配理由"}]`;

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
