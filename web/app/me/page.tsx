"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../components/AuthProvider";
import { PageShell } from "../components/PageShell";

interface Stats {
  itemCount: number;
  outfitCount: number;
  favoriteCount: number;
  personCount: number;
}

export default function MePage() {
  const { user, loading, logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/me/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.itemCount !== undefined) setStats(data);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <PageShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  const STAT_ITEMS = [
    { label: "衣橱", value: stats?.itemCount ?? "-", href: "/wardrobe" },
    { label: "穿搭", value: stats?.outfitCount ?? "-", href: "/favorites" },
    { label: "收藏", value: stats?.favoriteCount ?? "-", href: "/favorites" },
    { label: "人像", value: stats?.personCount ?? "-", href: "/persons" },
  ];

  return (
    <PageShell>
      <div className="min-h-screen px-4 pt-6 pb-24">
        <div className="max-w-lg mx-auto space-y-4">
          {/* User info card */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #E8A0B0, #C084FC)" }}
              >
                {user?.nickname?.[0] || user?.email?.[0] || "U"}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate text-primary">
                  {user?.nickname || "未设置昵称"}
                </h2>
                <p className="text-xs truncate text-muted">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="glass rounded-2xl p-4">
            <div className="grid grid-cols-4 gap-2">
              {STAT_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl transition-colors hover:bg-white/[0.04]"
                >
                  <span className="text-xl font-bold text-primary">
                    {item.value}
                  </span>
                  <span className="text-[11px] text-secondary">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Menu items */}
          <div className="glass rounded-2xl overflow-hidden">
            <MenuItem href="/favorites" label="我的最爱" icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            } />
            <MenuItem href="/persons" label="我的形象" icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
              </svg>
            } />
            <MenuItem href="/ootd" label="穿搭打卡" icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            } />
            <MenuItem href="/wardrobe" label="我的衣橱" icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="2" width="18" height="20" rx="2" />
                <line x1="12" y1="2" x2="12" y2="22" />
              </svg>
            } />
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-colors glass text-accent"
          >
            退出
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function MenuItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.04]"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      {icon}
      <span className="text-sm font-medium flex-1 text-primary">{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}
