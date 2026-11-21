"use client";

/**
 * SearchResults — Query display header + result list with Load More.
 *
 * Shows the original query, result count, a list of results (title link,
 * snippet, URL, date), and a "Load more" button.
 */

import { useCallback, useContext, useState } from "react";
import { motion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { Search, ArrowUpRight, ChevronDown } from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelVariantContext } from "../shared/IntelCardShell";

function parseResultUrl(raw: string): { host: string; path: string; initial: string } {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./i, "");
    const segs = u.pathname.split("/").filter(Boolean).slice(0, 2);
    return {
      host,
      path: segs.join(" / "),
      initial: (host[0] || "W").toUpperCase(),
    };
  } catch {
    return { host: raw, path: "", initial: "W" };
  }
}

/* ═══════════════════ Data shape ═══════════════════ */

interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

interface SearchResultsData {
  query: string;
  results: SearchResult[];
  totalCount?: number;
  hasMore?: boolean;
}

/* ═══════════════════ Component ═══════════════════ */

export default function SearchResults({
  data,
  state,
  variant,
  onAction,
}: IntelBaseProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = variant || ctxVariant || "default";
  const {
    query = "",
    results = [],
    totalCount,
    hasMore = false,
  } = data as unknown as SearchResultsData;

  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = useCallback(() => {
    setLoadingMore(true);
    onAction?.({
      type: "send",
      payload: { action: "load_more", offset: results.length },
    });
    // Parent is responsible for updating data, which re-renders
    setTimeout(() => setLoadingMore(false), 3000);
  }, [onAction, results.length]);

  const handleNavigate = useCallback(
    (result: SearchResult) => {
      onAction?.({
        type: "navigate",
        payload: { url: result.url, title: result.title },
      });
    },
    [onAction],
  );

  /* ── Loading skeleton ── */
  if (state === "loading") {
    return (
      <div className="intel-search intel-search--loading" role="status">
        <div className="intel-search__skeleton-query" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="intel-search__skeleton-result">
            <div className="intel-search__skeleton-title" />
            <div className="intel-search__skeleton-snippet" />
            <div className="intel-search__skeleton-url" />
          </div>
        ))}
      </div>
    );
  }

  /* ── Error ── */
  if (state === "error") {
    return (
      <div className="intel-search intel-search--error" role="alert">
        <Search size={14} />
        <span>Search failed</span>
      </div>
    );
  }

  /* ── Empty ── */
  if (state === "empty" || (!results.length && !hasMore)) {
    return (
      <div className="intel-search intel-search--empty">
        <Search size={14} />
        <span>No results for &ldquo;{query}&rdquo;</span>
      </div>
    );
  }

  const displayCount = totalCount ?? results.length;
  const remaining = Math.max(0, displayCount - results.length);

  return (
    <div className="intel-search" data-variant={resolvedVariant} role="region" aria-label="Search results">
      {/* Query masthead */}
      <div className="intel-search__header">
        <div className="intel-search__query-wrap">
          <span className="intel-search__lens" aria-hidden="true">
            <Search size={13} className="intel-search__header-icon" />
          </span>
          <span className="intel-search__query">{query}</span>
        </div>
        <span className="intel-search__count">
          {displayCount} result{displayCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Indexed results list */}
      <div className="intel-search__list" role="list">
        {results.map((result, idx) => {
          const parsed = parseResultUrl(result.url);
          const rank = String(idx + 1).padStart(2, "0");
          return (
            <motion.button
              key={result.id}
              type="button"
              className="intel-search__result"
              role="listitem"
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() => handleNavigate(result)}
            >
              <span className="intel-search__rank" aria-hidden="true">{rank}</span>
              <div className="intel-search__body">
                <div className="intel-search__source-row">
                  <div className="intel-search__domain-wrap">
                    <span className="intel-search__favicon" aria-hidden="true">{parsed.initial}</span>
                    <span className="intel-search__host">{parsed.host}</span>
                    {parsed.path && <span className="intel-search__path">/ {parsed.path}</span>}
                  </div>
                  <div className="intel-search__meta-right">
                    {result.date && <span className="intel-search__result-date">{result.date}</span>}
                    <ArrowUpRight size={13} className="intel-search__ext" aria-hidden="true" />
                  </div>
                </div>
                <span className="intel-search__result-title">{result.title}</span>
                <p className="intel-search__result-snippet">{result.snippet}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <motion.button
          type="button"
          className="intel-search__load-more"
          whileHover={MH.chip}
          whileTap={MH.tap}
          transition={MH.spring}
          onClick={handleLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <span className="intel-search__load-more-spinner" />
          ) : (
            <>
              <ChevronDown size={14} />
              <span>{remaining > 0 ? `Load more · ${remaining} remaining` : "Load more"}</span>
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
