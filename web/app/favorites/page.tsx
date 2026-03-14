"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface OutfitRecord {
  id: string;
  personImageId: string;
  topItemId: string | null;
  bottomItemId: string | null;
  resultImagePath: string;
  isFavorite: boolean;
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative min-h-screen" style={{ background: "#FEFCF8" }}>
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          top: "-15%", right: "-8%", width: 700, height: 700,
          background: "radial-gradient(circle, rgba(255,149,0,0.18), transparent 70%)",
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
                background: "linear-gradient(135deg, #FF9500, #FFCC00)",
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
                  <stop offset="0%" stopColor="#FF9500" />
                  <stop offset="100%" stopColor="#FFCC00" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,149,0,0.12)" strokeWidth="3" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="url(#fsg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="90 126" />
            </svg>
          </div>
        ) : outfits.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <div
              className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: "rgba(255,149,0,0.08)" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <p className="text-base font-medium" style={{ color: "#1D1D1F" }}>还没有收藏的穿搭</p>
            <p className="text-sm mt-2" style={{ color: "#AEAEB2" }}>
              前往
              <a href="/tryon" className="font-semibold" style={{ color: "#FF9500" }}> 试穿 </a>
              生成穿搭并点击收藏
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map((outfit) => {
              const person = getPerson(outfit.personImageId);
              const top = getItem(outfit.topItemId);
              const bottom = getItem(outfit.bottomItemId);

              return (
                <div
                  key={outfit.id}
                  className="glass rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                  style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,149,0,0.1)";
                    e.currentTarget.style.borderColor = "rgba(255,149,0,0.15)";
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
                    <div className="flex gap-2 mb-3">
                      {person && (
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" title={person.name}>
                          <Image src={person.imagePath} alt={person.name} fill className="object-cover" />
                        </div>
                      )}
                      {top && (
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" title={top.name}>
                          <Image src={top.imagePath} alt={top.name} fill className="object-cover" />
                        </div>
                      )}
                      {bottom && (
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" title={bottom.name}>
                          <Image src={bottom.imagePath} alt={bottom.name} fill className="object-cover" />
                        </div>
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
                          background: "rgba(255,149,0,0.08)",
                          color: "#FF9500",
                          border: "1px solid rgba(255,149,0,0.12)",
                        }}
                      >
                        下载
                      </a>
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
