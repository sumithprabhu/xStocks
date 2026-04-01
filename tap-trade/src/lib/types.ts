export type BetStatus = "active" | "won" | "lost";

export interface TokenConfig {
  symbol: string;
  ticker: string;
  name: string;
  basePrice: number;
  tickSize: number;
  volatility: number;
  gridWidth: number;
  gridHalfHeight: number;
  houseEdgeBps: number;
}

export interface Bet {
  id: string;
  tokenSymbol: string;
  row: number;
  /** Fixed grid column index (0..gridWidth-1) */
  targetCol: number;
  /** Steps ahead when placed (for display) */
  col: number;
  priceLevel: number;
  amount: number;
  multiplier: number;
  placedAt: number;
  expiresAt: number;
  status: BetStatus;
  pnl: number;
}

export interface PricePoint {
  time: number;
  value: number;
}

export type BetSize = 1 | 5 | 10 | 50;
