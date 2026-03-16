export const TRYON_NEGATIVE_PROMPT =
  "面部变化, 五官变形, 姿势改变, 身材变化, 模糊, 低质量, 卡通, AI感, 多余肢体";

export function buildTryonPrompt(hasTop: boolean, hasBottom: boolean): string {
  const garmentDesc =
    hasTop && hasBottom
      ? "图2中的上衣和图3中的裤子/裙子"
      : hasTop
        ? "图2中的上衣"
        : "图2中的裤子/裙子";

  return (
    `图1是一个人的全身正面照。请让这个人穿上${garmentDesc}。` +
    "严格保持人物的面部五官、发型、身材比例和站立姿势完全不变，仅替换身上的衣服。" +
    "输出一张高质量的全身照，真实摄影风格，光线自然。"
  );
}
