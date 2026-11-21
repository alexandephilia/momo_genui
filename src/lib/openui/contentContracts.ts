type Props = Record<string, unknown>;
type ContentContract = {
  requirement: string;
  fields: string[];
  accepts: (row: unknown, props: Props) => boolean;
};

const record = (value: unknown): Props =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Props : {};
const text = (v: unknown) =>
  (typeof v === "string" && v.trim().length > 0) || (typeof v === "number" && Number.isFinite(v));
const named = (row: unknown, ...keys: string[]) => keys.some(k => text(record(row)[k]));
const chartValue = (row: Props) => row.value ?? row.count ?? row.amount ?? row.share ?? row.y;
const columnName = (c: unknown) => text(c) || named(c, "key", "label", "title", "name");
const anyRecord = (row: unknown) => Object.keys(record(row)).length > 0;
const matrixRow = (row: unknown) => Array.isArray(row) && row.some(text);
const labeledValue = (row: unknown) => {
  const r = record(row);
  return named(row, "label", "name", "title", "range") &&
    ["value", "size", "count", "delta", "frequency", "amount"].some(k => text(r[k]));
};

// Same rule as the classics: a required-array intel component is meaningless without
// at least one identifiable row, so filter junk rows and drop an empty shell entirely.
// Components whose array fields are all optional (workspaces, FiveWhys narrative form)
// deliberately get no contract — a missing array would otherwise nuke a valid block.
const intelGraphContract: ContentContract = {
  requirement: "nodes: at least one identifiable node (id or label); edges optional",
  fields: ["nodes"],
  accepts: row => named(row, "id", "label", "name"),
};

// Keep legacy field names accepted by Mistline, but never pad missing data.
const contracts: Record<string, ContentContract> = {
  CatalogShelf: {
    requirement: "items: at least one named release; include verified tracks when requested, cover optional",
    fields: ["items", "albums", "releases", "entries", "title"],
    accepts: row => named(row, "title", "name", "label"),
  },
  Chart: {
    requirement: "data: labeled points with actual numeric values; missing is not zero",
    fields: ["data", "items"],
    accepts: row => {
      const value = chartValue(record(row));
      return named(row, "label", "name", "category", "title", "x") && text(value) && Number.isFinite(Number(value));
    },
  },
  Stats: {
    requirement: "items: labeled metrics with real values",
    fields: ["items", "metrics", "stats"],
    accepts: row => named(row, "label", "title", "name") && text(record(row).value ?? record(row).metric ?? record(row).amount),
  },
  Table: {
    requirement: "columns and rows: named columns and at least one populated row",
    fields: ["rows"],
    accepts: (row, { columns }) => Array.isArray(columns) && columns.some(columnName) &&
      columns.some((c, i) => {
        if (!columnName(c)) return false;
        if (Array.isArray(row)) return text(row[i]);
        const col = record(c);
        return [c, col.key, col.label, col.title, col.name].some(k => text(k) && text(record(row)[String(k)]));
      }),
  },
  Cards: {
    requirement: "items: identifiable, named entries",
    fields: ["items", "cards"],
    accepts: row => text(row) || named(row, "title", "name", "label", "headline"),
  },
  Steps: {
    requirement: "steps: concrete ordered actions or events",
    fields: ["steps", "events", "items", "milestones"],
    accepts: row => text(row) || named(row, "title", "name", "label", "event", "milestone", "headline", "summary", "description", "date"),
  },
  Checklist: {
    requirement: "items: actionable tasks with text",
    fields: ["items", "tasks"],
    accepts: row => text(row) || named(row, "text", "title", "label", "task"),
  },
  WeatherForecast: {
    requirement: "hourly/daily rows: real forecast entries with a time or day label and numeric temp or lo/hi — never invented values",
    fields: ["hourly", "daily", "hours", "week", "weekly"],
    accepts: row => named(row, "time", "day", "label") && (text(record(row).temp) || text(record(row).hi) || text(record(row).lo)),
  },
  NewsFeed: {
    requirement: "articles: real stories from this turn's web_search results, each with a headline and that result's exact url",
    fields: ["articles", "items", "stories"],
    accepts: row => named(row, "headline", "title", "name"),
  },
  Followups: {
    requirement: "items: concrete nonblank next questions",
    fields: ["items"],
    accepts: row => typeof row === "string" && text(row),
  },
  // Intel suite — required-array guards (same semantics as the classics above).
  MetricGroup: {
    requirement: "metrics: labeled metrics with real values",
    fields: ["metrics", "items"],
    accepts: row => named(row, "label", "title", "name") && text(record(row).value),
  },
  DonutChart: {
    requirement: "series: named series with a data array of labeled numeric points",
    fields: ["series"],
    accepts: row => named(row, "name", "label", "title") && Array.isArray(record(row).data),
  },
  Sparkline: {
    requirement: "values: real numeric points, never invented",
    fields: ["values", "data"],
    accepts: row => typeof row === "number" && Number.isFinite(row),
  },
  StackedBarChart: {
    requirement: "data: records carrying at least one of the declared keys",
    fields: ["data"],
    accepts: (row, { keys }) => anyRecord(row) && (!Array.isArray(keys) || keys.some(k => text(record(row)[String(k)]))),
  },
  HorizontalBarChart: {
    requirement: "items: labeled rows with real numeric values",
    fields: ["items"],
    accepts: labeledValue,
  },
  ScatterPlot: {
    requirement: "points: real x/y coordinate pairs",
    fields: ["points", "data"],
    accepts: row => text(record(row).x) && text(record(row).y),
  },
  BubbleChart: {
    requirement: "points: real x/y/z coordinates",
    fields: ["points", "data"],
    accepts: row => text(record(row).x) && text(record(row).y) && text(record(row).z),
  },
  Heatmap: {
    requirement: "values: numeric matrix rows matching rows x cols",
    fields: ["values"],
    accepts: matrixRow,
  },
  Treemap: {
    requirement: "items: named nodes with a real numeric size",
    fields: ["items"],
    accepts: row => named(row, "name", "label", "title") && text(record(row).size),
  },
  Histogram: {
    requirement: "bins: labeled ranges with real counts",
    fields: ["bins"],
    accepts: row => named(row, "range", "label", "name") && text(record(row).count),
  },
  BoxPlot: {
    requirement: "groups: labeled distributions with quartile values",
    fields: ["groups"],
    accepts: row => named(row, "label", "name", "title") && text(record(row).median ?? record(row).q3),
  },
  FunnelChart: {
    requirement: "stages: labeled stages with real numeric values",
    fields: ["stages", "items"],
    accepts: labeledValue,
  },
  SankeyDiagram: {
    requirement: "links: flows with named source and target",
    fields: ["links"],
    accepts: row => text(record(row).source) && text(record(row).target),
  },
  WaterfallChart: {
    requirement: "steps: labeled steps with real deltas",
    fields: ["steps"],
    accepts: row => named(row, "label", "name", "title") && text(record(row).delta),
  },
  PivotTable: {
    requirement: "records: populated data records",
    fields: ["records", "data"],
    accepts: anyRecord,
  },
  OutlierHighlight: {
    requirement: "points: identifiable data points",
    fields: ["points", "items"],
    accepts: row => named(row, "label", "name", "title"),
  },
  TrendAnalysis: {
    requirement: "points: labeled points with real values",
    fields: ["points", "data"],
    accepts: row => named(row, "label", "name", "title") && text(record(row).value),
  },
  DistributionAnalysis: {
    requirement: "buckets: labeled buckets with real frequencies",
    fields: ["buckets", "data"],
    accepts: row => named(row, "label", "name", "range") && text(record(row).frequency ?? record(row).count),
  },
  ForecastChart: {
    requirement: "points: labeled points with an actual or forecast value",
    fields: ["points", "data"],
    accepts: row => named(row, "label", "name", "title") &&
      (text(record(row).actual) || text(record(row).forecast) || text(record(row).value)),
  },
  AlertFeed: {
    requirement: "alerts: real alert entries with a title",
    fields: ["alerts", "items"],
    accepts: row => named(row, "title", "name", "label", "message"),
  },
  IncidentTimeline: {
    requirement: "events: concrete titled incident events",
    fields: ["events", "milestones"],
    accepts: row => named(row, "title", "name", "label", "event"),
  },
  IncidentMap: {
    requirement: "incidents: named located incidents",
    fields: ["incidents", "points"],
    accepts: row => named(row, "name", "label", "title"),
  },
  EntityTracking: {
    requirement: "entities: named tracked entities",
    fields: ["entities", "items"],
    accepts: row => named(row, "name", "label", "title"),
  },
  AnomalyDetectionPanel: {
    requirement: "detections: identifiable anomaly signals",
    fields: ["detections", "anomalies", "items"],
    accepts: row => named(row, "signal", "name", "label", "title", "metric"),
  },
  ThreatAssessment: {
    requirement: "vectors: named threat vectors",
    fields: ["vectors"],
    accepts: row => named(row, "name", "title", "label"),
  },
  SignalMonitor: {
    requirement: "signals: named monitored signals",
    fields: ["signals", "items"],
    accepts: row => named(row, "name", "label", "title"),
  },
  EventStream: {
    requirement: "events: real event entries with a message or type",
    fields: ["events", "items"],
    accepts: row => named(row, "message", "type", "title", "name", "label"),
  },
  InvestigationBoard: {
    requirement: "columns: titled board columns",
    fields: ["columns"],
    accepts: row => named(row, "title", "name", "label"),
  },
  CaseTimeline: {
    requirement: "milestones: concrete titled milestones",
    fields: ["milestones", "events"],
    accepts: row => named(row, "title", "name", "label", "event"),
  },
  IndicatorPanel: {
    requirement: "indicators: named indicators with a value or summary",
    fields: ["indicators", "items"],
    accepts: row => named(row, "name", "label", "title"),
  },
  PatternDetection: {
    requirement: "patterns: named detected patterns",
    fields: ["patterns", "items"],
    accepts: row => named(row, "name", "label", "title", "pattern"),
  },
  ChangeDetection: {
    requirement: "changes: identified before/after subjects",
    fields: ["changes", "items"],
    accepts: row => named(row, "subject", "name", "label", "title"),
  },
  CorrelationTimeline: {
    requirement: "clusters: identifiable correlation windows",
    fields: ["clusters", "items"],
    accepts: row => named(row, "window", "label", "name", "title"),
  },
  GeographicHeatmap: {
    requirement: "hotspots: named regions",
    fields: ["hotspots", "regions", "items"],
    accepts: row => named(row, "region", "name", "label", "title"),
  },
  Watchlist: {
    requirement: "items: named watched entities",
    fields: ["items", "entries"],
    accepts: row => named(row, "name", "label", "title"),
  },
  SourceList: {
    requirement: "sources: sources with a title or populated source object",
    fields: ["sources", "items"],
    accepts: row => anyRecord(record(row).source) || named(row, "title", "name", "domain", "url"),
  },
  SearchResults: {
    requirement: "results: real results with a title and url — never invented",
    fields: ["results", "items"],
    accepts: row => named(row, "title", "name", "url", "label"),
  },
  EvidenceMatrix: {
    requirement: "claims: identifiable claim rows",
    fields: ["claims"],
    accepts: row => named(row, "claim", "title", "name", "label"),
  },
  EvidenceCollection: {
    requirement: "items: titled evidence excerpts",
    fields: ["items"],
    accepts: row => named(row, "title", "name", "label", "excerpt"),
  },
  SourceComparison: {
    requirement: "sources: identified sources (title or domain)",
    fields: ["sources"],
    accepts: row => named(row, "title", "name", "domain", "label"),
  },
  SourceTimeline: {
    requirement: "sources: titled dated sources",
    fields: ["sources", "events"],
    accepts: row => named(row, "title", "name", "label", "date"),
  },
  SourceReliability: {
    requirement: "sources: identified domains with a score",
    fields: ["sources"],
    accepts: row => named(row, "domain", "name", "title", "label"),
  },
  ReferenceList: {
    requirement: "references: verifiable references with a title and url",
    fields: ["references", "items"],
    accepts: row => named(row, "title", "name", "url", "label"),
  },
  DocumentViewer: {
    requirement: "sections: headed content sections",
    fields: ["sections"],
    accepts: row => named(row, "heading", "title", "name", "content", "label"),
  },
  ArticleReader: {
    requirement: "paragraphs: nonblank article paragraphs",
    fields: ["paragraphs"],
    accepts: row => text(row),
  },
  ResearchBrief: {
    requirement: "findings: concrete nonblank findings",
    fields: ["findings"],
    accepts: row => text(row) || named(row, "title", "label"),
  },
  EvidenceTimeline: {
    requirement: "events: titled evidentiary events",
    fields: ["events"],
    accepts: row => named(row, "title", "name", "label", "event"),
  },
  SourceInspector: {
    requirement: "sources: identified sources with excerpt text",
    fields: ["sources"],
    accepts: row => named(row, "title", "domain", "name", "label", "url"),
  },
  ComparisonMatrix: {
    requirement: "criteria: labeled comparison criteria",
    fields: ["criteria"],
    accepts: row => named(row, "label", "title", "name", "criterion"),
  },
  ProsCons: {
    requirement: "pros/cons: concrete nonblank points",
    fields: ["pros", "cons"],
    accepts: row => text(row) || named(row, "label", "title"),
  },
  ReasoningSummary: {
    requirement: "steps: concrete reasoning steps",
    fields: ["steps"],
    accepts: row => text(row) || named(row, "step", "title", "label"),
  },
  HypothesisPanel: {
    requirement: "hypotheses: stated hypotheses",
    fields: ["hypotheses"],
    accepts: row => named(row, "statement", "title", "name", "label"),
  },
  ContradictionPanel: {
    requirement: "contradictions: identified conflicting topics",
    fields: ["contradictions"],
    accepts: row => named(row, "topic", "title", "claim", "label"),
  },
  AnomalyHighlight: {
    requirement: "anomalies: identified anomalies",
    fields: ["anomalies", "items"],
    accepts: row => named(row, "metric", "title", "name", "label", "description"),
  },
  UncertaintyMap: {
    requirement: "areas: identified uncertainty dimensions",
    fields: ["areas", "items"],
    accepts: row => named(row, "dimension", "title", "name", "label"),
  },
  AssumptionPanel: {
    requirement: "assumptions: concrete stated assumptions",
    fields: ["assumptions"],
    accepts: row => text(row) || named(row, "statement", "title", "label", "name"),
  },
  LimitationPanel: {
    requirement: "limitations: identified limitation areas",
    fields: ["limitations"],
    accepts: row => named(row, "area", "title", "name", "label", "description") || text(row),
  },
  InsightComparison: {
    requirement: "insights: titled insights",
    fields: ["insights"],
    accepts: row => named(row, "title", "name", "label", "summary"),
  },
  DecisionMatrix: {
    requirement: "criteria: labeled weighted criteria",
    fields: ["criteria"],
    accepts: row => named(row, "label", "title", "name", "criterion"),
  },
  ScenarioComparison: {
    requirement: "scenarios: named scenarios",
    fields: ["scenarios"],
    accepts: row => named(row, "name", "title", "label"),
  },
  UncertaintyMatrix: {
    requirement: "variables: named model variables",
    fields: ["variables"],
    accepts: row => named(row, "name", "label", "title"),
  },
  SensitivityAnalysis: {
    requirement: "drivers: named sensitivity drivers",
    fields: ["drivers"],
    accepts: row => named(row, "name", "label", "title"),
  },
  CorrelationMatrix: {
    requirement: "matrix: numeric correlation rows matching labels",
    fields: ["matrix"],
    accepts: matrixRow,
  },
  PriorityMatrix: {
    requirement: "items: titled initiatives with a quadrant",
    fields: ["items"],
    accepts: row => named(row, "title", "name", "label"),
  },
  AllocationChart: {
    requirement: "allocations: labeled shares with real numeric values",
    fields: ["allocations", "items"],
    accepts: labeledValue,
  },
  ScenarioPlanner: {
    requirement: "levers: labeled adjustable levers",
    fields: ["levers"],
    accepts: row => named(row, "label", "key", "name"),
  },
  ImpactAnalysis: {
    requirement: "impacts: identified impact domains",
    fields: ["impacts"],
    accepts: row => named(row, "domain", "title", "name", "label"),
  },
  OptionEvaluation: {
    requirement: "options: named alternatives with scores",
    fields: ["options"],
    accepts: row => named(row, "name", "title", "label"),
  },
  RiskRegister: {
    requirement: "risks: titled register entries",
    fields: ["risks"],
    accepts: row => named(row, "title", "name", "label"),
  },
  DecisionRecord: {
    requirement: "consequences: concrete nonblank consequences",
    fields: ["consequences"],
    accepts: row => text(row),
  },
  InteractiveFilter: {
    requirement: "items: populated filterable records",
    fields: ["items"],
    accepts: row => anyRecord(row) || text(row),
  },
  ParameterExplorer: {
    requirement: "parameters: labeled tunable parameters",
    fields: ["parameters"],
    accepts: row => named(row, "label", "key", "name"),
  },
  WhatIfSimulator: {
    requirement: "inputs: labeled adjustable inputs",
    fields: ["inputs"],
    accepts: row => named(row, "label", "key", "name"),
  },
  ScenarioControls: {
    requirement: "presets/toggles: labeled scenario controls",
    fields: ["presets", "toggles"],
    accepts: row => named(row, "label", "key", "name"),
  },
  EvidenceFilter: {
    requirement: "evidence: identified claims with a reliability score",
    fields: ["evidence", "items"],
    accepts: row => named(row, "claim", "label", "title", "name", "source"),
  },
  TimelineExplorer: {
    requirement: "events: titled timeline events",
    fields: ["events"],
    accepts: row => named(row, "title", "name", "label", "event"),
  },
  DataDrilldown: {
    requirement: "levels: named drilldown levels",
    fields: ["levels"],
    accepts: row => named(row, "name", "label", "title"),
  },
  ComparisonSelector: {
    requirement: "candidates: named comparison candidates",
    fields: ["candidates"],
    accepts: row => named(row, "name", "title", "label"),
  },
  ConfidenceExplorer: {
    requirement: "factors: labeled confidence factors",
    fields: ["factors"],
    accepts: row => named(row, "label", "name", "title"),
  },
  HypothesisSelector: {
    requirement: "hypotheses: stated hypotheses",
    fields: ["hypotheses"],
    accepts: row => named(row, "statement", "title", "name", "label"),
  },
  AssumptionEditor: {
    requirement: "assumptions: labeled assumptions",
    fields: ["assumptions"],
    accepts: row => named(row, "label", "name", "key"),
  },
  InteractiveMatrix: {
    requirement: "cells: matrix rows with valued cells",
    fields: ["cells"],
    accepts: row => Array.isArray(row) && row.some(cell => text(record(cell).value)),
  },
  MapLayerControls: {
    requirement: "layers: named map layers",
    fields: ["layers"],
    accepts: row => named(row, "name", "title", "label", "id"),
  },
  QueryBuilder: {
    requirement: "rules: predicates with a named field",
    fields: ["rules"],
    accepts: row => named(row, "field", "key", "name", "label"),
  },
  ...Object.fromEntries(
    [
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
      "FishboneDiagram",
      "FaultTree",
      "ScenarioTree",
      "EventCorrelationMap",
      "IncidentRelationshipGraph",
      "GraphExplorer",
    ].map(name => [name, intelGraphContract]),
  ),
};

export function finalContentProps(name: string, props: Props): Props | null {
  const contract = Object.hasOwn(contracts, name) ? contracts[name] : undefined;
  if (!contract) return props;
  const field = contract.fields.find(key => Array.isArray(props[key]));
  if (!field) return null;
  const list = props[field] as unknown[];
  const usable = list.filter(row => contract.accepts(row, props));
  if (!usable.length) return null;
  return usable.length === list.length ? props : { ...props, [field]: usable };
}

export function contentContractPrompt(allowed?: Set<string>) {
  return Object.entries(contracts)
    .filter(([name]) => !allowed || allowed.has(name))
    .map(([name, contract]) => `- ${name}: ${contract.requirement}.`)
    .join("\n");
}
