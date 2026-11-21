"use client";

/** Bar-family catalog charts: stacked, ranked horizontal, histogram, waterfall, distribution. */

import { useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { area as d3area, curveMonotoneX, line as d3line, scaleLinear } from "d3";
import {
  ArrowDown,
  ArrowUp,
  BarChartHorizontal,
  BarChart4,
  ChartColumnStacked,
  ChartNoAxesCombined,
  Crown,
  Equal,
  Pin,
} from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { CHART_COLORS, getColor } from "./shared";
import { IntelChartVariantDeck } from "./ChartVariantDeck";
import { ColumnPlot, type ColumnGeometry } from "./ColumnPlot";
import { IntelCardShell, IntelVariantContext, s, n, a } from "../shared/IntelCardShell";
import {
  Legend,
  Num,
  Tip,
  YAxis,
  clipLabel,
  fmtPct,
  fmtSigned,
  fmtUnit,
  markProps,
  useDvMotion,
  useMeasure,
  useSeriesFocus,
  withUniqueKeys,
  type TipState,
} from "./kit";

const ACCENT = CHART_COLORS[0];
const SLATE = CHART_COLORS[3];
const GOLD = CHART_COLORS[2];

/* 1. StackedBarChart — stacked columns, column totals, per-segment legend with totals */
export function StackedBarChart({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const rows = a<Record<string, unknown>>(data.data);
  const keys = useMemo(() => a<string>(data.keys), [data.keys]);
  const unit = s(data.unit);
  const focus = useSeriesFocus(keys);

  const series = keys.map((k, i) => ({
    key: k,
    color: getColor(i),
    values: rows.map((row) => n(row[k])),
  }));
  const visible = series.filter((sr) => !focus.hidden.has(sr.key));
  const labels = rows.map((row, i) => s(row.label, `Group ${i + 1}`));
  const segTotals = series.map((sr) => sr.values.reduce((x, y) => x + y, 0));
  const grand = segTotals.reduce((x, y) => x + y, 0);
  const colTotals = labels.map((_, i) => visible.reduce((sum, sr) => sum + sr.values[i], 0));
  const peakCol = colTotals.indexOf(Math.max(...colTotals, 0));
  const topSeg = segTotals.indexOf(Math.max(...segTotals, 0));

  return (
    <IntelCardShell
      title={s(data.title, "Stacked Bar Chart")}
      badge={unit}
      icon={<ChartColumnStacked size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={rows.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        headline={
          series.length > 0
            ? `${series[topSeg].key} makes up ${fmtPct(grand > 0 ? (segTotals[topSeg] / grand) * 100 : 0)} of ${fmtUnit(grand, unit)}; ${labels[peakCol]} is the largest column at ${fmtUnit(colTotals[peakCol], unit)}.`
            : undefined
        }
        stats={[
          { label: "Grand total", value: <Num value={grand} unit={unit} /> },
          { label: `Peak · ${labels[peakCol] ?? "–"}`, value: fmtUnit(colTotals[peakCol] ?? 0, unit), tone: "accent" },
          { label: "Segments", value: `${visible.length} of ${series.length}` },
        ]}
        legend={(layout) => (
          <Legend
            items={series.map((sr, i) => ({
              key: sr.key,
              label: sr.key,
              color: sr.color,
              value: fmtUnit(segTotals[i], unit),
              share: grand > 0 ? (segTotals[i] / grand) * 100 : 0,
            }))}
            layout={layout}
            label="Segments"
            hidden={focus.hidden}
            hoverKey={focus.hoverKey}
            onHover={focus.setHoverKey}
            onToggle={focus.toggle}
          />
        )}
      >
        <ColumnPlot
          label={s(data.title, "Stacked bar chart")}
          categories={labels}
          series={visible}
          mode="stacked"
          height={variant === "minimal" ? 170 : 270}
          unit={unit}
          compact={variant === "minimal"}
          gap={0.3}
          maxBar={96}
          totals
          highlight={visible.length > 1 ? { index: peakCol, badge: "Peak" } : null}
          hoverKey={focus.hoverKey}
        />
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

/* 2. HorizontalBarChart — ranked rows with inline value + share */
export function HorizontalBarChart({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const unit = s(data.unit);
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  const items = withUniqueKeys(a<Record<string, unknown>>(data.items)
    .map((it, i) => ({ key: `${s(it.label, `Item ${i + 1}`)}`, label: s(it.label, `Item ${i + 1}`), value: n(it.value) })))
    .sort((x, y) => y.value - x.value);
  const total = items.reduce((sum, it) => sum + it.value, 0);
  const max = Math.max(...items.map((it) => it.value), 0) || 1;
  const leader = items[0];
  const focusKey = hover ?? pinned;
  const compact = variant === "minimal";

  return (
    <IntelCardShell
      title={s(data.title, "Horizontal Ranked Comparison")}
      badge={unit}
      icon={<BarChartHorizontal size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={items.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        legend={null}
        headline={
          leader
            ? `${leader.label} ranks first at ${fmtUnit(leader.value, unit)}, ${fmtPct(total > 0 ? (leader.value / total) * 100 : 0)} of the ${fmtUnit(total, unit)} total.`
            : undefined
        }
        stats={[
          { label: "Total", value: <Num value={total} unit={unit} /> },
          { label: "#1", value: leader ? leader.label : "–", tone: "accent" },
          { label: "Items ranked", value: String(items.length) },
        ]}
      >
        <div className="dv-rank-list" data-compact={compact || undefined} role="list" aria-label={s(data.title, "Ranking")}>
          {!compact && (
            <div className="dv-rank-list__scale" aria-hidden="true">
              <span>0</span>
              <span>{fmtUnit(max / 2, unit)}</span>
              <span>{fmtUnit(max, unit)}</span>
            </div>
          )}
          {items.map((it, i) => {
            const share = total > 0 ? (it.value / total) * 100 : 0;
            const on = focusKey === it.key;
            return (
              <motion.button
                key={it.key}
                type="button"
                role="listitem"
                className="dv-rank-row"
                data-leader={i === 0 || undefined}
                data-pinned={pinned === it.key || undefined}
                aria-pressed={pinned === it.key}
                aria-label={`Rank ${i + 1}: ${it.label}, ${fmtUnit(it.value, unit)}, ${fmtPct(share)} of total`}
                layout={!m.reduce}
                initial={m.reduce ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: focusKey !== null && !on ? 0.45 : 1, x: 0 }}
                transition={{ ...m.stagger(i, 0.07), opacity: m.fade }}
                whileTap={m.tap}
                onPointerEnter={() => setHover(it.key)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(it.key)}
                onBlur={() => setHover(null)}
                onClick={() => setPinned((prev) => (prev === it.key ? null : it.key))}
              >
                <span className="dv-rank-row__rank">
                  {i === 0 ? <Crown size={13} strokeWidth={2.3} aria-hidden="true" /> : String(i + 1).padStart(2, "0")}
                </span>
                <span className="dv-rank-row__label">{it.label}</span>
                <span className="dv-rank-row__value">
                  <Num value={it.value} unit={unit} />
                </span>
                <span className="dv-rank-row__share">{fmtPct(share)}</span>
                <span className="dv-rank-row__track" aria-hidden="true">
                  <motion.span
                    className="dv-rank-row__fill"
                    initial={m.reduce ? false : { width: "0%" }}
                    animate={{ width: `${(it.value / max) * 100}%`, scaleY: on ? 1.5 : 1 }}
                    transition={{ ...m.stagger(i, 0.07), scaleY: m.snap }}
                  />
                </span>
                <AnimatePresence initial={false}>
                  {pinned === it.key && leader && (
                    <motion.span
                      className="dv-rank-row__pin"
                      initial={m.reduce ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={m.snap}
                    >
                      <Pin size={11} strokeWidth={2.3} aria-hidden="true" />
                      {i === 0
                        ? `Leader · ${fmtUnit(it.value - (items[1]?.value ?? 0), unit)} ahead of #2`
                        : `${fmtUnit(leader.value - it.value, unit)} behind ${leader.label} · ${fmtPct((it.value / leader.value) * 100)} of the leader`}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

function binLegend(labels: string[], values: number[], unit: string, color: string) {
  const total = values.reduce((x, y) => x + y, 0);
  return labels.map((label, i) => ({
    key: label,
    label,
    color,
    value: fmtUnit(values[i], unit),
    share: total > 0 ? (values[i] / total) * 100 : 0,
  }));
}

/* 8. Histogram — touching bins, modal bin flagged, cumulative-share line */
export function Histogram({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const bins = a<Record<string, unknown>>(data.bins);
  const unit = s(data.unit);
  const labels = bins.map((b, i) => s(b.range ?? b.label, `Bin ${i + 1}`));
  const counts = bins.map((b) => n(b.count ?? b.frequency ?? b.value));
  const total = counts.reduce((x, y) => x + y, 0);
  const mode = counts.indexOf(Math.max(...counts, 0));
  let run = 0;
  const cumulative = counts.map((c) => (total > 0 ? (run += c) / total : 0));
  const medianBin = cumulative.findIndex((c) => c >= 0.5);

  const overlay = ({ cx, ih }: ColumnGeometry) => {
    const pts = cumulative.map((c, i) => [cx(i), ih * (1 - c)] as [number, number]);
    const d = d3line()(pts) || "";
    return (
      <g aria-hidden="true">
        <motion.path
          className="dv-line dv-cumulative"
          initial={m.reduce ? { d } : { d, pathLength: 0 }}
          animate={{ d, pathLength: 1 }}
          transition={{ d: m.spring, pathLength: m.draw(2) }}
        />
        {pts.map(([px, py], i) => (
          <motion.g
            key={labels[i]}
            initial={m.reduce ? false : { x: px, y: py, opacity: 0 }}
            animate={{ x: px, y: py, opacity: 1 }}
            transition={{ ...m.spring, opacity: m.stagger(i + 8, 0.08) }}
          >
            <circle className="dv-dot dv-cumulative-dot" r={3} />
            <text className="dv-tick dv-cumulative-label" y={-9} textAnchor={i === pts.length - 1 ? "end" : "middle"}>
              {fmtPct(cumulative[i] * 100)}
            </text>
          </motion.g>
        ))}
      </g>
    );
  };

  return (
    <IntelCardShell
      title={s(data.title, "Value Distribution Histogram")}
      badge={s(data.unit, "count")}
      icon={<BarChart4 size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={bins.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        headline={
          bins.length > 0
            ? `${labels[mode]} is the modal bin with ${fmtUnit(counts[mode], unit)} (${fmtPct(total > 0 ? (counts[mode] / total) * 100 : 0)}); half of all ${unit || "values"} fall at or below ${labels[medianBin] ?? "–"}.`
            : undefined
        }
        stats={[
          { label: "Total", value: <Num value={total} unit={unit} /> },
          { label: "Mode", value: labels[mode] ?? "–", tone: "accent" },
          { label: "Median bin", value: labels[medianBin] ?? "–" },
        ]}
        legend={(layout) =>
          layout === "chips" || layout === "inline" ? (
            <Legend
              layout={layout}
              label="Key"
              items={[
                { key: "count", label: "Count per bin", color: ACCENT },
                { key: "cum", label: "Cumulative share", color: "var(--gu-ink-2)" },
              ]}
            />
          ) : (
            <Legend layout={layout} label="Bins" items={binLegend(labels, counts, unit, ACCENT)} />
          )
        }
      >
        <ColumnPlot
          label={s(data.title, "Histogram")}
          categories={labels}
          series={[{ key: unit || "count", color: ACCENT, values: counts }]}
          height={variant === "minimal" ? 160 : 260}
          compact={variant === "minimal"}
          gap={0.04}
          maxBar={Infinity}
          highlight={{ index: mode, badge: "Mode" }}
          overlay={variant === "minimal" ? undefined : overlay}
          xTitle="Bin range"
        />
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

/* 13. WaterfallChart — floating signed deltas, connectors, running total under each step */
export function WaterfallChart({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const unit = s(data.unit);
  const compact = variant === "minimal";
  const height = compact ? 170 : 290;

  let running = 0;
  const steps = withUniqueKeys(a<Record<string, unknown>>(data.steps).map((st, i) => {
    const val = n(st.delta ?? st.value);
    const isTotal = Boolean(st.isTotal);
    const before = running;
    // A total with its own value (re)states the level; a bare total reports the running sum.
    if (isTotal && val !== 0) running = val;
    else if (!isTotal) running += val;
    return {
      key: `${s(st.label, `Step ${i + 1}`)}`,
      label: s(st.label, `Step ${i + 1}`),
      isTotal,
      delta: isTotal ? 0 : val,
      from: isTotal ? 0 : before,
      to: running,
      kind: isTotal ? ("total" as const) : val >= 0 ? ("up" as const) : ("down" as const),
    };
  }));
  const moves = steps.filter((st) => !st.isTotal);
  const ups = moves.filter((st) => st.delta >= 0);
  const downs = moves.filter((st) => st.delta < 0);
  const net = moves.reduce((sum, st) => sum + st.delta, 0);
  const first = steps[0];
  const last = steps[steps.length - 1];
  const biggest = moves.reduce<(typeof moves)[number] | null>(
    (best, st) => (!best || Math.abs(st.delta) > Math.abs(best.delta) ? st : best),
    null,
  );

  const margin = compact ? { t: 20, r: 4, b: 20, l: 4 } : { t: 26, r: 6, b: 40, l: 46 };
  const iw = Math.max(0, width - margin.l - margin.r);
  const ih = Math.max(0, height - margin.t - margin.b);
  const levels = steps.flatMap((st) => [st.from, st.to]);
  const yScale = scaleLinear()
    .domain([Math.min(0, ...levels), Math.max(0, ...levels) || 1])
    .nice(5)
    .range([ih, 0]);
  const y = (v: number) => yScale(v);
  const step = steps.length ? iw / steps.length : 0;
  const band = Math.min(step * 0.62, 64);
  const cx = (i: number) => step * i + step / 2;
  const fill = { up: "var(--dv-up)", down: "var(--dv-down)", total: GOLD };

  let tip: TipState | null = null;
  if (hover !== null && steps[hover]) {
    const st = steps[hover];
    tip = {
      x: margin.l + cx(hover),
      y: margin.t + Math.min(y(st.from), y(st.to)) - 24,
      title: st.label,
      rows: st.isTotal
        ? [{ label: "Total", value: fmtUnit(st.to, unit) }]
        : [
            { label: "Change", value: fmtSigned(st.delta, unit) },
            { label: "Running total", value: `${fmtUnit(st.from, unit)} → ${fmtUnit(st.to, unit)}` },
          ],
    };
  }

  return (
    <IntelCardShell
      title={s(data.title, "Waterfall Cumulative Breakdown")}
      badge={unit}
      icon={<ChartNoAxesCombined size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={steps.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        headline={
          first && last
            ? `${first.label} ${fmtUnit(first.to, unit)} moves to ${last.label} ${fmtUnit(last.to, unit)}, a net ${fmtSigned(net, unit)}${biggest ? `, driven most by ${biggest.label} (${fmtSigned(biggest.delta, unit)})` : ""}.`
            : undefined
        }
        stats={[
          { label: first?.label ?? "Start", value: fmtUnit(first?.to ?? 0, unit) },
          { label: "Net change", value: <Num value={net} unit={unit} signed />, tone: "accent" },
          { label: last?.label ?? "End", value: fmtUnit(last?.to ?? 0, unit) },
        ]}
        legend={(layout) => (
          <Legend
            layout={layout}
            label="Key"
            items={[
              { key: "up", label: "Increase", color: fill.up, value: fmtSigned(ups.reduce((x, st) => x + st.delta, 0), unit), note: `${ups.length} steps` },
              { key: "down", label: "Decrease", color: fill.down, value: fmtSigned(downs.reduce((x, st) => x + st.delta, 0), unit), note: `${downs.length} steps` },
              { key: "total", label: "Total", color: fill.total, value: fmtUnit(last?.to ?? 0, unit), note: "running" },
            ]}
          />
        )}
      >
        <div ref={ref} className="dv-plot" style={{ height }}>
          {width > 0 && (
            <svg width={width} height={height} role="group" aria-label={s(data.title, "Waterfall chart")}>
              <g transform={`translate(${margin.l} ${margin.t})`}>
                {!compact && <YAxis ticks={yScale.ticks(5)} y={y} x0={0} x1={iw} />}
                {!compact && unit && (
                  <text className="dv-tick dv-tick--unit" x={-margin.l + 2} y={-14}>
                    {unit}
                  </text>
                )}
                <line className="dv-axis" x1={0} x2={iw} y1={y(0)} y2={y(0)} />

                {steps.slice(0, -1).map((st, i) => (
                  <motion.line
                    key={`link|${st.key}`}
                    className="dv-connector"
                    initial={m.reduce ? false : { x1: cx(i) + band / 2, x2: cx(i) + band / 2, y1: y(st.to), y2: y(st.to), opacity: 0 }}
                    animate={{ x1: cx(i) + band / 2, x2: cx(i + 1) - band / 2, y1: y(st.to), y2: y(st.to), opacity: 1 }}
                    transition={m.stagger(i + 1, 0.11)}
                  />
                ))}

                {steps.map((st, i) => {
                  const top = Math.min(y(st.from), y(st.to));
                  const h = Math.max(1.5, Math.abs(y(st.from) - y(st.to)));
                  const origin = y(st.from);
                  const dim = hover !== null && hover !== i;
                  const Icon = st.kind === "up" ? ArrowUp : st.kind === "down" ? ArrowDown : Equal;
                  return (
                    <g key={st.key}>
                      <motion.rect
                        className="dv-bar"
                        rx={3}
                        fill={fill[st.kind]}
                        initial={m.reduce ? false : { attrX: cx(i) - band / 2, attrY: origin, width: band, height: 0, opacity: 1 }}
                        animate={{ attrX: cx(i) - band / 2, attrY: top, width: band, height: h, opacity: dim ? 0.35 : 1 }}
                        transition={{ ...m.stagger(i, 0.11), opacity: m.fade }}
                      />
                      <motion.g
                        className="dv-wf-label"
                        data-kind={st.kind}
                        initial={m.reduce ? false : { x: cx(i), y: origin, opacity: 0 }}
                        animate={{ x: cx(i), y: st.kind === "down" ? top + h + 14 : top - 7, opacity: dim ? 0.4 : 1 }}
                        transition={{ ...m.stagger(i, 0.11), opacity: m.fade }}
                      >
                        {!compact && step >= 70 && <Icon x={-30} y={-10} size={11} strokeWidth={2.6} aria-hidden="true" />}
                        <text className="dv-val" data-strong="true" textAnchor="middle" x={!compact && step >= 70 ? 4 : 0}>
                          {st.isTotal ? fmtUnit(st.to) : fmtSigned(st.delta)}
                        </text>
                      </motion.g>
                      <text className="dv-tick" data-strong={hover === i || undefined} x={cx(i)} y={ih + 15} textAnchor="middle">
                        {clipLabel(st.label, Math.max(3, Math.floor(step / 6.4)))}
                      </text>
                      {!compact && (
                        <text className="dv-rank" x={cx(i)} y={ih + 29} textAnchor="middle">
                          {step >= 70 ? `= ${fmtUnit(st.to, unit)}` : fmtUnit(st.to)}
                        </text>
                      )}
                      <motion.rect
                        className="dv-hit"
                        x={step * i}
                        y={-8}
                        width={step}
                        height={ih + 8}
                        rx={6}
                        initial={false}
                        animate={{ fillOpacity: hover === i ? 0.055 : 0 }}
                        transition={m.fade}
                        {...markProps(
                          st.isTotal
                            ? `${st.label}: total ${fmtUnit(st.to, unit)}`
                            : `${st.label}: ${fmtSigned(st.delta, unit)}, running total ${fmtUnit(st.to, unit)}`,
                          { enter: () => setHover(i), leave: () => setHover(null) },
                        )}
                      />
                    </g>
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

/* 17. DistributionAnalysis — summary statistics strip + bars under a smoothed shape curve */
export function DistributionAnalysis({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const buckets = a<Record<string, unknown>>(data.buckets);
  const summary = (data.summary as Record<string, unknown>) || {};
  const unit = s(data.unit);
  const labels = buckets.map((b, i) => s(b.label ?? b.range, `Bucket ${i + 1}`));
  const freqs = buckets.map((b) => n(b.frequency ?? b.count ?? b.value));
  const total = freqs.reduce((x, y) => x + y, 0);
  const mode = freqs.indexOf(Math.max(...freqs, 0));
  const facts = [
    { label: "Mean", value: s(summary.mean) },
    { label: "Median", value: s(summary.median) },
    { label: "Std dev", value: s(summary.stdDev) },
    { label: "Skew", value: s(summary.skew) },
  ].filter((f) => f.value);

  const overlay = ({ cx, y, ih }: ColumnGeometry) => {
    const pts = freqs.map((f, i) => [cx(i), y(f)] as [number, number]);
    const line = d3line().curve(curveMonotoneX)(pts) || "";
    const fillPath = d3area().y0(ih).curve(curveMonotoneX)(pts) || "";
    return (
      <g aria-hidden="true">
        <motion.path
          className="dv-shape-fill"
          initial={m.reduce ? { d: fillPath } : { d: fillPath, opacity: 0 }}
          animate={{ d: fillPath, opacity: 1 }}
          transition={{ d: m.spring, opacity: m.draw(3) }}
        />
        <motion.path
          className="dv-line dv-shape-line"
          initial={m.reduce ? { d: line } : { d: line, pathLength: 0 }}
          animate={{ d: line, pathLength: 1 }}
          transition={{ d: m.spring, pathLength: m.draw(2) }}
        />
      </g>
    );
  };

  return (
    <IntelCardShell
      title={s(data.title, "Distribution Analysis")}
      icon={<ChartNoAxesCombined size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={buckets.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        headline={
          buckets.length > 0
            ? `The distribution peaks at ${labels[mode]} (${fmtPct(total > 0 ? (freqs[mode] / total) * 100 : 0)} of ${fmtUnit(total, unit)})${s(summary.skew) ? `, skewed ${s(summary.skew).toLowerCase()}` : ""}.`
            : undefined
        }
        stats={facts.map((f, i) => ({ ...f, tone: i === 0 ? ("accent" as const) : undefined }))}
        legend={(layout) =>
          layout === "chips" || layout === "inline" ? (
            <Legend
              layout={layout}
              label="Key"
              items={[
                { key: "freq", label: "Frequency", color: SLATE },
                { key: "shape", label: "Shape", color: ACCENT },
              ]}
            />
          ) : (
            <Legend layout={layout} label="Buckets" items={binLegend(labels, freqs, unit, SLATE)} />
          )
        }
      >
        {variant === "default" && facts.length > 0 && (
          <dl className="dv-facts">
            {facts.map((f, i) => (
              <motion.div
                key={f.label}
                initial={m.reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={m.stagger(i, 0.06)}
              >
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </motion.div>
            ))}
          </dl>
        )}
        <ColumnPlot
          label={s(data.title, "Distribution")}
          categories={labels}
          series={[{ key: "Frequency", color: SLATE, values: freqs }]}
          height={variant === "minimal" ? 150 : 230}
          unit={unit}
          compact={variant === "minimal"}
          gap={0.5}
          maxBar={34}
          overlay={overlay}
          xTitle="Bucket"
          yTitle="Frequency"
        />
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}
