export type BetStatus = "active" | "won" | "lost";

export interface TokenConfig {
  symbol: string;
  name: string;
  basePrice: number;
  tickSize: number;
  gridWidth: number;
  gridHalfHeight: number;
  houseEdgeBps: number;
}

export interface Bet {
  id: string;
  row: number;         // signed row relative to center
  targetCol: number;   // absolute global column index (monotonically increasing)
  col: number;         // steps ahead when placed
  priceLevel: number;
  amount: number;
  multiplier: number;
  placedAt: number;
  status: BetStatus;
  pnl: number;
}

export interface PricePoint {
  time: number;
  value: number;
}

export type BetSize = 1 | 5 | 10 | 50;
