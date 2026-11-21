/**
 * Intelligence UI — Component Contract System
 *
 * Every Intelligence UI component implements this 13-point contract.
 * The registry is the single source of truth for all gen-ui capabilities.
 */

/* ═══════════════════ Surface & State ═══════════════════ */

export type IntelSurface = "chat" | "explore" | "board" | "studio";

export type IntelRenderState =
  | "loading"
  | "streaming"
  | "ready"
  | "empty"
  | "error";

export type IntelCategory =
  | "explanation"
  | "visual_reasoning"
  | "evidence"
  | "analytical"
  | "data"
  | "system"
  | "investigation"
  | "interactive"
  | "workspace";

export type IntelComplexity = "low" | "medium" | "high" | "very_high";
export type IntelPhase = "P1" | "P2" | "P3";

/* ═══════════════════ Interaction Contract ═══════════════════ */

export interface IntelInteraction {
  /** User can click to drill down / expand */
  clickable?: boolean;
  /** User can drag elements (nodes, items) */
  draggable?: boolean;
  /** Supports zoom in/out */
  zoomable?: boolean;
  /** Supports pan/scroll navigation */
  pannable?: boolean;
  /** User can select items */
  selectable?: boolean;
  /** User can filter content */
  filterable?: boolean;
  /** User can sort content */
  sortable?: boolean;
  /** Supports fullscreen mode */
  fullscreen?: boolean;
  /** User can export data/image */
  exportable?: boolean;
  /** Supports hover tooltips */
  hoverable?: boolean;
  /** User can toggle layers/views */
  toggleable?: boolean;
  /** Custom interaction descriptions */
  custom?: string[];
}

/* ═══════════════════ Responsive Behavior ═══════════════════ */

export interface IntelResponsive {
  /** Minimum width before component switches to compact mode */
  compactBreakpoint?: number;
  /** Behavior on mobile: "stack" | "scroll" | "collapse" | "hide" */
  mobile: "stack" | "scroll" | "collapse" | "hide" | "adapt";
  /** Behavior on tablet */
  tablet: "full" | "compact" | "scroll";
  /** Minimum height requirement */
  minHeight?: number;
}

/* ═══════════════════ Accessibility ═══════════════════ */

export interface IntelAccessibility {
  /** ARIA role for the component root */
  role: string;
  /** Keyboard navigation supported */
  keyboardNav: boolean;
  /** Screen reader description template */
  ariaLabel: string;
  /** Supports reduced motion */
  reducedMotion: boolean;
  /** High contrast mode */
  highContrast: boolean;
}

/* ═══════════════════ Source Contract ═══════════════════ */

export interface IntelSourceContract {
  /** Component can display source citations */
  supportsCitations: boolean;
  /** Sources are required (not optional) */
  requiresSources: boolean;
  /** Distinguishes observed facts from inferences */
  distinguishesInference: boolean;
}

/* ═══════════════════ 13-Point Component Spec ═══════════════════ */

export interface IntelComponentSpec {
  /* 1  */ componentId: string;
  /* 2  */ category: IntelCategory;
  /** Additional categories where this component also appears */
  secondaryCategories?: IntelCategory[];
  /* 3  */ description: string;
  /* 4  */ dataSchema: string; // TypeScript interface as string (for catalog display)
  /* 5  */ propsSchema: string; // TypeScript interface as string
  /* 6  */ interactions: IntelInteraction;
  /* 7  */ loadingState: "skeleton" | "spinner" | "shimmer" | "pulse" | "custom";
  /* 8  */ emptyState: string; // Description of empty state behavior
  /* 9  */ errorState: string; // Description of error state behavior
  /* 10 */ responsive: IntelResponsive;
  /* 11 */ accessibility: IntelAccessibility;
  /* 12 */ sourceContract: IntelSourceContract;
  /* 13 */ renderReadiness: string[]; // Conditions for ready state

  /** Implementation metadata */
  phase: IntelPhase;
  complexity: IntelComplexity;
  /** Which existing Mistline component this replaces (if any) */
  replaces?: string;
  /** Summary for AI model prompt */
  promptSummary: string;
  /** When the AI should use this component */
  promptWhen: string;
  /** Dependencies on other Intelligence UI components */
  dependsOn?: string[];
  /** Whether this component is implemented */
  implemented: boolean;
}

/* ═══════════════════ Runtime Props ═══════════════════ */

/**
 * Base props that EVERY Intelligence UI component receives at render time.
 * Individual components extend this with their specific data/config.
 */
export interface IntelBaseProps {
  /** Component data payload */
  data: Record<string, unknown>;
  /** Presentation configuration */
  config?: Record<string, unknown>;
  /** Visual variation preset */
  variant?: string;
  /** Current render state */
  state: IntelRenderState;
  /** Which surface we're rendering on */
  surface: IntelSurface;
  /** Is the component live (interactive) or static snapshot */
  live: boolean;
  /** Is content still streaming in */
  streaming: boolean;
  /** Source citations */
  sources?: IntelSource[];
  /** Callback when user triggers an action (e.g., clicks a node, selects a filter) */
  onAction?: (action: IntelAction) => void;
  /** Callback when component is ready */
  onReady?: () => void;
  /** Callback on error */
  onError?: (message: string) => void;
  /** Callback for UI interactions (analytics, state sync) */
  onInteraction?: (event: IntelInteractionEvent) => void;
}

export interface IntelSource {
  title: string;
  url: string;
  description?: string;
  domain?: string;
  reliability?: "high" | "medium" | "low" | "unknown";
  publishedDate?: string;
}

export interface IntelAction {
  type: "navigate" | "filter" | "select" | "expand" | "send" | "export";
  payload: Record<string, unknown>;
}

export interface IntelInteractionEvent {
  componentId: string;
  interaction: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

/* ═══════════════════ Graph-specific types (XYFlow) ═══════════════════ */

export interface IntelGraphNode {
  id: string;
  label: string;
  type?: string;
  detail?: string;
  icon?: string;
  status?: "active" | "inactive" | "warning" | "error" | "success";
  metadata?: Record<string, unknown>;
  /** Sub-nodes for expandable groups */
  children?: IntelGraphNode[];
}

export interface IntelGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: "default" | "causal" | "dependency" | "data_flow" | "sequence" | "association";
  animated?: boolean;
  style?: "solid" | "dashed" | "dotted";
  strength?: number; // 0-1 for weighted edges
}

export interface IntelGraphData {
  nodes: IntelGraphNode[];
  edges: IntelGraphEdge[];
  layout?: "layered" | "force" | "radial" | "tree" | "stress" | "grid";
  direction?: "TB" | "LR" | "BT" | "RL";
}

/* ═══════════════════ Chart-specific types ═══════════════════ */

export interface IntelChartDataPoint {
  label: string;
  value: number;
  category?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface IntelChartSeries {
  name: string;
  data: IntelChartDataPoint[];
  color?: string;
  type?: "line" | "bar" | "area";
}

export interface IntelChartData {
  series: IntelChartSeries[];
  xLabel?: string;
  yLabel?: string;
  unit?: string;
  caption?: string;
}

/* ═══════════════════ Metric types ═══════════════════ */

export interface IntelMetricData {
  label: string;
  value: string | number;
  unit?: string;
  prefix?: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  sparkline?: number[];
  sparkLabels?: string[];
  period?: string;
  target?: number;
  status?: "good" | "warning" | "critical" | "neutral";
  note?: string;
}
