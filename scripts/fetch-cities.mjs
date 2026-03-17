/**
 * 一次性脚本：从和风天气 GeoAPI 批量拉取全国城市数据，保存为静态 JSON
 *
 * 用法：
 *   node scripts/fetch-cities.mjs
 *
 * 输出：web/lib/china-cities.json
 *
 * 环境变量：
 *   QWEATHER_API_KEY   — 和风天气 API Key
 *   QWEATHER_API_HOST  — 项目专属 API Host（可选）
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.QWEATHER_API_KEY;
const API_HOST_RAW = process.env.QWEATHER_API_HOST || "";
const GEO_HOST = API_HOST_RAW
  ? `https://${API_HOST_RAW.replace(/^https?:\/\//, "")}`
  : "https://devapi.qweather.com";

if (!API_KEY) {
  console.error("请设置环境变量 QWEATHER_API_KEY");
  process.exit(1);
}

// 全国省级行政区
const PROVINCES = [
  "北京", "天津", "上海", "重庆",
  "河北", "山西", "辽宁", "吉林", "黑龙江",
  "江苏", "浙江", "安徽", "福建", "江西", "山东",
  "河南", "湖北", "湖南", "广东", "海南",
  "四川", "贵州", "云南", "陕西", "甘肃", "青海",
  "台湾", "内蒙古", "广西", "西藏", "宁夏", "新疆",
  "香港", "澳门",
];

async function searchByProvince(province) {
  const url = new URL("/geo/v2/city/lookup", GEO_HOST);
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("adm", province);
  url.searchParams.set("location", province);
  url.searchParams.set("range", "cn");
  url.searchParams.set("number", "20");
  url.searchParams.set("lang", "zh");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.warn(`  ⚠ ${province}: invalid JSON response (status ${res.status})`);
    return [];
  }

  if (data.code !== "200") {
    console.warn(`  ⚠ ${province}: code=${data.code}`);
    return [];
  }

  return (data.location || []).map((c) => ({
    id: c.id,
    name: c.name,
    adm1: c.adm1,
    adm2: c.adm2,
  }));
}

// 补充搜索：用常见城市名关键词补漏
const EXTRA_KEYWORDS = [
  "州", "市", "县", "镇", "海", "阳", "安", "城", "宁",
  "昌", "南", "北", "东", "西", "中", "新", "长",
];

async function searchByKeyword(keyword) {
  const url = new URL("/geo/v2/city/lookup", GEO_HOST);
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("location", keyword);
  url.searchParams.set("range", "cn");
  url.searchParams.set("number", "20");
  url.searchParams.set("lang", "zh");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }

  if (data.code !== "200") return [];

  return (data.location || []).map((c) => ({
    id: c.id,
    name: c.name,
    adm1: c.adm1,
    adm2: c.adm2,
  }));
}

async function main() {
  const cityMap = new Map();

  console.log("=== 按省份拉取城市 ===");
  for (const province of PROVINCES) {
    // Rate limit: QWeather free tier
    await new Promise((r) => setTimeout(r, 200));

    const cities = await searchByProvince(province);
    let added = 0;
    for (const c of cities) {
      if (!cityMap.has(c.id)) {
        cityMap.set(c.id, c);
        added++;
      }
    }
    console.log(`  ${province}: ${cities.length} 条, 新增 ${added}`);
  }

  console.log(`\n省份搜索完毕，已收录 ${cityMap.size} 个城市`);

  console.log("\n=== 补充关键词搜索 ===");
  for (const kw of EXTRA_KEYWORDS) {
    await new Promise((r) => setTimeout(r, 200));

    const cities = await searchByKeyword(kw);
    let added = 0;
    for (const c of cities) {
      if (!cityMap.has(c.id)) {
        cityMap.set(c.id, c);
        added++;
      }
    }
    if (added > 0) {
      console.log(`  "${kw}": ${cities.length} 条, 新增 ${added}`);
    }
  }

  const allCities = [...cityMap.values()].sort((a, b) =>
    a.adm1.localeCompare(b.adm1, "zh") || a.name.localeCompare(b.name, "zh")
  );

  console.log(`\n总计: ${allCities.length} 个城市`);

  const outPath = resolve(__dirname, "../web/lib/china-cities.json");
  writeFileSync(outPath, JSON.stringify(allCities, null, 2), "utf-8");
  console.log(`已保存到: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
