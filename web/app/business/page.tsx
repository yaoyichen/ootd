"use client";

import { useEffect, useState } from "react";

/* ── data ─────────────────────────────────────── */

const PAIN_POINTS = [
  { icon: "📸", title: "拍摄成本高", desc: "一套模特拍摄动辄数万元，换季上新预算压力巨大" },
  { icon: "⏳", title: "上新速度慢", desc: "从拍摄到修图到上架，一个 SKU 平均耗时 3-5 天" },
  { icon: "👤", title: "模特风格单一", desc: "目标市场多元，单一模特难以覆盖不同肤色与体型" },
];

const FEATURES = [
  { icon: "👗", title: "AI 虚拟试穿", desc: "上传白底图，AI 自动生成模特上身效果，媲美实拍" },
  { icon: "🌍", title: "多种族模特库", desc: "欧美、亚洲、非裔等多种族模特任选，精准匹配目标市场" },
  { icon: "✨", title: "智能搭配推荐", desc: "AI 根据风格、色彩自动推荐搭配方案，提升连带率" },
  { icon: "💯", title: "AI 穿搭评分", desc: "智能评估搭配效果，给出优化建议，提升整体视觉质量" },
  { icon: "⚡", title: "批量处理", desc: "支持批量上传，一次处理数百件商品，效率提升百倍" },
  { icon: "🔌", title: "API 接入", desc: "提供标准 API，无缝对接您的 ERP / 商品管理系统" },
];

const STATS = [
  { value: "1/100", label: "拍摄成本" },
  { value: "2min", label: "平均出图" },
  { value: "300%+", label: "转化提升" },
  { value: "10,000+", label: "服务卖家" },
];

const TESTIMONIALS = [
  { name: "张总", role: "深圳女装卖家", text: "以前一个季度拍摄费 20 万，现在用 AI 生成，成本不到 2000，效果甚至更好。" },
  { name: "Sarah", role: "跨境电商运营", text: "多种族模特功能太棒了，欧美站转化率直接翻倍，再也不用找海外模特了。" },
  { name: "李经理", role: "服装品牌电商负责人", text: "API 接入后，上新效率提升了 50 倍，现在一天能上架 500 个 SKU。" },
];

const PRICING = [
  {
    name: "体验包",
    price: "免费",
    period: "",
    quota: "10 张/月",
    models: "3 个基础模特",
    features: "基础试穿",
    support: "社区支持",
    highlight: false,
  },
  {
    name: "基础版",
    price: "¥99",
    period: "/月",
    quota: "200 张/月",
    models: "10 个模特",
    features: "试穿 + 搭配推荐",
    support: "工单支持",
    highlight: false,
  },
  {
    name: "专业版",
    price: "¥299",
    period: "/月",
    quota: "1,000 张/月",
    models: "全部模特库",
    features: "全部功能",
    support: "专属客服",
    highlight: true,
  },
  {
    name: "企业版",
    price: "¥999",
    period: "/月",
    quota: "无限量",
    models: "全部 + 定制模特",
    features: "全部功能 + API",
    support: "1v1 技术支持",
    highlight: false,
  },
];

/* ── component ────────────────────────────────── */

export default function BusinessPage() {
  const [activePrice, setActivePrice] = useState(2);

  /* scroll reveal */
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }),
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .reveal { opacity: 0; transform: translateY(32px); transition: opacity .6s ease, transform .6s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .arrow-pulse { animation: arrowPulse 1.8s ease-in-out infinite; }
        @keyframes arrowPulse { 0%,100%{ transform: translateX(0); opacity:.7; } 50%{ transform: translateX(8px); opacity:1; } }
        .pricing-card { transition: transform .25s ease, box-shadow .25s ease; }
        .pricing-card:hover, .pricing-card.active { transform: translateY(-6px); box-shadow: 0 12px 40px rgba(242,124,136,.2); }
        .hero-bg { background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(250,205,208,.25) 0%, transparent 70%); }
      `}</style>

      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] overflow-x-hidden">

        {/* ── 1. Hero ──────────────────────────── */}
        <section className="hero-bg relative flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <span className="reveal inline-block mb-4 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide glass" style={{ color: "var(--color-accent)" }}>
            跨境电商 AI 解决方案
          </span>
          <h1 className="reveal text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4">
            <span className="gradient-text">白底图秒变模特上身图</span>
          </h1>
          <p className="reveal max-w-xl text-base sm:text-lg opacity-70 mb-8 leading-relaxed">
            AI 虚拟试穿 + 智能搭配推荐，降低 90% 拍摄成本
          </p>
          <div className="reveal flex gap-4 flex-wrap justify-center">
            <a href="#pricing" className="btn-gradient px-8 py-3 rounded-full text-sm font-semibold">免费体验</a>
            <a href="#contact" className="glass px-8 py-3 rounded-full text-sm font-semibold" style={{ color: "var(--color-accent)" }}>预约演示</a>
          </div>
        </section>

        {/* ── 2. Pain Points ──────────────────── */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="reveal text-2xl sm:text-3xl font-bold text-center mb-12">
            跨境卖家的<span className="gradient-text">三大痛点</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PAIN_POINTS.map((p, i) => (
              <div key={i} className="reveal glass rounded-2xl p-6 text-center" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="text-4xl mb-3">{p.icon}</div>
                <h3 className="font-bold text-lg mb-2">{p.title}</h3>
                <p className="text-sm opacity-60 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. Before / After ───────────────── */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="reveal text-2xl sm:text-3xl font-bold text-center mb-12">
            <span className="gradient-text">效果对比</span>
          </h2>
          <div className="reveal grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            {/* before */}
            <div className="glass rounded-2xl p-8 text-center">
              <div className="w-full aspect-[3/4] rounded-xl mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#e8e8e8,#d0d0d0)" }}>
                <span className="text-6xl opacity-30">👕</span>
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(0,0,0,.06)" }}>白底平铺图</span>
            </div>
            {/* arrow */}
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="arrow-pulse text-2xl" style={{ color: "var(--color-accent)" }}>→</span>
              <span className="text-xs font-semibold opacity-60">AI 一键生成</span>
            </div>
            {/* after */}
            <div className="glass rounded-2xl p-8 text-center" style={{ borderColor: "rgba(242,124,136,.3)" }}>
              <div className="w-full aspect-[3/4] rounded-xl mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#FACDD0,#F27C88)" }}>
                <span className="text-6xl">🧍‍♀️</span>
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(242,124,136,.1)", color: "var(--color-accent)" }}>模特上身效果</span>
            </div>
          </div>
        </section>

        {/* ── 4. Features ─────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="reveal text-2xl sm:text-3xl font-bold text-center mb-12">
            <span className="gradient-text">6 大核心功能</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="reveal glass rounded-2xl p-6" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-base mb-1">{f.title}</h3>
                <p className="text-sm opacity-60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. Stats + Testimonials ─────────── */}
        <section className="py-20">
          <div className="reveal rounded-3xl mx-4 sm:mx-8 px-6 py-12 text-center text-white" style={{ background: "linear-gradient(135deg,#F27C88,#FACDD0)" }}>
            <h2 className="text-2xl sm:text-3xl font-bold mb-10">数据说话</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {STATS.map((s, i) => (
                <div key={i}>
                  <div className="text-3xl sm:text-4xl font-extrabold">{s.value}</div>
                  <div className="text-sm mt-1 opacity-90">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="max-w-5xl mx-auto px-6 mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="reveal glass rounded-2xl p-6" style={{ transitionDelay: `${i * 100}ms` }}>
                <p className="text-sm leading-relaxed mb-4 opacity-70">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#F27C88,#FACDD0)" }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs opacity-50">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. Pricing ─────────────────────── */}
        <section id="pricing" className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="reveal text-2xl sm:text-3xl font-bold text-center mb-12">
            选择适合您的<span className="gradient-text">方案</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING.map((p, i) => (
              <div
                key={i}
                className={`reveal pricing-card glass rounded-2xl p-6 cursor-pointer ${i === activePrice ? "active" : ""}`}
                style={{
                  transitionDelay: `${i * 80}ms`,
                  border: i === activePrice ? "2px solid var(--color-accent)" : undefined,
                }}
                onClick={() => setActivePrice(i)}
              >
                {p.highlight && (
                  <span className="inline-block mb-3 px-3 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: "var(--color-accent)" }}>推荐</span>
                )}
                <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-extrabold gradient-text">{p.price}</span>
                  {p.period && <span className="text-sm opacity-50">{p.period}</span>}
                </div>
                <ul className="space-y-2 text-sm opacity-70">
                  <li>📦 {p.quota}</li>
                  <li>🧍 {p.models}</li>
                  <li>✅ {p.features}</li>
                  <li>💬 {p.support}</li>
                </ul>
                <a
                  href="#contact"
                  className={`block mt-6 text-center py-2.5 rounded-full text-sm font-semibold ${p.highlight ? "btn-gradient" : "glass"}`}
                  style={p.highlight ? undefined : { color: "var(--color-accent)" }}
                >
                  {p.price === "免费" ? "立即体验" : "立即购买"}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. CTA + Footer ────────────────── */}
        <section id="contact" className="max-w-3xl mx-auto px-6 py-20">
          <div className="reveal glass rounded-3xl p-10 sm:p-14 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              准备好<span className="gradient-text">提升转化率</span>了吗？
            </h2>
            <p className="text-sm opacity-60 mb-8 max-w-md mx-auto leading-relaxed">
              立即开始免费体验，或联系我们获取专属方案
            </p>
            <div className="flex gap-4 flex-wrap justify-center mb-10">
              <a href="#pricing" className="btn-gradient px-8 py-3 rounded-full text-sm font-semibold">免费体验</a>
              <a href="mailto:contact@ootd.ai" className="glass px-8 py-3 rounded-full text-sm font-semibold" style={{ color: "var(--color-accent)" }}>预约演示</a>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm opacity-50">
              <span>💬 微信：ootd_ai</span>
              <span>📧 contact@ootd.ai</span>
            </div>
          </div>
        </section>

        <footer className="text-center py-8 text-xs opacity-40">
          © 2026 OOTD AI · 让每一件衣服都被看见
        </footer>
      </div>
    </>
  );
}
