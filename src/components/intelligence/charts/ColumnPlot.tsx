"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { scaleLinear } from "d3";
import {
  AxisTitles,
  Num,
  Tip,
  YAxis,
  clipLabel,
  fmtPct,
  fmtUnit,
  markProps,
  markUnit,
  uniqueKeys,
  useDvMotion,
  useMeasure,
  type TipState,
} from "./kit";

export interface ColumnSeries {
  key: string;
  color: string;
  values: number[];
}

export interface ColumnGeometry {
  cx: (i: number) => number;
  y: (v: number) => number;
  iw: number;
  ih: number;
  band: number;
}

/** Vertical columns: single, grouped or stacked. One focus stop per category. */
export function ColumnPlot({
  label,
  categories,
  series,
  mode = "grouped",
  height,
  unit,
  compact = false,
  gap = 0.36,
  maxBar = 72,
  highlight = null,
  ranks,
  totals = false,
  hoverKey = null,
  selected = null,
  onSelect,
  overlay,
  xTitle,
  yTitle,
}: {
  label: string;
  categories: string[];
  series: ColumnSeries[];
  mode?: "grouped" | "stacked";
  height: number;
  unit?: string;
  compact?: boolean;
  gap?: number;
  maxBar?: number;
  highlight?: { index: number; badge: string } | null;
  ranks?: number[];
  totals?: boolean;
  hoverKey?: string | null;
  selected?: number | null;
  onSelect?: (index: number) => void;
  overlay?: (g: ColumnGeometry) => ReactNode;
  xTitle?: string;
  yTitle?: string;
}) {
  const m = useDvMotion();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hoverCat, setHoverCat] = useState<number | null>(null);

  const stacked = mode === "stacked" && series.length > 1;
  const catKeys = uniqueKeys(categories);
  const margin = compact
    ? { t: 22, r: 2, b: 20, l: 2 }
    : { t: 34, r: 6, b: (ranks ? 38 : 24) + (xTitle ? 16 : 0), l: 46 + (yTitle ? 14 : 0) };
  const iw = Math.max(0, width - margin.l - margin.r);
  const ih = Math.max(0, height - margin.t - margin.b);

  const catTotals = categories.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const grand = catTotals.reduce((a, b) => a + b, 0);
  const all = stacked ? catTotals : series.flatMap((s) => s.values);
  const yScale = scaleLinear()
    .domain([Math.min(0, ...all), Math.max(0, ...all) || 1])
    .nice(5)
    .range([ih, 0]);
  const y = (v: number) => yScale(v);
  const ticks = yScale.ticks(5);
  const step = categories.length ? iw / categories.length : 0;
  const band = Math.min(step * (1 - gap), maxBar);
  const cx = (i: number) => step * i + step / 2;
  const sub = stacked ? band : band / Math.max(1, series.length);
  const inset = !stacked && series.length > 1 ? 1 : 0;
  const zero = y(0);

  const bars = series.flatMap((s, si) =>
    categories.map((_cat, i) => {
      const v = s.values[i] ?? 0;
      const below = stacked ? series.slice(0, si).reduce((sum, p) => sum + (p.values[i] ?? 0), 0) : 0;
      const y0 = y(below);
      const y1 = y(below + v);
      const dim =
        (hoverCat !== null ? hoverCat !== i : selected !== null && selected !== i) ||
        (hoverKey !== null && hoverKey !== s.key);
      const lifted = hoverCat === i || selected === i;
      const base = highlight && series.length === 1 && highlight.index !== i && !lifted ? 0.52 : 1;
      return {
        id: `${s.key}|${catKeys[i]}`,
        s,
        si,
        i,
        v,
        x: cx(i) - band / 2 + (stacked ? 0 : si * sub) + inset,
        w: Math.max(0, sub - inset * 2),
        top: Math.min(y0, y1),
        h: Math.abs(y0 - y1),
        opacity: dim ? base * 0.36 : base,
        dim,
      };
    }),
  );

  const labelled = bars.filter((b) => (stacked ? b.h >= 15 && b.w >= 30 : b.w >= 28 || series.length === 1));

  let tip: TipState | null = null;
  if (hoverCat !== null && categories[hoverCat] !== undefined) {
    const inCat = bars.filter((b) => b.i === hoverCat);
    const rows = inCat.map((b) => ({ label: b.s.key, value: fmtUnit(b.v, unit), color: b.s.color }));
    if (series.length > 1) rows.push({ label: "Total", value: fmtUnit(catTotals[hoverCat], unit), color: "" });
    else if (grand > 0) rows.push({ label: "Share", value: fmtPct((catTotals[hoverCat] / grand) * 100), color: "" });
    tip = {
      x: margin.l + cx(hoverCat),
      y: margin.t + Math.min(...inCat.map((b) => b.top), zero) - (compact ? 16 : 22),
      title: categories[hoverCat],
      rows,
    };
  }

  return (
    <div ref={ref} className="dv-plot" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={label}>
          {!compact && (
            <AxisTitles x={xTitle} y={yTitle} left={margin.l} top={margin.t} iw={iw} ih={ih} height={height} />
          )}
          <g transform={`translate(${margin.l} ${margin.t})`}>
            {!compact && <YAxis ticks={ticks} y={y} x0={0} x1={iw} />}
            {!compact && unit && (
              <text className="dv-tick dv-tick--unit" x={-margin.l + 2} y={-18}>
                {unit}
              </text>
            )}

            <AnimatePresence initial={!m.reduce}>
              {bars.map((b) => (
                <motion.rect
                  key={b.id}
                  className="dv-bar"
                  fill={b.s.color}
                  rx={stacked ? 1.5 : Math.min(4, b.w / 3)}
                  initial={{ attrX: b.x, attrY: zero, width: b.w, height: 0, opacity: b.opacity }}
                  animate={{ attrX: b.x, attrY: b.top, width: b.w, height: b.h, opacity: b.opacity }}
                  exit={{ attrY: zero, height: 0, opacity: 0 }}
                  transition={{ ...m.stagger(b.i + b.si * 0.5), opacity: m.fade }}
                />
              ))}
            </AnimatePresence>
            <motion.line
              className="dv-axis"
              x1={0}
              x2={iw}
              initial={false}
              animate={{ y1: zero, y2: zero }}
              transition={m.spring}
            />

            <AnimatePresence initial={!m.reduce}>
              {labelled.map((b) =>
                stacked ? (
                  <motion.text
                    key={`in|${b.id}`}
                    className="dv-val dv-on-mark"
                    textAnchor="middle"
                    initial={{ x: b.x + b.w / 2, y: zero, opacity: 0 }}
                    animate={{ x: b.x + b.w / 2, y: b.top + b.h / 2 + 4, opacity: b.dim ? 0.4 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ ...m.stagger(b.i + b.si * 0.5), opacity: m.fade }}
                  >
                    {fmtUnit(b.v)}
                  </motion.text>
                ) : (
                  <motion.text
                    key={`top|${b.id}`}
                    className="dv-val"
                    data-strong={highlight?.index === b.i || undefined}
                    textAnchor="middle"
                    initial={{ x: b.x + b.w / 2, y: zero - 6, opacity: 0 }}
                    animate={{
                      x: b.x + b.w / 2,
                      y: b.v < 0 ? b.top + b.h + 13 : b.top - 6,
                      opacity: b.dim ? 0.4 : 1,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ ...m.stagger(b.i + b.si * 0.5), opacity: m.fade }}
                  >
                    <Num as="tspan" value={b.v} unit={series.length > 1 || step < 64 ? undefined : markUnit(unit)} />
                  </motion.text>
                ),
              )}
            </AnimatePresence>

            {totals &&
              stacked &&
              categories.map((_cat, i) => (
                <motion.text
                  key={`total|${catKeys[i]}`}
                  className="dv-val"
                  data-strong="true"
                  textAnchor="middle"
                  initial={m.reduce ? false : { x: cx(i), y: zero - 7, opacity: 0 }}
                  animate={{ x: cx(i), y: y(catTotals[i]) - 7, opacity: hoverCat !== null && hoverCat !== i ? 0.4 : 1 }}
                  transition={{ ...m.stagger(i + 1), opacity: m.fade }}
                >
                  <Num as="tspan" value={catTotals[i]} unit={step < 64 ? undefined : markUnit(unit)} />
                </motion.text>
              ))}

            {highlight && categories[highlight.index] !== undefined && (
              <motion.text
                key="badge"
                className="dv-flag"
                textAnchor="middle"
                initial={m.reduce ? false : { x: cx(highlight.index), y: zero - 20, opacity: 0 }}
                animate={{
                  x: cx(highlight.index),
                  y: y(stacked ? catTotals[highlight.index] : Math.max(0, ...series.map((s) => s.values[highlight.index] ?? 0))) - 21,
                  opacity: 1,
                }}
                transition={m.stagger(highlight.index + 3)}
              >
                {highlight.badge}
              </motion.text>
            )}

            {overlay?.({ cx, y, iw, ih, band })}

            <g aria-hidden="true">
              {categories.map((cat, i) => (
                <text
                  key={catKeys[i]}
                  className="dv-tick"
                  data-strong={hoverCat === i || selected === i || undefined}
                  x={cx(i)}
                  y={ih + 15}
                  textAnchor="middle"
                >
                  {clipLabel(cat, Math.max(3, Math.floor(step / 6.4)))}
                </text>
              ))}
              {ranks &&
                !compact &&
                categories.map((_cat, i) => (
                  <text
                    key={catKeys[i]}
                    className="dv-rank"
                    data-top={ranks[i] === 1 || undefined}
                    x={cx(i)}
                    y={ih + 29}
                    textAnchor="middle"
                  >
                    #{ranks[i]}
                  </text>
                ))}
            </g>

            {categories.map((cat, i) => (
              <motion.rect
                key={catKeys[i]}
                className="dv-hit"
                x={step * i}
                y={-8}
                width={step}
                height={ih + 8}
                rx={6}
                initial={false}
                animate={{ fillOpacity: hoverCat === i ? 0.055 : selected === i ? 0.035 : 0 }}
                transition={m.fade}
                whileTap={onSelect ? { fillOpacity: 0.1 } : undefined}
                {...markProps(
                  `${cat}: ${series.map((s) => `${series.length > 1 ? `${s.key} ` : ""}${fmtUnit(s.values[i] ?? 0, unit)}`).join(", ")}${ranks ? `, rank ${ranks[i]} of ${categories.length}` : ""}`,
                  {
                    enter: () => setHoverCat(i),
                    leave: () => setHoverCat(null),
                    activate: onSelect ? () => onSelect(i) : undefined,
                    pressed: selected === i,
                  },
                )}
              />
            ))}
          </g>
        </svg>
      )}
      <Tip tip={tip} width={width} />
    </div>
  );
}
