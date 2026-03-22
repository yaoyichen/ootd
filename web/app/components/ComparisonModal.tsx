"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useModalKeyboard } from "../hooks/useModalKeyboard";

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiImage: string;
  realImage: string;
  score?: number | null;
  onPublish?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
}

export function ComparisonModal({
  isOpen,
  onClose,
  aiImage,
  realImage,
  score,
  onPublish,
  onSave,
  onDelete,
}: ComparisonModalProps) {
  const [dividerPosition, setDividerPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useModalKeyboard({ isOpen, onClose });

  const getPositionFromEvent = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return 50;
      const x = clientX - rect.left;
      const pct = (x / rect.width) * 100;
      return Math.max(0, Math.min(100, pct));
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDividerPosition(getPositionFromEvent(e.clientX));
    },
    [getPositionFromEvent]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      setDividerPosition(getPositionFromEvent(e.clientX));
    },
    [getPositionFromEvent]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex flex-col w-full max-w-lg mx-4 rounded-3xl overflow-hidden"
        style={{
          background: "rgba(20,20,22,0.95)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="px-6 pt-6 pb-3 text-center">
          <h2
            className="text-lg font-semibold"
            style={{ color: "#F5F5F7" }}
          >
            AI vs 真实穿搭
          </h2>
          {score != null && (
            <p
              className="text-sm mt-1"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              AI 评分：
              <span style={{ color: "#E8A0B0", fontWeight: 600 }}>
                {score}
              </span>
            </p>
          )}
        </div>

        {/* Comparison area */}
        <div className="px-4 pb-4">
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-2xl select-none"
            style={{ aspectRatio: "3/4" }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* AI image (left / base layer) */}
            <Image
              src={aiImage}
              alt="AI 试穿"
              fill
              unoptimized
              className="object-cover"
              draggable={false}
            />

            {/* Real image (right / clipped layer) */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: `inset(0 0 0 ${dividerPosition}%)`,
              }}
            >
              <Image
                src={realImage}
                alt="真实穿搭"
                fill
                unoptimized
                className="object-cover"
                draggable={false}
              />
            </div>

            {/* Labels */}
            <span
              className="absolute top-3 left-3 px-2 py-1 rounded-lg text-[11px] font-medium"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              AI 试穿
            </span>
            <span
              className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[11px] font-medium"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              真实穿搭
            </span>

            {/* Divider line */}
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: `${dividerPosition}%`,
                transform: "translateX(-50%)",
                width: 2,
                background: "rgba(255,255,255,0.8)",
                pointerEvents: "none",
              }}
            />

            {/* Draggable handle */}
            <div
              className="absolute top-1/2 cursor-ew-resize touch-none"
              style={{
                left: `${dividerPosition}%`,
                transform: "translate(-50%, -50%)",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(20,20,22,0.85)",
                border: "2px solid rgba(255,255,255,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
              onPointerDown={handlePointerDown}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M5 3L2 8L5 13" />
                <path d="M11 3L14 8L11 13" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            关闭
          </button>
          <div className="flex gap-2">
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                style={{
                  color: "#FF3B30",
                  border: "1px solid rgba(255,59,48,0.3)",
                  background: "rgba(255,59,48,0.06)",
                }}
              >
                删除
              </button>
            )}
            {onPublish && (
              <button
                onClick={onPublish}
                className="px-5 py-2 rounded-full text-sm font-medium transition-colors"
                style={{
                  color: "#E8A0B0",
                  border: "1px solid rgba(232,160,176,0.3)",
                  background: "rgba(232,160,176,0.08)",
                }}
              >
                分享到广场
              </button>
            )}
            <button
              onClick={onSave}
              className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-all"
              style={{
                background:
                  "linear-gradient(135deg, rgba(200,120,140,0.9), rgba(180,140,200,0.9))",
                boxShadow: "0 4px 16px rgba(200,120,140,0.3)",
              }}
            >
              保存对比图
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
