"use client";

/**
 * Metric — Single KPI display with an animated trend chart (Momo coral palette + 4 variants)
 */

import { useCallback, useContext, useState, type KeyboardEvent, type PointerEvent } from "react";
import { motion } from "motion/react";
import { area as d3area, curveMonotoneX, line as d3line, scaleLinear } from "d3";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { IntelBaseProps, IntelMetricData } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { MeterFill, STAGGER_ITEM } from "../shared/StateMotion";
import { EASE, Num, Tip, fmtNum, fmtUnit, useDvMotion, type TipState } from "../charts/kit";

/* ── data helpers (shared with MetricGroup) ── */

export interface SparkStats {
  lo: number;
  hi: number;
  avg: number;
  first: number;
  last: number;
  chg: number;
  chgPct: number;
}

/** Sparkline kept index-aligned; non-finite points become gaps. */
export function cleanSpark(values: number[] | undefined): (number | null)[] | null {
  if (!Array.isArray(values)) return null;
  const out = values.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));
  return out.filter((v) => v !== null).length >= 2 ? out : null;
}

export function metricSparkStats(values: (number | null)[] | null): SparkStats | null {
  if (!values) return null;
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return null;
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const first = nums[0];
  const last = nums[nums.length - 1];
  const chg = last - first;
  const chgPct = first !== 0 ? (chg / Math.abs(first)) * 100 : 0;
  return { lo, hi, avg, first, last, chg, chgPct };
}

export function metricNumber(value: string | number | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(/[,\s]/g, "");
    if (!cleaned) return null;
    const v = Number(cleaned);
    return Number.isFinite(v) ? v : null;
  }
  return null;
}

export function MetricValue({ m }: { m: IntelMetricData }) {
  const num = metricNumber(m.value);
  return (
    <>
      {m.prefix ?? ""}
      {num !== null ? <Num value={num} /> : m.value}
      {m.unit ? <span className="dv-metric__unit">{m.unit}</span> : null}
    </>
  );
}

export function MetricDeltaBadge({ m, stats }: { m: IntelMetricData; stats: SparkStats | null }) {
  const trend =
    m.trend ?? (stats ? (stats.chg > 0 ? "up" : stats.chg < 0 ? "down" : "flat") : "flat");
  if (!m.delta && !stats) return null;
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <span className="dv-metric__delta" data-dir={trend}>
      <Icon size={12} strokeWidth={2.4} aria-hidden="true" />
      {m.delta ?? <Num value={stats ? stats.chgPct : 0} signed suffix="%" />}
    </span>
  );
}

/* ── measured box (width + height) ── */

function useBox<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const update = () =>
      setSize({ width: Math.round(node.clientWidth), height: Math.round(node.clientHeight) });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

type Pt = [number, number] | null;

/* ── trend plot: area + line, draw-in, target, crosshair + tip ── */

export function MetricTrend({
  values,
  labels,
  unit,
  target,
  name = "Metric",
  interactive = true,
  marks = true,
  className = "",
}: {
  values: (number | null)[];
  labels?: string[];
  unit?: string;
  target?: number;
  name?: string;
  interactive?: boolean;
  marks?: boolean;
  className?: string;
}) {
  const m = useDvMotion();
  const [ref, size] = useBox<HTMLDivElement>();
  const [hoverI, setHoverI] = useState<number | null>(null);
  const w = size.width;
  const h = size.height;
  const n = values.length;
  const color = "var(--gu-accent)";

  const nums = values.filter((v): v is number => v !== null);
  const ready = w > 0 && h > 0 && n > 1 && nums.length >= 2;

  if (!ready) {
    return <div ref={ref} className={`dv-metric-trend ${className}`} aria-hidden="true" />;
  }

  const dataLo = Math.min(...nums);
  const dataHi = Math.max(...nums);
  const hasTarget = typeof target === "number" && Number.isFinite(target);
  let lo = dataLo;
  let hi = dataHi;
  if (hasTarget) {
    lo = Math.min(lo, target as number);
    hi = Math.max(hi, target as number);
  }
  const span = hi - lo;
  const padV = (span > 0 ? span : Math.max(1, Math.abs(hi) * 0.1)) * 0.22;

  const pad = marks ? { t: 15, r: 14, b: 22, l: 8 } : { t: 4, r: 6, b: 4, l: 6 };
  const iw = Math.max(0, w - pad.l - pad.r);
  const ih = Math.max(0, h - pad.t - pad.b);
  const yScale = scaleLinear().domain([lo - padV * 0.5, hi + padV]).range([ih, 0]);
  const x = (i: number) => (n > 1 ? pad.l + (iw * i) / (n - 1) : pad.l + iw / 2);
  const y = (v: number) => pad.t + yScale(v);

  const pts: Pt[] = values.map((v, i) => (v === null ? null : [x(i), y(v)]));
  const lineGen = d3line<Pt>()
    .defined((d) => d !== null)
    .x((d) => (d as [number, number])[0])
    .y((d) => (d as [number, number])[1])
    .curve(curveMonotoneX);
  const areaGen = d3area<Pt>()
    .defined((d) => d !== null)
    .x((d) => (d as [number, number])[0])
    .y1((d) => (d as [number, number])[1])
    .y0(pad.t + ih)
    .curve(curveMonotoneX);
  const linePath = lineGen(pts) || "";
  const areaPath = areaGen(pts) || "";

  let lastI = n - 1;
  while (lastI >= 0 && values[lastI] === null) lastI--;
  const lastV = lastI >= 0 ? (values[lastI] as number) : nums[nums.length - 1];
  const minI = values.indexOf(dataLo);
  const maxI = values.indexOf(dataHi);
  const endX = x(lastI >= 0 ? lastI : n - 1);
  const endY = y(lastV);
  const ty = hasTarget ? pad.t + yScale(target as number) : null;
  const showTarget = ty !== null && ty > pad.t - 3 && ty < pad.t + ih + 3;

  const pick = (e: PointerEvent<SVGRectElement>) => {
    if (n < 2) return;
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

  const anchorFor = (px: number) =>
    px < 46 ? ("start" as const) : px > w - 46 ? ("end" as const) : ("middle" as const);

  const hiBelow = y(dataHi) < pad.t + 18;
  const endBelow = endY < pad.t + 20;

  let tip: TipState | null = null;
  if (interactive && hoverI !== null) {
    const v = values[hoverI];
    if (typeof v === "number") {
      const lab = labels?.[hoverI];
      tip = {
        x: x(hoverI),
        y: y(v) - 12,
        title: lab || name,
        rows: [{ label: lab ? name : "Value", value: fmtUnit(v, unit) }],
      };
    }
  }

  const summary = `${name}: ${fmtNum(nums[0])} to ${fmtNum(nums[nums.length - 1])}`;
  const hoverV = hoverI !== null ? values[hoverI] : null;
  const focusI = hoverI ?? lastI;

  return (
    <div ref={ref} className={`dv-metric-trend ${className}`}>
      <svg
        width={w}
        height={h}
        className="dv-focusable"
        role={interactive ? "img" : undefined}
        aria-hidden={interactive ? undefined : true}
        aria-label={interactive ? `${summary}. Use arrow keys to step through points.` : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? onKey : undefined}
        onFocus={interactive ? () => setHoverI((prev) => prev ?? n - 1) : undefined}
        onBlur={interactive ? () => setHoverI(null) : undefined}
      >
        {showTarget && ty !== null && (
          <g aria-hidden="true">
            <motion.line
              className="dv-metric__target-line"
              x1={pad.l}
              x2={pad.l + iw}
              initial={m.reduce ? { y1: ty, y2: ty } : { y1: ty, y2: ty, opacity: 0 }}
              animate={{ y1: ty, y2: ty, opacity: 1 }}
              transition={{ y1: m.spring, y2: m.spring, opacity: m.fade }}
            />
            <motion.g
              initial={m.reduce ? false : { y: ty - 4, opacity: 0 }}
              animate={{ y: ty - 4, opacity: 1 }}
              transition={{ ...m.spring, opacity: m.fade }}
            >
              <text className="dv-metric__target-tag" textAnchor="end" x={pad.l + iw} y={0}>
                Target
              </text>
            </motion.g>
          </g>
        )}

        <motion.path
          fill={color}
          fillOpacity={0.16}
          initial={m.reduce ? { d: areaPath } : { d: areaPath, opacity: 0 }}
          animate={{ d: areaPath, opacity: 0.16 }}
          transition={{
            d: m.spring,
            opacity: m.reduce ? { duration: 0 } : { duration: 0.45, ease: EASE, delay: 0.55 },
          }}
        />
        <motion.path
          className="dv-line"
          stroke={color}
          strokeWidth={marks ? 1.8 : 1.6}
          initial={m.reduce ? { d: linePath } : { d: linePath, pathLength: 0 }}
          animate={{ d: linePath, pathLength: 1 }}
          transition={{ d: m.spring, pathLength: m.draw() }}
        />

        <motion.circle
          className="dv-dot"
          stroke={color}
          style={{ fill: color }}
          initial={m.reduce ? false : { cx: endX, cy: endY, r: 0 }}
          animate={{ cx: endX, cy: endY, r: marks ? 3 : 2 }}
          transition={{ ...m.spring, r: m.draw(4) }}
        />

        {marks && (
          <g className="dv-metric__labels" aria-hidden="true">
            {minI !== maxI && maxI !== lastI && (
              <motion.g
                initial={m.reduce ? false : { x: x(maxI), y: hiBelow ? y(dataHi) + 15 : y(dataHi) - 8, opacity: 0 }}
                animate={{ x: x(maxI), y: hiBelow ? y(dataHi) + 15 : y(dataHi) - 8, opacity: 1 }}
                transition={m.draw(3)}
              >
                <text
                  className="dv-tick"
                  textAnchor={anchorFor(x(maxI))}
                  x={anchorFor(x(maxI)) === "start" ? 4 : anchorFor(x(maxI)) === "end" ? -4 : 0}
                  y={0}
                >
                  {fmtNum(dataHi)}
                </text>
              </motion.g>
            )}
            {minI !== maxI && minI !== lastI && (
              <motion.g
                initial={m.reduce ? false : { x: x(minI), y: y(dataLo) + 15, opacity: 0 }}
                animate={{ x: x(minI), y: y(dataLo) + 15, opacity: 1 }}
                transition={m.draw(3)}
              >
                <text
                  className="dv-tick"
                  textAnchor={anchorFor(x(minI))}
                  x={anchorFor(x(minI)) === "start" ? 4 : anchorFor(x(minI)) === "end" ? -4 : 0}
                  y={0}
                >
                  {fmtNum(dataLo)}
                </text>
              </motion.g>
            )}
            <motion.g
              initial={m.reduce ? false : { x: endX - 8, y: endBelow ? endY + 16 : endY - 9, opacity: 0 }}
              animate={{ x: endX - 8, y: endBelow ? endY + 16 : endY - 9, opacity: 1 }}
              transition={m.draw(2)}
            >
              <text className="dv-val" textAnchor="end" x={0} y={0}>
                {fmtUnit(lastV, unit)}
              </text>
            </motion.g>
          </g>
        )}

        {interactive && (
          <>
            <motion.line
              className="dv-cross"
              y1={pad.t}
              y2={pad.t + ih}
              initial={false}
              animate={{
                x1: x(focusI),
                x2: x(focusI),
                opacity: hoverI === null ? 0 : 1,
              }}
              transition={m.snap}
            />
            {typeof hoverV === "number" && (
              <motion.circle
                className="dv-dot dv-dot--hover"
                r={4}
                fill={color}
                initial={false}
                animate={{ cx: x(hoverI as number), cy: y(hoverV), opacity: hoverI === null ? 0 : 1 }}
                transition={m.snap}
              />
            )}
            <rect
              className="dv-hit"
              x={pad.l}
              y={pad.t}
              width={iw}
              height={ih}
              fillOpacity={0}
              onPointerMove={pick}
              onPointerDown={pick}
              onPointerLeave={() => setHoverI(null)}
            />
          </>
        )}
      </svg>
      <Tip tip={tip} width={w} />
      {interactive && (
        <span className="dv-sr" aria-live="polite">
          {tip ? `${tip.title}: ${tip.rows.map((r) => `${r.label} ${r.value}`).join(", ")}` : ""}
        </span>
      )}
    </div>
  );
}

/* ── shared bits ── */

function targetProgress(d: IntelMetricData, valueNum: number | null) {
  const target = typeof d.target === "number" && Number.isFinite(d.target) ? d.target : null;
  if (target === null || target === 0 || valueNum === null) return null;
  const pct = (valueNum / target) * 100;
  return { pct, fill: Math.max(0, Math.min(100, pct)) };
}

function GoalMeter({ pct, fill, className }: { pct: number; fill: number; className?: string }) {
  return (
    <div className={className}>
      <div className="dv-metric__goal-track">
        <MeterFill className="dv-metric__goal-fill" width={`${fill}%`} />
      </div>
      <span className="dv-metric__goal-text">{Math.round(pct)}% dari target</span>
    </div>
  );
}

/* ── component ── */

export default function Metric({ data, state, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";

  if (state === "loading") {
    return (
      <div className="dv-metric dv-metric--state" data-variant={resolvedVariant} role="status" aria-label="Loading metric">
        <div className="intel-skeleton-line" style={{ width: "50%", height: 11 }} />
        <div className="intel-skeleton-line" style={{ width: "60%", height: 30, marginTop: 6 }} />
        <div className="intel-skeleton-block" style={{ height: 96, marginTop: 10 }} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="dv-metric dv-metric--state" data-variant={resolvedVariant} role="alert">
        <span className="dv-metric__label">Error</span>
        <span className="dv-metric__error">Failed to load metric</span>
      </div>
    );
  }

  const d = data as unknown as IntelMetricData;

  if (state === "empty" || (!d.value && d.value !== 0)) {
    return (
      <div className="dv-metric dv-metric--state" data-variant={resolvedVariant} role="status">
        <span className="dv-metric__label">{d.label || "Metric"}</span>
        <span className="dv-metric__error dv-metric__error--muted">No data</span>
      </div>
    );
  }

  const spark = cleanSpark(d.sparkline);
  const stats = metricSparkStats(spark);
  const valueNum = metricNumber(d.value);
  const goal = targetProgress(d, valueNum);
  const hasChart = spark !== null && spark.length > 1;
  const targetNum = typeof d.target === "number" && Number.isFinite(d.target) ? d.target : undefined;

  const ariaLabel = `${d.label}: ${d.prefix ?? ""}${d.value}${d.unit ?? ""}`;

  const labelEl = <span className="dv-metric__label">{d.label}</span>;
  const valueEl = (
    <span className="dv-metric__value">
      <MetricValue m={d} />
    </span>
  );
  const deltaEl = <MetricDeltaBadge m={d} stats={stats} />;
  const noteEl = d.note ? <span className="gu-pen dv-metric__note">{d.note}</span> : null;

  const factsRow = stats && (
    <div className="dv-metric__fact-row">
      <div className="dv-metric__fact">
        <span className="dv-metric__fact-label">Terendah</span>
        <span className="dv-metric__fact-value">
          <Num value={stats.lo} unit={d.unit} />
        </span>
      </div>
      <div className="dv-metric__fact">
        <span className="dv-metric__fact-label">Tertinggi</span>
        <span className="dv-metric__fact-value">
          <Num value={stats.hi} unit={d.unit} />
        </span>
      </div>
      <div className="dv-metric__fact">
        <span className="dv-metric__fact-label">Rata-rata</span>
        <span className="dv-metric__fact-value">
          <Num value={stats.avg} unit={d.unit} />
        </span>
      </div>
    </div>
  );

  if (resolvedVariant === "split") {
    const rightContent = hasChart ? (
      <div className="dv-metric__well">
        <MetricTrend
          values={spark}
          labels={d.sparkLabels}
          unit={d.unit}
          target={targetNum}
          name={d.label}
          className="dv-metric__well-chart"
        />
        <span className="dv-metric__range">
          {fmtNum(stats ? stats.lo : 0)}–{fmtNum(stats ? stats.hi : 0)}
          {d.unit ? ` ${d.unit}` : ""}
        </span>
      </div>
    ) : goal ? (
      <div className="dv-metric__well">
        <GoalMeter pct={goal.pct} fill={goal.fill} className="dv-metric__goal" />
      </div>
    ) : null;

    return (
      <motion.div
        className="dv-metric"
        data-variant="split"
        role="figure"
        aria-label={ariaLabel}
        variants={STAGGER_ITEM}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      >
        <div className={`dv-metric__split-grid${rightContent ? "" : " dv-metric__split-grid--single"}`}>
          <div className="dv-metric__split-left">
            {labelEl}
            {valueEl}
            {deltaEl}
            {noteEl}
          </div>
          {rightContent && <div className="dv-metric__split-right">{rightContent}</div>}
        </div>
      </motion.div>
    );
  }

  if (resolvedVariant === "editorial") {
    return (
      <motion.div
        className="dv-metric"
        data-variant="editorial"
        role="figure"
        aria-label={ariaLabel}
        variants={STAGGER_ITEM}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      >
        {noteEl}
        {labelEl}
        <div className="dv-metric__hero">
          <span className="dv-metric__value is-serif">
            <MetricValue m={d} />
          </span>
          {deltaEl}
        </div>
        {hasChart ? (
          <>
            <div className="dv-metric__chart-rule">
              <MetricTrend
                values={spark}
                labels={d.sparkLabels}
                unit={d.unit}
                target={targetNum}
                name={d.label}
                className="dv-metric__chart dv-metric__chart--editorial"
              />
            </div>
            <p className="dv-metric__sentence">
              <span className="dv-metric__sent-k">Terendah</span>{" "}
              <Num value={stats ? stats.lo : 0} unit={d.unit} /> ·{" "}
              <span className="dv-metric__sent-k">Tertinggi</span>{" "}
              <Num value={stats ? stats.hi : 0} unit={d.unit} /> ·{" "}
              <span className="dv-metric__sent-k">Rata-rata</span>{" "}
              <Num value={stats ? stats.avg : 0} unit={d.unit} />
            </p>
          </>
        ) : goal ? (
          <GoalMeter pct={goal.pct} fill={goal.fill} className="dv-metric__goal" />
        ) : null}
      </motion.div>
    );
  }

  if (resolvedVariant === "minimal") {
    return (
      <motion.div
        className="dv-metric"
        data-variant="minimal"
        role="figure"
        aria-label={ariaLabel}
        variants={STAGGER_ITEM}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
      >
        {labelEl}
        <span className="dv-metric__value is-compact">
          <MetricValue m={d} />
        </span>
        {deltaEl}
        {hasChart && (
          <MetricTrend
            values={spark}
            interactive={false}
            marks={false}
            name={d.label}
            className="dv-metric__mini-chart"
          />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="dv-metric"
      data-variant="default"
      role="figure"
      aria-label={ariaLabel}
      variants={STAGGER_ITEM}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <div className="dv-metric__head">
        {labelEl}
        <span className="dv-metric__head-side">
          {d.period ? <span className="dv-metric__period">{d.period}</span> : null}
          <span className="dv-metric__status" data-tone={d.status ?? "neutral"} aria-hidden="true" />
        </span>
      </div>
      <div className="dv-metric__hero">
        {valueEl}
        {deltaEl}
      </div>
      {hasChart ? (
        <>
          <MetricTrend
            values={spark}
            labels={d.sparkLabels}
            unit={d.unit}
            target={targetNum}
            name={d.label}
            className="dv-metric__chart"
          />
          <div className="dv-metric__facts">
            {factsRow}
            {noteEl}
          </div>
        </>
      ) : goal ? (
        <>
          <GoalMeter pct={goal.pct} fill={goal.fill} className="dv-metric__goal" />
          {noteEl}
        </>
      ) : (
        noteEl
      )}
    </motion.div>
  );
}
