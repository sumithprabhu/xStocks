import { useCallback, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Download, ImageIcon, MousePointerClick } from "lucide-react";
import {
  BRAND_BG,
  BRAND_WORD,
  downloadBlob,
  renderBannerPng,
  renderFaviconIco,
  renderLogoPng,
} from "../lib/brandExport";

const NEON = "#ff3b8d";

export function BrandKitPage() {
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(async (key: string, fn: () => Promise<Blob>, name: string) => {
    setBusy(key);
    try {
      const blob = await fn();
      downloadBlob(blob, name);
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <div
      className="min-h-screen w-full text-white chart-dot-bg"
      style={{ backgroundColor: BRAND_BG }}
    >
      <header
        className="sticky top-0 z-20 flex items-center justify-between pl-5 pr-6 sm:pl-7 py-4 border-b border-[#ff3b8d]/10 backdrop-blur-md"
        style={{ background: "rgba(10,14,26,0.88)" }}
      >
        <Link href="/">
          <span className="inline-flex items-center gap-2 text-[14px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
            <ArrowLeft size={18} />
            Back
          </span>
        </Link>
        <span className="font-logo text-[1.35rem] sm:text-[1.5rem]" style={{ color: NEON }}>
          Brand kit
        </span>
        <span className="w-16 sm:w-20" aria-hidden />
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Logo &amp; banner</h1>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            Same background as the app navbar (<code className="text-zinc-500">chart-dot-bg</code>)
            and the <span className="text-[#ff3b8d] font-semibold">xGrid</span> wordmark (Pacifico).
            Export PNG for slides and social, or ICO for a favicon.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ImageIcon size={20} className="text-[#ff3b8d]" />
            Square logo
          </h2>
          <p className="text-[13px] text-zinc-500">
            512×512 PNG · dot grid + bottom rule + wordmark
          </p>
          <div
            className="mx-auto w-[min(100%,280px)] aspect-square rounded-2xl border-2 border-[#ff3b8d]/25 overflow-hidden shadow-[0_0_40px_rgba(255,59,141,0.12)] flex items-center justify-center chart-dot-bg"
            style={{ backgroundColor: BRAND_BG }}
          >
            <span
              className="font-logo text-[3.25rem] sm:text-[3.75rem] select-none"
              style={{
                color: NEON,
                textShadow: "0 0 18px rgba(255,59,141,0.45)",
              }}
            >
              {BRAND_WORD}
            </span>
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("logo", () => renderLogoPng(512), "xgrid-logo-512.png")}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-[15px] text-white transition-transform active:scale-[0.98] disabled:opacity-45"
            style={{
              background: `linear-gradient(180deg, ${NEON} 0%, #c42d6f 100%)`,
              boxShadow: "0 6px 20px rgba(255,59,141,0.35)",
            }}
          >
            <Download size={18} />
            {busy === "logo" ? "Preparing…" : "Download logo (PNG)"}
          </button>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MousePointerClick size={20} className="text-[#ff3b8d]" />
            Banner · 3 : 2
          </h2>
          <p className="text-[13px] text-zinc-500">1800×1200 PNG · for covers &amp; headers</p>
          <div
            className="w-full max-w-2xl mx-auto aspect-[3/2] rounded-2xl border-2 border-[#ff3b8d]/25 overflow-hidden shadow-[0_0_40px_rgba(255,59,141,0.12)] flex items-center justify-center chart-dot-bg"
            style={{ backgroundColor: BRAND_BG }}
          >
            <span
              className="font-logo text-[clamp(2.25rem,10vw,4.5rem)] select-none"
              style={{
                color: NEON,
                textShadow: "0 0 22px rgba(255,59,141,0.45)",
              }}
            >
              {BRAND_WORD}
            </span>
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              run("banner", () => renderBannerPng(1800, 1200), "xgrid-banner-1800x1200.png")
            }
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-[15px] text-white transition-transform active:scale-[0.98] disabled:opacity-45"
            style={{
              background: `linear-gradient(180deg, ${NEON} 0%, #c42d6f 100%)`,
              boxShadow: "0 6px 20px rgba(255,59,141,0.35)",
            }}
          >
            <Download size={18} />
            {busy === "banner" ? "Preparing…" : "Download banner (PNG)"}
          </button>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Download size={20} className="text-[#ff3b8d]" />
            Favicon
          </h2>
          <p className="text-[13px] text-zinc-500">
            32×32 PNG embedded in <code className="text-zinc-500">.ico</code> (works in modern
            browsers &amp; Windows)
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="size-16 rounded-xl border border-[#ff3b8d]/30 flex items-center justify-center chart-dot-bg shrink-0"
              style={{ backgroundColor: BRAND_BG }}
            >
              <span
                className="font-logo text-[1.35rem] leading-none"
                style={{ color: NEON, textShadow: "0 0 8px rgba(255,59,141,0.5)" }}
              >
                {BRAND_WORD}
              </span>
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("ico", renderFaviconIco, "xgrid-favicon.ico")}
              className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-[14px] border-2 border-[#ff3b8d]/40 text-[#ff3b8d] hover:bg-[#ff3b8d]/10 transition-colors disabled:opacity-45"
            >
              <Download size={17} />
              {busy === "ico" ? "Preparing…" : "Download favicon (.ico)"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
