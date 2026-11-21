"use client";

/**
 * Category 04 — Evidence & Research Intelligence UI (Remaining 18 Components)
 * (Plus research_workspace in WorkspaceCatalogSuite with secondaryCategories: ["evidence"])
 *
 * Components:
 * - evidence_matrix, evidence_collection, source_preview, source_comparison,
 *   source_timeline, source_reliability, citation, reference_list,
 *   quote_extraction, fact_check_panel, document_viewer, document_diff,
 *   article_reader, research_brief, news_feed, claim_evidence_map,
 *   evidence_timeline, source_inspector
 */

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { buildProxiedImageUrl } from "@/lib/imageAssetContract";
import { sourceHost, sourceTime } from "@/lib/sourceMeta";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Quote,
  FileText,
  Newspaper,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  ArrowUpRight,
  Copy,
  Check,
  Search,
  X,
} from "lucide-react";
import type { IntelBaseProps, IntelGraphData } from "@/lib/intelligence/types";
import IntelligenceGraph from "../graphs/IntelligenceGraph";
import { IntelCardShell, badgeClassForTone, toneColor, s, n, a } from "../shared/IntelCardShell";
import { ActivePlate } from "../shared/StateMotion";
import { Num } from "../charts/kit";
import {
  RkBoard,
  RkList,
  RkMark,
  RkMeta,
  RkMeter,
  RkRank,
  RkRow,
  RkStack,
  RkSummary,
} from "../shared/RowKit";

/* 1. EvidenceMatrix */
export function EvidenceMatrix({ data, state, streaming, sources }: IntelBaseProps) {
  const claims = a<Record<string, unknown>>(data.claims);
  const cols = a<string>(data.sources);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);

  return (
    <IntelCardShell
      title={s(data.title, "Claim vs Evidence Matrix")}
      badge={`${claims.length} claims`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={claims.length === 0}
      emptyMessage="No claim-evidence mappings"
    >
      <div className="intel-table-scroll intel-evidence-matrix">
        <table className="intel-matrix-table intel-evidence-matrix__table">
          <thead>
            <tr>
              <th>Claim</th>
              {cols.map((col, idx) => <th key={idx}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {claims.map((cl, r) => {
              const cells = a<Record<string, unknown>>(cl.assessments || cl.cells);
              return (
                <tr key={r}>
                  <td className="intel-matrix-rowhead">{s(cl.claim || cl.label)}</td>
                  {cols.map((_, c) => {
                    const cell = cells[c] || {};
                    const stance = s(cell.stance || cell.status, "neutral");
                    const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                    return (
                      <td
                        key={c}
                        data-stance={stance}
                        className={isSelected ? "intel-matrix-cell is-selected" : "intel-matrix-cell"}
                        onClick={() => setSelectedCell({ r, c })}
                        style={{ cursor: "pointer", textAlign: "center" }}
                      >
                        <span
                          className={`intel-badge intel-badge--${
                            stance === "supports" ? "green" : stance === "contradicts" ? "red" : "neutral"
                          }`}
                        >
                          {stance}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedCell && (
        <div className="intel-subcard__expand" style={{ marginTop: 10 }}>
          <strong>{s(claims[selectedCell.r]?.claim)}:</strong>{" "}
          {s(a<Record<string, unknown>>(claims[selectedCell.r]?.assessments)[selectedCell.c]?.note, "Mapped from source review.")}
        </div>
      )}
    </IntelCardShell>
  );
}

/* 2. EvidenceCollection */
export function EvidenceCollection({ data, state, streaming, sources }: IntelBaseProps) {
  const items = a<Record<string, unknown>>(data.items);
  const [stanceFilter, setStanceFilter] = useState("all");
  const filtered = stanceFilter === "all" ? items : items.filter((it) => s(it.stance) === stanceFilter);
  const stanceTabs = [
    { key: "all", label: "All", tone: "var(--gu-accent, #ef8c66)" },
    { key: "supporting", label: "Supporting", tone: "#22c55e" },
    { key: "contradicting", label: "Contradicting", tone: "#ef4444" },
    { key: "contextual", label: "Contextual", tone: "#38bdf8" },
  ] as const;
  const stanceOf = (raw?: string): string => {
    const t = (raw ?? "").trim().toLowerCase();
    if (t.startsWith("contra") || t === "against") return "contradicting";
    if (t.startsWith("support")) return "supporting";
    if (t.startsWith("context") || t === "neutral") return "contextual";
    return t || "contextual";
  };
  const stanceLabel = (st: string) => (st === "other" ? "Other" : st.charAt(0).toUpperCase() + st.slice(1));
  const STANCES = ["supporting", "contradicting", "contextual", "other"];
  const counts: Record<string, number> = { supporting: 0, contradicting: 0, contextual: 0, other: 0 };
  items.forEach((it) => {
    const st = stanceOf(s(it.stance, "contextual"));
    counts[STANCES.includes(st) ? st : "other"] += 1;
  });
  const segs = STANCES.filter((k) => counts[k] > 0).map((k) => ({
    key: k,
    label: stanceLabel(k),
    value: counts[k],
    tone: k === "other" ? "neutral" : k,
  }));
  const factTone = (t: string) => (t === "supporting" ? "good" : t === "contradicting" ? "bad" : undefined);

  return (
    <IntelCardShell
      title={s(data.title, "Evidence Collection")}
      badge={`${filtered.length} items`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={items.length === 0}
    >
      <RkBoard>
        <div className="intel-rk__tabs">
          <div className="intel-src-tabs" role="tablist" aria-label="Evidence stance filter">
            {stanceTabs.map((tab) => {
              const isActive = stanceFilter === tab.key;
              const count = tab.key === "all" ? items.length : items.filter((it) => s(it.stance) === tab.key).length;
              return (
                <motion.button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`intel-src-tab${isActive ? " is-active" : ""}`}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  onClick={() => setStanceFilter(tab.key)}
                >
                  <span className="intel-ev-tab__dot" style={{ background: tab.tone }} aria-hidden="true" />
                  <span>{tab.label}</span>
                  <span className="intel-ev-tab__count">{count}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
        <RkSummary items={segs.map((sg) => ({ label: sg.label, value: <Num value={sg.value} />, tone: factTone(sg.key) }))}>
          <RkStack segments={segs} label="Evidence by stance" />
        </RkSummary>
        {filtered.length > 0 ? (
          <RkList label="Evidence items">
            {filtered.map((ev, i) => {
              const st = stanceOf(s(ev.stance, "contextual"));
              const known = st === "supporting" || st === "contradicting" || st === "contextual";
              const tone = known ? st : "neutral";
              return (
                <RkRow
                  key={i}
                  lead={
                    <RkMark tone={tone}>
                      {st === "supporting" ? <Check size={10} /> : st === "contradicting" ? <X size={10} /> : "•"}
                    </RkMark>
                  }
                  title={s(ev.title || ev.claim)}
                  sub={s(ev.excerpt || ev.summary)}
                  aside={
                    <span className="intel-rk__chip" data-tone={st === "supporting" ? "good" : st === "contradicting" ? "bad" : undefined}>
                      {stanceLabel(known ? st : "other")}
                    </span>
                  }
                >
                  {s(ev.source) && (
                    <RkMeta>
                      <span className="intel-muted-mono">Source · {s(ev.source)}</span>
                    </RkMeta>
                  )}
                </RkRow>
              );
            })}
          </RkList>
        ) : (
          <p className="intel-rk__note">No {stanceFilter} evidence in this collection.</p>
        )}
      </RkBoard>
    </IntelCardShell>
  );
}

/* 3. SourcePreview */
export function SourcePreview({ data, state, streaming, sources }: IntelBaseProps) {
  const title = s(data.title);
  return (
    <IntelCardShell
      title={title || "Source Preview"}
      subtitle={s(data.domain || data.url)}
      badge={s(data.type || data.reliability, "Source")}
      icon={<ExternalLink size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={!title}
    >
      <p className="intel-lead-text">{s(data.summary || data.excerpt)}</p>
      {a<string>(data.highlights).length > 0 && (
        <ul className="intel-bullet-list">
          {a<string>(data.highlights).map((h, i) => <li key={i}>{h}</li>)}
        </ul>
      )}
      {/^https?:\/\//i.test(s(data.url)) && (
        <a href={s(data.url)} target="_blank" rel="noopener noreferrer" className="intel-link-btn" style={{ marginTop: 8 }}>
          Open original source <ExternalLink size={12} />
        </a>
      )}
    </IntelCardShell>
  );
}

/* 4. SourceComparison */
export function SourceComparison({ data, state, streaming, sources }: IntelBaseProps) {
  const list = a<Record<string, unknown>>(data.sources);
  return (
    <IntelCardShell
      title={s(data.title, "Source Comparison")}
      badge={`${list.length} sources`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={list.length === 0}
    >
      <div className="intel-compare-grid">
        {list.map((src, i) => (
          <div key={i} className="intel-compare-card">
            <div className="intel-subcard__row">
              <strong>{s(src.title)}</strong>
              <span className={`intel-badge intel-badge--${badgeClassForTone(s(src.reliability, "medium"))}`}>
                {s(src.reliability, "medium")}
              </span>
            </div>
            <div className="intel-muted-mono" style={{ marginBottom: 6 }}>
              {s(src.domain)} • {s(src.date)}
            </div>
            <p className="intel-subcard__text">{s(src.stance || src.summary)}</p>
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 5. SourceTimeline */
export function SourceTimeline({ data, state, streaming, sources }: IntelBaseProps) {
  const items = a<Record<string, unknown>>(data.sources);
  return (
    <IntelCardShell
      title={s(data.title, "Chronological Sources")}
      badge={`${items.length} entries`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={items.length === 0}
    >
      <div className="intel-timeline">
        {items.map((it, i) => (
          <div key={i} className="intel-timeline__item">
            <div className="intel-timeline__rail">
              <span className="intel-dot" style={{ background: "#ef8c66" }} />
              {i < items.length - 1 && <div className="intel-timeline__line" />}
            </div>
            <div className="intel-timeline__content">
              <div className="intel-timeline__top">
                <span className="intel-timeline__label">{s(it.title)}</span>
                <span className="intel-timeline__time">{s(it.date)}</span>
              </div>
              <p className="intel-timeline__detail">{s(it.summary || it.snippet)}</p>
              {s(it.domain) && <span className="intel-badge intel-badge--neutral">{s(it.domain)}</span>}
            </div>
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 6. SourceReliability — score board */
function relTone(score: number): string {
  return score >= 80 ? "accent" : score >= 50 ? "warn" : "bad";
}

export function SourceReliability({ data, state, streaming, sources }: IntelBaseProps) {
  const items = a<Record<string, unknown>>(data.sources);
  const rows = items
    .map((src, i) => ({ src, i, score: n(src.score, 70) }))
    .sort((x, y) => y.score - x.score);
  const avg = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.score, 0) / rows.length) : 0;
  const top = rows[0];

  return (
    <IntelCardShell
      title={s(data.title, "Source Reliability Assessment")}
      badge={`${items.length} evaluated`}
      icon={<ShieldCheck size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={items.length === 0}
    >
      <RkBoard>
        <RkSummary
          items={[
            ...(top ? [{ label: "Top source", value: `${s(top.src.domain || top.src.title)} · ${top.score}` }] : []),
            { label: "Avg score", value: <Num value={avg} unit="/100" /> },
            { label: "Evaluated", value: <Num value={items.length} /> },
          ]}
        />
        <RkList label="Source reliability">
          {rows.map(({ src, i, score }, idx) => (
            <RkRow
              key={i}
              lead={<RkRank n={idx + 1} top={idx === 0} />}
              title={s(src.domain || src.title)}
              sub={s(src.rationale)}
              aside={<RkMeter value={score} max={100} unit="/100" tone={relTone(score)} />}
            />
          ))}
        </RkList>
      </RkBoard>
    </IntelCardShell>
  );
}

/* 7. Citation */
export function Citation({ data, state, streaming }: IntelBaseProps) {
  const [copied, setCopied] = useState(false);
  const text = s(data.citation || data.title);
  return (
    <IntelCardShell
      title={s(data.label, "Citation")}
      badge={s(data.index ? `[${data.index}]` : "Ref")}
      state={state}
      streaming={streaming}
      isEmpty={!text}
    >
      <div className="intel-citation-flat">
        <div className="intel-subcard__row">
          <div>
            <strong>{s(data.title)}</strong>
            <div className="intel-muted-mono">{s(data.authors)} {s(data.year) && `(${s(data.year)})`} • {s(data.publisher || data.domain)}</div>
          </div>
          <motion.button
            type="button"
            className="intel-citation-copy"
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => {
              navigator.clipboard?.writeText(s(data.citation || `${s(data.title)} — ${s(data.url)}`));
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
          </motion.button>
        </div>
        {s(data.quote) && <blockquote className="intel-quote">{s(data.quote)}</blockquote>}
      </div>
    </IntelCardShell>
  );
}

/* 8. ReferenceList */
export function ReferenceList({ data, state, streaming, sources }: IntelBaseProps) {
  const refs = a<Record<string, unknown>>(data.references);
  return (
    <IntelCardShell
      title={s(data.title, "References")}
      badge={`${refs.length}`}
      icon={<BookOpen size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={refs.length === 0}
    >
      <ol className="intel-ref-list">
        {refs.map((r, i) => (
          <li key={i} className="intel-ref-item">
            <span className="intel-ref-num">[{i + 1}]</span>
            <div className="intel-ref-body">
              {/^https?:\/\//i.test(s(r.url)) ? (
                <a href={s(r.url)} target="_blank" rel="noopener noreferrer" className="intel-link-inline">
                  {s(r.title)}
                </a>
              ) : (
                <span className="intel-link-inline">{s(r.title)}</span>
              )}
              <div className="intel-muted-mono">
                {s(r.authors)} {s(r.year) && `(${s(r.year)})`} • {s(r.domain)}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </IntelCardShell>
  );
}

/* 9. QuoteExtraction */
export function QuoteExtraction({ data, state, streaming, sources }: IntelBaseProps) {
  const quotes = a<Record<string, unknown>>(data.quotes);
  return (
    <IntelCardShell
      title={s(data.title, "Extracted Quotes")}
      badge={`${quotes.length} quotes`}
      icon={<Quote size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={quotes.length === 0}
    >
      <div className="intel-list-grid intel-quote-list">
        {quotes.map((q, i) => (
          <motion.figure key={i} className="intel-quote-card" whileHover={MH.card} transition={MH.spring}>
            <span className="intel-quote-mark" aria-hidden="true">“</span>
            <blockquote className="gu-pen intel-quote">{s(q.text || q.quote)}</blockquote>
            <figcaption className="intel-quote-foot">
              <div className="intel-quote-attrib">
                <span className="intel-quote-speaker">{s(q.speaker || q.source, "Source")}</span>
                {(s(q.page) || s(q.context)) && (
                  <span className="intel-muted-mono">
                    {[s(q.page) && `p.${s(q.page)}`, s(q.context)].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
              {s(q.relevance) && <span className="intel-badge intel-badge--blue">{s(q.relevance)}</span>}
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 10. FactCheckPanel */
export function FactCheckPanel({ data, state, streaming, sources }: IntelBaseProps) {
  const checks = a<Record<string, unknown>>(data.checks);
  return (
    <IntelCardShell
      title={s(data.title, "Fact Check Verification")}
      badge={`${checks.length} claims`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={checks.length === 0}
    >
      <div className="intel-list-grid">
        {checks.map((ck, i) => {
          const verdict = s(ck.verdict, "unverified").toLowerCase();
          const Icon =
            verdict === "verified" || verdict === "true"
              ? CheckCircle2
              : verdict === "false" || verdict === "disputed"
                ? XCircle
                : HelpCircle;
          const color = toneColor(verdict);
          return (
            <motion.div key={i} className="intel-subcard intel-fact-card" whileHover={MH.card} transition={MH.spring}>
              <div className="intel-subcard__row intel-fact-row">
                <div className="intel-subcard__title-group intel-fact-head">
                  <Icon size={15} className="intel-fact-icon" style={{ color }} />
                  <strong>{s(ck.claim)}</strong>
                </div>
                <span className={`intel-badge intel-badge--${badgeClassForTone(verdict)}`}>{verdict}</span>
              </div>
              {(s(ck.explanation) ||
                s(ck.evidence) ||
                s(ck.detail) ||
                s(ck.summary) ||
                s(ck.reason)) && (
                <p className="intel-subcard__text">
                  {s(ck.explanation) ||
                    s(ck.evidence) ||
                    s(ck.detail) ||
                    s(ck.summary) ||
                    s(ck.reason)}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 11. DocumentViewer */
export function DocumentViewer({ data, state, streaming, sources }: IntelBaseProps) {
  const sections = a<Record<string, unknown>>(data.sections);
  const [query, setQuery] = useState("");
  const shown = query
    ? sections.filter((sec) => s(sec.heading).toLowerCase().includes(query.toLowerCase()) || s(sec.content).toLowerCase().includes(query.toLowerCase()))
    : sections;

  return (
    <IntelCardShell
      title={s(data.title, "Document Viewer")}
      subtitle={s(data.metadataLine)}
      icon={<FileText size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={sections.length === 0 && !s(data.content)}
      headerRight={
        <div className="intel-inline-search">
          <Search size={12} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search doc..." />
        </div>
      }
    >
      <div className="intel-doc-body">
        {shown.length > 0 ? (
          shown.map((sec, i) => (
            <div key={i} className="intel-doc-section">
              <h4>{s(sec.heading)}</h4>
              <p>{s(sec.content)}</p>
            </div>
          ))
        ) : (
          <p className="intel-doc-plain">{s(data.content)}</p>
        )}
      </div>
    </IntelCardShell>
  );
}

/* 12. DocumentDiff */
export function DocumentDiff({ data, state, streaming, sources }: IntelBaseProps) {
  const hunks = a<Record<string, unknown>>(data.hunks);
  const [mode, setMode] = useState<"unified" | "split">("split");
  const pillId = useId();
  const leftLabel = s(data.leftLabel, "v1");
  const rightLabel = s(data.rightLabel, "v2");

  return (
    <IntelCardShell
      title={s(data.title, "Document Diff")}
      badge={`${leftLabel} → ${rightLabel}`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={hunks.length === 0}
      headerRight={
        <div className="intel-filter-pills">
          <motion.button type="button" className={`intel-pill ${mode === "split" ? "is-active" : ""}`} whileHover={MH.chip} whileTap={MH.tap} transition={MH.spring} onClick={() => setMode("split")}>
            {mode === "split" && <ActivePlate layoutId={pillId} shadow />}
            Split
          </motion.button>
          <motion.button type="button" className={`intel-pill ${mode === "unified" ? "is-active" : ""}`} whileHover={MH.chip} whileTap={MH.tap} transition={MH.spring} onClick={() => setMode("unified")}>
            {mode === "unified" && <ActivePlate layoutId={pillId} shadow />}
            Unified
          </motion.button>
        </div>
      }
    >
      <div className="intel-docdiff">
        {mode === "split" && (
          <div className="intel-docdiff__pane-labels">
            <span>{leftLabel}</span>
            <span>{rightLabel}</span>
          </div>
        )}
        {hunks.map((hk, i) => {
          const beforeText = s(hk.before);
          const afterText = s(hk.after);
          const beforeLines = beforeText ? beforeText.split("\n") : [];
          const afterLines = afterText ? afterText.split("\n") : [];
          const baseLine = n(hk.lineStart, i * 10 + 1);
          const maxRows = Math.max(beforeLines.length, afterLines.length, 1);

          return (
            <div key={i} className="intel-docdiff__hunk">
              <div className="intel-docdiff__hunk-head">
                <code>@@ {s(hk.section, `Section ${i + 1}`)} @@</code>
                <span className="intel-docdiff__hunk-stats">
                  -{beforeLines.length} / +{afterLines.length}
                </span>
              </div>

              {mode === "split" ? (
                <div className="intel-docdiff__split">
                  {Array.from({ length: maxRows }, (_, r) => {
                    const oldLine = beforeLines[r];
                    const newLine = afterLines[r];
                    return (
                      <div key={r} className="intel-docdiff__split-row">
                        <div className={`intel-docdiff__cell ${oldLine !== undefined ? "is-del" : "is-empty"}`}>
                          <span className="intel-docdiff__ln">{oldLine !== undefined ? baseLine + r : ""}</span>
                          <span className="intel-docdiff__sign">{oldLine !== undefined ? "−" : ""}</span>
                          <span className="intel-docdiff__txt">{oldLine ?? ""}</span>
                        </div>
                        <div className={`intel-docdiff__cell ${newLine !== undefined ? "is-add" : "is-empty"}`}>
                          <span className="intel-docdiff__ln">{newLine !== undefined ? baseLine + r : ""}</span>
                          <span className="intel-docdiff__sign">{newLine !== undefined ? "+" : ""}</span>
                          <span className="intel-docdiff__txt">{newLine ?? ""}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="intel-docdiff__unified">
                  {beforeLines.map((line, r) => (
                    <div key={`d-${r}`} className="intel-docdiff__uni-row is-del">
                      <span className="intel-docdiff__ln">{baseLine + r}</span>
                      <span className="intel-docdiff__ln" />
                      <span className="intel-docdiff__sign">−</span>
                      <span className="intel-docdiff__txt">{line}</span>
                    </div>
                  ))}
                  {afterLines.map((line, r) => (
                    <div key={`a-${r}`} className="intel-docdiff__uni-row is-add">
                      <span className="intel-docdiff__ln" />
                      <span className="intel-docdiff__ln">{baseLine + r}</span>
                      <span className="intel-docdiff__sign">+</span>
                      <span className="intel-docdiff__txt">{line}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </IntelCardShell>
  );
}

/* 13. ArticleReader */
export function ArticleReader({ data, state, streaming, sources }: IntelBaseProps) {
  const paragraphs = a<string>(data.paragraphs);
  const title = s(data.title);
  return (
    <IntelCardShell
      title={title || "Article Reader"}
      subtitle={`${s(data.author)} • ${s(data.readTime, "4 min read")} • ${s(data.date)}`}
      icon={<BookOpen size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={!title && paragraphs.length === 0}
    >
      {s(data.lead) && <p className="intel-lead-text">{s(data.lead)}</p>}
      <div className="intel-article-prose">
        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </IntelCardShell>
  );
}

/* 14. ResearchBrief */
export function ResearchBrief({ data, state, streaming, sources }: IntelBaseProps) {
  const questions = a<string>(data.keyQuestions);
  const findings = a<string>(data.findings);
  return (
    <IntelCardShell
      title={s(data.title, "Research Brief")}
      badge={s(data.confidence, "Synthesis")}
      badgeTone="purple"
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={!s(data.question) && findings.length === 0}
    >
      {s(data.question) && (
        <div className="intel-callout-box">
          <strong>Research Question:</strong> {s(data.question)}
        </div>
      )}
      {findings.length > 0 && (
        <div className="intel-subblock">
          <div className="intel-col-label">Core Findings</div>
          <ul className="intel-bullet-list">{findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}
      {questions.length > 0 && (
        <div className="intel-subblock">
          <div className="intel-col-label">Open Questions</div>
          <ul className="intel-bullet-list">{questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </div>
      )}
    </IntelCardShell>
  );
}

/* 15. NewsFeed */

interface NewsArticle {
  headline: string;
  summary?: string;
  url?: string;
  outlet?: string;
  host?: string;
  time?: string;
  imageUrl?: string;
  tag?: string;
}

function NewsFavicon({ host }: { host: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      className="intel-news__favicon"
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`}
      alt=""
      width={14}
      height={14}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

function NewsImage({ url, className, onDead }: { url: string; className: string; onDead: () => void }) {
  const [mode, setMode] = useState<"raw" | "proxy" | "dead">("raw");
  const [loaded, setLoaded] = useState(false);
  if (mode === "dead") return null;
  return (
    <motion.img
      className={className}
      src={mode === "raw" ? url : buildProxiedImageUrl(url)}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      initial={{ opacity: 0 }}
      animate={{ opacity: loaded ? 1 : 0 }}
      transition={MH.spring}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (mode === "raw") setMode("proxy");
        else {
          setMode("dead");
          onDead();
        }
      }}
    />
  );
}

function NewsMeta({ art }: { art: NewsArticle }) {
  return (
    <div className="intel-news__meta">
      {art.host && <NewsFavicon host={art.host} />}
      {art.outlet && <span className="intel-news__outlet">{art.outlet}</span>}
      {art.outlet && art.time && <span className="intel-news__sep" aria-hidden="true">·</span>}
      {art.time && <span className="intel-news__time">{sourceTime(art.time)}</span>}
      {art.tag && <span className="intel-badge intel-news__tag">{art.tag}</span>}
      {art.url && <ArrowUpRight size={11} className="intel-news__ext" aria-hidden="true" />}
    </div>
  );
}

function NewsRow({
  art,
  lead,
  active,
  plateId,
  reduce,
  onActivate,
}: {
  art: NewsArticle;
  lead?: boolean;
  active: boolean;
  plateId: string;
  reduce: boolean | null;
  onActivate: () => void;
}) {
  const [imgDead, setImgDead] = useState(false);
  const hasImg = Boolean(art.imageUrl) && !imgDead;
  const cls = `${lead ? "intel-news__lead" : "intel-news__item"}${hasImg ? " has-media" : ""}${active ? " is-active" : ""}`;
  const plate = active ? (
    <motion.span
      layoutId={`${plateId}-plate`}
      className="intel-news__plate"
      aria-hidden="true"
      transition={reduce ? { duration: 0 } : MH.spring}
    />
  ) : null;
  const shared = {
    className: cls,
    onMouseEnter: onActivate,
    onFocus: onActivate,
  };

  const body = lead ? (
    <>
      {plate}
      {hasImg && art.imageUrl && (
        <div className="intel-news__lead-media">
          <NewsImage key={art.imageUrl} url={art.imageUrl} className="intel-news__lead-img" onDead={() => setImgDead(true)} />
        </div>
      )}
      <div className="intel-news__text">
        <NewsMeta art={art} />
        <div className="intel-news__headline">{art.headline}</div>
        {art.summary && <p className="intel-news__summary">{art.summary}</p>}
      </div>
    </>
  ) : (
    <>
      {plate}
      <div className="intel-news__text">
        <NewsMeta art={art} />
        <div className="intel-news__headline">{art.headline}</div>
        {art.summary && <p className="intel-news__summary">{art.summary}</p>}
      </div>
      {hasImg && art.imageUrl && (
        <div className="intel-news__thumb">
          <NewsImage key={art.imageUrl} url={art.imageUrl} className="intel-news__thumb-img" onDead={() => setImgDead(true)} />
        </div>
      )}
    </>
  );

  return art.url ? (
    <a {...shared} href={art.url} target="_blank" rel="noopener noreferrer" aria-label={art.headline}>
      {body}
    </a>
  ) : (
    <div {...shared} role="article">
      {body}
    </div>
  );
}

export function NewsFeed({ data, state, streaming, sources }: IntelBaseProps) {
  const articles = a<Record<string, unknown>>(data.articles)
    .map((art): NewsArticle | null => {
      const headline = s(art.headline || art.title);
      if (!headline) return null;
      const rawUrl = s(art.url);
      const hasUrl = /^https?:\/\//i.test(rawUrl);
      const host = hasUrl ? sourceHost(rawUrl) : "";
      const rawImg = s(art.imageUrl || art.image);
      return {
        headline,
        summary: s(art.summary || art.description || art.excerpt) || undefined,
        url: hasUrl ? rawUrl : undefined,
        outlet: s(art.outlet || art.source) || host || undefined,
        host: host || undefined,
        time: s(art.publishedAt || art.date || art.time) || undefined,
        imageUrl: /^https:\/\//i.test(rawImg) ? rawImg : undefined,
        tag: s(art.tag) || undefined,
      };
    })
    .filter((x): x is NewsArticle => x !== null);

  const [activeIdx, setActiveIdx] = useState(-1);
  const plateId = useId();
  const reduce = useReducedMotion();

  return (
    <IntelCardShell
      title={s(data.title, "Berita terkini")}
      badge={`${articles.length} berita`}
      icon={<Newspaper size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={articles.length === 0}
    >
      <div className="intel-news" onMouseLeave={() => setActiveIdx(-1)}>
        {articles.length > 0 && (
          <NewsRow
            art={articles[0]}
            lead
            active={activeIdx === 0}
            plateId={plateId}
            reduce={reduce}
            onActivate={() => setActiveIdx(0)}
          />
        )}
        {articles.length > 1 && (
          <div className="intel-news__list">
            {articles.slice(1).map((art, i) => {
              const idx = i + 1;
              return (
                <NewsRow
                  key={idx}
                  art={art}
                  active={activeIdx === idx}
                  plateId={plateId}
                  reduce={reduce}
                  onActivate={() => setActiveIdx(idx)}
                />
              );
            })}
          </div>
        )}
      </div>
    </IntelCardShell>
  );
}

/* 16. ClaimEvidenceMap (XYFlow interactive graph!) */
export function ClaimEvidenceMap({ data, state, onAction }: IntelBaseProps) {
  const nodes = a<Record<string, unknown>>(data.nodes);
  const edges = a<Record<string, unknown>>(data.edges);

  if (state === "loading") return <IntelCardShell state="loading" title="Claim-Evidence Map"><div /></IntelCardShell>;
  if (state === "error") return <IntelCardShell state="error" title="Claim-Evidence Map" errorMessage={s(data.error)}><div /></IntelCardShell>;
  if (state === "empty" || nodes.length === 0) return <IntelCardShell state="empty" emptyMessage="No claim-evidence map available"><div /></IntelCardShell>;

  const graphData: IntelGraphData = {
    nodes: nodes.map((nd, i) => ({
      id: s(nd.id, `ce-${i}`),
      label: s(nd.label),
      type: s(nd.type, "evidence"),
      detail: s(nd.detail) || undefined,
      status: (nd.status as IntelGraphData["nodes"][number]["status"]) || undefined,
    })),
    edges: edges.map((ed, i) => ({
      id: s(ed.id, `cee-${i}`),
      source: s(ed.source),
      target: s(ed.target),
      label: s(ed.label) || undefined,
      type: "causal",
    })),
    layout: "layered",
    direction: "LR",
  };

  return (
    <IntelligenceGraph
      graphData={graphData}
      title={s(data.title, "Claim-Evidence Map")}
      caption={s(data.caption) || undefined}
      onNodeClick={(node) => onAction?.({ type: "select", payload: { node } })}
    />
  );
}

/* 17. EvidenceTimeline */
export function EvidenceTimeline({ data, state, streaming, sources }: IntelBaseProps) {
  const events = a<Record<string, unknown>>(data.events);
  return (
    <IntelCardShell
      title={s(data.title, "Evidence Timeline")}
      badge={`${events.length} artifacts`}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={events.length === 0}
    >
      <div className="intel-timeline">
        {events.map((ev, i) => (
          <div key={i} className="intel-timeline__item">
            <div className="intel-timeline__rail">
              <span className="intel-dot" style={{ background: toneColor(s(ev.weight, "good")) }} />
              {i < events.length - 1 && <div className="intel-timeline__line" />}
            </div>
            <div className="intel-timeline__content">
              <div className="intel-timeline__top">
                <span className="intel-timeline__label">{s(ev.title)}</span>
                <span className="intel-timeline__time">{s(ev.timestamp || ev.date)}</span>
              </div>
              <p className="intel-timeline__detail">{s(ev.description)}</p>
              {s(ev.source) && <span className="intel-badge intel-badge--blue">{s(ev.source)}</span>}
            </div>
          </div>
        ))}
      </div>
    </IntelCardShell>
  );
}

/* 18. SourceInspector */
export function SourceInspector({ data, state, streaming, sources }: IntelBaseProps) {
  const srcList = a<Record<string, unknown>>(data.sources);
  const [idx, setIdx] = useState(0);
  const active = srcList[idx] || (s(data.title) ? data : null);
  const activeUrl = active ? s(active.url) : "";
  const hasValidUrl = /^https?:\/\//i.test(activeUrl);
  const hasTabs = srcList.length > 1;

  return (
    <IntelCardShell
      title={s(data.title, "Source Inspector")}
      badge={srcList.length > 0 ? `${idx + 1} / ${srcList.length}` : undefined}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={!active}
      emptyMessage="No source selected to inspect"
    >
      <div className={`intel-src-folder${hasTabs ? " has-tabs" : ""}`}>
        {hasTabs && (
          <div className="intel-src-tabs" role="tablist" aria-label="Inspected sources">
            {srcList.map((sr, i) => {
              const isActive = idx === i;
              const rel = s(sr.reliability, "high");
              const num = String(i + 1).padStart(2, "0");
              return (
                <motion.button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`intel-src-tab${isActive ? " is-active" : ""}`}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  onClick={() => setIdx(i)}
                >
                  <span
                    className="intel-src-tab__bar"
                    style={{ background: toneColor(rel) }}
                    aria-hidden="true"
                  />
                  <span className="intel-src-tab__num">{num}</span>
                  <span className="intel-src-tab__domain">{s(sr.domain || sr.title)}</span>
                </motion.button>
              );
            })}
          </div>
        )}
        {active && (
          <div className="intel-subcard intel-src-dossier">
            <div className="intel-subcard__row intel-src-dossier__head">
              <strong className="intel-src-dossier__title">{s(active.title)}</strong>
              <span
                className={`intel-badge intel-badge--${badgeClassForTone(s(active.reliability, "high"))} intel-src-dossier__badge`}
              >
                {s(active.reliability, "verified")}
              </span>
            </div>
            <div className="intel-muted-mono intel-src-dossier__meta">
              {hasValidUrl ? (
                <a href={activeUrl} target="_blank" rel="noopener noreferrer" className="intel-src-dossier__link">
                  {activeUrl}
                </a>
              ) : (
                activeUrl && <span>{activeUrl}</span>
              )}
              <span>Author: {s(active.author, "Editorial")}</span>
              {s(active.date) && <span>{s(active.date)}</span>}
            </div>
            <p className="intel-subcard__text intel-src-dossier__excerpt">
              {s(active.fullExcerpt || active.snippet)}
            </p>
          </div>
        )}
      </div>
    </IntelCardShell>
  );
}
