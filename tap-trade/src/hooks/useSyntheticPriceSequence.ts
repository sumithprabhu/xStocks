import { useEffect, useState } from "react";
import type { PricePoint, TokenConfig } from "../lib/types";
import { MAX_CHART_POINTS } from "../lib/constants";

/** Deterministic wobble around base (no network, no random). */
function synthPriceAtSec(
  base: number,
  tickSize: number,
  tSec: number
): number {
  const wobble =
    Math.sin(tSec / 5) * 2.2 * tickSize +
    Math.sin(tSec / 13) * 1.4 * tickSize +
    Math.sin(tSec / 31) * 0.9 * tickSize;
  const raw = base + wobble;
  return Math.round(raw / tickSize) * tickSize;
}

function seedHistory(token: TokenConfig, count: number): PricePoint[] {
  const now = Math.floor(Date.now() / 1000);
  const pts: PricePoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const t = now - i;
    pts.push({
      time: t,
      value: synthPriceAtSec(token.basePrice, token.tickSize, t),
    });
  }
  return pts;
}

const STEP_MS = 480;

/**
 * Local demo prices for landing / marketing: smooth ups & downs, no API.
 */
export function useSyntheticPriceSequence(token: TokenConfig) {
  const [history, setHistory] = useState<PricePoint[]>(() =>
    seedHistory(token, 56)
  );

  useEffect(() => {
    setHistory(seedHistory(token, 56));
  }, [token]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setHistory((prev) => {
        if (prev.length === 0) return seedHistory(token, 56);
        const last = prev[prev.length - 1]!;
        const t = last.time + 1;
        const value = synthPriceAtSec(token.basePrice, token.tickSize, t);
        const next = [...prev, { time: t, value }];
        return next.length > MAX_CHART_POINTS
          ? next.slice(-MAX_CHART_POINTS)
          : next;
      });
    }, STEP_MS);
    return () => clearInterval(iv);
  }, [token]);

  const currentPrice =
    history.length > 0 ? history[history.length - 1]!.value : token.basePrice;

  return { currentPrice, history };
}
