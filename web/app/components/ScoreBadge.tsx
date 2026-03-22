export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color = score >= 80 ? "#34C759" : score >= 60 ? "#E8A0B0" : "#FF3B30";
  const bg =
    score >= 80
      ? "rgba(52,199,89,0.2)"
      : score >= 60
        ? "rgba(232,160,176,0.2)"
        : "rgba(255,59,48,0.2)";
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-0.5",
    lg: "text-base px-3 py-1",
  };
  return (
    <span
      className={`rounded-full font-bold inline-flex items-center ${sizeClasses[size]}`}
      style={{ color, background: bg }}
    >
      {score}
    </span>
  );
}
