"use client";

/**
 * Shared Intelligence UI shell & primitives.
 * - Uncontained by default: sits seamlessly on Momo's canvas without parent box wrapping
 * - Zero colored borders: neutral Momo surface tokens + coral accent (--gu-accent)
 * - Supports 4 visual variants: "default" | "editorial" | "split" | "minimal"
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { AlertCircle, Inbox, Sparkles, ExternalLink } from "lucide-react";
import type { IntelRenderState, IntelSource } from "@/lib/intelligence/types";

export const IntelVariantContext = createContext<string>("default");

interface IntelCardShellProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: "blue" | "green" | "amber" | "red" | "purple" | "neutral";
  variant?: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  /** Extra content rendered in the spine rail between the header and sources. */
  spineExtra?: ReactNode;
  state: IntelRenderState;
  isEmpty?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  sources?: IntelSource[];
  streaming?: boolean;
  className?: string;
  children: ReactNode;
}

export function IntelCardShell({
  title,
  subtitle,
  badge,
  badgeTone = "neutral",
  variant,
  icon,
  headerRight,
  spineExtra,
  state,
  isEmpty = false,
  emptyMessage = "No data available",
  errorMessage = "Failed to load component data",
  sources,
  streaming,
  className = "",
  children,
}: IntelCardShellProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const [showAllSources, setShowAllSources] = useState(false);
  if (state === "loading") {
    return (
      <div className={`intel-shell intel-shell--loading ${className}`} role="status" aria-label={`Loading ${title || "panel"}`}>
        <div className="intel-skeleton-line" style={{ width: "36%", height: 14 }} />
        <div className="intel-skeleton-line" style={{ width: "85%", height: 12, marginTop: 12 }} />
        <div className="intel-skeleton-line" style={{ width: "68%", height: 12, marginTop: 8 }} />
        <div className="intel-skeleton-block" style={{ height: 86, marginTop: 14 }} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={`intel-shell intel-shell--error ${className}`} role="alert">
        <div className="intel-shell__state-row">
          <AlertCircle size={18} className="intel-text-accent" />
          <div>
            <div className="intel-shell__state-title">{title || "Component Error"}</div>
            <div className="intel-shell__state-desc">{errorMessage}</div>
          </div>
        </div>
      </div>
    );
  }

  if (state === "empty" || isEmpty) {
    if (!streaming && state !== "streaming") {
      return null;
    }
    return (
      <div className={`intel-shell intel-shell--empty ${className}`} role="status">
        <div className="intel-shell__state-row">
          <Inbox size={18} className="intel-text-muted" />
          <span>{emptyMessage}</span>
        </div>
      </div>
    );
  }

  const hasValidSources = Boolean(
    sources && sources.some((src) => /^https?:\/\//i.test(src.url)),
  );
  const hasSpine = Boolean(title || badge || headerRight || spineExtra || hasValidSources);

  return (
    <motion.section
      key={resolvedVariant}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={`intel-shell ${streaming || state === "streaming" ? "intel-shell--streaming" : ""}${hasSpine ? " has-spine" : ""} ${className}`}
      data-variant={resolvedVariant}
    >
      {hasSpine && (
        <aside className="intel-shell__spine">
          {(title || badge || headerRight) && (
            <header className="intel-shell__header">
              <div className="intel-shell__title-wrap">
                {icon && <span className="intel-shell__icon">{icon}</span>}
                <div className="min-w-0 flex-1">
                  {subtitle ? (
                    <p className="gu-pen intel-shell__subtitle">{subtitle}</p>
                  ) : (
                    resolvedVariant === "editorial" &&
                    badge && (
                      <p className="gu-pen intel-shell__subtitle">
                        note — {badge.toLowerCase()}
                      </p>
                    )
                  )}
                  {title && <h3 className="gu-title intel-shell__title">{title}</h3>}
                </div>
              </div>
              <div className="intel-shell__header-right">
                {(streaming || state === "streaming") && (
                  <span className="intel-badge intel-badge--amber">
                    <Sparkles size={10} /> Streaming
                  </span>
                )}
                {badge && <span className={`intel-badge intel-badge--${badgeTone}`}>{badge}</span>}
                {headerRight}
              </div>
            </header>
          )}

          {spineExtra && <div className="intel-shell__spine-extra">{spineExtra}</div>}

          {hasValidSources && sources && (() => {
            const validSources = sources.filter((src) => /^https?:\/\//i.test(src.url));
            const shownSources = showAllSources ? validSources : validSources.slice(0, 5);
            const hiddenCount = validSources.length - shownSources.length;
            return (
              <footer className="intel-shell__sources">
                <span className="intel-shell__sources-label">
                  Sumber ({validSources.length})
                </span>
                <div className="intel-shell__sources-list">
                  {shownSources.map((src, idx) => (
                    <motion.a
                      key={`${src.url}-${idx}`}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="intel-shell__source-pill"
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 450, damping: 28 }}
                    >
                      <span className="truncate">{src.domain || src.title}</span>
                      <ExternalLink size={10} />
                    </motion.a>
                  ))}
                  {validSources.length > 5 && (
                    <motion.button
                      type="button"
                      className="intel-shell__source-pill"
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 450, damping: 28 }}
                      onClick={() => setShowAllSources((v) => !v)}
                    >
                      <span>{showAllSources ? "Ringkas" : `+${hiddenCount}`}</span>
                    </motion.button>
                  )}
                </div>
              </footer>
            );
          })()}
        </aside>
      )}

      <div className="intel-shell__body">{children}</div>
    </motion.section>
  );
}

/** Semantic dot/glyph tone using Momo's warm charcoal + coral palette */
export function toneColor(tone?: string): string {
  switch ((tone || "").toLowerCase()) {
    case "good":
    case "success":
    case "high":
    case "positive":
    case "active":
    case "pass":
    case "verified":
      return "#ef8c66";
    case "warning":
    case "medium":
    case "partial":
    case "degraded":
    case "critical":
    case "error":
    case "bad":
    case "low":
    case "fail":
    case "false":
    case "disputed":
      return "#d97757";
    case "neutral":
    default:
      return "var(--gu-ink-3, #8e8e96)";
  }
}

export function badgeClassForTone(tone?: string): "blue" | "green" | "amber" | "red" | "purple" | "neutral" {
  switch ((tone || "").toLowerCase()) {
    case "good":
    case "success":
    case "high":
    case "positive":
    case "active":
    case "pass":
    case "verified":
    case "low_risk":
      return "green";
    case "warning":
    case "medium":
    case "partial":
    case "degraded":
    case "critical":
    case "error":
    case "bad":
    case "high_risk":
    case "fail":
    case "false":
    case "disputed":
      return "amber";
    case "neutral":
    case "info":
    default:
      return "neutral";
  }
}

export const s = (v: unknown, d = ""): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : d;

export const n = (v: unknown, d = 0): number =>
  typeof v === "number" && Number.isFinite(v)
    ? v
    : typeof v === "string" && v.trim() && Number.isFinite(Number(v))
      ? Number(v)
      : d;

export const a = <T = Record<string, unknown>>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : [];
