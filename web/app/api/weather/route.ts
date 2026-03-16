import { NextRequest, NextResponse } from "next/server";
import { getWeatherData, toWeatherSummary, PRESET_CITIES, DEFAULT_CITY_ID } from "@/lib/weather";

export async function GET(req: NextRequest) {
  const locationId = req.nextUrl.searchParams.get("locationId") || DEFAULT_CITY_ID;

  if (!process.env.QWEATHER_API_KEY) {
    return NextResponse.json(
      { error: "QWEATHER_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const data = await getWeatherData(locationId);
    const summary = toWeatherSummary(data);
    return NextResponse.json({ ...data, summary });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "获取天气失败" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({ cities: PRESET_CITIES, defaultCityId: DEFAULT_CITY_ID });
}
