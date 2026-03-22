"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useToast } from "../../components/ToastProvider";
import { useModalKeyboard } from "../../hooks/useModalKeyboard";
import { PageShell } from "../../components/PageShell";

const CATEGORIES = [
  { value: "TOP", label: "上衣" },
  { value: "BOTTOM", label: "下装" },
  { value: "OUTERWEAR", label: "外套" },
  { value: "ONEPIECE", label: "连体" },
  { value: "SHOES", label: "鞋子" },
  { value: "ACCESSORY", label: "配饰" },
];

const MATERIALS = ["棉", "牛仔", "丝绸", "羊毛", "涤纶", "皮革", "麻", "雪纺", "针织", "灯芯绒"];
const FITS = ["修身", "宽松", "常规", "oversize"];
const PATTERNS = ["纯色", "条纹", "格纹", "印花", "碎花", "波点", "拼接"];
const THICKNESSES = ["薄", "适中", "厚"];
const SEASONS = ["春", "夏", "秋", "冬", "四季"];
const OCCASIONS = ["日常", "上班", "约会", "运动", "正式", "出行"];

function AddItemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const initialCategory = CATEGORIES.some(c => c.value === searchParams.get("category"))
    ? searchParams.get("category")!
    : "TOP";

  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [imageHash, setImageHash] = useState<string | null>(null);
  const [duplicateItem, setDuplicateItem] = useState<{
    id: string; name: string; category: string; color?: string; imagePath: string;
  } | null>(null);
  const toast = useToast();

  useModalKeyboard({
    isOpen: !!duplicateItem,
    onClose: () => setDuplicateItem(null),
  });

  // Taobao import states
  const [inputMode, setInputMode] = useState<"upload" | "taobao">("upload");
  const [taobaoInput, setTaobaoInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: initialCategory,
    subcategory: "",
    color: "",
    style: "",
    season: "",
    occasion: "",
    material: "",
    fit: "",
    pattern: "",
    thickness: "",
    description: "",
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
        material: prev.material || result.material || "",
        fit: prev.fit || result.fit || "",
        pattern: prev.pattern || result.pattern || "",
        thickness: prev.thickness || result.thickness || "",
      }));
      // Auto-advance to step 2 after recognition
      setStep(2);
    } catch {
      // silent fail — user can fill manually
    } finally {
      setRecognizing(false);
    }
  }, []);

  const computeHash = useCallback(async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }, []);

  const computeHashFromBase64 = useCallback(async (dataUrl: string): Promise<string> => {
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes.buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }, []);

  const handleFile = useCallback((file: File) => {
    computeHash(file).then(setImageHash);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const dataUrl = e.target.result as string;
        setPreview(dataUrl);
        recognizeImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }, [recognizeImage, computeHash]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile]
  );

  // Global paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleFile]);

  const handleTaobaoImport = useCallback(async () => {
    if (!taobaoInput.trim()) return;
    setImporting(true);
    setImportError(null);

    try {
      const res = await fetch("/api/import/taobao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: taobaoInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "导入失败");
        return;
      }

      setPreview(data.image);
      const hash = await computeHashFromBase64(data.image);
      setImageHash(hash);

      const r = data.recognition ?? {};
      setForm((prev) => ({
        ...prev,
        name: r.name || data.title || prev.name,
        category: r.category || prev.category,
        color: r.color || prev.color,
        style: r.style || prev.style,
        season: r.season || prev.season,
        occasion: r.occasion || prev.occasion,
        material: r.material || prev.material,
        fit: r.fit || prev.fit,
        pattern: r.pattern || prev.pattern,
        thickness: r.thickness || prev.thickness,
      }));
      setStep(2);
    } catch {
      setImportError("网络错误，请重试");
    } finally {
      setImporting(false);
    }
  }, [taobaoInput, computeHashFromBase64]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const doSave = async () => {
    if (!preview || !form.name || !form.category) return;
    setSaving(true);

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview, folder: "items" }),
      });
      const { path: imagePath, processedImage, originalPath } = await uploadRes.json();

      const itemRes = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          imagePath,
          originalImagePath: originalPath,
          imageHash: imageHash,
        }),
      });
      if (!itemRes.ok) {
        const err = await itemRes.json().catch(() => ({}));
        throw new Error(err.error || "创建单品失败");
      }

      if (processedImage) {
        setProcessedPreview(processedImage);
        setSaveDone(true);
        await new Promise((r) => setTimeout(r, 2000));
      }

      router.push("/wardrobe");
    } catch {
      toast.error("保存失败，请重试");
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!preview || !form.name || !form.category) return;

    if (imageHash) {
      try {
        const res = await fetch("/api/items/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageHash }),
        });
        const data = await res.json();
        if (data.duplicate) {
          setDuplicateItem(data.item);
          return;
        }
      } catch {
        // Check failed, proceed with save
      }
    }

    doSave();
  };

  const canSave = !!preview && !!form.name && !saving;

  return (
    <PageShell>
      <main className="max-w-2xl mx-auto px-6 pt-8 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center glass touch-target"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-primary">添加单品</h1>
        </div>

        {/* 3-dot progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  s === step ? "w-6 bg-accent" : s < step ? "bg-accent" : "bg-[rgba(255,255,255,0.1)]"
                }`}
                style={s === step ? { background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)" } : s < step ? { background: "#E8A0B0" } : {}}
              />
              {s < 3 && <div className="w-8 h-0.5" style={{ background: s < step ? "#E8A0B0" : "rgba(255,255,255,0.08)" }} />}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          {/* ===== STEP 1: Upload ===== */}
          {step === 1 && (
            <>
              {/* Input mode tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setInputMode("upload")}
                  className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    inputMode === "upload" ? "chip-active" : "chip-inactive"
                  }`}
                >
                  拍照上传
                </button>
                <button
                  onClick={() => setInputMode("taobao")}
                  className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    inputMode === "taobao" ? "chip-active" : "chip-inactive"
                  }`}
                >
                  淘宝导入
                </button>
              </div>

              {saveDone && processedPreview ? (
                <div className="glass rounded-3xl overflow-hidden p-4">
                  <div className="flex gap-3" style={{ aspectRatio: "4/3" }}>
                    <div className="relative flex-1 rounded-2xl overflow-hidden bg-subtle">
                      <Image src={preview!} alt="原图" fill className="object-contain" />
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-medium text-white" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}>
                        原图
                      </span>
                    </div>
                    <div className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m-6-6 6 6-6 6" />
                      </svg>
                    </div>
                    <div className="relative flex-1 rounded-2xl overflow-hidden" style={{ background: "repeating-conic-gradient(rgba(255,255,255,0.06) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px" }}>
                      <Image src={processedPreview} alt="去背景" fill className="object-contain" />
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-medium text-white whitespace-nowrap" style={{ background: "rgba(232,160,176,0.8)", backdropFilter: "blur(8px)" }}>
                        背景已去除
                      </span>
                    </div>
                  </div>
                </div>
              ) : inputMode === "taobao" && !preview ? (
                <div className="glass rounded-3xl overflow-hidden p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-primary">
                        粘贴淘口令或商品链接
                      </label>
                      <textarea
                        value={taobaoInput}
                        onChange={(e) => { setTaobaoInput(e.target.value); setImportError(null); }}
                        placeholder={"如：￥abc￥ 或 https://m.tb.cn/xxx"}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none bg-subtle text-primary"
                        style={{ border: `1px solid ${importError ? "rgba(255,59,48,0.3)" : "rgba(255,255,255,0.06)"}` }}
                      />
                      {importError && <p className="text-xs" style={{ color: "#FF3B30" }}>{importError}</p>}
                    </div>
                    <button
                      onClick={handleTaobaoImport}
                      disabled={importing || !taobaoInput.trim()}
                      className={`w-full py-3 rounded-full text-sm font-semibold transition-colors ${
                        importing || !taobaoInput.trim() ? "text-muted bg-subtle" : "btn-gradient"
                      }`}
                    >
                      {importing ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16">
                            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="28 10" strokeLinecap="round" />
                          </svg>
                          正在导入...
                        </span>
                      ) : "导入商品"}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="glass rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01]"
                  style={{ aspectRatio: "4/3" }}
                  tabIndex={0}
                  onClick={() => inputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {preview ? (
                    <div className="relative w-full h-full">
                      <Image src={preview} alt="Preview" fill className="object-contain" />
                      {(recognizing || importing) && (
                        <div className="absolute inset-0 flex items-end justify-center pb-4" style={{ background: "linear-gradient(transparent 60%, rgba(0,0,0,0.4))" }}>
                          <span className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 16 16">
                              <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="28 10" strokeLinecap="round" />
                            </svg>
                            AI 识别中...
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 16V8m0 0-3 3m3-3 3 3" />
                          <path d="M3 15v1a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4v-1" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-primary">点击上传单品图片</p>
                      <p className="text-xs text-muted">点击选择 / 拖拽 / 粘贴图片</p>
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
              )}

              {/* Manual next if they have a preview but recognition hasn't auto-advanced */}
              {preview && !recognizing && step === 1 && (
                <button
                  onClick={() => setStep(2)}
                  className="btn-gradient w-full py-3 rounded-full text-sm font-semibold"
                >
                  继续
                </button>
              )}
            </>
          )}

          {/* ===== STEP 2: Basic Info ===== */}
          {step === 2 && (
            <div className="glass rounded-3xl p-6 flex flex-col gap-5">
              {/* Preview thumbnail */}
              {preview && (
                <div className="flex justify-center">
                  <div className="relative w-24 h-32 rounded-xl overflow-hidden bg-subtle">
                    <Image src={preview} alt="Preview" fill className="object-contain" />
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-primary">名称 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="如：白色圆领T恤"
                  className="input-base"
                  autoFocus
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-primary">分类 *</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => updateField("category", cat.value)}
                      className={`chip ${form.category === cat.value ? "chip-active" : "chip-inactive"}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-primary">颜色</label>
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => updateField("color", e.target.value)}
                  placeholder="如：白色"
                  className="input-base"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Skip details, go straight to save
                    handleSubmit();
                  }}
                  disabled={!canSave}
                  className="flex-1 py-3 rounded-full text-sm font-semibold chip-inactive"
                >
                  跳过详情直接保存
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-full text-sm font-semibold btn-gradient"
                >
                  继续填写
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 3: Details ===== */}
          {step === 3 && (
            <div className="glass rounded-3xl p-6 flex flex-col gap-5">
              {/* Material */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-primary">材质</label>
                <div className="flex flex-wrap gap-2">
                  {MATERIALS.map((m) => (
                    <button
                      key={m}
                      onClick={() => updateField("material", form.material === m ? "" : m)}
                      className={`chip chip-sm ${form.material === m ? "chip-outline-active" : "chip-outline-inactive"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Season */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-primary">季节</label>
                <div className="flex flex-wrap gap-2">
                  {SEASONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateField("season", form.season === s ? "" : s)}
                      className={`chip chip-sm ${form.season === s ? "chip-outline-active" : "chip-outline-inactive"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Occasion */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-primary">场合</label>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((o) => (
                    <button
                      key={o}
                      onClick={() => updateField("occasion", form.occasion === o ? "" : o)}
                      className={`chip chip-sm ${form.occasion === o ? "chip-outline-active" : "chip-outline-inactive"}`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fit */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-primary">版型</label>
                <div className="flex flex-wrap gap-2">
                  {FITS.map((f) => (
                    <button
                      key={f}
                      onClick={() => updateField("fit", form.fit === f ? "" : f)}
                      className={`chip chip-sm ${form.fit === f ? "chip-outline-active" : "chip-outline-inactive"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pattern */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-primary">图案</label>
                <div className="flex flex-wrap gap-2">
                  {PATTERNS.map((p) => (
                    <button
                      key={p}
                      onClick={() => updateField("pattern", form.pattern === p ? "" : p)}
                      className={`chip chip-sm ${form.pattern === p ? "chip-outline-active" : "chip-outline-inactive"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thickness */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-primary">厚度</label>
                <div className="flex flex-wrap gap-2">
                  {THICKNESSES.map((t) => (
                    <button
                      key={t}
                      onClick={() => updateField("thickness", form.thickness === t ? "" : t)}
                      className={`chip chip-sm ${form.thickness === t ? "chip-outline-active" : "chip-outline-inactive"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-primary">描述</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="如：V领开衫，金属纽扣"
                  className="input-base"
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSubmit}
                disabled={!canSave}
                className="btn-gradient w-full py-4 rounded-full text-sm font-semibold tracking-wide"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
                    </svg>
                    去背景 & 保存中...
                  </span>
                ) : "保存到衣橱"}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Duplicate detection dialog */}
      {duplicateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="glass rounded-3xl p-6 mx-6 max-w-sm w-full flex flex-col items-center gap-4" style={{ background: "rgba(20,20,22,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(232,160,176,0.1)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8A0B0" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4m0 4h.01" />
              </svg>
            </div>
            <p className="text-base font-semibold text-center text-primary">
              这件衣服好像已经在衣橱里了
            </p>
            <div className="flex items-center gap-3 p-3 rounded-2xl w-full bg-subtle">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-subtle">
                <Image src={duplicateItem.imagePath} alt={duplicateItem.name} fill className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-primary">{duplicateItem.name}</p>
                <p className="text-xs text-muted">
                  {CATEGORIES.find(c => c.value === duplicateItem.category)?.label}
                  {duplicateItem.color ? ` · ${duplicateItem.color}` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setDuplicateItem(null)}
                className="flex-1 py-3 rounded-full text-sm font-medium bg-subtle text-primary"
              >
                取消
              </button>
              <button
                onClick={() => { setDuplicateItem(null); doSave(); }}
                className="flex-1 py-3 rounded-full text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)" }}
              >
                仍然添加
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default function AddItemPage() {
  return (
    <Suspense>
      <AddItemForm />
    </Suspense>
  );
}
