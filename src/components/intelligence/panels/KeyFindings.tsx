"use client";

/**
 * KeyFindings — Numbered findings list (Momo uncontained + 4 variants)
 */

import { useContext, useState } from "react";
import { motion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { ChevronDown, ChevronUp, Target } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { Collapse } from "../shared/StateMotion";

interface Finding {
  title: string;
  description: string;
  confidence: "high" | "medium" | "low";
  impact?: string;
  evidence?: string[];
}

interface KeyFindingsData {
  title?: string;
  findings: Finding[];
}

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: "rgba(239 140 102 / 0.14)", text: "#ef8c66" },
  medium: { bg: "rgba(201 151 59 / 0.14)", text: "#c9973b" },
  low: { bg: "rgba(217 119 87 / 0.12)", text: "#d97757" },
};

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const conf = CONFIDENCE_COLORS[finding.confidence] || CONFIDENCE_COLORS.medium;

  return (
    <div className="intel-findings__card" role="listitem">
      <div className="intel-findings__card-header">
        <span className="intel-findings__number">{index + 1}</span>
        <div className="intel-findings__card-content">
          <h4 className="intel-findings__card-title">{finding.title}</h4>
          <p className="intel-findings__card-desc">{finding.description}</p>
          <div className="intel-findings__badges">
            <span className="intel-findings__badge" style={{ background: conf.bg, color: conf.text }}>
              {finding.confidence}
            </span>
            {finding.impact && (
              <span className="intel-findings__badge intel-findings__badge--impact">
                <Target size={10} /> {finding.impact}
              </span>
            )}
          </div>
        </div>
      </div>
      {finding.evidence && finding.evidence.length > 0 && (
        <>
          <motion.button
            className="intel-findings__expand"
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            Evidence ({finding.evidence.length})
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </motion.button>
          <Collapse open={expanded}>
            <ul className="intel-findings__evidence">
              {finding.evidence.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Collapse>
        </>
      )}
    </div>
  );
}

export default function KeyFindings({ data, state, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const d = data as unknown as KeyFindingsData;

  if (state === "loading") {
    return (
      <div className="intel-findings" data-variant={resolvedVariant} role="status" aria-label="Loading findings">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div className="intel-skeleton-line" style={{ width: "50%", height: 14 }} />
            <div className="intel-skeleton-line" style={{ width: "80%", height: 12, marginTop: 6 }} />
          </div>
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-findings intel-findings--error" data-variant={resolvedVariant} role="alert">
        <span style={{ color: "#d97757", fontSize: 13 }}>Failed to load findings</span>
      </div>
    );
  }

  if (state === "empty" || !d.findings?.length) {
    return (
      <div className="intel-findings intel-findings--empty" data-variant={resolvedVariant} role="status">
        <span className="intel-text-muted" style={{ fontSize: 13 }}>No findings</span>
      </div>
    );
  }

  return (
    <div className="intel-findings" data-variant={resolvedVariant} role="list" aria-label={d.title || "Key Findings"}>
      <div className="gu-pen intel-hand-note">{d.findings.length} key signals</div>
      {d.title && <h3 className="intel-findings__title">{d.title}</h3>}
      {d.findings.map((f, i) => (
        <FindingCard key={i} finding={f} index={i} />
      ))}
    </div>
  );
}
