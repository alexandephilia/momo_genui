"use client";

/**
 * Category 09 — Interactive Intelligence UI (16 Components)
 *
 * Components:
 * - interactive_filter, parameter_explorer, what_if_simulator, scenario_controls,
 *   graph_explorer, evidence_filter, timeline_explorer, data_drilldown,
 *   comparison_selector, confidence_explorer, hypothesis_selector,
 *   assumption_editor, interactive_matrix, map_layer_controls,
 *   query_builder, investigation_controls
 */

import { Fragment, useEffect, useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import {
  Filter,
  SlidersHorizontal,
  Play,
  Layers,
  Code2,
  Plus,
  Trash2,
  ChevronRight,
} from "lucide-react";
import type { IntelBaseProps, IntelGraphData } from "@/lib/intelligence/types";
import IntelligenceGraph from "../graphs/IntelligenceGraph";
import { IntelCardShell, badgeClassForTone, s, n, a } from "../shared/IntelCardShell";
import { ActivePlate, Collapse, SwitchThumb, switchTrack, tweenPaint } from "../shared/StateMotion";
import { Num } from "../charts/kit";
import { RkBoard, RkList, RkMeter, RkRank, RkRow, RkSummary } from "../shared/RowKit";

/* 1. InteractiveFilter */
export function InteractiveFilter({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const facets = a<Record<string, unknown>>(data.facets);
  const items = a<Record<string, unknown>>(data.items);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const pillId = useId();

  const filtered = useMemo(() => {
    return items.filter((item) =>
      Object.entries(selected).every(([k, v]) => !v || v === "All" || s(item[k]) === v),
    );
  }, [items, selected]);

  return (
    <IntelCardShell title={s(data.title, "Interactive Filter")} badge={`${filtered.length}/${items.length} matched`} icon={<Filter size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={facets.length === 0 && items.length === 0}>
      <div className="intel-list-grid intel-filter-facets">
        {facets.map((f, i) => {
          const key = s(f.key);
          const cur = selected[key] || "All";
          return (
            <div key={i} className="intel-facet-row">
              <span className="intel-col-label">{s(f.label)}</span>
              <div className="intel-filter-pills">
                {["All", ...a<string>(f.options)].map((opt) => (
                  <motion.button
                    key={opt}
                    type="button"
                    className={`intel-pill ${cur === opt ? "is-active" : ""}`}
                    whileHover={MH.chip}
                    whileTap={MH.tap}
                    transition={MH.spring}
                    onClick={() => {
                      const next = { ...selected, [key]: opt };
                      setSelected(next);
                      onAction?.({ type: "filter", payload: { filters: next } });
                    }}
                  >
                    {cur === opt && <ActivePlate layoutId={`${pillId}-${key}`} shadow />}
                    {opt}
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length > 0 && (
        <div className="intel-list-grid intel-filter-results">
          {filtered.map((it, i) => (
            <div key={i} className="intel-subcard intel-filter-item">
              <div className="intel-subcard__row intel-filter-item__head">
                <strong>{s(it.title || it.name)}</strong>
                {s(it.tag || it.category) && <span className="intel-badge intel-badge--blue">{s(it.tag || it.category)}</span>}
              </div>
              {s(it.summary) && <p className="intel-subcard__text">{s(it.summary)}</p>}
            </div>
          ))}
        </div>
      )}
    </IntelCardShell>
  );
}

/* 2. ParameterExplorer */
export function ParameterExplorer({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const params = a<Record<string, unknown>>(data.parameters);
  const [vals, setVals] = useState<Record<string, number>>({});
  const get = (p: Record<string, unknown>) => vals[s(p.key)] ?? n(p.value, 50);

  return (
    <IntelCardShell title={s(data.title, "Parameter Explorer")} icon={<SlidersHorizontal size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={params.length === 0}>
      <div className="intel-list-grid">
        {params.map((p, i) => {
          const k = s(p.key, `p-${i}`);
          const v = get(p);
          return (
            <div key={k} className="intel-subcard">
              <div className="intel-subcard__row">
                <strong>{s(p.label)}</strong>
                <span className="intel-muted-mono">{v}{s(p.unit)}</span>
              </div>
              <input
                type="range"
                min={n(p.min, 0)}
                max={n(p.max, 100)}
                step={n(p.step, 1)}
                value={v}
                onChange={(e) => {
                  const next = { ...vals, [k]: Number(e.target.value) };
                  setVals(next);
                  onAction?.({ type: "select", payload: { parameters: next } });
                }}
                style={{ width: "100%", marginTop: 6 }}
              />
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 3. WhatIfSimulator */
export function WhatIfSimulator({ data, state, streaming, sources }: IntelBaseProps) {
  const inputs = a<Record<string, unknown>>(data.inputs);
  const [vals, setVals] = useState<Record<string, number>>({});
  const get = (inp: Record<string, unknown>) => vals[s(inp.key)] ?? n(inp.value, 10);

  const revenue = get(inputs[0] || {}) * get(inputs[1] || {}) * (1 - get(inputs[2] || {}) / 100);
  const cost = n(data.fixedCost, 5000) + get(inputs[0] || {}) * n(data.unitCost, 2);
  const profit = revenue - cost;

  return (
    <IntelCardShell title={s(data.title, "What-If Simulator")} badge={`Net: $${Math.round(profit).toLocaleString()}`} badgeTone={profit >= 0 ? "green" : "red"} icon={<Play size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={inputs.length === 0}>
      <div className="intel-metric-group" style={{ marginBottom: 12 }}>
        <div className="intel-metric">
          <span className="intel-metric__label">Simulated Revenue</span>
          <span className="intel-metric__value">${Math.round(revenue).toLocaleString()}</span>
        </div>
        <div className="intel-metric">
          <span className="intel-metric__label">Projected Cost</span>
          <span className="intel-metric__value">${Math.round(cost).toLocaleString()}</span>
        </div>
        <div className="intel-metric">
          <span className="intel-metric__label">Net Impact</span>
          <span className="intel-metric__value" style={{ color: profit >= 0 ? "#ef8c66" : "#d97757" }}>${Math.round(profit).toLocaleString()}</span>
        </div>
      </div>
      <div className="intel-list-grid">
        {inputs.map((inp, i) => {
          const k = s(inp.key, `wi-${i}`);
          const v = get(inp);
          return (
            <div key={k} className="intel-subcard">
              <div className="intel-subcard__row">
                <strong>{s(inp.label)}</strong>
                <span className="intel-muted-mono">{v}{s(inp.unit)}</span>
              </div>
              <input type="range" min={n(inp.min, 0)} max={n(inp.max, 1000)} step={n(inp.step, 1)} value={v} onChange={(e) => setVals((p) => ({ ...p, [k]: Number(e.target.value) }))} style={{ width: "100%", marginTop: 6 }} />
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 4. ScenarioControls */
export function ScenarioControls({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const presets = a<Record<string, unknown>>(data.presets);
  const [active, setActive] = useState(0);
  const pillId = useId();
  const toggles = a<Record<string, unknown>>(data.toggles);
  const [switches, setSwitches] = useState<Record<string, boolean>>({});
  const reduce = useReducedMotion();

  return (
    <IntelCardShell title={s(data.title, "Scenario Controls")} state={state} streaming={streaming} sources={sources} isEmpty={presets.length === 0 && toggles.length === 0}>
      {presets.length > 0 && (
        <div className="intel-filter-pills" style={{ marginBottom: 12 }}>
          {presets.map((pr, i) => (
            <motion.button
              key={i}
              type="button"
              className={`intel-pill ${active === i ? "is-active" : ""}`}
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() => {
                setActive(i);
                onAction?.({ type: "select", payload: { preset: pr } });
              }}
            >
              {active === i && <ActivePlate layoutId={pillId} shadow />}
              {s(pr.label)}
            </motion.button>
          ))}
        </div>
      )}
      {presets[active] && <p className="intel-subcard__text" style={{ marginBottom: 10 }}>{s(presets[active].description)}</p>}
      <div className="intel-list-grid">
        {toggles.map((tg, i) => {
          const k = s(tg.key, `tg-${i}`);
          const on = switches[k] ?? Boolean(tg.enabled);
          return (
            <div key={k} className="intel-subcard intel-subcard__row">
              <div>
                <strong>{s(tg.label)}</strong>
                {s(tg.effect) && <div className="intel-muted-mono">{s(tg.effect)}</div>}
              </div>
              <motion.button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={s(tg.label)}
                className={`intel-skeuo-switch ${on ? "is-on" : ""}`}
                style={switchTrack(on)}
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={(e) => {
                  tweenPaint(e.currentTarget, reduce);
                  setSwitches((p) => ({ ...p, [k]: !on }));
                }}
              >
                <SwitchThumb className="intel-skeuo-switch__thumb" />
              </motion.button>
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 5. GraphExplorer (XYFlow + node filter pills) */
export function GraphExplorer({ data, state, onAction }: IntelBaseProps) {
  const nodes = a<Record<string, unknown>>(data.nodes);
  const edges = a<Record<string, unknown>>(data.edges);
  const [typeFilter, setTypeFilter] = useState("all");
  const pillId = useId();

  if (state === "loading") return <IntelCardShell state="loading" title="Graph Explorer"><div /></IntelCardShell>;
  if (state === "error") return <IntelCardShell state="error" title="Graph Explorer"><div /></IntelCardShell>;
  if (state === "empty" || nodes.length === 0) return <IntelCardShell state="empty" emptyMessage="No graph to explore"><div /></IntelCardShell>;

  const types = ["all", ...Array.from(new Set(nodes.map((nd) => s(nd.type)).filter(Boolean)))];
  const filteredNodes = typeFilter === "all" ? nodes : nodes.filter((nd) => s(nd.type) === typeFilter);
  const visibleIds = new Set(filteredNodes.map((nd) => s(nd.id)));
  const filteredEdges = edges.filter((ed) => visibleIds.has(s(ed.source)) && visibleIds.has(s(ed.target)));

  const graphData: IntelGraphData = {
    nodes: filteredNodes.map((nd, i) => ({
      id: s(nd.id, `gx-${i}`),
      label: s(nd.label),
      type: s(nd.type, "entity"),
      detail: s(nd.detail) || undefined,
    })),
    edges: filteredEdges.map((ed, i) => ({
      id: s(ed.id, `gxe-${i}`),
      source: s(ed.source),
      target: s(ed.target),
      label: s(ed.label) || undefined,
      type: "association",
    })),
    layout: "force",
    direction: "LR",
  };

  return (
    <IntelligenceGraph
      graphData={graphData}
      title={s(data.title, "Interactive Graph Explorer")}
      onNodeClick={(node) => onAction?.({ type: "select", payload: { node } })}
      controls={
        <div className="intel-filter-pills">
          {types.map((t) => (
            <motion.button key={t} type="button" className={`intel-pill ${typeFilter === t ? "is-active" : ""}`} whileHover={MH.chip} whileTap={MH.tap} transition={MH.spring} onClick={() => setTypeFilter(t)}>
              {typeFilter === t && <ActivePlate layoutId={pillId} shadow />}
              {t}
            </motion.button>
          ))}
        </div>
      }
    />
  );
}

/* 6. EvidenceFilter */
export function EvidenceFilter({ data, state, streaming, sources }: IntelBaseProps) {
  const evidence = a<Record<string, unknown>>(data.evidence);
  const [minReliability, setMinReliability] = useState(0);
  const shown = evidence.filter((ev) => n(ev.score, 70) >= minReliability);

  return (
    <IntelCardShell
      title={s(data.title, "Evidence Filter")}
      badge={`${shown.length}/${evidence.length}`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={evidence.length === 0}
      headerRight={
        <div className="intel-weight-ctrl">
          <span className="intel-muted-mono">Min score: {minReliability}%</span>
          <input type="range" min={0} max={90} step={10} value={minReliability} onChange={(e) => setMinReliability(Number(e.target.value))} />
        </div>
      }
    >
      <div className="intel-list-grid">
        {shown.map((ev, i) => (
          <div key={i} className="intel-subcard">
            <div className="intel-subcard__row">
              <strong>{s(ev.claim)}</strong>
              <span className="intel-badge intel-badge--green">{n(ev.score, 80)}%</span>
            </div>
            <div className="intel-muted-mono">{s(ev.source)}</div>
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 7. TimelineExplorer */
export function TimelineExplorer({ data, state, streaming, sources }: IntelBaseProps) {
  const events = a<Record<string, unknown>>(data.events);
  const [cutoff, setCutoff] = useState(events.length);
  const [userAdjusted, setUserAdjusted] = useState(false);

  useEffect(() => {
    if (!userAdjusted && events.length > 0) {
      setCutoff(events.length);
    }
  }, [events.length, userAdjusted]);

  const effectiveCutoff = userAdjusted ? Math.min(events.length, Math.max(1, cutoff)) : events.length;
  const visible = events.slice(0, Math.max(1, effectiveCutoff));

  return (
    <IntelCardShell
      title={s(data.title, "Timeline Explorer")}
      badge={`${visible.length} of ${events.length}`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={events.length === 0}
      headerRight={
        <div className="intel-weight-ctrl">
          <input
            type="range"
            min={1}
            max={Math.max(1, events.length)}
            step={1}
            value={Math.max(1, effectiveCutoff)}
            onChange={(e) => {
              setUserAdjusted(true);
              setCutoff(Number(e.target.value));
            }}
          />
        </div>
      }
    >
      <div className="intel-timeline">
        {visible.map((ev, i) => (
          <motion.div key={i} className="intel-timeline__item" whileHover={MH.row} transition={MH.spring}>
            <div className="intel-timeline__rail">
              <span className="intel-dot" style={{ background: "#ef8c66" }} />
              {i < visible.length - 1 && <div className="intel-timeline__line" />}
            </div>
            <div className="intel-timeline__content">
              <div className="intel-timeline__top">
                <span className="intel-timeline__label">{s(ev.title)}</span>
                <span className="intel-timeline__time">{s(ev.time)}</span>
              </div>
              <p className="intel-timeline__detail">{s(ev.detail)}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 8. DataDrilldown — evidence stack: expandable share rows */
function drillAmount(raw: unknown): number {
  const m = String(raw ?? "")
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

function DrillLevel({
  items,
  prefix,
  open,
  onToggle,
}: {
  items: Record<string, unknown>[];
  prefix: string;
  open: Set<string>;
  onToggle: (key: string) => void;
}) {
  const total = items.reduce((sum, it) => sum + drillAmount(it.value), 0);
  return (
    <>
      {items.map((item, i) => {
        const key = `${prefix}${i}`;
        const children = a<Record<string, unknown>>(item.children);
        const hasChildren = children.length > 0;
        const isOpen = open.has(key);
        const pct = total > 0 ? Math.round((drillAmount(item.value) / total) * 100) : 0;
        return (
          <RkRow
            key={key}
            title={s(item.name)}
            aside={
              <>
                <span className="intel-rk__delta-val">{s(item.value)}</span>
                {hasChildren && (
                  <motion.span
                    className="intel-rk__chev"
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={MH.spring}
                    aria-hidden="true"
                  >
                    <ChevronRight size={13} />
                  </motion.span>
                )}
              </>
            }
            selected={isOpen || undefined}
            onClick={hasChildren ? () => onToggle(key) : undefined}
          >
            {total > 0 && pct > 0 && (
              <div className="intel-rk__child">
                <RkMeter value={pct} max={100} unit="%" tone="accent" />
              </div>
            )}
            {hasChildren && (
              <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <Collapse open={isOpen}>
                  <div className="intel-rk__children">
                    <DrillLevel items={children} prefix={`${key}.`} open={open} onToggle={onToggle} />
                  </div>
                </Collapse>
              </div>
            )}
          </RkRow>
        );
      })}
    </>
  );
}

export function DataDrilldown({ data, state, streaming, sources }: IntelBaseProps) {
  const root = a<Record<string, unknown>>(data.levels);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const rootTotal = root.reduce((sum, it) => sum + drillAmount(it.value), 0);
  const money = root.some((it) => /^\s*\$/.test(s(it.value)));
  const biggest = root.reduce(
    (best, it) => (drillAmount(it.value) > drillAmount(best?.value) ? it : best),
    root[0] as Record<string, unknown> | undefined,
  );

  return (
    <IntelCardShell title={s(data.title, "Data Drilldown")} badge={`${root.length} groups`} state={state} streaming={streaming} sources={sources} isEmpty={root.length === 0}>
      <RkBoard>
        <RkSummary
          items={[
            { label: "Total", value: money ? `$${rootTotal.toLocaleString()}` : <Num value={rootTotal} /> },
            ...(biggest ? [{ label: "Largest", value: `${s(biggest.name)} · ${s(biggest.value)}` }] : []),
          ]}
        />
        <RkList label="Drilldown levels">
          <DrillLevel items={root} prefix="" open={open} onToggle={toggle} />
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 9. ComparisonSelector */
const CMP_SLOT_LETTERS = ["A", "B", "C"] as const;
const CMP_SLOT_TONES = ["coral", "sky", "gold"] as const;

export function ComparisonSelector({ data, state, streaming, sources }: IntelBaseProps) {
  const candidates = a<Record<string, unknown>>(data.candidates);
  const [picked, setPicked] = useState<number[]>([0, 1]);

  const toggle = (idx: number) =>
    setPicked((prev) =>
      prev.includes(idx) ? (prev.length > 1 ? prev.filter((x) => x !== idx) : prev) : [...prev.slice(-2), idx],
    );

  return (
    <IntelCardShell title={s(data.title, "Comparison Selector")} badge={`${picked.length} selected`} state={state} streaming={streaming} sources={sources} isEmpty={candidates.length === 0}>
      <div className="intel-cmp-bar">
        <div className="intel-cmp-seg" role="group" aria-label="Select candidates to compare">
          {candidates.map((c, i) => {
            const slotIdx = picked.indexOf(i);
            const active = slotIdx !== -1;
            const tone = active ? CMP_SLOT_TONES[slotIdx % CMP_SLOT_TONES.length] : "idle";
            return (
              <motion.button
                key={i}
                type="button"
                aria-pressed={active}
                data-slot-tone={tone}
                className={`intel-cmp-chip${active ? " is-picked" : ""}`}
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={() => toggle(i)}
              >
                <span className="intel-cmp-chip__slot">
                  {active ? CMP_SLOT_LETTERS[slotIdx % CMP_SLOT_LETTERS.length] : "+"}
                </span>
                <span className="intel-cmp-chip__name">{s(c.name)}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
      <div className="intel-compare-grid">
        {picked.map((idx, slotIdx) => {
          const item = candidates[idx];
          if (!item) return null;
          const tone = CMP_SLOT_TONES[slotIdx % CMP_SLOT_TONES.length];
          return (
            <div key={idx} className="intel-compare-card intel-cmp-card" data-slot-tone={tone}>
              <div className="intel-cmp-card__head">
                <strong>{s(item.name)}</strong>
                <span className="intel-cmp-chip__slot is-card-badge" data-slot-tone={tone}>
                  {CMP_SLOT_LETTERS[slotIdx % CMP_SLOT_LETTERS.length]}
                </span>
              </div>
              <p className="intel-subcard__text">{s(item.summary)}</p>
              <div className="intel-kv-list">
                {Object.entries((item.specs as Record<string, unknown>) || {}).map(([k, v]) => (
                  <div key={k} className="intel-subcard__row">
                    <span className="intel-muted-mono">{k}</span>
                    <strong>{String(v)}</strong>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 10. ConfidenceExplorer — score board with threshold gate */
export function ConfidenceExplorer({ data, state, streaming, sources }: IntelBaseProps) {
  const factors = a<Record<string, unknown>>(data.factors);
  const [threshold, setThreshold] = useState(70);
  const rows = factors
    .map((f, i) => ({ f, i, conf: n(f.confidence, 50) }))
    .sort((x, y) => y.conf - x.conf);
  const avg = rows.length ? Math.round(rows.reduce((s0, r) => s0 + r.conf, 0) / rows.length) : 0;
  const passing = rows.filter((r) => r.conf >= threshold).length;
  const failing = rows.length - passing;

  return (
    <IntelCardShell
      title={s(data.title, "Confidence Explorer")}
      badge={`Avg: ${avg}%`}
      badgeTone={avg >= threshold ? "green" : "amber"}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={factors.length === 0}
      headerRight={
        <div className="intel-weight-ctrl">
          <span className="intel-muted-mono">Gate: {threshold}%</span>
          <input type="range" min={30} max={95} step={5} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
        </div>
      }
    >
      <RkBoard>
        <RkSummary
          items={[
            { label: "Avg confidence", value: <Num value={avg} unit="%" /> },
            { label: "Above gate", value: <Num value={passing} />, tone: "good" },
            ...(failing > 0 ? [{ label: "Below gate", value: <Num value={failing} />, tone: "warn" }] : []),
          ]}
        />
        <RkList label="Confidence factors">
          {rows.map(({ f, i, conf }, idx) => {
            const passes = conf >= threshold;
            return (
              <RkRow
                key={i}
                lead={<RkRank n={idx + 1} top={idx === 0} />}
                title={s(f.label)}
                sub={s(f.note || f.reason || f.detail)}
                aside={<RkMeter value={conf} unit="%" tone={idx === 0 ? "accent" : "neutral"} />}
                dim={!passes}
              />
            );
          })}
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 11. HypothesisSelector */
export function HypothesisSelector({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const options = a<Record<string, unknown>>(data.hypotheses);
  const [selected, setSelected] = useState(0);
  return (
    <IntelCardShell title={s(data.title, "Hypothesis Selector")} state={state} streaming={streaming} sources={sources} isEmpty={options.length === 0}>
      <div className="intel-list-grid" role="radiogroup">
        {options.map((op, i) => (
          <div
            key={i}
            role="radio"
            aria-checked={selected === i}
            tabIndex={0}
            className={`intel-subcard ${selected === i ? "is-selected" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => {
              setSelected(i);
              onAction?.({ type: "select", payload: { hypothesis: op } });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelected(i);
                onAction?.({ type: "select", payload: { hypothesis: op } });
              }
            }}
          >
            <div className="intel-subcard__row">
              <div className="intel-subcard__title-group">
                <span className={`intel-skeuo-radio ${selected === i ? "is-checked" : ""}`} aria-hidden="true" />
                <strong>{s(op.statement)}</strong>
              </div>
              <span className="intel-badge intel-badge--purple">Prior {n(op.prior, 50)}%</span>
            </div>
            <p className="intel-subcard__text">{s(op.testPlan)}</p>
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 12. AssumptionEditor */
export function AssumptionEditor({ data, state, streaming, sources }: IntelBaseProps) {
  const initial = a<Record<string, unknown>>(data.assumptions);
  const [items, setItems] = useState(initial);
  return (
    <IntelCardShell title={s(data.title, "Assumption Editor")} badge={`${items.length} editable`} state={state} streaming={streaming} sources={sources} isEmpty={items.length === 0}>
      <div className="intel-list-grid">
        {items.map((it, i) => (
          <div key={i} className="intel-subcard">
            <div className="intel-subcard__row">
              <strong>{s(it.label)}</strong>
              <input
                className="intel-inline-input"
                value={s(it.value)}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], value: e.target.value };
                  setItems(next);
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 13. InteractiveMatrix */
export function InteractiveMatrix({ data, state, streaming, sources }: IntelBaseProps) {
  const rows = a<string>(data.rows);
  const cols = a<string>(data.cols);
  const cells = a<Record<string, unknown>[]>(data.cells);
  const [active, setActive] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const cell = cells[active.r]?.[active.c];

  return (
    <IntelCardShell title={s(data.title, "Interactive Matrix")} state={state} streaming={streaming} sources={sources} isEmpty={rows.length === 0 || cols.length === 0}>
      <div className="intel-table-scroll">
        <table className="intel-matrix-table">
          <thead>
            <tr>
              <th />
              {cols.map((c, i) => <th key={i}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((rl, r) => (
              <tr key={r}>
                <td className="intel-matrix-rowhead">{rl}</td>
                {cols.map((_, c) => {
                  const cl = cells[r]?.[c];
                  const isSel = active.r === r && active.c === c;
                  return (
                    <td
                      key={c}
                      onClick={() => setActive({ r, c })}
                      style={{
                        cursor: "pointer",
                        textAlign: "center",
                        background: isSel ? "rgba(239, 140, 102, 0.12)" : undefined,
                        color: isSel ? "#ef8c66" : undefined,
                        fontWeight: isSel ? 600 : undefined,
                        borderRadius: isSel ? 6 : undefined,
                      }}
                    >
                      {s(cl?.value, "—")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cell && (
        <div className="intel-subcard__expand" style={{ marginTop: 10 }}>
          <strong>{rows[active.r]} × {cols[active.c]}:</strong> {s(cell.detail, s(cell.value))}
        </div>
      )}
    </IntelCardShell>
  );
}

/* 14. MapLayerControls */
export function MapLayerControls({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const layers = a<Record<string, unknown>>(data.layers);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const reduce = useReducedMotion();
  return (
    <IntelCardShell title={s(data.title, "Spatial Layer Controls")} icon={<Layers size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={layers.length === 0}>
      <div className="intel-list-grid">
        {layers.map((ly, i) => {
          const k = s(ly.id, `ly-${i}`);
          const on = enabled[k] ?? Boolean(ly.visible);
          return (
            <div key={k} className="intel-subcard intel-subcard__row">
              <div>
                <strong>{s(ly.name)}</strong>
                <div className="intel-muted-mono">{s(ly.description)} • {n(ly.featureCount)} features</div>
              </div>
              <motion.button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={s(ly.name)}
                className={`intel-skeuo-switch ${on ? "is-on" : ""}`}
                style={switchTrack(on)}
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={(e) => {
                  tweenPaint(e.currentTarget, reduce);
                  const next = { ...enabled, [k]: !on };
                  setEnabled(next);
                  onAction?.({ type: "filter", payload: { layers: next } });
                }}
              >
                <SwitchThumb className="intel-skeuo-switch__thumb" />
              </motion.button>
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 15. QueryBuilder — rule rows + live compiled preview */
const QB_OPS = ["=", "!=", "contains", ">", "<"];

export function QueryBuilder({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const fields = a<string>(data.fields);
  const [rules, setRules] = useState<Array<{ field: string; op: string; value: string }>>(
    a<{ field: string; op: string; value: string }>(data.rules),
  );

  const compiled = rules.map((r) => `${r.field} ${r.op} "${r.value}"`).join(" AND ");
  const update = (i: number, patch: Partial<{ field: string; op: string; value: string }>) =>
    setRules((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  return (
    <IntelCardShell
      title={s(data.title, "Structured Query Builder")}
      badge={`${rules.length} rule${rules.length === 1 ? "" : "s"}`}
      icon={<Code2 size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={fields.length === 0 && rules.length === 0}
      spineExtra={
        fields.length > 0 ? (
          <div className="intel-ws__meta">
            <span className="intel-ws__meta-label">Fields</span>
            {fields.map((f) => (
              <div key={f} className="intel-ws__meta-row">
                <span>{f}</span>
              </div>
            ))}
          </div>
        ) : undefined
      }
    >
      <div className="intel-qb">
        {rules.length > 0 && (
          <div className="intel-qb__rules">
            <div className="intel-qb__head" aria-hidden="true">
              <span>#</span>
              <span>Field</span>
              <span>Op</span>
              <span>Value</span>
              <span>·</span>
            </div>
            {rules.map((r, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <div className="intel-qb__join" aria-hidden="true">
                    <span className="intel-qb__join-chip">AND</span>
                  </div>
                )}
                <div className="intel-qb__rule">
                  <span className="intel-qb__idx">{String(i + 1).padStart(2, "0")}</span>
                  <select
                    value={r.field}
                    aria-label={`Rule ${i + 1} field`}
                    onChange={(e) => update(i, { field: e.target.value })}
                  >
                    {fields.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <select
                    value={r.op}
                    aria-label={`Rule ${i + 1} operator`}
                    onChange={(e) => update(i, { op: e.target.value })}
                  >
                    {QB_OPS.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input
                    value={r.value}
                    placeholder="value"
                    aria-label={`Rule ${i + 1} value`}
                    onChange={(e) => update(i, { value: e.target.value })}
                  />
                  <motion.button
                    type="button"
                    className="intel-qb__del"
                    aria-label={`Remove rule ${i + 1}`}
                    whileHover={MH.chip}
                    whileTap={MH.tap}
                    transition={MH.spring}
                    onClick={() => setRules((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 size={12} />
                  </motion.button>
                </div>
              </Fragment>
            ))}
          </div>
        )}

        <div className="intel-qb__actions">
          <motion.button
            type="button"
            className="intel-qb__add"
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => setRules((prev) => [...prev, { field: fields[0] || "status", op: "=", value: "active" }])}
          >
            <Plus size={12} /> Add rule
          </motion.button>
          <motion.button
            type="button"
            className="intel-qb__run"
            disabled={rules.length === 0}
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => onAction?.({ type: "send", payload: { query: compiled, rules } })}
          >
            <Play size={12} /> Run query
          </motion.button>
        </div>

        <div className="intel-qb__preview">
          <div className="intel-qb__preview-head">
            <span className="intel-qb__preview-label">Compiled query</span>
            <span className="intel-qb__preview-live"><i />live</span>
          </div>
          <code className="intel-qb__code">
            {rules.length === 0 ? (
              <span className="intel-qb__code-empty">{"// no rules — add one above"}</span>
            ) : (
              rules.map((r, i) => (
                <span key={i} className="intel-qb__code-line">
                  {i > 0 && <span className="intel-qb__code-and">AND</span>}
                  <span className="intel-qb__code-field">{r.field}</span>
                  <span className="intel-qb__code-op"> {r.op} </span>
                  <span className="intel-qb__code-val">"{r.value}"</span>
                </span>
              ))
            )}
          </code>
        </div>
      </div>
    </IntelCardShell>
  );
}

/* 16. InvestigationControls */
export function InvestigationControls({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const [windowVal, setWindowVal] = useState(s(data.timeWindow, "24h"));
  const [depth, setDepth] = useState(n(data.depth, 2));
  const [autoCorrelate, setAutoCorrelate] = useState(Boolean(data.autoCorrelate ?? true));
  const pillId = useId();
  const reduce = useReducedMotion();

  return (
    <IntelCardShell title={s(data.title, "Investigation Scope Controls")} badgeTone={badgeClassForTone("blue")} state={state} streaming={streaming} sources={sources}>
      <div className="intel-list-grid">
        <div className="intel-subcard">
          <div className="intel-col-label">Time Horizon</div>
          <div className="intel-filter-pills" style={{ marginTop: 6 }}>
            {["1h", "6h", "24h", "7d", "30d"].map((w) => (
              <motion.button key={w} type="button" className={`intel-pill ${windowVal === w ? "is-active" : ""}`} whileHover={MH.chip} whileTap={MH.tap} transition={MH.spring} onClick={() => setWindowVal(w)}>
                {windowVal === w && <ActivePlate layoutId={pillId} shadow />}
                {w}
              </motion.button>
            ))}
          </div>
        </div>
        <div className="intel-subcard">
          <div className="intel-subcard__row">
            <strong>Graph Hop Depth</strong>
            <span className="intel-muted-mono">{depth} hops</span>
          </div>
          <input type="range" min={1} max={5} step={1} value={depth} onChange={(e) => setDepth(Number(e.target.value))} style={{ width: "100%", marginTop: 6 }} />
        </div>
        <div className="intel-subcard intel-subcard__row">
          <strong>Auto-correlate anomalies across services</strong>
          <motion.button
            type="button"
            role="switch"
            aria-checked={autoCorrelate}
            aria-label="Auto-correlate anomalies across services"
            className={`intel-skeuo-switch ${autoCorrelate ? "is-on" : ""}`}
            style={switchTrack(autoCorrelate)}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={(e) => {
              tweenPaint(e.currentTarget, reduce);
              const nextVal = !autoCorrelate;
              setAutoCorrelate(nextVal);
              onAction?.({ type: "filter", payload: { windowVal, depth, autoCorrelate: nextVal } });
            }}
          >
            <SwitchThumb className="intel-skeuo-switch__thumb" />
          </motion.button>
        </div>
      </div>
    </IntelCardShell>
  );
}
