"use client";

/**
 * ReasoningSummary — Step-by-step reasoning chain (Momo uncontained + 4 variants)
 */

import { useContext } from "react";
import { motion } from "motion/react";
import { ExternalLink, Brain } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { STAGGER_ITEM, useStagger } from "../shared/StateMotion";

interface EvidenceLink {
  label: string;
  url?: string;
}

interface ReasoningStep {
  step: string;
  detail?: string;
}

interface ReasoningSummaryData {
  outcome: string;
  steps: ReasoningStep[];
  evidence?: EvidenceLink[];
  confidence?: number;
}

function getConfidenceColor(v: number): string {
  if (v >= 75) return "#ef8c66";
  if (v >= 50) return "#c9973b";
  return "#d97757";
}

export default function ReasoningSummary({ data, state, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const stagger = useStagger();
  const resolvedVariant = variant || ctxVariant || "default";
  const d = data as unknown as ReasoningSummaryData;

  if (state === "loading") {
    return (
      <div className="intel-reasoning intel-reasoning--skeleton" data-variant={resolvedVariant} role="status" aria-label="Loading reasoning">
        <div className="intel-skeleton-line" style={{ width: "70%", height: 16 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="intel-skeleton-line" style={{ width: `${85 - i * 8}%`, height: 12, marginTop: 10 }} />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-reasoning intel-reasoning--error" data-variant={resolvedVariant} role="alert">
        <span style={{ color: "#d97757", fontSize: 13 }}>Failed to load reasoning</span>
      </div>
    );
  }

  if (state === "empty" || !d.outcome) {
    return (
      <div className="intel-reasoning intel-reasoning--empty" data-variant={resolvedVariant} role="status">
        <span className="intel-text-muted" style={{ fontSize: 13 }}>No reasoning data</span>
      </div>
    );
  }

  const confColor = d.confidence != null ? getConfidenceColor(d.confidence) : undefined;

  return (
    <motion.div {...stagger} className="intel-reasoning" data-variant={resolvedVariant} role="article" aria-label="Reasoning Summary">
      <motion.div className="gu-pen intel-hand-note" variants={STAGGER_ITEM}>reasoning chain</motion.div>
      <motion.div className="intel-reasoning__outcome" variants={STAGGER_ITEM}>
        <Brain size={16} style={{ color: "#ef8c66", flexShrink: 0 }} />
        <p>{d.outcome}</p>
        {d.confidence != null && (
          <span className="intel-reasoning__confidence" style={{ color: confColor, borderColor: "var(--gu-line-2, rgba(128,128,140,0.22))" }}>
            {Math.round(d.confidence)}%
          </span>
        )}
      </motion.div>

      <div className="intel-reasoning__chain">
        {(Array.isArray(d.steps) ? d.steps : []).map((s, i) => (
          <motion.div key={i} className="intel-reasoning__step" variants={STAGGER_ITEM}>
            <span className="intel-reasoning__step-num">{i + 1}</span>
            <div className="intel-reasoning__step-content">
              <span className="intel-reasoning__step-text">{s.step}</span>
              {s.detail && <span className="intel-reasoning__step-detail">{s.detail}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {d.evidence && d.evidence.length > 0 && (
        <motion.div className="intel-reasoning__evidence" variants={STAGGER_ITEM}>
          <div className="gu-pen intel-hand-note">supporting evidence</div>
          <div className="intel-reasoning__evidence-list">
            {d.evidence.map((e, i) => (
              <span key={i} className="intel-reasoning__evidence-item">
                {e.url && /^https?:\/\//i.test(e.url) ? (
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="intel-reasoning__evidence-link">
                    {e.label} <ExternalLink size={10} />
                  </a>
                ) : (
                  <span>{e.label}</span>
                )}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
