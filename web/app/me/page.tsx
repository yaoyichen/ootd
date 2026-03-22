"use client";

import Link from "next/link";
import { useAuth } from "../components/AuthProvider";

export default function MePage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFF8F6" }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#F27C88", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-24" style={{ background: "#FFF8F6" }}>
      <div className="max-w-lg mx-auto space-y-4">
        {/* User info card */}
        <div
          className="rounded-2xl p-5 shadow-sm"
          style={{
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(242,124,136,0.12)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #F27C88, #C084FC)" }}
            >
              {user?.nickname?.[0] || user?.email?.[0] || "U"}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold truncate" style={{ color: "#2D2D2D" }}>
                {user?.nickname || "未设置昵称"}
              </h2>
              <p className="text-xs truncate" style={{ color: "#AEAEB2" }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(242,124,136,0.12)",
          }}
        >
          <MenuItem href="/favorites" label="我的收藏" icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F27C88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          } />
          <MenuItem href="/persons" label="人像管理" icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F27C88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
            </svg>
          } />
          <MenuItem href="/wardrobe" label="我的衣橱" icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F27C88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="2" width="18" height="20" rx="2" />
              <line x1="12" y1="2" x2="12" y2="22" />
            </svg>
          } />
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full py-3 rounded-2xl text-sm font-semibold transition-colors"
          style={{
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(242,124,136,0.12)",
            color: "#F27C88",
          }}
        >
          退出登录
        </button>
      </div>
    </div>
  );
}

function MenuItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-5 py-3.5 transition-colors"
      style={{ borderBottom: "1px solid rgba(242,124,136,0.06)" }}
    >
      {icon}
      <span className="text-sm font-medium flex-1" style={{ color: "#2D2D2D" }}>{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}
