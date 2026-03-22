"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useToast } from "../components/ToastProvider";
import { useModalKeyboard } from "../hooks/useModalKeyboard";
import { PageShell } from "../components/PageShell";
import { PersonPickerModal } from "../components/PersonPickerModal";

type SortMode = "newest" | "hottest" | "random";

interface ShowcaseItem {
  id: string;
  name: string;
  imagePath: string;
  category: string;
  color?: string | null;
  style?: string | null;
  season?: string | null;
  material?: string | null;
}

interface ShowcasePost {
  id: string;
  outfitId: string;
  caption: string | null;
  likes: number;
  tryonCount: number;
  createdAt: string;
  realPhotoPath?: string | null;
  outfit: {
    resultImagePath: string;
    score: number | null;
    scoreDims: string | null;
    evaluation: string | null;
  };
  topItem: ShowcaseItem | null;
  bottomItem: ShowcaseItem | null;
}

interface PersonData {
  id: string;
  name: string;
  imagePath: string;
  enhancedImagePath?: string | null;
  isDefault: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  TOP: "上衣",
  BOTTOM: "下装",
  OUTERWEAR: "外套",
  ONEPIECE: "连体",
  SHOES: "鞋子",
  ACCESSORY: "配饰",
};

const SORT_TABS: { key: SortMode; label: string }[] = [
  { key: "newest", label: "最新" },
  { key: "hottest", label: "最火" },
  { key: "random", label: "随便逛逛" },
];

export default function ShowcasePage() {
  const [posts, setPosts] = useState<ShowcasePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("newest");
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [selectedPostForTryon, setSelectedPostForTryon] = useState<ShowcasePost | null>(null);
  const [tryonLoading, setTryonLoading] = useState(false);
  const [tryonResult, setTryonResult] = useState<{
    imagePath: string;
    outfitId: string;
    isFavorite: boolean;
    score: number | null;
    evaluation: string | null;
    scoring: boolean;
    sourcePost: ShowcasePost;
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<ShowcaseItem | null>(null);
  const [selectedItemPostId, setSelectedItemPostId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [copyingItem, setCopyingItem] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());
  const toast = useToast();

  useModalKeyboard({ isOpen: !!tryonResult, onClose: () => setTryonResult(null) });
  useModalKeyboard({ isOpen: !!selectedItem, onClose: () => setSelectedItem(null) });

  const fetchPosts = useCallback(async (s: SortMode) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/showcase?sort=${s}&limit=30`);
      const data = await res.json();
      if (Array.isArray(data)) setPosts(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(sort); }, [sort, fetchPosts]);

  useEffect(() => {
    fetch("/api/persons").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setPersons(data);
    });
  }, []);

  const handleLike = async (postId: string) => {
    setLikedIds((prev) => new Set(prev).add(postId));
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
    try {
      await fetch(`/api/showcase/${postId}/like`, { method: "POST" });
    } catch {
      // revert
      setLikedIds((prev) => { const s = new Set(prev); s.delete(postId); return s; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes: p.likes - 1 } : p));
    }
  };

  const handleTryon = async (personId: string) => {
    if (!selectedPostForTryon) return;
    const post = selectedPostForTryon;
    setSelectedPostForTryon(null);
    setTryonLoading(true);
    try {
      const person = persons.find((p) => p.id === personId);
      if (!person) { toast.error("人像不存在"); return; }

      // Use the same /api/tryon endpoint as the tryon page
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_image: person.enhancedImagePath || person.imagePath,
          top_garment_image: post.topItem?.imagePath || null,
          bottom_garment_image: post.bottomItem?.imagePath || null,
          personImageId: personId,
          topItemId: post.topItem?.id || null,
          bottomItemId: post.bottomItem?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "试穿失败");
        return;
      }
      setTryonResult({
        imagePath: data.image_url,
        outfitId: data.outfit_id,
        isFavorite: data.isFavorite ?? true,
        score: null,
        evaluation: null,
        scoring: true,
        sourcePost: post,
      });
      // Update tryonCount
      setPosts((prev) => prev.map((p) =>
        p.id === post.id ? { ...p, tryonCount: p.tryonCount + 1 } : p
      ));
      // Increment tryonCount on server
      fetch(`/api/showcase/${post.id}/tryon`, { method: "POST" }).catch(() => {});

      // Auto-trigger AI scoring
      if (data.outfit_id) {
        triggerEvaluate(data.outfit_id);
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setTryonLoading(false);
    }
  };

  const triggerEvaluate = async (outfitId: string) => {
    try {
      const res = await fetch(`/api/outfits/${outfitId}/evaluate`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.score !== undefined) {
        setTryonResult((prev) => prev && prev.outfitId === outfitId
          ? { ...prev, score: data.score, evaluation: data.evaluation || null, scoring: false }
          : prev
        );
      } else {
        setTryonResult((prev) => prev ? { ...prev, scoring: false } : prev);
      }
    } catch {
      setTryonResult((prev) => prev ? { ...prev, scoring: false } : prev);
    }
  };

  const handleTryonFavorite = async () => {
    if (!tryonResult) return;
    const newVal = !tryonResult.isFavorite;
    setTryonResult((prev) => prev ? { ...prev, isFavorite: newVal } : prev);
    try {
      await fetch(`/api/outfits/${tryonResult.outfitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newVal }),
      });
      toast.success(newVal ? "已收藏" : "已取消收藏");
    } catch {
      setTryonResult((prev) => prev ? { ...prev, isFavorite: !newVal } : prev);
    }
  };

  const handleAddItemFromResult = async (item: ShowcaseItem, postId: string) => {
    if (addedItemIds.has(item.id)) return;
    try {
      const res = await fetch(`/api/showcase/${postId}/copy-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (res.ok) {
        setAddedItemIds((prev) => new Set(prev).add(item.id));
        toast.success(`"${item.name}" 已加入衣橱`);
      } else {
        const data = await res.json();
        toast.error(data.error || "添加失败");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  const handleCopyItem = async (itemId: string, postId: string) => {
    setCopyingItem(true);
    try {
      const res = await fetch(`/api/showcase/${postId}/copy-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "添加失败");
        return;
      }
      toast.success("已加入衣橱");
      setSelectedItem(null);
    } catch {
      toast.error("网络错误");
    } finally {
      setCopyingItem(false);
    }
  };

  return (
    <PageShell>

      {/* Person Picker Modal */}
      {selectedPostForTryon && (
        <PersonPickerModal
          persons={persons}
          selected={null}
          onSelect={(id) => handleTryon(id)}
          onClose={() => setSelectedPostForTryon(null)}
        />
      )}

      {/* Tryon Result Modal */}
      {tryonResult && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setTryonResult(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden max-h-[92vh] overflow-y-auto"
            style={{ background: "rgba(20,20,22,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative" style={{ aspectRatio: "3/4" }}>
              <Image
                src={tryonResult.imagePath}
                alt="试穿效果"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
              <button
                onClick={() => setTryonResult(null)}
                className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>

              {/* Bottom overlay actions */}
              <div className="absolute bottom-4 inset-x-4 flex gap-2.5 justify-end items-center">
                <button
                  onClick={handleTryonFavorite}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: tryonResult.isFavorite ? "rgba(255,59,48,0.9)" : "rgba(255,255,255,0.2)",
                    backdropFilter: "blur(12px)",
                    boxShadow: tryonResult.isFavorite ? "0 4px 12px rgba(255,59,48,0.3)" : "none",
                  }}
                  title={tryonResult.isFavorite ? "取消收藏" : "收藏"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={tryonResult.isFavorite ? "white" : "none"} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
                <a
                  href={tryonResult.imagePath}
                  download="ootd-showcase-tryon.png"
                  className="px-5 py-2 rounded-full text-xs font-semibold text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)",
                    boxShadow: "0 4px 16px rgba(232,160,176,0.3)",
                  }}
                >
                  下载图片
                </a>
              </div>
            </div>

            {/* Info section below image */}
            <div className="p-5 space-y-4">
              {/* AI Score */}
              <div className="glass rounded-2xl p-4">
                {tryonResult.scoring ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                      <circle cx="12" cy="12" r="10" stroke="rgba(232,160,176,0.2)" strokeWidth="2.5" fill="none" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="#E8A0B0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </svg>
                    <span className="text-sm font-medium text-accent">打分中...</span>
                  </div>
                ) : tryonResult.score !== null ? (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="relative inline-flex items-center justify-center" style={{ width: 56, height: 56 }}>
                        <svg width={56} height={56} className="-rotate-90">
                          <circle cx={28} cy={28} r={24} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
                          <circle
                            cx={28} cy={28} r={24} fill="none"
                            stroke={tryonResult.score >= 80 ? "#34C759" : tryonResult.score >= 60 ? "#E8A0B0" : "#FF3B30"}
                            strokeWidth={4} strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 24}
                            strokeDashoffset={2 * Math.PI * 24 * (1 - tryonResult.score / 100)}
                            style={{ transition: "stroke-dashoffset 0.8s ease" }}
                          />
                        </svg>
                        <span
                          className="absolute text-sm font-bold"
                          style={{ color: tryonResult.score >= 80 ? "#34C759" : tryonResult.score >= 60 ? "#E8A0B0" : "#FF3B30" }}
                        >
                          {tryonResult.score}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold mb-1 text-primary">穿搭评分</p>
                      {tryonResult.evaluation && (
                        <p className="text-xs leading-relaxed text-secondary" dangerouslySetInnerHTML={{ __html: tryonResult.evaluation }} />
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => triggerEvaluate(tryonResult.outfitId)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors text-accent"
                    style={{ background: "rgba(232,160,176,0.06)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
                    </svg>
                    查看评分
                  </button>
                )}
              </div>

              {/* Items - add to wardrobe */}
              <div>
                <p className="text-xs font-semibold mb-2.5 text-primary">同款单品</p>
                <div className="flex flex-col gap-2">
                  {tryonResult.sourcePost.topItem && (
                    <div
                      className="flex items-center gap-3 p-2.5 rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                        <Image src={tryonResult.sourcePost.topItem.imagePath} alt={tryonResult.sourcePost.topItem.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-primary">{tryonResult.sourcePost.topItem.name}</p>
                        <p className="text-[10px] text-muted">{CATEGORY_LABELS[tryonResult.sourcePost.topItem.category] || tryonResult.sourcePost.topItem.category}</p>
                      </div>
                      <button
                        onClick={() => handleAddItemFromResult(tryonResult.sourcePost.topItem!, tryonResult.sourcePost.id)}
                        disabled={addedItemIds.has(tryonResult.sourcePost.topItem.id)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex-shrink-0"
                        style={{
                          background: addedItemIds.has(tryonResult.sourcePost.topItem.id)
                            ? "rgba(52,199,89,0.1)"
                            : "linear-gradient(135deg, #E8A0B0, #D4A0C8)",
                          color: addedItemIds.has(tryonResult.sourcePost.topItem.id) ? "#34C759" : "#fff",
                        }}
                      >
                        {addedItemIds.has(tryonResult.sourcePost.topItem.id) ? "已收" : "收了"}
                      </button>
                    </div>
                  )}
                  {tryonResult.sourcePost.bottomItem && (
                    <div
                      className="flex items-center gap-3 p-2.5 rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                        <Image src={tryonResult.sourcePost.bottomItem.imagePath} alt={tryonResult.sourcePost.bottomItem.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-primary">{tryonResult.sourcePost.bottomItem.name}</p>
                        <p className="text-[10px] text-muted">{CATEGORY_LABELS[tryonResult.sourcePost.bottomItem.category] || tryonResult.sourcePost.bottomItem.category}</p>
                      </div>
                      <button
                        onClick={() => handleAddItemFromResult(tryonResult.sourcePost.bottomItem!, tryonResult.sourcePost.id)}
                        disabled={addedItemIds.has(tryonResult.sourcePost.bottomItem.id)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex-shrink-0"
                        style={{
                          background: addedItemIds.has(tryonResult.sourcePost.bottomItem.id)
                            ? "rgba(52,199,89,0.1)"
                            : "linear-gradient(135deg, #E8A0B0, #D4A0C8)",
                          color: addedItemIds.has(tryonResult.sourcePost.bottomItem.id) ? "#34C759" : "#fff",
                        }}
                      >
                        {addedItemIds.has(tryonResult.sourcePost.bottomItem.id) ? "已收" : "收了"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden"
            style={{ background: "rgba(20,20,22,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative" style={{ aspectRatio: "1" }}>
              <Image src={selectedItem.imagePath} alt={selectedItem.name} fill className="object-cover" />
            </div>
            <div className="p-5">
              <h3 className="text-base font-bold mb-3 text-primary">{selectedItem.name}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedItem.category && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full text-accent" style={{ background: "rgba(232,160,176,0.08)" }}>
                    {CATEGORY_LABELS[selectedItem.category] || selectedItem.category}
                  </span>
                )}
                {selectedItem.color && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full text-secondary" style={{ background: "rgba(255,255,255,0.04)" }}>
                    {selectedItem.color}
                  </span>
                )}
                {selectedItem.style && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full text-secondary" style={{ background: "rgba(255,255,255,0.04)" }}>
                    {selectedItem.style}
                  </span>
                )}
                {selectedItem.season && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full text-secondary" style={{ background: "rgba(255,255,255,0.04)" }}>
                    {selectedItem.season}
                  </span>
                )}
                {selectedItem.material && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full text-secondary" style={{ background: "rgba(255,255,255,0.04)" }}>
                    {selectedItem.material}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => selectedItemPostId && handleCopyItem(selectedItem.id, selectedItemPostId)}
                  disabled={copyingItem}
                  className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-all"
                  style={{
                    background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)",
                    boxShadow: "0 4px 16px rgba(232,160,176,0.25)",
                    opacity: copyingItem ? 0.7 : 1,
                  }}
                >
                  {copyingItem ? "添加中..." : "收进我的衣橱"}
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-3 rounded-full text-sm font-medium text-secondary"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tryon Loading Overlay */}
      {tryonLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="glass rounded-3xl p-8 flex flex-col items-center gap-4">
            <svg className="w-12 h-12" viewBox="0 0 48 48" style={{ animation: "spin 1s linear infinite" }}>
              <defs>
                <linearGradient id="scg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E8A0B0" />
                  <stop offset="100%" stopColor="#D4A0C8" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(232,160,176,0.12)" strokeWidth="3" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="url(#scg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="90 126" />
            </svg>
            <p className="text-sm font-medium text-primary">魔法生成中...</p>
            <p className="text-xs text-muted">大概需要半分钟</p>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-24">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>EXPLORE</p>
          <h1 className="text-2xl font-light text-primary">
            <span className="gradient-text">穿搭灵感</span>
          </h1>
          <p className="mt-2 text-sm text-secondary">
            看看大家都在穿什么 ✦
          </p>
        </div>

        {/* Sort Tabs */}
        <div className="flex justify-center gap-2 mb-6">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSort(tab.key)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
              style={{
                background: sort === tab.key
                  ? "linear-gradient(135deg, rgba(200,120,140,0.9), rgba(180,140,200,0.9))"
                  : "rgba(255,255,255,0.03)",
                color: sort === tab.key ? "#fff" : "rgba(255,255,255,0.4)",
                boxShadow: sort === tab.key ? "0 2px 12px rgba(232,160,176,0.3)" : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid rounded-3xl overflow-hidden animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div style={{ aspectRatio: "3/4" }} />
                <div className="p-4 space-y-2">
                  <div className="h-3 rounded-full w-2/3" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="h-3 rounded-full w-1/3" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <div
              className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: "rgba(232,160,176,0.08)" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <p className="text-base font-medium text-primary">这里还空空的～</p>
            <p className="text-sm mt-2 text-muted">
              去
              <a href="/favorites" className="font-semibold text-accent"> 收藏页 </a>
              发布你的第一个穿搭吧
            </p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {posts.map((post) => (
              <ShowcaseCard
                key={post.id}
                post={post}
                liked={likedIds.has(post.id)}
                onLike={() => handleLike(post.id)}
                onTryon={() => setSelectedPostForTryon(post)}
                onItemClick={(item) => { setSelectedItem(item); setSelectedItemPostId(post.id); }}
              />
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
}

function ShowcaseCard({
  post,
  liked,
  onLike,
  onTryon,
  onItemClick,
}: {
  post: ShowcasePost;
  liked: boolean;
  onLike: () => void;
  onTryon: () => void;
  onItemClick: (item: ShowcaseItem) => void;
}) {
  return (
    <div
      className="break-inside-avoid glass rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Result image */}
      <div className="relative" style={{ aspectRatio: "3/4" }}>
        <Image
          src={post.outfit.resultImagePath}
          alt="穿搭效果"
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Score badge */}
        {post.outfit.score != null && (
          <div
            className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-bold"
            style={{
              background: post.outfit.score >= 80
                ? "rgba(52,199,89,0.85)"
                : post.outfit.score >= 60
                  ? "rgba(232,160,176,0.85)"
                  : "rgba(255,59,48,0.85)",
              color: "#fff",
              backdropFilter: "blur(8px)",
            }}
          >
            {post.outfit.score}分
          </div>
        )}

        {/* Real photo badge */}
        {post.realPhotoPath && (
          <div
            className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold"
            style={{
              background: "rgba(52,199,89,0.85)",
              color: "#fff",
              backdropFilter: "blur(8px)",
            }}
          >
            真实穿搭
          </div>
        )}
      </div>

      <div className="p-3">
        {/* Caption */}
        {post.caption && (
          <p className="text-xs mb-2 leading-relaxed text-primary">
            {post.caption}
          </p>
        )}

        {/* Item thumbnails */}
        <div className="flex gap-1.5 mb-3">
          {post.topItem && (
            <button
              onClick={() => onItemClick(post.topItem!)}
              className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-[rgba(232,160,176,0.5)] transition-all"
              title={post.topItem.name}
            >
              <Image src={post.topItem.imagePath} alt={post.topItem.name} fill className="object-cover" />
            </button>
          )}
          {post.bottomItem && (
            <button
              onClick={() => onItemClick(post.bottomItem!)}
              className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-[rgba(232,160,176,0.5)] transition-all"
              title={post.bottomItem.name}
            >
              <Image src={post.bottomItem.imagePath} alt={post.bottomItem.name} fill className="object-cover" />
            </button>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLike}
            disabled={liked}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all"
            style={{
              background: liked ? "rgba(255,59,48,0.15)" : "rgba(255,255,255,0.03)",
              color: liked ? "#FF3B30" : "rgba(255,255,255,0.25)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={liked ? "#FF3B30" : "none"} stroke={liked ? "#FF3B30" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {post.likes}
          </button>

          <span className="text-[11px] text-muted">
            {post.tryonCount}次试穿
          </span>

          <div className="flex-1" />

          <button
            onClick={onTryon}
            className="px-4 py-2 rounded-full text-[11px] font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)",
              boxShadow: "0 2px 8px rgba(232,160,176,0.25)",
            }}
          >
            我也试试
          </button>
        </div>
      </div>
    </div>
  );
}
