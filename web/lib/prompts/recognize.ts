export const VALID_CATEGORIES = ["TOP", "BOTTOM", "OUTERWEAR", "ONEPIECE", "SHOES", "ACCESSORY"];
export const VALID_SEASONS = ["春", "夏", "秋", "冬", "四季"];
export const VALID_OCCASIONS = ["日常", "上班", "约会", "运动", "正式", "出行"];

export function buildRecognizePrompt(): string {
  return `你是一个服装识别助手。请观察图片中的服装/鞋子/配饰，识别以下信息：

1. name: 简短名称（如"白色圆领T恤"、"黑色牛仔裤"）
2. category: 分类，只能是以下之一：TOP(上衣)、BOTTOM(下装)、OUTERWEAR(外套)、ONEPIECE(连体)、SHOES(鞋子)、ACCESSORY(配饰)
3. color: 主要颜色（如"白色"、"深蓝色"）
4. style: 风格（如"休闲"、"正式"、"运动"、"街头"、"复古"）
5. season: 适合季节，只能是以下之一：春、夏、秋、冬、四季
6. occasion: 适合场合，只能是以下之一：日常、上班、约会、运动、正式、出行

请严格以JSON格式回复，不要输出其他内容：
{"name": "", "category": "", "color": "", "style": "", "season": "", "occasion": ""}`;
}
