"use client";

/**
 * IntelSparkline — tiny inline trend line. The line draws in, the last
 * point is marked, and the latest value plus change since the first point
 * sits beside it (the `minimal` variant keeps only the line).
 */

import { useContext, useId } from "react";
import { motion } from "motion/react";
import { area as d3area, curveMonotoneX, line as d3line } from "d3";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { CHART_COLORS } from "./shared";
import { Num, fmtNum, useDvMotion } from "./kit";

interface SparklineData {
  values: number[];
  color?: string;
}

export default function IntelSparkline({ data: rawData, state, config, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const sparkData = rawData as unknown as SparklineData;
  const height = (config?.height as number) ?? 40;
  const width = (config?.width as number) ?? 120;
  const color = sparkData?.color || (config?.color as string) || CHART_COLORS[0];
  const gradId = `dv-spark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const m = useDvMotion();

  const values = Array.isArray(sparkData?.values)
    ? sparkData.values.filter((v) => typeof v === "number" && Number.isFinite(v))
    : [];

  if (state === "loading") {
    return (
      <div className="intel-sparkline-wrap intel-sparkline-wrap--loading" style={{ width, height }} role="status" aria-label="Loading trend">
        <motion.span
          className="dv-skel__line"
          animate={m.reduce ? { opacity: 0.6 } : { opacity: [0.35, 0.9, 0.35] }}
          transition={m.reduce ? { duration: 0 } : { duration: 1.5, repeat: Infinity }}
        />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-sparkline-wrap intel-sparkline-wrap--error" style={{ width, height }} role="alert" aria-label="Trend unavailable">
        <TrendingUp size={12} />
      </div>
    );
  }

  if (state === "empty" || !values.length) {
    return (
      <div className="intel-sparkline-wrap intel-sparkline-wrap--empty" style={{ width, height }}>
        <span className="intel-sparkline-wrap__dash">—</span>
      </div>
    );
  }

  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = 4;
  const x = (i: number) => (values.length > 1 ? pad + ((width - pad * 2) * i) / (values.length - 1) : width / 2);
  const y = (v: number) => (hi === lo ? height / 2 : pad + (height - pad * 2) * (1 - (v - lo) / (hi - lo)));
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number]);
  const linePath = d3line().curve(curveMonotoneX)(pts) || "";
  const areaPath = d3area().y0(height).curve(curveMonotoneX)(pts) || "";
  const first = values[0];
  const last = values[values.length - 1];
  const change = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const up = last >= first;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className="intel-sparkline-wrap dv-spark"
      data-variant={resolvedVariant}
      role="img"
      aria-label={`Sparkline trend: ${fmtNum(first)} to ${fmtNum(last)}, ${up ? "up" : "down"} ${Math.abs(change).toFixed(0)}%, low ${fmtNum(lo)}, high ${fmtNum(hi)}`}
    >
      <svg width={width} height={height} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <motion.path
          fill={`url(#${gradId})`}
          initial={m.reduce ? { d: areaPath } : { d: areaPath, opacity: 0 }}
          animate={{ d: areaPath, opacity: 1 }}
          transition={{ d: m.spring, opacity: m.draw(3) }}
        />
        <motion.path
          className="dv-line"
          stroke={color}
          strokeWidth={1.6}
          initial={m.reduce ? { d: linePath } : { d: linePath, pathLength: 0 }}
          animate={{ d: linePath, pathLength: 1 }}
          transition={{ d: m.spring, pathLength: m.draw() }}
        />
        <motion.circle
          fill={color}
          initial={m.reduce ? false : { cx: x(values.length - 1), cy: y(last), r: 0 }}
          animate={{ cx: x(values.length - 1), cy: y(last), r: 2.6 }}
          transition={{ ...m.spring, r: m.draw(5) }}
        />
      </svg>
      {resolvedVariant !== "minimal" && (
        <span className="dv-spark__meta" aria-hidden="true">
          <Num className="dv-spark__value" value={last} />
          <span className="dv-delta" data-dir={up ? "up" : "down"}>
            <Arrow size={12} strokeWidth={2.4} />
            <Num value={Number(change.toFixed(0))} signed suffix="%" />
          </span>
        </span>
      )}
    </div>
  );
}
