"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useToast } from "../components/ToastProvider";
import { useModalKeyboard } from "../hooks/useModalKeyboard";
import ShareCardModal from "../components/ShareCardModal";
import { PageShell } from "../components/PageShell";

type Status = "idle" | "processing" | "completed" | "failed";

interface ItemData {
  id: string;
  name: string;
  category: string;
  imagePath: string;
}

interface PersonData {
  id: string;
  name: string;
  imagePath: string;
  enhancedImagePath?: string | null;
  isDefault: boolean;
}

interface OutfitData {
  id: string;
  resultImagePath: string;
  isFavorite: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  TOP: "上衣",
  BOTTOM: "下装",
  OUTERWEAR: "外套",
  ONEPIECE: "连体",
  SHOES: "鞋子",
  ACCESSORY: "配饰",
};

function Picker({
  title,
  items,
  selected,
  onSelect,
  onClose,
}: {
  title: string;
  items: { id: string; name: string; imagePath: string; tag?: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  useModalKeyboard({ isOpen: true, onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 rounded-3xl p-6 flex flex-col gap-4 max-h-[80vh]"
        style={{ background: "rgba(20,20,22,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm py-10 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
            还没有可选的呢～
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => { onSelect(item.id); onClose(); }}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  border: selected === item.id ? "2px solid #E8A0B0" : "2px solid transparent",
                  boxShadow: selected === item.id ? "0 0 0 2px rgba(232,160,176,0.2)" : "none",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div className="relative" style={{ aspectRatio: "3/4" }}>
                  <Image src={item.imagePath} alt={item.name} fill className="object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate text-primary">{item.name}</p>
                  {item.tag && (
                    <span className="text-[10px]" style={{ color: "#E8A0B0" }}>{item.tag}</span>
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

function SelectCard({
  label,
  hint,
  selectedImage,
  selectedName,
  onClick,
  ratio = "3/4",
}: {
  label: string;
  hint: string;
  selectedImage: string | null;
  selectedName: string | null;
  onClick: () => void;
  ratio?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-primary">{label}</span>
      <button
        onClick={onClick}
        className="glass relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] card-hover"
        style={{ aspectRatio: ratio }}
      >
        {selectedImage ? (
          <>
            <Image src={selectedImage} alt={label} fill className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent" />
            <span
              className="absolute bottom-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full text-white"
              style={{ background: "rgba(232,160,176,0.7)" }}
            >
              {selectedName}
            </span>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14m-7-7h14" />
              </svg>
            </div>
            <p className="text-xs text-muted">{hint}</p>
          </div>
        )}
      </button>
    </div>
  );
}

export default function TryonPage() {
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedTop, setSelectedTop] = useState<string | null>(null);
  const [selectedBottom, setSelectedBottom] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<"person" | "top" | "bottom" | null>(null);
  const [outfitId, setOutfitId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [publishedToShowcase, setPublishedToShowcase] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/persons").then((r) => r.json()).then((data) => {
      if (!Array.isArray(data)) return;
      setPersons(data);
      const def = data.find((p: PersonData) => p.isDefault);
      if (def) setSelectedPerson(def.id);
    });
    fetch("/api/items").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setItems(data);
    });
  }, []);

  const checkCache = useCallback(async (personId: string | null, topId: string | null, bottomId: string | null) => {
    if (!personId || (!topId && !bottomId)) {
      setResultImage(null);
      setOutfitId(null);
      setIsFavorite(false);
      setIsCached(false);
      setStatus("idle");
      return;
    }

    try {
      const params = new URLSearchParams({ personImageId: personId });
      if (topId) params.set("topItemId", topId);
      if (bottomId) params.set("bottomItemId", bottomId);

      const res = await fetch(`/api/outfits?${params}`);
      const data: OutfitData | null = await res.json();

      if (data?.resultImagePath) {
        setResultImage(data.resultImagePath);
        setOutfitId(data.id);
        setIsFavorite(data.isFavorite);
        setIsCached(true);
        setStatus("completed");
      } else {
        setResultImage(null);
        setOutfitId(null);
        setIsFavorite(false);
        setIsCached(false);
        setStatus("idle");
      }
    } catch {
      setIsCached(false);
    }
  }, []);

  useEffect(() => {
    checkCache(selectedPerson, selectedTop, selectedBottom);
  }, [selectedPerson, selectedTop, selectedBottom, checkCache]);

  const getPerson = (id: string | null) => persons.find((p) => p.id === id);
  const getItem = (id: string | null) => items.find((i) => i.id === id);

  const topItems = items.filter((i) => i.category === "TOP" || i.category === "OUTERWEAR");
  const bottomItems = items.filter((i) => i.category === "BOTTOM" || i.category === "ONEPIECE");

  const handleGenerate = useCallback(async () => {
    const person = getPerson(selectedPerson);
    const top = getItem(selectedTop);
    const bottom = getItem(selectedBottom);

    if (!person || (!top && !bottom)) return;

    setStatus("processing");
    setError(null);
    setResultImage(null);
    setIsCached(false);
    setScore(null);
    setEvaluation(null);
    setPublishedToShowcase(false);

    try {
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_image: person.enhancedImagePath || person.imagePath,
          top_garment_image: top?.imagePath || null,
          bottom_garment_image: bottom?.imagePath || null,
          personImageId: person.id,
          topItemId: top?.id || null,
          bottomItemId: bottom?.id || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus("failed");
        setError(data.error || "生成失败了，再试一次？");
        return;
      }

      setResultImage(data.image_url);
      setOutfitId(data.outfit_id);
      setIsFavorite(data.isFavorite ?? false);
      setStatus("completed");

      // Auto-trigger scoring after try-on completes
      if (data.outfit_id && !data.isCached) {
        triggerEvaluate(data.outfit_id);
      }
    } catch {
      setStatus("failed");
      setError("网络开小差了，再试一次？");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPerson, selectedTop, selectedBottom, persons, items]);

  const handleToggleFavorite = async () => {
    if (!outfitId) return;
    const newVal = !isFavorite;
    setIsFavorite(newVal);

    try {
      await fetch(`/api/outfits/${outfitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newVal }),
      });
      toast.success(newVal ? "已收藏" : "已取消收藏");
    } catch {
      setIsFavorite(!newVal);
    }
  };

  const handleRegenerate = () => {
    setIsCached(false);
    setScore(null);
    setEvaluation(null);
    handleGenerate();
  };

  const triggerEvaluate = async (id: string) => {
    setScoring(true);
    try {
      const res = await fetch(`/api/outfits/${id}/evaluate`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.score !== undefined) {
        setScore(data.score);
        setEvaluation(data.evaluation || null);
      }
    } catch (err) {
      console.error("Auto evaluate error:", err);
    } finally {
      setScoring(false);
    }
  };

  const handleEvaluate = async () => {
    if (!outfitId || scoring) return;
    setScoring(true);
    try {
      const res = await fetch(`/api/outfits/${outfitId}/evaluate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Evaluate API error:", data);
        setError(data.error || "评分请求失败");
        return;
      }
      if (data.score !== undefined) {
        setScore(data.score);
        setEvaluation(data.evaluation || null);
      }
    } catch (err) {
      console.error("Evaluate fetch error:", err);
      setError("评分请求失败，请重试");
    } finally {
      setScoring(false);
    }
  };

  const handlePublishToShowcase = async () => {
    if (!outfitId) return;
    if (publishedToShowcase) {
      try {
        const res = await fetch(`/api/showcase?limit=50`);
        const posts = await res.json();
        const post = posts.find((p: { outfitId: string }) => p.outfitId === outfitId);
        if (post) {
          await fetch(`/api/showcase/${post.id}`, { method: "DELETE" });
          setPublishedToShowcase(false);
          toast.success("已从广场撤回");
        }
      } catch { toast.error("撤回失败"); }
    } else {
      try {
        const res = await fetch("/api/showcase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outfitId }),
        });
        if (res.ok) {
          setPublishedToShowcase(true);
          toast.success("已发布到广场");
        } else {
          const data = await res.json();
          toast.error(data.error || "发布失败");
        }
      } catch { toast.error("发布失败"); }
    }
  };

  const isProcessing = status === "processing";
  const hasGarment = !!selectedTop || !!selectedBottom;
  const canGenerate = !!selectedPerson && hasGarment && !isProcessing;

  const personData = getPerson(selectedPerson);
  const topData = getItem(selectedTop);
  const bottomData = getItem(selectedBottom);

  return (
    <PageShell>

      {picker === "person" && (
        <Picker
          title="选择人像"
          items={persons.map((p) => ({
            id: p.id, name: p.name, imagePath: p.imagePath,
            tag: p.isDefault ? "默认" : undefined,
          }))}
          selected={selectedPerson}
          onSelect={setSelectedPerson}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "top" && (
        <Picker
          title="选择上衣"
          items={topItems.map((i) => ({
            id: i.id, name: i.name, imagePath: i.imagePath,
            tag: CATEGORY_LABELS[i.category],
          }))}
          selected={selectedTop}
          onSelect={setSelectedTop}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "bottom" && (
        <Picker
          title="选择下装"
          items={bottomItems.map((i) => ({
            id: i.id, name: i.name, imagePath: i.imagePath,
            tag: CATEGORY_LABELS[i.category],
          }))}
          selected={selectedBottom}
          onSelect={setSelectedBottom}
          onClose={() => setPicker(null)}
        />
      )}

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-20">
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>TRY IT ON</p>
          <h1 className="text-2xl font-light text-primary">
            魔法试衣间
          </h1>
          <p className="mt-2 text-sm text-secondary">
            选好衣服和照片，看看穿上什么效果 ✦
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.6fr_1.4fr] gap-6 items-start">
          {/* Column 1: Person */}
          <div className="flex flex-col gap-3">
            <SelectCard
              label="照片"
              hint="选一张照片"
              selectedImage={personData?.imagePath ?? null}
              selectedName={personData?.name ?? null}
              onClick={() => setPicker("person")}
            />
          </div>

          {/* Column 2: Top + Bottom stacked */}
          <div className="flex flex-col gap-3">
            <SelectCard
              label="上衣"
              hint="从衣橱选择"
              selectedImage={topData?.imagePath ?? null}
              selectedName={topData?.name ?? null}
              onClick={() => setPicker("top")}
              ratio="1/1"
            />
            <SelectCard
              label="下装"
              hint="从衣橱选择"
              selectedImage={bottomData?.imagePath ?? null}
              selectedName={bottomData?.name ?? null}
              onClick={() => setPicker("bottom")}
              ratio="1/1"
            />

            {isCached && status === "completed" ? (
              <div className="flex gap-3">
                <div
                  className="flex-1 py-3 rounded-full text-sm font-medium text-center"
                  style={{
                    background: "rgba(232,160,176,0.12)",
                    color: "#E8A0B0",
                    border: "1px solid rgba(232,160,176,0.15)",
                  }}
                >
                  这套搭配试过啦
                </div>
                <button
                  onClick={handleRegenerate}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-full text-sm font-semibold text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)",
                    boxShadow: "0 4px 16px rgba(232,160,176,0.25)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(232,160,176,0.35)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(232,160,176,0.25)"; }}
                >
                  再来一次
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="btn-gradient w-full py-4 rounded-full text-sm font-semibold tracking-wide"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
                    </svg>
                    魔法生成中，稍等一下下…
                  </span>
                ) : (
                  "开始试穿 ✦"
                )}
              </button>
            )}

            {error && (
              <div
                className="p-3.5 rounded-2xl text-sm font-medium"
                style={{
                  background: "rgba(255, 59, 48, 0.1)",
                  border: "1px solid rgba(255, 59, 48, 0.15)",
                  color: "#FF3B30",
                }}
              >
                {error}
              </div>
            )}

            {!persons.length && (
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  还没有照片呢，先去
                  <a href="/persons" className="font-semibold" style={{ color: "#E8A0B0" }}> 上传一张 </a>
                  上传
                </p>
              </div>
            )}
            {!items.length && (
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  衣橱空空的，先去
                  <a href="/wardrobe/add" className="font-semibold" style={{ color: "#E8A0B0" }}> 添几件衣服 </a>
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-primary">效果预览</span>
            <div
              className="glass relative rounded-3xl overflow-hidden flex items-center justify-center"
              style={{ aspectRatio: "3/4" }}
            >
              {resultImage ? (
                <div className="absolute inset-0 animate-fade-in-up">
                  <Image src={resultImage} alt="试穿效果" fill className="object-cover" unoptimized />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

                  {isCached && (
                    <div
                      className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-medium"
                      style={{ background: "rgba(0,0,0,0.5)", color: "#fff", backdropFilter: "blur(8px)" }}
                    >
                      已缓存
                    </div>
                  )}

                  <div className="absolute bottom-4 inset-x-4 flex gap-2.5 justify-end items-center">
                    <button
                      onClick={handleToggleFavorite}
                      className="w-11 h-11 rounded-full flex items-center justify-center transition-all touch-target"
                      style={{
                        background: isFavorite ? "rgba(255,59,48,0.9)" : "rgba(255,255,255,0.2)",
                        backdropFilter: "blur(12px)",
                        boxShadow: isFavorite ? "0 4px 12px rgba(255,59,48,0.3)" : "none",
                      }}
                      title={isFavorite ? "取消收藏" : "收藏"}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? "white" : "none"} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>

                    <a
                      href={resultImage}
                      download="ootd-tryon.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2 rounded-full text-xs font-semibold text-white transition-all"
                      style={{
                        background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)",
                        boxShadow: "0 4px 16px rgba(232,160,176,0.3)",
                      }}
                    >
                      下载图片
                    </a>

                    <button
                      onClick={() => setShowShare(true)}
                      className="w-11 h-11 rounded-full flex items-center justify-center transition-all touch-target"
                      style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(12px)" }}
                      title="分享卡片"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                    </button>

                    {outfitId && (
                      <button
                        onClick={handlePublishToShowcase}
                        className="w-11 h-11 rounded-full flex items-center justify-center transition-all touch-target"
                        style={{
                          background: publishedToShowcase ? "rgba(52,199,89,0.5)" : "rgba(255,255,255,0.2)",
                          backdropFilter: "blur(12px)",
                        }}
                        title={publishedToShowcase ? "已发布（点击撤回）" : "发布到广场"}
                      >
                        {publishedToShowcase ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1.5" />
                            <rect x="14" y="3" width="7" height="7" rx="1.5" />
                            <rect x="3" y="14" width="7" height="7" rx="1.5" />
                            <rect x="14" y="14" width="7" height="7" rx="1.5" />
                          </svg>
                        )}
                      </button>
                    )}

                    {!isCached && (
                      <button
                        onClick={handleRegenerate}
                        className="px-5 py-2 rounded-full text-xs font-semibold text-white transition-colors"
                        style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(12px)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
                      >
                        再来一次
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5">
                  {isProcessing ? (
                    <>
                      <div className="relative w-12 h-12 animate-pulse-glow rounded-full">
                        <svg className="w-12 h-12" viewBox="0 0 48 48" style={{ animation: "spin 1s linear infinite" }}>
                          <defs>
                            <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#E8A0B0" />
                              <stop offset="100%" stopColor="#D4A0C8" />
                            </linearGradient>
                          </defs>
                          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(232,160,176,0.12)" strokeWidth="3" />
                          <circle cx="24" cy="24" r="20" fill="none" stroke="url(#sg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="90 126" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                        施展魔法中…
                      </p>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-16 h-16 rounded-3xl flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="1" strokeLinecap="round" style={{ stroke: "#E8A0B0" }}>
                          <rect x="3" y="3" width="18" height="18" rx="4" />
                          <circle cx="12" cy="9" r="3" />
                          <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>穿搭效果会出现在这里</p>
                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>选好照片和衣服就可以开始啦</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* AI Scoring section */}
            {status === "completed" && outfitId && (
              <div className="glass rounded-2xl p-4">
                {score !== null ? (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="relative inline-flex items-center justify-center" style={{ width: 56, height: 56 }}>
                        <svg width={56} height={56} className="-rotate-90">
                          <circle cx={28} cy={28} r={24} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
                          <circle
                            cx={28} cy={28} r={24} fill="none"
                            stroke={score >= 80 ? "#34C759" : score >= 60 ? "#E8A0B0" : "#FF3B30"}
                            strokeWidth={4} strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 24}
                            strokeDashoffset={2 * Math.PI * 24 * (1 - score / 100)}
                            style={{ transition: "stroke-dashoffset 0.8s ease" }}
                          />
                        </svg>
                        <span
                          className="absolute text-sm font-bold"
                          style={{ color: score >= 80 ? "#34C759" : score >= 60 ? "#E8A0B0" : "#FF3B30" }}
                        >
                          {score}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold mb-1 text-primary">穿搭评分</p>
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }} dangerouslySetInnerHTML={{ __html: evaluation! }} />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleEvaluate}
                    disabled={scoring}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      color: "#E8A0B0",
                      background: "rgba(232,160,176,0.06)",
                    }}
                  >
                    {scoring ? (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                          <circle cx="12" cy="12" r="10" stroke="rgba(232,160,176,0.2)" strokeWidth="2.5" fill="none" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="#E8A0B0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        </svg>
                        打分中...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
                        </svg>
                        查看评分
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {showShare && resultImage && (
        <ShareCardModal
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          outfitImage={resultImage}
          score={score}
          evaluation={evaluation}
          topItem={topData ? { name: topData.name, imagePath: topData.imagePath } : null}
          bottomItem={bottomData ? { name: bottomData.name, imagePath: bottomData.imagePath } : null}
        />
      )}
    </PageShell>
  );
}
