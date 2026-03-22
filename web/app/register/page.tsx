"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("邮箱格式不正确");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次密码不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nickname: nickname || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "注册失败");
        return;
      }

      await refresh();
      router.push("/");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#FFF8F6" }}>
      <div className="fixed top-20 right-10 w-64 h-64 rounded-full opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(242,124,136,0.4), transparent 70%)" }} />
      <div className="fixed bottom-32 left-10 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(168,120,200,0.4), transparent 70%)" }} />

      <div
        className="w-full max-w-sm rounded-3xl p-8 shadow-lg"
        style={{
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          border: "1px solid rgba(242,124,136,0.15)",
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "#2D2D2D" }}>创建账号</h1>
          <p className="text-sm mt-1" style={{ color: "#AEAEB2" }}>开始你的 OOTD 之旅</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(242,124,136,0.2)", color: "#2D2D2D" }}
          />
          <input
            type="text"
            placeholder="昵称（可选）"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(242,124,136,0.2)", color: "#2D2D2D" }}
          />
          <input
            type="password"
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(242,124,136,0.2)", color: "#2D2D2D" }}
          />
          <input
            type="password"
            placeholder="确认密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(242,124,136,0.2)", color: "#2D2D2D" }}
          />

          {error && (
            <p className="text-xs text-center" style={{ color: "#F27C88" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gradient w-full py-3 rounded-full text-sm font-semibold"
          >
            {loading ? "注册中..." : "注册"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "#AEAEB2" }}>
          已有账号？{" "}
          <Link href="/login" className="font-semibold" style={{ color: "#F27C88" }}>
            去登录
          </Link>
        </p>
      </div>
    </div>
  );
}
