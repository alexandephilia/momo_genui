"use client";

/**
 * Shared chart utilities — Momo coral + warm slate palette, dark tooltip, axis tokens
 */

import type { CSSProperties } from "react";

export const CHART_COLORS = [
  "#ef8c66",
  "#d97757",
  "#c9973b",
  "#9d9da6",
  "#6e717a",
  "#b86b50",
] as const;

export const TOOLTIP_STYLE: CSSProperties = {
  background: "var(--gu-raised, #1f1f24)",
  border: "1px solid var(--gu-line-2, rgba(128, 128, 140, 0.22))",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--gu-ink, #141416)",
  padding: "8px 12px",
  boxShadow: "var(--gu-chip-shadow, 0 8px 24px rgba(0, 0, 0, 0.2))",
};

export const AXIS_TICK_STYLE = {
  fill: "var(--gu-ink-3, #6b6b73)",
  fontSize: 11,
};

export const GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: "var(--gu-line, rgba(128, 128, 140, 0.18))",
} as const;

/**
 * Same hues as CHART_COLORS, reordered so neighbouring series alternate
 * warm / neutral and stay tellable apart in a legend.
 */
const SERIES_COLORS = ["#ef8c66", "#6e717a", "#c9973b", "#9d9da6", "#b86b50", "#d97757"] as const;

export function getColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

export interface SeriesTable {
  labels: string[];
  series: { key: string; color: string; values: (number | null)[] }[];
}

/** Aligns every series of an IntelChartData payload on one shared label axis. */
export function toSeriesTable(
  chart: { series?: { name: string; color?: string; data?: { label: string; value: number }[] }[] } | undefined,
): SeriesTable {
  const list = Array.isArray(chart?.series) ? chart.series : [];
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    for (const pt of s.data ?? []) {
      if (!seen.has(pt.label)) {
        seen.add(pt.label);
        labels.push(pt.label);
      }
    }
  }
  const used = new Set<string>();
  const series = list.map((s, i) => {
    const byLabel = new Map((s.data ?? []).map((pt) => [pt.label, pt.value]));
    let key = s.name || `Series ${i + 1}`;
    while (used.has(key)) key = `${key} (${i + 1})`;
    used.add(key);
    return {
      key,
      color: s.color || getColor(i),
      values: labels.map((l) => {
        const v = byLabel.get(l);
        return typeof v === "number" && Number.isFinite(v) ? v : null;
      }),
    };
  });
  return { labels, series };
}

export const sumOf = (values: (number | null)[]): number =>
  values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
