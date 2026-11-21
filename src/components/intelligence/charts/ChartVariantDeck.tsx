"use client";

import { useMemo, type ReactNode } from "react";
import { MotionConfig, motion } from "motion/react";
import { getColor } from "./shared";
import { Legend, fmtUnit, useDvMotion, type LegendItem, type LegendLayout } from "./kit";

export interface BreakdownItem {
  label: string;
  value: number;
  secondary?: string;
  color: string;
}

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback;
}

function asNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

export function extractBreakdownItems(rawData: Record<string, unknown>): BreakdownItem[] {
  const rawSeries = asArray(rawData.series);
  if (rawSeries.length === 1) {
    const pts = asArray(rawSeries[0]?.data);
    if (pts.length > 0) {
      return pts
        .map((pt, i) => ({
          label: asStr(pt.label, `Item ${i + 1}`),
          value: Math.abs(asNum(pt.value)),
          color: asStr(pt.color) || getColor(i),
        }))
        .filter((item) => item.value > 0 || pts.length <= 6);
    }
  }
  if (rawSeries.length > 1) {
    const out = rawSeries.map((ser, i) => {
      const pts = asArray(ser.data);
      const sum = pts.reduce((acc, pt) => acc + Math.abs(asNum(pt.value)), 0);
      const latest = pts.length > 0 ? asNum(pts[pts.length - 1]?.value) : 0;
      return {
        label: asStr(ser.name, `Series ${i + 1}`),
        value: sum,
        secondary: pts.length > 1 ? `${latest.toLocaleString()} last` : undefined,
        color: asStr(ser.color) || getColor(i),
      };
    });
    if (out.some((x) => x.value > 0)) return out;
  }

  const slices = asArray(rawData.slices);
  if (slices.length > 0) {
    return slices.map((sl, i) => ({
      label: asStr(sl.label || sl.name, `Slice ${i + 1}`),
      value: Math.abs(asNum(sl.value)),
      color: asStr(sl.color) || getColor(i),
    }));
  }

  const items = asArray(rawData.items);
  if (items.length > 0) {
    return items.map((it, i) => ({
      label: asStr(it.label || it.name, `Item ${i + 1}`),
      value: Math.abs(asNum(it.value ?? it.size)),
      color: asStr(it.color) || getColor(i),
    }));
  }

  const stages = asArray(rawData.stages);
  if (stages.length > 0) {
    return stages.map((st, i) => ({
      label: asStr(st.label, `Stage ${i + 1}`),
      value: Math.abs(asNum(st.value)),
      color: getColor(i),
    }));
  }

  const steps = asArray(rawData.steps);
  if (steps.length > 0) {
    return steps.map((st, i) => {
      const raw = asNum(st.delta ?? st.value);
      return {
        label: asStr(st.label, `Step ${i + 1}`),
        value: Math.abs(raw),
        secondary: st.isTotal ? "Total" : raw >= 0 ? `+${raw.toLocaleString()}` : `${raw.toLocaleString()}`,
        color: st.isTotal ? "#c9973b" : raw >= 0 ? "#ef8c66" : "#d97757",
      };
    });
  }

  const bins = asArray(rawData.bins).length > 0 ? asArray(rawData.bins) : asArray(rawData.buckets);
  if (bins.length > 0) {
    return bins.map((b, i) => ({
      label: asStr(b.range || b.label, `Bin ${i + 1}`),
      value: Math.abs(asNum(b.count ?? b.frequency ?? b.value)),
      color: getColor(i),
    }));
  }

  const stacked = asArray(rawData.data);
  if (stacked.length > 0) {
    const keys = Array.isArray(rawData.keys) ? (rawData.keys as string[]) : [];
    return stacked.map((row, i) => {
      const rowKeys = keys.length > 0
        ? keys
        : Object.keys(row).filter((k) => k !== "label" && k !== "name" && typeof row[k] === "number");
      const val = rowKeys.reduce((acc, k) => acc + Math.abs(asNum(row[k])), 0);
      return {
        label: asStr(row.label || row.name, `Group ${i + 1}`),
        value: val,
        color: getColor(i),
      };
    });
  }

  const points = asArray(rawData.points);
  if (points.length > 0) {
    return points.slice(0, 24).map((pt, i) => ({
      label: asStr(pt.label, `P${i + 1}`),
      value: Math.abs(asNum(pt.value ?? pt.actual ?? pt.y ?? pt.z)),
      color: getColor(i),
    }));
  }

  const dimensions = asArray(rawData.dimensions);
  if (dimensions.length > 0) {
    const serKeys = Array.isArray(rawData.series) ? (rawData.series as string[]) : [];
    const firstKey = serKeys[0];
    return dimensions.map((dim, i) => {
      const fallbackKey = Object.keys(dim).find((k) => k !== "axis" && typeof dim[k] === "number") || "";
      const key = firstKey || fallbackKey;
      return {
        label: asStr(dim.axis, `Axis ${i + 1}`),
        value: Math.abs(asNum(dim[key])),
        color: getColor(i),
      };
    });
  }

  if (typeof rawData.value === "number") {
    const val = Math.max(0, rawData.value - asNum(rawData.min, 0));
    const max = Math.max(asNum(rawData.max, 100) - asNum(rawData.min, 0), val);
    const rem = Math.max(0, max - val);
    return [
      { label: asStr(rawData.label, "Current"), value: val, color: "#ef8c66" },
      { label: "Remaining", value: rem, color: "#6e717a" },
    ];
  }

  return [];
}

export interface DeckStat {
  label: string;
  value: ReactNode;
  tone?: "accent";
}

function StatStrip({ stats }: { stats: DeckStat[] }) {
  const m = useDvMotion();
  return (
    <dl className="dv-stats">
      {stats.map((st, i) => (
        <motion.div
          key={st.label}
          className="dv-stat"
          data-tone={st.tone}
          initial={m.reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={m.stagger(i, 0.06)}
        >
          <dt>{st.label}</dt>
          <dd>{st.value}</dd>
        </motion.div>
      ))}
    </dl>
  );
}

/**
 * Variant frame shared by every chart. The chart owns its plot, annotations and
 * legend state; the deck only decides where headline, stats and legend sit:
 *   default   plot, legend chips below (or a side list with `sideLegend`)
 *   editorial serif headline, stat strip, plot, ranked legend table
 *   split     plot beside an inset well holding stats + legend list
 *   minimal   bare plot with an inline text legend
 * Charts that pass no `legend` get a read-only breakdown derived from the data.
 */
export function IntelChartVariantDeck({
  variant = "default",
  data,
  unit,
  caption,
  children,
  headline,
  stats,
  legend,
  sideLegend = false,
}: {
  variant?: string;
  data: Record<string, unknown>;
  unit?: string;
  caption?: string;
  children: ReactNode;
  headline?: ReactNode;
  stats?: DeckStat[];
  legend?: ((layout: LegendLayout) => ReactNode) | null;
  sideLegend?: boolean;
}) {
  const fallbackItems = useMemo<LegendItem[]>(() => {
    if (legend !== undefined || variant === "default") return [];
    const items = extractBreakdownItems(data).slice(0, 24);
    const total = items.reduce((sum, it) => sum + it.value, 0);
    if (total <= 0) return [];
    return items.map((it, i) => ({
      key: `${it.label}-${i}`,
      label: it.label,
      color: it.color,
      value: fmtUnit(it.value, unit),
      share: (it.value / total) * 100,
      note: it.secondary,
    }));
  }, [legend, variant, data, unit]);

  const renderLegend = (layout: LegendLayout) =>
    legend === undefined
      ? fallbackItems.length > 0 && <Legend items={fallbackItems} layout={layout} label={caption || "Breakdown"} />
      : legend?.(layout);

  let body: ReactNode;
  if (variant === "editorial") {
    body = (
      <div className="dv-deck" data-variant="editorial">
        {headline && <p className="dv-headline">{headline}</p>}
        {stats && stats.length > 0 && <StatStrip stats={stats} />}
        {children}
        {renderLegend("table")}
      </div>
    );
  } else if (variant === "split") {
    body = (
      <div className="dv-deck" data-variant="split">
        <div className="dv-deck__main">{children}</div>
        <aside className="dv-aside" aria-label={caption ? `${caption} summary` : "Summary"}>
          {stats && stats.length > 0 && <StatStrip stats={stats} />}
          {renderLegend("list")}
        </aside>
      </div>
    );
  } else if (variant === "minimal") {
    body = (
      <div className="dv-deck" data-variant="minimal">
        {children}
        {renderLegend("inline")}
      </div>
    );
  } else {
    body = (
      <div className="dv-deck" data-variant="default" data-side={sideLegend || undefined}>
        <div className="dv-deck__main">{children}</div>
        {renderLegend(sideLegend ? "list" : "chips")}
      </div>
    );
  }

  return <MotionConfig reducedMotion="user">{body}</MotionConfig>;
}
