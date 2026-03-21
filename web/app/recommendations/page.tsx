"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import ALL_CITIES from "@/lib/china-cities.json";
import { SkeletonWeatherBar, SkeletonOutfitCard } from "../components/Skeleton";
import { useModalKeyboard } from "../hooks/useModalKeyboard";

interface CityOption {
  id: string;
  name: string;
  adm1: string;
  adm2: string;
}

interface ForecastSummary {
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

interface WeatherSummary {
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

const PRESET_CITIES: CityOption[] = [
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

const DEFAULT_CITY_ID = "101210101";

const WEATHER_ICONS: Record<string, string> = {
  "晴": "☀️", "多云": "⛅", "阴": "☁️",
  "小雨": "🌦️", "中雨": "🌧️", "大雨": "🌧️", "暴雨": "⛈️",
  "雷阵雨": "⛈️", "阵雨": "🌦️",
  "小雪": "🌨️", "中雪": "🌨️", "大雪": "❄️", "暴雪": "❄️",
  "雨夹雪": "🌨️", "雾": "🌫️", "霾": "🌫️",
};

function getWeatherIcon(text: string): string {
  return WEATHER_ICONS[text] || "🌤️";
}

/** 中午 12 点前默认"今天"(0)，12 点后默认"明天"(1) */
function getDefaultTargetDay(): number {
  return new Date().getHours() >= 12 ? 1 : 0;
}

interface ItemInfo {
  id: string;
  name: string;
  imagePath: string;
  category: string;
}

interface ScoreDims {
  colorHarmony: number;
  styleCohesion: number;
  trendiness: number;
  practicality: number;
  creativity: number;
}

interface Recommendation {
  rank: number;
  outfitId: string;
  imagePath: string;
  score: number | null;
  scoreDims: ScoreDims | null;
  evaluation: string | null;
  reason: string | null;
  isFavorite?: boolean;
  topItem: ItemInfo | null;
  bottomItem: ItemInfo | null;
}

interface PersonData {
  id: string;
  name: string;
  imagePath: string;
  isDefault: boolean;
}

type Phase =
  | "idle"
  | "loading"
  | "matching"
  | "generating"
  | "scoring"
  | "complete"
  | "error";

const CATEGORY_LABELS: Record<string, string> = {
  TOP: "上衣",
  BOTTOM: "下装",
  OUTERWEAR: "外套",
  ONEPIECE: "连体",
};

function PersonPicker({
  persons,
  selected,
  onSelect,
  onClose,
}: {
  persons: PersonData[];
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  useModalKeyboard({ isOpen: true, onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div
        className="w-full max-w-lg mx-4 mb-4 sm:mb-0 rounded-3xl p-6 flex flex-col gap-4 max-h-[80vh]"
        style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: "#1D1D1F" }}>选择人像</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.05)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {persons.length === 0 ? (
          <p className="text-sm py-10 text-center" style={{ color: "#AEAEB2" }}>
            暂无人像，请先到人像管理上传
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 overflow-y-auto">
            {persons.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSelect(p.id); onClose(); }}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  border: selected === p.id ? "2px solid #F27C88" : "2px solid transparent",
                  boxShadow: selected === p.id ? "0 0 0 2px rgba(242,124,136,0.2)" : "none",
                }}
              >
                <div className="relative" style={{ aspectRatio: "3/4" }}>
                  <Image src={p.imagePath} alt={p.name} fill className="object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate" style={{ color: "#1D1D1F" }}>{p.name}</p>
                  {p.isDefault && (
                    <span className="text-[10px]" style={{ color: "#F27C88" }}>默认</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WeatherCard({
  weather,
  cityId,
  cityName,
  targetDay,
  onCityChange,
  onTargetDayChange,
  loading,
}: {
  weather: WeatherSummary | null;
  cityId: string;
  cityName: string;
  targetDay: number;
  onCityChange: (id: string, name: string) => void;
  onTargetDayChange: (day: number) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll active day into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector("[data-active='true']") as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [targetDay]);

  // Local filtering - instant, no API calls
  const filteredCities = useMemo(() => {
    const q = query.trim();
    if (!q) return PRESET_CITIES;
    return (ALL_CITIES as CityOption[]).filter(
      (c) => c.name.includes(q) || c.adm1.includes(q) || c.adm2.includes(q)
    ).slice(0, 20);
  }, [query]);

  const forecasts = weather?.forecasts || [];
  const forecast = forecasts[targetDay];
  const clothingAdvice = forecast?.clothingAdvice;

  return (
    <div
      className="glass rounded-2xl p-4 mb-6 transition-all duration-300"
      style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.03)" }}
    >
      {/* City selector */}
      <div className="flex items-center gap-2 mb-3" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          style={{
            background: "rgba(242,124,136,0.08)",
            color: "#F27C88",
            border: "1px solid rgba(242,124,136,0.15)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {cityName || "选择城市"}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {targetDay === 0 && weather && (
          <span className="text-[11px]" style={{ color: "#AEAEB2" }}>
            实时 {weather.temp}
          </span>
        )}
        {open && (
          <div
            className="absolute top-full left-4 mt-1.5 z-30 rounded-xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
              border: "1px solid rgba(0,0,0,0.06)",
              minWidth: 180,
            }}
          >
            <div className="px-3 pt-2.5 pb-1.5">
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                style={{ background: "rgba(0,0,0,0.04)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索城市..."
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-[#AEAEB2]"
                  style={{ color: "#1D1D1F" }}
                />
                {query && (
                  <button
                    onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,0,0,0.1)" }}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="3" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filteredCities.length === 0 ? (
                <div className="px-3.5 py-3 text-xs text-center" style={{ color: "#AEAEB2" }}>
                  未找到匹配城市
                </div>
              ) : (
                filteredCities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onCityChange(c.id, c.name);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs transition-colors hover:bg-black/[0.03]"
                    style={{
                      color: c.id === cityId ? "#F27C88" : "#1D1D1F",
                      fontWeight: c.id === cityId ? 600 : 400,
                    }}
                  >
                    {c.name}
                    <span className="ml-1" style={{ color: "#AEAEB2", fontSize: 10 }}>{c.adm1}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Horizontal scrollable calendar strip */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6">
          <div
            className="w-4 h-4 rounded-full"
            style={{
              border: "2px solid rgba(242,124,136,0.15)",
              borderTopColor: "#F27C88",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span className="text-xs" style={{ color: "#AEAEB2" }}>获取天气中...</span>
        </div>
      ) : forecasts.length > 0 ? (
        <>
          <div
            ref={scrollRef}
            data-calendar-strip
            className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`[data-calendar-strip]::-webkit-scrollbar { display: none; }`}</style>
            {forecasts.map((f, i) => {
              const active = i === targetDay;
              return (
                <button
                  key={f.date}
                  data-active={active}
                  onClick={() => onTargetDayChange(i)}
                  className="flex flex-col items-center flex-shrink-0 rounded-2xl px-3 py-2.5 transition-all duration-200"
                  style={{
                    minWidth: 64,
                    background: active
                      ? "linear-gradient(135deg, #F27C88, #F9A8B0)"
                      : "rgba(0,0,0,0.03)",
                    boxShadow: active ? "0 2px 12px rgba(242,124,136,0.3)" : "none",
                    border: active ? "none" : "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <span
                    className="text-[11px] font-semibold leading-tight"
                    style={{ color: active ? "#fff" : "#6E6E73" }}
                  >
                    {f.weekday}
                  </span>
                  <span
                    className="text-[10px] leading-tight mt-0.5"
                    style={{ color: active ? "rgba(255,255,255,0.8)" : "#AEAEB2" }}
                  >
                    {f.dateShort}
                  </span>
                  <span className="text-xl leading-none my-1.5">
                    {getWeatherIcon(f.weatherDay)}
                  </span>
                  <span
                    className="text-[11px] font-medium leading-tight"
                    style={{ color: active ? "#fff" : "#1D1D1F" }}
                  >
                    {f.tempMin}~{f.tempMax}°
                  </span>
                  {(i <= 2) && (
                    <span
                      className="text-[9px] mt-1 px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        background: active ? "rgba(255,255,255,0.25)" : "rgba(242,124,136,0.08)",
                        color: active ? "#fff" : "#F27C88",
                      }}
                    >
                      {f.dayLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day detail */}
          {forecast && (
            <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
              <span className="text-3xl leading-none">{getWeatherIcon(forecast.weatherDay)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold tracking-tight" style={{ color: "#1D1D1F" }}>
                    {forecast.tempRange}
                  </span>
                  <span className="text-xs font-medium" style={{ color: "#F27C88" }}>
                    {forecast.dayLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs" style={{ color: "#6E6E73" }}>
                    {forecast.weatherDay}{forecast.weatherDay !== forecast.weatherNight ? ` → ${forecast.weatherNight}` : ""}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : weather ? (
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none">{getWeatherIcon(weather.weather)}</span>
          <div>
            <span className="text-lg font-bold" style={{ color: "#1D1D1F" }}>{weather.temp}</span>
            <p className="text-[10px]" style={{ color: "#6E6E73" }}>
              {weather.weather} · 体感 {weather.feelsLike}
            </p>
          </div>
        </div>
      ) : (
        <div className="py-2">
          <span className="text-xs" style={{ color: "#AEAEB2" }}>天气数据暂不可用</span>
        </div>
      )}

      {/* Clothing advice */}
      {clothingAdvice && (
        <div
          className="mt-3 px-3 py-2 rounded-xl text-xs leading-relaxed"
          style={{ background: "rgba(242,124,136,0.04)", color: "#6E6E73" }}
        >
          <span style={{ color: "#F27C88" }}>
            {forecast?.dayLabel === "今天" ? "👔 今日穿衣建议：" : `👔 ${forecast?.dayLabel}穿衣建议：`}
          </span>
          {clothingAdvice}
        </div>
      )}
    </div>
  );
}

const DIM_LABELS: { key: keyof ScoreDims; label: string }[] = [
  { key: "colorHarmony", label: "色彩" },
  { key: "styleCohesion", label: "风格" },
  { key: "trendiness", label: "时尚" },
  { key: "practicality", label: "实穿" },
  { key: "creativity", label: "创意" },
];

function RadarChart({
  dims,
  score,
  size = 140,
}: {
  dims: ScoreDims;
  score: number;
  size?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.34;
  const labelR = size * 0.46;
  const levels = [20, 40, 60, 80, 100];
  const n = DIM_LABELS.length;

  const angleOf = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const pointAt = (i: number, value: number) => {
    const a = angleOf(i);
    const r = (value / 100) * maxR;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  const gridPaths = levels.map((lv) => {
    const pts = Array.from({ length: n }, (_, i) => pointAt(i, lv));
    return pts.map((p) => `${p[0]},${p[1]}`).join(" ");
  });

  const dataPts = DIM_LABELS.map((d, i) => pointAt(i, dims[d.key]));
  const dataPath = dataPts.map((p) => `${p[0]},${p[1]}`).join(" ");

  const displayScore = hovered !== null ? dims[DIM_LABELS[hovered].key] : score;
  const scoreColor =
    displayScore >= 80 ? "#34C759" : displayScore >= 60 ? "#F27C88" : "#FF3B30";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      onMouseLeave={() => setHovered(null)}
    >
      <svg width={size} height={size}>
        {gridPaths.map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: n }, (_, i) => {
          const [ex, ey] = pointAt(i, 100);
          const active = hovered === i;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={ex}
              y2={ey}
              stroke={active ? "#F27C88" : "rgba(0,0,0,0.04)"}
              strokeWidth={active ? 1.5 : 0.5}
              style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
            />
          );
        })}
        <polygon
          points={dataPath}
          fill="rgba(242,124,136,0.12)"
          stroke="#F27C88"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {dataPts.map((p, i) => {
          const active = hovered === i;
          return (
            <circle
              key={i}
              cx={p[0]}
              cy={p[1]}
              r={active ? 5 : 2.5}
              fill={active ? "#F27C88" : "#F27C88"}
              stroke={active ? "white" : "none"}
              strokeWidth={active ? 2 : 0}
              style={{ transition: "r 0.2s" }}
            />
          );
        })}
        {DIM_LABELS.map((d, i) => {
          const a = angleOf(i);
          const lx = cx + labelR * Math.cos(a);
          const ly = cy + labelR * Math.sin(a);
          const active = hovered === i;
          const dimVal = dims[d.key];
          const label = active ? `${d.label} ${dimVal}` : d.label;
          return (
            <text
              key={d.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={active ? 11 : 10}
              fontWeight={active ? 700 : 500}
              fill={active ? "#F27C88" : "#6E6E73"}
              style={{ transition: "fill 0.2s, font-size 0.2s", cursor: "default" }}
            >
              {label}
            </text>
          );
        })}
        {DIM_LABELS.map((_, i) => {
          const a = angleOf(i);
          const hx = cx + labelR * Math.cos(a);
          const hy = cy + labelR * Math.sin(a);
          return (
            <circle
              key={`hit-${i}`}
              cx={hx}
              cy={hy}
              r={14}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
          );
        })}
      </svg>
      <span
        className="absolute font-bold pointer-events-none"
        style={{
          color: scoreColor,
          fontSize: size * 0.16,
          transition: "color 0.2s",
        }}
      >
        {displayScore}
      </span>
    </div>
  );
}

function RecommendationCard({
  rec,
  onToggleFavorite,
  onPreviewImage,
}: {
  rec: Recommendation;
  onToggleFavorite: (outfitId: string) => void;
  onPreviewImage: (src: string, alt: string) => void;
}) {
  return (
    <div
      className="glass rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
      style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.04)" }}
    >
      <div className="relative" style={{ aspectRatio: "3/4" }}>
        <Image
          src={rec.imagePath}
          alt={`推荐穿搭 ${rec.rank}`}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Rank badge */}
        <div
          className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #F27C88, #FACDD0)",
            boxShadow: "0 2px 8px rgba(242,124,136,0.3)",
          }}
        >
          {rec.rank}
        </div>

        {/* Bottom actions */}
        <div className="absolute bottom-3 inset-x-3 flex items-end justify-between">
          <div className="flex gap-1.5">
            {rec.topItem && (
              <button
                onClick={() => onPreviewImage(rec.topItem!.imagePath, rec.topItem!.name)}
                className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white/40 cursor-pointer hover:border-white/70 transition-all"
              >
                <Image
                  src={rec.topItem.imagePath}
                  alt={rec.topItem.name}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              </button>
            )}
            {rec.bottomItem && (
              <button
                onClick={() => onPreviewImage(rec.bottomItem!.imagePath, rec.bottomItem!.name)}
                className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white/40 cursor-pointer hover:border-white/70 transition-all"
              >
                <Image
                  src={rec.bottomItem.imagePath}
                  alt={rec.bottomItem.name}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              </button>
            )}
          </div>
          <button
            onClick={() => onToggleFavorite(rec.outfitId)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: rec.isFavorite
                ? "rgba(255,59,48,0.9)"
                : "rgba(255,255,255,0.2)",
              backdropFilter: "blur(12px)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={rec.isFavorite ? "white" : "none"}
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info section */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {rec.topItem && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: "#F27C88", background: "rgba(242,124,136,0.08)" }}
            >
              {rec.topItem.name}
            </span>
          )}
          <span className="text-[10px]" style={{ color: "#AEAEB2" }}>+</span>
          {rec.bottomItem && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: "#F27C88", background: "rgba(242,124,136,0.08)" }}
            >
              {rec.bottomItem.name}
            </span>
          )}
        </div>
        {rec.score !== null && rec.scoreDims && (
          <div className="flex justify-center py-1">
            <RadarChart dims={rec.scoreDims} score={rec.score} size={150} />
          </div>
        )}
        {rec.evaluation && (
          <p
            className="text-xs leading-relaxed"
            style={{ color: "#1D1D1F" }}
            dangerouslySetInnerHTML={{ __html: rec.evaluation }}
          />
        )}
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [progressMsg, setProgressMsg] = useState("");
  const [progressDetail, setProgressDetail] = useState<{
    current?: number;
    total?: number;
  }>({});
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const closePreview = useCallback(() => setPreviewImage(null), []);

  useModalKeyboard({
    isOpen: !!previewImage,
    onClose: closePreview,
  });
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID);
  const [cityName, setCityName] = useState(
    PRESET_CITIES.find((c) => c.id === DEFAULT_CITY_ID)?.name || "杭州"
  );
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [targetDay, setTargetDay] = useState(getDefaultTargetDay);

  const fetchWeather = useCallback(async (locId: string) => {
    setWeatherLoading(true);
    try {
      const res = await fetch(`/api/weather?locationId=${locId}`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data.summary ?? null);
      } else {
        setWeather(null);
      }
    } catch {
      setWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather(cityId);
  }, [cityId, fetchWeather]);

  const handleCityChange = (id: string, name: string) => {
    setCityId(id);
    setCityName(name);
  };

  const handlePersonChange = (id: string) => {
    if (id === selectedPerson) return;
    setSelectedPerson(id);
    if (phase === "complete" || phase === "error") {
      setPhase("idle");
      setRecommendations([]);
    }
  };

  const currentPerson = persons.find((p) => p.id === selectedPerson);
  const targetForecast = weather?.forecasts?.[targetDay];
  const targetDayLabel = targetForecast?.dayLabel || (targetDay === 0 ? "今天" : targetDay === 1 ? "明天" : "后天");

  useEffect(() => {
    fetch("/api/persons")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setPersons(data);
        const def = data.find((p: PersonData) => p.isDefault);
        if (def) setSelectedPerson(def.id);
        else if (data.length > 0) setSelectedPerson(data[0].id);
      });
  }, []);

  // Sync date with targetDay
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + targetDay);
    setDate(d.toISOString().slice(0, 10));
    setPhase("loading");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDay]);

  const loadExisting = useCallback(async () => {
    try {
      const res = await fetch(`/api/recommendations?date=${date}`);
      const data = await res.json();
      if (data.recommendations?.length > 0) {
        setRecommendations(data.recommendations);
        setPhase("complete");
      } else {
        setPhase("idle");
      }
    } catch {
      setPhase("idle");
    }
  }, [date]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const handleGenerate = useCallback(async () => {
    if (!selectedPerson) return;

    setPhase("matching");
    setProgressMsg("正在启动推荐引擎...");
    setProgressDetail({});
    setError(null);
    setRecommendations([]);

    try {
      const res = await fetch("/api/recommendations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personImageId: selectedPerson, locationId: cityId, targetDay }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "生成失败");
        setPhase("error");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("无法读取响应流");
        setPhase("error");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const payload = JSON.parse(line.slice(6));

              if (eventType === "progress") {
                setProgressMsg(payload.message || "");
                if (payload.current !== undefined) {
                  setProgressDetail({
                    current: payload.current,
                    total: payload.total,
                  });
                }
                if (payload.step === "matching" || payload.step === "matched") {
                  setPhase("matching");
                } else if (
                  payload.step === "generating" ||
                  payload.step === "generated" ||
                  payload.step === "generate_failed"
                ) {
                  setPhase("generating");
                } else if (
                  payload.step === "scoring" ||
                  payload.step === "scored"
                ) {
                  setPhase("scoring");
                }
              } else if (eventType === "complete") {
                setRecommendations(payload.recommendations || []);
                setDate(payload.date);
                setPhase("complete");
              } else if (eventType === "error") {
                setError(payload.message || "生成失败");
                setPhase("error");
              }
            } catch {
              // skip malformed lines
            }
            eventType = "";
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
      setPhase("error");
    }
  }, [selectedPerson, cityId, targetDay]);

  const handleToggleFavorite = async (outfitId: string) => {
    const rec = recommendations.find((r) => r.outfitId === outfitId);
    if (!rec) return;
    const newVal = !rec.isFavorite;

    setRecommendations((prev) =>
      prev.map((r) =>
        r.outfitId === outfitId ? { ...r, isFavorite: newVal } : r
      )
    );

    try {
      await fetch(`/api/outfits/${outfitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newVal }),
      });
    } catch {
      setRecommendations((prev) =>
        prev.map((r) =>
          r.outfitId === outfitId ? { ...r, isFavorite: !newVal } : r
        )
      );
    }
  };

  const handleRescore = useCallback(async () => {
    setRescoring(true);
    try {
      const res = await fetch("/api/recommendations/rescore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (res.ok && data.recommendations?.length > 0) {
        setRecommendations(data.recommendations);
      } else {
        setError(data.error || "重新打分失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setRescoring(false);
    }
  }, [date]);

  const handleQuickOutfit = useCallback(async () => {
    setQuickLoading(true);
    try {
      const excludeIds = recommendations.map((o) => o.outfitId);
      const params = new URLSearchParams();
      if (excludeIds.length > 0) params.set("excludeIds", excludeIds.join(","));
      params.set("date", date);
      const res = await fetch(`/api/outfits/quick?${params}`);
      const data = await res.json();
      if (data.outfits?.length > 0) {
        const mapped: Recommendation[] = data.outfits.map((o: Recommendation, i: number) => ({
          rank: i + 1,
          outfitId: o.outfitId,
          imagePath: o.imagePath,
          score: o.score,
          scoreDims: o.scoreDims,
          evaluation: o.evaluation,
          reason: o.reason,
          isFavorite: o.isFavorite,
          topItem: o.topItem,
          bottomItem: o.bottomItem,
        }));
        setRecommendations(mapped);
        setPhase("complete");
      }
    } catch {
      // ignore
    } finally {
      setQuickLoading(false);
    }
  }, [recommendations, date]);

  const isProcessing =
    phase === "matching" || phase === "generating" || phase === "scoring";

  const progressPercent =
    phase === "matching"
      ? 10
      : phase === "generating"
        ? 10 +
          ((progressDetail.current || 0) / (progressDetail.total || 5)) * 60
        : phase === "scoring"
          ? 70 +
            ((progressDetail.current || 0) / (progressDetail.total || 5)) * 25
          : phase === "complete"
            ? 100
            : 0;

  return (
    <div className="relative min-h-screen" style={{ background: "#FFF8F6" }}>
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          top: "-15%",
          right: "-8%",
          width: 700,
          height: 700,
          background:
            "radial-gradient(circle, rgba(242,124,136,0.12), transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {showPersonPicker && (
        <PersonPicker
          persons={persons}
          selected={selectedPerson}
          onSelect={handlePersonChange}
          onClose={() => setShowPersonPicker(false)}
        />
      )}


      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-8 pb-20">
        {/* Header */}
        <div className="text-center mb-6">
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: "#1D1D1F" }}
          >
            <span
              style={{
                background: "linear-gradient(135deg, #F27C88, #FACDD0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {targetDayLabel}
            </span>
            {" "}穿搭推荐
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#6E6E73" }}>
            {targetDay === 0
              ? "AI 从你的衣橱中智能搭配，精选最佳方案"
              : `根据${targetDayLabel}天气预报，提前为你准备穿搭`}
          </p>
        </div>

        {/* Weather card */}
        <WeatherCard
          weather={weather}
          cityId={cityId}
          cityName={cityName}
          targetDay={targetDay}
          onCityChange={handleCityChange}
          onTargetDayChange={setTargetDay}
          loading={weatherLoading}
        />

        {/* Person selector bar - always visible when persons exist */}
        {persons.length > 0 && phase !== "loading" && (
          <div className="flex items-center justify-center gap-3 mb-8">
            <button
              onClick={() => !isProcessing && setShowPersonPicker(true)}
              disabled={isProcessing}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full transition-all"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
                cursor: isProcessing ? "not-allowed" : "pointer",
                opacity: isProcessing ? 0.6 : 1,
              }}
            >
              {currentPerson && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={currentPerson.imagePath}
                    alt={currentPerson.name}
                    width={28}
                    height={28}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <span className="text-xs font-medium" style={{ color: "#1D1D1F" }}>
                {currentPerson?.name || "选择人像"}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <div className="glass rounded-3xl p-8 mb-8">
            <div className="flex flex-col items-center gap-5">
              <div className="relative w-14 h-14">
                <svg
                  className="w-14 h-14"
                  viewBox="0 0 56 56"
                  style={{ animation: "spin 1.2s linear infinite" }}
                >
                  <defs>
                    <linearGradient
                      id="rg"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#F27C88" />
                      <stop offset="100%" stopColor="#FACDD0" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="rgba(242,124,136,0.1)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="url(#rg)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="100 151"
                  />
                </svg>
              </div>

              <p
                className="text-sm font-medium"
                style={{ color: "#1D1D1F" }}
              >
                {progressMsg}
              </p>

              {/* Progress bar */}
              <div className="w-full max-w-sm">
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(0,0,0,0.06)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPercent}%`,
                      background:
                        "linear-gradient(90deg, #F27C88, #FACDD0)",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  {["匹配单品", "生成穿搭", "AI 评分"].map((label, i) => {
                    const phases: Phase[] = [
                      "matching",
                      "generating",
                      "scoring",
                    ];
                    const active =
                      phases.indexOf(phase as Phase) >= i;
                    return (
                      <span
                        key={label}
                        className="text-[10px] font-medium"
                        style={{
                          color: active ? "#F27C88" : "#AEAEB2",
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Idle state - show generate button */}
        {phase === "idle" && (
          <div className="glass rounded-3xl p-10 flex flex-col items-center gap-6">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(242,124,136,0.06)" }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ stroke: "#F27C88" }}
              >
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </div>

            <div className="text-center">
              <p
                className="text-sm font-medium"
                style={{ color: "#1D1D1F" }}
              >
                {targetDayLabel}还没有穿搭推荐
              </p>
              <p className="text-xs mt-1" style={{ color: "#AEAEB2" }}>
                {targetDay === 0
                  ? "AI 将从你的衣橱中智能匹配，生成 3 套最佳穿搭"
                  : `根据${targetDayLabel}天气预报，提前智能搭配 3 套穿搭`}
              </p>
            </div>

            {persons.length === 0 ? (
              <a
                href="/persons"
                className="px-6 py-3 rounded-full text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #F27C88, #FACDD0)",
                  boxShadow: "0 4px 16px rgba(242,124,136,0.25)",
                }}
              >
                先上传人像
              </a>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={!selectedPerson}
                  className="btn-gradient px-8 py-3.5 rounded-full text-sm font-semibold tracking-wide"
                >
                  生成{targetDayLabel}推荐
                </button>
                <button
                  onClick={handleQuickOutfit}
                  disabled={!selectedPerson || quickLoading}
                  className="px-6 py-2.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    color: "#F27C88",
                    background: "rgba(242,124,136,0.08)",
                    border: "1px solid rgba(242,124,136,0.15)",
                    opacity: quickLoading ? 0.7 : 1,
                  }}
                >
                  {quickLoading ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" style={{ animation: "spin 0.8s linear infinite" }}>
                        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="28 10" strokeLinecap="round" />
                      </svg>
                      加载中...
                    </span>
                  ) : "Surprise Me"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {phase === "error" && (
          <div className="glass rounded-3xl p-8 flex flex-col items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,59,48,0.06)" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FF3B30"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4m0 4h.01" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "#FF3B30" }}>
              {error}
            </p>
            <button
              onClick={handleGenerate}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #F27C88, #FACDD0)",
              }}
            >
              重试
            </button>
          </div>
        )}

        {/* Results */}
        {phase === "complete" && recommendations.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.outfitId}
                  rec={rec}
                  onToggleFavorite={handleToggleFavorite}
                  onPreviewImage={(src, alt) => setPreviewImage({ src, alt })}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={handleRescore}
                disabled={rescoring || isProcessing}
                className="px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{
                  color: rescoring ? "#AEAEB2" : "#F27C88",
                  background: "rgba(242,124,136,0.08)",
                  border: "1px solid rgba(242,124,136,0.15)",
                  opacity: rescoring ? 0.7 : 1,
                }}
              >
                {rescoring ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" style={{ animation: "spin 0.8s linear infinite" }}>
                      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="28 10" strokeLinecap="round" />
                    </svg>
                    正在重新打分...
                  </span>
                ) : "重新打分"}
              </button>
              <button
                onClick={handleGenerate}
                disabled={isProcessing || rescoring}
                className="px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
                style={{
                  color: "#6E6E73",
                  background: "rgba(0,0,0,0.03)",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                重新推荐
              </button>
              <button
                onClick={handleQuickOutfit}
                disabled={quickLoading}
                className="px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{
                  color: "#F27C88",
                  background: "rgba(242,124,136,0.08)",
                  border: "1px solid rgba(242,124,136,0.15)",
                }}
              >
                Surprise Me
              </button>
            </div>
          </>
        )}

        {/* Loading state */}
        {phase === "loading" && (
          <div className="flex flex-col gap-5">
            <SkeletonWeatherBar />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonOutfitCard key={i} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={previewImage.src}
              alt={previewImage.alt}
              width={400}
              height={400}
              className="w-full h-auto rounded-2xl"
              style={{ background: "#fff" }}
            />
            <p className="text-center text-sm font-medium mt-3" style={{ color: "#fff" }}>
              {previewImage.alt}
            </p>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.9)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
