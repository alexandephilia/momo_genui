"use client";

/**
 * DataTable — Sortable, filterable data table
 *
 * Click column headers to sort (asc/desc), filter with search input,
 * sticky header, alternating rows, horizontal scroll on mobile.
 */

import { useState, useMemo, useCallback, useContext } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { MH } from "@/components/motion/MotionPrimitives";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";
import { INSTANT } from "../shared/StateMotion";

interface DataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
}

interface DataTableData {
  title?: string;
  columns: DataTableColumn[];
  rows: Record<string, string | number | boolean | null>[];
  searchable?: boolean;
}

type SortDir = "asc" | "desc" | null;

const ROW_FADE = { opacity: 0 };
const ROW_SHOWN = { opacity: 1 };

export default function DataTable({ data, state, variant }: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const d = data as unknown as DataTableData;
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [search, setSearch] = useState("");
  const reduce = useReducedMotion();
  const rowTransition = reduce ? INSTANT : { layout: MH.spring, opacity: MH.ease };

  // Rows are keyed by what they contain so sorting moves them instead of rewriting cells in place.
  const rowKeys = useMemo(() => {
    const keys = new Map<DataTableData["rows"][number], string>();
    const seen = new Map<string, number>();
    for (const row of Array.isArray(d.rows) ? d.rows : []) {
      const content = JSON.stringify(row);
      const dupes = seen.get(content) ?? 0;
      seen.set(content, dupes + 1);
      keys.set(row, dupes ? `${content}#${dupes}` : content);
    }
    return keys;
  }, [d.rows]);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }, [sortKey, sortDir]);

  const filteredRows = useMemo(() => {
    if (!d.rows) return [];
    let rows = d.rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    if (sortKey && sortDir) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        const cmp = String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [d.rows, search, sortKey, sortDir]);

  /* Loading skeleton */
  if (state === "loading") {
    return (
      <div className="intel-datatable" role="status" aria-label="Loading table">
        <div className="intel-datatable__skeleton">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="intel-skeleton-line" style={{ height: 16, marginBottom: 8, width: `${80 - i * 5}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-datatable intel-datatable--error" data-variant={resolvedVariant} role="alert">
        <span style={{ color: "#d97757", fontSize: 13 }}>Failed to load table data</span>
      </div>
    );
  }

  if (state === "empty" || !d.columns?.length || !d.rows?.length) {
    return (
      <div className="intel-datatable intel-datatable--empty" role="status">
        {d.title && <h3 className="intel-datatable__title">{d.title}</h3>}
        <span className="intel-text-muted" style={{ fontSize: 13 }}>No data available</span>
      </div>
    );
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    if (sortDir === "asc") return <ArrowUp size={12} />;
    return <ArrowDown size={12} />;
  };

  const displayCols = d.columns;

  return (
    <div className="intel-datatable" data-variant={resolvedVariant} role="table" aria-label={d.title || "Data table"}>
      {(d.title || d.searchable !== false) && (
        <div className="intel-datatable__header">
          {d.title && <h3 className="intel-datatable__title">{d.title}</h3>}
          {d.searchable !== false && resolvedVariant !== "minimal" && (
            <div className="intel-datatable__search">
              <Search size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter..."
                className="intel-datatable__search-input"
              />
            </div>
          )}
        </div>
      )}

      {resolvedVariant === "split" ? (
        <div className="intel-datatable-bento">
          <AnimatePresence initial={false}>
            {filteredRows.map((row, ri) => {
              const primaryCol = displayCols[0];
              const restCols = displayCols.slice(1);
              return (
                <motion.div
                  key={rowKeys.get(row)}
                  layout
                  initial={ROW_FADE}
                  animate={ROW_SHOWN}
                  exit={ROW_FADE}
                  className="intel-datatable-bento__card"
                  whileTap={{ scale: 0.99 }}
                  transition={reduce ? INSTANT : { type: "spring", stiffness: 400, damping: 28, opacity: MH.ease }}
                >
                  <div className="intel-datatable-bento__head">
                    <span className="intel-datatable-bento__idx">0{ri + 1}</span>
                    <strong>
                      {primaryCol && row[primaryCol.key] != null
                        ? String(row[primaryCol.key])
                        : `Row ${ri + 1}`}
                    </strong>
                  </div>
                  <dl className="intel-datatable-bento__kv">
                    {restCols.map((col) => (
                      <div key={col.key} className="intel-datatable-bento__row">
                        <dt>{col.label}</dt>
                        <dd>{row[col.key] != null ? String(row[col.key]) : "\u2014"}</dd>
                      </div>
                    ))}
                  </dl>
                </motion.div>
              );
            })}
            {filteredRows.length === 0 && (
              <motion.div
                key="no-rows"
                initial={ROW_FADE}
                animate={ROW_SHOWN}
                exit={ROW_FADE}
                transition={rowTransition}
                className="intel-muted-mono"
                style={{ textAlign: "center", padding: 14 }}
              >
                No matching rows
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="intel-datatable__scroll">
          <table className="intel-datatable__table">
            <thead>
              <tr>
                {displayCols.map((col) => (
                  <th
                    key={col.key}
                    className={`intel-datatable__th ${col.sortable !== false ? "intel-datatable__th--sortable" : ""}`}
                    style={{ textAlign: col.align || "left", width: col.width }}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <span className="intel-datatable__th-content">
                      {col.label}
                      {col.sortable !== false && <SortIcon col={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filteredRows.map((row, ri) => (
                  <motion.tr
                    key={rowKeys.get(row)}
                    layout
                    initial={ROW_FADE}
                    animate={ROW_SHOWN}
                    exit={ROW_FADE}
                    transition={rowTransition}
                    className={ri % 2 === 1 ? "intel-datatable__row--alt" : ""}
                  >
                    {displayCols.map((col) => (
                      <td
                        key={col.key}
                        className="intel-datatable__td"
                        style={{ textAlign: col.align || "left" }}
                      >
                        {row[col.key] != null ? String(row[col.key]) : "\u2014"}
                      </td>
                    ))}
                  </motion.tr>
                ))}
                {filteredRows.length === 0 && (
                  <motion.tr key="no-rows" initial={ROW_FADE} animate={ROW_SHOWN} exit={ROW_FADE} transition={rowTransition}>
                    <td colSpan={displayCols.length} className="intel-datatable__td intel-text-muted" style={{ textAlign: "center" }}>
                      No matching rows
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
