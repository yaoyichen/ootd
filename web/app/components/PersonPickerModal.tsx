"use client";

import Image from "next/image";
import { useModalKeyboard } from "../hooks/useModalKeyboard";

interface PersonData {
  id: string;
  name: string;
  imagePath: string;
  isDefault: boolean;
}

export function PersonPickerModal({
  persons,
  selected,
  onSelect,
  onClose,
}: {
  persons: PersonData[];
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  useModalKeyboard({ isOpen: true, onClose });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg mx-4 mb-4 sm:mb-0 rounded-3xl p-6 flex flex-col gap-4 max-h-[80vh]"
        style={{
          background: "rgba(20,20,22,0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">选择人像</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {persons.length === 0 ? (
          <p className="text-sm py-10 text-center text-muted">
            暂无人像，请先到人像管理上传
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 overflow-y-auto">
            {persons.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p.id);
                  onClose();
                }}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  border:
                    selected === p.id
                      ? "2px solid #E8A0B0"
                      : "2px solid rgba(255,255,255,0.06)",
                  boxShadow:
                    selected === p.id
                      ? "0 0 0 2px rgba(232,160,176,0.2)"
                      : "none",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div className="relative" style={{ aspectRatio: "3/4" }}>
                  <Image
                    src={p.imagePath}
                    alt={p.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate text-primary">
                    {p.name}
                  </p>
                  {p.isDefault && (
                    <span className="text-[10px] text-accent">默认</span>
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
