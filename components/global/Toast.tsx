"use client";

type ToastProps = {
  message?: string;
  onClose?: () => void;
};

export function Toast({ message, onClose }: ToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md bg-stone-950 px-4 py-3 text-sm text-white shadow-lg">
      <span>{message}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-xs text-stone-200 hover:bg-white/10"
        >
          關閉
        </button>
      ) : null}
    </div>
  );
}
