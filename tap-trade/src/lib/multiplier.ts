/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  xStocks Grid — Black-Scholes Multiplier Engine
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  MATHEMATICAL MODEL  —  Geometric Brownian Motion (GBM)
 *  ──────────────────────────────────────────────────────
 *  Stock prices are modelled by the Itô stochastic differential equation:
 *
 *      dS = μ · S · dt  +  σ · S · dW
 *
 *  where
 *    S    = stock price at time t
 *    μ    = drift (expected return — ignored for short-horizon fair pricing)
 *    σ    = annualised volatility
 *    W(t) = standard Wiener process (Brownian motion)
 *
 *  Under GBM the log-return over horizon T is normally distributed:
 *
 *      ln(S_T / S₀) ~ N( (μ − ½σ²)·T,  σ²·T )
 *
 *  The Wiener process W(t) satisfies:
 *    • W(0) = 0
 *    • Increments W(t+s) − W(t) ~ N(0, s)  (normally distributed)
 *    • Increments over non-overlapping intervals are independent
 *    • Paths are continuous (but nowhere differentiable — fractal)
 *
 *
 *  BARRIER-TOUCH PROBABILITY  —  Reflection Principle
 *  ───────────────────────────────────────────────────
 *  Each grid cell is a binary "touch option": the bet wins if the price
 *  TOUCHES a barrier level L at any instant within time window [0, T].
 *
 *  For a driftless Brownian motion starting at 0, the reflection principle
 *  states that the probability of ever reaching level b > 0 by time T is:
 *
 *      P(max_{0≤t≤T} W(t) ≥ b) = 2 · P(W(T) ≥ b)
 *
 *  This is because every path that hits b and ends below b has a "mirror"
 *  path (reflected at the first hitting time) that ends above b — a 1:1
 *  correspondence that doubles the tail probability.
 *
 *  Applying this to GBM (via the log-price process, ignoring drift):
 *
 *      P_touch = 2 · Φ(−z)
 *
 *  where
 *      z = |ln(L / S₀)| / (σ · √T)                                  (1)
 *
 *  For small relative moves:  ln(L/S₀) ≈ (L − S₀)/S₀ = d, so:
 *
 *      z ≈ |d| / (σ · √T)        where d = tick_distance / spot     (2)
 *
 *  and Φ is the standard normal CDF.
 *
 *
 *  VOLATILITY SCALING  —  Square-Root-of-Time Rule
 *  ────────────────────────────────────────────────
 *  The variance of Brownian motion scales linearly with time:
 *
 *      Var[W(T)] = T     ⟹     σ_window = σ_annual · √(T / T_year)
 *
 *  This is equivalent to:
 *
 *      σ_window = σ_per_second · √T_seconds
 *
 *  since σ_per_second = σ_annual / √(seconds_per_year).
 *
 *
 *  MULTIPLIER DERIVATION
 *  ─────────────────────
 *      fair_mult    = 1 / P_touch         (actuarially fair payout)
 *      display_mult = fair_mult · (1 − h)  (after house edge h)
 *
 *  Mirrors the on-chain GridMath.sol calculation.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Constants ──────────────────────────────────────────────────────────────

const SECONDS_PER_YEAR = 31_536_000;
const SQRT2 = Math.SQRT2; // √2 ≈ 1.41421356

/**
 * Seconds per visual grid column.
 * SNAKE_SWEEP_MS (28 s) / gridWidth (8 cols) ≈ 3.5 s.
 *
 * The on-chain contract uses 30 s buckets with $0.50 ticks; its multipliers
 * are fetched via useGridMatrix and always take precedence.  This constant
 * is only used by the local Black-Scholes fallback, which pairs with the
 * visual column timing and $0.10 ticks for a consistent display.
 */
const VISUAL_BUCKET_SECONDS = 3.5;

const MAX_MULT = 100; // cap  (matches GridMath 10 000 → 100×)
const MIN_MULT = 1.1; // floor (matches GridMath 110 → 1.10×)

// ── Standard Normal CDF ────────────────────────────────────────────────────
//
// Abramowitz & Stegun §7.1.26 rational approximation for erfc(x).
// Coefficients & p are for the complementary error function:
//
//   erfc(x) ≈ t · exp(−x²) · (a₁ + a₂t + a₃t² + a₄t³ + a₅t⁴)
//   where t = 1 / (1 + p·x)
//
// Converted to Φ via:  Φ(x) = ½ · erfc(−x/√2)
//
// Maximum absolute error < 7.5 × 10⁻⁸.

function normCdf(x: number): number {
  if (x > 8) return 1;
  if (x < -8) return 0;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;

  // erfc coefficients require u = |x| / √2
  const u = Math.abs(x) / SQRT2;
  const t = 1 / (1 + p * u);

  // Horner form: poly = ((((a5·t + a4)·t + a3)·t + a2)·t + a1)·t
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;

  // erfc(u) ≈ poly · exp(−u²) = poly · exp(−x²/2)
  const y = 1 - poly * Math.exp((-x * x) / 2);

  return 0.5 * (1 + sign * y);
}

// ── Barrier-Touch Probability ──────────────────────────────────────────────

/**
 * Probability that a GBM price path touches a barrier at relative distance
 * `relDist` from spot within `windowSeconds`.
 *
 * Via the reflection principle of Brownian motion:
 *
 *     P_touch = 2 · Φ(−|z|)
 *
 *     z = |relDist| / σ_window
 *     σ_window = σ_annual · √(T / T_year)
 *
 * @param relDist        |(L − S)| / S  (positive fraction)
 * @param annualVol      Annualised σ as decimal (e.g. 2.0 = 200%)
 * @param windowSeconds  Time horizon in seconds
 */
function barrierTouchProb(
  relDist: number,
  annualVol: number,
  windowSeconds: number,
): number {
  if (windowSeconds <= 0 || annualVol <= 0) return 0;

  // σ_window = σ_annual · √(T_window / T_year)   — square-root-of-time rule
  const sigmaWindow = annualVol * Math.sqrt(windowSeconds / SECONDS_PER_YEAR);
  if (sigmaWindow < 1e-15) return 0;

  // z-score: how many σ_window the required move represents
  const z = Math.abs(relDist) / sigmaWindow;

  // Reflection principle:  P = 2 · Φ(−|z|)
  return 2 * normCdf(-z);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Black-Scholes multiplier for a single grid cell.
 *
 * Steps (mirrors GridMath.sol on-chain):
 *   1. Convert per-second σ → annual σ
 *   2. Compute σ_window for the bucket time horizon
 *   3. Compute z-score from required price move
 *   4. Barrier-touch probability via Brownian reflection
 *   5. Fair multiplier = 1 / P
 *   6. Apply house edge
 *   7. Clamp to [1.1×, 100×]
 *
 * @param absDistance   Rows from current price (1 … gridHalfHeight)
 * @param timeBuckets  Columns ahead (1 … gridWidth)
 * @param houseEdgeBps House edge in basis points (1000 = 10%)
 * @param volatility   Per-second σ (TokenConfig.volatility)
 * @param tickSize     $ per grid row
 * @param currentPrice Current spot $
 */
export function calculateMultiplier(
  absDistance: number,
  timeBuckets: number,
  houseEdgeBps: number = 1000,
  volatility: number = 0.001,
  tickSize: number = 0.5,
  currentPrice: number = 480,
): number {
  if (absDistance <= 0 || timeBuckets <= 0 || currentPrice <= 0) return 0;

  // 1. Per-second σ → annual σ:  σ_annual = σ_sec · √(T_year)
  const annualVol = volatility * Math.sqrt(SECONDS_PER_YEAR);

  // 2. Required move as fraction of spot
  const relDist = (absDistance * tickSize) / currentPrice;

  // 3. Time window  (3.5 s per visual column)
  const windowSeconds = timeBuckets * VISUAL_BUCKET_SECONDS;

  // 4. Barrier-touch probability  (GBM + reflection principle)
  const prob = barrierTouchProb(relDist, annualVol, windowSeconds);

  // 5–6. Fair mult → apply house edge
  if (prob < 1 / MAX_MULT) {
    return Math.round(MAX_MULT * (1 - houseEdgeBps / 10_000) * 100) / 100;
  }
  const mult = (1 / prob) * (1 - houseEdgeBps / 10_000);

  // 7. Clamp & round to 2 dp
  return Math.round(Math.max(MIN_MULT, Math.min(MAX_MULT, mult)) * 100) / 100;
}

/**
 * Build the full multiplier grid for one token.
 *
 * Row 0 = top (highest price, +halfHeight rows above centre).
 * Row last = bottom (lowest price, −halfHeight below centre).
 */
export function buildMultiplierGrid(
  halfHeight: number,
  width: number,
  houseEdgeBps: number,
  volatility: number = 0.001,
  tickSize: number = 0.5,
  currentPrice: number = 480,
): number[][] {
  const rows = halfHeight * 2;
  const grid: number[][] = [];

  for (let r = 0; r < rows; r++) {
    const absRow = r < halfHeight ? halfHeight - r : r - halfHeight + 1;
    const row: number[] = [];
    for (let c = 0; c < width; c++) {
      row.push(
        calculateMultiplier(absRow, c + 1, houseEdgeBps, volatility, tickSize, currentPrice),
      );
    }
    grid.push(row);
  }
  return grid;
}
