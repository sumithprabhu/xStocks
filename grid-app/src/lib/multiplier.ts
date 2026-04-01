/**
 * Mirrors on-chain calculateMultiplier().
 * absDistance = rows from center, timeBuckets = column index + 1
 */
export function calculateMultiplier(
  absDistance: number,
  timeBuckets: number,
  houseEdgeBps: number = 1000
): number {
  if (absDistance <= 0 || timeBuckets <= 0) return 0;
  const score = absDistance * timeBuckets;

  let raw: number;
  if (score === 1) raw = 200;
  else if (score <= 3) raw = 300;
  else if (score <= 6) raw = 500;
  else if (score <= 10) raw = 800;
  else if (score <= 15) raw = 1200;
  else raw = 2000;

  return (raw * (10_000 - houseEdgeBps)) / 10_000 / 100;
}

export function buildMultiplierGrid(
  halfHeight: number,
  width: number,
  houseEdgeBps: number
): number[][] {
  const rows = halfHeight * 2;
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const absRow = r < halfHeight ? halfHeight - r : r - halfHeight + 1;
    const row: number[] = [];
    for (let c = 0; c < width; c++) {
      row.push(calculateMultiplier(absRow, c + 1, houseEdgeBps));
    }
    grid.push(row);
  }
  return grid;
}
