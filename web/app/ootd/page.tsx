"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "../components/ToastProvider";
import { PageShell } from "../components/PageShell";
import { CalendarGrid, type CheckinDay } from "../components/CalendarGrid";
import { ComparisonModal } from "../components/ComparisonModal";

interface OutfitOption {
  id: string;
  resultImagePath: string;
  score: number | null;
  topItemId: string | null;
  bottomItemId: string | null;
}

export default function OotdPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [checkins, setCheckins] = useState<CheckinDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckin, setSelectedCheckin] = useState<CheckinDay | null>(null);

  // For new checkin flow
  const [outfits, setOutfits] = useState<OutfitOption[]>([]);
  const [showOutfitPicker, setShowOutfitPicker] = useState(false);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const toast = useToast();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const fetchCheckins = useCallback(async () => {
    setLoading(true);
    try {
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;
      const res = await fetch(`/api/ootd?month=${monthStr}`);
      const data = await res.json();
      if (Array.isArray(data)) setCheckins(data.map((c: { id: string; createdAt: string; realPhotoPath: string; outfitId?: string; outfit?: { id: string; resultImagePath: string; score: number | null } }) => ({
          id: c.id,
          date: c.createdAt,
          realPhotoPath: c.realPhotoPath,
          outfitId: c.outfitId,
          outfit: c.outfit,
        })));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  useEffect(() => {
    fetch("/api/outfits?favorites=true")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setOutfits(data.filter((o: OutfitOption) => o.resultImagePath));
      })
      .catch(() => {});
  }, []);

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleNewCheckin = () => {
    if (outfits.length === 0) {
      toast.info("还没有收藏的穿搭，先去试穿收藏一套吧~");
      return;
    }
    setShowOutfitPicker(true);
  };

  const handleSelectOutfitAndCapture = (outfitId: string) => {
    setSelectedOutfitId(outfitId);
    setShowOutfitPicker(false);
    // Trigger file input
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const base64 = await fileToBase64(file);
        const res = await fetch("/api/ootd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, outfitId }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "打卡失败");
          return;
        }
        toast.success("打卡成功！");
        fetchCheckins();
        // Show comparison
        const data = await res.json();
        const outfit = outfits.find((o) => o.id === outfitId);
        if (outfit && data.realPhotoPath) {
          setSelectedCheckin({
            id: data.id,
            date: data.createdAt,
            realPhotoPath: data.realPhotoPath,
            outfitId,
            outfit: { resultImagePath: outfit.resultImagePath, score: outfit.score },
          });
        }
      } catch {
        toast.error("网络错误");
      } finally {
        setUploading(false);
        setSelectedOutfitId(null);
      }
    };
    input.click();
  };

  const handlePublishCheckin = async () => {
    if (!selectedCheckin?.outfitId) return;
    try {
      const res = await fetch("/api/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outfitId: selectedCheckin.outfitId,
          realPhotoPath: selectedCheckin.realPhotoPath,
          caption: "真实穿搭打卡 ✨",
        }),
      });
      if (res.ok) {
        toast.success("已分享到广场");
      } else {
        const data = await res.json();
        toast.error(data.error || "分享失败");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  const handleDeleteCheckin = async (id: string) => {
    toast.confirm({
      message: "确认删除这条打卡记录？",
      onConfirm: async () => {
        try {
          await fetch(`/api/ootd/${id}`, { method: "DELETE" });
          setCheckins((prev) => prev.filter((c) => c.id !== id));
          setSelectedCheckin(null);
          toast.success("已删除");
        } catch {
          toast.error("删除失败");
        }
      },
    });
  };

  return (
    <PageShell>
      {/* Outfit Picker Modal */}
      {showOutfitPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowOutfitPicker(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden max-h-[80vh] overflow-y-auto"
            style={{ background: "rgba(20,20,22,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <h3 className="text-base font-semibold text-primary mb-1">选择穿搭</h3>
              <p className="text-xs text-muted mb-4">选一套今天穿的 look，然后拍照对比</p>
              <div className="grid grid-cols-3 gap-3">
                {outfits.map((outfit) => (
                  <button
                    key={outfit.id}
                    onClick={() => handleSelectOutfitAndCapture(outfit.id)}
                    className="relative rounded-2xl overflow-hidden transition-all hover:ring-2 hover:ring-[rgba(232,160,176,0.5)]"
                    style={{ aspectRatio: "3/4" }}
                  >
                    <img
                      src={outfit.resultImagePath}
                      alt="穿搭"
                      className="w-full h-full object-cover"
                    />
                    {outfit.score != null && (
                      <div
                        className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                        style={{
                          background: outfit.score >= 80 ? "rgba(52,199,89,0.85)" : "rgba(232,160,176,0.85)",
                        }}
                      >
                        {outfit.score}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {selectedCheckin?.outfit && (
        <ComparisonModal
          isOpen={!!selectedCheckin}
          onClose={() => setSelectedCheckin(null)}
          aiImage={selectedCheckin.outfit.resultImagePath}
          realImage={selectedCheckin.realPhotoPath}
          score={selectedCheckin.outfit.score}
          onPublish={handlePublishCheckin}
          onDelete={() => handleDeleteCheckin(selectedCheckin.id)}
        />
      )}

      {/* Uploading overlay */}
      {uploading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="glass rounded-3xl p-8 flex flex-col items-center gap-3">
            <svg className="w-10 h-10" viewBox="0 0 48 48" style={{ animation: "spin 1s linear infinite" }}>
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(232,160,176,0.12)" strokeWidth="3" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="#E8A0B0" strokeWidth="3" strokeLinecap="round" strokeDasharray="90 126" />
            </svg>
            <p className="text-sm font-medium text-primary">上传中...</p>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
            DAILY OOTD
          </p>
          <h1 className="text-2xl font-light text-primary">
            <span className="gradient-text">每日穿搭打卡</span>
          </h1>
          <p className="mt-2 text-sm text-secondary">
            记录你的真实穿搭，与 AI 试穿对比
          </p>
        </div>

        {/* Today's checkin CTA */}
        <button
          onClick={handleNewCheckin}
          className="w-full mb-6 py-4 rounded-2xl text-sm font-semibold text-white transition-all hover:shadow-[0_0_30px_rgba(232,160,176,0.3)]"
          style={{
            background: "linear-gradient(135deg, rgba(200,120,140,0.9), rgba(180,140,200,0.9))",
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            今日打卡
          </span>
        </button>

        {/* Calendar */}
        {loading ? (
          <div className="glass rounded-2xl p-6 animate-pulse">
            <div className="h-6 rounded w-1/3 mx-auto mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          </div>
        ) : (
          <CalendarGrid
            year={year}
            month={month}
            checkins={checkins}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onDayClick={(checkin) => setSelectedCheckin(checkin)}
            today={todayStr}
          />
        )}

        {/* Stats */}
        <div className="glass rounded-2xl p-4 mt-4">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-xl font-bold text-primary">{checkins.length}</p>
              <p className="text-[11px] text-muted">本月打卡</p>
            </div>
            <div className="w-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div>
              <p className="text-xl font-bold text-primary">
                {checkins.length > 0
                  ? Math.round(
                      (new Set(checkins.map((c) => c.date.slice(0, 10))).size /
                        new Date(year, month, 0).getDate()) *
                        100
                    )
                  : 0}%
              </p>
              <p className="text-[11px] text-muted">打卡率</p>
            </div>
            <div className="w-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div>
              <p className="text-xl font-bold text-primary">
                {consecutiveDays(checkins, todayStr)}
              </p>
              <p className="text-[11px] text-muted">连续天数</p>
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Compress if too large
      if (file.size > 2 * 1024 * 1024) {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxW = 1200;
          const scale = Math.min(1, maxW / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = reject;
        img.src = result;
      } else {
        resolve(result);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function consecutiveDays(checkins: CheckinDay[], todayStr: string): number {
  const dates = new Set(checkins.map((c) => c.date.slice(0, 10)));
  let count = 0;
  const d = new Date(todayStr);
  while (dates.has(formatDate(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
