"use client";

/**
 * IntelDonutChart — ring with a live centre readout and a side legend that
 * lists value + share per slice. Legend items toggle slices in and out.
 */

import { useContext, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PieChart as PieChartIcon } from "lucide-react";
import type { IntelBaseProps, IntelChartData } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { getColor } from "./shared";
import { IntelChartVariantDeck } from "./ChartVariantDeck";
import { RingPlot } from "./RingPlot";
import { ChartHead, ChartState, Legend, Num, fmtPct, fmtUnit, markUnit, useDvMotion, useSeriesFocus } from "./kit";

export default function IntelDonutChart({ data: rawData, state, config, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const chartData = rawData as unknown as IntelChartData;
  const height = (config?.height as number) ?? 280;
  const compact = resolvedVariant === "minimal";
  const m = useDvMotion();

  const slices = useMemo(() => {
    const series = chartData?.series?.[0];
    const seen = new Set<string>();
    return (series?.data ?? []).map((d, i) => {
      let key = d.label || `Slice ${i + 1}`;
      while (seen.has(key)) key = `${key} (${i + 1})`;
      seen.add(key);
      return { key, label: d.label, value: Math.max(0, d.value), color: d.color || series?.color || getColor(i) };
    });
  }, [chartData]);
  const keys = useMemo(() => slices.map((s) => s.key), [slices]);
  const focus = useSeriesFocus(keys);

  if (state === "loading") return <ChartState kind="loading" icon={PieChartIcon} height={height} />;
  if (state === "error") return <ChartState kind="error" icon={PieChartIcon} height={height} />;
  if (state === "empty" || !slices.length) return <ChartState kind="empty" icon={PieChartIcon} height={height} />;

  const unit = chartData.unit;
  const visible = slices.filter((s) => !focus.hidden.has(s.key));
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  const largest = visible.reduce((best, s) => (s.value > best.value ? s : best), visible[0]);
  const active = visible.find((s) => s.key === focus.hoverKey) ?? null;
  const shareOf = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div
      className="intel-chart dv-chart dv-chart--donut"
      data-variant={resolvedVariant}
      role="figure"
      aria-label={chartData.caption || "Donut chart"}
    >
      <ChartHead
        icon={PieChartIcon}
        title={chartData.caption}
        note={`${visible.length} of ${slices.length} slices shown`}
      />
      <IntelChartVariantDeck
        variant={resolvedVariant}
        data={rawData}
        unit={unit}
        caption={chartData.caption}
        sideLegend
        headline={`${largest.label} holds ${fmtPct(shareOf(largest.value))} of ${fmtUnit(total, unit)}.`}
        stats={[
          { label: "Total", value: <Num value={total} unit={unit} /> },
          { label: "Largest", value: `${largest.label} · ${fmtPct(shareOf(largest.value))}`, tone: "accent" },
        ]}
        legend={(layout) => (
          <Legend
            items={slices.map((s) => ({
              key: s.key,
              label: s.label,
              color: s.color,
              value: fmtUnit(s.value, unit),
              share: focus.hidden.has(s.key) ? undefined : shareOf(s.value),
            }))}
            layout={layout}
            label="Slices"
            hidden={focus.hidden}
            hoverKey={focus.hoverKey}
            onHover={focus.setHoverKey}
            onToggle={focus.toggle}
          />
        )}
      >
        <RingPlot
          kind="donut"
          label={chartData.caption || "Donut chart"}
          slices={visible}
          height={compact ? Math.min(height, 170) : Math.min(height, 260)}
          unit={unit}
          hoverKey={focus.hoverKey}
          onHover={focus.setHoverKey}
          center={
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active?.key ?? "__total"}
                className="dv-ring__readout"
                initial={m.reduce ? false : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={m.fade}
              >
                {active ? (
                  <>
                    <strong>{fmtUnit(active.value, markUnit(unit))}</strong>
                    <span>{active.label}</span>
                    <em>{fmtPct(shareOf(active.value))}</em>
                  </>
                ) : (
                  <>
                    <Num className="dv-ring__total" value={total} unit={markUnit(unit)} />
                    <span>Total{unit && !markUnit(unit) ? ` · ${unit}` : ""}</span>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          }
        />
      </IntelChartVariantDeck>
    </div>
  );
}
