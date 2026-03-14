"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/wardrobe", label: "衣橱" },
  { href: "/tryon", label: "试穿" },
  { href: "/favorites", label: "收藏" },
  { href: "/persons", label: "人像" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "rgba(254,252,248,0.8)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="text-xl font-bold tracking-tight"
              style={{
                background: "linear-gradient(135deg, #FF9500, #FFCC00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              OOTD
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={{
                    color: active ? "#FF9500" : "#6E6E73",
                    background: active ? "rgba(255,149,0,0.08)" : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <p className="text-xs hidden md:block" style={{ color: "#AEAEB2" }}>
          AI 穿搭助手
        </p>
      </div>
    </nav>
  );
}
