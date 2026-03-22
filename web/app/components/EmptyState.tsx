import Link from "next/link";

export function EmptyState({
  icon,
  message,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon: React.ReactNode;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-20">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center animate-breathe"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        {icon}
      </div>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="px-5 py-2 rounded-full text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, rgba(200,120,140,0.9), rgba(180,140,200,0.9))" }}
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          onClick={onAction}
          className="px-5 py-2 rounded-full text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, rgba(200,120,140,0.9), rgba(180,140,200,0.9))" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
