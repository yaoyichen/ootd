const API_KEY = process.env.QWEATHER_API_KEY ?? "";
const API_HOST_RAW = process.env.QWEATHER_API_HOST ?? "";
const API_HOST = API_HOST_RAW
  ? `https://${API_HOST_RAW.replace(/^https?:\/\//, "")}`
  : "https://devapi.qweather.com";
const GEO_HOST = API_HOST;

export interface WeatherNow {
  temp: string;
  feelsLike: string;
  text: string;
  icon: string;
  humidity: string;
  windDir: string;
  windScale: string;
  obsTime: string;
}

export interface DailyForecast {
  fxDate: string;
  tempMax: string;
  tempMin: string;
  textDay: string;
  textNight: string;
  iconDay: string;
}

export interface ClothingIndex {
  date: string;
  category: string;
  text: string;
}

export interface WeatherData {
  city: string;
  locationId: string;
  now: WeatherNow;
  forecast: DailyForecast[];
  clothing7d: ClothingIndex[];
}

export interface ForecastSummary {
  date: string;
  dayLabel: string;
  weekday: string;
  dateShort: string;
  tempRange: string;
  tempMax: string;
  tempMin: string;
  weatherDay: string;
  weatherNight: string;
  iconDay: string;
  clothingAdvice: string | null;
}

export interface WeatherSummary {
  city: string;
  temp: string;
  feelsLike: string;
  weather: string;
  humidity: string;
  wind: string;
  todayRange: string;
  clothingAdvice: string | null;
  forecasts: ForecastSummary[];
}

export interface CityOption {
  id: string;
  name: string;
  adm1: string;
  adm2: string;
}

export const PRESET_CITIES: CityOption[] = [
  { id: "101210101", name: "杭州", adm1: "浙江省", adm2: "杭州" },
  { id: "101010100", name: "北京", adm1: "北京市", adm2: "北京" },
  { id: "101020100", name: "上海", adm1: "上海市", adm2: "上海" },
  { id: "101280101", name: "广州", adm1: "广东省", adm2: "广州" },
  { id: "101280601", name: "深圳", adm1: "广东省", adm2: "深圳" },
  { id: "101190101", name: "南京", adm1: "江苏省", adm2: "南京" },
  { id: "101200101", name: "武汉", adm1: "湖北省", adm2: "武汉" },
  { id: "101110101", name: "西安", adm1: "陕西省", adm2: "西安" },
  { id: "101270101", name: "成都", adm1: "四川省", adm2: "成都" },
  { id: "101230101", name: "福州", adm1: "福建省", adm2: "福州" },
  { id: "101250101", name: "长沙", adm1: "湖南省", adm2: "长沙" },
  { id: "101040100", name: "重庆", adm1: "重庆市", adm2: "重庆" },
];

export const DEFAULT_CITY_ID = "101210101";

async function fetchQWeather(_host: string, path: string, params: Record<string, string> = {}) {
  if (!API_KEY) throw new Error("QWEATHER_API_KEY not configured");

  const url = new URL(path, _host);
  url.searchParams.set("key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 1800 },
  });

  const data = await res.json();
  if (data.code !== "200") {
    throw new Error(`QWeather API error: code=${data.code}, path=${path}`);
  }
  return data;
}

export async function getWeatherNow(locationId: string): Promise<WeatherNow> {
  const data = await fetchQWeather(API_HOST, "/v7/weather/now", {
    location: locationId,
    lang: "zh",
    unit: "m",
  });
  return data.now;
}

export async function getForecast7d(locationId: string): Promise<DailyForecast[]> {
  const data = await fetchQWeather(API_HOST, "/v7/weather/7d", {
    location: locationId,
    lang: "zh",
    unit: "m",
  });
  return data.daily || [];
}

export async function getClothingIndex7d(locationId: string): Promise<ClothingIndex[]> {
  try {
    const data = await fetchQWeather(API_HOST, "/v7/indices/7d", {
      location: locationId,
      type: "3",
      lang: "zh",
    });
    return (data.daily || []).map((d: { date: string; category: string; text: string }) => ({
      date: d.date,
      category: d.category,
      text: d.text,
    }));
  } catch {
    return [];
  }
}

// ── 缓存层 ──

const CACHE_TTL_DAYS = 30;

function currentHourKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  return `${y}${m}${d}${h}`;
}

export async function getWeatherData(locationId: string, cityNameHint?: string): Promise<WeatherData> {
  const hourKey = currentHourKey();

  const { prisma } = await import("@/lib/prisma");

  // 1. 尝试读缓存
  const cached = await prisma.weatherCache.findUnique({
    where: { locationId_hourKey: { locationId, hourKey } },
  });

  if (cached && cached.expiresAt > new Date()) {
    return JSON.parse(cached.data) as WeatherData;
  }

  // 2. 缓存未命中，调 API
  const city = PRESET_CITIES.find((c) => c.id === locationId);
  const cityName = city?.name ?? cityNameHint ?? locationId;

  const [now, forecast, clothing7d] = await Promise.all([
    getWeatherNow(locationId),
    getForecast7d(locationId),
    getClothingIndex7d(locationId),
  ]);

  const weatherData: WeatherData = { city: cityName, locationId, now, forecast, clothing7d };

  // 3. 写入缓存 + 清理过期数据
  const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 86400000);
  try {
    await prisma.$transaction([
      prisma.weatherCache.upsert({
        where: { locationId_hourKey: { locationId, hourKey } },
        update: { data: JSON.stringify(weatherData), expiresAt },
        create: { locationId, hourKey, data: JSON.stringify(weatherData), expiresAt },
      }),
      prisma.weatherCache.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
    ]);
  } catch {
    // 缓存写入失败不影响正常返回
  }

  return weatherData;
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function getDayMeta(dateStr: string): { dayLabel: string; weekday: string; dateShort: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  const weekday = WEEKDAYS[target.getDay()];
  const dateShort = `${target.getMonth() + 1}/${target.getDate()}`;
  let dayLabel = dateShort;
  if (diff === 0) dayLabel = "今天";
  else if (diff === 1) dayLabel = "明天";
  else if (diff === 2) dayLabel = "后天";
  return { dayLabel, weekday, dateShort };
}

export function toWeatherSummary(data: WeatherData): WeatherSummary {
  const today = data.forecast[0];
  const todayClothing = data.clothing7d.find((c) => c.date === today?.fxDate);

  const forecasts: ForecastSummary[] = data.forecast.map((f) => {
    const clothing = data.clothing7d.find((c) => c.date === f.fxDate);
    const { dayLabel, weekday, dateShort } = getDayMeta(f.fxDate);
    return {
      date: f.fxDate,
      dayLabel,
      weekday,
      dateShort,
      tempRange: `${f.tempMin}~${f.tempMax}°C`,
      tempMax: f.tempMax,
      tempMin: f.tempMin,
      weatherDay: f.textDay,
      weatherNight: f.textNight,
      iconDay: f.iconDay,
      clothingAdvice: clothing?.text ?? null,
    };
  });

  return {
    city: data.city,
    temp: `${data.now.temp}°C`,
    feelsLike: `${data.now.feelsLike}°C`,
    weather: data.now.text,
    humidity: `${data.now.humidity}%`,
    wind: `${data.now.windDir} ${data.now.windScale}级`,
    todayRange: today ? `${today.tempMin}~${today.tempMax}°C` : "",
    clothingAdvice: todayClothing?.text ?? null,
    forecasts,
  };
}

export async function searchCity(keyword: string): Promise<CityOption[]> {
  const data = await fetchQWeather(GEO_HOST, "/geo/v2/city/lookup", {
    location: keyword,
    lang: "zh",
  });
  return (data.location || []).map((c: { id: string; name: string; adm1: string; adm2: string }) => ({
    id: c.id,
    name: c.name,
    adm1: c.adm1,
    adm2: c.adm2,
  }));
}

export function buildWeatherPromptContext(summary: WeatherSummary, targetDay: number = 0): string {
  const forecast = summary.forecasts[targetDay];
  if (!forecast) {
    // Fallback to realtime if forecast unavailable
    let ctx = `当前天气信息（${summary.city}）：`;
    ctx += `\n- 天气: ${summary.weather}，气温 ${summary.temp}（体感 ${summary.feelsLike}）`;
    ctx += `\n- 今日温度范围: ${summary.todayRange}`;
    ctx += `\n- 湿度: ${summary.humidity}，风力: ${summary.wind}`;
    if (summary.clothingAdvice) {
      ctx += `\n- 穿衣建议: ${summary.clothingAdvice}`;
    }
    return ctx;
  }

  const dayLabel = forecast.dayLabel;
  let ctx = `${dayLabel}天气预报（${summary.city}）：`;
  ctx += `\n- 白天: ${forecast.weatherDay}，夜间: ${forecast.weatherNight}`;
  ctx += `\n- 温度范围: ${forecast.tempRange}`;
  if (targetDay === 0) {
    ctx += `\n- 当前实时: ${summary.temp}（体感 ${summary.feelsLike}）`;
    ctx += `\n- 湿度: ${summary.humidity}，风力: ${summary.wind}`;
  }
  if (forecast.clothingAdvice) {
    ctx += `\n- 穿衣建议: ${forecast.clothingAdvice}`;
  }
  return ctx;
}
