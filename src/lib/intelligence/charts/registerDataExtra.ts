/**
 * Category 06 — Remaining 18 Data Intelligence UI Components
 */

import { registerIntelComponent } from "@/lib/intelligence/registry";
import { makeIntelSpec } from "@/lib/intelligence/specHelper";
import {
  StackedBarChart,
  HorizontalBarChart,
  IntelPieChart,
  ScatterPlot,
  BubbleChart,
  Heatmap,
  IntelTreemap,
  Histogram,
  BoxPlot,
  IntelRadarChart,
  FunnelChart,
  SankeyDiagram,
  WaterfallChart,
  PivotTable,
  OutlierHighlight,
  TrendAnalysis,
  DistributionAnalysis,
  ForecastChart,
  WeatherForecast,
} from "@/components/intelligence/charts/DataCatalogSuite";

export function registerDataExtra(): void {
  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "stacked_bar_chart",
      category: "data",
      description: "Stacked vertical bars showing composition across categories.",
      dataSchema: `{ title?: string; unit?: string; keys: string[]; data: Record<string, string|number>[] }`,
      promptSummary: "Stacked bar chart across categorical groups.",
      promptWhen: "Comparing category totals alongside internal component breakdown.",
    }),
    component: StackedBarChart,
    sampleData: {
      title: "Quarterly Cloud Spend by Tier",
      unit: "$k",
      keys: ["Compute", "Storage", "Network"],
      data: [
        { label: "Q1", Compute: 42, Storage: 18, Network: 11 },
        { label: "Q2", Compute: 48, Storage: 21, Network: 13 },
        { label: "Q3", Compute: 53, Storage: 24, Network: 16 },
        { label: "Q4", Compute: 61, Storage: 26, Network: 18 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "horizontal_bar_chart",
      category: "data",
      description: "Horizontal bar chart optimized for ranked comparisons and long labels.",
      dataSchema: `{ title?: string; unit?: string; items: { label: string; value: number }[] }`,
      promptSummary: "Horizontal ranked bar comparison.",
      promptWhen: "Ranking categories with long descriptive names.",
    }),
    component: HorizontalBarChart,
    sampleData: {
      title: "Top Latency Contributors (ms)",
      unit: "ms",
      items: [
        { label: "Vector Search", value: 185 },
        { label: "Image Hydration", value: 142 },
        { label: "Auth Token Check", value: 48 },
        { label: "Redis Lookup", value: 14 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "pie_chart",
      category: "data",
      description: "Proportional pie chart with segment labels and legend.",
      dataSchema: `{ title?: string; slices: { label: string; value: number }[] }`,
      promptSummary: "Proportional pie visualization.",
      promptWhen: "Illustrating parts of a 100% whole with 3-6 slices.",
    }),
    component: IntelPieChart,
    sampleData: {
      title: "Traffic Breakdown by Source",
      slices: [
        { label: "Organic Search", value: 44 },
        { label: "Direct", value: 26 },
        { label: "Referral", value: 18 },
        { label: "Social", value: 12 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "scatter_plot",
      category: "data",
      description: "Two-axis scatter plot inspecting correlation and clusters.",
      dataSchema: `{ title?: string; xLabel?: string; yLabel?: string; points: { x: number; y: number; name?: string }[] }`,
      promptSummary: "Scatter plot showing relationship between two numeric dimensions.",
      promptWhen: "Inspecting correlation, clusters, or dispersion across pairs of variables.",
    }),
    component: ScatterPlot,
    sampleData: {
      title: "Prompt Tokens vs Latency (ms)",
      xLabel: "Input Tokens",
      yLabel: "TTFT (ms)",
      seriesName: "Requests",
      points: [
        { x: 400, y: 210 },
        { x: 950, y: 290 },
        { x: 1800, y: 380 },
        { x: 3200, y: 520 },
        { x: 5400, y: 740 },
        { x: 8200, y: 1120 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "bubble_chart",
      category: "data",
      description: "Three-variable scatter chart encoding magnitude as bubble radius.",
      dataSchema: `{ title?: string; xLabel?: string; yLabel?: string; zLabel?: string; points: { x: number; y: number; z: number }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Bubble plot encoding 3 quantitative dimensions.",
      promptWhen: "Comparing items across X, Y, and a third magnitude dimension simultaneously.",
    }),
    component: BubbleChart,
    sampleData: {
      title: "Feature Value vs Effort vs Impact",
      xLabel: "Effort (Days)",
      yLabel: "User Impact (1-10)",
      zLabel: "Reach (k)",
      points: [
        { x: 2, y: 8.5, z: 45 },
        { x: 5, y: 9.2, z: 80 },
        { x: 8, y: 6.1, z: 30 },
        { x: 14, y: 9.0, z: 95 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "heatmap",
      category: "data",
      description: "2D color-intensity matrix across row and column dimensions.",
      dataSchema: `{ title?: string; rows: string[]; cols: string[]; values: number[][] }`,
      complexity: "high",
      promptSummary: "Intensity heatmap across two categorical dimensions.",
      promptWhen: "Visualizing hourly density, cohort retention, or error frequency grids.",
    }),
    component: Heatmap,
    sampleData: {
      title: "API Error Count by Day & Window",
      rows: ["Auth", "Search", "Checkout", "Media"],
      cols: ["00:00", "06:00", "12:00", "18:00"],
      values: [
        [2, 5, 14, 9],
        [4, 8, 22, 18],
        [1, 3, 41, 12],
        [6, 11, 16, 25],
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "treemap",
      category: "data",
      description: "Nested area rectangles visualizing proportional hierarchy.",
      dataSchema: `{ title?: string; items: { name: string; size: number }[] }`,
      promptSummary: "Proportional area treemap.",
      promptWhen: "Showing hierarchical disk/budget/bundle shares by relative area.",
    }),
    component: IntelTreemap,
    sampleData: {
      title: "Client JS Bundle Composition (KB)",
      items: [
        { name: "@xyflow/react", size: 148 },
        { name: "recharts", size: 132 },
        { name: "mermaid", size: 290 },
        { name: "lucide-react", size: 42 },
        { name: "motion", size: 68 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "histogram",
      category: "data",
      description: "Binned frequency distribution histogram.",
      dataSchema: `{ title?: string; unit?: string; bins: { range: string; count: number }[] }`,
      promptSummary: "Frequency histogram across numeric buckets.",
      promptWhen: "Showing latency distribution, age brackets, or score spread.",
    }),
    component: Histogram,
    sampleData: {
      title: "Response Latency Distribution",
      unit: "reqs",
      bins: [
        { range: "0-100ms", count: 420 },
        { range: "100-250ms", count: 680 },
        { range: "250-500ms", count: 310 },
        { range: "500-1s", count: 95 },
        { range: "1s+", count: 24 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "box_plot",
      category: "data",
      description: "Quartile box-and-whisker distribution per group (min, Q1, median, Q3, max).",
      dataSchema: `{ title?: string; groups: { label: string; min: number; q1: number; median: number; q3: number; max: number }[] }`,
      phase: "P3",
      promptSummary: "Statistical box plot showing spread and median across cohorts.",
      promptWhen: "Comparing statistical variance, median, and tails across groups.",
    }),
    component: BoxPlot,
    sampleData: {
      title: "Inference Latency by Model Tier (ms)",
      groups: [
        { label: "Flash Lite", min: 90, q1: 140, median: 185, q3: 240, max: 390 },
        { label: "Flash 2.5", min: 150, q1: 230, median: 310, q3: 410, max: 620 },
        { label: "Pro", min: 420, q1: 680, median: 920, q3: 1350, max: 2100 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "radar_chart",
      category: "data",
      description: "Multi-axis spider/radar chart comparing entities across 4-8 dimensions.",
      dataSchema: `{ title?: string; series: string[]; dimensions: Record<string, string|number>[] }`,
      promptSummary: "Radar plot for multi-dimensional profile comparisons.",
      promptWhen: "Comparing capabilities, architecture scores, or balanced scorecards.",
    }),
    component: IntelRadarChart,
    sampleData: {
      title: "Diagram Engine Capability Radar",
      series: ["XYFlow+ELK", "Mermaid"],
      dimensions: [
        { axis: "Interactivity", "XYFlow+ELK": 95, Mermaid: 25 },
        { axis: "Auto-Layout", "XYFlow+ELK": 90, Mermaid: 80 },
        { axis: "Custom Nodes", "XYFlow+ELK": 98, Mermaid: 30 },
        { axis: "Zoom & Pan", "XYFlow+ELK": 96, Mermaid: 35 },
        { axis: "DSL Brevity", "XYFlow+ELK": 60, Mermaid: 95 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "funnel_chart",
      category: "data",
      description: "Progressive conversion funnel with stage drop-off percentages.",
      dataSchema: `{ title?: string; stages: { label: string; value: number }[] }`,
      phase: "P3",
      promptSummary: "Conversion funnel with step-to-step retention rates.",
      promptWhen: "Tracking onboarding drop-off, sales pipelines, or request funnels.",
    }),
    component: FunnelChart,
    sampleData: {
      title: "User Activation Funnel",
      stages: [
        { label: "Visited Studio", value: 12400 },
        { label: "Selected Component", value: 8900 },
        { label: "Edited Controls", value: 5200 },
        { label: "Saved Preset", value: 2950 },
        { label: "Exported Config", value: 1840 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "sankey_diagram",
      category: "data",
      description: "Weighted flow diagram visualizing volume transfer from sources to targets.",
      dataSchema: `{ title?: string; nodes: { id: string }[]; links: { source: string; target: string; value: number }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Flow-volume visualization between origin and destination categories.",
      promptWhen: "Showing traffic routing, budget allocation flows, or user state transitions.",
    }),
    component: SankeyDiagram,
    sampleData: {
      title: "Traffic Source → Conversion Routing",
      nodes: [{ id: "Organic" }, { id: "Paid" }, { id: "Docs" }, { id: "Signup" }, { id: "Bounce" }],
      links: [
        { source: "Organic Search", target: "Interactive Docs", value: 4200 },
        { source: "Organic Search", target: "Signup Complete", value: 1600 },
        { source: "Paid Social", target: "Interactive Docs", value: 2100 },
        { source: "Paid Social", target: "Bounce", value: 1100 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "waterfall_chart",
      category: "data",
      description: "Cumulative bridge chart showing positive and negative deltas to final total.",
      dataSchema: `{ title?: string; unit?: string; steps: { label: string; delta: number; isTotal?: boolean }[] }`,
      promptSummary: "Waterfall bridge chart of incremental additions and subtractions.",
      promptWhen: "Explaining profit bridges, latency budgets, or net user growth.",
    }),
    component: WaterfallChart,
    sampleData: {
      title: "Monthly ARR Bridge ($k)",
      unit: "$k",
      steps: [
        { label: "Start ARR", delta: 420, isTotal: true },
        { label: "New Logos", delta: 95 },
        { label: "Expansion", delta: 48 },
        { label: "Contraction", delta: -18 },
        { label: "Churn", delta: -32 },
        { label: "End ARR", delta: 0, isTotal: true },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "pivot_table",
      category: "data",
      description: "Interactive 2D aggregation pivot table with Sum/Count switcher.",
      dataSchema: `{ title?: string; rowField: string; colField: string; valueField: string; records: Record<string, string|number>[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Cross-tabulation pivot table aggregating raw records dynamically.",
      promptWhen: "Summarizing multi-dimensional transactional records by two axes.",
    }),
    component: PivotTable,
    sampleData: {
      title: "Revenue by Region × Quarter ($k)",
      rowField: "region",
      colField: "quarter",
      valueField: "revenue",
      records: [
        { region: "APAC", quarter: "Q1", revenue: 120 },
        { region: "APAC", quarter: "Q2", revenue: 155 },
        { region: "EU", quarter: "Q1", revenue: 95 },
        { region: "EU", quarter: "Q2", revenue: 118 },
        { region: "US", quarter: "Q1", revenue: 210 },
        { region: "US", quarter: "Q2", revenue: 245 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "outlier_highlight",
      category: "data",
      description: "Highlights statistical outliers with z-scores and explanatory causes.",
      dataSchema: `{ title?: string; points: { label: string; value: string|number; zScore?: string; outlier?: boolean; reason?: string }[] }`,
      promptSummary: "Annotated dataset spotlighting statistical anomalies.",
      promptWhen: "Reporting anomalous spikes, extreme values, or telemetry outliers.",
    }),
    component: OutlierHighlight,
    sampleData: {
      title: "Token Spend Outliers",
      points: [
        { label: "Session #104", value: "2,100 tok", zScore: "+0.2" },
        { label: "Session #118", value: "19,450 tok", zScore: "+3.8", outlier: true, reason: "Uncompressed 14-turn JSON history attached" },
        { label: "Session #121", value: "2,850 tok", zScore: "+0.4" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "trend_analysis",
      category: "data",
      description: "Area series overlaid with trendline and written trajectory interpretation.",
      dataSchema: `{ title?: string; direction?: string; interpretation?: string; points: { label: string; value: number; trendline?: number }[] }`,
      promptSummary: "Time series paired with linear trend overlay and interpretation.",
      promptWhen: "Explaining long-term momentum vs short-term noise.",
    }),
    component: TrendAnalysis,
    sampleData: {
      title: "Daily Active Builders Trend",
      direction: "+24% MoM",
      tone: "good",
      interpretation: "Consistent upward trajectory following interactive playground launch.",
      points: [
        { label: "W1", value: 320, trendline: 310 },
        { label: "W2", value: 390, trendline: 365 },
        { label: "W3", value: 380, trendline: 420 },
        { label: "W4", value: 495, trendline: 475 },
        { label: "W5", value: 560, trendline: 530 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "distribution_analysis",
      category: "data",
      description: "Frequency histogram paired with summary statistics (mean, median, stdDev, skew).",
      dataSchema: `{ title?: string; summary: { mean?: string; median?: string; stdDev?: string; skew?: string }; buckets: { label: string; frequency: number }[] }`,
      promptSummary: "Statistical shape summary + distribution bars.",
      promptWhen: "Analyzing spread, skewness, and central tendency of a metric.",
    }),
    component: DistributionAnalysis,
    sampleData: {
      title: "Session Turn Count Distribution",
      summary: { mean: "6.4 turns", median: "5 turns", stdDev: "3.1", skew: "Right (+0.82)" },
      buckets: [
        { label: "1-2", frequency: 140 },
        { label: "3-5", frequency: 310 },
        { label: "6-10", frequency: 220 },
        { label: "11-20", frequency: 85 },
        { label: "20+", frequency: 22 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "forecast_chart",
      category: "data",
      description: "Historical actuals seamlessly transitioning into projected forecast + upper bound.",
      dataSchema: `{ title?: string; horizon?: string; points: { label: string; actual?: number; forecast?: number; upper?: number }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Forecast projection line with uncertainty envelope.",
      promptWhen: "Projecting future capacity, spend, or demand with confidence bounds.",
    }),
    component: ForecastChart,
    sampleData: {
      title: "90-Day Storage Growth Forecast (TB)",
      horizon: "Q1-Q2 Forecast",
      points: [
        { label: "Jan", actual: 14.2 },
        { label: "Feb", actual: 17.8 },
        { label: "Mar", actual: 21.5, forecast: 21.5, upper: 22.0 },
        { label: "Apr", forecast: 26.4, upper: 29.8 },
        { label: "May", forecast: 31.9, upper: 37.5 },
        { label: "Jun", forecast: 38.2, upper: 46.1 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "weather_forecast",
      category: "data",
      secondaryCategories: ["interactive"],
      description: "Current-conditions weather hero with a toggleable Day (day-part timeline + next hours) / Week (7-day range bars) forecast view.",
      dataSchema: `{ location?: string; subtitle?: string; current: { temp: number; unit?: string; cond?: string; icon?: string; hi?: number; lo?: number; feelsLike?: number; humidity?: number; windKph?: number; precipChance?: number; uvIndex?: number; updatedAt?: string }; hourly?: { time: string; temp: number; icon?: string; precipChance?: number }[]; daily?: { day: string; icon?: string; cond?: string; lo: number; hi: number; precipChance?: number }[] }`,
      complexity: "low",
      promptSummary: "Weather card: current conditions + hourly/daily toggle.",
      promptWhen: "Any weather question — today, this week, or a trip forecast for a place.",
    }),
    component: WeatherForecast,
    sampleData: {
      location: "Bandung",
      subtitle: "Updated 10:20 WIB",
      current: {
        temp: 24,
        unit: "C",
        cond: "Cerah berawan",
        icon: "sun-cloud",
        hi: 27,
        lo: 19,
        feelsLike: 25,
        humidity: 78,
        windKph: 9,
        precipChance: 35,
        uvIndex: 6,
      },
      hourly: [
        { time: "Now", temp: 24, icon: "sun-cloud", precipChance: 10 },
        { time: "11:00", temp: 25, icon: "sun", precipChance: 5 },
        { time: "12:00", temp: 26, icon: "sun", precipChance: 5 },
        { time: "13:00", temp: 27, icon: "cloud-sun", precipChance: 15 },
        { time: "14:00", temp: 27, icon: "cloud", precipChance: 30 },
        { time: "15:00", temp: 26, icon: "cloud", precipChance: 45 },
        { time: "16:00", temp: 25, icon: "drizzle", precipChance: 60 },
        { time: "17:00", temp: 24, icon: "rain", precipChance: 70 },
        { time: "18:00", temp: 23, icon: "rain", precipChance: 65 },
        { time: "19:00", temp: 22, icon: "cloud-moon", precipChance: 40 },
      ],
      daily: [
        { day: "Today", icon: "sun-cloud", lo: 19, hi: 27, precipChance: 35 },
        { day: "Sen", icon: "rain", lo: 18, hi: 25, precipChance: 75 },
        { day: "Sel", icon: "drizzle", lo: 18, hi: 26, precipChance: 55 },
        { day: "Rab", icon: "cloud", lo: 19, hi: 26, precipChance: 40 },
        { day: "Kam", icon: "sun-cloud", lo: 18, hi: 27, precipChance: 20 },
        { day: "Jum", icon: "sun", lo: 19, hi: 28, precipChance: 10 },
        { day: "Sab", icon: "storm", lo: 18, hi: 25, precipChance: 80 },
      ],
    },
  });
}
