"use client";

/**
 * SourceCard — Single source reference card.
 *
 * Displays title link, domain badge, snippet, published date,
 * reliability badge, and a "copy citation" button.
 */

import { useCallback, useContext, useState } from "react";
import { motion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { ExternalLink, Copy, Check } from "lucide-react";
import type { IntelBaseProps, IntelSource } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";

/* ═══════════════════ Data shape ═══════════════════ */

interface SourceCardData {
  source: IntelSource;
  snippet?: string;
}

/* ═══════════════════ Helpers ═══════════════════ */

const RELIABILITY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: "#ef8c66", bg: "rgba(239 140 102 / 0.12)", label: "High" },
  medium: { color: "#c9973b", bg: "rgba(201 151 59 / 0.12)", label: "Medium" },
  low: { color: "#d97757", bg: "rgba(217 119 87 / 0.12)", label: "Low" },
  unknown: { color: "var(--gu-ink-3, #6b6b73)", bg: "var(--gu-tint, rgba(128, 128, 140, 0.08))", label: "Unknown" },
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ═══════════════════ Component ═══════════════════ */

export default function SourceCard({
  data,
  state,
  variant,
  onAction,
}: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const { source, snippet } = data as unknown as SourceCardData;
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!source) return;
    const citation = `${source.title} — ${source.url}`;
    navigator.clipboard.writeText(citation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [source]);

  const handleNavigate = useCallback(() => {
    if (!source) return;
    onAction?.({
      type: "navigate",
      payload: { url: source.url, title: source.title },
    });
  }, [source, onAction]);

  /* ── Loading skeleton ── */
  if (state === "loading") {
    return (
      <div className="intel-source-card intel-source-card--loading" role="status">
        <div className="intel-source-card__skeleton-title" />
        <div className="intel-source-card__skeleton-line" />
        <div className="intel-source-card__skeleton-line" style={{ width: "60%" }} />
      </div>
    );
  }

  /* ── Error ── */
  if (state === "error") {
    return (
      <div className="intel-source-card intel-source-card--error" role="alert">
        <span>Source unavailable</span>
      </div>
    );
  }

  /* ── Empty ── */
  if (state === "empty" || !source) {
    return null;
  }

  const domain = source.domain || extractDomain(source.url);
  const rel = RELIABILITY_STYLE[source.reliability || "unknown"];

  return (
    <div className="intel-source-card" data-variant={resolvedVariant} role="article">
      {/* Header: title link + domain badge */}
      <div className="intel-source-card__header">
        <motion.button
          type="button"
          className="intel-source-card__title"
          whileHover={MH.row}
          whileTap={MH.tap}
          transition={MH.spring}
          onClick={handleNavigate}
          title={source.url}
        >
          <span>{source.title}</span>
          <ExternalLink size={12} />
        </motion.button>
        <span className="intel-source-card__domain">{domain}</span>
      </div>

      {/* Snippet */}
      {(snippet || source.description) && (
        <p className="intel-source-card__snippet">
          {snippet || source.description}
        </p>
      )}

      {/* Footer: date, reliability, copy */}
      <div className="intel-source-card__footer">
        {source.publishedDate && (
          <span className="intel-source-card__date">{source.publishedDate}</span>
        )}
        <span
          className="intel-source-card__reliability"
          style={{ color: rel.color }}
        >
          {rel.label}
        </span>
        <motion.button
          type="button"
          className="intel-source-card__copy"
          whileHover={MH.chip}
          whileTap={MH.tap}
          transition={MH.spring}
          onClick={handleCopy}
          title="Copy citation"
          aria-label="Copy citation"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? "Copied" : "Cite"}</span>
        </motion.button>
      </div>
    </div>
  );
}
