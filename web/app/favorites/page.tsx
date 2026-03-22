"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useToast } from "../components/ToastProvider";
import { SkeletonOutfitCard } from "../components/Skeleton";
import { useModalKeyboard } from "../hooks/useModalKeyboard";
import ShareCardModal from "../components/ShareCardModal";
import { ComparisonModal } from "../components/ComparisonModal";
import { PageShell } from "../components/PageShell";
import { RadarChart } from "../components/RadarChart";
import { ScoreBadge } from "../components/ScoreBadge";

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
  const [shareOutfit, setShareOutfit] = useState<OutfitRecord | null>(null);
  const [publishedOutfitIds, setPublishedOutfitIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<{
    aiImage: string;
    realImage: string;
    score: number | null;
    outfitId: string;
  } | null>(null);
  const toast = useToast();

  useModalKeyboard({
    isOpen: !!lightbox,
    onClose: () => setLightbox(null),
  });

  const fetchAll = useCallback(async () => {
    try {
      const [outfitRes, itemRes, personRes, showcaseRes] = await Promise.all([
        fetch("/api/outfits?favorites=true"),
        fetch("/api/items"),
        fetch("/api/persons"),
        fetch("/api/showcase?limit=50"),
      ]);
      const [outfitData, itemData, personData, showcaseData] = await Promise.all([
        outfitRes.json(),
        itemRes.json(),
        personRes.json(),
        showcaseRes.json(),
      ]);
      if (Array.isArray(outfitData)) setOutfits(outfitData);
      if (Array.isArray(itemData)) setItems(itemData);
      if (Array.isArray(personData)) setPersons(personData);
      if (Array.isArray(showcaseData)) {
        setPublishedOutfitIds(new Set(showcaseData.map((p: { outfitId: string }) => p.outfitId)));
      }
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
    toast.confirm({
      message: "确认删除这条穿搭记录？删除后图片也将被清除。",
      onConfirm: async () => {
        setOutfits((prev) => prev.filter((o) => o.id !== id));
        try {
          await fetch(`/api/outfits/${id}`, { method: "DELETE" });
          toast.success("已删除");
        } catch {
          fetchAll();
        }
      },
    });
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

  const handlePublish = async (outfitId: string) => {
    if (publishedOutfitIds.has(outfitId)) {
      // Find the showcase post and unpublish
      try {
        const res = await fetch(`/api/showcase?limit=50`);
        const posts = await res.json();
        const post = posts.find((p: { outfitId: string }) => p.outfitId === outfitId);
        if (post) {
          await fetch(`/api/showcase/${post.id}`, { method: "DELETE" });
          setPublishedOutfitIds((prev) => { const s = new Set(prev); s.delete(outfitId); return s; });
          toast.success("已从广场撤回");
        }
      } catch {
        toast.error("撤回失败");
      }
    } else {
      try {
        const res = await fetch("/api/showcase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outfitId }),
        });
        if (res.ok) {
          setPublishedOutfitIds((prev) => new Set(prev).add(outfitId));
          toast.success("已发布到广场");
        } else {
          const data = await res.json();
          toast.error(data.error || "发布失败");
        }
      } catch {
        toast.error("发布失败");
      }
    }
  };

  const handlePhotoCompare = (outfit: OutfitRecord) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            if (file.size > 2 * 1024 * 1024) {
              const img = new window.Image();
              img.onload = () => {
                const canvas = document.createElement("canvas");
                const scale = Math.min(1, 1200 / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.85));
              };
              img.onerror = reject;
              img.src = result;
            } else {
              resolve(result);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/ootd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, outfitId: outfit.id }),
        });
        if (!res.ok) {
          toast.error("保存失败");
          return;
        }
        const data = await res.json();
        setComparisonData({
          aiImage: outfit.resultImagePath,
          realImage: data.realPhotoPath,
          score: outfit.score,
          outfitId: outfit.id,
        });
      } catch {
        toast.error("操作失败");
      }
    };
    input.click();
  };

  const handlePublishComparison = async () => {
    if (!comparisonData) return;
    try {
      const res = await fetch("/api/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outfitId: comparisonData.outfitId,
          realPhotoPath: comparisonData.realImage,
          caption: "真实穿搭打卡 ✨",
        }),
      });
      if (res.ok) {
        toast.success("已分享到广场");
        setPublishedOutfitIds((prev) => new Set(prev).add(comparisonData.outfitId));
      } else {
        const data = await res.json();
        toast.error(data.error || "分享失败");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  return (
    <PageShell>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
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
          <p className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>SAVED</p>
          <h1 className="text-2xl font-light text-primary">
            <span className="gradient-text">我的最爱</span>
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonOutfitCard key={i} />
            ))}
          </div>
        ) : outfits.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <div
              className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <p className="text-base font-medium text-primary">还没有收藏的 look</p>
            <p className="text-sm mt-2 text-muted">
              试穿后点小心心就可以收藏啦
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
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(232,160,176,0.1)";
                    e.currentTarget.style.borderColor = "rgba(232,160,176,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.3)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
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
                        {/* Clickable score badge to toggle expansion */}
                        <button
                          onClick={() => setExpandedId(expandedId === outfit.id ? null : outfit.id)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <ScoreBadge score={outfit.score} />
                          <span className="text-[11px] text-muted">
                            {expandedId === outfit.id ? "收起详情" : "查看详情"}
                          </span>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="rgba(255,255,255,0.25)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            className={`transition-transform duration-200 ${expandedId === outfit.id ? "rotate-180" : ""}`}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>

                        {/* Expanded: radar chart + evaluation text */}
                        {expandedId === outfit.id && (
                          <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex justify-center mb-3">
                              <RadarChart dims={dims} score={outfit.score} size={120} />
                            </div>
                            {outfit.evaluation && (
                              <div
                                className="eval-card relative rounded-2xl px-4 py-3"
                                style={{
                                  background: "linear-gradient(135deg, rgba(232,160,176,0.06), rgba(212,160,200,0.08))",
                                  border: "1px solid rgba(232,160,176,0.1)",
                                  boxShadow: "0 2px 12px rgba(232,160,176,0.06)",
                                }}
                              >
                                <span
                                  className="absolute -top-2 -left-1 text-2xl leading-none select-none"
                                  style={{ color: "rgba(232,160,176,0.3)" }}
                                >
                                  &ldquo;
                                </span>
                                <p
                                  className="text-[13px] leading-relaxed font-medium text-primary"
                                  dangerouslySetInnerHTML={{ __html: outfit.evaluation }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mb-3">
                      {person && (
                        <button
                          onClick={() => setLightbox(person.imagePath)}
                          className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[rgba(232,160,176,0.5)] transition-all"
                          title={person.name}
                        >
                          <Image src={person.imagePath} alt={person.name} fill className="object-cover" />
                        </button>
                      )}
                      {top && (
                        <button
                          onClick={() => setLightbox(top.imagePath)}
                          className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[rgba(232,160,176,0.5)] transition-all"
                          title={top.name}
                        >
                          <Image src={top.imagePath} alt={top.name} fill className="object-cover" />
                        </button>
                      )}
                      {bottom && (
                        <button
                          onClick={() => setLightbox(bottom.imagePath)}
                          className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[rgba(232,160,176,0.5)] transition-all"
                          title={bottom.name}
                        >
                          <Image src={bottom.imagePath} alt={bottom.name} fill className="object-cover" />
                        </button>
                      )}
                      <div className="flex-1" />
                      <span className="text-[10px] self-center text-muted">
                        {formatDate(outfit.updatedAt)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUnfavorite(outfit.id)}
                        className="flex-1 py-2 min-h-10 rounded-full text-xs font-medium transition-colors"
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
                        className="flex-1 py-2 min-h-10 rounded-full text-xs font-medium text-center transition-colors"
                        style={{
                          background: "rgba(232,160,176,0.08)",
                          color: "#E8A0B0",
                          border: "1px solid rgba(232,160,176,0.12)",
                        }}
                      >
                        下载
                      </a>
                      <button
                        onClick={() => handlePhotoCompare(outfit)}
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(232,160,176,0.08)" }}
                        title="拍照对比"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleScore(outfit.id)}
                        disabled={scoring.has(outfit.id)}
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          background: scoring.has(outfit.id)
                            ? "rgba(232,160,176,0.12)"
                            : "rgba(232,160,176,0.08)",
                        }}
                        title={outfit.score != null ? "再打一次" : "打分"}
                      >
                        {scoring.has(outfit.id) ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
                            <circle cx="12" cy="12" r="10" fill="none" stroke="#E8A0B0" strokeWidth="2" strokeDasharray="31 31" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20V10" />
                            <path d="M18 20V4" />
                            <path d="M6 20v-4" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(outfit.id)}
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                        title="删除"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShareOutfit(outfit)}
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(232,160,176,0.08)" }}
                        title="分享卡片"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handlePublish(outfit.id)}
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: publishedOutfitIds.has(outfit.id)
                            ? "rgba(52,199,89,0.1)"
                            : "rgba(232,160,176,0.08)",
                        }}
                        title={publishedOutfitIds.has(outfit.id) ? "已发布（点击撤回）" : "发布到广场"}
                      >
                        {publishedOutfitIds.has(outfit.id) ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1.5" />
                            <rect x="14" y="3" width="7" height="7" rx="1.5" />
                            <rect x="3" y="14" width="7" height="7" rx="1.5" />
                            <rect x="14" y="14" width="7" height="7" rx="1.5" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {shareOutfit && (
        <ShareCardModal
          isOpen={!!shareOutfit}
          onClose={() => setShareOutfit(null)}
          outfitImage={shareOutfit.resultImagePath}
          score={shareOutfit.score}
          scoreDims={shareOutfit.scoreDims}
          evaluation={shareOutfit.evaluation}
          topItem={getItem(shareOutfit.topItemId) ? { name: getItem(shareOutfit.topItemId)!.name, imagePath: getItem(shareOutfit.topItemId)!.imagePath } : null}
          bottomItem={getItem(shareOutfit.bottomItemId) ? { name: getItem(shareOutfit.bottomItemId)!.name, imagePath: getItem(shareOutfit.bottomItemId)!.imagePath } : null}
        />
      )}

      {comparisonData && (
        <ComparisonModal
          isOpen={!!comparisonData}
          onClose={() => setComparisonData(null)}
          aiImage={comparisonData.aiImage}
          realImage={comparisonData.realImage}
          score={comparisonData.score}
          onPublish={handlePublishComparison}
        />
      )}
    </PageShell>
  );
}
