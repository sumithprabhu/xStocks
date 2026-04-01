/** Degrees for CSS rotate; chart Y increases downward like canvas. */
export function lastSegmentAngleDeg(
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  return (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
}

/**
 * Last segment angle for LineType.WithSteps in pixel space: horizontal to new time, then vertical to new price.
 */
export function withStepsLastSegmentAngleDegPx(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  price0: number,
  price1: number
): number {
  const samePrice =
    price0 === price1 ||
    Math.abs(price1 - price0) <= 1e-9 * Math.max(1, Math.abs(price0));
  if (samePrice) {
    return lastSegmentAngleDeg(x0, y0, x1, y0);
  }
  return lastSegmentAngleDeg(x1, y0, x1, y1);
}
