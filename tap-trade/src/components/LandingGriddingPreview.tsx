import { useLayoutEffect, useRef, useState } from "react";
import { MultiplierGrid } from "./MultiplierGrid";
import { useSyntheticPriceSequence } from "../hooks/useSyntheticPriceSequence";
import { useSnakeTrail } from "../hooks/useSnakeTrail";
import { TOKENS } from "../lib/constants";
import { formatPrice } from "../lib/format";

const PREVIEW_TOKEN = TOKENS[0]!;

export function LandingGriddingPreview() {
  const { currentPrice } = useSyntheticPriceSequence(PREVIEW_TOKEN);
  const { head, trail } = useSnakeTrail(PREVIEW_TOKEN, currentPrice);
  const containerRef = useRef<HTMLDivElement>(null);
  const [anchorX, setAnchorX] = useState(200);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const m = () => setAnchorX(Math.floor(el.clientWidth * 0.38));
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="rounded-xl border border-[#ff3b8d]/15 overflow-hidden flex flex-col bg-[#0a0e1a] w-full min-h-[220px] h-[min(42dvh,400px)] lg:h-auto lg:aspect-[21/10] lg:max-h-[min(52dvh,540px)]"
      aria-label="Live grid preview"
    >
      <div className="shrink-0 px-4 py-2.5 border-b border-[#ff3b8d]/10 bg-[#0a0e1a]">
        <p className="text-[17px] text-white/95 font-medium tracking-tight">
          <span className="text-white">{PREVIEW_TOKEN.symbol}</span>
          <span className="text-zinc-500 mx-1.5">—</span>
          <span className="text-white tabular-nums">
            $ {formatPrice(currentPrice)}
          </span>
        </p>
      </div>

      <div ref={containerRef} className="relative flex-1 min-h-0 pointer-events-none select-none">
        <MultiplierGrid
          token={PREVIEW_TOKEN}
          currentPrice={currentPrice}
          betSize={10}
          bets={[]}
          snakeHead={head}
          snakeTrail={trail}
          anchorX={anchorX}
          onCellClick={() => {}}
        />
      </div>
    </div>
  );
}
