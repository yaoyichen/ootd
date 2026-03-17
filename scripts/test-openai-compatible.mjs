/**
 * 免费 OpenAI 兼容 API 测试脚本
 *
 * 测试内容：
 *   1. 纯文本对话（搭配推荐场景）
 *   2. 多模态图片理解（穿搭评分场景）
 *
 * 用法：
 *   node scripts/test-openai-compatible.mjs                              # 默认测试
 *   node scripts/test-openai-compatible.mjs web/public/uploads/outfits/xxx.png  # 指定图片
 *
 * 环境变量（可选，有默认值）：
 *   OPENAI_COMPAT_BASE_URL   — API 地址，默认 http://openai.infly.tech/v1
 *   OPENAI_COMPAT_API_KEY    — API Key
 *   OPENAI_COMPAT_MODEL      — 模型名，默认 gpt-4o
 */

import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.OPENAI_COMPAT_BASE_URL || "http://openai.infly.tech/v1";
const API_KEY = process.env.OPENAI_COMPAT_API_KEY || "sk-61YW9qxz5fD6DmHA1JhvY9OgJR98bEaF0GWLS3XocwILylsu";
const MODEL = process.env.OPENAI_COMPAT_MODEL || "gpt-4o";

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

async function chatRequest(messages, label) {
  log(`${label} — 发送请求 (model=${MODEL})...`);
  const startTime = Date.now();

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": API_KEY,
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 2000,
    }),
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`  ✗ 非 JSON 响应 (${elapsed}s): ${text.slice(0, 200)}`);
    return null;
  }

  if (!res.ok) {
    console.error(`  ✗ HTTP ${res.status} (${elapsed}s)`);
    console.error("  error:", JSON.stringify(data.error || data, null, 2));
    return null;
  }

  const content = data.choices?.[0]?.message?.content ?? "";
  const usage = data.usage;
  log(`  ✓ HTTP ${res.status} (${elapsed}s) — tokens: ${usage?.total_tokens || "N/A"}`);
  return content;
}

// ── 测试 1：纯文本 — 搭配推荐 ──
async function testMatching() {
  console.log("\n" + "=".repeat(50));
  console.log("测试 1：纯文本 — 搭配推荐");
  console.log("=".repeat(50));

  const prompt = `你是一位专业的时尚搭配师。以下是用户衣橱中的单品：

【上衣/外套】
  - id="1" 白色圆领T恤 颜色:白色 风格:休闲 季节:夏
  - id="2" 黑色西装外套 颜色:黑色 风格:正式 季节:春秋
  - id="3" 蓝色牛仔衬衫 颜色:蓝色 风格:休闲 季节:春秋

【下装/连体】
  - id="4" 黑色直筒裤 颜色:黑色 风格:百搭 季节:四季
  - id="5" 蓝色牛仔裤 颜色:蓝色 风格:休闲 季节:四季
  - id="6" 卡其色半裙 颜色:卡其色 风格:优雅 季节:春秋

【天气信息】
明天天气预报（杭州）：
- 白天: 多云，夜间: 小雨
- 温度范围: 12~20°C
- 穿衣建议: 建议着薄外套、开衫牛仔衫裤等服装。

请从中选出 3 种最佳搭配组合（每组一件上衣+一件下装），优先考虑：
1. 颜色协调
2. 风格统一
3. 适合明天天气

请严格以如下 JSON 数组格式回复，不要包含其他内容：
[{"topItemId": "上衣id", "bottomItemId": "下装id", "reason": "简短搭配理由"}]`;

  const content = await chatRequest(
    [{ role: "user", content: prompt }],
    "搭配推荐"
  );

  if (!content) return false;

  console.log("\n模型返回:");
  console.log(content);

  // 尝试解析 JSON
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const combos = JSON.parse(jsonMatch[0]);
      console.log(`\n✓ 成功解析 ${combos.length} 组搭配：`);
      combos.forEach((c, i) => {
        console.log(`  ${i + 1}. 上衣 ${c.topItemId} + 下装 ${c.bottomItemId} — ${c.reason}`);
      });
      return true;
    }
  } catch (e) {
    console.error("JSON 解析失败:", e.message);
  }
  return false;
}

// ── 测试 2：多模态 — 穿搭评分 ──
async function testScoring(imagePath) {
  console.log("\n" + "=".repeat(50));
  console.log("测试 2：多模态 — 穿搭评分（图片理解）");
  console.log("=".repeat(50));

  if (!imagePath) {
    // 尝试找一张 outfit 图片
    const outfitDir = path.resolve("web/public/uploads/outfits");
    if (fs.existsSync(outfitDir)) {
      const dirs = fs.readdirSync(outfitDir).filter(d => {
        const p = path.join(outfitDir, d);
        return fs.statSync(p).isDirectory();
      });
      for (const d of dirs) {
        const subDir = path.join(outfitDir, d);
        const imgs = fs.readdirSync(subDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
        if (imgs.length > 0) {
          imagePath = path.join(subDir, imgs[0]);
          break;
        }
      }
    }
    if (!imagePath) {
      // 尝试 test_data
      const testDir = path.resolve("test_data/persons");
      if (fs.existsSync(testDir)) {
        const imgs = fs.readdirSync(testDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
        if (imgs.length > 0) imagePath = path.join(testDir, imgs[0]);
      }
    }
    if (!imagePath) {
      console.log("  ⚠ 未找到测试图片，跳过多模态测试");
      console.log("  用法: node scripts/test-openai-compatible.mjs <图片路径>");
      return false;
    }
  }

  const absPath = path.resolve(imagePath);
  if (!fs.existsSync(absPath)) {
    console.error(`  ✗ 文件不存在: ${absPath}`);
    return false;
  }

  const ext = path.extname(absPath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const data = fs.readFileSync(absPath).toString("base64");
  const sizeKB = (Buffer.byteLength(data, "base64") / 1024).toFixed(1);
  log(`图片: ${absPath} (${sizeKB} KB)`);

  const prompt = `你是一位专业的时尚顾问。请仔细观察这张穿搭效果图，从以下五个维度进行评分（1-100 分）：

1. colorHarmony（色彩和谐）：颜色搭配是否和谐
2. styleCohesion（风格统一）：上下装风格是否一致
3. trendiness（时尚度）：是否符合流行趋势
4. practicality（实穿性）：是否适合日常穿着
5. creativity（创意度）：搭配是否有亮点

请严格以如下 JSON 格式回复，不要包含其他内容：
{"score": 综合分, "dims": {"colorHarmony": 分数, "styleCohesion": 分数, "trendiness": 分数, "practicality": 分数, "creativity": 分数}, "evaluation": "2-3句中文评语"}`;

  const content = await chatRequest(
    [{
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:${mime};base64,${data}`,
            detail: "high",
          },
        },
        { type: "text", text: prompt },
      ],
    }],
    "穿搭评分"
  );

  if (!content) return false;

  console.log("\n模型返回:");
  console.log(content);

  try {
    const jsonMatch = content.match(/\{[\s\S]*"score"[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      console.log(`\n✓ 评分解析成功：`);
      console.log(`  综合分: ${result.score}`);
      if (result.dims) {
        console.log(`  色彩: ${result.dims.colorHarmony}  风格: ${result.dims.styleCohesion}  时尚: ${result.dims.trendiness}  实穿: ${result.dims.practicality}  创意: ${result.dims.creativity}`);
      }
      console.log(`  评语: ${result.evaluation}`);
      return true;
    }
  } catch (e) {
    console.error("JSON 解析失败:", e.message);
  }
  return false;
}

// ── 测试 3：单品识别 ──
async function testRecognition(imagePath) {
  console.log("\n" + "=".repeat(50));
  console.log("测试 3：多模态 — 单品识别");
  console.log("=".repeat(50));

  // 找一张单品图片
  let itemImage = null;
  const itemDir = path.resolve("web/public/uploads/items");
  if (fs.existsSync(itemDir)) {
    const dirs = fs.readdirSync(itemDir).filter(d => {
      const p = path.join(itemDir, d);
      return fs.statSync(p).isDirectory();
    });
    for (const d of dirs) {
      const subDir = path.join(itemDir, d);
      const imgs = fs.readdirSync(subDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
      if (imgs.length > 0) {
        itemImage = path.join(subDir, imgs[0]);
        break;
      }
    }
  }
  if (!itemImage) {
    const testDir = path.resolve("test_data/tops");
    if (fs.existsSync(testDir)) {
      const imgs = fs.readdirSync(testDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
      if (imgs.length > 0) itemImage = path.join(testDir, imgs[0]);
    }
  }
  if (!itemImage) {
    console.log("  ⚠ 未找到单品图片，跳过识别测试");
    return false;
  }

  const absPath = path.resolve(itemImage);
  const ext = path.extname(absPath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const data = fs.readFileSync(absPath).toString("base64");
  const sizeKB = (Buffer.byteLength(data, "base64") / 1024).toFixed(1);
  log(`单品图片: ${absPath} (${sizeKB} KB)`);

  const prompt = `请识别这张图片中的服装单品，返回以下信息：
- name: 单品名称（如"白色圆领T恤"）
- category: 分类，从以下选择：TOP/BOTTOM/OUTERWEAR/ONEPIECE/SHOES/ACCESSORY
- color: 主色调
- style: 风格（休闲/正式/运动/优雅/街头/复古等）
- season: 适合季节（春/夏/秋/冬/四季）
- occasion: 适合场合（日常/上班/约会/运动/正式/出行）

请严格以 JSON 格式回复：
{"name": "...", "category": "...", "color": "...", "style": "...", "season": "...", "occasion": "..."}`;

  const content = await chatRequest(
    [{
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:${mime};base64,${data}`,
            detail: "high",
          },
        },
        { type: "text", text: prompt },
      ],
    }],
    "单品识别"
  );

  if (!content) return false;

  console.log("\n模型返回:");
  console.log(content);

  try {
    const jsonMatch = content.match(/\{[\s\S]*"name"[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      console.log(`\n✓ 识别成功：`);
      console.log(`  名称: ${result.name}`);
      console.log(`  分类: ${result.category}  颜色: ${result.color}  风格: ${result.style}`);
      console.log(`  季节: ${result.season}  场合: ${result.occasion}`);
      return true;
    }
  } catch (e) {
    console.error("JSON 解析失败:", e.message);
  }
  return false;
}

// ── 主流程 ──
async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  OpenAI 兼容 API 测试（免费 API 开发用）    ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Base URL : ${BASE_URL}`);
  console.log(`║  Model    : ${MODEL}`);
  console.log("╚══════════════════════════════════════════════╝");

  const argImage = process.argv[2];
  const results = [];

  // 测试 1: 纯文本
  results.push({ name: "搭配推荐（文本）", pass: await testMatching() });

  // 测试 2: 多模态评分
  results.push({ name: "穿搭评分（图片）", pass: await testScoring(argImage) });

  // 测试 3: 单品识别
  results.push({ name: "单品识别（图片）", pass: await testRecognition() });

  // 汇总
  console.log("\n" + "=".repeat(50));
  console.log("测试汇总");
  console.log("=".repeat(50));
  results.forEach(r => {
    console.log(`  ${r.pass ? "✓" : "✗"} ${r.name}`);
  });

  const passed = results.filter(r => r.pass).length;
  console.log(`\n${passed}/${results.length} 通过`);

  if (passed === results.length) {
    console.log("\n所有测试通过！可以将项目文本/多模态任务切换到此 API。");
  } else {
    console.log("\n部分测试未通过，请检查 API 可用性。");
  }
}

main().catch(err => {
  console.error("脚本异常:", err);
  process.exit(1);
});
