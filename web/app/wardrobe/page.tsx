"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "../components/ToastProvider";
import { SkeletonCard } from "../components/Skeleton";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/EmptyState";

interface Item {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  color?: string;
  material?: string;
  fit?: string;
  pattern?: string;
  thickness?: string;
  description?: string;
  imagePath: string;
  createdAt: string;
}

const CATEGORIES = [
  { key: "", label: "全部" },
  { key: "TOP", label: "上衣" },
  { key: "BOTTOM", label: "下装" },
  { key: "OUTERWEAR", label: "外套" },
  { key: "ONEPIECE", label: "连体" },
  { key: "SHOES", label: "鞋子" },
  { key: "ACCESSORY", label: "配饰" },
];

const CATEGORY_LABELS: Record<string, string> = {
  TOP: "上衣",
  BOTTOM: "下装",
  OUTERWEAR: "外套",
  ONEPIECE: "连体",
  SHOES: "鞋子",
  ACCESSORY: "配饰",
};

export default function WardrobePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const toast = useToast();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeCategory ? `?category=${activeCategory}` : "";
      const res = await fetch(`/api/items${params}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [activeCategory]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

  const handleDelete = async (id: string) => {
    toast.confirm({
      message: "确定删除这件单品？",
      onConfirm: async () => {
        await fetch(`/api/items/${id}`, { method: "DELETE" });
        fetchItems();
        toast.success("已删除");
      },
    });
  };

  return (
    <PageShell>
      <main className="max-w-6xl mx-auto px-6 pt-8 pb-20 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>WARDROBE</p>
            <h1 className="text-2xl font-light text-primary">我的衣橱</h1>
            <p className="mt-1 text-sm text-secondary">
              {items.length} 件单品
            </p>
          </div>
          <Link
            href={activeCategory ? `/wardrobe/add?category=${activeCategory}` : "/wardrobe/add"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white btn-gradient touch-target"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14m-7-7h14" />
            </svg>
            添加单品
          </Link>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`tab-pill ${
                activeCategory === cat.key ? "tab-pill-active" : "tab-pill-inactive"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#E8A0B0" }}>
                <rect x="3" y="2" width="18" height="20" rx="2" />
                <line x1="12" y1="2" x2="12" y2="22" />
              </svg>
            }
            message="衣橱还是空的，添加你的第一件单品吧"
            actionLabel="添加单品"
            actionHref={activeCategory ? `/wardrobe/add?category=${activeCategory}` : "/wardrobe/add"}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((item, i) => (
              <div
                key={item.id}
                className="group glass rounded-2xl overflow-hidden card-hover cursor-pointer hover:scale-[1.02] transition-transform duration-300 img-hover stagger-item"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative" style={{ aspectRatio: "3/4" }}>
                  <Image
                    src={item.imagePath}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                  {/* Mobile menu button */}
                  <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === item.id ? null : item.id);
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center touch-target"
                      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    {menuOpen === item.id && (
                      <div
                        className="absolute top-12 right-0 rounded-xl overflow-hidden"
                        style={{
                          background: "rgba(20,20,22,0.95)",
                          backdropFilter: "blur(20px)",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          minWidth: 100,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(null);
                            handleDelete(item.id);
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-medium transition-colors hover:bg-white/[0.04]"
                          style={{ color: "#FF3B30" }}
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate text-primary">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full text-accent"
                      style={{ background: "rgba(232,160,176,0.12)" }}
                    >
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    {item.color && (
                      <span className="text-[10px] text-muted">
                        {item.color}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
}
