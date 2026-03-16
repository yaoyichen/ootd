export interface ItemMeta {
  id: string;
  name: string;
  category: string;
  color?: string | null;
  style?: string | null;
  season?: string | null;
  occasion?: string | null;
}

export function buildMatchingPrompt(
  tops: ItemMeta[],
  bottoms: ItemMeta[],
  weatherContext?: string
): string {
  const formatItem = (i: ItemMeta) =>
    `  - id="${i.id}" ${i.name}${i.color ? ` 颜色:${i.color}` : ""}${i.style ? ` 风格:${i.style}` : ""}${i.season ? ` 季节:${i.season}` : ""}${i.occasion ? ` 场合:${i.occasion}` : ""}`;

  const weatherBlock = weatherContext
    ? `\n【今日天气】\n${weatherContext}\n`
    : "";

  const weatherHint = weatherContext
    ? "\n4. 适合当前天气（根据气温和天气状况选择合适的面料厚度和款式）"
    : "";

  return `你是一位专业的时尚搭配师。以下是用户衣橱中的单品：

【上衣/外套】
${tops.map(formatItem).join("\n")}

【下装/连体】
${bottoms.map(formatItem).join("\n")}
${weatherBlock}
请从中选出 5 种最佳搭配组合（每组一件上衣+一件下装），优先考虑：
1. 颜色协调（同色系、互补色、中性色搭配）
2. 风格统一
3. 多样性（尽量覆盖不同风格）${weatherHint}

请严格以如下 JSON 数组格式回复，不要包含其他内容：
[{"topItemId": "上衣id", "bottomItemId": "下装id", "reason": "简短搭配理由"}]`;
}
