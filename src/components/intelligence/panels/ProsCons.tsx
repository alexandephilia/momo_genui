"use client";

/**
 * ProsCons — Two-column pros/cons comparison (Momo uncontained + 4 variants)
 */

import { useContext } from "react";
import { motion } from "motion/react";
import { Plus, Minus, Scale, Gavel } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelCardShell, IntelVariantContext, s } from "../shared/IntelCardShell";
import { METER, STAGGER_ITEM, useStagger } from "../shared/StateMotion";

interface ProsConsData {
  title?: string;
  subtitle?: string;
  pros: string[];
  cons: string[];
  verdict?: string;
}

export default function ProsCons({ data, state, streaming, sources, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const stagger = useStagger();
  const resolvedVariant = variant || ctxVariant || "default";
  const d = data as unknown as ProsConsData;

  const pros = Array.isArray(d.pros) ? d.pros : [];
  const cons = Array.isArray(d.cons) ? d.cons : [];
  const total = pros.length + cons.length;

  return (
    <IntelCardShell
      title={s(d.title, "Pros & Cons")}
      subtitle={s(d.subtitle) || "trade-off analysis"}
      badge={`${pros.length} vs ${cons.length}`}
      badgeTone="purple"
      icon={<Scale size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={pros.length === 0 && cons.length === 0}
      emptyMessage="No pros/cons data"
      spineExtra={
        total > 0 ? (
          <div className="intel-ws__meta">
            <span className="intel-ws__meta-label">Balance</span>
            <div
              className="intel-proscons__balance"
              role="img"
              aria-label={`${pros.length} pros versus ${cons.length} cons`}
            >
              <motion.span
                className="intel-proscons__balance-pro"
                initial={{ width: 0 }}
                animate={{ width: `${(pros.length / total) * 100}%` }}
                transition={METER}
              />
            </div>
            <div className="intel-ws__meta-row">
              <span>Pros</span>
              <strong>{pros.length}</strong>
            </div>
            <div className="intel-ws__meta-row">
              <span>Cons</span>
              <strong>{cons.length}</strong>
            </div>
          </div>
        ) : undefined
      }
    >
      <motion.div {...stagger} className="intel-proscons" data-variant={resolvedVariant} role="list" aria-label={d.title || "Pros and Cons"}>
        <div className="intel-proscons__columns">
          <div className="intel-proscons__col intel-proscons__col--pro">
            <motion.div className="intel-proscons__col-header intel-proscons__col-header--pro" variants={STAGGER_ITEM}>
              <Plus size={13} /> Pros
              <span className="intel-proscons__count">{pros.length}</span>
            </motion.div>
            <ul className="intel-proscons__items">
              {pros.map((item, i) => (
                <motion.li key={i} className="intel-proscons__item intel-proscons__item--pro" variants={STAGGER_ITEM}>
                  <Plus size={12} className="intel-proscons__icon" />
                  <span>{item}</span>
                </motion.li>
              ))}
              {pros.length === 0 && (
                <li className="intel-proscons__empty-col">None listed</li>
              )}
            </ul>
          </div>
          <div className="intel-proscons__col intel-proscons__col--con">
            <motion.div className="intel-proscons__col-header intel-proscons__col-header--con" variants={STAGGER_ITEM}>
              <Minus size={13} /> Cons
              <span className="intel-proscons__count">{cons.length}</span>
            </motion.div>
            <ul className="intel-proscons__items">
              {cons.map((item, i) => (
                <motion.li key={i} className="intel-proscons__item intel-proscons__item--con" variants={STAGGER_ITEM}>
                  <Minus size={12} className="intel-proscons__icon" />
                  <span>{item}</span>
                </motion.li>
              ))}
              {cons.length === 0 && (
                <li className="intel-proscons__empty-col">None listed</li>
              )}
            </ul>
          </div>
        </div>
        {d.verdict && (
          <motion.div className="intel-proscons__verdict" variants={STAGGER_ITEM}>
            <span className="intel-proscons__verdict-label">
              <Gavel size={12} /> Verdict
            </span>
            <p className="intel-proscons__verdict-text">{d.verdict}</p>
          </motion.div>
        )}
      </motion.div>
    </IntelCardShell>
  );
}
