import type { TokenConfig, BetSize } from "./types";
import { CONTRACTS } from "./contracts";

/** Wall-clock duration for one full sweep (right → left, toward chart seam). */
export const SNAKE_SWEEP_MS = 28_000;

/** Rightmost playable column = gridWidth - 1 - SNAKE_RIGHT_RESERVE */
export const SNAKE_RIGHT_RESERVE = 1;

/** Minimum columns ahead a bet must be placed (prevents trivial near-head bets) */
export const MIN_BET_STEPS_AHEAD = 2;

/**
 * Fraction of one column (0–1) to wait before the logical column advances.
 * Matches hit/lose + “current” cell to where the sweep reads visually.
 */
export const SNAKE_COLUMN_HIT_LAG = 0.42;

export const SNAKE_TRAIL_MAX_SEGMENTS = 28;

/** Per-column hold / expiry horizon labels (8 columns). */
export const GRID_TIME_HORIZONS_SEC = [5, 10, 15, 30, 45, 60, 300, 600] as const;

const W_QQQ = CONTRACTS.wQQQx;
const W_SPY = CONTRACTS.wSPYx;

/** On-chain grid only knows active collateral tokens; map charts to those addresses. */
function gridTokenForTicker(ticker: string): `0x${string}` {
  if (ticker === "QQQ") return W_QQQ;
  if (ticker === "SPY") return W_SPY;
  return W_QQQ;
}

export const TOKENS: TokenConfig[] = [
  // ── Tech ──
  //  volatility = per-second σ, calibrated for Black-Scholes with 3.5 s visual buckets
  //  tickSize $0.10 = realistic stock price granularity
  //  Higher-priced stocks need lower vol (same $0.10 is a smaller % move)
  { symbol: "AAPLx", ticker: "AAPL", name: "Apple", contractAddress: gridTokenForTicker("AAPL"), basePrice: 255, tickSize: 0.1, volatility: 0.00028, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  { symbol: "NVDAx", ticker: "NVDA", name: "NVIDIA", contractAddress: gridTokenForTicker("NVDA"), basePrice: 177, tickSize: 0.1, volatility: 0.00035, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  { symbol: "TSLAx", ticker: "TSLA", name: "Tesla", contractAddress: gridTokenForTicker("TSLA"), basePrice: 380, tickSize: 0.1, volatility: 0.00025, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  { symbol: "MSFTx", ticker: "MSFT", name: "Microsoft", contractAddress: gridTokenForTicker("MSFT"), basePrice: 376, tickSize: 0.1, volatility: 0.00022, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  { symbol: "GOOGx", ticker: "GOOG", name: "Alphabet", contractAddress: gridTokenForTicker("GOOG"), basePrice: 165, tickSize: 0.1, volatility: 0.00038, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  { symbol: "AMZNx", ticker: "AMZN", name: "Amazon", contractAddress: gridTokenForTicker("AMZN"), basePrice: 205, tickSize: 0.1, volatility: 0.00032, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  { symbol: "METAx", ticker: "META", name: "Meta", contractAddress: gridTokenForTicker("META"), basePrice: 595, tickSize: 0.1, volatility: 0.00018, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  // ── Indices / ETFs ──
  { symbol: "SPYx", ticker: "SPY", name: "S&P 500", contractAddress: W_SPY, basePrice: 656, tickSize: 0.1, volatility: 0.00016, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  { symbol: "QQQx", ticker: "QQQ", name: "Nasdaq 100", contractAddress: W_QQQ, basePrice: 540, tickSize: 0.1, volatility: 0.00020, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  { symbol: "IWMx", ticker: "IWM", name: "Russell 2000", contractAddress: gridTokenForTicker("IWM"), basePrice: 210, tickSize: 0.1, volatility: 0.00032, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  // ── Finance ──
  { symbol: "JPMx", ticker: "JPM", name: "JPMorgan", contractAddress: gridTokenForTicker("JPM"), basePrice: 260, tickSize: 0.1, volatility: 0.00026, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  { symbol: "GSx", ticker: "GS", name: "Goldman Sachs", contractAddress: gridTokenForTicker("GS"), basePrice: 570, tickSize: 0.1, volatility: 0.00018, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  // ── Other ──
  { symbol: "COINx", ticker: "COIN", name: "Coinbase", contractAddress: gridTokenForTicker("COIN"), basePrice: 235, tickSize: 0.1, volatility: 0.00040, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
  { symbol: "PLTRx", ticker: "PLTR", name: "Palantir", contractAddress: gridTokenForTicker("PLTR"), basePrice: 115, tickSize: 0.1, volatility: 0.00048, gridWidth: 8, gridHalfHeight: 6, houseEdgeBps: 1000 },
];

export const BET_SIZES: BetSize[] = [1, 5, 10, 50];
export const INITIAL_BALANCE = 1000;
export const POLL_MS = 500;
export const MAX_CHART_POINTS = 500;
