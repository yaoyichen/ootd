"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

const CATEGORIES = [
  { value: "TOP", label: "上衣" },
  { value: "BOTTOM", label: "下装" },
  { value: "OUTERWEAR", label: "外套" },
  { value: "ONEPIECE", label: "连体" },
  { value: "SHOES", label: "鞋子" },
  { value: "ACCESSORY", label: "配饰" },
];

const SEASONS = ["春", "夏", "秋", "冬", "四季"];
const OCCASIONS = ["日常", "上班", "约会", "运动", "正式", "出行"];

function AddItemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const initialCategory = CATEGORIES.some(c => c.value === searchParams.get("category"))
    ? searchParams.get("category")!
    : "TOP";

  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recognizing, setRecognizing] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: initialCategory,
    subcategory: "",
    color: "",
    style: "",
    season: "",
    occasion: "",
    brand: "",
    price: "",
    notes: "",
  });

  const recognizeImage = useCallback(async (dataUrl: string) => {
    setRecognizing(true);
    try {
      const res = await fetch("/api/items/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!res.ok) return;
      const result = await res.json();
      setForm((prev) => ({
        ...prev,
        name: prev.name || result.name || "",
        category: result.category || prev.category,
        color: prev.color || result.color || "",
        style: prev.style || result.style || "",
        season: prev.season || result.season || "",
        occasion: prev.occasion || result.occasion || "",
      }));
    } catch {
      // silent fail — user can fill manually
    } finally {
      setRecognizing(false);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const dataUrl = e.target.result as string;
        setPreview(dataUrl);
        recognizeImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }, [recognizeImage]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile]
  );

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!preview || !form.name || !form.category) return;
    setSaving(true);

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview, folder: "items" }),
      });
      const { path: imagePath } = await uploadRes.json();

      await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: form.price ? parseFloat(form.price) : undefined,
          imagePath,
        }),
      });

      router.push("/wardrobe");
    } catch {
      alert("保存失败，请重试");
      setSaving(false);
    }
  };

  const canSave = !!preview && !!form.name && !saving;

  return (
    <div className="relative min-h-screen" style={{ background: "#FEFCF8" }}>
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          top: "-15%", right: "-8%", width: 700, height: 700,
          background: "radial-gradient(circle, rgba(255,149,0,0.12), transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-8 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center glass"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold" style={{ color: "#1D1D1F" }}>添加单品</h1>
        </div>

        <div className="flex flex-col gap-6">
          {/* Image upload */}
          <div
            className="glass rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01]"
            style={{ aspectRatio: "4/3" }}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {preview ? (
              <div className="relative w-full h-full">
                <Image src={preview} alt="Preview" fill className="object-contain" />
                {recognizing && (
                  <div className="absolute inset-0 flex items-end justify-center pb-4" style={{ background: "linear-gradient(transparent 60%, rgba(0,0,0,0.4))" }}>
                    <span className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" style={{ animation: "spin 0.8s linear infinite" }}>
                        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="28 10" strokeLinecap="round" />
                      </svg>
                      AI 识别中...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(255,149,0,0.08)" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#FF9500" }}>
                    <path d="M12 16V8m0 0-3 3m3-3 3 3" />
                    <path d="M3 15v1a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4v-1" />
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: "#1D1D1F" }}>点击上传单品图片</p>
                <p className="text-xs" style={{ color: "#AEAEB2" }}>拖拽或点击选择，建议平铺拍摄</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {/* Form */}
          <div className="glass rounded-3xl p-6 flex flex-col gap-5">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#1D1D1F" }}>
                名称 *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="如：白色圆领T恤"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: "rgba(0,0,0,0.03)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  color: "#1D1D1F",
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#1D1D1F" }}>
                分类 *
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => updateField("category", cat.value)}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                    style={{
                      color: form.category === cat.value ? "#fff" : "#6E6E73",
                      background:
                        form.category === cat.value
                          ? "linear-gradient(135deg, #FF9500, #FFCC00)"
                          : "rgba(0,0,0,0.04)",
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color + Brand row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#1D1D1F" }}>颜色</label>
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => updateField("color", e.target.value)}
                  placeholder="如：白色"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)", color: "#1D1D1F" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#1D1D1F" }}>品牌</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => updateField("brand", e.target.value)}
                  placeholder="如：优衣库"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)", color: "#1D1D1F" }}
                />
              </div>
            </div>

            {/* Season */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#1D1D1F" }}>季节</label>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateField("season", form.season === s ? "" : s)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      color: form.season === s ? "#FF9500" : "#6E6E73",
                      background: form.season === s ? "rgba(255,149,0,0.1)" : "rgba(0,0,0,0.04)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Occasion */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#1D1D1F" }}>场合</label>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => (
                  <button
                    key={o}
                    onClick={() => updateField("occasion", form.occasion === o ? "" : o)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      color: form.occasion === o ? "#FF9500" : "#6E6E73",
                      background: form.occasion === o ? "rgba(255,149,0,0.1)" : "rgba(0,0,0,0.04)",
                    }}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#1D1D1F" }}>价格</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
                placeholder="购入价格（元）"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)", color: "#1D1D1F" }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#1D1D1F" }}>备注</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="任何补充信息..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)", color: "#1D1D1F" }}
              />
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="btn-gradient w-full py-4 rounded-full text-sm font-semibold tracking-wide"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
                </svg>
                保存中...
              </span>
            ) : (
              "保存到衣橱"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function AddItemPage() {
  return (
    <Suspense>
      <AddItemForm />
    </Suspense>
  );
}
