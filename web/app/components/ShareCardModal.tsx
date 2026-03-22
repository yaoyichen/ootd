"use client";

import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { useToast } from "./ToastProvider";
import { useModalKeyboard } from "../hooks/useModalKeyboard";

interface ScoreDims {
  colorHarmony: number;
  styleCohesion: number;
  trendiness: number;
  practicality: number;
  creativity: number;
}

interface ShareCardProps {
  isOpen: boolean;
  onClose: () => void;
  outfitImage: string;
  score?: number | null;
  scoreDims?: string | null;
  evaluation?: string | null;
  topItem?: { name: string; imagePath: string } | null;
  bottomItem?: { name: string; imagePath: string } | null;
}

const DIM_LABELS: { key: keyof ScoreDims; label: string }[] = [
  { key: "colorHarmony", label: "色彩" },
  { key: "styleCohesion", label: "风格" },
  { key: "trendiness", label: "时尚" },
  { key: "practicality", label: "实穿" },
  { key: "creativity", label: "创意" },
];

const TEMPLATES = [
  { id: "minimal", label: "极简白", bg: "#FFFFFF", text: "#1D1D1F", accent: "#E8A0B0" },
  { id: "magazine", label: "杂志感", bg: "#1A1A1A", text: "#FFFFFF", accent: "#E8C547" },
  { id: "ins", label: "ins 风", bg: "linear-gradient(135deg, #fce4ec, #e8eaf6)", text: "#1D1D1F", accent: "#9C27B0" },
  { id: "redbook", label: "小红书", bg: "#FFF5F5", text: "#1D1D1F", accent: "#FF4757" },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];

function StaticRadarChart({
  dims,
  score,
  accentColor,
  textColor,
  size = 140,
}: {
  dims: ScoreDims;
  score: number;
  accentColor: string;
  textColor: string;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.34;
  const labelR = size * 0.46;
  const levels = [20, 40, 60, 80, 100];
  const n = DIM_LABELS.length;

  const angleOf = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const pointAt = (i: number, value: number) => {
    const a = angleOf(i);
    const r = (value / 100) * maxR;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  const gridPaths = levels.map((lv) => {
    const pts = Array.from({ length: n }, (_, i) => pointAt(i, lv));
    return pts.map((p) => `${p[0]},${p[1]}`).join(" ");
  });

  const dataPts = DIM_LABELS.map((d, i) => pointAt(i, dims[d.key]));
  const dataPath = dataPts.map((p) => `${p[0]},${p[1]}`).join(" ");

  const gridStroke = textColor === "#FFFFFF" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";
  const axisStroke = textColor === "#FFFFFF" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const labelFill = textColor === "#FFFFFF" ? "rgba(255,255,255,0.6)" : "#6E6E73";

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {gridPaths.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke={gridStroke} strokeWidth={0.5} />
        ))}
        {Array.from({ length: n }, (_, i) => {
          const [ex, ey] = pointAt(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke={axisStroke} strokeWidth={0.5} />;
        })}
        <polygon
          points={dataPath}
          fill={`${accentColor}20`}
          stroke={accentColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {dataPts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill={accentColor} />
        ))}
        {DIM_LABELS.map((d, i) => {
          const a = angleOf(i);
          const lx = cx + labelR * Math.cos(a);
          const ly = cy + labelR * Math.sin(a);
          return (
            <text
              key={d.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9}
              fontWeight={500}
              fill={labelFill}
            >
              {d.label}
            </text>
          );
        })}
      </svg>
      <span
        className="absolute font-bold pointer-events-none"
        style={{ color: accentColor, fontSize: size * 0.16 }}
      >
        {score}
      </span>
    </div>
  );
}

export default function ShareCardModal({
  isOpen,
  onClose,
  outfitImage,
  score,
  scoreDims,
  evaluation,
  topItem,
  bottomItem,
}: ShareCardProps) {
  const [templateId, setTemplateId] = useState<TemplateId>("minimal");
  const [saving, setSaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useModalKeyboard({ isOpen, onClose });

  if (!isOpen) return null;

  const tpl = TEMPLATES.find((t) => t.id === templateId)!;
  const dims: ScoreDims | null = scoreDims ? JSON.parse(scoreDims) : null;

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

  const handleSave = async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2,
        width: cardRef.current.offsetWidth,
        height: cardRef.current.offsetHeight,
        windowWidth: cardRef.current.offsetWidth,
        windowHeight: cardRef.current.offsetHeight,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ootd-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("已保存到本地");
      });
    } catch {
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex flex-col items-center gap-4 max-h-[95vh] overflow-y-auto px-4 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Template switcher */}
        <div className="flex gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplateId(t.id)}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="w-10 h-10 rounded-lg transition-all"
                style={{
                  background: t.bg,
                  border: templateId === t.id ? `2px solid ${t.accent}` : "2px solid rgba(255,255,255,0.3)",
                  boxShadow: templateId === t.id ? `0 0 0 2px ${t.accent}40` : "none",
                }}
              />
              <span className="text-[10px] font-medium" style={{ color: templateId === t.id ? "#fff" : "rgba(255,255,255,0.6)" }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {/* Card preview */}
        <div
          ref={cardRef}
          className="rounded-2xl overflow-hidden flex-shrink-0"
          style={{
            width: 375,
            background: tpl.bg,
            boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
          }}
        >
          {/* Main outfit image — use background-image for html2canvas compatibility */}
          <div style={{
            width: "100%",
            paddingBottom: "133.33%",
            backgroundImage: `url(${outfitImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }} />

          {/* Score + evaluation */}
          {score != null && dims && (
            <div className="flex items-center gap-3 px-5 pt-4 pb-2">
              <StaticRadarChart
                dims={dims}
                score={score}
                accentColor={tpl.accent}
                textColor={tpl.text}
                size={120}
              />
              <div className="flex-1 min-w-0">
                {evaluation && (
                  <p
                    className="text-[12px] leading-relaxed line-clamp-4"
                    style={{ color: tpl.text }}
                    dangerouslySetInnerHTML={{ __html: evaluation }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Item thumbnails */}
          {(topItem || bottomItem) && (
            <div className="flex gap-3 px-5 py-3">
              {topItem && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: tpl.text === "#FFFFFF" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }}
                >
                  <div
                    className="rounded-lg flex-shrink-0"
                    style={{
                      width: 40, height: 40,
                      backgroundImage: `url(${topItem.imagePath})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <span className="text-[11px] font-medium truncate max-w-[80px]" style={{ color: tpl.text }}>
                    {topItem.name}
                  </span>
                </div>
              )}
              {bottomItem && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: tpl.text === "#FFFFFF" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }}
                >
                  <div
                    className="rounded-lg flex-shrink-0"
                    style={{
                      width: 40, height: 40,
                      backgroundImage: `url(${bottomItem.imagePath})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <span className="text-[11px] font-medium truncate max-w-[80px]" style={{ color: tpl.text }}>
                    {bottomItem.name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Watermark */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: `1px solid ${tpl.text === "#FFFFFF" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}` }}
          >
            <span className="text-[11px] font-semibold tracking-wide" style={{ color: tpl.accent }}>
              OOTD
            </span>
            <span className="text-[11px]" style={{ color: tpl.text === "#FFFFFF" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)" }}>
              {dateStr}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
            style={{ color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.1)" }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-2.5 rounded-full text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(200,120,140,0.9), rgba(180,140,200,0.9))",
              boxShadow: "0 4px 16px rgba(200,120,140,0.3)",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "保存中..." : "保存图片"}
          </button>
        </div>
      </div>
    </div>
  );
}
