/**
 * Intelligence UI — Chart Component Registration
 *
 * Registers all 6 Recharts-based chart components into the
 * Intelligence UI registry with full 13-point specs + sample data.
 */

import { registerIntelComponent } from "@/lib/intelligence/registry";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import type { ComponentType } from "react";

/* Lazy imports — the actual components live in src/components/intelligence/charts/ */
import IntelLineChart from "@/components/intelligence/charts/LineChart";
import IntelBarChart from "@/components/intelligence/charts/BarChart";
import IntelDonutChart from "@/components/intelligence/charts/DonutChart";
import IntelGauge from "@/components/intelligence/charts/Gauge";
import IntelSparkline from "@/components/intelligence/charts/Sparkline";
import IntelAreaChart from "@/components/intelligence/charts/AreaChart";

/* ═══════════════════ Shared spec fragments ═══════════════════ */

const chartResponsive = {
  compactBreakpoint: 400,
  mobile: "scroll" as const,
  tablet: "full" as const,
  minHeight: 200,
};

const chartSourceContract = {
  supportsCitations: false,
  requiresSources: false,
  distinguishesInference: false,
};

const chartInteractionBase = {
  hoverable: true,
  exportable: true,
  fullscreen: true,
};

/* ═══════════════════ Sample data ═══════════════════ */

const timeSeriesSample = {
  series: [
    {
      name: "Revenue",
      data: [
        { label: "Jan", value: 4200 },
        { label: "Feb", value: 4800 },
        { label: "Mar", value: 5100 },
        { label: "Apr", value: 4900 },
        { label: "May", value: 5600 },
        { label: "Jun", value: 6200 },
      ],
    },
    {
      name: "Expenses",
      data: [
        { label: "Jan", value: 3800 },
        { label: "Feb", value: 3600 },
        { label: "Mar", value: 4200 },
        { label: "Apr", value: 3900 },
        { label: "May", value: 4100 },
        { label: "Jun", value: 4400 },
      ],
    },
  ],
  xLabel: "Month",
  yLabel: "Amount",
  unit: "$",
  caption: "Monthly revenue vs expenses (H1 2024)",
};

const categoricalSample = {
  series: [
    {
      name: "Sales",
      data: [
        { label: "Electronics", value: 12400 },
        { label: "Clothing", value: 8900 },
        { label: "Home", value: 6700 },
        { label: "Sports", value: 5200 },
        { label: "Books", value: 3100 },
      ],
    },
  ],
  unit: "$",
  caption: "Sales by category",
};

const donutSample = {
  series: [
    {
      name: "Market Share",
      data: [
        { label: "Chrome", value: 65 },
        { label: "Safari", value: 18 },
        { label: "Firefox", value: 8 },
        { label: "Edge", value: 5 },
        { label: "Other", value: 4 },
      ],
    },
  ],
  caption: "Browser market share (%)",
};

const gaugeSample = {
  value: 73,
  min: 0,
  max: 100,
  label: "Performance Score",
  unit: "%",
};

const sparklineSample = {
  values: [12, 15, 13, 17, 14, 19, 22, 20, 25, 23, 28, 30],
};

/* ═══════════════════ Registration ═══════════════════ */

export function registerChartComponents(): void {
  /* 1. Line Chart */
  registerIntelComponent({
    spec: {
      componentId: "line_chart",
      category: "data",
      description:
        "Multi-series line chart for time-series or sequential data. Supports smooth curves, interactive tooltips, and optional area fills beneath lines.",
      dataSchema: `IntelChartData { series: IntelChartSeries[], xLabel?: string, yLabel?: string, unit?: string, caption?: string }`,
      propsSchema: `IntelBaseProps & { config?: { height?: number } }`,
      interactions: { ...chartInteractionBase, clickable: true },
      loadingState: "skeleton",
      emptyState: "Centered icon with 'No data available' message",
      errorState: "Centered error icon with failure description",
      responsive: chartResponsive,
      accessibility: {
        role: "img",
        keyboardNav: false,
        ariaLabel: "Line chart: {caption}",
        reducedMotion: true,
        highContrast: false,
      },
      sourceContract: chartSourceContract,
      renderReadiness: ["series array has at least one entry", "each series has at least one data point"],
      phase: "P1",
      complexity: "medium",
      replaces: "Chart (line type)",
      promptSummary: "Line chart for trends, time-series, or sequential data with multiple series support",
      promptWhen: "User asks to visualize trends over time, compare metrics across periods, or plot sequential data points",
      implemented: true,
    },
    component: IntelLineChart as ComponentType<IntelBaseProps>,
    sampleData: timeSeriesSample,
  });

  /* 2. Bar Chart */
  registerIntelComponent({
    spec: {
      componentId: "bar_chart",
      category: "data",
      description:
        "Grouped or stacked bar chart for categorical comparisons. Supports multiple series, layout switching, interactive tooltips, and responsive sizing.",
      dataSchema: `IntelChartData { series: IntelChartSeries[], xLabel?: string, yLabel?: string, unit?: string, caption?: string }`,
      propsSchema: `IntelBaseProps & { config?: { height?: number, layout?: "grouped" | "stacked" } }`,
      interactions: { ...chartInteractionBase, clickable: true, toggleable: true },
      loadingState: "skeleton",
      emptyState: "Centered icon with 'No data available' message",
      errorState: "Centered error icon with failure description",
      responsive: chartResponsive,
      accessibility: {
        role: "img",
        keyboardNav: false,
        ariaLabel: "Bar chart: {caption}",
        reducedMotion: true,
        highContrast: false,
      },
      sourceContract: chartSourceContract,
      renderReadiness: ["series array has at least one entry", "each series has at least one data point"],
      phase: "P1",
      complexity: "medium",
      replaces: "Chart (bar type)",
      promptSummary: "Bar chart for categorical comparisons with grouped/stacked modes",
      promptWhen: "User asks to compare values across categories, rank items, or show distribution by group",
      implemented: true,
    },
    component: IntelBarChart as ComponentType<IntelBaseProps>,
    sampleData: categoricalSample,
    sampleConfig: { layout: "grouped" },
  });

  /* 3. Donut Chart */
  registerIntelComponent({
    spec: {
      componentId: "donut_chart",
      category: "data",
      description:
        "Donut (ring) chart for proportional data with interactive segments, center total/detail label, and hover-activated legend. First series is rendered as pie segments.",
      dataSchema: `IntelChartData { series: [{ name: string, data: { label: string, value: number }[] }], caption?: string }`,
      propsSchema: `IntelBaseProps & { config?: { height?: number } }`,
      interactions: { ...chartInteractionBase, clickable: true, selectable: true },
      loadingState: "skeleton",
      emptyState: "Centered icon with 'No data available' message",
      errorState: "Centered error icon with failure description",
      responsive: chartResponsive,
      accessibility: {
        role: "img",
        keyboardNav: false,
        ariaLabel: "Donut chart: {caption}",
        reducedMotion: true,
        highContrast: false,
      },
      sourceContract: chartSourceContract,
      renderReadiness: ["first series has at least two data points"],
      phase: "P1",
      complexity: "medium",
      replaces: "Chart (donut type)",
      promptSummary: "Donut chart for proportional/percentage data with interactive segments and center label",
      promptWhen: "User asks to show proportions, percentages, market share, or composition breakdown",
      implemented: true,
    },
    component: IntelDonutChart as ComponentType<IntelBaseProps>,
    sampleData: donutSample,
  });

  /* 4. Gauge */
  registerIntelComponent({
    spec: {
      componentId: "gauge",
      category: "data",
      description:
        "Semi-circle gauge indicator with green→yellow→red gradient and animated needle. Shows a single metric value within a defined min/max range.",
      dataSchema: `{ value: number, min?: number, max?: number, label?: string, unit?: string }`,
      propsSchema: `IntelBaseProps & { config?: { height?: number } }`,
      interactions: { hoverable: true },
      loadingState: "skeleton",
      emptyState: "Centered icon with 'No data available' message",
      errorState: "Centered error icon with failure description",
      responsive: { ...chartResponsive, mobile: "adapt" as const },
      accessibility: {
        role: "meter",
        keyboardNav: false,
        ariaLabel: "Gauge: {label} at {value}{unit}",
        reducedMotion: true,
        highContrast: false,
      },
      sourceContract: chartSourceContract,
      renderReadiness: ["value is a finite number"],
      phase: "P1",
      complexity: "low",
      promptSummary: "Semi-circle gauge for single KPI/metric with color-coded threshold indicator",
      promptWhen: "User asks to show a single metric against a scale (CPU, score, health, progress, temperature)",
      implemented: true,
    },
    component: IntelGauge as ComponentType<IntelBaseProps>,
    sampleData: gaugeSample,
  });

  /* 5. Sparkline */
  registerIntelComponent({
    spec: {
      componentId: "sparkline",
      category: "data",
      description:
        "Tiny inline trend line (~40px tall) with no axes or labels. Designed for embedding in metric cards, tables, or inline text to convey trend direction at a glance.",
      dataSchema: `{ values: number[], color?: string }`,
      propsSchema: `IntelBaseProps & { config?: { height?: number, width?: number, color?: string } }`,
      interactions: {},
      loadingState: "shimmer",
      emptyState: "Dash character (—) placeholder",
      errorState: "Small error icon",
      responsive: { mobile: "adapt" as const, tablet: "full" as const },
      accessibility: {
        role: "img",
        keyboardNav: false,
        ariaLabel: "Sparkline trend indicator",
        reducedMotion: true,
        highContrast: false,
      },
      sourceContract: chartSourceContract,
      renderReadiness: ["values array has at least 2 entries"],
      phase: "P1",
      complexity: "low",
      promptSummary: "Tiny inline sparkline for embedding trend indicators in metrics or tables",
      promptWhen: "Metric card needs a trend indicator, or inline trend visualization within text or table cells",
      implemented: true,
    },
    component: IntelSparkline as ComponentType<IntelBaseProps>,
    sampleData: sparklineSample,
    sampleConfig: { height: 40, width: 120 },
  });

  /* 6. Area Chart */
  registerIntelComponent({
    spec: {
      componentId: "area_chart",
      category: "data",
      description:
        "Multi-series area chart with gradient fills beneath curves. Supports stacked or layered rendering, interactive tooltips, and responsive sizing.",
      dataSchema: `IntelChartData { series: IntelChartSeries[], xLabel?: string, yLabel?: string, unit?: string, caption?: string }`,
      propsSchema: `IntelBaseProps & { config?: { height?: number, stacked?: boolean } }`,
      interactions: { ...chartInteractionBase, clickable: true },
      loadingState: "skeleton",
      emptyState: "Centered icon with 'No data available' message",
      errorState: "Centered error icon with failure description",
      responsive: chartResponsive,
      accessibility: {
        role: "img",
        keyboardNav: false,
        ariaLabel: "Area chart: {caption}",
        reducedMotion: true,
        highContrast: false,
      },
      sourceContract: chartSourceContract,
      renderReadiness: ["series array has at least one entry", "each series has at least one data point"],
      phase: "P1",
      complexity: "medium",
      promptSummary: "Area chart with gradient fills for volume/cumulative data or stacked composition over time",
      promptWhen: "User asks to visualize volume over time, cumulative trends, or stacked composition that emphasizes magnitude",
      implemented: true,
    },
    component: IntelAreaChart as ComponentType<IntelBaseProps>,
    sampleData: timeSeriesSample,
    sampleConfig: { stacked: false },
  });
}
