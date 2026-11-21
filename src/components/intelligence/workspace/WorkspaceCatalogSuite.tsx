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

import { useContext, type ComponentType } from "react";
import { motion } from "motion/react";
import { LayoutDashboard } from "lucide-react";
import type { IntelBaseProps, IntelGraphData } from "@/lib/intelligence/types";
import IntelligenceGraph from "../graphs/IntelligenceGraph";
import MetricGroup from "../panels/MetricGroup";
import IntelLineChart from "../charts/LineChart";
import IntelBarChart from "../charts/BarChart";
import KeyFindings from "../panels/KeyFindings";
import AlertFeed from "../activity/AlertFeed";
import SourceList from "../activity/SourceList";
import { IntelCardShell, IntelVariantContext, s, a } from "../shared/IntelCardShell";
import { STAGGER_ITEM, useStagger } from "../shared/StateMotion";
import { RkBoard, RkList, RkMeter, RkRank, RkRow, RkStep, RkSummary } from "../shared/RowKit";
import { Num } from "../charts/kit";

interface WorkspaceConfig {
  defaultTitle: string;
  subtitle: string;
  primaryPanel: "graph" | "line" | "bar";
  sidePanel: "findings" | "alerts" | "sources";
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

    return (
      <IntelCardShell
        title={title}
        subtitle={s(data.subtitle, cfg.subtitle)}
        badge="Workspace"
        badgeTone="purple"
        icon={<LayoutDashboard size={15} />}
        state={state}
        streaming={streaming}
        sources={sources}
        isEmpty={!hasAny}
        emptyMessage={`No workspace panels populated for ${cfg.defaultTitle}`}
      >
        <motion.div {...stagger} className="intel-workspace-stack">
          {metrics.length > 0 && (
            <MetricGroup
              data={{ metrics }}
              state={state}
              surface={surface}
              live={live}
              streaming={streaming}
            />
          )}

          <div className="intel-workspace-grid">
            <motion.div className="intel-workspace-main" variants={STAGGER_ITEM}>
              {cfg.primaryPanel === "graph" && graphNodes.length > 0 ? (
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
              ) : null}
            </motion.div>

            <motion.div className="intel-workspace-side" variants={STAGGER_ITEM}>
              {cfg.sidePanel === "alerts" && alerts.length > 0 ? (
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
              ) : null}
            </motion.div>
          </div>
        </motion.div>
      </IntelCardShell>
    );
  };
}

export const IntelligenceDashboard = makeWorkspace({
  defaultTitle: "Intelligence Dashboard",
  subtitle: "KPI summary, trend visualization, and priority findings",
  primaryPanel: "line",
  sidePanel: "findings",
});

export const ResearchWorkspace = makeWorkspace({
  defaultTitle: "Multi-Source Research Workspace",
  subtitle: "Trend signals paired with curated primary sources",
  primaryPanel: "bar",
  sidePanel: "sources",
});

export const InvestigationWorkspace = makeWorkspace({
  defaultTitle: "Investigation Workspace",
  subtitle: "Relationship graph paired with real-time alerts",
  primaryPanel: "graph",
  sidePanel: "alerts",
});

export const AnalysisWorkspace = makeWorkspace({
  defaultTitle: "Analytical Workspace",
  subtitle: "Quantitative breakdown paired with structured findings",
  primaryPanel: "bar",
  sidePanel: "findings",
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
  const hasAny =
    metrics.length + graphNodes.length + findings.length + options.length > 0 || Boolean(recommendation);

  return (
    <IntelCardShell
      title={s(data.title, "Decision Workspace")}
      subtitle={s(data.subtitle, "Benchmarks, options, dependencies, and the findings behind the call")}
      badge={s(data.status, "Workspace")}
      badgeTone="purple"
      icon={<LayoutDashboard size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={!hasAny}
      emptyMessage="No decision data yet"
    >
      <motion.div {...stagger} className="intel-workspace-stack intel-dw">
        {(question || recommendation || metrics.length > 0 || options.length > 0) && (
          <motion.div variants={STAGGER_ITEM}>
            <RkBoard>
              {(question || recommendation) && (
                <div className="intel-dw__brief">
                  {question && (
                    <div className="intel-rk__lead-in">
                      <span className="intel-rk__lead-in-k">Decision</span>
                      {question}
                    </div>
                  )}
                  {recommendation && (
                    <div className="intel-rk__lead-in" data-tone="good">
                      <span className="intel-rk__lead-in-k">Recommendation</span>
                      {recommendation}
                    </div>
                  )}
                </div>
              )}
              {metrics.length > 0 && (
                <RkSummary
                  items={metrics.slice(0, 4).map((m) => ({
                    label: s(m.label),
                    value: (
                      <>
                        {s(m.prefix)}
                        {s(m.value)}
                        {s(m.unit)}
                        {s(m.delta) && (
                          <span
                            className="intel-rk__chip intel-dw__delta"
                            data-tone={s(m.status) === "critical" ? "bad" : s(m.status) === "warning" ? "warn" : "good"}
                          >
                            {s(m.delta)}
                          </span>
                        )}
                      </>
                    ),
                  }))}
                />
              )}
              {options.length > 0 && (
                <RkList label="Options">
                  {options.map(({ op, score }, idx) => (
                    <RkRow
                      key={idx}
                      lead={<RkRank n={idx + 1} top={idx === 0} />}
                      title={
                        <>
                          {s(op.name) || s(op.title)}
                          {Boolean(op.recommended) && (
                            <>
                              {" "}
                              <span className="intel-rk__chip" data-tone="good">
                                Recommended
                              </span>
                            </>
                          )}
                        </>
                      }
                      sub={s(op.summary) || s(op.description)}
                      aside={
                        score !== null ? (
                          <RkMeter value={score} max={100} unit="/100" tone={idx === 0 ? "accent" : "neutral"} />
                        ) : undefined
                      }
                      onClick={() => onAction?.({ type: "select", payload: { option: op } })}
                    >
                      {(s(op.tradeoff) || s(op.risk)) && (
                        <div className="intel-rk__meta">
                          <span className="intel-rk__kv">
                            <span className="intel-rk__meta-k">Trade-off</span>{" "}
                            <span className="intel-rk__meta-v">{s(op.tradeoff) || s(op.risk)}</span>
                          </span>
                        </div>
                      )}
                    </RkRow>
                  ))}
                </RkList>
              )}
            </RkBoard>
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
          <motion.div variants={STAGGER_ITEM}>
            <RkBoard>
              {findings.length > 0 && (
                <>
                  <div className="intel-dw__label">
                    {s(data.findingsTitle, "Why")} <Num value={findings.length} />
                  </div>
                  <RkList label="Findings">
                    {findings.map((f, i) => (
                      <RkRow
                        key={i}
                        lead={<RkStep n={i + 1} last={i === findings.length - 1} />}
                        title={s(f.title)}
                        sub={s(f.description) || s(f.detail)}
                        aside={
                          <>
                            {s(f.impact) && (
                              <span className="intel-rk__chip" data-tone="accent">
                                Impact · {s(f.impact)}
                              </span>
                            )}
                            {s(f.confidence) && (
                              <span className="intel-rk__chip">Confidence · {s(f.confidence)}</span>
                            )}
                          </>
                        }
                      />
                    ))}
                  </RkList>
                </>
              )}
              {nextSteps.length > 0 && (
                <div className="intel-dw__next">
                  <span className="intel-rk__lead-in-k">Next steps</span>
                  <ol>
                    {nextSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </RkBoard>
          </motion.div>
        )}
      </motion.div>
    </IntelCardShell>
  );
}

export const SystemInspectionWorkspace = makeWorkspace({
  defaultTitle: "System Inspection Workspace",
  subtitle: "Service topology graph and runtime findings",
  primaryPanel: "graph",
  sidePanel: "alerts",
});

export const IncidentResponseWorkspace = makeWorkspace({
  defaultTitle: "Incident Response Workspace",
  subtitle: "Blast-radius topology and active severity alerts",
  primaryPanel: "graph",
  sidePanel: "alerts",
});

export const KnowledgeExplorationWorkspace = makeWorkspace({
  defaultTitle: "Knowledge Exploration Workspace",
  subtitle: "Concept graph and curated reference library",
  primaryPanel: "graph",
  sidePanel: "sources",
});

export const ScenarioAnalysisWorkspace = makeWorkspace({
  defaultTitle: "Scenario Analysis Workspace",
  subtitle: "Comparative trajectories and sensitivity findings",
  primaryPanel: "line",
  sidePanel: "findings",
});

export const DataExplorationWorkspace = makeWorkspace({
  defaultTitle: "Data Exploration Workspace",
  subtitle: "Interactive metrics, series plot, and anomaly insights",
  primaryPanel: "bar",
  sidePanel: "findings",
});

export const EvidenceReviewWorkspace = makeWorkspace({
  defaultTitle: "Evidence Review Workspace",
  subtitle: "Claim graph paired with verifiable sources",
  primaryPanel: "graph",
  sidePanel: "sources",
});

export const ArchitectureReviewWorkspace = makeWorkspace({
  defaultTitle: "Architecture Review Workspace",
  subtitle: "Layered architecture topology and audit findings",
  primaryPanel: "graph",
  sidePanel: "findings",
});
