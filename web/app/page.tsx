"use client";

import Link from "next/link";

const FEATURES = [
  {
    href: "/wardrobe",
    title: "我的衣橱",
    desc: "管理你的衣物单品，随时浏览和搭配",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#FF9500" }}>
        <rect x="3" y="2" width="18" height="20" rx="2" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <path d="M9 10h-1" />
        <path d="M16 10h-1" />
      </svg>
    ),
  },
  {
    href: "/tryon",
    title: "AI 试穿",
    desc: "选择人像和服装，AI 生成试穿效果图",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#FF9500" }}>
        <path d="M12 2a4 4 0 0 0-4 4v2h8V6a4 4 0 0 0-4-4z" />
        <path d="M4 10l-2 8h20l-2-8" />
        <path d="M12 14v4" />
      </svg>
    ),
  },
  {
    href: "/recommendations",
    title: "每日推荐",
    desc: "AI 智能搭配，每天精选 3 套最佳穿搭",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#FF9500" }}>
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
      </svg>
    ),
  },
  {
    href: "/persons",
    title: "人像管理",
    desc: "上传你的全身照，用于试穿生成",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#FF9500" }}>
        <circle cx="12" cy="8" r="4" />
        <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#FEFCF8" }}>
      {/* Decorative orbs */}
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          top: "-15%",
          right: "-8%",
          width: 700,
          height: 700,
          background: "radial-gradient(circle, rgba(255,149,0,0.18), transparent 70%)",
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
          background: "radial-gradient(circle, rgba(255,204,0,0.15), transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-24">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight" style={{ color: "#1D1D1F" }}>
            <span
              style={{
                background: "linear-gradient(135deg, #FF9500, #FFCC00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI
            </span>
            {" "}穿搭助手
          </h1>
          <p className="mt-4 text-lg max-w-lg mx-auto" style={{ color: "#6E6E73" }}>
            管理你的衣橱，上传人像，即刻预览任意搭配效果
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group glass rounded-3xl p-7 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02]"
              style={{ textDecoration: "none" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 40px rgba(255,149,0,0.12)";
                e.currentTarget.style.borderColor = "rgba(255,149,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.04)";
                e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,149,0,0.08)" }}
              >
                {f.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "#1D1D1F" }}>
                  {f.title}
                </h2>
                <p className="mt-1 text-sm" style={{ color: "#6E6E73" }}>
                  {f.desc}
                </p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-sm font-medium" style={{ color: "#FF9500" }}>
                进入
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ stroke: "#FF9500" }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick stats placeholder */}
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
