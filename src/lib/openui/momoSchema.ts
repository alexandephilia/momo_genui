import { z } from "zod";
import {
  createLibrary,
  defineComponent,
  type ComponentGroup,
  type PromptOptions,
} from "@openuidev/lang-core";

/**
 * Shared OpenUI Lang component definitions (Zod schemas + semantic descriptions).
 * Kept free of React client hooks/DOM imports so both Next.js server routes
 * (/api/brain) and client renderers share the exact same single source of truth.
 */

interface MomoOpenUiComponentDef<
  T extends z.ZodObject<any> = z.ZodObject<any>,
> {
  name: string;
  props: T;
  description: string;
  group:
    | "layout"
    | "editorial"
    | "collections"
    | "charts"
    | "diagrams"
    | "interactive"
    | "media"
    | "intelligence";
}

const CardItemSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  tag: z.string().optional(),
  meta: z.string().optional(),
  note: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  imageQuery: z.string().optional(),
  prompt: z.string().optional(),
});

const BentoRowItemSchema = z.object({
  label: z.string(),
  value: z.string().optional(),
  sub: z.string().optional(),
  badge: z.string().optional(),
  tone: z.enum(["neutral", "accent", "success", "warning", "danger", "info"]).optional(),
  time: z.string().optional(),
  done: z.boolean().optional(),
});

const BentoSlotItemSchema = z.object({
  slot: z.string().optional(),
  title: z.string().optional(),
  label: z.string().optional(),
  name: z.string().optional(),
  meta: z.string().optional(),
  badge: z.string().optional(),
  tone: z.enum(["neutral", "accent", "success", "warning", "danger", "info"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  departTime: z.string().optional(),
  arriveTime: z.string().optional(),
  duration: z.string().optional(),
  vehicle: z.string().optional(),
  gate: z.string().optional(),
  seat: z.string().optional(),
  baggage: z.string().optional(),
  statValue: z.string().optional(),
  statUnit: z.string().optional(),
  summary: z.string().optional(),
  body: z.string().optional(),
  text: z.string().optional(),
  description: z.string().optional(),
  command: z.string().optional(),
  code: z.string().optional(),
  before: z.union([z.string(), z.array(z.string())]).optional(),
  after: z.union([z.string(), z.array(z.string())]).optional(),
  leftTitle: z.string().optional(),
  leftItems: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
  rightTitle: z.string().optional(),
  rightItems: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
  dos: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
  donts: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
  swatches: z
    .array(
      z.object({
        hex: z.string(),
        name: z.string().optional(),
        meta: z.string().optional(),
      }),
    )
    .optional(),
  rows: z.array(BentoRowItemSchema).optional(),
  facts: z.array(BentoRowItemSchema).optional(),
  items: z.array(z.union([z.string(), BentoRowItemSchema])).optional(),
  points: z.array(z.string()).optional(),
  footer: z.string().optional(),
  prompt: z.string().optional(),
});

const CatalogEntryChildSchema = z.object({
  title: z.string(),
  meta: z.string().optional(),
  duration: z.string().optional(),
  note: z.string().optional(),
  highlight: z.boolean().optional(),
});

const CatalogShelfItemSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  year: z.union([z.string(), z.number()]).optional(),
  kind: z.string().optional(),
  badge: z.string().optional(),
  image: z.string().optional(),
  imageQuery: z.string().optional(),
  summary: z.string().optional(),
  tracks: z.array(z.union([z.string(), CatalogEntryChildSchema])).optional(),
  entries: z.array(z.union([z.string(), CatalogEntryChildSchema])).optional(),
  prompt: z.string().optional(),
});

const AnnotatedSectionSchema = z.object({
  label: z.string().optional(),
  heading: z.string().optional(),
  text: z.union([z.string(), z.array(z.string())]),
  note: z.string().optional(),
  analysis: z.string().optional(),
  tag: z.string().optional(),
});

const RegionalEntrySchema = z.object({
  name: z.string(),
  badge: z.string().optional(),
  title: z.string().optional(),
  summary: z.string(),
  symbolLabel: z.string().optional(),
  symbolValue: z.string().optional(),
  focusLabel: z.string().optional(),
  focusValue: z.string().optional(),
});

const PlanItemSchema = z.object({
  time: z.string().optional(),
  title: z.string(),
  note: z.string().optional(),
});

const PlanDaySchema = z.object({
  label: z.string(),
  title: z.string().optional(),
  items: z.array(PlanItemSchema),
});

const StepItemSchema = z.object({
  title: z.string(),
  detail: z.string().optional(),
  meta: z.string().optional(),
});

const VersusMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const VersusSideSchema = z.object({
  label: z.string(),
  tagline: z.string().optional(),
  badge: z.string().optional(),
  metrics: z.array(VersusMetricSchema).optional(),
  points: z.array(z.string()),
  score: z.number().optional(),
  image: z.string().optional(),
  imageQuery: z.string().optional(),
});

const VersusDimensionSchema = z.object({
  axis: z.string(),
  a: z.number(),
  b: z.number(),
});

const StatItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  delta: z.string().optional(),
  trend: z.enum(["up", "down", "flat"]).optional(),
  note: z.string().optional(),
});

const ChartPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});

const PaletteColorSchema = z.object({
  hex: z.string(),
  name: z.string().optional(),
  role: z.string().optional(),
});

const FlowNodeSchema = z.object({
  label: z.string(),
  detail: z.string().optional(),
  kind: z.enum(["input", "process", "tool", "output"]).optional(),
});

const MapPinSchema = z.object({
  name: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  area: z.string().optional(),
  category: z.string().optional(),
  note: z.string().optional(),
  time: z.string().optional(),
  imageQuery: z.string().optional(),
  imageUrl: z.string().optional(),
  prompt: z.string().optional(),
});

const AdjusterControlSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.enum(["range", "stepper", "chips", "toggle"]),
  value: z.union([z.number(), z.string(), z.boolean()]),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  unit: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const AdjusterOutputSchema = z.object({
  label: z.string(),
  formula: z.string(),
  unit: z.string().optional(),
  prefix: z.string().optional(),
});

const ChoiceOptionSchema = z.object({
  label: z.string(),
  detail: z.string().optional(),
});

const ChecklistItemSchema = z.object({
  text: z.string(),
  done: z.boolean().optional(),
  note: z.string().optional(),
});

const MediaItemSchema = z.object({
  query: z.string().optional(),
  src: z.string().optional(),
  caption: z.string().optional(),
  sourceUrl: z.string().optional(),
  alt: z.string().optional(),
});

const MediaComparisonSideSchema = z.object({
  label: z.string(),
  query: z.string().optional(),
  src: z.string().optional(),
  caption: z.string().optional(),
  sourceUrl: z.string().optional(),
});

const DossierHighlightItemSchema = z.union([
  z.string(),
  z.object({
    text: z.string(),
    icon: z.string().optional(),
  }),
]);

const IntelDataObjectSchema = z.record(z.string(), z.unknown());

const TradeoffOptionItemSchema = z
  .object({
    name: z.string().describe("Option or approach name"),
    tag: z.string().optional().describe("Short badge or recommendation tag"),
    benefits: z.array(z.string()).describe("Concrete gains or advantages"),
    costs: z.array(z.string()).describe("Operational sacrifices, downsides, or hidden costs"),
  })
  .passthrough();

const RiskMatrixItemSchema = z
  .object({
    code: z.string().optional().describe("Short risk code e.g. R1"),
    title: z.string().describe("Risk title"),
    probability: z.number().describe("Likelihood 1-5"),
    impact: z.number().describe("Severity 1-5"),
    mitigation: z.string().optional().describe("Concrete mitigation step"),
  })
  .passthrough();

const NewsArticleItemSchema = z
  .object({
    headline: z.string().describe("Headline in your own words"),
    url: z.string().describe("Exact `url` of the web_search result this story came from"),
    summary: z.string().optional().describe("One or two sentences: what happened and why it matters"),
    outlet: z.string().optional().describe("Publisher name, e.g. Tempo, Kompas"),
    publishedAt: z.string().optional().describe("The result's publishedDate, or a relative time it states"),
    tag: z.string().optional().describe("Short topic label, e.g. Politik, Ekonomi"),
  })
  .passthrough();

const CostBenefitRowItemSchema = z
  .object({
    label: z.string().describe("Cost or benefit line item"),
    amount: z.number().describe("Numeric value"),
  })
  .passthrough();

const QuoteExtractionItemSchema = z
  .object({
    text: z.string().describe("Exact quote or excerpt"),
    speaker: z.string().optional().describe("Speaker or source author"),
    relevance: z.string().optional().describe("Contextual significance"),
  })
  .passthrough();

const FactCheckItemSchema = z
  .object({
    claim: z.string().describe("Claim or rumor being evaluated"),
    verdict: z.string().describe("verified | false | disputed | unverified"),
    explanation: z.string().describe("Evidence-backed verification explanation"),
  })
  .passthrough();

const GraphNodeItemSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    type: z.string().optional(),
    detail: z.string().optional(),
  })
  .passthrough();

const GraphEdgeItemSchema = z
  .object({
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
  })
  .passthrough();

const DocumentDiffHunkItemSchema = z
  .object({
    section: z.string().optional(),
    before: z.string(),
    after: z.string(),
  })
  .passthrough();

const TransitOptionItemSchema = z
  .object({
    mode: z.string().describe("Transport mode e.g. MRT + Jalan Kaki, GoCar"),
    normalTime: z.string().describe("Normal duration e.g. 25 mnt"),
    peakTime: z.string().optional().describe("Peak/event rush duration e.g. 55 mnt"),
    costSolo: z.string().optional().describe("Per-person cost e.g. Rp 14.000"),
    costGroup: z.string().optional().describe("Couple/group cost e.g. Rp 28.000"),
    note: z.string().optional().describe("Tactical drop-off or gate tip"),
    tag: z.string().optional().describe("Short badge e.g. Tercepat, Hemat"),
  })
  .passthrough();

const RecipeIngredientItemSchema = z
  .object({
    name: z.string(),
    amount: z.union([z.number(), z.string()]),
    unit: z.string().optional(),
    note: z.string().optional(),
  })
  .passthrough();

const FlashcardItemSchema = z
  .object({
    term: z.string(),
    root: z.string().optional().describe("Etymology or literal root meaning"),
    summary: z.string().describe("Plain-English intuition"),
    analogy: z.string().optional().describe("Concrete everyday analogy"),
    checkQuestion: z.string().optional(),
    checkAnswer: z.string().optional(),
  })
  .passthrough();

const TimelineEventItemSchema = z
  .object({
    time: z.string().optional(),
    title: z.string(),
    detail: z.string().optional(),
  })
  .passthrough();

const GanttTaskItemSchema = z
  .object({
    title: z.string(),
    start: z.string().optional(),
    end: z.string().optional(),
    owner: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

const KanbanColumnItemSchema = z
  .object({
    title: z.string(),
    items: z.array(
      z.union([
        z.string(),
        z
          .object({
            title: z.string(),
            description: z.string().optional(),
            owner: z.string().optional(),
            priority: z.string().optional(),
          })
          .passthrough(),
      ]),
    ),
  })
  .passthrough();

const ScorecardItemSchema = z
  .object({
    criterion: z.string(),
    score: z.union([z.string(), z.number()]),
    weight: z.string().optional(),
    note: z.string().optional(),
  })
  .passthrough();

/* Intel suite — full chat coverage: chat names for every registered Intelligence
 * component. Static lists only — the intel registry lives in React land and must
 * never be imported here. */
const INTEL_EVIDENCE_COMPONENTS: string[] = [
  "SourceCard",
  "SourceList",
  "SearchResults",
  "EvidenceMatrix",
  "EvidenceCollection",
  "SourcePreview",
  "SourceComparison",
  "SourceTimeline",
  "SourceReliability",
  "Citation",
  "ReferenceList",
  "DocumentViewer",
  "ArticleReader",
  "ResearchBrief",
  "EvidenceTimeline",
  "SourceInspector",
];

const INTEL_INVESTIGATION_COMPONENTS: string[] = [
  "AlertFeed",
  "IncidentTimeline",
  "IncidentMap",
  "EventCorrelationMap",
  "EntityTracking",
  "AnomalyDetectionPanel",
  "ThreatAssessment",
  "SignalMonitor",
  "EventStream",
  "InvestigationBoard",
  "CaseTimeline",
  "IndicatorPanel",
  "PatternDetection",
  "ChangeDetection",
  "CorrelationTimeline",
  "GeographicHeatmap",
  "Watchlist",
  "IncidentRelationshipGraph",
];

const INTEL_CHART_COMPONENTS: string[] = [
  "Metric",
  "MetricGroup",
  "DonutChart",
  "Sparkline",
  "StackedBarChart",
  "HorizontalBarChart",
  "ScatterPlot",
  "BubbleChart",
  "Heatmap",
  "Treemap",
  "Histogram",
  "BoxPlot",
  "FunnelChart",
  "SankeyDiagram",
  "WaterfallChart",
  "PivotTable",
  "OutlierHighlight",
  "TrendAnalysis",
  "DistributionAnalysis",
  "ForecastChart",
];

const INTEL_GRAPH_COMPONENTS: string[] = [
  "ReasoningTree",
  "KnowledgeGraph",
  "ProcessFlow",
  "WorkflowGraph",
  "SystemArchitecture",
  "ServiceMap",
  "ComponentDependencyMap",
  "ApiFlowDiagram",
  "DataFlowDiagram",
  "InfrastructureMap",
  "DatabaseSchemaMap",
  "EventFlowDiagram",
  "IntegrationMap",
  "PermissionMap",
  "SecurityBoundaryMap",
  "AttackSurfaceMap",
  "SequenceFlow",
  "ErrorPropagationGraph",
  "CodeDependencyGraph",
  "DeploymentTopology",
  "RuntimeInspector",
  "PerformanceBreakdown",
  "HypothesisTree",
  "ConceptMap",
  "DependencyGraph",
  "SystemDiagram",
  "CausalGraph",
  "InfluenceDiagram",
  "NetworkGraph",
  "EntityRelationshipMap",
  "ArgumentMap",
  "SequenceDiagram",
  "StateMachine",
  "RootCauseTree",
  "FiveWhys",
  "FishboneDiagram",
  "FaultTree",
  "ScenarioTree",
];

const INTEL_ANALYSIS_COMPONENTS: string[] = [
  "ComparisonMatrix",
  "ProsCons",
  "InsightPanel",
  "RecommendationPanel",
  "ExplanationPanel",
  "ConfidenceIndicator",
  "ReasoningSummary",
  "HypothesisPanel",
  "ContradictionPanel",
  "AnomalyHighlight",
  "UncertaintyMap",
  "AssumptionPanel",
  "LimitationPanel",
  "InsightComparison",
  "FindingDetail",
  "DecisionMatrix",
  "ScenarioComparison",
  "UncertaintyMatrix",
  "SensitivityAnalysis",
  "CorrelationMatrix",
  "PriorityMatrix",
  "AllocationChart",
  "ScenarioPlanner",
  "ImpactAnalysis",
  "OptionEvaluation",
  "RiskRegister",
  "DecisionRecord",
];

const INTEL_INTERACTIVE_COMPONENTS: string[] = [
  "InteractiveFilter",
  "ParameterExplorer",
  "WhatIfSimulator",
  "ScenarioControls",
  "GraphExplorer",
  "EvidenceFilter",
  "TimelineExplorer",
  "DataDrilldown",
  "ComparisonSelector",
  "ConfidenceExplorer",
  "HypothesisSelector",
  "AssumptionEditor",
  "InteractiveMatrix",
  "MapLayerControls",
  "QueryBuilder",
  "InvestigationControls",
  "IntelligenceDashboard",
  "ResearchWorkspace",
  "InvestigationWorkspace",
  "AnalysisWorkspace",
  "DecisionWorkspace",
  "SystemInspectionWorkspace",
  "IncidentResponseWorkspace",
  "KnowledgeExplorationWorkspace",
  "ScenarioAnalysisWorkspace",
  "DataExplorationWorkspace",
  "EvidenceReviewWorkspace",
  "ArchitectureReviewWorkspace",
];

export const INTEL_CHAT_COMPONENTS: string[] = [
  ...INTEL_EVIDENCE_COMPONENTS,
  ...INTEL_INVESTIGATION_COMPONENTS,
  ...INTEL_CHART_COMPONENTS,
  ...INTEL_GRAPH_COMPONENTS,
  ...INTEL_ANALYSIS_COMPONENTS,
  ...INTEL_INTERACTIVE_COMPONENTS,
];

/** nodes/edges contract shared by every registered XYFlow intel graph. */
const IntelGraphPropsSchema = z.object({
  title: z.string().optional(),
  nodes: z.array(GraphNodeItemSchema),
  edges: z.array(GraphEdgeItemSchema),
});

/** All 12 workspace compositions share one registered superset dataSchema. */
const IntelWorkspacePropsSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  metrics: z.array(IntelDataObjectSchema).optional(),
  nodes: z.array(GraphNodeItemSchema).optional(),
  edges: z.array(GraphEdgeItemSchema).optional(),
  series: z.array(IntelDataObjectSchema).optional(),
  findings: z.array(IntelDataObjectSchema).optional(),
  alerts: z.array(IntelDataObjectSchema).optional(),
  sources: z.array(IntelDataObjectSchema).optional(),
  question: z.string().optional(),
  recommendation: z.string().optional(),
  options: z.array(IntelDataObjectSchema).optional(),
  nextSteps: z.array(z.string()).optional(),
});

export const MOMO_LEAF_COMPONENT_DEFS: MomoOpenUiComponentDef[] = [
  {
    name: "Headline",
    group: "editorial",
    description:
      "Big editorial title for opening a substantial multi-part answer. Never use for short replies or twice in a row.",
    props: z.object({
      title: z.string(),
      kicker: z.string().optional(),
      subtitle: z.string().optional(),
      align: z.enum(["left", "center"]).optional(),
      image: z.string().optional(),
      imageQuery: z.string().optional(),
      variant: z.enum(["default", "split"]).optional(),
    }),
  },
  {
    name: "Callout",
    group: "editorial",
    description:
      "Highlighted callout or pull-quote for root-cause diagnosis, key rules, cautions, or core takeaways.",
    props: z.object({
      text: z.string(),
      tone: z.enum(["tip", "insight", "warning", "success"]).optional(),
      title: z.string().optional(),
    }),
  },
  {
    name: "Cards",
    group: "collections",
    description:
      "Collection of parallel items (places, concepts, dishes, references, acts) users can inspect, filter, or pin. Set contextual `icon` per card (`ticket`, `mic`, `disc`, `list-music`, `headphones`, `guitar`, `calendar`, `clock`, `pin`, `car`, `train`, `plane`, `route`, `globe`, `coins`, `wallet`, `utensils`, `coffee`, `flame`, `shield`, `code`, `terminal`, `database`, `wrench`, `zap`, `award`, `users`, `file-text`, `circle-check`).",
    props: z.object({
      items: z.array(CardItemSchema),
      title: z.string().optional(),
      layout: z.enum(["feature", "grid", "row", "list"]).optional(),
    }),
  },
  {
    name: "BentoGrid",
    group: "collections",
    description:
      "Synthesized multi-angle dashboard grid (strictly 2 or 4 complementary micro-widgets, never 3) where each slot adapts its visual anatomy to verified domain facets of the topic: transit routes, stage times, document requirements, CLI commands, diff patches, do/don't split, metrics, or concise notes. Never emit out-of-context slots (e.g. flight routes for non-flight topics). A fact/stat slot (`statValue`, `statUnit`, `summary`) should also carry `facts`: exactly 3 verified supporting facts `{label, value, sub}` shown side by side under the number.",
    props: z.object({
      title: z.string().optional(),
      items: z.array(BentoSlotItemSchema),
      subtitle: z.string().optional(),
    }),
  },
  {
    name: "Plan",
    group: "collections",
    description:
      "Schedule grouped by day, week, or phase (itineraries, study plans, roadmaps, sprints).",
    props: z.object({
      days: z.array(PlanDaySchema),
      title: z.string().optional(),
    }),
  },
  {
    name: "Steps",
    group: "collections",
    description:
      "Ordered procedure or chronology (how-tos, debugging steps, recipes, unfolding stages).",
    props: z.object({
      steps: z.array(StepItemSchema),
      title: z.string().optional(),
      style: z.enum(["numbered", "timeline"]).optional(),
    }),
  },
  {
    name: "Versus",
    group: "collections",
    description:
      "Two competing options side by side with metrics, pros/cons points, scores, and a verdict.",
    props: z.object({
      a: VersusSideSchema,
      b: VersusSideSchema,
      title: z.string().optional(),
      variant: z.enum(["cards", "radar", "bars", "editorial"]).optional(),
      dimensions: z.array(VersusDimensionSchema).optional(),
      verdict: z.string().optional(),
    }),
  },
  {
    name: "Stats",
    group: "charts",
    description:
      "2-4 headline metrics with optional delta and trend (up/down/flat).",
    props: z.object({
      items: z.array(StatItemSchema),
      title: z.string().optional(),
    }),
  },
  {
    name: "Chart",
    group: "charts",
    description:
      "Clean bar, donut, or line chart for comparing categories, shares, or trends.",
    props: z.object({
      type: z.enum(["bar", "donut", "line"]),
      data: z.array(ChartPointSchema),
      title: z.string().optional(),
      unit: z.string().optional(),
      caption: z.string().optional(),
    }),
  },
  {
    name: "Palette",
    group: "editorial",
    description: "Interactive hex colour swatches (click to copy).",
    props: z.object({
      colors: z.array(PaletteColorSchema),
      title: z.string().optional(),
      note: z.string().optional(),
    }),
  },
  {
    name: "Code",
    group: "editorial",
    description: "Syntax-highlighted code or config snippet with optional line highlights.",
    props: z.object({
      code: z.string(),
      language: z.string().optional(),
      title: z.string().optional(),
      highlight: z.array(z.number()).optional(),
      caption: z.string().optional(),
    }),
  },
  {
    name: "Flow",
    group: "diagrams",
    description: "Left-to-right system pipeline or mechanism diagram.",
    props: z.object({
      nodes: z.array(FlowNodeSchema),
      title: z.string().optional(),
      variant: z.enum(["cycle", "chevron", "alternating", "cascade"]).optional(),
      caption: z.string().optional(),
    }),
  },
  {
    name: "Map",
    group: "interactive",
    description:
      "Interactive OpenStreetMap geo map with auto-geocoded pins, optional route polyline, and fullscreen view.",
    props: z.object({
      pins: z.array(MapPinSchema),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      connectRoute: z.boolean().optional(),
    }),
  },
  {
    name: "Adjuster",
    group: "interactive",
    description:
      "Live parameter sliders, steppers, chips, and toggles with instant formula recalculation.",
    props: z.object({
      controls: z.array(AdjusterControlSchema),
      title: z.string().optional(),
      description: z.string().optional(),
      outputs: z.array(AdjusterOutputSchema).optional(),
      submitLabel: z.string().optional(),
    }),
  },
  {
    name: "Diagram",
    group: "diagrams",
    description:
      "Interactive Mermaid diagram (flowchart, sequence, erd, state, class, gantt, mindmap, timeline).",
    props: z.object({
      code: z.string(),
      kind: z
        .enum([
          "flowchart",
          "sequence",
          "erd",
          "state",
          "class",
          "gantt",
          "pie",
          "mindmap",
          "timeline",
        ])
        .optional(),
      title: z.string().optional(),
      caption: z.string().optional(),
    }),
  },
  {
    name: "Choices",
    group: "interactive",
    description:
      "Interactive click-to-answer choice cards when ambiguity or user preference shapes the next step.",
    props: z.object({
      question: z.string(),
      options: z.array(ChoiceOptionSchema),
      allowCustom: z.boolean().optional(),
    }),
  },
  {
    name: "Quiz",
    group: "interactive",
    description: "Interactive multiple-choice comprehension check.",
    props: z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer: z.number(),
      explain: z.string().optional(),
    }),
  },
  {
    name: "Checklist",
    group: "collections",
    description:
      "Interactive checkable action list for tasks, packing, or audits (`items: [{text, done?, note?}]`). Items always start unchecked — set `done: true` ONLY for items the user has explicitly said are already finished in this conversation.",
    props: z.object({
      items: z.array(ChecklistItemSchema),
      title: z.string().optional(),
    }),
  },
  {
    name: "Table",
    group: "collections",
    description: "Clean comparison or line-item table.",
    props: z.object({
      columns: z.array(z.string()),
      rows: z.array(z.array(z.union([z.string(), z.number()]))),
      title: z.string().optional(),
      caption: z.string().optional(),
    }),
  },
  {
    name: "Followups",
    group: "interactive",
    description:
      "Contextual next-step follow-up branches at the end of a reply (MUST provide 5-6 distinct, specific follow-up prompts, 4-10 words each).",
    props: z.object({
      items: z.array(z.string()),
    }),
  },
  {
    name: "AsyncImage",
    group: "media",
    description:
      "Single real web photograph resolved via semantic query or verified https src.",
    props: z.object({
      query: z.string().optional(),
      src: z.string().optional(),
      alt: z.string().optional(),
      caption: z.string().optional(),
      sourceUrl: z.string().optional(),
      ratio: z.string().optional(),
    }),
  },
  {
    name: "ImageWithCaption",
    group: "media",
    description: "Photograph paired with editorial title, caption, and optional source link.",
    props: z.object({
      caption: z.string(),
      query: z.string().optional(),
      src: z.string().optional(),
      title: z.string().optional(),
      alt: z.string().optional(),
      sourceUrl: z.string().optional(),
      ratio: z.string().optional(),
    }),
  },
  {
    name: "ImageWithCitation",
    group: "media",
    description: "Photograph with prominent source provenance badge and citation link.",
    props: z.object({
      query: z.string().optional(),
      src: z.string().optional(),
      caption: z.string().optional(),
      sourceTitle: z.string().optional(),
      sourceUrl: z.string().optional(),
      citationIndex: z.number().optional(),
      ratio: z.string().optional(),
    }),
  },
  {
    name: "ImageGallery",
    group: "media",
    description: "Curated multi-photo gallery (3-6 photos) with lightbox zoom.",
    props: z.object({
      title: z.string().optional(),
      query: z.string().optional(),
      items: z.array(MediaItemSchema).optional(),
    }),
  },
  {
    name: "ImageComparison",
    group: "media",
    description: "Two photographs side by side for visual comparison.",
    props: z.object({
      left: MediaComparisonSideSchema,
      right: MediaComparisonSideSchema,
      title: z.string().optional(),
      note: z.string().optional(),
    }),
  },
  // Curated Intelligence Domain Primitives
  {
    name: "DataTable",
    group: "intelligence",
    description:
      "Sortable, searchable structured table with typed columns and formatted cells.",
    props: z.object({
      title: z.string(),
      columns: z.array(z.union([z.string(), IntelDataObjectSchema])),
      rows: z.array(IntelDataObjectSchema),
      subtitle: z.string().optional(),
    }),
  },
  {
    name: "ComparisonTable",
    group: "intelligence",
    description:
      "Multi-entity comparison matrix. Canonical shape: `entities: [\"A\", \"B\"]`, `criteria: [{criterion: \"Waktu\", A: \"5 mnt\", B: \"12 jam\"}]` — every criterion row MUST carry a real value for EVERY entity (never placeholder keys like \"type\"/\"time\").",
    props: z.object({
      title: z.string(),
      entities: z.array(z.union([z.string(), IntelDataObjectSchema])),
      criteria: z.union([z.array(IntelDataObjectSchema), IntelDataObjectSchema]),
      verdict: z.string().optional(),
    }),
  },
  {
    name: "WeatherForecast",
    group: "intelligence",
    description:
      "Weather card for a place: current-conditions hero plus a Day (hourly strip) / Week (7-day range bars) toggle the user can switch. `current` holds {temp, unit?, cond?, icon?, hi?, lo?, feelsLike?, humidity?, windKph?, precipChance?, uvIndex?, updatedAt?}; `hourly` = [{time, temp, icon?, precipChance?}]; `daily` = [{day, icon?, lo, hi, precipChance?}]. `icon` vocabulary: sun|sun-cloud|cloud|rain|drizzle|storm|snow|fog|moon|cloud-moon|wind. Only emit with REAL forecast data from weather tools/web results — never invent temperatures.",
    props: z.object({
      location: z.string(),
      current: IntelDataObjectSchema,
      hourly: z.array(IntelDataObjectSchema).optional(),
      daily: z.array(IntelDataObjectSchema).optional(),
      subtitle: z.string().optional(),
    }),
  },
  {
    name: "KpiCard",
    group: "intelligence",
    description:
      "Single high-impact KPI with delta and trend, drawn with an animated trend chart when `sparkline` carries the real series (6-24 verified numbers, oldest first). `period` names the span (e.g. \"12 bulan terakhir\"), `target` draws a goal line. Never invent series values.",
    props: z.object({
      label: z.string(),
      value: z.union([z.string(), z.number()]),
      delta: z.string().optional(),
      trend: z.enum(["up", "down", "flat"]).optional(),
      note: z.string().optional(),
      sparkline: z.array(z.number()).optional(),
      period: z.string().optional(),
      target: z.number().optional(),
    }),
  },
  {
    name: "Timeline",
    group: "intelligence",
    description:
      "Chronological event timeline with dates, milestones, and status (`events: [{time, title, detail}]`).",
    props: z.object({
      title: z.string(),
      events: z.array(TimelineEventItemSchema),
      subtitle: z.string().optional(),
    }),
  },
  {
    name: "LineChart",
    group: "intelligence",
    description: "Multi-series quantitative line chart over time or ordered domain.",
    props: z.object({
      title: z.string(),
      data: z.array(IntelDataObjectSchema),
      xKey: z.string().optional(),
      series: z.array(IntelDataObjectSchema).optional(),
      unit: z.string().optional(),
    }),
  },
  {
    name: "BarChart",
    group: "intelligence",
    description: "Grouped or stacked categorical bar chart.",
    props: z.object({
      title: z.string(),
      data: z.array(IntelDataObjectSchema),
      xKey: z.string().optional(),
      series: z.array(IntelDataObjectSchema).optional(),
      unit: z.string().optional(),
    }),
  },
  {
    name: "PieChart",
    group: "intelligence",
    description: "Proportional pie or donut breakdown chart.",
    props: z.object({
      title: z.string(),
      data: z.array(IntelDataObjectSchema),
      variant: z.enum(["pie", "donut"]).optional(),
      unit: z.string().optional(),
    }),
  },
  {
    name: "RadarChart",
    group: "intelligence",
    description: "Multi-axis profile comparison radar chart.",
    props: z.object({
      title: z.string(),
      data: z.array(IntelDataObjectSchema),
      series: z.array(IntelDataObjectSchema).optional(),
    }),
  },
  {
    name: "AreaChart",
    group: "intelligence",
    description: "Filled area trend chart for cumulative or volume metrics.",
    props: z.object({
      title: z.string(),
      data: z.array(IntelDataObjectSchema),
      xKey: z.string().optional(),
      series: z.array(IntelDataObjectSchema).optional(),
    }),
  },
  {
    name: "Gauge",
    group: "intelligence",
    description: "Radial gauge showing progress or score against a target range.",
    props: z.object({
      label: z.string(),
      value: z.number(),
      min: z.number().optional(),
      max: z.number().optional(),
      unit: z.string().optional(),
    }),
  },
  {
    name: "MindMap",
    group: "intelligence",
    description: "Interactive radial or hierarchical concept mind map.",
    props: z.object({
      title: z.string(),
      root: IntelDataObjectSchema,
    }),
  },
  {
    name: "GanttChart",
    group: "intelligence",
    description:
      "Project schedule Gantt chart with tasks, start/end dates, and dependencies (`tasks: [{title, start, end, owner, status}]`).",
    props: z.object({
      title: z.string(),
      tasks: z.array(GanttTaskItemSchema),
    }),
  },
  {
    name: "KanbanBoard",
    group: "intelligence",
    description:
      "Column-based workflow board with cards and status lanes (`columns: [{title, items: [{title, description, owner, priority}]}]`).",
    props: z.object({
      title: z.string(),
      columns: z.array(KanbanColumnItemSchema),
    }),
  },
  {
    name: "ArchitectureDiagram",
    group: "intelligence",
    description:
      "Interactive system architecture node-and-edge topology diagram (`nodes: [{id, label, type, detail}]`, `edges: [{source, target, label}]`).",
    props: z.object({
      title: z.string(),
      nodes: z.array(GraphNodeItemSchema),
      edges: z.array(GraphEdgeItemSchema),
    }),
  },
  {
    name: "DecisionTree",
    group: "intelligence",
    description: "Branching decision logic tree for diagnostics or rule evaluation.",
    props: z.object({
      title: z.string(),
      root: IntelDataObjectSchema,
    }),
  },
  {
    name: "Scorecard",
    group: "intelligence",
    description:
      "Multi-criteria evaluation scorecard with weights and ratings (`items: [{criterion, score, weight, note}]`).",
    props: z.object({
      title: z.string(),
      items: z.array(ScorecardItemSchema),
      overallScore: z.union([z.string(), z.number()]).optional(),
    }),
  },
  {
    name: "EvidenceCard",
    group: "intelligence",
    description: "Grounded claim/evidence block with source attribution and confidence.",
    props: z.object({
      claim: z.string(),
      evidence: z.string(),
      source: z.string().optional(),
      confidence: z.enum(["high", "medium", "low"]).optional(),
    }),
  },
  // Rich Context & Role-Specialist Primitives
  {
    name: "VisualDossier",
    group: "editorial",
    description:
      "Compact context hero fusing 1 verified photo, editorial title, status badge, summary paragraph, crisp fact tiles, and contextual icon highlights (`highlights: [{text, icon}, ...]`). Choose a specific `icon` per highlight from: `ticket`, `mic`, `disc`, `list-music`, `headphones`, `guitar`, `calendar`, `clock`, `pin`, `landmark`, `route`, `globe`, `car`, `bus`, `train`, `plane`, `coins`, `credit-card`, `utensils`, `coffee`, `flame`, `terminal`, `database`, `zap`, `code`, `shield`, `wrench`, `alert`, `users`, `award`, `circle-check`, `file-text`.",
    props: z.object({
      title: z.string(),
      summary: z.string(),
      facts: z.array(VersusMetricSchema).optional(),
      imageQuery: z.string().optional(),
      src: z.string().optional(),
      subtitle: z.string().optional(),
      status: z.string().optional(),
      highlights: z.array(DossierHighlightItemSchema).optional(),
    }),
  },
  {
    name: "TransitRouteCard",
    group: "interactive",
    description:
      "Point-to-point transit comparison card with live Normal vs Peak/Event scenario toggle, travel time per mode, solo vs couple/group cost, bottleneck alert, and return-trip fallback (`options: [{mode, normalTime, peakTime, costSolo, costGroup, note, tag}]`).",
    props: z.object({
      origin: z.string(),
      destination: z.string(),
      options: z.array(TransitOptionItemSchema),
      distance: z.string().optional(),
      bottleneck: z.string().optional(),
      returnTip: z.string().optional(),
      title: z.string().optional(),
    }),
  },
  {
    name: "RecipeScalerCard",
    group: "collections",
    description:
      "Interactive culinary recipe card with live servings multiplier, auto-scaled ingredient quantities, checkable prep items, and concise cooking notes (`ingredients: [{name, amount, unit, note}]`).",
    props: z.object({
      title: z.string(),
      ingredients: z.array(RecipeIngredientItemSchema),
      servings: z.number().optional(),
      prepTime: z.string().optional(),
      cookTime: z.string().optional(),
      steps: z.array(z.string()).optional(),
      imageQuery: z.string().optional(),
      src: z.string().optional(),
      tip: z.string().optional(),
    }),
  },
  {
    name: "MoodboardMosaic",
    group: "media",
    description:
      "Asymmetric visual direction collage uniting clickable hex palette swatches, curated reference photos, and concise lighting/aesthetic notes.",
    props: z.object({
      title: z.string(),
      swatches: z.array(PaletteColorSchema),
      visuals: z.array(MediaItemSchema),
      vibe: z.string().optional(),
      notes: z.array(z.string()).optional(),
    }),
  },
  {
    name: "ConceptFlashcards",
    group: "interactive",
    description:
      "Interactive study & terminology cards with etymology/root decoding, plain-English intuition, concrete analogy, and revealable self-check Q&A (`cards: [{term, root, summary, analogy, checkQuestion, checkAnswer}]`).",
    props: z.object({
      title: z.string(),
      cards: z.array(FlashcardItemSchema),
    }),
  },
  {
    name: "CodeDiffPatch",
    group: "editorial",
    description:
      "Focused before/after code diff viewer with split/unified toggle, line highlights, file label, and one-click patch copy.",
    props: z.object({
      title: z.string(),
      before: z.string(),
      after: z.string(),
      file: z.string().optional(),
      language: z.string().optional(),
      summary: z.string().optional(),
    }),
  },
  {
    name: "FactCheckPanel",
    group: "intelligence",
    description:
      "Verdict-badged claim verification panel separating verified facts, rumors, and myths with clear explanations (`checks: [{claim, verdict: 'verified'|'false'|'disputed', explanation}]`).",
    props: z.object({
      title: z.string(),
      checks: z.array(FactCheckItemSchema),
    }),
  },
  {
    name: "ExecutiveSummary",
    group: "intelligence",
    description:
      "High-density strategic overview uniting key takeaways, compact stat bar, posture tone, and expandable nuance.",
    props: z.object({
      title: z.string(),
      takeaways: z.array(z.string()),
      stats: z.array(StatItemSchema).optional(),
      tone: z.enum(["neutral", "positive", "warning", "critical"]).optional(),
      detail: z.string().optional(),
    }),
  },
  {
    name: "SituationalOverview",
    group: "intelligence",
    description:
      "Operational context briefing pairing current posture, summary, KPI metrics, and active advisories.",
    props: z.object({
      title: z.string(),
      summary: z.string(),
      metrics: z.array(VersusMetricSchema).optional(),
      advisories: z.array(z.string()).optional(),
      posture: z.string().optional(),
      tone: z.string().optional(),
    }),
  },
  {
    name: "KeyFindings",
    group: "intelligence",
    description:
      "Ordered analytical findings with confidence rating, impact tag, and expandable supporting evidence. Each finding item must include `title` and `description` (plus optional `confidence`: 'high' | 'medium' | 'low').",
    props: z.object({
      title: z.string(),
      findings: z.array(
        z.union([
          z.string(),
          z
            .object({
              title: z.string(),
              description: z.string().optional(),
              confidence: z.string().optional(),
            })
            .passthrough(),
        ]),
      ),
    }),
  },
  {
    name: "RootCauseAnalysis",
    group: "intelligence",
    description:
      "Structured failure diagnosis showing primary root cause alongside categorized contributing factors and proof. Every item in `contributingFactors` MUST be an object with BOTH a concise `cause` title AND a concrete 1-sentence `evidence` description explaining how it triggers the failure (plus optional `category` and `weight` like 'Direct' | 'Secondary' | 'Primary').",
    props: z.object({
      title: z.string(),
      rootCause: z.string(),
      contributingFactors: z.array(
        z.union([
          z.string(),
          z
            .object({
              cause: z.string(),
              category: z.string().optional(),
              evidence: z.string().optional(),
              weight: z.string().optional(),
            })
            .passthrough(),
        ]),
      ),
      severity: z.string().optional(),
    }),
  },
  {
    name: "SwotAnalysis",
    group: "intelligence",
    description: "2x2 strategic SWOT evaluation grid (Strengths, Weaknesses, Opportunities, Threats).",
    props: z.object({
      title: z.string(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      opportunities: z.array(z.string()),
      threats: z.array(z.string()),
    }),
  },
  {
    name: "TradeoffMatrix",
    group: "intelligence",
    description:
      "Option evaluation matrix highlighting concrete gains vs operational sacrifices per architectural or life choice. Every item in `options` MUST be `{name: string, tag?: string, benefits: string[], costs: string[]}`.",
    props: z.object({
      title: z.string(),
      options: z.array(TradeoffOptionItemSchema),
    }),
  },
  {
    name: "NewsFeed",
    group: "intelligence",
    description:
      "News digest for current events: a lead story plus a list, each with photo, outlet, time, headline, summary and source link. One article = one real `web_search` result from this turn: copy its `url` exactly and write the headline and summary yourself. The app attaches the outlet favicon and the article's own photo, so never pass an image. 3-7 articles ordered by importance; an article whose `url` is not in this turn's results loses its link.",
    props: z.object({
      title: z.string(),
      articles: z.array(NewsArticleItemSchema),
    }),
  },
  {
    name: "RiskMatrix",
    group: "intelligence",
    description:
      "Interactive 5x5 likelihood-by-impact risk heatmap with clickable mitigation entries (`risks: [{code, title, probability: 1-5, impact: 1-5, mitigation}]`). Only for an actual risk assessment where you can justify each score; never to summarise news or a list of issues.",
    props: z.object({
      title: z.string(),
      risks: z.array(RiskMatrixItemSchema),
    }),
  },
  {
    name: "CostBenefitAnalysis",
    group: "intelligence",
    description:
      "Two-column monetary or resource breakdown comparing itemized costs against quantified benefits and net return (`costs: [{label, amount}]`, `benefits: [{label, amount}]`).",
    props: z.object({
      title: z.string(),
      costs: z.array(CostBenefitRowItemSchema),
      benefits: z.array(CostBenefitRowItemSchema),
      unit: z.string().optional(),
    }),
  },
  {
    name: "QuoteExtraction",
    group: "intelligence",
    description:
      "Curated primary quotes attributed to speakers, docs, or announcements with context note (`quotes: [{text, speaker, relevance}]`).",
    props: z.object({
      title: z.string(),
      quotes: z.array(QuoteExtractionItemSchema),
    }),
  },
  {
    name: "ClaimEvidenceMap",
    group: "intelligence",
    description:
      "Interactive graph linking assertions, corroborating evidence nodes, and counter-claims (`nodes: [{id, label, type}]`, `edges: [{source, target, label}]`).",
    props: z.object({
      title: z.string(),
      nodes: z.array(GraphNodeItemSchema),
      edges: z.array(GraphEdgeItemSchema),
    }),
  },
  {
    name: "DocumentDiff",
    group: "intelligence",
    description:
      "Multi-hunk before/after config or text comparison viewer with split and unified modes (`hunks: [{section, before, after}]`).",
    props: z.object({
      title: z.string(),
      hunks: z.array(DocumentDiffHunkItemSchema),
      leftLabel: z.string().optional(),
      rightLabel: z.string().optional(),
    }),
  },
  // Intel suite — full chat coverage
  {
    name: "SourceCard",
    group: "intelligence",
    description:
      "Single source reference card with title link, domain badge, snippet, published date, reliability badge, and copy citation button. Show when one source needs full detail (`source: {title, url, domain, reliability, publishedDate, description?}`, `snippet?`).",
    props: z.object({
      source: IntelDataObjectSchema,
      snippet: z.string().optional(),
    }),
  },
  {
    name: "SourceList",
    group: "intelligence",
    description:
      "Sortable, filterable list of source cards with relevance/date sort, reliability filter, and group-by-domain toggle. Show when multiple sources need sorting, filtering, and grouping controls (`sources: [{source: {title, url, domain, reliability, publishedDate}, snippet?}]`).",
    props: z.object({
      title: z.string().optional(),
      sources: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "SearchResults",
    group: "intelligence",
    description:
      "Query display header with result list (title link, snippet, URL, date), result count, and load-more. Show when displaying web search or knowledge base results (`query`, `results: [{id, title, url, snippet, date?}]`, `totalCount?`, `hasMore?`).",
    props: z.object({
      query: z.string(),
      results: z.array(IntelDataObjectSchema),
      totalCount: z.number().optional(),
      hasMore: z.boolean().optional(),
    }),
  },
  {
    name: "EvidenceMatrix",
    group: "intelligence",
    description:
      "Interactive matrix mapping claims against per-source assessments (supports/contradicts/neutral). Show when cross-checking factual claims across multiple retrieved sources (`sources: string[]`, `claims: [{claim, assessments: [{stance, note?}]}]`).",
    props: z.object({
      title: z.string().optional(),
      sources: z.array(z.string()),
      claims: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "EvidenceCollection",
    group: "intelligence",
    description:
      "Stance-filterable collection of extracted supporting, contradicting, and contextual evidence. Show when presenting curated supporting and counter evidence (`items: [{title, stance, excerpt, source?}]`).",
    props: z.object({
      title: z.string().optional(),
      items: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "SourcePreview",
    group: "intelligence",
    description:
      "Clean summary preview card of a single retrieved document or webpage. Show when previewing a primary reference alongside extracted highlights (`title`, `summary`, `domain?`, `url?`, `reliability?`, `highlights?`).",
    props: z.object({
      title: z.string(),
      summary: z.string(),
      domain: z.string().optional(),
      url: z.string().optional(),
      reliability: z.string().optional(),
      highlights: z.array(z.string()).optional(),
    }),
  },
  {
    name: "SourceComparison",
    group: "intelligence",
    description:
      "Compares how multiple sources report on the same event or technical benchmark. Show when comparing primary vs secondary reporting (`sources: [{title, domain, reliability, stance, date?}]`).",
    props: z.object({
      title: z.string().optional(),
      sources: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "SourceTimeline",
    group: "intelligence",
    description:
      "Orders retrieved documents and publications chronologically. Show when tracing how reporting, RFCs, or research evolved over time (`sources: [{title, date, summary, domain?}]`).",
    props: z.object({
      title: z.string().optional(),
      sources: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "SourceReliability",
    group: "intelligence",
    description:
      "Evaluates trustworthiness scores (0-100) and provenance notes per source. Show when surfacing source authority, peer-review status, or bias warnings (`sources: [{domain, score, rationale}]`).",
    props: z.object({
      title: z.string().optional(),
      sources: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "Citation",
    group: "intelligence",
    description:
      "Formal copyable citation block with optional extracted verbatim quote. Show when highlighting an exact primary citation and quote (`title`, `label?`, `index?`, `authors?`, `year?`, `publisher?`, `url?`, `quote?`).",
    props: z.object({
      title: z.string(),
      label: z.string().optional(),
      index: z.number().optional(),
      authors: z.string().optional(),
      year: z.string().optional(),
      publisher: z.string().optional(),
      url: z.string().optional(),
      quote: z.string().optional(),
    }),
  },
  {
    name: "ReferenceList",
    group: "intelligence",
    description:
      "Numbered bibliography list of verifiable references. Show when closing a research response with numbered clickable references (`references: [{title, url, authors?, year?, domain?}]`).",
    props: z.object({
      title: z.string().optional(),
      references: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "DocumentViewer",
    group: "intelligence",
    description:
      "Searchable multi-section document reader for specifications and reports. Show when users should read long specs, RFCs, or logs in-place (`title`, `sections: [{heading, content}]`, `metadataLine?`).",
    props: z.object({
      title: z.string(),
      sections: z.array(IntelDataObjectSchema),
      metadataLine: z.string().optional(),
    }),
  },
  {
    name: "ArticleReader",
    group: "intelligence",
    description:
      "Clean editorial reader for extracted long-form web articles. Show when presenting scraped or synthesized long-form article text (`title`, `paragraphs: string[]`, `author?`, `readTime?`, `date?`, `lead?`).",
    props: z.object({
      title: z.string(),
      paragraphs: z.array(z.string()),
      author: z.string().optional(),
      readTime: z.string().optional(),
      date: z.string().optional(),
      lead: z.string().optional(),
    }),
  },
  {
    name: "ResearchBrief",
    group: "intelligence",
    description:
      "Executive research brief pairing core research question, findings, and open questions. Show when delivering concise intelligence briefings (`question`, `findings: string[]`, `confidence?`, `keyQuestions?`).",
    props: z.object({
      question: z.string(),
      findings: z.array(z.string()),
      title: z.string().optional(),
      confidence: z.string().optional(),
      keyQuestions: z.array(z.string()).optional(),
    }),
  },
  {
    name: "EvidenceTimeline",
    group: "intelligence",
    description:
      "Evidence artifacts sequenced chronologically with evidentiary weight indicator. Show when reconstructing an evidentiary chronology (`events: [{title, timestamp, description, source?, weight?}]`).",
    props: z.object({
      title: z.string().optional(),
      events: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "SourceInspector",
    group: "intelligence",
    description:
      "Tabbed deep source metadata and excerpt inspector. Show when reviewing raw source excerpts alongside credibility metadata (`sources: [{title, domain, url, fullExcerpt, author?, date?, reliability?}]`).",
    props: z.object({
      title: z.string().optional(),
      sources: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "AlertFeed",
    group: "intelligence",
    description:
      "Vertical alert list grouped by severity (critical, warning, info, success) with dismiss buttons. Show for alerts, notifications, or warnings to display grouped by severity (`alerts: [{id, severity, title, description?, timestamp?}]`).",
    props: z.object({
      alerts: z.array(IntelDataObjectSchema),
      title: z.string().optional(),
    }),
  },
  {
    name: "IncidentTimeline",
    group: "intelligence",
    description:
      "Chronological timeline of incident detection, triage, and mitigation events. Show when documenting incident progression from alert to resolution (`events: [{title, timestamp, detail?, actor?, severity?}]`, `severity?`).",
    props: z.object({
      title: z.string().optional(),
      severity: z.string().optional(),
      events: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "IncidentMap",
    group: "intelligence",
    description:
      "Geographic incident visualization powered by OpenStreetMap pins with optional connecting route. Show when visualizing regional outages, logistics disruptions, or field incidents (`incidents: [{name, lat, lng, severity?, note?, time?}]`, `connectRoute?`).",
    props: z.object({
      title: z.string().optional(),
      connectRoute: z.boolean().optional(),
      incidents: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "EventCorrelationMap",
    group: "intelligence",
    description:
      "Interactive node graph correlating causal chains across distributed events. Show when linking seemingly separate log events into a unified root-cause story (`nodes: [{id, label, type?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "EntityTracking",
    group: "intelligence",
    description:
      "Tracks state mutations across monitored hosts, domains, or accounts. Show when monitoring watched domains, packages, or infrastructure entities (`entities: [{name, type, status, lastChange, updatedAt}]`).",
    props: z.object({
      title: z.string().optional(),
      entities: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "AnomalyDetectionPanel",
    group: "intelligence",
    description:
      "Highlights statistical anomalies with baseline vs current values and anomaly score. Show when flagging sudden spikes or drops across telemetry streams (`detections: [{signal, anomalyScore, explanation, window, baseline, current, severity?}]`).",
    props: z.object({
      title: z.string().optional(),
      detections: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "ThreatAssessment",
    group: "intelligence",
    description:
      "Structured threat posture summary detailing attack vectors, likelihood, and mitigations. Show when assessing security exposure or emerging threat advisories (`overallLevel`, `vectors: [{name, likelihood, severity, mitigation}]`, `summary?`).",
    props: z.object({
      overallLevel: z.string(),
      vectors: z.array(IntelDataObjectSchema),
      title: z.string().optional(),
      summary: z.string().optional(),
    }),
  },
  {
    name: "SignalMonitor",
    group: "intelligence",
    description:
      "Real-time golden signal tile monitor comparing observed metrics vs SLO thresholds. Show when displaying live latency, error rate, and saturation gauges (`signals: [{name, value, threshold, status}]`).",
    props: z.object({
      title: z.string().optional(),
      signals: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "EventStream",
    group: "intelligence",
    description:
      "Filterable raw operational event log sorted by arrival timestamp. Show when streaming live audit or operational events (`events: [{timestamp, type, message, severity?, source?}]`).",
    props: z.object({
      title: z.string().optional(),
      events: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "InvestigationBoard",
    group: "intelligence",
    description:
      "Multi-column kanban workspace grouping leads, active checks, and verified findings. Every card must include a concise description. Show when coordinating multi-lead investigations across stages (`columns: [{title, cards: [{title, description, tag?, tone?, note?}]}]`).",
    props: z.object({
      title: z.string().optional(),
      columns: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "CaseTimeline",
    group: "intelligence",
    description:
      "Structured timeline of investigative milestones and case updates. Show when summarizing multi-day audits or investigations (`milestones: [{title, date, summary, status?}]`, `caseId?`).",
    props: z.object({
      title: z.string().optional(),
      caseId: z.string().optional(),
      milestones: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "IndicatorPanel",
    group: "intelligence",
    description:
      "Tile panel tracking critical indicators (IOCs, leading health KPIs) with value and summary side by side. Show when highlighting watched indicators alongside value, summary, category, and health (`indicators: [{name, value, summary, category?, status?}]`).",
    props: z.object({
      title: z.string().optional(),
      indicators: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "PatternDetection",
    group: "intelligence",
    description:
      "Identifies recurring behavioral or failure patterns with match count and confidence. Show when reporting clustered signatures or recurring user/error patterns (`patterns: [{name, confidence, occurrences, signature, description}]`).",
    props: z.object({
      title: z.string().optional(),
      patterns: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "ChangeDetection",
    group: "intelligence",
    description:
      "Compares before/after state snapshots to highlight meaningful deltas. Show when tracking configuration drift, performance deltas, or snapshot changes (`changes: [{subject, before, after, delta, direction: up|down}]`).",
    props: z.object({
      title: z.string().optional(),
      changes: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "CorrelationTimeline",
    group: "intelligence",
    description:
      "Groups concurrent events into time-window correlation clusters. Show for events that happened simultaneously across different layers (`clusters: [{window, correlationScore, events: string[]}]`).",
    props: z.object({
      title: z.string().optional(),
      clusters: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "GeographicHeatmap",
    group: "intelligence",
    description:
      "Regional event density cards paired with interactive OpenStreetMap hotspot view. Show for regional concentration of alerts, traffic, or incidents (`hotspots: [{region, intensity, lat?, lng?, summary?}]`).",
    props: z.object({
      title: z.string().optional(),
      hotspots: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "Watchlist",
    group: "intelligence",
    description:
      "Watchlist table tracking high-priority entities, status, and latest signal. Show when tracking active watch targets during monitoring workflows (`items: [{name, category, status, lastSignal}]`).",
    props: z.object({
      title: z.string().optional(),
      items: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "IncidentRelationshipGraph",
    group: "intelligence",
    description:
      "Interactive node graph showing linked incidents, shared root causes, and affected services. Show when connecting multiple historical or ongoing incidents cleanly (`nodes: [{id, label, type?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "Metric",
    group: "intelligence",
    description:
      "Single KPI display with label, large value, delta with trend arrow, status color, and optional note/sparkline. Show for a single numeric KPI, stat, or measurement with optional trend (`label`, `value`, `unit?`, `prefix?`, `delta?`, `trend?: up|down|flat`, `sparkline?: number[]`, `status?: good|warning|critical|neutral`, `note?`).",
    props: z.object({
      label: z.string(),
      value: z.union([z.string(), z.number()]),
      unit: z.string().optional(),
      prefix: z.string().optional(),
      delta: z.string().optional(),
      trend: z.enum(["up", "down", "flat"]).optional(),
      sparkline: z.array(z.number()).optional(),
      status: z.string().optional(),
      note: z.string().optional(),
    }),
  },
  {
    name: "MetricGroup",
    group: "intelligence",
    description:
      "Auto-fit grid of Metric KPI cards with optional title header. Show for multiple KPIs, stats, or measurements together in a dashboard-style grid (`metrics: [{label, value, unit?, delta?, trend?, sparkline?, status?, note?}]`).",
    props: z.object({
      title: z.string().optional(),
      metrics: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "DonutChart",
    group: "intelligence",
    description:
      "Donut (ring) chart for proportional data with interactive segments, center total/detail label, and hover legend; first series renders as pie segments. Show for proportions, percentages, market share, or composition breakdown (`series: [{name, data: [{label, value}]}]`, `caption?`).",
    props: z.object({
      series: z.array(IntelDataObjectSchema),
      title: z.string().optional(),
      caption: z.string().optional(),
    }),
  },
  {
    name: "Sparkline",
    group: "intelligence",
    description:
      "Tiny inline trend line (~40px tall) with no axes — for embedding in metric cards, tables, or inline text to convey trend direction (`values: number[]`, `color?`).",
    props: z.object({
      values: z.array(z.number()),
      color: z.string().optional(),
    }),
  },
  {
    name: "StackedBarChart",
    group: "intelligence",
    description:
      "Stacked vertical bars showing composition across categories. Show when comparing category totals alongside internal component breakdown (`keys: string[]`, `data: [{<key>: number, ...}]`, `unit?`).",
    props: z.object({
      keys: z.array(z.string()),
      data: z.array(IntelDataObjectSchema),
      title: z.string().optional(),
      unit: z.string().optional(),
    }),
  },
  {
    name: "HorizontalBarChart",
    group: "intelligence",
    description:
      "Horizontal bar chart optimized for ranked comparisons and long labels. Show when ranking categories with long descriptive names (`items: [{label, value}]`, `unit?`).",
    props: z.object({
      items: z.array(
        z.object({ label: z.string(), value: z.number() }).passthrough(),
      ),
      title: z.string().optional(),
      unit: z.string().optional(),
    }),
  },
  {
    name: "ScatterPlot",
    group: "intelligence",
    description:
      "Two-axis scatter plot inspecting correlation and clusters. Show when inspecting correlation, clusters, or dispersion across pairs of variables (`points: [{x, y, name?}]`, `xLabel?`, `yLabel?`).",
    props: z.object({
      points: z.array(
        z
          .object({
            x: z.number(),
            y: z.number(),
            name: z.string().optional(),
          })
          .passthrough(),
      ),
      title: z.string().optional(),
      xLabel: z.string().optional(),
      yLabel: z.string().optional(),
    }),
  },
  {
    name: "BubbleChart",
    group: "intelligence",
    description:
      "Three-variable scatter chart encoding magnitude as bubble radius. Show when comparing items across X, Y, and a third magnitude dimension simultaneously (`points: [{x, y, z}]`, `xLabel?`, `yLabel?`, `zLabel?`).",
    props: z.object({
      points: z.array(
        z
          .object({ x: z.number(), y: z.number(), z: z.number() })
          .passthrough(),
      ),
      title: z.string().optional(),
      xLabel: z.string().optional(),
      yLabel: z.string().optional(),
      zLabel: z.string().optional(),
    }),
  },
  {
    name: "Heatmap",
    group: "intelligence",
    description:
      "2D color-intensity matrix across row and column dimensions. Show when visualizing hourly density, cohort retention, or error frequency grids (`rows: string[]`, `cols: string[]`, `values: number[][]`).",
    props: z.object({
      rows: z.array(z.string()),
      cols: z.array(z.string()),
      values: z.array(z.array(z.number())),
      title: z.string().optional(),
    }),
  },
  {
    name: "Treemap",
    group: "intelligence",
    description:
      "Nested area rectangles visualizing proportional hierarchy. Show for hierarchical disk/budget/bundle shares by relative area (`items: [{name, size}]`).",
    props: z.object({
      items: z.array(
        z.object({ name: z.string(), size: z.number() }).passthrough(),
      ),
      title: z.string().optional(),
    }),
  },
  {
    name: "Histogram",
    group: "intelligence",
    description:
      "Binned frequency distribution histogram. Show for latency distribution, age brackets, or score spread (`bins: [{range, count}]`, `unit?`).",
    props: z.object({
      bins: z.array(
        z.object({ range: z.string(), count: z.number() }).passthrough(),
      ),
      title: z.string().optional(),
      unit: z.string().optional(),
    }),
  },
  {
    name: "BoxPlot",
    group: "intelligence",
    description:
      "Quartile box-and-whisker distribution per group (min, Q1, median, Q3, max). Show when comparing statistical variance, median, and tails across groups (`groups: [{label, min, q1, median, q3, max}]`).",
    props: z.object({
      groups: z.array(IntelDataObjectSchema),
      title: z.string().optional(),
    }),
  },
  {
    name: "FunnelChart",
    group: "intelligence",
    description:
      "Progressive conversion funnel with stage drop-off percentages. Show when tracking onboarding drop-off, sales pipelines, or request funnels (`stages: [{label, value}]`).",
    props: z.object({
      stages: z.array(
        z.object({ label: z.string(), value: z.number() }).passthrough(),
      ),
      title: z.string().optional(),
    }),
  },
  {
    name: "SankeyDiagram",
    group: "intelligence",
    description:
      "Weighted flow diagram visualizing volume transfer from sources to targets. Show for traffic routing, budget allocation flows, or user state transitions (`nodes: [{id}]`, `links: [{source, target, value}]`).",
    props: z.object({
      nodes: z.array(z.object({ id: z.string() }).passthrough()),
      links: z.array(
        z
          .object({
            source: z.string(),
            target: z.string(),
            value: z.number(),
          })
          .passthrough(),
      ),
      title: z.string().optional(),
    }),
  },
  {
    name: "WaterfallChart",
    group: "intelligence",
    description:
      "Cumulative bridge chart showing positive and negative deltas to final total. Show when explaining profit bridges, latency budgets, or net user growth (`steps: [{label, delta, isTotal?}]`, `unit?`).",
    props: z.object({
      steps: z.array(
        z
          .object({
            label: z.string(),
            delta: z.number(),
            isTotal: z.boolean().optional(),
          })
          .passthrough(),
      ),
      title: z.string().optional(),
      unit: z.string().optional(),
    }),
  },
  {
    name: "PivotTable",
    group: "intelligence",
    description:
      "Interactive 2D aggregation pivot table with Sum/Count switcher. Show when summarizing multi-dimensional transactional records by two axes (`rowField`, `colField`, `valueField`, `records: [{...}]`).",
    props: z.object({
      rowField: z.string(),
      colField: z.string(),
      valueField: z.string(),
      records: z.array(IntelDataObjectSchema),
      title: z.string().optional(),
    }),
  },
  {
    name: "OutlierHighlight",
    group: "intelligence",
    description:
      "Highlights statistical outliers with z-scores and explanatory causes. Show when reporting anomalous spikes, extreme values, or telemetry outliers (`points: [{label, value, zScore?, outlier?, reason?}]`).",
    props: z.object({
      title: z.string().optional(),
      points: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "TrendAnalysis",
    group: "intelligence",
    description:
      "Area series overlaid with trendline and written trajectory interpretation. Show when explaining long-term momentum vs short-term noise (`points: [{label, value, trendline?}]`, `direction?`, `interpretation?`).",
    props: z.object({
      points: z.array(
        z
          .object({
            label: z.string(),
            value: z.number(),
            trendline: z.number().optional(),
          })
          .passthrough(),
      ),
      title: z.string().optional(),
      direction: z.string().optional(),
      interpretation: z.string().optional(),
    }),
  },
  {
    name: "DistributionAnalysis",
    group: "intelligence",
    description:
      "Frequency histogram paired with summary statistics (mean, median, stdDev, skew). Show when analyzing spread, skewness, and central tendency of a metric (`summary: {mean?, median?, stdDev?, skew?}`, `buckets: [{label, frequency}]`).",
    props: z.object({
      summary: IntelDataObjectSchema,
      buckets: z.array(
        z
          .object({ label: z.string(), frequency: z.number() })
          .passthrough(),
      ),
      title: z.string().optional(),
    }),
  },
  {
    name: "ForecastChart",
    group: "intelligence",
    description:
      "Historical actuals seamlessly transitioning into projected forecast + upper bound. Show when projecting future capacity, spend, or demand with confidence bounds (`points: [{label, actual?, forecast?, upper?}]`, `horizon?`).",
    props: z.object({
      points: z.array(
        z
          .object({
            label: z.string(),
            actual: z.number().optional(),
            forecast: z.number().optional(),
            upper: z.number().optional(),
          })
          .passthrough(),
      ),
      title: z.string().optional(),
      horizon: z.string().optional(),
    }),
  },
  {
    name: "ReasoningTree",
    group: "intelligence",
    description:
      "Top-down logical reasoning tree with premise, inference, conclusion, and evidence nodes. Show when the response traces a logical argument, proof, or multi-step deduction (`nodes: [{id, label, type, detail?, status?}]`, `edges: [{source, target, label?}]`, `caption?`).",
    props: z.object({
      title: z.string().optional(),
      nodes: z.array(GraphNodeItemSchema),
      edges: z.array(GraphEdgeItemSchema),
      caption: z.string().optional(),
    }),
  },
  {
    name: "KnowledgeGraph",
    group: "intelligence",
    description:
      "Force-directed entity-relationship graph connecting entities, concepts, or attributes by labeled semantic edges. Show for interconnected entities, taxonomies, ontologies, or relationship networks (`nodes: [{id, label, type, detail?}]`, `edges: [{source, target, label?}]`, `caption?`).",
    props: z.object({
      title: z.string().optional(),
      nodes: z.array(GraphNodeItemSchema),
      edges: z.array(GraphEdgeItemSchema),
      caption: z.string().optional(),
    }),
  },
  {
    name: "ProcessFlow",
    group: "intelligence",
    description:
      "Sequential process flowchart with start, process, decision, and end nodes. Show for business processes, algorithm steps, approval workflows, or sequential procedures with decision points (`nodes: [{id, label, type, detail?, status?}]`, `edges: [{source, target, label?}]`, `caption?`).",
    props: z.object({
      title: z.string().optional(),
      nodes: z.array(GraphNodeItemSchema),
      edges: z.array(GraphEdgeItemSchema),
      caption: z.string().optional(),
    }),
  },
  {
    name: "WorkflowGraph",
    group: "intelligence",
    description:
      "Workflow graph with parallel execution, conditional branches, task nodes, and join/synchronization points. Show for workflows with parallel tasks, fan-out/fan-in, or orchestration logic (`nodes: [{id, label, type, detail?, status?}]`, `edges: [{source, target, label?}]`, `direction?: LR|TB`, `caption?`).",
    props: z.object({
      title: z.string().optional(),
      nodes: z.array(GraphNodeItemSchema),
      edges: z.array(GraphEdgeItemSchema),
      direction: z.enum(["LR", "TB"]).optional(),
      caption: z.string().optional(),
    }),
  },
  {
    name: "SystemArchitecture",
    group: "intelligence",
    description:
      "Overall multi-tier system architecture across edge, compute, and persistence. Show when explaining end-to-end architecture of an application or platform (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "ServiceMap",
    group: "intelligence",
    description:
      "Microservice topology map showing live health and inter-service calls. Show when inspecting microservice communication and service ownership (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "ComponentDependencyMap",
    group: "intelligence",
    description:
      "UI or library component dependency relationships. Show when mapping how React components or SDK modules compose together (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "ApiFlowDiagram",
    group: "intelligence",
    description:
      "Request validation, auth middleware, handler, and response flow. Show when tracing REST/GraphQL/RPC endpoints through backend middleware (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "DataFlowDiagram",
    group: "intelligence",
    description:
      "Data movement from ingestion sources through transforms to sinks. Show when documenting ETL pipelines, telemetry streams, or analytics flows (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "InfrastructureMap",
    group: "intelligence",
    description:
      "Cloud infrastructure topology across VPC, compute nodes, and storage. Show when visualizing cloud resources, subnets, and managed databases (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "DatabaseSchemaMap",
    group: "intelligence",
    description:
      "Interactive relational/document schema table relationship map. Show when inspecting tables, primary/foreign keys, and join paths (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "EventFlowDiagram",
    group: "intelligence",
    description:
      "Pub/Sub event propagation across producers, brokers, and consumers. Show when mapping asynchronous domain events and webhook fan-out (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "IntegrationMap",
    group: "intelligence",
    description:
      "External SaaS, API, and internal system integration inventory. Show when auditing third-party integrations and webhook dependencies (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "PermissionMap",
    group: "intelligence",
    description:
      "RBAC/ABAC roles, policies, and resource access relationships. Show when reviewing authorization rules and privilege inheritance (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "SecurityBoundaryMap",
    group: "intelligence",
    description:
      "Trust zones, DMZ, internal VPCs, and boundary enforcement points. Show when conducting threat modeling and trust-boundary reviews (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "AttackSurfaceMap",
    group: "intelligence",
    description:
      "Exposed endpoints, input vectors, and potential exploit paths. Show for security audits of public endpoints, SSRF vectors, or auth surfaces (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "SequenceFlow",
    group: "intelligence",
    description:
      "Runtime execution sequence across async workers and callbacks. Show when debugging distributed async execution ordering (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "ErrorPropagationGraph",
    group: "intelligence",
    description:
      "Upstream fault cascade paths and circuit breaker boundaries. Show when tracing how downstream timeouts cause upstream cascading failures (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "CodeDependencyGraph",
    group: "intelligence",
    description:
      "File/module import DAG showing coupling and cycle risks. Show when refactoring module boundaries or isolating circular imports (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "DeploymentTopology",
    group: "intelligence",
    description:
      "Multi-region deployment topology showing replicas and failover routing. Show when planning rollouts, canary traffic splits, or disaster recovery (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "RuntimeInspector",
    group: "intelligence",
    description:
      "Collapsible runtime state, environment flags, and memory object inspector. Show when debugging live state trees, environment config, or hydrated session payloads (`environment?`, `status?`, `sections?: [{name, payload}]`, `runtimeState?`).",
    props: z.object({
      title: z.string().optional(),
      environment: z.string().optional(),
      status: z.string().optional(),
      sections: z.array(IntelDataObjectSchema).optional(),
      runtimeState: IntelDataObjectSchema.optional(),
    }),
  },
  {
    name: "PerformanceBreakdown",
    group: "intelligence",
    description:
      "Interactive trace span waterfall highlighting slow paths and bottlenecks. Show when profiling request latency across middleware, DB queries, and external API calls (`spans: [{name, service?, startMs, durationMs, bottleneck?, detail?}]`, `totalMs?`).",
    props: z.object({
      title: z.string().optional(),
      totalMs: z.number().optional(),
      spans: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "HypothesisTree",
    group: "intelligence",
    description:
      "Hierarchical decomposition of hypotheses and verifiable sub-claims. Show when structuring competing hypotheses into testable sub-branches (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "ConceptMap",
    group: "intelligence",
    description:
      "Force-directed semantic map linking domain concepts. Show when explaining conceptual relationships or mental models (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "DependencyGraph",
    group: "intelligence",
    description:
      "Directed dependency graph between modules, packages, or tasks. Show when visualizing upstream/downstream dependencies and critical paths (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "SystemDiagram",
    group: "intelligence",
    description:
      "High-level component and interaction overview. Show when explaining major system parts and how messages flow across them (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "CausalGraph",
    group: "intelligence",
    description:
      "Cause-and-effect graph tracing causal chains and feedback loops. Show when explaining causal drivers, bottlenecks, or systemic feedback (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "InfluenceDiagram",
    group: "intelligence",
    description:
      "Decision/chance/utility nodes showing factors shaping an outcome. Show when modeling variables that influence a strategic decision or KPI (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "NetworkGraph",
    group: "intelligence",
    description:
      "General weighted network graph of connected nodes and clusters. Show when visualizing social, organizational, traffic, or entity networks (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "EntityRelationshipMap",
    group: "intelligence",
    description:
      "Structured entity-relationship graph with cardinality labels. Show when modeling domain entities, foreign keys, or conceptual data models (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "ArgumentMap",
    group: "intelligence",
    description:
      "Claims, supporting premises, and counter-objections mapped spatially. Show for debate analysis, policy review, or weighing arguments objectively (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "SequenceDiagram",
    group: "intelligence",
    description:
      "Interactive actor/service interaction flow rendered as a node graph. Show when tracing OAuth handshakes, API protocols, or request-response hops (`nodes: [{id, label, type?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "StateMachine",
    group: "intelligence",
    description:
      "Finite state machine showing valid states and guarded transitions. Show when documenting UI lifecycles, payment states, or streaming parser states (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "RootCauseTree",
    group: "intelligence",
    description:
      "Top-down decomposition from symptom to contributing causes. Show for postmortem investigation or structured fault isolation (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "FiveWhys",
    group: "intelligence",
    description:
      "Iterative 5-Whys causal chain with interactive graph and narrative chain modes. Show when drilling from a surface symptom down to the process/architectural root cause. Narrative form: `problem`, `whys: [{question, answer}]`, `rootCause` — or graph form `nodes`/`edges` (`title?`).",
    props: z.object({
      title: z.string().optional(),
      problem: z.string().optional(),
      whys: z
        .array(z.object({ question: z.string(), answer: z.string() }).passthrough())
        .optional(),
      rootCause: z.string().optional(),
      nodes: z.array(GraphNodeItemSchema).optional(),
      edges: z.array(GraphEdgeItemSchema).optional(),
    }),
  },
  {
    name: "FishboneDiagram",
    group: "intelligence",
    description:
      "Ishikawa (fishbone) diagram categorizing causes across People, Process, Tech, Infra. Show when brainstorming categorized contributors to a defect or bottleneck (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "FaultTree",
    group: "intelligence",
    description:
      "Boolean gate fault tree modeling how leaf faults propagate to system failure. Show for reliability engineering, SRE failure analysis, or safety review (`nodes: [{id, label, type?, detail?, status?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "ScenarioTree",
    group: "intelligence",
    description:
      "Interactive branching probability tree of future outcomes. Show when exploring sequential decision branches and contingent outcomes (`nodes: [{id, label, type?, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "ComparisonMatrix",
    group: "intelligence",
    description:
      "Comparison table with criteria as row headers, options as columns, color-coded cell ratings, and an aggregate score row. Show when comparing multiple options across shared criteria (`options: string[]`, `criteria: [{label, values: [{value, rating: good|neutral|bad}]}]`, `scores?`).",
    props: z.object({
      title: z.string().optional(),
      options: z.array(z.string()),
      criteria: z.array(IntelDataObjectSchema),
      scores: z.array(z.union([z.string(), z.number()])).optional(),
    }),
  },
  {
    name: "ProsCons",
    group: "intelligence",
    description:
      "Two-column pros/cons layout with green Plus column, red Minus column, and verdict footer. Show when weighing advantages vs disadvantages or evaluating a decision (`pros: string[]`, `cons: string[]`, `verdict?`).",
    props: z.object({
      title: z.string().optional(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      verdict: z.string().optional(),
    }),
  },
  {
    name: "InsightPanel",
    group: "intelligence",
    description:
      "Typed insight card (insight/finding/warning/observation) with icon, confidence badge, and expandable detail. Show to highlight a key insight, finding, warning, or observation (`type`, `title`, `body`, `confidence?`, `detail?`).",
    props: z.object({
      type: z.enum(["insight", "finding", "warning", "observation"]),
      title: z.string(),
      body: z.string(),
      confidence: z.number().optional(),
      detail: z.string().optional(),
    }),
  },
  {
    name: "RecommendationPanel",
    group: "intelligence",
    description:
      "Actionable recommendation card with priority badge, implementation steps mini-checklist, impact/effort tags, and Apply button. Show when recommending a specific action, fix, or improvement (`priority: critical|high|medium|low`, `title`, `description`, `steps?: string[]`, `impact?`, `effort?`, `actionLabel?`).",
    props: z.object({
      priority: z.enum(["critical", "high", "medium", "low"]),
      title: z.string(),
      description: z.string(),
      steps: z.array(z.string()).optional(),
      impact: z.string().optional(),
      effort: z.string().optional(),
      actionLabel: z.string().optional(),
    }),
  },
  {
    name: "ExplanationPanel",
    group: "intelligence",
    description:
      "Structured explanation with collapsible summary, numbered reasoning steps, evidence links, and conclusion. Show when explaining a complex topic, reasoning chain, or decision rationale (`summary`, `steps?: string[]`, `evidence?: [{label, url?}]`, `conclusion?`).",
    props: z.object({
      summary: z.string(),
      title: z.string().optional(),
      steps: z.array(z.string()).optional(),
      evidence: z.array(IntelDataObjectSchema).optional(),
      conclusion: z.string().optional(),
    }),
  },
  {
    name: "ConfidenceIndicator",
    group: "intelligence",
    description:
      "Visual confidence display: filled bar or ring with 0-100 value and color gradient. Show for a confidence level, certainty score, probability, or quality metric (`value`, `label?`, `variant?: bar|ring`).",
    props: z.object({
      value: z.number(),
      label: z.string().optional(),
      variant: z.enum(["bar", "ring"]).optional(),
    }),
  },
  {
    name: "ReasoningSummary",
    group: "intelligence",
    description:
      "Reasoning chain: outcome statement, numbered step-by-step reasoning, evidence links, confidence level. Show for chain-of-thought, logical deduction, or investigative reasoning trails (`outcome`, `steps: [{step, detail?}]`, `evidence?: [{label, url?}]`, `confidence?`).",
    props: z.object({
      outcome: z.string(),
      steps: z.array(IntelDataObjectSchema),
      evidence: z.array(IntelDataObjectSchema).optional(),
      confidence: z.number().optional(),
    }),
  },
  {
    name: "HypothesisPanel",
    group: "intelligence",
    description:
      "Expandable hypotheses with probability bars and supporting/contradicting points. Show when evaluating competing explanations during debugging or research (`hypotheses: [{statement, probability, status, supporting?, contradicting?, id?}]`).",
    props: z.object({
      title: z.string().optional(),
      hypotheses: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "ContradictionPanel",
    group: "intelligence",
    description:
      "Side-by-side comparison of conflicting claims across sources or benchmarks. Show when synthesizing research where primary sources disagree (`contradictions: [{topic, sourceA, claimA, sourceB, claimB, severity?, resolution?}]`).",
    props: z.object({
      title: z.string().optional(),
      contradictions: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "AnomalyHighlight",
    group: "intelligence",
    description:
      "Spotlights unusual data points against expected baseline. Show when calling out spikes, regressions, or abnormal telemetry readings (`anomalies: [{metric, description, severity?, deviation?, expected?, observed?, timestamp?}]`).",
    props: z.object({
      title: z.string().optional(),
      anomalies: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "UncertaintyMap",
    group: "intelligence",
    description:
      "Maps unresolved uncertainty levels per dimension and resolution paths. Show when being transparent about confidence gaps before major technical decisions (`areas: [{dimension, uncertainty, reason?, mitigation?}]`).",
    props: z.object({
      title: z.string().optional(),
      areas: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "AssumptionPanel",
    group: "intelligence",
    description:
      "Interactive checklist of explicit analytical assumptions and sensitivity. Show when documenting underlying premises and what breaks if they don't hold (`assumptions: [{statement, sensitivity?, verified?, fallback?}]`).",
    props: z.object({
      title: z.string().optional(),
      assumptions: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "LimitationPanel",
    group: "intelligence",
    description:
      "Documents analytical boundaries, data blind spots, and workarounds. Show when reporting caveats, sample size limits, or tooling blind spots (`limitations: [{area, description, scope?, workaround?}]`).",
    props: z.object({
      title: z.string().optional(),
      limitations: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "InsightComparison",
    group: "intelligence",
    description:
      "Side-by-side comparison of competing or complementary insights. Show when contrasting two interpretations or conclusions cleanly (`insights: [{title, summary, confidence?, points?}]`).",
    props: z.object({
      title: z.string().optional(),
      insights: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "FindingDetail",
    group: "intelligence",
    description:
      "Deep-dive view of a single finding with impact, evidence list, remediation, and raw artifact. Show when drilling into one concrete issue with proof and fix guidance (`title`, `summary`, `severity?`, `impact?`, `evidence?: string[]`, `remediation?`, `rawArtifact?`).",
    props: z.object({
      title: z.string(),
      summary: z.string(),
      severity: z.string().optional(),
      impact: z.string().optional(),
      evidence: z.array(z.string()).optional(),
      remediation: z.string().optional(),
      rawArtifact: z.string().optional(),
    }),
  },
  {
    name: "DecisionMatrix",
    group: "intelligence",
    description:
      "Interactive weighted decision table allowing live priority weight adjustments. Show when scoring 2-5 competing choices across weighted criteria (`options: string[]`, `criteria: [{label, weight, scores: number[]}]`).",
    props: z.object({
      title: z.string().optional(),
      options: z.array(z.string()),
      criteria: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "ScenarioComparison",
    group: "intelligence",
    description:
      "Compares Conservative, Base, and Aggressive scenarios across KPIs. Show when planning financials, capacity, or product rollouts under uncertainty (`scenarios: [{name, outcome, likelihood?, tone?, metrics: [{label, value}]}]`).",
    props: z.object({
      title: z.string().optional(),
      scenarios: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "UncertaintyMatrix",
    group: "intelligence",
    description:
      "Best / Base / Worst case ranges across key model variables. Show when quantifying sensitivity bounds across multiple inputs (`variables: [{name, best, base, worst, volatility?}]`).",
    props: z.object({
      title: z.string().optional(),
      variables: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "SensitivityAnalysis",
    group: "intelligence",
    description:
      "Horizontal tornado sensitivity bar chart showing upside/downside swings. Show when identifying which input parameter drives the most variance (`drivers: [{name, lowDelta, highDelta}]`, `targetMetric?`).",
    props: z.object({
      title: z.string().optional(),
      targetMetric: z.string().optional(),
      drivers: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "CorrelationMatrix",
    group: "intelligence",
    description:
      "Symmetric heatmap of Pearson correlation coefficients (-1 to +1). Show when inspecting multi-variable collinearity or metric relationships (`labels: string[]`, `matrix: number[][]`).",
    props: z.object({
      title: z.string().optional(),
      labels: z.array(z.string()),
      matrix: z.array(z.array(z.number())),
    }),
  },
  {
    name: "PriorityMatrix",
    group: "intelligence",
    description:
      "2x2 Impact vs Effort quadrant grid classifying backlog initiatives. Show when triaging roadmaps, bug queues, or feature backlogs (`items: [{title, quadrant: quick_wins|major_projects|fill_ins|thankless}]`).",
    props: z.object({
      title: z.string().optional(),
      items: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "AllocationChart",
    group: "intelligence",
    description:
      "Donut breakdown of budget, headcount, or compute allocation. Show when visualizing portfolio weights, engineering split, or budget caps (`allocations: [{label, value}]`, `unit?`).",
    props: z.object({
      allocations: z.array(
        z.object({ label: z.string(), value: z.number() }).passthrough(),
      ),
      title: z.string().optional(),
      unit: z.string().optional(),
    }),
  },
  {
    name: "ScenarioPlanner",
    group: "intelligence",
    description:
      "Interactive multi-lever scenario simulator recalculating target outcome live. Show when letting users tweak growth/cost levers to see instant outcomes (`baseline`, `levers: [{key, label, value, min, max, step?, multiplier?, unit?}]`, `unit?`).",
    props: z.object({
      baseline: z.number(),
      levers: z.array(IntelDataObjectSchema),
      title: z.string().optional(),
      unit: z.string().optional(),
    }),
  },
  {
    name: "ImpactAnalysis",
    group: "intelligence",
    description:
      "Assesses downstream effects of a proposed change across system domains. Show when reviewing breaking changes, migrations, or policy updates (`impacts: [{domain, severity, effect}]`).",
    props: z.object({
      title: z.string().optional(),
      impacts: z.array(
        z
          .object({
            domain: z.string(),
            severity: z.string(),
            effect: z.string(),
          })
          .passthrough(),
      ),
    }),
  },
  {
    name: "OptionEvaluation",
    group: "intelligence",
    description:
      "Ranked alternative cards with 0-100 progress scores and recommendation tag. Show when ranking shortlisted libraries, vendors, or architecture paths (`options: [{name, score, summary, recommended?}]`).",
    props: z.object({
      title: z.string().optional(),
      options: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "RiskRegister",
    group: "intelligence",
    description:
      "Formal risk register table with ID, severity, owner, and mitigation plan. Show when maintaining tracked project, security, or compliance risks (`risks: [{title, severity, owner, mitigation, id?}]`).",
    props: z.object({
      title: z.string().optional(),
      risks: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "DecisionRecord",
    group: "intelligence",
    description:
      "Architecture Decision Record (ADR) capturing context, decision, and consequences. Show when recording finalized architectural or engineering decisions cleanly (`title`, `context`, `decision`, `consequences: string[]`, `status?`).",
    props: z.object({
      title: z.string(),
      context: z.string(),
      decision: z.string(),
      consequences: z.array(z.string()),
      status: z.string().optional(),
    }),
  },
  {
    name: "InteractiveFilter",
    group: "intelligence",
    description:
      "Multi-facet pill filter dynamically narrowing displayed items. Show when letting users filter structured findings or catalogs inline (`facets: [{key, label, options: string[]}]`, `items: [{...}]`).",
    props: z.object({
      title: z.string().optional(),
      facets: z.array(IntelDataObjectSchema),
      items: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "ParameterExplorer",
    group: "intelligence",
    description:
      "Interactive numeric sliders allowing live parameter sweeps. Show when exposing tunable numerical configuration parameters directly (`parameters: [{key, label, value, min, max, step?, unit?}]`).",
    props: z.object({
      title: z.string().optional(),
      parameters: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "WhatIfSimulator",
    group: "intelligence",
    description:
      "Live what-if revenue/cost/profit simulator recalculating outputs on drag. Show when modeling financial or capacity impact across multiple assumptions (`inputs: [{key, label, value, min, max, step?, unit?}]`, `fixedCost?`, `unitCost?`).",
    props: z.object({
      title: z.string().optional(),
      fixedCost: z.number().optional(),
      unitCost: z.number().optional(),
      inputs: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "ScenarioControls",
    group: "intelligence",
    description:
      "Preset switcher paired with scenario condition toggles. Show when switching between baseline, stress-test, and mitigation scenarios (`presets: [{label, description}]`, `toggles: [{key, label, effect?, enabled?}]`).",
    props: z.object({
      title: z.string().optional(),
      presets: z.array(IntelDataObjectSchema),
      toggles: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "GraphExplorer",
    group: "intelligence",
    description:
      "Interactive node graph with node-type filter pills and inspector. Show when letting users filter node families dynamically inside a graph (`nodes: [{id, label, type, detail?}]`, `edges: [{source, target, label?}]`).",
    props: IntelGraphPropsSchema,
  },
  {
    name: "EvidenceFilter",
    group: "intelligence",
    description:
      "Slider gate filtering claims and evidence above a minimum reliability score. Show when letting users hide low-reliability sources interactively (`evidence: [{claim, source, score}]`).",
    props: z.object({
      title: z.string().optional(),
      evidence: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "TimelineExplorer",
    group: "intelligence",
    description:
      "Scrubbable timeline slider letting users step chronologically through events. Show for stepping backward/forward through an unfolding sequence of events (`events: [{title, time, detail}]`).",
    props: z.object({
      title: z.string().optional(),
      events: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "DataDrilldown",
    group: "intelligence",
    description:
      "Hierarchical breadcrumb drilldown explorer for nested category metrics. Show when navigating multi-level breakdowns (region to city to store, or bundle to folder to file) (`levels: [{name, value, children?: [...]}]`).",
    props: z.object({
      title: z.string().optional(),
      levels: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "ComparisonSelector",
    group: "intelligence",
    description:
      "Multi-select pill chooser dynamically updating side-by-side spec cards. Show when letting users pick which shortlisted items to compare (`candidates: [{name, summary, specs: {key: value}}]`).",
    props: z.object({
      title: z.string().optional(),
      candidates: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "ConfidenceExplorer",
    group: "intelligence",
    description:
      "Interactive confidence threshold slider showing which claims clear the certainty gate. Show when inspecting sensitivity of conclusions to confidence cutoffs (`factors: [{label, confidence}]`).",
    props: z.object({
      title: z.string().optional(),
      factors: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "HypothesisSelector",
    group: "intelligence",
    description:
      "Selectable hypothesis shortlist showing prior probability and verification plan. Show when letting users pick which hypothesis to investigate next (`hypotheses: [{statement, prior, testPlan}]`).",
    props: z.object({
      title: z.string().optional(),
      hypotheses: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "AssumptionEditor",
    group: "intelligence",
    description:
      "Live editable key-value list of analytical assumptions. Show when letting users override forecast assumptions directly (`assumptions: [{label, value}]`).",
    props: z.object({
      title: z.string().optional(),
      assumptions: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "InteractiveMatrix",
    group: "intelligence",
    description:
      "Clickable matrix cells revealing detailed intersection notes on selection. Show when exploring dense 2D intersections with click-for-detail notes (`rows: string[]`, `cols: string[]`, `cells: [[{value, detail}]]`).",
    props: z.object({
      title: z.string().optional(),
      rows: z.array(z.string()),
      cols: z.array(z.string()),
      cells: z.array(z.array(IntelDataObjectSchema)),
    }),
  },
  {
    name: "MapLayerControls",
    group: "intelligence",
    description:
      "Layer visibility checkboxes with feature counts for spatial overlays. Show when controlling overlays (pins, routes, heatmap zones) on maps (`layers: [{id, name, description, featureCount, visible}]`).",
    props: z.object({
      title: z.string().optional(),
      layers: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "QueryBuilder",
    group: "intelligence",
    description:
      "Visual query filter composer generating structured filter predicates. Show when helping users build complex multi-condition queries visually (`fields: string[]`, `rules: [{field, op, value}]`).",
    props: z.object({
      title: z.string().optional(),
      fields: z.array(z.string()),
      rules: z.array(IntelDataObjectSchema),
    }),
  },
  {
    name: "InvestigationControls",
    group: "intelligence",
    description:
      "Investigation scope bar controlling time window, graph hop depth, and correlation mode. Show when scoping trace replay, log windows, or blast-radius hops (`timeWindow?`, `depth?`, `autoCorrelate?`).",
    props: z.object({
      title: z.string().optional(),
      timeWindow: z.string().optional(),
      depth: z.number().optional(),
      autoCorrelate: z.boolean().optional(),
    }),
  },
  {
    name: "IntelligenceDashboard",
    group: "intelligence",
    description:
      "Unified command dashboard pairing KPI metrics, a time-series plot, and key findings. Show when delivering a comprehensive executive intelligence dashboard (`metrics?: [{label, value, unit?, delta?, trend?, status?}]`, `series?: [{name, data: [{label, value}]}]`, `findings?: [{title, description, confidence, impact}]`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "ResearchWorkspace",
    group: "intelligence",
    description:
      "Multi-source research environment combining quantitative signals and a verified bibliography. Show when synthesizing complex multi-source research investigations (`metrics?`, `series?`, `sources?: [{source: {title, url, domain, reliability}, snippet}]`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "InvestigationWorkspace",
    group: "intelligence",
    description:
      "Evidence-driven workspace combining a causal entity-link graph with active alerts. Show when coordinating technical or security investigations (`metrics?`, `nodes?`, `edges?`, `alerts?: [{id, severity, title, description, timestamp}]`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "AnalysisWorkspace",
    group: "intelligence",
    description:
      "Quantitative breakdown paired with executive findings. Show when presenting exploratory data and KPI analysis together (`metrics?`, `series?`, `findings?`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "DecisionWorkspace",
    group: "intelligence",
    description:
      "Decision environment combining option benchmarks, dependency topology, and recommendations. Show when supporting multi-stakeholder architecture or strategy decisions (`question?`, `recommendation?`, `metrics?`, `options?: [{name, score, summary, tradeoff, recommended?}]`, `nodes?`, `edges?`, `findings?`, `nextSteps?: string[]`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "SystemInspectionWorkspace",
    group: "intelligence",
    description:
      "Technical inspection suite pairing service graph topology with system alerts. Show when inspecting distributed systems health and dependencies (`metrics?`, `nodes?`, `edges?`, `alerts?`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "IncidentResponseWorkspace",
    group: "intelligence",
    description:
      "Incident triage suite combining blast-radius topology and severity-grouped alerts. Show when coordinating live outage response (`metrics?`, `nodes?`, `edges?`, `alerts?`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "KnowledgeExplorationWorkspace",
    group: "intelligence",
    description:
      "Knowledge graph exploration paired with curated primary references. Show when exploring interconnected concepts and citing literature (`nodes?`, `edges?`, `sources?`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "ScenarioAnalysisWorkspace",
    group: "intelligence",
    description:
      "Forecast trajectories paired with analytical scenario takeaways. Show when reviewing future scenarios and capacity forecasts (`metrics?`, `series?`, `findings?`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "DataExplorationWorkspace",
    group: "intelligence",
    description:
      "Interactive KPIs, categorical plots, and detected anomalies. Show when exploring structured metrics and outliers in one view (`metrics?`, `series?`, `findings?`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "EvidenceReviewWorkspace",
    group: "intelligence",
    description:
      "Claim-evidence graph alongside primary source verification list. Show when auditing factual claims against cited sources (`metrics?`, `nodes?`, `edges?`, `sources?`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "ArchitectureReviewWorkspace",
    group: "intelligence",
    description:
      "Layered architecture topology paired with audit findings and scores. Show when conducting formal software architecture reviews (`metrics?`, `nodes?`, `edges?`, `findings?`).",
    props: IntelWorkspacePropsSchema,
  },
  {
    name: "CatalogShelf",
    group: "collections",
    description:
      "Expandable media/work catalog (album discography with tracklists, filmography with episodes, book series, or software releases) featuring optional 1:1 cover art, release year/type badge, summary, and interactive child items.",
    props: z.object({
      title: z.string().optional(),
      items: z.array(CatalogShelfItemSchema),
      subtitle: z.string().optional(),
    }),
  },
  {
    name: "AnnotatedSheet",
    group: "editorial",
    description:
      "Interactive section-by-section annotated reader for song lyrics + verse meaning, poetry, legal clauses, or technical passages. Displays verified lines/sections alongside contextual analysis per section.",
    props: z.object({
      title: z.string().optional(),
      sections: z.array(AnnotatedSectionSchema),
      subtitle: z.string().optional(),
      meta: z.string().optional(),
    }),
  },
  {
    name: "RegionalShowcase",
    group: "editorial",
    description:
      "Lore/concept summary paired with interactive regional/era switcher tabs (e.g. how a tour narrative, cultural tradition, or product adapts across North America, Europe, and Asia/Jakarta) with local symbols and focus specs.",
    props: z.object({
      title: z.string().optional(),
      regions: z.array(RegionalEntrySchema),
      lore: z.string().optional(),
      kicker: z.string().optional(),
      subtitle: z.string().optional(),
    }),
  },
];

export const MOMO_COMPONENT_GROUPS: ComponentGroup[] = [
  {
    name: "Editorial & Core",
    components: ["Headline", "VisualDossier", "RegionalShowcase", "AnnotatedSheet", "Callout", "Code", "CodeDiffPatch", "Palette"],
  },
  {
    name: "Collections & Planning",
    components: ["CatalogShelf", "BentoGrid", "Cards", "Plan", "Steps", "Checklist", "Table", "Versus", "RecipeScalerCard"],
  },
  {
    name: "Quantitative & Visual",
    components: [
      "Stats",
      "Chart",
      "LineChart",
      "BarChart",
      "PieChart",
      "RadarChart",
      "AreaChart",
      "Gauge",
      "CostBenefitAnalysis",
    ],
  },
  {
    name: "Diagrams & Topology",
    components: [
      "Flow",
      "Diagram",
      "MindMap",
      "GanttChart",
      "KanbanBoard",
      "ArchitectureDiagram",
      "DecisionTree",
      "ClaimEvidenceMap",
    ],
  },
  {
    name: "Interactive & Spatial",
    components: [
      "Map",
      "TransitRouteCard",
      "Adjuster",
      "ConceptFlashcards",
      "Choices",
      "Quiz",
      "Followups",
    ],
  },
  {
    name: "Media",
    components: [
      "AsyncImage",
      "ImageWithCaption",
      "ImageWithCitation",
      "ImageGallery",
      "ImageComparison",
      "MoodboardMosaic",
    ],
  },
  {
    name: "Intelligence",
    components: [
      "ExecutiveSummary",
      "SituationalOverview",
      "FactCheckPanel",
      "KeyFindings",
      "NewsFeed",
      "RootCauseAnalysis",
      "SwotAnalysis",
      "TradeoffMatrix",
      "RiskMatrix",
      "QuoteExtraction",
      "DocumentDiff",
      "DataTable",
      "ComparisonTable",
      "KpiCard",
      "Timeline",
      "Scorecard",
      "EvidenceCard",
      "WeatherForecast",
    ],
  },
  {
    name: "Intel — Evidence & Research",
    components: INTEL_EVIDENCE_COMPONENTS,
  },
  {
    name: "Intel — Investigation & Monitoring",
    components: INTEL_INVESTIGATION_COMPONENTS,
  },
  {
    name: "Intel — Charts & Metrics",
    components: INTEL_CHART_COMPONENTS,
  },
  {
    name: "Intel — Graphs & Topology",
    components: INTEL_GRAPH_COMPONENTS,
  },
  {
    name: "Intel — Analysis & Decision",
    components: INTEL_ANALYSIS_COMPONENTS,
  },
  {
    name: "Intel — Interactive & Workspace",
    components: INTEL_INTERACTIVE_COMPONENTS,
  },
];

/**
 * Converts a canonical strict component ZodObject into a permissive runtime
 * schema that preserves exact top-level positional argument order and required/optional
 * arity while accepting alias subfields (`title` vs `label`), string/number unions,
 * string-vs-object list items, and custom variant names without silently dropping
 * the entire component AST node inside `@openuidev/lang-core`.
 */
export function toPermissiveRuntimePropsSchema(
  strictSchema: z.ZodObject<any>,
): z.ZodObject<any> {
  const rawShape = strictSchema.shape as Record<string, z.ZodTypeAny>;
  const permissiveShape: Record<string, z.ZodTypeAny> = {};
  for (const [key, fieldSchema] of Object.entries(rawShape)) {
    permissiveShape[key] = fieldSchema.isOptional() ? z.any().optional() : z.any();
  }
  return z.object(permissiveShape).passthrough();
}

export const MOMO_COMPONENT_PROP_ORDER: Record<string, string[]> = Object.fromEntries(
  [
    ["Stack", ["children", "gap"]],
    ...MOMO_LEAF_COMPONENT_DEFS.map((def) => [
      def.name,
      Object.keys(def.props.shape as Record<string, unknown>),
    ]),
  ],
);

const dummyLeafComponents = MOMO_LEAF_COMPONENT_DEFS.map((def) =>
  defineComponent({
    name: def.name,
    props: def.props,
    description: def.description,
    component: () => null,
  }),
);

const runtimeDummyLeafComponents = MOMO_LEAF_COMPONENT_DEFS.map((def) =>
  defineComponent({
    name: def.name,
    props: toPermissiveRuntimePropsSchema(def.props),
    description: def.description,
    component: () => null,
  }),
);

const DummyStack = defineComponent({
  name: "Stack",
  props: z.object({
    children: z.array(z.any()),
    gap: z.enum(["sm", "md", "lg"]).optional(),
  }),
  description:
    "Root layout container stacking Momo UI components vertically in order.",
  component: () => null,
});

const RuntimeDummyStack = defineComponent({
  name: "Stack",
  props: z.object({
    children: z.array(z.any()),
    gap: z.any().optional(),
  }),
  description:
    "Root layout container stacking Momo UI components vertically in order.",
  component: () => null,
});

const DUMMY_COMPONENT_BY_NAME = new Map(
  dummyLeafComponents.map((comp) => [comp.name, comp]),
);

export const momoServerLibrary = createLibrary({
  components: [DummyStack, ...dummyLeafComponents],
  componentGroups: MOMO_COMPONENT_GROUPS,
  root: "Stack",
});

export const momoRuntimeServerLibrary = createLibrary({
  components: [RuntimeDummyStack, ...runtimeDummyLeafComponents],
  componentGroups: MOMO_COMPONENT_GROUPS,
  root: "Stack",
});

/**
 * Builds a dynamic capability-subset server library for a single turn so prompts
 * only inject schemas relevant to the active UIPlan instead of dumping all 60
 * components. Client `<Renderer>` and `getMomoOpenUiJSONSchema()` retain all 60.
 */
export function createMomoSubsetServerLibrary(
  componentNames?: Iterable<string>,
) {
  if (!componentNames) return momoServerLibrary;
  const allowed = new Set(componentNames);
  if (allowed.size === 0) return momoServerLibrary;

  const selected = MOMO_LEAF_COMPONENT_DEFS.filter((d) =>
    allowed.has(d.name),
  )
    .map((d) => DUMMY_COMPONENT_BY_NAME.get(d.name))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  if (selected.length === 0) return momoServerLibrary;

  const filteredGroups = MOMO_COMPONENT_GROUPS.map((g) => ({
    ...g,
    components: g.components.filter((c) => allowed.has(c)),
  })).filter((g) => g.components.length > 0);

  return createLibrary({
    components: [DummyStack, ...selected],
    componentGroups: filteredGroups,
    root: "Stack",
  });
}

export function getMomoOpenUiJSONSchema() {
  return momoRuntimeServerLibrary.toJSONSchema();
}

const MOMO_INLINE_MODE_REPLACEMENT = `## Hybrid Markdown Prose & Inline OpenUI Lang Blocks

1. **Deep Conversational & Analytical Prose**:
   - Always write complete, thorough, well-structured Markdown prose outside the \`\`\`openui-lang\`\`\` fences that directly answers the user's question in depth (causal reasoning, background context, nuances, and practical caveats).
   - Never limit your prose to a 1-sentence intro/outro like "Here's your dashboard", and NEVER skip \`\`\`openui-lang\`\`\` on explanatory questions when visual/structured UI adds value.
2. **OpenUI Lang blocks go where they belong in the answer, not in a pile at the end**:
   - A reply may contain SEVERAL fenced \`\`\`openui-lang ... \`\`\` blocks. Put each block at the point of the answer it supports — directly after the paragraph that sets it up — then keep writing prose. The natural rhythm is prose → block → prose → block. You decide how many blocks a reply needs and where they sit; do not hold every component back for one block at the bottom.
   - Size each block to its moment: one or two components for an inline illustration (a photo, a comparison, a metric, a diagram, a set of steps), up to three or four when a later block gathers a summary or dashboard. One block is fine for a short answer; a casual answer needs none.
   - Every block is a complete, self-contained program: it starts with \`root = Stack([...])\` and defines every variable it references before its closing \`\`\`. Blocks never share variables.
   - \`Followups\` appears once, in the last block of the reply.
   - Never emit partial/delta statements without \`root = Stack([...])\`.`;

function sanitizeGeneratedOpenUiPrompt(rawPrompt: string): string {
  return rawPrompt
    .replace(
      /## Inline Mode[\s\S]*?(?=\n## Important Rules)/,
      `${MOMO_INLINE_MODE_REPLACEMENT}\n`,
    )
    .replace(
      /## Final Verification[\s\S]*?(?=\n- |\n## |$)/,
      "## Silent Completeness Check (Internal Only — Never Echo)\nSilently ensure `root = Stack(...)` is the first line inside ```openui-lang and every referenced variable is defined before closing ```. NEVER print `[Final Verification]`, `[UI Plan]`, or internal step headers in your response.\n",
    );
}

export function buildMomoOpenUiPrompt(options?: PromptOptions): string {
  return sanitizeGeneratedOpenUiPrompt(
    momoServerLibrary.prompt({
      inlineMode: true,
      ...options,
    }),
  );
}

export function buildMomoSubsetOpenUiPrompt(
  componentNames: Iterable<string> | undefined,
  options?: PromptOptions,
): string {
  return sanitizeGeneratedOpenUiPrompt(
    createMomoSubsetServerLibrary(componentNames).prompt({
      inlineMode: true,
      ...options,
    }),
  );
}

export const MOMO_OPENUI_COMPONENT_NAMES = new Set([
  "Stack",
  ...MOMO_LEAF_COMPONENT_DEFS.map((d) => d.name),
]);
