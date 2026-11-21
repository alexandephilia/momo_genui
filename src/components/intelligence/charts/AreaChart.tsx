"use client";

/**
 * IntelAreaChart — filled areas on a zero baseline with the lead series'
 * min–max range band and a low / high / average caption strip.
 */

import { useContext, useMemo } from "react";
import { motion } from "motion/react";
import { AreaChart as AreaChartIcon, ArrowDownToLine, ArrowUpToLine, Sigma } from "lucide-react";
import type { IntelBaseProps, IntelChartData } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { sumOf, toSeriesTable } from "./shared";
import { IntelChartVariantDeck } from "./ChartVariantDeck";
import { SeriesPlot } from "./SeriesPlot";
import { ChartHead, ChartState, Legend, Num, fmtUnit, markUnit, useDvMotion, useSeriesFocus } from "./kit";

export default function IntelAreaChart({ data: rawData, state, config, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const chartData = rawData as unknown as IntelChartData;
  const height = (config?.height as number) ?? 280;
  const stacked = (config?.stacked as boolean) ?? false;
  const compact = resolvedVariant === "minimal";
  const m = useDvMotion();

  const table = useMemo(() => toSeriesTable(chartData), [chartData]);
  const keys = useMemo(() => table.series.map((s) => s.key), [table]);
  const focus = useSeriesFocus(keys);
  const visible = table.series.filter((s) => !focus.hidden.has(s.key));

  if (state === "loading") return <ChartState kind="loading" icon={AreaChartIcon} height={height} />;
  if (state === "error") return <ChartState kind="error" icon={AreaChartIcon} height={height} />;
  if (state === "empty" || !table.labels.length) return <ChartState kind="empty" icon={AreaChartIcon} height={height} />;

  const unit = chartData.unit;
  const lead = visible[0] ?? table.series[0];
  const points = lead.values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => typeof p.v === "number");
  const lowPt = points.reduce((best, p) => (p.v < best.v ? p : best), points[0]);
  const highPt = points.reduce((best, p) => (p.v > best.v ? p : best), points[0]);
  const avg = points.length ? sumOf(lead.values) / points.length : 0;

  // Stacked mode draws cumulative tops, tallest layer first so lower layers stay visible.
  const plotted = stacked
    ? visible
        .map((s, si) => ({
          ...s,
          raw: s.values,
          values: s.values.map((_, i) => visible.slice(0, si + 1).reduce((sum, p) => sum + (p.values[i] ?? 0), 0)),
        }))
        .reverse()
    : visible;

  const strip = [
    { icon: ArrowDownToLine, label: `Low · ${table.labels[lowPt.i]}`, value: lowPt.v },
    { icon: ArrowUpToLine, label: `High · ${table.labels[highPt.i]}`, value: highPt.v },
    { icon: Sigma, label: "Average", value: avg },
  ];

  return (
    <div
      className="intel-chart dv-chart dv-chart--area"
      data-variant={resolvedVariant}
      role="figure"
      aria-label={chartData.caption || "Area chart"}
    >
      <ChartHead icon={AreaChartIcon} title={chartData.caption} note={stacked ? "Stacked" : undefined} />
      <IntelChartVariantDeck
        variant={resolvedVariant}
        data={rawData}
        unit={unit}
        caption={chartData.caption}
        headline={`${lead.key} ranged from ${fmtUnit(lowPt.v, unit)} in ${table.labels[lowPt.i]} to ${fmtUnit(highPt.v, unit)} in ${table.labels[highPt.i]}.`}
        stats={strip.map((st, i) => ({
          label: st.label,
          value: <Num value={st.value} unit={unit} />,
          tone: i === 1 ? ("accent" as const) : undefined,
        }))}
        legend={
          table.series.length > 1 || resolvedVariant === "split"
            ? (layout) => (
                <Legend
                  items={table.series.map((s) => ({
                    key: s.key,
                    label: s.key,
                    color: s.color,
                    value: fmtUnit(sumOf(s.values), unit),
                    note: "total",
                  }))}
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
        {resolvedVariant === "default" && (
          <div className="dv-rangestrip" role="group" aria-label={`${lead.key} range`}>
            {strip.map((st, i) => (
              <motion.div
                key={st.label}
                className="dv-rangestrip__cell"
                initial={m.reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={m.stagger(i, 0.07)}
              >
                <st.icon className="dv-glyph" size={14} strokeWidth={2.2} aria-hidden="true" />
                <span className="dv-rangestrip__label">{st.label}</span>
                <Num className="dv-rangestrip__value" value={st.value} unit={unit} />
              </motion.div>
            ))}
          </div>
        )}
        <SeriesPlot
          label={chartData.caption || "Area chart"}
          labels={table.labels}
          series={plotted.map((s) => ({ ...s, area: true }))}
          height={compact ? Math.min(height, 150) : height}
          unit={unit}
          compact={compact}
          hoverKey={focus.hoverKey}
          zeroBase
          range={
            stacked || compact
              ? null
              : {
                  min: lowPt.v,
                  max: highPt.v,
                  minLabel: `min ${fmtUnit(lowPt.v, markUnit(unit))}`,
                  maxLabel: `max ${fmtUnit(highPt.v, markUnit(unit))}`,
                  color: lead.color,
                }
          }
          xTitle={chartData.xLabel}
          yTitle={chartData.yLabel}
        />
      </IntelChartVariantDeck>
    </div>
  );
}
