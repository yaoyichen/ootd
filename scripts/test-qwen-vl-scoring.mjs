/**
 * Qwen-VL 穿搭评分测试脚本
 *
 * 用法：
 *   node scripts/test-qwen-vl-scoring.mjs                           # 自动选第一张 outfit 图片
 *   node scripts/test-qwen-vl-scoring.mjs web/public/uploads/outfits/xxx.png  # 指定图片
 *
 * 使用与 web/lib/qwen.ts scoreOutfit() 完全相同的请求格式，
 * 用于排查 API 调用是否能正常工作。
 */

import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.DASHSCOPE_API_KEY;
const CHAT_API_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const MODEL = "qwen-vl-max";

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

function imageToDataUrl(filePath) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`文件不存在: ${absPath}`);
  }
  const ext = path.extname(absPath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const data = fs.readFileSync(absPath).toString("base64");
  const sizeKB = (Buffer.byteLength(data, "base64") / 1024).toFixed(1);
  log(`图片大小: ${sizeKB} KB (base64), 格式: ${mime}`);
  return `data:${mime};base64,${data}`;
}

function findFirstOutfitImage() {
  const outfitDir = path.resolve("web/public/uploads/outfits");
  if (!fs.existsSync(outfitDir)) {
    throw new Error(`目录不存在: ${outfitDir}`);
  }
  const files = fs
    .readdirSync(outfitDir)
    .filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
  if (files.length === 0) {
    throw new Error("uploads/outfits/ 中没有图片文件");
  }
  return path.join(outfitDir, files[0]);
}

async function main() {
  if (!API_KEY) {
    console.error("错误：请设置环境变量 DASHSCOPE_API_KEY");
    console.error("  export DASHSCOPE_API_KEY=sk-xxxxxxxxxxxx");
    process.exit(1);
  }

  const argImage = process.argv[2];
  const imagePath = argImage || findFirstOutfitImage();

  console.log("\n===== Qwen-VL 穿搭评分测试 =====");
  console.log("模型:", MODEL);
  console.log("API:", CHAT_API_URL);
  console.log("图片:", imagePath);
  console.log("==================================\n");

  // Step 1: 转换图片为 data URL
  log("转换图片为 base64...");
  const imageUrl = imageToDataUrl(imagePath);

  // Step 2: 构建请求 (与 web/lib/qwen.ts scoreOutfit 一致)
  const prompt = `你是一位专业的时尚顾问。请仔细观察这张穿搭效果图，从以下维度进行评分：
1. 整体协调性（颜色搭配是否和谐、风格是否统一）
2. 时尚感（是否符合当下流行趋势）
3. 实穿性（是否适合日常穿着）

请给出 1-100 的综合评分，以及 2-3 句简洁的中文评语。

请严格以如下 JSON 格式回复，不要包含其他内容：
{"score": 85, "evaluation": "你的评语"}`;

  const requestBody = {
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
  };

  log("发送评分请求...");
  log(`请求体 (不含图片 base64): model=${MODEL}, prompt 长度=${prompt.length}`);

  const startTime = Date.now();

  try {
    const res = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`收到响应: HTTP ${res.status} (${elapsed}s)`);

    const data = await res.json();

    // 打印完整响应
    console.log("\n--- 完整响应 ---");
    console.log(JSON.stringify(data, null, 2));
    console.log("--- 响应结束 ---\n");

    if (!res.ok) {
      console.error(`API 错误 (HTTP ${res.status})`);
      console.error("error:", data.error);
      process.exit(1);
    }

    // Step 3: 解析结果
    const text = data.choices?.[0]?.message?.content ?? "";
    log(`模型返回文本: "${text}"`);

    const jsonMatch = text.match(
      /\{[\s\S]*?"score"[\s\S]*?"evaluation"[\s\S]*?\}/
    );
    if (!jsonMatch) {
      console.error("无法从响应中提取 JSON，原始文本:", text);
      process.exit(1);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 70));
    const evaluation = String(parsed.evaluation || "");

    console.log("\n==================================");
    console.log("测试成功！");
    console.log(`  评分: ${score}`);
    console.log(`  评语: ${evaluation}`);
    console.log("==================================\n");
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n请求失败 (${elapsed}s):`, err.message);
    if (err.cause) console.error("cause:", err.cause);
    process.exit(1);
  }
}

main();
