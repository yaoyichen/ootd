"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useToast } from "../components/ToastProvider";
import { SkeletonCard } from "../components/Skeleton";
import { useModalKeyboard } from "../hooks/useModalKeyboard";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/EmptyState";

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
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useModalKeyboard({
    isOpen: showAdd,
    onClose: () => { setShowAdd(false); setPreview(null); setNewName(""); },
  });

  useModalKeyboard({
    isOpen: !!viewPerson,
    onClose: () => setViewPerson(null),
  });

  const fetchPersons = useCallback(async () => {
    const res = await fetch("/api/persons");
    const data = await res.json();
    setPersons(data);
    setViewPerson((prev) =>
      prev ? data.find((p: Person) => p.id === prev.id) || null : null
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPersons();
  }, [fetchPersons]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

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

      if (person.id) {
        fetch(`/api/persons/${person.id}/enhance`, { method: "POST" })
          .then(() => fetchPersons())
          .catch(() => {});
      }
    } catch {
      toast.error("保存失败");
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
    toast.success("已设为默认人像");
  };

  const handleDelete = async (id: string) => {
    toast.confirm({
      message: "确定删除这张人像？",
      onConfirm: async () => {
        await fetch(`/api/persons/${id}`, { method: "DELETE" });
        fetchPersons();
        toast.success("已删除");
      },
    });
  };

  const displayImage = (p: Person) => p.enhancedImagePath || p.imagePath;

  return (
    <PageShell>
      <main className="max-w-4xl mx-auto px-6 pt-8 pb-20 animate-fade-in-up">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>PORTRAITS</p>
            <h1 className="text-2xl font-light text-primary">人像管理</h1>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white btn-gradient touch-target"
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
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="glass rounded-3xl p-6 w-full max-w-md mx-4 flex flex-col gap-5" style={{ background: "rgba(20,20,22,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h2 className="text-lg font-bold text-primary">添加人像</h2>
              <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                <Image src={preview} alt="Preview" width={400} height={533} className="w-full h-full object-cover" />
              </div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="为这张人像起个名字"
                className="input-base"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAdd(false); setPreview(null); setNewName(""); }}
                  className="flex-1 py-3 rounded-full text-sm font-semibold bg-subtle text-secondary"
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
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative max-w-lg w-full mx-4 flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setViewPerson(null)}
                className="absolute -top-10 right-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>

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

              <div className="w-full mt-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.12)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-base font-semibold text-white">{viewPerson.name}</p>
                  {viewPerson.isDefault && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)" }}>
                      默认
                    </span>
                  )}
                  {viewPerson.enhancedImagePath && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                      style={{ background: "rgba(52,199,89,0.8)" }}>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : persons.length === 0 ? (
          <EmptyState
            icon={
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" strokeWidth="1" strokeLinecap="round" style={{ stroke: "#E8A0B0" }}>
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
              </svg>
            }
            message="还没有人像，上传一张全身照开始吧"
            actionLabel="上传人像"
            onAction={() => inputRef.current?.click()}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {persons.map((p, i) => (
              <div
                key={p.id}
                className="group glass rounded-2xl overflow-hidden card-hover cursor-pointer hover:scale-[1.02] transition-transform duration-300 img-hover stagger-item"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => setViewPerson(p)}
              >
                <div className="relative" style={{ aspectRatio: "3/4" }}>
                  <Image src={displayImage(p)} alt={p.name} fill className="object-cover" />
                  {p.isDefault && (
                    <div
                      className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #E8A0B0, #D4A0C8)" }}
                    >
                      默认
                    </div>
                  )}
                  {p.enhancedImagePath && (
                    <div
                      className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-[10px] font-semibold text-white"
                      style={{ background: "rgba(52,199,89,0.85)" }}
                    >
                      已美化
                    </div>
                  )}
                  {/* Menu button */}
                  <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === p.id ? null : p.id);
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center touch-target"
                      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    {menuOpen === p.id && (
                      <div
                        className="absolute top-12 right-0 rounded-xl overflow-hidden"
                        style={{
                          background: "rgba(20,20,22,0.95)",
                          backdropFilter: "blur(20px)",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          minWidth: 100,
                        }}
                      >
                        {!p.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(null);
                              handleSetDefault(p.id);
                            }}
                            className="w-full text-left px-4 py-3 text-xs font-medium transition-colors hover:bg-white/[0.04] text-accent"
                          >
                            设为默认
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(null);
                            handleDelete(p.id);
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-medium transition-colors hover:bg-white/[0.04]"
                          style={{ color: "#FF3B30" }}
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate text-primary">
                    {p.name}
                  </p>
                  {(() => {
                    const desc = parseDescription(p.description);
                    return (
                      <div className="flex flex-col gap-0.5">
                        {desc?.bodyType && (
                          <p className="text-[11px] truncate text-secondary">
                            {desc.bodyType}
                          </p>
                        )}
                        {desc?.vibe && (
                          <p className="text-[11px] truncate text-muted">
                            {desc.vibe}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </PageShell>
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
