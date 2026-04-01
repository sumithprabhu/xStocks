import { useEffect, useRef } from "react";
import type { PricePoint, TokenConfig } from "../lib/types";

interface Props {
  history: PricePoint[];
  currentPrice: number;
  token: TokenConfig;
  width: number;
  height: number;
  anchorX: number;
}

/**
 * Transparent canvas overlay drawing the price line from x=0 to x=anchorX.
 * Y coordinates align with the grid rows. No background fill — grid shows through.
 */
export function PriceChart({ history, currentPrice, token, width, height, anchorX }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2 || width < 1 || height < 1) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Y mapping — stable range from the history data itself.
    // This keeps old data points fixed; only the head end moves.
    const headerH = 26;
    const chartH = height - headerH;

    const prices = history.map((p) => p.value);
    const dataMin = Math.min(...prices);
    const dataMax = Math.max(...prices);
    const dataRange = Math.max(dataMax - dataMin, token.tickSize * 4);
    const pad = dataRange * 0.25;
    const yMin = dataMin - pad;
    const yMax = dataMax + pad;

    const priceToY = (price: number) => {
      return headerH + ((yMax - price) / (yMax - yMin)) * chartH;
    };

    // X: history spans left edge to anchorX
    const toX = (i: number) => (i / (history.length - 1)) * anchorX;

    // ── Subtle grid lines on chart area ──
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 0.5;

    // Horizontal lines at each tick level within visible range
    const tickStart = Math.ceil(yMin / token.tickSize) * token.tickSize;
    const tickEnd = Math.floor(yMax / token.tickSize) * token.tickSize;
    for (let p = tickStart; p <= tickEnd; p += token.tickSize) {
      const y = priceToY(p);
      if (y > headerH && y < height) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(anchorX, y);
        ctx.stroke();
      }
    }

    // Vertical lines
    const vSpacing = anchorX / 6;
    for (let x = vSpacing; x < anchorX; x += vSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, headerH);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Dot intersections
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    for (let x = vSpacing; x < anchorX; x += vSpacing) {
      for (let p = tickStart; p <= tickEnd; p += token.tickSize * 2) {
        const y = priceToY(p);
        if (y > headerH && y < height) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ── Map points ──
    const points = history.map((p, i) => ({ x: toX(i), y: priceToY(p.value) }));

    // ── Area fill ──
    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, 0, 0, height);
    areaGrad.addColorStop(0, "rgba(14,204,131,0.05)");
    areaGrad.addColorStop(0.5, "rgba(14,204,131,0.015)");
    areaGrad.addColorStop(1, "rgba(14,204,131,0)");
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // ── Smooth price line (teal → white) ──
    const lineGrad = ctx.createLinearGradient(0, 0, anchorX, 0);
    lineGrad.addColorStop(0, "rgba(14,204,131,0.15)");
    lineGrad.addColorStop(0.3, "rgba(14,204,131,0.5)");
    lineGrad.addColorStop(0.6, "#0ecc83");
    lineGrad.addColorStop(0.82, "#5ee8b0");
    lineGrad.addColorStop(0.94, "#b8f5da");
    lineGrad.addColorStop(1, "#ffffff");

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      // Smooth curve through points (catmull-rom style)
      const p0 = points[Math.max(0, i - 2)];
      const p1 = points[i - 1];
      const p2 = points[i];
      const p3 = points[Math.min(points.length - 1, i + 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // ── Soft glow at end (blends into DOM head dot) ──
    const headX = points[points.length - 1].x;
    const headY = points[points.length - 1].y;
    const glow = ctx.createRadialGradient(headX, headY, 0, headX, headY, 18);
    glow.addColorStop(0, "rgba(255,255,255,0.1)");
    glow.addColorStop(0.5, "rgba(14,204,131,0.04)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(headX, headY, 18, 0, Math.PI * 2);
    ctx.fill();
  }, [history, token, width, height, anchorX]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block" }}
      className="absolute inset-0"
    />
  );
}
