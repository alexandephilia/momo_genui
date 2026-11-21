"use client";

/**
 * IntelLineChart — multi-series lines with a latest-value callout,
 * annotated peak / low on the lead series and a toggleable legend.
 */

import { useContext, useMemo } from "react";
import { motion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { IntelBaseProps, IntelChartData } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { toSeriesTable } from "./shared";
import { IntelChartVariantDeck } from "./ChartVariantDeck";
import { SeriesPlot, type PointNote } from "./SeriesPlot";
import { ChartHead, ChartState, Legend, Num, fmtUnit, markUnit, useDvMotion, useSeriesFocus } from "./kit";

export default function IntelLineChart({ data: rawData, state, config, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const chartData = rawData as unknown as IntelChartData;
  const height = (config?.height as number) ?? 280;
  const compact = resolvedVariant === "minimal";
  const m = useDvMotion();

  const table = useMemo(() => toSeriesTable(chartData), [chartData]);
  const keys = useMemo(() => table.series.map((s) => s.key), [table]);
  const focus = useSeriesFocus(keys);
  const visible = table.series.filter((s) => !focus.hidden.has(s.key));

  if (state === "loading") return <ChartState kind="loading" icon={TrendingUp} height={height} />;
  if (state === "error") return <ChartState kind="error" icon={TrendingUp} height={height} />;
  if (state === "empty" || !table.labels.length) return <ChartState kind="empty" icon={TrendingUp} height={height} />;

  const unit = chartData.unit;
  const lead = visible[0] ?? table.series[0];
  const points = lead.values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => typeof p.v === "number");
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const peak = points.reduce((best, p) => (p.v > best.v ? p : best), points[0]);
  const low = points.reduce((best, p) => (p.v < best.v ? p : best), points[0]);
  const delta = last && prev ? last.v - prev.v : 0;
  const deltaPct = prev && prev.v !== 0 ? (delta / Math.abs(prev.v)) * 100 : 0;
  const up = delta >= 0;
  const DeltaIcon = up ? TrendingUp : TrendingDown;

  const notes: PointNote[] =
    points.length >= 3 && peak.i !== low.i
      ? [
          { index: peak.i, key: lead.key, text: `Peak ${fmtUnit(peak.v, markUnit(unit))}`, place: "above" },
          ...(compact ? [] : [{ index: low.i, key: lead.key, text: `Low ${fmtUnit(low.v, markUnit(unit))}`, place: "below" as const }]),
        ]
      : [];

  const legendItems = table.series.map((s) => {
    const vals = s.values.filter((v): v is number => typeof v === "number");
    return {
      key: s.key,
      label: s.key,
      color: s.color,
      value: vals.length ? fmtUnit(vals[vals.length - 1], unit) : undefined,
      note: vals.length > 1 ? `from ${fmtUnit(vals[0], unit)}` : undefined,
    };
  });

  const deltaChip = prev && (
    <span className="dv-delta" data-dir={up ? "up" : "down"}>
      <DeltaIcon size={14} strokeWidth={2.4} aria-hidden="true" />
      <Num value={deltaPct} signed suffix="%" />
      <span className="dv-delta__ref">vs {table.labels[prev.i]}</span>
    </span>
  );

  return (
    <div
      className="intel-chart dv-chart dv-chart--line"
      data-variant={resolvedVariant}
      role="figure"
      aria-label={chartData.caption || "Line chart"}
    >
      <ChartHead icon={TrendingUp} title={chartData.caption} note={[chartData.yLabel, chartData.xLabel].filter(Boolean).join(" by ")} />
      <IntelChartVariantDeck
        variant={resolvedVariant}
        data={rawData}
        unit={unit}
        caption={chartData.caption}
        headline={
          last && prev
            ? `${lead.key} closed ${table.labels[last.i]} at ${fmtUnit(last.v, unit)}, ${up ? "up" : "down"} ${Math.abs(deltaPct).toFixed(1)}% on ${table.labels[prev.i]}.`
            : undefined
        }
        stats={
          last
            ? [
                { label: `Latest · ${table.labels[last.i]}`, value: <Num value={last.v} unit={unit} />, tone: "accent" },
                { label: `Peak · ${table.labels[peak.i]}`, value: fmtUnit(peak.v, unit) },
                { label: `Low · ${table.labels[low.i]}`, value: fmtUnit(low.v, unit) },
              ]
            : undefined
        }
        legend={
          table.series.length > 1 || resolvedVariant === "split"
            ? (layout) => (
                <Legend
                  items={legendItems}
                  layout={layout}
                  label="Series"
                  hidden={focus.hidden}
                  hoverKey={focus.hoverKey}
                  onHover={focus.setHoverKey}
                  onToggle={table.series.length > 1 ? focus.toggle : undefined}
                />
              )
            : null
        }
      >
        {resolvedVariant === "default" && last && (
          <motion.div
            className="dv-callout"
            initial={m.reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={m.spring}
          >
            <span className="dv-callout__label">
              <i style={{ background: lead.color }} />
              {lead.key} · {table.labels[last.i]}
            </span>
            <Num className="dv-callout__value" value={last.v} unit={markUnit(unit)} />
            {unit && !markUnit(unit) && <span className="dv-callout__unit">{unit}</span>}
            {deltaChip}
          </motion.div>
        )}
        <SeriesPlot
          label={chartData.caption || "Line chart"}
          labels={table.labels}
          series={visible.map((s) => ({ ...s, dots: !compact }))}
          height={compact ? Math.min(height, 150) : height}
          unit={unit}
          compact={compact}
          hoverKey={focus.hoverKey}
          notes={notes}
          xTitle={chartData.xLabel}
          yTitle={chartData.yLabel}
        />
      </IntelChartVariantDeck>
    </div>
  );
}
