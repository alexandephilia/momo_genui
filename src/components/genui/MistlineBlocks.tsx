"use client";

import {
  Component,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MH, MOTION_VOCABULARY } from "@/components/motion/MotionPrimitives";
import { MarkdownMessage } from "@/components/shell/MarkdownMessage";
import type { MistlineBlock } from "@/lib/mistlineParse";
import type {
  SourceItem,
  UiInteractionPayload,
  WorkspaceBoardItem,
} from "@/types/momo";
import {
  MistlineComponent,
  type MistlineAction,
  type MistlineSurface,
} from "./MistlineLibrary";

export type MistlineLifecycleState =
  | "pending"
  | "streaming"
  | "mounting"
  | "ready"
  | "error"
  | "cancelled";

export class MistlineBlockBoundary extends Component<
  {
    name: string;
    retryKey?: number;
    onRetry?: () => void;
    children: ReactNode;
  },
  { failed: boolean; errorMsg?: string }
> {
  state: { failed: boolean; errorMsg?: string } = { failed: false };
  static getDerivedStateFromError(err: Error) {
    return { failed: true, errorMsg: err?.message };
  }
  componentDidUpdate(prevProps: { retryKey?: number }) {
    if (prevProps.retryKey !== this.props.retryKey && this.state.failed) {
      this.setState({ failed: false, errorMsg: undefined });
    }
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="gu gu-unknown gu-region-error" role="alert">
          <span className="gu-pen momo-hand-title">gagal merender</span>{" "}
          <code>{this.props.name}</code>
          {this.props.onRetry && (
            <motion.button
              type="button"
              className="gu-btn-retry"
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={this.props.onRetry}
            >
              Coba lagi
            </motion.button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

const SKELETON_SHAPES: Record<string, string> = {
  Headline: "prose",
  Text: "prose",
  Callout: "prose",
  Followups: "chips",
  Quiz: "prose",
  Cards: "cards",
  BentoGrid: "cards",
  Choices: "cards",
  Checklist: "rows",
  Flow: "flow",
  Palette: "cards",
  Plan: "steps",
  Steps: "steps",
  Stats: "stats",
  Chart: "chart",
  Versus: "table",
  Table: "table",
  Map: "map",
  Code: "code",
  AsyncImage: "image",
  Image: "image",
  ImageWithCaption: "image",
  ImageWithCitation: "image",
  ImageLightbox: "image",
  ImageGallery: "gallery",
  ImageGrid: "gallery",
  ImageCarousel: "carousel",
  ImageComparison: "image-compare",
};

function resolveSkeletonShape(name: string): string {
  if (SKELETON_SHAPES[name]) return SKELETON_SHAPES[name];
  const lower = name.toLowerCase();
  if (/(?:_chart$|^gauge$|^treemap$|^heatmap$|^histogram$|^box_plot$|^scatter_plot$|^bubble_chart$)/.test(lower)) {
    return "chart";
  }
  if (/(?:_tree$|_graph$|_diagram$|_map$|_flow$|^state_machine$|_topology$)/.test(lower)) {
    return "flow";
  }
  if (/(?:_matrix$|^data_table$|^pros_cons$|^swot_|^cost_benefit|^risk_register)/.test(lower)) {
    return "table";
  }
  if (/^metric/.test(lower)) {
    return "stats";
  }
  if (/(?:_panel$|_summary$|^key_findings$|^what_if_|_explorer$|_controls$|_filter$|_selector$)/.test(lower)) {
    return "rows";
  }
  return "cards";
}

const ASYNC_READY_COMPONENTS = new Set([
  "AsyncImage",
  "Image",
  "ImageWithCaption",
  "ImageWithCitation",
  "ImageLightbox",
  "ImageGallery",
  "ImageGrid",
  "ImageCarousel",
  "ImageComparison",
]);

function SkelBars({ widths }: { widths: string[] }) {
  return (
    <>
      {widths.map((w, i) => (
        <span
          key={i}
          className="gu-skel__bar"
          style={{ width: w }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

export function MistlineBlockSkeleton({
  name,
  lifecycle = "streaming",
}: {
  name: string;
  lifecycle?: MistlineLifecycleState;
}) {
  const shape = resolveSkeletonShape(name);
  return (
    <div
      className={`gu-skel gu-skel--${shape}`}
      data-lifecycle={lifecycle}
      data-skeleton-for={name}
      aria-busy="true"
      aria-label={`Memuat ${name}`}
    >
      {shape === "prose" && (
        <div className="gu-skel__stack">
          <SkelBars widths={["62%", "94%", "88%", "46%"]} />
        </div>
      )}
      {shape === "chips" && (
        <div className="gu-skel__chips">
          {["34%", "28%", "40%", "30%"].map((w, i) => (
            <span
              key={i}
              className="gu-skel__chip"
              style={{ width: w }}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
      {shape === "cards" && (
        <div className="gu-skel__grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="gu-skel__tile">
              <span className="gu-skel__media" aria-hidden="true" />
              <SkelBars widths={["82%", "54%"]} />
            </div>
          ))}
        </div>
      )}
      {shape === "flow" && (
        <div className="gu-skel__flow" aria-hidden="true">
          <span className="gu-skel__node" />
          <span className="gu-skel__edge" />
          <span className="gu-skel__node" />
          <span className="gu-skel__edge" />
          <span className="gu-skel__node" />
        </div>
      )}
      {shape === "rows" && (
        <div className="gu-skel__stack">
          {[0, 1, 2].map((i) => (
            <div key={i} className="gu-skel__rowline">
              <span className="gu-skel__dot" aria-hidden="true" />
              <span
                className="gu-skel__bar"
                style={{ width: `${86 - i * 14}%` }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      )}
      {shape === "steps" && (
        <div className="gu-skel__stack">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="gu-skel__rowline">
              <span className="gu-skel__num" aria-hidden="true" />
              <span
                className="gu-skel__bar"
                style={{ width: `${78 - i * 9}%` }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      )}
      {shape === "stats" && (
        <div className="gu-skel__stats">
          {[0, 1, 2].map((i) => (
            <div key={i} className="gu-skel__stat">
              <span className="gu-skel__bignum" aria-hidden="true" />
              <span
                className="gu-skel__bar"
                style={{ width: "58%" }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      )}
      {shape === "chart" && (
        <div className="gu-skel__chart" aria-hidden="true">
          {[38, 62, 45, 80, 55, 92, 70].map((h, i) => (
            <span
              key={i}
              className="gu-skel__barcol"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      )}
      {shape === "table" && (
        <div className="gu-skel__stack">
          <div className="gu-skel__rowline gu-skel__rowline--head">
            <span
              className="gu-skel__bar"
              style={{ width: "30%" }}
              aria-hidden="true"
            />
            <span
              className="gu-skel__bar"
              style={{ width: "22%" }}
              aria-hidden="true"
            />
            <span
              className="gu-skel__bar"
              style={{ width: "26%" }}
              aria-hidden="true"
            />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="gu-skel__rowline">
              <span
                className="gu-skel__bar"
                style={{ width: "34%" }}
                aria-hidden="true"
              />
              <span
                className="gu-skel__bar"
                style={{ width: "24%" }}
                aria-hidden="true"
              />
              <span
                className="gu-skel__bar"
                style={{ width: "28%" }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      )}
      {shape === "map" && <div className="gu-skel__map" aria-hidden="true" />}
      {shape === "image" && (
        <div className="gu-skel__stack">
          <div className="gu-skel__imgframe" aria-hidden="true" />
          <SkelBars widths={["58%"]} />
        </div>
      )}
      {shape === "gallery" && (
        <div className="gu-skel__gallery">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="gu-skel__imgframe"
              style={{ aspectRatio: "4/3" }}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
      {shape === "carousel" && (
        <div className="gu-skel__carousel">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="gu-skel__imgframe"
              style={{ aspectRatio: "16/10" }}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
      {shape === "image-compare" && (
        <div className="gu-skel__compare">
          <div className="gu-skel__imgframe" aria-hidden="true" />
          <div className="gu-skel__imgframe" aria-hidden="true" />
        </div>
      )}
      {shape === "code" && (
        <div className="gu-skel__stack gu-skel__code">
          {["92%", "78%", "86%", "60%", "88%", "70%"].map((w, i) => (
            <span
              key={i}
              className="gu-skel__bar"
              style={{ width: w }}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
    </div>
  );
}

const SKEL_MEDIA_KEYS = ["image", "imageUrl", "src", "cover", "photo", "imageQuery"];
const SKEL_GRID_SHAPES = new Set(["cards", "stats", "gallery", "carousel", "image-compare"]);
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);
const hasSkelMedia = (o: Record<string, unknown>) =>
  SKEL_MEDIA_KEYS.some((k) => typeof o[k] === "string" && (o[k] as string).trim());

/** One bar per rendered line of `text`: the bar count and widths follow the real text length. */
const SKEL_IN = { duration: 0.3, ease: [0.2, 0.9, 0.3, 1] } as const;
const SKEL_PULSE = { duration: 1.1, ease: "easeInOut", repeat: Infinity } as const;

/** A skeleton piece slides in once; the one still being written keeps pulsing. */
function skelMotion(growing: boolean, reduce: boolean | null) {
  if (reduce) return { initial: false as const };
  if (growing) {
    return {
      initial: { opacity: 0.55, y: 8 },
      animate: { opacity: [0.55, 1, 0.55], y: 0 },
      transition: { y: SKEL_IN, opacity: SKEL_PULSE },
    };
  }
  return { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: SKEL_IN };
}

function SkelText({ text, lead = false }: { text: string; lead?: boolean }) {
  const perLine = lead ? 34 : 46;
  const len = text.trim().length;
  const lines = Math.max(1, Math.min(3, Math.ceil(len / perLine)));
  return (
    <>
      {Array.from({ length: lines }, (_, i) => {
        const rest = len - i * perLine;
        const width = i < lines - 1 ? 100 : Math.max(16, Math.min(100, (rest / perLine) * 100));
        return (
          <span
            key={i}
            className={`gu-gskel__bar${lead && i === 0 ? " is-lead" : ""}`}
            style={{ width: `${Math.round(width)}%` }}
            aria-hidden="true"
          />
        );
      })}
    </>
  );
}

function SkelFields({ value }: { value: Record<string, unknown> }) {
  const fields = Object.entries(value).filter(
    ([k, v]) => !SKEL_MEDIA_KEYS.includes(k) && k !== "icon" && v !== null && v !== undefined && v !== "",
  );
  return (
    <>
      {hasSkelMedia(value) && <span className="gu-gskel__media" aria-hidden="true" />}
      {fields.map(([k, v], i) =>
        typeof v === "string" || typeof v === "number" ? (
          <SkelText key={k} text={String(v)} lead={i === 0} />
        ) : Array.isArray(v) ? (
          <span key={k} className="gu-gskel__sub">
            {v.slice(0, 8).map((row, ri) => (
              <SkelText
                key={ri}
                text={isPlainObject(row) ? Object.values(row).filter((x) => typeof x === "string").join(" ") || "…" : String(row)}
              />
            ))}
          </span>
        ) : null,
      )}
    </>
  );
}

/**
 * Skeleton generated from the block's own partial data. While a block is still being written,
 * its outline is drawn from what has arrived so far: one cell per item received, a media box
 * where an item carries a photo, bars as long as the real text. It grows as the stream grows,
 * and the finished component replaces it once the block is complete.
 */
export function GenerativeSkeleton({
  name,
  props,
}: {
  name: string;
  props?: Record<string, unknown> | null;
}) {
  const shape = resolveSkeletonShape(name);
  const entries = Object.entries(props ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  const heads = entries.filter(([k, v]) => (typeof v === "string" || typeof v === "number") && !SKEL_MEDIA_KEYS.includes(k));
  const lists = entries.filter(([, v]) => Array.isArray(v) && v.length > 0) as Array<[string, unknown[]]>;
  const groups = entries.filter(([, v]) => isPlainObject(v)) as Array<[string, Record<string, unknown>]>;
  const lastList = lists.length - 1;
  const reduce = useReducedMotion();

  return (
    <div
      className="gu-gskel"
      data-shape={shape}
      data-skeleton-for={name}
      aria-busy="true"
      aria-label={`Menyusun ${name}`}
    >
      {(heads.length > 0 || entries.length === 0) && (
        <div className="gu-gskel__head">
          {heads.length > 0 ? (
            heads.map(([k, v], i) => <SkelText key={k} text={String(v)} lead={i === 0} />)
          ) : (
            <motion.span
              className="gu-gskel__bar is-lead"
              style={{ width: "38%" }}
              aria-hidden="true"
              {...skelMotion(true, reduce)}
            />
          )}
        </div>
      )}
      {props && hasSkelMedia(props) && <span className="gu-gskel__media is-hero" aria-hidden="true" />}
      {groups.length > 0 && (
        <div className="gu-gskel__list" data-layout="grid" data-count={groups.length}>
          {groups.map(([k, g]) => (
            <motion.div key={k} className="gu-gskel__cell" {...skelMotion(false, reduce)}>
              <SkelFields value={g} />
            </motion.div>
          ))}
        </div>
      )}
      {lists.map(([key, list], li) => {
        const objects = list.every(isPlainObject);
        const numeric = objects
          ? list.map((row) => Number((row as Record<string, unknown>).value ?? (row as Record<string, unknown>).y))
          : [];
        const isChart = shape === "chart" && numeric.length > 0 && numeric.every(Number.isFinite);
        const layout = isChart
          ? "chart"
          : shape === "table" || list.some(Array.isArray) || !objects
            ? "rows"
            : SKEL_GRID_SHAPES.has(shape)
              ? "grid"
              : "rows";
        const max = isChart ? Math.max(...numeric.map(Math.abs), 1) : 1;
        return (
          <div key={key} className="gu-gskel__list" data-layout={layout} data-count={list.length}>
            {list.map((row, i) => {
              const growing = li === lastList && i === list.length - 1;
              if (isChart) {
                return (
                  <motion.span
                    key={i}
                    className="gu-gskel__col"
                    style={{ height: `${Math.max(8, (Math.abs(numeric[i]) / max) * 100)}%` }}
                    aria-hidden="true"
                    {...skelMotion(growing, reduce)}
                  />
                );
              }
              return (
                <motion.div key={i} className="gu-gskel__cell" {...skelMotion(growing, reduce)}>
                  {isPlainObject(row) ? (
                    <SkelFields value={row} />
                  ) : Array.isArray(row) ? (
                    <span className="gu-gskel__line">
                      {row.map((cell, ci) => (
                        <SkelText key={ci} text={String(cell ?? "")} />
                      ))}
                    </span>
                  ) : (
                    <SkelText text={String(row)} />
                  )}
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

const REGION_FADE = { duration: 0.22, ease: "easeOut" } as const;

/**
 * Render-aware region tracking the component lifecycle:
 * `pending -> streaming -> mounting -> ready` (plus `error` and `cancelled`).
 * The shaped skeleton stays visible until the real component is mounted AND
 * any required async dependencies report ready.
 */
function GuRegion({
  name,
  lifecycle,
  children,
}: {
  name: string;
  lifecycle: MistlineLifecycleState;
  children: ReactNode;
}) {
  const ready = lifecycle === "ready";
  const reduce = useReducedMotion();
  const fade = reduce ? { duration: 0 } : REGION_FADE;
  return (
    <motion.div
      className={`gu-region${ready ? " is-ready" : ""}`}
      data-lifecycle={lifecycle}
      data-component-region={name}
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: MOTION_VOCABULARY.durations.normal,
        ease: MOTION_VOCABULARY.easings.standard,
      }}
    >
      {/* popLayout lifts the leaving skeleton out of flow so the block fades in over it. */}
      <AnimatePresence initial={false} mode="popLayout">
        {!ready && (
          <motion.div
            key="skeleton"
            className="gu-region__skel"
            aria-hidden="true"
            exit={{ opacity: 0 }}
            transition={fade}
          >
            <MistlineBlockSkeleton name={name} lifecycle={lifecycle} />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        className="gu-region__body"
        initial={false}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={fade}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export interface MistlineBlockViewProps {
  block: MistlineBlock;
  streaming: boolean;
  cancelled?: boolean;
  surface: MistlineSurface;
  live: boolean;
  pull?: boolean;
  sources?: SourceItem[];
  onAction?: (a: MistlineAction) => void;
  onUiInteraction?: (interaction: UiInteractionPayload) => void;
  pinnedTitles?: Set<string>;
  onTogglePinItem?: (item: Omit<WorkspaceBoardItem, "id" | "columnId">) => void;
}

export const MistlineBlockView = memo(function MistlineBlockView({
  block,
  streaming,
  cancelled = false,
  surface,
  live,
  pull,
  sources,
  onAction,
  onUiInteraction,
  pinnedTitles,
  onTogglePinItem,
}: MistlineBlockViewProps) {
  const [mounted, setMounted] = useState(false);
  const blockName = block.kind === "ui" ? block.name : "Text";
  const needsAsyncReady =
    block.kind === "ui" && ASYNC_READY_COMPONENTS.has(blockName);
  const [asyncReady, setAsyncReady] = useState(!needsAsyncReady);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  // Safety timeout so an external slow/stalled optional asset never traps a region forever.
  useEffect(() => {
    if (!needsAsyncReady || asyncReady) return;
    const t = window.setTimeout(() => setAsyncReady(true), 12000);
    return () => window.clearTimeout(t);
  }, [needsAsyncReady, asyncReady, retryKey]);

  const handleReady = useCallback(() => {
    setAsyncReady(true);
  }, []);

  const handleError = useCallback((msg: string) => {
    setRegionError(msg || "Komponen gagal dimuat.");
  }, []);

  const handleRetry = useCallback(() => {
    setRegionError(null);
    setAsyncReady(!needsAsyncReady);
    setRetryKey((k) => k + 1);
  }, [needsAsyncReady]);

  if (block.kind === "text") {
    return (
      <div className={pull ? "momo-md-pull body" : "body"}>
        <MarkdownMessage
          text={block.text}
          sources={sources}
          isStreaming={streaming}
        />
      </div>
    );
  }

  const hasProps = Object.keys(block.props).length > 0;

  if (regionError) {
    return (
      <div
        className="gu gu-unknown gu-region-error"
        data-lifecycle="error"
        role="alert"
      >
        <span className="gu-pen momo-hand-title">gagal memuat</span>{" "}
        <code>{block.name}</code>
        <span className="gu-region-error__msg">{regionError}</span>
        <motion.button
          type="button"
          className="gu-btn-retry"
          whileHover={MH.chip}
          whileTap={MH.tap}
          transition={MH.spring}
          onClick={handleRetry}
        >
          Coba lagi
        </motion.button>
      </div>
    );
  }

  if (!hasProps || !block.complete) {
    if (cancelled) {
      return (
        <div className="gu gu-unknown" data-lifecycle="cancelled">
          <span className="gu-pen momo-hand-title">dibatalkan</span>{" "}
          <code>{block.name}</code>
        </div>
      );
    }
    if (streaming || !block.complete) {
      return <GenerativeSkeleton name={block.name} props={block.props} />;
    }
    return (
      <div className="gu gu-unknown" data-lifecycle="error" role="alert">
        <span className="gu-pen momo-hand-title">
          blok {block.name.toLowerCase()} tidak selesai
        </span>
      </div>
    );
  }

  const lifecycle: MistlineLifecycleState =
    !mounted || !asyncReady ? "mounting" : "ready";

  return (
    <MistlineBlockBoundary
      name={block.name}
      retryKey={retryKey}
      onRetry={handleRetry}
    >
      <GuRegion name={block.name} lifecycle={lifecycle}>
        <motion.div
          data-component={block.name}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: [0.2, 0.9, 0.3, 1] }}
        >
          <MistlineComponent
            key={retryKey}
            name={block.name}
            props={block.props}
            complete={block.complete}
            streaming={streaming}
            surface={surface}
            live={live}
            sources={sources}
            onAction={onAction}
            onUiInteraction={onUiInteraction}
            pinnedTitles={pinnedTitles}
            onTogglePinItem={onTogglePinItem}
            onReady={handleReady}
            onError={handleError}
          />
        </motion.div>
      </GuRegion>
    </MistlineBlockBoundary>
  );
});
