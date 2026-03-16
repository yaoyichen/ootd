"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface CityOption {
  id: string;
  name: string;
  adm1: string;
  adm2: string;
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
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
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
                  border: selected === p.id ? "2px solid #FF9500" : "2px solid transparent",
                  boxShadow: selected === p.id ? "0 0 0 2px rgba(255,149,0,0.2)" : "none",
                }}
              >
                <div className="relative" style={{ aspectRatio: "3/4" }}>
                  <Image src={p.imagePath} alt={p.name} fill className="object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate" style={{ color: "#1D1D1F" }}>{p.name}</p>
                  {p.isDefault && (
                    <span className="text-[10px]" style={{ color: "#FF9500" }}>默认</span>
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
  onCityChange,
  loading,
}: {
  weather: WeatherSummary | null;
  cityId: string;
  onCityChange: (id: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="glass rounded-2xl p-4 mb-6 transition-all duration-300"
      style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.03)" }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* City dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: "rgba(255,149,0,0.08)",
              color: "#FF9500",
              border: "1px solid rgba(255,149,0,0.15)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {PRESET_CITIES.find((c) => c.id === cityId)?.name || "选择城市"}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {open && (
            <div
              className="absolute top-full left-0 mt-1.5 z-30 rounded-xl py-1 max-h-52 overflow-y-auto"
              style={{
                background: "rgba(255,255,255,0.98)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
                border: "1px solid rgba(0,0,0,0.06)",
                minWidth: 120,
              }}
            >
              {PRESET_CITIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onCityChange(c.id); setOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs transition-colors hover:bg-black/[0.03]"
                  style={{
                    color: c.id === cityId ? "#FF9500" : "#1D1D1F",
                    fontWeight: c.id === cityId ? 600 : 400,
                  }}
                >
                  {c.name}
                  <span className="ml-1" style={{ color: "#AEAEB2", fontSize: 10 }}>{c.adm1}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Weather info */}
        {loading ? (
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{
                border: "2px solid rgba(255,149,0,0.15)",
                borderTopColor: "#FF9500",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span className="text-xs" style={{ color: "#AEAEB2" }}>获取天气中...</span>
          </div>
        ) : weather ? (
          <div className="flex items-center gap-3 flex-1 justify-end">
            <span className="text-xl leading-none">{getWeatherIcon(weather.weather)}</span>
            <div className="text-right">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold" style={{ color: "#1D1D1F" }}>{weather.temp}</span>
                <span className="text-[10px]" style={{ color: "#AEAEB2" }}>{weather.todayRange}</span>
              </div>
              <p className="text-[10px]" style={{ color: "#6E6E73" }}>
                {weather.weather} · 体感 {weather.feelsLike} · {weather.wind}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-xs" style={{ color: "#AEAEB2" }}>天气数据暂不可用</span>
        )}
      </div>

      {/* Clothing advice */}
      {weather?.clothingAdvice && (
        <div
          className="mt-3 px-3 py-2 rounded-xl text-xs leading-relaxed"
          style={{ background: "rgba(255,149,0,0.04)", color: "#6E6E73" }}
        >
          <span style={{ color: "#FF9500" }}>👔 穿衣建议：</span>
          {weather.clothingAdvice}
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
    displayScore >= 80 ? "#34C759" : displayScore >= 60 ? "#FF9500" : "#FF3B30";

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
              stroke={active ? "#FF9500" : "rgba(0,0,0,0.04)"}
              strokeWidth={active ? 1.5 : 0.5}
              style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
            />
          );
        })}
        <polygon
          points={dataPath}
          fill="rgba(255,149,0,0.12)"
          stroke="#FF9500"
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
              fill={active ? "#FF9500" : "#FF9500"}
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
              fill={active ? "#FF9500" : "#6E6E73"}
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
}: {
  rec: Recommendation;
  onToggleFavorite: (outfitId: string) => void;
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
            background: "linear-gradient(135deg, #FF9500, #FFCC00)",
            boxShadow: "0 2px 8px rgba(255,149,0,0.3)",
          }}
        >
          {rec.rank}
        </div>

        {/* Bottom actions */}
        <div className="absolute bottom-3 inset-x-3 flex items-end justify-between">
          <div className="flex gap-1.5">
            {rec.topItem && (
              <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white/40">
                <Image
                  src={rec.topItem.imagePath}
                  alt={rec.topItem.name}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            {rec.bottomItem && (
              <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white/40">
                <Image
                  src={rec.bottomItem.imagePath}
                  alt={rec.bottomItem.name}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              </div>
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
              style={{ color: "#FF9500", background: "rgba(255,149,0,0.08)" }}
            >
              {rec.topItem.name}
            </span>
          )}
          <span className="text-[10px]" style={{ color: "#AEAEB2" }}>+</span>
          {rec.bottomItem && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: "#FF9500", background: "rgba(255,149,0,0.08)" }}
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
        {rec.reason && (
          <p className="text-xs" style={{ color: "#6E6E73" }}>
            {rec.reason}
          </p>
        )}
        {rec.evaluation && (
          <p className="text-xs leading-relaxed" style={{ color: "#1D1D1F" }}>
            {rec.evaluation}
          </p>
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
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

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

  const handleCityChange = (id: string) => {
    setCityId(id);
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
        body: JSON.stringify({ personImageId: selectedPerson, locationId: cityId }),
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
  }, [selectedPerson, cityId]);

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
    <div className="relative min-h-screen" style={{ background: "#FEFCF8" }}>
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          top: "-15%",
          right: "-8%",
          width: 700,
          height: 700,
          background:
            "radial-gradient(circle, rgba(255,149,0,0.12), transparent 70%)",
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
                background: "linear-gradient(135deg, #FF9500, #FFCC00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              今日
            </span>
            {" "}穿搭推荐
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#6E6E73" }}>
            AI 从你的衣橱中智能搭配，精选最佳方案
          </p>
        </div>

        {/* Weather card */}
        <WeatherCard
          weather={weather}
          cityId={cityId}
          onCityChange={handleCityChange}
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
                      <stop offset="0%" stopColor="#FF9500" />
                      <stop offset="100%" stopColor="#FFCC00" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="rgba(255,149,0,0.1)"
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
                        "linear-gradient(90deg, #FF9500, #FFCC00)",
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
                          color: active ? "#FF9500" : "#AEAEB2",
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
              style={{ background: "rgba(255,149,0,0.06)" }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ stroke: "#FF9500" }}
              >
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </div>

            <div className="text-center">
              <p
                className="text-sm font-medium"
                style={{ color: "#1D1D1F" }}
              >
                今日还没有穿搭推荐
              </p>
              <p className="text-xs mt-1" style={{ color: "#AEAEB2" }}>
                AI 将从你的衣橱中智能匹配，生成 3 套最佳穿搭
              </p>
            </div>

            {persons.length === 0 ? (
              <a
                href="/persons"
                className="px-6 py-3 rounded-full text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #FF9500, #FFCC00)",
                  boxShadow: "0 4px 16px rgba(255,149,0,0.25)",
                }}
              >
                先上传人像
              </a>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!selectedPerson}
                className="btn-gradient px-8 py-3.5 rounded-full text-sm font-semibold tracking-wide"
              >
                生成今日推荐
              </button>
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
                background: "linear-gradient(135deg, #FF9500, #FFCC00)",
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
                  color: rescoring ? "#AEAEB2" : "#FF9500",
                  background: "rgba(255,149,0,0.08)",
                  border: "1px solid rgba(255,149,0,0.15)",
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
            </div>
          </>
        )}

        {/* Loading state */}
        {phase === "loading" && (
          <div className="flex justify-center py-20">
            <div
              className="w-8 h-8 rounded-full"
              style={{
                border: "3px solid rgba(255,149,0,0.15)",
                borderTopColor: "#FF9500",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
