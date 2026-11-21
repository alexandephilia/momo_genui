"use client";

/**
 * RowKit — shared building blocks for the ledger-style intelligence panels.
 *
 * Composition: <RkBoard> wraps <RkSummary> + optional full-width extras +
 * <RkList> of <RkRow>s. Keep extras either before RkSummary or after RkList —
 * in the split variant the grid expects summary-then-list adjacency.
 *
 * Variants are stylesheet-driven off [data-variant] (read from
 * IntelVariantContext here, same resolution IntelCardShell uses).
 */

import { useContext, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { IntelVariantContext } from "./IntelCardShell";
import { MeterFill, METER, STAGGER_ITEM, useStagger } from "./StateMotion";
import { EASE, Num } from "../charts/kit";

/* ── board + summary strip ── */

export function RkBoard({ children }: { children: ReactNode }) {
  const variant = useContext(IntelVariantContext) || "default";
  return (
    <div className="intel-rk" data-variant={variant}>
      {children}
    </div>
  );
}

export interface RkFact {
  label: string;
  value: ReactNode;
  tone?: string;
}

export function RkSummary({
  items,
  aside,
  children,
}: {
  items: RkFact[];
  aside?: ReactNode;
  children?: ReactNode;
}) {
  if (!items.length && !aside && !children) return null;
  return (
    <div className={`intel-rk__summary${aside ? " has-aside" : ""}`}>
      <div className="intel-rk__facts">
        {items.map((f, i) => (
          <div key={`${f.label}-${i}`} className="intel-rk__fact" data-tone={f.tone || undefined}>
            <span className="intel-rk__fact-label">{f.label}</span>
            <span className="intel-rk__fact-value">{f.value}</span>
          </div>
        ))}
      </div>
      {aside && <div className="intel-rk__summary-aside">{aside}</div>}
      {children}
    </div>
  );
}

/** Segmented proportion bar — counts per category, segments grow in. */
export function RkStack({
  segments,
  label,
}: {
  segments: { key: string; label: string; value: number; tone: string }[];
  label?: string;
}) {
  const total = segments.reduce((sum, sg) => sum + Math.max(0, sg.value), 0) || 1;
  return (
    <div className="intel-rk__stack" role="img" aria-label={label}>
      {segments.map((sg, i) => (
        <motion.span
          key={sg.key}
          className="intel-rk__stack-seg"
          data-tone={sg.tone}
          title={`${sg.label}: ${sg.value}`}
          initial={{ width: 0 }}
          animate={{ width: `${(Math.max(0, sg.value) / total) * 100}%` }}
          transition={{ ...METER, delay: i * 0.06 }}
        />
      ))}
    </div>
  );
}

/* ── rows ── */

export function RkList({ children, label }: { children: ReactNode; label?: string }) {
  const stagger = useStagger();
  return (
    <motion.div {...stagger} className="intel-rk__list" role="list" aria-label={label}>
      {children}
    </motion.div>
  );
}

export function RkRow({
  lead,
  title,
  sub,
  aside,
  children,
  onClick,
  selected,
  dim,
  href,
  target,
  rel,
  ariaLabel,
}: {
  lead?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  dim?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  ariaLabel?: string;
}) {
  const hasLead = lead !== undefined && lead !== null && lead !== false;
  const cls = `intel-rk__row${selected ? " is-selected" : ""}${onClick || href ? " is-clickable" : ""}`;
  const inner = (
    <motion.div
      className="intel-rk__row-grid"
      data-lead={hasLead || undefined}
      animate={dim === undefined ? undefined : { opacity: dim ? 0.42 : 1 }}
      initial={dim === undefined ? undefined : false}
      transition={{ duration: 0.25, ease: EASE }}
    >
      {hasLead && <div className="intel-rk__lead">{lead}</div>}
      <div className="intel-rk__main">
        <div className="intel-rk__title">{title}</div>
        {sub !== undefined && sub !== null && sub !== "" && <div className="intel-rk__sub">{sub}</div>}
        {children}
      </div>
      {aside !== undefined && aside !== null && aside !== "" && <div className="intel-rk__aside">{aside}</div>}
    </motion.div>
  );

  if (href) {
    return (
      <motion.a
        href={href}
        target={target}
        rel={rel}
        className={cls}
        variants={STAGGER_ITEM}
        whileTap={MH.tap}
        transition={MH.spring}
        aria-label={ariaLabel}
      >
        {inner}
      </motion.a>
    );
  }
  if (onClick) {
    return (
      <motion.div
        role="button"
        tabIndex={0}
        className={cls}
        variants={STAGGER_ITEM}
        whileTap={MH.tap}
        transition={MH.spring}
        aria-label={ariaLabel}
        aria-pressed={selected}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {inner}
      </motion.div>
    );
  }
  return (
    <motion.div className={cls} variants={STAGGER_ITEM} aria-label={ariaLabel}>
      {inner}
    </motion.div>
  );
}

/* ── lead-gutter parts ── */

const SEV_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

/** Normalizes severity-ish strings (incl. Indonesian aliases) to a 5-level key. */
export function sevKey(raw?: string): keyof typeof SEV_LABEL {
  const t = (raw ?? "").trim().toLowerCase();
  if (!t) return "info";
  if (/crit|kritis|severe|fatal|darurat/.test(t)) return "critical";
  if (/high|tinggi|major|berat|parah/.test(t)) return "high";
  if (/med|sedang|moderate|warning|caution|perhatian|waspada/.test(t)) return "medium";
  if (/low|rendah|minor|kecil|tipis/.test(t)) return "low";
  return "info";
}

/** Sort rank for sevKey — lower sorts first (critical ahead of info). */
export function sevRank(raw?: string): number {
  return ["critical", "high", "medium", "low", "info"].indexOf(sevKey(raw));
}

export function sevLabel(raw?: string): string {
  return SEV_LABEL[sevKey(raw)];
}

export type SevCounts = Record<keyof typeof SEV_LABEL, number>;

export function sevTally(levels: Array<string | undefined>): SevCounts {
  const counts: SevCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  levels.forEach((l) => {
    counts[sevKey(l)] += 1;
  });
  return counts;
}

/** Non-zero severity counts as RkSummary facts, worst first. */
export function sevFactItems(counts: SevCounts): RkFact[] {
  return (["critical", "high", "medium", "low", "info"] as const)
    .filter((k) => counts[k] > 0)
    .map((k) => ({ label: SEV_LABEL[k], value: <Num value={counts[k]} /> }));
}

export function RkSeverity({ level }: { level?: string }) {
  const key = sevKey(level);
  return (
    <span className="intel-rk__sev" data-sev={key}>
      <i className="intel-rk__sev-dot" aria-hidden="true" />
      <span>{SEV_LABEL[key]}</span>
    </span>
  );
}

export function RkRank({ n, top }: { n: number; top?: boolean }) {
  return (
    <span className="intel-rk__rank" data-top={top || undefined}>
      {String(n).padStart(2, "0")}
    </span>
  );
}

export function RkTime({ value }: { value: ReactNode }) {
  return <span className="intel-rk__time">{value}</span>;
}

export function RkStep({ n, last }: { n: ReactNode; last?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span className="intel-rk__step">
      <span className="intel-rk__step-num">{n}</span>
      {!last && (
        <motion.span
          className="intel-rk__step-line"
          aria-hidden="true"
          initial={reduce ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 0.45, ease: EASE, delay: 0.12 }}
        />
      )}
    </span>
  );
}

/** Small coloured glyph for stance/status leads (evidence stacks etc.). */
export function RkMark({ tone, children }: { tone: string; children?: ReactNode }) {
  return (
    <span className="intel-rk__mark" data-tone={tone}>
      {children}
    </span>
  );
}

/* ── aside + meta parts ── */

export function RkMeter({
  value,
  max = 100,
  unit,
  tone,
  steps,
  num,
}: {
  value: number;
  max?: number;
  unit?: string;
  tone?: string;
  steps?: number;
  /** Replaces the count-up number; pass null to hide it. */
  num?: ReactNode;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span className="intel-rk__meter" data-tone={tone || undefined}>
      <span className="intel-rk__meter-track" aria-hidden="true">
        <MeterFill className="intel-rk__meter-fill" width={`${pct}%`} />
        {steps !== undefined &&
          steps > 1 &&
          Array.from({ length: steps - 1 }, (_, i) => (
            <i
              key={i}
              className="intel-rk__meter-sep"
              style={{ left: `${((i + 1) / steps) * 100}%` } as CSSProperties}
            />
          ))}
      </span>
      {num === null ? null : num !== undefined ? (
        <span className="intel-rk__meter-num">{num}</span>
      ) : (
        <Num className="intel-rk__meter-num" value={value} unit={unit} />
      )}
    </span>
  );
}

/** "before → after" with a drawn-in arrow and an optional signed-change chip. */
export function RkDelta({
  before,
  after,
  change,
  trend,
}: {
  before: ReactNode;
  after: ReactNode;
  change?: ReactNode;
  trend?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <span className="intel-rk__delta">
      <span className="intel-rk__delta-val">{before}</span>
      <svg className="intel-rk__delta-arrow" viewBox="0 0 18 10" aria-hidden="true">
        <motion.path
          d="M1 5h13M10.5 1.8 14.5 5l-4 3.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 0.32, ease: EASE, delay: 0.15 }}
        />
      </svg>
      <span className="intel-rk__delta-val">{after}</span>
      {change !== undefined && change !== null && change !== "" && (
        <span className="intel-rk__delta-chip" data-trend={trend || undefined}>
          {change}
        </span>
      )}
    </span>
  );
}

/** Quiet label/value line under a row's sub. */
export function RkMeta({ children }: { children: ReactNode }) {
  return <div className="intel-rk__meta">{children}</div>;
}

export function RkKV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <span className="intel-rk__kv">
      <span className="intel-rk__meta-k">{k}</span> <span className="intel-rk__meta-v">{v}</span>
    </span>
  );
}
