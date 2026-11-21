/**
 * Categories 02 (Remaining 8 Explanation) & 05 (Remaining 18 Analytical) Components
 */

import { registerIntelComponent } from "@/lib/intelligence/registry";
import { makeIntelSpec } from "@/lib/intelligence/specHelper";
import {
  HypothesisPanel,
  ContradictionPanel,
  AnomalyHighlight,
  UncertaintyMap,
  AssumptionPanel,
  LimitationPanel,
  InsightComparison,
  FindingDetail,
} from "@/components/intelligence/panels/ExplanationCatalogSuite";
import {
  DecisionMatrix,
  TradeoffMatrix,
  RiskMatrix,
  SwotAnalysis,
  ScenarioComparison,
  ScenarioTree,
  UncertaintyMatrix,
  SensitivityAnalysis,
  CorrelationMatrix,
  PriorityMatrix,
  AllocationChart,
  ScenarioPlanner,
  RootCauseAnalysis,
  ImpactAnalysis,
  CostBenefitAnalysis,
  OptionEvaluation,
  RiskRegister,
  DecisionRecord,
} from "@/components/intelligence/panels/AnalyticalCatalogSuite";

export function registerPanelsExtra(): void {
  /* ═══ Category 02 — Remaining 8 Explanation Components ═══ */

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "hypothesis_panel",
      category: "explanation",
      description: "Expandable hypotheses with probability bars and supporting/contradicting points.",
      dataSchema: `{ title?: string; hypotheses: { id?: string; statement: string; probability: number; status: string; supporting?: string[]; contradicting?: string[] }[] }`,
      distinguishesInference: true,
      promptSummary: "Ranked hypotheses with confidence percentages and pro/con evidence.",
      promptWhen: "Evaluating competing explanations during debugging or research.",
    }),
    component: HypothesisPanel,
    sampleData: {
      title: "Checkout Timeout Hypotheses",
      hypotheses: [
        {
          id: "h1",
          statement: "Database connection pool exhaustion under concurrent exports",
          probability: 84,
          status: "supported",
          supporting: ["Pool wait time spiked to 4.8s at 14:32", "EXPORT query held open cursor on error"],
          contradicting: ["Staging environment did not reproduce at low concurrency"],
        },
        {
          id: "h2",
          statement: "Upstream payment provider TLS handshake stall",
          probability: 28,
          status: "unlikely",
          supporting: ["Two isolated 504s logged in us-east"],
          contradicting: ["Healthcheck pings remained < 40ms throughout outage"],
        },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "contradiction_panel",
      category: "explanation",
      description: "Side-by-side comparison of conflicting claims across sources or benchmarks.",
      dataSchema: `{ title?: string; contradictions: { topic: string; severity?: string; sourceA: string; claimA: string; sourceB: string; claimB: string; resolution?: string }[] }`,
      distinguishesInference: true,
      promptSummary: "Highlights conflicting claims between sources with assessment.",
      promptWhen: "Synthesizing research where primary sources disagree.",
    }),
    component: ContradictionPanel,
    sampleData: {
      title: "Conflicting Benchmark Claims",
      contradictions: [
        {
          topic: "SSR Cold Start Overhead",
          severity: "medium",
          sourceA: "Vendor Benchmark (2024)",
          claimA: "Zero measurable cold-start penalty on edge workers.",
          sourceB: "Independent Production Trace",
          claimB: "P99 cold-start reached 380ms when loading heavy validation bundles.",
          resolution: "Vendor test omitted dynamic polyfills and large schema imports.",
        },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "anomaly_highlight",
      category: "explanation",
      description: "Spotlights unusual data points against expected baseline.",
      dataSchema: `{ title?: string; anomalies: { metric: string; severity?: string; deviation?: string; timestamp?: string; description: string; expected?: string; observed?: string }[] }`,
      promptSummary: "Highlighted deviation card comparing observed vs expected metric.",
      promptWhen: "Calling out spikes, regressions, or abnormal telemetry readings.",
    }),
    component: AnomalyHighlight,
    sampleData: {
      title: "Detected Telemetry Anomalies",
      anomalies: [
        {
          metric: "Payload Token Count",
          severity: "critical",
          deviation: "+4.2σ",
          timestamp: "14:20 UTC",
          description: "Turn 6 serialized raw JSON components into conversation history.",
          expected: "~1,200 tokens",
          observed: "14,800 tokens",
        },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "uncertainty_map",
      category: "explanation",
      description: "Maps unresolved uncertainty levels per dimension and resolution paths.",
      dataSchema: `{ title?: string; areas: { dimension: string; uncertainty: number; reason?: string; mitigation?: string }[] }`,
      phase: "P3",
      complexity: "high",
      distinguishesInference: true,
      promptSummary: "Visualizes where knowledge gaps remain high and how to resolve them.",
      promptWhen: "Being transparent about confidence gaps before major technical decisions.",
    }),
    component: UncertaintyMap,
    sampleData: {
      title: "Migration Risk Uncertainty Map",
      areas: [
        { dimension: "Peak Load Throughput", uncertainty: 72, reason: "No load test beyond 2k RPS yet", mitigation: "Run k6 stress test on staging mirror" },
        { dimension: "Schema Compatibility", uncertainty: 18, reason: "Verified with automated contract suite", mitigation: "Maintain canary dual-write 48h" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "assumption_panel",
      category: "explanation",
      description: "Interactive checklist of explicit analytical assumptions and sensitivity.",
      dataSchema: `{ title?: string; assumptions: { statement: string; sensitivity?: string; verified?: boolean; fallback?: string }[] }`,
      distinguishesInference: true,
      promptSummary: "Lists explicit assumptions underpinning a forecast or design.",
      promptWhen: "Documenting underlying premises and what breaks if they don't hold.",
    }),
    component: AssumptionPanel,
    sampleData: {
      title: "Cost Projection Assumptions",
      assumptions: [
        { statement: "Average prompt compresses by >= 70% via history summarization", sensitivity: "high", verified: true, fallback: "Trim history window to last 6 turns" },
        { statement: "Image CDN caches 85%+ repeat visual queries", sensitivity: "medium", verified: false, fallback: "Enable Edge KV cache layer" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "limitation_panel",
      category: "explanation",
      description: "Documents analytical boundaries, data blind spots, and workarounds.",
      dataSchema: `{ title?: string; limitations: { area: string; scope?: string; description: string; workaround?: string }[] }`,
      complexity: "low",
      promptSummary: "Transparent disclosure of known analysis boundaries and limits.",
      promptWhen: "Reporting caveats, sample size limits, or tooling blind spots.",
    }),
    component: LimitationPanel,
    sampleData: {
      title: "Audit Scope Limitations",
      limitations: [
        { area: "Browser Sandbox Network", scope: "Playground only", description: "External tile servers may be blocked inside restricted headless previews.", workaround: "Verify tile rendering directly in host browser" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "insight_comparison",
      category: "explanation",
      description: "Side-by-side comparison of competing or complementary insights.",
      dataSchema: `{ title?: string; insights: { title: string; confidence?: number; summary: string; points?: string[] }[] }`,
      promptSummary: "Compares multiple insights side by side with confidence scores.",
      promptWhen: "Contrasting two interpretations or conclusions cleanly.",
    }),
    component: InsightComparison,
    sampleData: {
      title: "Architecture Insight Comparison",
      insights: [
        { title: "Client-Side Filtering", confidence: 92, summary: "Instant UX for datasets under 2,000 rows.", points: ["Zero network roundtrips", "Higher initial hydration cost"] },
        { title: "Server-Side Pagination", confidence: 88, summary: "Scales cleanly to millions of rows.", points: ["Predictable memory footprint", "Requires cursor API indexing"] },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "finding_detail",
      category: "explanation",
      description: "Deep-dive view of a single finding with impact, evidence list, remediation, and raw artifact.",
      dataSchema: `{ title: string; severity?: string; summary: string; impact?: string; evidence?: string[]; remediation?: string; rawArtifact?: string }`,
      promptSummary: "Detailed inspection card for an individual analytical or security finding.",
      promptWhen: "Drilling into one concrete issue with proof and fix guidance.",
    }),
    component: FindingDetail,
    sampleData: {
      title: "Custom XYFlow Nodes Missing Handle Anchors",
      severity: "high",
      summary: "Custom node component rendered labels and badges without ReactFlow Handle elements, causing edge anchors to fail silently.",
      impact: "Edges fail to connect visually between parent and child nodes in interactive diagrams.",
      evidence: ["src/components/intelligence/graphs/IntelligenceGraph.tsx", "XYFlow runtime warning on mount"],
      remediation: "Render target and source Handle components oriented dynamically by graph direction.",
      rawArtifact: "<Handle type=\"target\" position={Position.Left} />\n<Handle type=\"source\" position={Position.Right} />",
    },
  });

  /* ═══ Category 05 — Remaining 18 Analytical Components ═══ */

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "decision_matrix",
      category: "analytical",
      description: "Interactive weighted decision table allowing live priority weight adjustments.",
      dataSchema: `{ title?: string; options: string[]; criteria: { label: string; weight: number; scores: number[] }[] }`,
      promptSummary: "Weighted multi-criteria decision matrix with live weight sliders.",
      promptWhen: "Scoring 2-5 competing choices across weighted criteria.",
    }),
    component: DecisionMatrix,
    sampleData: {
      title: "Graph Engine Selection Matrix",
      options: ["XYFlow + ELK", "Mermaid Only", "Raw Canvas"],
      criteria: [
        { label: "Node Dragging & Zoom", weight: 5, scores: [10, 2, 8] },
        { label: "Auto-Layout Quality", weight: 4, scores: [9, 8, 3] },
        { label: "React Customizability", weight: 5, scores: [10, 2, 9] },
        { label: "Bundle Simplicity", weight: 2, scores: [7, 8, 9] },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "tradeoff_matrix",
      category: "analytical",
      description: "Side-by-side matrix highlighting what each architectural choice gains and sacrifices.",
      dataSchema: `{ title?: string; options: { name: string; tag?: string; benefits: string[]; costs: string[] }[] }`,
      promptSummary: "Highlights competing benefits and sacrifices per option.",
      promptWhen: "Evaluating engineering or strategic compromises honestly.",
    }),
    component: TradeoffMatrix,
    sampleData: {
      title: "OpenUI DSL vs Raw JSON Props",
      options: [
        { name: "Compact DSL", tag: "40% fewer tokens", benefits: ["Faster TTFB", "Fewer cut-offs"], costs: ["Custom parser complexity", "Strict grammar prompt"] },
        { name: "JSON Props", tag: "Native Schema", benefits: ["Zero extra transpiler", "Standard Zod checks"], costs: ["Higher token burn", "Verbose keys"] },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "risk_matrix",
      category: "analytical",
      description: "Interactive 5×5 probability-by-impact heatmap with clickable risk items.",
      dataSchema: `{ title?: string; risks: { code?: string; title: string; probability: number; impact: number; mitigation?: string }[] }`,
      promptSummary: "5x5 probability vs impact risk grid.",
      promptWhen: "Mapping project, security, or operational risks visually.",
    }),
    component: RiskMatrix,
    sampleData: {
      title: "Launch Risk Matrix",
      risks: [
        { code: "R-1", title: "API Quota Exhaustion", probability: 4, impact: 5, mitigation: "Automatic fallback model chain + token compression" },
        { code: "R-2", title: "Slow Geocoding Timeout", probability: 3, impact: 3, mitigation: "Cache Nominatim results and fallback gracefully" },
        { code: "R-3", title: "CSS Specificity Bleed", probability: 2, impact: 2, mitigation: "Scoped intel- prefix classes" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "swot_analysis",
      category: "analytical",
      description: "Classic 2×2 SWOT strategic grid (Strengths, Weaknesses, Opportunities, Threats).",
      dataSchema: `{ title?: string; strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }`,
      promptSummary: "2x2 SWOT evaluation grid.",
      promptWhen: "Assessing internal capabilities vs external market landscape.",
    }),
    component: SwotAnalysis,
    sampleData: {
      title: "Momo Studio Strategy SWOT",
      strengths: ["180+ specialized Intelligence UI primitives", "Live DialKit parameter inspection"],
      weaknesses: ["Large client bundle if un-split"],
      opportunities: ["Exportable studio themes directly to production"],
      threats: ["Model prompt drift across providers"],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "scenario_comparison",
      category: "analytical",
      description: "Compares Conservative, Base, and Aggressive scenarios across KPIs.",
      dataSchema: `{ title?: string; scenarios: { name: string; likelihood?: string; tone?: string; outcome: string; metrics: { label: string; value: string }[] }[] }`,
      promptSummary: "Side-by-side comparison of alternative future scenarios.",
      promptWhen: "Planning financials, capacity, or product rollouts under uncertainty.",
    }),
    component: ScenarioComparison,
    sampleData: {
      title: "Q1 Growth Scenarios",
      scenarios: [
        { name: "Conservative", likelihood: "25%", tone: "warning", outcome: "Steady organic adoption", metrics: [{ label: "MAU", value: "12K" }, { label: "API Spend", value: "$1.8K" }] },
        { name: "Base Case", likelihood: "55%", tone: "blue", outcome: "Target enterprise rollout", metrics: [{ label: "MAU", value: "28K" }, { label: "API Spend", value: "$4.1K" }] },
        { name: "Breakout", likelihood: "20%", tone: "good", outcome: "Viral studio sharing", metrics: [{ label: "MAU", value: "75K" }, { label: "API Spend", value: "$9.6K" }] },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "scenario_tree",
      category: "analytical",
      description: "Interactive XYFlow branching probability tree of future outcomes.",
      dataSchema: `{ title?: string; nodes: { id: string; label: string; type?: string; detail?: string }[]; edges: { id: string; source: string; target: string; label?: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Interactive branching scenario tree.",
      promptWhen: "Exploring sequential decision branches and contingent outcomes.",
    }),
    component: ScenarioTree,
    sampleData: {
      title: "Launch Timing Scenario Tree",
      nodes: [
        { id: "n0", label: "Launch Decision", type: "decision" },
        { id: "n1", label: "Ship Studio Now", type: "option" },
        { id: "n2", label: "Wait for P3 Completion", type: "option" },
        { id: "o1", label: "Early Creator Feedback", type: "outcome", status: "success" },
        { id: "o2", label: "Higher Initial Polish, Delayed Validation", type: "outcome", status: "warning" },
      ],
      edges: [
        { id: "e1", source: "n0", target: "n1", label: "Aggressive" },
        { id: "e2", source: "n0", target: "n2", label: "Cautious" },
        { id: "e3", source: "n1", target: "o1" },
        { id: "e4", source: "n2", target: "o2" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "uncertainty_matrix",
      category: "analytical",
      description: "Best / Base / Worst case ranges across key model variables.",
      dataSchema: `{ title?: string; variables: { name: string; best: string; base: string; worst: string; volatility?: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Table of best/base/worst ranges per sensitive variable.",
      promptWhen: "Quantifying sensitivity bounds across multiple inputs.",
    }),
    component: UncertaintyMatrix,
    sampleData: {
      title: "Unit Economics Bounds",
      variables: [
        { name: "Avg Tokens / Response", best: "1,100", base: "1,850", worst: "4,200", volatility: "high" },
        { name: "Cache Hit Ratio", best: "91%", base: "82%", worst: "64%", volatility: "medium" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "sensitivity_analysis",
      category: "analytical",
      description: "Horizontal tornado sensitivity bar chart showing upside/downside swings.",
      dataSchema: `{ title?: string; targetMetric?: string; drivers: { name: string; lowDelta: number; highDelta: number }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Tornado chart quantifying how individual inputs swing an outcome metric.",
      promptWhen: "Identifying which input parameter drives the most variance.",
    }),
    component: SensitivityAnalysis,
    sampleData: {
      title: "Gross Margin Sensitivity (%pts)",
      targetMetric: "Gross Margin %",
      drivers: [
        { name: "Context Caching", lowDelta: -6.5, highDelta: 11.2 },
        { name: "Model Routing Ratio", lowDelta: -4.8, highDelta: 8.4 },
        { name: "Image CDN Hit Rate", lowDelta: -2.1, highDelta: 3.6 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "correlation_matrix",
      category: "analytical",
      description: "Symmetric heatmap of Pearson correlation coefficients (-1 to +1).",
      dataSchema: `{ title?: string; labels: string[]; matrix: number[][] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Heatmap matrix showing pairwise variable correlations.",
      promptWhen: "Inspecting multi-variable collinearity or metric relationships.",
    }),
    component: CorrelationMatrix,
    sampleData: {
      title: "Metric Correlation Matrix",
      labels: ["Latency", "Tokens", "ErrorRate", "Satisfaction"],
      matrix: [
        [1.0, 0.78, 0.42, -0.68],
        [0.78, 1.0, 0.25, -0.31],
        [0.42, 0.25, 1.0, -0.84],
        [-0.68, -0.31, -0.84, 1.0],
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "priority_matrix",
      category: "analytical",
      description: "2×2 Impact vs Effort quadrant grid classifying backlog initiatives.",
      dataSchema: `{ title?: string; items: { title: string; quadrant: "quick_wins"|"major_projects"|"fill_ins"|"thankless" }[] }`,
      promptSummary: "Impact vs Effort prioritization matrix.",
      promptWhen: "Triaging roadmaps, bug queues, or feature backlogs.",
    }),
    component: PriorityMatrix,
    sampleData: {
      title: "Q4 Engineering Backlog Triage",
      items: [
        { title: "Add Handle anchors to XYFlow nodes", quadrant: "quick_wins" },
        { title: "Stream history compression", quadrant: "quick_wins" },
        { title: "Full 180+ Intelligence Studio", quadrant: "major_projects" },
        { title: "Adjust button tooltip delay", quadrant: "fill_ins" },
        { title: "Custom WebGL shader borders", quadrant: "thankless" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "allocation_chart",
      category: "analytical",
      description: "Donut breakdown of budget, headcount, or compute allocation.",
      dataSchema: `{ title?: string; unit?: string; allocations: { label: string; value: number }[] }`,
      promptSummary: "Resource allocation donut visualization.",
      promptWhen: "Visualizing portfolio weights, engineering split, or budget caps.",
    }),
    component: AllocationChart,
    sampleData: {
      title: "Engineering Sprint Allocation (%)",
      unit: "%",
      allocations: [
        { label: "Core Intelligence UI", value: 45 },
        { label: "Infra & Streaming", value: 25 },
        { label: "Studio Tooling", value: 20 },
        { label: "Reliability / Bugs", value: 10 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "scenario_planner",
      category: "analytical",
      description: "Interactive multi-lever scenario simulator recalculating target outcome live.",
      dataSchema: `{ title?: string; baseline: number; unit?: string; levers: { key: string; label: string; value: number; min: number; max: number; step?: number; multiplier?: number; unit?: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Interactive planning levers recalculating projected outcomes live.",
      promptWhen: "Letting users tweak growth/cost levers to see instant outcomes.",
    }),
    component: ScenarioPlanner,
    sampleData: {
      title: "Monthly Cloud Budget Planner",
      baseline: 1200,
      unit: "$",
      levers: [
        { key: "traffic", label: "Daily Sessions (k)", value: 20, min: 5, max: 100, step: 5, multiplier: 40, unit: "k" },
        { key: "cache", label: "Cache Savings (%)", value: 60, min: 10, max: 90, step: 5, multiplier: -12, unit: "%" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "root_cause_analysis",
      category: "analytical",
      description: "Structured root cause summary paired with categorized contributing factors.",
      dataSchema: `{ title?: string; rootCause: string; severity?: string; contributingFactors: { category: string; cause: string; weight?: string; evidence?: string }[] }`,
      promptSummary: "Root cause breakdown with contributing factors and proof.",
      promptWhen: "Summarizing postmortems or structured defect investigations.",
    }),
    component: RootCauseAnalysis,
    sampleData: {
      title: "Postmortem #109 — Truncated GenUI Responses",
      severity: "High",
      rootCause: "Fixed 8192 output token limit exceeded by uncompacted multi-turn UI JSON payloads.",
      contributingFactors: [
        { category: "Payload", cause: "Full ```ui JSON sent back in prompt history", weight: "Primary", evidence: "Turn 5 history consumed 11,400 input tokens" },
        { category: "Limit", cause: "max_tokens capped at 8192", weight: "Amplifier", evidence: "Upstream finish_reason=MAX_TOKENS" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "impact_analysis",
      category: "analytical",
      description: "Assesses downstream effects of a proposed change across system domains.",
      dataSchema: `{ title?: string; impacts: { domain: string; severity: string; effect: string }[] }`,
      promptSummary: "Domain-by-domain blast radius / consequence assessment.",
      promptWhen: "Reviewing breaking changes, migrations, or policy updates.",
    }),
    component: ImpactAnalysis,
    sampleData: {
      title: "OpenUI Registry Migration Impact",
      impacts: [
        { domain: "Prompt Context", severity: "low", effect: "Adds structured catalog hints; keeps total size bounded." },
        { domain: "Mistline Renderer", severity: "medium", effect: "Bridges snake_case IDs cleanly via fallback lookup." },
        { domain: "Playground Studio", severity: "high", effect: "Unlocks 180+ inspectable components with live DialKit tuning." },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "cost_benefit_analysis",
      category: "analytical",
      description: "Itemized monetary comparison of costs vs quantified benefits + net ROI.",
      dataSchema: `{ title?: string; unit?: string; costs: { label: string; amount: number }[]; benefits: { label: string; amount: number }[] }`,
      promptSummary: "Two-column cost vs benefit breakdown with net total.",
      promptWhen: "Evaluating ROI of infrastructure investments or tooling purchases.",
    }),
    component: CostBenefitAnalysis,
    sampleData: {
      title: "Prompt Caching Implementation ROI (Annual)",
      unit: "$",
      costs: [
        { label: "Engineering setup (16 hrs)", amount: 2400 },
        { label: "Redis cache tier", amount: 1800 },
      ],
      benefits: [
        { label: "LLM input token reduction", amount: 28500 },
        { label: "Reduced timeout retries", amount: 4200 },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "option_evaluation",
      category: "analytical",
      description: "Ranked alternative cards with 0-100 progress scores and recommendation tag.",
      dataSchema: `{ title?: string; options: { name: string; score: number; recommended?: boolean; summary: string }[] }`,
      promptSummary: "Scored candidate alternatives with clear winner callout.",
      promptWhen: "Ranking shortlisted libraries, vendors, or architecture paths.",
    }),
    component: OptionEvaluation,
    sampleData: {
      title: "Graph Layout Library Evaluation",
      options: [
        { name: "ELK.js + XYFlow", score: 94, recommended: true, summary: "Best deterministic hierarchical, tree, and force layouts with React interactive nodes." },
        { name: "Dagre Only", score: 71, recommended: false, summary: "Simple DAGs only; lacks nested containers and radial routing." },
        { name: "Static Mermaid", score: 42, recommended: false, summary: "Fast DSL but non-interactive SVG boxes with zero node dragging." },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "risk_register",
      category: "analytical",
      description: "Formal risk register table with ID, severity, owner, and mitigation plan.",
      dataSchema: `{ title?: string; risks: { id?: string; title: string; severity: string; owner: string; mitigation: string }[] }`,
      promptSummary: "Structured risk register table with owners and mitigations.",
      promptWhen: "Maintaining tracked project, security, or compliance risks.",
    }),
    component: RiskRegister,
    sampleData: {
      title: "Production Readiness Risk Register",
      risks: [
        { id: "RSK-01", title: "SSRF on image proxy", severity: "critical", owner: "Security", mitigation: "Enforce hostname allowlist + private IP block" },
        { id: "RSK-02", title: "Circular component imports", severity: "medium", owner: "Frontend", mitigation: "Strict unidirectional registry dependency" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "decision_record",
      category: "analytical",
      description: "Architecture Decision Record (ADR) capturing context, decision, and consequences.",
      dataSchema: `{ title: string; status?: string; context: string; decision: string; consequences: string[] }`,
      complexity: "low",
      promptSummary: "ADR document summarizing context, decision, and downstream effects.",
      promptWhen: "Recording finalized architectural or engineering decisions cleanly.",
    }),
    component: DecisionRecord,
    sampleData: {
      title: "ADR-014: Adopt XYFlow + ELK.js as Primary Diagram Engine",
      status: "Accepted",
      context: "Static Mermaid SVG diagrams lacked node dragging, zoom/pan controls, and detail inspectors.",
      decision: "Use XYFlow + ELK.js as the default interactive canvas while parsing legacy Mermaid diagrams automatically.",
      consequences: ["All Visual Reasoning & System diagrams become interactive", "Existing Mermaid outputs upgrade without breaking backward compatibility"],
    },
  });
}
