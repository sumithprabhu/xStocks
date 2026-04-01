import { useCallback, useEffect, useRef, useState } from "react";
import { TopBar } from "./components/TopBar";
import { PriceChart } from "./components/PriceChart";
import { MultiplierGrid } from "./components/MultiplierGrid";
import { BetDock } from "./components/BetDock";
import { BetToast, type ToastPayload } from "./components/BetToast";
import { usePriceEngine } from "./hooks/usePriceEngine";
import { useBets } from "./hooks/useBets";
import { useSnakeTrail } from "./hooks/useSnakeTrail";
import { TOKENS } from "./lib/constants";
import type { Bet, BetSize } from "./lib/types";
import { celebrateWin } from "./lib/celebrate";
import { formatBetCompact, formatPnl, formatUsd } from "./lib/format";

export default function App() {
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [betSize, setBetSize] = useState<BetSize>(10);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const betStatusRef = useRef<Map<string, string>>(new Map());

  const { currentPrice, history } = usePriceEngine(selectedToken);
  const { head, trail } = useSnakeTrail(selectedToken, currentPrice);
  const { bets, balance, placeBet } = useBets(
    selectedToken,
    currentPrice,
    head
  );

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    betStatusRef.current = new Map();
  }, [selectedToken.symbol]);

  const onSnakeHitBet = useCallback((bet: Bet) => {
    setToast({
      id: `hit-${bet.id}-${Date.now()}`,
      kind: "hit",
      title: "HIT",
      subtitle: formatBetCompact(bet.amount, bet.multiplier),
    });
  }, []);

  useEffect(() => {
    for (const b of bets) {
      const prev = betStatusRef.current.get(b.id);
      if (prev === "active" && b.status === "won") {
        celebrateWin();
        setToast({
          id: `win-${b.id}`,
          kind: "win",
          title: "WIN",
          subtitle: formatPnl(b.pnl),
        });
      } else if (prev === "active" && b.status === "lost") {
        setToast({
          id: `lose-${b.id}`,
          kind: "lose",
          title: "LOSS",
          subtitle: `Stake ${formatUsd(b.amount)}`,
        });
      }
      betStatusRef.current.set(b.id, b.status);
    }
  }, [bets]);

  const handleCellClick = useCallback(
    (row: number, targetCol: number) =>
      placeBet(row, targetCol, betSize),
    [placeBet, betSize]
  );

  return (
    <div className="h-screen w-screen bg-[#0a0e1a] flex flex-col overflow-hidden select-none">
      <TopBar
        tokens={TOKENS}
        selectedToken={selectedToken}
        onSelectToken={setSelectedToken}
        currentPrice={currentPrice}
        balance={balance}
      />

      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0 z-0 chart-dot-bg overflow-visible">
          <div className="relative h-full min-h-0 w-full overflow-visible">
            <div className="relative z-[3] h-full w-full">
              <PriceChart
                history={history}
                currentPrice={currentPrice}
                tickSize={selectedToken.tickSize}
                gridHalfHeight={selectedToken.gridHalfHeight}
              />
            </div>
            <div
              className="chart-trail-fade pointer-events-none absolute inset-y-0 left-0 z-[1] w-[min(55%,480px)]"
              aria-hidden
            />
          </div>
        </div>

        <div className="absolute inset-y-0 right-0 w-[52%] z-10 grid-fade-left border-l border-[#ff3b8d]/[0.08] bg-[#080c14]/40 backdrop-blur-[2px]">
          <div className="relative h-full w-full">
            <div
              className="grid-gradient-overlay absolute inset-0 z-0 rounded-sm"
              aria-hidden
            />
            <div className="relative z-10 h-full">
              <MultiplierGrid
                token={selectedToken}
                currentPrice={currentPrice}
                betSize={betSize}
                bets={bets}
                snakeHead={head}
                snakeTrail={trail}
                onCellClick={handleCellClick}
                onSnakeHitBet={onSnakeHitBet}
              />
            </div>
          </div>
        </div>

        <BetDock betSize={betSize} onBetSizeChange={setBetSize} />
        <BetToast toast={toast} onDismiss={dismissToast} />
      </div>
    </div>
  );
}
