"use client";

/**
 * MetricGroup — Grid of Metric tiles (Momo uncontained + 4 variants)
 */

import { useContext } from "react";
import { motion } from "motion/react";
import type { IntelBaseProps, IntelMetricData } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { STAGGER_ITEM, useStagger } from "../shared/StateMotion";
import { MetricDeltaBadge, MetricTrend, MetricValue, cleanSpark, metricSparkStats } from "./Metric";

interface MetricGroupData {
  title?: string;
  metrics: IntelMetricData[];
}

function GroupHead({ title, count }: { title?: string; count: number }) {
  return (
    <motion.div className="dv-metric-group__head" variants={STAGGER_ITEM}>
      {title ? <h3 className="gu-pen dv-metric-group__title">{title}</h3> : <span />}
      <span className="dv-metric-group__count">{count} metrik</span>
    </motion.div>
  );
}

export default function MetricGroup({ data, state, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const stagger = useStagger();
  const d = data as unknown as MetricGroupData;
  const metrics = Array.isArray(d.metrics) ? d.metrics : [];

  if (state === "loading") {
    return (
      <div className="dv-metric-group dv-metric-group--state" data-variant={resolvedVariant} role="status" aria-label="Loading metrics">
        <div className="dv-metric-group__grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="dv-metric-group__skeleton">
              <div className="intel-skeleton-line" style={{ width: "55%", height: 10 }} />
              <div className="intel-skeleton-line" style={{ width: "70%", height: 20, marginTop: 8 }} />
              <div className="intel-skeleton-block" style={{ height: 40, marginTop: 10 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="dv-metric-group dv-metric-group--state" data-variant={resolvedVariant} role="alert">
        <span className="dv-metric-group__error">Failed to load metrics</span>
      </div>
    );
  }

  if (state === "empty" || metrics.length === 0) {
    return (
      <div className="dv-metric-group dv-metric-group--state" data-variant={resolvedVariant} role="status">
        {d.title && <h3 className="gu-pen dv-metric-group__title">{d.title}</h3>}
        <span className="dv-metric-group__empty">No metrics available</span>
      </div>
    );
  }

  const rows = metrics.map((m, i) => {
    const spark = cleanSpark(m.sparkline);
    const stats = metricSparkStats(spark);
    const hasChart = spark !== null && spark.length > 1;
    return { m, i, spark, stats, hasChart };
  });

  return (
    <motion.div {...stagger} className="dv-metric-group" data-variant={resolvedVariant} role="group" aria-label={d.title || "Metric group"}>
      <GroupHead title={d.title} count={metrics.length} />

      {resolvedVariant === "split" && (
        <div className="dv-metric-group__rows">
          {rows.map(({ m, i, spark, stats, hasChart }) => (
            <motion.div key={`${m.label}-${i}`} className="dv-metric-group__row" variants={STAGGER_ITEM}>
              <div className="dv-metric-group__row-id">
                <span className="dv-metric-group__row-label">{m.label}</span>
                {m.note ? <span className="dv-metric-group__row-note">{m.note}</span> : null}
              </div>
              <div className="dv-metric-group__row-val">
                <span className="dv-metric-group__row-value">
                  <MetricValue m={m} />
                </span>
                <MetricDeltaBadge m={m} stats={stats} />
              </div>
              {hasChart && (
                <MetricTrend
                  values={spark ?? []}
                  interactive={false}
                  marks={false}
                  name={m.label}
                  className="dv-metric-group__row-chart"
                />
              )}
            </motion.div>
          ))}
        </div>
      )}

      {resolvedVariant === "editorial" && (
        <div className="dv-metric-group__cols">
          {rows.map(({ m, i, spark, stats, hasChart }) => (
            <motion.div key={`${m.label}-${i}`} className="dv-metric-group__col" variants={STAGGER_ITEM}>
              <span className="dv-metric-group__col-label">{m.label}</span>
              <span className="dv-metric-group__col-value">
                <MetricValue m={m} />
              </span>
              <MetricDeltaBadge m={m} stats={stats} />
              {hasChart && (
                <MetricTrend
                  values={spark ?? []}
                  interactive={false}
                  marks={false}
                  name={m.label}
                  className="dv-metric-group__col-chart"
                />
              )}
              {m.note ? <span className="dv-metric-group__col-note">{m.note}</span> : null}
            </motion.div>
          ))}
        </div>
      )}

      {resolvedVariant === "minimal" && (
        <div className="dv-metric-group__lines">
          {rows.map(({ m, i, stats }) => (
            <motion.div key={`${m.label}-${i}`} className="dv-metric-group__line" variants={STAGGER_ITEM}>
              <span className="dv-metric-group__line-label">{m.label}</span>
              <span className="dv-metric-group__line-val">
                <span className="dv-metric-group__line-value">
                  <MetricValue m={m} />
                </span>
                <MetricDeltaBadge m={m} stats={stats} />
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {(resolvedVariant === "default" || !["split", "editorial", "minimal"].includes(resolvedVariant)) && (
        <div className="dv-metric-group__grid">
          {rows.map(({ m, i, spark, stats, hasChart }) => (
            <motion.div key={`${m.label}-${i}`} className="dv-metric-group__tile" variants={STAGGER_ITEM}>
              <div className="dv-metric-group__tile-head">
                <span className="dv-metric-group__tile-label">{m.label}</span>
              </div>
              <div className="dv-metric-group__tile-val">
                <span className="dv-metric-group__tile-value">
                  <MetricValue m={m} />
                </span>
                <MetricDeltaBadge m={m} stats={stats} />
              </div>
              <div className="dv-metric-group__tile-foot">
                {hasChart ? (
                  <MetricTrend values={spark ?? []} interactive={false} marks={false} name={m.label} className="dv-metric-group__tile-chart" />
                ) : m.note ? (
                  <span className="dv-metric-group__tile-note">{m.note}</span>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
