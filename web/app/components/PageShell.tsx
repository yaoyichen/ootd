export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-page">
      {/* Subtle rose-gold radial glow */}
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          top: "-20%",
          right: "-10%",
          width: 800,
          height: 800,
          background:
            "radial-gradient(circle, rgba(200,120,140,0.06), transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
