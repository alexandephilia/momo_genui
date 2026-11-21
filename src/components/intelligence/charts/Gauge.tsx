"use client";

/**
 * IntelGauge — segmented instrument dial. Ticks light up to the value, a
 * pointer rides the arc, the top band boundary is marked as the target and
 * a status word says where the value sits.
 */

import { useContext } from "react";
import { motion } from "motion/react";
import { CircleAlert, CircleCheck, Flag, Gauge as GaugeIcon, TriangleAlert } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { IntelChartVariantDeck } from "./ChartVariantDeck";
import { ChartState, Num, fmtSigned, fmtUnit, useDvMotion } from "./kit";

interface GaugeData {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  thresholds?: {
    good?: number;
    warning?: number;
    critical?: number;
  };
}

const TICKS = 45;
const CX = 130;
const CY = 128;
const R_IN = 84;
const R_OUT = 104;

const STATUS = {
  good: { word: "On target", color: "#ef8c66", icon: CircleCheck },
  watch: { word: "Below target", color: "#c9973b", icon: TriangleAlert },
  low: { word: "Low", color: "#9d9da6", icon: CircleAlert },
} as const;

export default function IntelGauge({ data: rawData, state, config, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const gaugeData = rawData as unknown as GaugeData;
  const height = (config?.height as number) ?? 200;
  const m = useDvMotion();

  if (state === "loading") return <ChartState kind="loading" icon={GaugeIcon} height={height} />;
  if (state === "error") return <ChartState kind="error" icon={GaugeIcon} height={height} label="Failed to load gauge data" />;
  if (state === "empty") return <ChartState kind="empty" icon={GaugeIcon} height={height} />;

  const value = gaugeData?.value ?? 0;
  const min = gaugeData?.min ?? 0;
  const max = gaugeData?.max ?? 100;
  const label = gaugeData?.label || "";
  const unit = gaugeData?.unit || "";
  const span = Math.max(max - min, 1);
  const toPct = (v: number) => Math.max(0, Math.min(1, (v - min) / span));
  const pct = toPct(value);

  // Band boundaries: explicit thresholds when given, otherwise the 40% / 75% bands this gauge has always coloured by.
  const target = gaugeData?.thresholds?.good ?? min + span * 0.75;
  const watch = gaugeData?.thresholds?.warning ?? min + span * 0.4;
  const band = value >= target ? "good" : value >= watch ? "watch" : "low";
  const status = STATUS[band];
  const StatusIcon = status.icon;
  const gap = value - target;
  const compact = resolvedVariant === "minimal";

  const tickAt = (i: number) => Math.PI - (i / (TICKS - 1)) * Math.PI;
  const polar = (r: number, a: number) => [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
  const bandColor = (p: number) =>
    p >= toPct(target) ? STATUS.good.color : p >= toPct(watch) ? STATUS.watch.color : STATUS.low.color;
  const targetAngle = Math.PI - toPct(target) * Math.PI;
  const [tx0, ty0] = polar(R_IN - 6, targetAngle);
  const [tx1, ty1] = polar(R_OUT + 6, targetAngle);
  const [tlx, tly] = polar(R_OUT + 17, targetAngle);

  return (
    <div
      className="intel-chart intel-gauge dv-chart dv-chart--gauge"
      data-variant={resolvedVariant}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={`${fmtUnit(value, unit)}, ${status.word}`}
      aria-label={label || "Gauge"}
    >
      <IntelChartVariantDeck
        variant={resolvedVariant}
        data={rawData}
        unit={unit}
        caption={label || "Gauge"}
        legend={null}
        headline={`${label || "Value"} is at ${fmtUnit(value, unit)}, ${gap >= 0 ? `${fmtUnit(gap, unit)} above` : `${fmtUnit(-gap, unit)} short of`} the ${fmtUnit(target, unit)} target.`}
        stats={[
          { label: "Value", value: <Num value={value} unit={unit} />, tone: "accent" },
          { label: "Target", value: fmtUnit(target, unit) },
          { label: "Range", value: `${fmtUnit(min)} – ${fmtUnit(max, unit)}` },
        ]}
      >
        <div className="dv-gauge" data-compact={compact || undefined}>
          <svg viewBox="0 0 260 150" role="presentation">
            {Array.from({ length: TICKS }, (_, i) => {
              const a = tickAt(i);
              const p = i / (TICKS - 1);
              const lit = p <= pct && pct > 0;
              const [x1, y1] = polar(R_IN, a);
              const [x2, y2] = polar(R_OUT, a);
              return (
                <g key={i}>
                  <line className="dv-gauge__tick" x1={x1} y1={y1} x2={x2} y2={y2} />
                  <motion.line
                    className="dv-gauge__tick dv-gauge__tick--lit"
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    style={{ stroke: bandColor(p) }}
                    initial={m.reduce ? false : { opacity: 0 }}
                    animate={{ opacity: lit ? 1 : 0 }}
                    transition={m.reduce ? m.fade : { duration: 0.2, delay: i * 0.016 }}
                  />
                </g>
              );
            })}

            <g aria-hidden="true">
              <line className="dv-gauge__target" x1={tx0} y1={ty0} x2={tx1} y2={ty1} />
              <text className="dv-flag" x={tlx} y={tly} textAnchor={toPct(target) > 0.55 ? "start" : toPct(target) < 0.45 ? "end" : "middle"}>
                {fmtUnit(target)}
              </text>
            </g>

            {/* The hidden circle centres the group's box on the dial pivot so rotate turns around it. */}
            <motion.g
              initial={m.reduce ? false : { rotate: 0 }}
              animate={{ rotate: pct * 180 }}
              transition={m.reduce ? m.spring : { type: "spring", stiffness: 60, damping: 14, delay: 0.1 }}
            >
              <circle cx={CX} cy={CY} r={R_IN - 6} fill="none" stroke="none" />
              <path
                className="dv-gauge__pointer"
                d={`M${CX - R_IN + 8} ${CY}L${CX - R_IN + 22} ${CY - 5}L${CX - R_IN + 22} ${CY + 5}Z`}
                fill={status.color}
              />
            </motion.g>

            <text className="dv-gauge__value" x={CX} y={CY - 24} textAnchor="middle">
              <Num as="tspan" value={value} />
              {unit && <tspan className="dv-gauge__unit"> {unit}</tspan>}
            </text>
            {label && (
              <text className="dv-gauge__label" x={CX} y={CY - 5} textAnchor="middle">
                {label}
              </text>
            )}
            <text className="dv-tick" x={CX - R_OUT + 10} y={CY + 16} textAnchor="middle">
              {fmtUnit(min)}
            </text>
            <text className="dv-tick" x={CX + R_OUT - 10} y={CY + 16} textAnchor="middle">
              {fmtUnit(max)}
            </text>
          </svg>

          <motion.div
            className="dv-gauge__status"
            key={band}
            initial={m.reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={m.reduce ? m.spring : { ...m.spring, delay: 0.5 }}
          >
            <StatusIcon size={15} strokeWidth={2.3} color={status.color} aria-hidden="true" />
            <strong style={{ color: status.color }}>{status.word}</strong>
            {!compact && (
              <span>
                <Flag size={12} strokeWidth={2.2} aria-hidden="true" /> target {fmtUnit(target, unit)} ·{" "}
                {fmtSigned(Number(gap.toFixed(2)), unit)}
              </span>
            )}
          </motion.div>
        </div>
      </IntelChartVariantDeck>
    </div>
  );
}
