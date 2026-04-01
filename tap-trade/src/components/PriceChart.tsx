import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  createChart,
  createSeriesMarkers,
  LineSeries,
  AreaSeries,
  LineStyle,
  LineType,
} from "lightweight-charts";
import type {
  IChartApi,
  ISeriesApi,
  ISeriesMarkersPluginApi,
  Time,
  UTCTimestamp,
} from "lightweight-charts";
import type { PricePoint } from "../lib/types";
import { withStepsLastSegmentAngleDegPx } from "../lib/chartSnakeHead";

const NEON = "#ff3b8d";
const BG = "#0a0e1a";

export interface ChartHandle {
  timeToX: (time: number) => number | null;
  priceToY: (price: number) => number | null;
}

interface Props {
  history: PricePoint[];
  currentPrice: number;
  tickSize: number;
  gridHalfHeight: number;
}

interface Mouth {
  x: number;
  y: number;
  angle: number;
}

export const PriceChart = forwardRef<ChartHandle, Props>(function PriceChart(
  { history, currentPrice, tickSize, gridHalfHeight },
  ref
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const areaRef = useRef<ISeriesApi<"Area"> | null>(null);
  const priceLinesRef = useRef<
    ReturnType<ISeriesApi<"Line">["createPriceLine"]>[]
  >([]);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const lastChartScrollRef = useRef(0);
  const historyRef = useRef(history);
  historyRef.current = history;

  const [mouth, setMouth] = useState<Mouth | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);

  useImperativeHandle(ref, () => ({
    timeToX(time: number) {
      return (
        chartRef.current
          ?.timeScale()
          .timeToCoordinate(time as UTCTimestamp) ?? null
      );
    },
    priceToY(price: number) {
      return lineRef.current?.priceToCoordinate(price) ?? null;
    },
  }));

  const syncMouth = useCallback(() => {
    const chart = chartRef.current;
    const line = lineRef.current;
    const h = historyRef.current;
    if (!chart || !line || h.length < 2) {
      setMouth(null);
      return;
    }
    const ts = chart.timeScale();
    const a = h[h.length - 2]!;
    const b = h[h.length - 1]!;
    const x0 = ts.timeToCoordinate(a.time as UTCTimestamp);
    const x1 = ts.timeToCoordinate(b.time as UTCTimestamp);
    const y0 = line.priceToCoordinate(a.value);
    const y1 = line.priceToCoordinate(b.value);
    if (x0 === null || x1 === null || y0 === null || y1 === null) {
      setMouth(null);
      return;
    }
    const angle = withStepsLastSegmentAngleDegPx(
      x0,
      y0,
      x1,
      y1,
      a.value,
      b.value
    );
    setMouth({ x: x1, y: y1, angle });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { color: BG },
        textColor: "#333",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,59,141,0.06)" },
        horzLines: { color: "rgba(255,59,141,0.05)" },
      },
      rightPriceScale: { visible: false },
      timeScale: {
        visible: false,
        rightOffset: 3,
        barSpacing: 5,
        fixLeftEdge: true,
        fixRightEdge: false,
      },
      crosshair: {
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
      handleScroll: false,
      handleScale: false,
    });

    const area = chart.addSeries(AreaSeries, {
      topColor: "rgba(255,59,141,0.22)",
      bottomColor: "rgba(255,59,141,0)",
      lineColor: "rgba(0,0,0,0)",
      lineWidth: 1,
      lineType: LineType.WithSteps,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const line = chart.addSeries(LineSeries, {
      color: NEON,
      lineWidth: 3,
      lineType: LineType.WithSteps,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    lineRef.current = line;
    areaRef.current = area;
    markersRef.current = createSeriesMarkers(line, []);

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
      requestAnimationFrame(syncMouth);
    });
    ro.observe(el);

    const wrap = wrapRef.current;
    const ro2 =
      wrap &&
      new ResizeObserver(() => {
        setLayoutTick((n) => n + 1);
      });
    if (wrap && ro2) ro2.observe(wrap);

    return () => {
      ro.disconnect();
      ro2?.disconnect();
      chart.remove();
      chartRef.current = null;
      lineRef.current = null;
      areaRef.current = null;
      markersRef.current = null;
    };
  }, [syncMouth]);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(syncMouth);
    return () => cancelAnimationFrame(id);
  }, [history, layoutTick, syncMouth]);

  useEffect(() => {
    const line = lineRef.current;
    const area = areaRef.current;
    const chart = chartRef.current;
    if (!line || !area || !chart || history.length === 0) return;

    const mapped = history.map((p) => ({
      time: p.time as UTCTimestamp,
      value: p.value,
    }));

    line.setData(mapped);
    area.setData(mapped);

    markersRef.current?.setMarkers([]);

    const t = Date.now();
    if (t - lastChartScrollRef.current > 1800) {
      chart.timeScale().scrollToRealTime();
      lastChartScrollRef.current = t;
    }

    requestAnimationFrame(syncMouth);
  }, [history, syncMouth]);

  useEffect(() => {
    const line = lineRef.current;
    const area = areaRef.current;
    if (!line || !area) return;

    const center = Math.round(currentPrice / tickSize) * tickSize;
    const halfRange = gridHalfHeight * tickSize;
    const margin = halfRange * 0.15;

    const provider = () => ({
      priceRange: {
        minValue: center - halfRange - margin,
        maxValue: center + halfRange + margin,
      },
    });
    line.applyOptions({ autoscaleInfoProvider: provider });
    area.applyOptions({ autoscaleInfoProvider: provider });

    for (const pl of priceLinesRef.current) {
      try {
        line.removePriceLine(pl);
      } catch {
        /* gone */
      }
    }
    priceLinesRef.current = [];

    for (let i = -gridHalfHeight; i <= gridHalfHeight; i++) {
      const pl = line.createPriceLine({
        price: center + i * tickSize,
        color:
          i === 0 ? "rgba(255,59,141,0.14)" : "rgba(255,255,255,0.04)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
      });
      priceLinesRef.current.push(pl);
    }

    requestAnimationFrame(syncMouth);
  }, [currentPrice, tickSize, gridHalfHeight, syncMouth]);

  return (
    <div ref={wrapRef} className="relative isolate h-full w-full overflow-visible">
      <div ref={containerRef} className="h-full w-full" />
      {mouth && (
        <div
          className="pointer-events-none absolute left-0 top-0 z-50 overflow-visible"
          style={{
            transform: `translate(${mouth.x}px, ${mouth.y}px) rotate(${mouth.angle}deg)`,
            transformOrigin: "0 0",
          }}
          aria-hidden
        >
          <div
            className="flex items-center"
            style={{ transform: "translateY(-50%) translateX(3px)" }}
          >
            <span className="inline-block h-0 w-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-[#ff3b8d] drop-shadow-[0_0_10px_rgba(255,59,141,0.85)]" />
          </div>
        </div>
      )}
    </div>
  );
});
