/**
 * 试穿模型兼容性测试脚本
 *
 * 测试 qwen-image 系列模型是否能通过 multimodal-generation 端点
 * 接受图片输入，用于虚拟试穿场景。
 *
 * 用法：
 *   node scripts/test-tryon-model.mjs <model>
 *   node scripts/test-tryon-model.mjs <model> <person> <top> <bottom>
 *   node scripts/test-tryon-model.mjs --all   # 逐个测试所有候选模型
 *
 * 支持的模型（按价格升序）：
 *   qwen-image-2.0        0.2 元/张
 *   qwen-image-plus       0.2 元/张
 *   qwen-image            0.25 元/张
 *   qwen-image-2.0-pro    0.5 元/张
 *   qwen-image-max        0.5 元/张
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

const CANDIDATE_MODELS = [
  { id: "qwen-image-2.0",     price: "0.2 元/张" },
  { id: "qwen-image-plus",    price: "0.2 元/张" },
  { id: "qwen-image",         price: "0.25 元/张" },
  { id: "qwen-image-2.0-pro", price: "0.5 元/张" },
  { id: "qwen-image-max",     price: "0.5 元/张" },
];

const PROMPT =
  "图1是一个人的全身正面照。请让这个人穿上图2中的上衣和图3中的裤子/裙子。" +
  "严格保持人物的面部五官、发型、身材比例和姿势完全不变，仅替换身上的衣服。" +
  "输出一张高质量的全身照，真实摄影风格，光线自然。";

const NEGATIVE_PROMPT =
  "面部变化, 五官变形, 姿势改变, 身材变化, 模糊, 低质量, 卡通, AI感, 多余肢体";

const OUTPUT_SIZE = "768*1152";

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
// 单模型测试
// ──────────────────────────────────────────────

async function testModel(model, personSrc, topSrc, bottomSrc) {
  const personImage = resolveImage(personSrc);
  const topImage = resolveImage(topSrc);
  const bottomImage = resolveImage(bottomSrc);

  const requestBody = JSON.stringify({
    model,
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

  log(`提交请求 (model: ${model})...`);

  const startTime = Date.now();
  const { status, data } = await fetchJSON(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: requestBody,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (status !== 200 || data.code) {
    const errMsg = data.message || data.code || "未知错误";
    log(`FAIL (${elapsed}s) HTTP ${status}: ${errMsg}`);
    return { model, success: false, elapsed, error: errMsg };
  }

  const choices = data.output?.choices;
  const images = choices?.[0]?.message?.content?.filter((c) => c.image) || [];
  if (!images.length) {
    log(`FAIL (${elapsed}s): 响应中未找到生成的图片`);
    return { model, success: false, elapsed, error: "无图片输出" };
  }

  const resultUrl = images[0].image;
  log(`OK (${elapsed}s) 图片: ${resultUrl.slice(0, 80)}...`);

  // 保存结果
  const outputDir = path.resolve("scripts/output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const safeModelName = model.replace(/[^a-z0-9-]/g, "_");
  const filename = `tryon_${safeModelName}_${Date.now()}.png`;
  const dest = path.join(outputDir, filename);

  await downloadImage(resultUrl, dest);
  log(`已保存: ${dest}`);

  return { model, success: true, elapsed, file: dest, url: resultUrl };
}

// ──────────────────────────────────────────────
// 主流程
// ──────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error("错误：请设置环境变量 DASHSCOPE_API_KEY");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const isAll = args[0] === "--all";

  let models;
  let personSrc, topSrc, bottomSrc;

  if (isAll) {
    models = CANDIDATE_MODELS;
    personSrc = args[1] || DEFAULT_PERSON;
    topSrc = args[2] || DEFAULT_TOP;
    bottomSrc = args[3] || DEFAULT_BOTTOM;
  } else {
    const modelId = args[0];
    if (!modelId) {
      console.log("用法:");
      console.log("  node scripts/test-tryon-model.mjs <model-id>");
      console.log("  node scripts/test-tryon-model.mjs --all");
      console.log("\n可选模型:");
      for (const m of CANDIDATE_MODELS) {
        console.log(`  ${m.id.padEnd(25)} ${m.price}`);
      }
      process.exit(0);
    }
    const info = CANDIDATE_MODELS.find((m) => m.id === modelId);
    models = [info || { id: modelId, price: "未知" }];
    personSrc = args[1] || DEFAULT_PERSON;
    topSrc = args[2] || DEFAULT_TOP;
    bottomSrc = args[3] || DEFAULT_BOTTOM;
  }

  console.log(`\n===== 试穿模型兼容性测试 =====`);
  console.log(`待测模型: ${models.map((m) => m.id).join(", ")}`);
  console.log(`端点: ${API_URL}`);
  console.log(`==============================\n`);

  log("解析图片...");
  // 预解析一次确认图片可用
  resolveImage(personSrc);
  resolveImage(topSrc);
  resolveImage(bottomSrc);
  log("图片解析完成\n");

  const results = [];

  for (const m of models) {
    console.log(`── ${m.id} (${m.price}) ──`);
    try {
      const r = await testModel(m.id, personSrc, topSrc, bottomSrc);
      results.push(r);
    } catch (err) {
      results.push({ model: m.id, success: false, elapsed: "?", error: err.message });
    }
    console.log();
  }

  // 汇总
  console.log("============ 测试结果汇总 ============");
  console.log("模型".padEnd(28) + "状态".padEnd(8) + "耗时".padEnd(10) + "价格");
  console.log("─".repeat(60));

  for (const r of results) {
    const info = CANDIDATE_MODELS.find((m) => m.id === r.model);
    const status = r.success ? "✓ 通过" : "✗ 失败";
    const time = r.success ? `${r.elapsed}s` : "-";
    const price = info?.price || "未知";
    console.log(`${r.model.padEnd(28)}${status.padEnd(8)}${time.padEnd(10)}${price}`);
    if (!r.success) console.log(`  └─ ${r.error}`);
  }

  console.log("─".repeat(60));

  const passed = results.filter((r) => r.success);
  if (passed.length > 0) {
    console.log(`\n可用模型 (${passed.length}/${results.length}):`);
    for (const r of passed) {
      console.log(`  TRYON_MODEL=${r.model}`);
    }
  }

  console.log("==========================================\n");
}

main().catch((err) => {
  console.error("\n✗ 测试失败:", err.message);
  process.exit(1);
});
