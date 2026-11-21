"use client";

/**
 * InsightPanel — Typed insight (Momo uncontained + 4 variants, zero colored borders)
 */

import { useContext, useState } from "react";
import { motion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { Lightbulb, Search, AlertTriangle, Eye, ChevronDown, ChevronUp } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { Collapse } from "../shared/StateMotion";

interface InsightPanelData {
  type: "insight" | "finding" | "warning" | "observation";
  title: string;
  body: string;
  confidence?: number;
  detail?: string;
}

const TYPE_CONFIG: Record<string, { color: string; Icon: typeof Lightbulb }> = {
  insight: { color: "#ef8c66", Icon: Lightbulb },
  finding: { color: "#ef8c66", Icon: Search },
  warning: { color: "#c9973b", Icon: AlertTriangle },
  observation: { color: "#9d9da6", Icon: Eye },
};

function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 80 ? "#ef8c66" : value >= 50 ? "#c9973b" : "#d97757";
  return (
    <span className="intel-insight__confidence" style={{ color, borderColor: "var(--gu-line-2, rgba(128,128,140,0.22))" }}>
      {value}% confidence
    </span>
  );
}

export default function InsightPanel({ data, state, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const [expanded, setExpanded] = useState(false);
  const d = data as unknown as InsightPanelData;

  if (state === "loading") {
    return (
      <div className="intel-insight intel-insight--skeleton" data-variant={resolvedVariant} role="status" aria-label="Loading insight">
        <div className="intel-skeleton-line" style={{ width: "40%", height: 14 }} />
        <div className="intel-skeleton-line" style={{ width: "90%", height: 12, marginTop: 8 }} />
        <div className="intel-skeleton-line" style={{ width: "70%", height: 12, marginTop: 4 }} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-insight intel-insight--error" data-variant={resolvedVariant} role="alert">
        <span style={{ color: "#d97757", fontSize: 13 }}>Failed to load insight</span>
      </div>
    );
  }

  if (state === "empty" || !d.title) {
    return (
      <div className="intel-insight intel-insight--empty" data-variant={resolvedVariant} role="status">
        <span className="intel-text-muted" style={{ fontSize: 13 }}>No insight available</span>
      </div>
    );
  }

  const cfg = TYPE_CONFIG[d.type] || TYPE_CONFIG.observation;
  const { Icon } = cfg;

  return (
    <div
      className="intel-insight"
      data-variant={resolvedVariant}
      role="article"
      aria-label={`${d.type}: ${d.title}`}
    >
      {d.type && <div className="gu-pen intel-hand-note">{d.type}</div>}
      <div className="intel-insight__header">
        <Icon size={16} style={{ color: cfg.color, flexShrink: 0 }} />
        <h4 className="intel-insight__title">{d.title}</h4>
        {d.confidence != null && <ConfidenceBadge value={d.confidence} />}
      </div>
      <p className="intel-insight__body">{d.body}</p>
      {d.detail && (
        <>
          <motion.button
            className="intel-insight__expand"
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? "Hide detail" : "Show detail"}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </motion.button>
          <Collapse open={expanded}>
            <div className="intel-insight__detail">{d.detail}</div>
          </Collapse>
        </>
      )}
    </div>
  );
}
