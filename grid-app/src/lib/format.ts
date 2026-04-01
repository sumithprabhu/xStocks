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

export function formatHorizon(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${Math.round(sec / 3600)}h`;
}
