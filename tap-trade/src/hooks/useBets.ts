import { useCallback, useEffect, useRef, useState } from "react";
import type { Bet, BetSize, TokenConfig } from "../lib/types";
import type { SnakeSegment } from "./useSnakeTrail";
import { calculateMultiplier } from "../lib/multiplier";
import { INITIAL_BALANCE, SNAKE_COLUMN_HIT_LAG, MIN_BET_STEPS_AHEAD } from "../lib/constants";

let betSeq = 0;

export function useBets(
  token: TokenConfig,
  currentPrice: number,
  head: SnakeSegment,
  trail: SnakeSegment[] = [],
  onChainBalance?: number,
  contractMatrix?: number[][] | null,
) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [balance, setBalance] = useState(onChainBalance ?? INITIAL_BALANCE);
  const headRef = useRef(head);
  headRef.current = head;

  // Store contractMatrix in a ref so placeBet callback doesn't need it in deps
  const matrixRef = useRef(contractMatrix);
  matrixRef.current = contractMatrix;

  // Sync balance when on-chain value changes
  const prevOnChain = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (onChainBalance !== undefined && onChainBalance !== prevOnChain.current) {
      prevOnChain.current = onChainBalance;
      setBalance(onChainBalance);
    }
  }, [onChainBalance]);

  useEffect(() => {
    setBets([]);
    setBalance(onChainBalance ?? INITIAL_BALANCE);
  }, [token.symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeBet = useCallback(
    (signedRow: number, globalCol: number, size: BetSize) => {
      const { tickSize, houseEdgeBps, gridHalfHeight } = token;
      const h = headRef.current;

      const visualHead = Math.floor(Math.max(0, h.globalPhase - SNAKE_COLUMN_HIT_LAG));
      const stepsAhead = globalCol - visualHead;
      if (stepsAhead < MIN_BET_STEPS_AHEAD) return;
      if (size > balance) return;

      const absRow = Math.abs(signedRow);
      const timeBuckets = Math.max(1, Math.min(8, stepsAhead));
      const rowIdx =
        signedRow > 0
          ? gridHalfHeight - signedRow
          : gridHalfHeight + Math.abs(signedRow) - 1;
      const colIdx = timeBuckets - 1;
      const cm = matrixRef.current;
      const contractMult = cm?.[rowIdx]?.[colIdx];
      const mult =
        contractMult != null && contractMult > 0
          ? contractMult
          : calculateMultiplier(
              absRow,
              timeBuckets,
              houseEdgeBps,
              token.volatility,
              tickSize,
              currentPrice,
            );
      if (mult <= 0) return;

      const center = Math.round(currentPrice / tickSize) * tickSize;
      const priceLevel = center + signedRow * tickSize;

      const bet: Bet = {
        id: `bet-${++betSeq}`,
        tokenSymbol: token.symbol,
        row: signedRow,
        targetCol: globalCol,
        col: stepsAhead,
        priceLevel,
        amount: size,
        multiplier: mult,
        placedAt: Date.now(),
        expiresAt: Date.now() + 120_000,
        status: "active",
        pnl: 0,
      };

      setBalance((b) => b - size);
      setBets((prev) => [...prev, bet]);
    },
    [token, currentPrice, balance]
  );

  // Resolve bets as snake advances
  // Track pending winnings in a ref to avoid nested setState
  const pendingWinningsRef = useRef(0);

  useEffect(() => {
    const effectiveCol = Math.floor(
      Math.max(0, head.globalPhase - SNAKE_COLUMN_HIT_LAG)
    );

    const rowAtCol = new Map<number, number>();
    for (const seg of trail) rowAtCol.set(seg.globalCol, seg.signedRow);
    rowAtCol.set(head.globalCol, head.signedRow);

    setBets((prev) => {
      let changed = false;
      const next = prev.map((b) => {
        if (b.status !== "active") return b;
        if (effectiveCol < b.targetCol) return b;

        changed = true;
        const snakeRow = rowAtCol.get(b.targetCol) ?? head.signedRow;
        const won = snakeRow === b.row;
        const pnl = won ? b.amount * b.multiplier - b.amount : -b.amount;
        return {
          ...b,
          status: won ? ("won" as const) : ("lost" as const),
          pnl,
        };
      });

      if (!changed) return prev;

      const newWinnings = next
        .filter(
          (b) =>
            b.status === "won" &&
            prev.find((p) => p.id === b.id)?.status === "active"
        )
        .reduce((sum, b) => sum + b.amount * b.multiplier, 0);

      // Store winnings for the separate setBalance call below
      pendingWinningsRef.current = newWinnings;
      return next;
    });

    // Apply winnings outside setBets to avoid nested setState
    if (pendingWinningsRef.current > 0) {
      const w = pendingWinningsRef.current;
      pendingWinningsRef.current = 0;
      setBalance((bal) => bal + w);
    }
  }, [head, trail]);

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
