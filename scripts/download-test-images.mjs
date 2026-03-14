/**
 * 批量下载测试图片脚本
 *
 * 从 Unsplash 搜索并下载服装和人像图片到 test_data/ 目录
 * 无需 API key，使用 Unsplash 内部搜索接口
 *
 * 用法：
 *   node scripts/download-test-images.mjs            # 下载全部类别
 *   node scripts/download-test-images.mjs tops        # 只下载上衣
 *   node scripts/download-test-images.mjs persons     # 只下载人像
 */

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEST_DATA = path.join(ROOT, "test_data");

const CATEGORIES = {
  tops: {
    queries: [
      "t-shirt product white background",
      "sweater knitwear product flatlay",
      "blouse shirt product fashion",
    ],
    dir: "tops",
    count: 10,
  },
  bottoms: {
    queries: [
      "pants trousers product white background",
      "skirt product fashion flatlay",
      "jeans denim product",
    ],
    dir: "bottoms",
    count: 10,
  },
  persons: {
    queries: [
      "fashion model full body standing woman",
      "street style outfit full body portrait",
      "casual outfit full body photo woman",
    ],
    dir: "persons",
    count: 10,
  },
};

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "application/json",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error(`JSON parse error: ${body.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on("finish", () => {
        stream.close();
        resolve();
      });
      stream.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Download timeout"));
    });
  });
}

async function searchUnsplash(query, perPage = 10) {
  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}`;
  log(`搜索: "${query}" (${perPage} 张)`);

  try {
    const data = await fetchJSON(url);
    if (!data.results || !Array.isArray(data.results)) {
      log(`  ⚠ 搜索无结果`);
      return [];
    }

    return data.results.map((r) => ({
      id: r.id,
      url: r.urls?.regular || r.urls?.small,
      description: r.alt_description || r.description || "untitled",
      width: r.width,
      height: r.height,
    }));
  } catch (err) {
    log(`  ✗ 搜索失败: ${err.message}`);
    return [];
  }
}

async function downloadCategory(name, config) {
  const dir = path.join(TEST_DATA, config.dir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const existing = fs.readdirSync(dir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  log(`\n📁 ${name}: 目标 ${config.count} 张，已有 ${existing.length} 张`);

  const needed = config.count - existing.length;
  if (needed <= 0) {
    log(`  ✓ 已满足，跳过`);
    return;
  }

  const allImages = [];
  const perQuery = Math.ceil(needed / config.queries.length) + 2;

  for (const query of config.queries) {
    const images = await searchUnsplash(query, perQuery);
    allImages.push(...images);
    await sleep(500);
  }

  const seen = new Set(existing.map((f) => f.split(".")[0]));
  const unique = allImages.filter((img) => {
    if (seen.has(img.id)) return false;
    seen.add(img.id);
    return true;
  });

  const toDownload = unique.slice(0, needed);
  log(`  → 准备下载 ${toDownload.length} 张`);

  let downloaded = 0;
  for (const img of toDownload) {
    const ext = ".jpg";
    const filename = `${img.id}${ext}`;
    const dest = path.join(dir, filename);

    try {
      await downloadFile(img.url, dest);
      downloaded++;
      const size = (fs.statSync(dest).size / 1024).toFixed(0);
      log(`  ✓ [${downloaded}/${toDownload.length}] ${filename} (${size}KB) - ${img.description}`);
    } catch (err) {
      log(`  ✗ ${filename}: ${err.message}`);
    }

    await sleep(300);
  }

  log(`  📊 ${name} 完成: 新增 ${downloaded} 张`);
}

async function main() {
  log("=== 测试图片批量下载 ===\n");

  const args = process.argv.slice(2);
  const selectedCategories =
    args.length > 0
      ? args.filter((a) => CATEGORIES[a])
      : Object.keys(CATEGORIES);

  if (selectedCategories.length === 0) {
    console.log(`可用类别: ${Object.keys(CATEGORIES).join(", ")}`);
    process.exit(1);
  }

  for (const cat of selectedCategories) {
    await downloadCategory(cat, CATEGORIES[cat]);
  }

  log("\n=== 下载完成 ===");

  log("\n当前 test_data/ 结构:");
  for (const sub of ["persons", "tops", "bottoms", "accessories", "reference"]) {
    const dir = path.join(TEST_DATA, sub);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => !f.startsWith("."));
      log(`  ${sub}/: ${files.length} 个文件`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
