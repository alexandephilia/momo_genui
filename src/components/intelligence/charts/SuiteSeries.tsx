"use client";

/** Time-series catalog charts: trend analysis and forecast. */

import { useContext, useMemo } from "react";
import { motion } from "motion/react";
import { ChartSpline, Quote, Telescope, TrendingDown, TrendingUp } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { CHART_COLORS } from "./shared";
import { IntelChartVariantDeck } from "./ChartVariantDeck";
import { SeriesPlot } from "./SeriesPlot";
import { IntelCardShell, IntelVariantContext, badgeClassForTone, s, a } from "../shared/IntelCardShell";
import { Legend, Num, fmtPct, fmtUnit, useDvMotion, useSeriesFocus } from "./kit";

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/* 16. TrendAnalysis — actuals against a dashed trendline with residual stems and a written read */
export function TrendAnalysis({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const points = a<Record<string, unknown>>(data.points);
  const unit = s(data.unit);
  const labels = points.map((p, i) => s(p.label, `P${i + 1}`));
  const values = points.map((p) => num(p.value));
  const trend = points.map((p) => num(p.trendline));
  const hasTrend = trend.some((v) => v !== null);
  const keys = useMemo(() => (hasTrend ? ["Actual", "Trend"] : ["Actual"]), [hasTrend]);
  const focus = useSeriesFocus(keys);

  const first = values.find((v): v is number => v !== null) ?? 0;
  const last = [...values].reverse().find((v): v is number => v !== null) ?? 0;
  const change = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const up = last >= first;
  const above = values.filter((v, i) => v !== null && trend[i] !== null && v >= (trend[i] as number)).length;
  const compared = values.filter((v, i) => v !== null && trend[i] !== null).length;
  const DirIcon = up ? TrendingUp : TrendingDown;
  const interpretation = s(data.interpretation);
  const showStems = hasTrend && !focus.hidden.has("Actual") && !focus.hidden.has("Trend");

  return (
    <IntelCardShell
      title={s(data.title, "Trend Analysis")}
      badge={s(data.direction, up ? "Upward" : "Downward")}
      badgeTone={badgeClassForTone(s(data.tone, "good"))}
      icon={<ChartSpline size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={points.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        headline={interpretation || `${labels[0]} ${fmtUnit(first, unit)} to ${labels[labels.length - 1]} ${fmtUnit(last, unit)}.`}
        stats={[
          { label: `Start · ${labels[0] ?? ""}`, value: fmtUnit(first, unit) },
          { label: `End · ${labels[labels.length - 1] ?? ""}`, value: <Num value={last} unit={unit} />, tone: "accent" },
          { label: "Change", value: `${change >= 0 ? "+" : "−"}${fmtPct(Math.abs(change))}` },
          ...(compared > 0 ? [{ label: "Above trend", value: `${above} of ${compared}` }] : []),
        ]}
        legend={(layout) => (
          <Legend
            layout={layout === "table" ? "list" : layout}
            label="Series"
            items={[
              { key: "Actual", label: "Actual", color: CHART_COLORS[0], value: fmtUnit(last, unit), note: "latest" },
              ...(hasTrend
                ? [{ key: "Trend", label: "Trendline", color: CHART_COLORS[2], note: `${above} of ${compared} points above` }]
                : []),
            ]}
            hidden={focus.hidden}
            hoverKey={focus.hoverKey}
            onHover={focus.setHoverKey}
            onToggle={hasTrend ? focus.toggle : undefined}
          />
        )}
      >
        {variant === "default" && (
          <motion.div
            className="dv-trendread"
            initial={m.reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={m.spring}
          >
            <span className="dv-delta" data-dir={up ? "up" : "down"}>
              <DirIcon size={16} strokeWidth={2.4} aria-hidden="true" />
              <Num value={Number(change.toFixed(1))} signed suffix="%" />
            </span>
            <span className="dv-trendread__span">
              {labels[0]} {fmtUnit(first, unit)} → {labels[labels.length - 1]} {fmtUnit(last, unit)}
            </span>
            {interpretation && (
              <p className="dv-quote">
                <Quote className="dv-glyph" size={13} strokeWidth={2.2} aria-hidden="true" />
                {interpretation}
              </p>
            )}
          </motion.div>
        )}
        <SeriesPlot
          label={s(data.title, "Trend analysis")}
          labels={labels}
          series={[
            ...(focus.hidden.has("Actual") ? [] : [{ key: "Actual", color: CHART_COLORS[0], values, area: true, dots: variant !== "minimal" }]),
            ...(hasTrend && !focus.hidden.has("Trend") ? [{ key: "Trend", color: CHART_COLORS[2], values: trend, dashed: true }] : []),
          ]}
          height={variant === "minimal" ? 140 : 230}
          unit={unit}
          compact={variant === "minimal"}
          hoverKey={focus.hoverKey}
          stems={showStems ? { from: "Actual", to: "Trend" } : null}
        />
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

/* 18. ForecastChart — actuals, then a dashed projection with its upper-bound band after a "now" marker */
export function ForecastChart({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const points = a<Record<string, unknown>>(data.points);
  const unit = s(data.unit);
  const labels = points.map((p, i) => s(p.label, `P${i + 1}`));
  const actual = points.map((p) => num(p.actual));
  const forecast = points.map((p) => num(p.forecast));
  const upper = points.map((p) => num(p.upper));
  const hasUpper = upper.some((v) => v !== null);
  const keys = useMemo(() => (hasUpper ? ["Actual", "Forecast", "Upper bound"] : ["Actual", "Forecast"]), [hasUpper]);
  const focus = useSeriesFocus(keys);

  let nowIndex = -1;
  actual.forEach((v, i) => {
    if (v !== null) nowIndex = i;
  });
  let endIndex = -1;
  forecast.forEach((v, i) => {
    if (v !== null) endIndex = i;
  });
  const nowValue = nowIndex >= 0 ? (actual[nowIndex] as number) : null;
  const endValue = endIndex >= 0 ? (forecast[endIndex] as number) : null;
  const endUpper = endIndex >= 0 ? upper[endIndex] : null;
  const growth = nowValue && endValue !== null ? ((endValue - nowValue) / Math.abs(nowValue)) * 100 : null;
  const show = (key: string) => !focus.hidden.has(key);

  return (
    <IntelCardShell
      title={s(data.title, "Forecast & Confidence Band")}
      badge={s(data.horizon, "Projection")}
      badgeTone="purple"
      icon={<Telescope size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={points.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        headline={
          nowValue !== null && endValue !== null && endIndex > nowIndex
            ? `From ${fmtUnit(nowValue, unit)} in ${labels[nowIndex]}, the forecast reaches ${fmtUnit(endValue, unit)} by ${labels[endIndex]}${growth !== null ? ` (${growth >= 0 ? "+" : "−"}${fmtPct(Math.abs(growth))})` : ""}${endUpper !== null ? `, with an upper bound of ${fmtUnit(endUpper, unit)}` : ""}.`
            : undefined
        }
        stats={[
          { label: `Now · ${labels[nowIndex] ?? "–"}`, value: nowValue !== null ? fmtUnit(nowValue, unit) : "–" },
          {
            label: `Projected · ${labels[endIndex] ?? "–"}`,
            value: endValue !== null ? <Num value={endValue} unit={unit} /> : "–",
            tone: "accent",
          },
          ...(endUpper !== null ? [{ label: "Upper bound", value: fmtUnit(endUpper, unit) }] : []),
        ]}
        legend={(layout) => (
          <Legend
            layout={layout === "table" ? "list" : layout}
            label="Series"
            items={[
              { key: "Actual", label: "Actual", color: CHART_COLORS[0], value: nowValue !== null ? fmtUnit(nowValue, unit) : undefined, note: labels[nowIndex] },
              { key: "Forecast", label: "Forecast", color: CHART_COLORS[4], value: endValue !== null ? fmtUnit(endValue, unit) : undefined, note: labels[endIndex] },
              ...(hasUpper
                ? [{ key: "Upper bound", label: "Upper bound", color: `color-mix(in srgb, ${CHART_COLORS[0]} 40%, transparent)`, value: endUpper !== null ? fmtUnit(endUpper, unit) : undefined }]
                : []),
            ]}
            hidden={focus.hidden}
            hoverKey={focus.hoverKey}
            onHover={focus.setHoverKey}
            onToggle={focus.toggle}
          />
        )}
      >
        <SeriesPlot
          label={s(data.title, "Forecast chart")}
          labels={labels}
          series={[
            ...(show("Forecast") ? [{ key: "Forecast", color: CHART_COLORS[4], values: forecast, dashed: true, width: 2 }] : []),
            ...(show("Actual") ? [{ key: "Actual", color: CHART_COLORS[0], values: actual, dots: variant !== "minimal", width: 2.6 }] : []),
          ]}
          height={variant === "minimal" ? 150 : 270}
          unit={unit}
          compact={variant === "minimal"}
          hoverKey={focus.hoverKey === "Upper bound" ? null : focus.hoverKey}
          envelope={
            hasUpper && show("Upper bound")
              ? { label: "Upper bound", color: CHART_COLORS[0], lower: forecast, upper }
              : null
          }
          now={
            nowIndex >= 0 && endIndex > nowIndex
              ? { index: nowIndex, label: "Now", before: "Actual", after: "Projected" }
              : null
          }
          notes={
            endValue !== null && show("Forecast") && variant !== "minimal"
              ? [{ index: endIndex, key: "Forecast", text: fmtUnit(endValue, unit), place: "below" }]
              : []
          }
        />
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}
