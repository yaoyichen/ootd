"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/wardrobe", label: "衣橱" },
  { href: "/tryon", label: "试穿" },
  { href: "/recommendations", label: "推荐" },
  { href: "/showcase", label: "广场" },
];

export function TopNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (pathname.startsWith("/business") || pathname === "/login" || pathname === "/register") return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 hidden md:block"
      style={{
        background: "rgba(12,12,14,0.85)",
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
        {/* Logo */}
        <Link href="/" className="text-lg font-bold tracking-tight shrink-0">
          <span
            style={{
              background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            OOTD
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-4 py-2 text-sm transition-colors duration-200"
                style={{
                  color: active ? "#E8A0B0" : "rgba(255,255,255,0.5)",
                }}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full"
                    style={{ background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)" }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* User / Login */}
        {user ? (
          <Link
            href="/me"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors duration-200"
            style={{
              background: isActive("/me") ? "rgba(232,160,176,0.2)" : "rgba(255,255,255,0.08)",
              color: isActive("/me") ? "#E8A0B0" : "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {user.nickname?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
          </Link>
        ) : (
          <Link
            href="/login"
            className="shrink-0 text-sm transition-colors duration-200"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            登录
          </Link>
        )}
      </div>
    </nav>
  );
}
