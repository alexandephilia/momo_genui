"use client";

/**
 * RecommendationPanel — Actionable recommendation (Momo uncontained + 4 variants)
 */

import { useContext, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { Zap, Clock, ArrowRight } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { CheckTick, tweenPaint } from "../shared/StateMotion";

interface RecommendationData {
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  steps?: string[];
  impact?: string;
  effort?: string;
  actionLabel?: string;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "rgba(217 119 87 / 0.16)", text: "#d97757" },
  high: { bg: "rgba(239 140 102 / 0.16)", text: "#ef8c66" },
  medium: { bg: "rgba(201 151 59 / 0.14)", text: "#c9973b" },
  low: { bg: "var(--gu-tint, rgba(128, 128, 140, 0.08))", text: "var(--gu-ink-2, #45454b)" },
};

export default function RecommendationPanel({ data, state, variant, onAction }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const d = data as unknown as RecommendationData;
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const reduce = useReducedMotion();

  const toggleStep = (idx: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (state === "loading") {
    return (
      <div className="intel-recommendation intel-recommendation--skeleton" data-variant={resolvedVariant} role="status" aria-label="Loading recommendation">
        <div className="intel-skeleton-line" style={{ width: "30%", height: 12 }} />
        <div className="intel-skeleton-line" style={{ width: "60%", height: 16, marginTop: 8 }} />
        <div className="intel-skeleton-line" style={{ width: "90%", height: 12, marginTop: 8 }} />
        <div className="intel-skeleton-line" style={{ width: "80%", height: 12, marginTop: 4 }} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-recommendation intel-recommendation--error" data-variant={resolvedVariant} role="alert">
        <span style={{ color: "#d97757", fontSize: 13 }}>Failed to load recommendation</span>
      </div>
    );
  }

  if (state === "empty" || !d.title) {
    return (
      <div className="intel-recommendation intel-recommendation--empty" data-variant={resolvedVariant} role="status">
        <span className="intel-text-muted" style={{ fontSize: 13 }}>No recommendation</span>
      </div>
    );
  }

  const prio = PRIORITY_COLORS[d.priority] || PRIORITY_COLORS.medium;

  return (
    <div
      className="intel-recommendation"
      data-variant={resolvedVariant}
      role="article"
      aria-label={`${d.priority} recommendation: ${d.title}`}
    >
      <div className="intel-recommendation__header">
        <span className="intel-recommendation__priority" style={{ background: prio.bg, color: prio.text }}>
          {d.priority}
        </span>
        {d.impact && (
          <span className="intel-recommendation__tag">
            <Zap size={11} /> {d.impact}
          </span>
        )}
        {d.effort && (
          <span className="intel-recommendation__tag">
            <Clock size={11} /> {d.effort}
          </span>
        )}
      </div>
      <div className="gu-pen intel-hand-note">recommended action</div>
      <h4 className="intel-recommendation__title">{d.title}</h4>
      <p className="intel-recommendation__desc">{d.description}</p>

      {d.steps && d.steps.length > 0 && (
        <div className="intel-recommendation__steps">
          {d.steps.map((step, i) => (
            <motion.button
              key={i}
              className={`intel-recommendation__step ${checkedSteps.has(i) ? "intel-recommendation__step--done" : ""}`}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={(e) => {
                tweenPaint(e.currentTarget.querySelector(".intel-skeuo-check"), reduce);
                toggleStep(i);
              }}
            >
              <span
                className={`intel-skeuo-check ${checkedSteps.has(i) ? "is-checked" : ""}`}
                aria-hidden="true"
              >
                <AnimatePresence initial={false}>
                  {checkedSteps.has(i) && <CheckTick key="tick" />}
                </AnimatePresence>
              </span>
              <span>{step}</span>
            </motion.button>
          ))}
        </div>
      )}

      <motion.button
        className="intel-recommendation__apply"
        whileHover={MH.chip}
        whileTap={MH.tap}
        transition={MH.spring}
        onClick={() => onAction?.({ type: "send", payload: { action: "apply", recommendation: d.title } })}
      >
        {d.actionLabel || "Apply"} <ArrowRight size={14} />
      </motion.button>
    </div>
  );
}
