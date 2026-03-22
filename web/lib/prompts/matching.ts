export interface ItemMeta {
  id: string;
  name: string;
  category: string;
  color?: string | null;
  style?: string | null;
  season?: string | null;
  occasion?: string | null;
  material?: string | null;
  fit?: string | null;
  pattern?: string | null;
  thickness?: string | null;
  description?: string | null;
}

export const OCCASION_LABELS: Record<string, string> = {
  date: "约会甜蜜",
  work: "职场通勤",
  friends: "闺蜜聚会",
  casual: "周末逛街",
  sport: "健身运动",
  formal: "正式场合",
};

export function buildMatchingPrompt(
  tops: ItemMeta[],
  bottoms: ItemMeta[],
  weatherContext?: string,
  personDescription?: string,
  occasion?: string
): string {
  const formatItem = (i: ItemMeta) =>
    `  - id="${i.id}" ${i.name}${i.color ? ` 颜色:${i.color}` : ""}${i.material ? ` 材质:${i.material}` : ""}${i.fit ? ` 版型:${i.fit}` : ""}${i.pattern ? ` 图案:${i.pattern}` : ""}${i.thickness ? ` 厚度:${i.thickness}` : ""}${i.style ? ` 风格:${i.style}` : ""}${i.season ? ` 季节:${i.season}` : ""}${i.occasion ? ` 场合:${i.occasion}` : ""}${i.description ? ` 描述:${i.description}` : ""}`;

  const weatherBlock = weatherContext
    ? `\n【天气信息】\n${weatherContext}\n`
    : "";

  const personBlock = personDescription
    ? `\n【用户信息】\n${personDescription}\n`
    : "";

  const occasionLabel = occasion ? OCCASION_LABELS[occasion] : undefined;
  const occasionBlock = occasionLabel
    ? `\n【场景需求】\n用户正在为「${occasionLabel}」场景搭配，请优先推荐符合该场景着装风格和氛围的组合。\n`
    : "";

  let n = 4;
  const weatherHint = weatherContext
    ? `\n${n++}. 适合目标日期天气（根据预报气温和天气状况选择合适的面料厚度和款式）`
    : "";

  const personHint = personDescription
    ? `\n${n++}. 适合用户的肤色、体型和个人气质`
    : "";

  const occasionHint = occasionLabel
    ? `\n${n++}. 符合「${occasionLabel}」场景的着装风格和氛围`
    : "";

  return `你是一位专业的时尚搭配师。以下是用户衣橱中的单品：

【上衣/外套】
${tops.map(formatItem).join("\n")}

【下装/连体】
${bottoms.map(formatItem).join("\n")}
${weatherBlock}${personBlock}${occasionBlock}
请从中选出 5 种最佳搭配组合（每组一件上衣+一件下装），优先考虑：
1. 颜色协调（同色系、互补色、中性色搭配）
2. 风格统一
3. 多样性（尽量覆盖不同风格）${weatherHint}${personHint}${occasionHint}

请严格以如下 JSON 数组格式回复，不要包含其他内容：
[{"topItemId": "上衣id", "bottomItemId": "下装id", "reason": "简短搭配理由"}]`;
}
