export function SkeletonBlock({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeletonShimmer 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ aspectRatio = "3/4" }: { aspectRatio?: string }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <SkeletonBlock style={{ aspectRatio }} />
      <div className="p-3 flex flex-col gap-2">
        <SkeletonBlock className="h-4 w-3/4" style={{ borderRadius: 8 }} />
        <SkeletonBlock className="h-3 w-1/2" style={{ borderRadius: 6 }} />
      </div>
    </div>
  );
}

export function SkeletonOutfitCard() {
  return (
    <div className="glass rounded-3xl overflow-hidden">
      <SkeletonBlock style={{ aspectRatio: "3/4" }} />
      <div className="p-4 flex flex-col gap-3">
        <SkeletonBlock className="h-16 w-full" style={{ borderRadius: 16 }} />
        <div className="flex gap-2">
          <SkeletonBlock className="h-8 flex-1" style={{ borderRadius: 20 }} />
          <SkeletonBlock className="h-8 flex-1" style={{ borderRadius: 20 }} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonWeatherBar() {
  return (
    <div className="glass rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <SkeletonBlock className="h-7 w-20" style={{ borderRadius: 14 }} />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="flex-shrink-0" style={{ width: 64, height: 88, borderRadius: 16 }} />
        ))}
      </div>
    </div>
  );
}
