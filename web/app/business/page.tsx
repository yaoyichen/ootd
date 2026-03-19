"use client";

import { useEffect, useState } from "react";

/* ── SVG Icons (monochrome, Apple-style thin strokes) ── */

const Icons = {
  camera: (c = "currentColor") => (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14a2 2 0 012-2h6l3-4h14l3 4h6a2 2 0 012 2v22a2 2 0 01-2 2H8a2 2 0 01-2-2V14z" />
      <circle cx="24" cy="25" r="8" />
    </svg>
  ),
  clock: (c = "currentColor") => (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="18" />
      <path d="M24 14v10l7 7" />
    </svg>
  ),
  users: (c = "currentColor") => (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="16" r="6" />
      <path d="M6 38v-2a10 10 0 0120 0v2" />
      <circle cx="34" cy="18" r="5" />
      <path d="M42 38v-1a8 8 0 00-10-7.7" />
    </svg>
  ),
  shirt: (c = "currentColor") => (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 6l-10 8 6 4v22h24V18l6-4-10-8-4 4h-8l-4-4z" />
    </svg>
  ),
  globe: (c = "currentColor") => (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="18" />
      <ellipse cx="24" cy="24" rx="8" ry="18" />
      <path d="M6 24h36" />
      <path d="M10 14h28" />
      <path d="M10 34h28" />
    </svg>
  ),
  sparkle: (c = "currentColor") => (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 4v8M24 36v8M4 24h8M36 24h8M10 10l6 6M32 32l6 6M38 10l-6 6M16 32l-6 6" />
      <circle cx="24" cy="24" r="4" />
    </svg>
  ),
  gauge: (c = "currentColor") => (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 42c9.941 0 18-8.059 18-18S33.941 6 24 6 6 14.059 6 24s8.059 18 18 18z" />
      <path d="M24 14v10" />
      <circle cx="24" cy="24" r="2" fill={c} />
      <path d="M16 36h16" />
    </svg>
  ),
  zap: (c = "currentColor") => (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M26 4L10 28h14l-2 16L38 20H24l2-16z" />
    </svg>
  ),
  plug: (c = "currentColor") => (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6v10M30 6v10M12 16h24v6a12 12 0 01-24 0v-6zM24 34v8" />
    </svg>
  ),
  arrow: (c = "currentColor") => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 24h32M30 14l10 10-10 10" />
    </svg>
  ),
  check: (c = "currentColor") => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7" />
    </svg>
  ),
};

/* ── data ─────────────────────────────────────── */

const PAIN_POINTS = [
  { icon: Icons.camera, title: "拍摄成本高", desc: "一套模特拍摄动辄数万元，换季上新预算压力巨大" },
  { icon: Icons.clock, title: "上新速度慢", desc: "从拍摄到修图到上架，一个 SKU 平均耗时 3–5 天" },
  { icon: Icons.users, title: "模特风格单一", desc: "目标市场多元，单一模特难以覆盖不同肤色与体型" },
];

const FEATURES = [
  { icon: Icons.shirt, title: "AI 虚拟试穿", desc: "上传白底图，AI 自动生成模特上身效果，媲美实拍" },
  { icon: Icons.globe, title: "多种族模特库", desc: "欧美、亚洲、非裔等多种族模特任选，精准匹配目标市场" },
  { icon: Icons.sparkle, title: "智能搭配推荐", desc: "AI 根据风格、色彩自动推荐搭配方案，提升连带率" },
  { icon: Icons.gauge, title: "AI 穿搭评分", desc: "智能评估搭配效果，给出优化建议，提升整体视觉质量" },
  { icon: Icons.zap, title: "批量处理", desc: "支持批量上传，一次处理数百件商品，效率提升百倍" },
  { icon: Icons.plug, title: "API 接入", desc: "提供标准 API，无缝对接您的 ERP / 商品管理系统" },
];

const STATS = [
  { value: "1/100", unit: "", label: "传统拍摄成本" },
  { value: "2", unit: "min", label: "平均出图时间" },
  { value: "300", unit: "%+", label: "转化率提升" },
  { value: "10,000", unit: "+", label: "服务卖家数" },
];

const TESTIMONIALS = [
  { name: "张总", role: "深圳 · 女装卖家", text: "以前一个季度拍摄费 20 万，现在用 AI 生成，成本不到 2000，效果甚至更好。" },
  { name: "Sarah", role: "跨境电商运营", text: "多种族模特功能太棒了，欧美站转化率直接翻倍，再也不用找海外模特了。" },
  { name: "李经理", role: "服装品牌电商负责人", text: "API 接入后，上新效率提升了 50 倍，现在一天能上架 500 个 SKU。" },
];

const PRICING = [
  {
    name: "体验包",
    price: "免费",
    period: "",
    items: ["10 张 / 月", "3 个基础模特", "基础试穿功能", "社区支持"],
    highlight: false,
  },
  {
    name: "基础版",
    price: "¥99",
    period: "/月",
    items: ["200 张 / 月", "10 个模特", "试穿 + 搭配推荐", "工单支持"],
    highlight: false,
  },
  {
    name: "专业版",
    price: "¥299",
    period: "/月",
    items: ["1,000 张 / 月", "全部模特库", "全部功能", "专属客服"],
    highlight: true,
  },
  {
    name: "企业版",
    price: "¥999",
    period: "/月",
    items: ["无限量", "全部 + 定制模特", "全部功能 + API", "1v1 技术支持"],
    highlight: false,
  },
];

/* ── component ────────────────────────────────── */

export default function BusinessPage() {
  const [activePrice, setActivePrice] = useState(2);

  useEffect(() => {
    const els = document.querySelectorAll(".rv");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("vis");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const sectionCls = "px-6 md:px-12 lg:px-20";

  return (
    <>
      <style>{`
        /* reveal */
        .rv{opacity:0;transform:translateY(40px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
        .rv.vis{opacity:1;transform:none}
        /* stagger children */
        .rv-d1{transition-delay:.1s}.rv-d2{transition-delay:.2s}.rv-d3{transition-delay:.3s}
        .rv-d4{transition-delay:.4s}.rv-d5{transition-delay:.5s}
        /* arrow */
        .arrow-float{animation:arrowFloat 2.4s ease-in-out infinite}
        @keyframes arrowFloat{0%,100%{transform:translateX(0);opacity:.5}50%{transform:translateX(10px);opacity:1}}
        /* pricing hover */
        .price-card{transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s ease}
        .price-card:hover,.price-card.sel{transform:translateY(-8px)}
        /* top nav */
        .top-nav{transition:background .3s ease,backdrop-filter .3s ease}
      `}</style>

      <div className="min-h-screen overflow-x-hidden" style={{ background: "#000" }}>

        {/* ── Sticky Nav ─────────────────────── */}
        <nav className="fixed top-0 left-0 right-0 z-50 top-nav" style={{ background: "rgba(0,0,0,.8)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
            <span className="text-white font-bold text-lg tracking-tight">OOTD AI</span>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-white/60 text-sm hover:text-white transition-colors hidden sm:block">功能</a>
              <a href="#pricing" className="text-white/60 text-sm hover:text-white transition-colors hidden sm:block">定价</a>
              <a href="#contact" className="text-sm font-semibold px-5 py-2 rounded-full btn-gradient">免费体验</a>
            </div>
          </div>
        </nav>

        {/* ── 1. Hero (dark) ─────────────────── */}
        <section className={`relative flex flex-col items-center justify-center min-h-screen text-center ${sectionCls}`} style={{ background: "radial-gradient(ellipse 70% 50% at 50% 45%, rgba(242,124,136,.12) 0%, transparent 70%)" }}>
          <p className="rv text-sm sm:text-base font-medium tracking-widest uppercase mb-6" style={{ color: "rgba(242,124,136,.8)" }}>
            跨境电商 AI 解决方案
          </p>
          <h1 className="rv rv-d1 text-5xl sm:text-7xl md:text-8xl font-extrabold leading-[1.05] tracking-tight text-white mb-6">
            白底图秒变
            <br />
            <span className="gradient-text">模特上身图</span>
          </h1>
          <p className="rv rv-d2 text-lg sm:text-xl text-white/50 max-w-lg mb-10 leading-relaxed">
            AI 虚拟试穿 + 智能搭配推荐
            <br className="sm:hidden" />
            ，降低 90% 拍摄成本
          </p>
          <div className="rv rv-d3 flex gap-4">
            <a href="#pricing" className="btn-gradient px-10 py-3.5 rounded-full text-sm font-semibold">免费体验</a>
            <a href="#contact" className="px-10 py-3.5 rounded-full text-sm font-semibold text-white border border-white/20 hover:border-white/40 transition-colors">预约演示</a>
          </div>
          {/* scroll hint */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
            <span className="text-xs tracking-widest">SCROLL</span>
            <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
          </div>
        </section>

        {/* ── 2. Pain Points (light) ─────────── */}
        <section className="bg-white" style={{ color: "#1d1d1f" }}>
          <div className={`max-w-5xl mx-auto py-28 sm:py-36 ${sectionCls}`}>
            <p className="rv text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--color-accent)" }}>痛点</p>
            <h2 className="rv rv-d1 text-3xl sm:text-5xl font-bold leading-tight mb-20">
              跨境卖家，<br />每天都在面对这些问题。
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-8">
              {PAIN_POINTS.map((p, i) => (
                <div key={i} className={`rv rv-d${i + 1}`}>
                  <div className="mb-5 text-[#1d1d1f]/70">{p.icon()}</div>
                  <h3 className="text-xl font-bold mb-2">{p.title}</h3>
                  <p className="text-base leading-relaxed text-[#1d1d1f]/50">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Before / After (dark) ───────── */}
        <section style={{ background: "#0a0a0a" }}>
          <div className={`max-w-5xl mx-auto py-28 sm:py-36 ${sectionCls}`}>
            <p className="rv text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--color-accent)" }}>效果对比</p>
            <h2 className="rv rv-d1 text-3xl sm:text-5xl font-bold leading-tight text-white mb-20">
              一张白底图，<br />AI 给你一整套视觉。
            </h2>
            <div className="rv rv-d2 grid grid-cols-1 md:grid-cols-[1fr_80px_1fr] gap-8 md:gap-4 items-center">
              {/* before */}
              <div className="rounded-3xl overflow-hidden" style={{ background: "#1a1a1a" }}>
                <div className="aspect-[3/4] flex items-center justify-center relative">
                  <div className="w-32 h-44 rounded-2xl" style={{ background: "linear-gradient(145deg,#2a2a2a,#1a1a1a)", border: "1px dashed rgba(255,255,255,.1)" }} />
                  <div className="absolute bottom-6 left-6 right-6 flex gap-2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-medium text-white/40" style={{ background: "rgba(255,255,255,.06)" }}>成本高</span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-medium text-white/40" style={{ background: "rgba(255,255,255,.06)" }}>耗时长</span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-medium text-white/40" style={{ background: "rgba(255,255,255,.06)" }}>风格单一</span>
                  </div>
                </div>
                <div className="px-6 py-5 text-center">
                  <span className="text-sm text-white/40">白底平铺图</span>
                </div>
              </div>
              {/* arrow */}
              <div className="flex items-center justify-center">
                <div className="arrow-float" style={{ color: "var(--color-accent)" }}>
                  {Icons.arrow("var(--color-accent)")}
                </div>
              </div>
              {/* after */}
              <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(242,124,136,.2)", background: "#1a1a1a" }}>
                <div className="aspect-[3/4] flex items-center justify-center" style={{ background: "linear-gradient(160deg, rgba(242,124,136,.15), rgba(250,205,208,.08))" }}>
                  <div className="w-32 h-44 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(145deg, rgba(242,124,136,.3), rgba(250,205,208,.2))", border: "1px solid rgba(242,124,136,.2)" }}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="rgba(242,124,136,.6)" strokeWidth="1.2">
                      <circle cx="24" cy="14" r="6" />
                      <path d="M12 42v-4a12 12 0 0124 0v4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div className="px-6 py-5 text-center">
                  <span className="text-sm" style={{ color: "var(--color-accent)" }}>模特上身效果</span>
                </div>
              </div>
            </div>
            <p className="rv rv-d3 text-center text-white/30 text-sm mt-8">AI 一键生成 · 2 分钟出图 · 媲美实拍</p>
          </div>
        </section>

        {/* ── 4. Features (light) ────────────── */}
        <section id="features" className="bg-white" style={{ color: "#1d1d1f" }}>
          <div className={`max-w-5xl mx-auto py-28 sm:py-36 ${sectionCls}`}>
            <p className="rv text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--color-accent)" }}>核心功能</p>
            <h2 className="rv rv-d1 text-3xl sm:text-5xl font-bold leading-tight mb-20">
              六大能力，<br />覆盖电商视觉全链路。
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
              {FEATURES.map((f, i) => (
                <div key={i} className={`rv rv-d${Math.min(i + 1, 5)}`}>
                  <div className="mb-5 text-[#1d1d1f]/70">{f.icon()}</div>
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-base leading-relaxed text-[#1d1d1f]/50">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Stats (dark, full-bleed) ────── */}
        <section style={{ background: "#0a0a0a" }}>
          <div className={`max-w-5xl mx-auto py-28 sm:py-36 ${sectionCls}`}>
            <p className="rv text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--color-accent)" }}>数据</p>
            <h2 className="rv rv-d1 text-3xl sm:text-5xl font-bold leading-tight text-white mb-20">
              数字不说谎。
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-28">
              {STATS.map((s, i) => (
                <div key={i} className={`rv rv-d${i + 1}`}>
                  <div className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight">
                    {s.value}<span className="text-3xl sm:text-4xl" style={{ color: "var(--color-accent)" }}>{s.unit}</span>
                  </div>
                  <p className="text-sm text-white/40 mt-3">{s.label}</p>
                </div>
              ))}
            </div>
            {/* testimonials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className={`rv rv-d${i + 1} rounded-2xl p-8`} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <p className="text-base leading-relaxed text-white/60 mb-6">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg,#F27C88,#FACDD0)", color: "#fff" }}>
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white/80">{t.name}</div>
                      <div className="text-xs text-white/30">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. Pricing (light) ─────────────── */}
        <section id="pricing" className="bg-white" style={{ color: "#1d1d1f" }}>
          <div className={`max-w-5xl mx-auto py-28 sm:py-36 ${sectionCls}`}>
            <p className="rv text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--color-accent)" }}>定价</p>
            <h2 className="rv rv-d1 text-3xl sm:text-5xl font-bold leading-tight mb-6">
              简单透明，按需选择。
            </h2>
            <p className="rv rv-d2 text-lg text-[#1d1d1f]/50 mb-16">所有方案均含 7 天无理由退款保障。</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PRICING.map((p, i) => (
                <div
                  key={i}
                  className={`rv rv-d${Math.min(i + 1, 4)} price-card rounded-3xl p-8 cursor-pointer ${i === activePrice ? "sel" : ""}`}
                  style={{
                    background: i === activePrice ? "#1d1d1f" : "#f5f5f7",
                    color: i === activePrice ? "#fff" : "#1d1d1f",
                    boxShadow: i === activePrice ? "0 20px 60px rgba(0,0,0,.15)" : "none",
                  }}
                  onClick={() => setActivePrice(i)}
                >
                  {p.highlight && (
                    <span className="inline-block mb-4 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide" style={{ background: "var(--color-accent)", color: "#fff" }}>推荐</span>
                  )}
                  <h3 className="text-lg font-bold mb-1">{p.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold">{p.price}</span>
                    {p.period && <span className="text-sm opacity-40 ml-1">{p.period}</span>}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {p.items.map((item, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm" style={{ opacity: i === activePrice ? .8 : .5 }}>
                        {Icons.check(i === activePrice ? "var(--color-accent)" : "#1d1d1f")}
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#contact"
                    className={`block text-center py-3 rounded-full text-sm font-semibold transition-colors ${
                      i === activePrice
                        ? "btn-gradient"
                        : ""
                    }`}
                    style={
                      i === activePrice
                        ? undefined
                        : { background: "#e8e8ed", color: "#1d1d1f" }
                    }
                  >
                    {p.price === "免费" ? "立即体验" : "立即购买"}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. CTA + Footer (dark) ─────────── */}
        <section id="contact" style={{ background: "#0a0a0a" }}>
          <div className={`max-w-3xl mx-auto py-28 sm:py-36 text-center ${sectionCls}`}>
            <h2 className="rv text-3xl sm:text-5xl font-bold leading-tight text-white mb-6">
              准备好提升转化率了吗？
            </h2>
            <p className="rv rv-d1 text-lg text-white/40 mb-10 max-w-md mx-auto leading-relaxed">
              立即开始免费体验，或联系我们获取专属方案。
            </p>
            <div className="rv rv-d2 flex gap-4 justify-center mb-16">
              <a href="#pricing" className="btn-gradient px-10 py-3.5 rounded-full text-sm font-semibold">免费体验</a>
              <a href="mailto:contact@ootd.ai" className="px-10 py-3.5 rounded-full text-sm font-semibold text-white border border-white/20 hover:border-white/40 transition-colors">预约演示</a>
            </div>
            <div className="rv rv-d3 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-white/30">
              <span>微信：ootd_ai</span>
              <span className="hidden sm:block">·</span>
              <span>contact@ootd.ai</span>
            </div>
          </div>
          <footer className="text-center pb-10 text-xs text-white/20">
            © 2026 OOTD AI
          </footer>
        </section>
      </div>
    </>
  );
}
