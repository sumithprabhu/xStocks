import { useEffect, useRef, useState } from "react";
import type { TokenConfig } from "../lib/types";
import {
  SNAKE_SWEEP_MS,
  SNAKE_TRAIL_MAX,
  SNAKE_RIGHT_RESERVE,
} from "../lib/constants";

export interface SnakeSegment {
  signedRow: number;
  /** Monotonically increasing global column index (never wraps) */
  globalCol: number;
  /** Continuous float phase for smooth sub-column scrolling */
  globalPhase: number;
}

export function maxStepsAhead(token: TokenConfig) {
  return token.gridWidth - 1 - SNAKE_RIGHT_RESERVE;
}

export function useSnakeTrail(token: TokenConfig, currentPrice: number) {
  const startRef = useRef(Date.now());
  const [head, setHead] = useState<SnakeSegment>({
    signedRow: 0,
    globalCol: 0,
    globalPhase: 0,
  });
  const [trail, setTrail] = useState<SnakeSegment[]>([]);
  const prevCol = useRef(-1);
  const trailBuf = useRef<SnakeSegment[]>([]);

  useEffect(() => {
    const { gridWidth, gridHalfHeight, tickSize } = token;
    const colMs = SNAKE_SWEEP_MS / gridWidth;
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const globalPhase = elapsed / colMs;
      const globalCol = Math.floor(globalPhase);

      const center = Math.round(currentPrice / tickSize) * tickSize;
      const offset = Math.round((currentPrice - center) / tickSize);
      const signedRow = Math.max(
        -gridHalfHeight + 1,
        Math.min(gridHalfHeight, offset)
      );

      const seg: SnakeSegment = { signedRow, globalCol, globalPhase };

      if (globalCol !== prevCol.current) {
        prevCol.current = globalCol;
        trailBuf.current = [seg, ...trailBuf.current].slice(0, SNAKE_TRAIL_MAX);
        setTrail([...trailBuf.current]);
      }
      setHead(seg);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [token, currentPrice]);

  return { head, trail };
}
