export const VALID_CATEGORIES = ["TOP", "BOTTOM", "OUTERWEAR", "ONEPIECE", "SHOES", "ACCESSORY"];
export const VALID_SEASONS = ["春", "夏", "秋", "冬", "四季"];
export const VALID_OCCASIONS = ["日常", "上班", "约会", "运动", "正式", "出行"];

export const VALID_MATERIALS = ["棉", "牛仔", "丝绸", "羊毛", "涤纶", "皮革", "麻", "雪纺", "针织", "灯芯绒"];
export const VALID_FITS = ["修身", "宽松", "常规", "oversize"];
export const VALID_PATTERNS = ["纯色", "条纹", "格纹", "印花", "碎花", "波点", "拼接"];
export const VALID_THICKNESSES = ["薄", "适中", "厚"];

export function buildRecognizePrompt(): string {
  return `你是一个服装识别助手。请观察图片中的服装/鞋子/配饰，识别以下信息：

1. name: 简短名称（如"白色圆领T恤"、"黑色牛仔裤"）
2. category: 分类，只能是以下之一：TOP(上衣)、BOTTOM(下装)、OUTERWEAR(外套)、ONEPIECE(连体)、SHOES(鞋子)、ACCESSORY(配饰)
3. color: 主要颜色（如"白色"、"深蓝色"）
4. style: 风格（如"休闲"、"正式"、"运动"、"街头"、"复古"）
5. season: 适合季节，只能是以下之一：春、夏、秋、冬、四季
6. occasion: 适合场合，只能是以下之一：日常、上班、约会、运动、正式、出行
7. material: 材质，如：棉、牛仔、丝绸、羊毛、涤纶、皮革、麻、雪纺、针织、灯芯绒
8. fit: 版型，只能是以下之一：修身、宽松、常规、oversize
9. pattern: 图案，只能是以下之一：纯色、条纹、格纹、印花、碎花、波点、拼接
10. thickness: 厚度，只能是以下之一：薄、适中、厚

请严格以JSON格式回复，不要输出其他内容：
{"name": "", "category": "", "color": "", "style": "", "season": "", "occasion": "", "material": "", "fit": "", "pattern": "", "thickness": ""}`;
}
