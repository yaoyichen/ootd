/**
 * wan2.5-i2i-preview 试穿兼容性测试脚本
 *
 * 该模型使用 image2image/image-synthesis 异步端点（与 aitryon 类似），
 * 支持多图输入 (input.images) + prompt 描述。
 *
 * 用法：
 *   node scripts/test-wan25-i2i-tryon.mjs
 *   node scripts/test-wan25-i2i-tryon.mjs <person> <top> <bottom>
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

const SUBMIT_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis";

const TASK_URL = (taskId) =>
  `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;

const MODEL = "wan2.5-i2i-preview";

const PROMPT =
  "图1是一个人的全身正面照。请让这个人穿上图2中的上衣和图3中的裤子/裙子。" +
  "严格保持人物的面部五官、发型、身材比例和姿势完全不变，仅替换身上的衣服。" +
  "输出一张高质量的全身照，真实摄影风格，光线自然。";

const NEGATIVE_PROMPT =
  "面部变化, 五官变形, 姿势改变, 身材变化, 模糊, 低质量, 卡通, AI感, 多余肢体";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;

// 示例图片
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
  // 本地文件转 base64 data URI
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
// 测试方案
// ──────────────────────────────────────────────

/**
 * 方案 A: 多图输入 — images 数组传入 3 张图
 */
async function testMultiImage(personUrl, topUrl, bottomUrl) {
  log("方案 A: 多图输入 (images 数组传 3 张图)");

  const body = JSON.stringify({
    model: MODEL,
    input: {
      images: [personUrl, topUrl, bottomUrl],
      prompt: PROMPT,
      negative_prompt: NEGATIVE_PROMPT,
    },
    parameters: {
      n: 1,
      size: "768*1152",
    },
  });

  return submitAndPoll(body, "multi_image");
}

/**
 * 方案 B: multimodal-generation 端点 (与 qwen-image-2.0 相同格式)
 */
async function testMultimodal(personUrl, topUrl, bottomUrl) {
  log("方案 B: multimodal-generation 端点 (qwen-image-2.0 格式)");

  const body = JSON.stringify({
    model: MODEL,
    input: {
      messages: [
        {
          role: "user",
          content: [
            { image: personUrl },
            { image: topUrl },
            { image: bottomUrl },
            { text: PROMPT },
          ],
        },
      ],
    },
    parameters: {
      n: 1,
      size: "768*1152",
      negative_prompt: NEGATIVE_PROMPT,
      prompt_extend: false,
      watermark: false,
    },
  });

  const startTime = Date.now();
  const multimodalUrl =
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

  const { status, data } = await fetchJSON(multimodalUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (status !== 200 || data.code) {
    log(`方案 B FAIL (${elapsed}s): ${data.message || data.code}`);
    return { success: false, error: data.message || data.code };
  }

  const images =
    data.output?.choices?.[0]?.message?.content?.filter((c) => c.image) || [];
  if (!images.length) {
    log(`方案 B FAIL (${elapsed}s): 无图片输出`);
    return { success: false, error: "无图片输出" };
  }

  const resultUrl = images[0].image;
  log(`方案 B OK (${elapsed}s)`);
  return { success: true, elapsed, url: resultUrl, method: "multimodal" };
}

/**
 * 提交异步任务并轮询
 */
async function submitAndPoll(body, label) {
  const startTime = Date.now();

  const { status, data } = await fetchJSON(SUBMIT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "X-DashScope-Async": "enable",
    },
    body,
  });

  if (status !== 200 || data.code) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`${label} 提交失败 (${elapsed}s): ${data.message || data.code}`);
    if (data.code) log(`错误码: ${data.code}`);
    return { success: false, error: data.message || data.code };
  }

  const taskId = data.output?.task_id;
  if (!taskId) {
    log(`${label} 提交失败: 无 task_id`);
    return { success: false, error: "无 task_id" };
  }

  log(`任务已提交, task_id: ${taskId}`);

  // 轮询
  for (let i = 1; i <= MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const { status: pollStatus, data: pollData } = await fetchJSON(
      TASK_URL(taskId),
      {
        method: "GET",
        headers: { Authorization: `Bearer ${API_KEY}` },
      }
    );

    if (pollStatus !== 200) {
      log(`轮询失败 HTTP ${pollStatus}`);
      continue;
    }

    const taskStatus = pollData.output?.task_status;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`[${i}/${MAX_POLL_ATTEMPTS}] 状态: ${taskStatus} (${elapsed}s)`);

    if (taskStatus === "SUCCEEDED") {
      const resultUrl =
        pollData.output?.results?.[0]?.url ||
        pollData.output?.result_url ||
        pollData.output?.image_url ||
        pollData.output?.output_image_url?.[0];

      if (!resultUrl) {
        log("完整响应:");
        console.log(JSON.stringify(pollData.output, null, 2));
        return { success: false, error: "无结果 URL" };
      }

      log(`${label} OK (${elapsed}s)`);
      return { success: true, elapsed, url: resultUrl, method: "async" };
    }

    if (taskStatus === "FAILED") {
      const errMsg =
        pollData.output?.message || pollData.output?.code || "任务失败";
      log(`${label} FAIL (${elapsed}s): ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  return { success: false, error: "轮询超时" };
}

// ──────────────────────────────────────────────
// 主流程
// ──────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error("错误：请设置环境变量 DASHSCOPE_API_KEY");
    process.exit(1);
  }

  const [, , argPerson, argTop, argBottom] = process.argv;

  const personSrc = argPerson || DEFAULT_PERSON;
  const topSrc = argTop || DEFAULT_TOP;
  const bottomSrc = argBottom || DEFAULT_BOTTOM;

  console.log("\n===== wan2.5-i2i-preview 试穿兼容性测试 =====");
  console.log("模型:", MODEL);
  console.log("价格: 0.20 元/张");
  console.log("人像:", personSrc);
  console.log("上衣:", topSrc);
  console.log("下装:", bottomSrc);
  console.log("==============================================\n");

  log("解析图片...");
  const personImage = resolveImage(personSrc);
  const topImage = resolveImage(topSrc);
  const bottomImage = resolveImage(bottomSrc);

  const results = [];

  // 方案 A: 异步端点 + images 数组
  console.log("\n── 方案 A: 异步端点 + images 数组 ──");
  const resultA = await testMultiImage(personImage, topImage, bottomImage);
  results.push({ name: "A: 异步 images[]", ...resultA });

  // 方案 B: multimodal-generation 同步端点
  console.log("\n── 方案 B: multimodal-generation 同步端点 ──");
  const resultB = await testMultimodal(personImage, topImage, bottomImage);
  results.push({ name: "B: multimodal 同步", ...resultB });

  // 保存成功的结果
  const outputDir = path.resolve("scripts/output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (const r of results) {
    if (r.success && r.url) {
      const filename = `wan25_i2i_${r.method}_${Date.now()}.png`;
      const dest = path.join(outputDir, filename);
      try {
        log(`下载 ${r.name} 结果: ${dest}`);
        await downloadImage(r.url, dest);
        r.file = dest;
      } catch (err) {
        log(`下载失败: ${err.message}`);
      }
    }
  }

  // 汇总
  console.log("\n============ 测试结果汇总 ============");
  for (const r of results) {
    const status = r.success ? "✓ 通过" : "✗ 失败";
    console.log(`${r.name}: ${status}`);
    if (r.success) {
      console.log(`  耗时: ${r.elapsed}s`);
      if (r.file) console.log(`  保存: ${r.file}`);
    } else {
      console.log(`  原因: ${r.error}`);
    }
  }
  console.log("==========================================\n");

  if (results.some((r) => r.success)) {
    console.log("→ wan2.5-i2i-preview 可用于试穿！请查看输出图片评估质量。");
  } else {
    console.log("→ wan2.5-i2i-preview 两种方案均不支持，无法直接用于试穿。");
  }
}

main().catch((err) => {
  console.error("\n✗ 测试失败:", err.message);
  process.exit(1);
});
