"use client";

/**
 * ComparisonMatrix — Criteria vs Options table (Momo uncontained + 4 variants)
 */

import { useContext, useState } from "react";
import { motion } from "motion/react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";

interface MatrixCell {
  value: string;
  rating: "good" | "neutral" | "bad";
}

interface ComparisonMatrixData {
  title?: string;
  options: string[];
  criteria: {
    label: string;
    values: MatrixCell[];
  }[];
  scores?: (string | number)[];
}

const RATING_COLORS: Record<string, { bg: string; text: string }> = {
  good: { bg: "rgba(239 140 102 / 0.12)", text: "#ef8c66" },
  neutral: { bg: "var(--gu-tint, rgba(128, 128, 140, 0.08))", text: "var(--gu-ink-2, #45454b)" },
  bad: { bg: "rgba(217 119 87 / 0.12)", text: "#d97757" },
};

export default function ComparisonMatrix({ data, state, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const d = data as unknown as ComparisonMatrixData;

  const [pickedCol, setPickedCol] = useState<number | null>(null);

  if (state === "loading") {
    return (
      <div className="intel-comparison" data-variant={resolvedVariant} role="status" aria-label="Loading comparison">
        <div className="intel-datatable__skeleton">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="intel-skeleton-line" style={{ height: 18, marginBottom: 8, width: `${90 - i * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-comparison intel-comparison--error" data-variant={resolvedVariant} role="alert">
        <span style={{ color: "#d97757", fontSize: 13 }}>Failed to load comparison</span>
      </div>
    );
  }

  if (state === "empty" || !d.options?.length || !d.criteria?.length) {
    return (
      <div className="intel-comparison intel-comparison--empty" data-variant={resolvedVariant} role="status">
        <span className="intel-text-muted" style={{ fontSize: 13 }}>No comparison data</span>
      </div>
    );
  }

  const numericScores = d.options.map((_, oi) => {
    const rawScore = d.scores?.[oi];
    if (typeof rawScore === "number") return rawScore;
    if (typeof rawScore === "string") {
      const m = parseFloat(rawScore);
      if (Number.isFinite(m)) return m;
    }
    return d.criteria.reduce((sum, cr) => {
      const r = cr.values?.[oi]?.rating;
      return sum + (r === "good" ? 10 : r === "neutral" ? 6 : 2);
    }, 0) / Math.max(1, d.criteria.length);
  });
  const maxScore = Math.max(1, ...numericScores);
  const topCol = numericScores.indexOf(Math.max(...numericScores));

  if (resolvedVariant === "split") {
    return (
      <div className="intel-comparison" data-variant="split" role="region" aria-label={d.title || "Comparison matrix"}>
        {d.title && <h3 className="intel-comparison__title">{d.title}</h3>}
        <div className="intel-compare-grid">
          {d.options.map((opt, oi) => {
            const isSel = pickedCol === oi;
            const scoreLabel = d.scores?.[oi] ?? numericScores[oi].toFixed(1);
            return (
              <motion.div
                key={opt}
                className={`intel-compare-card ${isSel ? "is-selected" : ""}`}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                onClick={() => setPickedCol(isSel ? null : oi)}
                style={{ cursor: "pointer" }}
              >
                <div className="intel-subcard__row" style={{ marginBottom: 10 }}>
                  <strong>{opt}</strong>
                  <span className={`intel-badge ${oi === topCol ? "intel-badge--green" : "intel-badge--neutral"}`}>
                    {scoreLabel}
                  </span>
                </div>
                <div className="intel-compare-pills">
                  {d.criteria.map((cr, ri) => {
                    const cell = cr.values?.[oi];
                    const tone =
                      cell?.rating === "good"
                        ? "green"
                        : cell?.rating === "bad"
                          ? "red"
                          : "neutral";
                    return (
                      <div key={ri} className="intel-compare-pill-row">
                        <span className="intel-muted-mono">{cr.label}</span>
                        <span className={`intel-badge intel-badge--${tone}`}>
                          {cell?.value || "\u2014"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  if (resolvedVariant === "minimal") {
    return (
      <div className="intel-comparison" data-variant="minimal" role="region" aria-label={d.title || "Comparison summary"}>
        {d.title && <h3 className="intel-comparison__title">{d.title}</h3>}
        <div className="intel-mebius-list is-compact">
          {d.options.map((opt, oi) => {
            const pct = Math.max(10, Math.round((numericScores[oi] / maxScore) * 100));
            const scoreLabel = d.scores?.[oi] ?? numericScores[oi].toFixed(1);
            return (
              <motion.button
                key={opt}
                type="button"
                className={`intel-mebius-row is-compact ${pickedCol === oi ? "is-selected" : ""}`}
                whileTap={{ scale: 0.99 }}
                onClick={() => setPickedCol(pickedCol === oi ? null : oi)}
              >
                <div className="intel-mebius-row__label">
                  <span
                    className="intel-mebius-dot"
                    style={{ background: oi === topCol ? "#ef8c66" : "#8e909b" }}
                  />
                  <strong>{opt}</strong>
                </div>
                <div className="intel-mebius-track" aria-hidden="true">
                  <motion.div
                    className="intel-mebius-fill"
                    style={{ background: oi === topCol ? "#ef8c66" : "#6e717a" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 280, damping: 26 }}
                  />
                </div>
                <span className="intel-mebius-val">{scoreLabel}</span>
              </motion.button>
            );
          })}
        </div>
        <div className="intel-callout-box" style={{ marginTop: 8 }}>
          Top ranked: <strong>{d.options[topCol]}</strong> ({d.scores?.[topCol] ?? numericScores[topCol].toFixed(1)})
        </div>
      </div>
    );
  }

  return (
    <div className="intel-comparison" data-variant={resolvedVariant} role="table" aria-label={d.title || "Comparison matrix"}>
      {d.title && <h3 className="intel-comparison__title">{d.title}</h3>}
      <div className="intel-datatable__scroll">
        <table className="intel-datatable__table">
          <thead>
            <tr>
              <th className="intel-datatable__th" style={{ minWidth: 120 }}>Criteria</th>
              {d.options.map((opt) => (
                <th key={opt} className="intel-datatable__th" style={{ textAlign: "center" }}>{opt}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.criteria.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 1 ? "intel-datatable__row--alt" : ""}>
                <td className="intel-datatable__td intel-comparison__criteria">{row.label}</td>
                {(Array.isArray(row.values) ? row.values : []).map((cell, ci) => {
                  const color = RATING_COLORS[cell.rating] || RATING_COLORS.neutral;
                  return (
                    <td
                      key={ci}
                      className="intel-datatable__td"
                      style={{
                        textAlign: "center",
                        background: color.bg,
                        color: color.text,
                        fontWeight: 500,
                      }}
                    >
                      {cell.value}
                    </td>
                  );
                })}
              </tr>
            ))}
            {d.scores && (
              <tr className="intel-comparison__score-row">
                <td className="intel-datatable__td intel-comparison__criteria" style={{ fontWeight: 600 }}>
                  Score
                </td>
                {d.scores.map((score, si) => (
                  <td key={si} className="intel-datatable__td" style={{ textAlign: "center", fontWeight: 700, color: "var(--gu-ink, #141416)" }}>
                    {score}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
