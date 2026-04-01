import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, useMotionValue, AnimatePresence } from "framer-motion";
import type { TokenConfig, Bet, BetSize } from "../lib/types";
import type { SnakeSegment } from "../hooks/useSnakeTrail";
import { maxStepsAhead } from "../hooks/useSnakeTrail";
import { SNAKE_COLUMN_HIT_LAG, TIME_HORIZONS } from "../lib/constants";
import { calculateMultiplier } from "../lib/multiplier";
import { formatMult, formatUsd, formatPnl, formatHorizon } from "../lib/format";

interface Props {
  token: TokenConfig;
  currentPrice: number;
  betSize: BetSize;
  bets: Bet[];
  snakeHead: SnakeSegment;
  snakeTrail: SnakeSegment[];
  /** X pixel where the head dot is anchored (chart/grid boundary) */
  anchorX: number;
  onCellClick: (row: number, globalCol: number) => void;
  onSnakeHitBet?: (bet: Bet) => void;
}

export function MultiplierGrid({
  token,
  currentPrice,
  bets,
  snakeHead,
  snakeTrail,
  anchorX,
  onCellClick,
  onSnakeHitBet,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cW, setCW] = useState(1200);
  const [cH, setCH] = useState(700);
  const [hitKey, setHitKey] = useState<string | null>(null);
  const prevHeadKeyRef = useRef("");

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const m = () => { setCW(el.clientWidth); setCH(el.clientHeight); };
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { gridHalfHeight, gridWidth, houseEdgeBps, tickSize } = token;
  const totalRows = gridHalfHeight * 2;
  const headerH = 26;
  const rowH = Math.max(1, (cH - headerH) / totalRows);
  const maxAhead = maxStepsAhead(token);

  // Cell width sized so ~8-9 columns fill the area RIGHT of anchor
  const gridArea = cW - anchorX;
  const cellW = Math.max(64, gridArea / 8.5);

  // ── Continuous head position ──
  const effectivePhase = snakeHead.globalPhase - SNAKE_COLUMN_HIT_LAG;
  const globalHead = Math.floor(Math.max(0, effectivePhase));

  // Raw motion value for X (no spring — must be in perfect sync)
  const fracCol = effectivePhase - globalHead;
  const scrollX = useMotionValue(0);
  useLayoutEffect(() => {
    // anchorX offset: column g=globalHead sits at anchorX
    scrollX.set(anchorX - fracCol * cellW);
  });

  // Grid rows stay fixed — only the head dot moves vertically

  // ── Row data ──
  const center = Math.round(currentPrice / tickSize) * tickSize;
  const rowData = useMemo(() => {
    const out: { signedRow: number; absRow: number; price: number }[] = [];
    for (let ri = 0; ri < totalRows; ri++) {
      const signedRow =
        ri < gridHalfHeight
          ? gridHalfHeight - ri
          : -(ri - gridHalfHeight + 1);
      out.push({
        signedRow,
        absRow: Math.abs(signedRow),
        price: center + signedRow * tickSize,
      });
    }
    return out;
  }, [gridHalfHeight, totalRows, center, tickSize]);

  const activeRowIdx = useMemo(() => {
    let best = 0, minD = Infinity;
    for (let i = 0; i < rowData.length; i++) {
      const d = Math.abs(currentPrice - rowData[i].price);
      if (d < minD) { minD = d; best = i; }
    }
    return best;
  }, [currentPrice, rowData]);

  // ── Visible columns: extend LEFT past anchor into chart area ──
  const leftBuf = Math.ceil(anchorX / cellW) + 2;  // enough to fill chart area
  const rightBuf = Math.ceil((cW - anchorX) / cellW) + 3;
  const colStart = globalHead - leftBuf;
  const colEnd = globalHead + rightBuf;

  // Bet lookup
  const cellBets = useMemo(() => {
    const m = new Map<string, Bet>();
    for (const b of bets) {
      const k = `${b.row}:${b.targetCol}`;
      const e = m.get(k);
      if (!e || b.status === "active") m.set(k, b);
    }
    return m;
  }, [bets]);

  // Trail set
  const trailSet = useMemo(() => {
    const s = new Map<number, number>();
    for (const seg of snakeTrail) s.set(seg.globalCol, seg.signedRow);
    return s;
  }, [snakeTrail]);

  // Hit detection
  useEffect(() => {
    const k = `${snakeHead.signedRow}:${snakeHead.globalCol}`;
    if (k === prevHeadKeyRef.current) return;
    prevHeadKeyRef.current = k;
    const bet = cellBets.get(k);
    if (bet?.status === "active") {
      setHitKey(k);
      onSnakeHitBet?.(bet);
      const t = setTimeout(() => setHitKey(null), 800);
      return () => clearTimeout(t);
    }
  }, [snakeHead, cellBets, onSnakeHitBet]);

  const handleClick = useCallback(
    (signedRow: number, globalCol: number) => onCellClick(signedRow, globalCol),
    [onCellClick]
  );

  // Visible columns
  const visibleCols = useMemo(() => {
    const out: {
      g: number;
      stepsAhead: number;
      localCol: number;
      isPast: boolean;
      isNow: boolean;
      canBet: boolean;
    }[] = [];
    for (let g = colStart; g <= colEnd; g++) {
      const stepsAhead = g - globalHead;
      const localCol = ((g % gridWidth) + gridWidth) % gridWidth;
      const isPast = stepsAhead < 0;
      const isNow = stepsAhead === 0;
      const canBet = stepsAhead > 0 && stepsAhead <= maxAhead;
      out.push({ g, stepsAhead, localCol, isPast, isNow, canBet });
    }
    return out;
  }, [colStart, colEnd, gridWidth, globalHead, maxAhead]);

  return (
    <div ref={containerRef} className="absolute inset-0 select-none overflow-hidden">
      {/* Scrolling content — positioned so g=globalHead is at anchorX */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ x: scrollX }}
      >
        {/* Header */}
        <div className="absolute left-0 right-0" style={{ height: headerH, top: 0 }}>
          {visibleCols.map(({ g, stepsAhead, localCol, isPast, isNow }) => {
            if (stepsAhead <= 0) return null; // no headers on past/current columns
            const sec = TIME_HORIZONS[localCol] ?? 0;
            return (
              <div
                key={g}
                className={`absolute h-full flex items-center justify-center text-[10px] font-mono tabular-nums tracking-wide
                  ${isNow ? "text-[#0ecc83] font-semibold" : "text-[#2d5a3e]"}`}
                style={{
                  left: (g - globalHead) * cellW,
                  width: cellW,
                  borderRight: "1px solid rgba(14,204,131,0.06)",
                }}
              >
                {formatHorizon(sec)}
              </div>
            );
          })}
        </div>

        {/* Grid rows */}
        {rowData.map(({ signedRow, absRow }, ri) => {
          const isActive = ri === activeRowIdx;
          const top = headerH + ri * rowH;

          return (
            <div
              key={ri}
              className="absolute left-0 right-0"
              style={{
                top,
                height: rowH,
                borderBottom: "1px solid rgba(255,255,255,0.03)",
                background: isActive ? "rgba(14,204,131,0.04)" : undefined,
              }}
            >
              {visibleCols.map(({ g, stepsAhead, isPast, isNow, canBet }) => {
                const timeBuckets = Math.max(1, Math.abs(stepsAhead));
                const mult = calculateMultiplier(absRow, timeBuckets, houseEdgeBps);

                const bet = cellBets.get(`${signedRow}:${g}`);
                const state = bet?.status;

                const trailRow = trailSet.get(g);
                const isTrailHere = trailRow === signedRow && g !== snakeHead.globalCol;
                const isHeadHere = isNow && snakeHead.signedRow === signedRow;
                const isHitFlash = hitKey === `${signedRow}:${g}`;

                // Past columns: only show if they have a bet or trail (skip empty past cells)
                const hasSomething = !!bet || isTrailHere || isHeadHere;

                // Multiplier color
                let multColor = "rgba(14,204,131,0.35)";
                if (mult >= 18) multColor = "rgba(255,80,80,0.8)";
                else if (mult >= 10) multColor = "rgba(255,140,80,0.7)";
                else if (mult >= 7) multColor = "rgba(255,200,100,0.6)";
                else if (mult >= 4) multColor = "rgba(14,204,131,0.55)";

                return (
                  <button
                    key={g}
                    type="button"
                    disabled={!canBet}
                    onClick={() => canBet && handleClick(signedRow, g)}
                    className={`absolute h-full flex items-center justify-center transition-colors duration-150
                      ${canBet ? "cursor-pointer hover:bg-[#0ecc83]/[0.06] active:bg-[#0ecc83]/[0.12]" : "cursor-default"}
                      ${isHitFlash ? "grid-cell-hit" : ""}`}
                    style={{
                      left: (g - globalHead) * cellW,
                      width: cellW,
                      // Future columns: show grid lines. Past columns: transparent unless has content
                      borderRight: isPast ? "none" : "1px solid rgba(255,255,255,0.025)",
                      opacity: isPast && !hasSomething ? 0 : 1,
                      background:
                        state === "active"
                          ? "rgba(14,204,131,0.1)"
                          : state === "won"
                          ? "rgba(14,204,131,0.06)"
                          : isTrailHere
                          ? "rgba(14,204,131,0.05)"
                          : isHeadHere
                          ? "rgba(14,204,131,0.08)"
                          : undefined,
                      boxShadow:
                        state === "active"
                          ? "inset 0 0 0 1.5px rgba(14,204,131,0.5), 0 0 12px rgba(14,204,131,0.1)"
                          : state === "won"
                          ? "inset 0 0 0 1px rgba(14,204,131,0.3)"
                          : isTrailHere
                          ? "inset 0 0 0 1px rgba(14,204,131,0.12)"
                          : isNow
                          ? "inset 0 0 0 1px rgba(14,204,131,0.15)"
                          : undefined,
                    }}
                  >
                    {/* Trail segment */}
                    {isTrailHere && (
                      <span
                        className="pointer-events-none absolute inset-1 rounded-sm"
                        style={{
                          background: "rgba(14,204,131,0.04)",
                          border: "1px solid rgba(14,204,131,0.12)",
                        }}
                      />
                    )}

                    {/* Corner dots (future columns only) */}
                    {!isPast && (
                      <>
                        <span className="grid-dot grid-dot-tl" />
                        <span className="grid-dot grid-dot-tr" />
                        <span className="grid-dot grid-dot-bl" />
                        <span className="grid-dot grid-dot-br" />
                      </>
                    )}

                    <AnimatePresence>
                      {bet ? (
                        <motion.div
                          key={bet.id}
                          initial={{ opacity: 0, scale: 0.6, y: 6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{ type: "spring", stiffness: 450, damping: 24, mass: 0.4 }}
                          className="relative z-[3]"
                        >
                          <div
                            className="bet-card"
                            style={{
                              background:
                                state === "won"
                                  ? "rgba(14,204,131,0.2)"
                                  : state === "lost"
                                  ? "rgba(239,68,68,0.1)"
                                  : "rgba(10,46,26,0.85)",
                              borderColor:
                                state === "won"
                                  ? "rgba(14,204,131,0.5)"
                                  : state === "lost"
                                  ? "rgba(239,68,68,0.3)"
                                  : "rgba(14,204,131,0.5)",
                              boxShadow:
                                state === "won"
                                  ? "0 0 16px rgba(14,204,131,0.2)"
                                  : state === "active"
                                  ? "0 0 10px rgba(14,204,131,0.12)"
                                  : "none",
                            }}
                          >
                            <div
                              className="bet-card-amount"
                              style={{
                                color:
                                  state === "won"
                                    ? "#0ecc83"
                                    : state === "lost"
                                    ? "#f87171"
                                    : "#ffffff",
                                textDecoration:
                                  state === "lost" ? "line-through" : "none",
                              }}
                            >
                              {state === "won" ? formatPnl(bet.pnl) : formatUsd(bet.amount)}
                            </div>
                            <div
                              className="bet-card-mult"
                              style={{
                                color:
                                  state === "lost"
                                    ? "rgba(239,68,68,0.4)"
                                    : "rgba(14,204,131,0.65)",
                              }}
                            >
                              {formatMult(bet.multiplier)}
                            </div>
                          </div>
                        </motion.div>
                      ) : !isPast ? (
                        <span
                          className="cell-mult-label relative z-[2] pointer-events-none"
                          style={{ color: multColor }}
                        >
                          {formatMult(mult)}
                        </span>
                      ) : null}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          );
        })}
      </motion.div>

      {/* Active row highlight */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-30"
        style={{
          top: headerH + activeRowIdx * rowH,
          height: rowH,
          background: "rgba(14,204,131,0.035)",
          borderTop: "1px solid rgba(14,204,131,0.07)",
          borderBottom: "1px solid rgba(14,204,131,0.07)",
          transition: "top 0.45s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </div>
  );
}
