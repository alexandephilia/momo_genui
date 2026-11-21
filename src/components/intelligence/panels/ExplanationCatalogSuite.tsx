"use client";

/**
 * Category 02 — Intelligence Explanation UI (Remaining 8 Components)
 * - hypothesis_panel, contradiction_panel, anomaly_highlight, uncertainty_map,
 *   assumption_panel, limitation_panel, insight_comparison, finding_detail
 */

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import {
  FlaskConical,
  Scale,
  AlertOctagon,
  HelpCircle,
  CheckSquare,
  ShieldAlert,
  GitCompare,
  FileSearch,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelCardShell, badgeClassForTone, toneColor, s, n, a } from "../shared/IntelCardShell";
import { CheckTick, MeterFill, tweenPaint } from "../shared/StateMotion";
import { Num } from "../charts/kit";
import {
  RkBoard,
  RkKV,
  RkList,
  RkMeta,
  RkMeter,
  RkRank,
  RkRow,
  RkSeverity,
  RkSummary,
  sevFactItems,
  sevRank,
  sevTally,
} from "../shared/RowKit";

/* 1. HypothesisPanel */
export function HypothesisPanel({ data, state, streaming, sources }: IntelBaseProps) {
  const hypotheses = a(data.hypotheses);
  const [openIndices, setOpenIndices] = useState<number[]>([0]);
  const reduce = useReducedMotion();

  const toggleIndex = (idx: number) =>
    setOpenIndices((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx],
    );

  return (
    <IntelCardShell
      title={s(data.title, "Hypothesis Evaluation")}
      badge={`${hypotheses.length} hypotheses`}
      badgeTone="purple"
      icon={<FlaskConical size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={hypotheses.length === 0}
      emptyMessage="No hypotheses formulated"
    >
      <div className="intel-list-grid intel-hyp-list">
        {hypotheses.map((h, i) => {
          const prob = n(h.probability ?? h.confidence, 50);
          const status = s(h.status, "testing");
          const supporting = a<string>(h.supporting);
          const against = a<string>(h.contradicting);
          const summary = s(h.summary || h.description || h.rationale || h.detail);
          const hasDetails = supporting.length > 0 || against.length > 0;
          const isOpen = openIndices.includes(i);
          const toggle = () => toggleIndex(i);
          return (
            <motion.div
              key={s(h.id, `hyp-${i}`)}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              className={`intel-subcard intel-hyp-card ${isOpen ? "is-selected" : ""}`}
              whileHover={MH.card}
              whileTap={MH.press}
              transition={MH.spring}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              }}
            >
              <div className="intel-hyp-card__head">
                <strong className="intel-hyp-card__title">{s(h.statement || h.title)}</strong>
                <span className={`intel-badge intel-badge--${badgeClassForTone(status)} intel-hyp-card__badge`}>
                  {status}
                </span>
              </div>
              <div className="intel-hyp-card__meter">
                <div className="intel-progress-bar">
                  <MeterFill
                    className="intel-progress-bar__fill"
                    width={`${Math.min(100, prob)}%`}
                    style={{ background: toneColor(status) }}
                  />
                </div>
                <span className="intel-muted-mono intel-hyp-card__prob">{prob}%</span>
              </div>
              {(summary || hasDetails) && (
                <div className="intel-hyp-card__desc-row">
                  <p className="intel-subcard__text intel-hyp-card__preview">
                    {summary || `Supporting (${supporting.length}) · Contradicting (${against.length})`}
                  </p>
                  {hasDetails && (
                    <motion.span
                      className="intel-hyp-card__chev"
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={reduce ? { duration: 0 } : MH.spring}
                      aria-hidden="true"
                    >
                      <ChevronDown size={14} />
                    </motion.span>
                  )}
                </div>
              )}
              <AnimatePresence initial={false}>
                {isOpen && hasDetails && (
                  <motion.div
                    className="intel-hyp-card__detail"
                    initial={reduce ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={reduce ? undefined : { opacity: 0, height: 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="intel-two-col intel-hyp-card__cols">
                      <div className="intel-hyp-card__col">
                        <div className="intel-col-label intel-text-green">Supporting ({supporting.length})</div>
                        <ul className="intel-bullet-list">
                          {supporting.map((pt, idx) => <li key={idx}>{pt}</li>)}
                        </ul>
                      </div>
                      <div className="intel-hyp-card__col">
                        <div className="intel-col-label intel-text-red">Contradicting ({against.length})</div>
                        <ul className="intel-bullet-list">
                          {against.map((pt, idx) => <li key={idx}>{pt}</li>)}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 2. ContradictionPanel */
export function ContradictionPanel({ data, state, streaming, sources }: IntelBaseProps) {
  const conflicts = a(data.contradictions);
  return (
    <IntelCardShell
      title={s(data.title, "Conflicting Evidence")}
      badge={`${conflicts.length} conflicts`}
      badgeTone="red"
      icon={<Scale size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={conflicts.length === 0}
      emptyMessage="No contradictions detected across sources"
    >
      <div className="intel-list-grid intel-conflict-list">
        {conflicts.map((c, i) => (
          <div key={s(c.id, `con-${i}`)} className="intel-conflict-card">
            <div className="intel-conflict-card__head">
              <strong className="intel-conflict-card__title">{s(c.topic || c.title)}</strong>
              <span className={`intel-badge intel-badge--${badgeClassForTone(s(c.severity, "warning"))} intel-conflict-card__badge`}>
                {s(c.severity, "Conflict")}
              </span>
            </div>
            <div className="intel-conflict-sides">
              <div className="intel-conflict-side" data-side="a">
                <div className="intel-conflict-side__head">
                  <span className="intel-conflict-side__tag">Claim A</span>
                  {s(c.sourceA) && <span className="intel-muted-mono">{s(c.sourceA)}</span>}
                </div>
                <p className="intel-subcard__text intel-conflict-side__text">{s(c.claimA)}</p>
              </div>
              <div className="intel-conflict-side" data-side="b">
                <div className="intel-conflict-side__head">
                  <span className="intel-conflict-side__tag">Claim B</span>
                  {s(c.sourceB) && <span className="intel-muted-mono">{s(c.sourceB)}</span>}
                </div>
                <p className="intel-subcard__text intel-conflict-side__text">{s(c.claimB)}</p>
              </div>
            </div>
            {s(c.resolution) && (
              <div className="intel-conflict-resolution">
                <span className="intel-conflict-resolution__label">Assessment</span>
                <span className="intel-conflict-resolution__text">{s(c.resolution)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 3. AnomalyHighlight — severity ledger */
export function AnomalyHighlight({ data, state, streaming, sources }: IntelBaseProps) {
  const anomalies = a(data.anomalies);
  const rows = [...anomalies].sort((x, y) => sevRank(s(x.severity)) - sevRank(s(y.severity)));
  const sevFacts = sevFactItems(sevTally(anomalies.map((an) => s(an.severity))));

  return (
    <IntelCardShell
      title={s(data.title, "Anomaly Highlight")}
      badge={`${anomalies.length} detected`}
      badgeTone="amber"
      icon={<AlertOctagon size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={anomalies.length === 0}
      emptyMessage="No unusual observations found"
    >
      <RkBoard>
        <RkSummary
          items={[...sevFacts, { label: "Total", value: <Num value={anomalies.length} /> }]}
        />
        <RkList label="Anomalies">
          {rows.map((an, i) => {
            const hasKv = Boolean(s(an.expected) || s(an.observed));
            const hasAside = Boolean(s(an.deviation) || s(an.timestamp));
            return (
              <RkRow
                key={s(an.id, `an-${i}`)}
                lead={<RkSeverity level={s(an.severity)} />}
                title={s(an.metric || an.title)}
                sub={s(an.description)}
                aside={
                  hasAside ? (
                    <>
                      {s(an.deviation) && <span className="intel-rk__delta-val">{s(an.deviation)}</span>}
                      {s(an.timestamp) && <span className="intel-rk__aside-note">{s(an.timestamp)}</span>}
                    </>
                  ) : undefined
                }
              >
                {hasKv && (
                  <RkMeta>
                    {s(an.expected) && <RkKV k="Expected" v={s(an.expected)} />}
                    {s(an.observed) && (
                      <RkKV k="Observed" v={<span className="intel-text-amber">{s(an.observed)}</span>} />
                    )}
                  </RkMeta>
                )}
              </RkRow>
            );
          })}
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 4. UncertaintyMap — score board */
export function UncertaintyMap({ data, state, streaming, sources }: IntelBaseProps) {
  const areas = a(data.areas);
  const rows = areas
    .map((item, i) => ({ item, i, level: n(item.uncertainty, 50) }))
    .sort((x, y) => y.level - x.level);
  const avg = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.level, 0) / rows.length) : 0;
  const top = rows[0];

  return (
    <IntelCardShell
      title={s(data.title, "Uncertainty Map")}
      badge="Confidence vs Impact"
      badgeTone="amber"
      icon={<HelpCircle size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={areas.length === 0}
      emptyMessage="No uncertainty dimensions mapped"
    >
      <RkBoard>
        <RkSummary
          items={[
            ...(top ? [{ label: "Most uncertain", value: s(top.item.dimension || top.item.topic) }] : []),
            { label: "Avg uncertainty", value: <Num value={avg} unit="%" /> },
            { label: "Areas", value: <Num value={areas.length} /> },
          ]}
        />
        <RkList label="Uncertainty areas">
          {rows.map(({ item, i, level }, idx) => (
            <RkRow
              key={s(item.id, `um-${i}`)}
              lead={<RkRank n={idx + 1} top={idx === 0} />}
              title={s(item.dimension || item.topic)}
              sub={s(item.reason)}
              aside={<RkMeter value={level} unit="%" tone={level > 65 ? "bad" : level > 35 ? "warn" : "good"} />}
            >
              {s(item.mitigation) && (
                <RkMeta>
                  <RkKV k="Resolve via" v={s(item.mitigation)} />
                </RkMeta>
              )}
            </RkRow>
          ))}
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 5. AssumptionPanel */
export function AssumptionPanel({ data, state, streaming, sources }: IntelBaseProps) {
  const assumptions = a(data.assumptions);
  const [validated, setValidated] = useState<Record<number, boolean>>({});
  const reduce = useReducedMotion();

  return (
    <IntelCardShell
      title={s(data.title, "Explicit Assumptions")}
      badge={`${assumptions.length} items`}
      icon={<CheckSquare size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={assumptions.length === 0}
      emptyMessage="No assumptions listed"
    >
      <div className="intel-list-grid">
        {assumptions.map((as, i) => {
          const checked = validated[i] ?? Boolean(as.verified);
          return (
            <motion.div
              key={s(as.id, `as-${i}`)}
              className="intel-subcard intel-assumption-card"
              whileHover={MH.card}
              whileTap={MH.press}
              transition={MH.spring}
              onClick={(e) => {
                tweenPaint(e.currentTarget.querySelector(".intel-skeuo-check"), reduce);
                setValidated((prev) => ({ ...prev, [i]: !checked }));
              }}
            >
              <div className="intel-subcard__row intel-assumption-card__row">
                <div className="intel-subcard__title-group intel-assumption-card__title-group">
                  <span
                    className={`intel-skeuo-check ${checked ? "is-checked" : ""}`}
                    aria-hidden="true"
                  >
                    <AnimatePresence initial={false}>
                      {checked && <CheckTick key="tick" />}
                    </AnimatePresence>
                  </span>
                  <strong className="intel-assumption-card__title">{s(as.statement || as.label)}</strong>
                </div>
                {s(as.sensitivity || as.impact) && (
                  <span className={`intel-badge intel-badge--${badgeClassForTone(s(as.sensitivity || as.impact))} intel-assumption-card__badge`}>
                    {s(as.sensitivity || as.impact)} sensitivity
                  </span>
                )}
              </div>
              {s(as.fallback) && (
                <p className="intel-subcard__text intel-assumption-card__fallback">If violated: {s(as.fallback)}</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 6. LimitationPanel — severity ledger */
export function LimitationPanel({ data, state, streaming, sources }: IntelBaseProps) {
  const limitations = a(data.limitations);
  const withWorkaround = limitations.filter((lim) => Boolean(s(lim.workaround))).length;

  return (
    <IntelCardShell
      title={s(data.title, "Known Limitations & Boundaries")}
      badge={`${limitations.length}`}
      badgeTone="amber"
      icon={<ShieldAlert size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={limitations.length === 0}
      emptyMessage="No analytical limitations reported"
    >
      <RkBoard>
        <RkSummary
          items={[
            { label: "Limitations", value: <Num value={limitations.length} /> },
            { label: "With workaround", value: <Num value={withWorkaround} /> },
          ]}
        />
        <RkList label="Limitations">
          {limitations.map((lim, i) => (
            <RkRow
              key={s(lim.id, `lim-${i}`)}
              lead={<RkSeverity level={s(lim.severity)} />}
              title={s(lim.area || lim.title)}
              sub={s(lim.description)}
              aside={s(lim.scope) ? <span className="intel-rk__chip">{s(lim.scope)}</span> : undefined}
            >
              {s(lim.workaround) && (
                <RkMeta>
                  <RkKV k="Mitigation" v={s(lim.workaround)} />
                </RkMeta>
              )}
            </RkRow>
          ))}
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 7. InsightComparison */
export function InsightComparison({ data, state, streaming, sources }: IntelBaseProps) {
  const insights = a(data.insights);
  return (
    <IntelCardShell
      title={s(data.title, "Insight Comparison")}
      badge={`${insights.length} insights`}
      icon={<GitCompare size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={insights.length === 0}
      emptyMessage="No insights to compare"
    >
      <div className="intel-compare-grid">
        {insights.map((ins, i) => (
          <div key={s(ins.id, `ic-${i}`)} className="intel-compare-card">
            <div className="intel-subcard__row">
              <strong>{s(ins.title)}</strong>
              {ins.confidence !== undefined && (
                <span className={`intel-badge intel-badge--${n(ins.confidence) >= 75 ? "green" : "amber"}`}>
                  {n(ins.confidence)}%
                </span>
              )}
            </div>
            <p className="intel-subcard__text">{s(ins.summary)}</p>
            {a<string>(ins.points).length > 0 && (
              <ul className="intel-bullet-list">
                {a<string>(ins.points).map((pt, idx) => <li key={idx}>{pt}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 8. FindingDetail */
export function FindingDetail({ data, state, streaming, sources }: IntelBaseProps) {
  const [showRaw, setShowRaw] = useState(false);
  const title = s(data.title);
  const evidence = a(data.evidence);

  return (
    <IntelCardShell
      title={title || "Finding Detail"}
      badge={s(data.severity || data.confidence)}
      badgeTone={badgeClassForTone(s(data.severity || data.confidence))}
      icon={<FileSearch size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={!title}
      emptyMessage="Select a finding to inspect"
    >
      <p className="intel-lead-text">{s(data.summary || data.description)}</p>
      {s(data.impact) && (
        <div className="intel-callout-box">
          <strong>Impact:</strong> {s(data.impact)}
        </div>
      )}
      {evidence.length > 0 && (
        <div className="intel-subblock">
          <div className="intel-col-label">Supporting Evidence ({evidence.length})</div>
          <ul className="intel-bullet-list">
            {evidence.map((ev, i) => (
              <li key={i}>{typeof ev === "string" ? ev : s(ev.label || ev.detail)}</li>
            ))}
          </ul>
        </div>
      )}
      {s(data.remediation) && (
        <div className="intel-subblock">
          <div className="intel-col-label intel-text-green">Recommended Action</div>
          <p className="intel-subcard__text">{s(data.remediation)}</p>
        </div>
      )}
      {s(data.rawArtifact) && (
        <div>
          <motion.button type="button" className="intel-link-btn" whileHover={MH.chip} whileTap={MH.tap} transition={MH.spring} onClick={() => setShowRaw(!showRaw)}>
            {showRaw ? "Hide Artifact" : "View Artifact"}{" "}
            {showRaw ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </motion.button>
          {showRaw && <pre className="intel-log-row__payload">{s(data.rawArtifact)}</pre>}
        </div>
      )}
    </IntelCardShell>
  );
}
