"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "首页",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#F27C88" : "none"} stroke={active ? "#F27C88" : "#AEAEB2"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" stroke={active ? "#fff" : "#AEAEB2"} />
      </svg>
    ),
  },
  {
    href: "/wardrobe",
    label: "衣橱",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#F27C88" : "#AEAEB2"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="2" width="18" height="20" rx="2" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <path d="M9 10h-1" />
        <path d="M16 10h-1" />
      </svg>
    ),
  },
  {
    href: "/tryon",
    label: "试穿",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#F27C88" : "#AEAEB2"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 0-4 4v2h8V6a4 4 0 0 0-4-4z" />
        <path d="M4 10l-2 8h20l-2-8" />
        <path d="M12 14v4" />
      </svg>
    ),
  },
  {
    href: "/recommendations",
    label: "推荐",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#F27C88" : "none"} stroke={active ? "#F27C88" : "#AEAEB2"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
      </svg>
    ),
  },
  {
    href: "/showcase",
    label: "广场",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#F27C88" : "#AEAEB2"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" fill={active ? "rgba(242,124,136,0.2)" : "none"} />
        <rect x="14" y="3" width="7" height="7" rx="1.5" fill={active ? "rgba(242,124,136,0.2)" : "none"} />
        <rect x="3" y="14" width="7" height="7" rx="1.5" fill={active ? "rgba(242,124,136,0.2)" : "none"} />
        <rect x="14" y="14" width="7" height="7" rx="1.5" fill={active ? "rgba(242,124,136,0.2)" : "none"} />
      </svg>
    ),
  },
  {
    href: "/me",
    label: "我的",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#F27C88" : "#AEAEB2"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
      </svg>
    ),
  },
];

export function NavBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/business")) return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/me") return pathname === "/favorites" || pathname === "/persons" || pathname === "/me";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(255,248,246,0.85)",
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        borderTop: "1px solid rgba(242,124,136,0.1)",
      }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const href = item.href === "/me" ? "/favorites" : item.href;
          return (
            <Link
              key={item.href}
              href={href}
              className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition-all duration-200"
              style={{
                background: active ? "rgba(242,124,136,0.1)" : "transparent",
              }}
            >
              {item.icon(active)}
              <span
                className="text-[10px] font-semibold"
                style={{
                  color: active ? "#F27C88" : "#AEAEB2",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area spacer for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
