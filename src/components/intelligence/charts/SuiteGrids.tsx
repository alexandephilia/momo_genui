"use client";

/** Matrix catalog components: heatmap and pivot table. */

import { useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Flame, Grid3x3, Table2 } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelChartVariantDeck } from "./ChartVariantDeck";
import { IntelCardShell, IntelVariantContext, s, n, a } from "../shared/IntelCardShell";
import { Legend, Num, Segmented, fmtNum, fmtPct, fmtUnit, useDvMotion } from "./kit";
import { CHART_COLORS } from "./shared";

/* 6. Heatmap — value in every cell, row/column cross-highlight, peak flag and scale legend */
export function Heatmap({ data, state, streaming, sources }: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const m = useDvMotion();
  const rows = a<string>(data.rows);
  const cols = a<string>(data.cols);
  const values = a<number[]>(data.values);
  const unit = s(data.unit);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const compact = variant === "minimal";

  const at = (r: number, c: number) => n(values[r]?.[c]);
  const flat = rows.flatMap((_, r) => cols.map((__, c) => at(r, c)));
  const max = Math.max(...flat, 0);
  const min = Math.min(...flat, max);
  const total = flat.reduce((x, y) => x + y, 0);
  const tone = (v: number) => (max > min ? (v - min) / (max - min) : 1);
  const rowTotals = rows.map((_, r) => cols.reduce((sum, __, c) => sum + at(r, c), 0));
  const colTotals = cols.map((_, c) => rows.reduce((sum, __, r) => sum + at(r, c), 0));
  const peakIndex = flat.indexOf(max);
  const peak = { r: Math.floor(peakIndex / Math.max(1, cols.length)), c: peakIndex % Math.max(1, cols.length) };
  const busiestRow = rowTotals.indexOf(Math.max(...rowTotals, 0));
  const busiestCol = colTotals.indexOf(Math.max(...colTotals, 0));
  const shown = hover ?? peak;

  return (
    <IntelCardShell
      title={s(data.title, "Intensity Heatmap")}
      badge={`${rows.length} × ${cols.length}`}
      icon={<Grid3x3 size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={rows.length === 0 || cols.length === 0}
    >
      <IntelChartVariantDeck
        variant={variant}
        data={data}
        unit={unit}
        headline={`The hottest cell is ${rows[peak.r]} at ${cols[peak.c]} with ${fmtUnit(max, unit)}; ${rows[busiestRow]} is the busiest row (${fmtUnit(rowTotals[busiestRow] ?? 0, unit)}).`}
        stats={[
          { label: "Total", value: <Num value={total} unit={unit} /> },
          { label: "Peak cell", value: `${fmtUnit(max, unit)} · ${rows[peak.r]} ${cols[peak.c]}`, tone: "accent" },
          { label: "Busiest column", value: `${cols[busiestCol]} · ${fmtUnit(colTotals[busiestCol] ?? 0, unit)}` },
        ]}
        legend={(layout) =>
          layout === "list" || layout === "table" ? (
            <Legend
              layout={layout}
              label="Row totals"
              items={rows.map((row, r) => ({
                key: row,
                label: row,
                color: `color-mix(in srgb, ${CHART_COLORS[0]} ${Math.round(25 + (rowTotals[r] / Math.max(1, ...rowTotals)) * 75)}%, transparent)`,
                value: fmtUnit(rowTotals[r], unit),
                share: total > 0 ? (rowTotals[r] / total) * 100 : 0,
              }))}
            />
          ) : (
            <div className="dv-scale" role="img" aria-label={`Colour scale from ${fmtUnit(min, unit)} to ${fmtUnit(max, unit)}`}>
              <span>{fmtUnit(min, unit)}</span>
              <i className="dv-scale__ramp" />
              <span>{fmtUnit(max, unit)}</span>
              {layout === "chips" && <em>darker = higher</em>}
            </div>
          )
        }
      >
        <div className="dv-heat-scroll">
          <table className="dv-heat" data-compact={compact || undefined}>
            <thead>
              <tr>
                <th aria-hidden="true" />
                {cols.map((col, c) => (
                  <th key={col} scope="col" data-on={shown.c === c || undefined}>
                    {col}
                  </th>
                ))}
                {!compact && <th scope="col" className="dv-heat__sum">Σ</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={row}>
                  <th scope="row" data-on={shown.r === r || undefined}>
                    {row}
                  </th>
                  {cols.map((col, c) => {
                    const v = at(r, c);
                    const t = tone(v);
                    const isPeak = peak.r === r && peak.c === c;
                    const inCross = hover === null || hover.r === r || hover.c === c;
                    return (
                      <td key={col}>
                        <motion.div
                          className="dv-heat__cell"
                          data-strong={t >= 0.7 || undefined}
                          data-peak={isPeak || undefined}
                          tabIndex={0}
                          role="img"
                          aria-label={`${row}, ${col}: ${fmtUnit(v, unit)}${isPeak ? ", peak" : ""}`}
                          initial={m.reduce ? false : { opacity: 0, scale: 0.6 }}
                          animate={{
                            opacity: inCross ? 1 : 0.4,
                            scale: hover?.r === r && hover?.c === c ? 1.08 : 1,
                          }}
                          transition={{ ...m.stagger(r + c, 0.045), opacity: m.fade, scale: hover ? m.snap : m.stagger(r + c, 0.045) }}
                          whileTap={m.tap}
                          onPointerEnter={() => setHover({ r, c })}
                          onPointerLeave={() => setHover(null)}
                          onFocus={() => setHover({ r, c })}
                          onBlur={() => setHover(null)}
                        >
                          <motion.span
                            className="dv-heat__tint"
                            initial={false}
                            animate={{ opacity: 0.08 + t * 0.92 }}
                            transition={m.spring}
                          />
                          <span className="dv-heat__value">{fmtNum(v)}</span>
                        </motion.div>
                      </td>
                    );
                  })}
                  {!compact && <td className="dv-heat__sum">{fmtNum(rowTotals[r])}</td>}
                </tr>
              ))}
            </tbody>
            {!compact && (
              <tfoot>
                <tr>
                  <th scope="row">Σ</th>
                  {cols.map((col, c) => (
                    <td key={col} className="dv-heat__sum" data-on={shown.c === c || undefined}>
                      {fmtNum(colTotals[c])}
                    </td>
                  ))}
                  <td className="dv-heat__sum dv-heat__grand">{fmtNum(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {(variant === "default" || variant === "editorial") && (
          <div className="dv-detail" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${shown.r}-${shown.c}`}
                className="dv-detail__row"
                initial={m.reduce ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={m.fade}
              >
                <Flame className="dv-glyph" size={14} strokeWidth={2.2} aria-hidden="true" />
                <strong>
                  {rows[shown.r]} · {cols[shown.c]}
                </strong>
                <span>{fmtUnit(at(shown.r, shown.c), unit)}</span>
                <span>{fmtPct(total > 0 ? (at(shown.r, shown.c) / total) * 100 : 0)} of total</span>
                <em>{hover === null ? "Peak cell · hover any cell" : shown.r === peak.r && shown.c === peak.c ? "Peak cell" : ""}</em>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </IntelChartVariantDeck>
    </IntelCardShell>
  );
}

/* 14. PivotTable — cross-tab with in-cell bars, row / column totals and a SUM · COUNT switch */
export function PivotTable({ data, state, streaming, sources }: IntelBaseProps) {
  const m = useDvMotion();
  const records = a<Record<string, unknown>>(data.records);
  const rowField = s(data.rowField, "region");
  const colField = s(data.colField, "quarter");
  const valField = s(data.valueField, "revenue");
  const [agg, setAgg] = useState<"sum" | "count">("sum");
  const [hover, setHover] = useState<{ r: string; c: string } | null>(null);

  const { rowKeys, colKeys, table } = useMemo(() => {
    const rSet = Array.from(new Set(records.map((r) => s(r[rowField]))));
    const cSet = Array.from(new Set(records.map((r) => s(r[colField]))));
    const map: Record<string, Record<string, number>> = {};
    for (const r of rSet) {
      map[r] = {};
      for (const c of cSet) map[r][c] = 0;
    }
    for (const rec of records) {
      map[s(rec[rowField])][s(rec[colField])] += agg === "sum" ? n(rec[valField]) : 1;
    }
    return { rowKeys: rSet, colKeys: cSet, table: map };
  }, [records, rowField, colField, valField, agg]);

  const cellMax = Math.max(1, ...rowKeys.flatMap((r) => colKeys.map((c) => table[r][c])));
  const rowTotal = (r: string) => colKeys.reduce((sum, c) => sum + table[r][c], 0);
  const colTotal = (c: string) => rowKeys.reduce((sum, r) => sum + table[r][c], 0);
  const grand = rowKeys.reduce((sum, r) => sum + rowTotal(r), 0);

  return (
    <IntelCardShell
      title={s(data.title, "Interactive Pivot Table")}
      badge={`${rowField} × ${colField}`}
      icon={<Table2 size={16} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={records.length === 0}
      headerRight={
        <Segmented
          label="Aggregation"
          value={agg}
          onChange={setAgg}
          options={[
            { value: "sum", label: "SUM" },
            { value: "count", label: "COUNT" },
          ]}
        />
      }
    >
      <div className="dv-chart dv-heat-scroll">
        <table className="dv-pivot">
          <caption>
            {agg === "sum" ? `Sum of ${valField}` : "Record count"} by {rowField} and {colField}
          </caption>
          <thead>
            <tr>
              <th scope="col">
                {rowField} \ {colField}
              </th>
              {colKeys.map((c) => (
                <th key={c} scope="col" data-on={hover?.c === c || undefined}>
                  {c}
                </th>
              ))}
              <th scope="col" className="dv-pivot__total">Total</th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((r, ri) => (
              <motion.tr
                key={r}
                initial={m.reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: hover !== null && hover.r !== r ? 0.55 : 1, y: 0 }}
                transition={{ ...m.stagger(ri, 0.07), opacity: m.fade }}
              >
                <th scope="row" data-on={hover?.r === r || undefined}>
                  {r}
                </th>
                {colKeys.map((c) => (
                  <td
                    key={c}
                    tabIndex={0}
                    aria-label={`${r}, ${c}: ${fmtNum(table[r][c])}`}
                    onPointerEnter={() => setHover({ r, c })}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover({ r, c })}
                    onBlur={() => setHover(null)}
                  >
                    <Num value={table[r][c]} />
                    <span className="dv-pivot__track" aria-hidden="true">
                      <motion.span
                        className="dv-pivot__fill"
                        initial={m.reduce ? false : { width: "0%" }}
                        animate={{ width: `${(table[r][c] / cellMax) * 100}%` }}
                        transition={m.stagger(ri, 0.07)}
                      />
                    </span>
                  </td>
                ))}
                <td className="dv-pivot__total">
                  <Num value={rowTotal(r)} />
                </td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {colKeys.map((c) => (
                <td key={c} className="dv-pivot__total" data-on={hover?.c === c || undefined}>
                  <Num value={colTotal(c)} />
                </td>
              ))}
              <td className="dv-pivot__total dv-pivot__grand">
                <Num value={grand} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </IntelCardShell>
  );
}
