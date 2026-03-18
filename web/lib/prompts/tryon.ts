export const TRYON_NEGATIVE_PROMPT =
  "面部变化, 五官变形, 姿势改变, 身材变化, 模糊, 低质量, 卡通, AI感, 多余肢体";

interface TryonPromptOptions {
  hasTop: boolean;
  hasBottom: boolean;
  topName?: string;
  bottomName?: string;
}

export function buildTryonPrompt({ hasTop, hasBottom, topName, bottomName }: TryonPromptOptions): string {
  const topDesc = topName ? `图2中的${topName}` : "图2中的上衣";
  const bottomIdx = hasTop ? "图3" : "图2";
  const bottomDesc = bottomName ? `${bottomIdx}中的${bottomName}` : `${bottomIdx}中的裤子/裙子`;

  const garmentDesc =
    hasTop && hasBottom
      ? `${topDesc}和${bottomDesc}`
      : hasTop
        ? topDesc
        : bottomDesc;

  return (
    `图1是一个人的全身正面照。请让这个人穿上${garmentDesc}。` +
    "严格保持人物的面部五官、发型、身材比例和站立姿势完全不变，仅替换身上的衣服。" +
    "严格按照每件衣服图片中的原始设计还原，不要修改、添加或删除任何服装结构细节。" +
    "输出一张高质量的全身照，真实摄影风格，光线自然。"
  );
}
