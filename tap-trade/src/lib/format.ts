const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsd(v: number) {
  return usd.format(v);
}

export function formatPrice(v: number) {
  return v.toFixed(2);
}

export function formatMult(v: number) {
  return v >= 10 ? `${Math.round(v)}x` : `${v.toFixed(1)}x`;
}

export function formatPnl(v: number) {
  return `${v >= 0 ? "+" : ""}${usd.format(v)}`;
}

export function formatPct(v: number) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

/** One-line bet label like "$10 x2" */
export function formatBetCompact(amount: number, mult: number) {
  const m =
    mult >= 10 ? `${Math.round(mult)}` : mult.toFixed(1).replace(/\.0$/, "");
  return `$${amount} x${m}`;
}
