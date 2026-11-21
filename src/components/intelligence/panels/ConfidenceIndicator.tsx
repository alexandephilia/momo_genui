"use client";

/**
 * ConfidenceIndicator — Visual confidence display (Momo coral palette + 4 variants)
 *
 * Variants:
 * - "default":   Horizontal bar
 * - "editorial": SVG ring
 * - "split":     10-dot coral meter
 * - "minimal":   Compact inline readout
 */

import { useContext } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { INSTANT, METER, MeterFill, STAGGER_ITEM, useStagger } from "../shared/StateMotion";

interface ConfidenceData {
  value: number;
  label?: string;
  variant?: "bar" | "ring";
}

function getConfidenceColor(value: number): string {
  if (value >= 75) return "#ef8c66";
  if (value >= 50) return "#c9973b";
  return "#d97757";
}

function BarVariant({ value, color }: { value: number; color: string }) {
  return (
    <motion.div className="intel-confidence__bar-track" variants={STAGGER_ITEM}>
      <MeterFill
        className="intel-confidence__bar-fill"
        width={`${Math.min(100, Math.max(0, value))}%`}
        style={{ background: color }}
      />
    </motion.div>
  );
}

function RingVariant({ value, color }: { value: number; color: string }) {
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const reduce = useReducedMotion();

  return (
    <motion.div className="intel-confidence__ring" style={{ width: size, height: size }} variants={STAGGER_ITEM}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--gu-line, rgba(128, 128, 140, 0.18))"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={reduce ? INSTANT : METER}
        />
      </svg>
      <span className="intel-confidence__ring-value" style={{ color }}>
        {Math.round(value)}
      </span>
    </motion.div>
  );
}

function DotsVariant({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(10, Math.round(value / 10)));
  return (
    <motion.div className="intel-confidence__dots" aria-hidden="true" variants={STAGGER_ITEM}>
      {Array.from({ length: 10 }, (_, idx) => (
        <span
          key={idx}
          className={`intel-confidence__dot ${idx < filled ? "is-filled" : ""}`}
        />
      ))}
    </motion.div>
  );
}

export default function ConfidenceIndicator({ data, state, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const stagger = useStagger();
  const d = data as unknown as ConfidenceData;
  const resolvedVariant =
    variant ||
    (ctxVariant && ctxVariant !== "default" ? ctxVariant : undefined) ||
    d.variant ||
    "default";

  if (state === "loading") {
    return (
      <div className="intel-confidence intel-confidence--skeleton" data-variant={resolvedVariant} role="status" aria-label="Loading confidence">
        <div className="intel-skeleton-line" style={{ width: "40%", height: 12 }} />
        <div className="intel-skeleton-line" style={{ width: "100%", height: 8, marginTop: 8, borderRadius: 4 }} />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-confidence intel-confidence--error" data-variant={resolvedVariant} role="alert">
        <span style={{ color: "#d97757", fontSize: 13 }}>Error loading confidence</span>
      </div>
    );
  }

  if (state === "empty" || d.value == null) {
    return (
      <div className="intel-confidence intel-confidence--empty" data-variant={resolvedVariant} role="status">
        <span className="intel-text-muted" style={{ fontSize: 13 }}>No confidence data</span>
      </div>
    );
  }

  const color = getConfidenceColor(d.value);
  const isRing = resolvedVariant === "editorial" || resolvedVariant === "ring";
  const isDots = resolvedVariant === "split";
  const isMinimal = resolvedVariant === "minimal";

  return (
    <motion.div
      {...stagger}
      className="intel-confidence"
      data-variant={resolvedVariant}
      role="meter"
      aria-valuenow={d.value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={d.label || "Confidence"}
    >
      <motion.div className="intel-confidence__header" variants={STAGGER_ITEM}>
        {d.label && <span className="intel-confidence__label">{d.label}</span>}
        {!isRing && (
          <span className="intel-confidence__value" style={{ color }}>
            {Math.round(d.value)}%
          </span>
        )}
      </motion.div>
      {isRing ? (
        <RingVariant value={d.value} color={color} />
      ) : isDots ? (
        <DotsVariant value={d.value} />
      ) : isMinimal ? null : (
        <BarVariant value={d.value} color={color} />
      )}
    </motion.div>
  );
}
