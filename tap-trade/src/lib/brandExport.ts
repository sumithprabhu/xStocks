/** Matches `chart-dot-bg` + navbar wordmark treatment */

export const BRAND_BG = "#0a0e1a";
export const BRAND_DOT = "rgba(255,59,141,0.07)";
export const BRAND_WORD = "xGrid";
export const BRAND_PINK = "#ff3b8d";

const DOT_SPACING = 14;

function drawDotBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = BRAND_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = BRAND_DOT;
  for (let y = 0; y <= h; y += DOT_SPACING) {
    for (let x = 0; x <= w; x += DOT_SPACING) {
      ctx.fillRect(Math.round(x), Math.round(y), 1.25, 1.25);
    }
  }
}

function drawBottomRule(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale = 1,
) {
  ctx.strokeStyle = "rgba(255,59,141,0.1)";
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.beginPath();
  ctx.moveTo(0, h - ctx.lineWidth / 2);
  ctx.lineTo(w, h - ctx.lineWidth / 2);
  ctx.stroke();
}

function drawWordmark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fontPx: number,
) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `400 ${fontPx}px Pacifico, cursive`;
  ctx.fillStyle = BRAND_PINK;
  ctx.shadowColor = "rgba(255,59,141,0.45)";
  ctx.shadowBlur = fontPx * 0.14;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText(BRAND_WORD, w / 2, h / 2);
  ctx.shadowBlur = 0;
}

export async function ensureBrandFonts() {
  await document.fonts.ready;
  await document.fonts.load("400 240px Pacifico");
}

export async function renderLogoPng(size = 512): Promise<Blob> {
  await ensureBrandFonts();
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const scale = size / 512;
  drawDotBackground(ctx, size, size);
  drawBottomRule(ctx, size, size, scale);
  drawWordmark(ctx, size, size, 118 * scale);
  return canvasToPngBlob(canvas);
}

/** 3:2 aspect ratio (e.g. 1800×1200) */
export async function renderBannerPng(
  width = 1800,
  height = 1200,
): Promise<Blob> {
  await ensureBrandFonts();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const scale = width / 1800;
  drawDotBackground(ctx, width, height);
  drawBottomRule(ctx, width, height, scale);
  drawWordmark(ctx, width, height, 200 * scale);
  return canvasToPngBlob(canvas);
}

export async function renderFaviconIco(): Promise<Blob> {
  await ensureBrandFonts();
  const src = 256;
  const c256 = document.createElement("canvas");
  c256.width = src;
  c256.height = src;
  const c2 = c256.getContext("2d")!;
  drawDotBackground(c2, src, src);
  drawBottomRule(c2, src, src, 0.5);
  drawWordmark(c2, src, src, 62);

  const outSize = 32;
  const c32 = document.createElement("canvas");
  c32.width = outSize;
  c32.height = outSize;
  const o = c32.getContext("2d")!;
  o.imageSmoothingEnabled = true;
  o.imageSmoothingQuality = "high";
  o.drawImage(c256, 0, 0, src, src, 0, 0, outSize, outSize);

  const pngAb = await canvasToPngArrayBuffer(c32);
  const icoBytes = wrapPngAsIco(pngAb);
  const copy = new Uint8Array(icoBytes.length);
  copy.set(icoBytes);
  return new Blob([copy], { type: "image/x-icon" });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG export failed"))),
      "image/png",
    );
  });
}

function canvasToPngArrayBuffer(
  canvas: HTMLCanvasElement,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) {
        reject(new Error("PNG export failed"));
        return;
      }
      b.arrayBuffer().then(resolve, reject);
    }, "image/png");
  });
}

/** Single embedded PNG (Windows Vista+). */
function wrapPngAsIco(pngBuffer: ArrayBuffer): Uint8Array {
  const png = new Uint8Array(pngBuffer);
  const out = new Uint8Array(22 + png.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  out[6] = 32;
  out[7] = 32;
  out[8] = 0;
  out[9] = 0;
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, png.length, true);
  view.setUint32(18, 22, true);
  out.set(png, 22);
  return out;
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(a.href);
}
