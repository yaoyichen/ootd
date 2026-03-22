"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

interface ToastApi {
  (opts: { message: string; type?: ToastType }): void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  confirm: (opts: { message: string; onConfirm: () => void }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 0;

const TYPE_COLORS: Record<ToastType, string> = {
  success: "#34C759",
  error: "#FF3B30",
  info: "#E8A0B0",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast: ToastApi = useCallback(
    (opts: { message: string; type?: ToastType }) => {
      addToast(opts.message, opts.type || "info");
    },
    [addToast]
  ) as ToastApi;

  toast.success = (message: string) => addToast(message, "success");
  toast.error = (message: string) => addToast(message, "error");
  toast.info = (message: string) => addToast(message, "info");
  toast.confirm = (opts: { message: string; onConfirm: () => void }) => {
    setConfirmState(opts);
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast stack */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[240px] max-w-[360px]"
            style={{
              background: "rgba(20,20,22,0.92)",
              backdropFilter: "blur(20px) saturate(1.4)",
              WebkitBackdropFilter: "blur(20px) saturate(1.4)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.06)",
              animation: "toastSlideUp 0.3s ease-out",
            }}
          >
            <div
              className="w-1 self-stretch rounded-full flex-shrink-0"
              style={{ background: TYPE_COLORS[t.type] }}
            />
            <p className="flex-1 text-sm font-medium" style={{ color: "#F5F5F7" }}>
              {t.message}
            </p>
            <button
              onClick={() => removeToast(t.id)}
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="mx-6 max-w-sm w-full rounded-3xl p-6 flex flex-col gap-4"
            style={{
              background: "rgba(20,20,22,0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
              animation: "toastSlideUp 0.25s ease-out",
            }}
          >
            <p className="text-base font-semibold text-center" style={{ color: "#F5F5F7" }}>
              {confirmState.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmState(null)}
                className="flex-1 py-3 rounded-full text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState(null);
                }}
                className="flex-1 py-3 rounded-full text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, rgba(200,120,140,0.9), rgba(180,140,200,0.9))" }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
