"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { area as d3area, curveMonotoneX, line as d3line, scaleLinear } from "d3";
import { AxisTitles, Tip, YAxis, clipLabel, fmtUnit, uniqueKeys, useDvMotion, useMeasure, type TipState } from "./kit";

export interface LineSeries {
  key: string;
  color: string;
  values: (number | null)[];
  /** un-stacked values for the tooltip when `values` are cumulative */
  raw?: (number | null)[];
  dashed?: boolean;
  area?: boolean;
  dots?: boolean;
  width?: number;
}

export interface PointNote {
  index: number;
  key: string;
  text: string;
  place?: "above" | "below";
}

type Pt = [number, number] | null;

/** Lines / areas over an ordered label axis, with optional annotations. */
export function SeriesPlot({
  label,
  labels,
  series,
  height,
  unit,
  compact = false,
  hoverKey = null,
  zeroBase = false,
  envelope,
  range,
  notes = [],
  now,
  stems,
  xTitle,
  yTitle,
}: {
  label: string;
  labels: string[];
  series: LineSeries[];
  height: number;
  unit?: string;
  compact?: boolean;
  hoverKey?: string | null;
  zeroBase?: boolean;
  /** shaded band between two value arrays (forecast uncertainty) */
  envelope?: { label: string; color: string; lower: (number | null)[]; upper: (number | null)[] } | null;
  /** min–max band of the primary series */
  range?: { min: number; max: number; minLabel: string; maxLabel: string; color: string } | null;
  notes?: PointNote[];
  now?: { index: number; label: string; before: string; after: string } | null;
  /** vertical residual stems between two series */
  stems?: { from: string; to: string } | null;
  xTitle?: string;
  yTitle?: string;
}) {
  const m = useDvMotion();
  const clipId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hoverI, setHoverI] = useState<number | null>(null);

  const margin = compact
    ? { t: 16, r: 8, b: 18, l: 8 }
    : { t: 28, r: 16, b: 24 + (xTitle ? 16 : 0), l: 46 + (yTitle ? 14 : 0) };
  const iw = Math.max(0, width - margin.l - margin.r);
  const ih = Math.max(0, height - margin.t - margin.b);
  const n = labels.length;
  const labelKeys = uniqueKeys(labels);

  const nums = [
    ...series.flatMap((s) => s.values),
    ...(envelope ? [...envelope.lower, ...envelope.upper] : []),
  ].filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const lo = nums.length ? Math.min(...nums) : 0;
  const hi = nums.length ? Math.max(...nums) : 1;
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  const yScale = scaleLinear()
    .domain([zeroBase ? Math.min(0, lo) : lo - pad, hi + pad * 0.6])
    .nice(5)
    .range([ih, 0]);
  const y = (v: number) => yScale(v);
  const x = (i: number) => (n > 1 ? (iw * i) / (n - 1) : iw / 2);
  const ticks = yScale.ticks(5);

  const toPts = (values: (number | null)[]): Pt[] =>
    labels.map((_, i) => (typeof values[i] === "number" ? [x(i), y(values[i] as number)] : null));
  const lineGen = d3line<Pt>()
    .defined((d) => d !== null)
    .x((d) => (d as [number, number])[0])
    .y((d) => (d as [number, number])[1])
    .curve(curveMonotoneX);
  const areaGen = d3area<Pt>()
    .defined((d) => d !== null)
    .x((d) => (d as [number, number])[0])
    .y1((d) => (d as [number, number])[1])
    .y0(ih)
    .curve(curveMonotoneX);

  const envelopePath = envelope
    ? d3area<number>()
        .defined((i) => typeof envelope.lower[i] === "number" && typeof envelope.upper[i] === "number")
        .x((i) => x(i))
        .y0((i) => y(envelope.lower[i] as number))
        .y1((i) => y(envelope.upper[i] as number))
        .curve(curveMonotoneX)(labels.map((_, i) => i)) || ""
    : "";

  const byKey = new Map(series.map((s) => [s.key, s]));
  const dimOf = (key: string) => hoverKey !== null && hoverKey !== key;
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 54))));

  const pick = (e: PointerEvent<SVGRectElement>) => {
    if (n === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = box.width > 0 ? (e.clientX - box.left) / box.width : 0;
    setHoverI(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setHoverI((prev) => {
      const cur = prev ?? n - 1;
      return Math.max(0, Math.min(n - 1, cur + (e.key === "ArrowRight" ? 1 : -1)));
    });
  };

  let tip: TipState | null = null;
  if (hoverI !== null && labels[hoverI] !== undefined) {
    const rows = series
      .filter((s) => typeof s.values[hoverI] === "number")
      .map((s) => ({ label: s.key, value: fmtUnit((s.raw ?? s.values)[hoverI] as number, unit), color: s.color }));
    if (envelope && typeof envelope.upper[hoverI] === "number") {
      rows.push({ label: envelope.label, value: fmtUnit(envelope.upper[hoverI] as number, unit), color: envelope.color });
    }
    const tops = series
      .map((s) => s.values[hoverI])
      .filter((v): v is number => typeof v === "number")
      .map(y);
    if (rows.length) {
      tip = { x: margin.l + x(hoverI), y: margin.t + Math.min(ih, ...tops) - 14, title: labels[hoverI], rows };
    }
  }

  const summary = series
    .map((s) => {
      const vals = s.values.filter((v): v is number => typeof v === "number");
      return vals.length ? `${s.key} ${fmtUnit(vals[0], unit)} to ${fmtUnit(vals[vals.length - 1], unit)}` : s.key;
    })
    .join("; ");

  return (
    <div ref={ref} className="dv-plot" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="dv-focusable"
          role="img"
          tabIndex={0}
          aria-label={`${label}. ${summary}. Use arrow keys to step through points.`}
          onKeyDown={onKey}
          onFocus={() => setHoverI((prev) => prev ?? n - 1)}
          onBlur={() => setHoverI(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <motion.rect
                x={-4}
                y={-margin.t}
                height={height}
                initial={m.reduce ? false : { width: 0 }}
                animate={{ width: iw + 8 }}
                transition={m.draw()}
              />
            </clipPath>
          </defs>
          {!compact && (
            <AxisTitles x={xTitle} y={yTitle} left={margin.l} top={margin.t} iw={iw} ih={ih} height={height} />
          )}
          <g transform={`translate(${margin.l} ${margin.t})`}>
            {now && labels[now.index] !== undefined && (
              <g aria-hidden="true">
                <motion.rect
                  className="dv-now-zone"
                  y={0}
                  height={ih}
                  initial={m.reduce ? false : { attrX: x(now.index), width: 0 }}
                  animate={{ attrX: x(now.index), width: Math.max(0, iw - x(now.index)) }}
                  transition={m.draw(1)}
                />
                <motion.g initial={false} animate={{ x: x(now.index) }} transition={m.spring}>
                  <line className="dv-now-line" y1={-6} y2={ih} />
                  <text className="dv-flag" x={6} y={11}>
                    {now.label}
                  </text>
                  <text className="dv-zone-label" x={-8} y={-12} textAnchor="end">
                    {now.before}
                  </text>
                  <text className="dv-zone-label" data-tone="accent" x={8} y={-12}>
                    {now.after}
                  </text>
                </motion.g>
              </g>
            )}

            {!compact && <YAxis ticks={ticks} y={y} x0={0} x1={iw} />}
            {!compact && unit && (
              <text className="dv-tick dv-tick--unit" x={-margin.l + 2} y={-14}>
                {unit}
              </text>
            )}
            <line className="dv-axis" x1={0} x2={iw} y1={ih} y2={ih} />

            {range && (
              <g aria-hidden="true">
                <motion.rect
                  x={0}
                  width={iw}
                  fill={range.color}
                  initial={m.reduce ? false : { attrY: y(range.max), height: 0, opacity: 0 }}
                  animate={{ attrY: y(range.max), height: Math.max(0, y(range.min) - y(range.max)), opacity: 0.07 }}
                  transition={m.draw(1)}
                />
                {[
                  { v: range.max, text: range.maxLabel, dy: -5 },
                  { v: range.min, text: range.minLabel, dy: 13 },
                ].map((edge) => (
                  <motion.g
                    key={edge.text}
                    initial={m.reduce ? false : { y: y(edge.v), opacity: 0 }}
                    animate={{ y: y(edge.v), opacity: 1 }}
                    transition={m.draw(2)}
                  >
                    <line className="dv-range-line" x1={0} x2={iw} stroke={range.color} />
                    <text className="dv-flag" x={iw} y={edge.dy} textAnchor="end">
                      {edge.text}
                    </text>
                  </motion.g>
                ))}
              </g>
            )}

            <g clipPath={`url(#${clipId})`}>
              {envelope && envelopePath && (
                <motion.path
                  fill={envelope.color}
                  fillOpacity={0.16}
                  initial={false}
                  animate={{ d: envelopePath }}
                  transition={m.spring}
                />
              )}
              <AnimatePresence>
                {series
                  .filter((s) => s.area)
                  .map((s) => {
                    const d = areaGen(toPts(s.values)) || "";
                    return (
                      <motion.path
                        key={`area|${s.key}`}
                        fill={s.color}
                        initial={{ d, opacity: 0 }}
                        animate={{ d, opacity: dimOf(s.key) ? 0.05 : 0.18 }}
                        exit={{ opacity: 0 }}
                        transition={{ ...m.spring, opacity: m.fade }}
                      />
                    );
                  })}
                {series
                  .filter((s) => s.dashed)
                  .map((s) => {
                    const d = lineGen(toPts(s.values)) || "";
                    return (
                      <motion.path
                        key={`dash|${s.key}`}
                        className="dv-line"
                        stroke={s.color}
                        strokeWidth={s.width ?? 2}
                        strokeDasharray="5 5"
                        initial={{ d, opacity: 0 }}
                        animate={{ d, opacity: dimOf(s.key) ? 0.22 : 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ ...m.spring, opacity: m.fade }}
                      />
                    );
                  })}
              </AnimatePresence>
            </g>

            {stems &&
              byKey.get(stems.from) &&
              byKey.get(stems.to) &&
              labels.map((_lab, i) => {
                const a = byKey.get(stems.from)?.values[i];
                const b = byKey.get(stems.to)?.values[i];
                if (typeof a !== "number" || typeof b !== "number") return null;
                return (
                  <motion.line
                    key={`stem|${labelKeys[i]}`}
                    className="dv-stem"
                    data-dir={a >= b ? "up" : "down"}
                    initial={m.reduce ? false : { x1: x(i), x2: x(i), y1: y(b), y2: y(b), opacity: 0 }}
                    animate={{ x1: x(i), x2: x(i), y1: y(b), y2: y(a), opacity: 1 }}
                    transition={m.stagger(i + 8)}
                  />
                );
              })}

            <AnimatePresence>
              {series
                .filter((s) => !s.dashed)
                .map((s, si) => {
                  const d = lineGen(toPts(s.values)) || "";
                  return (
                    <motion.path
                      key={`line|${s.key}`}
                      className="dv-line"
                      stroke={s.color}
                      initial={m.reduce ? { d } : { d, pathLength: 0, opacity: 0 }}
                      animate={{
                        d,
                        pathLength: 1,
                        opacity: dimOf(s.key) ? 0.22 : 1,
                        strokeWidth: (s.width ?? 2.25) + (hoverKey === s.key ? 1 : 0),
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ d: m.spring, pathLength: m.draw(si), opacity: m.fade, strokeWidth: m.snap }}
                    />
                  );
                })}
              {series
                .filter((s) => s.dots)
                .flatMap((s) =>
                  labels.map((_lab, i) => {
                    const v = s.values[i];
                    if (typeof v !== "number") return null;
                    return (
                      <motion.circle
                        key={`dot|${s.key}|${labelKeys[i]}`}
                        className="dv-dot"
                        stroke={s.color}
                        initial={m.reduce ? false : { cx: x(i), cy: y(v), r: 0, opacity: 1 }}
                        animate={{ cx: x(i), cy: y(v), r: 2.8, opacity: dimOf(s.key) ? 0.22 : 1 }}
                        exit={{ r: 0, opacity: 0 }}
                        transition={{ ...m.spring, r: m.stagger(i + 6, 0.07), opacity: m.fade }}
                      />
                    );
                  }),
                )}
            </AnimatePresence>

            {notes.map((note) => {
              const s = byKey.get(note.key);
              const v = s?.values[note.index];
              if (!s || typeof v !== "number") return null;
              const px = x(note.index);
              const anchor = px < 48 ? "start" : px > iw - 48 ? "end" : "middle";
              return (
                <motion.g
                  key={`note|${note.key}|${note.place ?? "above"}`}
                  aria-hidden="true"
                  initial={m.reduce ? false : { x: px, y: y(v), opacity: 0 }}
                  animate={{ x: px, y: y(v), opacity: dimOf(note.key) ? 0.25 : 1 }}
                  transition={{ ...m.spring, opacity: m.draw(3) }}
                >
                  <circle className="dv-note-ring" r={5.5} stroke={s.color} />
                  <text
                    className="dv-flag"
                    textAnchor={anchor}
                    x={anchor === "start" ? 9 : anchor === "end" ? -9 : 0}
                    y={note.place === "below" ? 21 : -12}
                  >
                    {note.text}
                  </text>
                </motion.g>
              );
            })}

            <g aria-hidden="true">
              {labels.map((lab, i) =>
                i % every === 0 || i === n - 1 ? (
                  <text
                    key={labelKeys[i]}
                    className="dv-tick"
                    data-strong={hoverI === i || undefined}
                    x={x(i)}
                    y={ih + 15}
                    textAnchor={n > 1 && i === 0 ? "start" : n > 1 && i === n - 1 ? "end" : "middle"}
                  >
                    {clipLabel(lab, 10)}
                  </text>
                ) : null,
              )}
            </g>

            <motion.line
              className="dv-cross"
              y1={0}
              y2={ih}
              initial={false}
              animate={{ x1: x(hoverI ?? n - 1), x2: x(hoverI ?? n - 1), opacity: hoverI === null ? 0 : 1 }}
              transition={m.snap}
            />
            {series.map((s) => {
              const i = hoverI ?? n - 1;
              const v = s.values[i];
              if (typeof v !== "number") return null;
              return (
                <motion.circle
                  key={`hover|${s.key}`}
                  className="dv-dot dv-dot--hover"
                  r={4.5}
                  fill={s.color}
                  initial={false}
                  animate={{ cx: x(i), cy: y(v), opacity: hoverI === null ? 0 : 1 }}
                  transition={m.snap}
                />
              );
            })}

            <rect
              className="dv-hit"
              x={0}
              y={0}
              width={iw}
              height={ih}
              fillOpacity={0}
              onPointerMove={pick}
              onPointerDown={pick}
              onPointerLeave={() => setHoverI(null)}
            />
          </g>
        </svg>
      )}
      <Tip tip={tip} width={width} />
      <span className="dv-sr" aria-live="polite">
        {tip ? `${tip.title}: ${tip.rows.map((r) => `${r.label} ${r.value}`).join(", ")}` : ""}
      </span>
    </div>
  );
}
