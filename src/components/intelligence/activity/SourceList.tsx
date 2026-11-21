"use client";

/**
 * SourceList — Sortable, filterable list of SourceCard components.
 *
 * Features: sort dropdown (relevance / date), filter by reliability,
 * group-by-domain toggle.
 */

import { useContext, useMemo, useState } from "react";
import { motion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { ChevronDown, Layers, Filter } from "lucide-react";
import SourceCard from "./SourceCard";
import type { IntelBaseProps, IntelSource } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";

/* ═══════════════════ Data shape ═══════════════════ */

interface SourceEntry {
  source: IntelSource;
  snippet?: string;
}

interface SourceListData {
  sources: SourceEntry[];
}

type SortMode = "relevance" | "date";
type ReliabilityFilter = "all" | "high" | "medium" | "low";

/* ═══════════════════ Helpers ═══════════════════ */

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ═══════════════════ Component ═══════════════════ */

export default function SourceList({
  data,
  state,
  variant,
  onAction,
  surface,
  live,
  streaming,
  sources,
}: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const { sources: entries = [] } = data as unknown as SourceListData;
  const [sort, setSort] = useState<SortMode>("relevance");
  const [filter, setFilter] = useState<ReliabilityFilter>("all");
  const [groupByDomain, setGroupByDomain] = useState(false);

  const baseProps: Omit<IntelBaseProps, "data"> = useMemo(
    () => ({ state: "ready" as const, surface, live, streaming, sources, onAction }),
    [state, surface, live, streaming, sources, onAction],
  );

  const processed = useMemo(() => {
    let items = [...entries];

    // Filter by reliability
    if (filter !== "all") {
      items = items.filter((e) => e.source.reliability === filter);
    }

    // Sort
    if (sort === "date") {
      items.sort((a, b) => {
        const da = a.source.publishedDate || "";
        const db = b.source.publishedDate || "";
        return db.localeCompare(da);
      });
    }
    // "relevance" keeps original order

    return items;
  }, [entries, sort, filter]);

  const grouped = useMemo(() => {
    if (!groupByDomain) return null;
    const map = new Map<string, SourceEntry[]>();
    for (const entry of processed) {
      const domain = entry.source.domain || extractDomain(entry.source.url);
      const list = map.get(domain) || [];
      list.push(entry);
      map.set(domain, list);
    }
    return map;
  }, [processed, groupByDomain]);

  /* ── Loading skeleton ── */
  if (state === "loading") {
    return (
      <div className="intel-source-list intel-source-list--loading" role="status">
        {[1, 2, 3].map((i) => (
          <div key={i} className="intel-source-card intel-source-card--loading">
            <div className="intel-source-card__skeleton-title" />
            <div className="intel-source-card__skeleton-line" />
          </div>
        ))}
      </div>
    );
  }

  /* ── Error ── */
  if (state === "error") {
    return (
      <div className="intel-source-list intel-source-list--error" role="alert">
        <span>Failed to load sources</span>
      </div>
    );
  }

  /* ── Empty ── */
  if (state === "empty" || !entries.length) {
    return (
      <div className="intel-source-list intel-source-list--empty">
        <span>No sources available</span>
      </div>
    );
  }

  const renderEntry = (entry: SourceEntry, idx: number) => (
    <SourceCard
      key={`${entry.source.url}-${idx}`}
      data={{ source: entry.source, snippet: entry.snippet }}
      {...baseProps}
    />
  );

  return (
    <div className="intel-source-list" data-variant={resolvedVariant} role="list" aria-label="Source list">
      {/* Controls */}
      <div className="intel-source-list__controls">
        {/* Sort */}
        <div className="intel-source-list__select-wrap">
          <select
            className="intel-source-list__select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            aria-label="Sort sources"
          >
            <option value="relevance">Relevance</option>
            <option value="date">Date</option>
          </select>
          <ChevronDown size={12} className="intel-source-list__select-icon" />
        </div>

        {/* Filter */}
        <div className="intel-source-list__select-wrap">
          <select
            className="intel-source-list__select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ReliabilityFilter)}
            aria-label="Filter by reliability"
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <Filter size={12} className="intel-source-list__select-icon" />
        </div>

        {/* Group toggle */}
        <motion.button
          type="button"
          className={`intel-source-list__toggle ${groupByDomain ? "intel-source-list__toggle--active" : ""}`}
          whileHover={MH.chip}
          whileTap={MH.tap}
          transition={MH.spring}
          onClick={() => setGroupByDomain((v) => !v)}
          title="Group by domain"
          aria-label="Toggle group by domain"
        >
          <Layers size={12} />
          <span>Group</span>
        </motion.button>

        <span className="intel-source-list__count">
          {processed.length} source{processed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Content */}
      <div className="intel-source-list__content">
        {grouped ? (
          Array.from(grouped.entries()).map(([domain, items]) => (
            <div key={domain} className="intel-source-list__domain-group">
              <div className="intel-source-list__domain-header">{domain}</div>
              {items.map((entry, idx) => renderEntry(entry, idx))}
            </div>
          ))
        ) : (
          processed.map((entry, idx) => renderEntry(entry, idx))
        )}
      </div>
    </div>
  );
}
