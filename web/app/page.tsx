"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ScoreBadge } from "./components/ScoreBadge";

interface RecentOutfit {
  id: string;
  imagePath: string;
  score: number | null;
}

interface ShowcasePost {
  id: string;
  outfitImagePath: string;
  authorName: string;
  score: number | null;
  likesCount: number;
}

export default function Home() {
  const [recentOutfits, setRecentOutfits] = useState<RecentOutfit[]>([]);
  const [showcasePosts, setShowcasePosts] = useState<ShowcasePost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/outfits?favorites=true&limit=5")
        .then((r) => r.json())
        .then((data) => setRecentOutfits(Array.isArray(data) ? data.slice(0, 5) : []))
        .catch(() => {}),
      fetch("/api/showcase?limit=6")
        .then((r) => r.json())
        .then((data) => setShowcasePosts(Array.isArray(data) ? data.slice(0, 6) : []))
        .catch(() => {}),
    ]).finally(() => setLoaded(true));
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden">
      {/* ── Hero Section ─────────────────────── */}
      <section className="relative h-[85vh] min-h-[600px] flex flex-col justify-end">
        {/* Background editorial gradient */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200,120,140,0.15), transparent),
                radial-gradient(ellipse 60% 40% at 80% 20%, rgba(180,140,200,0.08), transparent),
                radial-gradient(ellipse 50% 60% at 20% 80%, rgba(200,100,120,0.06), transparent)
              `,
            }}
          />
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-6 pb-16 max-w-6xl mx-auto w-full">
          <div className="animate-slide-up">
            <p className="text-xs tracking-[0.3em] uppercase text-white/40 mb-4 font-medium">
              Your AI Style Companion
            </p>
            <h1 className="text-[clamp(3rem,8vw,6rem)] font-extralight leading-[0.9] tracking-tight mb-6">
              <span className="block">今天，</span>
              <span className="block font-medium" style={{
                background: "linear-gradient(135deg, #E8A0B0, #D4A0C8, #B0A0D8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                想穿什么？
              </span>
            </h1>
            <p className="text-white/35 text-sm sm:text-base max-w-md leading-relaxed font-light">
              AI 理解你的风格，从衣橱中智能搭配，<br className="hidden sm:block" />
              让每一天都成为你的时尚杂志封面
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 mt-10 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <Link
              href="/tryon"
              className="group relative px-8 py-3.5 rounded-full text-sm font-medium overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(200,120,140,0.3)]"
              style={{
                background: "linear-gradient(135deg, rgba(200,120,140,0.9), rgba(180,140,200,0.9))",
              }}
            >
              <span className="relative z-10">AI 虚拟试穿</span>
            </Link>
            <Link
              href="/recommendations"
              className="px-8 py-3.5 rounded-full text-sm font-medium border border-white/15 text-white/70 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all duration-300"
            >
              今日穿搭推荐
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in-up" style={{ animationDelay: "600ms" }}>
          <div className="w-[1px] h-8 bg-gradient-to-b from-transparent to-white/20" />
        </div>
      </section>

      {/* ── Navigation Grid ──────────────────── */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/wardrobe", label: "衣橱", sub: "管理单品", icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="3" y="2" width="18" height="20" rx="2" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <path d="M9 10h-1" /><path d="M16 10h-1" />
              </svg>
            )},
            { href: "/persons", label: "人像", sub: "试穿形象", icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
              </svg>
            )},
            { href: "/favorites", label: "收藏", sub: "心动穿搭", icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )},
            { href: "/showcase", label: "广场", sub: "发现灵感", icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            )},
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative rounded-2xl p-5 sm:p-6 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-500"
            >
              <div className="text-white/30 group-hover:text-white/60 transition-colors duration-500 mb-4">
                {item.icon}
              </div>
              <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{item.label}</p>
              <p className="text-[11px] text-white/25 mt-0.5">{item.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Recent Outfits ───────────────────── */}
      {loaded && recentOutfits.length > 0 && (
        <section className="px-6 pb-16 max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-1">Collection</p>
              <h2 className="text-xl font-light text-white/90">最近穿搭</h2>
            </div>
            <Link href="/favorites" className="text-xs text-white/30 hover:text-white/60 transition-colors font-light tracking-wide">
              查看全部 →
            </Link>
          </div>
          <div
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none" }}
          >
            {recentOutfits.map((outfit, i) => (
              <Link
                key={outfit.id}
                href="/favorites"
                className="flex-shrink-0 w-[140px] sm:w-[160px] group snap-start"
              >
                <div
                  className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/[0.06] group-hover:border-white/[0.15] transition-all duration-500"
                  style={{ aspectRatio: "3/4" }}
                >
                  <Image
                    src={outfit.imagePath}
                    alt="穿搭"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {outfit.score && (
                    <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <ScoreBadge score={outfit.score} size="sm" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-white/20 mt-2 text-center font-light tracking-wider">
                  LOOK {String(i + 1).padStart(2, "0")}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Showcase / Community ─────────────── */}
      {loaded && showcasePosts.length > 0 && (
        <section className="px-6 pb-20 max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/25 mb-1">Community</p>
              <h2 className="text-xl font-light text-white/90">穿搭广场</h2>
            </div>
            <Link href="/showcase" className="text-xs text-white/30 hover:text-white/60 transition-colors font-light tracking-wide">
              发现更多 →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {showcasePosts.map((post) => (
              <Link
                key={post.id}
                href="/showcase"
                className="group relative rounded-2xl overflow-hidden bg-white/5 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500"
                style={{ aspectRatio: "3/4" }}
              >
                <Image
                  src={post.outfitImagePath}
                  alt="穿搭"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-4">
                  <p className="text-[11px] text-white/50 font-light">{post.authorName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-white/30">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="inline mr-1 -mt-0.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {post.likesCount}
                    </span>
                    {post.score && <ScoreBadge score={post.score} size="sm" />}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state for new users ────────── */}
      {loaded && recentOutfits.length === 0 && showcasePosts.length === 0 && (
        <section className="px-6 pb-20 max-w-md mx-auto text-center">
          <div className="py-16 border border-white/[0.06] rounded-3xl bg-white/[0.02]">
            <p className="text-white/30 text-sm font-light mb-4">衣橱空空如也</p>
            <p className="text-white/15 text-xs mb-8 leading-relaxed">
              上传你的第一件单品，开始 AI 穿搭之旅
            </p>
            <Link
              href="/wardrobe/add"
              className="inline-block px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-[0_0_30px_rgba(200,120,140,0.3)]"
              style={{
                background: "linear-gradient(135deg, rgba(200,120,140,0.9), rgba(180,140,200,0.9))",
              }}
            >
              添加第一件单品
            </Link>
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────── */}
      <footer className="px-6 pb-24 text-center">
        <p className="text-[10px] text-white/15 tracking-[0.2em] uppercase font-light">
          OOTD &mdash; AI Powered Styling
        </p>
      </footer>
    </div>
  );
}
