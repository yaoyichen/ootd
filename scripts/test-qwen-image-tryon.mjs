/**
 * Qwen-Image-2.0-Pro 图像编辑试穿测试脚本
 *
 * 用法：
 *   node scripts/test-qwen-image-tryon.mjs <person> <top> <bottom>
 *   node scripts/test-qwen-image-tryon.mjs  # 使用默认示例图片
 *
 * 图片支持：
 *   - HTTP/HTTPS 公开 URL
 *   - 本地文件路径（自动转 Base64）
 *
 * 与 aitryon 测试脚本的区别：
 *   - 使用 qwen-image-2.0-pro 图像编辑 API（同步，无需轮询）
 *   - 支持最多 3 张图片输入 + prompt 指令
 *   - 支持 Base64 直传，无需上传 OSS
 *
 * 结果图片保存到 scripts/output/ 目录
 */

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";

// ──────────────────────────────────────────────
// 配置
// ──────────────────────────────────────────────

const API_KEY = process.env.DASHSCOPE_API_KEY;

const API_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

const MODEL = "qwen-image-2.0-pro";

const PROMPT =
  "图1是一个人的全身正面照。请让这个人穿上图2中的上衣和图3中的裤子/裙子。" +
  "严格保持人物的面部五官、发型、身材比例和姿势完全不变，仅替换身上的衣服。" +
  "输出一张高质量的全身照，真实摄影风格，光线自然。";

const NEGATIVE_PROMPT =
  "面部变化, 五官变形, 姿势改变, 身材变化, 模糊, 低质量, 卡通, AI感, 多余肢体";

const OUTPUT_SIZE = "768*1152"; // 3:4 竖版

// 示例图片（可替换为自己的图片 URL 或本地路径）
const DEFAULT_PERSON =
  "https://img.alicdn.com/imgextra/i1/O1CN01gBcFsb1T9ssZeyjMs_!!6000000002342-0-tps-450-668.jpg";
const DEFAULT_TOP =
  "https://img.alicdn.com/imgextra/i3/O1CN01x9YUsc1nwd4V2i2Ob_!!6000000005154-0-tps-480-600.jpg";
const DEFAULT_BOTTOM =
  "https://img.alicdn.com/imgextra/i4/O1CN01mGR3081g7D0ILFPXV_!!6000000004094-0-tps-476-594.jpg";

// ──────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

/**
 * 将本地文件转为 data URI，URL 直接返回
 */
function resolveImage(input) {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }
  const absPath = path.resolve(input);
  if (!fs.existsSync(absPath)) {
    throw new Error(`本地文件不存在: ${absPath}`);
  }
  const ext = path.extname(absPath).toLowerCase().replace(".", "");
  const mime =
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext || "png"}`;
  const data = fs.readFileSync(absPath).toString("base64");
  return `data:${mime};base64,${data}`;
}

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const reqHeaders = { ...options.headers, Connection: "close" };
    const req = client.request(
      url,
      { ...options, headers: reqHeaders, agent: false },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            reject(new Error(`无法解析响应: ${body.slice(0, 500)}`));
          }
        });
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    client
      .get(url, { agent: false }, (res) => {
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

// ──────────────────────────────────────────────
// 主流程
// ──────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error("错误：请设置环境变量 DASHSCOPE_API_KEY");
    console.error("  export DASHSCOPE_API_KEY=sk-xxxxxxxxxxxx");
    process.exit(1);
  }

  const [, , argPerson, argTop, argBottom] = process.argv;

  const personSrc = argPerson || DEFAULT_PERSON;
  const topSrc = argTop || DEFAULT_TOP;
  const bottomSrc = argBottom || DEFAULT_BOTTOM;

  console.log("\n===== Qwen-Image-2.0-Pro 图像编辑试穿 测试 =====");
  console.log("模型:", MODEL);
  console.log("人像:", personSrc);
  console.log("上衣:", topSrc);
  console.log("下装:", bottomSrc);
  console.log("输出尺寸:", OUTPUT_SIZE);
  console.log("=================================================\n");

  // 解析图片（URL 直接使用，本地文件转 Base64）
  log("解析图片...");
  const personImage = resolveImage(personSrc);
  const topImage = resolveImage(topSrc);
  const bottomImage = resolveImage(bottomSrc);

  const isBase64 = (s) => s.startsWith("data:");
  log(
    `人像: ${isBase64(personImage) ? "Base64" : "URL"}, ` +
      `上衣: ${isBase64(topImage) ? "Base64" : "URL"}, ` +
      `下装: ${isBase64(bottomImage) ? "Base64" : "URL"}`
  );

  // 构建请求
  const requestBody = JSON.stringify({
    model: MODEL,
    input: {
      messages: [
        {
          role: "user",
          content: [
            { image: personImage },
            { image: topImage },
            { image: bottomImage },
            { text: PROMPT },
          ],
        },
      ],
    },
    parameters: {
      n: 1,
      size: OUTPUT_SIZE,
      negative_prompt: NEGATIVE_PROMPT,
      prompt_extend: false,
      watermark: false,
    },
  });

  log(`提交图像编辑请求 (model: ${MODEL})...`);
  log("（同步接口，等待生成中，通常需要 10–30 秒...）");

  const { status, data } = await fetchJSON(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: requestBody,
  });

  if (status !== 200 || data.code) {
    console.error("\n完整响应:", JSON.stringify(data, null, 2));
    throw new Error(
      `API 错误 (HTTP ${status}): ${data.message || data.code || "未知错误"}`
    );
  }

  // 提取结果图片 URL
  const choices = data.output?.choices;
  if (!choices?.length) {
    console.error("\n完整响应:", JSON.stringify(data, null, 2));
    throw new Error("响应中无 choices");
  }

  const images = choices[0].message?.content?.filter((c) => c.image) || [];
  if (!images.length) {
    console.error("\n完整响应:", JSON.stringify(data, null, 2));
    throw new Error("响应中未找到生成的图片");
  }

  const resultUrl = images[0].image;
  log(`生成成功！图片 URL: ${resultUrl}`);

  if (data.usage) {
    log(
      `图片尺寸: ${data.usage.width}x${data.usage.height}, 生成数量: ${data.usage.image_count}`
    );
  }

  // 保存结果图片
  const outputDir = path.resolve("scripts/output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `qwen_tryon_${Date.now()}.png`;
  const dest = path.join(outputDir, filename);

  log(`正在下载结果图片到 ${dest} ...`);
  await downloadImage(resultUrl, dest);

  console.log("\n=================================================");
  console.log("✓ 测试成功！");
  console.log("  结果 URL:", resultUrl);
  console.log("  本地保存:", dest);
  console.log("  Prompt:", PROMPT);
  console.log("=================================================\n");
}

main().catch((err) => {
  console.error("\n✗ 测试失败:", err.message);
  process.exit(1);
});
