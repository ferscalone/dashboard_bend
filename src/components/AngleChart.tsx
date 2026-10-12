import { useEffect, useMemo, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { AnglePoint } from "../types";
import type { Theme } from "../hooks/useTheme";

interface Props {
  history: AnglePoint[];
  theme: Theme;
}

// Преобразует CSS-переменную в конкретный цвет для uPlot (который рисует на canvas
// и сам не может читать CSS-переменные). Перечитывается при смене темы.
function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/**
 * График угла изгиба во времени (uPlot): живая линия bend-угла (0..180°). Цвета
 * берутся из CSS-переменных активной темы, поэтому график пересоздаётся при
 * переключении темы. History - скользящий буфер из useStand.
 */
export function AngleChart({ history, theme }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  const data = useMemo<uPlot.AlignedData>(() => {
    const n = history.length;
    const xs = new Array<number>(n);
    const deg = new Array<number | null>(n);
    for (let i = 0; i < n; i++) {
      xs[i] = history[i].t;
      deg[i] = history[i].deg;
    }
    return [xs, deg];
  }, [history]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const accent = cssVar("--accent", "#3d8bfd");
    const axis = cssVar("--muted", "#8595a1");
    const grid = cssVar("--grid-line", "rgba(255,255,255,0.05)");
    const fill = cssVar("--accent-weak", "rgba(61,139,253,0.14)");

    const opts: uPlot.Options = {
      width: host.clientWidth || 600,
      height: 240,
      scales: { x: { time: false }, y: { range: [0, 180] } },
      series: [
        { label: "t", value: (_u, v) => (v == null ? "" : fmtSecs(v)) },
        {
          label: "Угол",
          stroke: accent,
          width: 2,
          fill,
          value: (_u, v) => (v == null ? "–" : `${v.toFixed(1)}°`),
        },
      ],
      axes: [
        {
          stroke: axis,
          grid: { stroke: grid },
          ticks: { stroke: grid },
          values: (_u, splits) => splits.map(fmtSecs),
        },
        {
          stroke: axis,
          grid: { stroke: grid },
          ticks: { stroke: grid },
          values: (_u, splits) => splits.map((v) => `${v}°`),
        },
      ],
      legend: { show: true },
      cursor: { drag: { x: true, y: false } },
    };

    const plot = new uPlot(opts, data, host);
    plotRef.current = plot;

    const ro = new ResizeObserver(() => {
      plot.setSize({ width: host.clientWidth || 600, height: 240 });
    });
    ro.observe(host);

    return () => {
      ro.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  return (
    <section className="card col-12">
      <div className="title">
        <h2>Угол изгиба во времени</h2>
        <span className="hint">0° лево · 90° центр · 180° право</span>
      </div>
      <div className="chart-host" ref={hostRef} />
      {history.length === 0 && (
        <div className="hint" style={{ marginTop: 8 }}>
          Ожидание телеметрии от стенда…
        </div>
      )}
    </section>
  );
}

function fmtSecs(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const p2 = (n: number) => (n < 10 ? "0" : "") + n;
  return `${m}:${p2(r)}`;
}
