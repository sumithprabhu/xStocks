import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TopBar } from "./TopBar";
import { ChartGridSplit } from "./ChartGridSplit";
import { BetDock } from "./BetDock";
import { BetToast, type ToastPayload } from "./BetToast";
import { usePriceEngine } from "../hooks/usePriceEngine";
import { useBets } from "../hooks/useBets";
import { useSnakeTrail } from "../hooks/useSnakeTrail";
import { TOKENS } from "../lib/constants";
import type { Bet, BetSize } from "../lib/types";
import { celebrateWin } from "../lib/celebrate";
import { formatBetCompact, formatPnl, formatUsd } from "../lib/format";

export function GridApp() {
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [betSize, setBetSize] = useState<BetSize>(10);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const betStatusRef = useRef<Map<string, string>>(new Map());

  const { currentPrice, history } = usePriceEngine(selectedToken);
  const { head, trail } = useSnakeTrail(selectedToken, currentPrice);
  const { bets, balance, placeBet } = useBets(selectedToken, currentPrice, head);

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
        setToast({ id: `win-${b.id}`, kind: "win", title: "WIN", subtitle: formatPnl(b.pnl) });
      } else if (prev === "active" && b.status === "lost") {
        setToast({ id: `lose-${b.id}`, kind: "lose", title: "LOSS", subtitle: `Stake ${formatUsd(b.amount)}` });
      }
      betStatusRef.current.set(b.id, b.status);
    }
  }, [bets]);

  const handleCellClick = useCallback(
    (row: number, targetCol: number) => placeBet(row, targetCol, betSize),
    [placeBet, betSize]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="h-screen w-screen bg-[#0a0e1a] flex flex-col overflow-hidden select-none"
    >
      <TopBar
        tokens={TOKENS}
        selectedToken={selectedToken}
        onSelectToken={setSelectedToken}
        currentPrice={currentPrice}
        balance={balance}
      />

      <div className="flex-1 relative min-h-0">
        <ChartGridSplit
          token={selectedToken}
          currentPrice={currentPrice}
          history={history}
          head={head}
          trail={trail}
          bets={bets}
          betSize={betSize}
          onCellClick={handleCellClick}
          onSnakeHitBet={onSnakeHitBet}
        />

        <BetDock betSize={betSize} onBetSizeChange={setBetSize} />
        <BetToast toast={toast} onDismiss={dismissToast} />
      </div>
    </motion.div>
  );
}
