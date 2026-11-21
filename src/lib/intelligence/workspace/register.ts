/**
 * Categories 09 (All 16 Interactive) & 10 (All 12 Workspace Compositions)
 * Note: research_workspace carries secondaryCategories: ["evidence"]
 * and decision_workspace carries secondaryCategories: ["analytical"]
 * so both appear in their primary workspace family AND their domain family!
 */

import { registerIntelComponent } from "@/lib/intelligence/registry";
import { makeIntelSpec } from "@/lib/intelligence/specHelper";
import {
  InteractiveFilter,
  ParameterExplorer,
  WhatIfSimulator,
  ScenarioControls,
  GraphExplorer,
  EvidenceFilter,
  TimelineExplorer,
  DataDrilldown,
  ComparisonSelector,
  ConfidenceExplorer,
  HypothesisSelector,
  AssumptionEditor,
  InteractiveMatrix,
  MapLayerControls,
  QueryBuilder,
  InvestigationControls,
} from "@/components/intelligence/workspace/InteractiveCatalogSuite";
import {
  IntelligenceDashboard,
  ResearchWorkspace,
  InvestigationWorkspace,
  AnalysisWorkspace,
  DecisionWorkspace,
  SystemInspectionWorkspace,
  IncidentResponseWorkspace,
  KnowledgeExplorationWorkspace,
  ScenarioAnalysisWorkspace,
  DataExplorationWorkspace,
  EvidenceReviewWorkspace,
  ArchitectureReviewWorkspace,
} from "@/components/intelligence/workspace/WorkspaceCatalogSuite";

export function registerWorkspaceAndInteractive(): void {
  /* ═══ Category 09 — All 16 Interactive Intelligence Components ═══ */

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "interactive_filter",
      category: "interactive",
      description: "Multi-facet pill filter dynamically narrowing displayed items.",
      dataSchema: `{ title?: string; facets: { key: string; label: string; options: string[] }[]; items: Record<string, string>[] }`,
      phase: "P1",
      promptSummary: "Faceted filter bar updating result items live.",
      promptWhen: "Letting users filter structured findings or catalogs inline.",
    }),
    component: InteractiveFilter,
    sampleData: {
      title: "Filter Audit Items",
      facets: [
        { key: "category", label: "Area", options: ["Frontend", "Backend", "Security"] },
        { key: "priority", label: "Priority", options: ["High", "Medium"] },
      ],
      items: [
        { title: "Add Handle anchors to XYFlow nodes", category: "Frontend", priority: "High", summary: "Connects graph edges reliably." },
        { title: "Enforce 1200-char history guard", category: "Backend", priority: "High", summary: "Prevents prompt bloat." },
        { title: "Validate image proxy URLs", category: "Security", priority: "Medium", summary: "Blocks SSRF ranges." },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "parameter_explorer",
      category: "interactive",
      description: "Interactive numeric sliders allowing live parameter sweeps.",
      dataSchema: `{ title?: string; parameters: { key: string; label: string; value: number; min: number; max: number; step?: number; unit?: string }[] }`,
      phase: "P1",
      promptSummary: "Multi-parameter slider control panel.",
      promptWhen: "Exposing tunable numerical configuration parameters directly.",
    }),
    component: ParameterExplorer,
    sampleData: {
      title: "Model Decoding Parameters",
      parameters: [
        { key: "temperature", label: "Temperature", value: 0.4, min: 0, max: 1.5, step: 0.1 },
        { key: "maxTokens", label: "Max Output Tokens", value: 16384, min: 2048, max: 32768, step: 1024, unit: " tok" },
        { key: "thinkingBudget", label: "Thinking Budget", value: 2048, min: 0, max: 8192, step: 512, unit: " tok" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "what_if_simulator",
      category: "interactive",
      description: "Live what-if revenue/cost/profit simulator recalculating outputs on drag.",
      dataSchema: `{ title?: string; fixedCost?: number; unitCost?: number; inputs: { key: string; label: string; value: number; min: number; max: number; step?: number; unit?: string }[] }`,
      complexity: "high",
      promptSummary: "Client-side sensitivity simulator with instant numeric recalculation.",
      promptWhen: "Modeling financial or capacity impact across multiple assumptions.",
    }),
    component: WhatIfSimulator,
    sampleData: {
      title: "Unit Economics What-If Simulator",
      fixedCost: 4500,
      unitCost: 3,
      inputs: [
        { key: "seats", label: "Active Teams", value: 250, min: 50, max: 1000, step: 25 },
        { key: "price", label: "ARPU ($/mo)", value: 49, min: 15, max: 150, step: 5, unit: "$" },
        { key: "discount", label: "Annual Discount (%)", value: 15, min: 0, max: 40, step: 5, unit: "%" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "scenario_controls",
      category: "interactive",
      description: "Preset switcher paired with scenario condition toggles.",
      dataSchema: `{ title?: string; presets: { label: string; description: string }[]; toggles: { key: string; label: string; effect?: string; enabled?: boolean }[] }`,
      promptSummary: "Preset + toggle control strip for scenario modeling.",
      promptWhen: "Switching between baseline, stress-test, and mitigation scenarios.",
    }),
    component: ScenarioControls,
    sampleData: {
      title: "Disaster Recovery Scenario Controls",
      presets: [
        { label: "Normal Traffic", description: "Nominal routing across primary Singapore region." },
        { label: "AZ Outage Drill", description: "Simulates complete primary availability zone loss." },
      ],
      toggles: [
        { key: "readReplica", label: "Auto-promote Read Replica", effect: "RTO < 45s", enabled: true },
        { key: "cacheBypass", label: "Degrade to Static Edge Cache", effect: "Zero DB write load", enabled: false },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "graph_explorer",
      category: "interactive",
      description: "Interactive XYFlow graph with node-type filter pills and inspector.",
      dataSchema: `{ title?: string; nodes: { id: string; label: string; type: string; detail?: string }[]; edges: { id: string; source: string; target: string; label?: string }[] }`,
      complexity: "high",
      promptSummary: "Filterable interactive node graph explorer.",
      promptWhen: "Letting users filter node families dynamically inside a graph.",
    }),
    component: GraphExplorer,
    sampleData: {
      title: "Explore Ecosystem Graph",
      nodes: [
        { id: "momo", label: "Momo Core", type: "service" },
        { id: "xyflow", label: "XYFlow Engine", type: "concept" },
        { id: "dialkit", label: "DialKit Controls", type: "concept" },
        { id: "gemini", label: "Gemini 2.5", type: "external" },
      ],
      edges: [
        { id: "e1", source: "momo", target: "xyflow", label: "graphs" },
        { id: "e2", source: "momo", target: "dialkit", label: "studio" },
        { id: "e3", source: "momo", target: "gemini", label: "reasoning" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "evidence_filter",
      category: "interactive",
      description: "Slider gate filtering claims and evidence above a minimum reliability score.",
      dataSchema: `{ title?: string; evidence: { claim: string; source: string; score: number }[] }`,
      promptSummary: "Threshold-filtered evidence browser.",
      promptWhen: "Allowing users to hide low-reliability sources interactively.",
    }),
    component: EvidenceFilter,
    sampleData: {
      title: "Filter by Reliability Gate",
      evidence: [
        { claim: "Official TypeScript strict check passes", source: "tsc --noEmit", score: 98 },
        { claim: "Community forum benchmark estimate", source: "Forum thread", score: 52 },
        { claim: "Production Next.js build route check", source: "next build", score: 95 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "timeline_explorer",
      category: "interactive",
      description: "Scrubbable timeline slider letting users step chronologically through events.",
      dataSchema: `{ title?: string; events: { title: string; time: string; detail: string }[] }`,
      promptSummary: "Interactive timeline scrubber.",
      promptWhen: "Stepping backward/forward through an unfolding sequence of events.",
    }),
    component: TimelineExplorer,
    sampleData: {
      title: "Scrub Incident Replay",
      events: [
        { title: "Normal Baseline", time: "T+0m", detail: "120ms avg latency across all endpoints" },
        { title: "Traffic Surge", time: "T+5m", detail: "3.4x burst hits search route" },
        { title: "Autoscale Triggered", time: "T+8m", detail: "Provisioned +4 edge workers" },
        { title: "Stabilized", time: "T+12m", detail: "Latency back under 160ms" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "data_drilldown",
      category: "interactive",
      description: "Hierarchical breadcrumb drilldown explorer for nested category metrics.",
      dataSchema: `{ title?: string; levels: { name: string; value: string; children?: unknown[] }[] }`,
      complexity: "high",
      promptSummary: "Interactive drilldown hierarchy with breadcrumb navigation.",
      promptWhen: "Navigating multi-level breakdowns (region → city → store, or bundle → folder → file).",
    }),
    component: DataDrilldown,
    sampleData: {
      title: "Cost Drilldown Explorer",
      levels: [
        {
          name: "Inference API",
          value: "$3,400/mo",
          children: [
            { name: "Gemini 2.5 Flash", value: "$1,100/mo" },
            { name: "Gemini 2.5 Pro", value: "$2,300/mo" },
          ],
        },
        {
          name: "Search & Grounding",
          value: "$890/mo",
          children: [
            { name: "Exa Neural Search", value: "$520/mo" },
            { name: "Firecrawl", value: "$370/mo" },
          ],
        },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "comparison_selector",
      category: "interactive",
      description: "Multi-select pill chooser dynamically updating side-by-side spec cards.",
      dataSchema: `{ title?: string; candidates: { name: string; summary: string; specs: Record<string, string> }[] }`,
      promptSummary: "Pick any 2-3 candidates from a pool to compare side by side.",
      promptWhen: "Letting users choose which shortlisted items to compare.",
    }),
    component: ComparisonSelector,
    sampleData: {
      title: "Compare Charting Libraries",
      candidates: [
        { name: "Recharts", summary: "Composable React SVG charts.", specs: { Bundle: "130KB", Paradigm: "Declarative JSX" } },
        { name: "D3.js", summary: "Low-level mathematical data visualization primitives.", specs: { Bundle: "80KB (modular)", Paradigm: "Imperative Scales" } },
        { name: "Custom SVG", summary: "Zero dependency inline gauges and sparklines.", specs: { Bundle: "2KB", Paradigm: "Handcrafted" } },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "confidence_explorer",
      category: "interactive",
      description: "Interactive confidence threshold slider showing which claims clear the certainty gate.",
      dataSchema: `{ title?: string; factors: { label: string; confidence: number }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Explores confidence margins against user-chosen acceptance thresholds.",
      promptWhen: "Inspecting sensitivity of conclusions to confidence cutoffs.",
    }),
    component: ConfidenceExplorer,
    sampleData: {
      title: "Confidence Threshold Explorer",
      factors: [
        { label: "Schema Contract Completeness", confidence: 96 },
        { label: "ELK Deterministic Layout", confidence: 88 },
        { label: "External Tile Network Latency", confidence: 58 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "hypothesis_selector",
      category: "interactive",
      description: "Selectable hypothesis shortlist showing prior probability and verification plan.",
      dataSchema: `{ title?: string; hypotheses: { statement: string; prior: number; testPlan: string }[] }`,
      promptSummary: "Interactive selector to activate a hypothesis test plan.",
      promptWhen: "Letting users pick which hypothesis to investigate next.",
    }),
    component: HypothesisSelector,
    sampleData: {
      title: "Select Next Hypothesis to Test",
      hypotheses: [
        { statement: "Browser sandbox blocks external OSM tile host", prior: 90, testPlan: "Open /playground in non-sandboxed Chromium tab and verify tile status 200." },
        { statement: "ELK layout throws on self-referencing edges", prior: 45, testPlan: "Run unit test with e.source === e.target." },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "assumption_editor",
      category: "interactive",
      description: "Live editable key-value list of analytical assumptions.",
      dataSchema: `{ title?: string; assumptions: { label: string; value: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Inline editable assumption variables.",
      promptWhen: "Letting users override forecast assumptions directly.",
    }),
    component: AssumptionEditor,
    sampleData: {
      title: "Editable Planning Assumptions",
      assumptions: [
        { label: "Daily Prompt Volume", value: "25,000 req/day" },
        { label: "Avg Compression Ratio", value: "75%" },
        { label: "Target SLA", value: "99.95%" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "interactive_matrix",
      category: "interactive",
      description: "Clickable matrix cells revealing detailed intersection notes on selection.",
      dataSchema: `{ title?: string; rows: string[]; cols: string[]; cells: { value: string; detail: string }[][] }`,
      promptSummary: "Interactive 2D inspection matrix.",
      promptWhen: "Exploring dense 2D intersections with click-for-detail notes.",
    }),
    component: InteractiveMatrix,
    sampleData: {
      title: "Surface × Rendering Mode Compatibility",
      rows: ["Chat", "Explore", "Studio"],
      cols: ["XYFlow", "Recharts", "DialKit"],
      cells: [
        [{ value: "Full", detail: "480px card + fullscreen" }, { value: "Full", detail: "Responsive container" }, { value: "Hidden", detail: "Studio-only tool" }],
        [{ value: "Spread", detail: "Wide spread canvas" }, { value: "Spread", detail: "Larger editorial fonts" }, { value: "Hidden", detail: "Studio-only tool" }],
        [{ value: "Full", detail: "Live state preview" }, { value: "Full", detail: "Live token tuning" }, { value: "Active", detail: "Docked + Floating controls" }],
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "map_layer_controls",
      category: "interactive",
      description: "Layer visibility checkboxes with feature counts for spatial overlays.",
      dataSchema: `{ title?: string; layers: { id: string; name: string; description: string; featureCount: number; visible: boolean }[] }`,
      promptSummary: "Toggle spatial map layers cleanly.",
      promptWhen: "Controlling overlays (pins, routes, heatmap zones) on maps.",
    }),
    component: MapLayerControls,
    sampleData: {
      title: "Map Overlays",
      layers: [
        { id: "pins", name: "Primary Locations", description: "Verified venues", featureCount: 12, visible: true },
        { id: "routes", name: "Transit Polyline", description: "Estimated walking/driving path", featureCount: 4, visible: true },
        { id: "heatmap", name: "Incident Density", description: "Last 24h reports", featureCount: 38, visible: false },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "query_builder",
      category: "interactive",
      description: "Visual query filter composer generating structured filter predicates.",
      dataSchema: `{ title?: string; fields: string[]; rules: { field: string; op: string; value: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Interactive structured predicate builder with live preview.",
      promptWhen: "Helping users build complex multi-condition queries visually.",
    }),
    component: QueryBuilder,
    sampleData: {
      title: "Component Catalog Query Builder",
      fields: ["category", "phase", "complexity", "implemented"],
      rules: [
        { field: "category", op: "=", value: "visual_reasoning" },
        { field: "implemented", op: "=", value: "true" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "investigation_controls",
      category: "interactive",
      description: "Investigation scope bar controlling time window, graph hop depth, and correlation mode.",
      dataSchema: `{ title?: string; timeWindow?: string; depth?: number; autoCorrelate?: boolean }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Scope controller for investigation depth and time horizon.",
      promptWhen: "Scoping trace replay, log windows, or blast-radius hops.",
    }),
    component: InvestigationControls,
    sampleData: {
      title: "Investigation Scope",
      timeWindow: "24h",
      depth: 2,
      autoCorrelate: true,
    },
  });

  /* ═══ Category 10 — All 12 Intelligence Workspace Compositions ═══ */

  const workspaces: Array<{
    id: string;
    secondary?: ("evidence" | "analytical")[];
    desc: string;
    when: string;
    cmp: typeof IntelligenceDashboard;
    sample: Record<string, unknown>;
  }> = [
    {
      id: "intelligence_dashboard",
      desc: "Unified command dashboard pairing KPI metrics, time-series plot, and key findings.",
      when: "Delivering comprehensive executive intelligence dashboards.",
      cmp: IntelligenceDashboard,
      sample: {
        title: "Momo Platform Intelligence Dashboard",
        metrics: [
          { label: "Active Panels", value: "24", delta: "+6 today", trend: "up", status: "good" },
          { label: "Signals Ingested", value: "312", delta: "+18%", trend: "up", status: "good" },
          { label: "Pipeline Uptime", value: "99.98", unit: "%", delta: "30d clean", trend: "flat", status: "good" },
        ],
        series: [
          {
            name: "Render throughput",
            data: [
              { label: "Mon", value: 420 },
              { label: "Tue", value: 510 },
              { label: "Wed", value: 580 },
              { label: "Thu", value: 640 },
              { label: "Fri", value: 790 },
            ],
          },
        ],
        findings: [
          { title: "Render latency fell under the 700ms budget", description: "GenUI panels now stream in 18% faster after registry trimming.", confidence: "high", impact: "High" },
          { title: "Interactive family leads surface usage", description: "Filter + explorer controls drive 41% of studio sessions.", confidence: "medium", impact: "Medium" },
        ],
      },
    },
    {
      id: "research_workspace",
      secondary: ["evidence"],
      desc: "Multi-source research environment combining quantitative signals and verified bibliography.",
      when: "Synthesizing complex multi-source research investigations.",
      cmp: ResearchWorkspace,
      sample: {
        title: "Multi-Source Research Workspace",
        metrics: [
          { label: "Verified Sources", value: "14", delta: "+3 this week", trend: "up", status: "good" },
          { label: "High Reliability", value: "11", delta: "79% of set", trend: "flat", status: "good" },
          { label: "Topic Coverage", value: "82", unit: "%", delta: "+9%", trend: "up", status: "good" },
        ],
        series: [
          {
            name: "Documents processed",
            data: [
              { label: "W1", value: 34 },
              { label: "W2", value: 41 },
              { label: "W3", value: 52 },
              { label: "W4", value: 48 },
              { label: "W5", value: 63 },
            ],
          },
        ],
        sources: [
          { source: { title: "XYFlow Official Reference", url: "https://reactflow.dev", domain: "reactflow.dev", reliability: "high", publishedDate: "2025" }, snippet: "Node-based UI engine for interactive graphs and workflows." },
          { source: { title: "ELK Layered Layout Docs", url: "https://eclipse.dev/elk", domain: "eclipse.dev", reliability: "high", publishedDate: "2025" }, snippet: "Layered graph layout algorithms behind the diagram renderer." },
        ],
      },
    },
    {
      id: "investigation_workspace",
      desc: "Evidence-driven workspace combining XYFlow causal graphs with active alerts.",
      when: "Coordinating technical or security investigations.",
      cmp: InvestigationWorkspace,
      sample: {
        title: "Active Investigation Workspace",
        graphTitle: "Entity link map",
        metrics: [
          { label: "Open Leads", value: "6", delta: "2 new", trend: "up", status: "warning" },
          { label: "Entities Traced", value: "23", delta: "+5", trend: "up", status: "good" },
          { label: "Correlated Events", value: "9", delta: "last 24h", trend: "flat", status: "neutral" },
        ],
        nodes: [
          { id: "n1", label: "Suspicious Login", type: "event", status: "warning" },
          { id: "n2", label: "Linked Account", type: "account", status: "warning" },
          { id: "n3", label: "Outbound Server", type: "infra", status: "error" },
          { id: "n4", label: "Phishing Domain", type: "domain" },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", label: "owns" },
          { id: "e2", source: "n2", target: "n3", label: "connects to" },
          { id: "e3", source: "n3", target: "n4", label: "resolves" },
        ],
        alerts: [
          { id: "a1", severity: "warning", title: "New entity linked to case", description: "Phishing domain shares registrar with prior incident.", timestamp: "3m ago" },
          { id: "a2", severity: "info", title: "Timeline gap flagged", description: "No events between T+40m and T+2h.", timestamp: "18m ago" },
        ],
      },
    },
    {
      id: "analysis_workspace",
      desc: "Quantitative breakdown paired with executive findings.",
      when: "Presenting exploratory data and KPI analysis together.",
      cmp: AnalysisWorkspace,
      sample: {
        title: "Quantitative Analysis Workspace",
        graphTitle: "Daily volume",
        metrics: [
          { label: "Records Analyzed", value: "48,214", delta: "+12%", trend: "up", status: "good" },
          { label: "Mean Delta", value: "+18", unit: "%", delta: "vs baseline", trend: "up", status: "good" },
          { label: "Outliers Flagged", value: "7", delta: "needs review", trend: "flat", status: "warning" },
        ],
        series: [
          {
            name: "Daily volume",
            data: [
              { label: "Mon", value: 420 },
              { label: "Tue", value: 510 },
              { label: "Wed", value: 580 },
              { label: "Thu", value: 640 },
              { label: "Fri", value: 790 },
            ],
          },
        ],
        findings: [
          { title: "Friday volume runs 88% above the weekly floor", description: "Batch jobs cluster at Friday close — capacity should follow that curve.", confidence: "high", impact: "High" },
          { title: "All 7 outliers share one ingestion path", description: "Every flagged row entered through the legacy CSV importer.", confidence: "medium", impact: "Medium" },
        ],
      },
    },
    {
      id: "decision_workspace",
      secondary: ["analytical"],
      desc: "Decision environment combining benchmarks, dependency topology, and recommendations.",
      when: "Supporting multi-stakeholder architecture or strategy decisions.",
      cmp: DecisionWorkspace,
      sample: {
        title: "Architecture Decision Workspace",
        question: "Which diagram engine should power interactive graphs?",
        recommendation: "Adopt XYFlow + ELK now; keep Mermaid as an import format only.",
        metrics: [
          { label: "Options Scored", value: "3", delta: "ranked", trend: "flat", status: "neutral" },
          { label: "Score Spread", value: "52", unit: "pts", delta: "A vs C", trend: "flat", status: "neutral" },
          { label: "Decision Confidence", value: "87", unit: "%", delta: "+4", trend: "up", status: "good" },
        ],
        options: [
          { name: "XYFlow + ELK", score: 94, recommended: true, summary: "Draggable nodes, live edge inspection, deterministic layouts.", tradeoff: "+148 KB client bundle" },
          { name: "Dagre only", score: 71, summary: "Light and fast for simple DAGs.", tradeoff: "No nested containers or radial routing" },
          { name: "Static Mermaid", score: 42, summary: "Zero runtime cost, familiar DSL.", tradeoff: "No interaction at all" },
        ],
        nodes: [
          { id: "n1", label: "Adopt XYFlow", type: "decision", status: "active" },
          { id: "n2", label: "Migration effort", type: "cost", status: "warning" },
          { id: "n3", label: "Bundle budget", type: "constraint" },
          { id: "n4", label: "Team skills", type: "capability", status: "success" },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", label: "requires" },
          { id: "e2", source: "n1", target: "n3", label: "impacts" },
          { id: "e3", source: "n4", target: "n1", label: "enables" },
        ],
        findings: [
          { title: "XYFlow covers every interaction we ship today", description: "Dragging, edge inspection, and container nodes all map to existing usage.", confidence: "high", impact: "High" },
          { title: "Bundle delta is one-time and amortizable", description: "148 KB gzip once; Mermaid conversions run at read-time for free.", confidence: "medium", impact: "Medium" },
        ],
        nextSteps: ["Ship XYFlow behind a flag to 10% of sessions", "Convert stored Mermaid diagrams on read", "Re-measure bundle size after tree-shaking"],
      },
    },
    {
      id: "system_inspection_workspace",
      desc: "Technical inspection suite pairing service graph topology with system alerts.",
      when: "Inspecting distributed systems health and dependencies.",
      cmp: SystemInspectionWorkspace,
      sample: {
        title: "System Inspection Workspace",
        graphTitle: "Service topology",
        metrics: [
          { label: "Services Online", value: "11/12", delta: "1 degraded", trend: "flat", status: "warning" },
          { label: "P99 Latency", value: "340", unit: "ms", delta: "+40ms", trend: "down", status: "warning" },
          { label: "Error Budget", value: "68", unit: "%", delta: "consumed", trend: "flat", status: "warning" },
        ],
        nodes: [
          { id: "n1", label: "Edge Load Balancer", type: "gateway", status: "active" },
          { id: "n2", label: "API Gateway", type: "service", status: "active" },
          { id: "n3", label: "Auth Service", type: "service", status: "warning" },
          { id: "n4", label: "Postgres Primary", type: "database" },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", label: "routes" },
          { id: "e2", source: "n2", target: "n3", label: "delegates" },
          { id: "e3", source: "n3", target: "n4", label: "queries" },
        ],
        alerts: [
          { id: "a1", severity: "warning", title: "Cache hit ratio fell to 81%", description: "Below the 90% floor for 22 minutes.", timestamp: "6m ago" },
          { id: "a2", severity: "success", title: "Canary deploy completed", description: "v2.14.3 promoted to 100% traffic.", timestamp: "31m ago" },
        ],
      },
    },
    {
      id: "incident_response_workspace",
      desc: "Incident triage suite combining blast-radius topology and severity-grouped alerts.",
      when: "Coordinating live outage response.",
      cmp: IncidentResponseWorkspace,
      sample: {
        title: "Incident Response Command",
        graphTitle: "Blast radius",
        metrics: [
          { label: "MTTA", value: "4", unit: "m", delta: "on-target", trend: "up", status: "good" },
          { label: "Active Sev-1", value: "1", delta: "triaging", trend: "down", status: "critical" },
          { label: "Blast Radius", value: "4", unit: "svc", delta: "contained", trend: "flat", status: "warning" },
        ],
        nodes: [
          { id: "n1", label: "Payment API", type: "service", status: "error" },
          { id: "n2", label: "Checkout Web", type: "client", status: "warning" },
          { id: "n3", label: "Ledger Service", type: "service", status: "warning" },
          { id: "n4", label: "Webhook Queue", type: "queue" },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", label: "serves" },
          { id: "e2", source: "n1", target: "n3", label: "writes" },
          { id: "e3", source: "n3", target: "n4", label: "enqueues" },
        ],
        alerts: [
          { id: "a1", severity: "critical", title: "Payment API 5xx spike", description: "12% error rate since 14:02 UTC.", timestamp: "2m ago" },
          { id: "a2", severity: "warning", title: "Webhook queue lagging 40s", description: "Consumer offset behind by ~8k events.", timestamp: "7m ago" },
        ],
      },
    },
    {
      id: "knowledge_exploration_workspace",
      desc: "Knowledge graph exploration paired with curated primary references.",
      when: "Exploring interconnected concepts and citing literature.",
      cmp: KnowledgeExplorationWorkspace,
      sample: {
        title: "Knowledge Exploration Space",
        graphTitle: "Concept map",
        nodes: [
          { id: "n1", label: "Graph Layouts", type: "concept" },
          { id: "n2", label: "Layered DAG", type: "concept" },
          { id: "n3", label: "ELK Engine", type: "tool", status: "active" },
          { id: "n4", label: "Force-Directed", type: "concept" },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", label: "includes" },
          { id: "e2", source: "n2", target: "n3", label: "implemented by" },
          { id: "e3", source: "n1", target: "n4", label: "alternative" },
        ],
        sources: [
          { source: { title: "ELK Layered Algorithm", url: "https://eclipse.dev/elk", domain: "eclipse.dev", reliability: "high", publishedDate: "2025" }, snippet: "Sugiyama-style layered layout with crossing minimization." },
          { source: { title: "Force Atlas 2", url: "https://journals.plos.org", domain: "journals.plos.org", reliability: "medium", publishedDate: "2014" }, snippet: "Force-directed layout for network visualization." },
        ],
      },
    },
    {
      id: "scenario_analysis_workspace",
      desc: "Forecast trajectories paired with analytical scenario takeaways.",
      when: "Reviewing future scenarios and capacity forecasts.",
      cmp: ScenarioAnalysisWorkspace,
      sample: {
        title: "Scenario Analysis Workspace",
        graphTitle: "Forecast trajectories",
        metrics: [
          { label: "Scenarios Modeled", value: "4", delta: "FY26", trend: "flat", status: "neutral" },
          { label: "Base CAGR", value: "6.2", unit: "%", delta: "consensus", trend: "up", status: "good" },
          { label: "Risk Band", value: "±14", unit: "%", delta: "90% CI", trend: "flat", status: "warning" },
        ],
        series: [
          {
            name: "Baseline",
            data: [
              { label: "Q1", value: 100 },
              { label: "Q2", value: 106 },
              { label: "Q3", value: 112 },
              { label: "Q4", value: 119 },
            ],
          },
          {
            name: "Stressed",
            data: [
              { label: "Q1", value: 100 },
              { label: "Q2", value: 97 },
              { label: "Q3", value: 101 },
              { label: "Q4", value: 104 },
            ],
          },
        ],
        findings: [
          { title: "Stressed case stays positive after the Q2 shock", description: "Recovery slope steepens once churn normalizes.", confidence: "medium", impact: "High" },
          { title: "Churn dominates the sensitivity table", description: "±1pt churn swings CAGR by ±3.8pts — the single largest factor.", confidence: "high", impact: "High" },
        ],
      },
    },
    {
      id: "data_exploration_workspace",
      desc: "Interactive KPIs, categorical plots, and detected anomalies.",
      when: "Exploring structured metrics and outliers in one view.",
      cmp: DataExplorationWorkspace,
      sample: {
        title: "Data Exploration Workspace",
        graphTitle: "Orders per day",
        metrics: [
          { label: "Rows Scanned", value: "48k", delta: "full table", trend: "flat", status: "neutral" },
          { label: "Fields Profiled", value: "16", delta: "4 numeric", trend: "flat", status: "neutral" },
          { label: "Anomalies", value: "5", delta: "2 critical", trend: "down", status: "critical" },
        ],
        series: [
          {
            name: "Orders",
            data: [
              { label: "Mon", value: 318 },
              { label: "Tue", value: 402 },
              { label: "Wed", value: 371 },
              { label: "Thu", value: 455 },
              { label: "Fri", value: 520 },
            ],
          },
        ],
        findings: [
          { title: "5 anomalies cluster in the returns field", description: "Negative quantities are refund rows, not ingestion errors.", confidence: "high", impact: "Medium" },
          { title: "Numeric fields are right-skewed", description: "Median is a better summary stat than mean for this table.", confidence: "medium", impact: "Low" },
        ],
      },
    },
    {
      id: "evidence_review_workspace",
      desc: "Claim-evidence graph alongside primary source verification list.",
      when: "Auditing factual claims against cited sources.",
      cmp: EvidenceReviewWorkspace,
      sample: {
        title: "Evidence Review Workspace",
        graphTitle: "Claim-evidence map",
        metrics: [
          { label: "Claims Mapped", value: "9", delta: "in graph", trend: "flat", status: "neutral" },
          { label: "Verified", value: "7", delta: "78%", trend: "up", status: "good" },
          { label: "Disputed", value: "2", delta: "needs review", trend: "down", status: "warning" },
        ],
        nodes: [
          { id: "n1", label: "Claim: latency improved", type: "claim", status: "success" },
          { id: "n2", label: "Benchmark run", type: "evidence", status: "active" },
          { id: "n3", label: "Forum estimate", type: "evidence", status: "warning" },
          { id: "n4", label: "Rebuttal note", type: "note" },
        ],
        edges: [
          { id: "e1", source: "n2", target: "n1", label: "supports" },
          { id: "e2", source: "n3", target: "n1", label: "weak" },
          { id: "e3", source: "n4", target: "n1", label: "disputes" },
        ],
        sources: [
          { source: { title: "Production benchmark log", url: "https://ci.example.com/runs/8812", domain: "ci.example.com", reliability: "high", publishedDate: "2025-11-18" }, snippet: "p95 render 412ms across 40 trial runs." },
          { source: { title: "Community benchmark thread", url: "https://forum.example.com/t/441", domain: "forum.example.com", reliability: "low", publishedDate: "2025-10-02" }, snippet: "Unverified user-reported timings." },
        ],
      },
    },
    {
      id: "architecture_review_workspace",
      desc: "Layered architecture topology paired with audit findings and scores.",
      when: "Conducting formal software architecture reviews.",
      cmp: ArchitectureReviewWorkspace,
      sample: {
        title: "Architecture Review Workspace",
        graphTitle: "Layered topology",
        metrics: [
          { label: "Layers Audited", value: "5", delta: "full stack", trend: "flat", status: "neutral" },
          { label: "Violations", value: "3", delta: "2 high", trend: "down", status: "warning" },
          { label: "Review Score", value: "78", unit: "/100", delta: "+6 vs last", trend: "up", status: "good" },
        ],
        nodes: [
          { id: "n1", label: "Client SPA", type: "client" },
          { id: "n2", label: "BFF Layer", type: "gateway" },
          { id: "n3", label: "Domain Services", type: "service", status: "warning" },
          { id: "n4", label: "Data Stores", type: "database" },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", label: "calls" },
          { id: "e2", source: "n2", target: "n3", label: "delegates" },
          { id: "e3", source: "n3", target: "n4", label: "persists" },
        ],
        findings: [
          { title: "Domain services bypass the BFF contract", description: "Two direct client→service calls leak auth context.", confidence: "high", impact: "High" },
          { title: "No read replica on the write path", description: "Failover needs manual promotion — RTO is unbounded.", confidence: "high", impact: "High" },
        ],
      },
    },
  ];

  for (const w of workspaces) {
    registerIntelComponent({
      spec: makeIntelSpec({
        componentId: w.id,
        category: "workspace",
        secondaryCategories: w.secondary,
        description: w.desc,
        dataSchema: `{ title?: string; subtitle?: string; metrics?: IntelMetricData[]; nodes?: unknown[]; edges?: unknown[]; series?: unknown[]; findings?: unknown[]; alerts?: unknown[]; sources?: unknown[]; /* decision_workspace only: */ question?: string; recommendation?: string; options?: { name: string; score?: number; summary?: string; tradeoff?: string; recommended?: boolean }[]; nextSteps?: string[] }`,
        phase: "P3",
        complexity: "very_high",
        minHeight: 420,
        promptSummary: w.desc,
        promptWhen: w.when,
        dependsOn: ["metric_group", "architecture_diagram", "key_findings"],
      }),
      component: w.cmp,
      sampleData: w.sample,
    });
  }
}
