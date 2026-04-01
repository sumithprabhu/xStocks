import { GRID_TIME_HORIZONS_SEC } from "./constants";

export function formatHorizonLabel(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) {
    const m = sec / 60;
    return Number.isInteger(m) ? `${m}m` : `${Math.round(m)}m`;
  }
  const h = sec / 3600;
  return Number.isInteger(h) ? `${h}h` : `${Math.round(h)}h`;
}

export function horizonSecForColumn(colIndex: number): number {
  return GRID_TIME_HORIZONS_SEC[colIndex] ?? 60;
}
