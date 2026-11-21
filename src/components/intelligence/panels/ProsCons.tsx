"use client";

/**
 * ProsCons — Two-column pros/cons comparison (Momo uncontained + 4 variants)
 */

import { useContext } from "react";
import { motion } from "motion/react";
import { Plus, Minus } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { STAGGER_ITEM, useStagger } from "../shared/StateMotion";

interface ProsConsData {
  title?: string;
  pros: string[];
  cons: string[];
  verdict?: string;
}

export default function ProsCons({ data, state, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const stagger = useStagger();
  const resolvedVariant = variant || ctxVariant || "default";
  const d = data as unknown as ProsConsData;

  if (state === "loading") {
    return (
      <div className="intel-proscons" data-variant={resolvedVariant} role="status" aria-label="Loading pros and cons">
        <div className="intel-proscons__columns">
          <div className="intel-proscons__col">
            {[0, 1, 2].map((i) => (
              <div key={i} className="intel-skeleton-line" style={{ height: 14, marginBottom: 8, width: `${80 - i * 10}%` }} />
            ))}
          </div>
          <div className="intel-proscons__col">
            {[0, 1, 2].map((i) => (
              <div key={i} className="intel-skeleton-line" style={{ height: 14, marginBottom: 8, width: `${75 - i * 10}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-proscons intel-proscons--error" data-variant={resolvedVariant} role="alert">
        <span style={{ color: "#d97757", fontSize: 13 }}>Failed to load analysis</span>
      </div>
    );
  }

  const pros = Array.isArray(d.pros) ? d.pros : [];
  const cons = Array.isArray(d.cons) ? d.cons : [];

  if (state === "empty" || (pros.length === 0 && cons.length === 0)) {
    return (
      <div className="intel-proscons intel-proscons--empty" data-variant={resolvedVariant} role="status">
        <span className="intel-text-muted" style={{ fontSize: 13 }}>No pros/cons data</span>
      </div>
    );
  }

  return (
    <motion.div {...stagger} className="intel-proscons" data-variant={resolvedVariant} role="list" aria-label={d.title || "Pros and Cons"}>
      <motion.div className="gu-pen intel-hand-note" variants={STAGGER_ITEM}>trade-off analysis</motion.div>
      {d.title && (
        <motion.h3 className="intel-proscons__title" variants={STAGGER_ITEM}>
          {d.title}
        </motion.h3>
      )}
      <div className="intel-proscons__columns">
        <div className="intel-proscons__col intel-proscons__col--pro">
          <motion.div className="intel-proscons__col-header intel-proscons__col-header--pro" variants={STAGGER_ITEM}>
            <Plus size={14} /> Pros
          </motion.div>
          {pros.map((item, i) => (
            <motion.div key={i} className="intel-proscons__item intel-proscons__item--pro" variants={STAGGER_ITEM}>
              <Plus size={12} className="intel-proscons__icon" />
              <span>{item}</span>
            </motion.div>
          ))}
          {pros.length === 0 && (
            <span className="intel-proscons__empty-col">None listed</span>
          )}
        </div>
        <div className="intel-proscons__col intel-proscons__col--con">
          <motion.div className="intel-proscons__col-header intel-proscons__col-header--con" variants={STAGGER_ITEM}>
            <Minus size={14} /> Cons
          </motion.div>
          {cons.map((item, i) => (
            <motion.div key={i} className="intel-proscons__item intel-proscons__item--con" variants={STAGGER_ITEM}>
              <Minus size={12} className="intel-proscons__icon" />
              <span>{item}</span>
            </motion.div>
          ))}
          {cons.length === 0 && (
            <span className="intel-proscons__empty-col">None listed</span>
          )}
        </div>
      </div>
      {d.verdict && (
        <motion.div className="intel-proscons__verdict" variants={STAGGER_ITEM}>
          <div className="gu-pen intel-hand-note">verdict</div>
          <div>{d.verdict}</div>
        </motion.div>
      )}
    </motion.div>
  );
}
