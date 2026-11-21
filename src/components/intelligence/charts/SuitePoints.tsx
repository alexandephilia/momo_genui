"use client";

/** Point and profile catalog charts: scatter, bubble, radar, box plot, outliers. */

import { useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { scaleLinear, scaleSqrt } from "d3";
import { BoxSelect, ChartScatter, CircleDot, Radar as RadarIcon, ScanSearch, TriangleAlert } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { CHART_COLORS, getColor } from "./shared";
import { IntelChartVariantDeck } from "./ChartVariantDeck";
import { IntelCardShell, IntelVariantContext, s, n, a } from "../shared/IntelCardShell";
import {
  AxisTitles,
  Legend,
  Tip,
  YAxis,
  clipLabel,
  fmtNum,
  fmtTick,
  markProps,
  useDvMotion,
  useMeasure,
  useSeriesFocus,
  withUniqueKeys,
  type TipState,
} from "./kit";

const BUBBLE_R = 32;

interface PlotPoint {
  key: string;
  name: string;
  x: number;
  y: number;
  z?: number;
}

function toPoints(raw: unknown): PlotPoint[] {
  return a<Record<string, unknown>>(raw).map((p, i) => ({
    key: `p${i}`,
    name: s(p.name ?? p.label, `Point ${i + 1}`),
    x: n(p.x),
    y: n(p.y),
    z: typeof p.z === "number" ? p.z : undefined,
  }));
}

/** Pearson r and least-squares line for the plotted points. */
function fitLine(points: PlotPoint[]) {
  const count = points.length;
  if (count < 3) return null;
  const mx = points.reduce((acc, p) => acc + p.x, 0) / count;
  const my = points.reduce((acc, p) => acc + p.y, 0) / count;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, r: sxy / Math.sqrt(sxx * syy) };
}

function PointPlot({
  label,
  points,
  height,
  compact,
  xTitle,
  yTitle,
  zTitle,
  bubble,
  color,
}: {
  label: string;
  points: PlotPoint[];
  height: number;
  compact: boolean;
  xTitle: string;
  yTitle: string;
  zTitle?: string;
  bubble: boolean;
  color: string;
}) {
  const m = useDvMotion();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);

  const margin = compact ? { t: 10, r: 10, b: 20, l: 30 } : { t: 16, r: 18, b: 42, l: 62 };
  const iw = Math.max(0, width - margin.l - margin.r);
  const ih = Math.max(0, height - margin.t - margin.b);
  const span = (vals: number[]) => {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo || Math.abs(hi) || 1) * (bubble ? 0.22 : 0.08);
    // Don't pad a non-negative measure below zero.
    return [lo >= 0 ? Math.max(0, lo - pad) : lo - pad, hi + pad];
  };
  const xScale = scaleLinear().domain(span(points.map((p) => p.x))).nice(5).range([0, iw]);
  const yScale = scaleLinear().domain(span(points.map((p) => p.y))).nice(5).range([ih, 0]);
  const zs = points.map((p) => p.z ?? 0);
  const rScale = scaleSqrt().domain([0, Math.max(...zs, 1)]).range([0, compact ? BUBBLE_R * 0.62 : BUBBLE_R]);
  const radius = (p: PlotPoint) => (bubble ? Math.max(5, rScale(p.z ?? 0)) : 5);
  const fit = bubble ? null : fitLine(points);
  const [dx0, dx1] = xScale.domain();
  const active = points.find((p) => p.key === hover) ?? null;

  const tip: TipState | null = active
    ? {
        x: margin.l + xScale(active.x),
        y: margin.t + yScale(active.y) - radius(active) - 8,
        title: active.name,
        rows: [
          { label: xTitle, value: fmtNum(active.x) },
          { label: yTitle, value: fmtNum(active.y) },
          ...(bubble && zTitle ? [{ label: zTitle, value: fmtNum(active.z ?? 0) }] : []),
        ],
      }
    : null;

  return (
    <div ref={ref} className="dv-plot" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={label}>
          {!compact && <AxisTitles x={xTitle} y={yTitle} left={margin.l} top={margin.t} iw={iw} ih={ih} height={height} />}
          <g transform={`translate(${margin.l} ${margin.t})`}>
            <YAxis ticks={yScale.ticks(compact ? 3 : 5)} y={(v) => yScale(v)} x0={0} x1={iw} />
            <g aria-hidden="true">
              {xScale.ticks(compact ? 3 : 6).map((t) => (
                <motion.g
                  key={t}
                  initial={{ opacity: 0, x: xScale(t) }}
                  animate={{ opacity: 1, x: xScale(t) }}
                  transition={m.spring}
                >
                  <line className="dv-grid" y1={0} y2={ih} />
                  <text className="dv-tick" y={ih + 15} textAnchor="middle">
                    {fmtTick(t)}
                  </text>
                </motion.g>
              ))}
            </g>
            <line className="dv-axis" x1={0} x2={iw} y1={ih} y2={ih} />
            <line className="dv-axis" x1={0} x2={0} y1={0} y2={ih} />

            {fit && (
              <g aria-hidden="true">
                <motion.line
                  className="dv-trend"
                  initial={
                    m.reduce
                      ? false
                      : { x1: xScale(dx0), y1: yScale(fit.intercept + fit.slope * dx0), x2: xScale(dx0), y2: yScale(fit.intercept + fit.slope * dx0), opacity: 0 }
                  }
                  animate={{
                    x1: xScale(dx0),
                    y1: yScale(fit.intercept + fit.slope * dx0),
                    x2: xScale(dx1),
                    y2: yScale(fit.intercept + fit.slope * dx1),
                    opacity: 1,
                  }}
                  transition={m.draw(2)}
                />
                <motion.text
                  className="dv-flag"
                  x={10}
                  y={14}
                  initial={m.reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={m.draw(4)}
                >
                  fit · r = {fit.r.toFixed(2)}
                </motion.text>
              </g>
            )}

            {active && (
              <g aria-hidden="true">
                <motion.line
                  className="dv-cross"
                  initial={false}
                  animate={{ x1: xScale(active.x), x2: xScale(active.x), y1: yScale(active.y), y2: ih }}
                  transition={m.snap}
                />
                <motion.line
                  className="dv-cross"
                  initial={false}
                  animate={{ x1: 0, x2: xScale(active.x), y1: yScale(active.y), y2: yScale(active.y) }}
                  transition={m.snap}
                />
              </g>
            )}

            {points.map((p, i) => {
              const r = radius(p);
              const dim = hover !== null && hover !== p.key;
              return (
                <motion.g
                  key={p.key}
                  initial={m.reduce ? false : { x: xScale(p.x), y: yScale(p.y), opacity: 0 }}
                  animate={{ x: xScale(p.x), y: yScale(p.y), opacity: dim ? 0.3 : 1 }}
                  transition={{ ...m.spring, opacity: m.fade }}
                >
                  <motion.circle
                    className="dv-mark dv-point"
                    data-bubble={bubble || undefined}
                    fill={color}
                    stroke={color}
                    initial={m.reduce ? false : { r: 0 }}
                    animate={{ r: hover === p.key ? r + 3 : r }}
                    transition={hover === p.key || dim ? m.snap : m.stagger(i, 0.08)}
                    whileTap={m.reduce ? undefined : { r: r - 2 }}
                    {...markProps(
                      `${p.name}: ${xTitle} ${fmtNum(p.x)}, ${yTitle} ${fmtNum(p.y)}${bubble && zTitle ? `, ${zTitle} ${fmtNum(p.z ?? 0)}` : ""}`,
                      { enter: () => setHover(p.key), leave: () => setHover(null) },
                    )}
                  />
                  {bubble && r >= 13 && (
                    <text className="dv-val dv-on-mark" textAnchor="middle" y={4}>
                      {fmtNum(p.z ?? 0)}
                    </text>
                  )}
                </motion.g>
              );
            })}
          </g>
        </svg>
      )}
      <Tip tip={tip} width={width} />
    </div>
  );
}

/* 4. ScatterPlot — titled axes, least-squares fit with r, crosshair read-off on hover */
export function ScatterPlot({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const points = useMemo(() => toPoints(data.points), [data.points]);
  const xTitle = s(data.xLabel, "X");
  const yTitle = s(data.yLabel, "Y");
  const fit = fitLine(points);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const strength = fit ? (Math.abs(fit.r) >= 0.8 ? "strong" : Math.abs(fit.r) >= 0.5 ? "moderate" : "weak") : "";

  return (
    <IntelCardShell
      title={s(data.title, "Scatter Plot")}
      badge={`${points.length} ${s(data.seriesName, "points").toLowerCase()}`}
      icon={<ChartScatter size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={points.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        headline={
          fit
            ? `${yTitle} ${fit.slope >= 0 ? "rises" : "falls"} with ${xTitle}: a ${strength} ${fit.r >= 0 ? "positive" : "negative"} relationship (r = ${fit.r.toFixed(2)}) across ${points.length} ${s(data.seriesName, "points").toLowerCase()}.`
            : undefined
        }
        stats={[
          { label: xTitle, value: `${fmtNum(Math.min(...xs))} – ${fmtNum(Math.max(...xs))}` },
          { label: yTitle, value: `${fmtNum(Math.min(...ys))} – ${fmtNum(Math.max(...ys))}` },
          ...(fit ? [{ label: "Correlation r", value: fit.r.toFixed(2), tone: "accent" as const }] : []),
        ]}
        legend={(layout) => (
          <Legend
            layout={layout === "table" ? "list" : layout}
            label="Key"
            items={[
              { key: "obs", label: s(data.seriesName, "Observations"), color: CHART_COLORS[0], value: `n = ${points.length}` },
              ...(fit ? [{ key: "fit", label: "Least-squares fit", color: "var(--gu-ink-2)", value: `r = ${fit.r.toFixed(2)}` }] : []),
            ]}
          />
        )}
      >
        <PointPlot
          label={s(data.title, "Scatter plot")}
          points={points}
          height={variant === "minimal" ? 170 : 290}
          compact={variant === "minimal"}
          xTitle={xTitle}
          yTitle={yTitle}
          bubble={false}
          color={CHART_COLORS[0]}
        />
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

/* 5. BubbleChart — third variable as area, value inside each bubble, nested size legend */
export function BubbleChart({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const points = useMemo(() => toPoints(data.points), [data.points]);
  const xTitle = s(data.xLabel, "X");
  const yTitle = s(data.yLabel, "Y");
  const zTitle = s(data.zLabel, "Size");
  const zs = points.map((p) => p.z ?? 0);
  const zMax = Math.max(...zs, 0);
  const zMin = Math.min(...zs);
  const biggest = points.reduce<PlotPoint | null>((best, p) => (!best || (p.z ?? 0) > (best.z ?? 0) ? p : best), null);
  const keyR = variant === "minimal" ? BUBBLE_R * 0.62 : BUBBLE_R;
  const rOf = scaleSqrt().domain([0, Math.max(zMax, 1)]).range([0, keyR]);
  const rings = Array.from(new Set([zMax, (zMax + zMin) / 2, zMin])).filter((z) => z > 0);

  return (
    <IntelCardShell
      title={s(data.title, "Bubble Chart (3-Variable)")}
      badge={`size = ${zTitle}`}
      icon={<CircleDot size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={points.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        headline={
          biggest
            ? `The largest bubble, ${zTitle} ${fmtNum(biggest.z ?? 0)}, sits at ${xTitle} ${fmtNum(biggest.x)} and ${yTitle} ${fmtNum(biggest.y)}.`
            : undefined
        }
        stats={[
          { label: `Largest ${zTitle}`, value: fmtNum(zMax), tone: "accent" },
          { label: `Smallest ${zTitle}`, value: fmtNum(zMin) },
          { label: "Bubbles", value: String(points.length) },
        ]}
        legend={() => (
          <div className="dv-sizekey" role="img" aria-label={`Bubble area encodes ${zTitle}, from ${fmtNum(zMin)} to ${fmtNum(zMax)}`}>
            <svg width={keyR * 2 + 4} height={keyR * 2 + 4} aria-hidden="true">
              {rings.map((z, i) => (
                <motion.circle
                  key={z}
                  className="dv-sizekey__ring"
                  cx={keyR + 2}
                  initial={m.reduce ? false : { r: 0, cy: keyR * 2 + 2 }}
                  animate={{ r: rOf(z), cy: keyR * 2 + 2 - rOf(z) }}
                  transition={m.stagger(i + 4, 0.1)}
                />
              ))}
            </svg>
            <div className="dv-sizekey__text">
              <strong>{zTitle}</strong>
              <span>{rings.map((z) => fmtNum(z)).join(" · ")}</span>
              <em>bubble area</em>
            </div>
          </div>
        )}
      >
        <PointPlot
          label={s(data.title, "Bubble chart")}
          points={points}
          height={variant === "minimal" ? 180 : 300}
          compact={variant === "minimal"}
          xTitle={xTitle}
          yTitle={yTitle}
          zTitle={zTitle}
          bubble
          color={CHART_COLORS[2]}
        />
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

/* 10. RadarChart — polygons on labelled spokes, each axis label carries the scores */
export function IntelRadarChart({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hoverAxis, setHoverAxis] = useState<number | null>(null);
  const dims = a<Record<string, unknown>>(data.dimensions);
  const keys = useMemo(() => a<string>(data.series), [data.series]);
  const focus = useSeriesFocus(keys);
  const compact = variant === "minimal";
  const height = compact ? 190 : 320;

  const series = keys.map((k, i) => ({
    key: k,
    color: getColor(i),
    values: dims.map((d) => n(d[k])),
  }));
  const visible = series.filter((sr) => !focus.hidden.has(sr.key));
  const axes = dims.map((d, i) => s(d.axis, `Axis ${i + 1}`));
  const top = scaleLinear().domain([0, Math.max(...series.flatMap((sr) => sr.values), 1)]).nice(4).domain()[1];
  const rings = [0.25, 0.5, 0.75, 1];
  const R = Math.max(30, Math.min(height / 2 - (compact ? 22 : 40), width / 2 - (compact ? 60 : 96)));
  const cx = width / 2;
  const cy = height / 2 + (axes.length % 2 === 1 ? R * 0.06 : 0);
  const angle = (i: number) => -Math.PI / 2 + (i / Math.max(1, axes.length)) * Math.PI * 2;
  const at = (i: number, frac: number) => [cx + Math.cos(angle(i)) * R * frac, cy + Math.sin(angle(i)) * R * frac] as const;
  const poly = (values: number[], scale = 1) =>
    values.map((v, i) => at(i, (v / top) * scale).join(" ")).map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join("") + "Z";
  const avg = (values: number[]) => (values.length ? values.reduce((x, y) => x + y, 0) / values.length : 0);
  const gaps = axes.map((_, i) => (series.length >= 2 ? Math.abs(series[0].values[i] - series[1].values[i]) : 0));
  const widest = gaps.indexOf(Math.max(...gaps, 0));
  const wins = series.length >= 2 ? axes.filter((_, i) => series[0].values[i] > series[1].values[i]).length : 0;

  return (
    <IntelCardShell
      title={s(data.title, "Multidimensional Radar Chart")}
      badge={`${axes.length} axes`}
      icon={<RadarIcon size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={dims.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        headline={
          series.length >= 2
            ? `${series[0].key} leads on ${wins} of ${axes.length} axes; the widest gap is ${axes[widest]} (${fmtNum(series[0].values[widest])} vs ${fmtNum(series[1].values[widest])}).`
            : series[0]
              ? `${series[0].key} averages ${fmtNum(avg(series[0].values))} across ${axes.length} axes.`
              : undefined
        }
        stats={series.slice(0, 3).map((sr, i) => ({
          label: `${sr.key} avg`,
          value: fmtNum(Number(avg(sr.values).toFixed(1))),
          tone: i === 0 ? ("accent" as const) : undefined,
        }))}
        legend={(layout) => (
          <Legend
            layout={layout === "table" ? "list" : layout}
            label="Series"
            items={series.map((sr) => ({
              key: sr.key,
              label: sr.key,
              color: sr.color,
              value: fmtNum(Number(avg(sr.values).toFixed(1))),
              note: "avg",
            }))}
            hidden={focus.hidden}
            hoverKey={focus.hoverKey}
            onHover={focus.setHoverKey}
            onToggle={series.length > 1 ? focus.toggle : undefined}
          />
        )}
      >
        <div ref={ref} className="dv-plot" style={{ height }}>
          {width > 0 && (
            <svg width={width} height={height} role="group" aria-label={s(data.title, "Radar chart")}>
              <g aria-hidden="true">
                {rings.map((ring) => (
                  <path key={ring} className="dv-radar__ring" d={poly(axes.map(() => top), ring)} />
                ))}
                {axes.map((axis, i) => {
                  const [x2, y2] = at(i, 1);
                  return (
                    <motion.line
                      key={axis}
                      className="dv-radar__spoke"
                      x1={cx}
                      y1={cy}
                      x2={x2}
                      y2={y2}
                      initial={false}
                      animate={{ strokeOpacity: hoverAxis === i ? 0.7 : 0.16 }}
                      transition={m.fade}
                    />
                  );
                })}
                {!compact &&
                  rings.map((ring) => (
                    <text key={ring} className="dv-tick dv-radar__scale" x={cx + 4} y={cy - R * ring + 3}>
                      {fmtNum(top * ring)}
                    </text>
                  ))}
              </g>

              <AnimatePresence initial={!m.reduce}>
                {visible.map((sr, si) => {
                  const d = poly(sr.values);
                  const dim = focus.hoverKey !== null && focus.hoverKey !== sr.key;
                  return (
                    <motion.path
                      key={sr.key}
                      className="dv-radar__shape"
                      fill={sr.color}
                      stroke={sr.color}
                      initial={{ d: poly(sr.values, 0.02), fillOpacity: 0, opacity: 0 }}
                      animate={{ d, fillOpacity: dim ? 0.04 : focus.hoverKey === sr.key ? 0.3 : 0.16, opacity: dim ? 0.35 : 1 }}
                      exit={{ d: poly(sr.values, 0.02), opacity: 0 }}
                      transition={{ d: m.stagger(si, 0.16), fillOpacity: m.fade, opacity: m.fade }}
                    />
                  );
                })}
                {visible.flatMap((sr, si) =>
                  sr.values.map((v, i) => {
                    const [px, py] = at(i, v / top);
                    return (
                      <motion.circle
                        key={`${sr.key}|${axes[i]}`}
                        className="dv-dot"
                        stroke={sr.color}
                        initial={{ cx, cy, r: 0 }}
                        animate={{ cx: px, cy: py, r: hoverAxis === i ? 4.5 : 3 }}
                        exit={{ r: 0, opacity: 0 }}
                        transition={{ ...m.stagger(si, 0.16), r: m.snap }}
                      />
                    );
                  }),
                )}
              </AnimatePresence>

              {axes.map((axis, i) => {
                const [lx, ly] = at(i, 1);
                const cos = Math.cos(angle(i));
                const sin = Math.sin(angle(i));
                const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
                const tx = lx + cos * 12;
                const ty = ly + sin * 12 + (sin > 0.3 ? 10 : sin < -0.3 ? -14 : -2);
                return (
                  <motion.g
                    key={axis}
                    className="dv-radar__axis"
                    initial={m.reduce ? false : { opacity: 0 }}
                    animate={{ opacity: hoverAxis !== null && hoverAxis !== i ? 0.4 : 1 }}
                    transition={m.fade}
                    {...markProps(`${axis}: ${visible.map((sr) => `${sr.key} ${fmtNum(sr.values[i])}`).join(", ")}`, {
                      enter: () => setHoverAxis(i),
                      leave: () => setHoverAxis(null),
                    })}
                  >
                    <text className="dv-leader-text" x={tx} y={ty} textAnchor={anchor}>
                      {clipLabel(axis, compact ? 13 : 16)}
                    </text>
                    <text className="dv-radar__scores" x={tx} y={ty + 13} textAnchor={anchor}>
                      {visible.map((sr, si) => (
                        <tspan key={sr.key} fill={sr.color}>
                          {si > 0 ? " · " : ""}
                          {fmtNum(sr.values[i])}
                        </tspan>
                      ))}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          )}
        </div>
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

/* 9. BoxPlot — whiskers, IQR box and median on one shared axis */
export function BoxPlot({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const unit = s(data.unit);
  const compact = variant === "minimal";
  const groups = withUniqueKeys(a<Record<string, unknown>>(data.groups).map((g, i) => ({
    key: `${s(g.label, `Group ${i + 1}`)}`,
    label: s(g.label, `Group ${i + 1}`),
    min: n(g.min),
    q1: n(g.q1),
    median: n(g.median),
    q3: n(g.q3),
    max: n(g.max),
  })));
  const rowH = compact ? 34 : 56;
  const margin = { t: compact ? 6 : 12, r: 20, b: 26, l: width >= 420 ? 112 : 70 };
  const height = margin.t + margin.b + groups.length * rowH;
  const iw = Math.max(0, width - margin.l - margin.r);
  const ih = groups.length * rowH;
  const xScale = scaleLinear()
    .domain([Math.min(...groups.map((g) => g.min), 0), Math.max(...groups.map((g) => g.max), 1)])
    .nice(6)
    .range([0, iw]);
  const x = (v: number) => xScale(v);
  const widest = groups.reduce<(typeof groups)[number] | null>((best, g) => (!best || g.max - g.min > best.max - best.min ? g : best), null);
  const fastest = groups.reduce<(typeof groups)[number] | null>((best, g) => (!best || g.median < best.median ? g : best), null);
  const slowest = groups.reduce<(typeof groups)[number] | null>((best, g) => (!best || g.median > best.median ? g : best), null);
  const active = hover !== null ? groups[hover] : null;

  const tip: TipState | null =
    active && hover !== null
      ? {
          x: margin.l + x(active.median),
          y: margin.t + hover * rowH + 4,
          title: active.label,
          rows: [
            { label: "Min", value: fmtNum(active.min) },
            { label: "Q1", value: fmtNum(active.q1) },
            { label: "Median", value: fmtNum(active.median) },
            { label: "Q3", value: fmtNum(active.q3) },
            { label: "Max", value: fmtNum(active.max) },
          ],
        }
      : null;

  return (
    <IntelCardShell
      title={s(data.title, "Statistical Box Plot")}
      badge={unit || undefined}
      icon={<BoxSelect size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={groups.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        headline={
          fastest && slowest && widest
            ? `Medians run from ${fmtNum(fastest.median)} (${fastest.label}) to ${fmtNum(slowest.median)} (${slowest.label}); ${widest.label} has the widest spread, ${fmtNum(widest.min)}–${fmtNum(widest.max)}.`
            : undefined
        }
        stats={[
          { label: "Lowest median", value: fastest ? `${fmtNum(fastest.median)} · ${fastest.label}` : "–" },
          { label: "Highest median", value: slowest ? `${fmtNum(slowest.median)} · ${slowest.label}` : "–", tone: "accent" },
          { label: "Widest spread", value: widest ? `${fmtNum(widest.max - widest.min)} · ${widest.label}` : "–" },
        ]}
        legend={(layout) => (
          <Legend
            layout={layout === "table" ? "list" : layout}
            label="How to read"
            items={[
              { key: "whisker", label: "Whisker", color: "var(--gu-ink-3)", note: "min to max" },
              { key: "box", label: "Box", color: `color-mix(in srgb, ${CHART_COLORS[0]} 45%, transparent)`, note: "Q1 to Q3" },
              { key: "median", label: "Median", color: "var(--gu-ink)", note: "centre line" },
            ]}
          />
        )}
      >
        <div ref={ref} className="dv-plot" style={{ height }}>
          {width > 0 && (
            <svg width={width} height={height} role="group" aria-label={s(data.title, "Box plot")}>
              <g transform={`translate(${margin.l} ${margin.t})`}>
                <g aria-hidden="true">
                  {xScale.ticks(compact ? 4 : 6).map((t) => (
                    <motion.g key={t} initial={{ opacity: 0, x: x(t) }} animate={{ opacity: 1, x: x(t) }} transition={m.spring}>
                      <line className="dv-grid" y1={0} y2={ih} />
                      <text className="dv-tick" y={ih + 15} textAnchor="middle">
                        {fmtTick(t)}
                      </text>
                    </motion.g>
                  ))}
                  <line className="dv-axis" x1={0} x2={iw} y1={ih} y2={ih} />
                </g>
                {groups.map((g, i) => {
                  const cy = i * rowH + rowH / 2 + (compact ? 0 : 5);
                  const boxH = compact ? 12 : 18;
                  const dim = hover !== null && hover !== i;
                  return (
                    <motion.g
                      key={g.key}
                      initial={false}
                      animate={{ opacity: dim ? 0.4 : 1 }}
                      transition={m.fade}
                    >
                      <text className="dv-leader-text" x={-12} y={cy + 4} textAnchor="end">
                        {clipLabel(g.label, margin.l > 100 ? 15 : 9)}
                      </text>
                      <motion.line
                        className="dv-box__whisker"
                        y1={cy}
                        y2={cy}
                        initial={m.reduce ? false : { x1: x(g.median), x2: x(g.median) }}
                        animate={{ x1: x(g.min), x2: x(g.max) }}
                        transition={m.stagger(i, 0.12)}
                      />
                      {[g.min, g.max].map((v, ci) => (
                        <motion.line
                          key={ci}
                          className="dv-box__whisker"
                          y1={cy - 5}
                          y2={cy + 5}
                          initial={m.reduce ? false : { x1: x(g.median), x2: x(g.median), opacity: 0 }}
                          animate={{ x1: x(v), x2: x(v), opacity: 1 }}
                          transition={m.stagger(i, 0.12)}
                        />
                      ))}
                      <motion.rect
                        className="dv-box__iqr"
                        rx={3}
                        y={cy - boxH / 2}
                        height={boxH}
                        initial={m.reduce ? false : { attrX: x(g.median), width: 0 }}
                        animate={{ attrX: x(g.q1), width: Math.max(2, x(g.q3) - x(g.q1)) }}
                        transition={m.stagger(i + 1, 0.12)}
                      />
                      <motion.line
                        className="dv-box__median"
                        y1={cy - boxH / 2 - 2}
                        y2={cy + boxH / 2 + 2}
                        initial={m.reduce ? false : { x1: x(g.median), x2: x(g.median), opacity: 0 }}
                        animate={{ x1: x(g.median), x2: x(g.median), opacity: 1 }}
                        transition={m.stagger(i + 2, 0.12)}
                      />
                      {!compact && (
                        <>
                          <motion.text
                            className="dv-val"
                            data-strong="true"
                            textAnchor="middle"
                            initial={m.reduce ? false : { x: x(g.median), y: cy - boxH / 2 - 7, opacity: 0 }}
                            animate={{ x: x(g.median), y: cy - boxH / 2 - 7, opacity: 1 }}
                            transition={m.stagger(i + 2, 0.12)}
                          >
                            {fmtNum(g.median)}
                          </motion.text>
                          {x(g.min) >= 30 && (
                            <text className="dv-tick" x={x(g.min) - 5} y={cy + 4} textAnchor="end">
                              {fmtNum(g.min)}
                            </text>
                          )}
                          <text className="dv-tick" x={x(g.max) + 5} y={cy + 4}>
                            {fmtNum(g.max)}
                          </text>
                        </>
                      )}
                      <rect
                        className="dv-hit"
                        x={0}
                        y={i * rowH}
                        width={iw}
                        height={rowH}
                        fillOpacity={0}
                        {...markProps(
                          `${g.label}: min ${fmtNum(g.min)}, Q1 ${fmtNum(g.q1)}, median ${fmtNum(g.median)}, Q3 ${fmtNum(g.q3)}, max ${fmtNum(g.max)}`,
                          { enter: () => setHover(i), leave: () => setHover(null) },
                        )}
                      />
                    </motion.g>
                  );
                })}
              </g>
            </svg>
          )}
          <Tip tip={tip} width={width} />
        </div>
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

/* 15. OutlierHighlight — z-score strip with flagged points, plus the annotated list */
export function OutlierHighlight({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const compact = variant === "minimal";
  const points = withUniqueKeys(a<Record<string, unknown>>(data.points).map((p, i) => {
    const z = Number.parseFloat(s(p.zScore).replace("−", "-"));
    return {
      key: `${s(p.label, `Point ${i + 1}`)}`,
      label: s(p.label, `Point ${i + 1}`),
      value: s(p.value),
      zText: s(p.zScore),
      z: Number.isFinite(z) ? z : null,
      outlier: Boolean(p.outlier),
      reason: s(p.reason),
    };
  }));
  const outliers = points.filter((p) => p.outlier);
  const plotted = points.filter((p) => p.z !== null);
  const hasStrip = plotted.length === points.length && points.length > 0;
  const reach = Math.max(1, Math.ceil(Math.max(...plotted.map((p) => Math.abs(p.z as number)), 0)));
  const height = 86;
  const pad = 26;
  const iw = Math.max(0, width - pad * 2);
  const xScale = scaleLinear().domain([-reach, reach]).range([0, iw]);
  const ticks = xScale.ticks(Math.min(8, reach * 2));
  const baseY = 52;

  return (
    <IntelCardShell
      title={s(data.title, "Statistical Outlier Detection")}
      badge={`${outliers.length} outlier${outliers.length === 1 ? "" : "s"}`}
      badgeTone="amber"
      icon={<ScanSearch size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={points.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        legend={null}
        headline={
          outliers[0]
            ? `${outliers[0].label} stands apart at ${outliers[0].value}${outliers[0].zText ? ` (z = ${outliers[0].zText})` : ""}; ${points.length - outliers.length} of ${points.length} points sit in the normal range.`
            : `No outliers among ${points.length} points.`
        }
        stats={[
          { label: "Points", value: String(points.length) },
          { label: "Outliers", value: String(outliers.length), tone: "accent" },
          ...(hasStrip ? [{ label: "Max |z|", value: fmtNum(Math.max(...plotted.map((p) => Math.abs(p.z as number)))) }] : []),
        ]}
      >
        {hasStrip && (
          <div ref={ref} className="dv-plot" style={{ height }}>
            {width > 0 && (
              <svg width={width} height={height} role="group" aria-label="Z-score strip">
                <g transform={`translate(${pad} 0)`}>
                  <line className="dv-axis" x1={0} x2={iw} y1={baseY} y2={baseY} />
                  <g aria-hidden="true">
                    {ticks.map((t) => (
                      <g key={t} transform={`translate(${xScale(t)} 0)`}>
                        <line className={t === 0 ? "dv-axis" : "dv-grid"} y1={t === 0 ? 14 : baseY - 5} y2={baseY + 5} />
                        <text className="dv-tick" y={baseY + 19} textAnchor="middle">
                          {t === 0 ? "mean" : `${t > 0 ? "+" : "−"}${Math.abs(t)}σ`}
                        </text>
                      </g>
                    ))}
                  </g>
                  {plotted.map((p, i) => {
                    const px = xScale(p.z as number);
                    const on = hover === p.key;
                    const dim = hover !== null && !on;
                    return (
                      <motion.g
                        key={p.key}
                        initial={m.reduce ? false : { x: xScale(0), y: baseY, opacity: 0 }}
                        animate={{ x: px, y: baseY, opacity: dim ? 0.35 : 1 }}
                        transition={{ ...m.stagger(i, 0.1), opacity: m.fade }}
                      >
                        {p.outlier && (
                          <motion.circle
                            className="dv-outlier__halo"
                            initial={m.reduce ? false : { r: 0 }}
                            animate={{ r: on ? 15 : 11 }}
                            transition={m.snap}
                          />
                        )}
                        <motion.circle
                          className="dv-mark dv-outlier__dot"
                          data-outlier={p.outlier || undefined}
                          initial={false}
                          animate={{ r: on ? 7 : p.outlier ? 6 : 4.5 }}
                          transition={m.snap}
                          {...markProps(`${p.label}: ${p.value}, z ${p.zText}${p.outlier ? ", outlier" : ""}`, {
                            enter: () => setHover(p.key),
                            leave: () => setHover(null),
                          })}
                        />
                        {(p.outlier || on) && (
                          <text className="dv-flag" y={-20} textAnchor={px > iw - 60 ? "end" : px < 60 ? "start" : "middle"}>
                            {p.label} · z {p.zText}
                          </text>
                        )}
                      </motion.g>
                    );
                  })}
                </g>
              </svg>
            )}
          </div>
        )}
        <ul className="dv-outlier-list" data-compact={compact || undefined}>
          {points.map((p, i) => (
            <motion.li
              key={p.key}
              className="dv-outlier-row"
              data-outlier={p.outlier || undefined}
              tabIndex={0}
              initial={m.reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: hover !== null && hover !== p.key ? 0.45 : 1, y: 0 }}
              transition={{ ...m.stagger(i, 0.07), opacity: m.fade }}
              onPointerEnter={() => setHover(p.key)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(p.key)}
              onBlur={() => setHover(null)}
            >
              {p.outlier ? (
                <TriangleAlert className="dv-glyph" size={14} strokeWidth={2.3} aria-label="Outlier" />
              ) : (
                <CircleDot className="dv-outlier-row__ok" size={14} strokeWidth={2.2} aria-hidden="true" />
              )}
              <strong>{p.label}</strong>
              <span className="dv-outlier-row__value">{p.value}</span>
              {p.zText && <span className="dv-outlier-row__z">z {p.zText}</span>}
              {p.outlier && p.reason && !compact && <p>{p.reason}</p>}
            </motion.li>
          ))}
        </ul>
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}
