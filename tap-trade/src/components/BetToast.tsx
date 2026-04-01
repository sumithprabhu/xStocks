import { useEffect } from "react";

export type ToastPayload = {
  id: string;
  kind: "hit" | "win" | "lose";
  title: string;
  subtitle: string;
};

interface Props {
  toast: ToastPayload | null;
  onDismiss: () => void;
}

export function BetToast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, 2800);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const border =
    toast.kind === "win"
      ? "border-emerald-500/40 bg-emerald-950/50"
      : toast.kind === "lose"
        ? "border-red-500/35 bg-red-950/40"
        : "border-[#ff3b8d]/50 bg-[#1a0a14]/90";

  return (
    <div
      className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 px-4 w-[min(92vw,320px)] pointer-events-none"
      role="status"
    >
      <div
        className={`rounded-xl border px-4 py-3 shadow-[0_0_32px_rgba(0,0,0,0.45)] backdrop-blur-md ${border}`}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          {toast.title}
        </div>
        <div className="mt-0.5 text-sm font-mono tabular-nums text-zinc-100">
          {toast.subtitle}
        </div>
      </div>
    </div>
  );
}
