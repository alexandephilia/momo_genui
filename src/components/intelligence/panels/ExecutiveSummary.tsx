"use client";

/**
 * ExecutiveSummary — High-level overview (Momo uncontained + 4 variants)
 */

import { useContext, useState } from "react";
import { motion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { Collapse } from "../shared/StateMotion";

interface MiniStat {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "flat";
  note?: string;
}

interface ExecutiveSummaryData {
  title: string;
  takeaways: string[];
  stats?: MiniStat[];
  tone?: "neutral" | "positive" | "warning" | "critical";
  detail?: string;
}

const TONE_CONFIG: Record<string, { color: string; label: string; Icon: typeof Info }> = {
  neutral: { color: "#9d9da6", label: "Neutral", Icon: Info },
  positive: { color: "#ef8c66", label: "Positive", Icon: CheckCircle2 },
  warning: { color: "#c9973b", label: "Warning", Icon: AlertTriangle },
  critical: { color: "#d97757", label: "Critical", Icon: AlertCircle },
};

export default function ExecutiveSummary({ data, state, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const [expanded, setExpanded] = useState(false);
  const d = data as unknown as ExecutiveSummaryData;

  if (state === "loading") {
    return (
      <div className="intel-executive intel-executive--skeleton" data-variant={resolvedVariant} role="status" aria-label="Loading summary">
        <div className="intel-skeleton-line" style={{ width: "50%", height: 16 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="intel-skeleton-line" style={{ width: `${85 - i * 10}%`, height: 12, marginTop: 8 }} />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-executive intel-executive--error" data-variant={resolvedVariant} role="alert">
        <span style={{ color: "#d97757", fontSize: 13 }}>Failed to load summary</span>
      </div>
    );
  }

  if (state === "empty" || !d.title) {
    return (
      <div className="intel-executive intel-executive--empty" data-variant={resolvedVariant} role="status">
        <span className="intel-text-muted" style={{ fontSize: 13 }}>No summary available</span>
      </div>
    );
  }

  const tone = TONE_CONFIG[d.tone || "neutral"] || TONE_CONFIG.neutral;
  const ToneIcon = tone.Icon;

  return (
    <div className="intel-executive" data-variant={resolvedVariant} role="article" aria-label={d.title}>
      <div className="intel-executive__header">
        <div>
          <div className="gu-pen intel-hand-note">key takeaways</div>
          <h3 className="intel-executive__title">{d.title}</h3>
        </div>
        <span className="intel-executive__tone" style={{ color: tone.color, borderColor: "var(--gu-line-2, rgba(128,128,140,0.22))" }}>
          <ToneIcon size={12} /> {tone.label}
        </span>
      </div>

      <ul className="intel-executive__takeaways">
        {(Array.isArray(d.takeaways) ? d.takeaways : []).map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>

      {d.stats && d.stats.length > 0 && (
        <div className="intel-executive__stats">
          {d.stats.map((s, i) => (
            <div key={i} className="intel-executive__stat">
              <span className="intel-executive__stat-value">
                {s.value}
                {s.trend && (
                  <span className={`intel-executive__stat-trend intel-executive__stat-trend--${s.trend}`}>
                    {s.trend === "up" ? <TrendingUp size={10} /> : s.trend === "down" ? <TrendingDown size={10} /> : <Minus size={10} />}
                  </span>
                )}
              </span>
              <span className="intel-executive__stat-label">{s.label}</span>
              {s.note && <span className="intel-executive__stat-note">{s.note}</span>}
            </div>
          ))}
        </div>
      )}

      {d.detail && (
        <>
          <motion.button
            className="intel-executive__expand"
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? "Hide detail" : "Read more"}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </motion.button>
          <Collapse open={expanded}>
            <div className="intel-executive__detail">{d.detail}</div>
          </Collapse>
        </>
      )}
    </div>
  );
}
