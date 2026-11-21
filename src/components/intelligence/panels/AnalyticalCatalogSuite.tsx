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

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  RkMeter,
  RkRank,
  RkRow,
  RkStep,
  RkSummary,
  sevKey,
  sevLabel,
} from "../shared/RowKit";
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

/* 3. RiskMatrix (5x5 probability x impact grid + interactive cell click) */
export function RiskMatrix({ data, state, streaming, sources }: IntelBaseProps) {
  const risks = a<Record<string, unknown>>(data.risks);
  const [selectedRisk, setSelectedRisk] = useState<Record<string, unknown> | null>(null);

  return (
    <IntelCardShell
      title={s(data.title, "Risk Matrix (Probability × Impact)")}
      badge={`${risks.length} risks`}
      badgeTone="red"
      icon={<AlertTriangle size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={risks.length === 0}
    >
      <div className="intel-risk-grid-wrap">
        <div className="intel-risk-grid">
          {[5, 4, 3, 2, 1].map((prob) =>
            [1, 2, 3, 4, 5].map((imp) => {
              const score = prob * imp;
              const bg =
                score >= 15
                  ? "rgba(239, 140, 102, 0.28)"
                  : score >= 8
                    ? "rgba(201, 151, 59, 0.2)"
                    : "var(--gu-tint, rgba(128, 128, 140, 0.08))";
              const cellRisks = risks.filter((r) => n(r.probability, 3) === prob && n(r.impact, 3) === imp);
              return (
                <div key={`${prob}-${imp}`} className="intel-risk-cell" style={{ background: bg }} title={`P:${prob} × I:${imp}`}>
                  <span className="intel-risk-coord">P{prob}·I{imp}</span>
                  {cellRisks.map((cr, idx) => (
                    <motion.button
                      key={idx}
                      type="button"
                      className="intel-risk-dot"
                      whileHover={MH.chip}
                      whileTap={MH.tap}
                      transition={MH.spring}
                      onClick={() => setSelectedRisk(cr)}
                    >
                      {s(cr.code || cr.title).slice(0, 10)}
                    </motion.button>
                  ))}
                </div>
              );
            }),
          )}
        </div>
      </div>
      {selectedRisk && (
        <div className="intel-subcard__expand" style={{ marginTop: 10 }}>
          <strong>{s(selectedRisk.title)}</strong> (P={n(selectedRisk.probability)}, I={n(selectedRisk.impact)}):{" "}
          {s(selectedRisk.mitigation)}
        </div>
      )}
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

/* 14. ImpactAnalysis — score board with 3-step level meter */
function impactStep(raw?: string): number {
  const k = sevKey(raw);
  return k === "critical" || k === "high" ? 3 : k === "medium" ? 2 : 1;
}

export function ImpactAnalysis({ data, state, streaming, sources }: IntelBaseProps) {
  const impacts = a<Record<string, unknown>>(data.impacts);
  const rows = impacts
    .map((im, i) => ({ im, i, step: impactStep(s(im.severity, "medium")), level: sevLabel(s(im.severity, "medium")) }))
    .sort((x, y) => y.step - x.step);
  const highCount = rows.filter((r) => r.step === 3).length;
  const top = rows[0];

  return (
    <IntelCardShell
      title={s(data.title, "Change Impact Analysis")}
      badge={`${impacts.length} areas`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={impacts.length === 0}
    >
      <RkBoard>
        <RkSummary
          items={[
            ...(top ? [{ label: "Highest", value: `${s(top.im.domain || top.im.component)} · ${top.level}` }] : []),
            ...(highCount > 0 ? [{ label: "High impact", value: <Num value={highCount} />, tone: "warn" }] : []),
            { label: "Areas", value: <Num value={impacts.length} /> },
          ]}
        />
        <RkList label="Impacted areas">
          {rows.map(({ im, i, step, level }, idx) => (
            <RkRow
              key={i}
              lead={<RkRank n={idx + 1} top={idx === 0} />}
              title={s(im.domain || im.component)}
              sub={s(im.effect)}
              aside={
                <RkMeter
                  value={step}
                  max={3}
                  steps={3}
                  num={level}
                  tone={step === 3 ? "warn" : step === 2 ? "accent" : "neutral"}
                />
              }
            />
          ))}
        </RkList>
      </RkBoard>
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

/* 16. OptionEvaluation — score board */
export function OptionEvaluation({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const options = a<Record<string, unknown>>(data.options);
  const rows = options
    .map((op, i) => ({ op, i, score: n(op.score, 70) }))
    .sort((x, y) => y.score - x.score);
  const avg = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.score, 0) / rows.length) : 0;
  const top = rows[0];

  return (
    <IntelCardShell
      title={s(data.title, "Option Evaluation")}
      badge={`${options.length} evaluated`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={options.length === 0}
    >
      <RkBoard>
        <RkSummary
          items={[
            ...(top ? [{ label: "Top option", value: `${s(top.op.name)} · ${top.score}/100` }] : []),
            { label: "Avg score", value: <Num value={avg} unit="/100" /> },
            { label: "Evaluated", value: <Num value={options.length} /> },
          ]}
        />
        <RkList label="Evaluated options">
          {rows.map(({ op, i, score }, idx) => (
            <RkRow
              key={i}
              lead={<RkRank n={idx + 1} top={idx === 0} />}
              title={
                <>
                  {s(op.name)}
                  {Boolean(op.recommended) && " "}
                  {Boolean(op.recommended) && (
                    <span className="intel-rk__chip" data-tone="good">
                      Recommended
                    </span>
                  )}
                </>
              }
              sub={s(op.summary)}
              aside={<RkMeter value={score} max={100} unit="/100" tone={idx === 0 ? "accent" : "neutral"} />}
              onClick={() => onAction?.({ type: "select", payload: { option: op } })}
            />
          ))}
        </RkList>
      </RkBoard>
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
