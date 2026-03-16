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
  category: string;
  text: string;
}

export interface WeatherData {
  city: string;
  locationId: string;
  now: WeatherNow;
  forecast: DailyForecast[];
  clothing: ClothingIndex | null;
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

export async function getForecast3d(locationId: string): Promise<DailyForecast[]> {
  const data = await fetchQWeather(API_HOST, "/v7/weather/3d", {
    location: locationId,
    lang: "zh",
    unit: "m",
  });
  return data.daily || [];
}

export async function getClothingIndex(locationId: string): Promise<ClothingIndex | null> {
  try {
    const data = await fetchQWeather(API_HOST, "/v7/indices/1d", {
      location: locationId,
      type: "3",
      lang: "zh",
    });
    return (data.daily || [])[0] || null;
  } catch {
    return null;
  }
}

export async function getWeatherData(locationId: string): Promise<WeatherData> {
  const city = PRESET_CITIES.find((c) => c.id === locationId);
  const cityName = city?.name ?? locationId;

  const [now, forecast, clothing] = await Promise.all([
    getWeatherNow(locationId),
    getForecast3d(locationId),
    getClothingIndex(locationId),
  ]);

  return { city: cityName, locationId, now, forecast, clothing };
}

export function toWeatherSummary(data: WeatherData): WeatherSummary {
  const today = data.forecast[0];
  return {
    city: data.city,
    temp: `${data.now.temp}°C`,
    feelsLike: `${data.now.feelsLike}°C`,
    weather: data.now.text,
    humidity: `${data.now.humidity}%`,
    wind: `${data.now.windDir} ${data.now.windScale}级`,
    todayRange: today ? `${today.tempMin}~${today.tempMax}°C` : "",
    clothingAdvice: data.clothing?.text ?? null,
  };
}

export async function searchCity(keyword: string): Promise<CityOption[]> {
  const data = await fetchQWeather(GEO_HOST, "/v2/city/lookup", {
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

export function buildWeatherPromptContext(summary: WeatherSummary): string {
  let ctx = `当前天气信息（${summary.city}）：`;
  ctx += `\n- 天气: ${summary.weather}，气温 ${summary.temp}（体感 ${summary.feelsLike}）`;
  ctx += `\n- 今日温度范围: ${summary.todayRange}`;
  ctx += `\n- 湿度: ${summary.humidity}，风力: ${summary.wind}`;
  if (summary.clothingAdvice) {
    ctx += `\n- 穿衣建议: ${summary.clothingAdvice}`;
  }
  return ctx;
}
