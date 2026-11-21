"use client";

/**
 * IntelBarChart — ranked columns with direct value labels. The top bar is
 * flagged, every bar carries its rank, and clicking one pins its detail.
 * Multi-series data can switch between grouped and stacked.
 */

import { useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BarChart3, Crown, MousePointerClick } from "lucide-react";
import type { IntelBaseProps, IntelChartData } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { sumOf, toSeriesTable } from "./shared";
import { IntelChartVariantDeck } from "./ChartVariantDeck";
import { ColumnPlot } from "./ColumnPlot";
import { ChartHead, ChartState, Legend, Num, Segmented, fmtPct, fmtUnit, useDvMotion, useSeriesFocus } from "./kit";

type BarLayout = "grouped" | "stacked";

export default function IntelBarChart({ data: rawData, state, config, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const chartData = rawData as unknown as IntelChartData;
  const height = (config?.height as number) ?? 280;
  const [layout, setLayout] = useState<BarLayout>((config?.layout as BarLayout) ?? "grouped");
  const [pinned, setPinned] = useState<string | null>(null);
  const compact = resolvedVariant === "minimal";
  const m = useDvMotion();

  const table = useMemo(() => toSeriesTable(chartData), [chartData]);
  const keys = useMemo(() => table.series.map((s) => s.key), [table]);
  const focus = useSeriesFocus(keys);
  const visible = table.series.filter((s) => !focus.hidden.has(s.key));

  if (state === "loading") return <ChartState kind="loading" icon={BarChart3} height={height} />;
  if (state === "error") return <ChartState kind="error" icon={BarChart3} height={height} />;
  if (state === "empty" || !table.labels.length) return <ChartState kind="empty" icon={BarChart3} height={height} />;

  const unit = chartData.unit;
  const multi = table.series.length > 1;
  const catTotals = table.labels.map((_, i) => visible.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const total = catTotals.reduce((a, b) => a + b, 0);
  const order = catTotals.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const ranks = table.labels.map((_, i) => order.findIndex((o) => o.i === i) + 1);
  const top = order[0];
  const pinnedIndex = pinned === null ? -1 : table.labels.indexOf(pinned);
  const selected = pinnedIndex >= 0 ? pinnedIndex : null;
  const shown = selected ?? top.i;
  const share = total > 0 ? (catTotals[shown] / total) * 100 : 0;

  const categoryItems = order.map(({ v, i }) => ({
    key: table.labels[i],
    label: table.labels[i],
    color: visible[0]?.color ?? table.series[0].color,
    value: fmtUnit(v, unit),
    share: total > 0 ? (v / total) * 100 : 0,
  }));
  const seriesItems = table.series.map((s) => ({
    key: s.key,
    label: s.key,
    color: s.color,
    value: fmtUnit(sumOf(s.values), unit),
    note: "total",
  }));

  return (
    <div
      className="intel-chart dv-chart dv-chart--bar"
      data-variant={resolvedVariant}
      role="figure"
      aria-label={chartData.caption || "Bar chart"}
    >
      <ChartHead
        icon={BarChart3}
        title={chartData.caption}
        note={`${table.labels.length} ${chartData.xLabel?.toLowerCase() || "categories"} · ranked by ${multi ? "total" : (chartData.yLabel || visible[0]?.key || "value").toLowerCase()}`}
        right={
          multi ? (
            <Segmented
              label="Bar layout"
              value={layout}
              onChange={setLayout}
              options={[
                { value: "grouped", label: "Grouped" },
                { value: "stacked", label: "Stacked" },
              ]}
            />
          ) : undefined
        }
      />
      <IntelChartVariantDeck
        variant={resolvedVariant}
        data={rawData}
        unit={unit}
        caption={chartData.caption}
        headline={`${table.labels[top.i]} leads at ${fmtUnit(top.v, unit)}, ${fmtPct(total > 0 ? (top.v / total) * 100 : 0)} of ${fmtUnit(total, unit)}.`}
        stats={[
          { label: "Total", value: <Num value={total} unit={unit} /> },
          { label: `#1 · ${table.labels[top.i]}`, value: fmtUnit(top.v, unit), tone: "accent" },
          { label: "Average", value: fmtUnit(total / table.labels.length, unit) },
        ]}
        legend={(mode) =>
          multi && (mode === "chips" || mode === "inline") ? (
            <Legend
              items={seriesItems}
              layout={mode}
              label="Series"
              hidden={focus.hidden}
              hoverKey={focus.hoverKey}
              onHover={focus.setHoverKey}
              onToggle={focus.toggle}
            />
          ) : mode === "list" || mode === "table" ? (
            <Legend
              items={categoryItems}
              layout={mode}
              label="Ranking"
              hoverKey={pinned}
              onToggle={(key) => setPinned((prev) => (prev === key ? null : key))}
            />
          ) : null
        }
      >
        <ColumnPlot
          label={chartData.caption || "Bar chart"}
          categories={table.labels}
          series={visible.map((s) => ({ ...s, values: s.values.map((v) => v ?? 0) }))}
          mode={layout}
          height={compact ? Math.min(height, 170) : height}
          unit={unit}
          compact={compact}
          highlight={{ index: top.i, badge: "Top" }}
          ranks={ranks}
          totals
          hoverKey={focus.hoverKey}
          selected={selected}
          onSelect={(i) => setPinned((prev) => (prev === table.labels[i] ? null : table.labels[i]))}
          xTitle={chartData.xLabel}
          yTitle={chartData.yLabel}
        />
        {(resolvedVariant === "default" || resolvedVariant === "editorial") && (
          <div className="dv-detail" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={shown}
                className="dv-detail__row"
                initial={m.reduce ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={m.reduce ? { opacity: 0 } : { opacity: 0, y: -5 }}
                transition={m.fade}
              >
                {selected === null ? (
                  <Crown className="dv-glyph" size={14} strokeWidth={2.2} aria-hidden="true" />
                ) : (
                  <MousePointerClick className="dv-glyph" size={14} strokeWidth={2.2} aria-hidden="true" />
                )}
                <strong>{table.labels[shown]}</strong>
                <span>{fmtUnit(catTotals[shown], unit)}</span>
                <span>{fmtPct(share)} of total</span>
                <span>
                  rank {ranks[shown]} of {table.labels.length}
                </span>
                {selected === null && <em>Click a bar to pin it</em>}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </IntelChartVariantDeck>
    </div>
  );
}
