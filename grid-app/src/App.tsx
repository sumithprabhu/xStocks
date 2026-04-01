import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PriceChart } from "./components/PriceChart";
import { MultiplierGrid } from "./components/MultiplierGrid";
import { BetDock } from "./components/BetDock";
import { usePriceEngine } from "./hooks/usePriceEngine";
import { useBets } from "./hooks/useBets";
import { useSnakeTrail } from "./hooks/useSnakeTrail";
import { TOKEN } from "./lib/constants";
import type { Bet, BetSize } from "./lib/types";
import { formatPrice } from "./lib/format";

const ANCHOR_FRAC = 0.38; // head dot sits at 38% from left

export function App() {
  const [betSize, setBetSize] = useState<BetSize>(10);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 700 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const m = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { currentPrice, history } = usePriceEngine(TOKEN);
  const { head, trail } = useSnakeTrail(TOKEN, currentPrice);
  const { bets, balance, placeBet } = useBets(TOKEN, currentPrice, head);

  const handleCellClick = useCallback(
    (row: number, globalCol: number) => placeBet(row, globalCol, betSize),
    [placeBet, betSize]
  );

  const onSnakeHitBet = useCallback((_bet: Bet) => {}, []);

  const anchorX = Math.floor(dims.w * ANCHOR_FRAC);

  // Head dot Y — uses same stable Y range as chart so dot aligns with line end.
  // Range comes from history data (same logic as PriceChart).
  const headerH = 26;
  const chartH = dims.h - headerH;
  const prices = history.map((p) => p.value);
  const dataMin = prices.length > 0 ? Math.min(...prices) : currentPrice;
  const dataMax = prices.length > 0 ? Math.max(...prices) : currentPrice;
  const dataRange = Math.max(dataMax - dataMin, TOKEN.tickSize * 4);
  const pad = dataRange * 0.25;
  const yMin = dataMin - pad;
  const yMax = dataMax + pad;
  const headDotY = headerH + ((yMax - currentPrice) / (yMax - yMin)) * chartH;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="app-root"
    >
      {/* ═══ LAYER 1: Grid (full screen, bet tiles live here) ═══ */}
      <MultiplierGrid
        token={TOKEN}
        currentPrice={currentPrice}
        betSize={betSize}
        bets={bets}
        snakeHead={head}
        snakeTrail={trail}
        anchorX={anchorX}
        onCellClick={handleCellClick}
        onSnakeHitBet={onSnakeHitBet}
      />

      {/* ═══ LAYER 2: Price chart overlay (draws line ON TOP of grid) ═══ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 20 }}
      >
        <PriceChart
          history={history}
          currentPrice={currentPrice}
          token={TOKEN}
          width={dims.w}
          height={dims.h}
          anchorX={anchorX}
        />
      </div>

      {/* ═══ LAYER 3: Head dot at anchor point ═══ */}
      <div className="absolute inset-0 pointer-events-none z-50">
        {/* Horizontal cursor line across full width */}
        <div
          className="absolute h-px"
          style={{
            left: 0,
            top: headDotY,
            width: dims.w,
            background: `linear-gradient(to right,
              transparent 0%,
              rgba(14,204,131,0.03) 15%,
              rgba(14,204,131,0.08) ${(ANCHOR_FRAC * 60).toFixed(0)}%,
              rgba(255,255,255,0.3) ${(ANCHOR_FRAC * 100 - 2).toFixed(0)}%,
              rgba(255,255,255,0.2) ${(ANCHOR_FRAC * 100 + 1).toFixed(0)}%,
              rgba(14,204,131,0.08) ${(ANCHOR_FRAC * 100 + 8).toFixed(0)}%,
              rgba(14,204,131,0.03) ${(ANCHOR_FRAC * 100 + 25).toFixed(0)}%,
              transparent 100%
            )`,
            transition: "top 0.35s cubic-bezier(0.22,1,0.36,1)",
          }}
        />

        {/* Glowing head dot */}
        <div
          className="absolute"
          style={{
            left: anchorX,
            top: headDotY,
            transform: "translate(-50%, -50%)",
            transition: "top 0.35s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div
            className="absolute rounded-full head-dot-pulse"
            style={{
              inset: -18,
              background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(14,204,131,0.06) 40%, transparent 70%)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              inset: -8,
              background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="rounded-full"
            style={{
              width: 9,
              height: 9,
              background: "#fff",
              boxShadow: "0 0 14px rgba(255,255,255,0.8), 0 0 28px rgba(14,204,131,0.3)",
              border: "1px solid rgba(255,255,255,0.6)",
            }}
          />
        </div>
      </div>

      {/* Price info */}
      <div className="price-overlay">
        <span className="price-overlay-symbol">{TOKEN.symbol}</span>
        <span className="price-overlay-sep">/</span>
        <span className="price-overlay-price">${formatPrice(currentPrice)}</span>
      </div>

      {/* Bet dock */}
      <BetDock betSize={betSize} onBetSizeChange={setBetSize} balance={balance} />
    </motion.div>
  );
}
