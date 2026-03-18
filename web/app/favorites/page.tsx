"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface ScoreDims {
  colorHarmony: number;
  styleCohesion: number;
  trendiness: number;
  practicality: number;
  creativity: number;
}

interface OutfitRecord {
  id: string;
  personImageId: string;
  topItemId: string | null;
  bottomItemId: string | null;
  resultImagePath: string;
  isFavorite: boolean;
  score: number | null;
  scoreDims: string | null;
  evaluation: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ItemData {
  id: string;
  name: string;
  imagePath: string;
  category: string;
}

interface PersonData {
  id: string;
  name: string;
  imagePath: string;
}

export default function FavoritesPage() {
  const [outfits, setOutfits] = useState<OutfitRecord[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [scoring, setScoring] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    try {
      const [outfitRes, itemRes, personRes] = await Promise.all([
        fetch("/api/outfits?favorites=true"),
        fetch("/api/items"),
        fetch("/api/persons"),
      ]);
      const [outfitData, itemData, personData] = await Promise.all([
        outfitRes.json(),
        itemRes.json(),
        personRes.json(),
      ]);
      if (Array.isArray(outfitData)) setOutfits(outfitData);
      if (Array.isArray(itemData)) setItems(itemData);
      if (Array.isArray(personData)) setPersons(personData);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getItem = (id: string | null) => items.find((i) => i.id === id);
  const getPerson = (id: string) => persons.find((p) => p.id === id);

  const handleUnfavorite = async (id: string) => {
    setOutfits((prev) => prev.filter((o) => o.id !== id));
    try {
      await fetch(`/api/outfits/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: false }),
      });
    } catch {
      fetchAll();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除这条穿搭记录？删除后图片也将被清除。")) return;
    setOutfits((prev) => prev.filter((o) => o.id !== id));
    try {
      await fetch(`/api/outfits/${id}`, { method: "DELETE" });
    } catch {
      fetchAll();
    }
  };

  const handleScore = async (id: string) => {
    setScoring((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/outfits/${id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOutfits((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                score: data.score,
                scoreDims: JSON.stringify(data.scoreDims),
                evaluation: data.evaluation,
              }
            : o
        )
      );
    } catch {
      /* ignore */
    } finally {
      setScoring((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative min-h-screen" style={{ background: "#FFF8F6" }}>
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          top: "-15%", right: "-8%", width: 700, height: 700,
          background: "radial-gradient(circle, rgba(242,124,136,0.18), transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightbox}
              alt="穿搭大图"
              width={768}
              height={1152}
              className="rounded-3xl object-contain w-full h-auto"
              unoptimized
            />
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-20">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "#1D1D1F" }}>
            <span
              style={{
                background: "linear-gradient(135deg, #F27C88, #FACDD0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              我的收藏
            </span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#6E6E73" }}>
            收藏的穿搭效果
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="w-8 h-8" viewBox="0 0 48 48" style={{ animation: "spin 1s linear infinite" }}>
              <defs>
                <linearGradient id="fsg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F27C88" />
                  <stop offset="100%" stopColor="#FACDD0" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(242,124,136,0.12)" strokeWidth="3" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="url(#fsg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="90 126" />
            </svg>
          </div>
        ) : outfits.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <div
              className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: "rgba(242,124,136,0.08)" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F27C88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <p className="text-base font-medium" style={{ color: "#1D1D1F" }}>还没有收藏的穿搭</p>
            <p className="text-sm mt-2" style={{ color: "#AEAEB2" }}>
              前往
              <a href="/tryon" className="font-semibold" style={{ color: "#F27C88" }}> 试穿 </a>
              生成穿搭并点击收藏
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map((outfit) => {
              const person = getPerson(outfit.personImageId);
              const top = getItem(outfit.topItemId);
              const bottom = getItem(outfit.bottomItemId);
              const dims: ScoreDims | null = outfit.scoreDims
                ? JSON.parse(outfit.scoreDims)
                : null;

              return (
                <div
                  key={outfit.id}
                  className="glass rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                  style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(242,124,136,0.1)";
                    e.currentTarget.style.borderColor = "rgba(242,124,136,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.04)";
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
                  }}
                >
                  <button
                    onClick={() => setLightbox(outfit.resultImagePath)}
                    className="relative w-full block"
                    style={{ aspectRatio: "3/4" }}
                  >
                    <Image
                      src={outfit.resultImagePath}
                      alt="穿搭效果"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                  </button>

                  <div className="p-4">
                    {/* Score + evaluation */}
                    {outfit.score != null && dims && (
                      <div className="mb-3">
                        {/* Evaluation text - the hero */}
                        {outfit.evaluation && (
                          <div
                            className="eval-card relative rounded-2xl px-4 py-3 mb-3"
                            style={{
                              background: "linear-gradient(135deg, rgba(242,124,136,0.06), rgba(250,205,208,0.12))",
                              border: "1px solid rgba(242,124,136,0.12)",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 12px rgba(242,124,136,0.06)",
                            }}
                          >
                            <span
                              className="absolute -top-2 -left-1 text-2xl leading-none select-none"
                              style={{ color: "rgba(242,124,136,0.3)" }}
                            >
                              &ldquo;
                            </span>
                            <p
                              className="text-[13px] leading-relaxed font-medium"
                              style={{ color: "#1D1D1F" }}
                              dangerouslySetInnerHTML={{ __html: outfit.evaluation }}
                            />
                          </div>
                        )}
                        {/* Score badge + mini radar row */}
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                            style={{
                              background: outfit.score >= 80
                                ? "linear-gradient(135deg, rgba(52,199,89,0.1), rgba(52,199,89,0.05))"
                                : outfit.score >= 60
                                ? "linear-gradient(135deg, rgba(242,124,136,0.1), rgba(242,124,136,0.05))"
                                : "linear-gradient(135deg, rgba(255,59,48,0.1), rgba(255,59,48,0.05))",
                              border: `1px solid ${
                                outfit.score >= 80
                                  ? "rgba(52,199,89,0.15)"
                                  : outfit.score >= 60
                                  ? "rgba(242,124,136,0.15)"
                                  : "rgba(255,59,48,0.15)"
                              }`,
                            }}
                          >
                            <span
                              className="text-lg font-bold"
                              style={{
                                color: outfit.score >= 80 ? "#34C759" : outfit.score >= 60 ? "#F27C88" : "#FF3B30",
                              }}
                            >
                              {outfit.score}
                            </span>
                            <span className="text-[10px] font-medium" style={{ color: "#AEAEB2" }}>分</span>
                          </div>
                          <div className="flex-1 flex gap-1">
                            {DIM_LABELS.map((d) => {
                              const val = dims[d.key];
                              return (
                                <div key={d.key} className="flex-1 flex flex-col items-center gap-0.5">
                                  <div
                                    className="w-full rounded-full overflow-hidden"
                                    style={{ height: 3, background: "rgba(0,0,0,0.04)" }}
                                  >
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${val}%`,
                                        background: val >= 80
                                          ? "linear-gradient(90deg, #34C759, #30D158)"
                                          : val >= 60
                                          ? "linear-gradient(90deg, #F27C88, #FACDD0)"
                                          : "linear-gradient(90deg, #FF3B30, #FF6961)",
                                      }}
                                    />
                                  </div>
                                  <span className="text-[8px]" style={{ color: "#AEAEB2" }}>{d.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mb-3">
                      {person && (
                        <button
                          onClick={() => setLightbox(person.imagePath)}
                          className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-pink-300 transition-all"
                          title={person.name}
                        >
                          <Image src={person.imagePath} alt={person.name} fill className="object-cover" />
                        </button>
                      )}
                      {top && (
                        <button
                          onClick={() => setLightbox(top.imagePath)}
                          className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-pink-300 transition-all"
                          title={top.name}
                        >
                          <Image src={top.imagePath} alt={top.name} fill className="object-cover" />
                        </button>
                      )}
                      {bottom && (
                        <button
                          onClick={() => setLightbox(bottom.imagePath)}
                          className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-pink-300 transition-all"
                          title={bottom.name}
                        >
                          <Image src={bottom.imagePath} alt={bottom.name} fill className="object-cover" />
                        </button>
                      )}
                      <div className="flex-1" />
                      <span className="text-[10px] self-center" style={{ color: "#AEAEB2" }}>
                        {formatDate(outfit.updatedAt)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUnfavorite(outfit.id)}
                        className="flex-1 py-2 rounded-full text-xs font-medium transition-colors"
                        style={{
                          background: "rgba(255,59,48,0.06)",
                          color: "#FF3B30",
                          border: "1px solid rgba(255,59,48,0.1)",
                        }}
                      >
                        取消收藏
                      </button>
                      <a
                        href={outfit.resultImagePath}
                        download={`ootd-${outfit.id}.png`}
                        className="flex-1 py-2 rounded-full text-xs font-medium text-center transition-colors"
                        style={{
                          background: "rgba(242,124,136,0.08)",
                          color: "#F27C88",
                          border: "1px solid rgba(242,124,136,0.12)",
                        }}
                      >
                        下载
                      </a>
                      <button
                        onClick={() => handleScore(outfit.id)}
                        disabled={scoring.has(outfit.id)}
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          background: scoring.has(outfit.id)
                            ? "rgba(242,124,136,0.12)"
                            : "rgba(242,124,136,0.06)",
                        }}
                        title={outfit.score != null ? "重新打分" : "AI 打分"}
                      >
                        {scoring.has(outfit.id) ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
                            <circle cx="12" cy="12" r="10" fill="none" stroke="#F27C88" strokeWidth="2" strokeDasharray="31 31" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F27C88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20V10" />
                            <path d="M18 20V4" />
                            <path d="M6 20v-4" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(outfit.id)}
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(0,0,0,0.04)" }}
                        title="删除"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
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
  size = 120,
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
      className="relative inline-flex items-center justify-center flex-shrink-0"
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
              r={active ? 4 : 2}
              fill="#F27C88"
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
              fontSize={active ? 10 : 9}
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
              r={12}
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
          fontSize: size * 0.15,
          transition: "color 0.2s",
        }}
      >
        {displayScore}
      </span>
    </div>
  );
}
