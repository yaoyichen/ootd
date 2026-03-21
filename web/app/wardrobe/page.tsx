"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "../components/ToastProvider";
import { SkeletonCard } from "../components/Skeleton";

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

  // Close menu on outside click
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
    <div className="relative min-h-screen" style={{ background: "#FFF8F6" }}>
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          top: "-15%", right: "-8%", width: 700, height: 700,
          background: "radial-gradient(circle, rgba(242,124,136,0.12), transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#1D1D1F" }}>我的衣橱</h1>
            <p className="mt-1 text-sm" style={{ color: "#6E6E73" }}>
              {items.length} 件单品
            </p>
          </div>
          <Link
            href={activeCategory ? `/wardrobe/add?category=${activeCategory}` : "/wardrobe/add"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, #F27C88, #FACDD0)",
              boxShadow: "0 4px 16px rgba(242,124,136,0.25)",
            }}
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
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                color: activeCategory === cat.key ? "#fff" : "#6E6E73",
                background:
                  activeCategory === cat.key
                    ? "linear-gradient(135deg, #F27C88, #FACDD0)"
                    : "rgba(0,0,0,0.04)",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(242,124,136,0.06)" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#F27C88" }}>
                <rect x="3" y="2" width="18" height="20" rx="2" />
                <line x1="12" y1="2" x2="12" y2="22" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "#6E6E73" }}>
              衣橱还是空的，添加你的第一件单品吧
            </p>
            <Link
              href={activeCategory ? `/wardrobe/add?category=${activeCategory}` : "/wardrobe/add"}
              className="px-5 py-2 rounded-full text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #F27C88, #FACDD0)" }}
            >
              添加单品
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group glass rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(242,124,136,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.04)";
                }}
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
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    {menuOpen === item.id && (
                      <div
                        className="absolute top-9 right-0 rounded-xl overflow-hidden"
                        style={{
                          background: "rgba(255,255,255,0.95)",
                          backdropFilter: "blur(20px)",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                          border: "1px solid rgba(0,0,0,0.06)",
                          minWidth: 100,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(null);
                            handleDelete(item.id);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-medium transition-colors hover:bg-black/[0.03]"
                          style={{ color: "#FF3B30" }}
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate" style={{ color: "#1D1D1F" }}>
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ color: "#F27C88", background: "rgba(242,124,136,0.08)" }}
                    >
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    {item.color && (
                      <span className="text-[10px]" style={{ color: "#AEAEB2" }}>
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
    </div>
  );
}
