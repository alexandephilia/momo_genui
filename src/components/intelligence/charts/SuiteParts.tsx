"use client";

/** Part-to-whole and flow catalog charts: pie, treemap, funnel, sankey. */

import { useContext, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { hierarchy, treemap as d3treemap } from "d3";
import { ArrowDown, ChartPie, Filter, LayoutGrid, MousePointerClick, TrendingDown, Waypoints } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { CHART_COLORS, getColor } from "./shared";
import { IntelChartVariantDeck } from "./ChartVariantDeck";
import { RingPlot } from "./RingPlot";
import { IntelCardShell, IntelVariantContext, s, n, a } from "../shared/IntelCardShell";
import {
  Legend,
  Num,
  Tip,
  clipLabel,
  fmtPct,
  fmtUnit,
  markProps,
  markUnit,
  useDvMotion,
  useMeasure,
  useSeriesFocus,
  withUniqueKeys,
  type TipState,
} from "./kit";

/* 3. PieChart — solid wedges, share inside, leader labels outside, pinned slice pulls out */
export function IntelPieChart({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const unit = s(data.unit);
  const [pinned, setPinned] = useState<string | null>(null);
  const slices = useMemo(
    () =>
      withUniqueKeys(a<Record<string, unknown>>(data.slices).map((sl, i) => ({
        key: `${s(sl.label ?? sl.name, `Slice ${i + 1}`)}`,
        label: s(sl.label ?? sl.name, `Slice ${i + 1}`),
        value: Math.max(0, n(sl.value)),
        color: s(sl.color) || getColor(i),
      }))),
    [data.slices],
  );
  const keys = useMemo(() => slices.map((sl) => sl.key), [slices]);
  const focus = useSeriesFocus(keys);
  const visible = slices.filter((sl) => !focus.hidden.has(sl.key));
  const total = visible.reduce((sum, sl) => sum + sl.value, 0);
  const largest = visible.reduce<(typeof visible)[number] | null>((best, sl) => (!best || sl.value > best.value ? sl : best), null);
  const smallest = visible.reduce<(typeof visible)[number] | null>((best, sl) => (!best || sl.value < best.value ? sl : best), null);
  const shareOf = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <IntelCardShell
      title={s(data.title, "Proportional Breakdown")}
      badge={unit || undefined}
      icon={<ChartPie size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={slices.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        headline={
          largest && smallest
            ? `${largest.label} is the biggest slice at ${fmtPct(shareOf(largest.value))}; ${smallest.label} is the smallest at ${fmtPct(shareOf(smallest.value))}.`
            : undefined
        }
        stats={[
          { label: "Total", value: <Num value={total} unit={unit} /> },
          { label: "Largest", value: largest ? `${largest.label} · ${fmtPct(shareOf(largest.value))}` : "–", tone: "accent" },
          { label: "Slices", value: `${visible.length} of ${slices.length}` },
        ]}
        legend={(layout) => (
          <Legend
            items={slices.map((sl) => ({
              key: sl.key,
              label: sl.label,
              color: sl.color,
              value: fmtUnit(sl.value, unit),
              share: focus.hidden.has(sl.key) ? undefined : shareOf(sl.value),
            }))}
            layout={layout}
            label="Slices"
            hidden={focus.hidden}
            hoverKey={focus.hoverKey}
            onHover={focus.setHoverKey}
            onToggle={focus.toggle}
          />
        )}
      >
        <RingPlot
          kind="pie"
          label={s(data.title, "Pie chart")}
          slices={visible}
          height={variant === "minimal" ? 170 : 250}
          unit={unit}
          hoverKey={focus.hoverKey}
          onHover={focus.setHoverKey}
          selectedKey={pinned}
          onSelect={(key) => setPinned((prev) => (prev === key ? null : key))}
        />
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

/* 7. Treemap — area = value, name + value + share in each cell, intensity scale legend */
export function IntelTreemap({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const unit = s(data.unit);
  const height = variant === "minimal" ? 170 : 280;

  const items = useMemo(
    () =>
      withUniqueKeys(a<Record<string, unknown>>(data.items)
        .map((it, i) => ({
          key: `${s(it.name ?? it.label, `Item ${i + 1}`)}`,
          name: s(it.name ?? it.label, `Item ${i + 1}`),
          value: Math.max(0, n(it.size ?? it.value)),
        })))
        .sort((x, y) => y.value - x.value),
    [data.items],
  );
  const total = items.reduce((sum, it) => sum + it.value, 0);
  const max = items[0]?.value ?? 0;
  const min = items[items.length - 1]?.value ?? 0;

  const cells = useMemo(() => {
    if (width <= 0 || items.length === 0) return [];
    const root = hierarchy<{ children?: typeof items; value?: number; key?: string }>({ children: items }).sum(
      (d) => d.value ?? 0,
    );
    const laid = d3treemap<{ children?: typeof items; value?: number; key?: string }>()
      .size([width, height])
      .paddingInner(3)
      .round(true)(root);
    return laid.leaves().map((leaf) => ({ key: leaf.data.key as string, x: leaf.x0, y: leaf.y0, w: leaf.x1 - leaf.x0, h: leaf.y1 - leaf.y0 }));
  }, [items, width, height]);
  const cellOf = new Map(cells.map((c) => [c.key, c]));
  const focusKey = hover ?? pinned;
  const shownIndex = items.findIndex((it) => it.key === focusKey);
  const shown = items[shownIndex] ?? items[0];
  const tone = (v: number) => (max > min ? (v - min) / (max - min) : 1);

  return (
    <IntelCardShell
      title={s(data.title, "Treemap Proportions")}
      badge={unit || undefined}
      icon={<LayoutGrid size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={items.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        headline={
          items[0]
            ? `${items[0].name} takes ${fmtPct(total > 0 ? (items[0].value / total) * 100 : 0)} of ${fmtUnit(total, unit)}; the top ${Math.min(2, items.length)} cover ${fmtPct(total > 0 ? (items.slice(0, 2).reduce((x, it) => x + it.value, 0) / total) * 100 : 0)}.`
            : undefined
        }
        stats={[
          { label: "Total", value: <Num value={total} unit={unit} /> },
          { label: "Largest", value: items[0]?.name ?? "–", tone: "accent" },
          { label: "Smallest", value: items[items.length - 1]?.name ?? "–" },
        ]}
        legend={(layout) =>
          layout === "list" || layout === "table" ? (
            <Legend
              layout={layout}
              label="Items"
              hoverKey={focusKey}
              onHover={setHover}
              onToggle={(key) => setPinned((prev) => (prev === key ? null : key))}
              items={items.map((it) => ({
                key: it.key,
                label: it.name,
                color: `color-mix(in srgb, ${CHART_COLORS[0]} ${Math.round(28 + tone(it.value) * 72)}%, transparent)`,
                value: fmtUnit(it.value, unit),
                share: total > 0 ? (it.value / total) * 100 : 0,
              }))}
            />
          ) : (
            <div className="dv-scale" role="img" aria-label={`Colour scale from ${fmtUnit(min, unit)} to ${fmtUnit(max, unit)}`}>
              <span>{fmtUnit(min, unit)}</span>
              <i className="dv-scale__ramp" />
              <span>{fmtUnit(max, unit)}</span>
              {layout === "chips" && <em>area and colour = size</em>}
            </div>
          )
        }
      >
        <div ref={ref} className="dv-plot dv-treemap" style={{ height }} role="group" aria-label={s(data.title, "Treemap")}>
          {items.map((it, i) => {
            const c = cellOf.get(it.key);
            if (!c) return null;
            const share = total > 0 ? (it.value / total) * 100 : 0;
            const t = tone(it.value);
            const dim = focusKey !== null && focusKey !== it.key;
            return (
              <motion.button
                key={it.key}
                type="button"
                className="dv-treemap__cell"
                data-strong={t >= 0.7 || undefined}
                data-size={c.w < 46 || c.h < 46 ? "xs" : c.w < 86 || c.h < 72 ? "sm" : "md"}
                aria-pressed={pinned === it.key}
                aria-label={`${it.name}: ${fmtUnit(it.value, unit)}, ${fmtPct(share)}`}
                initial={m.reduce ? false : { x: c.x + c.w / 2, y: c.y + c.h / 2, width: 0, height: 0, opacity: 0 }}
                animate={{ x: c.x, y: c.y, width: c.w, height: c.h, opacity: dim ? 0.45 : 1 }}
                transition={{ ...m.stagger(i, 0.06), opacity: m.fade }}
                whileTap={m.tap}
                onPointerEnter={() => setHover(it.key)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(it.key)}
                onBlur={() => setHover(null)}
                onClick={() => setPinned((prev) => (prev === it.key ? null : it.key))}
              >
                <motion.span
                  className="dv-treemap__tint"
                  initial={false}
                  animate={{ opacity: 0.22 + t * 0.78 }}
                  transition={m.spring}
                />
                <span className="dv-treemap__name">{it.name}</span>
                <span className="dv-treemap__value">{fmtUnit(it.value, markUnit(unit))}</span>
                <span className="dv-treemap__share">{fmtPct(share)}</span>
              </motion.button>
            );
          })}
        </div>
        {(variant === "default" || variant === "editorial") && shown && (
          <div className="dv-detail" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={shown.key}
                className="dv-detail__row"
                initial={m.reduce ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={m.fade}
              >
                <MousePointerClick className="dv-glyph" size={14} strokeWidth={2.2} aria-hidden="true" />
                <strong>{shown.name}</strong>
                <span>{fmtUnit(shown.value, unit)}</span>
                <span>{fmtPct(total > 0 ? (shown.value / total) * 100 : 0)} of total</span>
                <span>
                  #{(shownIndex >= 0 ? shownIndex : 0) + 1} of {items.length}
                </span>
                {focusKey === null && <em>Hover or click a cell</em>}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

/* 11. FunnelChart — narrowing blocks with stage-to-stage conversion in the joints */
export function FunnelChart({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const unit = s(data.unit);
  const compact = variant === "minimal";

  const stages = withUniqueKeys(a<Record<string, unknown>>(data.stages).map((st, i) => ({
    key: `${s(st.label, `Stage ${i + 1}`)}`,
    label: s(st.label, `Stage ${i + 1}`),
    value: Math.max(0, n(st.value)),
  })));
  const top = Math.max(1, ...stages.map((st) => st.value));
  const first = stages[0];
  const last = stages[stages.length - 1];
  const steps = stages.slice(1).map((st, i) => ({
    from: stages[i],
    to: st,
    rate: stages[i].value > 0 ? (st.value / stages[i].value) * 100 : 0,
    lost: stages[i].value - st.value,
  }));
  const worst = steps.reduce<(typeof steps)[number] | null>((w, st) => (!w || st.rate < w.rate ? st : w), null);
  const overall = first && first.value > 0 && last ? (last.value / first.value) * 100 : 0;

  const blockH = compact ? 22 : 34;
  const labelW = width >= 460 && !compact ? 150 : 0;
  // Without the label column, stage names sit above their block, so joints need the extra line.
  const stacked = labelW === 0 && !compact;
  const jointH = compact ? 16 : stacked ? 44 : 28;
  const sideW = width >= 360 ? 104 : 0;
  const funnelW = Math.max(60, width - labelW - sideW - 12);
  const cx = labelW + funnelW / 2;
  const wOf = (v: number) => Math.max(26, (v / top) * funnelW);
  const topPad = stacked ? 18 : 2;
  const height = topPad + stages.length * blockH + Math.max(0, stages.length - 1) * jointH + 2;
  const yOf = (i: number) => topPad + i * (blockH + jointH);
  const rateY = (y0: number) => y0 + (stacked ? 13 : jointH / 2);

  return (
    <IntelCardShell
      title={s(data.title, "Conversion Funnel")}
      badge={stages.length > 1 ? `${fmtPct(overall)} overall` : undefined}
      icon={<Filter size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={stages.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        legend={null}
        headline={
          first && last && stages.length > 1
            ? `${fmtPct(overall)} of ${first.label} reach ${last.label}${worst ? `; the steepest loss is ${worst.from.label} to ${worst.to.label}, keeping ${fmtPct(worst.rate)}` : ""}.`
            : undefined
        }
        stats={[
          { label: "Entered", value: <Num value={first?.value ?? 0} unit={unit} /> },
          { label: "Completed", value: fmtUnit(last?.value ?? 0, unit) },
          { label: "Overall conversion", value: fmtPct(overall), tone: "accent" },
        ]}
      >
        <div ref={ref} className="dv-plot" style={{ height }}>
          {width > 0 && (
            <svg width={width} height={height} role="group" aria-label={s(data.title, "Conversion funnel")}>
              {steps.map((st, i) => {
                const y0 = yOf(i) + blockH;
                const y1 = yOf(i + 1);
                const w0 = wOf(st.from.value);
                const w1 = wOf(st.to.value);
                const d = `M${cx - w0 / 2} ${y0}L${cx + w0 / 2} ${y0}L${cx + w1 / 2} ${y1}L${cx - w1 / 2} ${y1}Z`;
                const isWorst = worst === st && steps.length > 1;
                return (
                  <g key={`joint|${st.to.key}`} aria-hidden="true">
                    <motion.path
                      className="dv-funnel__joint"
                      initial={m.reduce ? { d } : { d, opacity: 0 }}
                      animate={{ d, opacity: hover !== null && hover !== i && hover !== i + 1 ? 0.35 : 1 }}
                      transition={{ d: m.spring, opacity: m.stagger(i + 1, 0.12) }}
                    />
                    <motion.g
                      className="dv-funnel__rate"
                      data-worst={isWorst || undefined}
                      initial={m.reduce ? false : { x: cx, y: rateY(y0) - 6, opacity: 0 }}
                      animate={{ x: cx, y: rateY(y0), opacity: 1 }}
                      transition={m.stagger(i + 2, 0.12)}
                    >
                      {isWorst ? (
                        <TrendingDown x={-34} y={-7} size={13} strokeWidth={2.4} />
                      ) : (
                        <ArrowDown x={-32} y={-6.5} size={12} strokeWidth={2.4} />
                      )}
                      <text className="dv-val" data-strong="true" x={-16} y={4}>
                        {fmtPct(st.rate)}
                      </text>
                    </motion.g>
                  </g>
                );
              })}

              {stages.map((st, i) => {
                const w = wOf(st.value);
                const y = yOf(i);
                const ofTop = first && first.value > 0 ? (st.value / first.value) * 100 : 0;
                const dim = hover !== null && hover !== i;
                const inside = w >= 76;
                return (
                  <g key={st.key}>
                    <motion.rect
                      className="dv-mark"
                      rx={5}
                      y={y}
                      height={blockH}
                      fill={CHART_COLORS[0]}
                      initial={m.reduce ? false : { attrX: cx, width: 0, opacity: 0 }}
                      animate={{ attrX: cx - w / 2, width: w, opacity: (dim ? 0.4 : 1) * (1 - (i / Math.max(1, stages.length)) * 0.32) }}
                      transition={{ ...m.stagger(i, 0.12), opacity: m.fade }}
                      {...markProps(
                        `${st.label}: ${fmtUnit(st.value, unit)}, ${fmtPct(ofTop)} of ${first?.label ?? "start"}${i > 0 ? `, ${fmtPct(steps[i - 1].rate)} of previous stage` : ""}`,
                        { enter: () => setHover(i), leave: () => setHover(null) },
                      )}
                    />
                    <motion.text
                      className={`dv-val${inside ? " dv-on-mark" : ""}`}
                      data-strong="true"
                      textAnchor={inside ? "middle" : "start"}
                      initial={m.reduce ? false : { x: cx, y: y + blockH / 2 + 4, opacity: 0 }}
                      animate={{ x: inside ? cx : cx + w / 2 + 8, y: y + blockH / 2 + 4, opacity: dim ? 0.4 : 1 }}
                      transition={{ ...m.stagger(i + 1, 0.12), opacity: m.fade }}
                    >
                      <Num as="tspan" value={st.value} unit={markUnit(unit)} />
                    </motion.text>
                    {labelW > 0 ? (
                      <text className="dv-funnel__label" data-strong={hover === i || undefined} x={0} y={y + blockH / 2 + 4}>
                        <tspan className="dv-rank">{String(i + 1).padStart(2, "0")} </tspan>
                        {clipLabel(st.label, 20)}
                      </text>
                    ) : (
                      !compact && (
                        <text className="dv-tick" data-strong="true" x={cx} y={y - 6} textAnchor="middle">
                          {clipLabel(st.label, 26)}
                        </text>
                      )
                    )}
                    {sideW > 0 && (
                      <text className="dv-funnel__side" x={width} y={y + blockH / 2 + 4} textAnchor="end">
                        <tspan className="dv-funnel__of">{fmtPct(ofTop)}</tspan>
                        {i > 0 && !compact && <tspan className="dv-funnel__lost"> −{fmtUnit(steps[i - 1].lost)}</tspan>}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>
        {!compact && sideW > 0 && (
          <p className="dv-footnote">
            Joint figures are stage-to-stage conversion. Right column: share of {first?.label ?? "first stage"} and count lost at that step.
          </p>
        )}
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

/* 12. SankeyDiagram — source and target columns joined by weighted ribbons */
export function SankeyDiagram({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const clipId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hoverLink, setHoverLink] = useState<number | null>(null);
  const [hoverSource, setHoverSource] = useState<string | null>(null);
  const unit = s(data.unit);
  const compact = variant === "minimal";

  const nodes = a<Record<string, unknown>>(data.nodes);
  const links = a<Record<string, unknown>>(data.links)
    .map((lk) => ({ source: s(lk.source), target: s(lk.target), value: Math.max(0, n(lk.value)) }))
    .filter((lk) => lk.source && lk.target);
  const totalFlow = links.reduce((acc, l) => acc + l.value, 0);
  const sourceNames = Array.from(new Set(links.map((l) => l.source)));
  const targetNames = Array.from(new Set(links.map((l) => l.target)));
  const sumFor = (side: "source" | "target", name: string) =>
    links.filter((l) => l[side] === name).reduce((acc, l) => acc + l.value, 0);
  const colorOf = (name: string) => getColor(Math.max(0, sourceNames.indexOf(name)));

  const height = compact ? 170 : Math.max(240, Math.max(sourceNames.length, targetNames.length) * 62);
  const side = width >= 520 ? 132 : width >= 380 ? 92 : 0;
  const nodeW = 9;
  const pad = 16;
  const x0 = side;
  const x1 = Math.max(x0 + 60, width - side - nodeW);
  const scaleFor = (count: number) => (totalFlow > 0 ? (height - 8 - pad * Math.max(0, count - 1)) / totalFlow : 0);
  const k = Math.min(scaleFor(sourceNames.length), scaleFor(targetNames.length));

  const layoutColumn = (names: string[], col: "source" | "target") => {
    const used = names.reduce((acc, name) => acc + sumFor(col, name) * k, 0) + pad * Math.max(0, names.length - 1);
    let y = (height - used) / 2;
    return names.map((name) => {
      const h = sumFor(col, name) * k;
      const box = { name, y, h, cursor: y };
      y += h + pad;
      return box;
    });
  };
  const left = layoutColumn(sourceNames, "source");
  const right = layoutColumn(targetNames, "target");
  const ribbons = links.map((lk, i) => {
    const a0 = left.find((b) => b.name === lk.source);
    const b0 = right.find((b) => b.name === lk.target);
    if (!a0 || !b0) return null;
    const t = lk.value * k;
    const sy = a0.cursor;
    const ty = b0.cursor;
    a0.cursor += t;
    b0.cursor += t;
    const xa = x0 + nodeW;
    const xm = (xa + x1) / 2;
    return {
      i,
      lk,
      t,
      sy,
      mid: (sy + ty + t) / 2,
      d: `M${xa} ${sy}C${xm} ${sy} ${xm} ${ty} ${x1} ${ty}L${x1} ${ty + t}C${xm} ${ty + t} ${xm} ${sy + t} ${xa} ${sy + t}Z`,
    };
  });
  const biggest = links.reduce<(typeof links)[number] | null>((best, l) => (!best || l.value > best.value ? l : best), null);
  const active = hoverLink !== null ? links[hoverLink] : null;
  const lit = (lk: (typeof links)[number], i: number) =>
    hoverLink !== null ? hoverLink === i : hoverSource !== null ? lk.source === hoverSource : null;

  let tip: TipState | null = null;
  const activeRibbon = hoverLink !== null ? ribbons[hoverLink] : null;
  if (active && activeRibbon) {
    tip = {
      x: (x0 + x1) / 2,
      y: activeRibbon.mid - activeRibbon.t / 2 - 8,
      title: `${active.source} → ${active.target}`,
      rows: [
        { label: "Flow", value: fmtUnit(active.value, unit) },
        { label: "Share of total", value: fmtPct(totalFlow > 0 ? (active.value / totalFlow) * 100 : 0) },
      ],
    };
  }

  return (
    <IntelCardShell
      title={s(data.title, "Flow & Sankey Distribution")}
      badge={`${links.length} flows • ${totalFlow.toLocaleString()} total`}
      icon={<Waypoints size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={nodes.length === 0 || links.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        headline={
          biggest
            ? `The heaviest flow runs ${biggest.source} to ${biggest.target}: ${fmtUnit(biggest.value, unit)}, ${fmtPct(totalFlow > 0 ? (biggest.value / totalFlow) * 100 : 0)} of all volume.`
            : undefined
        }
        stats={[
          { label: "Total flow", value: <Num value={totalFlow} unit={unit} /> },
          { label: "Largest flow", value: biggest ? fmtUnit(biggest.value, unit) : "–", tone: "accent" },
          { label: "Sources → targets", value: `${sourceNames.length} → ${targetNames.length}` },
        ]}
        legend={(layout) => (
          <Legend
            layout={layout}
            label="Sources"
            hoverKey={hoverSource}
            onHover={setHoverSource}
            items={sourceNames.map((name) => ({
              key: name,
              label: name,
              color: colorOf(name),
              value: fmtUnit(sumFor("source", name), unit),
              share: totalFlow > 0 ? (sumFor("source", name) / totalFlow) * 100 : 0,
            }))}
          />
        )}
      >
        <div ref={ref} className="dv-plot" style={{ height }}>
          {width > 0 && (
            <svg width={width} height={height} role="group" aria-label={s(data.title, "Sankey diagram")}>
              <defs>
                <clipPath id={clipId}>
                  <motion.rect
                    x={x0}
                    y={0}
                    height={height}
                    initial={m.reduce ? false : { width: 0 }}
                    animate={{ width: Math.max(0, x1 - x0 + nodeW) }}
                    transition={m.draw()}
                  />
                </clipPath>
              </defs>
              <g clipPath={`url(#${clipId})`}>
                {ribbons.map((rb) =>
                  rb ? (
                    <motion.path
                      key={`${rb.lk.source}→${rb.lk.target}`}
                      className="dv-mark dv-ribbon"
                      fill={colorOf(rb.lk.source)}
                      initial={{ d: rb.d, fillOpacity: 0.34 }}
                      animate={{ d: rb.d, fillOpacity: lit(rb.lk, rb.i) === null ? 0.34 : lit(rb.lk, rb.i) ? 0.72 : 0.1 }}
                      transition={{ d: m.spring, fillOpacity: m.fade }}
                      {...markProps(
                        `${rb.lk.source} to ${rb.lk.target}: ${fmtUnit(rb.lk.value, unit)}, ${fmtPct(totalFlow > 0 ? (rb.lk.value / totalFlow) * 100 : 0)} of total`,
                        { enter: () => setHoverLink(rb.i), leave: () => setHoverLink(null) },
                      )}
                    />
                  ) : null,
                )}
              </g>
              {ribbons.map((rb) =>
                rb && rb.t >= 15 && x1 - x0 > 150 ? (
                  <motion.text
                    key={`val|${rb.lk.source}→${rb.lk.target}`}
                    className="dv-val"
                    data-strong="true"
                    initial={m.reduce ? false : { x: x0 + nodeW + 4, y: rb.sy + rb.t / 2 + 4, opacity: 0 }}
                    animate={{ x: x0 + nodeW + 10, y: rb.sy + rb.t / 2 + 4, opacity: lit(rb.lk, rb.i) === false ? 0.3 : 1 }}
                    transition={{ ...m.spring, opacity: m.draw(2) }}
                  >
                    {fmtUnit(rb.lk.value, markUnit(unit))}
                  </motion.text>
                ) : null,
              )}
              {[
                { boxes: left, x: x0, col: "source" as const },
                { boxes: right, x: x1, col: "target" as const },
              ].map(({ boxes, x, col }) =>
                boxes.map((box, i) => (
                  <g key={`${col}|${box.name}`} aria-hidden="true">
                    <motion.rect
                      rx={2.5}
                      width={nodeW}
                      x={x}
                      fill={col === "source" ? colorOf(box.name) : "var(--gu-ink-2)"}
                      initial={m.reduce ? false : { attrY: box.y + box.h / 2, height: 0 }}
                      animate={{ attrY: box.y, height: box.h }}
                      transition={m.stagger(i, 0.08)}
                    />
                    {side === 0 && col === "target" && box.h >= 12 && (
                      <text className="dv-tick" data-strong="true" x={x - 7} y={box.y + box.h / 2 + 4} textAnchor="end">
                        {clipLabel(box.name, 16)}
                      </text>
                    )}
                    {side > 0 && (
                      <text
                        className="dv-leader-text"
                        x={col === "source" ? x - 8 : x + nodeW + 8}
                        y={box.y + box.h / 2}
                        textAnchor={col === "source" ? "end" : "start"}
                      >
                        <tspan x={col === "source" ? x - 8 : x + nodeW + 8} dy="-0.15em">
                          {clipLabel(box.name, side > 100 ? 19 : 12)}
                        </tspan>
                        <tspan className="dv-leader-sub" x={col === "source" ? x - 8 : x + nodeW + 8} dy="1.25em">
                          {fmtUnit(sumFor(col, box.name), unit)} · {fmtPct(totalFlow > 0 ? (sumFor(col, box.name) / totalFlow) * 100 : 0)}
                        </tspan>
                      </text>
                    )}
                  </g>
                )),
              )}
            </svg>
          )}
          <Tip tip={tip} width={width} />
        </div>
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}
