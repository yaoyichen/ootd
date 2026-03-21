"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

interface PersonDescription {
  gender?: string;
  bodyType?: string;
  skinTone?: string;
  hairStyle?: string;
  vibe?: string;
  summary?: string;
}

interface Person {
  id: string;
  name: string;
  imagePath: string;
  enhancedImagePath?: string | null;
  description?: string | null;
  isDefault: boolean;
  createdAt: string;
}

function parseDescription(raw?: string | null): PersonDescription | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [viewPerson, setViewPerson] = useState<Person | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchPersons = useCallback(async () => {
    const res = await fetch("/api/persons");
    const data = await res.json();
    setPersons(data);
    // Sync lightbox if open
    setViewPerson((prev) =>
      prev ? data.find((p: Person) => p.id === prev.id) || null : null
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPersons();
  }, [fetchPersons]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPreview(e.target.result as string);
        setShowAdd(true);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSave = async () => {
    if (!preview || !newName) return;
    setUploading(true);

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview, folder: "persons" }),
      });
      const { path: imagePath } = await uploadRes.json();

      const personRes = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, imagePath }),
      });
      const person = await personRes.json();

      setShowAdd(false);
      setNewName("");
      setPreview(null);
      fetchPersons();

      // Fire AI enhance in background, poll for updates
      if (person.id) {
        fetch(`/api/persons/${person.id}/enhance`, { method: "POST" })
          .then(() => fetchPersons())
          .catch(() => {});
      }
    } catch {
      alert("保存失败");
    }
    setUploading(false);
  };

  const handleSetDefault = async (id: string) => {
    await fetch(`/api/persons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    fetchPersons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这张人像？")) return;
    await fetch(`/api/persons/${id}`, { method: "DELETE" });
    fetchPersons();
  };

  const displayImage = (p: Person) => p.enhancedImagePath || p.imagePath;

  return (
    <div className="relative min-h-screen" style={{ background: "#FFF8F6" }}>
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          top: "-15%", right: "-8%", width: 700, height: 700,
          background: "radial-gradient(circle, rgba(242,124,136,0.12), transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "#1D1D1F" }}>人像管理</h1>
            <p className="mt-1 text-sm" style={{ color: "#6E6E73" }}>
              管理试穿用的全身照片，带星号的为默认人像
            </p>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, #F27C88, #FACDD0)",
              boxShadow: "0 4px 16px rgba(242,124,136,0.25)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14m-7-7h14" />
            </svg>
            上传人像
          </button>
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

        {/* Add person modal */}
        {showAdd && preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="glass rounded-3xl p-6 w-full max-w-md mx-4 flex flex-col gap-5" style={{ background: "rgba(255,255,255,0.95)" }}>
              <h2 className="text-lg font-bold" style={{ color: "#1D1D1F" }}>添加人像</h2>
              <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                <Image src={preview} alt="Preview" width={400} height={533} className="w-full h-full object-cover" />
              </div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="为这张人像起个名字"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)", color: "#1D1D1F" }}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAdd(false); setPreview(null); setNewName(""); }}
                  className="flex-1 py-3 rounded-full text-sm font-semibold"
                  style={{ background: "rgba(0,0,0,0.05)", color: "#6E6E73" }}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!newName || uploading}
                  className="btn-gradient flex-1 py-3 rounded-full text-sm font-semibold"
                >
                  {uploading ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full-screen image viewer */}
        {viewPerson && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
            onClick={() => setViewPerson(null)}
          >
            <div
              className="relative max-w-lg w-full mx-4 flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setViewPerson(null)}
                className="absolute -top-10 right-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>

              {/* Image */}
              <div className="w-full rounded-2xl overflow-hidden" style={{ maxHeight: "70vh" }}>
                <Image
                  src={displayImage(viewPerson)}
                  alt={viewPerson.name}
                  width={600}
                  height={800}
                  className="w-full h-full object-contain"
                  style={{ maxHeight: "70vh" }}
                />
              </div>

              {/* Info card */}
              <div className="w-full mt-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.12)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-base font-semibold text-white">{viewPerson.name}</p>
                  {viewPerson.isDefault && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: "linear-gradient(135deg, #F27C88, #FACDD0)", color: "#fff" }}>
                      默认
                    </span>
                  )}
                  {viewPerson.enhancedImagePath && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: "rgba(52,199,89,0.8)", color: "#fff" }}>
                      已美化
                    </span>
                  )}
                </div>
                {(() => {
                  const desc = parseDescription(viewPerson.description);
                  if (!desc) return (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      AI 分析中...上传后需等待几秒
                    </p>
                  );
                  return (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.9)" }}>{desc.summary}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {desc.gender && <Tag label={desc.gender} />}
                        {desc.bodyType && <Tag label={desc.bodyType} />}
                        {desc.skinTone && <Tag label={desc.skinTone} />}
                        {desc.hairStyle && <Tag label={desc.hairStyle} />}
                        {desc.vibe && <Tag label={desc.vibe} />}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Persons grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div
              className="w-8 h-8 rounded-full"
              style={{
                border: "3px solid rgba(242,124,136,0.15)",
                borderTopColor: "#F27C88",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        ) : persons.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(242,124,136,0.06)" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" strokeWidth="1" strokeLinecap="round" style={{ stroke: "#F27C88" }}>
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "#6E6E73" }}>
              还没有人像，上传一张全身照开始吧
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {persons.map((p) => (
              <div
                key={p.id}
                className="group glass rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(242,124,136,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.04)";
                }}
                onClick={() => setViewPerson(p)}
              >
                <div className="relative" style={{ aspectRatio: "3/4" }}>
                  <Image src={displayImage(p)} alt={p.name} fill className="object-cover" />
                  {p.isDefault && (
                    <div
                      className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-semibold"
                      style={{ background: "linear-gradient(135deg, #F27C88, #FACDD0)", color: "#fff" }}
                    >
                      默认
                    </div>
                  )}
                  {p.enhancedImagePath && (
                    <div
                      className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-[10px] font-semibold"
                      style={{ background: "rgba(52,199,89,0.85)", color: "#fff" }}
                    >
                      已美化
                    </div>
                  )}
                  <div
                    className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!p.isDefault && (
                      <button
                        onClick={() => handleSetDefault(p.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(242,124,136,0.85)", color: "#fff" }}
                        title="设为默认"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,59,48,0.85)", color: "#fff" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate" style={{ color: "#1D1D1F" }}>
                    {p.name}
                  </p>
                  {(() => {
                    const desc = parseDescription(p.description);
                    return desc?.vibe ? (
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: "#6E6E73" }}>
                        {desc.vibe}
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[11px]"
      style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}
    >
      {label}
    </span>
  );
}
