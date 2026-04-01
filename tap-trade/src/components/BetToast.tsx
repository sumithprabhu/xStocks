import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
    const t = window.setTimeout(onDismiss, toast.kind === "win" ? 3200 : 2600);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  const panelClass =
    toast?.kind === "win"
      ? "border-emerald-400/45 bg-emerald-950/55 shadow-[0_0_40px_rgba(52,211,153,0.2)]"
      : toast?.kind === "lose"
        ? "border-rose-500/40 bg-rose-950/45 shadow-[0_0_36px_rgba(244,63,94,0.12)]"
        : "border-[#ff3b8d]/50 bg-[#1a0a14]/92 shadow-[0_0_32px_rgba(255,59,141,0.15)]";

  const titleClass =
    toast?.kind === "win"
      ? "text-emerald-300/95"
      : toast?.kind === "lose"
        ? "text-rose-300/90"
        : "text-fuchsia-200/90";

  const subClass =
    toast?.kind === "win"
      ? "text-emerald-50"
      : toast?.kind === "lose"
        ? "text-rose-50/95"
        : "text-zinc-100";

  return (
    <div
      className="fixed bottom-24 left-1/2 z-[100] w-[min(92vw,340px)] -translate-x-1/2 px-4 pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 22, scale: 0.9, filter: "blur(4px)" }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
            }}
            exit={{
              opacity: 0,
              y: 10,
              scale: 0.96,
              transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
            }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 32,
              mass: 0.65,
            }}
            className={`rounded-2xl border px-4 py-3.5 backdrop-blur-md ${panelClass}`}
          >
            <motion.div
              className={`text-[11px] font-bold uppercase tracking-[0.22em] ${titleClass}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05, duration: 0.25 }}
            >
              {toast.title}
            </motion.div>
            <motion.div
              className={`mt-1 text-[15px] font-mono font-semibold tabular-nums ${subClass}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 26 }}
            >
              {toast.subtitle}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
