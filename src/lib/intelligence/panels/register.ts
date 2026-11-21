/**
 * Intelligence UI — Panel Components Registration
 *
 * Registers all 12 panel/metric/analytical components with
 * full 13-point specs and realistic sample data.
 */

import { registerIntelComponent } from "@/lib/intelligence/registry";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import type { ComponentType } from "react";

import Metric from "@/components/intelligence/panels/Metric";
import MetricGroup from "@/components/intelligence/panels/MetricGroup";
import DataTable from "@/components/intelligence/panels/DataTable";
import ComparisonMatrix from "@/components/intelligence/panels/ComparisonMatrix";
import ProsCons from "@/components/intelligence/panels/ProsCons";
import InsightPanel from "@/components/intelligence/panels/InsightPanel";
import KeyFindings from "@/components/intelligence/panels/KeyFindings";
import RecommendationPanel from "@/components/intelligence/panels/RecommendationPanel";
import ExplanationPanel from "@/components/intelligence/panels/ExplanationPanel";
import ConfidenceIndicator from "@/components/intelligence/panels/ConfidenceIndicator";
import ExecutiveSummary from "@/components/intelligence/panels/ExecutiveSummary";
import ReasoningSummary from "@/components/intelligence/panels/ReasoningSummary";

export function registerPanelComponents(): void {
  /* ════════════════════════════════════════════════════════
   * 1. Metric
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "metric",
      category: "data",
      description: "Single KPI display with label, large value, delta with trend arrow, status color, and optional note/sparkline.",
      dataSchema: `IntelMetricData { label: string; value: string | number; unit?: string; prefix?: string; delta?: string; trend?: "up" | "down" | "flat"; sparkline?: number[]; status?: "good" | "warning" | "critical" | "neutral"; note?: string; }`,
      propsSchema: "IntelBaseProps",
      interactions: { hoverable: true, clickable: true },
      loadingState: "skeleton",
      emptyState: "Shows label with 'No data' placeholder",
      errorState: "Red error message in metric card",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: { role: "figure", keyboardNav: false, ariaLabel: "KPI metric: {label}", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: false, requiresSources: false, distinguishesInference: false },
      renderReadiness: ["data.label is set", "data.value is set or 0"],
      phase: "P1",
      complexity: "low",
      promptSummary: "Single KPI metric with value, trend delta, and status color.",
      promptWhen: "Display a single numeric KPI, stat, or measurement with optional trend.",
      implemented: true,
    },
    component: Metric as ComponentType<IntelBaseProps>,
    sampleData: {
      label: "Monthly Revenue",
      value: 24.8,
      prefix: "$",
      unit: "K",
      delta: "+12.3%",
      trend: "up",
      status: "good",
      sparkline: [18.2, 19.4, 18.8, 20.1, 19.6, 21.3, 20.8, 22.4, 21.9, 23.1, 22.6, 24.8],
      sparkLabels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
      period: "12 bulan terakhir",
      target: 26,
      note: "vs. bulan lalu",
    },
  });

  /* ════════════════════════════════════════════════════════
   * 2. MetricGroup
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "metric_group",
      category: "data",
      description: "Grid of Metric cards with auto-fit columns and optional title header.",
      dataSchema: `{ title?: string; metrics: IntelMetricData[]; }`,
      propsSchema: "IntelBaseProps",
      interactions: { hoverable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No metrics available' message",
      errorState: "Red error message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: { role: "group", keyboardNav: false, ariaLabel: "Metric group: {title}", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: false, requiresSources: false, distinguishesInference: false },
      renderReadiness: ["data.metrics is a non-empty array"],
      phase: "P1",
      complexity: "low",
      dependsOn: ["metric"],
      promptSummary: "Grid of KPI metric cards, auto-layout.",
      promptWhen: "Display multiple KPIs, stats, or measurements together in a dashboard-style grid.",
      implemented: true,
    },
    component: MetricGroup as ComponentType<IntelBaseProps>,
    sampleData: {
      title: "Q4 Performance",
      metrics: [
        { label: "Revenue", value: 142, prefix: "$", unit: "K", delta: "+18%", trend: "up" as const, status: "good" as const, sparkline: [98, 104, 101, 112, 118, 124, 131, 142] },
        { label: "Users", value: 8420, delta: "+340", trend: "up" as const, status: "good" as const, sparkline: [7200, 7450, 7380, 7810, 7960, 8120, 8280, 8420] },
        { label: "Churn", value: 2.1, unit: "%", delta: "-0.3%", trend: "down" as const, status: "good" as const, sparkline: [3.4, 3.1, 2.9, 2.8, 2.6, 2.4, 2.3, 2.1] },
        { label: "NPS", value: 72, delta: "+5", trend: "up" as const, status: "good" as const, note: "Target: 70+" },
      ],
    },
  });

  /* ════════════════════════════════════════════════════════
   * 3. DataTable
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "data_table",
      category: "data",
      description: "Sortable, filterable data table with sticky header, search input, alternating rows, and horizontal scroll on mobile.",
      dataSchema: `{ title?: string; columns: { key: string; label: string; sortable?: boolean; align?: "left"|"center"|"right"; width?: string; }[]; rows: Record<string, string|number|boolean|null>[]; searchable?: boolean; }`,
      propsSchema: "IntelBaseProps",
      interactions: { sortable: true, filterable: true, hoverable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No data available' placeholder",
      errorState: "Red error message",
      responsive: { mobile: "scroll", tablet: "scroll" },
      accessibility: { role: "table", keyboardNav: true, ariaLabel: "Data table: {title}", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: false, requiresSources: false, distinguishesInference: false },
      renderReadiness: ["data.columns is non-empty", "data.rows is non-empty"],
      phase: "P1",
      complexity: "medium",
      promptSummary: "Sortable filterable data table with sticky header.",
      promptWhen: "Display tabular data, rankings, lists of items with multiple attributes, or any structured dataset.",
      implemented: true,
    },
    component: DataTable as ComponentType<IntelBaseProps>,
    sampleData: {
      title: "Top Endpoints by Latency",
      columns: [
        { key: "endpoint", label: "Endpoint" },
        { key: "method", label: "Method", width: "80px" },
        { key: "p50", label: "P50 (ms)", align: "right" as const },
        { key: "p99", label: "P99 (ms)", align: "right" as const },
        { key: "rpm", label: "RPM", align: "right" as const },
      ],
      rows: [
        { endpoint: "/api/v1/search", method: "GET", p50: 42, p99: 380, rpm: 1240 },
        { endpoint: "/api/v1/users", method: "GET", p50: 18, p99: 95, rpm: 890 },
        { endpoint: "/api/v1/ingest", method: "POST", p50: 120, p99: 1200, rpm: 450 },
        { endpoint: "/api/v1/export", method: "POST", p50: 850, p99: 4200, rpm: 32 },
        { endpoint: "/api/v1/auth/token", method: "POST", p50: 25, p99: 110, rpm: 2100 },
      ],
    },
  });

  /* ════════════════════════════════════════════════════════
   * 4. ComparisonMatrix
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "comparison_matrix",
      category: "analytical",
      description: "Comparison table: row headers = criteria, columns = options, cells color-coded green/red/yellow, aggregate score row.",
      dataSchema: `{ title?: string; options: string[]; criteria: { label: string; values: { value: string; rating: "good"|"neutral"|"bad"; }[]; }[]; scores?: (string|number)[]; }`,
      propsSchema: "IntelBaseProps",
      interactions: { hoverable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No comparison data' placeholder",
      errorState: "Red error message",
      responsive: { mobile: "scroll", tablet: "scroll" },
      accessibility: { role: "table", keyboardNav: true, ariaLabel: "Comparison matrix: {title}", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: true, requiresSources: false, distinguishesInference: true },
      renderReadiness: ["data.options is non-empty", "data.criteria is non-empty"],
      phase: "P1",
      complexity: "medium",
      promptSummary: "Side-by-side comparison matrix with color-coded ratings.",
      promptWhen: "Compare multiple options across shared criteria, feature comparison, tool evaluation, or vendor comparison.",
      implemented: true,
    },
    component: ComparisonMatrix as ComponentType<IntelBaseProps>,
    sampleData: {
      title: "Database Comparison",
      options: ["PostgreSQL", "MongoDB", "DynamoDB"],
      criteria: [
        { label: "Query Flexibility", values: [{ value: "Excellent", rating: "good" }, { value: "Good", rating: "neutral" }, { value: "Limited", rating: "bad" }] },
        { label: "Horizontal Scaling", values: [{ value: "Moderate", rating: "neutral" }, { value: "Native", rating: "good" }, { value: "Automatic", rating: "good" }] },
        { label: "ACID Compliance", values: [{ value: "Full", rating: "good" }, { value: "Document-level", rating: "neutral" }, { value: "Item-level", rating: "bad" }] },
        { label: "Cost at Scale", values: [{ value: "Low", rating: "good" }, { value: "Medium", rating: "neutral" }, { value: "High (RCU/WCU)", rating: "bad" }] },
      ],
      scores: ["8.5/10", "7.2/10", "6.8/10"],
    },
  });

  /* ════════════════════════════════════════════════════════
   * 5. ProsCons
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "pros_cons",
      category: "analytical",
      description: "Two-column pros/cons layout: green Plus column left, red Minus column right, verdict footer.",
      dataSchema: `{ title?: string; pros: string[]; cons: string[]; verdict?: string; }`,
      propsSchema: "IntelBaseProps",
      interactions: { hoverable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No pros/cons data' placeholder",
      errorState: "Red error message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: { role: "list", keyboardNav: false, ariaLabel: "Pros and Cons: {title}", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: false, requiresSources: false, distinguishesInference: true },
      renderReadiness: ["data.pros or data.cons has at least one item"],
      phase: "P1",
      complexity: "low",
      promptSummary: "Two-column pros vs cons with verdict footer.",
      promptWhen: "Weigh advantages vs disadvantages, evaluate a decision, or present a balanced assessment of an option.",
      implemented: true,
    },
    component: ProsCons as ComponentType<IntelBaseProps>,
    sampleData: {
      title: "Migrating to Microservices",
      pros: [
        "Independent deployment and scaling per service",
        "Team autonomy: each team owns a bounded context",
        "Technology flexibility per service",
        "Fault isolation reduces blast radius",
      ],
      cons: [
        "Distributed system complexity (network failures, latency)",
        "Operational overhead: orchestration, observability, debugging",
        "Data consistency challenges across service boundaries",
        "Initial migration cost and organizational restructuring",
      ],
      verdict: "Recommended for teams with 20+ engineers and clear domain boundaries. The operational overhead is worth it past that inflection point, but premature for smaller teams.",
    },
  });

  /* ════════════════════════════════════════════════════════
   * 6. InsightPanel
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "insight_panel",
      category: "explanation",
      description: "Typed insight card with left border color by type (insight/finding/warning/observation), icon, title, body, confidence badge, expandable detail.",
      dataSchema: `{ type: "insight"|"finding"|"warning"|"observation"; title: string; body: string; confidence?: number; detail?: string; }`,
      propsSchema: "IntelBaseProps",
      interactions: { clickable: true, hoverable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No insight available' placeholder",
      errorState: "Red error message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: { role: "article", keyboardNav: true, ariaLabel: "{type}: {title}", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: true, requiresSources: false, distinguishesInference: true },
      renderReadiness: ["data.title is set", "data.body is set"],
      phase: "P1",
      complexity: "low",
      promptSummary: "Single insight/finding/warning card with confidence and expandable detail.",
      promptWhen: "Highlight a key insight, finding, warning, or observation from analysis.",
      implemented: true,
    },
    component: InsightPanel as ComponentType<IntelBaseProps>,
    sampleData: {
      type: "warning",
      title: "Memory leak detected in worker pool",
      body: "The /api/v1/export endpoint shows a steady RSS increase of ~12MB per hour under sustained load. The leak correlates with unclosed database cursors in the streaming export handler.",
      confidence: 87,
      detail: "Stack trace analysis shows that the cursor.close() call in exportHandler.ts:142 is inside a try block but not in a finally clause. When the transform stream throws mid-export, the cursor is never released. Under load testing (500 concurrent exports), the process OOM-killed after 4 hours.",
    },
  });

  /* ════════════════════════════════════════════════════════
   * 7. KeyFindings
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "key_findings",
      category: "explanation",
      description: "Numbered findings list: title, description, confidence badge (high/medium/low), impact badge, expandable evidence.",
      dataSchema: `{ title?: string; findings: { title: string; description: string; confidence: "high"|"medium"|"low"; impact?: string; evidence?: string[]; }[]; }`,
      propsSchema: "IntelBaseProps",
      interactions: { clickable: true, hoverable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No findings' placeholder",
      errorState: "Red error message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: { role: "list", keyboardNav: true, ariaLabel: "Key Findings: {title}", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: true, requiresSources: false, distinguishesInference: true },
      renderReadiness: ["data.findings is a non-empty array"],
      phase: "P1",
      complexity: "medium",
      promptSummary: "Numbered key findings list with confidence, impact, and expandable evidence.",
      promptWhen: "Present numbered research findings, audit results, analysis conclusions, or investigation outcomes.",
      implemented: true,
    },
    component: KeyFindings as ComponentType<IntelBaseProps>,
    sampleData: {
      title: "Security Audit Findings",
      findings: [
        {
          title: "SQL injection in search endpoint",
          description: "The /api/search endpoint concatenates user input directly into a SQL query without parameterization.",
          confidence: "high",
          impact: "Critical",
          evidence: [
            "src/api/search.ts:48 — raw string interpolation into query",
            "Reproduced via sqlmap with --level=3 --risk=2",
            "Database credentials exposed via UNION SELECT on information_schema",
          ],
        },
        {
          title: "JWT secret hardcoded in source",
          description: "The JWT signing secret is committed in plaintext in the config file rather than loaded from environment variables.",
          confidence: "high",
          impact: "High",
          evidence: [
            "src/config/auth.ts:12 — secret = 'super-secret-key-2024'",
            "Same secret present in git history since initial commit",
          ],
        },
        {
          title: "Rate limiting absent on auth endpoints",
          description: "Login and password reset endpoints have no rate limiting, enabling brute-force attacks.",
          confidence: "medium",
          impact: "Medium",
          evidence: [
            "No rate-limit middleware applied to /api/auth/* routes",
            "Load test achieved 50k login attempts/min without throttling",
          ],
        },
      ],
    },
  });

  /* ════════════════════════════════════════════════════════
   * 8. RecommendationPanel
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "recommendation_panel",
      category: "explanation",
      description: "Actionable recommendation card: priority badge (critical/high/medium/low), title, description, implementation steps mini-checklist, impact/effort tags, Apply button.",
      dataSchema: `{ priority: "critical"|"high"|"medium"|"low"; title: string; description: string; steps?: string[]; impact?: string; effort?: string; actionLabel?: string; }`,
      propsSchema: "IntelBaseProps",
      interactions: { clickable: true, hoverable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No recommendation' placeholder",
      errorState: "Red error message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: { role: "article", keyboardNav: true, ariaLabel: "{priority} recommendation: {title}", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: true, requiresSources: false, distinguishesInference: true },
      renderReadiness: ["data.title is set", "data.priority is set"],
      phase: "P1",
      complexity: "medium",
      promptSummary: "Actionable recommendation with priority, steps checklist, and Apply button.",
      promptWhen: "Recommend a specific action, fix, optimization, or improvement with implementation steps.",
      implemented: true,
    },
    component: RecommendationPanel as ComponentType<IntelBaseProps>,
    sampleData: {
      priority: "high",
      title: "Add connection pooling to database layer",
      description: "The application creates a new database connection for every request. Under load, this exhausts the connection limit (max_connections=100) and causes cascading failures.",
      steps: [
        "Install pg-pool or use the built-in Pool from 'pg'",
        "Configure pool with min:5, max:20, idleTimeoutMillis:30000",
        "Replace db.connect() calls with pool.query()",
        "Add connection pool metrics to monitoring dashboard",
        "Load test with 500 concurrent connections",
      ],
      impact: "High — eliminates connection exhaustion under load",
      effort: "2-3 hours",
      actionLabel: "Apply Fix",
    },
  });

  /* ════════════════════════════════════════════════════════
   * 9. ExplanationPanel
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "explanation_panel",
      category: "explanation",
      description: "Structured explanation: collapsible Summary, Reasoning Steps (numbered), Evidence (source links), and Conclusion sections.",
      dataSchema: `{ title?: string; summary: string; steps?: string[]; evidence?: { label: string; url?: string; }[]; conclusion?: string; }`,
      propsSchema: "IntelBaseProps",
      interactions: { clickable: true, hoverable: true, toggleable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No explanation available' placeholder",
      errorState: "Red error message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: { role: "article", keyboardNav: true, ariaLabel: "Explanation: {title}", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: true, requiresSources: false, distinguishesInference: true },
      renderReadiness: ["data.summary is set"],
      phase: "P1",
      complexity: "medium",
      promptSummary: "Structured explanation with collapsible sections: summary, steps, evidence, conclusion.",
      promptWhen: "Explain a complex topic, reasoning chain, decision rationale, or technical concept with structured sections.",
      implemented: true,
    },
    component: ExplanationPanel as ComponentType<IntelBaseProps>,
    sampleData: {
      title: "Why React Server Components improve TTFB",
      summary: "React Server Components (RSC) reduce Time to First Byte by moving rendering to the server, eliminating client-side JavaScript for non-interactive parts of the page, and streaming HTML as it becomes available.",
      steps: [
        "Client requests a page — the server begins rendering immediately",
        "Server components render on the server without shipping their JS bundle to the client",
        "HTML streams to the browser as each component resolves, enabling progressive rendering",
        "Client components hydrate only the interactive islands, reducing total JS parse/execute time",
        "Subsequent navigations fetch only the changed RSC payload, not full page HTML",
      ],
      evidence: [
        { label: "Next.js App Router Architecture", url: "https://nextjs.org/docs/app" },
        { label: "React RFC: Server Components", url: "https://github.com/reactjs/rfcs/pull/188" },
        { label: "Vercel benchmark: 40% TTFB improvement", url: "https://vercel.com/blog/react-server-components" },
      ],
      conclusion: "For content-heavy pages with limited interactivity, RSC can cut TTFB by 30-50% while reducing client bundle size. The tradeoff is increased server compute and a mental model shift for developers.",
    },
  });

  /* ════════════════════════════════════════════════════════
   * 10. ConfidenceIndicator
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "confidence_indicator",
      category: "explanation",
      description: "Visual confidence display: filled bar or ring, 0-100 value, color gradient green→yellow→red, label text.",
      dataSchema: `{ value: number; label?: string; variant?: "bar"|"ring"; }`,
      propsSchema: "IntelBaseProps",
      interactions: { hoverable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No confidence data' placeholder",
      errorState: "Red error message",
      responsive: { mobile: "adapt", tablet: "full" },
      accessibility: { role: "meter", keyboardNav: false, ariaLabel: "Confidence: {label}", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: false, requiresSources: false, distinguishesInference: false },
      renderReadiness: ["data.value is a number between 0 and 100"],
      phase: "P1",
      complexity: "low",
      promptSummary: "Visual confidence indicator bar or ring, 0-100, color-coded.",
      promptWhen: "Show a confidence level, certainty score, probability, or quality metric as a visual gauge.",
      implemented: true,
    },
    component: ConfidenceIndicator as ComponentType<IntelBaseProps>,
    sampleData: { value: 82, label: "Analysis Confidence", variant: "bar" },
  });

  /* ════════════════════════════════════════════════════════
   * 11. ExecutiveSummary
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "executive_summary",
      category: "explanation",
      description: "High-level overview: title, key takeaways bullets, stats bar (mini metrics), tone indicator, expandable detail.",
      dataSchema: `{ title: string; takeaways: string[]; stats?: { label: string; value: string|number; trend?: "up"|"down"|"flat"; }[]; tone?: "neutral"|"positive"|"warning"|"critical"; detail?: string; }`,
      propsSchema: "IntelBaseProps",
      interactions: { clickable: true, hoverable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No summary available' placeholder",
      errorState: "Red error message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: { role: "article", keyboardNav: true, ariaLabel: "Executive Summary: {title}", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: true, requiresSources: false, distinguishesInference: true },
      renderReadiness: ["data.title is set", "data.takeaways is non-empty"],
      phase: "P1",
      complexity: "medium",
      promptSummary: "Executive summary with takeaways, mini stats, and tone indicator.",
      promptWhen: "Provide a high-level executive overview, report summary, or briefing with key takeaways and metrics.",
      implemented: true,
    },
    component: ExecutiveSummary as ComponentType<IntelBaseProps>,
    sampleData: {
      title: "Q4 Platform Health Report",
      takeaways: [
        "Overall uptime improved to 99.97%, exceeding the 99.95% SLA target",
        "API latency P99 reduced by 23% after connection pooling rollout",
        "Three critical vulnerabilities identified and patched within 48h",
        "User growth accelerated 18% MoM, driven by the new onboarding flow",
      ],
      stats: [
        { label: "Uptime", value: "99.97%", trend: "up" as const },
        { label: "P99 Latency", value: "180ms", trend: "down" as const },
        { label: "Active Users", value: "8.4K", trend: "up" as const },
        { label: "Error Rate", value: "0.12%", trend: "down" as const },
      ],
      tone: "positive",
      detail: "The platform entered Q4 with strong momentum from the September infrastructure overhaul. The migration to connection pooling (completed Oct 12) was the single largest contributor to latency improvements. Security posture hardened significantly after the October audit, with all critical findings remediated within the sprint. The onboarding A/B test showed a 34% improvement in day-7 retention for the new flow, which was promoted to 100% rollout on November 1.",
    },
  });

  /* ════════════════════════════════════════════════════════
   * 12. ReasoningSummary
   * ════════════════════════════════════════════════════════ */
  registerIntelComponent({
    spec: {
      componentId: "reasoning_summary",
      category: "explanation",
      description: "Reasoning chain: outcome statement, numbered step-by-step reasoning, evidence links, confidence level.",
      dataSchema: `{ outcome: string; steps: { step: string; detail?: string; }[]; evidence?: { label: string; url?: string; }[]; confidence?: number; }`,
      propsSchema: "IntelBaseProps",
      interactions: { hoverable: true },
      loadingState: "skeleton",
      emptyState: "Shows 'No reasoning data' placeholder",
      errorState: "Red error message",
      responsive: { mobile: "stack", tablet: "full" },
      accessibility: { role: "article", keyboardNav: true, ariaLabel: "Reasoning Summary", reducedMotion: true, highContrast: true },
      sourceContract: { supportsCitations: true, requiresSources: false, distinguishesInference: true },
      renderReadiness: ["data.outcome is set", "data.steps is non-empty"],
      phase: "P1",
      complexity: "medium",
      promptSummary: "Step-by-step reasoning chain with outcome, evidence, and confidence.",
      promptWhen: "Show the AI's reasoning process, chain-of-thought, logical deduction, or investigative reasoning trail.",
      implemented: true,
    },
    component: ReasoningSummary as ComponentType<IntelBaseProps>,
    sampleData: {
      outcome: "The root cause of the production outage on Nov 15 was a deadlock in the payment processing queue triggered by a schema migration running during peak traffic.",
      steps: [
        { step: "Correlated the outage start time (14:32 UTC) with deployment logs", detail: "Schema migration deploy-247 started at 14:30 UTC, 2 minutes before the first alert." },
        { step: "Identified lock contention on the payments table", detail: "pg_stat_activity showed 47 blocked transactions waiting on an AccessExclusiveLock held by the ALTER TABLE." },
        { step: "Traced the deadlock chain: migration lock → payment insert → notification trigger → payment read", detail: "The notification trigger performs a SELECT on the same payments table, creating a circular dependency under the exclusive lock." },
        { step: "Verified the fix: use CREATE INDEX CONCURRENTLY and avoid ALTER TABLE during peak hours" },
      ],
      evidence: [
        { label: "PagerDuty Incident #4821", url: "https://pagerduty.com/incidents/4821" },
        { label: "PostgreSQL Lock Monitoring Docs", url: "https://www.postgresql.org/docs/current/monitoring-locks.html" },
        { label: "Deploy log deploy-247" },
      ],
      confidence: 94,
    },
  });
}
