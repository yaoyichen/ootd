/**
 * 和风天气 (QWeather) API 测试脚本
 *
 * 用法：
 *   node scripts/test-weather.mjs              # 默认查询杭州
 *   node scripts/test-weather.mjs 北京          # 先搜索城市再查询天气
 *   node scripts/test-weather.mjs 101010100     # 直接用 LocationID 查询
 *
 * 环境变量：
 *   QWEATHER_API_KEY   — 和风天气 API Key（https://dev.qweather.com）
 *   QWEATHER_API_HOST  — 项目专属 API Host（控制台「项目管理」中查看）
 *
 * 测试接口：
 *   1. GeoAPI 城市搜索
 *   2. 实时天气
 *   3. 3天天气预报
 *   4. 穿衣指数（生活指数 type=3）
 */

const API_KEY = process.env.QWEATHER_API_KEY;
const API_HOST_RAW = process.env.QWEATHER_API_HOST || "";

// 优先使用项目专属 API Host，否则回退到通用 devapi
const BASE_HOST = API_HOST_RAW
  ? `https://${API_HOST_RAW.replace(/^https?:\/\//, "")}`
  : "https://devapi.qweather.com";
const WEATHER_HOST = BASE_HOST;
const GEO_HOST = BASE_HOST;

const DEFAULT_LOCATION_ID = "101210101"; // 杭州
const DEFAULT_LOCATION_NAME = "杭州";

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

async function fetchQWeather(host, path, params = {}) {
  const url = new URL(path, host);
  url.searchParams.set("key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const startTime = Date.now();
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const data = await res.json();

  if (data.code !== "200") {
    throw new Error(
      `API 错误: code=${data.code}, path=${path} (${elapsed}s)`
    );
  }

  log(`${path} — HTTP ${res.status}, code=${data.code} (${elapsed}s)`);
  return data;
}

// ── GeoAPI: 城市搜索 ──
async function searchCity(keyword) {
  log(`搜索城市: "${keyword}"`);
  const data = await fetchQWeather(GEO_HOST, "/v2/city/lookup", {
    location: keyword,
    lang: "zh",
  });

  const cities = data.location || [];
  if (cities.length === 0) {
    throw new Error(`未找到城市: "${keyword}"`);
  }

  console.log(`\n  找到 ${cities.length} 个结果:`);
  for (const c of cities) {
    console.log(
      `    - ${c.name} (${c.adm1} ${c.adm2}) | ID: ${c.id} | ${c.lat},${c.lon}`
    );
  }

  return cities[0];
}

// ── 实时天气 ──
async function getWeatherNow(locationId) {
  const data = await fetchQWeather(WEATHER_HOST, "/v7/weather/now", {
    location: locationId,
    lang: "zh",
    unit: "m",
  });
  return data.now;
}

// ── 3天预报 ──
async function getForecast3d(locationId) {
  const data = await fetchQWeather(WEATHER_HOST, "/v7/weather/3d", {
    location: locationId,
    lang: "zh",
    unit: "m",
  });
  return data.daily || [];
}

// ── 穿衣指数 (生活指数 type=3) ──
async function getClothingIndex(locationId) {
  const data = await fetchQWeather(WEATHER_HOST, "/v7/indices/1d", {
    location: locationId,
    type: "3",
    lang: "zh",
  });
  return (data.daily || [])[0] || null;
}

function printWeatherNow(now) {
  console.log("\n┌─────────────────────────────────┐");
  console.log("│         实时天气                │");
  console.log("├─────────────────────────────────┤");
  console.log(`│  天气:     ${now.text}`);
  console.log(`│  温度:     ${now.temp}°C`);
  console.log(`│  体感温度:  ${now.feelsLike}°C`);
  console.log(`│  湿度:     ${now.humidity}%`);
  console.log(`│  风向:     ${now.windDir} ${now.windScale}级`);
  console.log(`│  风速:     ${now.windSpeed} km/h`);
  console.log(`│  降水量:   ${now.precip} mm`);
  console.log(`│  能见度:   ${now.vis} km`);
  console.log(`│  观测时间:  ${now.obsTime}`);
  console.log("└─────────────────────────────────┘");
}

function printForecast(dailyList) {
  console.log("\n┌─────────────────────────────────────────────────────────┐");
  console.log("│                    未来 3 天预报                       │");
  console.log("├────────────┬──────────┬─────────────┬─────────────────┤");
  console.log("│    日期    │  温度    │   白天      │   夜间          │");
  console.log("├────────────┼──────────┼─────────────┼─────────────────┤");
  for (const d of dailyList) {
    const date = d.fxDate;
    const temp = `${d.tempMin}~${d.tempMax}°C`.padEnd(8);
    const day = d.textDay.padEnd(6);
    const night = d.textNight.padEnd(6);
    console.log(`│  ${date}  │ ${temp} │  ${day}     │  ${night}          │`);
  }
  console.log("└────────────┴──────────┴─────────────┴─────────────────┘");
}

function printClothingIndex(idx) {
  console.log("\n┌─────────────────────────────────┐");
  console.log("│         穿衣指数                │");
  console.log("├─────────────────────────────────┤");
  if (idx) {
    console.log(`│  级别:   ${idx.category}`);
    console.log(`│  建议:   ${idx.text}`);
  } else {
    console.log("│  (暂无穿衣指数数据)");
  }
  console.log("└─────────────────────────────────┘");
}

async function main() {
  if (!API_KEY) {
    console.error("错误：请设置环境变量 QWEATHER_API_KEY");
    console.error("  export QWEATHER_API_KEY=your-api-key");
    console.error("");
    console.error("注册地址: https://dev.qweather.com");
    process.exit(1);
  }

  const arg = process.argv[2];
  let locationId = DEFAULT_LOCATION_ID;
  let locationName = DEFAULT_LOCATION_NAME;

  // 判断输入：纯数字视为 LocationID，否则视为城市名进行搜索
  if (arg) {
    if (/^\d+$/.test(arg)) {
      locationId = arg;
      locationName = `LocationID: ${arg}`;
    } else {
      const city = await searchCity(arg);
      locationId = city.id;
      locationName = `${city.name} (${city.adm1})`;
    }
  }

  console.log("\n===== 和风天气 API 测试 =====");
  console.log(`城市:       ${locationName}`);
  console.log(`LocationID: ${locationId}`);
  console.log(`API Host:   ${WEATHER_HOST}`);
  console.log(`GEO Host:   ${GEO_HOST}`);
  console.log("=============================");

  try {
    // 并发请求实时天气、3天预报、穿衣指数
    log("并发请求天气数据...");
    const [now, forecast, clothing] = await Promise.all([
      getWeatherNow(locationId),
      getForecast3d(locationId),
      getClothingIndex(locationId),
    ]);

    printWeatherNow(now);
    printForecast(forecast);
    printClothingIndex(clothing);

    // 输出用于 LLM 穿搭推荐的结构化摘要
    const summary = {
      city: locationName,
      current: {
        temp: `${now.temp}°C`,
        feelsLike: `${now.feelsLike}°C`,
        weather: now.text,
        humidity: `${now.humidity}%`,
        wind: `${now.windDir} ${now.windScale}级`,
      },
      forecast: forecast.map((d) => ({
        date: d.fxDate,
        tempRange: `${d.tempMin}~${d.tempMax}°C`,
        day: d.textDay,
        night: d.textNight,
      })),
      clothingAdvice: clothing
        ? { level: clothing.category, text: clothing.text }
        : null,
    };

    console.log("\n===== LLM 上下文摘要 (可传入推荐 prompt) =====");
    console.log(JSON.stringify(summary, null, 2));
    console.log("===============================================\n");

    console.log("测试完成！所有接口正常。");
  } catch (err) {
    console.error(`\n请求失败: ${err.message}`);
    if (err.cause) console.error("cause:", err.cause);
    process.exit(1);
  }
}

main();
