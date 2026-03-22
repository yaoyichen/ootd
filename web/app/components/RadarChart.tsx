"use client";

import { useState } from "react";

interface ScoreDims {
  colorHarmony: number;
  styleCohesion: number;
  trendiness: number;
  practicality: number;
  creativity: number;
}

const DIM_LABELS: { key: keyof ScoreDims; label: string }[] = [
  { key: "colorHarmony", label: "色彩" },
  { key: "styleCohesion", label: "风格" },
  { key: "trendiness", label: "时尚" },
  { key: "practicality", label: "实穿" },
  { key: "creativity", label: "创意" },
];

export function RadarChart({
  dims,
  score,
  size = 140,
}: {
  dims: ScoreDims;
  score: number;
  size?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

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

  const displayScore =
    hovered !== null ? dims[DIM_LABELS[hovered].key] : score;
  const scoreColor =
    displayScore >= 80 ? "#34C759" : displayScore >= 60 ? "#E8A0B0" : "#FF3B30";

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      onMouseLeave={() => setHovered(null)}
    >
      <svg width={size} height={size}>
        {gridPaths.map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: n }, (_, i) => {
          const [ex, ey] = pointAt(i, 100);
          const active = hovered === i;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={ex}
              y2={ey}
              stroke={active ? "#E8A0B0" : "rgba(255,255,255,0.04)"}
              strokeWidth={active ? 1.5 : 0.5}
              style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
            />
          );
        })}
        <polygon
          points={dataPath}
          fill="rgba(232,160,176,0.12)"
          stroke="#E8A0B0"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {dataPts.map((p, i) => {
          const active = hovered === i;
          return (
            <circle
              key={i}
              cx={p[0]}
              cy={p[1]}
              r={active ? 5 : 2.5}
              fill="#E8A0B0"
              stroke={active ? "white" : "none"}
              strokeWidth={active ? 2 : 0}
              style={{ transition: "r 0.2s" }}
            />
          );
        })}
        {DIM_LABELS.map((d, i) => {
          const a = angleOf(i);
          const lx = cx + labelR * Math.cos(a);
          const ly = cy + labelR * Math.sin(a);
          const active = hovered === i;
          const dimVal = dims[d.key];
          const label = active ? `${d.label} ${dimVal}` : d.label;
          return (
            <text
              key={d.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={active ? 11 : 10}
              fontWeight={active ? 700 : 500}
              fill={active ? "#E8A0B0" : "rgba(255,255,255,0.4)"}
              style={{
                transition: "fill 0.2s, font-size 0.2s",
                cursor: "default",
              }}
            >
              {label}
            </text>
          );
        })}
        {DIM_LABELS.map((_, i) => {
          const a = angleOf(i);
          const hx = cx + labelR * Math.cos(a);
          const hy = cy + labelR * Math.sin(a);
          return (
            <circle
              key={`hit-${i}`}
              cx={hx}
              cy={hy}
              r={14}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
          );
        })}
      </svg>
      <span
        className="absolute font-bold pointer-events-none"
        style={{
          color: scoreColor,
          fontSize: size * 0.16,
          transition: "color 0.2s",
        }}
      >
        {displayScore}
      </span>
    </div>
  );
}
