"use client";

/**
 * AlertFeed — Vertical list of alerts grouped by severity.
 *
 * Each alert shows a severity icon + color, title, description, timestamp,
 * and a dismiss button. Alerts are grouped: critical → warning → info → success.
 */

import { useCallback, useContext, useMemo, useState } from "react";
import { motion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
} from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";

/* ═══════════════════ Data shape ═══════════════════ */

type AlertSeverity = "critical" | "warning" | "info" | "success";

interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  description?: string;
  timestamp?: string;
}

interface AlertFeedData {
  alerts: AlertItem[];
}

/* ═══════════════════ Severity config ═══════════════════ */

const SEVERITY_ORDER: AlertSeverity[] = ["critical", "warning", "info", "success"];

const SEVERITY_META: Record<
  AlertSeverity,
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  critical: {
    icon: <ShieldAlert size={14} />,
    color: "#d97757",
    bg: "rgba(217 119 87 / 0.1)",
    label: "Critical",
  },
  warning: {
    icon: <AlertTriangle size={14} />,
    color: "#c9973b",
    bg: "rgba(201 151 59 / 0.1)",
    label: "Warning",
  },
  info: {
    icon: <Info size={14} />,
    color: "var(--gu-ink-3, #6b6b73)",
    bg: "var(--gu-tint, rgba(128, 128, 140, 0.08))",
    label: "Info",
  },
  success: {
    icon: <CheckCircle2 size={14} />,
    color: "#ef8c66",
    bg: "rgba(239 140 102 / 0.1)",
    label: "Success",
  },
};

/* ═══════════════════ Component ═══════════════════ */

export default function AlertFeed({
  data,
  state,
  variant,
  onAction,
}: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const { alerts = [] } = data as unknown as AlertFeedData;
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    onAction?.({ type: "send", payload: { action: "dismiss", alertId: id } });
  }, [onAction]);

  const grouped = useMemo(() => {
    const groups: Record<AlertSeverity, AlertItem[]> = {
      critical: [],
      warning: [],
      info: [],
      success: [],
    };
    // LLM data may omit alert.id — synthesize one so keys/dismiss stay stable
    for (const [i, alert] of alerts.entries()) {
      if (dismissed.has(alert.id)) continue;
      const sev = groups[alert.severity] ? alert.severity : "info";
      groups[sev].push({ ...alert, id: alert.id ?? `alert-${i}` });
    }
    return groups;
  }, [alerts, dismissed]);

  /* ── Loading skeleton ── */
  if (state === "loading") {
    return (
      <div className="intel-alerts intel-alerts--loading" role="status">
        {[1, 2, 3].map((i) => (
          <div key={i} className="intel-alerts__skeleton" />
        ))}
      </div>
    );
  }

  /* ── Error ── */
  if (state === "error") {
    return (
      <div className="intel-alerts intel-alerts--error" role="alert">
        <ShieldAlert size={14} />
        <span>Failed to load alerts</span>
      </div>
    );
  }

  const totalVisible = Object.values(grouped).reduce((s, g) => s + g.length, 0);

  /* ── Empty ── */
  if (state === "empty" || totalVisible === 0) {
    return (
      <div className="intel-alerts intel-alerts--empty">
        <CheckCircle2 size={14} />
        <span>No alerts</span>
      </div>
    );
  }

  return (
    <div className="intel-alerts" data-variant={resolvedVariant} role="log" aria-label="Alert feed">
      {SEVERITY_ORDER.map((sev) => {
        const items = grouped[sev];
        if (!items.length) return null;
        const meta = SEVERITY_META[sev];
        return (
          <div key={sev} className="intel-alerts__group">
            <div className="intel-alerts__group-header" style={{ color: meta.color }}>
              {meta.icon}
              <span>{meta.label} ({items.length})</span>
            </div>

            {items.map((alert) => (
              <motion.div
                key={alert.id}
                className="intel-alerts__item"
                whileHover={MH.row}
                transition={MH.spring}
              >
                <div className="intel-alerts__item-top">
                  <span className="intel-alerts__item-title">{alert.title}</span>
                  <motion.button
                    type="button"
                    className="intel-alerts__dismiss"
                    whileHover={MH.chip}
                    whileTap={MH.tap}
                    transition={MH.spring}
                    onClick={() => handleDismiss(alert.id)}
                    title="Dismiss"
                    aria-label={`Dismiss: ${alert.title}`}
                  >
                    <X size={12} />
                  </motion.button>
                </div>
                {alert.description && (
                  <p className="intel-alerts__item-desc">{alert.description}</p>
                )}
                {alert.timestamp && (
                  <span className="intel-alerts__item-time">{alert.timestamp}</span>
                )}
              </motion.div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
