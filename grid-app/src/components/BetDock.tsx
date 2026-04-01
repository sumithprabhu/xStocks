import type { BetSize } from "../lib/types";
import { BET_SIZES } from "../lib/constants";

interface Props {
  betSize: BetSize;
  onBetSizeChange: (s: BetSize) => void;
  balance: number;
}

export function BetDock({ betSize, onBetSizeChange, balance }: Props) {
  const idx = BET_SIZES.indexOf(betSize);
  const up = () => {
    if (idx < BET_SIZES.length - 1) onBetSizeChange(BET_SIZES[idx + 1]);
  };
  const down = () => {
    if (idx > 0) onBetSizeChange(BET_SIZES[idx - 1]);
  };

  return (
    <div className="absolute bottom-5 left-5 z-50 flex items-center gap-3">
      {/* Bet size control */}
      <div className="bet-dock">
        <button
          type="button"
          onClick={down}
          disabled={idx <= 0}
          className="bet-dock-btn"
          aria-label="Decrease bet"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className="bet-dock-amount">${betSize}</span>
        <button
          type="button"
          onClick={up}
          disabled={idx >= BET_SIZES.length - 1}
          className="bet-dock-btn"
          aria-label="Increase bet"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Balance */}
      <div className="balance-pill">
        <span className="balance-pill-label">BAL</span>
        <span className="balance-pill-value">${balance.toFixed(2)}</span>
      </div>
    </div>
  );
}
