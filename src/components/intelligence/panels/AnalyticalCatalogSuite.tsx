"use client";

/**
 * Category 05 — Analytical & Decision Intelligence UI (Remaining 18 Components)
 * (Plus decision_workspace in WorkspaceCatalogSuite with secondaryCategories: ["analytical"])
 *
 * Components:
 * - decision_matrix, tradeoff_matrix, risk_matrix, swot_analysis,
 *   scenario_comparison, scenario_tree, uncertainty_matrix,
 *   sensitivity_analysis, correlation_matrix, priority_matrix,
 *   allocation_chart, scenario_planner, root_cause_analysis, impact_analysis,
 *   cost_benefit_analysis, option_evaluation, risk_register, decision_record
 */

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { scaleLinear } from "d3";
import { MH } from "@/components/motion/MotionPrimitives";
import {
  Scale,
  AlertTriangle,
  Grid2x2,
  Sliders,
  TrendingUp,
  FileCheck,
} from "lucide-react";
import type { IntelBaseProps, IntelGraphData } from "@/lib/intelligence/types";
import IntelligenceGraph from "../graphs/IntelligenceGraph";
import { IntelCardShell, badgeClassForTone, s, n, a } from "../shared/IntelCardShell";
import {
  RkBoard,
  RkList,
  RkRow,
  RkStep,
  RkSummary,
  sevKey,
} from "../shared/RowKit";
import { MeterFill, STAGGER_ITEM, useStagger } from "../shared/StateMotion";
import { RingPlot } from "../charts/RingPlot";
import { getColor } from "../charts/shared";
import {
  Legend,
  Num,
  Tip,
  clipLabel,
  fmtPct,
  fmtSigned,
  fmtTick,
  fmtUnit,
  markProps,
  markUnit,
  uniqueKeys,
  useDvMotion,
  useMeasure,
  useSeriesFocus,
  type TipState,
} from "../charts/kit";

/* 1. DecisionMatrix (interactive live weight sliders!) */
export function DecisionMatrix({ data, state, streaming, sources }: IntelBaseProps) {
  const options = a<string>(data.options);
  const criteria = a<Record<string, unknown>>(data.criteria);
  const [weights, setWeights] = useState<Record<number, number>>({});

  const getWeight = (i: number) => weights[i] ?? n(criteria[i]?.weight, 3);
  const totals = useMemo(() => {
    return options.map((_, colIdx) => {
      let sum = 0;
      let wSum = 0;
      criteria.forEach((cr, rIdx) => {
        const w = getWeight(rIdx);
        const scores = a<number>(cr.scores);
        sum += n(scores[colIdx], 0) * w;
        wSum += w;
      });
      return wSum > 0 ? (sum / wSum).toFixed(2) : "0.00";
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, criteria, weights]);

  return (
    <IntelCardShell
      title={s(data.title, "Weighted Decision Matrix")}
      badge={`${options.length} options`}
      icon={<Scale size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={options.length === 0 || criteria.length === 0}
    >
      <div className="intel-table-scroll">
        <table className="intel-matrix-table">
          <thead>
            <tr>
              <th>Criterion</th>
              <th>Weight</th>
              {options.map((opt, idx) => <th key={idx}>{opt}</th>)}
            </tr>
          </thead>
          <tbody>
            {criteria.map((cr, r) => {
              const scores = a<number>(cr.scores);
              const w = getWeight(r);
              return (
                <tr key={r}>
                  <td className="intel-matrix-rowhead">{s(cr.label)}</td>
                  <td>
                    <div className="intel-weight-ctrl">
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={w}
                        onChange={(e) => setWeights((p) => ({ ...p, [r]: Number(e.target.value) }))}
                      />
                      <span>{w}x</span>
                    </div>
                  </td>
                  {options.map((_, c) => {
                    const sc = n(scores[c], 0);
                    return (
                      <td key={c} style={{ textAlign: "center", fontWeight: sc >= 8 ? 600 : 400, color: sc >= 8 ? "#ef8c66" : sc <= 4 ? "#9d9da6" : undefined }}>
                        {sc}/10
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="intel-matrix-total">
              <td colSpan={2}><strong>Weighted Score</strong></td>
              {totals.map((t, i) => <td key={i} style={{ textAlign: "center" }}><strong>{t}</strong></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </IntelCardShell>
  );
}

/* 2. TradeoffMatrix */
export function TradeoffMatrix({ data, state, streaming, sources }: IntelBaseProps) {
  const options = a<Record<string, unknown>>(data.options).filter((op) => {
    const benefits = a<string>(op.benefits);
    const costs = a<string>(op.costs);
    const summary = s(op.summary || op.description || op.detail || op.text);
    return Boolean(s(op.name || op.title || op.label)) && (benefits.length > 0 || costs.length > 0 || Boolean(summary));
  });
  return (
    <IntelCardShell
      title={s(data.title, "Trade-off Matrix")}
      badge={`${options.length} options`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={options.length === 0}
    >
      <div className="intel-compare-grid">
        {options.map((op, i) => {
          const benefits = a<string>(op.benefits);
          const costs = a<string>(op.costs);
          const summary = s(op.summary || op.description || op.detail || op.text);
          return (
            <div key={i} className="intel-compare-card">
              <div className="intel-subcard__row">
                <strong>{s(op.name || op.title || op.label)}</strong>
                {s(op.tag) && <span className="intel-badge intel-badge--blue">{s(op.tag)}</span>}
              </div>
              {summary && benefits.length === 0 && costs.length === 0 && (
                <p className="intel-subcard__text">{summary}</p>
              )}
              {benefits.length > 0 && (
                <>
                  <div className="intel-col-label intel-text-green" style={{ marginTop: 8 }}>Benefits</div>
                  <ul className="intel-bullet-list">{benefits.map((b, idx) => <li key={idx}>{b}</li>)}</ul>
                </>
              )}
              {costs.length > 0 && (
                <>
                  <div className="intel-col-label intel-text-red" style={{ marginTop: 8 }}>Sacrifices / Costs</div>
                  <ul className="intel-bullet-list">{costs.map((c, idx) => <li key={idx}>{c}</li>)}</ul>
                </>
              )}
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 3. RiskMatrix (Compact 5x5 severity heatmap + linked human-readable risk ledger) */
function riskTier(score: number): { key: "critical" | "high" | "low"; label: string; badge: string } {
  if (score >= 15) return { key: "critical", label: "Critical", badge: "red" };
  if (score >= 8) return { key: "high", label: "Elevated", badge: "amber" };
  return { key: "low", label: "Watch", badge: "neutral" };
}

export function RiskMatrix({ data, state, streaming, sources }: IntelBaseProps) {
  const rawRisks = a<Record<string, unknown>>(data.risks);
  const risks = rawRisks
    .map((r, i) => {
      const prob = Math.max(1, Math.min(5, Math.round(n(r.probability, 3))));
      const imp = Math.max(1, Math.min(5, Math.round(n(r.impact, 3))));
      const score = prob * imp;
      return {
        raw: r,
        id: s(r.id, `rk-${i}`),
        title: s(r.title || r.name || r.risk || r.code, `Risk ${i + 1}`),
        code: s(r.code),
        mitigation: s(r.mitigation || r.description || r.summary || r.detail || r.action || r.note),
        prob,
        imp,
        score,
        tier: riskTier(score),
      };
    })
    .sort((a0, b0) => b0.score - a0.score);

  const [activeIdx, setActiveIdx] = useState<number>(0);
  const safeActive = activeIdx >= 0 && activeIdx < risks.length ? activeIdx : 0;
  const plateId = useId();
  const reduce = useReducedMotion();

  return (
    <IntelCardShell
      title={s(data.title, "Risk Matrix (Probability × Impact)")}
      badge={`${risks.length} risks`}
      badgeTone={risks.some((r) => r.tier.key === "critical") ? "red" : "amber"}
      icon={<AlertTriangle size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={risks.length === 0}
    >
      <div className="intel-risk-layout">
        {/* Left: Compact 5x5 Severity Heatmap */}
        <div className="intel-risk-map">
          <div className="intel-risk-map__frame">
            <span className="intel-risk-axis-y" aria-hidden="true">Prob</span>
            <div className="intel-risk-grid" role="grid" aria-label="Probability by impact matrix">
              {[5, 4, 3, 2, 1].map((prob) =>
                [1, 2, 3, 4, 5].map((imp) => {
                  const score = prob * imp;
                  const tier = riskTier(score);
                  const cellMatches = risks
                    .map((r, idx) => ({ r, idx }))
                    .filter(({ r }) => r.prob === prob && r.imp === imp);
                  const hasActive = cellMatches.some(({ idx }) => idx === safeActive);
                  return (
                    <div
                      key={`${prob}-${imp}`}
                      className={`intel-risk-cell${cellMatches.length ? " has-item" : ""}${hasActive ? " is-active" : ""}`}
                      data-tier={tier.key}
                      title={`Prob ${prob} × Impact ${imp} (Score ${score})`}
                    >
                      {cellMatches.map(({ r, idx }) => (
                        <motion.button
                          key={r.id}
                          type="button"
                          className={`intel-risk-pip${idx === safeActive ? " is-active" : ""}`}
                          data-tier={r.tier.key}
                          whileTap={MH.tap}
                          transition={MH.spring}
                          onClick={() => setActiveIdx(idx)}
                          onMouseEnter={() => setActiveIdx(idx)}
                          title={`${r.title} (P${r.prob}·I${r.imp})`}
                          aria-label={`${idx + 1}. ${r.title}`}
                        >
                          {idx + 1}
                        </motion.button>
                      ))}
                    </div>
                  );
                }),
              )}
            </div>
          </div>
          <div className="intel-risk-axis-x" aria-hidden="true">
            <span>Low</span>
            <span>Impact →</span>
            <span>High</span>
          </div>
        </div>

        {/* Below: compact linked ledger. One row per risk, title left, tier badge top-right. */}
        <div className="intel-risk-ledger">
          {risks.map((r, idx) => {
            const isSel = idx === safeActive;
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                className={`intel-risk-item${isSel ? " is-active" : ""}${r.mitigation ? "" : " is-bare"}`}
                data-tier={r.tier.key}
                onClick={() => setActiveIdx(idx)}
                onMouseEnter={() => setActiveIdx(idx)}
                onFocus={() => setActiveIdx(idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveIdx(idx);
                  }
                }}
              >
                {isSel && (
                  <motion.span
                    layoutId={`${plateId}-plate`}
                    className="intel-risk-item__plate"
                    aria-hidden="true"
                    transition={reduce ? { duration: 0 } : MH.spring}
                  />
                )}
                <span className="intel-risk-item__num" data-tier={r.tier.key}>
                  {idx + 1}
                </span>
                <strong className="intel-risk-item__title">{r.title}</strong>
                <span className={`intel-badge intel-badge--${r.tier.badge} intel-risk-item__badge`}>
                  {r.tier.label} · {r.score}
                </span>
                {r.mitigation && <p className="intel-risk-item__desc">{r.mitigation}</p>}
                <span className="intel-risk-item__meta">
                  Prob {r.prob} · Impact {r.imp}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </IntelCardShell>
  );
}

/* 4. SwotAnalysis */
export function SwotAnalysis({ data, state, streaming, sources }: IntelBaseProps) {
  const quads = [
    { key: "strengths", label: "Strengths", tone: "#ef8c66" },
    { key: "weaknesses", label: "Weaknesses", tone: "#c9973b" },
    { key: "opportunities", label: "Opportunities", tone: "var(--gu-ink-2, #45454b)" },
    { key: "threats", label: "Threats", tone: "#d97757" },
  ] as const;

  const total = quads.reduce((acc, q) => acc + a<string>(data[q.key]).length, 0);

  return (
    <IntelCardShell
      title={s(data.title, "SWOT Analysis")}
      icon={<Grid2x2 size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={total === 0}
    >
      <div className="intel-swot-grid">
        {quads.map((q) => {
          const items = a<string>(data[q.key]);
          return (
            <div key={q.key} className="intel-swot-quad">
              <div className="intel-col-label" style={{ color: q.tone }}>{q.label} ({items.length})</div>
              <ul className="intel-bullet-list">
                {items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 5. ScenarioComparison */
export function ScenarioComparison({ data, state, streaming, sources }: IntelBaseProps) {
  const scenarios = a<Record<string, unknown>>(data.scenarios);
  return (
    <IntelCardShell
      title={s(data.title, "Scenario Comparison")}
      badge={`${scenarios.length} scenarios`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={scenarios.length === 0}
    >
      <div className="intel-compare-grid">
        {scenarios.map((sc, i) => (
          <div key={i} className="intel-compare-card">
            <div className="intel-subcard__row">
              <strong>{s(sc.name)}</strong>
              {s(sc.likelihood) && <span className="intel-badge intel-badge--neutral">{s(sc.likelihood)}</span>}
            </div>
            <p className="intel-subcard__text">{s(sc.outcome)}</p>
            <div className="intel-kv-list">
              {a<Record<string, unknown>>(sc.metrics).map((m, idx) => (
                <div key={idx} className="intel-subcard__row">
                  <span className="intel-muted-mono">{s(m.label)}</span>
                  <strong>{s(m.value)}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 6. ScenarioTree (XYFlow interactive tree!) */
export function ScenarioTree({ data, state, onAction }: IntelBaseProps) {
  const nodes = a<Record<string, unknown>>(data.nodes);
  const edges = a<Record<string, unknown>>(data.edges);

  if (state === "loading") return <IntelCardShell state="loading" title="Scenario Tree"><div /></IntelCardShell>;
  if (state === "error") return <IntelCardShell state="error" title="Scenario Tree" errorMessage={s(data.error)}><div /></IntelCardShell>;
  if (state === "empty" || nodes.length === 0) return <IntelCardShell state="empty" emptyMessage="No scenario branches"><div /></IntelCardShell>;

  const graphData: IntelGraphData = {
    nodes: nodes.map((nd, i) => ({
      id: s(nd.id, `sc-${i}`),
      label: s(nd.label),
      type: s(nd.type, "option"),
      detail: s(nd.detail) || undefined,
      status: (nd.status as IntelGraphData["nodes"][number]["status"]) || undefined,
    })),
    edges: edges.map((ed, i) => ({
      id: s(ed.id, `sce-${i}`),
      source: s(ed.source),
      target: s(ed.target),
      label: s(ed.label) || undefined,
      type: "causal",
    })),
    layout: "tree",
    direction: "TB",
  };

  return (
    <IntelligenceGraph
      graphData={graphData}
      title={s(data.title, "Scenario Tree")}
      onNodeClick={(node) => onAction?.({ type: "select", payload: { node } })}
    />
  );
}

/* 7. UncertaintyMatrix */
export function UncertaintyMatrix({ data, state, streaming, sources }: IntelBaseProps) {
  const vars = a<Record<string, unknown>>(data.variables);
  return (
    <IntelCardShell
      title={s(data.title, "Uncertainty Matrix")}
      badge={`${vars.length} variables`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={vars.length === 0}
    >
      <div className="intel-table-scroll">
        <table className="intel-matrix-table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Best Case</th>
              <th>Base Case</th>
              <th>Worst Case</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            {vars.map((v, i) => (
              <tr key={i}>
                <td className="intel-matrix-rowhead">{s(v.name)}</td>
                <td className="intel-text-green">{s(v.best)}</td>
                <td><strong>{s(v.base)}</strong></td>
                <td className="intel-text-red">{s(v.worst)}</td>
                <td><span className={`intel-badge intel-badge--${badgeClassForTone(s(v.volatility, "medium"))}`}>{s(v.volatility, "Medium")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </IntelCardShell>
  );
}

const TORNADO_LOW = "#d97757";
const TORNADO_HIGH = "#ef8c66";

interface TornadoDriver {
  key: string;
  name: string;
  low: number;
  high: number;
}

/** Diverging horizontal bars off a shared zero axis — one row per driver. */
function TornadoPlot({ drivers, unit, height }: { drivers: TornadoDriver[]; unit?: string; height: number }) {
  const m = useDvMotion();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const labelW = Math.min(160, Math.max(88, width * 0.26));
  const iw = Math.max(0, width - labelW - 30);
  const maxAbs = Math.max(1e-9, ...drivers.flatMap((d) => [Math.abs(d.low), Math.abs(d.high)]));
  const xs = scaleLinear().domain([-maxAbs, maxAbs]).nice(4).range([0, iw]);
  const ticks = xs.ticks(5);
  const zero = labelW + xs(0);
  const rowH = drivers.length ? height / drivers.length : 0;
  const barH = Math.min(15, Math.max(7, rowH * 0.4));

  const hoverIdx = drivers.findIndex((d) => d.key === hoverKey);
  const tip: TipState | null =
    hoverIdx >= 0
      ? {
          x: labelW + iw / 2,
          y: hoverIdx * rowH + rowH / 2,
          title: drivers[hoverIdx].name,
          rows: [
            { label: "Downside", value: fmtUnit(drivers[hoverIdx].low, unit), color: TORNADO_LOW },
            { label: "Upside", value: fmtUnit(drivers[hoverIdx].high, unit), color: TORNADO_HIGH },
          ],
        }
      : null;

  return (
    <>
      <div ref={ref} className="dv-plot" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="group" aria-label="Sensitivity analysis">
            <g aria-hidden="true">
              {ticks.map((t) => (
                <text key={t} className="dv-tick" x={labelW + xs(t)} y={height - 5} textAnchor="middle">
                  {fmtTick(t)}
                </text>
              ))}
            </g>
            <motion.line
              className="dv-axis"
              x1={zero}
              x2={zero}
              y1={4}
              y2={height - 16}
              initial={false}
              transition={m.spring}
            />
            {drivers.map((d, i) => {
              const cy = i * rowH + rowH / 2;
              const by = cy - barH / 2;
              const xl = labelW + xs(d.low);
              const xh = labelW + xs(d.high);
              const dim = hoverKey !== null && hoverKey !== d.key;
              const lo = { x: Math.min(zero, xl), w: Math.abs(xl - zero) };
              const hiBar = { x: Math.min(zero, xh), w: Math.abs(xh - zero) };
              const maxChars = Math.max(6, Math.floor((labelW - 16) / 6.4));
              return (
                <g key={d.key}>
                  <text
                    className="dv-tick"
                    data-strong={hoverKey === d.key || undefined}
                    x={labelW - 10}
                    y={cy + 3.5}
                    textAnchor="end"
                  >
                    {clipLabel(d.name, maxChars)}
                  </text>
                  {lo.w > 0.5 && (
                    <motion.rect
                      className="dv-bar"
                      fill={TORNADO_LOW}
                      y={by}
                      height={barH}
                      rx={Math.min(3, barH / 3)}
                      initial={m.reduce ? false : { attrX: zero, width: 0, opacity: 0 }}
                      animate={{ attrX: lo.x, width: lo.w, opacity: dim ? 0.32 : 1 }}
                      transition={{ ...m.stagger(i), opacity: m.fade }}
                    />
                  )}
                  {hiBar.w > 0.5 && (
                    <motion.rect
                      className="dv-bar"
                      fill={TORNADO_HIGH}
                      y={by}
                      height={barH}
                      rx={Math.min(3, barH / 3)}
                      initial={m.reduce ? false : { attrX: zero, width: 0, opacity: 0 }}
                      animate={{ attrX: hiBar.x, width: hiBar.w, opacity: dim ? 0.32 : 1 }}
                      transition={{ ...m.stagger(i + 0.5), opacity: m.fade }}
                    />
                  )}
                  {lo.w > 0.5 && (
                    <motion.text
                      className="dv-val"
                      textAnchor={d.low < 0 ? "end" : "start"}
                      x={d.low < 0 ? lo.x - 5 : lo.x + lo.w + 5}
                      y={cy + 3.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: dim ? 0.4 : 1 }}
                      transition={m.fade}
                    >
                      <Num as="tspan" value={d.low} unit={markUnit(unit)} signed />
                    </motion.text>
                  )}
                  {hiBar.w > 0.5 && (
                    <motion.text
                      className="dv-val"
                      textAnchor={d.high < 0 ? "end" : "start"}
                      x={d.high < 0 ? hiBar.x - 5 : hiBar.x + hiBar.w + 5}
                      y={cy + 3.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: dim ? 0.4 : 1 }}
                      transition={m.fade}
                    >
                      <Num as="tspan" value={d.high} unit={markUnit(unit)} signed />
                    </motion.text>
                  )}
                  <motion.rect
                    className="dv-hit"
                    x={0}
                    y={i * rowH}
                    width={width}
                    height={rowH}
                    rx={6}
                    initial={false}
                    animate={{ fillOpacity: hoverKey === d.key ? 0.055 : 0 }}
                    transition={m.fade}
                    {...markProps(`${d.name}: downside ${fmtSigned(d.low, unit)}, upside ${fmtSigned(d.high, unit)}`, {
                      enter: () => setHoverKey(d.key),
                      leave: () => setHoverKey(null),
                    })}
                  />
                </g>
              );
            })}
          </svg>
        )}
        <Tip tip={tip} width={width} />
      </div>
      <Legend
        items={[
          { key: "downside", label: "Downside", color: TORNADO_LOW },
          { key: "upside", label: "Upside", color: TORNADO_HIGH },
        ]}
        layout="chips"
        label="Sensitivity legend"
      />
    </>
  );
}

/* 8. SensitivityAnalysis (Tornado horizontal bar chart) */
export function SensitivityAnalysis({ data, state, streaming, sources }: IntelBaseProps) {
  const drivers = useMemo(() => {
    const rows = a<Record<string, unknown>>(data.drivers);
    const keys = uniqueKeys(rows.map((d) => s(d.name, "Driver")));
    return rows.map((d, i) => ({
      key: keys[i],
      name: s(d.name, `Driver ${i + 1}`),
      low: n(d.lowDelta),
      high: n(d.highDelta),
    }));
  }, [data.drivers]);
  const unit = s(data.unit);

  return (
    <IntelCardShell
      title={s(data.title, "Sensitivity Analysis")}
      badge={s(data.targetMetric, "Output Swing")}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={drivers.length === 0}
    >
      <div className="intel-chart dv-chart">
        <TornadoPlot drivers={drivers} unit={unit} height={Math.max(200, drivers.length * 42)} />
      </div>
    </IntelCardShell>
  );
}

/* 9. CorrelationMatrix */
export function CorrelationMatrix({ data, state, streaming, sources }: IntelBaseProps) {
  const labels = a<string>(data.labels);
  const matrix = a<number[]>(data.matrix);
  return (
    <IntelCardShell
      title={s(data.title, "Correlation Matrix")}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={labels.length === 0}
    >
      <div className="intel-table-scroll">
        <table className="intel-matrix-table">
          <thead>
            <tr>
              <th />
              {labels.map((l, i) => <th key={i}>{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {labels.map((rowLabel, r) => (
              <tr key={r}>
                <td className="intel-matrix-rowhead">{rowLabel}</td>
                {labels.map((_, c) => {
                  const val = matrix[r]?.[c] ?? 0;
                  const alpha = Math.min(0.55, Math.abs(val) * 0.5);
                  const bg = val >= 0 ? `rgba(239, 140, 102, ${alpha})` : `rgba(157, 157, 166, ${alpha * 0.7})`;
                  return (
                    <td key={c} style={{ background: bg, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                      {val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </IntelCardShell>
  );
}

/* 10. PriorityMatrix (Impact vs Effort 2x2) */
export function PriorityMatrix({ data, state, streaming, sources }: IntelBaseProps) {
  const items = a<Record<string, unknown>>(data.items);
  const quads = [
    { id: "quick_wins", label: "Quick Wins (High Impact / Low Effort)", color: "#ef8c66" },
    { id: "major_projects", label: "Major Projects (High Impact / High Effort)", color: "#c9973b" },
    { id: "fill_ins", label: "Fill-ins (Low Impact / Low Effort)", color: "#9d9da6" },
    { id: "thankless", label: "Deprioritize (Low Impact / High Effort)", color: "#d97757" },
  ];
  return (
    <IntelCardShell
      title={s(data.title, "Priority Matrix")}
      badge={`${items.length} items`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={items.length === 0}
    >
      <div className="intel-swot-grid">
        {quads.map((q) => {
          const list = items.filter((it) => s(it.quadrant) === q.id);
          return (
            <div key={q.id} className="intel-swot-quad">
              <div className="intel-col-label" style={{ color: q.color }}>{q.label}</div>
              <ul className="intel-bullet-list">
                {list.length ? list.map((it, idx) => <li key={idx}>{s(it.title)}</li>) : <li className="intel-text-muted">None</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 11. AllocationChart */
export function AllocationChart({ data, state, streaming, sources }: IntelBaseProps) {
  const m = useDvMotion();
  const allocations = useMemo(() => {
    const rows = a<Record<string, unknown>>(data.allocations).map((al) => ({
      name: s(al.label || al.name, "Slice"),
      value: Math.max(0, n(al.value)),
    }));
    const keys = uniqueKeys(rows.map((r) => r.name));
    return rows.map((r, i) => ({ key: keys[i], label: r.name, value: r.value, color: getColor(i) }));
  }, [data.allocations]);
  const keys = useMemo(() => allocations.map((x) => x.key), [allocations]);
  const focus = useSeriesFocus(keys);
  const unit = s(data.unit, "%");
  const visible = allocations.filter((x) => !focus.hidden.has(x.key));
  const total = visible.reduce((sum, x) => sum + x.value, 0);
  const active = visible.find((x) => x.key === focus.hoverKey) ?? null;
  const shareOf = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <IntelCardShell
      title={s(data.title, "Resource Allocation")}
      badge={unit}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={allocations.length === 0}
    >
      <div className="intel-chart dv-chart dv-chart--donut">
        <div className="dv-deck" data-variant="default" data-side>
          <div className="dv-deck__main">
            <RingPlot
              kind="donut"
              label={s(data.title, "Resource allocation")}
              slices={visible}
              height={240}
              unit={unit}
              hoverKey={focus.hoverKey}
              onHover={focus.setHoverKey}
              center={
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active?.key ?? "__total"}
                    className="dv-ring__readout"
                    initial={m.reduce ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={m.fade}
                  >
                    {active ? (
                      <>
                        <strong>{fmtUnit(active.value, markUnit(unit))}</strong>
                        <span>{active.label}</span>
                        <em>{fmtPct(shareOf(active.value))}</em>
                      </>
                    ) : (
                      <>
                        <Num className="dv-ring__total" value={total} unit={markUnit(unit)} />
                        <span>Total{unit && !markUnit(unit) ? ` · ${unit}` : ""}</span>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              }
            />
          </div>
          <Legend
            items={allocations.map((x) => ({
              key: x.key,
              label: x.label,
              color: x.color,
              value: fmtUnit(x.value, unit),
              // Values already in percent would print the same number twice.
              share: unit === "%" || focus.hidden.has(x.key) ? undefined : shareOf(x.value),
            }))}
            layout="list"
            label="Slices"
            hidden={focus.hidden}
            hoverKey={focus.hoverKey}
            onHover={focus.setHoverKey}
            onToggle={focus.toggle}
          />
        </div>
      </div>
    </IntelCardShell>
  );
}

/* 12. ScenarioPlanner */
export function ScenarioPlanner({ data, state, streaming, sources }: IntelBaseProps) {
  const sliders = a<Record<string, unknown>>(data.levers);
  const [vals, setVals] = useState<Record<string, number>>({});

  const getVal = (l: Record<string, unknown>) => vals[s(l.key)] ?? n(l.value, 50);
  const baseline = n(data.baseline, 100);
  const projected = sliders.reduce((acc, l) => acc + (getVal(l) - n(l.value, 50)) * n(l.multiplier, 1), baseline);

  return (
    <IntelCardShell
      title={s(data.title, "Interactive Scenario Planner")}
      badge={`Projected: ${projected.toFixed(1)} ${s(data.unit)}`}
      badgeTone="blue"
      icon={<Sliders size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={sliders.length === 0}
    >
      <div className="intel-list-grid">
        {sliders.map((l, i) => {
          const k = s(l.key, `lv-${i}`);
          const v = getVal(l);
          return (
            <div key={k} className="intel-subcard">
              <div className="intel-subcard__row">
                <strong>{s(l.label)}</strong>
                <span className="intel-muted-mono">{v}{s(l.unit)}</span>
              </div>
              <input
                type="range"
                min={n(l.min, 0)}
                max={n(l.max, 100)}
                step={n(l.step, 1)}
                value={v}
                onChange={(e) => setVals((p) => ({ ...p, [k]: Number(e.target.value) }))}
                style={{ width: "100%", marginTop: 6 }}
              />
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 13. RootCauseAnalysis */
export function RootCauseAnalysis({ data, state, streaming, sources }: IntelBaseProps) {
  const rawFactors = a<unknown>(
    data.contributingFactors ?? data.factors ?? data.causes ?? data.items,
  );
  const factors = rawFactors
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return { category: "", cause: String(item).trim(), weight: "Direct", evidence: "" };
      }
      if (!item || typeof item !== "object") return null;
      const f = item as Record<string, unknown>;
      const rawCat = s(f.category || f.kategori || f.area || f.domain || f.type)
        .replace(/:+$/, "")
        .trim();
      const category = rawCat && rawCat.toLowerCase() !== "faktor" ? rawCat : "";
      let cause = s(
        f.cause ||
          f.factor ||
          f.faktor ||
          f.penyebab ||
          f.title ||
          f.judul ||
          f.name ||
          f.nama ||
          f.label ||
          f.reason ||
          f.alasan ||
          f.issue ||
          f.masalah ||
          f.mechanism ||
          f.mekanisme ||
          f.aspect ||
          f.aspek ||
          f.summary ||
          f.description ||
          f.penjelasan ||
          f.text ||
          f.point ||
          f.detail,
      ).trim();
      if (!cause) {
        for (const [k, v] of Object.entries(f)) {
          if (/^(category|kategori|area|domain|type|tipe|weight|bobot|impact|dampak|severity|role|priority|id)$/i.test(k)) {
            continue;
          }
          const cand = s(v).trim();
          if (cand) {
            cause = cand;
            break;
          }
        }
      }
      const evidence = s(
        f.evidence ||
          f.bukti ||
          f.description ||
          f.deskripsi ||
          f.summary ||
          f.detail ||
          f.explanation ||
          f.penjelasan ||
          f.reason ||
          f.alasan ||
          f.context ||
          f.konteks ||
          f.note,
      ).trim();
      const weight = s(f.weight || f.bobot || f.impact || f.dampak, "Direct");
      if (!cause && !evidence) return null;
      return {
        category,
        cause: cause || evidence,
        weight,
        evidence: evidence && evidence !== cause ? evidence : "",
      };
    })
    .filter((x): x is { category: string; cause: string; weight: string; evidence: string } => Boolean(x));

  const rootCauseText = s(
    data.rootCause || data.cause || data.akarMasalah || data.penyebabUtama || data.summary || data.diagnosis,
  );
  const confidence = n(data.confidence, -1);
  const primaryCount = factors.filter((f) => /primary|utama|kritis|critical/i.test(f.weight)).length;
  const weightTone = (w: string) =>
    /primary|utama|kritis|critical/i.test(w) ? "accent" : /amplif|penguat|secondary|sekunder/i.test(w) ? "warn" : undefined;

  const weightCounts = factors.reduce<Map<string, number>>((acc, f) => {
    const k = f.weight || "Direct";
    acc.set(k, (acc.get(k) || 0) + 1);
    return acc;
  }, new Map());
  const categoryCount = new Set(factors.map((f) => f.category).filter(Boolean)).size;

  return (
    <IntelCardShell
      title={s(data.title, "Root Cause Analysis")}
      badge={s(data.severity, "Resolved")}
      badgeTone="red"
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={!rootCauseText && factors.length === 0}
    >
      <RkBoard>
        {rootCauseText && (
          <div className="intel-rk__lead-in">
            <span className="intel-rk__lead-in-k">Root cause</span>
            {rootCauseText}
          </div>
        )}
        <RkSummary
          items={[
            ...(confidence >= 0 ? [{ label: "Confidence", value: <Num value={confidence} unit="%" /> }] : []),
            { label: "Factors", value: <Num value={factors.length} /> },
            ...(primaryCount > 0 ? [{ label: "Primary", value: <Num value={primaryCount} />, tone: "accent" }] : []),
          ]}
          aside={
            factors.length > 0 ? (
              <>
                {Array.from(weightCounts.entries()).map(([label, count]) => (
                  <span key={label} className="intel-rk__chip" data-tone={weightTone(label)}>
                    {count} {label}
                  </span>
                ))}
                <span className="intel-rk__aside-note">
                  {categoryCount > 1
                    ? `${categoryCount} areas`
                    : factors.length > 1
                      ? "Multi-factor chain"
                      : "Single trigger"}
                </span>
              </>
            ) : undefined
          }
        />
        {factors.length > 0 && (
          <RkList label="Contributing factors">
            {factors.map((f, i) => (
              <RkRow
                key={i}
                lead={<RkStep n={i + 1} last={i === factors.length - 1} />}
                title={f.category ? `${f.category}: ${f.cause}` : f.cause}
                sub={f.evidence || undefined}
                aside={
                  <span className="intel-rk__chip" data-tone={weightTone(f.weight)}>
                    {f.weight}
                  </span>
                }
              />
            ))}
          </RkList>
        )}
      </RkBoard>
    </IntelCardShell>
  );
}

/* 14. ImpactAnalysis — grouped severity tiers */
const IMPACT_TIERS = [
  { key: "high", label: "High", level: 3 },
  { key: "medium", label: "Medium", level: 2 },
  { key: "low", label: "Low", level: 1 },
] as const;

type ImpactTierKey = (typeof IMPACT_TIERS)[number]["key"];

function impactTierKey(raw: string): ImpactTierKey {
  const k = sevKey(raw);
  return k === "critical" || k === "high" ? "high" : k === "medium" ? "medium" : "low";
}

export function ImpactAnalysis({ data, state, streaming, sources }: IntelBaseProps) {
  const stagger = useStagger();
  const impacts = a<Record<string, unknown>>(data.impacts).map((im) => ({
    domain: s(im.domain || im.component),
    effect: s(im.effect),
    tier: impactTierKey(s(im.severity) || "medium"),
  }));
  const tiers = IMPACT_TIERS.map((t) => ({
    ...t,
    items: impacts.filter((x) => x.tier === t.key),
  })).filter((t) => t.items.length > 0);
  const distLabel = tiers.map((t) => `${t.label} ${t.items.length}`).join(", ");

  return (
    <IntelCardShell
      title={s(data.title, "Change Impact Analysis")}
      badge={`${impacts.length} areas`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={impacts.length === 0}
    >
      <motion.div {...stagger} className="intel-impact">
        <motion.div className="intel-impact__dist" variants={STAGGER_ITEM}>
          <div className="intel-impact__bar" role="img" aria-label={`Impact distribution: ${distLabel}`}>
            {tiers.map((t) => (
              <div
                key={t.key}
                className="intel-impact__seg"
                data-tier={t.key}
                style={{ flex: `${t.items.length} 1 0` }}
              >
                <MeterFill className="intel-impact__seg-fill" width="100%" />
              </div>
            ))}
          </div>
          <div className="intel-impact__legend">
            {tiers.map((t) => (
              <span key={t.key} className="intel-impact__legend-item">
                <i className="intel-impact__dot" data-tier={t.key} aria-hidden="true" />
                {t.label} {t.items.length}
              </span>
            ))}
          </div>
        </motion.div>
        {tiers.map((t) => (
          <motion.div key={t.key} className="intel-impact__tier" data-tier={t.key} variants={STAGGER_ITEM}>
            <div className="intel-impact__tier-head">
              <span className="intel-impact__tier-label">{t.label}</span>
              <span className="intel-impact__tier-count">
                {t.items.length} {t.items.length === 1 ? "area" : "areas"}
              </span>
              <span className="intel-impact__pips" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <i key={i} className="intel-impact__pip" data-on={i < t.level || undefined} />
                ))}
              </span>
            </div>
            <div className="intel-impact__rows">
              {t.items.map((x, i) => (
                <div key={i} className="intel-impact__row">
                  <div className="intel-impact__domain">{x.domain}</div>
                  {x.effect && <div className="intel-impact__effect">{x.effect}</div>}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </IntelCardShell>
  );
}

/* 15. CostBenefitAnalysis */
export function CostBenefitAnalysis({ data, state, streaming, sources }: IntelBaseProps) {
  const costs = a<Record<string, unknown>>(data.costs);
  const benefits = a<Record<string, unknown>>(data.benefits);
  const totalCost = costs.reduce((acc, c) => acc + n(c.amount), 0);
  const totalBenefit = benefits.reduce((acc, b) => acc + n(b.amount), 0);
  const net = totalBenefit - totalCost;
  const unit = s(data.unit, "$");

  return (
    <IntelCardShell
      title={s(data.title, "Cost-Benefit Analysis")}
      badge={`Net: ${unit}${net.toLocaleString()}`}
      badgeTone={net >= 0 ? "green" : "red"}
      icon={<TrendingUp size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={costs.length === 0 && benefits.length === 0}
    >
      <div className="intel-two-col">
        <div>
          <div className="intel-col-label intel-text-red">Costs ({unit}{totalCost.toLocaleString()})</div>
          {costs.map((c, i) => (
            <div key={i} className="intel-subcard__row" style={{ padding: "5px 0", borderBottom: "1px solid var(--gu-line, rgba(128,128,140,0.14))" }}>
              <span>{s(c.label)}</span>
              <strong>{unit}{n(c.amount).toLocaleString()}</strong>
            </div>
          ))}
        </div>
        <div>
          <div className="intel-col-label intel-text-green">Benefits ({unit}{totalBenefit.toLocaleString()})</div>
          {benefits.map((b, i) => (
            <div key={i} className="intel-subcard__row" style={{ padding: "5px 0", borderBottom: "1px solid var(--gu-line, rgba(128,128,140,0.14))" }}>
              <span>{s(b.label)}</span>
              <strong>{unit}{n(b.amount).toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </div>
    </IntelCardShell>
  );
}

/* 16. OptionEvaluation — leaderboard with winner hero */
function optevScore(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

const optevPct = (v: number) => Math.max(0, Math.min(100, v));

export function OptionEvaluation({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const reduce = useReducedMotion();
  const plateId = useId();
  const [activeIdx, setActiveIdx] = useState(-1);

  const options = a<Record<string, unknown>>(data.options).map((op) => ({
    op,
    name: s(op.name || op.title || op.label),
    summary: s(op.summary || op.description) || undefined,
    score: optevScore(op.score) ?? optevScore(op.total),
    recommended: Boolean(op.recommended),
  }));
  const scored = options
    .filter((o) => o.score !== null)
    .sort((x, y) => (y.score as number) - (x.score as number));
  const sorted = [...scored, ...options.filter((o) => o.score === null)];
  const top = sorted[0];
  const topScore = top?.score ?? null;
  const topPct = topScore === null ? 0 : optevPct(topScore);
  const scoredCount = scored.length;
  const avg = scoredCount ? Math.round(scored.reduce((sum, o) => sum + (o.score as number), 0) / scoredCount) : null;
  const leadGap = scoredCount >= 2 && topScore !== null ? Math.round(topScore - (scored[1].score as number)) : null;

  const plate = (idx: number) =>
    activeIdx === idx ? (
      <motion.span
        layoutId={`${plateId}-plate`}
        className="intel-optev__plate"
        aria-hidden="true"
        transition={reduce ? { duration: 0 } : MH.spring}
      />
    ) : null;

  const interactive = (idx: number, op: Record<string, unknown>) => {
    const base = {
      onMouseEnter: () => setActiveIdx(idx),
      onFocus: () => setActiveIdx(idx),
    };
    if (!onAction) return base;
    const pick = () => onAction({ type: "select", payload: { option: op } });
    return {
      ...base,
      role: "button" as const,
      tabIndex: 0,
      onClick: pick,
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pick();
        }
      },
    };
  };

  const nameRow = (o: (typeof sorted)[number], size: "top" | "row") => (
    <div className={size === "top" ? "intel-optev__top-name" : "intel-optev__row-name"}>
      {o.name}
      {o.recommended && (
        <span className="intel-rk__chip" data-tone="good">
          Recommended
        </span>
      )}
    </div>
  );

  return (
    <IntelCardShell
      title={s(data.title, "Option Evaluation")}
      badge={`${options.length} evaluated`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={options.length === 0}
    >
      <div className="intel-optev" onMouseLeave={() => setActiveIdx(-1)}>
        {top && (
          <div
            className={`intel-optev__top${activeIdx === 0 ? " is-active" : ""}${onAction ? " is-clickable" : ""}`}
            {...interactive(0, top.op)}
          >
            {plate(0)}
            <div className="intel-optev__top-main">
              <div className="intel-optev__kicker">Top pick</div>
              {nameRow(top, "top")}
              {top.summary && <p className="intel-optev__top-summary">{top.summary}</p>}
            </div>
            {topScore !== null ? (
              <div className="intel-optev__top-score">
                <Num value={topScore} className="intel-optev__top-num" />
                <span className="intel-optev__top-of">/100</span>
              </div>
            ) : (
              <div className="intel-optev__top-score">
                <span className="intel-optev__top-of">Unscored</span>
              </div>
            )}
            {topScore !== null && (
              <div className="intel-optev__top-bar">
                <div className="intel-optev__track intel-optev__track--hero">
                  <MeterFill className="intel-optev__fill intel-optev__fill--accent" width={`${topPct}%`} />
                </div>
              </div>
            )}
          </div>
        )}
        {sorted.length > 1 && (
          <div className="intel-optev__list">
            {sorted.slice(1).map((o, i) => {
              const idx = i + 1;
              const rank = String(i + 2).padStart(2, "0");
              const gap = o.score !== null && topScore !== null ? Math.round(topScore - o.score) : null;
              const pct = o.score === null ? 0 : optevPct(o.score);
              return (
                <div
                  key={idx}
                  className={`intel-optev__row${activeIdx === idx ? " is-active" : ""}${onAction ? " is-clickable" : ""}`}
                  {...interactive(idx, o.op)}
                >
                  {plate(idx)}
                  <span className="intel-optev__rank">{rank}</span>
                  <div className="intel-optev__row-main">
                    {nameRow(o, "row")}
                    {o.summary && <p className="intel-optev__row-summary">{o.summary}</p>}
                  </div>
                  <div className="intel-optev__row-score">
                    {o.score !== null ? (
                      <>
                        <Num value={o.score} />
                        {gap !== null && gap > 0 && <span className="intel-optev__gap">−{gap}</span>}
                      </>
                    ) : (
                      <span className="intel-optev__gap">Unscored</span>
                    )}
                  </div>
                  {o.score !== null && (
                    <div className="intel-optev__row-bar">
                      <div className="intel-optev__track intel-optev__track--row">
                        <MeterFill className="intel-optev__fill intel-optev__fill--neutral" width={`${pct}%`} />
                        {topScore !== null && (
                          <i className="intel-optev__mark" style={{ left: `${topPct}%` }} aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="intel-optev__foot">
          {avg !== null ? `Avg ${avg}/100 · ` : ""}
          {options.length} options
          {leadGap !== null ? ` · lead +${leadGap}` : ""}
        </div>
      </div>
    </IntelCardShell>
  );
}

/* 17. RiskRegister */
export function RiskRegister({ data, state, streaming, sources }: IntelBaseProps) {
  const entries = a<Record<string, unknown>>(data.risks);
  return (
    <IntelCardShell
      title={s(data.title, "Risk Register")}
      badge={`${entries.length} entries`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={entries.length === 0}
    >
      <div className="intel-table-scroll">
        <table className="intel-matrix-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Risk</th>
              <th>Severity</th>
              <th>Owner</th>
              <th>Mitigation</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((r, i) => (
              <tr key={i}>
                <td className="intel-muted-mono">{s(r.id, `R-${i + 1}`)}</td>
                <td><strong>{s(r.title)}</strong></td>
                <td><span className={`intel-badge intel-badge--${badgeClassForTone(s(r.severity, "medium"))}`}>{s(r.severity, "Medium")}</span></td>
                <td>{s(r.owner)}</td>
                <td>{s(r.mitigation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </IntelCardShell>
  );
}

/* 18. DecisionRecord (ADR format) — reasoning chain */
export function DecisionRecord({ data, state, streaming, sources }: IntelBaseProps) {
  const title = s(data.title);
  const status = s(data.status, "Accepted");
  const adrId = s(data.id || data.adr || data.adrId || data.ref);
  const adrDate = s(data.date || data.createdAt || data.decidedAt);
  const statusTone = /accept|aproved|setuju|merged/i.test(status) ? "good" : /reject|deprecat|superseded/i.test(status) ? "bad" : "warn";
  const consequences = a<string>(data.consequences);

  return (
    <IntelCardShell
      title={title || "Decision Record (ADR)"}
      badge={status}
      badgeTone={statusTone === "good" ? "green" : statusTone === "bad" ? "red" : "amber"}
      icon={<FileCheck size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={!title}
    >
      <RkBoard>
        <RkSummary
          items={[
            { label: "Status", value: status, tone: statusTone },
            ...(adrId ? [{ label: "ADR", value: adrId }] : []),
            ...(adrDate ? [{ label: "Date", value: adrDate }] : []),
          ]}
        />
        <RkList label="Decision record">
          <RkRow lead={<RkStep n={1} />} title="Context">
            <div className="intel-rk__body">{s(data.context)}</div>
          </RkRow>
          <RkRow lead={<RkStep n={2} />} title="Decision">
            <div className="intel-rk__body">{s(data.decision)}</div>
          </RkRow>
          <RkRow lead={<RkStep n={3} last />} title="Consequences">
            {consequences.length > 0 ? (
              <ul className="intel-bullet-list">
                {consequences.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            ) : (
              <div className="intel-rk__body">No downstream consequences recorded.</div>
            )}
          </RkRow>
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}
