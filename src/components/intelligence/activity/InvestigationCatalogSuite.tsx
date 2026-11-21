"use client";

/**
 * Category 08 — Investigation & Monitoring Intelligence UI (Remaining 18 Components)
 * (Plus AlertFeed in AlertFeed.tsx registered under "investigation")
 *
 * Components:
 * - incident_timeline, incident_map, event_correlation_map, entity_tracking,
 *   anomaly_detection_panel, threat_assessment, signal_monitor, event_stream,
 *   situational_overview, investigation_board, case_timeline, indicator_panel,
 *   pattern_detection, change_detection, correlation_timeline,
 *   geographic_heatmap, watchlist, incident_relationship_graph
 */

import { useId, useState } from "react";
import { motion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import {
  ShieldAlert,
  Activity,
  Eye,
  MapPin,
  Radar,
  Clock,
  FolderKanban,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { IntelBaseProps, IntelGraphData } from "@/lib/intelligence/types";
import IntelligenceGraph from "../graphs/IntelligenceGraph";
import { InteractiveMapBlock, type InteractiveMapPin } from "@/components/cards/InteractiveMapBlock";
import { IntelCardShell, badgeClassForTone, toneColor, s, n, a } from "../shared/IntelCardShell";
import { Num } from "../charts/kit";
import {
  RkBoard,
  RkDelta,
  RkKV,
  RkList,
  RkMark,
  RkMeta,
  RkMeter,
  RkRank,
  RkRow,
  RkSeverity,
  RkSummary,
  RkTime,
  sevFactItems,
  sevRank,
  sevTally,
} from "../shared/RowKit";

/* 1. IncidentTimeline */
export function IncidentTimeline({ data, state, streaming, sources }: IntelBaseProps) {
  const events = a<Record<string, unknown>>(data.events);
  return (
    <IntelCardShell title={s(data.title, "Incident Timeline")} badge={s(data.severity, "SEV-2")} badgeTone={badgeClassForTone(s(data.severity, "warning"))} icon={<Clock size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={events.length === 0}>
      <div className="intel-timeline">
        {events.map((ev, i) => (
          <div key={i} className="intel-timeline__item">
            <div className="intel-timeline__rail">
              <span className="intel-dot" style={{ background: toneColor(s(ev.severity, "warning")) }} />
              {i < events.length - 1 && <div className="intel-timeline__line" />}
            </div>
            <div className="intel-timeline__content">
              <div className="intel-timeline__top">
                <span className="intel-timeline__label">{s(ev.title)}</span>
                <span className="intel-timeline__time">{s(ev.timestamp)}</span>
              </div>
              <p className="intel-timeline__detail">{s(ev.detail)}</p>
              {s(ev.actor) && <span className="intel-badge intel-badge--neutral">{s(ev.actor)}</span>}
            </div>
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 2. IncidentMap (Real OpenStreetMap via InteractiveMapBlock) */
export function IncidentMap({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const pins = a<Record<string, unknown>>(data.incidents || data.pins).map(
    (p): InteractiveMapPin => ({
      name: s(p.name || p.title),
      lat: typeof p.lat === "number" ? p.lat : undefined,
      lng: typeof p.lng === "number" ? p.lng : undefined,
      category: s(p.severity || p.category, "incident"),
      note: s(p.note || p.description),
      time: s(p.time || p.timestamp),
    }),
  );

  return (
    <IntelCardShell title={s(data.title, "Incident Geographic Map")} badge={`${pins.length} locations`} icon={<MapPin size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={pins.length === 0}>
      <InteractiveMapBlock
        pins={pins}
        connectRoute={Boolean(data.connectRoute)}
        height={360}
        onPromptAction={(text) => onAction?.({ type: "send", payload: { text } })}
      />
    </IntelCardShell>
  );
}

/* 3. EventCorrelationMap (XYFlow) */
export function EventCorrelationMap({ data, state, onAction }: IntelBaseProps) {
  const nodes = a<Record<string, unknown>>(data.nodes);
  const edges = a<Record<string, unknown>>(data.edges);
  if (state === "loading") return <IntelCardShell state="loading" title="Event Correlation Map"><div /></IntelCardShell>;
  if (state === "error") return <IntelCardShell state="error" title="Event Correlation Map"><div /></IntelCardShell>;
  if (state === "empty" || nodes.length === 0) return <IntelCardShell state="empty" emptyMessage="No correlated events"><div /></IntelCardShell>;

  const graphData: IntelGraphData = {
    nodes: nodes.map((nd, i) => ({
      id: s(nd.id, `ec-${i}`),
      label: s(nd.label),
      type: s(nd.type, "event"),
      detail: s(nd.detail) || undefined,
      status: (nd.status as IntelGraphData["nodes"][number]["status"]) || undefined,
    })),
    edges: edges.map((ed, i) => ({
      id: s(ed.id, `ece-${i}`),
      source: s(ed.source),
      target: s(ed.target),
      label: s(ed.label) || undefined,
      type: "causal",
    })),
    layout: "layered",
    direction: "LR",
  };
  return <IntelligenceGraph graphData={graphData} title={s(data.title, "Event Correlation Map")} onNodeClick={(node) => onAction?.({ type: "select", payload: { node } })} />;
}

/* 4. EntityTracking — change log */
export function EntityTracking({ data, state, streaming, sources }: IntelBaseProps) {
  const entities = a<Record<string, unknown>>(data.entities);
  const attention = entities.filter((en) => /warn|crit|error|fail|degrad|attention|perhatian/i.test(s(en.status))).length;
  const stable = entities.length - attention;

  return (
    <IntelCardShell title={s(data.title, "Tracked Entity Changes")} badge={`${entities.length} tracked`} icon={<Eye size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={entities.length === 0}>
      <RkBoard>
        <RkSummary
          items={[
            { label: "Tracked", value: <Num value={entities.length} /> },
            ...(stable > 0 ? [{ label: "Stable", value: <Num value={stable} /> }] : []),
            ...(attention > 0 ? [{ label: "Attention", value: <Num value={attention} />, tone: "warn" }] : []),
          ]}
        />
        <RkList label="Tracked entities">
          {entities.map((en, i) => {
            const status = s(en.status, "active");
            return (
              <RkRow
                key={i}
                lead={<RkTime value={s(en.updatedAt)} />}
                title={
                  <>
                    {s(en.name)}
                    {s(en.type) && <span className="intel-rk__chip">{s(en.type)}</span>}
                  </>
                }
                sub={s(en.lastChange)}
                aside={
                  <span className={`intel-badge intel-badge--${badgeClassForTone(status)}`}>{status}</span>
                }
              />
            );
          })}
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 5. AnomalyDetectionPanel — severity ledger */
export function AnomalyDetectionPanel({ data, state, streaming, sources }: IntelBaseProps) {
  const detections = a<Record<string, unknown>>(data.detections);
  const rows = [...detections].sort((x, y) => sevRank(s(x.severity)) - sevRank(s(y.severity)));

  return (
    <IntelCardShell title={s(data.title, "Anomaly Detection Panel")} badge={`${detections.length} signals`} badgeTone="amber" icon={<Radar size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={detections.length === 0}>
      <RkBoard>
        <RkSummary
          items={[...sevFactItems(sevTally(detections.map((d) => s(d.severity)))), { label: "Signals", value: <Num value={detections.length} /> }]}
        />
        <RkList label="Anomaly detections">
          {rows.map((d, i) => {
            const score = n(d.anomalyScore, 85);
            return (
              <RkRow
                key={i}
                lead={<RkSeverity level={s(d.severity)} />}
                title={s(d.signal || d.title)}
                sub={s(d.explanation)}
                aside={
                  <>
                    <span className="intel-rk__delta-val">{score}</span>
                    <span className="intel-rk__aside-note">anomaly score</span>
                  </>
                }
              >
                <RkMeta>
                  {s(d.baseline) && <RkKV k="Baseline" v={s(d.baseline)} />}
                  {s(d.current) && <RkKV k="Current" v={<span className="intel-text-amber">{s(d.current)}</span>} />}
                  {s(d.window) && <RkKV k="Window" v={s(d.window)} />}
                </RkMeta>
              </RkRow>
            );
          })}
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 6. ThreatAssessment — severity ledger */
export function ThreatAssessment({ data, state, streaming, sources }: IntelBaseProps) {
  const vectors = a<Record<string, unknown>>(data.vectors);
  const rows = [...vectors].sort((x, y) => sevRank(s(x.severity)) - sevRank(s(y.severity)));
  const overall = s(data.overallLevel, "Elevated");
  const overallKey = sevRank(overall);
  const overallTone = overallKey === 0 ? "bad" : overallKey <= 2 ? "warn" : "good";

  return (
    <IntelCardShell title={s(data.title, "Threat Assessment")} badge={overall} badgeTone={badgeClassForTone(overall === "Critical" ? "critical" : "warning")} icon={<ShieldAlert size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={vectors.length === 0 && !s(data.summary)}>
      <RkBoard>
        {s(data.summary) && <p className="intel-rk__note">{s(data.summary)}</p>}
        <RkSummary
          items={[
            ...sevFactItems(sevTally(vectors.map((v) => s(v.severity)))),
            ...(vectors.length ? [{ label: "Vectors", value: <Num value={vectors.length} /> }] : []),
            ...(s(data.overallLevel) ? [{ label: "Overall", value: overall, tone: overallTone }] : []),
          ]}
        />
        <RkList label="Threat vectors">
          {rows.map((v, i) => (
            <RkRow
              key={i}
              lead={<RkSeverity level={s(v.severity)} />}
              title={s(v.name)}
              sub={s(v.mitigation)}
            >
              {s(v.likelihood) && (
                <RkMeta>
                  <RkKV k="Likelihood" v={s(v.likelihood)} />
                </RkMeta>
              )}
            </RkRow>
          ))}
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 7. SignalMonitor */
export function SignalMonitor({ data, state, streaming, sources }: IntelBaseProps) {
  const signals = a<Record<string, unknown>>(data.signals);
  return (
    <IntelCardShell title={s(data.title, "Signal Monitor")} badge={`${signals.length} streams`} icon={<Activity size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={signals.length === 0}>
      <div className="intel-status-board">
        {signals.map((sig, i) => {
          const st = s(sig.status, "normal");
          return (
            <div key={i} className="intel-status-tile">
              <div className="intel-subcard__row">
                <span className="intel-status-tile__name">{s(sig.name)}</span>
                <span className={`intel-badge intel-badge--${badgeClassForTone(st === "normal" ? "good" : st)}`}>{st}</span>
              </div>
              <div className="intel-status-tile__metric">{s(sig.value)}</div>
              <div className="intel-muted-mono">Threshold: {s(sig.threshold)}</div>
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 8. EventStream */
export function EventStream({ data, state, streaming, sources }: IntelBaseProps) {
  const events = a<Record<string, unknown>>(data.events);
  const [filter, setFilter] = useState("all");
  const railId = useId();
  const types = ["all", ...Array.from(new Set(events.map((e) => s(e.type)).filter(Boolean)))];
  const shown = filter === "all" ? events : events.filter((e) => s(e.type) === filter);

  const channelTone = (t: string): string => {
    if (t === "all") return "var(--gu-accent, #ef8c66)";
    const matching = events.filter((e) => s(e.type) === t);
    const sev =
      matching.find((e) => /crit|err|fail|red/i.test(s(e.severity)))?.severity ||
      matching.find((e) => /warn|amber|throttl/i.test(s(e.severity)))?.severity ||
      matching[0]?.severity;
    return toneColor(s(sev, "info"));
  };

  return (
    <IntelCardShell
      title={s(data.title, "Live Event Stream")}
      badge={`${shown.length} events`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={events.length === 0}
    >
      {types.length > 1 && (
        <div className="intel-stream-bar">
          <div className="intel-stream-seg" role="tablist" aria-label="Event channel filter">
            {types.map((t) => {
              const active = filter === t;
              const count = t === "all" ? events.length : events.filter((e) => s(e.type) === t).length;
              const dotColor = channelTone(t);
              return (
                <motion.button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`intel-stream-seg__btn${active ? " is-active" : ""}`}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  onClick={() => setFilter(t)}
                >
                  <span
                    className="intel-stream-seg__dot"
                    style={{
                      background: dotColor,
                      boxShadow: active ? `0 0 8px ${dotColor}` : "none",
                    }}
                  />
                  <span className="intel-stream-seg__label">{t === "all" ? "all" : t.replace(/_/g, " ")}</span>
                  <span className="intel-stream-seg__count">{count}</span>
                  {active && (
                    <motion.span
                      layoutId={railId}
                      className="intel-stream-seg__rail"
                      transition={MH.spring}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
      <div className="intel-log-list">
        {shown.map((e, i) => (
          <div key={i} className="intel-feed__row">
            <span className="intel-muted-mono">{s(e.timestamp)}</span>
            <span className={`intel-badge intel-badge--${badgeClassForTone(s(e.severity, "info"))}`}>{s(e.type, "event")}</span>
            <span style={{ flex: 1, fontSize: 12.5 }}>{s(e.message)}</span>
            {s(e.source) && <span className="intel-muted-mono">{s(e.source)}</span>}
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 9. SituationalOverview */
export function SituationalOverview({ data, state, streaming, sources }: IntelBaseProps) {
  const metrics = a<Record<string, unknown>>(data.metrics);
  const advisories = a<string>(data.advisories);
  return (
    <IntelCardShell title={s(data.title, "Situational Overview")} badge={s(data.posture, "Normal")} badgeTone={badgeClassForTone(s(data.tone, "blue"))} state={state} streaming={streaming} sources={sources} isEmpty={!s(data.summary) && metrics.length === 0}>
      <p className="intel-lead-text">{s(data.summary)}</p>
      {metrics.length > 0 && (
        <div className="intel-metric-group" style={{ marginTop: 10 }}>
          {metrics.map((m, i) => (
            <div key={i} className="intel-metric">
              <span className="intel-metric__label">{s(m.label)}</span>
              <span className="intel-metric__value">{s(m.value)}</span>
            </div>
          ))}
        </div>
      )}
      {advisories.length > 0 && (
        <ul className="intel-bullet-list" style={{ marginTop: 10 }}>
          {advisories.map((ad, i) => <li key={i}>{ad}</li>)}
        </ul>
      )}
    </IntelCardShell>
  );
}

function resolveBoardTagTone(tag: string, explicitTone?: string): string {
  if (explicitTone) return badgeClassForTone(explicitTone);
  const t = tag.toLowerCase().trim();
  if (/(confirm|verif|done|resolv|complete|pass|selesai|terverifikasi)/.test(t)) return "green";
  if (/(progress|investigat|active|check|run|proses|berjalan|audit)/.test(t)) return "blue";
  if (/(^p0\b|^p1\b|crit|block|high|urgent|sev-?1|kritis)/.test(t)) return "red";
  if (/(^p2\b|med|warn|pend|review|tunggu)/.test(t)) return "amber";
  const mapped = badgeClassForTone(tag);
  return mapped === "neutral" ? "amber" : mapped;
}

/* 10. InvestigationBoard */
export function InvestigationBoard({ data, state, streaming, sources }: IntelBaseProps) {
  const columns = a<Record<string, unknown>>(data.columns);
  return (
    <IntelCardShell title={s(data.title, "Investigation Board")} icon={<FolderKanban size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={columns.length === 0}>
      <div className="intel-kanban">
        {columns.map((col, i) => {
          const colTitle = s(col.title);
          const cards = a<Record<string, unknown>>(col.cards);
          return (
            <div key={i} className="intel-kanban__col">
              <div className="intel-kanban__head">
                <strong>{colTitle}</strong>
                <span className="intel-muted-mono">{cards.length}</span>
              </div>
              <div className="intel-kanban__cards">
                {cards.map((card, j) => {
                  const tag = s(card.tag) || s(card.status) || s(card.priority);
                  const desc =
                    s(card.description) ||
                    s(card.note) ||
                    s(card.summary) ||
                    s(card.detail) ||
                    s(card.desc) ||
                    s(card.body);
                  const fallbackDesc = colTitle
                    ? `Tracked under ${colTitle}, awaiting investigation notes.`
                    : "Awaiting investigation details.";
                  return (
                    <div key={j} className="intel-subcard intel-kanban__card">
                      <div className="intel-kanban__card-head">
                        <strong className="intel-kanban__card-title">{s(card.title)}</strong>
                        {tag && (
                          <span
                            className={`intel-badge intel-badge--${resolveBoardTagTone(tag, s(card.tone))} intel-kanban__card-badge`}
                          >
                            {tag}
                          </span>
                        )}
                      </div>
                      {(desc || !streaming) && (
                        <p className={`intel-subcard__text intel-kanban__card-desc${desc ? "" : " is-placeholder"}`}>
                          {desc || fallbackDesc}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 11. CaseTimeline */
export function CaseTimeline({ data, state, streaming, sources }: IntelBaseProps) {
  const milestones = a<Record<string, unknown>>(data.milestones);
  return (
    <IntelCardShell title={s(data.title, "Case Timeline")} badge={s(data.caseId, "CASE")} state={state} streaming={streaming} sources={sources} isEmpty={milestones.length === 0}>
      <div className="intel-timeline">
        {milestones.map((ms, i) => (
          <div key={i} className="intel-timeline__item">
            <div className="intel-timeline__rail">
              <span className="intel-dot" style={{ background: toneColor(s(ms.status, "blue")) }} />
              {i < milestones.length - 1 && <div className="intel-timeline__line" />}
            </div>
            <div className="intel-timeline__content">
              <div className="intel-timeline__top">
                <span className="intel-timeline__label">{s(ms.title)}</span>
                <span className="intel-timeline__time">{s(ms.date)}</span>
              </div>
              <p className="intel-timeline__detail">{s(ms.summary)}</p>
            </div>
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 12. IndicatorPanel */
export function IndicatorPanel({ data, state, streaming, sources }: IntelBaseProps) {
  const indicators = a<Record<string, unknown>>(data.indicators);
  return (
    <IntelCardShell title={s(data.title, "Key Indicators")} badge={`${indicators.length} IOCs/KPIs`} state={state} streaming={streaming} sources={sources} isEmpty={indicators.length === 0}>
      <div className="intel-status-board intel-indicator-board">
        {indicators.map((ind, i) => {
          const status = s(ind.status, "active");
          const category = s(ind.category);
          const summary =
            s(ind.summary) ||
            s(ind.description) ||
            s(ind.note) ||
            s(ind.detail) ||
            s(ind.desc);
          const fallbackSummary = category
            ? `Tracked ${category.toLowerCase()} signal, awaiting trend summary.`
            : "Awaiting indicator summary.";
          return (
            <div key={i} className="intel-status-tile intel-indicator-tile">
              <div className="intel-indicator-tile__head">
                <span className="intel-status-tile__name">{s(ind.name)}</span>
                <span className={`intel-badge intel-badge--${badgeClassForTone(status)} intel-indicator-tile__badge`}>
                  {status}
                </span>
              </div>
              <div className="intel-indicator-tile__body">
                <div className="intel-indicator-tile__value">{s(ind.value)}</div>
                <div className="intel-indicator-tile__copy">
                  {(summary || !streaming) && (
                    <p className={`intel-indicator-tile__summary${summary ? "" : " is-placeholder"}`}>
                      {summary || fallbackSummary}
                    </p>
                  )}
                  {category && <span className="intel-muted-mono intel-indicator-tile__cat">{category}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 13. PatternDetection — score board */
export function PatternDetection({ data, state, streaming, sources }: IntelBaseProps) {
  const patterns = a<Record<string, unknown>>(data.patterns);
  const rows = [...patterns]
    .map((p, i) => ({ p, i, conf: n(p.confidence, 82) }))
    .sort((x, y) => y.conf - x.conf);
  const avg = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.conf, 0) / rows.length) : 0;
  const top = rows[0];

  return (
    <IntelCardShell title={s(data.title, "Detected Patterns")} badge={`${patterns.length} patterns`} badgeTone="purple" state={state} streaming={streaming} sources={sources} isEmpty={patterns.length === 0}>
      <RkBoard>
        <RkSummary
          items={[
            ...(top ? [{ label: "Top pattern", value: `${s(top.p.name)} · ${top.conf}%` }] : []),
            { label: "Avg confidence", value: <Num value={avg} unit="%" /> },
            { label: "Patterns", value: <Num value={patterns.length} /> },
          ]}
        />
        <RkList label="Detected patterns">
          {rows.map(({ p, i, conf }, idx) => (
            <RkRow
              key={i}
              lead={<RkRank n={idx + 1} top={idx === 0} />}
              title={s(p.name)}
              sub={s(p.description)}
              aside={<RkMeter value={conf} unit="%" tone={idx === 0 ? "accent" : "neutral"} />}
            >
              <RkMeta>
                <RkKV k="Occurrences" v={<Num value={n(p.occurrences, 1)} />} />
                {s(p.signature) && <RkKV k="Signature" v={s(p.signature)} />}
              </RkMeta>
            </RkRow>
          ))}
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 14. ChangeDetection — change log */
export function ChangeDetection({ data, state, streaming, sources }: IntelBaseProps) {
  const changes = a<Record<string, unknown>>(data.changes);
  const isDown = (dir: string) => /down|decrease|neg|fall|drop|turun/i.test(dir);
  const up = changes.filter((c) => !isDown(s(c.direction, "up"))).length;
  const down = changes.length - up;

  return (
    <IntelCardShell title={s(data.title, "Change Detection")} badge={`${changes.length} deltas`} state={state} streaming={streaming} sources={sources} isEmpty={changes.length === 0}>
      <RkBoard>
        <RkSummary
          items={[
            { label: "Changes", value: <Num value={changes.length} /> },
            ...(up > 0 ? [{ label: "Up", value: <Num value={up} />, tone: "good" as const }] : []),
            ...(down > 0 ? [{ label: "Down", value: <Num value={down} />, tone: "bad" as const }] : []),
          ]}
        />
        <RkList label="Detected changes">
          {changes.map((c, i) => {
            const dir = s(c.direction, "up");
            const downward = isDown(dir);
            return (
              <RkRow
                key={i}
                lead={
                  <RkMark tone={downward ? "bad" : "good"}>
                    {downward ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}
                  </RkMark>
                }
                title={s(c.subject)}
                aside={
                  <RkDelta
                    before={s(c.before)}
                    after={s(c.after)}
                    change={s(c.delta)}
                    trend={downward ? "down" : "up"}
                  />
                }
              />
            );
          })}
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 15. CorrelationTimeline — change log */
export function CorrelationTimeline({ data, state, streaming, sources }: IntelBaseProps) {
  const clusters = a<Record<string, unknown>>(data.clusters);
  const times = clusters.map((cl) => s(cl.window)).filter(Boolean);
  const span =
    times.length >= 2
      ? (() => {
          const first = times[0].match(/\d{1,2}:\d{2}/)?.[0];
          const lastCluster = s(clusters[clusters.length - 1].window);
          const last = [...lastCluster.matchAll(/\d{1,2}:\d{2}/g)].pop()?.[0];
          return first && last ? `${first} – ${last}` : "";
        })()
      : "";
  const avgCorr = clusters.length
    ? Math.round(clusters.reduce((sum, cl) => sum + n(cl.correlationScore, 0), 0) / clusters.length)
    : 0;

  return (
    <IntelCardShell title={s(data.title, "Correlation Timeline")} badge={`${clusters.length} windows`} state={state} streaming={streaming} sources={sources} isEmpty={clusters.length === 0}>
      <RkBoard>
        <RkSummary
          items={[
            { label: "Windows", value: <Num value={clusters.length} /> },
            { label: "Avg correlation", value: <Num value={avgCorr} unit="%" /> },
            ...(span ? [{ label: "Span", value: span }] : []),
          ]}
        />
        <RkList label="Correlation clusters">
          {clusters.map((cl, i) => {
            const events = a<string>(cl.events);
            const score = n(cl.correlationScore, 88);
            const title =
              s(cl.label || cl.name) ||
              (events.length ? `${events.length} correlated event${events.length > 1 ? "s" : ""}` : s(cl.window));
            return (
              <RkRow
                key={i}
                lead={<RkTime value={s(cl.window)} />}
                title={title}
                aside={<RkMeter value={score} unit="%" tone="accent" />}
              >
                {events.length > 0 && (
                  <div className="intel-rk__children">
                    {events.map((ev, idx) => (
                      <div key={idx} className="intel-rk__child">
                        <span className="intel-rk__child-name">{ev}</span>
                      </div>
                    ))}
                  </div>
                )}
              </RkRow>
            );
          })}
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 16. GeographicHeatmap (Spatial points + InteractiveMapBlock) */
export function GeographicHeatmap({ data, state, streaming, sources }: IntelBaseProps) {
  const hotspots = a<Record<string, unknown>>(data.hotspots);
  const pins: InteractiveMapPin[] = hotspots.map((h) => ({
    name: `${s(h.region)} (${n(h.intensity)} events)`,
    lat: typeof h.lat === "number" ? h.lat : undefined,
    lng: typeof h.lng === "number" ? h.lng : undefined,
    category: "hotspot",
    note: s(h.summary, `Intensity: ${n(h.intensity)}`),
  }));

  return (
    <IntelCardShell title={s(data.title, "Geographic Event Density")} badge={`${hotspots.length} regions`} icon={<MapPin size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={hotspots.length === 0}>
      <div className="intel-status-board" style={{ marginBottom: 12 }}>
        {hotspots.map((h, i) => (
          <div key={i} className="intel-status-tile">
            <div className="intel-subcard__row">
              <span className="intel-status-tile__name">{s(h.region)}</span>
              <span className="intel-badge intel-badge--red">{n(h.intensity)}</span>
            </div>
            <div className="intel-muted-mono">{s(h.summary)}</div>
          </div>
        ))}
      </div>
      {pins.some((p) => p.lat !== undefined && p.lng !== undefined) && (
        <InteractiveMapBlock pins={pins} height={280} />
      )}
    </IntelCardShell>
  );
}

/* 17. Watchlist */
export function Watchlist({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const items = a<Record<string, unknown>>(data.items);
  return (
    <IntelCardShell title={s(data.title, "Monitoring Watchlist")} badge={`${items.length} watched`} icon={<Eye size={15} />} state={state} streaming={streaming} sources={sources} isEmpty={items.length === 0}>
      <div className="intel-table-scroll">
        <table className="intel-matrix-table">
          <thead>
            <tr>
              <th>Entity</th>
              <th>Category</th>
              <th>Status</th>
              <th>Last Signal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} onClick={() => onAction?.({ type: "select", payload: { item: it } })} style={{ cursor: "pointer" }}>
                <td><strong>{s(it.name)}</strong></td>
                <td>{s(it.category)}</td>
                <td><span className={`intel-badge intel-badge--${badgeClassForTone(s(it.status, "active"))}`}>{s(it.status, "Watching")}</span></td>
                <td className="intel-muted-mono">{s(it.lastSignal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </IntelCardShell>
  );
}

/* 18. IncidentRelationshipGraph (XYFlow) */
export function IncidentRelationshipGraph({ data, state, onAction }: IntelBaseProps) {
  const nodes = a<Record<string, unknown>>(data.nodes);
  const edges = a<Record<string, unknown>>(data.edges);
  if (state === "loading") return <IntelCardShell state="loading" title="Incident Relationship Graph"><div /></IntelCardShell>;
  if (state === "error") return <IntelCardShell state="error" title="Incident Relationship Graph"><div /></IntelCardShell>;
  if (state === "empty" || nodes.length === 0) return <IntelCardShell state="empty" emptyMessage="No incident links available"><div /></IntelCardShell>;

  const graphData: IntelGraphData = {
    nodes: nodes.map((nd, i) => ({
      id: s(nd.id, `ir-${i}`),
      label: s(nd.label),
      type: s(nd.type, "fault"),
      detail: s(nd.detail) || undefined,
      status: (nd.status as IntelGraphData["nodes"][number]["status"]) || "warning",
    })),
    edges: edges.map((ed, i) => ({
      id: s(ed.id, `ire-${i}`),
      source: s(ed.source),
      target: s(ed.target),
      label: s(ed.label) || undefined,
      type: "causal",
    })),
    layout: "force",
    direction: "LR",
  };
  return <IntelligenceGraph graphData={graphData} title={s(data.title, "Incident Relationship Graph")} onNodeClick={(node) => onAction?.({ type: "select", payload: { node } })} />;
}
