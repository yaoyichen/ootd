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
    if (!emailRegex.test(email)) { setError("邮箱格式不正确"); return; }
    if (password.length < 6) { setError("密码至少 6 位"); return; }
    if (password !== confirmPassword) { setError("两次密码不一致"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nickname: nickname || undefined }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "注册失败"); return; }

      await refresh();
      router.push("/");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3.5 rounded-xl text-sm outline-none bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 focus:border-white/20 transition-colors";

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="fixed inset-0" style={{
        background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(200,120,140,0.08), transparent)",
      }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-12">
          <h1
            className="text-4xl font-extralight tracking-[0.15em] mb-3"
            style={{
              background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            OOTD
          </h1>
          <p className="text-[11px] tracking-[0.2em] uppercase text-white/25 font-light">
            Dress to Impress
          </p>
        </div>

        <div className="rounded-2xl p-8 border border-white/[0.06] bg-white/[0.02]" style={{ backdropFilter: "blur(40px)" }}>
          <div className="text-center mb-8">
            <h2 className="text-lg font-light text-white/90">创建账号</h2>
            <p className="text-xs text-white/30 mt-1 font-light">开始你的 OOTD 之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
            <input type="text" placeholder="昵称（可选）" value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputCls} />
            <input type="password" placeholder="密码（至少 6 位）" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputCls} />
            <input type="password" placeholder="确认密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputCls} />

            {error && <p className="text-xs text-center text-red-400/80">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-[0_0_30px_rgba(200,120,140,0.25)] disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, rgba(200,120,140,0.9), rgba(180,140,200,0.9))" }}
            >
              {loading ? "注册中..." : "注册"}
            </button>
          </form>

          <p className="text-center text-xs mt-8 text-white/25 font-light">
            已有账号？{" "}
            <Link href="/login" className="text-white/50 hover:text-white/70 transition-colors">去登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
