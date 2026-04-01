import { useCallback, useEffect, useRef, useState } from "react";
import type { Bet, BetSize, TokenConfig } from "../lib/types";
import type { SnakeSegment } from "./useSnakeTrail";
import { calculateMultiplier } from "../lib/multiplier";
import { INITIAL_BALANCE, SNAKE_COLUMN_HIT_LAG } from "../lib/constants";

let betSeq = 0;

export function useBets(
  token: TokenConfig,
  currentPrice: number,
  head: SnakeSegment
) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const headRef = useRef(head);
  headRef.current = head;

  useEffect(() => {
    setBets([]);
    setBalance(INITIAL_BALANCE);
  }, [token.symbol]);

  const placeBet = useCallback(
    (signedRow: number, globalCol: number, size: BetSize) => {
      const { tickSize, houseEdgeBps } = token;
      const h = headRef.current;

      // Must be ahead of the head
      const stepsAhead = globalCol - h.globalCol;
      if (stepsAhead <= 0) return;
      if (size > balance) return;

      const absRow = Math.abs(signedRow);
      const mult = calculateMultiplier(absRow, stepsAhead, houseEdgeBps);
      if (mult <= 0) return;

      const center = Math.round(currentPrice / tickSize) * tickSize;
      const priceLevel = center + signedRow * tickSize;

      const bet: Bet = {
        id: `bet-${++betSeq}`,
        row: signedRow,
        targetCol: globalCol,  // now stores the absolute global column
        col: stepsAhead,
        priceLevel,
        amount: size,
        multiplier: mult,
        placedAt: Date.now(),
        status: "active",
        pnl: 0,
      };

      setBalance((b) => b - size);
      setBets((prev) => [...prev, bet]);
    },
    [token, currentPrice, balance]
  );

  // Resolve bets as snake advances
  useEffect(() => {
    const effectiveCol = Math.floor(
      Math.max(0, head.globalPhase - SNAKE_COLUMN_HIT_LAG)
    );

    setBets((prev) => {
      let changed = false;
      const next = prev.map((b) => {
        if (b.status !== "active") return b;
        // bet.targetCol is the absolute global column
        if (effectiveCol < b.targetCol) return b;

        changed = true;
        const won = head.signedRow === b.row;
        const pnl = won ? b.amount * b.multiplier - b.amount : -b.amount;
        return { ...b, status: won ? ("won" as const) : ("lost" as const), pnl };
      });

      if (!changed) return prev;

      const newWinnings = next
        .filter((b) => b.status === "won" && prev.find((p) => p.id === b.id)?.status === "active")
        .reduce((sum, b) => sum + b.amount * b.multiplier, 0);
      if (newWinnings > 0) setBalance((bal) => bal + newWinnings);

      return next;
    });
  }, [head]);

  // Clean up old resolved bets
  useEffect(() => {
    const iv = setInterval(() => {
      setBets((prev) => {
        const now = Date.now();
        return prev.filter(
          (b) => b.status === "active" || now - b.placedAt < 15_000
        );
      });
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  return { bets, balance, placeBet };
}
