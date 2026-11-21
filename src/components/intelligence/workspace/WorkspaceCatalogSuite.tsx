"use client";

/**
 * Category 10 — Intelligence Workspace Compositions (12 Composite Environments)
 * Combines KPI metrics, interactive XYFlow graphs, Recharts visualizations,
 * and findings/evidence/activity panels into unified multi-panel workspaces.
 *
 * Compositions:
 * - intelligence_dashboard, research_workspace, investigation_workspace,
 *   analysis_workspace, decision_workspace, system_inspection_workspace,
 *   incident_response_workspace, knowledge_exploration_workspace,
 *   scenario_analysis_workspace, data_exploration_workspace,
 *   evidence_review_workspace, architecture_review_workspace
 */

import { useContext, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  BookOpen,
  Radar,
  BarChart3,
  ScanLine,
  Siren,
  Compass,
  GitFork,
  Database,
  ShieldCheck,
  Boxes,
  Scale,
} from "lucide-react";
import { MH } from "@/components/motion/MotionPrimitives";
import type { IntelBaseProps, IntelGraphData } from "@/lib/intelligence/types";
import IntelligenceGraph from "../graphs/IntelligenceGraph";
import MetricGroup from "../panels/MetricGroup";
import IntelLineChart from "../charts/LineChart";
import IntelBarChart from "../charts/BarChart";
import KeyFindings from "../panels/KeyFindings";
import AlertFeed from "../activity/AlertFeed";
import SourceList from "../activity/SourceList";
import { IntelCardShell, IntelVariantContext, s, a } from "../shared/IntelCardShell";
import { STAGGER_ITEM, MeterFill, useStagger } from "../shared/StateMotion";
import { Num } from "../charts/kit";

type WorkspaceBadgeTone = "blue" | "green" | "amber" | "red" | "purple" | "neutral";

interface WorkspaceConfig {
  defaultTitle: string;
  subtitle: string;
  /** Unique identity chip in the header (was a generic "Workspace" for all 12). */
  badge: string;
  badgeTone?: WorkspaceBadgeTone;
  icon: ReactNode;
  primaryPanel: "graph" | "line" | "bar";
  sidePanel: "findings" | "alerts" | "sources";
  /**
   * Layout signature per workspace family:
   * - "main-side": chart/graph left, rail right (quantitative reads)
   * - "side-main": rail left, graph right (ops: alerts first in scan order)
   * - "stack": hero main panel, rail full-width beneath (review/library reads)
   */
  arrangement: "main-side" | "side-main" | "stack";
  /** Label rendered over the metrics strip. */
  metricsTitle?: string;
}

function makeWorkspace(cfg: WorkspaceConfig): ComponentType<IntelBaseProps> {
  return function WorkspaceComposition({
    data,
    state,
    surface,
    live,
    streaming,
    sources,
    onAction,
  }: IntelBaseProps) {
    const stagger = useStagger();
    const title = s(data.title, cfg.defaultTitle);
    const metrics = a<Record<string, unknown>>(data.metrics);
    const graphNodes = a<Record<string, unknown>>(data.nodes);
    const graphEdges = a<Record<string, unknown>>(data.edges);
    const series = a<Record<string, unknown>>(data.series);
    const findings = a<Record<string, unknown>>(data.findings);
    const alerts = a<Record<string, unknown>>(data.alerts);
    const sourceItems = a<Record<string, unknown>>(data.sources);

    const hasAny =
      metrics.length > 0 ||
      graphNodes.length > 0 ||
      series.length > 0 ||
      findings.length > 0 ||
      alerts.length > 0 ||
      sourceItems.length > 0;

    const mainPanel =
      cfg.primaryPanel === "graph" && graphNodes.length > 0 ? (
        <IntelligenceGraph
          graphData={{
            nodes: graphNodes.map((nd, i) => ({
              id: s(nd.id, `wn-${i}`),
              label: s(nd.label),
              type: s(nd.type, "entity"),
              detail: s(nd.detail) || undefined,
              status: (nd.status as IntelGraphData["nodes"][number]["status"]) || undefined,
            })),
            edges: graphEdges.map((ed, i) => ({
              id: s(ed.id, `we-${i}`),
              source: s(ed.source),
              target: s(ed.target),
              label: s(ed.label) || undefined,
              type: "data_flow",
            })),
            layout: "layered",
            direction: "LR",
          }}
          title={s(data.graphTitle, "System & Relationship View")}
          height={340}
          onNodeClick={(node) => onAction?.({ type: "select", payload: { node } })}
        />
      ) : cfg.primaryPanel === "line" && series.length > 0 ? (
        <IntelLineChart
          data={{ series, unit: s(data.unit) }}
          state={state}
          surface={surface}
          live={live}
          streaming={streaming}
        />
      ) : series.length > 0 ? (
        <IntelBarChart
          data={{ series, unit: s(data.unit) }}
          state={state}
          surface={surface}
          live={live}
          streaming={streaming}
        />
      ) : null;

    const sidePanel =
      cfg.sidePanel === "alerts" && alerts.length > 0 ? (
        <AlertFeed
          data={{ alerts }}
          state={state}
          surface={surface}
          live={live}
          streaming={streaming}
        />
      ) : cfg.sidePanel === "sources" && sourceItems.length > 0 ? (
        <SourceList
          data={{ sources: sourceItems }}
          state={state}
          surface={surface}
          live={live}
          streaming={streaming}
        />
      ) : findings.length > 0 ? (
        <KeyFindings
          data={{ title: s(data.findingsTitle, "Key Findings"), findings }}
          state={state}
          surface={surface}
          live={live}
          streaming={streaming}
        />
      ) : null;

    const metaRows: Array<[string, number]> = [
      ["Metrics", metrics.length],
      ["Nodes", graphNodes.length],
      ["Edges", graphEdges.length],
      ["Series", series.length],
      ["Findings", findings.length],
      ["Alerts", alerts.length],
      ["Sources", sourceItems.length],
    ];
    const spineMeta = (
      <div className="intel-ws__meta">
        <span className="intel-ws__meta-label">Composition</span>
        {metaRows.map(([label, count]) =>
          count > 0 ? (
            <div key={label} className="intel-ws__meta-row">
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
          ) : null,
        )}
      </div>
    );

    const gridClass = `intel-workspace-grid${
      !mainPanel || !sidePanel
        ? " intel-workspace-grid--stack"
        : cfg.arrangement !== "main-side"
          ? ` intel-workspace-grid--${cfg.arrangement}`
          : ""
    }`;

    return (
      <IntelCardShell
        title={title}
        subtitle={s(data.subtitle, cfg.subtitle)}
        badge={s(data.badge, cfg.badge)}
        badgeTone={cfg.badgeTone ?? "purple"}
        icon={cfg.icon}
        spineExtra={spineMeta}
        state={state}
        streaming={streaming}
        sources={sources}
        isEmpty={!hasAny}
        emptyMessage={`No workspace panels populated for ${cfg.defaultTitle}`}
      >
        <motion.div {...stagger} className="intel-workspace-stack">
          {metrics.length > 0 && (
            <MetricGroup
              data={{ title: cfg.metricsTitle, metrics }}
              state={state}
              surface={surface}
              live={live}
              streaming={streaming}
            />
          )}

          <div className={gridClass}>
            {cfg.arrangement === "side-main" && sidePanel ? (
              <motion.div key="side" className="intel-workspace-side" variants={STAGGER_ITEM}>
                {sidePanel}
              </motion.div>
            ) : null}
            {mainPanel ? (
              <motion.div key="main" className="intel-workspace-main" variants={STAGGER_ITEM}>
                {mainPanel}
              </motion.div>
            ) : null}
            {cfg.arrangement !== "side-main" && sidePanel ? (
              <motion.div key="side" className="intel-workspace-side" variants={STAGGER_ITEM}>
                {sidePanel}
              </motion.div>
            ) : null}
          </div>
        </motion.div>
      </IntelCardShell>
    );
  };
}

export const IntelligenceDashboard = makeWorkspace({
  defaultTitle: "Intelligence Dashboard",
  subtitle: "KPI summary, trend visualization, and priority findings",
  badge: "Overview",
  icon: <LayoutDashboard size={15} />,
  primaryPanel: "line",
  sidePanel: "findings",
  arrangement: "main-side",
  metricsTitle: "Platform vitals",
});

export const ResearchWorkspace = makeWorkspace({
  defaultTitle: "Multi-Source Research Workspace",
  subtitle: "Trend signals paired with curated primary sources",
  badge: "Research",
  badgeTone: "blue",
  icon: <BookOpen size={15} />,
  primaryPanel: "bar",
  sidePanel: "sources",
  arrangement: "stack",
  metricsTitle: "Source coverage",
});

export const InvestigationWorkspace = makeWorkspace({
  defaultTitle: "Investigation Workspace",
  subtitle: "Relationship graph paired with real-time alerts",
  badge: "Ops",
  badgeTone: "amber",
  icon: <Radar size={15} />,
  primaryPanel: "graph",
  sidePanel: "alerts",
  arrangement: "side-main",
  metricsTitle: "Case vitals",
});

export const AnalysisWorkspace = makeWorkspace({
  defaultTitle: "Analytical Workspace",
  subtitle: "Quantitative breakdown paired with structured findings",
  badge: "Analytical",
  icon: <BarChart3 size={15} />,
  primaryPanel: "bar",
  sidePanel: "findings",
  arrangement: "main-side",
  metricsTitle: "Sample stats",
});

const num = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) && String(v ?? "").trim() !== "" ? x : null;
};

/**
 * Decision workspace: the question and recommendation first, then the benchmarks that
 * frame it, the ranked options, the dependency map, and the findings behind the call.
 */
export function DecisionWorkspace({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const stagger = useStagger();
  // The graph only knows its own variants; split and editorial would render nothing.
  const graphVariant = useContext(IntelVariantContext) === "minimal" ? "minimal" : "default";
  const metrics = a<Record<string, unknown>>(data.metrics);
  const graphNodes = a<Record<string, unknown>>(data.nodes);
  const graphEdges = a<Record<string, unknown>>(data.edges);
  const findings = a<Record<string, unknown>>(data.findings);
  const options = a<Record<string, unknown>>(data.options)
    .map((op) => ({ op, score: num(op.score) }))
    .sort((x, y) => (y.score ?? -1) - (x.score ?? -1));
  const question = s(data.question) || s(data.decision);
  const recommendation = s(data.recommendation) || s(data.verdict);
  const nextSteps = a<unknown>(data.nextSteps).map((x) => s(x)).filter(Boolean);
  const recIdx = options.findIndex((o) => Boolean(o.op.recommended));
  const chosenIdx = recIdx >= 0 ? recIdx : options.findIndex((o) => o.score !== null);
  const hasAny =
    metrics.length + graphNodes.length + findings.length + options.length > 0 || Boolean(recommendation);

  return (
    <IntelCardShell
      title={s(data.title, "Decision Workspace")}
      subtitle={s(data.subtitle, "Benchmarks, options, dependencies, and the findings behind the call")}
      badge={s(data.status, "Decision")}
      badgeTone="purple"
      icon={<Scale size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={!hasAny}
      emptyMessage="No decision data yet"
    >
      <motion.div {...stagger} className="intel-workspace-stack intel-dw">
        {(question || recommendation || metrics.length > 0) && (
          <motion.div className="intel-dw__verdict" variants={STAGGER_ITEM}>
            {question && (
              <div className="intel-dw__q">
                <span className="intel-dw__kicker">Decision</span>
                <p className="intel-dw__q-text">{question}</p>
              </div>
            )}
            {recommendation && (
              <div className="intel-dw__rec">
                <span className="intel-dw__kicker intel-dw__kicker--rec">Recommendation</span>
                <p className="intel-dw__rec-text">{recommendation}</p>
              </div>
            )}
            {metrics.length > 0 && (
              <div className="intel-dw__metrics">
                {metrics.slice(0, 4).map((m, i) => {
                  const delta = s(m.delta);
                  const status = s(m.status);
                  const tone = status === "critical" ? "bad" : status === "warning" ? "warn" : "good";
                  return (
                    <div key={i} className="intel-dw__metric">
                      <span className="intel-dw__kicker">{s(m.label)}</span>
                      <span className="intel-dw__metric-value">
                        {s(m.prefix)}
                        {s(m.value)}
                        {s(m.unit)}
                      </span>
                      {delta && (
                        <span className="intel-rk__chip" data-tone={tone}>
                          {delta}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {options.length > 0 && (
          <motion.div className="intel-dw__options" variants={STAGGER_ITEM}>
            <div className="intel-dw__options-head">
              <span className="intel-dw__kicker">Options</span>
              <span className="intel-dw__count">{options.length}</span>
            </div>
            <div className="intel-dw__opt-grid">
              {options.map(({ op, score }, idx) => {
                const name = s(op.name) || s(op.title);
                const summary = s(op.summary) || s(op.description);
                const tradeoff = s(op.tradeoff) || s(op.risk);
                const isChosen = idx === chosenIdx;
                const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
                const pick = onAction ? () => onAction({ type: "select", payload: { option: op } }) : undefined;
                const optProps = pick
                  ? {
                      role: "button" as const,
                      tabIndex: 0,
                      onClick: pick,
                      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          pick();
                        }
                      },
                    }
                  : {};
                return (
                  <motion.div
                    key={idx}
                    className="intel-dw__opt"
                    data-chosen={isChosen || undefined}
                    variants={STAGGER_ITEM}
                    whileTap={pick ? MH.tap : undefined}
                    transition={MH.spring}
                    {...optProps}
                  >
                    <div className="intel-dw__opt-head">
                      <span className="intel-dw__opt-rank">{String(idx + 1).padStart(2, "0")}</span>
                      {Boolean(op.recommended) && (
                        <span className="intel-rk__chip" data-tone="good">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="intel-dw__opt-name">{name}</div>
                    {score !== null && (
                      <div className="intel-dw__opt-score">
                        <Num value={score} className="intel-dw__opt-num" />
                        <span className="intel-dw__opt-of">/100</span>
                      </div>
                    )}
                    {score !== null && (
                      <div className="intel-dw__opt-track">
                        <MeterFill
                          className="intel-dw__opt-fill"
                          width={`${pct}%`}
                          style={{ background: isChosen ? "var(--gu-accent, #ef8c66)" : "#9d9da6" }}
                        />
                      </div>
                    )}
                    {summary && <p className="intel-dw__opt-summary">{summary}</p>}
                    {tradeoff && (
                      <div className="intel-dw__opt-trade">
                        <span className="intel-dw__kicker">Trade-off</span>
                        <p className="intel-dw__opt-trade-text">{tradeoff}</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {graphNodes.length > 0 && (
          <motion.div className="intel-dw__map" variants={STAGGER_ITEM}>
            <IntelligenceGraph
              graphData={{
                nodes: graphNodes.map((nd, i) => ({
                  id: s(nd.id, `wn-${i}`),
                  label: s(nd.label),
                  type: s(nd.type, "entity"),
                  detail: s(nd.detail) || undefined,
                  status: (nd.status as IntelGraphData["nodes"][number]["status"]) || undefined,
                })),
                edges: graphEdges.map((ed, i) => ({
                  id: s(ed.id, `we-${i}`),
                  source: s(ed.source),
                  target: s(ed.target),
                  label: s(ed.label) || undefined,
                  type: "data_flow",
                })),
                layout: "layered",
                direction: "LR",
              }}
              title={s(data.graphTitle, "What this decision touches")}
              variant={graphVariant}
              height={260}
              onNodeClick={(node) => onAction?.({ type: "select", payload: { node } })}
            />
          </motion.div>
        )}

        {(findings.length > 0 || nextSteps.length > 0) && (
          <motion.div
            className={`intel-dw__why${findings.length > 0 && nextSteps.length > 0 ? " intel-dw__why--split" : ""}`}
            variants={STAGGER_ITEM}
          >
            {findings.length > 0 && (
              <div className="intel-dw__reasons">
                <div className="intel-dw__why-head">
                  <span className="intel-dw__kicker">{s(data.findingsTitle, "Why")}</span>
                  <span className="intel-dw__count">{findings.length}</span>
                </div>
                <div className="intel-dw__reason-list">
                  {findings.map((f, i) => {
                    const desc = s(f.description) || s(f.detail);
                    return (
                      <div key={i} className="intel-dw__reason">
                        <span className="intel-dw__num">{i + 1}</span>
                        <div className="intel-dw__reason-main">
                          <div className="intel-dw__reason-title">{s(f.title)}</div>
                          {desc && <div className="intel-dw__reason-desc">{desc}</div>}
                          {(s(f.impact) || s(f.confidence)) && (
                            <div className="intel-dw__reason-chips">
                              {s(f.impact) && (
                                <span className="intel-rk__chip" data-tone="accent">
                                  Impact · {s(f.impact)}
                                </span>
                              )}
                              {s(f.confidence) && (
                                <span className="intel-rk__chip">Confidence · {s(f.confidence)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {nextSteps.length > 0 && (
              <div className="intel-dw__next">
                <span className="intel-dw__kicker">Next steps</span>
                <ol className="intel-dw__steps">
                  {nextSteps.map((step, i) => (
                    <li key={i} className="intel-dw__step">
                      <span className="intel-dw__step-num">{i + 1}</span>
                      <span className="intel-dw__step-text">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </IntelCardShell>
  );
}

export const SystemInspectionWorkspace = makeWorkspace({
  defaultTitle: "System Inspection Workspace",
  subtitle: "Service topology graph and runtime findings",
  badge: "Inspection",
  badgeTone: "amber",
  icon: <ScanLine size={15} />,
  primaryPanel: "graph",
  sidePanel: "alerts",
  arrangement: "side-main",
  metricsTitle: "Fleet vitals",
});

export const IncidentResponseWorkspace = makeWorkspace({
  defaultTitle: "Incident Response Workspace",
  subtitle: "Blast-radius topology and active severity alerts",
  badge: "Incident",
  badgeTone: "red",
  icon: <Siren size={15} />,
  primaryPanel: "graph",
  sidePanel: "alerts",
  arrangement: "side-main",
  metricsTitle: "Response clock",
});

export const KnowledgeExplorationWorkspace = makeWorkspace({
  defaultTitle: "Knowledge Exploration Workspace",
  subtitle: "Concept graph and curated reference library",
  badge: "Explore",
  badgeTone: "green",
  icon: <Compass size={15} />,
  primaryPanel: "graph",
  sidePanel: "sources",
  arrangement: "main-side",
});

export const ScenarioAnalysisWorkspace = makeWorkspace({
  defaultTitle: "Scenario Analysis Workspace",
  subtitle: "Comparative trajectories and sensitivity findings",
  badge: "Scenarios",
  icon: <GitFork size={15} />,
  primaryPanel: "line",
  sidePanel: "findings",
  arrangement: "main-side",
  metricsTitle: "Model vitals",
});

export const DataExplorationWorkspace = makeWorkspace({
  defaultTitle: "Data Exploration Workspace",
  subtitle: "Interactive metrics, series plot, and anomaly insights",
  badge: "Explorer",
  icon: <Database size={15} />,
  primaryPanel: "bar",
  sidePanel: "findings",
  arrangement: "main-side",
  metricsTitle: "Profile stats",
});

export const EvidenceReviewWorkspace = makeWorkspace({
  defaultTitle: "Evidence Review Workspace",
  subtitle: "Claim graph paired with verifiable sources",
  badge: "Review",
  badgeTone: "blue",
  icon: <ShieldCheck size={15} />,
  primaryPanel: "graph",
  sidePanel: "sources",
  arrangement: "stack",
});

export const ArchitectureReviewWorkspace = makeWorkspace({
  defaultTitle: "Architecture Review Workspace",
  subtitle: "Layered architecture topology and audit findings",
  badge: "Audit",
  icon: <Boxes size={15} />,
  primaryPanel: "graph",
  sidePanel: "findings",
  arrangement: "stack",
  metricsTitle: "Audit vitals",
});
