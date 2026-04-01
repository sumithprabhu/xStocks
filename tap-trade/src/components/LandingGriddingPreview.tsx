import { ChartGridSplit } from "./ChartGridSplit";
import { useSyntheticPriceSequence } from "../hooks/useSyntheticPriceSequence";
import { useSnakeTrail } from "../hooks/useSnakeTrail";
import { TOKENS } from "../lib/constants";
import { formatPrice } from "../lib/format";

const PREVIEW_TOKEN = TOKENS[0]!;

/**
 * Demo preview of the gridding screen (chart + arrow + grid) for the landing hero.
 * Uses local synthetic prices (no API). Symbol/price row matches `TopBar`.
 */
export function LandingGriddingPreview() {
  const { currentPrice, history } = useSyntheticPriceSequence(PREVIEW_TOKEN);
  const { head, trail } = useSnakeTrail(PREVIEW_TOKEN, currentPrice);

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

      <div className="relative flex-1 min-h-0 pointer-events-none select-none">
        <ChartGridSplit
          token={PREVIEW_TOKEN}
          currentPrice={currentPrice}
          history={history}
          head={head}
          trail={trail}
          bets={[]}
          betSize={10}
          onCellClick={() => {}}
        />
      </div>
    </div>
  );
}
