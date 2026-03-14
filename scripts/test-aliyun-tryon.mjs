/**
 * 阿里云百炼 AI试衣 API 独立测试脚本
 *
 * 用法：
 *   DASHSCOPE_API_KEY=sk-xxx node scripts/test-aliyun-tryon.mjs
 *   DASHSCOPE_API_KEY=sk-xxx node scripts/test-aliyun-tryon.mjs <person_url> <top_url> <bottom_url>
 *
 * 图片支持：
 *   - HTTP/HTTPS 公开 URL
 *   - 本地文件路径（自动上传至 DashScope 临时 OSS）
 *
 * 结果图片会保存到 scripts/output/ 目录
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
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis/";

const TASK_URL = (taskId) =>
  `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;

const MODEL = "aitryon-plus"; // 或 "aitryon"（基础版，速度更快）

const POLL_INTERVAL_MS = 3000; // 轮询间隔
const MAX_POLL_ATTEMPTS = 60;  // 最多轮询 60 次 ≈ 3 分钟

// 示例图片（可替换为自己的图片 URL 或本地路径）
const DEFAULT_PERSON_IMAGE =
  "https://img.alicdn.com/imgextra/i1/O1CN01gBcFsb1T9ssZeyjMs_!!6000000002342-0-tps-450-668.jpg";
const DEFAULT_TOP_IMAGE =
  "https://img.alicdn.com/imgextra/i3/O1CN01x9YUsc1nwd4V2i2Ob_!!6000000005154-0-tps-480-600.jpg";
const DEFAULT_BOTTOM_IMAGE =
  "https://img.alicdn.com/imgextra/i4/O1CN01mGR3081g7D0ILFPXV_!!6000000004094-0-tps-476-594.jpg";

// ──────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────

/**
 * 获取 DashScope 临时文件上传凭证
 */
async function getUploadPolicy() {
  const url = `https://dashscope.aliyuncs.com/api/v1/uploads?action=getPolicy&model=${MODEL}`;
  const { status, data } = await fetchJSON(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (status !== 200 || !data.data) {
    throw new Error(`获取上传凭证失败: ${JSON.stringify(data)}`);
  }
  return data.data;
}

/**
 * 将本地文件上传到 DashScope 临时 OSS，返回 oss:// URL
 */
async function uploadToOSS(filePath, policy) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`本地文件不存在: ${absPath}`);
  }

  const fileName = path.basename(absPath);
  const key = `${policy.upload_dir}/${fileName}`;
  const fileData = fs.readFileSync(absPath);

  const boundary = `----FormBoundary${Date.now()}`;

  const fields = [
    ["OSSAccessKeyId", policy.oss_access_key_id],
    ["Signature", policy.signature],
    ["policy", policy.policy],
    ["x-oss-object-acl", policy.x_oss_object_acl],
    ["x-oss-forbid-overwrite", policy.x_oss_forbid_overwrite],
    ["key", key],
    ["success_action_status", "200"],
  ];

  const parts = [];
  for (const [name, value] of fields) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    );
  }

  const ext = path.extname(absPath).toLowerCase().replace(".", "");
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext || "png"}`;
  const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`;
  const fileTail = `\r\n--${boundary}--\r\n`;

  const header = Buffer.from(parts.join("") + fileHeader, "utf-8");
  const tail = Buffer.from(fileTail, "utf-8");
  const body = Buffer.concat([header, fileData, tail]);

  const uploadUrl = new URL(policy.upload_host);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: uploadUrl.hostname,
        port: 443,
        path: "/",
        method: "POST",
        agent: false,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
          Connection: "close",
        },
      },
      (res) => {
        let respBody = "";
        res.on("data", (chunk) => (respBody += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(`oss://${key}`);
          } else {
            reject(new Error(`上传文件失败 HTTP ${res.statusCode}: ${respBody}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * 解析图片来源：URL 直接使用，本地文件上传到 OSS 获取临时 URL
 */
async function resolveImage(input, policy) {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }
  log(`上传本地文件: ${input} ...`);
  const ossUrl = await uploadToOSS(input, policy);
  log(`上传完成: ${ossUrl}`);
  return ossUrl;
}

let _hasLocalFiles = false;

/**
 * 构建请求体
 */
async function buildInput(personSrc, topSrc, bottomSrc) {
  const isLocal = (s) =>
    !s.startsWith("http://") && !s.startsWith("https://");
  _hasLocalFiles = isLocal(personSrc) || isLocal(topSrc) || isLocal(bottomSrc);

  let policy = null;
  if (_hasLocalFiles) {
    log("检测到本地文件，获取上传凭证...");
    policy = await getUploadPolicy();
  }

  const [personUrl, topUrl, bottomUrl] = await Promise.all([
    resolveImage(personSrc, policy),
    resolveImage(topSrc, policy),
    resolveImage(bottomSrc, policy),
  ]);

  return {
    person_image_url: personUrl,
    top_garment_url: topUrl,
    bottom_garment_url: bottomUrl,
  };
}

async function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const reqHeaders = { ...options.headers, Connection: "close" };
    const req = client.request(url, { ...options, headers: reqHeaders, agent: false }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          reject(new Error(`无法解析响应: ${body}`));
        }
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

/**
 * 下载图片到本地
 */
async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    client.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// ──────────────────────────────────────────────
// 主流程
// ──────────────────────────────────────────────

async function submitTask(input) {
  const body = JSON.stringify({
    model: MODEL,
    input,
    parameters: {},
  });

  log(`提交试穿任务 (model: ${MODEL})...`);

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`,
    "X-DashScope-Async": "enable",
  };
  if (_hasLocalFiles) {
    headers["X-DashScope-OssResourceResolve"] = "enable";
  }

  const { status, data } = await fetchJSON(SUBMIT_URL, {
    method: "POST",
    headers,
    body,
  });

  if (status !== 200) {
    throw new Error(
      `提交失败 HTTP ${status}: ${JSON.stringify(data)}`
    );
  }

  if (data.code) {
    throw new Error(`API 错误 ${data.code}: ${data.message}`);
  }

  const taskId = data.output?.task_id;
  if (!taskId) {
    throw new Error(`响应中无 task_id: ${JSON.stringify(data)}`);
  }

  log(`任务已提交，task_id: ${taskId}`);
  return taskId;
}

async function pollTask(taskId) {
  const url = TASK_URL(taskId);
  const headers = { Authorization: `Bearer ${API_KEY}` };

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const { status, data } = await fetchJSON(url, { method: "GET", headers });

    if (status !== 200) {
      throw new Error(`轮询失败 HTTP ${status}: ${JSON.stringify(data)}`);
    }

    const taskStatus = data.output?.task_status;
    log(`[${attempt}/${MAX_POLL_ATTEMPTS}] 状态: ${taskStatus}`);

    if (taskStatus === "SUCCEEDED") {
      return data.output;
    }

    if (taskStatus === "FAILED") {
      const errMsg = data.output?.message || data.message || JSON.stringify(data);
      throw new Error(`任务失败: ${errMsg}`);
    }

    // PENDING / RUNNING → 继续轮询
  }

  throw new Error(`轮询超时（已等待 ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000} 秒）`);
}

async function main() {
  if (!API_KEY) {
    console.error("错误：请设置环境变量 DASHSCOPE_API_KEY");
    console.error("  export DASHSCOPE_API_KEY=sk-xxxxxxxxxxxx");
    process.exit(1);
  }

  const [, , argPerson, argTop, argBottom] = process.argv;

  const personSrc = argPerson || DEFAULT_PERSON_IMAGE;
  const topSrc = argTop || DEFAULT_TOP_IMAGE;
  const bottomSrc = argBottom || DEFAULT_BOTTOM_IMAGE;

  console.log("\n===== 阿里云百炼 AI试衣 测试 =====");
  console.log("人像:", personSrc);
  console.log("上衣:", topSrc);
  console.log("下装:", bottomSrc);
  console.log("===================================\n");

  // 解析图片（URL 直接使用，本地文件上传至 OSS 获取临时 URL）
  const input = await buildInput(personSrc, topSrc, bottomSrc);

  // 提交任务
  const taskId = await submitTask(input);

  // 轮询结果
  log("开始轮询结果...");
  const output = await pollTask(taskId);

  // 获取结果图片 URL
  const resultUrl =
    output.image_url ||
    output.output_image_url?.[0] ||
    output.result_url;

  if (!resultUrl) {
    console.log("\n完整响应:", JSON.stringify(output, null, 2));
    throw new Error("响应中未找到结果图片 URL，请查看上方完整响应");
  }

  log(`生成成功！图片 URL: ${resultUrl}`);

  // 保存结果图片
  const outputDir = path.resolve("scripts/output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `tryon_${Date.now()}.jpg`;
  const dest = path.join(outputDir, filename);

  log(`正在下载结果图片到 ${dest} ...`);
  await downloadImage(resultUrl, dest);

  console.log("\n===================================");
  console.log("✓ 测试成功！");
  console.log("  结果 URL:", resultUrl);
  console.log("  本地保存:", dest);
  console.log("===================================\n");
}

main().catch((err) => {
  console.error("\n✗ 测试失败:", err.message);
  process.exit(1);
});
