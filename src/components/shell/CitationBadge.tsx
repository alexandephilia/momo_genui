"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Globe } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_MOMO } from "@/components/motion/MotionPrimitives";
import type { SourceItem } from "@/types/momo";

export interface CitationBadgeProps {
  index: number;
  source?: SourceItem;
  extraClassName?: string;
}

export interface InlineLinkTooltipProps {
  href: string;
  source?: SourceItem;
  citeNumber?: number;
  trailingPunct?: string;
  children: React.ReactNode;
}

function getSafeDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

function isSafeExternalUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "mailto:"
    ) {
      return parsed.href;
    }
  } catch {
    return null;
  }
  return null;
}

const SourceFavicon: React.FC<{ domain: string }> = ({ domain }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [domain]);

  const isWebDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain);

  return (
    <span className="momo-cite-tip-fav" aria-hidden="true">
      {isWebDomain && !imgFailed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
          alt=""
          width={12}
          height={12}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Globe size={11} strokeWidth={2} />
      )}
    </span>
  );
};

function computeTooltipCoords(anchorEl: HTMLElement | null) {
  if (!anchorEl || typeof window === "undefined") {
    return { left: 0, top: 0, placeAbove: true, arrowOffsetPx: 0 };
  }
  const rect = anchorEl.getBoundingClientRect();
  const maxWidth = Math.min(268, window.innerWidth - 24);
  const pad = 12;
  const centerX = rect.left + rect.width / 2;
  const clampedCenter = Math.max(
    pad + maxWidth / 2,
    Math.min(window.innerWidth - pad - maxWidth / 2, centerX)
  );
  const arrowOffsetPx = Math.max(
    -(maxWidth / 2) + 16,
    Math.min(maxWidth / 2 - 16, centerX - clampedCenter)
  );
  const placeAbove = rect.top > 136 || window.innerHeight - rect.bottom < 130;
  const top = placeAbove ? rect.top - 8 : rect.bottom + 8;
  return { left: clampedCenter, top, placeAbove, arrowOffsetPx };
}

const CitationTooltipPortal: React.FC<{
  open: boolean;
  anchorEl: HTMLElement | null;
  index?: number;
  title: string;
  url: string;
  description?: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({
  open,
  anchorEl,
  index,
  title,
  url,
  description,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [coords, setCoords] = useState({
    left: 0,
    top: 0,
    placeAbove: true,
    arrowOffsetPx: 0,
  });

  useEffect(() => {
    if (!open || !anchorEl) return;
    const update = () => setCoords(computeTooltipCoords(anchorEl));
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorEl]);

  if (typeof document === "undefined") return null;
  const safeHref = isSafeExternalUrl(url);
  const domain = safeHref ? getSafeDomain(safeHref) : url;
  const cleanTitle = (title || "").trim();
  const hasDistinctTitle = Boolean(
    cleanTitle &&
      cleanTitle.toLowerCase() !== domain.toLowerCase() &&
      cleanTitle !== `Sumber ${index}`
  );
  const displayDesc = description?.trim() || "";
  const showTitleRow = hasDistinctTitle || !displayDesc;
  const showFallbackUrl = !hasDistinctTitle && !displayDesc && Boolean(url);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="momo-cite-tooltip-anchor"
          style={{
            position: "fixed",
            left: coords.left,
            top: coords.top,
            transform: coords.placeAbove ? "translate(-50%, -100%)" : "translate(-50%, 0%)",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <motion.div
            role="tooltip"
            className={`momo-cite-tooltip${coords.placeAbove ? " is-above" : " is-below"}`}
            style={
              {
                "--cite-arrow-offset": `${coords.arrowOffsetPx}px`,
              } as React.CSSProperties
            }
            initial={{ opacity: 0, scale: 0.94, y: coords.placeAbove ? 5 : -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: coords.placeAbove ? 3 : -3 }}
            transition={{ duration: 0.16, ease: EASE_MOMO }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div className="momo-cite-tip-head">
              <span className="momo-cite-tip-domain">
                {typeof index === "number" ? (
                  <span className="momo-cite-circle is-tip">
                    <span className="momo-cite-digit">{index}</span>
                  </span>
                ) : null}
                <SourceFavicon domain={domain} />
                <span className="momo-cite-tip-host">{domain}</span>
              </span>
              {safeHref && (
                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="momo-cite-tip-open"
                  aria-label="Buka tautan sumber"
                  title="Buka sumber"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ArrowUpRight size={12.5} strokeWidth={2.25} />
                </a>
              )}
            </div>
            {showTitleRow &&
              (safeHref ? (
                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="momo-cite-tip-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  {cleanTitle || domain}
                </a>
              ) : (
                <div className="momo-cite-tip-title">{cleanTitle || domain}</div>
              ))}
            {displayDesc ? (
              <p className="momo-cite-tip-desc">{displayDesc}</p>
            ) : null}
            {showFallbackUrl ? (
              <div className="momo-cite-tip-url">{url}</div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const CitationBadge: React.FC<CitationBadgeProps> = ({
  index,
  source,
  extraClassName = "",
}) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement | HTMLSpanElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const safeHref = isSafeExternalUrl(source?.url);
  const title = source?.title || `Sumber ${index}`;
  const description = source?.description || source?.snippet;

  const scheduleOpen = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const className = `momo-cite-circle${extraClassName ? ` ${extraClassName}` : ""}`;

  return (
    <>
      {safeHref ? (
        <a
          ref={(el) => {
            anchorRef.current = el;
          }}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          aria-label={`Sumber ${index}: ${title}`}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          onFocus={scheduleOpen}
          onBlur={scheduleClose}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="momo-cite-digit">{index}</span>
        </a>
      ) : (
        <span
          ref={(el) => {
            anchorRef.current = el;
          }}
          tabIndex={0}
          className={className}
          aria-label={`Referensi (${index})`}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          onFocus={scheduleOpen}
          onBlur={scheduleClose}
        >
          <span className="momo-cite-digit">{index}</span>
        </span>
      )}
      {source ? (
        <CitationTooltipPortal
          open={open}
          anchorEl={anchorRef.current}
          index={index}
          title={title}
          url={source.url}
          description={description}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
        />
      ) : null}
    </>
  );
};

export const InlineLinkWithTooltip: React.FC<InlineLinkTooltipProps> = ({
  href,
  source,
  citeNumber,
  trailingPunct,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const safeHref = isSafeExternalUrl(href);
  const domain = safeHref ? getSafeDomain(safeHref) : href;
  const title = source?.title || domain;
  const description = source?.description || source?.snippet;

  const scheduleOpen = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (!safeHref) return <>{children}{trailingPunct || ""}</>;

  return (
    <>
      <span
        ref={anchorRef}
        className="momo-inline-link-wrap"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
      >
        <a
          className="md-link"
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          onFocus={scheduleOpen}
          onBlur={scheduleClose}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </a>
        {typeof citeNumber === "number" ? (
          <span className="momo-cite-tail">
            {" "}
            <CitationBadge index={citeNumber} source={source || { title, url: safeHref, description }} />
            {trailingPunct || ""}
          </span>
        ) : trailingPunct ? (
          <span className="momo-cite-tail">{trailingPunct}</span>
        ) : null}
      </span>
      <CitationTooltipPortal
        open={open}
        anchorEl={anchorRef.current}
        index={citeNumber}
        title={title}
        url={safeHref}
        description={description}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
      />
    </>
  );
};
