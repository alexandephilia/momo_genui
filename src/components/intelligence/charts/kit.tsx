"use client";

/**
 * Data-vis kit: sizing, formatting, motion presets and the small shared
 * pieces (legend, tooltip, count-up, header, states) every chart builds on.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type Transition,
} from "motion/react";
import type { LucideIcon } from "lucide-react";

/* ── motion presets ── */

export const EASE = [0.22, 1, 0.36, 1] as const;
const INSTANT: Transition = { duration: 0 };
const SPRING: Transition = { type: "spring", stiffness: 240, damping: 28, mass: 0.9 };
const SNAP: Transition = { type: "spring", stiffness: 520, damping: 36 };

export function useDvMotion() {
  const reduce = useReducedMotion() ?? false;
  return useMemo(
    () => ({
      reduce,
      spring: reduce ? INSTANT : SPRING,
      snap: reduce ? INSTANT : SNAP,
      fade: reduce ? INSTANT : ({ duration: 0.18 } as Transition),
      stagger: (i: number, step = 0.05): Transition =>
        reduce ? INSTANT : { ...SPRING, delay: i * step },
      draw: (i = 0): Transition =>
        reduce ? INSTANT : { duration: 0.9, ease: EASE, delay: 0.08 + i * 0.14 },
      tap: reduce ? undefined : { scale: 0.96 },
    }),
    [reduce],
  );
}

export type DvMotion = ReturnType<typeof useDvMotion>;

/* ── sizing ── */

export function useMeasure<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    setWidth(Math.round(node.clientWidth));
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/* ── formatting ── */

function decimalsOf(v: number): number {
  if (!Number.isFinite(v) || Number.isInteger(v)) return 0;
  const abs = Math.abs(v);
  return abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
}

export function fmtNum(v: number, digits = decimalsOf(v)): string {
  if (!Number.isFinite(v)) return "–";
  return v.toLocaleString("en-US", { maximumFractionDigits: digits });
}

/** "$12,400", "$420k", "185ms", "420 reqs", "73%" */
export function fmtUnit(v: number, unit?: string, digits?: number): string {
  const sign = v < 0 ? "−" : "";
  const body = fmtNum(Math.abs(v), digits ?? decimalsOf(v));
  if (!unit) return sign + body;
  const currency = /^([$€£¥]|Rp\s?)(.*)$/i.exec(unit);
  if (currency) return `${sign}${currency[1]}${body}${currency[2]}`;
  return `${sign}${body}${unit.length <= 2 ? "" : " "}${unit}`;
}

/** Units short enough to repeat on every mark; longer ones are stated once on the axis or legend. */
export function markUnit(unit?: string): string | undefined {
  return unit && unit.length <= 3 ? unit : undefined;
}

export function fmtSigned(v: number, unit?: string): string {
  return v > 0 ? `+${fmtUnit(v, unit)}` : fmtUnit(v, unit);
}

export function fmtPct(share: number): string {
  return `${share.toFixed(share >= 10 || share === 0 ? 0 : 1)}%`;
}

export function fmtTick(v: number): string {
  return Math.abs(v) >= 10000
    ? v.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })
    : fmtNum(v);
}

/** Stable React keys from labels: repeats get a positional suffix instead of colliding. */
export function uniqueKeys(labels: string[]): string[] {
  const seen = new Map<string, number>();
  return labels.map((label) => {
    const count = seen.get(label) ?? 0;
    seen.set(label, count + 1);
    return count === 0 ? label : `${label}#${count + 1}`;
  });
}

export function withUniqueKeys<T extends { key: string }>(items: T[]): T[] {
  const keys = uniqueKeys(items.map((it) => it.key));
  return items.map((it, i) => (keys[i] === it.key ? it : { ...it, key: keys[i] }));
}

export function clipLabel(label: string, maxChars: number): string {
  return label.length > maxChars ? `${label.slice(0, Math.max(1, maxChars - 1))}…` : label;
}

/* ── count-up number ── */

export function Num({
  value,
  unit,
  signed = false,
  suffix = "",
  as = "span",
  className,
}: {
  value: number;
  unit?: string;
  signed?: boolean;
  suffix?: string;
  as?: "span" | "tspan";
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const format = useCallback(
    (v: number, digits: number) =>
      (signed && v > 0 ? "+" : "") + fmtUnit(v, unit, digits) + suffix,
    [signed, unit, suffix],
  );
  const current = useRef(reduce ? value : 0);
  const text = useMotionValue(format(current.current, decimalsOf(value)));

  useEffect(() => {
    const digits = decimalsOf(value);
    if (reduce) {
      current.current = value;
      text.set(format(value, digits));
      return;
    }
    const controls = animate(current.current, value, {
      duration: 0.8,
      ease: EASE,
      onUpdate: (v) => {
        current.current = v;
        text.set(format(Number(v.toFixed(digits)), digits));
      },
    });
    return () => controls.stop();
  }, [value, format, reduce, text]);

  const Tag = as === "tspan" ? motion.tspan : motion.span;
  return <Tag className={className}>{text}</Tag>;
}

/* ── interactive mark helpers ── */

export function markProps(
  label: string,
  on: { enter: () => void; leave: () => void; activate?: () => void; pressed?: boolean },
) {
  const activate = on.activate;
  return {
    tabIndex: 0,
    role: activate ? "button" : "img",
    "aria-label": label,
    "aria-pressed": activate ? Boolean(on.pressed) : undefined,
    onPointerEnter: on.enter,
    onPointerLeave: on.leave,
    onFocus: on.enter,
    onBlur: on.leave,
    onClick: activate,
    onKeyDown: activate
      ? (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate();
          }
        }
      : undefined,
  } as const;
}

/** Legend visibility + hover state. Click toggles a key, shift/alt-click isolates it. */
export function useSeriesFocus(keys: string[]) {
  const [hiddenRaw, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const hidden = useMemo(() => {
    const live = new Set(keys.filter((k) => hiddenRaw.has(k)));
    return live.size >= keys.length ? new Set<string>() : live;
  }, [keys, hiddenRaw]);

  const toggle = useCallback(
    (key: string, isolate = false) => {
      setHidden((prev) => {
        const live = new Set(keys.filter((k) => prev.has(k)));
        if (isolate) {
          const alreadyIsolated = live.size === keys.length - 1 && !live.has(key);
          return alreadyIsolated ? new Set() : new Set(keys.filter((k) => k !== key));
        }
        if (live.has(key)) live.delete(key);
        else if (live.size < keys.length - 1) live.add(key);
        return live;
      });
    },
    [keys],
  );

  return { hidden, toggle, hoverKey, setHoverKey };
}

/* ── legend ── */

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  value?: string;
  share?: number;
  note?: string;
}

export type LegendLayout = "chips" | "list" | "table" | "inline";

export function Legend({
  items,
  layout = "chips",
  label = "Legend",
  hidden,
  hoverKey,
  onHover,
  onToggle,
}: {
  items: LegendItem[];
  layout?: LegendLayout;
  label?: string;
  hidden?: ReadonlySet<string>;
  hoverKey?: string | null;
  onHover?: (key: string | null) => void;
  onToggle?: (key: string, isolate: boolean) => void;
}) {
  const m = useDvMotion();
  if (!items.length) return null;
  const maxShare = Math.max(1, ...items.map((it) => it.share ?? 0));

  return (
    <div className="dv-legend" data-layout={layout} role="group" aria-label={label}>
      {items.map((it, i) => {
        const off = hidden?.has(it.key) ?? false;
        const dim = !off && hoverKey != null && hoverKey !== it.key;
        const body = (
          <>
            {layout === "table" && <span className="dv-legend__rank">{String(i + 1).padStart(2, "0")}</span>}
            <motion.span
              className="dv-legend__dot"
              style={{ background: it.color }}
              animate={{ scale: off ? 0.55 : hoverKey === it.key ? 1.35 : 1 }}
              transition={m.snap}
            />
            <span className="dv-legend__label">{it.label}</span>
            {it.note && <span className="dv-legend__note">{it.note}</span>}
            {layout === "table" && it.share != null && (
              <span className="dv-legend__track" aria-hidden="true">
                <motion.span
                  className="dv-legend__fill"
                  style={{ background: it.color }}
                  initial={m.reduce ? false : { width: 0 }}
                  animate={{ width: `${off ? 0 : (it.share / maxShare) * 100}%` }}
                  transition={m.stagger(i)}
                />
              </span>
            )}
            {it.value && <span className="dv-legend__value">{it.value}</span>}
            {it.share != null && <span className="dv-legend__share">{fmtPct(it.share)}</span>}
          </>
        );
        const shared = {
          className: "dv-legend__item",
          "data-off": off || undefined,
          layout: !m.reduce,
          initial: m.reduce ? false : { opacity: 0, y: 4 },
          animate: { opacity: off ? 0.42 : dim ? 0.55 : 1, y: 0 },
          transition: { ...m.stagger(i, 0.03), opacity: m.fade },
          onPointerEnter: () => onHover?.(it.key),
          onPointerLeave: () => onHover?.(null),
        } as const;

        return onToggle ? (
          <motion.button
            key={it.key}
            type="button"
            {...shared}
            aria-pressed={!off}
            title="Click to toggle · Shift-click to isolate"
            whileTap={m.tap}
            onFocus={() => onHover?.(it.key)}
            onBlur={() => onHover?.(null)}
            onClick={(e: MouseEvent) => onToggle(it.key, e.shiftKey || e.altKey)}
          >
            {body}
          </motion.button>
        ) : (
          <motion.div key={it.key} {...shared}>
            {body}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── tooltip ── */

export interface TipState {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: string; color?: string }[];
}

export function Tip({ tip, width }: { tip: TipState | null; width: number }) {
  const m = useDvMotion();
  const x = tip ? Math.max(76, Math.min(width - 76, tip.x)) : 0;
  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          className="dv-tip"
          aria-hidden="true"
          initial={{ opacity: 0, x, y: tip.y + 4 }}
          animate={{ opacity: 1, x, y: tip.y }}
          exit={{ opacity: 0 }}
          transition={m.snap}
        >
          <div className="dv-tip__card">
            <div className="dv-tip__title">{tip.title}</div>
            {tip.rows.map((row) => (
              <div key={row.label} className="dv-tip__row">
                {row.color && <span className="dv-legend__dot" style={{ background: row.color }} />}
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── header, segmented control, states ── */

export function ChartHead({
  icon: Icon,
  title,
  note,
  right,
}: {
  icon: LucideIcon;
  title?: string;
  note?: string;
  right?: ReactNode;
}) {
  if (!title && !right) return null;
  return (
    <div className="dv-head">
      <Icon className="dv-head__icon" size={15} strokeWidth={2.2} aria-hidden="true" />
      <div className="dv-head__text">
        {title && <span className="dv-head__title">{title}</span>}
        {note && <span className="dv-head__note">{note}</span>}
      </div>
      {right}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const m = useDvMotion();
  const id = useId();
  return (
    <div className="dv-seg" role="group" aria-label={label}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <motion.button
            key={opt.value}
            type="button"
            className="dv-seg__btn"
            data-active={active || undefined}
            aria-pressed={active}
            whileTap={m.tap}
            onClick={() => onChange(opt.value)}
          >
            {active && <motion.span layoutId={`dv-seg-${id}`} className="dv-seg__thumb" transition={m.snap} />}
            <span className="dv-seg__label">{opt.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function ChartState({
  kind,
  icon: Icon,
  height,
  label,
}: {
  kind: "loading" | "error" | "empty";
  icon: LucideIcon;
  height: number;
  label?: string;
}) {
  const m = useDvMotion();
  if (kind === "loading") {
    return (
      <div className="intel-chart intel-chart--loading" style={{ height }} role="status" aria-label="Loading chart">
        <div className="dv-skel">
          {[0.45, 0.8, 0.6, 1, 0.7].map((h, i) => (
            <motion.span
              key={i}
              className="dv-skel__bar"
              style={{ height: `${h * 100}%` }}
              animate={m.reduce ? { opacity: 0.6 } : { opacity: [0.35, 0.9, 0.35] }}
              transition={m.reduce ? { duration: 0 } : { duration: 1.5, repeat: Infinity, delay: i * 0.12 }}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`intel-chart intel-chart--${kind}`} style={{ height }} role={kind === "error" ? "alert" : "status"}>
      <Icon size={20} aria-hidden="true" />
      <span>{label ?? (kind === "error" ? "Failed to load chart data" : "No data available")}</span>
    </div>
  );
}

/* ── axes ── */

export function YAxis({
  ticks,
  y,
  x0,
  x1,
  format = fmtTick,
  labels = true,
}: {
  ticks: number[];
  y: (v: number) => number;
  x0: number;
  x1: number;
  format?: (v: number) => string;
  labels?: boolean;
}) {
  const m = useDvMotion();
  return (
    <g aria-hidden="true">
      {ticks.map((t) => (
        <motion.g
          key={t}
          initial={{ opacity: 0, y: y(t) }}
          animate={{ opacity: 1, y: y(t) }}
          transition={m.spring}
        >
          <line className="dv-grid" x1={x0} x2={x1} />
          {labels && (
            <text className="dv-tick" x={x0 - 8} dy="0.32em" textAnchor="end">
              {format(t)}
            </text>
          )}
        </motion.g>
      ))}
    </g>
  );
}

export function AxisTitles({
  x,
  y,
  left,
  top,
  iw,
  ih,
  height,
}: {
  x?: string;
  y?: string;
  left: number;
  top: number;
  iw: number;
  ih: number;
  height: number;
}) {
  return (
    <g aria-hidden="true">
      {x && (
        <text className="dv-axis-title" x={left + iw / 2} y={height - 3} textAnchor="middle">
          {x}
        </text>
      )}
      {y && (
        <text className="dv-axis-title" transform={`translate(11 ${top + ih / 2}) rotate(-90)`} textAnchor="middle">
          {y}
        </text>
      )}
    </g>
  );
}
