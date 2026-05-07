"use client";

import { useEffect, useState } from "react";
import type { ToastVariant } from "@/hooks/useToast";

type ToastProps = {
  message: string;
  title?: string;
  variant?: ToastVariant;
  onClose: () => void;
};

const variantStyleMap: Record<ToastVariant, string> = {
  success: "bg-emerald-700",
  error: "bg-stone-950",
  info: "bg-sky-700",
};

export function Toast({
  message,
  title,
  variant = "info",
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <div
      className={`fixed bottom-5 left-1/2 z-50 flex w-[min(92vw,30rem)] -translate-x-1/2 items-start gap-3 rounded-md px-4 py-3 text-sm text-white shadow-lg transition-all duration-300 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${variantStyleMap[variant]}`}
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <p className={title ? "mt-1" : ""}>{message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded px-2 py-1 text-xs text-stone-100 transition hover:bg-white/10"
      >
        關閉
      </button>
    </div>
  );
}
