import type { TokenConfig, BetSize } from "./types";

export const SNAKE_SWEEP_MS = 28_000;
export const SNAKE_RIGHT_RESERVE = 1;
export const SNAKE_COLUMN_HIT_LAG = 0.42;
export const SNAKE_TRAIL_MAX = 28;
export const MAX_CHART_POINTS = 300;

export const TIME_HORIZONS = [5, 10, 15, 30, 45, 60, 300, 600] as const;

export const TOKEN: TokenConfig = {
  symbol: "AAPLx",
  name: "Apple",
  basePrice: 255.26,
  tickSize: 0.1,
  gridWidth: 8,
  gridHalfHeight: 6,
  houseEdgeBps: 1000,
};

export const BET_SIZES: BetSize[] = [1, 5, 10, 50];
export const INITIAL_BALANCE = 1000;
