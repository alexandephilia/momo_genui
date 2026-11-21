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
    description: "Interactive checkable action list for tasks, packing, or audits.",
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
    name: "RiskMatrix",
    group: "intelligence",
    description:
      "Interactive 5x5 likelihood-by-impact risk heatmap with clickable mitigation entries (`risks: [{code, title, probability: 1-5, impact: 1-5, mitigation}]`).",
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
    ],
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
