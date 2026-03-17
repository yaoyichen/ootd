"use client";

import Link from "next/link";

const BENTO_ITEMS = [
  {
    href: "/tryon",
    title: "AI 试穿",
    desc: "选择人像和服装，AI 生成试穿效果图",
    span: "sm:col-span-2 sm:row-span-2",
    iconBg: "rgba(242,124,136,0.1)",
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#F27C88" }}>
        <path d="M12 2a4 4 0 0 0-4 4v2h8V6a4 4 0 0 0-4-4z" />
        <path d="M4 10l-2 8h20l-2-8" />
        <path d="M12 14v4" />
      </svg>
    ),
  },
  {
    href: "/wardrobe",
    title: "我的衣橱",
    desc: "管理你的衣物单品",
    span: "",
    iconBg: "rgba(168,130,214,0.1)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#A882D6" }}>
        <rect x="3" y="2" width="18" height="20" rx="2" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <path d="M9 10h-1" />
        <path d="M16 10h-1" />
      </svg>
    ),
  },
  {
    href: "/recommendations",
    title: "每日推荐",
    desc: "AI 精选穿搭方案",
    span: "",
    iconBg: "rgba(242,186,136,0.12)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#F2BA88" }}>
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
      </svg>
    ),
  },
  {
    href: "/persons",
    title: "人像管理",
    desc: "上传全身照",
    span: "",
    iconBg: "rgba(136,196,242,0.1)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#88C4F2" }}>
        <circle cx="12" cy="8" r="4" />
        <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
      </svg>
    ),
  },
  {
    href: "/favorites",
    title: "收藏",
    desc: "喜欢的穿搭",
    span: "",
    iconBg: "rgba(242,124,136,0.08)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#F27C88" }}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#FFF8F6" }}>
      {/* Decorative orbs — pink/purple tones */}
      <div
        className="pointer-events-none fixed rounded-full animate-float"
        style={{
          top: "-15%",
          right: "-8%",
          width: 700,
          height: 700,
          background: "radial-gradient(circle, rgba(242,124,136,0.15), transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          bottom: "-10%",
          left: "-5%",
          width: 550,
          height: 550,
          background: "radial-gradient(circle, rgba(168,130,214,0.12), transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          top: "40%",
          left: "50%",
          width: 400,
          height: 400,
          background: "radial-gradient(circle, rgba(250,205,208,0.1), transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24">
        {/* Hero */}
        <div className="text-center mb-14 animate-slide-up">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: "#1D1D1F" }}>
            今天想穿什么？
          </h1>
          <p className="mt-4 text-lg max-w-md mx-auto" style={{ color: "#6E6E73" }}>
            你的 AI 穿搭助手，让每一天都精致出门
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 auto-rows-[140px] sm:auto-rows-[160px]">
          {BENTO_ITEMS.map((item, idx) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group glass rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] ${item.span}`}
              style={{
                textDecoration: "none",
                animationDelay: `${idx * 80}ms`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 40px rgba(242,124,136,0.12)";
                e.currentTarget.style.borderColor = "rgba(242,124,136,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.04)";
                e.currentTarget.style.borderColor = "rgba(242,124,136,0.1)";
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: item.iconBg }}
              >
                {item.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "#1D1D1F" }}>
                  {item.title}
                </h2>
                <p className="mt-0.5 text-sm" style={{ color: "#6E6E73" }}>
                  {item.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Tagline */}
        <div className="mt-16 text-center">
          <p className="text-sm" style={{ color: "#AEAEB2" }}>
            开始建立你的衣橱，体验 AI 穿搭的魅力
          </p>
        </div>
      </main>

      <footer className="relative z-10 text-center pb-8">
        <p className="text-xs" style={{ color: "#AEAEB2" }}>
          OOTD · AI 穿搭助手 · 效果仅供参考
        </p>
      </footer>
    </div>
  );
}
