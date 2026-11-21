"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { EASE_EXIT, EASE_MOMO, MH } from "@/components/motion/MotionPrimitives";
import type { SourceItem } from "@/types/momo";

/** Default maximum pills shown before collapsing into "+N lainnya" */
const DEFAULT_VISIBLE_CAP = 3;

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const LAYOUT_SPRING = {
  type: "spring" as const,
  stiffness: 430,
  damping: 35,
  mass: 0.72,
};

const PILL_ENTER_SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 29,
  mass: 0.74,
};

const HEIGHT_SPRING = {
  type: "spring" as const,
  stiffness: 390,
  damping: 35,
  mass: 0.76,
};

/** Extract a readable domain label from a URL */
function domainLabel(src: SourceItem): string {
  if (src.domain) return src.domain;
  try {
    const h = new URL(src.url).hostname.replace(/^www\./, "");
    const parts = h.split(".");
    return parts.length > 2 ? parts.slice(-2).join(".") : h;
  } catch {
    return src.title;
  }
}

/**
 * Collapsed pill row for bottom-of-message source citations.
 * Orchestrated 100% with Motion (`LayoutGroup` + `AnimatePresence mode="popLayout"`
 * + smooth spring height envelope) so expanding "+N lainnya" and collapsing
 * "sembunyikan" never snap flex rows or teleport the toggle pill.
 */
export function SourcePillRow({
  sources,
  maxVisible = DEFAULT_VISIBLE_CAP,
}: {
  sources: SourceItem[];
  maxVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const [isClipping, setIsClipping] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const clipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupId = useId();
  const prefersReduced = useReducedMotion();

  const safeSources = useMemo(
    () => sources.filter((s) => /^https?:\/\//i.test(s.url)),
    [sources],
  );

  const cap = Math.max(1, maxVisible);
  const hasOverflow = safeSources.length > cap;
  const visible = expanded ? safeSources : safeSources.slice(0, cap);
  const hiddenCount = Math.max(0, safeSources.length - cap);

  // Measure target flex-wrap height synchronously before paint so expand/collapse
  // glides from exact pixel height on frame 0 without a 1-frame snap.
  useIsoLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const next = el.offsetHeight;
    if (next > 0) {
      setMeasuredHeight((prev) => {
        if (prev !== null && prev !== next) {
          setIsClipping(true);
        }
        return prev === next ? prev : next;
      });
    }
  }, [expanded, visible.length, safeSources.length]);

  useEffect(() => {
    return () => {
      if (clipTimerRef.current) clearTimeout(clipTimerRef.current);
    };
  }, []);

  // Keep height synced if container width resizes and re-wraps rows.
  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const next = el.offsetHeight;
      if (next > 0) {
        setMeasuredHeight((prev) => (prev === next ? prev : next));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [safeSources.length]);

  if (!safeSources.length) return null;

  const handleToggle = () => {
    if (clipTimerRef.current) clearTimeout(clipTimerRef.current);
    clipTimerRef.current = setTimeout(() => {
      setIsClipping(false);
    }, 380);
    setExpanded((prev) => !prev);
  };

  return (
    <motion.div
      className="src-pill-row"
      style={{ marginTop: 12 }}
      initial={prefersReduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE_MOMO }}
    >
      <span className="src-pill-label">Sumber</span>
      <motion.div
        className={`src-pill-viewport${isClipping ? " is-clipping" : ""}`}
        initial={false}
        animate={{
          height: measuredHeight !== null ? measuredHeight : "auto",
        }}
        transition={prefersReduced ? { duration: 0.12 } : HEIGHT_SPRING}
        onAnimationComplete={() => setIsClipping(false)}
      >
        <LayoutGroup id={`src-pills-${groupId}`}>
          <div ref={listRef} className="src-pill-list">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((src, i) => {
                const isExtra = i >= cap;
                const extraIdx = Math.max(0, i - cap);
                const enterDelay = Math.min(extraIdx * 0.026, 0.16);
                const reverseIdx = Math.max(0, hiddenCount - 1 - extraIdx);
                const exitDelay = Math.min(reverseIdx * 0.014, 0.08);

                return (
                  <motion.a
                    key={`${src.url}-${i}`}
                    layout="position"
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={src.title}
                    className="src-pill"
                    initial={
                      isExtra
                        ? prefersReduced
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.86, y: 5 }
                        : false
                    }
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: isExtra
                        ? {
                            opacity: {
                              duration: 0.18,
                              ease: EASE_MOMO,
                              delay: enterDelay,
                            },
                            scale: { ...PILL_ENTER_SPRING, delay: enterDelay },
                            y: { ...PILL_ENTER_SPRING, delay: enterDelay },
                            layout: LAYOUT_SPRING,
                          }
                        : { layout: LAYOUT_SPRING },
                    }}
                    exit={
                      prefersReduced
                        ? { opacity: 0, transition: { duration: 0.1 } }
                        : {
                            opacity: 0,
                            scale: 0.86,
                            y: -4,
                            transition: {
                              duration: 0.15,
                              ease: EASE_EXIT,
                              delay: exitDelay,
                            },
                          }
                    }
                    whileHover={MH.chip}
                    whileTap={MH.tap}
                  >
                    <span className="n momo-cite-circle is-chip src-pill-badge">
                      <span className="momo-cite-digit">{i + 1}</span>
                    </span>
                    <span className="src-pill-domain">{domainLabel(src)}</span>
                    <ArrowUpRight
                      size={9}
                      strokeWidth={2.2}
                      className="src-pill-arrow"
                      aria-hidden="true"
                    />
                  </motion.a>
                );
              })}
            </AnimatePresence>

            {hasOverflow && (
              <motion.button
                key="src-pill-toggle"
                layout="position"
                type="button"
                className={`src-pill-more${expanded ? " is-expanded" : ""}`}
                onClick={handleToggle}
                whileHover={MH.chip}
                whileTap={MH.tap}
                transition={{ layout: LAYOUT_SPRING, ...MH.spring }}
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? "Sembunyikan sumber"
                    : `Tampilkan ${hiddenCount} sumber lainnya`
                }
              >
                <span className="src-pill-more-label-slot">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={expanded ? "less" : "more"}
                      className="src-pill-more-label"
                      initial={
                        prefersReduced
                          ? { opacity: 0 }
                          : { opacity: 0, y: expanded ? 5 : -5 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      exit={
                        prefersReduced
                          ? { opacity: 0 }
                          : { opacity: 0, y: expanded ? -5 : 5 }
                      }
                      transition={{ duration: 0.15, ease: EASE_MOMO }}
                    >
                      {expanded ? "sembunyikan" : `+${hiddenCount} lainnya`}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <motion.span
                  className="src-pill-more-chevron"
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={LAYOUT_SPRING}
                  aria-hidden="true"
                >
                  <ChevronDown size={11} strokeWidth={2.2} />
                </motion.span>
              </motion.button>
            )}
          </div>
        </LayoutGroup>
      </motion.div>
    </motion.div>
  );
}
