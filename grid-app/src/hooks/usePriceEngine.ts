import { useEffect, useState } from "react";
import type { PricePoint, TokenConfig } from "../lib/types";
import { MAX_CHART_POINTS } from "../lib/constants";

/** Deterministic wobble: multi-sine overlay around base price */
function synthPrice(base: number, tick: number, t: number): number {
  const w =
    Math.sin(t / 4.7) * 2.8 * tick +
    Math.sin(t / 11.3) * 1.9 * tick +
    Math.sin(t / 23.7) * 1.1 * tick +
    Math.sin(t / 37) * 0.6 * tick;
  return Math.round((base + w) / tick) * tick;
}

function seedHistory(token: TokenConfig, count: number): PricePoint[] {
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }, (_, i) => {
    const t = now - (count - 1 - i);
    return { time: t, value: synthPrice(token.basePrice, token.tickSize, t) };
  });
}

const TICK_MS = 420;

export function usePriceEngine(token: TokenConfig) {
  const [history, setHistory] = useState<PricePoint[]>(() =>
    seedHistory(token, 80)
  );

  useEffect(() => {
    setHistory(seedHistory(token, 80));
  }, [token]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setHistory((prev) => {
        const last = prev[prev.length - 1]!;
        const t = last.time + 1;
        const value = synthPrice(token.basePrice, token.tickSize, t);
        const next = [...prev, { time: t, value }];
        return next.length > MAX_CHART_POINTS
          ? next.slice(-MAX_CHART_POINTS)
          : next;
      });
    }, TICK_MS);
    return () => clearInterval(iv);
  }, [token]);

  const currentPrice =
    history.length > 0 ? history[history.length - 1]!.value : token.basePrice;

  return { currentPrice, history };
}
