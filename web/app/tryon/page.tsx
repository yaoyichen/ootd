"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

type Status = "idle" | "processing" | "completed" | "failed";

interface ItemData {
  id: string;
  name: string;
  category: string;
  imagePath: string;
}

interface PersonData {
  id: string;
  name: string;
  imagePath: string;
  isDefault: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  TOP: "上衣",
  BOTTOM: "下装",
  OUTERWEAR: "外套",
  ONEPIECE: "连体",
  SHOES: "鞋子",
  ACCESSORY: "配饰",
};

function Picker({
  title,
  items,
  selected,
  onSelect,
  onClose,
}: {
  title: string;
  items: { id: string; name: string; imagePath: string; tag?: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className="w-full max-w-lg mx-4 mb-4 sm:mb-0 rounded-3xl p-6 flex flex-col gap-4 max-h-[80vh]"
        style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: "#1D1D1F" }}>{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.05)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm py-10 text-center" style={{ color: "#AEAEB2" }}>
            暂无可选项，请先添加
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => { onSelect(item.id); onClose(); }}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  border: selected === item.id ? "2px solid #FF9500" : "2px solid transparent",
                  boxShadow: selected === item.id ? "0 0 0 2px rgba(255,149,0,0.2)" : "none",
                }}
              >
                <div className="relative" style={{ aspectRatio: "3/4" }}>
                  <Image src={item.imagePath} alt={item.name} fill className="object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate" style={{ color: "#1D1D1F" }}>{item.name}</p>
                  {item.tag && (
                    <span className="text-[10px]" style={{ color: "#FF9500" }}>{item.tag}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectCard({
  label,
  hint,
  selectedImage,
  selectedName,
  onClick,
}: {
  label: string;
  hint: string;
  selectedImage: string | null;
  selectedName: string | null;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold" style={{ color: "#1D1D1F" }}>{label}</span>
      <button
        onClick={onClick}
        className="glass relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
        style={{ aspectRatio: "3/4" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,149,0,0.1)";
          e.currentTarget.style.borderColor = "rgba(255,149,0,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.04)";
          e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
        }}
      >
        {selectedImage ? (
          <>
            <Image src={selectedImage} alt={label} fill className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent" />
            <span
              className="absolute bottom-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: "#fff", background: "rgba(255,149,0,0.7)" }}
            >
              {selectedName}
            </span>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,149,0,0.08)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#FF9500" }}>
                <path d="M12 5v14m-7-7h14" />
              </svg>
            </div>
            <p className="text-xs" style={{ color: "#AEAEB2" }}>{hint}</p>
          </div>
        )}
      </button>
    </div>
  );
}

export default function TryonPage() {
  const [persons, setPersons] = useState<PersonData[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedTop, setSelectedTop] = useState<string | null>(null);
  const [selectedBottom, setSelectedBottom] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<"person" | "top" | "bottom" | null>(null);

  useEffect(() => {
    fetch("/api/persons").then((r) => r.json()).then((data) => {
      setPersons(data);
      const def = data.find((p: PersonData) => p.isDefault);
      if (def) setSelectedPerson(def.id);
    });
    fetch("/api/items").then((r) => r.json()).then(setItems);
  }, []);

  const getPerson = (id: string | null) => persons.find((p) => p.id === id);
  const getItem = (id: string | null) => items.find((i) => i.id === id);

  const topItems = items.filter((i) => i.category === "TOP" || i.category === "OUTERWEAR");
  const bottomItems = items.filter((i) => i.category === "BOTTOM" || i.category === "ONEPIECE");

  const handleGenerate = useCallback(async () => {
    const person = getPerson(selectedPerson);
    const top = getItem(selectedTop);
    const bottom = getItem(selectedBottom);

    if (!person || (!top && !bottom)) return;

    setStatus("processing");
    setError(null);
    setResultImage(null);

    try {
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_image: person.imagePath,
          top_garment_image: top?.imagePath || null,
          bottom_garment_image: bottom?.imagePath || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus("failed");
        setError(data.error || "生成失败，请重试");
        return;
      }

      setResultImage(data.image_url);
      setStatus("completed");
    } catch {
      setStatus("failed");
      setError("网络错误，请重试");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPerson, selectedTop, selectedBottom, persons, items]);

  const handleReset = () => {
    setStatus("idle");
    setResultImage(null);
    setError(null);
  };

  const isProcessing = status === "processing";
  const hasGarment = !!selectedTop || !!selectedBottom;
  const canGenerate = !!selectedPerson && hasGarment && !isProcessing;

  const personData = getPerson(selectedPerson);
  const topData = getItem(selectedTop);
  const bottomData = getItem(selectedBottom);

  return (
    <div className="relative min-h-screen" style={{ background: "#FEFCF8" }}>
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          top: "-15%", right: "-8%", width: 700, height: 700,
          background: "radial-gradient(circle, rgba(255,149,0,0.18), transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          bottom: "-10%", left: "-5%", width: 550, height: 550,
          background: "radial-gradient(circle, rgba(255,204,0,0.15), transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Picker modals */}
      {picker === "person" && (
        <Picker
          title="选择人像"
          items={persons.map((p) => ({
            id: p.id, name: p.name, imagePath: p.imagePath,
            tag: p.isDefault ? "默认" : undefined,
          }))}
          selected={selectedPerson}
          onSelect={setSelectedPerson}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "top" && (
        <Picker
          title="选择上衣"
          items={topItems.map((i) => ({
            id: i.id, name: i.name, imagePath: i.imagePath,
            tag: CATEGORY_LABELS[i.category],
          }))}
          selected={selectedTop}
          onSelect={setSelectedTop}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "bottom" && (
        <Picker
          title="选择下装"
          items={bottomItems.map((i) => ({
            id: i.id, name: i.name, imagePath: i.imagePath,
            tag: CATEGORY_LABELS[i.category],
          }))}
          selected={selectedBottom}
          onSelect={setSelectedBottom}
          onClose={() => setPicker(null)}
        />
      )}

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-20">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "#1D1D1F" }}>
            <span
              style={{
                background: "linear-gradient(135deg, #FF9500, #FFCC00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI
            </span>
            {" "}虚拟试穿
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#6E6E73" }}>
            从衣橱中选择服装，即刻预览穿搭效果
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 items-start">
          {/* Left: Selection */}
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-3">
              <SelectCard
                label="人像"
                hint="从人像库选择"
                selectedImage={personData?.imagePath ?? null}
                selectedName={personData?.name ?? null}
                onClick={() => setPicker("person")}
              />
              <SelectCard
                label="上衣"
                hint="从衣橱选择"
                selectedImage={topData?.imagePath ?? null}
                selectedName={topData?.name ?? null}
                onClick={() => setPicker("top")}
              />
              <SelectCard
                label="下装"
                hint="从衣橱选择"
                selectedImage={bottomData?.imagePath ?? null}
                selectedName={bottomData?.name ?? null}
                onClick={() => setPicker("bottom")}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="btn-gradient w-full py-4 rounded-full text-sm font-semibold tracking-wide"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
                  </svg>
                  AI 生成中，通常需要 10-30 秒…
                </span>
              ) : (
                "生成试穿效果"
              )}
            </button>

            {error && (
              <div
                className="p-3.5 rounded-2xl text-sm font-medium"
                style={{
                  background: "rgba(255, 59, 48, 0.06)",
                  border: "1px solid rgba(255, 59, 48, 0.12)",
                  color: "#FF3B30",
                }}
              >
                {error}
              </div>
            )}

            {!persons.length && (
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-sm" style={{ color: "#6E6E73" }}>
                  还没有人像，请先到
                  <a href="/persons" className="font-semibold" style={{ color: "#FF9500" }}> 人像管理 </a>
                  上传
                </p>
              </div>
            )}
            {!items.length && (
              <div className="glass rounded-2xl p-5 text-center">
                <p className="text-sm" style={{ color: "#6E6E73" }}>
                  衣橱是空的，请先到
                  <a href="/wardrobe/add" className="font-semibold" style={{ color: "#FF9500" }}> 添加单品 </a>
                </p>
              </div>
            )}
          </div>

          {/* Right: Result */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold" style={{ color: "#1D1D1F" }}>效果预览</span>
            <div
              className="glass relative rounded-3xl overflow-hidden flex items-center justify-center"
              style={{ aspectRatio: "3/4" }}
            >
              {resultImage ? (
                <div className="absolute inset-0 animate-fade-in-up">
                  <Image src={resultImage} alt="试穿效果" fill className="object-cover" unoptimized />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 inset-x-4 flex gap-2.5 justify-end">
                    <a
                      href={resultImage}
                      download="ootd-tryon.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2 rounded-full text-xs font-semibold text-white"
                      style={{
                        background: "linear-gradient(135deg, #FF9500, #FFCC00)",
                        boxShadow: "0 4px 16px rgba(255,149,0,0.3)",
                      }}
                    >
                      保存图片
                    </a>
                    <button
                      onClick={handleReset}
                      className="px-5 py-2 rounded-full text-xs font-semibold text-white transition-colors"
                      style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(12px)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
                    >
                      重新生成
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5">
                  {isProcessing ? (
                    <>
                      <div className="relative w-12 h-12 animate-pulse-glow rounded-full">
                        <svg className="w-12 h-12" viewBox="0 0 48 48" style={{ animation: "spin 1s linear infinite" }}>
                          <defs>
                            <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FF9500" />
                              <stop offset="100%" stopColor="#FFCC00" />
                            </linearGradient>
                          </defs>
                          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,149,0,0.12)" strokeWidth="3" />
                          <circle cx="24" cy="24" r="20" fill="none" stroke="url(#sg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="90 126" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium" style={{ color: "#6E6E73" }}>
                        AI 正在生成，请稍候…
                      </p>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-16 h-16 rounded-3xl flex items-center justify-center"
                        style={{ background: "rgba(255,149,0,0.08)" }}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="1" strokeLinecap="round" style={{ stroke: "#FF9500" }}>
                          <rect x="3" y="3" width="18" height="18" rx="4" />
                          <circle cx="12" cy="9" r="3" />
                          <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium" style={{ color: "#6E6E73" }}>穿搭效果将在这里展示</p>
                        <p className="text-xs mt-1" style={{ color: "#AEAEB2" }}>选择人像与服装后点击生成</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
