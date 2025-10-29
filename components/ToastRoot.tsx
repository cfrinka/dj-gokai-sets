"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type Toast = { id: string; type?: "success" | "error" | "info"; message: string; ttl?: number; visible?: boolean };

type ToastContextType = {
  show: (message: string, opts?: { type?: "success" | "error" | "info"; ttl?: number }) => void;
  success: (message: string, ttl?: number) => void;
  error: (message: string, ttl?: number) => void;
  info: (message: string, ttl?: number) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastRoot>");
  return ctx;
}

export default function ToastRoot({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeNow = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const hideThenRemove = useCallback((id: string, delayMs = 250) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, visible: false } : x)));
    window.setTimeout(() => removeNow(id), delayMs);
  }, [removeNow]);

  const show = useCallback((message: string, opts?: { type?: "success" | "error" | "info"; ttl?: number }) => {
    const id = Math.random().toString(36).slice(2);
    const ttl = Math.max(1200, opts?.ttl ?? 3500);
    const toast: Toast = { id, message, type: opts?.type || "info", ttl, visible: false };
    setToasts((t) => [...t, toast]);
    requestAnimationFrame(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, visible: true } : x)));
    });
    // schedule exit animation slightly before ttl ends, so progress feels smooth
    const EXIT_MS = 250;
    window.setTimeout(() => hideThenRemove(id, EXIT_MS), Math.max(0, ttl - EXIT_MS));
  }, [hideThenRemove]);

  const ctx: ToastContextType = {
    show,
    success: (m, ttl) => show(m, { type: "success", ttl }),
    error: (m, ttl) => show(m, { type: "error", ttl }),
    info: (m, ttl) => show(m, { type: "info", ttl }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,360px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`card px-4 py-3 text-sm flex items-start gap-3 transition-all duration-200 ${
              t.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            } ${t.type === "success" ? "border-green-400/30" : t.type === "error" ? "border-red-400/30" : ""}`}
          >
            <span className={`mt-0.5 text-xs ${t.type === "success" ? "text-green-300" : t.type === "error" ? "text-red-300" : "text-white/70"}`}>
              {t.type === "success" ? "✓" : t.type === "error" ? "⚠" : "i"}
            </span>
            <div className="text-white/90">{t.message}</div>
            <button onClick={() => hideThenRemove(t.id)} className="ml-auto text-white/50 hover:text-white">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
