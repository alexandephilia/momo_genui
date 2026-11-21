"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Ban,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Columns2,
  Copy,
  CornerDownRight,
  Expand,
  Heart,
  LayoutGrid,
  Lightbulb,
  List as ListIcon,
  MapPin,
  Minus,
  Plus,
  Quote,
  RefreshCw,
  SlidersHorizontal,
  Snowflake,
  Star,
  Sun,
  WrapText,
} from "lucide-react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { renderInlineMarkdown } from "@/lib/renderInlineMarkdown";
import { normalizeMistlineComponentName } from "@/lib/mistlineParse";
import {
  InteractiveMapBlock,
  type InteractiveMapPin,
} from "@/components/cards/InteractiveMapBlock";
import {
  fetchVerifiedWebImages,
  lockVerifiedWorkingUrl,
  peekVerifiedWebImages,
  useResolvedWebImage,
} from "@/lib/clientImageCache";
import {
  buildProxiedImageUrl,
  deriveVisualContextAnchor,
  extractImageAssetStem,
  inferAssetFromUnknown,
  isAbstractNonVisualTitle,
  isGenericPlaceholderQuery,
  isLikelyImageUrl,
  isNonPhotographicLogoOrGraphic,
  isPhotographicImageUrl,
  normalizeImageDedupKey,
  pickSharpDisplayImageUrl,
  wantsExplicitLogoQuery,
  type ImageAssetStatus,
  type NormalizedImageAsset,
} from "@/lib/imageAssetContract";
import {
  recordVerifiedImageUrls,
  resolveVerifiedImageUrl,
} from "@/lib/verifiedImagePool";
import { repairOpenUiProps } from "@/lib/openui/propRepair";
import type {
  SourceItem,
  UiInteractionPayload,
  WorkspaceBoardItem,
} from "@/types/momo";
import { FullscreenPortalModal } from "./FullscreenPortalModal";
import {
  BoardStickerOverlay,
  boardTitleKey,
  useBoardItemStates,
} from "./BoardSticker";
import { MermaidRenderer } from "./MermaidRenderer";
import { hashString, inferContextualIcon, MistlineIcon } from "./MistlineIcons";
import { parseMermaidToGraph } from "@/lib/intelligence/mermaidToGraph";
import { getIntelComponent } from "@/lib/intelligence/registry";
import {
  bindNewsArticlesToSources,
  normalizeNewsArticles,
  type NewsArticle,
} from "@/lib/openui/newsBinding";
import { initializeIntelligenceUI } from "@/lib/intelligence/registerAll";
import { IntelVariantContext } from "@/components/intelligence/shared/IntelCardShell";
import {
  ActivePlate,
  CheckGlyph,
  INSTANT,
  MeterFill,
  PaintScope,
  SwitchThumb,
  switchTrack,
  tweenPaint,
} from "@/components/intelligence/shared/StateMotion";
import dynamic from "next/dynamic";

const IntelligenceGraphDynamic = dynamic(
  () => import("@/components/intelligence/graphs/IntelligenceGraph"),
  { ssr: false },
);

/* Intelligence chart components (lazy-loaded) */
const IntelLineChart = dynamic(
  () => import("@/components/intelligence/charts/LineChart"),
  { ssr: false },
);
const IntelBarChart = dynamic(
  () => import("@/components/intelligence/charts/BarChart"),
  { ssr: false },
);
const IntelDonutChart = dynamic(
  () => import("@/components/intelligence/charts/DonutChart"),
  { ssr: false },
);
const IntelAreaChart = dynamic(
  () => import("@/components/intelligence/charts/AreaChart"),
  { ssr: false },
);

export type MistlineSurface = "explore" | "chat" | "board";

export interface MistlineAction {
  type: "send";
  text: string;
}

export interface MistlineGenProps {
  props: Record<string, unknown>;
  complete: boolean;
  streaming: boolean;
  surface: MistlineSurface;
  live: boolean;
  sources?: SourceItem[];
  onAction?: (a: MistlineAction) => void;
  onUiInteraction?: (interaction: UiInteractionPayload) => void;
  pinnedTitles?: Set<string>;
  onTogglePinItem?: (item: Omit<WorkspaceBoardItem, "id" | "columnId">) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
}

export const str = (v: unknown, d = ""): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : d;

export const num = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v)))
    return Number(v);
  return undefined;
};

export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

const isSafeUrl = (v: string) => /^https?:\/\//i.test(v) || v.startsWith("/");

/** Renders bold/italic/code AND Momo interactive circular (1) (2) citations inside strings. */
export function MistlineInline({
  text,
  sources,
}: {
  text: string;
  sources?: SourceItem[];
}) {
  if (!text) return null;
  return <>{renderInlineMarkdown(text, sources)}</>;
}

function Heading({ text, sources }: { text: unknown; sources?: SourceItem[] }) {
  const t = str(text);
  return t ? (
    <h3 className="gu-title">
      <MistlineInline text={t} sources={sources} />
    </h3>
  ) : null;
}

export function MistlinePostcard({
  icon,
  ratio = "4/5",
  className = "",
}: {
  seed?: string;
  icon?: string;
  ratio?: string;
  className?: string;
}) {
  return (
    <span
      className={`ph pc ${className}`}
      style={{ aspectRatio: ratio }}
      aria-hidden="true"
    >
      <span className="pc__icon">
        <MistlineIcon name={icon || "image"} size={20} strokeWidth={1.6} />
      </span>
    </span>
  );
}

const TECHNICAL_ICONS = new Set([
  "bug",
  "code",
  "database",
  "cpu",
  "shield",
  "workflow",
  "compare",
  "shuffle",
  "scale",
]);

const MistlineBlockStreamContext = createContext<{
  complete: boolean;
  streaming: boolean;
}>({ complete: true, streaming: false });

export interface MistlineMediaContextValue {
  contextAnchor?: string;
  sources?: SourceItem[];
  registerSlotKeys: (slotId: string, urls: string[]) => void;
  unregisterSlotKeys: (slotId: string) => void;
  isUrlClaimedByOtherSlot: (slotId: string, url: string) => boolean;
}

const DEFAULT_MEDIA_CONTEXT: MistlineMediaContextValue = {
  registerSlotKeys: () => {},
  unregisterSlotKeys: () => {},
  isUrlClaimedByOtherSlot: () => false,
};

export const MistlineMediaContext = createContext<MistlineMediaContextValue>(
  DEFAULT_MEDIA_CONTEXT,
);

export function MistlineMediaScopeProvider({
  contextText,
  sources,
  children,
}: {
  contextText?: string;
  sources?: SourceItem[];
  children: ReactNode;
}) {
  const claimsRef = useRef<Map<string, Set<string>>>(new Map());
  const contextAnchor = useMemo(
    () => deriveVisualContextAnchor(contextText),
    [contextText],
  );

  const value = useMemo<MistlineMediaContextValue>(() => {
    const computeKeys = (urls: string[]): Set<string> => {
      const out = new Set<string>();
      for (const raw of urls) {
        const clean = (raw || "").trim();
        if (!clean) continue;
        out.add(normalizeImageDedupKey(clean));
        out.add(extractImageAssetStem(clean));
      }
      return out;
    };

    return {
      contextAnchor: contextAnchor || undefined,
      sources,
      registerSlotKeys: (slotId: string, urls: string[]) => {
        if (!slotId) return;
        claimsRef.current.set(slotId, computeKeys(urls));
      },
      unregisterSlotKeys: (slotId: string) => {
        if (!slotId) return;
        claimsRef.current.delete(slotId);
      },
      isUrlClaimedByOtherSlot: (slotId: string, url: string) => {
        const clean = (url || "").trim();
        if (!clean) return false;
        const kUrl = normalizeImageDedupKey(clean);
        const kStem = extractImageAssetStem(clean);
        for (const [otherSlot, keys] of claimsRef.current.entries()) {
          if (otherSlot === slotId) continue;
          if (keys.has(kUrl) || keys.has(kStem)) return true;
        }
        return false;
      },
    };
  }, [contextAnchor, sources]);

  return (
    <MistlineMediaContext.Provider value={value}>
      {children}
    </MistlineMediaContext.Provider>
  );
}

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const decodedImageUrlsMemory = new Set<string>();
function rememberDecodedImageUrl(url: string): void {
  if (!url) return;
  if (decodedImageUrlsMemory.size >= 600) {
    const oldest = decodedImageUrlsMemory.values().next().value;
    if (oldest) decodedImageUrlsMemory.delete(oldest);
  }
  decodedImageUrlsMemory.add(url);
}

/**
 * Persistent `HTMLImageElement` DOM node pool keyed by `slotKey` (e.g. `board-card-<id>`).
 * When a Pinboard card moves from Column -> Drag Portal -> Target Column, the exact same
 * GPU-decoded `HTMLImageElement` is reparented synchronously via `replaceChildren` inside
 * `useLayoutEffect` before paint — 0 network requests, 0 async-decode blank frames, 0 flicker.
 */
const persistentSlotImgPool = new Map<
  string,
  { src: string; el: HTMLImageElement; decoded: boolean }
>();

function sanitizeDirectImageUrl(raw?: string, queryContext?: string): string {
  const typed = (raw || "").trim();
  if (!typed || !isSafeUrl(typed)) return "";
  if (typed.startsWith("/api/image")) return typed;
  const clean = resolveVerifiedImageUrl(typed);
  if (!clean) return "";
  const allowLogo = wantsExplicitLogoQuery(queryContext);
  if (isNonPhotographicLogoOrGraphic(clean, "", undefined, allowLogo)) return "";
  if (!allowLogo && !isPhotographicImageUrl(clean)) return "";
  return clean;
}

export interface MistlinePhotoProps {
  src?: string;
  fallbackUrls?: string[];
  query?: string;
  fallbackQuery?: string;
  autoResolve?: boolean;
  excludeUrls?: string[];
  seed: string;
  icon?: string;
  ratio?: string;
  className?: string;
  slotKey?: string;
  skipClaimRegistration?: boolean;
  onLoaded?: () => void;
  onFailed?: () => void;
  onResolvedUrl?: (
    url: string,
    meta?: { sourceUrl?: string; caption?: string },
  ) => void;
}

const PHOTO_FADE = { duration: 0.45, ease: "easeOut" } as const;

function MistlinePhotoInner({
  src,
  fallbackUrls,
  query,
  fallbackQuery,
  autoResolve = false,
  excludeUrls,
  seed,
  icon,
  ratio = "4/5",
  className = "",
  slotKey,
  skipClaimRegistration = false,
  onLoaded,
  onFailed,
  onResolvedUrl,
}: MistlinePhotoProps) {
  const autoSlotId = useId();
  const slotId = slotKey || autoSlotId;
  const callbacksRef = useRef({ onLoaded, onFailed, onResolvedUrl });
  callbacksRef.current = { onLoaded, onFailed, onResolvedUrl };
  const reduceMotion = useReducedMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const { complete: blockComplete } = useContext(MistlineBlockStreamContext);
  const mediaCtx = useContext(MistlineMediaContext);
  const contextQueryHint = [query, fallbackQuery, seed].filter(Boolean).join(" ");
  const cleanSrc = useMemo(
    () => sanitizeDirectImageUrl(src, contextQueryHint),
    [src, contextQueryHint],
  );
  const [directFailed, setDirectFailed] = useState(false);

  useEffect(() => {
    setDirectFailed(false);
  }, [cleanSrc]);

  const activeDirectSrc = directFailed ? "" : cleanSrc;
  const safeFallbackSeed =
    /^(?:brd|it|item|col|msg|blk|card)[-_0-9a-z]+$/i.test(
      (seed || "").trim(),
    ) || isGenericPlaceholderQuery(seed || "")
      ? undefined
      : seed;

  const canAutoSeed = Boolean(
    autoResolve &&
    safeFallbackSeed &&
    !TECHNICAL_ICONS.has((icon || "").toLowerCase()) &&
    !isAbstractNonVisualTitle(safeFallbackSeed),
  );
  const wantsAutoQuery = Boolean(query || canAutoSeed);
  const effectiveQuery =
    !activeDirectSrc && wantsAutoQuery ? query || safeFallbackSeed : undefined;

  const safeFallbackProp =
    fallbackQuery &&
    !isGenericPlaceholderQuery(fallbackQuery) &&
    !isAbstractNonVisualTitle(fallbackQuery)
      ? fallbackQuery
      : undefined;

  const { candidateUrls, sourceUrl, caption, searching } = useResolvedWebImage({
    src: activeDirectSrc || undefined,
    query: effectiveQuery,
    fallbackQuery: safeFallbackProp,
    contextAnchor: mediaCtx.contextAnchor,
    sources: mediaCtx.sources,
    alt: safeFallbackSeed || query,
    enabled: Boolean(blockComplete && effectiveQuery),
  });

  const attemptUrls = useMemo(() => {
    const interleaved: string[] = [];
    const seen = new Set<string>();
    const addWithProxy = (u?: string) => {
      if (!u || !isSafeUrl(u)) return;
      if (!seen.has(u)) {
        seen.add(u);
        interleaved.push(u);
      }
      if (/^https?:\/\//i.test(u) && !u.startsWith("/api/image")) {
        const proxied = buildProxiedImageUrl(u);
        if (!seen.has(proxied)) {
          seen.add(proxied);
          interleaved.push(proxied);
        }
      }
    };
    const excludedKeys = new Set<string>();
    for (const eu of excludeUrls ?? []) {
      if (!eu) continue;
      excludedKeys.add(normalizeImageDedupKey(eu));
      excludedKeys.add(extractImageAssetStem(eu));
    }
    const isExcluded = (u: string) =>
      excludedKeys.has(normalizeImageDedupKey(u)) ||
      excludedKeys.has(extractImageAssetStem(u)) ||
      mediaCtx.isUrlClaimedByOtherSlot(slotId, u);

    if (activeDirectSrc) addWithProxy(activeDirectSrc);
    if (Array.isArray(fallbackUrls)) {
      for (const fb of fallbackUrls.slice(0, 5)) {
        if (!isExcluded(fb)) addWithProxy(fb);
      }
    }
    const filteredCandidates = candidateUrls.filter((c) => !isExcluded(c));
    for (const c of (filteredCandidates.length > 0
      ? filteredCandidates
      : candidateUrls
    ).slice(0, 5)) {
      addWithProxy(c);
    }
    return interleaved;
  }, [
    activeDirectSrc,
    fallbackUrls,
    candidateUrls,
    excludeUrls,
    mediaCtx,
    slotId,
  ]);

  const attemptSignature = attemptUrls.join("|");
  const [attemptState, setAttemptState] = useState<{
    sig: string;
    idx: number;
    failed: boolean;
  }>({ sig: attemptSignature, idx: 0, failed: false });
  const [loadedSrc, setLoadedSrc] = useState<string>("");

  const attemptIdx =
    attemptState.sig === attemptSignature ? attemptState.idx : 0;
  const failed =
    attemptState.sig === attemptSignature ? attemptState.failed : false;
  const activeSrc = attemptUrls[attemptIdx] || "";
  const isPreDecoded = Boolean(
    activeSrc &&
      (decodedImageUrlsMemory.has(activeSrc) ||
        (slotKey && persistentSlotImgPool.get(slotKey)?.src === activeSrc && persistentSlotImgPool.get(slotKey)?.decoded)),
  );
  const loaded = Boolean(activeSrc && (loadedSrc === activeSrc || isPreDecoded));

  const advanceOnImgErrorRef = useRef<() => void>(() => {});
  advanceOnImgErrorRef.current = () => {
    if (attemptIdx + 1 < attemptUrls.length) {
      setAttemptState({
        sig: attemptSignature,
        idx: attemptIdx + 1,
        failed: false,
      });
    } else if (cleanSrc && !directFailed && wantsAutoQuery) {
      setDirectFailed(true);
    } else {
      setAttemptState({
        sig: attemptSignature,
        idx: attemptIdx,
        failed: true,
      });
      callbacksRef.current.onFailed?.();
    }
  };

  const pooledHostRef = useRef<HTMLSpanElement | null>(null);

  useIsoLayoutEffect(() => {
    if (!slotKey || !activeSrc || failed) return;
    const host = pooledHostRef.current;
    if (!host) return;

    let entry = persistentSlotImgPool.get(slotKey);
    let img: HTMLImageElement;
    let ownsPoolEntry = false;

    if (entry && entry.src === activeSrc && !entry.el.isConnected) {
      img = entry.el;
      img.alt = seed || "";
      ownsPoolEntry = true;
    } else {
      img = document.createElement("img");
      img.alt = seed || "";
      img.loading = blockComplete ? "eager" : "lazy";
      img.decoding = decodedImageUrlsMemory.has(activeSrc) ? "sync" : "async";
      img.referrerPolicy = "no-referrer";
      img.draggable = false;
      img.src = activeSrc;

      if (!entry || entry.src !== activeSrc) {
        if (persistentSlotImgPool.size >= 240) {
          const oldestKey = persistentSlotImgPool.keys().next().value;
          if (oldestKey) persistentSlotImgPool.delete(oldestKey);
        }
        entry = {
          src: activeSrc,
          el: img,
          decoded: decodedImageUrlsMemory.has(activeSrc),
        };
        persistentSlotImgPool.set(slotKey, entry);
        ownsPoolEntry = true;
      }
    }

    const markReady = () => {
      if (ownsPoolEntry && entry) entry.decoded = true;
      rememberDecodedImageUrl(activeSrc);
      setLoadedSrc((prev) => (prev === activeSrc ? prev : activeSrc));
      callbacksRef.current.onLoaded?.();
      if (img.style.opacity !== "0") return;
      if (reduceMotionRef.current) img.style.opacity = "1";
      else animate(img, { opacity: 1 }, PHOTO_FADE);
    };

    host.replaceChildren(img);

    if ((ownsPoolEntry && entry?.decoded) || (img.complete && img.naturalWidth > 0)) {
      img.style.opacity = "1";
      markReady();
    } else {
      img.style.opacity = "0";
      img.onload = () => {
        if (typeof img.decode === "function") {
          img.decode().then(markReady).catch(markReady);
        } else {
          markReady();
        }
      };
      img.onerror = () => {
        if (ownsPoolEntry) persistentSlotImgPool.delete(slotKey);
        advanceOnImgErrorRef.current();
      };
    }

    return () => {
      img.onload = null;
      img.onerror = null;
      if (img.parentNode === host) {
        host.replaceChildren();
      }
    };
  }, [slotKey, activeSrc, failed, seed, blockComplete]);

  useEffect(() => {
    if (skipClaimRegistration || !activeSrc) return;
    mediaCtx.registerSlotKeys(slotId, [activeSrc]);
    return () => {
      mediaCtx.unregisterSlotKeys(slotId);
    };
  }, [activeSrc, mediaCtx, skipClaimRegistration, slotId]);

  useEffect(() => {
    if (loaded && activeSrc) {
      if (effectiveQuery && !activeDirectSrc) {
        lockVerifiedWorkingUrl(
          effectiveQuery,
          activeSrc,
          safeFallbackProp,
          mediaCtx.contextAnchor,
        );
      }
      recordVerifiedImageUrls([activeSrc, sourceUrl]);
      callbacksRef.current.onResolvedUrl?.(activeSrc, { sourceUrl, caption });
    }
  }, [
    loaded,
    activeSrc,
    effectiveQuery,
    activeDirectSrc,
    safeFallbackProp,
    mediaCtx.contextAnchor,
    sourceUrl,
    caption,
  ]);

  // Allow sufficient time (6.5s) so valid high-res photos don't randomly rotate on refresh
  useEffect(() => {
    if (loaded || failed || !activeSrc) return;
    const hasMore = attemptIdx + 1 < attemptUrls.length;
    const canFallbackToSearch = Boolean(
      cleanSrc && !directFailed && wantsAutoQuery,
    );
    const delayMs = hasMore || canFallbackToSearch ? 6500 : 8000;
    const timer = window.setTimeout(() => {
      if (hasMore) {
        setAttemptState({
          sig: attemptSignature,
          idx: attemptIdx + 1 < attemptUrls.length ? attemptIdx + 1 : attemptIdx,
          failed: false,
        });
      } else if (canFallbackToSearch) {
        setDirectFailed(true);
      } else {
        setAttemptState({ sig: attemptSignature, idx: attemptIdx, failed: true });
        callbacksRef.current.onFailed?.();
      }
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [
    loaded,
    failed,
    activeSrc,
    attemptSignature,
    attemptIdx,
    attemptUrls.length,
    cleanSrc,
    directFailed,
    wantsAutoQuery,
  ]);

  // Notify parent AsyncImage/GuRegion immediately if search yielded zero candidates
  useEffect(() => {
    if (blockComplete && !searching && !activeSrc && !loaded && !failed) {
      callbacksRef.current.onFailed?.();
    }
  }, [blockComplete, searching, activeSrc, loaded, failed]);

  // Hold uninterrupted skeleton shimmer while block streams or while /api/image resolves
  if (!activeSrc && (searching || !blockComplete)) {
    return (
      <span
        className={`ph is-searching ${className}`}
        style={{ aspectRatio: ratio }}
        aria-busy="true"
      />
    );
  }

  if (!activeSrc || failed) {
    return (
      <MistlinePostcard
        seed={seed}
        icon={icon}
        ratio={ratio}
        className={className}
      />
    );
  }

  if (slotKey) {
    return (
      <span
        ref={pooledHostRef}
        className={`ph ${className}${loaded ? " is-loaded" : " is-searching"}${isPreDecoded ? " is-instant" : ""}`}
        style={{ aspectRatio: ratio }}
        aria-busy={!loaded || undefined}
      />
    );
  }

  return (
    <span
      className={`ph ${className}${loaded ? " is-loaded" : " is-searching"}${isPreDecoded ? " is-instant" : ""}`}
      style={{ aspectRatio: ratio }}
      aria-busy={!loaded || undefined}
    >
      <motion.img
        key={activeSrc}
        src={activeSrc}
        alt={seed || ""}
        loading={blockComplete ? "eager" : "lazy"}
        decoding={isPreDecoded ? "sync" : "async"}
        referrerPolicy="no-referrer"
        draggable={false}
        initial={{ opacity: loaded ? 1 : 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={reduceMotion || isPreDecoded ? INSTANT : PHOTO_FADE}
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0 && !loaded) {
            rememberDecodedImageUrl(activeSrc);
            setLoadedSrc(activeSrc);
            callbacksRef.current.onLoaded?.();
          }
        }}
        onLoad={(e) => {
          const img = e.currentTarget;
          const finish = () => {
            rememberDecodedImageUrl(activeSrc);
            setLoadedSrc(activeSrc);
            callbacksRef.current.onLoaded?.();
          };
          if (typeof img.decode === "function") {
            img.decode().then(finish).catch(finish);
          } else {
            finish();
          }
        }}
        onError={() => advanceOnImgErrorRef.current()}
      />
    </span>
  );
}

export const MistlinePhoto = memo(
  MistlinePhotoInner,
  (prev, next) =>
    prev.src === next.src &&
    prev.query === next.query &&
    prev.fallbackQuery === next.fallbackQuery &&
    prev.autoResolve === next.autoResolve &&
    prev.seed === next.seed &&
    prev.icon === next.icon &&
    prev.ratio === next.ratio &&
    prev.className === next.className &&
    prev.slotKey === next.slotKey &&
    prev.skipClaimRegistration === next.skipClaimRegistration &&
    (prev.fallbackUrls?.join("|") || "") === (next.fallbackUrls?.join("|") || "") &&
    (prev.excludeUrls?.join("|") || "") === (next.excludeUrls?.join("|") || ""),
);

function Headline({ props, sources }: MistlineGenProps) {
  const align = str(props.align) === "center" ? "center" : "left";
  const variant = str(props.variant, "default");
  const image = str(props.image);
  const imageQuery = str(props.imageQuery);
  const showSideThumb = variant === "split" && Boolean(image || imageQuery);
  return (
    <header
      className="gu gu-headline"
      data-align={align}
      data-variant={variant}
    >
      <div className="gu-headline__main">
        {str(props.kicker) && <p className="gu-kicker">{str(props.kicker)}</p>}
        <h2 className="gu-headline__title momo-serif">
          {str(props.title) ? (
            <MistlineInline text={str(props.title)} sources={sources} />
          ) : (
            "\u00a0"
          )}
        </h2>
        {str(props.subtitle) && (
          <p className="gu-headline__sub">
            <MistlineInline text={str(props.subtitle)} sources={sources} />
          </p>
        )}
      </div>
      {showSideThumb && (
        <div className="gu-headline__thumb">
          <MistlinePhoto
            src={image || undefined}
            query={imageQuery || undefined}
            seed={str(props.title)}
            icon="sparkles"
            ratio="16/10"
          />
        </div>
      )}
    </header>
  );
}

function CardsComp({
  props,
  complete,
  surface,
  live,
  sources,
  onAction,
  onUiInteraction,
  pinnedTitles,
  onTogglePinItem,
}: MistlineGenProps) {
  const allItems = arr(props.items ?? props.cards)
    .map((raw): Record<string, unknown> => {
      if (typeof raw === "string" || typeof raw === "number") {
        return { title: String(raw).trim() };
      }
      const it = rec(raw);
      const resolvedTitle =
        str(it.title) || str(it.label) || str(it.name) || str(it.headline);
      const resolvedBody =
        str(it.body) ||
        str(it.description) ||
        str(it.detail) ||
        str(it.summary) ||
        str(it.text);
      return {
        ...it,
        ...(resolvedTitle ? { title: resolvedTitle } : {}),
        ...(resolvedBody && !str(it.body) ? { body: resolvedBody } : {}),
      };
    })
    .filter((it) => str(it.title));
  // Mixed-media Cards: if any item carries a photo, every sibling gets a search query
  // so no card renders text-only next to photos. Cards whose photo then fails keep a
  // tinted icon tile in the media slot (mediaSet below) instead of collapsing shorter.
  const mediaSet = allItems.some((it) => str(it.image) || str(it.imageQuery));
  if (mediaSet) {
    for (const it of allItems) {
      if (!str(it.image) && !str(it.imageQuery)) {
        it.imageQuery = [str(it.title), str(it.subtitle)]
          .filter(Boolean)
          .join(" ");
      }
    }
  }
  const raw = str(props.variant) || str(props.layout);
  const defaultLayout = ["feature", "grid", "row", "list"].includes(raw)
    ? raw
    : "grid";
  const [viewMode, setViewMode] = useState<string>(defaultLayout);
  useEffect(() => {
    setViewMode(defaultLayout);
  }, [defaultLayout]);
  const [activeTag, setActiveTag] = useState<string>("all");
  const [resolvedUrls, setResolvedUrls] = useState<
    Record<string, { url: string; sourceUrl?: string; caption?: string }>
  >({});
  const [failedMedia, setFailedMedia] = useState<Record<string, true>>({});
  const markMediaFailed = (title: string) =>
    setFailedMedia((prev) => (prev[title] ? prev : { ...prev, [title]: true }));
  const [lightboxItem, setLightboxItem] = useState<{
    src: string;
    alt: string;
    caption?: string;
    sourceUrl?: string;
  } | null>(null);

  const tags = useMemo(() => {
    const uniq = new Set<string>();
    for (const it of allItems) {
      const t = str(it.tag);
      if (t) uniq.add(t);
    }
    return Array.from(uniq);
  }, [allItems]);

  const items = useMemo(() => {
    if (activeTag === "all") return allItems;
    return allItems.filter((it) => str(it.tag) === activeTag);
  }, [allItems, activeTag]);

  const layout = viewMode;

  const triggerCardPrompt = (it: Record<string, unknown>) => {
    if (!live) return;
    const title = str(it.title);
    const prompt =
      str(it.prompt) ||
      `Jelaskan detail, jam/harga relevan, dan tips praktis untuk "${title}".`;
    if (onUiInteraction) {
      onUiInteraction({
        blockType: "cards",
        action: "inspect_card",
        label: title,
        value: {
          subtitle: str(it.subtitle),
          tag: str(it.tag),
          meta: str(it.meta),
        },
        prompt,
      });
    } else {
      onAction?.({ type: "send", text: prompt });
    }
  };

  const boardStickers = useBoardItemStates();
  const stickerStateFor = (it: Record<string, unknown>) =>
    boardStickers.get(boardTitleKey(str(it.title)));

  const renderPinBtn = (it: Record<string, unknown>, resolvedUrl?: string) => {
    if (!onTogglePinItem) return null;
    const title = str(it.title);
    const isPinned = pinnedTitles?.has(title.trim().toLowerCase());
    return (
      <motion.button
        type="button"
        className={`gu-icon-btn gu-card-pin-btn${isPinned ? " is-pinned" : ""}`}
        aria-label={
          isPinned ? `Hapus ${title} dari board` : `Simpan ${title} ke board`
        }
        title={isPinned ? "Tersimpan di Board" : "Simpan ke Board"}
        whileTap={{ scale: 0.88 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePinItem({
            title,
            subtitle: str(it.subtitle) || str(it.tag) || undefined,
            handNote: str(it.note) || str(it.body) || undefined,
            metric: str(it.meta) || undefined,
            imageUrl: resolvedUrl || str(it.image) || undefined,
            imageQuery: str(it.imageQuery) || title,
            pin: "heart",
          });
        }}
      >
        <Heart size={11} fill={isPinned ? "currentColor" : "none"} />
      </motion.button>
    );
  };

  const headerBar = (str(props.title) ||
    tags.length >= 2 ||
    defaultLayout !== "row") && (
    <div className="gu-cards__head">
      <div className="gu-cards__head-top">
        <Heading text={props.title} sources={sources} />
        {defaultLayout !== "row" && allItems.length > 1 && (
          <div
            className="gu-view-switch"
            role="group"
            aria-label="Ubah tampilan kartu"
          >
            <motion.button
              type="button"
              className={`gu-icon-btn${layout !== "list" ? " is-active" : ""}`}
              aria-label="Tampilan grid"
              title="Tampilan grid"
              whileHover={MH.icon}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() =>
                setViewMode(defaultLayout === "list" ? "grid" : defaultLayout)
              }
            >
              <LayoutGrid size={13} />
            </motion.button>
            <motion.button
              type="button"
              className={`gu-icon-btn${layout === "list" ? " is-active" : ""}`}
              aria-label="Tampilan daftar"
              title="Tampilan daftar"
              whileHover={MH.icon}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() => setViewMode("list")}
            >
              <ListIcon size={13} />
            </motion.button>
          </div>
        )}
      </div>
      {tags.length >= 2 && (
        <div
          className="gu-filter-row"
          role="tablist"
          aria-label="Filter kategori"
        >
          <motion.button
            type="button"
            className={`gu-filter-chip${activeTag === "all" ? " is-active" : ""}`}
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => setActiveTag("all")}
          >
            Semua ({allItems.length})
          </motion.button>
          {tags.map((tag) => (
            <motion.button
              key={tag}
              type="button"
              className={`gu-filter-chip${activeTag === tag ? " is-active" : ""}`}
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );

  const lightboxModal = lightboxItem && (
    <FullscreenPortalModal
      open={Boolean(lightboxItem)}
      onClose={() => setLightboxItem(null)}
      title={lightboxItem.alt}
      subtitle={lightboxItem.caption}
      variant="media"
    >
      <div className="gu-fs-media-wrap">
        <img
          src={lightboxItem.src}
          alt={lightboxItem.alt}
          className="gu-fs-media-img"
        />
        {lightboxItem.sourceUrl && isSafeUrl(lightboxItem.sourceUrl) && (
          <motion.a
            href={lightboxItem.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gu-pill-btn"
            whileTap={MH.tap}
            transition={MH.spring}
          >
            Buka sumber gambar ↗
          </motion.a>
        )}
      </div>
    </FullscreenPortalModal>
  );

  if (allItems.length === 0 && complete) {
    return null;
  }

  if (layout === "list") {
    return (
      <section
        className="gu gu-cards"
        data-surface={surface}
        data-layout={layout}
      >
        {headerBar}
        <ul className="gu-rows">
          {items.map((it, i) => {
            const title = str(it.title);
            const resolved = resolvedUrls[title];
            const hasPhoto = Boolean(
              (str(it.image) || str(it.imageQuery) || resolved?.url) &&
                !failedMedia[title],
            );
            const sticker = stickerStateFor(it);
            return (
              <motion.li
                className={`gu-rows__row${live ? " is-interactive" : ""}${sticker?.done ? " is-done" : ""}`}
                key={`row-${i}`}
                whileHover={live ? MH.row : undefined}
                whileTap={live ? MH.tap : undefined}
                transition={MH.spring}
                onClick={() => triggerCardPrompt(it)}
              >
                <BoardStickerOverlay state={sticker} />
                {hasPhoto ? (
                  <MistlinePhoto
                    src={str(it.image) || undefined}
                    query={str(it.imageQuery) || undefined}
                    autoResolve={Boolean(str(it.imageQuery))}
                    seed={title}
                    icon={str(it.icon)}
                    ratio="1/1"
                    className="print print--thumb"
                    onFailed={() => markMediaFailed(title)}
                    onResolvedUrl={(url, meta) =>
                      setResolvedUrls((prev) =>
                        prev[title]?.url === url
                          ? prev
                          : { ...prev, [title]: { url, ...meta } },
                      )
                    }
                  />
                ) : (
                  <span className="gu-rows__icon">
                    <MistlineIcon
                      name={str(it.icon) || inferContextualIcon(title)}
                      size={20}
                      strokeWidth={1.65}
                    />
                  </span>
                )}
                <span className="gu-rows__text">
                  <span className="gu-rows__name">
                    {title}
                    {str(it.subtitle) && (
                      <span className="gu-rows__sub">
                        {" "}
                        · {str(it.subtitle)}
                      </span>
                    )}
                  </span>
                  {str(it.body) && (
                    <span className="gu-rows__body">
                      <MistlineInline text={str(it.body)} sources={sources} />
                    </span>
                  )}
                  {str(it.note) && (
                    <span className="gu-pen gu-pen--inline momo-hand-title">
                      {str(it.note)}
                    </span>
                  )}
                </span>
                <span className="gu-rows__aside">
                  {str(it.meta) && (
                    <span className="gu-rows__meta">{str(it.meta)}</span>
                  )}
                  {str(it.tag) && <span className="gu-tag">{str(it.tag)}</span>}
                  {renderPinBtn(it, resolved?.url)}
                </span>
              </motion.li>
            );
          })}
          {!complete && (
            <li key="ghost-row" className="gu-rows__row is-ghost" />
          )}
        </ul>
        {lightboxModal}
      </section>
    );
  }

  const hasSiblingMeta = items.some((it) => Boolean(str(it.meta)));
  const hasSiblingArea = items.some((it) =>
    Boolean(str(it.subtitle) || str(it.tag)),
  );
  const hasSiblingBody = items.some((it) => Boolean(str(it.body)));

  if (layout === "row") {
    const stripCount = items.length + (!complete ? 1 : 0);
    return (
      <section
        className="gu gu-cards"
        data-surface={surface}
        data-layout={layout}
      >
        {headerBar}
        <div className="gu-strip" data-count={stripCount}>
          {items.map((it, i) => {
            const title = str(it.title);
            const resolved = resolvedUrls[title];
            const siblingUrls = Object.entries(resolvedUrls)
              .filter(([k]) => k !== title)
              .map(([, v]) => v?.url)
              .filter((u): u is string => Boolean(u));
            const explicitImg = str(it.image) || undefined;
            const queryText = str(it.imageQuery) || undefined;
            const fallbackText = str(props.title)
              ? `${title} ${str(props.title)}`
              : title;
            const hasMedia = Boolean(
              (explicitImg || queryText || resolved?.url) && !failedMedia[title],
            );
            const showBlankTile = !hasMedia && mediaSet;
            const sticker = stickerStateFor(it);
            return (
              <motion.figure
                className={`gu-strip__item${live ? " is-interactive" : ""}${sticker?.done ? " is-done" : ""}`}
                whileHover={live ? MH.card : undefined}
                whileTap={live ? MH.press : undefined}
                transition={MH.spring}
                key={`strip-${i}`}
                onClick={() => triggerCardPrompt(it)}
              >
                <BoardStickerOverlay state={sticker} />
                {hasMedia ? (
                  <div className="gu-place__media">
                    <MistlinePhoto
                      src={explicitImg}
                      query={queryText}
                      fallbackQuery={fallbackText}
                      excludeUrls={siblingUrls}
                      autoResolve={Boolean(queryText)}
                      seed={title}
                      icon={str(it.icon)}
                      ratio="16/10"
                      className="print"
                      onFailed={() => markMediaFailed(title)}
                      onResolvedUrl={(url, meta) =>
                        setResolvedUrls((prev) =>
                          prev[title]?.url === url
                            ? prev
                            : { ...prev, [title]: { url, ...meta } },
                        )
                      }
                    />
                    <div className="gu-place__actions">
                      {(resolved?.url || str(it.image)) && (
                        <motion.button
                          type="button"
                          className="gu-icon-btn gu-place__zoom"
                          whileHover={MH.icon}
                          whileTap={MH.tap}
                          transition={MH.spring}
                          aria-label={`Perbesar foto ${title}`}
                          title="Perbesar foto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxItem({
                              src: resolved?.url || str(it.image),
                              alt: title,
                              caption:
                                resolved?.caption ||
                                str(it.body) ||
                                str(it.subtitle),
                              sourceUrl: resolved?.sourceUrl,
                            });
                          }}
                        >
                          <Expand size={11} />
                        </motion.button>
                      )}
                      {renderPinBtn(it, resolved?.url)}
                    </div>
                  </div>
                ) : showBlankTile ? (
                  <div
                    className="gu-place__media gu-place__media--blank"
                    style={{ aspectRatio: "16/10" }}
                    aria-hidden="true"
                  >
                    <MistlineIcon
                      name={
                        str(it.icon) ||
                        inferContextualIcon(`${title} ${str(it.subtitle)}`)
                      }
                      size={24}
                      strokeWidth={1.35}
                    />
                  </div>
                ) : null}
                <figcaption className="gu-strip__body">
                  <div className="gu-strip__head">
                    <span className="gu-strip__name" title={title}>
                      {title}
                    </span>
                    {str(it.meta) && (
                      <span className="gu-strip__meta" title={str(it.meta)}>
                        {str(it.meta)}
                      </span>
                    )}
                  </div>
                  {str(it.subtitle) || str(it.tag) ? (
                    <div className="gu-strip__area">
                      {str(it.subtitle) && (
                        <span
                          className="gu-place__loc"
                          title={str(it.subtitle)}
                        >
                          <MistlineIcon
                            name={
                              str(it.icon) ||
                              (hasMedia
                                ? "pin"
                                : inferContextualIcon(
                                    `${title} ${str(it.subtitle)}`,
                                  ))
                            }
                            size={11}
                            strokeWidth={1.85}
                          />
                          <span>{str(it.subtitle)}</span>
                        </span>
                      )}
                      {str(it.tag) && (
                        <span className="gu-tag">{str(it.tag)}</span>
                      )}
                    </div>
                  ) : hasSiblingArea ? (
                    <div className="gu-strip__area" aria-hidden="true" />
                  ) : null}
                  {str(it.body) ? (
                    <p className="gu-strip__desc">
                      <MistlineInline text={str(it.body)} sources={sources} />
                    </p>
                  ) : hasSiblingBody ? (
                    <p className="gu-strip__desc" aria-hidden="true" />
                  ) : null}
                  {(str(it.note) || live) && (
                    <div className="gu-strip__foot">
                      {str(it.note) && (
                        <span className="gu-pen momo-hand-title">
                          {str(it.note)}
                        </span>
                      )}
                      {live && (
                        <span className="gu-place__cue" aria-hidden="true">
                          Dalami <ArrowRight size={11} />
                        </span>
                      )}
                    </div>
                  )}
                </figcaption>
              </motion.figure>
            );
          })}
          {!complete && (
            <figure key="ghost-strip" className="gu-strip__item is-ghost" />
          )}
        </div>
        {lightboxModal}
      </section>
    );
  }

  const renderPlaceCard = (
    it: Record<string, unknown>,
    i: number,
    opts: { hero?: boolean; secondary?: boolean } = {},
  ) => {
    const hero = Boolean(opts.hero);
    const secondary = Boolean(opts.secondary);
    const title = str(it.title);
    const resolved = resolvedUrls[title];
    const siblingUrls = Object.entries(resolvedUrls)
      .filter(([k]) => k !== title)
      .map(([, v]) => v?.url)
      .filter((u): u is string => Boolean(u));
    const explicitImg = str(it.image) || undefined;
    const queryText = str(it.imageQuery) || undefined;
    const fallbackText = str(props.title)
      ? `${title} ${str(props.title)}`
      : title;
    const cardRatio = hero || secondary ? "4/3" : "16/10";
    const hasMedia = Boolean(
      (explicitImg || queryText || resolved?.url) && !failedMedia[title],
    );
    // In a set that carries photos, a card whose photo failed keeps the media slot as a
    // tinted icon tile — uniform anatomy instead of a collapsed, shorter sibling.
    const showBlankTile = !hasMedia && mediaSet;

    const sticker = stickerStateFor(it);
    return (
      <motion.li
        className={`gu-place${hero ? " is-hero" : ""}${secondary ? " is-secondary" : ""}${live ? " is-interactive" : ""}${sticker?.done ? " is-done" : ""}`}
        whileHover={live ? MH.card : undefined}
        whileTap={live ? MH.press : undefined}
        transition={MH.spring}
        key={`place-${i}`}
        onClick={() => triggerCardPrompt(it)}
      >
        <BoardStickerOverlay state={sticker} />
        {hasMedia ? (
          <div className="gu-place__media">
            <MistlinePhoto
              src={explicitImg}
              query={queryText}
              fallbackQuery={fallbackText}
              excludeUrls={siblingUrls}
              autoResolve={Boolean(queryText)}
              seed={title}
              icon={str(it.icon)}
              ratio={cardRatio}
              className="print"
              onFailed={() => markMediaFailed(title)}
              onResolvedUrl={(url, meta) =>
                setResolvedUrls((prev) =>
                  prev[title]?.url === url
                    ? prev
                    : { ...prev, [title]: { url, ...meta } },
                )
              }
            />
            {str(it.tag) && (
              <span className="gu-place__glass-tag">
                {str(it.tag).replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").trim()}
              </span>
            )}
            {!secondary && (
              <div className="gu-place__actions">
                {(resolved?.url || str(it.image)) && (
                  <motion.button
                    type="button"
                    className="gu-icon-btn gu-place__zoom"
                    whileHover={MH.icon}
                    whileTap={MH.tap}
                    transition={MH.spring}
                    aria-label={`Perbesar foto ${title}`}
                    title="Perbesar foto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxItem({
                        src: resolved?.url || str(it.image),
                        alt: title,
                        caption:
                          resolved?.caption || str(it.body) || str(it.subtitle),
                        sourceUrl: resolved?.sourceUrl,
                      });
                    }}
                  >
                    <Expand size={11} />
                  </motion.button>
                )}
                {renderPinBtn(it, resolved?.url)}
              </div>
            )}
          </div>
        ) : showBlankTile ? (
          <div
            className="gu-place__media gu-place__media--blank"
            style={{ aspectRatio: cardRatio }}
            aria-hidden="true"
          >
            <MistlineIcon
              name={
                str(it.icon) ||
                inferContextualIcon(`${title} ${str(it.subtitle)}`)
              }
              size={26}
              strokeWidth={1.35}
            />
            {str(it.tag) && (
              <span className="gu-place__glass-tag">
                {str(it.tag).replace(/[\p{Extended_Pictographic}️\u200D]/gu, "").trim()}
              </span>
            )}
          </div>
        ) : null}
        {(str(it.subtitle) || str(it.meta)) && (
          <div className="gu-place__spec-strip">
            {str(it.subtitle) && (
              <div className="gu-place__spec-cell">
                <span className="gu-place__spec-k">Area</span>
                <span className="gu-place__spec-v" title={str(it.subtitle)}>
                  {str(it.subtitle)}
                </span>
              </div>
            )}
            {str(it.meta) && (
              <div className="gu-place__spec-cell">
                <span className="gu-place__spec-k">Info</span>
                <span className="gu-place__spec-v is-mono" title={str(it.meta)}>
                  {str(it.meta)}
                </span>
              </div>
            )}
          </div>
        )}
        <div className="gu-place__body">
          <div className="gu-place__title-row">
            <span className="gu-place__name" title={title}>
              {!hasMedia && !showBlankTile && !str(it.subtitle) && str(it.icon) && (
                <span
                  style={{
                    display: "inline-flex",
                    verticalAlign: "-2px",
                    marginRight: 6,
                    color: "var(--gu-ink-3)",
                  }}
                >
                  <MistlineIcon
                    name={str(it.icon)}
                    size={13}
                    strokeWidth={1.85}
                  />
                </span>
              )}
              {title}
            </span>
            {!hasMedia && !showBlankTile && str(it.tag) && (
              <span className="gu-tag">{str(it.tag)}</span>
            )}
          </div>
          {str(it.body) ? (
            <span className="gu-place__about">
              <MistlineInline text={str(it.body)} sources={sources} />
            </span>
          ) : !hero && !secondary && hasSiblingBody ? (
            <span className="gu-place__about" aria-hidden="true" />
          ) : null}
        </div>
        {(str(it.note) || (live && !secondary)) && (
          <div className="gu-place__foot">
            {str(it.note) && (
              <span className="gu-pen momo-hand-title">{str(it.note)}</span>
            )}
            {live && !secondary && (
              <span className="gu-place__cue" aria-hidden="true">
                Dalami <ArrowRight size={12} />
              </span>
            )}
          </div>
        )}
      </motion.li>
    );
  };

  if (layout === "feature") {
    const heroItem = items[0];
    const remaining = items.slice(1);
    const sideItems = items.length >= 5 ? remaining.slice(0, 2) : remaining;
    const extraItems = items.length >= 5 ? remaining.slice(2) : [];
    const useFullSideCard = items.length === 2 && complete;
    const featureCount = items.length + (!complete && items.length < 5 ? 1 : 0);

    return (
      <section
        className="gu gu-cards"
        data-surface={surface}
        data-layout="feature"
      >
        {headerBar}
        {items.length > 0 && (
          <>
            <div className="gu-places-feature" data-count={featureCount}>
              <ul className="gu-places-feature__main" role="list">
                {heroItem && renderPlaceCard(heroItem, 0, { hero: true })}
              </ul>
              {(sideItems.length > 0 || !complete) && (
                <ul className="gu-places-feature__side" role="list">
                  {sideItems.map((it, idx) =>
                    renderPlaceCard(it, idx + 1, {
                      secondary: !useFullSideCard,
                    }),
                  )}
                  {!complete && items.length < 5 && (
                    <li
                      key="ghost-place"
                      className={`gu-place is-ghost${!useFullSideCard ? " is-secondary" : ""}`}
                    />
                  )}
                </ul>
              )}
            </div>
            {(extraItems.length > 0 || (!complete && items.length >= 5)) && (
              <ul
                className="gu-places gu-places--feature-extra"
                data-layout="grid"
                data-count={extraItems.length + (!complete ? 1 : 0)}
              >
                {extraItems.map((it, idx) => renderPlaceCard(it, idx + 3, {}))}
                {!complete && (
                  <li key="ghost-extra" className="gu-place is-ghost" />
                )}
              </ul>
            )}
          </>
        )}
        {lightboxModal}
      </section>
    );
  }

  const gridCount = items.length + (!complete ? 1 : 0);
  return (
    <section
      className="gu gu-cards"
      data-surface={surface}
      data-layout={layout}
    >
      {headerBar}
      <ul className="gu-places" data-layout={layout} data-count={gridCount}>
        {items.map((it, i) => renderPlaceCard(it, i, {}))}
        {!complete && <li key="ghost-place" className="gu-place is-ghost" />}
      </ul>
      {lightboxModal}
    </section>
  );
}

function Plan({
  props,
  complete,
  live,
  sources,
  onAction,
  onUiInteraction,
  pinnedTitles,
  onTogglePinItem,
}: MistlineGenProps) {
  const days = arr(props.days ?? props.phases ?? props.items)
    .map(rec)
    .map((d): Record<string, unknown> => ({
      ...d,
      label: str(d.label) || str(d.day) || str(d.phase),
      items: arr(d.items ?? d.activities ?? d.steps ?? d.tasks).map(
        (raw): Record<string, unknown> =>
          typeof raw === "string" || typeof raw === "number"
            ? { title: String(raw).trim() }
            : {
                ...rec(raw),
                title:
                  str(rec(raw).title) ||
                  str(rec(raw).label) ||
                  str(rec(raw).name) ||
                  str(rec(raw).text),
              },
      ),
    }))
    .filter((d) => str(d.label) || str(d.title) || arr(d.items).length > 0);
  const [selectedDay, setSelectedDay] = useState<number>(-1);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const reduce = useReducedMotion();
  const visibleDays =
    selectedDay >= 0 && selectedDay < days.length
      ? [{ day: days[selectedDay], idx: selectedDay }]
      : days.map((day, idx) => ({ day, idx }));

  if (days.length === 0 && complete) {
    return null;
  }

  const triggerStop = (title: string, dayLabel: string) => {
    if (!live) return;
    const prompt = `Jelaskan rute praktis, estimasi durasi, dan tips di sekitar "${title}" (${dayLabel}).`;
    if (onUiInteraction) {
      onUiInteraction({
        blockType: "plan",
        action: "inspect_stop",
        label: title,
        value: { day: dayLabel },
        prompt,
      });
    } else {
      onAction?.({ type: "send", text: prompt });
    }
  };

  return (
    <section
      className="gu gu-itin"
      data-variant={str(props.variant, "default")}
    >
      <div className="gu-itin__top">
        <Heading text={props.title} sources={sources} />
        {days.length > 1 && (
          <div
            className="gu-filter-row"
            role="tablist"
            aria-label="Filter hari"
          >
            <motion.button
              type="button"
              className={`gu-filter-chip${selectedDay === -1 ? " is-active" : ""}`}
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() => setSelectedDay(-1)}
            >
              Semua ({days.length})
            </motion.button>
            {days.map((d, i) => (
              <motion.button
                key={`daytab-${i}`}
                type="button"
                className={`gu-filter-chip${selectedDay === i ? " is-active" : ""}`}
                whileHover={MH.chip}
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={() => setSelectedDay(i)}
              >
                {str(d.label) || `Day ${i + 1}`}
              </motion.button>
            ))}
          </div>
        )}
      </div>
      {visibleDays.map(({ day: d, idx: i }) => {
        const dayLabel = str(d.label) || `Day ${i + 1}`;
        return (
          <div className="gu-itin__day" key={`day-${i}`}>
            <h4 className="gu-itin__head">
              <span className="gu-itin__label">{dayLabel}</span>
              {str(d.title) && <span>{str(d.title)}</span>}
            </h4>
            <ol className="gu-itin__rows">
              {arr(d.items)
                .map(rec)
                .filter((x) => str(x.title))
                .map((it, j) => {
                  const title = str(it.title);
                  const rowKey = `${i}-${j}`;
                  const isDone = Boolean(checked[rowKey]);
                  const isPinned = pinnedTitles?.has(
                    title.trim().toLowerCase(),
                  );
                  return (
                    <li
                      key={`item-${rowKey}`}
                      className={`gu-itin__item${isDone ? " is-done" : ""}`}
                    >
                      <div className="gu-itin__title-line">
                        <motion.button
                          type="button"
                          className={`gu-itin__check${isDone ? " is-done" : ""}`}
                          whileTap={MH.tap}
                          transition={MH.spring}
                          aria-label={
                            isDone
                              ? `Batal tandai ${title}`
                              : `Tandai ${title} selesai`
                          }
                          onClick={(e) => {
                            tweenPaint(e.currentTarget, reduce);
                            setChecked((prev) => ({
                              ...prev,
                              [rowKey]: !prev[rowKey],
                            }));
                          }}
                        >
                          <AnimatePresence initial={false}>
                            {isDone && (
                              <CheckGlyph key="check" size={11} strokeWidth={2.8} />
                            )}
                          </AnimatePresence>
                        </motion.button>
                        {str(it.time) && (
                          <span className="gu-itin__time">{str(it.time)}</span>
                        )}
                        <motion.button
                          type="button"
                          className="gu-itin__name-btn"
                          whileHover={MH.chip}
                          whileTap={MH.tap}
                          transition={MH.spring}
                          disabled={!live}
                          onClick={() => triggerStop(title, dayLabel)}
                        >
                          <MistlineInline text={title} sources={sources} />
                        </motion.button>
                        {onTogglePinItem && (
                          <motion.button
                            type="button"
                            className={`gu-icon-btn gu-itin__pin${isPinned ? " is-pinned" : ""}`}
                            whileHover={MH.icon}
                            whileTap={MH.tap}
                            transition={MH.spring}
                            aria-label={
                              isPinned
                                ? `Hapus ${title} dari board`
                                : `Simpan ${title} ke board`
                            }
                            onClick={() =>
                              onTogglePinItem({
                                title,
                                slot: [str(it.time), dayLabel]
                                  .filter(Boolean)
                                  .join(" · "),
                                handNote: str(it.note) || undefined,
                                pin: "sun",
                              })
                            }
                          >
                            <Heart
                              size={12}
                              fill={isPinned ? "currentColor" : "none"}
                            />
                          </motion.button>
                        )}
                      </div>
                      {str(it.note) && (
                        <span className="gu-pen gu-itin__note momo-hand-title">
                          <MistlineInline
                            text={str(it.note)}
                            sources={sources}
                          />
                        </span>
                      )}
                    </li>
                  );
                })}
            </ol>
          </div>
        );
      })}
      {live && days.length > 0 && (
        <div className="gu-plan-adjust">
          {[
            {
              label: "Buat lebih santai",
              prompt:
                "Kurangi kepadatan rencana ini agar ritmenya lebih santai.",
            },
            {
              label: "Padatkan rute",
              prompt:
                "Optimalkan urutan rute rencana ini berdasarkan kedekatan lokasi.",
            },
            {
              label: "Tambah opsi makan",
              prompt:
                "Tambahkan rekomendasi tempat makan dekat titik-titik rencana ini.",
            },
          ].map((adj) => (
            <motion.button
              key={adj.label}
              type="button"
              className="gu-pill-btn"
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() =>
                onUiInteraction
                  ? onUiInteraction({
                      blockType: "plan",
                      action: "reshape_plan",
                      label: adj.label,
                      prompt: adj.prompt,
                    })
                  : onAction?.({ type: "send", text: adj.prompt })
              }
            >
              {adj.label}
            </motion.button>
          ))}
        </div>
      )}
    </section>
  );
}

function Steps({ props, complete, live, sources, onAction }: MistlineGenProps) {
  const rawList = arr(
    props.steps ?? props.events ?? props.items ?? props.milestones,
  ).map((raw): Record<string, unknown> =>
    typeof raw === "string" || typeof raw === "number"
      ? { title: String(raw).trim() }
      : rec(raw),
  );
  const steps = rawList
    .map((x) => {
      const title =
        str(x.title) ||
        str(x.label) ||
        str(x.name) ||
        str(x.event) ||
        str(x.milestone) ||
        str(x.headline) ||
        str(x.summary) ||
        str(x.description) ||
        str(x.date);
      const detail =
        str(x.detail) ||
        str(x.description) ||
        str(x.body) ||
        str(x.summary) ||
        str(x.note);
      const meta =
        str(x.meta) ||
        str(x.date) ||
        str(x.time) ||
        str(x.year) ||
        str(x.period) ||
        str(x.phase) ||
        str(x.status);
      return {
        ...x,
        title,
        detail: detail && detail !== title ? detail : "",
        meta: meta && meta !== title ? meta : "",
      };
    })
    .filter((x) => str(x.title));

  if (steps.length === 0) {
    if (!complete) {
      return (
        <section className="gu gu-steps is-streaming-empty" aria-busy="true">
          <Heading text={props.title} sources={sources} />
          <div className="gu-skel" style={{ padding: "8px 0" }}>
            <div className="gu-skel__line" style={{ width: "78%" }} />
            <div className="gu-skel__line" style={{ width: "62%" }} />
          </div>
        </section>
      );
    }
    return null;
  }

  const hasEventShape = Array.isArray(props.events);
  const style =
    str(props.style) === "timeline" || hasEventShape ? "timeline" : "numbered";
  const variant = str(props.variant, style);
  const stripLeadingOrdinal = (value: string) =>
    value
      .replace(/^\s*(?:(?:step|langkah|tahap)\s*)?\d+\s*[\.\)\:\-–—]\s*/i, "")
      .trim() || value;
  const hasHeader = Boolean(str(props.title) || str(props.subtitle));

  return (
    <section className="gu gu-steps" data-style={style} data-variant={variant}>
      {hasHeader && (
        <div className="gu-steps__head">
          <div className="gu-steps__head-main">
            <Heading text={props.title} sources={sources} />
            {str(props.subtitle) && (
              <p className="gu-steps__sub">
                <MistlineInline text={str(props.subtitle)} sources={sources} />
              </p>
            )}
          </div>
          <span className="gu-steps__count">
            {steps.length} {steps.length === 1 ? "step" : "steps"}
          </span>
        </div>
      )}
      <ol>
        {steps.map((st, i) => {
          const cleanTitle = stripLeadingOrdinal(str(st.title));
          const ordinal = String(i + 1).padStart(2, "0");
          return (
            <li key={`step-${i}`}>
              <span className="gu-steps__rail" aria-hidden="true">
                <span className="gu-steps__num">
                  {style === "numbered" ? ordinal : ""}
                </span>
              </span>
              <span className="gu-steps__body">
                <span className="gu-steps__name">
                  {live ? (
                    <motion.button
                      type="button"
                      className="gu-inline-action"
                      whileHover={MH.chip}
                      whileTap={MH.tap}
                      transition={MH.spring}
                      onClick={() =>
                        onAction?.({
                          type: "send",
                          text: `Jelaskan langkah "${cleanTitle}" secara lebih detail beserta contoh konkretnya.`,
                        })
                      }
                    >
                      <MistlineInline text={cleanTitle} sources={sources} />
                    </motion.button>
                  ) : (
                    <MistlineInline text={cleanTitle} sources={sources} />
                  )}
                  {str(st.meta) && (
                    <span className="gu-steps__meta">{str(st.meta)}</span>
                  )}
                </span>
                {str(st.detail) && (
                  <span className="gu-steps__detail">
                    <MistlineInline text={str(st.detail)} sources={sources} />
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TenDotMeter({ score }: { score: number }) {
  const filled = Math.max(0, Math.min(10, Math.round(score)));
  return (
    <span className="gu-vs__dots" aria-label={`${score} dari 10`}>
      {Array.from({ length: 10 }, (_, idx) => (
        <span
          key={idx}
          className={`gu-vs__dot${idx < filled ? " is-filled" : ""}`}
        />
      ))}
    </span>
  );
}

function parseMetricMagnitude(val: string): number {
  const trimmed = val.trim().toLowerCase();
  const numMatch = trimmed.match(/([\d.]+)/);
  if (numMatch) {
    let base = parseFloat(numMatch[1]);
    if (trimmed.includes("b")) base *= 1e9;
    else if (trimmed.includes("m")) base *= 1e6;
    else if (trimmed.includes("k")) base *= 1e3;
    return base;
  }
  if (/easy|mudah|tinggi|high|fast|cepat|excellent|full/i.test(trimmed))
    return 90;
  if (/medium|sedang|moderate/i.test(trimmed)) return 55;
  if (/hard|sulit|low|rendah|slow|lambat|limited/i.test(trimmed)) return 25;
  return 50;
}

function Versus({
  props,
  live,
  sources,
  onAction,
  onUiInteraction,
}: MistlineGenProps) {
  const A = rec(props.a);
  const B = rec(props.b);
  const rawScoreA = num(A.score);
  const rawScoreB = num(B.score);
  const hasExplicitScores = rawScoreA !== undefined || rawScoreB !== undefined;
  const sa = rawScoreA ?? 8;
  const sb = rawScoreB ?? 7;
  const rawVariant = str(props.variant, "cards");
  const variant = ["cards", "radar", "bars", "editorial"].includes(rawVariant)
    ? rawVariant
    : "cards";

  const labelA =
    str(A.label) ||
    str(A.title) ||
    str(A.name) ||
    str(A.heading) ||
    str(A.option) ||
    (typeof props.a === "string" ? str(props.a) : "") ||
    "Opsi A";
  const labelB =
    str(B.label) ||
    str(B.title) ||
    str(B.name) ||
    str(B.heading) ||
    str(B.option) ||
    (typeof props.b === "string" ? str(props.b) : "") ||
    "Opsi B";
  const tagA = str(A.tagline) || str(A.subtitle) || str(A.note);
  const tagB = str(B.tagline) || str(B.subtitle) || str(B.note);
  const badgeA =
    str(A.badge) || (hasExplicitScores && sa > sb ? "Direkomendasikan" : "");
  const badgeB =
    str(B.badge) || (hasExplicitScores && sb > sa ? "Direkomendasikan" : "");
  const win = hasExplicitScores && sa !== sb ? (sa > sb ? "a" : "b") : null;

  const normalizeMetricsList = (rawMetrics: unknown) =>
    arr(rawMetrics)
      .map(rec)
      .map((m) => ({
        label: str(m.label) || str(m.name) || str(m.criterion) || str(m.key),
        value: str(m.value ?? m.score ?? m.text ?? ""),
      }))
      .filter((m) => m.label);

  const metricsA = normalizeMetricsList(A.metrics ?? A.stats ?? A.facts);
  const metricsB = normalizeMetricsList(B.metrics ?? B.stats ?? B.facts);
  const metricRows = useMemo(() => {
    const len = Math.max(metricsA.length, metricsB.length);
    return Array.from({ length: len }, (_, i) => {
      const mA = metricsA[i] || { label: "", value: "" };
      const mB = metricsB[i] || { label: "", value: "" };
      const label = str(mA.label) || str(mB.label);
      const valA = str(mA.value) || "—";
      const valB = str(mB.value) || "—";
      const magA = parseMetricMagnitude(valA);
      const magB = parseMetricMagnitude(valB);
      // Treat bundle/cost/size smaller as better when labeled size/bundle/cost/latency/kurva
      const smallerBetter =
        /bundle|size|ukuran|cost|biaya|latency|kurva|curve|ease|easy/i.test(
          label,
        );
      const aWins = smallerBetter ? magA <= magB : magA >= magB;
      return { label, valA, valB, magA, magB, aWins };
    });
  }, [metricsA, metricsB]);

  const extractSidePoints = (sideObj: Record<string, unknown>) =>
    arr(
      sideObj.points ??
        sideObj.pros ??
        sideObj.bullets ??
        sideObj.items ??
        sideObj.highlights ??
        sideObj.features,
    )
      .map((p) => {
        if (typeof p === "string" || typeof p === "number") return str(p);
        const pr = rec(p);
        return str(pr.text) || str(pr.label) || str(pr.title) || str(pr.point);
      })
      .filter(Boolean);

  const pointsA = extractSidePoints(A);
  const pointsB = extractSidePoints(B);

  const winsA = useMemo(
    () => metricRows.filter((m) => m.aWins).length,
    [metricRows],
  );
  const winsB = Math.max(0, metricRows.length - winsA);

  const iconA = useMemo(
    () =>
      str(A.icon) ||
      inferContextualIcon(`${labelA} ${tagA} ${pointsA.slice(0, 2).join(" ")}`),
    [A.icon, labelA, tagA, pointsA],
  );
  const iconB = useMemo(() => {
    if (str(B.icon)) return str(B.icon);
    const primary = inferContextualIcon(
      `${labelB} ${tagB} ${pointsB.slice(0, 2).join(" ")}`,
    );
    if (primary !== iconA) return primary;
    const secondary = inferContextualIcon(pointsB.join(" "));
    if (secondary && secondary !== iconA) return secondary;
    return iconA === "layers" ? "compass" : "layers";
  }, [B.icon, labelB, tagB, pointsB, iconA]);

  const sideStampA =
    metricRows.length > 0
      ? winsA > 0
        ? `${winsA}/${metricRows.length} unggul`
        : `${metricRows.length} metrik`
      : pointsA.length > 0
        ? `${pointsA.length} poin`
        : "Opsi 01";
  const sideStampB =
    metricRows.length > 0
      ? winsB > 0
        ? `${winsB}/${metricRows.length} unggul`
        : `${metricRows.length} metrik`
      : pointsB.length > 0
        ? `${pointsB.length} poin`
        : "Opsi 02";

  const [pickedSide, setPickedSide] = useState<"a" | "b" | null>(null);

  const renderSideCorner = (key: "a" | "b") => {
    const iconName = key === "a" ? iconA : iconB;
    const stamp = key === "a" ? sideStampA : sideStampB;
    const isLeading =
      pickedSide === key ||
      win === key ||
      (win === null &&
        metricRows.length > 0 &&
        (key === "a" ? winsA > winsB : winsB > winsA));
    return (
      <div
        className={`gu-vs__corner${isLeading ? " is-lead" : ""}`}
        aria-hidden="true"
      >
        <span className="gu-vs__emblem">
          <MistlineIcon name={iconName} size={14} strokeWidth={1.75} />
        </span>
        <span className="gu-vs__stamp">{stamp}</span>
      </div>
    );
  };

  const pickOption = (key: "a" | "b", label: string) => {
    if (!live || !label) return;
    setPickedSide(key);
    const prompt = `Saya pilih "${label}". Lanjutkan langkah implementasi atau rencana detail untuk opsi ini.`;
    if (onUiInteraction) {
      onUiInteraction({
        blockType: "versus",
        action: "pick_option",
        label,
        value: { side: key },
        prompt,
      });
    } else {
      onAction?.({ type: "send", text: prompt });
    }
  };

  /* ── Variant 2: Radar Pentagon Geometry ── */
  const radarAxes = useMemo(() => {
    const customDims = arr(props.dimensions)
      .map(rec)
      .filter((d) => str(d.axis));
    if (customDims.length >= 3) {
      return customDims.slice(0, 6).map((d) => ({
        axis: str(d.axis),
        a: Math.max(
          15,
          Math.min(100, (num(d.a) ?? 7) * (num(d.a)! <= 10 ? 10 : 1)),
        ),
        b: Math.max(
          15,
          Math.min(100, (num(d.b) ?? 6) * (num(d.b)! <= 10 ? 10 : 1)),
        ),
      }));
    }
    const baseA = Math.max(30, sa * 10);
    const baseB = Math.max(30, sb * 10);
    return [
      {
        axis: metricRows[0]?.label.split(" ")[0] || "Skor Utama",
        a: Math.min(96, baseA + 8),
        b: Math.max(28, baseB - 6),
      },
      {
        axis: metricRows[1]?.label.split(" ")[0] || "Kemudahan",
        a: Math.max(35, baseA - 14),
        b: Math.min(94, baseB + 14),
      },
      {
        axis: metricRows[2]?.label.split(" ")[0] || "Efisiensi",
        a: Math.max(36, baseA - 12),
        b: Math.min(90, baseB + 10),
      },
      {
        axis: "Popularitas",
        a: Math.min(98, baseA + 12),
        b: Math.max(32, baseB - 10),
      },
      {
        axis: "Ekosistem",
        a: Math.min(95, baseA + 10),
        b: Math.max(38, baseB - 4),
      },
    ];
  }, [props.dimensions, metricRows, sa, sb]);

  const radarSvg = useMemo(() => {
    const cx = 180;
    const cy = 140;
    const r = 88;
    const n = radarAxes.length;
    const polyPts = (ratioFn: (idx: number) => number) =>
      radarAxes
        .map((_, i) => {
          const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
          const dist = r * ratioFn(i);
          return `${(cx + dist * Math.cos(ang)).toFixed(1)},${(cy + dist * Math.sin(ang)).toFixed(1)}`;
        })
        .join(" ");

    return (
      <svg
        viewBox="-55 0 470 285"
        className="gu-vs__radar-svg"
        role="img"
        aria-label={`Radar perbandingan ${labelA} vs ${labelB}`}
      >
        {[0.33, 0.66, 1].map((scale) => (
          <polygon
            key={scale}
            points={polyPts(() => scale)}
            fill="none"
            stroke="var(--gu-rule)"
            strokeWidth="1"
          />
        ))}
        {radarAxes.map((ax, i) => {
          const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
          const x2 = cx + r * Math.cos(ang);
          const y2 = cy + r * Math.sin(ang);
          const lx = cx + (r + 18) * Math.cos(ang);
          const ly = cy + (r + 18) * Math.sin(ang);
          const anchor =
            Math.cos(ang) > 0.25
              ? "start"
              : Math.cos(ang) < -0.25
                ? "end"
                : "middle";
          return (
            <g key={ax.axis}>
              <line
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                stroke="var(--gu-rule)"
                strokeWidth="1"
              />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="gu-vs__radar-label"
              >
                {ax.axis}
              </text>
            </g>
          );
        })}
        <polygon
          points={polyPts((i) => radarAxes[i].b / 100)}
          fill="rgba(128, 138, 156, 0.26)"
          stroke="var(--gu-ink-2)"
          strokeWidth="1.5"
        />
        <polygon
          points={polyPts((i) => radarAxes[i].a / 100)}
          fill="rgba(205, 158, 76, 0.48)"
          stroke="#d8a852"
          strokeWidth="1.8"
        />
      </svg>
    );
  }, [radarAxes, labelA, labelB]);

  const sideCard = (
    x: Record<string, unknown>,
    key: "a" | "b",
    score: number,
  ) => {
    const label = key === "a" ? labelA : labelB;
    const tagline = key === "a" ? tagA : tagB;
    const badge = key === "a" ? badgeA : badgeB;
    const metrics = key === "a" ? metricsA : metricsB;
    const points = key === "a" ? pointsA : pointsB;
    const imgSrc = str(x.image) || str(x.imageUrl);
    const imgQuery = str(x.imageQuery);
    const hasImg = Boolean(imgSrc || imgQuery);

    return (
      <figure
        className={`gu-vs__side${win === key ? " is-win" : ""}${pickedSide === key ? " is-picked" : ""}`}
      >
        {hasImg && (
          <div className="gu-vs__media">
            <MistlinePhoto
              src={imgSrc || undefined}
              query={imgQuery || undefined}
              seed={label}
              ratio="16/10"
            />
          </div>
        )}
        <div className="gu-vs__card-top-bar">
          <div className="gu-vs__card-top">
            <span className={`gu-vs__kicker${badge ? " is-badge" : ""}`}>
              {badge || (key === "a" ? "01 · Opsi A" : "02 · Opsi B")}
            </span>
            {hasExplicitScores && (
              <>
                <div className="gu-vs__bigscore">
                  <strong>{score}</strong>
                  <span>/10</span>
                </div>
                <TenDotMeter score={score} />
              </>
            )}
          </div>
          {renderSideCorner(key)}
        </div>
        <div className="gu-vs__head">
          <figcaption className="gu-vs__title">{label}</figcaption>
          {tagline && <p className="gu-vs__tagline">{tagline}</p>}
        </div>
        {metrics.length > 0 && (
          <dl className="gu-vs__metrics">
            {metrics.map((m, i) => (
              <div key={`metric-${key}-${i}`} className="gu-vs__metric">
                <dt>{str(m.label)}</dt>
                <dd>{str(m.value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {points.length > 0 && (
          <ul className="gu-vs__points">
            {points.map((pt, i) => (
              <li key={`pt-${key}-${i}`}>
                <MistlineInline text={pt} sources={sources} />
              </li>
            ))}
          </ul>
        )}
        {live && label && (
          <motion.button
            type="button"
            className={`gu-vs__pick-link${pickedSide === key ? " is-active" : ""}`}
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => pickOption(key, label)}
          >
            <span className="gu-vs__pick-text">
              {pickedSide === key ? `Dipilih (${label})` : `Pilih ${label}`}
            </span>
            {pickedSide === key ? (
              <Check size={13} strokeWidth={2.4} className="gu-vs__pick-icon" />
            ) : (
              <ArrowUpRight size={13} strokeWidth={2.2} className="gu-vs__pick-icon" />
            )}
          </motion.button>
        )}
      </figure>
    );
  };

  return (
    <section className="gu gu-vs" data-variant={variant}>
      <Heading text={props.title} sources={sources} />

      {variant === "cards" && (
        <div className="gu-vs__pair">
          {sideCard(A, "a", sa)}
          {sideCard(B, "b", sb)}
        </div>
      )}

      {variant === "radar" && (
        <div className="gu-vs__radar-layout">
          <div className="gu-vs__radar-top">
            <div className="gu-vs__radar-box">{radarSvg}</div>
            <div className="gu-vs__radar-summaries">
              <motion.button
                type="button"
                className={`gu-vs__summary-card${pickedSide === "a" ? " is-picked" : ""}`}
                whileHover={live ? MH.card : undefined}
                whileTap={live ? MH.tap : undefined}
                transition={MH.spring}
                onClick={() => pickOption("a", labelA)}
              >
                <div className="gu-vs__summary-head">
                  <span className="gu-vs__summary-name">
                    <span className="gu-vs__legend-dot is-gold" />
                    {labelA}
                  </span>
                  {hasExplicitScores ? (
                    <span className="gu-vs__summary-score">
                      <strong>{sa}</strong>/10
                    </span>
                  ) : (
                    <span className="gu-vs__stamp">{sideStampA}</span>
                  )}
                </div>
                <p className="gu-vs__tagline">
                  {[badgeA, tagA].filter(Boolean).join(" · ")}
                </p>
              </motion.button>
              <motion.button
                type="button"
                className={`gu-vs__summary-card${pickedSide === "b" ? " is-picked" : ""}`}
                whileHover={live ? MH.card : undefined}
                whileTap={live ? MH.press : undefined}
                transition={MH.spring}
                onClick={() => pickOption("b", labelB)}
              >
                <div className="gu-vs__summary-head">
                  <span className="gu-vs__summary-name">
                    <span className="gu-vs__legend-dot is-slate" />
                    {labelB}
                  </span>
                  {hasExplicitScores ? (
                    <span className="gu-vs__summary-score">
                      <strong>{sb}</strong>/10
                    </span>
                  ) : (
                    <span className="gu-vs__stamp">{sideStampB}</span>
                  )}
                </div>
                <p className="gu-vs__tagline">
                  {[badgeB, tagB].filter(Boolean).join(" · ")}
                </p>
              </motion.button>
            </div>
          </div>

          {metricRows.length > 0 && (
            <div className="gu-vs__shared-metrics">
              {metricRows.map((m, i) => (
                <div key={i} className="gu-vs__shared-row">
                  <span className="gu-vs__shared-label">{m.label}</span>
                  <span
                    className={`gu-vs__shared-val${m.aWins ? " is-win" : ""}`}
                  >
                    {m.valA}
                  </span>
                  <span
                    className={`gu-vs__shared-val${!m.aWins ? " is-win" : ""}`}
                  >
                    {m.valB}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="gu-vs__points-cols">
            <ul className="gu-vs__points is-right-align">
              {pointsA.map((pt, i) => (
                <li key={i}>
                  <MistlineInline text={pt} sources={sources} />
                </li>
              ))}
            </ul>
            <ul className="gu-vs__points">
              {pointsB.map((pt, i) => (
                <li key={i}>
                  <MistlineInline text={pt} sources={sources} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {variant === "bars" && (
        <div className="gu-vs__bars-layout">
          <div className="gu-vs__bars-head">
            <div className="gu-vs__bars-side">
              <span className="gu-vs__kicker">
                {badgeA || "01 · Opsi A"}
              </span>
              <div className="gu-vs__title">{labelA}</div>
              {hasExplicitScores ? (
                <>
                  <div className="gu-vs__bigscore">
                    <strong>{sa}</strong>
                    <span>/10</span>
                  </div>
                  <TenDotMeter score={sa} />
                </>
              ) : (
                <span className="gu-vs__stamp">{sideStampA}</span>
              )}
            </div>
            <span className="gu-vs__bars-vs">vs</span>
            <div className="gu-vs__bars-side">
              <span className="gu-vs__kicker">
                {badgeB || "02 · Opsi B"}
              </span>
              <div className="gu-vs__title">{labelB}</div>
              {hasExplicitScores ? (
                <>
                  <div className="gu-vs__bigscore">
                    <strong>{sb}</strong>
                    <span>/10</span>
                  </div>
                  <TenDotMeter score={sb} />
                </>
              ) : (
                <span className="gu-vs__stamp">{sideStampB}</span>
              )}
            </div>
          </div>

          {metricRows.length > 0 && (
            <div className="gu-vs__tug-list">
              {metricRows.map((m, i) => {
                const total = Math.max(1, m.magA + m.magB);
                const pctA = Math.max(16, Math.min(95, (m.magA / total) * 140));
                const pctB = Math.max(16, Math.min(95, (m.magB / total) * 140));
                return (
                  <div key={i} className="gu-vs__tug-row">
                    <div className="gu-vs__tug-label">{m.label}</div>
                    <div className="gu-vs__tug-track">
                      <span
                        className={`gu-vs__tug-val is-left${m.aWins ? " is-win" : ""}`}
                      >
                        {m.valA}
                      </span>
                      <div className="gu-vs__tug-bar-left">
                        <MeterFill
                          as="span"
                          className={`gu-vs__tug-fill${m.aWins ? " is-coral" : ""}`}
                          width={`${pctA}%`}
                        />
                      </div>
                      <div className="gu-vs__tug-bar-right">
                        <MeterFill
                          as="span"
                          className={`gu-vs__tug-fill${!m.aWins ? " is-coral" : ""}`}
                          width={`${pctB}%`}
                        />
                      </div>
                      <span
                        className={`gu-vs__tug-val is-right${!m.aWins ? " is-win" : ""}`}
                      >
                        {m.valB}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="gu-vs__points-cols">
            <ul className="gu-vs__points is-right-align">
              {pointsA.map((pt, i) => (
                <li key={i}>
                  <MistlineInline text={pt} sources={sources} />
                </li>
              ))}
            </ul>
            <ul className="gu-vs__points">
              {pointsB.map((pt, i) => (
                <li key={i}>
                  <MistlineInline text={pt} sources={sources} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {variant === "editorial" && (
        <div className="gu-vs__editorial">
          <div className="gu-vs__ed-row is-head">
            <div className="gu-vs__ed-axis-head">
              <span className="gu-vs__ed-axis-kicker">
                {metricRows.length > 0 ? "Kriteria" : "Komparasi"}
              </span>
              <span className="gu-pen gu-vs__ed-vs-pen momo-hand-title">
                opsi a vs b
              </span>
            </div>
            <div className="gu-vs__ed-side-head">
              <div className="gu-vs__ed-title-stack">
                <span className={`gu-vs__kicker${badgeA ? " is-badge" : ""}`}>
                  {badgeA || "01 · Opsi A"}
                </span>
                <div className="gu-vs__title">{labelA}</div>
                {tagA && <p className="gu-vs__tagline">{tagA}</p>}
                {hasExplicitScores && (
                  <>
                    <div className="gu-vs__bigscore">
                      <strong>{sa}</strong>
                      <span>/10</span>
                    </div>
                    <TenDotMeter score={sa} />
                  </>
                )}
              </div>
              {renderSideCorner("a")}
            </div>
            <div className="gu-vs__ed-side-head">
              <div className="gu-vs__ed-title-stack">
                <span className={`gu-vs__kicker${badgeB ? " is-badge" : ""}`}>
                  {badgeB || "02 · Opsi B"}
                </span>
                <div className="gu-vs__title">{labelB}</div>
                {tagB && <p className="gu-vs__tagline">{tagB}</p>}
                {hasExplicitScores && (
                  <>
                    <div className="gu-vs__bigscore">
                      <strong>{sb}</strong>
                      <span>/10</span>
                    </div>
                    <TenDotMeter score={sb} />
                  </>
                )}
              </div>
              {renderSideCorner("b")}
            </div>
          </div>

          {metricRows.map((m, i) => (
            <div key={i} className="gu-vs__ed-row">
              <div className="gu-vs__shared-label">{m.label}</div>
              <div className="gu-vs__ed-val">
                {m.aWins && <span className="gu-vs__winner-dot" />}
                <strong>{m.valA}</strong>
              </div>
              <div className="gu-vs__ed-val">
                {!m.aWins && <span className="gu-vs__winner-dot" />}
                <strong>{m.valB}</strong>
              </div>
            </div>
          ))}

          {(pointsA.length > 0 || pointsB.length > 0) && (
            <div className="gu-vs__ed-row is-points">
              <div className="gu-vs__shared-label">Poin Utama</div>
              <ul className="gu-vs__points">
                {pointsA.map((pt, i) => (
                  <li key={i}>
                    <MistlineInline text={pt} sources={sources} />
                  </li>
                ))}
              </ul>
              <ul className="gu-vs__points">
                {pointsB.map((pt, i) => (
                  <li key={i}>
                    <MistlineInline text={pt} sources={sources} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {str(props.verdict) && (
        <div className="gu-vs__verdict-wrap">
          <div className="gu-pen gu-vs__verdict-note">verdict</div>
          <p className="gu-vs__verdict-plain">
            <MistlineInline text={str(props.verdict)} sources={sources} />
          </p>
        </div>
      )}
    </section>
  );
}

function Stats({ props, complete, live, sources, onAction }: MistlineGenProps) {
  const items = arr(props.items ?? props.metrics ?? props.stats)
    .map(rec)
    .map((x): Record<string, unknown> => ({
      ...x,
      label: str(x.label) || str(x.title) || str(x.name),
      value: str(x.value ?? x.metric ?? x.amount ?? ""),
    }))
    .filter((x) => str(x.label) || str(x.value));
  const rawVariant = str(props.variant, "default");
  const variant = ["default", "editorial", "split", "minimal"].includes(
    rawVariant,
  )
    ? rawVariant
    : "default";
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (items.length === 0 && complete) {
    return null;
  }

  const handleStatClick = (idx: number, label: string, value: string) => {
    setActiveIdx((cur) => (cur === idx ? null : idx));
    if (live && label) {
      onAction?.({
        type: "send",
        text: `Bedah rincian dan asumsi di balik metrik "${label}" (${value}).`,
      });
    }
  };

  const usedStatIcons = new Set<string>();
  const statIcons = items.map((it, i) =>
    inferContextualIcon(
      `${str(it.label)} ${str(it.value)} ${str(it.delta)} ${str(it.note)}`,
      str(it.icon) || undefined,
      i,
      usedStatIcons,
    ),
  );
  const isQuantitativeDelta = (d: string) =>
    /^[+-]?\s*(?:Rp|\$|€|£)?\s*\d+(?:[.,]\d+)?\s*(?:%|x|bps|pt|rb|jt|M|K|B)?$/i.test(
      d.trim(),
    );

  return (
    <section className="gu gu-stats" data-variant={variant}>
      <Heading text={props.title} sources={sources} />

      {variant === "editorial" ? (
        <div className="gu-stats__editorial">
          <div className="gu-stats__ledger">
            {items.map((it, i) => {
              const trend = str(it.trend);
              const label = str(it.label);
              const value = str(it.value) || "—";
              const delta = str(it.delta);
              const numDelta = isQuantitativeDelta(delta);
              const note =
                str(it.note) ||
                (trend === "up"
                  ? "optimal"
                  : trend === "down"
                    ? "pantau"
                    : "stabil");
              const isSelected = activeIdx === i;
              return (
                <motion.button
                  key={`stat-ed-${i}`}
                  type="button"
                  whileTap={live && label ? { scale: 0.99 } : undefined}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className={`gu-stat__ledger-row${live && label ? " is-interactive" : ""}${isSelected ? " is-selected" : ""}`}
                  style={!live || !label ? { cursor: "default" } : undefined}
                  onClick={() => handleStatClick(i, label, value)}
                >
                  <span className="gu-stat__rank">
                    <MistlineIcon name={statIcons[i]} size={13} strokeWidth={2} />
                  </span>
                  <span className="gu-stat__label">{label}</span>
                  <strong className="gu-stat__value momo-serif">{value}</strong>
                  <span className="gu-stat__ledger-end">
                    {delta && (
                      <span className={`gu-stat__delta is-${trend || "flat"}`}>
                        {numDelta && (
                          <MistlineIcon
                            name={
                              trend === "up"
                                ? "arrow-up-right"
                                : trend === "down"
                                  ? "arrow-down-right"
                                  : "arrow-right"
                            }
                            size={11}
                            strokeWidth={2.2}
                          />
                        )}{" "}
                        <MistlineInline text={delta} sources={sources} />
                      </span>
                    )}
                    <span className="gu-pen gu-stat__note">{note}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ) : variant === "split" ? (
        <div className="gu-stats__row">
          {items.map((it, i) => {
            const trend = str(it.trend);
            const label = str(it.label);
            const value = str(it.value) || "—";
            const delta = str(it.delta);
            const numDelta = isQuantitativeDelta(delta);
            const note =
              str(it.note) ||
              (trend === "up"
                ? "optimal"
                : trend === "down"
                  ? "pantau"
                  : "stabil");
            const isSelected = activeIdx === i;
            return (
              <motion.button
                key={`stat-sp-${i}`}
                type="button"
                whileTap={live && label ? { scale: 0.985 } : undefined}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className={`gu-stat gu-stat--split${live && label ? " is-interactive" : ""}${isSelected ? " is-selected" : ""}`}
                style={!live || !label ? { cursor: "default" } : undefined}
                onClick={() => handleStatClick(i, label, value)}
              >
                <span
                  className={`gu-stat__rail is-${trend || "flat"}`}
                  aria-hidden="true"
                />
                <div className="gu-stat__split-val">
                  <strong className="gu-stat__value momo-serif">{value}</strong>
                  <span className={`gu-stat__delta is-${trend || "flat"}`}>
                    {delta ? (
                      <>
                        {numDelta && (
                          <MistlineIcon
                            name={
                              trend === "up"
                                ? "arrow-up-right"
                                : trend === "down"
                                  ? "arrow-down-right"
                                  : "arrow-right"
                            }
                            size={11}
                            strokeWidth={2.2}
                          />
                        )}{" "}
                        <MistlineInline text={delta} sources={sources} />
                      </>
                    ) : (
                      "stabil"
                    )}
                  </span>
                </div>
                <div className="gu-stat__split-meta">
                  <span className="gu-stat__label">{label}</span>
                  <span className="gu-pen gu-stat__note">{note}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : variant === "minimal" ? (
        <div className="gu-stats__strip">
          {items.map((it, i) => {
            const trend = str(it.trend);
            const label = str(it.label);
            const value = str(it.value) || "—";
            const delta = str(it.delta);
            const numDelta = isQuantitativeDelta(delta);
            const isSelected = activeIdx === i;
            return (
              <motion.button
                key={`stat-min-${i}`}
                type="button"
                whileTap={live && label ? { scale: 0.97 } : undefined}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className={`gu-stat gu-stat--minimal${live && label ? " is-interactive" : ""}${isSelected ? " is-selected" : ""}`}
                style={!live || !label ? { cursor: "default" } : undefined}
                onClick={() => handleStatClick(i, label, value)}
              >
                <span className="gu-stat__label">{label}</span>
                <strong className="gu-stat__value">{value}</strong>
                {delta && (
                  <span className={`gu-stat__delta is-${trend || "flat"}`}>
                    {numDelta && (
                      <MistlineIcon
                        name={
                          trend === "up"
                            ? "arrow-up-right"
                            : trend === "down"
                              ? "arrow-down-right"
                              : "arrow-right"
                        }
                        size={11}
                        strokeWidth={2.2}
                      />
                    )}{" "}
                    <MistlineInline text={delta} sources={sources} />
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="gu-stats__row">
          {items.map((it, i) => {
            const trend = str(it.trend);
            const label = str(it.label);
            const value = str(it.value) || "—";
            const delta = str(it.delta);
            const numDelta = isQuantitativeDelta(delta);
            const note =
              str(it.note) ||
              (trend === "up"
                ? "optimal"
                : trend === "down"
                  ? "pantau"
                  : "stabil");
            const activeBars = trend === "up" ? 7 : trend === "down" ? 4 : 6;
            const barColor =
              trend === "down"
                ? "#d97757"
                : trend === "up"
                  ? "#ef8c66"
                  : "#8e909b";
            const iconColor =
              trend === "up"
                ? "var(--ok, #34d399)"
                : trend === "down"
                  ? "var(--bad, #f87171)"
                  : SERIES[i % SERIES.length];
            const isSelected = activeIdx === i;
            return (
              <motion.button
                type="button"
                whileTap={live && label ? { scale: 0.985 } : undefined}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className={`gu-stat${live && label ? " is-interactive" : ""}${isSelected ? " is-selected" : ""}`}
                style={!live || !label ? { cursor: "default" } : undefined}
                key={`stat-${i}`}
                onClick={() => handleStatClick(i, label, value)}
              >
                <div className="gu-stat__top">
                  <span className="gu-stat__label">{label}</span>
                  {delta ? (
                    <span className={`gu-stat__delta is-${trend || "flat"}`}>
                      {numDelta && (
                        <MistlineIcon
                          name={
                            trend === "up"
                              ? "arrow-up-right"
                              : trend === "down"
                                ? "arrow-down-right"
                                : "arrow-right"
                          }
                          size={11}
                          strokeWidth={2.2}
                        />
                      )}{" "}
                      <MistlineInline text={delta} sources={sources} />
                    </span>
                  ) : (
                    <span className="gu-stat__index">0{i + 1}</span>
                  )}
                </div>

                <div className="gu-stat__main">
                  <span className="gu-stat__value momo-serif">{value}</span>
                  {numDelta ? (
                    <div className="gu-stat__meter" aria-hidden="true">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((t) => (
                        <span
                          key={t}
                          className={`gu-stat__tick ${t === 0 ? "is-tall" : ""}`}
                          style={{
                            height: t === 0 ? 24 : 11 + ((t * 3 + i * 2) % 9),
                            background:
                              t < activeBars ? barColor : "var(--gu-rule)",
                            opacity: t < activeBars ? 1 - t * 0.06 : 0.65,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <span
                      className={`gu-stat__ctx-icon is-${trend || "flat"}`}
                      aria-hidden="true"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        color: iconColor,
                        background: "transparent",
                      }}
                    >
                      <MistlineIcon name={statIcons[i]} size={18} strokeWidth={1.9} />
                    </span>
                  )}
                </div>

                <div className="gu-stat__foot">
                  <span className="gu-pen gu-stat__note">{note}</span>
                  <span
                    className={`gu-stat__status-dot is-${trend || "flat"}`}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </section>
  );
}

const SERIES = [
  "var(--gu-accent, #da6c4d)",
  "var(--cat1, #0a84ff)",
  "var(--cat3, #30d158)",
  "var(--cat2, #ff9f0a)",
  "var(--cat4, #bf5af2)",
  "var(--cat6, #40c8e0)",
];

function fmtVal(v: number, unit: string) {
  const n =
    Math.abs(v) >= 1000
      ? v.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : String(Math.round(v * 10) / 10);
  if (!unit) return n;
  return /^[$€£¥]|^Rp/i.test(unit)
    ? `${unit}${n}`
    : `${n}${unit.length <= 2 ? "" : " "}${unit}`;
}

type ChartSortMode = "none" | "desc" | "asc";

function Chart({ props, sources, surface }: MistlineGenProps) {
  /* ── Intelligence chart delegation ── */
  const useIntel = (props as Record<string, unknown>).__intel !== false;
  const raw = str(props.variant) || str(props.type);
  const chartTypeRaw = ["bar", "donut", "line", "area"].includes(raw)
    ? raw
    : "bar";

  const intelData = useMemo(() => {
    const items = arr(props.data ?? props.items)
      .map(rec)
      .map((d) => ({
        label:
          str(d.label) ||
          str(d.name) ||
          str(d.category) ||
          str(d.title) ||
          str(d.x),
        value: num(d.value ?? d.count ?? d.amount ?? d.share ?? d.y) ?? 0,
      }))
      .filter((d) => d.label);
    if (!items.length) return null;
    return {
      series: [
        {
          name: str(props.title) || "Value",
          data: items,
        },
      ],
      unit: str(props.unit),
      caption: str(props.caption),
    };
  }, [props.data, props.title, props.unit, props.caption]);

  if (useIntel && intelData) {
    const intelProps = {
      data: intelData as unknown as Record<string, unknown>,
      state: "ready" as const,
      surface: (surface === "explore"
        ? "explore"
        : surface === "board"
          ? "board"
          : "chat") as "explore" | "board" | "chat",
      live: true,
      streaming: false,
    };

    if (chartTypeRaw === "line") {
      return <IntelLineChart {...intelProps} />;
    }
    if (chartTypeRaw === "area") {
      return <IntelAreaChart {...intelProps} />;
    }
    if (chartTypeRaw === "donut") {
      return <IntelDonutChart {...intelProps} />;
    }
    return <IntelBarChart {...intelProps} />;
  }

  /* ── Legacy SVG chart fallback ── */
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradId = `gu_line_area_${uid}`;
  const defaultType = ["bar", "donut", "line"].includes(raw) ? raw : "bar";
  const [chartType, setChartType] = useState<string>(defaultType);
  const [sortMode, setSortMode] = useState<ChartSortMode>("none");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const unit = str(props.unit);
  const rawData = useMemo(
    () =>
      arr(props.data)
        .map(rec)
        .map((d, idx) => ({
          label: str(d.label),
          value: num(d.value) ?? 0,
          colorIdx: idx,
        }))
        .filter((d) => d.label),
    [props.data],
  );

  const data = useMemo(() => {
    if (sortMode === "desc") {
      return [...rawData].sort((a, b) => b.value - a.value);
    }
    if (sortMode === "asc") {
      return [...rawData].sort((a, b) => a.value - b.value);
    }
    return rawData;
  }, [rawData, sortMode]);

  const max = Math.max(1, ...data.map((d) => d.value));
  const minVal = data.length > 0 ? Math.min(...data.map((d) => d.value)) : 0;
  const total = data.reduce((a, d) => a + d.value, 0);
  const type = chartType;
  const safeActiveIdx =
    activeIdx !== null && activeIdx < data.length ? activeIdx : null;
  const activePoint = safeActiveIdx !== null ? data[safeActiveIdx] : null;

  const cycleSort = () => {
    setActiveIdx(null);
    setSortMode((cur) =>
      cur === "none" ? "desc" : cur === "desc" ? "asc" : "none",
    );
  };

  const sortLabel =
    sortMode === "desc" ? "Tinggi ↓" : sortMode === "asc" ? "Rendah ↑" : "Urut";

  let body: ReactNode = null;

  if (type === "bar") {
    body = (
      <div className="gu-bars" role="list">
        {data.map((d, i) => {
          const isActive = safeActiveIdx === i;
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          const fillColor = SERIES[d.colorIdx % SERIES.length];
          return (
            <motion.button
              type="button"
              className={`gu-bar is-interactive${isActive ? " is-active" : ""}`}
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              key={`bar-${d.label}-${d.colorIdx}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              onClick={() => setActiveIdx((cur) => (cur === i ? null : i))}
            >
              <span className="gu-bar__label" title={d.label}>
                <i className="gu-bar__dot" style={{ background: fillColor }} />
                <span>{d.label}</span>
              </span>
              <span className="gu-bar__track">
                <MeterFill
                  as="span"
                  className="gu-bar__fill"
                  width={`${Math.max(3, (d.value / max) * 100)}%`}
                  style={{ background: fillColor }}
                />
              </span>
              <span className="gu-bar__val">
                {fmtVal(d.value, unit)}
                {total > 0 && <em>{pct}%</em>}
              </span>
            </motion.button>
          );
        })}
      </div>
    );
  } else if (type === "donut") {
    const C = 2 * Math.PI * 38;
    let acc = 0;
    body = (
      <div className="gu-donut">
        <svg
          viewBox="0 0 100 100"
          className="gu-donut__svg"
          role="img"
          aria-label={str(props.title) || "Donut chart"}
        >
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            className="gu-donut__track"
            strokeWidth="12"
          />
          {data.map((d, i) => {
            const len = total ? (d.value / total) * C : 0;
            const isActive = safeActiveIdx === i;
            const segColor = SERIES[d.colorIdx % SERIES.length];
            const el = (
              <circle
                key={`seg-${d.label}-${d.colorIdx}`}
                cx="50"
                cy="50"
                r="38"
                fill="none"
                style={{
                  stroke: segColor,
                  opacity: safeActiveIdx !== null && !isActive ? 0.32 : 1,
                  cursor: "pointer",
                  transition: "opacity 0.18s ease, stroke-width 0.18s ease",
                }}
                strokeWidth={isActive ? "14.5" : "12"}
                strokeDasharray={`${Math.max(0, len - 1.2)} ${C}`}
                strokeDashoffset={-acc}
                transform="rotate(-90 50 50)"
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                onClick={() => setActiveIdx((cur) => (cur === i ? null : i))}
              />
            );
            acc += len;
            return el;
          })}
          <text x="50" y="48" textAnchor="middle" className="gu-donut__total">
            {fmtVal(activePoint ? activePoint.value : total, unit)}
          </text>
          <text x="50" y="60" textAnchor="middle" className="gu-donut__cap">
            {activePoint
              ? activePoint.label.length > 13
                ? `${activePoint.label.slice(0, 12)}…`
                : activePoint.label
              : "TOTAL"}
          </text>
        </svg>
        <ul className="gu-legend">
          {data.map((d, i) => {
            const isActive = safeActiveIdx === i;
            const pct = total ? Math.round((d.value / total) * 100) : 0;
            return (
              <li
                key={`leg-${d.label}-${d.colorIdx}`}
                className={`is-interactive${isActive ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                onClick={() => setActiveIdx((cur) => (cur === i ? null : i))}
              >
                <span
                  className="gu-legend__dot"
                  style={{ background: SERIES[d.colorIdx % SERIES.length] }}
                />
                <span className="gu-legend__label">{d.label}</span>
                <span className="gu-legend__val">
                  {fmtVal(d.value, unit)} <em>{pct}%</em>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  } else {
    const W = 540;
    const H = 186;
    const padL = 48;
    const padR = 24;
    const padT = 18;
    const padB = 14;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const baseMin = Math.min(minVal, 0);
    const span = Math.max(1, max - baseMin);
    const pts = data.map((d, i) => ({
      x:
        data.length <= 1
          ? padL + plotW / 2
          : padL + (i * plotW) / (data.length - 1),
      y: padT + plotH - ((d.value - baseMin) / span) * plotH,
      ...d,
    }));
    const linePath = pts
      .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    const baseLineY = (padT + plotH).toFixed(1);
    const areaPath = pts.length
      ? `${linePath} L${pts[pts.length - 1].x.toFixed(1)} ${baseLineY} L${pts[0].x.toFixed(1)} ${baseLineY} Z`
      : "";
    const focusedIdx = safeActiveIdx !== null ? safeActiveIdx : pts.length - 1;
    const focused = pts[focusedIdx];
    const yTicks = [max, baseMin + span / 2, baseMin];

    body = (
      <div className="gu-line-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="gu-line"
          role="img"
          aria-label={str(props.title) || "Line chart"}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--gu-accent, #da6c4d)"
                stopOpacity="0.28"
              />
              <stop
                offset="100%"
                stopColor="var(--gu-accent, #da6c4d)"
                stopOpacity="0.01"
              />
            </linearGradient>
          </defs>

          {yTicks.map((val, ti) => {
            const ty = padT + (ti / 2) * plotH;
            return (
              <g key={`ytick-${ti}`}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={ty}
                  y2={ty}
                  className="gu-line__grid"
                />
                <text
                  x={padL - 8}
                  y={ty + 3.5}
                  textAnchor="end"
                  className="gu-line__tick"
                >
                  {fmtVal(val, unit)}
                </text>
              </g>
            );
          })}

          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#${gradId})`}
              className="gu-line__area"
            />
          )}

          {focused && (
            <line
              x1={focused.x}
              x2={focused.x}
              y1={padT}
              y2={padT + plotH}
              className="gu-line__crosshair"
            />
          )}

          {linePath && <path d={linePath} className="gu-line__path" />}

          {pts.map((p, i) => {
            const isFocused = i === focusedIdx;
            return (
              <g
                key={`pt-${p.label}-${i}`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => setActiveIdx((cur) => (cur === i ? null : i))}
              >
                <circle cx={p.x} cy={p.y} r={18} fill="transparent" />
                {isFocused && (
                  <circle cx={p.x} cy={p.y} r={8.5} className="gu-line__halo" />
                )}
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  initial={false}
                  animate={{ r: isFocused ? 4.8 : 3.2 }}
                  transition={{ duration: 0.14 }}
                  className={`gu-line__dot${isFocused ? " is-active" : ""}`}
                />
              </g>
            );
          })}
        </svg>

        {data.length > 0 && (
          <div
            className="gu-line__xlabels"
            style={{
              gridTemplateColumns: `repeat(${Math.min(data.length, 8)}, minmax(0, 1fr))`,
            }}
          >
            {data.map((d, i) => {
              const isFocused = i === focusedIdx;
              return (
                <motion.button
                  key={`xl-${d.label}-${i}`}
                  type="button"
                  className={`gu-line__xlabel${isFocused ? " is-active" : ""}`}
                  whileHover={MH.chip}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  title={`${d.label}: ${fmtVal(d.value, unit)}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => setActiveIdx((cur) => (cur === i ? null : i))}
                >
                  <span>{d.label}</span>
                  <em>{fmtVal(d.value, unit)}</em>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const displayPoint =
    activePoint || (type === "line" ? data[data.length - 1] : null);

  const renderChart = (isFs = false) => (
    <figure className={`gu gu-chart${isFs ? " is-fs" : ""}`} data-type={type}>
      <div className="gu-chart__head">
        <Heading text={props.title} sources={sources} />
        <div className="gu-chart__tools">
          <div className="gu-seg" role="group" aria-label="Jenis grafik">
            {(["bar", "donut", "line"] as const).map((t) => (
              <motion.button
                key={t}
                type="button"
                className={`gu-filter-chip${type === t ? " is-active" : ""}`}
                whileHover={MH.chip}
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={() => {
                  setChartType(t);
                  setActiveIdx(null);
                }}
              >
                {t === "bar" ? "Bar" : t === "donut" ? "Donut" : "Line"}
              </motion.button>
            ))}
          </div>
          {data.length >= 2 && (
            <motion.button
              type="button"
              className={`gu-filter-chip${sortMode !== "none" ? " is-active" : ""}`}
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              title="Urutkan data (Asli / Tertinggi / Terendah)"
              onClick={cycleSort}
            >
              <ArrowUpDown size={12} /> {sortLabel}
            </motion.button>
          )}
          {!isFs && surface !== "explore" && (
            <motion.button
              type="button"
              className="gu-icon-btn"
              whileHover={MH.icon}
              whileTap={MH.tap}
              transition={MH.spring}
              aria-label="Buka grafik layar penuh"
              title="Layar penuh"
              onClick={() => setFullscreen(true)}
            >
              <Expand size={11} />
            </motion.button>
          )}
        </div>
      </div>

      {displayPoint ? (
        <div className="gu-chart__readout">
          <span
            className="gu-chart__readout-dot"
            style={{
              background: SERIES[displayPoint.colorIdx % SERIES.length],
            }}
          />
          <strong>{displayPoint.label}</strong>
          <span className="gu-chart__readout-val">
            {fmtVal(displayPoint.value, unit)}
          </span>
          {total > 0 && (
            <em className="gu-chart__readout-pct">
              {Math.round((displayPoint.value / total) * 100)}%
            </em>
          )}
        </div>
      ) : total > 0 ? (
        <div className="gu-chart__meta-strip">
          <span>{data.length} kategori</span>
          <span>Total {fmtVal(total, unit)}</span>
          <span>Maks {fmtVal(max, unit)}</span>
        </div>
      ) : null}

      {body}
      {str(props.caption) && (
        <figcaption className="gu-caption">
          <MistlineInline text={str(props.caption)} sources={sources} />
        </figcaption>
      )}
    </figure>
  );

  return (
    <>
      {renderChart(false)}
      <FullscreenPortalModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title={str(props.title) || "Grafik Interaktif"}
        subtitle={str(props.caption)}
        variant="default"
      >
        {renderChart(true)}
      </FullscreenPortalModal>
    </>
  );
}

export function textOnHex(hex: string) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#141416";
  let h = m[1];
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#141416" : "#FFFFFF";
}

const SWATCH_LIFT = { lift: { y: -4 } };

function Palette({ props, complete, sources }: MistlineGenProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const colors = arr(props.colors)
    .map(rec)
    .filter((c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(str(c.hex).trim()));
  if (colors.length === 0 && complete) {
    return null;
  }
  return (
    <section
      className="gu gu-palette"
      data-variant={str(props.variant, "default")}
    >
      <Heading text={props.title} sources={sources} />
      <div className="gu-swatches">
        {colors.map((c, i) => {
          const hex = str(c.hex).trim().toUpperCase();
          return (
            <motion.button
              type="button"
              className="gu-swatch"
              whileHover="lift"
              whileTap={MH.tap}
              transition={MH.spring}
              key={`swatch-${hex}-${i}`}
              title="Salin warna hex"
              onClick={() => {
                void navigator.clipboard?.writeText(hex);
                setCopied(hex);
                setTimeout(() => setCopied(null), 1200);
              }}
            >
              <motion.span
                className="gu-swatch__chip print"
                style={{ background: hex, color: textOnHex(hex) }}
                variants={SWATCH_LIFT}
                transition={MH.spring}
              >
                <span>{copied === hex ? "tersalin" : hex}</span>
              </motion.span>
              {str(c.name) && (
                <span className="gu-swatch__name">{str(c.name)}</span>
              )}
              {str(c.role) && (
                <span className="gu-swatch__role">{str(c.role)}</span>
              )}
            </motion.button>
          );
        })}
      </div>
      {str(props.note) && (
        <p className="gu-caption">
          <MistlineInline text={str(props.note)} sources={sources} />
        </p>
      )}
    </section>
  );
}

// Non-capturing: highlightLine wraps this in its own group to split on, and a second
// group would return every keyword twice.
const KW =
  /\b(?:const|let|var|function|return|if|else|for|while|import|export|from|await|async|new|class|type|interface|true|false|null|undefined|SELECT|FROM|WHERE|AND|OR|ORDER|BY|LIMIT|CREATE|INDEX|CONCURRENTLY|ON|EXPLAIN|ANALYZE|BUFFERS|DESC|ASC|useState|useEffect)\b/;

function highlightLine(line: string): ReactNode {
  const cm =
    /^(\s*)(\/\/.*|--.*|#\s.*)$/.exec(line) ??
    /^(.*?\S.*?)(\s\/\/\s.*|\s--\s.*)$/.exec(line);
  const body = cm ? (cm[1] ?? "") : line;
  const comment = cm ? cm[2] : "";
  const toks = body.split(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b)/g,
  );
  return (
    <>
      {toks.map((t, i) => {
        if (!t) return null;
        if (/^["']/.test(t))
          return (
            <span key={`s-${i}`} className="tk-str">
              {t}
            </span>
          );
        if (/^\d/.test(t))
          return (
            <span key={`n-${i}`} className="tk-num">
              {t}
            </span>
          );
        return t.split(new RegExp(`(${KW.source})`, "g")).map((w, j) =>
          KW.test(w) ? (
            <span key={`k-${i}-${j}`} className="tk-kw">
              {w}
            </span>
          ) : (
            w
          ),
        );
      })}
      {comment && <span className="tk-com">{comment}</span>}
    </>
  );
}

function Code({ props, sources }: MistlineGenProps) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(() =>
    /^(markdown|md|text|txt|prompt)$/i.test(str(props.language)),
  );
  const [fullscreen, setFullscreen] = useState(false);
  const code = str(props.code);
  const lines = code.split("\n");
  const hl = new Set(
    arr(props.highlight)
      .map(num)
      .filter((x): x is number => x !== undefined),
  );

  const renderCodeBlock = (isFs = false) => (
    <figure
      className={`gu gu-code${wrap ? " is-wrap" : ""}${isFs ? " is-fs" : ""}`}
      data-variant={str(props.variant, "default")}
    >
      <header className="gu-code__head">
        <span className="gu-code__lang">{str(props.language) || "code"}</span>
        <span className="gu-code__title">{str(props.title)}</span>
        <div className="gu-code__actions">
          <motion.button
            type="button"
            className={`gu-code__copy${wrap ? " is-active" : ""}`}
            whileHover={MH.icon}
            whileTap={MH.tap}
            transition={MH.spring}
            aria-label="Toggle wrap baris"
            title="Wrap baris"
            onClick={() => setWrap((w) => !w)}
          >
            <WrapText size={14} />
          </motion.button>
          <motion.button
            type="button"
            className="gu-code__copy"
            whileHover={MH.icon}
            whileTap={MH.tap}
            transition={MH.spring}
            aria-label="Salin kode"
            title="Salin kode"
            onClick={() => {
              void navigator.clipboard?.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </motion.button>
          {!isFs && (
            <motion.button
              type="button"
              className="gu-code__copy"
              whileHover={MH.icon}
              whileTap={MH.tap}
              transition={MH.spring}
              aria-label="Layar penuh kode"
              title="Layar penuh"
              onClick={() => setFullscreen(true)}
            >
              <Expand size={11} />
            </motion.button>
          )}
        </div>
      </header>
      <pre className="gu-code__pre">
        <code>
          {lines.map((l, i) => (
            <span
              key={`ln-${i}`}
              className={`gu-code__line${hl.has(i + 1) ? " is-hl" : ""}`}
            >
              <span className="gu-code__ln">{i + 1}</span>
              <span className="gu-code__src">{l ? highlightLine(l) : " "}</span>
            </span>
          ))}
        </code>
      </pre>
      {str(props.caption) && (
        <figcaption className="gu-caption">
          <MistlineInline text={str(props.caption)} sources={sources} />
        </figcaption>
      )}
    </figure>
  );

  return (
    <>
      {renderCodeBlock(false)}
      <FullscreenPortalModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title={str(props.title) || str(props.language) || "Kode"}
        subtitle={str(props.caption)}
        variant="default"
      >
        {renderCodeBlock(true)}
      </FullscreenPortalModal>
    </>
  );
}

function Callout({ props, sources }: MistlineGenProps) {
  const tone = ["tip", "insight", "warning", "success"].includes(
    str(props.tone),
  )
    ? str(props.tone)
    : "insight";
  return (
    <aside
      className="gu gu-callout"
      data-tone={tone}
      data-variant={str(props.variant, "default")}
    >
      <span className="gu-pen gu-callout__pen momo-hand-title">
        {str(props.title) || tone}
      </span>
      <p className="gu-callout__text">
        <MistlineInline text={str(props.text)} sources={sources} />
      </p>
    </aside>
  );
}

function DiagramComp({ props, complete, surface }: MistlineGenProps) {
  const code = str(props.code);
  const kind = str(props.kind);
  const explicitGraph = useMemo(() => {
    if (!Array.isArray(props.nodes) || !Array.isArray(props.edges)) return null;
    const nodes = arr(props.nodes)
      .map(rec)
      .map((nd, i) => ({
        id: str(nd.id) || `dn-${i}`,
        label: str(nd.label) || "Node",
        type: str(nd.type) || "process",
        detail: str(nd.detail) || undefined,
        status: str(nd.status) as
          | "active"
          | "inactive"
          | "warning"
          | "error"
          | "success"
          | undefined,
      }));
    const edges = arr(props.edges)
      .map(rec)
      .map((ed, i) => ({
        id: str(ed.id) || `de-${i}`,
        source: str(ed.source),
        target: str(ed.target),
        label: str(ed.label) || undefined,
        type:
          (str(ed.type) as
            | "default"
            | "causal"
            | "dependency"
            | "data_flow"
            | "sequence"
            | "association") || "default",
        animated: Boolean(ed.animated),
      }));
    return nodes.length > 0
      ? { nodes, edges, layout: "layered" as const, direction: "LR" as const }
      : null;
  }, [props.nodes, props.edges]);

  const parsedGraph = useMemo(
    () => (code ? parseMermaidToGraph(code, kind) : null),
    [code, kind],
  );

  const activeGraph = explicitGraph || parsedGraph;
  const [viewMode, setViewMode] = useState<"xyflow" | "mermaid">("xyflow");
  const viewTabId = useId();
  const showInteractive = viewMode === "xyflow" && activeGraph !== null;

  if (!activeGraph && !code) return null;

  return (
    <div className="gu-diagram-wrap">
      {activeGraph && code && (
        <div className="gu-diagram-bar">
          <span className="gu-diagram-title">
            {str(props.title) || "Diagram"}
          </span>
          <div className="intel-filter-pills">
            <motion.button
              type="button"
              className={`intel-pill ${viewMode === "xyflow" ? "is-active" : ""}`}
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() => setViewMode("xyflow")}
            >
              {viewMode === "xyflow" && <ActivePlate layoutId={viewTabId} shadow />}
              Interactive (XYFlow)
            </motion.button>
            <motion.button
              type="button"
              className={`intel-pill ${viewMode === "mermaid" ? "is-active" : ""}`}
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() => setViewMode("mermaid")}
            >
              {viewMode === "mermaid" && <ActivePlate layoutId={viewTabId} shadow />}
              Mermaid SVG
            </motion.button>
          </div>
        </div>
      )}

      {showInteractive ? (
        <IntelligenceGraphDynamic
          graphData={activeGraph}
          title={code ? undefined : str(props.title) || "Interactive Diagram"}
          caption={str(props.caption) || undefined}
        />
      ) : code ? (
        <MermaidRenderer
          code={code}
          title={activeGraph ? undefined : str(props.title) || undefined}
          kind={kind || undefined}
          caption={str(props.caption) || undefined}
          complete={complete}
          allowFullscreen={surface !== "explore"}
        />
      ) : null}
    </div>
  );
}

function Flow({ props, live, sources, onAction }: MistlineGenProps) {
  const nodes = arr(props.nodes ?? props.steps ?? props.items)
    .map((raw): Record<string, unknown> => {
      if (typeof raw === "string" || typeof raw === "number") {
        return { label: String(raw).trim() };
      }
      const x = rec(raw);
      return {
        ...x,
        label: str(x.label) || str(x.title) || str(x.name) || str(x.step),
        detail:
          str(x.detail) ||
          str(x.description) ||
          str(x.subtitle) ||
          str(x.note),
      };
    })
    .filter((x) => str(x.label));
  const rawVariant = str(props.variant, "cycle");
  const rawPicked = ["cycle", "chevron", "alternating", "cascade"].includes(
    rawVariant,
  )
    ? rawVariant
    : "cycle";
  // A ring with <3 nodes collapses into an unreadable vertical stack; chevron reads L→R instead.
  const variant =
    rawPicked === "cycle" && nodes.length < 3 ? "chevron" : rawPicked;
  const [activeIdx, setActiveIdx] = useState<number>(() =>
    nodes.length > 1 ? 1 : 0,
  );
  const safeActive =
    nodes.length > 0 ? Math.min(activeIdx, nodes.length - 1) : 0;
  const activeNode = nodes[safeActive];

  const selectNode = (idx: number, label: string) => {
    setActiveIdx(idx);
    if (live && variant === "cascade") {
      onAction?.({
        type: "send",
        text: `Jelaskan peran dan mekanisme tahap "${label}" dalam alur ini.`,
      });
    }
  };

  if (nodes.length === 0) return null;

  /* ── Variant 1: Cycle Ring ── */
  const renderCycle = () => {
    const cx = 280;
    const cy = 175;
    const r = 112;
    const nCount = nodes.length;
    const stepCoords = nodes.map((nd, i) => {
      const angle = -Math.PI / 2 + (i / nCount) * Math.PI * 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      const labelDist = r + 32;
      const lx = cx + labelDist * Math.cos(angle);
      const ly = cy + labelDist * Math.sin(angle);
      const cos = Math.cos(angle);
      const anchor: "start" | "middle" | "end" =
        cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
      return { nd, i, angle, x, y, lx, ly, anchor };
    });

    const startX = cx;
    const startY = cy - r;
    const endCoord = stepCoords[safeActive];
    const progressRatio = safeActive / nCount;
    const arcPath =
      safeActive > 0
        ? `M ${startX} ${startY} A ${r} ${r} 0 ${progressRatio > 0.5 ? 1 : 0} 1 ${endCoord.x.toFixed(1)} ${endCoord.y.toFixed(1)}`
        : "";

    return (
      <div className="gu-flow-cycle">
        <div className="gu-flow-cycle__stage">
          <svg viewBox="-60 -15 680 390" className="gu-flow-cycle__svg">
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="var(--gu-rule)"
              strokeWidth="2.5"
            />
            {arcPath && (
              <path
                d={arcPath}
                fill="none"
                stroke="var(--gu-accent, #ef8c66)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}
            {stepCoords.map(({ nd, i, lx, ly, anchor }) => {
              const title = str(nd.label);
              const detail = str(nd.detail);
              const isHighlighted = i <= safeActive;
              return (
                <g
                  key={i}
                  className="gu-flow-cycle__label-group"
                  onClick={() => setActiveIdx(i)}
                  style={{ cursor: "pointer" }}
                >
                  <text
                    x={lx}
                    y={ly - (detail ? 6 : 0)}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    className={`gu-flow-cycle__lbl-title${isHighlighted ? " is-active" : ""}`}
                  >
                    {title}
                  </text>
                  {detail && (
                    <text
                      x={lx}
                      y={ly + 11}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      className="gu-flow-cycle__lbl-sub"
                    >
                      {detail.length > 26 ? `${detail.slice(0, 24)}…` : detail}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {stepCoords.map(({ nd, i, x, y }) => {
            const leftPct = ((x + 60) / 680) * 100;
            const topPct = ((y + 15) / 390) * 100;
            const isHighlighted = i <= safeActive;
            return (
              <motion.button
                key={i}
                type="button"
                className={`gu-flow-cycle__node${isHighlighted ? " is-active" : ""}`}
                whileTap={MH.tap}
                transition={MH.spring}
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                onClick={() => selectNode(i, str(nd.label))}
                aria-label={`${i + 1}. ${str(nd.label)}`}
              >
                {i + 1}
              </motion.button>
            );
          })}

          {activeNode && (
            <div className="gu-flow-cycle__center">
              <div className="gu-flow-cycle__center-title">
                {str(activeNode.label)}
              </div>
              {str(activeNode.detail) && (
                <div className="gu-flow-cycle__center-sub">
                  {str(activeNode.detail)}
                </div>
              )}
              <div className="gu-flow-cycle__nav">
                <motion.button
                  whileTap={MH.tap}
                  transition={MH.spring}
                  type="button"
                  onClick={() =>
                    setActiveIdx((idx) => (idx - 1 + nCount) % nCount)
                  }
                >
                  Sebelumnya
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setActiveIdx((idx) => (idx + 1) % nCount)}
                >
                  Berikutnya
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {activeNode &&
          (str(activeNode.description) || str(activeNode.detail)) && (
            <div>
              <div className="gu-pen gu-flow-hand-note">
                step {safeActive + 1}
              </div>
              <p className="gu-flow-cycle__desc">
                {str(activeNode.description) || str(activeNode.detail)}
              </p>
            </div>
          )}
      </div>
    );
  };

  /* ── Variant 2: Chevron Horizontal Arrow Strip ── */
  const renderChevron = () => (
    <div className="gu-flow-chevron" role="list">
      {nodes.map((nd, i) => {
        const stateCls =
          i === safeActive
            ? "is-active"
            : i < safeActive
              ? "is-done"
              : "is-upcoming";
        const cleanTitle = str(nd.label).replace(/^\s*0*\d+[.):\-–—]\s+/, "");
        return (
          <div key={i} role="listitem" className={`gu-flow-chevron__item ${stateCls}`}>
            <motion.button
              type="button"
              className="gu-flow-chevron__btn"
              whileHover={MH.node}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() => selectNode(i, cleanTitle)}
            >
              <span className="gu-flow-chevron__num">{i + 1}</span>
              <strong className="gu-flow-chevron__title">
                {cleanTitle}
              </strong>
              {str(nd.detail) && (
                <span className="gu-flow-chevron__sub">{str(nd.detail)}</span>
              )}
            </motion.button>
          </div>
        );
      })}
    </div>
  );

  /* ── Variant 3: Alternating Above/Below Timeline Axis ── */
  const renderAlternating = () => (
    <div
      className="gu-flow-alt"
      style={{ ["--flow-cols" as string]: nodes.length } as React.CSSProperties}
    >
      {nodes.map((nd, i) => {
        const isOddAbove = i % 2 === 0;
        const isHighlighted = i <= safeActive;
        const nextActive = i < safeActive;
        return (
          <div key={i} className="gu-flow-alt__col">
            <div className="gu-flow-alt__slot is-top">
              {isOddAbove && (
                <motion.button
                  type="button"
                  className="gu-flow-alt__text"
                  whileHover={MH.chip}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  onClick={() => selectNode(i, str(nd.label))}
                >
                  <strong>{str(nd.label)}</strong>
                  {str(nd.detail) && <span>{str(nd.detail)}</span>}
                </motion.button>
              )}
            </div>

            <div className="gu-flow-alt__rail">
              <span
                className={`gu-flow-alt__seg is-left${i === 0 ? " is-hidden" : ""}${isHighlighted ? " is-active" : ""}`}
              />
              <motion.button
                type="button"
                className={`gu-flow-alt__num${isHighlighted ? " is-active" : ""}`}
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={() => selectNode(i, str(nd.label))}
              >
                {i + 1}
              </motion.button>
              <span
                className={`gu-flow-alt__seg is-right${i === nodes.length - 1 ? " is-hidden" : ""}${nextActive ? " is-active" : ""}`}
              />
            </div>

            <div className="gu-flow-alt__slot is-bottom">
              {!isOddAbove && (
                <motion.button
                  type="button"
                  className="gu-flow-alt__text"
                  whileHover={MH.chip}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  onClick={() => selectNode(i, str(nd.label))}
                >
                  <strong>{str(nd.label)}</strong>
                  {str(nd.detail) && <span>{str(nd.detail)}</span>}
                </motion.button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ── Variant 4: Stepped Waterfall Cascade ── */
  const renderCascade = () => (
    <ol className="gu-flow-cascade" role="list">
      {nodes.map((nd, i) => {
        const isHighlighted = i <= safeActive;
        const hasNext = i < nodes.length - 1;
        const connectorActive = i < safeActive;
        return (
          <li
            key={i}
            className="gu-flow-cascade__row"
            style={{ ["--cascade-step" as string]: i } as React.CSSProperties}
          >
            <div
              className={`gu-flow-cascade__card${i === safeActive ? " is-active" : ""}`}
              onClick={() => selectNode(i, str(nd.label))}
            >
              <span
                className={`gu-flow-cascade__num${isHighlighted ? " is-active" : ""}`}
              >
                {i + 1}
              </span>
              <div className="gu-flow-cascade__body">
                <strong>{str(nd.label)}</strong>
                {str(nd.detail) && (
                  <div className="gu-flow-cascade__sub">{str(nd.detail)}</div>
                )}
                {str(nd.description) && (
                  <p className="gu-flow-cascade__desc">{str(nd.description)}</p>
                )}
              </div>
              {hasNext && (
                <span
                  aria-hidden="true"
                  className={`gu-flow-cascade__elbow${connectorActive ? " is-active" : ""}`}
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <figure className="gu gu-flow-root" data-variant={variant}>
      <Heading text={props.title} sources={sources} />
      {str(props.caption) && (
        <p className="gu-flow-root__sub">
          <MistlineInline text={str(props.caption)} sources={sources} />
        </p>
      )}

      {variant === "cycle" && renderCycle()}
      {variant === "chevron" && renderChevron()}
      {variant === "alternating" && renderAlternating()}
      {variant === "cascade" && renderCascade()}
    </figure>
  );
}

function MapComp({
  props,
  onAction,
  onUiInteraction,
  pinnedTitles,
  onTogglePinItem,
}: MistlineGenProps) {
  const pins: InteractiveMapPin[] = arr(props.pins)
    .map(rec)
    .filter((p) => Boolean(str(p.name)))
    .map((p) => ({
      name: str(p.name),
      lat: num(p.lat),
      lng: num(p.lng),
      area: str(p.area) || undefined,
      address: str(p.address) || undefined,
      category: str(p.category) || undefined,
      note: str(p.note) || undefined,
      time: str(p.time) || undefined,
      rating:
        str(p.rating) ||
        (num(p.rating) !== undefined ? String(num(p.rating)) : undefined),
      price: str(p.price) || undefined,
      status: str(p.status) || undefined,
      imageUrl: str(p.imageUrl) || str(p.image) || undefined,
      imageQuery: str(p.imageQuery) || undefined,
      prompt: str(p.prompt) || undefined,
    }));

  if (pins.length === 0) return null;
  return (
    <section className="gu gu-map" data-variant={str(props.variant, "default")}>
      <InteractiveMapBlock
        title={str(props.title) || undefined}
        subtitle={str(props.subtitle) || undefined}
        pins={pins}
        connectRoute={props.connectRoute !== false}
        height={300}
        onPromptAction={(p) => onAction?.({ type: "send", text: p })}
        onUiInteraction={onUiInteraction}
        pinnedTitles={pinnedTitles}
        onTogglePinItem={onTogglePinItem}
      />
    </section>
  );
}

function Choices({ props, live, complete, onAction }: MistlineGenProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const options = arr(props.options ?? props.items)
    .map((raw): Record<string, unknown> => {
      if (typeof raw === "string" || typeof raw === "number") {
        return { label: String(raw).trim() };
      }
      const o = rec(raw);
      return {
        ...o,
        label: str(o.label) || str(o.title) || str(o.text) || str(o.option),
      };
    })
    .filter((o) => str(o.label));
  const enabled = live && complete && !picked;
  const choose = (label: string) => {
    if (!enabled) return;
    setPicked(label);
    onAction?.({ type: "send", text: label });
  };
  return (
    <section
      className={`gu gu-question${picked ? " is-answered" : ""}`}
      data-variant={str(props.variant, "default")}
    >
      <h3 className="gu-title">{str(props.question) || "\u00a0"}</h3>
      <div className="gu-chips">
        {options.map((o, i) => (
          <motion.button
            type="button"
            key={`opt-${i}`}
            disabled={!enabled}
            className={`gu-chip is-words${picked === str(o.label) ? " is-picked" : ""}`}
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => choose(str(o.label))}
          >
            <span className="gu-chip__label">{str(o.label)}</span>
            {str(o.detail) && (
              <span className="gu-chip__sub">{str(o.detail)}</span>
            )}
            {picked === str(o.label) && (
              <span className="gu-chip__check">
                <Check size={13} strokeWidth={2.5} />
              </span>
            )}
          </motion.button>
        ))}
      </div>
      {props.allowCustom === true && enabled && (
        <form
          className="gu-question__own"
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) choose(custom.trim());
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Tulis jawabanmu sendiri…"
            aria-label="Jawaban kustom"
          />
          <motion.button
            type="submit"
            aria-label="Kirim"
            whileTap={MH.tap}
            transition={MH.spring}
          >
            <ArrowRight size={16} />
          </motion.button>
        </form>
      )}
    </section>
  );
}

function Quiz({ props, sources }: MistlineGenProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const options = arr(props.options)
    .map((o) => str(o))
    .filter(Boolean);
  const answer = num(props.answer);
  return (
    <section
      className="gu gu-question"
      data-variant={str(props.variant, "default")}
    >
      <p className="gu-kicker">Cek pemahaman</p>
      <h3 className="gu-title">{str(props.question) || "\u00a0"}</h3>
      <div className="gu-chips gu-chips--quiz">
        {options.map((o, i) => {
          const state =
            picked === null
              ? ""
              : i === answer
                ? " is-right"
                : i === picked
                  ? " is-wrong"
                  : " is-dim";
          return (
            <motion.button
              type="button"
              key={`quiz-${i}`}
              className={`gu-chip is-words${state}`}
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              disabled={picked !== null || answer === undefined}
              onClick={() => setPicked(i)}
            >
              <span className="gu-chip__letter">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="gu-chip__label">
                <MistlineInline text={o} sources={sources} />
              </span>
            </motion.button>
          );
        })}
      </div>
      {picked !== null && (
        <p className="gu-question__explain">
          <span className="gu-pen momo-hand-title">
            {picked === answer ? "tepat!" : "kurang pas"}
          </span>{" "}
          <MistlineInline text={str(props.explain)} sources={sources} />
        </p>
      )}
    </section>
  );
}

function Checklist({ props, complete, sources }: MistlineGenProps) {
  const items = arr(props.items ?? props.tasks)
    .map((raw): Record<string, unknown> => {
      if (typeof raw === "string" || typeof raw === "number") {
        return { text: String(raw).trim(), note: "", done: false };
      }
      const x = rec(raw);
      return {
        ...x,
        text: str(x.text) || str(x.title) || str(x.label) || str(x.task),
        note: str(x.note) || str(x.detail) || str(x.description),
        done: x.done === true || x.checked === true || x.completed === true,
      };
    })
    .filter((x) => x.text);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const reduce = useReducedMotion();
  const isDone = (i: number) => done[i] ?? items[i]?.done === true;
  const count = items.filter((_, i) => isDone(i)).length;
  if (items.length === 0 && complete) {
    return null;
  }
  const pct = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
  return (
    <section
      className="gu gu-check"
      data-variant={str(props.variant, "default")}
    >
      <div className="gu-check__head">
        <Heading text={props.title} sources={sources} />
        {items.length > 0 && (
          <span className="gu-check__count">
            {count} / {items.length}
          </span>
        )}
      </div>
      {items.length > 0 && (
        <div className="gu-check__progress" aria-hidden="true">
          <motion.div
            className="gu-check__progress-fill"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={MH.spring}
          />
        </div>
      )}
      <ul className="gu-check__list">
        {items.map((it, i) => (
          <li key={`chk-${i}`} className={isDone(i) ? "is-done" : ""}>
            <motion.button
              type="button"
              onClick={(e) => {
                tweenPaint(e.currentTarget.querySelector(".gu-check__box"), reduce);
                setDone((d) => ({ ...d, [i]: !isDone(i) }));
              }}
              aria-pressed={isDone(i)}
              className="gu-check__btn"
              whileTap={MH.tap}
              transition={MH.spring}
            >
              <span className="gu-check__box">
                <AnimatePresence initial={false}>
                  {isDone(i) && (
                    <CheckGlyph key="check" size={11} strokeWidth={2.7} />
                  )}
                </AnimatePresence>
              </span>
              <span className="gu-check__body">
                <span className="gu-check__text">
                  <MistlineInline text={str(it.text)} sources={sources} />
                </span>
                {str(it.note) && (
                  <span className="gu-check__aside">
                    {str(it.note)}
                  </span>
                )}
              </span>
            </motion.button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Table({ props, complete, sources }: MistlineGenProps) {
  const columns = arr(props.columns).map((c) => {
    if (typeof c === "string" || typeof c === "number") return str(c);
    const cr = rec(c);
    return str(cr.label) || str(cr.title) || str(cr.name) || str(cr.key);
  });
  const colKeys = arr(props.columns).map((c) => {
    if (typeof c === "string" || typeof c === "number") return str(c);
    const cr = rec(c);
    return str(cr.key) || str(cr.label) || str(cr.title) || str(cr.name);
  });
  const rawRows = arr(props.rows).map((r) => {
    if (Array.isArray(r)) return r;
    const ro = rec(r);
    if (colKeys.length > 0) {
      return colKeys.map((k, idx) => ro[k] ?? ro[columns[idx]] ?? "");
    }
    return Object.values(ro);
  });
  // Keyed by content so a sort moves the row instead of rewriting its cells in place.
  const seenRows = new Map<string, number>();
  const keyedRows = rawRows.map((cells) => {
    const content = cells.map((cell) => str(cell)).join("\u001f");
    const dupes = seenRows.get(content) ?? 0;
    seenRows.set(content, dupes + 1);
    return { key: dupes ? `${content}#${dupes}` : content, cells };
  });
  const reduce = useReducedMotion();
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterText, setFilterText] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  const isNum = (v: unknown) =>
    /^[\s$€£¥Rp+−-]*[\d.,]+\s*(%|ms|s|k|m|MB|GB|h|x)?$/i.test(str(v));

  const parseSortNumber = (v: unknown): number | null => {
    const clean = str(v).replace(/[^0-9.-]/g, "");
    if (!clean) return null;
    const n = Number(clean);
    return Number.isFinite(n) ? n : null;
  };

  const processedRows = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const filtered = q
      ? keyedRows.filter((row) =>
          row.cells.some((cell) => str(cell).toLowerCase().includes(q)),
        )
      : keyedRows;
    if (sortCol === null) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a.cells[sortCol];
      const bv = b.cells[sortCol];
      const an = parseSortNumber(av);
      const bn = parseSortNumber(bv);
      const cmp =
        an !== null && bn !== null
          ? an - bn
          : str(av).localeCompare(str(bv), "id");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [keyedRows, filterText, sortCol, sortDir]);

  if (columns.length === 0 && rawRows.length === 0 && complete) {
    return null;
  }

  const toggleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      if (sortDir === "asc") setSortDir("desc");
      else setSortCol(null);
    } else {
      setSortCol(colIdx);
      setSortDir("asc");
    }
  };

  const renderTable = (isFs = false) => (
    <figure
      className={`gu gu-table${isFs ? " is-fs" : ""}`}
      data-variant={str(props.variant, "default")}
    >
      <div className="gu-table__top">
        <Heading text={props.title} sources={sources} />
        <div className="gu-table__tools">
          {rawRows.length >= 5 && (
            <input
              type="search"
              className="gu-table__search"
              placeholder="Saring baris…"
              aria-label="Saring baris tabel"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          )}
          {!isFs && (
            <motion.button
              type="button"
              className="gu-icon-btn"
              whileHover={MH.icon}
              whileTap={MH.tap}
              transition={MH.spring}
              aria-label="Perbesar tabel"
              title="Layar penuh tabel"
              onClick={() => setFullscreen(true)}
            >
              <Expand size={11} />
            </motion.button>
          )}
        </div>
      </div>
      <div className="gu-table__scroll">
        <table>
          {columns.length > 0 && (
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={`th-${i}`}>
                    <motion.button
                      type="button"
                      className={`gu-table__sort${sortCol === i ? " is-active" : ""}`}
                      whileHover={MH.chip}
                      whileTap={MH.tap}
                      transition={MH.spring}
                      onClick={() => toggleSort(i)}
                    >
                      <span>{c}</span>
                      {sortCol === i ? (
                        sortDir === "asc" ? (
                          <ArrowUp size={11} />
                        ) : (
                          <ArrowDown size={11} />
                        )
                      ) : (
                        <ArrowUpDown
                          size={11}
                          className="gu-table__sort-idle"
                        />
                      )}
                    </motion.button>
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            <AnimatePresence initial={false}>
              {processedRows.map((row) => (
                <motion.tr
                  key={row.key}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={reduce ? INSTANT : { layout: MH.spring, opacity: MH.ease }}
                >
                  {row.cells.map((cell, j) => (
                    <td
                      key={`td-${j}`}
                      className={j > 0 && isNum(cell) ? "is-num" : ""}
                    >
                      <MistlineInline text={str(cell)} sources={sources} />
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      {str(props.caption) && (
        <figcaption className="gu-caption">
          <MistlineInline text={str(props.caption)} sources={sources} />
        </figcaption>
      )}
    </figure>
  );

  return (
    <>
      {renderTable(false)}
      <FullscreenPortalModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title={str(props.title) || "Tabel Data"}
        subtitle={str(props.caption)}
        variant="default"
      >
        {renderTable(true)}
      </FullscreenPortalModal>
    </>
  );
}

export function MistlineFollowChips({
  items,
  live,
  variant = "default",
  onAction,
}: {
  items: string[];
  live: boolean;
  variant?: string;
  onAction?: (a: MistlineAction) => void;
}) {
  if (!items.length) return null;
  const resolvedVariant = ["default", "editorial", "split", "minimal"].includes(
    variant,
  )
    ? variant
    : "default";
  const usedIcons = new Set<string>();
  return (
    <nav
      className="gu gu-follow"
      data-variant={resolvedVariant}
      aria-label="Pertanyaan lanjutan"
    >
      <div className="gu-follow__root" aria-hidden="true">
        <span className="gu-follow__root-ico">
          <CornerDownRight size={12} strokeWidth={1.85} />
        </span>
        <span
          className={
            resolvedVariant === "editorial"
              ? "gu-follow__kicker gu-pen momo-hand-title"
              : "gu-follow__root-label"
          }
        >
          {resolvedVariant === "editorial"
            ? "lanjut telusuri"
            : "Lanjut telusuri"}
        </span>
      </div>
      <ul className="gu-follow__tree" role="list">
        {items.map((t, i) => {
          const itemIcon = inferContextualIcon(t, undefined, i, usedIcons);
          usedIcons.add(itemIcon);
          return (
            <li key={`foll-${i}`} className="gu-follow__node">
              <motion.button
                type="button"
                className="gu-follow__item"
                disabled={!live}
                whileTap={live ? { scale: 0.99 } : undefined}
                transition={MH.spring}
                onClick={() => onAction?.({ type: "send", text: t })}
                title={t}
              >
                <span className="gu-follow__ico" aria-hidden="true">
                  <MistlineIcon name={itemIcon} size={13} strokeWidth={1.75} />
                </span>
                <span className="gu-follow__label">{t}</span>
              </motion.button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Followups({ props, live, onAction }: MistlineGenProps) {
  const items = arr(props.items)
    .map((x) => str(x))
    .filter(Boolean);
  return (
    <MistlineFollowChips
      items={items}
      live={live}
      variant={str(props.variant, "default")}
      onAction={onAction}
    />
  );
}

function useResolvedSingleImage(opts: {
  query: string;
  direct: string;
  boundAsset?: unknown;
  sourceUrl?: string;
  caption?: string;
  alt: string;
  onReady?: () => void;
}) {
  const slotId = useId();
  const { query, direct, boundAsset, sourceUrl, caption, alt, onReady } = opts;
  const { complete: blockComplete } = useContext(MistlineBlockStreamContext);
  const mediaCtx = useContext(MistlineMediaContext);
  const boundAssetKey = boundAsset ? JSON.stringify(boundAsset) : "";
  const [retryCount, setRetryCount] = useState(0);

  const safeFallbackAlt =
    alt &&
    alt !== query &&
    !isGenericPlaceholderQuery(alt) &&
    !isAbstractNonVisualTitle(alt)
      ? alt
      : undefined;

  const pickUnclaimed = (
    candidates: NormalizedImageAsset[],
  ): { primary: NormalizedImageAsset | null; fallbacks: string[] } => {
    if (candidates.length === 0) return { primary: null, fallbacks: [] };
    const unclaimed = candidates.filter((c) => {
      const u = c.thumbnailUrl || c.imageUrl || "";
      return !u || !mediaCtx.isUrlClaimedByOtherSlot(slotId, u);
    });
    const ordered = unclaimed.length > 0 ? unclaimed : candidates;
    const primary = ordered[0] ?? null;
    const fallbacks = ordered
      .slice(1)
      .map((c) => c.thumbnailUrl || c.imageUrl)
      .filter((u): u is string => Boolean(u));
    return { primary, fallbacks };
  };

  const initialCacheHit =
    !inferAssetFromUnknown(boundAsset, alt) &&
    !(direct && isLikelyImageUrl(direct)) &&
    query
      ? peekVerifiedWebImages(query, safeFallbackAlt, mediaCtx.contextAnchor)
      : undefined;

  const [status, setStatus] = useState<ImageAssetStatus>(() => {
    if (
      inferAssetFromUnknown(boundAsset, alt) ||
      (direct && isLikelyImageUrl(direct))
    ) {
      return "loading";
    }
    if (!blockComplete) return "searching";
    if (!query || isGenericPlaceholderQuery(query)) return "error";
    if (initialCacheHit) {
      return initialCacheHit.primary ? "loading" : "error";
    }
    return "searching";
  });
  const [asset, setAsset] = useState<NormalizedImageAsset | null>(() => {
    const bound = inferAssetFromUnknown(boundAsset, alt);
    if (bound) return bound;
    if (direct && isLikelyImageUrl(direct)) {
      return {
        id: `direct_${retryCount}_${direct.slice(-12)}`,
        imageUrl: direct,
        sourceUrl: sourceUrl && isSafeUrl(sourceUrl) ? sourceUrl : direct,
        caption,
        alt,
        provider: "bound",
        status: "loading",
      };
    }
    if (initialCacheHit?.candidates?.length) {
      return pickUnclaimed(initialCacheHit.candidates).primary;
    }
    return null;
  });
  const [fallbackUrls, setFallbackUrls] = useState<string[]>(() => {
    if (initialCacheHit?.candidates?.length) {
      return pickUnclaimed(initialCacheHit.candidates).fallbacks;
    }
    return [];
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const chosenUrl = asset?.thumbnailUrl || asset?.imageUrl;
    if (chosenUrl) {
      mediaCtx.registerSlotKeys(slotId, [chosenUrl, asset?.imageUrl || ""]);
    }
  }, [asset, mediaCtx, slotId]);

  useEffect(() => {
    const bound = inferAssetFromUnknown(boundAsset, alt);
    if (bound) {
      setAsset(bound);
      setFallbackUrls([]);
      setStatus("loading");
      setErrorMsg(null);
      return;
    }
    if (direct && isLikelyImageUrl(direct)) {
      setAsset({
        id: `direct_${retryCount}_${direct.slice(-12)}`,
        imageUrl: direct,
        sourceUrl: sourceUrl && isSafeUrl(sourceUrl) ? sourceUrl : direct,
        caption,
        alt,
        provider: "bound",
        status: "loading",
      });
      setFallbackUrls([]);
      setStatus("loading");
      setErrorMsg(null);
      return;
    }
    if (!blockComplete) {
      setStatus("searching");
      return;
    }
    if (!query || isGenericPlaceholderQuery(query)) {
      setStatus("error");
      setErrorMsg("Query atau URL gambar tidak tersedia.");
      onReady?.();
      return;
    }

    if (retryCount === 0) {
      const syncHit = peekVerifiedWebImages(
        query,
        safeFallbackAlt,
        mediaCtx.contextAnchor,
      );
      if (syncHit) {
        const { primary, fallbacks } = pickUnclaimed(syncHit.candidates);
        if (primary) {
          setAsset(primary);
          setFallbackUrls(fallbacks);
          setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
          setErrorMsg(null);
        } else {
          setAsset(null);
          setFallbackUrls([]);
          setStatus("error");
          setErrorMsg("Tidak ada foto terverifikasi ditemukan.");
          onReady?.();
        }
        return;
      }
    }

    let dead = false;
    setStatus("searching");
    setErrorMsg(null);
    fetchVerifiedWebImages(query, alt, safeFallbackAlt, {
      contextAnchor: mediaCtx.contextAnchor,
      sources: mediaCtx.sources,
      bypassCache: retryCount > 0,
    })
      .then((bundle) => {
        if (dead) return;
        const { primary, fallbacks } = pickUnclaimed(bundle.candidates);
        if (primary) {
          setAsset(primary);
          setFallbackUrls(fallbacks);
          setStatus("loading");
        } else {
          setStatus("error");
          setErrorMsg("Tidak ada foto terverifikasi ditemukan.");
          onReady?.();
        }
      })
      .catch((err) => {
        if (dead) return;
        setStatus("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Gagal memuat gambar.",
        );
        onReady?.();
      });

    return () => {
      dead = true;
    };
  }, [
    query,
    direct,
    boundAssetKey,
    sourceUrl,
    caption,
    alt,
    safeFallbackAlt,
    retryCount,
    blockComplete,
    mediaCtx,
    slotId,
    onReady,
  ]);

  const retry = () => {
    setAsset(null);
    setFallbackUrls([]);
    setRetryCount((c) => c + 1);
  };

  const markLoaded = () => {
    setStatus("ready");
    onReady?.();
  };

  const markFailed = () => {
    setStatus("error");
    setErrorMsg("Gambar gagal dimuat.");
    onReady?.();
  };

  return {
    asset,
    fallbackUrls,
    status,
    errorMsg,
    retry,
    markLoaded,
    markFailed,
  };
}

function ImageLightboxModal({
  asset,
  onClose,
}: {
  asset: {
    src: string;
    alt: string;
    caption?: string;
    sourceUrl?: string;
    sourceTitle?: string;
  };
  onClose: () => void;
}) {
  const [imgSrc, setImgSrc] = useState(asset.src);
  useEffect(() => {
    setImgSrc(asset.src);
  }, [asset.src]);
  return (
    <FullscreenPortalModal
      open
      onClose={onClose}
      title={asset.alt}
      subtitle={asset.caption}
      variant="media"
    >
      <div className="gu-fs-media-wrap">
        <img
          src={imgSrc}
          alt={asset.alt}
          className="gu-fs-media-img"
          onError={() => {
            if (
              /^https?:\/\//i.test(imgSrc) &&
              !imgSrc.startsWith("/api/image")
            ) {
              setImgSrc(buildProxiedImageUrl(imgSrc));
            }
          }}
        />
        {asset.sourceUrl && isSafeUrl(asset.sourceUrl) && (
          <motion.a
            href={asset.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gu-pill-btn"
            whileTap={MH.tap}
            transition={MH.spring}
          >
            {asset.sourceTitle || "Buka sumber gambar"} ↗
          </motion.a>
        )}
      </div>
    </FullscreenPortalModal>
  );
}

function ResolvedMediaSurface({
  asset,
  fallbackUrls,
  status,
  query,
  alt,
  seed,
  ratio,
  icon = "camera",
  className = "",
  onLoaded,
  onFailed,
  onRetry,
  onZoom,
  topLeftSlot,
  overlayCaption,
  showZoom = true,
  children,
}: {
  asset: NormalizedImageAsset | null;
  fallbackUrls: string[];
  status: ImageAssetStatus;
  query?: string;
  alt: string;
  seed: string;
  ratio: string;
  icon?: string;
  className?: string;
  onLoaded: () => void;
  onFailed: () => void;
  onRetry: () => void;
  onZoom?: () => void;
  topLeftSlot?: ReactNode;
  overlayCaption?: string;
  showZoom?: boolean;
  children?: ReactNode;
}) {
  const displaySrc = pickSharpDisplayImageUrl(asset) || undefined;
  const fullSrc = asset?.imageUrl || displaySrc;
  const isError = status === "error";

  return (
    <div
      className={`gu-img-stage${isError ? " is-fallback" : ""}${className ? ` ${className}` : ""}`}
      style={{ aspectRatio: ratio }}
    >
      {topLeftSlot && <div className="gu-img-stage__tl">{topLeftSlot}</div>}
      {isError ? (
        <>
          <MistlinePostcard
            seed={seed}
            icon={icon}
            ratio={ratio}
            className="gu-img-stage__photo"
          />
          <motion.button
            type="button"
            className="gu-img-stage__action is-retry"
            whileHover={MH.icon}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={onRetry}
          >
            <RefreshCw size={11} />
            <span>Muat ulang</span>
          </motion.button>
        </>
      ) : displaySrc ? (
        <>
          <MistlinePhoto
            src={displaySrc}
            fallbackUrls={fallbackUrls}
            query={query || undefined}
            fallbackQuery={alt}
            seed={seed}
            icon={icon}
            ratio={ratio}
            className="gu-img-stage__photo"
            onLoaded={onLoaded}
            onFailed={onFailed}
          />
          {showZoom && status === "ready" && fullSrc && onZoom && (
            <motion.button
              type="button"
              className="gu-img-stage__action is-zoom"
              whileHover={MH.icon}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={onZoom}
              aria-label="Perbesar gambar"
              title="Perbesar gambar"
            >
              <Expand size={12.5} />
            </motion.button>
          )}
        </>
      ) : (
        <div
          className="gu-skel gu-skel--image gu-img-stage__pending"
          style={{ aspectRatio: ratio }}
          aria-busy="true"
          aria-label={query ? `Mencari foto: ${query}` : "Memuat gambar"}
        />
      )}
      {overlayCaption && (
        <div className="gu-img-stage__overlay-cap">{overlayCaption}</div>
      )}
      {children}
    </div>
  );
}

/**
 * Real-image component supporting BOTH:
 *  - bound: `src` / `asset` from search_images / web_search
 *  - query: semantic `query` resolved server-side via /api/image
 * Reports pixel decode readiness via `onReady` so GuRegion keeps skeleton until ready.
 */
function AsyncImage({ props, onReady }: MistlineGenProps) {
  const query = str(props.query);
  const direct = str(props.src) || str(props.imageUrl);
  const heading = str(props.title);
  const caption = str(props.caption);
  const sourceUrl = str(props.sourceUrl) || str(props.source);
  const alt =
    str(props.alt) || caption || heading || query || "Gambar referensi";
  const ratio = str(props.ratio) || "16/10";
  const rawVar = str(props.variant, "default");
  const variant = ["default", "editorial", "split", "minimal"].includes(rawVar)
    ? rawVar
    : "default";
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { asset, fallbackUrls, status, retry, markLoaded, markFailed } =
    useResolvedSingleImage({
      query,
      direct,
      boundAsset: props.asset,
      sourceUrl,
      caption,
      alt,
      onReady,
    });

  const displaySrc = asset?.thumbnailUrl || asset?.imageUrl;
  const fullSrc = asset?.imageUrl || displaySrc;
  const resolvedSource =
    asset?.sourceUrl ||
    (sourceUrl && isSafeUrl(sourceUrl) ? sourceUrl : undefined);
  const resolvedCaption = caption || asset?.caption || (heading ? "" : alt);
  const displayLabel = heading || resolvedCaption || alt;
  const badgeText =
    status === "ready"
      ? `${ratio} · VERIFIED`
      : status === "error"
        ? `${ratio} · FALLBACK`
        : `${ratio} · LIVE`;

  return (
    <figure
      className={`gu gu-asyncimg gu-asyncimg--${status}`}
      data-variant={variant}
      data-status={status}
    >
      {variant === "minimal" && heading && (
        <h3 className="gu-title gu-img-title">{heading}</h3>
      )}
      <ResolvedMediaSurface
        asset={asset}
        fallbackUrls={fallbackUrls}
        status={status}
        query={query}
        alt={alt}
        seed={heading || alt || query || "Visual"}
        ratio={ratio}
        className="gu-asyncimg__frame"
        onLoaded={markLoaded}
        onFailed={markFailed}
        onRetry={retry}
        onZoom={() => setLightboxOpen(true)}
        topLeftSlot={
          variant !== "minimal" ? (
            <span className="gu-img-hud-pill">
              <Camera size={10} />
              <span>{badgeText}</span>
            </span>
          ) : undefined
        }
        overlayCaption={
          variant === "minimal"
            ? resolvedCaption && resolvedCaption !== heading
              ? resolvedCaption
              : heading
                ? undefined
                : displayLabel
            : undefined
        }
      />

      {variant !== "minimal" && (displayLabel || resolvedSource) && (
        <div className="gu-asyncimg__meta">
          {variant === "editorial" && (
            <span className="gu-pen gu-asyncimg__hand momo-hand-title">
              bingkai visual
            </span>
          )}
          {heading && (
            <strong className="gu-asyncimg__meta-title">{heading}</strong>
          )}
          {resolvedCaption && resolvedCaption !== heading && (
            <figcaption className="gu-asyncimg__caption">
              {resolvedCaption}
            </figcaption>
          )}
          {resolvedSource && (
            <a
              className="gu-asyncimg__src"
              href={resolvedSource}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{asset?.sourceTitle || "Sumber visual"}</span>
              <ArrowUpRight size={11} />
            </a>
          )}
        </div>
      )}

      {lightboxOpen && fullSrc && (
        <ImageLightboxModal
          asset={{
            src: fullSrc,
            alt,
            caption: resolvedCaption || heading,
            sourceUrl: resolvedSource,
            sourceTitle: asset?.sourceTitle,
          }}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </figure>
  );
}

/** Tactile Dark Gallery Print — distinct specimen plaque for `Image` */
function ImageComp({ props, onReady }: MistlineGenProps) {
  const query = str(props.query);
  const direct = str(props.src) || str(props.imageUrl);
  const heading = str(props.title);
  const caption = str(props.caption);
  const sourceUrl = str(props.sourceUrl) || str(props.source);
  const alt =
    str(props.alt) || caption || heading || query || "Visual specimen";
  const ratio = str(props.ratio) || "16/10";
  const rawVar = str(props.variant, "default");
  const variant = ["default", "editorial", "split", "minimal"].includes(rawVar)
    ? rawVar
    : "default";
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { asset, fallbackUrls, status, retry, markLoaded, markFailed } =
    useResolvedSingleImage({
      query,
      direct,
      boundAsset: props.asset,
      sourceUrl,
      caption,
      alt,
      onReady,
    });

  const displaySrc = asset?.thumbnailUrl || asset?.imageUrl;
  const fullSrc = asset?.imageUrl || displaySrc;
  const resolvedSource =
    asset?.sourceUrl ||
    (sourceUrl && isSafeUrl(sourceUrl) ? sourceUrl : undefined);
  const plaqueTitle = heading || alt;
  const plaqueSub =
    caption ||
    (asset?.caption && asset.caption !== plaqueTitle ? asset.caption : "");

  return (
    <figure
      className="gu gu-img-print"
      data-variant={variant}
      data-status={status}
    >
      {variant === "minimal" && heading && (
        <h3 className="gu-title gu-img-title">{heading}</h3>
      )}
      <div className="gu-img-print__well">
        <ResolvedMediaSurface
          asset={asset}
          fallbackUrls={fallbackUrls}
          status={status}
          query={query}
          alt={alt}
          seed={plaqueTitle}
          ratio={ratio}
          onLoaded={markLoaded}
          onFailed={markFailed}
          onRetry={retry}
          onZoom={() => setLightboxOpen(true)}
          overlayCaption={
            variant === "minimal"
              ? plaqueSub || (heading ? undefined : plaqueTitle)
              : undefined
          }
        />
      </div>

      {variant !== "minimal" && (
        <figcaption className="gu-img-print__plaque">
          <div className="gu-img-print__plaque-text">
            <span className="gu-pen gu-img-print__kicker momo-hand-title">
              {str(props.tag, "plat visual")}
            </span>
            <strong className="gu-img-print__title">{plaqueTitle}</strong>
            {plaqueSub && <p className="gu-img-print__sub">{plaqueSub}</p>}
          </div>
          <div className="gu-img-print__plaque-side">
            <span className="gu-img-print__ratio">{ratio}</span>
            {resolvedSource && (
              <a
                href={resolvedSource}
                target="_blank"
                rel="noopener noreferrer"
                className="gu-img-print__src"
                title={asset?.sourceTitle || "Buka sumber"}
              >
                <ArrowUpRight size={12} />
              </a>
            )}
          </div>
        </figcaption>
      )}

      {lightboxOpen && fullSrc && (
        <ImageLightboxModal
          asset={{
            src: fullSrc,
            alt,
            caption: plaqueSub || plaqueTitle,
            sourceUrl: resolvedSource,
            sourceTitle: asset?.sourceTitle,
          }}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </figure>
  );
}

function ImageWithCaption({ props, sources, onReady }: MistlineGenProps) {
  const title = str(props.title);
  const query = str(props.query);
  const direct = str(props.src) || str(props.imageUrl);
  const caption = str(props.caption);
  const sourceUrl = str(props.sourceUrl) || str(props.source);
  const alt = str(props.alt) || caption || title || query || "Gambar editorial";
  const ratio = str(props.ratio) || "16/9";
  const rawVar = str(props.variant, "default");
  const variant = ["default", "editorial", "split", "minimal"].includes(rawVar)
    ? rawVar
    : "default";
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { asset, fallbackUrls, status, retry, markLoaded, markFailed } =
    useResolvedSingleImage({
      query,
      direct,
      boundAsset: props.asset,
      sourceUrl,
      caption,
      alt,
      onReady,
    });

  const displaySrc = asset?.thumbnailUrl || asset?.imageUrl;
  const fullSrc = asset?.imageUrl || displaySrc;
  const resolvedCaption = caption || asset?.caption || alt;
  const resolvedSource =
    asset?.sourceUrl ||
    (sourceUrl && isSafeUrl(sourceUrl) ? sourceUrl : undefined);

  return (
    <figure
      className="gu gu-img-captioned"
      data-variant={variant}
      data-status={status}
    >
      {variant === "minimal" && title && (
        <h3 className="gu-title gu-img-title">
          <MistlineInline text={title} sources={sources} />
        </h3>
      )}
      <div className="gu-img-captioned__media">
        <ResolvedMediaSurface
          asset={asset}
          fallbackUrls={fallbackUrls}
          status={status}
          query={query}
          alt={alt}
          seed={title || alt}
          ratio={ratio}
          onLoaded={markLoaded}
          onFailed={markFailed}
          onRetry={retry}
          onZoom={() => setLightboxOpen(true)}
          overlayCaption={
            variant === "minimal" && resolvedCaption !== title
              ? resolvedCaption
              : undefined
          }
        />
      </div>

      {variant !== "minimal" && (
        <div className="gu-img-captioned__body">
          <span className="gu-pen gu-img-captioned__kicker momo-hand-title">
            catatan visual
          </span>
          {title && (
            <h3 className="gu-img-captioned__title">
              <MistlineInline text={title} sources={sources} />
            </h3>
          )}
          {resolvedCaption && (
            <figcaption className="gu-img-captioned__cap">
              <MistlineInline text={resolvedCaption} sources={sources} />
            </figcaption>
          )}
          {resolvedSource && (
            <a
              className="gu-asyncimg__src"
              href={resolvedSource}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{asset?.sourceTitle || "Lihat sumber"}</span>
              <ArrowUpRight size={11} />
            </a>
          )}
        </div>
      )}

      {lightboxOpen && fullSrc && (
        <ImageLightboxModal
          asset={{
            src: fullSrc,
            alt,
            caption: resolvedCaption,
            sourceUrl: resolvedSource,
            sourceTitle: asset?.sourceTitle,
          }}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </figure>
  );
}

function ImageWithCitation({ props, sources, onReady }: MistlineGenProps) {
  const rawVar = str(props.variant, "default");
  const variant = ["default", "editorial", "split", "minimal"].includes(rawVar)
    ? rawVar
    : "default";
  const query = str(props.query);
  const direct = str(props.src) || str(props.imageUrl);
  const caption = str(props.caption);
  const citIdx = num(props.citationIndex);
  const srcUrl = str(props.sourceUrl) || str(props.source);
  const srcTitle = str(props.sourceTitle);
  const alt =
    str(props.alt) || caption || srcTitle || query || "Gambar terverifikasi";
  const ratio = str(props.ratio) || "16/9";
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { asset, fallbackUrls, status, retry, markLoaded, markFailed } =
    useResolvedSingleImage({
      query,
      direct,
      boundAsset: props.asset,
      sourceUrl: srcUrl,
      caption,
      alt,
      onReady,
    });

  const resolvedUrl = srcUrl || asset?.sourceUrl || "";
  const resolvedTitle = srcTitle || asset?.sourceTitle || "";
  const resolvedCaption = caption || asset?.caption || "";
  const matchedIdx =
    citIdx ??
    (sources && resolvedUrl
      ? sources.findIndex((s) => s.url === resolvedUrl) + 1
      : 0);
  let domain = "";
  if (resolvedUrl) {
    try {
      domain = new URL(resolvedUrl).hostname.replace(/^www\./, "");
    } catch {
      domain = "";
    }
  }
  const displaySrc = asset?.thumbnailUrl || asset?.imageUrl;
  const fullSrc = asset?.imageUrl || displaySrc;

  return (
    <figure
      className="gu gu-img-cited"
      data-variant={variant}
      data-status={status}
    >
      <div className="gu-img-cited__plate">
        <div className="gu-img-cited__media">
          <ResolvedMediaSurface
            asset={asset}
            fallbackUrls={fallbackUrls}
            status={status}
            query={query}
            alt={alt}
            seed={resolvedCaption || resolvedTitle || alt}
            ratio={ratio}
            onLoaded={markLoaded}
            onFailed={markFailed}
            onRetry={retry}
            onZoom={() => setLightboxOpen(true)}
            topLeftSlot={
              matchedIdx > 0 ? (
                <span className="gu-img-hud-pill is-accent">
                  #[{matchedIdx}]
                </span>
              ) : undefined
            }
            overlayCaption={
              variant === "minimal" ? resolvedCaption || undefined : undefined
            }
          />
        </div>
        {variant !== "minimal" && resolvedCaption && (
          <figcaption className="gu-img-cited__cap">
            <MistlineInline text={resolvedCaption} sources={sources} />
          </figcaption>
        )}
      </div>

      {(matchedIdx > 0 || resolvedTitle || domain) && (
        <div className="gu-img-cited__bar">
          {matchedIdx > 0 && (
            <span className="gu-img-cited__idx">[{matchedIdx}]</span>
          )}
          <div className="gu-img-cited__meta">
            {resolvedTitle && (
              <strong className="gu-img-cited__source">{resolvedTitle}</strong>
            )}
            {domain && <span className="gu-img-cited__domain">{domain}</span>}
          </div>
          {resolvedUrl && isSafeUrl(resolvedUrl) && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gu-img-cited__link"
              aria-label="Buka sumber"
              title={resolvedTitle || domain || "Buka sumber"}
            >
              <ArrowUpRight size={12.5} strokeWidth={2.2} />
            </a>
          )}
        </div>
      )}

      {lightboxOpen && fullSrc && (
        <ImageLightboxModal
          asset={{
            src: fullSrc,
            alt,
            caption: resolvedCaption,
            sourceUrl: resolvedUrl,
            sourceTitle: resolvedTitle,
          }}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </figure>
  );
}

function ImageLightboxComp({ props, onReady }: MistlineGenProps) {
  const rawVar = str(props.variant, "default");
  const variant = ["default", "editorial", "split", "minimal"].includes(rawVar)
    ? rawVar
    : "default";
  const query = str(props.query);
  const direct = str(props.src) || str(props.imageUrl);
  const caption = str(props.caption);
  const sourceUrl = str(props.sourceUrl) || str(props.source);
  const alt = str(props.alt) || caption || query || "Inspection Frame";
  const ratio = str(props.ratio) || "16/9";
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { asset, fallbackUrls, status, retry, markLoaded, markFailed } =
    useResolvedSingleImage({
      query,
      direct,
      boundAsset: props.asset,
      sourceUrl,
      caption,
      alt,
      onReady,
    });

  const displaySrc = pickSharpDisplayImageUrl(asset) || undefined;
  const fullSrc = asset?.imageUrl || displaySrc;
  const resolvedCaption = caption || asset?.caption;
  const resolvedSource =
    asset?.sourceUrl ||
    (sourceUrl && isSafeUrl(sourceUrl) ? sourceUrl : undefined);
  const canOpen = Boolean(fullSrc && status !== "error");

  return (
    <figure
      className="gu gu-imglightbox"
      data-variant={variant}
      data-status={status}
    >
      <div className="gu-imglightbox__stage">
        <div className="gu-imglightbox__view">
          <span className="gu-imglightbox__badge">{ratio} · INSPECT</span>
          <span className="gu-imglightbox__reticle is-tl" aria-hidden="true" />
          <span className="gu-imglightbox__reticle is-tr" aria-hidden="true" />
          <span className="gu-imglightbox__reticle is-bl" aria-hidden="true" />
          <span className="gu-imglightbox__reticle is-br" aria-hidden="true" />
          {status === "error" ? (
            <MistlinePostcard
              seed={alt}
              icon="camera"
              ratio={ratio}
              className="gu-imglightbox__photo"
            />
          ) : displaySrc ? (
            <MistlinePhoto
              src={displaySrc}
              fallbackUrls={fallbackUrls}
              query={query || undefined}
              fallbackQuery={alt}
              seed={alt}
              icon="camera"
              ratio={ratio}
              className="gu-imglightbox__photo"
              onLoaded={markLoaded}
              onFailed={markFailed}
            />
          ) : (
            <div
              className="gu-skel gu-skel--image"
              style={{ aspectRatio: ratio }}
              aria-busy="true"
            />
          )}
          {variant === "minimal" && (
            <>
              <span className="gu-img-incap">{resolvedCaption || alt}</span>
              <motion.button
                type="button"
                className={`gu-img-stage__action ${canOpen ? "is-zoom" : "is-retry"}`}
                whileHover={MH.icon}
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={canOpen ? () => setLightboxOpen(true) : retry}
                aria-label={canOpen ? "Perbesar gambar" : "Muat ulang"}
                title={canOpen ? "Perbesar gambar" : "Muat ulang"}
              >
                {canOpen ? <Expand size={12.5} /> : <RefreshCw size={11} />}
              </motion.button>
            </>
          )}
        </div>
        {variant !== "minimal" && (
          <div className="gu-imglightbox__bar">
            <div className="gu-imglightbox__bar-text">
              {resolvedCaption ? (
                <span className="gu-imglightbox__cap">{resolvedCaption}</span>
              ) : (
                <span className="gu-imglightbox__cap">{alt}</span>
              )}
            </div>
            {canOpen ? (
              <motion.button
                type="button"
                className="gu-pill-btn is-primary gu-imglightbox__action"
                whileHover={MH.chip}
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={() => setLightboxOpen(true)}
              >
                <Expand size={12} /> Perbesar
              </motion.button>
            ) : (
              <motion.button
                type="button"
                className="gu-btn-retry gu-imglightbox__action"
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={retry}
              >
                <RefreshCw size={11} /> Muat ulang
              </motion.button>
            )}
          </div>
        )}
      </div>
      {lightboxOpen && fullSrc && (
        <ImageLightboxModal
          asset={{
            src: fullSrc,
            alt,
            caption: resolvedCaption,
            sourceUrl: resolvedSource,
            sourceTitle: asset?.sourceTitle,
          }}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </figure>
  );
}

function useImageCollection(
  props: Record<string, unknown>,
  onReady?: () => void,
) {
  const collectionSlotId = useId();
  const { complete: blockComplete } = useContext(MistlineBlockStreamContext);
  const mediaCtx = useContext(MistlineMediaContext);
  const batchQuery = str(props.query);
  const rawItems = arr(props.items).map((x) => rec(x));
  const readySignaledRef = useRef(false);

  const dedupeAssets = (
    list: NormalizedImageAsset[],
  ): NormalizedImageAsset[] => {
    const seen = new Set<string>();
    const out: NormalizedImageAsset[] = [];
    for (const a of list) {
      const u = a.thumbnailUrl || a.imageUrl || "";
      const k1 = u ? normalizeImageDedupKey(u) : "";
      const k2 = a.imageUrl ? normalizeImageDedupKey(a.imageUrl) : "";
      const k3 = u ? extractImageAssetStem(u) : "";
      const k4 = a.imageUrl ? extractImageAssetStem(a.imageUrl) : "";
      if (
        (k1 && seen.has(k1)) ||
        (k2 && seen.has(k2)) ||
        (k3 && seen.has(k3)) ||
        (k4 && seen.has(k4)) ||
        (u && mediaCtx.isUrlClaimedByOtherSlot(collectionSlotId, u))
      ) {
        continue;
      }
      if (k1) seen.add(k1);
      if (k2) seen.add(k2);
      if (k3) seen.add(k3);
      if (k4) seen.add(k4);
      out.push(a);
    }
    return out;
  };

  const resolveSyncCollectionCache = (): NormalizedImageAsset[] | null => {
    if (batchQuery) {
      const hit = peekVerifiedWebImages(
        batchQuery,
        undefined,
        mediaCtx.contextAnchor,
      );
      if (!hit) return null;
      return dedupeAssets(hit.candidates);
    }
    if (rawItems.length === 0) return null;
    const usedKeys = new Set<string>();
    const settled: NormalizedImageAsset[] = [];
    for (let i = 0; i < rawItems.length; i++) {
      const it = rawItems[i];
      const direct = inferAssetFromUnknown(it, str(it.caption) || "Foto", i);
      if (direct) {
        const u = direct.thumbnailUrl || direct.imageUrl || "";
        const k1 = u ? normalizeImageDedupKey(u) : "";
        const k2 = u ? extractImageAssetStem(u) : "";
        if (!usedKeys.has(k1) && !usedKeys.has(k2)) {
          if (k1) usedKeys.add(k1);
          if (k2) usedKeys.add(k2);
          settled.push(direct);
        }
        continue;
      }
      const q = str(it.query);
      if (!q) continue;
      const hit = peekVerifiedWebImages(q, undefined, mediaCtx.contextAnchor);
      if (!hit) return null;
      const pick = hit.candidates.find((c) => {
        const u = c.thumbnailUrl || c.imageUrl || "";
        if (!u) return false;
        const k1 = normalizeImageDedupKey(u);
        const k2 = extractImageAssetStem(u);
        const k3 = extractImageAssetStem(c.imageUrl);
        return (
          !usedKeys.has(k1) &&
          !usedKeys.has(k2) &&
          !usedKeys.has(k3) &&
          !mediaCtx.isUrlClaimedByOtherSlot(collectionSlotId, u)
        );
      });
      if (pick) {
        const u = pick.thumbnailUrl || pick.imageUrl || "";
        usedKeys.add(normalizeImageDedupKey(u));
        usedKeys.add(extractImageAssetStem(u));
        usedKeys.add(extractImageAssetStem(pick.imageUrl));
        const rawCap = str(it.caption);
        settled.push(rawCap ? { ...pick, caption: rawCap } : pick);
      }
    }
    return settled.length > 0 ? settled : null;
  };

  const [assets, setAssets] = useState<NormalizedImageAsset[]>(
    () => resolveSyncCollectionCache() ?? [],
  );
  const [status, setStatus] = useState<ImageAssetStatus>(() =>
    resolveSyncCollectionCache() ? "ready" : "searching",
  );



  useEffect(() => {
    const claimedUrls = assets
      .flatMap((a) => [a.thumbnailUrl || "", a.imageUrl || ""])
      .filter(Boolean);
    if (claimedUrls.length > 0) {
      mediaCtx.registerSlotKeys(collectionSlotId, claimedUrls);
    }
  }, [assets, collectionSlotId, mediaCtx]);

  useEffect(() => {
    readySignaledRef.current = false;

    const directAssets: NormalizedImageAsset[] = [];
    for (let i = 0; i < rawItems.length; i++) {
      const it = rawItems[i];
      const inferred = inferAssetFromUnknown(
        it,
        str(it.caption) || str(it.query) || "Foto",
        i,
      );
      if (inferred) directAssets.push(inferred);
    }

    if (directAssets.length > 0 && directAssets.length === rawItems.length) {
      setAssets(dedupeAssets(directAssets));
      setStatus("loading");
      return;
    }

    const syncHit = resolveSyncCollectionCache();
    if (syncHit && syncHit.length > 0) {
      setAssets(syncHit);
      setStatus("ready");
      return;
    }

    if (!blockComplete) {
      setStatus("searching");
      return;
    }

    const queriesToFetch = rawItems.map((it) => str(it.query)).filter(Boolean);

    let dead = false;
    setStatus("searching");

    // No usable candidates: emit no tiles at all instead of grey "query #N" placeholders.
    const applyFallbacks = () => {
      if (dead) return;
      setAssets([]);
      setStatus("ready");
      onReady?.();
    };

    const run = async () => {
      try {
        if (batchQuery) {
          const bundle = await fetchVerifiedWebImages(
            batchQuery,
            batchQuery,
            undefined,
            {
              contextAnchor: mediaCtx.contextAnchor,
              sources: mediaCtx.sources,
            },
          );
          const list = dedupeAssets(bundle.candidates);
          if (!dead) {
            if (list.length > 0) {
              setAssets(list);
              setStatus("loading");
            } else {
              applyFallbacks();
            }
          }
          return;
        }

        if (queriesToFetch.length > 0) {
          const bundlesPerItem = await Promise.all(
            rawItems.map(async (it, i) => {
              const direct = inferAssetFromUnknown(
                it,
                str(it.caption) || "Foto",
                i,
              );
              if (direct)
                return {
                  direct,
                  candidates: [direct],
                  cap: str(it.caption) || "Foto",
                  rawCaption: str(it.caption),
                };
              const q = str(it.query);
              const cap = str(it.caption) || q || `Visual ${i + 1}`;
              if (!q) {
                return {
                  direct: null,
                  candidates: [] as NormalizedImageAsset[],
                  cap,
                  rawCaption: str(it.caption),
                };
              }
              try {
                const bundle = await fetchVerifiedWebImages(q, cap, undefined, {
                  contextAnchor: mediaCtx.contextAnchor,
                  sources: mediaCtx.sources,
                });
                return {
                  direct: null,
                  candidates: bundle.candidates,
                  cap,
                  rawCaption: str(it.caption),
                };
              } catch {
                return {
                  direct: null,
                  candidates: [] as NormalizedImageAsset[],
                  cap,
                  rawCaption: str(it.caption),
                };
              }
            }),
          );
          const usedKeys = new Set<string>();
          const markUsed = (a: NormalizedImageAsset) => {
            const u = a.thumbnailUrl || a.imageUrl || "";
            if (u) {
              usedKeys.add(normalizeImageDedupKey(u));
              usedKeys.add(extractImageAssetStem(u));
            }
            if (a.imageUrl) {
              usedKeys.add(normalizeImageDedupKey(a.imageUrl));
              usedKeys.add(extractImageAssetStem(a.imageUrl));
            }
          };
          const isUsed = (a: NormalizedImageAsset) => {
            const u = a.thumbnailUrl || a.imageUrl || "";
            if (!u) return false;
            return (
              usedKeys.has(normalizeImageDedupKey(u)) ||
              usedKeys.has(extractImageAssetStem(u)) ||
              (Boolean(a.imageUrl) &&
                usedKeys.has(normalizeImageDedupKey(a.imageUrl))) ||
              (Boolean(a.imageUrl) &&
                usedKeys.has(extractImageAssetStem(a.imageUrl))) ||
              mediaCtx.isUrlClaimedByOtherSlot(collectionSlotId, u)
            );
          };

          const settled: NormalizedImageAsset[] = [];
          for (const entry of bundlesPerItem) {
            if (entry.direct) {
              if (!isUsed(entry.direct)) {
                markUsed(entry.direct);
                settled.push(entry.direct);
              }
              continue;
            }
            const uniquePick = entry.candidates.find(
              (c) => !isUsed(c) && Boolean(c.thumbnailUrl || c.imageUrl),
            );
            if (uniquePick) {
              markUsed(uniquePick);
              settled.push(
                entry.rawCaption
                  ? { ...uniquePick, caption: entry.rawCaption }
                  : uniquePick,
              );
            }
          }

          // If multiple items resolved to syndicated duplicates of one single photo and left
          // fewer items than requested, pull remaining distinct candidates from the combined pool
          if (settled.length < bundlesPerItem.length) {
            const allRemaining = bundlesPerItem.flatMap((b) => b.candidates);
            for (const entry of bundlesPerItem) {
              if (settled.length >= bundlesPerItem.length) break;
              const alreadyHasCaption =
                entry.rawCaption &&
                settled.some((s) => s.caption === entry.rawCaption);
              if (alreadyHasCaption) continue;
              const backupPick = allRemaining.find(
                (c) => !isUsed(c) && Boolean(c.thumbnailUrl || c.imageUrl),
              );
              if (backupPick) {
                markUsed(backupPick);
                settled.push(
                  entry.rawCaption
                    ? { ...backupPick, caption: entry.rawCaption }
                    : backupPick,
                );
              }
            }
          }

          if (!dead) {
            if (settled.length > 0) {
              setAssets(settled);
              setStatus("ready");
              if (!settled.some((a) => Boolean(a.thumbnailUrl || a.imageUrl))) {
                onReady?.();
              }
            } else {
              applyFallbacks();
            }
          }
          return;
        }

        applyFallbacks();
      } catch {
        applyFallbacks();
      }
    };

    void run();
    return () => {
      dead = true;
    };
  }, [
    batchQuery,
    JSON.stringify(rawItems),
    blockComplete,
    mediaCtx,
    collectionSlotId,
    onReady,
  ]);

  const markItemSettled = () => {
    if (!readySignaledRef.current) {
      readySignaledRef.current = true;
      setStatus("ready");
      onReady?.();
    }
  };

  // A tile whose image definitively failed is removed instead of leaving an icon placeholder.
  const dropAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    markItemSettled();
  };

  return { assets, status, markItemSettled, dropAsset };
}

function ImageGalleryComp({ props, onReady }: MistlineGenProps) {
  const title = str(props.title);
  const rawVar = str(props.variant, "default");
  const variant = ["default", "editorial", "split", "minimal"].includes(rawVar)
    ? rawVar
    : "default";
  const cols = num(props.columns) === 2 ? 2 : 3;
  const { assets, status, markItemSettled, dropAsset } = useImageCollection(
    props,
    onReady,
  );
  const [active, setActive] = useState<NormalizedImageAsset | null>(null);
  const count = assets.length;
  const mod3 = count % 3;
  const orphanBand =
    count >= 7 && mod3 === 1
      ? "last4"
      : count >= 7 && mod3 === 2
        ? "last2"
        : "even";

  if (status !== "searching" && count === 0) {
    return null;
  }

  return (
    <section
      className="gu gu-imggallery"
      data-variant={variant}
      data-status={status}
    >
      {(title || count > 0) && (
        <div className="gu-imggallery__head">
          {title ? <h3 className="gu-title">{title}</h3> : <span />}
          {count > 0 && (
            <span className="gu-imggallery__count">{count} visual</span>
          )}
        </div>
      )}
      {status === "searching" ? (
        <div className="gu-imggallery__grid" data-cols={cols} data-count={3}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="gu-imggallery__item gu-skel gu-skel--image"
            />
          ))}
        </div>
      ) : (
        <div
          className="gu-imggallery__grid"
          data-cols={cols}
          data-count={count}
          data-orphan-band={orphanBand}
        >
          {assets.map((a, i) => {
            const hasUrl = Boolean(a.thumbnailUrl || a.imageUrl);
            const isTrailingPair =
              (orphanBand === "last2" && i >= count - 2) ||
              (orphanBand === "last4" && i >= count - 4);
            return (
              <motion.figure
                key={`${a.id}-${i}`}
                className={`gu-imggallery__item${isTrailingPair ? " is-span3" : ""}`}
                whileHover={MH.image}
                whileTap={MH.press}
                transition={MH.spring}
                onClick={() => hasUrl && setActive(a)}
                role={hasUrl ? "button" : undefined}
                tabIndex={hasUrl ? 0 : undefined}
                onKeyDown={(e) => e.key === "Enter" && hasUrl && setActive(a)}
              >
                <div className="gu-imggallery__media">
                  <span className="gu-imggallery__badge">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {hasUrl ? (
                    <MistlinePhoto
                      src={pickSharpDisplayImageUrl(a)}
                      seed={a.alt || a.caption || `Foto ${i + 1}`}
                      icon="image"
                      ratio="16/10"
                      onLoaded={markItemSettled}
                      skipClaimRegistration
                      onFailed={() => dropAsset(a.id)}
                    />
                  ) : (
                    <MistlinePostcard
                      seed={a.caption || a.alt || `Foto ${i + 1}`}
                      icon="image"
                      ratio="16/10"
                    />
                  )}
                  {variant === "minimal" && a.caption && (
                    <span className="gu-img-incap">{a.caption}</span>
                  )}
                </div>
                {variant !== "minimal" && a.caption && (
                  <figcaption>
                    <span className="gu-imggallery__cap">{a.caption}</span>
                  </figcaption>
                )}
              </motion.figure>
            );
          })}
        </div>
      )}
      {active && active.imageUrl && (
        <ImageLightboxModal
          asset={{
            src: active.imageUrl,
            alt: active.alt,
            caption: active.caption,
            sourceUrl: active.sourceUrl,
            sourceTitle: active.sourceTitle,
          }}
          onClose={() => setActive(null)}
        />
      )}
    </section>
  );
}

function ImageGridComp({ props, onReady }: MistlineGenProps) {
  const title = str(props.title);
  const rawVar = str(props.variant, "default");
  const variant = ["default", "editorial", "split", "minimal"].includes(rawVar)
    ? rawVar
    : "default";
  const cols = num(props.columns) === 2 ? 2 : 3;
  const { assets, status, markItemSettled, dropAsset } = useImageCollection(
    props,
    onReady,
  );
  const rawItems = arr(props.items).map((x) => rec(x));
  const [active, setActive] = useState<NormalizedImageAsset | null>(null);
  const count = assets.length;
  const mod3 = count % 3;
  const orphanBand =
    count >= 7 && mod3 === 1
      ? "last4"
      : count >= 7 && mod3 === 2
        ? "last2"
        : "even";

  if (status !== "searching" && count === 0) {
    return null;
  }

  return (
    <section
      className="gu gu-imggrid"
      data-variant={variant}
      data-status={status}
    >
      <div className="gu-imggrid__board">
        {(title || count > 0) && (
          <div className="gu-imggrid__head">
            <h3 className="gu-title">{title || "Contact Sheet"}</h3>
            <span className="gu-imggrid__badge">
              {count} {variant === "split" ? "SPECIMENS" : "SWATCHES"}
            </span>
          </div>
        )}
        {status === "searching" ? (
          <div className="gu-imggrid__grid" data-cols={cols} data-count={3}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="gu-imggrid__item gu-skel gu-skel--image"
              />
            ))}
          </div>
        ) : (
          <div
            className="gu-imggrid__grid"
            data-cols={cols}
            data-count={count}
            data-orphan-band={orphanBand}
          >
            {assets.map((a, i) => {
              const hasUrl = Boolean(a.thumbnailUrl || a.imageUrl);
              const isTrailingPair =
                (orphanBand === "last2" && i >= count - 2) ||
                (orphanBand === "last4" && i >= count - 4);
              const rawQ = str(rawItems[i]?.query);
              return (
                <motion.figure
                  key={`${a.id}-${i}`}
                  className={`gu-imggrid__item${isTrailingPair ? " is-span3" : ""}`}
                  whileHover={MH.image}
                  whileTap={MH.press}
                  transition={MH.spring}
                  onClick={() => hasUrl && setActive(a)}
                  role={hasUrl ? "button" : undefined}
                  tabIndex={hasUrl ? 0 : undefined}
                  onKeyDown={(e) => e.key === "Enter" && hasUrl && setActive(a)}
                >
                  <div className="gu-imggrid__media">
                    {variant !== "split" && variant !== "minimal" && (
                      <span className="gu-imggrid__idx">
                        #{String(i + 1).padStart(2, "0")}
                      </span>
                    )}
                    {hasUrl ? (
                      <MistlinePhoto
                        src={pickSharpDisplayImageUrl(a)}
                        seed={a.alt || a.caption || `Material ${i + 1}`}
                        icon="swatch"
                        ratio="4/3"
                        onLoaded={markItemSettled}
                        skipClaimRegistration
                      onFailed={() => dropAsset(a.id)}
                      />
                    ) : (
                      <MistlinePostcard
                        seed={a.caption || a.alt || `Material ${i + 1}`}
                        icon="swatch"
                        ratio="4/3"
                      />
                    )}
                    {variant === "minimal" && (a.caption || a.alt) && (
                      <span className="gu-img-incap">{a.caption || a.alt}</span>
                    )}
                  </div>
                  {variant !== "minimal" && (
                    <figcaption className="gu-imggrid__meta">
                      {variant === "split" && (
                        <span className="gu-imggrid__idx-inline">
                          #{String(i + 1).padStart(2, "0")}
                        </span>
                      )}
                      <span className="gu-imggrid__cap">
                        {a.caption || a.alt}
                      </span>
                      {variant === "split" && rawQ && (
                        <span className="gu-imggrid__sub">{rawQ}</span>
                      )}
                    </figcaption>
                  )}
                </motion.figure>
              );
            })}
          </div>
        )}
      </div>
      {active && active.imageUrl && (
        <ImageLightboxModal
          asset={{
            src: active.imageUrl,
            alt: active.alt,
            caption: active.caption,
            sourceUrl: active.sourceUrl,
            sourceTitle: active.sourceTitle,
          }}
          onClose={() => setActive(null)}
        />
      )}
    </section>
  );
}

function ImageCarouselComp({ props, onReady }: MistlineGenProps) {
  const title = str(props.title);
  const rawVar = str(props.variant, "default");
  const variant = ["default", "editorial", "split", "minimal"].includes(rawVar)
    ? rawVar
    : "default";
  const { assets, status, markItemSettled, dropAsset } = useImageCollection(
    props,
    onReady,
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<NormalizedImageAsset | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const slideTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(assets.length - 1, idx));
    setActiveSlide(clamped);
    const el = trackRef.current?.children[clamped] as HTMLElement | undefined;
    el?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  };

  const handleTrackScroll = () => {
    const track = trackRef.current;
    if (!track || !track.children.length) return;
    const step = (track.children[0] as HTMLElement).offsetWidth + 10;
    if (step > 0) {
      setActiveSlide(
        Math.max(
          0,
          Math.min(assets.length - 1, Math.round(track.scrollLeft / step)),
        ),
      );
    }
  };

  if (status !== "searching" && assets.length === 0) {
    return null;
  }

  return (
    <section
      className="gu gu-imgcarousel"
      data-variant={variant}
      data-status={status}
    >
      <div className="gu-imgcarousel__head">
        <div className="gu-imgcarousel__title-group">
          {title ? <h3 className="gu-title">{title}</h3> : <span />}
          {assets.length > 0 && (
            <span className="gu-imgcarousel__count">
              {String(activeSlide + 1).padStart(2, "0")}/
              {String(assets.length).padStart(2, "0")}
            </span>
          )}
        </div>
        {assets.length > 1 && (
          <div className="gu-imgcarousel__nav">
            <motion.button
              type="button"
              onClick={() => slideTo(activeSlide - 1)}
              aria-label="Geser kiri"
            >
              <ChevronLeft size={14} />
            </motion.button>
            <motion.button
              type="button"
              onClick={() => slideTo(activeSlide + 1)}
              aria-label="Geser kanan"
            >
              <ChevronRight size={14} />
            </motion.button>
          </div>
        )}
      </div>

      <div className="gu-imgcarousel__viewport">
        {status === "searching" ? (
          <div className="gu-imgcarousel__track" data-count={3}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="gu-imgcarousel__slide"
                aria-busy="true"
              >
                <div
                  className="gu-imgcarousel__media gu-skel gu-skel--image"
                  style={{ aspectRatio: "16/10" }}
                />
              </div>
            ))}
          </div>
        ) : (
        <div
          ref={trackRef}
          className="gu-imgcarousel__track"
          data-count={assets.length}
          onScroll={handleTrackScroll}
        >
          {assets.map((a, i) => {
            const hasUrl = Boolean(a.thumbnailUrl || a.imageUrl);
            return (
              <motion.figure
                key={`${a.id}-${i}`}
                className={`gu-imgcarousel__slide${activeSlide === i ? " is-current" : ""}`}
                whileHover={MH.image}
                whileTap={MH.press}
                transition={MH.spring}
                onClick={() => (hasUrl ? setActive(a) : slideTo(i))}
              >
                <div className="gu-imgcarousel__media">
                  <span className="gu-imgcarousel__tag">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {hasUrl ? (
                    <MistlinePhoto
                      src={pickSharpDisplayImageUrl(a)}
                      seed={a.alt || a.caption || `Slide ${i + 1}`}
                      icon="camera"
                      ratio="16/10"
                      onLoaded={markItemSettled}
                      skipClaimRegistration
                      onFailed={() => dropAsset(a.id)}
                    />
                  ) : (
                    <MistlinePostcard
                      seed={a.caption || a.alt || `Slide ${i + 1}`}
                      icon="camera"
                      ratio="16/10"
                    />
                  )}
                  {variant === "minimal" && a.caption && (
                    <span className="gu-img-incap">{a.caption}</span>
                  )}
                </div>
                {variant !== "minimal" && a.caption && (
                  <figcaption>
                    <span className="gu-imgcarousel__cap">{a.caption}</span>
                  </figcaption>
                )}
              </motion.figure>
            );
          })}
        </div>
        )}
      </div>

      {assets.length > 1 && (
        <div className="gu-imgcarousel__dots" aria-label="Navigasi slide">
          {assets.map((_, i) => (
            <motion.button
              key={`dot-${i}`}
              type="button"
              className={`gu-imgcarousel__dot${activeSlide === i ? " is-active" : ""}`}
              initial={false}
              animate={{ width: activeSlide === i ? 18 : 6 }}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() => slideTo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {active && active.imageUrl && (
        <ImageLightboxModal
          asset={{
            src: active.imageUrl,
            alt: active.alt,
            caption: active.caption,
            sourceUrl: active.sourceUrl,
            sourceTitle: active.sourceTitle,
          }}
          onClose={() => setActive(null)}
        />
      )}
    </section>
  );
}

function ImageComparisonComp({ props, onReady }: MistlineGenProps) {
  const title = str(props.title);
  const note = str(props.note);
  const rawVar = str(props.variant, "default");
  const variant = ["default", "editorial", "split", "minimal"].includes(rawVar)
    ? rawVar
    : "default";
  const left = rec(props.left);
  const right = rec(props.right);
  const [mode, setMode] = useState<"side" | "slider">(
    variant === "split" ? "slider" : "side",
  );
  const [splitPos, setSplitPos] = useState(50);
  const modeTabId = useId();

  useEffect(() => {
    setMode(variant === "split" ? "slider" : "side");
  }, [variant]);

  const leftQuery = str(left.query);
  const leftDirect = str(left.src) || str(left.imageUrl);
  const leftLabel = str(left.label, "Original");
  const leftCap = str(left.caption);
  const leftAlt = str(left.alt) || leftCap || leftLabel;

  const rightQuery = str(right.query);
  const rightDirect = str(right.src) || str(right.imageUrl);
  const rightLabel = str(right.label, "Edited");
  const rightCap = str(right.caption);
  const rightAlt = str(right.alt) || rightCap || rightLabel;

  const leftRes = useResolvedSingleImage({
    query: leftQuery,
    direct: leftDirect,
    boundAsset: left.asset,
    caption: leftCap,
    alt: leftAlt,
  });

  const rightRes = useResolvedSingleImage({
    query: rightQuery,
    direct: rightDirect,
    boundAsset: right.asset,
    caption: rightCap,
    alt: rightAlt,
  });

  useEffect(() => {
    if (leftRes.status !== "searching" && rightRes.status !== "searching") {
      onReady?.();
    }
  }, [leftRes.status, rightRes.status, onReady]);

  return (
    <section
      className="gu gu-imgcompare"
      data-variant={variant}
      data-mode={mode}
    >
      <div className="gu-imgcompare__head">
        {title ? <h3 className="gu-title">{title}</h3> : <span />}
        <div
          className="gu-imgcompare__switch"
          role="group"
          aria-label="Mode perbandingan"
        >
          <motion.button
            type="button"
            className={`gu-imgcompare__tab${mode === "side" ? " is-active" : ""}`}
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => setMode("side")}
          >
            {mode === "side" && <ActivePlate layoutId={modeTabId} shadow />}
            <Columns2 size={11.5} />
            <span>Side-by-Side</span>
          </motion.button>
          <motion.button
            type="button"
            className={`gu-imgcompare__tab${mode === "slider" ? " is-active" : ""}`}
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => setMode("slider")}
          >
            {mode === "slider" && <ActivePlate layoutId={modeTabId} shadow />}
            <SlidersHorizontal size={11.5} />
            <span>Slider</span>
          </motion.button>
        </div>
      </div>

      {mode === "slider" ? (
        <div className="gu-imgcompare__curtain">
          <div className="gu-imgcompare__curtain-base">
            <ResolvedMediaSurface
              asset={rightRes.asset}
              fallbackUrls={rightRes.fallbackUrls}
              status={rightRes.status}
              query={rightQuery}
              alt={rightAlt}
              seed={rightLabel}
              ratio="16/9"
              showZoom={false}
              onLoaded={rightRes.markLoaded}
              onFailed={rightRes.markFailed}
              onRetry={rightRes.retry}
            />
          </div>
          <div
            className="gu-imgcompare__curtain-top"
            style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
          >
            <ResolvedMediaSurface
              asset={leftRes.asset}
              fallbackUrls={leftRes.fallbackUrls}
              status={leftRes.status}
              query={leftQuery}
              alt={leftAlt}
              seed={leftLabel}
              ratio="16/9"
              showZoom={false}
              onLoaded={leftRes.markLoaded}
              onFailed={leftRes.markFailed}
              onRetry={leftRes.retry}
            />
          </div>
          <span className="gu-imgcompare__curtain-pill is-left">
            A · {leftLabel}
          </span>
          <span className="gu-imgcompare__curtain-pill is-right">
            B · {rightLabel}
          </span>
          <div
            className="gu-imgcompare__divider"
            style={{ left: `${splitPos}%` }}
          >
            <span className="gu-imgcompare__handle" aria-hidden="true">
              ↔
            </span>
          </div>
          <input
            type="range"
            min={6}
            max={94}
            value={splitPos}
            onChange={(e) => setSplitPos(Number(e.target.value))}
            aria-label="Geser pembanding gambar"
            className="gu-imgcompare__range"
          />
        </div>
      ) : (
        <div className="gu-imgcompare__stage">
          <div className="gu-imgcompare__col">
            <div className="gu-imgcompare__col-head">
              <span className="gu-imgcompare__badge">A</span>
              <span className="gu-imgcompare__label">{leftLabel}</span>
            </div>
            <div className="gu-imgcompare__media">
              <ResolvedMediaSurface
                asset={leftRes.asset}
                fallbackUrls={leftRes.fallbackUrls}
                status={leftRes.status}
                query={leftQuery}
                alt={leftAlt}
                seed={leftLabel}
                ratio="16/10"
                showZoom={false}
                onLoaded={leftRes.markLoaded}
                onFailed={leftRes.markFailed}
                onRetry={leftRes.retry}
                overlayCaption={
                  variant === "minimal" ? leftCap || undefined : undefined
                }
              />
            </div>
            {variant !== "minimal" && leftCap && (
              <p className="gu-imgcompare__cap">{leftCap}</p>
            )}
          </div>

          <span className="gu-imgcompare__vs" aria-hidden="true">
            VS
          </span>

          <div className="gu-imgcompare__col">
            <div className="gu-imgcompare__col-head">
              <span className="gu-imgcompare__badge">B</span>
              <span className="gu-imgcompare__label">{rightLabel}</span>
            </div>
            <div className="gu-imgcompare__media">
              <ResolvedMediaSurface
                asset={rightRes.asset}
                fallbackUrls={rightRes.fallbackUrls}
                status={rightRes.status}
                query={rightQuery}
                alt={rightAlt}
                seed={rightLabel}
                ratio="16/10"
                showZoom={false}
                onLoaded={rightRes.markLoaded}
                onFailed={rightRes.markFailed}
                onRetry={rightRes.retry}
                overlayCaption={
                  variant === "minimal" ? rightCap || undefined : undefined
                }
              />
            </div>
            {variant !== "minimal" && rightCap && (
              <p className="gu-imgcompare__cap">{rightCap}</p>
            )}
          </div>
        </div>
      )}

      {note && (
        <p className="gu-note gu-imgcompare__note">
          <span className="gu-pen momo-hand-title">{note}</span>
        </p>
      )}
    </section>
  );
}

function evalSafeArithmetic(
  expr: string,
  vars: Record<string, number>,
): number | null {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ("+-*/()".includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let tok = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        tok += expr[i++];
      }
      tokens.push(tok);
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        id += expr[i++];
      }
      tokens.push(id);
      continue;
    }
    return null;
  }
  if (tokens.length === 0) return null;

  let pos = 0;
  const parseExpr = (): number => {
    let val = parseTerm();
    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos++];
      const rhs = parseTerm();
      val = op === "+" ? val + rhs : val - rhs;
    }
    return val;
  };
  const parseTerm = (): number => {
    let val = parseFactor();
    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const op = tokens[pos++];
      const rhs = parseFactor();
      val = op === "*" ? val * rhs : rhs === 0 ? 0 : val / rhs;
    }
    return val;
  };
  const parseFactor = (): number => {
    const tok = tokens[pos++];
    if (tok === undefined) return 0;
    if (tok === "(") {
      const inner = parseExpr();
      if (tokens[pos] === ")") pos++;
      return inner;
    }
    if (tok === "-") return -parseFactor();
    if (tok === "+") return parseFactor();
    if (/^[0-9.]+$/.test(tok)) {
      const n = Number(tok);
      return Number.isFinite(n) ? n : 0;
    }
    return vars[tok] ?? 0;
  };

  try {
    const res = parseExpr();
    return Number.isFinite(res) ? res : null;
  } catch {
    return null;
  }
}

function Adjuster({
  props,
  live,
  sources,
  onAction,
  onUiInteraction,
}: MistlineGenProps) {
  const controls = arr(props.controls ?? props.items)
    .map(rec)
    .map((c, idx): Record<string, unknown> => {
      const key = str(c.key) || str(c.id) || str(c.name) || `ctrl_${idx}`;
      const label = str(c.label) || str(c.title) || str(c.name) || key;
      const rawKind = (str(c.kind) || str(c.type)).toLowerCase();
      const options = arr(c.options ?? c.choices)
        .map((o) =>
          typeof o === "string" || typeof o === "number"
            ? String(o)
            : str(rec(o).label) || str(rec(o).value) || str(rec(o).title),
        )
        .filter(Boolean);
      const kind =
        rawKind === "chips" ||
        rawKind === "select" ||
        rawKind === "radio" ||
        rawKind === "segmented" ||
        rawKind === "pills" ||
        (!rawKind && options.length > 0)
          ? "chips"
          : rawKind === "toggle" || rawKind === "boolean" || rawKind === "switch"
            ? "toggle"
            : rawKind === "stepper"
              ? "stepper"
              : "range";
      return {
        ...c,
        key,
        label,
        kind,
        options,
      };
    })
    .filter((c) => str(c.key) && str(c.label));
  const outputs = arr(props.outputs)
    .map(rec)
    .filter((o) => str(o.label) && str(o.formula));

  const buildInitialValues = () => {
    const init: Record<string, number | string | boolean> = {};
    for (const c of controls) {
      const key = str(c.key);
      const kind = str(c.kind) || "range";
      if (kind === "toggle") {
        init[key] = Boolean(c.value);
      } else if (kind === "chips") {
        const opts = arr(c.options)
          .map((o) => str(o))
          .filter(Boolean);
        init[key] = str(c.value) || opts[0] || "";
      } else {
        init[key] = num(c.value) ?? num(c.min) ?? 1;
      }
    }
    return init;
  };

  const [values, setValues] = useState<
    Record<string, number | string | boolean>
  >(buildInitialValues);
  const reduce = useReducedMotion();

  const numericVars = useMemo(() => {
    const vars: Record<string, number> = {};
    for (const [k, v] of Object.entries(values)) {
      if (typeof v === "number") vars[k] = v;
      else if (typeof v === "boolean") vars[k] = v ? 1 : 0;
    }
    return vars;
  }, [values]);

  const applyChanges = () => {
    if (!live) return;
    const summary = controls
      .map((c) => {
        const k = str(c.key);
        const unit = str(c.unit);
        const val = values[k];
        return `${str(c.label)}: ${typeof val === "boolean" ? (val ? "Ya" : "Tidak") : `${val}${unit ? ` ${unit}` : ""}`}`;
      })
      .join(", ");
    const prompt = `Perbarui hasil dan rekomendasi berdasarkan parameter terbaru ini: ${summary}.`;
    if (onUiInteraction) {
      onUiInteraction({
        blockType: "adjuster",
        action: "apply_parameters",
        label: str(props.title) || "Parameter diperbarui",
        value: values,
        prompt,
      });
    } else {
      onAction?.({ type: "send", text: prompt });
    }
  };

  if (controls.length === 0) return null;

  return (
    <section
      className="gu gu-adjuster"
      data-variant={str(props.variant, "default")}
    >
      <div className="gu-adjuster__head">
        <div className="gu-adjuster__head-row">
          <div className="gu-adjuster__head-main">
            {Boolean(str(props.title)) && (
              <Heading text={props.title} sources={sources} />
            )}
            {str(props.description) && (
              <p className="gu-adjuster__desc">
                <MistlineInline text={str(props.description)} sources={sources} />
              </p>
            )}
          </div>
          <motion.button
            type="button"
            className="gu-adjuster__reset-btn"
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => setValues(buildInitialValues())}
            title="Reset parameter"
          >
            <RefreshCw size={11} strokeWidth={2.2} />
            <span>Reset</span>
          </motion.button>
        </div>
      </div>

      <div className="gu-adjuster__rows">
        {controls.map((c, idx) => {
          const key = str(c.key);
          const label = str(c.label);
          const kind = str(c.kind) || "range";
          const unit = str(c.unit);
          const min = num(c.min) ?? 0;
          const max = num(c.max) ?? 100;
          const step = num(c.step) ?? 1;
          const cur = values[key];

          if (kind === "toggle") {
            const on = Boolean(cur);
            return (
              <div key={`${key}-${idx}`} className="gu-adj-control is-toggle">
                <span className="gu-adj-control__label">{label}</span>
                <motion.button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  className={`gu-switch${on ? " is-on" : ""}`}
                  style={switchTrack(on)}
                  whileHover={MH.chip}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  onClick={(e) => {
                    tweenPaint(e.currentTarget, reduce);
                    setValues((p) => ({ ...p, [key]: !on }));
                  }}
                >
                  <SwitchThumb className="gu-switch__thumb" />
                </motion.button>
              </div>
            );
          }

          if (kind === "chips") {
            const options = arr(c.options)
              .map((o) => str(o))
              .filter(Boolean);
            return (
              <div key={`${key}-${idx}`} className="gu-adj-control is-chips">
                <span className="gu-adj-control__label">{label}</span>
                <div className="gu-filter-row gu-adj-chips-right">
                  {options.map((opt) => (
                    <motion.button
                      key={opt}
                      type="button"
                      className={`gu-filter-chip${cur === opt ? " is-active" : ""}`}
                      whileHover={MH.chip}
                      whileTap={MH.tap}
                      transition={MH.spring}
                      onClick={() => setValues((p) => ({ ...p, [key]: opt }))}
                    >
                      {opt}
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          }

          if (kind === "stepper") {
            const nVal = typeof cur === "number" ? cur : min;
            return (
              <div key={`${key}-${idx}`} className="gu-adj-control is-stepper">
                <span className="gu-adj-control__label">{label}</span>
                <div className="gu-stepper">
                  <motion.button
                    type="button"
                    className="gu-icon-btn"
                    whileHover={MH.icon}
                    whileTap={MH.tap}
                    transition={MH.spring}
                    aria-label={`Kurangi ${label}`}
                    disabled={nVal <= min}
                    onClick={() =>
                      setValues((p) => ({
                        ...p,
                        [key]: Math.max(min, Number((nVal - step).toFixed(4))),
                      }))
                    }
                  >
                    <Minus size={13} />
                  </motion.button>
                  <span className="gu-stepper__num">
                    {nVal}
                    {unit ? ` ${unit}` : ""}
                  </span>
                  <motion.button
                    type="button"
                    className="gu-icon-btn"
                    whileHover={MH.icon}
                    whileTap={MH.tap}
                    transition={MH.spring}
                    aria-label={`Tambah ${label}`}
                    disabled={nVal >= max}
                    onClick={() =>
                      setValues((p) => ({
                        ...p,
                        [key]: Math.min(max, Number((nVal + step).toFixed(4))),
                      }))
                    }
                  >
                    <Plus size={13} />
                  </motion.button>
                </div>
              </div>
            );
          }

          const nVal = typeof cur === "number" ? cur : min;
          return (
            <div key={`${key}-${idx}`} className="gu-adj-control is-range">
              <label
                className="gu-adj-control__label"
                htmlFor={`adj-${key}-${idx}`}
              >
                {label}
              </label>
              <div className="gu-adj-range-wrap">
                <input
                  id={`adj-${key}-${idx}`}
                  type="range"
                  className="gu-range"
                  min={min}
                  max={max}
                  step={step}
                  value={nVal}
                  onChange={(e) =>
                    setValues((p) => ({ ...p, [key]: Number(e.target.value) }))
                  }
                />
                <span className="gu-adj-control__val">
                  {nVal.toLocaleString("en-US")}
                  {unit ? ` ${unit}` : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {outputs.length > 0 && (
        <div className="gu-adjuster__outputs">
          {outputs.map((out, i) => {
            const computed = evalSafeArithmetic(str(out.formula), numericVars);
            const display =
              computed === null
                ? "—"
                : `${str(out.prefix)}${fmtVal(computed, str(out.unit))}`;
            return (
              <div key={`out-${i}`} className="gu-adj-output">
                <span className="gu-adj-output__label">{str(out.label)}</span>
                <strong className="gu-adj-output__val momo-serif">
                  {display}
                </strong>
              </div>
            );
          })}
        </div>
      )}
      {live && (
        <div className="gu-adjuster__foot">
          <span className="gu-pen gu-adjuster__hint momo-hand-title">
            parameter interaktif
          </span>
          <motion.button
            type="button"
            className="gu-pill-btn is-primary"
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={applyChanges}
          >
            {str(props.submitLabel) || "Terapkan ke Momo"}{" "}
            <ArrowRight size={13} />
          </motion.button>
        </div>
      )}
    </section>
  );
}

function VisualDossier({
  props,
  complete,
  sources,
  onReady,
}: MistlineGenProps) {
  const title = str(props.title);
  const summary = str(props.summary) || str(props.body);
  const subtitle = str(props.subtitle);
  const statusTag = str(props.status);
  const facts = arr(props.facts)
    .map(rec)
    .filter((f) => str(f.label) && str(f.value));
  const highlights = useMemo(() => {
    const usedIcons = new Set<string>();
    const stripLeadingMarkersAndEmoji = (s: string) =>
      s
        .replace(/^(?:[\s•·\-–—]+|\*(?!\*)\s*)+/u, "")
        .replace(/^(?:[\p{Extended_Pictographic}\uFE0F\u200D]+\s*)+/gu, "")
        .trim();

    return arr(props.highlights)
      .map((raw, idx) => {
        if (typeof raw === "string" || typeof raw === "number") {
          const rawStr = str(raw).trim();
          const text = stripLeadingMarkersAndEmoji(rawStr);
          if (!text) return null;
          return {
            text,
            icon: inferContextualIcon(rawStr, undefined, idx, usedIcons),
          };
        }
        const r = rec(raw);
        const rawStr = (
          str(r.text) ||
          str(r.label) ||
          str(r.title) ||
          str(r.statement) ||
          str(r.note)
        ).trim();
        const text = stripLeadingMarkersAndEmoji(rawStr);
        if (!text) return null;
        return {
          text,
          icon: inferContextualIcon(
            rawStr,
            str(r.icon) || undefined,
            idx,
            usedIcons,
          ),
        };
      })
      .filter((x): x is { text: string; icon: string } => Boolean(x));
  }, [props.highlights]);
  const query = str(props.imageQuery) || str(props.query);
  const direct = str(props.src) || str(props.image);
  const hasPhotoSlot = Boolean(query || direct);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { asset, fallbackUrls, status, retry, markLoaded, markFailed } =
    useResolvedSingleImage({
      query: hasPhotoSlot ? query : "",
      direct: hasPhotoSlot ? direct : "",
      boundAsset: props.asset,
      caption: title,
      alt: title || "Konteks visual",
      onReady,
    });

  const [fanSwapped, setFanSwapped] = useState(false);
  const photoTabId = useId();

  if (!title && !summary && complete) return null;

  const fullSrc = asset?.imageUrl || asset?.thumbnailUrl;

  const secondaryUrl =
    fallbackUrls.find((u) => u && u !== fullSrc) || "";
  const extraFacts = facts.slice(3);
  const rawCoord =
    str(props.coordinates) ||
    str(props.coord) ||
    str(props.latlng) ||
    (() => {
      const s = (title || subtitle || "MOMO").trim();
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const latD = 6;
      const latM = String((Math.abs(h) % 42) + 5).padStart(2, "0");
      const lonM = String(((Math.abs(h) >> 6) % 48) + 10).padStart(2, "0");
      return `0${latD}°${latM}'S 106°${lonM}'E`;
    })();

  return (
    <motion.section
      className={`gu gu-dossier${hasPhotoSlot ? " has-media" : ""}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={MH.spring}
    >
      {(statusTag || subtitle || facts.length > 0) && (
        <div className="gu-dossier__ribbon">
          <div className="gu-dossier__kicker-row">
            <div className="gu-dossier__kicker-left">
              {statusTag && <span className="gu-tag">{statusTag}</span>}
              {subtitle && <span className="gu-dossier__sub">{subtitle}</span>}
            </div>
            <span className="gu-dossier__coord">{rawCoord}</span>
          </div>
          {facts.length > 0 && (
            <dl className="gu-dossier__ribbon-facts">
              {facts.slice(0, 3).map((f, idx) => (
                <div key={idx} className="gu-dossier__ribbon-fact">
                  <dt>{str(f.label)}</dt>
                  <dd>
                    <MistlineInline text={str(f.value)} sources={sources} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      <div className="gu-dossier__body">
        <div className="gu-dossier__main">
          {title && (
            <h3 className="gu-title">
              <MistlineInline text={title} sources={sources} />
            </h3>
          )}
          {summary && (
            <p className="gu-dossier__summary">
              <MistlineInline text={summary} sources={sources} />
            </p>
          )}
        </div>

        {hasPhotoSlot && (
          <div className="gu-dossier__diptych">
            <div className="gu-dossier__diptych-grid">
              <div
                className={`gu-dossier__media is-primary${secondaryUrl && fanSwapped ? " is-hidden" : ""}`}
              >
                <ResolvedMediaSurface
                  asset={asset}
                  fallbackUrls={fallbackUrls}
                  status={status}
                  query={query}
                  alt={title || query}
                  seed={title || query || "Konteks"}
                  ratio="16/10"
                  className="gu-dossier__frame"
                  onLoaded={markLoaded}
                  onFailed={markFailed}
                  onRetry={retry}
                  onZoom={() => setLightboxOpen(true)}
                />
              </div>
              {secondaryUrl && (
                <div
                  className={`gu-dossier__media is-secondary${fanSwapped ? "" : " is-hidden"}`}
                >
                  <MistlinePhoto
                    src={secondaryUrl}
                    seed={`${title || query}-2`}
                    ratio="16/10"
                    className="gu-dossier__frame"
                  />
                </div>
              )}
              {secondaryUrl && (
                <div
                  className="gu-dossier__glass-switch"
                  role="tablist"
                  aria-label="Pilih foto dossier"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!fanSwapped}
                    className={!fanSwapped ? "is-on" : ""}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFanSwapped(false);
                    }}
                  >
                    {!fanSwapped && <ActivePlate layoutId={photoTabId} />}
                    01
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={fanSwapped}
                    className={fanSwapped ? "is-on" : ""}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFanSwapped(true);
                    }}
                  >
                    {fanSwapped && <ActivePlate layoutId={photoTabId} />}
                    02
                  </button>
                </div>
              )}
            </div>
            {(extraFacts.length > 0 || asset?.sourceTitle) && (
              <div
                className="gu-dossier__diptych-meta"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  textAlign: "right",
                  gap: 3,
                }}
              >
                {extraFacts.length > 0 ? (
                  <>
                    <span
                      className="gu-dossier__diptych-lbl"
                      style={{
                        whiteSpace: "normal",
                        overflow: "visible",
                        textOverflow: "clip",
                      }}
                    >
                      {str(extraFacts[0].label)} :
                    </span>
                    <strong
                      className="gu-dossier__diptych-val"
                      style={{
                        whiteSpace: "normal",
                        overflow: "visible",
                        textOverflow: "clip",
                        width: "100%",
                      }}
                    >
                      <MistlineInline
                        text={str(extraFacts[0].value)}
                        sources={sources}
                      />
                    </strong>
                  </>
                ) : (
                  <span
                    className="gu-dossier__diptych-val"
                    style={{
                      whiteSpace: "normal",
                      overflow: "visible",
                      textOverflow: "clip",
                      width: "100%",
                    }}
                  >
                    {asset?.sourceTitle || title || "Dokumentasi visual"}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {highlights.length > 0 && (
        <ul
          className="gu-dossier__highlights"
          data-hl-count={highlights.length}
          role="list"
        >
          {highlights.map((item, idx) => (
            <li key={idx} className="gu-dossier__hl-item">
              <span className="gu-dossier__hl-icon" aria-hidden="true">
                <MistlineIcon name={item.icon} size={18} strokeWidth={1.9} />
              </span>
              <span className="gu-dossier__hl-text">
                <MistlineInline text={item.text} sources={sources} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {lightboxOpen && fullSrc && (
        <ImageLightboxModal
          asset={{
            src: fullSrc,
            alt: title || "Visual",
            caption: summary || subtitle || title,
            sourceUrl: asset?.sourceUrl,
            sourceTitle: asset?.sourceTitle,
          }}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </motion.section>
  );
}

function TransitRouteCard({
  props,
  complete,
  live,
  sources,
  onAction,
}: MistlineGenProps) {
  const origin = str(props.origin);
  const destination = str(props.destination);
  const distance = str(props.distance);
  const bottleneck = str(props.bottleneck);
  const returnTip = str(props.returnTip);
  const title =
    str(props.title) ||
    (origin && destination ? `${origin} -> ${destination}` : "Rute Perjalanan");
  const options = arr(props.options)
    .map(rec)
    .filter((o) => str(o.mode) || str(o.label));
  const [scenario, setScenario] = useState<"normal" | "peak">("peak");

  if (!origin && !destination && options.length === 0 && complete) return null;

  return (
    <section className="gu gu-transit">
      <div className="gu-transit__head">
        <div className="gu-transit__title-wrap">
          <h3 className="gu-title">
            <MistlineInline text={title} sources={sources} />
          </h3>
          {(origin || destination || distance) && (
            <div className="gu-transit__route-meta">
              {origin && destination && (
                <span className="gu-transit__endpoints">
                  <MapPin size={12} strokeWidth={1.85} />
                  <span>{origin}</span>
                  <ArrowRight size={11} />
                  <span>{destination}</span>
                </span>
              )}
              {distance && <span className="gu-tag">{distance}</span>}
            </div>
          )}
        </div>
        <div
          className="gu-filter-row"
          role="tablist"
          aria-label="Skenario kondisi jalan"
        >
          <motion.button
            type="button"
            className={`gu-filter-chip${scenario === "normal" ? " is-active" : ""}`}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => setScenario("normal")}
          >
            Lalu Lintas Normal
          </motion.button>
          <motion.button
            type="button"
            className={`gu-filter-chip${scenario === "peak" ? " is-active" : ""}`}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => setScenario("peak")}
          >
            Jam Sibuk / Event
          </motion.button>
        </div>
      </div>

      {options.length > 0 && (
        <div className="gu-transit__grid">
          {options.map((opt, idx) => {
            const modeName =
              str(opt.mode) || str(opt.label) || `Opsi ${idx + 1}`;
            const normalT = str(opt.normalTime) || str(opt.time) || "—";
            const peakT = str(opt.peakTime) || normalT;
            const activeTime = scenario === "peak" ? peakT : normalT;
            const costSolo = str(opt.costSolo);
            const costGroup = str(opt.costGroup);
            const note = str(opt.note);
            const tag = str(opt.tag);
            return (
              <motion.div
                key={idx}
                className={`gu-transit__card${live ? " is-interactive" : ""}`}
                whileHover={live ? MH.card : undefined}
                whileTap={live ? MH.press : undefined}
                transition={MH.spring}
                onClick={() =>
                  live &&
                  onAction?.({
                    type: "send",
                    text: `Berikan rincian taktis & titik drop-off terbaik untuk opsi "${modeName}" dari ${origin || "asal"} ke ${destination || "tujuan"}.`,
                  })
                }
              >
                <div className="gu-transit__card-top">
                  <div className="gu-transit__mode-col">
                    <strong>{modeName}</strong>
                    {tag && <span className="gu-tag">{tag}</span>}
                  </div>
                  <div className="gu-transit__eta">{activeTime}</div>
                </div>
                {(costSolo || costGroup) && (
                  <div className="gu-transit__costs">
                    {costSolo && (
                      <div className="gu-transit__cost-cell">
                        <span className="gu-transit__cost-k">Solo</span>
                        <span className="gu-transit__cost-v">{costSolo}</span>
                      </div>
                    )}
                    {costGroup && (
                      <div className="gu-transit__cost-cell">
                        <span className="gu-transit__cost-k">Grup</span>
                        <span className="gu-transit__cost-v">{costGroup}</span>
                      </div>
                    )}
                  </div>
                )}
                {note && (
                  <p className="gu-transit__note">
                    <MistlineInline text={note} sources={sources} />
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {(bottleneck || returnTip) && (
        <div className="gu-transit__foot">
          {bottleneck && (
            <div className="gu-transit__alert">
              <strong>Titik Macet</strong>
              <span>
                <MistlineInline text={bottleneck} sources={sources} />
              </span>
            </div>
          )}
          {returnTip && (
            <div className="gu-transit__return">
              <strong>Taktik Pulang</strong>
              <span>
                <MistlineInline text={returnTip} sources={sources} />
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function scaleIngredientAmount(rawAmt: unknown, factor: number): string {
  if (typeof rawAmt === "number" && Number.isFinite(rawAmt)) {
    const scaled = rawAmt * factor;
    return Number.isInteger(scaled)
      ? String(scaled)
      : scaled.toFixed(1).replace(/\.0$/, "");
  }
  const s = str(rawAmt);
  if (!s) return "";
  return s.replace(/(\d+(?:[.,]\d+)?)/g, (m) => {
    const n = parseFloat(m.replace(",", "."));
    if (!Number.isFinite(n)) return m;
    const scaled = n * factor;
    return Number.isInteger(scaled)
      ? String(scaled)
      : scaled.toFixed(1).replace(/\.0$/, "");
  });
}

function RecipeScalerCard({
  props,
  complete,
  sources,
  onReady,
}: MistlineGenProps) {
  const title = str(props.title);
  const baseServings = Math.max(1, num(props.servings) ?? 2);
  const [servings, setServings] = useState(baseServings);
  const [checkedIng, setCheckedIng] = useState<Record<number, boolean>>({});
  const reduce = useReducedMotion();
  const ingredients = arr(props.ingredients)
    .map(rec)
    .filter((it) => str(it.name) || str(it.item));
  const steps = arr(props.steps)
    .map((s) => str(s))
    .filter(Boolean);
  const query = str(props.imageQuery);
  const direct = str(props.src) || str(props.image) || str(props.imageUrl);
  const hasPhoto = Boolean(query || direct);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { asset, fallbackUrls, status, retry, markLoaded, markFailed } =
    useResolvedSingleImage({
      query: hasPhoto ? query : "",
      direct: hasPhoto ? direct : "",
      caption: title,
      alt: title || "Foto masakan",
      onReady,
    });

  if (!title && ingredients.length === 0 && complete) return null;

  const factor = servings / baseServings;
  const fullSrc = asset?.imageUrl || asset?.thumbnailUrl;

  return (
    <section className="gu gu-recipe">
      <div className="gu-recipe__head">
        <div className="gu-recipe__head-main">
          <h3 className="gu-title">{title || "Resep Interaktif"}</h3>
          <div className="gu-recipe__meta-row">
            {str(props.prepTime) && (
              <span className="gu-tag">Prep {str(props.prepTime)}</span>
            )}
            {str(props.cookTime) && (
              <span className="gu-tag">Masak {str(props.cookTime)}</span>
            )}
            <div
              className="gu-recipe__stepper"
              role="group"
              aria-label="Atur porsi"
            >
              <motion.button
                type="button"
                className="gu-recipe__stepper-btn"
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={() => setServings((v) => Math.max(1, v - 1))}
                aria-label="Kurangi porsi"
              >
                <Minus size={12} />
              </motion.button>
              <span className="gu-recipe__stepper-val">{servings} porsi</span>
              <motion.button
                type="button"
                className="gu-recipe__stepper-btn"
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={() => setServings((v) => Math.min(24, v + 1))}
                aria-label="Tambah porsi"
              >
                <Plus size={12} />
              </motion.button>
            </div>
          </div>
        </div>
        {hasPhoto && (
          <div className="gu-recipe__media">
            <ResolvedMediaSurface
              asset={asset}
              fallbackUrls={fallbackUrls}
              status={status}
              query={query}
              alt={title}
              seed={title || "Resep"}
              ratio="4/3"
              className="gu-recipe__frame"
              onLoaded={markLoaded}
              onFailed={markFailed}
              onRetry={retry}
              onZoom={() => setLightboxOpen(true)}
            />
          </div>
        )}
      </div>

      {ingredients.length > 0 && (
        <ul className="gu-recipe__ings" role="list">
          {ingredients.map((it, idx) => {
            const name = str(it.name) || str(it.item);
            const amt = scaleIngredientAmount(it.amount ?? it.qty, factor);
            const unit = str(it.unit);
            const note = str(it.note);
            const isChecked = Boolean(checkedIng[idx]);
            return (
              <li key={idx} className="gu-recipe__ing-li">
                <motion.button
                  type="button"
                  className={`gu-recipe__ing-btn${isChecked ? " is-done" : ""}`}
                  initial={false}
                  animate={{ opacity: isChecked ? 0.58 : 1 }}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  onClick={(e) => {
                    tweenPaint(e.currentTarget.querySelector(".gu-check__box"), reduce);
                    setCheckedIng((p) => ({ ...p, [idx]: !p[idx] }));
                  }}
                  aria-pressed={isChecked}
                >
                  <span className="gu-check__box gu-recipe__ing-check">
                    <AnimatePresence initial={false}>
                      {isChecked && (
                        <CheckGlyph key="check" size={12} strokeWidth={2.5} />
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="gu-recipe__ing-body">
                    <span className="gu-recipe__ing-name">
                      <MistlineInline text={name} sources={sources} />
                    </span>
                    {note && (
                      <span className="gu-recipe__ing-note">
                        <MistlineInline text={note} sources={sources} />
                      </span>
                    )}
                  </span>
                  {(amt || unit) && (
                    <strong className="gu-recipe__ing-qty">
                      {[amt, unit].filter(Boolean).join(" ")}
                    </strong>
                  )}
                </motion.button>
              </li>
            );
          })}
        </ul>
      )}

      {steps.length > 0 && (
        <ol className="gu-recipe__steps">
          {steps.map((st, idx) => (
            <li key={idx} className="gu-recipe__step">
              <span className="gu-recipe__step-num" aria-hidden="true">{idx + 1}</span>
              <span className="gu-recipe__step-body">
                <MistlineInline text={st} sources={sources} />
              </span>
            </li>
          ))}
        </ol>
      )}

      {str(props.tip) && (
        <p className="gu-caption">
          <MistlineInline text={str(props.tip)} sources={sources} />
        </p>
      )}

      {lightboxOpen && fullSrc && (
        <ImageLightboxModal
          asset={{
            src: fullSrc,
            alt: title,
            caption: title,
            sourceUrl: asset?.sourceUrl,
          }}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </section>
  );
}

function MoodboardMosaic({
  props,
  complete,
  sources,
  onReady,
}: MistlineGenProps) {
  const title = str(props.title);
  const vibe = str(props.vibe);
  const swatches = arr(props.swatches)
    .map(rec)
    .filter((c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(str(c.hex).trim()));
  const notes = arr(props.notes)
    .map((n) => str(n))
    .filter(Boolean);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [activeAsset, setActiveAsset] = useState<NormalizedImageAsset | null>(
    null,
  );

  const collectionProps = useMemo(
    () => ({ ...props, items: props.visuals ?? props.items }),
    [props],
  );
  const { assets, status, markItemSettled, dropAsset } = useImageCollection(
    collectionProps,
    onReady,
  );

  if (assets.length === 0 && swatches.length === 0 && complete) return null;

  return (
    <section className="gu gu-moodboard">
      <div className="gu-moodboard__head">
        <div>
          <h3 className="gu-title">{title || "Moodboard Referensi"}</h3>
          {vibe && <p className="gu-moodboard__vibe">{vibe}</p>}
        </div>
        {swatches.length > 0 && (
          <div className="gu-moodboard__swatches">
            {swatches.map((sw, idx) => {
              const hex = str(sw.hex).trim().toUpperCase();
              return (
                <motion.button
                  key={`${hex}-${idx}`}
                  type="button"
                  className="gu-moodboard__swatch"
                  style={{ background: hex, color: textOnHex(hex) }}
                  whileHover={MH.chip}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  title={`${str(sw.name) || hex} (${str(sw.role) || "Salin hex"})`}
                  onClick={() => {
                    void navigator.clipboard?.writeText(hex);
                    setCopiedHex(hex);
                    setTimeout(() => setCopiedHex(null), 1200);
                  }}
                >
                  <span>{copiedHex === hex ? "Copied" : hex}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {status === "searching" ? (
        <div className="gu-moodboard__grid" data-count={3}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="gu-moodboard__tile gu-skel gu-skel--image"
            />
          ))}
        </div>
      ) : assets.length > 0 ? (
        <div
          className="gu-moodboard__grid"
          data-count={Math.min(assets.length, 4)}
        >
          {assets.map((a, idx) => {
            const hasUrl = Boolean(a.thumbnailUrl || a.imageUrl);
            return (
              <motion.figure
                key={`${a.id}-${idx}`}
                className={`gu-moodboard__tile${idx === 0 && assets.length >= 3 ? " is-lead" : ""}`}
                whileHover={MH.image}
                whileTap={MH.press}
                transition={MH.spring}
                onClick={() => hasUrl && setActiveAsset(a)}
              >
                {hasUrl ? (
                  <MistlinePhoto
                    src={pickSharpDisplayImageUrl(a)}
                    seed={a.alt || a.caption || title}
                    icon="image"
                    ratio={idx === 0 && assets.length >= 3 ? "16/10" : "4/3"}
                    onLoaded={markItemSettled}
                    skipClaimRegistration
                      onFailed={() => dropAsset(a.id)}
                  />
                ) : (
                  <MistlinePostcard
                    seed={a.caption || title}
                    icon="image"
                    ratio="4/3"
                  />
                )}
                {a.caption && <figcaption>{a.caption}</figcaption>}
              </motion.figure>
            );
          })}
        </div>
      ) : null}

      {notes.length > 0 && (
        <ul className="gu-moodboard__notes" role="list">
          {notes.map((n, i) => (
            <li key={i}>
              <MistlineInline text={n} sources={sources} />
            </li>
          ))}
        </ul>
      )}

      {activeAsset && (activeAsset.imageUrl || activeAsset.thumbnailUrl) && (
        <ImageLightboxModal
          asset={{
            src: activeAsset.imageUrl || activeAsset.thumbnailUrl || "",
            alt: activeAsset.alt,
            caption: activeAsset.caption,
            sourceUrl: activeAsset.sourceUrl,
          }}
          onClose={() => setActiveAsset(null)}
        />
      )}
    </section>
  );
}

function ConceptFlashcards({ props, complete, sources }: MistlineGenProps) {
  const title = str(props.title);
  const cards = arr(props.cards ?? props.items)
    .map(rec)
    .filter((c) => str(c.term) || str(c.title) || str(c.question));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (cards.length === 0 && complete) return null;
  if (cards.length === 0) return null;

  const safeIdx = Math.min(idx, cards.length - 1);
  const card = cards[safeIdx];
  const term = str(card.term) || str(card.title) || str(card.question);
  const root = str(card.root) || str(card.etymology);
  const summary =
    str(card.summary) || str(card.explain) || str(card.definition);
  const analogy = str(card.analogy);
  const checkQ = str(card.checkQuestion);
  const checkA = str(card.checkAnswer);

  return (
    <section className="gu gu-flashcards">
      <div className="gu-flashcards__head">
        <h3 className="gu-title">{title || "Kartu Konsep"}</h3>
        <div className="gu-flashcards__nav">
          <span className="gu-tag">
            {String(safeIdx + 1).padStart(2, "0")} /{" "}
            {String(cards.length).padStart(2, "0")}
          </span>
          {cards.length > 1 && (
            <>
              <motion.button
                type="button"
                className="gu-icon-btn"
                whileTap={MH.tap}
                transition={MH.spring}
                aria-label="Kartu sebelumnya"
                onClick={() => {
                  setRevealed(false);
                  setIdx((cur) => (cur - 1 + cards.length) % cards.length);
                }}
              >
                <ChevronLeft size={13} />
              </motion.button>
              <motion.button
                type="button"
                className="gu-icon-btn"
                whileTap={MH.tap}
                transition={MH.spring}
                aria-label="Kartu berikutnya"
                onClick={() => {
                  setRevealed(false);
                  setIdx((cur) => (cur + 1) % cards.length);
                }}
              >
                <ChevronRight size={13} />
              </motion.button>
            </>
          )}
        </div>
      </div>

      <div className="gu-flashcard__body">
        <div className="gu-flashcard__term-row">
          <strong className="gu-flashcard__term">{term}</strong>
          {root && <em className="gu-flashcard__root">{root}</em>}
        </div>
        {summary && (
          <p className="gu-flashcard__summary">
            <MistlineInline text={summary} sources={sources} />
          </p>
        )}
        {analogy && (
          <div className="gu-flashcard__analogy">
            <span className="gu-kicker">Analogi</span>
            <p>
              <MistlineInline text={analogy} sources={sources} />
            </p>
          </div>
        )}
        {checkQ && (
          <div className="gu-flashcard__check">
            <p className="gu-flashcard__q">
              <strong>Cek Pemahaman:</strong>{" "}
              <MistlineInline text={checkQ} sources={sources} />
            </p>
            {checkA && (
              <motion.button
                type="button"
                className="gu-pill-btn"
                whileHover={MH.chip}
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={() => setRevealed((r) => !r)}
              >
                {revealed ? "Sembunyikan Jawaban" : "Buka Jawaban"}
              </motion.button>
            )}
            {revealed && checkA && (
              <p className="gu-flashcard__a">
                <MistlineInline text={checkA} sources={sources} />
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function CodeDiffPatch({ props, complete }: MistlineGenProps) {
  const title = str(props.title);
  const file = str(props.file);
  const before = str(props.before);
  const after = str(props.after);
  const [mode, setMode] = useState<"before" | "after" | "both">("both");
  const [copied, setCopied] = useState(false);
  const segId = useId();

  if (!before && !after && complete) return null;

  const beforeLines = before ? before.split("\n") : [];
  const afterLines = after ? after.split("\n") : [];

  return (
    <section className="gu gu-diff">
      <div className="gu-diff__head">
        <div className="gu-diff__file-row">
          <code className="gu-diff__file">{file || title || "Patch"}</code>
          {beforeLines.length > 0 && (
            <span className="gu-diff__delta is-del">−{beforeLines.length}</span>
          )}
          {afterLines.length > 0 && (
            <span className="gu-diff__delta is-add">+{afterLines.length}</span>
          )}
        </div>

        <div className="gu-diff__seg" role="tablist" aria-label="Mode diff">
          {(
            [
              ["both", "Both"],
              ["before", "Before"],
              ["after", "After"],
            ] as const
          ).map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={mode === k}
              className={`gu-diff__seg-btn${mode === k ? " is-active" : ""}`}
              onClick={() => setMode(k)}
            >
              {mode === k && <ActivePlate layoutId={segId} shadow border />}
              {lbl}
            </button>
          ))}
        </div>

        <div className="gu-diff__actions">
          <motion.button
            type="button"
            className="gu-icon-btn"
            whileTap={MH.tap}
            transition={MH.spring}
            aria-label="Salin kode sesudah"
            title="Salin hasil"
            onClick={() => {
              void navigator.clipboard?.writeText(
                mode === "before" ? before : after || before,
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </motion.button>
        </div>
      </div>

      <div className="gu-diff__body">
        <pre className="gu-diff__pre">
          {mode !== "after" &&
            beforeLines.map((line, i) => (
              <div key={`b-${i}`} className="gu-diff__line is-del">
                <span className="gu-diff__sign">−</span>
                <span className="gu-diff__ln">{i + 1}</span>
                <code>{line || " "}</code>
              </div>
            ))}
          {mode !== "before" &&
            afterLines.map((line, i) => (
              <div key={`a-${i}`} className="gu-diff__line is-add">
                <span className="gu-diff__sign">+</span>
                <span className="gu-diff__ln">{i + 1}</span>
                <code>{line || " "}</code>
              </div>
            ))}
        </pre>
      </div>
    </section>
  );
}

type BentoSlotKind =
  | "flight_route"
  | "micro_diff"
  | "cli_runbook"
  | "color_swatches"
  | "etiquette_split"
  | "fun_fact"
  | "spotlight_stat"
  | "weather_strip"
  | "route_stops"
  | "schedule"
  | "rows_interactive"
  | "text_note";

function inferBentoSlotKind(item: Record<string, unknown>): BentoSlotKind {
  const rawSlot = (str(item.slot) || str(item.kind) || str(item.type))
    .toLowerCase()
    .trim();
  if (
    (str(item.from) && str(item.to)) ||
    /flight|plane|boarding|air_route|penerbangan/.test(rawSlot)
  ) {
    return "flight_route";
  }
  if (
    str(item.before) ||
    str(item.after) ||
    Array.isArray(item.before) ||
    Array.isArray(item.after) ||
    /diff|patch/.test(rawSlot)
  ) {
    return "micro_diff";
  }
  if (
    str(item.command) ||
    str(item.code) ||
    str(item.cmd) ||
    str(item.script) ||
    /cli|runbook|command|terminal|shell/.test(rawSlot)
  ) {
    return "cli_runbook";
  }
  if (
    arr(item.swatches).length > 0 ||
    /swatch|palette|color/.test(rawSlot)
  ) {
    return "color_swatches";
  }
  const hasSplitProps =
    arr(item.leftItems ?? item.dos ?? item.do ?? item.left ?? item.pros).length > 0 ||
    arr(item.rightItems ?? item.donts ?? item.dont ?? item.right ?? item.cons).length > 0;
  if (hasSplitProps || /split|etiquette|do_dont/.test(rawSlot)) {
    return "etiquette_split";
  }
  const rawRows = arr(
    item.rows ?? item.items ?? item.stops ?? item.points ?? item.bullets,
  );
  const rows = rawRows.map(rec);
  if (
    /weather|uv|cuaca|suhu/.test(rawSlot) ||
    (rows.length >= 3 &&
      rows.every((r) => /°/.test(str(r.value) || str(r.badge))))
  ) {
    return "weather_strip";
  }
  if (
    str(item.statValue) ||
    (str(item.value) && /^\d/.test(str(item.value)) && rawRows.length === 0)
  ) {
    return "spotlight_stat";
  }
  if (/fun_fact|spotlight|trivia/.test(rawSlot)) {
    return "fun_fact";
  }
  if (rawRows.length > 0) {
    // Slot ids are snake_case; spaces make \b work on each word.
    const hint = `${rawSlot} ${str(item.title) || str(item.label)}`
      .toLowerCase()
      .replace(/[_-]+/g, " ");
    if (/\b(?:train|kereta|rail|bus|route|rute|stops|transit)\b/.test(hint)) {
      return "route_stops";
    }
    if (
      /\b(?:schedule|jadwal|stage|panggung|rundown|agenda|lineup|sesi)\b/.test(hint)
    ) {
      return "schedule";
    }
    return "rows_interactive";
  }
  return "text_note";
}

function resolveBentoToneClass(toneRaw: string): string {
  const t = toneRaw.toLowerCase().trim();
  if (t === "success" || t === "green" || t === "ok" || t === "pass")
    return "is-success";
  if (t === "warning" || t === "amber" || t === "caution") return "is-warning";
  if (t === "danger" || t === "error" || t === "red" || t === "critical")
    return "is-danger";
  if (t === "info" || t === "blue") return "is-info";
  if (t === "accent" || t === "highlight" || t === "primary")
    return "is-accent";
  return "is-neutral";
}

function humanizeBentoSlotLabel(
  rawSlot: string,
  inferredKind: BentoSlotKind,
  fallbackMeta = "",
): string {
  const s = rawSlot.toLowerCase().trim();
  if (/flight|plane|boarding|penerbangan/.test(s) || (inferredKind === "flight_route" && !rawSlot))
    return "Penerbangan";
  if (/train|kereta|rail|stasiun/.test(s)) return "Rute Kereta";
  if (/transit|bus|mrt|krl|lrt|rute/.test(s)) return "Rute Transit";
  if (/concert|stage|konser|lineup|setlist/.test(s)) return "Jadwal Panggung";
  if (/ticket|tiket|voucher|gelang|wristband|exchange|penukaran/.test(s))
    return "Penukaran Tiket";
  if (/doc|dokumen|syarat|ktp|id|kuasa/.test(s)) return "Syarat Dokumen";
  if (/rule|aturan|tata_tertib|regulasi|adab/.test(s)) return "Tata Tertib";
  if (/weather|uv|cuaca|suhu/.test(s) || (inferredKind === "weather_strip" && !rawSlot))
    return "Cuaca & Kondisi";
  if (/diff|patch|code/.test(s) || (inferredKind === "micro_diff" && !rawSlot))
    return "Patch Kode";
  if (/cli|runbook|terminal|command|shell/.test(s) || (inferredKind === "cli_runbook" && !rawSlot))
    return "Runbook CLI";
  if (/flamegraph|trace|latency/.test(s)) return "Trace & Latensi";
  if (/sql|query|index/.test(s)) return "Optimasi Query";
  if (/canary|env|rollout|deploy/.test(s)) return "Status Rollout";
  if (/baker|resep|formula|scaler/.test(s)) return "Formula Takaran";
  if (/burner|tungku|timer/.test(s)) return "Sinkronisasi Masak";
  if (/temp|doneness/.test(s)) return "Suhu Inti";
  if (/swap|substitusi/.test(s)) return "Substitusi Bahan";
  if (/swatch|color|palette|warna/.test(s) || (inferredKind === "color_swatches" && !rawSlot))
    return "Token Warna";
  if (/cashflow|arus_kas|ledger|biaya|tarif|harga|cost|budget/.test(s))
    return "Rincian Biaya";
  if (/rebalance|portofolio|alokasi/.test(s)) return "Sinyal Portofolio";
  if (/parcel|paket|kurir/.test(s)) return "Lacak Paket";
  if (/focus|agenda|daily|jadwal/.test(s)) return "Fokus & Agenda";
  if (/gate|pintu|loket|lokasi|venue|akses/.test(s)) return "Akses Venue";
  if (/security|keamanan|guard|safety/.test(s)) return "Keamanan";
  if (/tip|saran|rekomendasi/.test(s)) return "Rekomendasi";
  if (/warn|peringatan|alert|perhatian|catatan|note/.test(s))
    return "Catatan Penting";
  if (/fun_fact|trivia|fakta/.test(s)) return "Fakta Menarik";
  if (/etiquette|do_dont|split/.test(s) || (inferredKind === "etiquette_split" && !rawSlot))
    return "Panduan Do & Don't";

  // Ignore generic layout/index slot IDs ("a", "b", "c", "d", "slot_1", "s1", "01")
  const isGenericSlotToken =
    /^(?:[a-z]|\d{1,2}|(?:slot|widget|item|card|panel|box|col|row|tab|section|part|s)[\s_-]*[a-z0-9]{1,2})$/i.test(
      s,
    );

  if (rawSlot && !isGenericSlotToken) {
    const cleaned = rawSlot
      .replace(/^slot:\s*/i, "")
      .replace(/[_-]+/g, " ")
      .trim();
    if (cleaned) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  if (fallbackMeta.trim()) return fallbackMeta.trim();
  if (inferredKind === "spotlight_stat") return "Metrik Utama";
  if (inferredKind === "text_note") return "Catatan Penting";
  if (inferredKind === "fun_fact") return "Sorotan Fakta";
  return "Sorotan";
}

function localizeBentoMeta(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const low = s.toLowerCase();
  if (low === "mandatory" || low === "required" || low === "must") return "Wajib";
  if (low === "restricted" || low === "limited") return "Terbatas";
  if (low === "prohibited" || low === "banned" || low === "forbidden" || low === "not allowed") return "Dilarang";
  if (low === "no pro gear" || low === "no camera") return "Tanpa Kamera Pro";
  if (low === "empty hands" || low === "no food" || low === "no bottle") return "Tanpa Botol/Makan";
  if (low === "allowed" || low === "ok" || low === "permitted") return "Diizinkan";
  if (low === "optional") return "Opsional";
  if (low === "recommended") return "Disarankan";
  if (low === "on schedule" || low === "on time") return "Sesuai Jadwal";
  if (low === "delayed") return "Tertunda";
  if (low === "warning" || low === "caution") return "Perhatian";
  if (low === "critical" || low === "urgent") return "Penting";
  if (low === "tip" || low === "tips") return "Tips";
  return s;
}

/* ── Bento widgets: one layout per kind. The tab panel is keyed by index, so
   every entry animation below replays when its tab becomes active. ── */

type BentoRow = Record<string, unknown>;

const BENTO_EASE = MH.ease.ease;

function bentoIn(
  reduce: boolean | null,
  i: number,
  from: { x?: number; y?: number; scale?: number } = { y: 6 },
) {
  return {
    initial: reduce ? (false as const) : { opacity: 0, ...from },
    animate: { opacity: 1, x: 0, y: 0, scale: 1 },
    transition: reduce
      ? INSTANT
      : { duration: 0.32, ease: BENTO_EASE, delay: 0.05 + i * 0.07 },
  };
}

const bentoParts = (s: string) =>
  s
    .split("·")
    .map((p) => p.trim())
    .filter(Boolean);

const bentoRowLabel = (r: BentoRow) =>
  str(r.label) || str(r.title) || str(r.name);

const bentoRowSub = (r: BentoRow) => str(r.sub) || str(r.note) || str(r.detail);

const BENTO_CLOCK_RE = /(\d{1,2})[:.](\d{2})/;

function bentoClock(raw: string) {
  const m = BENTO_CLOCK_RE.exec(raw);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return {
    text: `${m[1].padStart(2, "0")}:${m[2]}`,
    minutes: Number(m[1]) * 60 + Number(m[2]),
    rest: raw.replace(m[0], "").trim(),
  };
}

/** Minutes from a to b, rolling over midnight. */
function bentoGap(a: number | undefined, b: number | undefined) {
  if (a === undefined || b === undefined || a === b) return null;
  return b > a ? b - a : b - a + 1440;
}

function bentoDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}j` : `${h}j ${m}m`;
}

/** "Kursi 6D · Kecepatan 105 km/j" -> [{Kursi, 6D}, {Kecepatan, 105 km/j}] */
function parseBentoFacts(footer: string) {
  return bentoParts(footer)
    .slice(0, 4)
    .map((part) => {
      const m = /^(\D{2,28}?):?\s+(\S*\d.*)$/.exec(part);
      if (m) return { label: m[1].trim(), value: m[2] };
      const cut = part.indexOf(" ");
      return cut > 0
        ? { label: part.slice(0, cut), value: part.slice(cut + 1) }
        : { label: "Info", value: part };
    });
}

function BentoCopyButton({
  copied,
  onCopy,
  label,
}: {
  copied: boolean;
  onCopy: () => void;
  label?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      className="gu-bento__copy-btn"
      data-tone={copied ? "success" : undefined}
      aria-label={copied ? "Tersalin" : "Salin"}
      whileTap={reduce ? undefined : { scale: 0.86 }}
      transition={MH.spring}
      onClick={onCopy}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <CheckGlyph key="check" size={12} strokeWidth={2.6} />
        ) : (
          <motion.span
            key="copy"
            className="gu-bento__copy-ico"
            initial={reduce ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={reduce ? INSTANT : { duration: 0.14 }}
          >
            <Copy size={12} />
          </motion.span>
        )}
      </AnimatePresence>
      {label && <span>{copied ? "Tersalin" : label}</span>}
    </motion.button>
  );
}

function BentoRouteStops({
  rows,
  facts,
  reduce,
  sources,
}: {
  rows: BentoRow[];
  facts: { label: string; value: string }[];
  reduce: boolean | null;
  sources?: SourceItem[];
}) {
  const stops = rows.slice(0, 6).map((r) => {
    const [name = "", ...rest] = bentoParts(bentoRowLabel(r) || str(r.station));
    const parts = [str(r.time), str(r.value), str(r.badge) || str(r.status)].flatMap(
      bentoParts,
    );
    const timeAt = parts.findIndex((p) => bentoClock(p));
    return {
      name,
      sub: [...rest, bentoRowSub(r)].filter(Boolean).join(" · "),
      clock: timeAt >= 0 ? bentoClock(parts[timeAt]) : null,
      chip: parts.filter((_, i) => i !== timeAt).join(" · "),
      tone: resolveBentoToneClass(str(r.tone)).replace("is-", ""),
    };
  });
  const timed = stops.some((s) => s.clock);
  // The rail is drawn one leg per STEP; each dot pops as the line reaches it.
  const STEP = 0.24;

  return (
    <div className="gu-bento__route">
      <ol className="gu-bento__stops" data-timed={timed ? "" : undefined}>
        {stops.map((s, i) => {
          const last = i === stops.length - 1;
          const leg = last
            ? null
            : bentoGap(s.clock?.minutes, stops[i + 1].clock?.minutes);
          const at = 0.08 + i * STEP;
          const fade = {
            initial: reduce ? (false as const) : { opacity: 0, x: 6 },
            animate: { opacity: 1, x: 0 },
            transition: reduce
              ? INSTANT
              : { duration: 0.3, ease: BENTO_EASE, delay: at },
          };
          return (
            <li key={`stop-${i}`} className="gu-bento__stop">
              {timed && (
                <motion.div className="gu-bento__stop-time" {...fade}>
                  {s.clock && <strong>{s.clock.text}</strong>}
                  {s.clock?.rest && <span>{s.clock.rest}</span>}
                  {leg !== null && (
                    <em className="gu-bento__stop-leg">{bentoDuration(leg)}</em>
                  )}
                </motion.div>
              )}
              <div className="gu-bento__stop-rail" aria-hidden="true">
                <motion.span
                  className={`gu-bento__stop-dot${i === 0 ? " is-origin" : last ? " is-terminus" : ""}`}
                  initial={reduce ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={reduce ? INSTANT : { ...MH.spring, delay: at }}
                />
                {!last && (
                  <motion.span
                    className="gu-bento__stop-seg"
                    style={{ originY: 0 }}
                    initial={reduce ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={
                      reduce
                        ? INSTANT
                        : { duration: STEP, ease: "linear", delay: at + 0.04 }
                    }
                  />
                )}
              </div>
              <motion.div className="gu-bento__stop-main" {...fade}>
                <span className="gu-bento__stop-name">
                  <MistlineInline text={s.name} sources={sources} />
                </span>
                {s.sub && (
                  <span className="gu-bento__stop-sub">
                    <MistlineInline text={s.sub} sources={sources} />
                  </span>
                )}
              </motion.div>
              {s.chip && (
                <motion.span
                  className="gu-bento__chip"
                  data-tone={s.tone !== "neutral" ? s.tone : undefined}
                  title={s.chip}
                  {...fade}
                >
                  {s.chip}
                </motion.span>
              )}
            </li>
          );
        })}
      </ol>

      {facts.length > 0 && (
        <div className="gu-bento__facts" data-count={facts.length}>
          {facts.map((f, i) => (
            <motion.div
              key={`fact-${i}`}
              className="gu-bento__well gu-bento__mini-stat"
              {...bentoIn(reduce, stops.length + i)}
            >
              <span>{f.label}</span>
              <strong>{f.value}</strong>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function BentoSchedule({
  rows,
  reduce,
  sources,
}: {
  rows: BentoRow[];
  reduce: boolean | null;
  sources?: SourceItem[];
}) {
  const slots = rows.slice(0, 6).map((r) => {
    const rawLabel = bentoRowLabel(r);
    const fields = [str(r.time), str(r.value), str(r.badge) || str(r.status)].filter(
      Boolean,
    );
    const range = fields.find((f) => bentoClock(f)) ?? fields[0] ?? "";
    const [startRaw = "", endRaw = ""] = range.split(/\s*[–—-]\s*/);
    const start = bentoClock(startRaw);
    const end = bentoClock(endRaw);
    const span = bentoGap(start?.minutes, end?.minutes);
    return {
      title: rawLabel.replace(/^\s*[★⭐]\uFE0F?\s*/, ""),
      sub: bentoRowSub(r),
      headliner:
        /^\s*[★⭐]/.test(rawLabel) ||
        resolveBentoToneClass(str(r.tone)) === "is-accent",
      start: start?.text ?? startRaw,
      end: end?.text ?? endRaw,
      length:
        span === null ? "" : span < 180 ? `${span} mnt` : bentoDuration(span),
    };
  });

  return (
    <div className="gu-bento__sched">
      {slots.map((s, i) => (
        <motion.div
          key={`slot-${i}`}
          className={`gu-bento__slot${s.headliner ? " is-headliner" : ""}`}
          {...bentoIn(reduce, i, { x: -8 })}
        >
          <div className="gu-bento__slot-time">
            <strong>{s.start}</strong>
            {s.end && <span>{s.end}</span>}
          </div>
          <span className="gu-bento__slot-rule" aria-hidden="true">
            {s.headliner && (
              <motion.span
                className="gu-bento__slot-accent"
                style={{ originY: 0 }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={
                  reduce
                    ? INSTANT
                    : { duration: 0.45, ease: BENTO_EASE, delay: 0.22 + i * 0.07 }
                }
              />
            )}
          </span>
          <div className="gu-bento__slot-main">
            <span className="gu-bento__slot-title">
              {s.headliner && (
                <Star
                  size={13}
                  fill="currentColor"
                  strokeWidth={1.5}
                  className="gu-bento__slot-star"
                  aria-label="Penampil utama"
                />
              )}
              <span>
                <MistlineInline text={s.title} sources={sources} />
              </span>
            </span>
            {s.sub && (
              <span className="gu-bento__slot-sub">
                <MistlineInline text={s.sub} sources={sources} />
              </span>
            )}
          </div>
          {s.length && <span className="gu-bento__slot-dur">{s.length}</span>}
        </motion.div>
      ))}
    </div>
  );
}

function BentoLedger({
  rows,
  idPrefix,
  checked,
  onToggle,
  reduce,
  sources,
}: {
  rows: BentoRow[];
  idPrefix: string;
  checked: Record<string, boolean>;
  onToggle: (key: string, next: boolean) => void;
  reduce: boolean | null;
  sources?: SourceItem[];
}) {
  return (
    <div className="gu-bento__ledger">
      {rows.slice(0, 6).map((r, ri) => {
        const rowKey = `${idPrefix}-${ri}`;
        const checkable = typeof r.done === "boolean";
        const isDone = checked[rowKey] ?? Boolean(r.done);
        const label = bentoRowLabel(r);
        const sub = bentoRowSub(r);
        const val = str(r.value) || str(r.time);
        const badge = str(r.badge) || str(r.status);
        const tone = resolveBentoToneClass(
          str(r.tone) || (isDone ? "success" : ""),
        ).replace("is-", "");
        const toggle = () => onToggle(rowKey, !isDone);

        return (
          <motion.div
            key={rowKey}
            className={`gu-bento__spec${checkable ? " is-checkable" : ""}`}
            data-tone={tone !== "neutral" ? tone : undefined}
            role={checkable ? "checkbox" : undefined}
            aria-checked={checkable ? isDone : undefined}
            tabIndex={checkable ? 0 : undefined}
            onClick={checkable ? toggle : undefined}
            onKeyDown={
              checkable
                ? (e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      toggle();
                    }
                  }
                : undefined
            }
            {...bentoIn(reduce, ri)}
          >
            {checkable ? (
              <span className={`gu-bento__check${isDone ? " is-done" : ""}`}>
                <AnimatePresence initial={false}>
                  {isDone && <CheckGlyph key="check" size={10} strokeWidth={3} />}
                </AnimatePresence>
              </span>
            ) : (
              <span className="gu-bento__spec-dot" aria-hidden="true" />
            )}
            <span
              className={`gu-bento__spec-label${checkable && isDone ? " is-done-txt" : ""}`}
            >
              <MistlineInline text={label} sources={sources} />
            </span>
            {(val || badge) && (
              <>
                <motion.span
                  className="gu-bento__spec-leader"
                  aria-hidden="true"
                  style={{ originX: 0 }}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={
                    reduce
                      ? INSTANT
                      : { duration: 0.5, ease: BENTO_EASE, delay: 0.12 + ri * 0.07 }
                  }
                />
                <span className="gu-bento__spec-val">
                  {val || badge}
                  {val && badge && <small>{badge}</small>}
                </span>
              </>
            )}
            {sub && (
              <span className="gu-bento__spec-sub">
                <MistlineInline text={sub} sources={sources} />
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/** Splits "3×" / "Rp 1.250" / "42,5%" into a number that can count up and a formatter that puts it back. */
function parseBentoStat(raw: string) {
  const m = /^(\D*?)(-?\d[\d.,]*?)([.,]?[^\d.,].*|[.,]?)$/.exec(raw.trim());
  if (!m || /\d/.test(m[3]) || /^-?0\d/.test(m[2])) return null;
  const [, prefix, digits, suffix] = m;
  const grouped = /^-?\d{1,3}(?:[.,]\d{3})+$/.test(digits);
  const groupSep = grouped ? (/[.,]/.exec(digits)?.[0] ?? "") : "";
  const dec = grouped ? null : /([.,])(\d+)$/.exec(digits);
  const n = Number(grouped ? digits.replace(/[.,]/g, "") : digits.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return {
    n,
    suffix,
    format(v: number) {
      const fixed = Math.abs(v).toFixed(dec ? dec[2].length : 0);
      const [int, frac] = fixed.split(".");
      const whole = grouped ? int.replace(/\B(?=(\d{3})+$)/g, groupSep) : int;
      const sign = v < 0 && Number(fixed) !== 0 ? "-" : "";
      return `${prefix}${sign}${whole}${frac ? `${dec?.[1]}${frac}` : ""}${suffix}`;
    },
  };
}

function BentoCountUp({ value, reduce }: { value: string; reduce: boolean | null }) {
  const ref = useCallback(
    (el: HTMLElement | null) => {
      const stat = parseBentoStat(value);
      if (!el || !stat || reduce) return;
      el.textContent = stat.format(0);
      const run = animate(0, stat.n, {
        duration: 0.9,
        delay: 0.2,
        ease: BENTO_EASE,
        onUpdate: (v) => {
          el.textContent = stat.format(v);
        },
        onComplete: () => {
          el.textContent = value;
        },
      });
      return () => run.stop();
    },
    [value, reduce],
  );
  const size =
    value.length <= 3 ? "xl" : value.length === 4 ? "lg" : value.length <= 6 ? "md" : "sm";
  return (
    <strong ref={ref} className="gu-bento__hero-num" data-size={size}>
      {value}
    </strong>
  );
}

// 270° gauge, open at the bottom where the unit sits. viewBox 0 0 140 140, r 58.
const BENTO_DIAL_ARC = "M 28.99 111.01 A 58 58 0 1 1 111.01 111.01";

function BentoHero({
  item,
  reduce,
  sources,
}: {
  item: BentoRow;
  reduce: boolean | null;
  sources?: SourceItem[];
}) {
  const value = (str(item.statValue) || str(item.value)).trim();
  const unit = str(item.statUnit) || str(item.unit);
  const text =
    str(item.summary) ||
    str(item.body) ||
    str(item.description) ||
    str(item.text) ||
    str(item.subtitle);
  const stat = parseBentoStat(value);
  // A percentage fills its share of the dial; anything else sweeps the whole arc.
  const sweep =
    stat && /^\s*%/.test(stat.suffix) && stat.n > 0 && stat.n <= 100
      ? stat.n / 100
      : 1;

  // Up to three supporting facts sit side by side under the headline number.
  const facts = arr(item.facts ?? item.rows ?? item.items ?? item.points)
    .map((f) => (typeof f === "string" ? { label: "", value: f, sub: "" } : rec(f)))
    .map((f) => ({
      label: str(f.label) || str(f.title),
      value: str(f.value) || str(f.badge) || str(f.text),
      sub: str(f.sub) || str(f.note) || str(f.detail),
    }))
    .filter((f) => f.label || f.value)
    .slice(0, 3);

  return (
    <>
    <div className="gu-bento__hero" data-solo={value ? undefined : ""}>
      {value && (
        <>
          <div className="gu-bento__hero-dial">
            <svg className="gu-bento__hero-ring" viewBox="0 0 140 140" aria-hidden="true">
              <path className="gu-bento__hero-track" d={BENTO_DIAL_ARC} />
              <motion.path
                className="gu-bento__hero-arc"
                d={BENTO_DIAL_ARC}
                initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: sweep, opacity: 1 }}
                transition={
                  reduce
                    ? INSTANT
                    : {
                        pathLength: { duration: 0.9, ease: BENTO_EASE, delay: 0.2 },
                        opacity: { duration: 0.1, delay: 0.2 },
                      }
                }
              />
            </svg>
            <BentoCountUp value={value} reduce={reduce} />
            {unit && (
              <motion.span className="gu-bento__hero-unit" {...bentoIn(reduce, 4, { y: 4 })}>
                {unit}
              </motion.span>
            )}
          </div>
          <span className="gu-bento__hero-rule" aria-hidden="true" />
        </>
      )}
      <motion.p className="gu-bento__hero-text" {...bentoIn(reduce, 2, { x: 10 })}>
        <MistlineInline text={text} sources={sources} />
      </motion.p>
    </div>
    {facts.length > 0 && (
      <div className="gu-bento__facts gu-bento__hero-facts" data-count={facts.length}>
        {facts.map((f, i) => (
          <motion.div
            key={`hero-fact-${i}`}
            className="gu-bento__well gu-bento__hero-fact"
            {...bentoIn(reduce, 3 + i)}
          >
            {f.label && <span className="gu-bento__hero-fact-k">{f.label}</span>}
            {f.value && (
              <strong className="gu-bento__hero-fact-v">
                <MistlineInline text={f.value} sources={sources} />
              </strong>
            )}
            {f.sub && <em className="gu-bento__hero-fact-s">{f.sub}</em>}
          </motion.div>
        ))}
      </div>
    )}
    </>
  );
}

const BENTO_SKY: [RegExp, typeof Sun, string][] = [
  [/⛈|🌩|badai|petir|thunder|storm/, CloudLightning, "info"],
  [/🌦|gerimis|drizzle/, CloudDrizzle, "info"],
  [/🌧|☔|hujan|rain|shower/, CloudRain, "info"],
  [/❄|🌨|salju|snow/, Snowflake, "info"],
  [/🌫|kabut|fog|mist|haze/, CloudFog, ""],
  [/⛅|🌤|🌥|cerah berawan|partly|sebagian/, CloudSun, "warning"],
  [/☁|berawan|mendung|cloud|overcast/, Cloud, ""],
];

/** [low, high] from `min`/`max` props or from the numbers in "24°–31°". */
function bentoTemps(r: BentoRow): [number, number] | null {
  const lo = num(r.min ?? r.low);
  const hi = num(r.max ?? r.high);
  const found =
    lo !== undefined && hi !== undefined
      ? [lo, hi]
      : (`${str(r.value)} ${str(r.badge)}`.match(/(?<![\d°.,])-?\d+(?:[.,]\d+)?/g) ?? [])
          .slice(0, 2)
          .map((t) => Number(t.replace(",", ".")));
  return found.length > 0 ? [Math.min(...found), Math.max(...found)] : null;
}

// Temperature scale geometry in px: label room above and below a shared track.
const BENTO_WX = { pad: 20, track: 68, dot: 8 };

function BentoWeather({ rows, reduce }: { rows: BentoRow[]; reduce: boolean | null }) {
  const days = rows.slice(0, 7).map((r) => {
    const sky = `${str(r.icon)} ${str(r.sub)} ${str(r.condition)}`.toLowerCase();
    const match = BENTO_SKY.find(([re]) => re.test(sky));
    return {
      label: str(r.time) || str(r.label) || str(r.day),
      Icon: match ? match[1] : Sun,
      tone: match ? match[2] : "warning",
      caption: [str(r.sub), str(r.condition)].find((t) => /[a-z]{3}/i.test(t)) ?? "",
      temps: bentoTemps(r),
    };
  });
  const all = days.flatMap((d) => d.temps ?? []);
  const max = Math.max(...all);
  const span = max - Math.min(...all);
  const y = (t: number) =>
    span > 0 ? ((max - t) / span) * BENTO_WX.track : BENTO_WX.track / 2;
  const hasCaption = days.some((d) => d.caption);

  return (
    <div className="gu-bento__wx">
      {days.map((d, i) => {
        const [lo, hi] = d.temps ?? [0, 0];
        const top = BENTO_WX.pad + y(hi);
        const height = Math.max(BENTO_WX.dot, y(lo) - y(hi));
        const grow = reduce
          ? INSTANT
          : { duration: 0.55, ease: BENTO_EASE, delay: 0.18 + i * 0.07 };
        const label = {
          initial: reduce ? (false as const) : { opacity: 0 },
          animate: { opacity: 1 },
          transition: reduce ? INSTANT : { duration: 0.25, delay: 0.5 + i * 0.07 },
        };
        return (
          <motion.div key={`wx-${i}`} className="gu-bento__wx-day" {...bentoIn(reduce, i)}>
            <span className="gu-bento__wx-label">{d.label}</span>
            <span className="gu-bento__wx-icon" data-tone={d.tone || undefined}>
              <d.Icon size={18} strokeWidth={1.9} />
            </span>
            {hasCaption && (
              <span className="gu-bento__wx-cond" title={d.caption || undefined}>
                {d.caption || "\u00a0"}
              </span>
            )}
            {d.temps && (
              <div
                className="gu-bento__wx-scale"
                style={{ height: BENTO_WX.pad * 2 + BENTO_WX.track + BENTO_WX.dot }}
              >
                <motion.span className="gu-bento__wx-hi" style={{ top: top - 18 }} {...label}>
                  {hi}°
                </motion.span>
                <motion.span
                  className="gu-bento__wx-bar"
                  style={{ top, height, originY: 1 }}
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={grow}
                />
                {lo !== hi && (
                  <motion.span
                    className="gu-bento__wx-lo"
                    style={{ top: top + height + 4 }}
                    {...label}
                  >
                    {lo}°
                  </motion.span>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function BentoSplit({
  item,
  reduce,
  sources,
}: {
  item: BentoRow;
  reduce: boolean | null;
  sources?: SourceItem[];
}) {
  const lines = (v: unknown) =>
    arr(v)
      .map((x) =>
        typeof x === "string" ? x : str(rec(x).text || rec(x).label || rec(x).title),
      )
      .filter(Boolean)
      .slice(0, 5);
  const cols = [
    {
      head: str(item.leftTitle) || str(item.doTitle) || "Lakukan",
      items: lines(item.leftItems ?? item.dos ?? item.do ?? item.left ?? item.pros),
      tone: "success",
      Icon: Check,
      from: -10,
    },
    {
      head: str(item.rightTitle) || str(item.dontTitle) || "Hindari",
      items: lines(item.rightItems ?? item.donts ?? item.dont ?? item.right ?? item.cons),
      tone: "danger",
      Icon: Ban,
      from: 10,
    },
  ];

  return (
    <div className="gu-bento__dd">
      {cols.map((col) => (
        <div key={col.tone} className="gu-bento__dd-col" data-tone={col.tone}>
          <div className="gu-bento__dd-head">
            <span className="gu-bento__dd-badge">
              <col.Icon size={12} strokeWidth={2.6} />
            </span>
            <span>{col.head}</span>
            <span className="gu-bento__dd-count">{col.items.length}</span>
          </div>
          <ul className="gu-bento__dd-list">
            {col.items.map((txt, i) => (
              <motion.li
                key={`${col.tone}-${i}`}
                className="gu-bento__dd-item"
                {...bentoIn(reduce, i, { x: col.from })}
              >
                <col.Icon size={13} strokeWidth={2.4} className="gu-bento__dd-icon" />
                <span>
                  <MistlineInline text={txt} sources={sources} />
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function BentoDiff({
  item,
  copied,
  onCopy,
  reduce,
}: {
  item: BentoRow;
  copied: boolean;
  onCopy: (text: string) => void;
  reduce: boolean | null;
}) {
  const split = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => String(x)) : str(v) ? str(v).split("\n") : [];
  const before = split(item.before);
  const after = split(item.after);
  const patch = str(item.patch) || str(item.code);
  // before/after props win; otherwise read the signs off a unified patch.
  const lines =
    before.length + after.length > 0
      ? [
          ...before.slice(0, 6).map((text) => ({ sign: "−", text })),
          ...after.slice(0, 6).map((text) => ({ sign: "+", text })),
        ]
      : patch
          .split("\n")
          .filter((l) => l.trim() && !/^(?:---|\+\+\+|@@)/.test(l))
          .slice(0, 10)
          .map((l) =>
            l.startsWith("+")
              ? { sign: "+", text: l.slice(1).trimStart() }
              : l.startsWith("-")
                ? { sign: "−", text: l.slice(1).trimStart() }
                : { sign: "", text: l.trimStart() },
          );
  const count = (sign: string) => lines.filter((l) => l.sign === sign).length;
  const copyValue = (after.length > 0 ? after : before).join("\n") || patch;

  return (
    <div className="gu-bento__well gu-bento__diff">
      <div className="gu-bento__diff-bar">
        <span>unified patch</span>
        <span className="gu-bento__diff-stat">
          <b data-tone="danger">−{count("−")}</b>
          <b data-tone="success">+{count("+")}</b>
        </span>
        <BentoCopyButton copied={copied} onCopy={() => onCopy(copyValue)} label="Salin" />
      </div>
      <div className="gu-bento__diff-lines">
        {lines.map((l, i) => (
          <motion.div
            key={`diff-${i}`}
            className="gu-bento__diff-line"
            data-tone={l.sign === "+" ? "success" : l.sign === "−" ? "danger" : undefined}
            {...bentoIn(reduce, i, { x: -6 })}
          >
            <span className="gu-bento__diff-sign">{l.sign}</span>
            <code>{l.text || " "}</code>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** One step per command line; a "# comment" line labels the command after it. */
function bentoCliSteps(item: BentoRow) {
  const listed = arr(item.steps ?? item.commands)
    .map((s) =>
      typeof s === "string"
        ? { cmd: s, label: "" }
        : {
            cmd: str(rec(s).command) || str(rec(s).cmd) || str(rec(s).code),
            label: str(rec(s).label) || str(rec(s).title),
          },
    )
    .filter((s) => s.cmd);
  if (listed.length > 0) return listed;

  const raw =
    str(item.command) ||
    str(item.code) ||
    str(item.cmd) ||
    str(item.script) ||
    str(item.shell);
  const steps: { cmd: string; label: string }[] = [];
  let label = "";
  for (const line of raw.split("\n").map((l) => l.trim())) {
    if (!line) continue;
    const prev = steps[steps.length - 1];
    if (prev?.cmd.endsWith("\\")) {
      prev.cmd = `${prev.cmd.slice(0, -1).trimEnd()} ${line}`;
    } else if (line.startsWith("#")) {
      label = line.replace(/^#+\s*/, "");
    } else {
      steps.push({ cmd: line.replace(/^\$\s+/, ""), label });
      label = "";
    }
  }
  return steps;
}

function BentoCli({
  item,
  idPrefix,
  copiedKey,
  onCopy,
  reduce,
  sources,
}: {
  item: BentoRow;
  idPrefix: string;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  reduce: boolean | null;
  sources?: SourceItem[];
}) {
  const steps = bentoCliSteps(item).slice(0, 6);
  return (
    <div className="gu-bento__cli-wrap">
      {steps.length > 0 && (
        <div className="gu-bento__well gu-bento__cli">
          {steps.map((s, i) => {
            const key = `${idPrefix}-${i}`;
            return (
              <motion.div
                key={key}
                className="gu-bento__cli-step"
                {...bentoIn(reduce, i, { x: -6 })}
              >
                <span className="gu-bento__cli-num">{i + 1}</span>
                <div className="gu-bento__cli-body">
                  {s.label && <span className="gu-bento__cli-label">{s.label}</span>}
                  <code className="gu-bento__cli-code">
                    <span className="gu-bento__cli-prompt">$</span>
                    {s.cmd}
                  </code>
                </div>
                <BentoCopyButton
                  copied={copiedKey === key}
                  onCopy={() => onCopy(key, s.cmd)}
                />
              </motion.div>
            );
          })}
        </div>
      )}
      {str(item.summary) && (
        <motion.p className="gu-bento__summary" {...bentoIn(reduce, steps.length)}>
          <MistlineInline text={str(item.summary)} sources={sources} />
        </motion.p>
      )}
    </div>
  );
}

function BentoSwatches({
  swatches,
  idPrefix,
  copiedKey,
  onCopy,
  reduce,
}: {
  swatches: BentoRow[];
  idPrefix: string;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  reduce: boolean | null;
}) {
  return (
    <div className="gu-bento__swatches">
      {swatches.slice(0, 6).map((sw, si) => {
        const hex = (str(sw.hex) || "#D97757").trim().toUpperCase();
        const key = `${idPrefix}-${si}`;
        const copied = copiedKey === key;
        return (
          <motion.div
            key={key}
            className="gu-bento__swatch"
            {...bentoIn(reduce, si, { y: 8, scale: 0.94 })}
          >
            <motion.button
              type="button"
              className="gu-bento__swatch-chip"
              style={{ background: hex, color: textOnHex(hex) }}
              aria-label={`Salin ${hex}`}
              whileHover={reduce ? undefined : { y: -4 }}
              whileTap={reduce ? undefined : { y: -1, scale: 0.97 }}
              transition={MH.spring}
              onClick={() => onCopy(key, hex)}
            >
              <AnimatePresence initial={false}>
                {copied && <CheckGlyph key="check" size={16} strokeWidth={2.6} />}
              </AnimatePresence>
            </motion.button>
            <span className="gu-bento__swatch-name">{str(sw.name) || "Token"}</span>
            <span className="gu-bento__swatch-hex" data-tone={copied ? "success" : undefined}>
              {copied ? "Tersalin" : hex}
            </span>
            {str(sw.meta) && <span className="gu-bento__swatch-meta">{str(sw.meta)}</span>}
          </motion.div>
        );
      })}
    </div>
  );
}

function BentoNote({
  item,
  reduce,
  sources,
}: {
  item: BentoRow;
  reduce: boolean | null;
  sources?: SourceItem[];
}) {
  const paragraphs = (
    str(item.summary) ||
    str(item.body) ||
    str(item.description) ||
    str(item.text) ||
    str(item.content) ||
    str(item.note) ||
    str(item.subtitle)
  )
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="gu-bento__note">
      <motion.span
        className="gu-bento__note-rule"
        aria-hidden="true"
        style={{ originY: 0 }}
        initial={reduce ? false : { scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={reduce ? INSTANT : { duration: 0.5, ease: BENTO_EASE, delay: 0.05 }}
      />
      <div className="gu-bento__note-body">
        {paragraphs.map((p, i) => (
          <motion.p
            key={`note-${i}`}
            className="gu-bento__note-text"
            {...bentoIn(reduce, i, { x: 8 })}
          >
            <MistlineInline text={p} sources={sources} />
          </motion.p>
        ))}
      </div>
    </div>
  );
}

function BentoGrid({
  props,
  complete,
  live,
  sources,
  onAction,
}: MistlineGenProps) {
  const propTitle = props.title;
  const propSubtitle = props.subtitle ?? props.description;
  const propItems = props.items ?? props.cards ?? props.slots ?? props.widgets;

  let resolvedTitle = "";
  let resolvedSubtitle = "";
  let rawList: unknown[] = [];

  if (Array.isArray(propItems)) {
    rawList = propItems;
    resolvedTitle = str(propTitle);
    resolvedSubtitle = str(propSubtitle);
  } else if (Array.isArray(propTitle)) {
    rawList = propTitle;
    resolvedTitle =
      typeof propSubtitle === "string"
        ? propSubtitle
        : typeof propItems === "string"
          ? propItems
          : "";
  } else if (Array.isArray(props.slots)) {
    rawList = props.slots;
    resolvedTitle = str(propTitle);
    resolvedSubtitle = str(propSubtitle);
  } else if (typeof propTitle === "string") {
    resolvedTitle = propTitle;
    resolvedSubtitle = str(propSubtitle);
  }

  const rawItems = rawList
    .map(rec)
    .filter(
      (it) =>
        str(it.title) ||
        str(it.label) ||
        str(it.name) ||
        str(it.from) ||
        str(it.summary) ||
        str(it.body) ||
        str(it.description) ||
        str(it.text) ||
        str(it.command) ||
        str(it.code) ||
        str(it.statValue) ||
        arr(it.rows ?? it.items ?? it.stops ?? it.points ?? it.bullets).length > 0,
    );

  const bentoUid = useId();
  const reduce = useReducedMotion();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const usedBentoIcons = new Set<string>();
  const cardIcons = rawItems.map((it, i) =>
    inferContextualIcon(
      `${str(it.slot)} ${str(it.title) || str(it.label)} ${str(it.meta) || str(it.badge)} ${str(it.summary) || str(it.body) || str(it.description)}`,
      str(it.icon) || undefined,
      i,
      usedBentoIcons,
    ),
  );
  const TONE_CYCLE = ["accent", "info", "success", "warning"] as const;
  const cardTones = rawItems.map((it, i) => {
    const t = resolveBentoToneClass(str(it.tone)).replace("is-", "");
    return t !== "neutral" ? t : TONE_CYCLE[i % TONE_CYCLE.length];
  });

  if (rawItems.length === 0 && complete) return null;
  if (rawItems.length === 0) return null;

  const copyText = (key: string, val: string) => {
    if (!val) return;
    void navigator.clipboard?.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1300);
  };

  const safeIdx = Math.min(activeIdx, rawItems.length - 1);
  const item = rawItems[safeIdx];
  const cardIdx = safeIdx;
  const kind = inferBentoSlotKind(item);
  const cardTitle =
    str(item.title) || str(item.label) || `Slot ${cardIdx + 1}`;
  const meta = localizeBentoMeta(str(item.meta) || str(item.badge));
  const slotLabel = humanizeBentoSlotLabel(
    str(item.slot) || str(item.kind) || "",
    kind,
    meta,
  );
  const showDistinctMeta =
    Boolean(meta) && meta.toLowerCase() !== slotLabel.toLowerCase();
  const footer = str(item.footer) || str(item.note);
  const promptText =
    str(item.prompt) ||
    `Bahas lebih detail soal "${cardTitle}" beserta langkah praktisnya.`;
  const rows = arr(
    item.rows ?? item.items ?? item.stops ?? item.points ?? item.bullets,
  ).map((r) => (typeof r === "string" ? { label: r } : rec(r)));

  const isSpotlight = kind === "spotlight_stat" || kind === "fun_fact";
  // The stop rail turns its footer into fact wells, which frees the foot line.
  const routeFacts = kind === "route_stops" ? parseBentoFacts(footer) : [];
  const footText = routeFacts.length > 0 ? "" : footer;
  const FootIcon = kind === "schedule" ? MapPin : isSpotlight ? Lightbulb : null;

  return (
    <section className="gu gu-bento" data-count={rawItems.length}>
      {(resolvedTitle || resolvedSubtitle) && (
        <div className="gu-bento__head">
          <div className="gu-bento__head-main">
            {resolvedTitle && (
              <h3 className="gu-title">
                <MistlineInline text={resolvedTitle} sources={sources} />
              </h3>
            )}
            {resolvedSubtitle && (
              <p className="gu-bento__sub">
                <MistlineInline text={resolvedSubtitle} sources={sources} />
              </p>
            )}
          </div>
        </div>
      )}

      <div
        className={`gu-bento__chassis${rawItems.length === 1 ? " is-single" : ""}`}
        data-tone={cardTones[safeIdx]}
      >
        {rawItems.length > 1 && (
          <div className="gu-bento__nav" role="tablist" aria-label={resolvedTitle || "Daftar topik"}>
            {rawItems.map((navIt, ni) => {
              const isSelected = ni === safeIdx;
              const navTitle =
                str(navIt.title) || str(navIt.label) || str(navIt.name) || `Bagian ${ni + 1}`;
              const navMeta = localizeBentoMeta(
                str(navIt.meta) || str(navIt.badge) || str(navIt.statValue),
              );
              return (
                <motion.button
                  key={`bento-nav-${ni}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-tone={cardTones[ni]}
                  className={`gu-bento__nav-btn${isSelected ? " is-active" : ""}`}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  onClick={() => setActiveIdx(ni)}
                >
                  {isSelected && <ActivePlate layoutId={`${bentoUid}-plate`} />}
                  <div className="gu-bento__nav-top">
                    <span className="gu-bento__nav-num">
                      {String(ni + 1).padStart(2, "0")}
                    </span>
                    {navMeta ? (
                      <span className="gu-bento__nav-badge">{navMeta}</span>
                    ) : (
                      <span className="gu-bento__nav-icon">
                        <MistlineIcon name={cardIcons[ni]} size={12} strokeWidth={2} />
                      </span>
                    )}
                  </div>
                  <span className="gu-bento__nav-title">
                    <MistlineInline text={navTitle} sources={sources} />
                  </span>
                  {isSelected && (
                    <motion.span
                      layoutId={`bento-nav-bar-${bentoUid}`}
                      className="gu-bento__nav-bar"
                      transition={reduce ? INSTANT : MH.spring}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        <motion.div
          key={`bento-detail-${safeIdx}`}
          className="gu-bento__detail"
          role="tabpanel"
          data-slot-kind={kind}
          data-tone={cardTones[safeIdx]}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="gu-bento__detail-head">
            <div className="gu-bento__head-row">
              <span className="gu-bento__icon-chip">
                <MistlineIcon name={cardIcons[safeIdx]} size={14} strokeWidth={2} />
              </span>
              <span className="gu-bento__slot-badge">{slotLabel}</span>
              {showDistinctMeta && <span className="gu-bento__meta">{meta}</span>}
            </div>
            <h4 className="gu-bento__card-title">
              <MistlineInline text={cardTitle} sources={sources} />
            </h4>
          </div>

          <div className="gu-bento__body">
                {kind === "flight_route" && (
                  <div className="gu-bento__flight">
                    <div className="gu-bento__well gu-bento__flight-arc">
                      <div className="gu-bento__flight-end">
                        <div className="gu-bento__flight-code">
                          {str(item.from) || str(item.origin) || "ORG"}
                        </div>
                        {str(item.departTime) && (
                          <div className="gu-bento__flight-time">
                            {str(item.departTime)}
                          </div>
                        )}
                      </div>
                      <div className="gu-bento__flight-mid">
                        {str(item.duration) && (
                          <span className="gu-bento__flight-dur">
                            {str(item.duration)}
                          </span>
                        )}
                        <div className="gu-bento__flight-line">
                          <span className="gu-bento__flight-dot is-start" />
                          <span className="gu-bento__flight-dash" />
                          <motion.span
                            className="gu-bento__flight-plane"
                            animate={{ x: [-3, 3, -3] }}
                            transition={{
                              duration: 3.2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          >
                            ✈
                          </motion.span>
                          <span className="gu-bento__flight-dash" />
                          <span className="gu-bento__flight-dot is-end" />
                        </div>
                        {str(item.vehicle) && (
                          <span className="gu-bento__flight-veh">
                            {str(item.vehicle)}
                          </span>
                        )}
                      </div>
                      <div className="gu-bento__flight-end is-right">
                        <div className="gu-bento__flight-code">
                          {str(item.to) || str(item.destination) || "DST"}
                        </div>
                        {str(item.arriveTime) && (
                          <div className="gu-bento__flight-time">
                            {str(item.arriveTime)}
                          </div>
                        )}
                      </div>
                    </div>

                    {(str(item.gate) ||
                      str(item.seat) ||
                      str(item.baggage)) && (
                      <div className="gu-bento__flight-meta">
                        {str(item.gate) && (
                          <div className="gu-bento__well gu-bento__mini-stat">
                            <span>Term / Gate</span>
                            <strong>{str(item.gate)}</strong>
                          </div>
                        )}
                        {str(item.seat) && (
                          <div className="gu-bento__well gu-bento__mini-stat">
                            <span>Kursi</span>
                            <strong>{str(item.seat)}</strong>
                          </div>
                        )}
                        {str(item.baggage) && (
                          <div className="gu-bento__well gu-bento__mini-stat">
                            <span>Bagasi</span>
                            <strong className="is-success-txt">
                              {str(item.baggage)}
                            </strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {kind === "micro_diff" && (
                  <BentoDiff
                    item={item}
                    copied={copiedKey === `diff-${cardIdx}`}
                    onCopy={(text) => copyText(`diff-${cardIdx}`, text)}
                    reduce={reduce}
                  />
                )}

                {kind === "cli_runbook" && (
                  <BentoCli
                    item={item}
                    idPrefix={`cli-${cardIdx}`}
                    copiedKey={copiedKey}
                    onCopy={copyText}
                    reduce={reduce}
                    sources={sources}
                  />
                )}

                {kind === "color_swatches" && (
                  <BentoSwatches
                    swatches={arr(item.swatches).map(rec)}
                    idPrefix={`sw-${cardIdx}`}
                    copiedKey={copiedKey}
                    onCopy={copyText}
                    reduce={reduce}
                  />
                )}

                {kind === "etiquette_split" && (
                  <BentoSplit item={item} reduce={reduce} sources={sources} />
                )}

                {isSpotlight && (
                  <BentoHero item={item} reduce={reduce} sources={sources} />
                )}

                {kind === "text_note" && (
                  <BentoNote item={item} reduce={reduce} sources={sources} />
                )}

                {kind === "weather_strip" && (
                  <BentoWeather rows={rows} reduce={reduce} />
                )}

                {(kind === "route_stops" ||
                  kind === "schedule" ||
                  kind === "rows_interactive") &&
                  str(item.summary) && (
                    <p className="gu-bento__summary">
                      <MistlineInline text={str(item.summary)} sources={sources} />
                    </p>
                  )}

                {kind === "route_stops" && (
                  <BentoRouteStops
                    rows={rows}
                    facts={routeFacts}
                    reduce={reduce}
                    sources={sources}
                  />
                )}

                {kind === "schedule" && (
                  <BentoSchedule rows={rows} reduce={reduce} sources={sources} />
                )}

                {kind === "rows_interactive" && (
                  <BentoLedger
                    rows={rows}
                    idPrefix={String(cardIdx)}
                    checked={checkedMap}
                    onToggle={(key, next) =>
                      setCheckedMap((prev) => ({ ...prev, [key]: next }))
                    }
                    reduce={reduce}
                    sources={sources}
                  />
                )}
              </div>

              {/* Detail Footer / Interactive Drill-Down */}
              {(footText || (live && onAction)) && (
                <div className="gu-bento__foot">
                  <span
                    className={`gu-bento__foot-note${footText && FootIcon ? " has-icon" : ""}${footText && isSpotlight ? " is-fact" : ""}`}
                    title={footText || undefined}
                  >
                    {footText ? (
                      <>
                        {FootIcon && (
                          <FootIcon
                            size={13}
                            strokeWidth={2}
                            className="gu-bento__foot-ico"
                          />
                        )}
                        <span className="gu-bento__foot-text">
                          {isSpotlight && (
                            <b className="gu-bento__foot-kicker">Tahukah kamu</b>
                          )}
                          <MistlineInline text={footText} sources={sources} />
                        </span>
                      </>
                    ) : rawItems.length > 1 ? (
                      `${safeIdx + 1} / ${rawItems.length} bagian`
                    ) : null}
                  </span>
                  {live && onAction && (
                    <motion.button
                      type="button"
                      className="gu-bento__drill-btn"
                      aria-label={`Bedah ${cardTitle}`}
                      whileHover={MH.chip}
                      whileTap={MH.tap}
                      transition={MH.spring}
                      onClick={() =>
                        onAction({
                          type: "send",
                          text: promptText,
                        })
                      }
                    >
                      <span>Detail</span>
                      <ArrowRight size={13} strokeWidth={2.2} />
                    </motion.button>
                  )}
                </div>
              )}
        </motion.div>
      </div>
    </section>
  );
}

function CatalogShelf({
  props,
  complete,
  live,
  sources,
  onAction,
}: MistlineGenProps) {
  const propTitle = props.title;
  const propSubtitle = props.subtitle ?? props.description;
  const propItems = props.items ?? props.albums ?? props.releases ?? props.entries;

  let resolvedTitle = "";
  let resolvedSubtitle = "";
  let rawList: unknown[] = [];

  if (Array.isArray(propItems)) {
    rawList = propItems;
    resolvedTitle = str(propTitle);
    resolvedSubtitle = str(propSubtitle);
  } else if (Array.isArray(propTitle)) {
    rawList = propTitle;
    resolvedTitle = typeof propSubtitle === "string" ? propSubtitle : "";
  }

  const items = rawList
    .map(rec)
    .filter((it) => str(it.title) || str(it.name) || str(it.label));

  const [openMap, setOpenMap] = useState<Record<number, boolean>>({ 0: true });

  if (items.length === 0 && complete) return null;
  if (items.length === 0) return null;

  return (
    <section className="gu gu-catalog" data-count={items.length}>
      {(resolvedTitle || resolvedSubtitle) && (
        <div className="gu-catalog__head">
          <div className="gu-catalog__head-main">
            {resolvedTitle && (
              <h3 className="gu-title">
                <MistlineInline text={resolvedTitle} sources={sources} />
              </h3>
            )}
            {resolvedSubtitle && (
              <p className="gu-catalog__sub">
                <MistlineInline text={resolvedSubtitle} sources={sources} />
              </p>
            )}
          </div>
          <span className="gu-catalog__count">{items.length} rilisan</span>
        </div>
      )}

      <div className="gu-catalog__list">
        {items.map((item, idx) => {
          const itemTitle =
            str(item.title) || str(item.name) || str(item.label);
          const itemSub = str(item.subtitle);
          const year = str(item.year) || str(item.date);
          const kind = str(item.kind) || str(item.badge) || str(item.type);
          const summary = str(item.summary) || str(item.description);
          const image =
            str(item.image) ||
            str(item.src) ||
            str(item.imageUrl) ||
            str(item.image_url) ||
            str(item.cover) ||
            str(item.coverUrl) ||
            str(item.cover_url) ||
            str(item.artwork) ||
            str(item.artworkUrl) ||
            str(item.art) ||
            str(item.img) ||
            str(item.picture) ||
            str(item.thumbnail) ||
            str(item.thumbnailUrl);
          const imageQuery = str(item.imageQuery);
          const resolvedCoverQuery =
            imageQuery ||
            (itemTitle
              ? `${itemTitle} ${resolvedTitle ? resolvedTitle.split(/\s+/).slice(0, 3).join(" ") : ""} ${kind || "album"} cover`.trim()
              : "");
          const tracks = arr(
            item.tracks ?? item.entries ?? item.children ?? item.songs,
          ).map((t) => (typeof t === "string" ? { title: t } : rec(t)));
          const hasTracks = tracks.length > 0;
          const isOpen = Boolean(openMap[idx]);
          const promptText =
            str(item.prompt) ||
            `Bahas lebih dalam soal "${itemTitle}"${year ? ` (${year})` : ""} beserta lagu dan konteksnya.`;

          return (
            <article
              key={`cat-${idx}-${itemTitle}`}
              className={`gu-catalog__item${isOpen ? " is-open" : ""}`}
            >
              <div
                className={`gu-catalog__row${hasTracks ? " is-toggleable" : ""}`}
                onClick={
                  hasTracks
                    ? () =>
                        setOpenMap((prev) => ({ ...prev, [idx]: !prev[idx] }))
                    : undefined
                }
              >
                <div className="gu-catalog__vinyl-stage">
                  <div className="gu-catalog__cover">
                    <MistlinePhoto
                      src={image || undefined}
                      query={resolvedCoverQuery || undefined}
                      autoResolve={Boolean(resolvedCoverQuery)}
                      seed={itemTitle}
                      icon="disc"
                      ratio="1/1"
                    />
                  </div>
                </div>

                <div className="gu-catalog__meta">
                  <div className="gu-catalog__kicker-row">
                    {(kind || year) && (
                      <span className="gu-catalog__kicker">
                        {[year, kind].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {hasTracks && (
                      <span className="gu-catalog__track-count">
                        {tracks.length} tracks
                      </span>
                    )}
                  </div>
                  <h4 className="gu-catalog__title">{itemTitle}</h4>
                  {itemSub && <p className="gu-catalog__item-sub">{itemSub}</p>}
                  {summary && (
                    <p className="gu-catalog__summary">
                      <MistlineInline text={summary} sources={sources} />
                    </p>
                  )}
                </div>

                <div className="gu-catalog__actions">
                  {live && onAction && (
                    <motion.button
                      type="button"
                      className="gu-catalog__drill-btn"
                      whileHover={MH.chip}
                      whileTap={MH.tap}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction({ type: "send", text: promptText });
                      }}
                    >
                      Bedah <ArrowUpRight size={12} strokeWidth={2.2} />
                    </motion.button>
                  )}
                  {hasTracks && (
                    <motion.button
                      type="button"
                      className="gu-catalog__toggle-btn"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Tutup daftar" : "Buka daftar"}
                      whileTap={MH.tap}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
                      }}
                    >
                      <motion.span
                        className="gu-catalog__chev-wrap"
                        animate={{ rotate: isOpen ? 90 : 0 }}
                        transition={MH.spring}
                      >
                        <ChevronRight size={14} />
                      </motion.span>
                    </motion.button>
                  )}
                </div>
              </div>

              {hasTracks && isOpen && (
                <div className="gu-catalog__tracks">
                  {tracks.map((tr, ti) => {
                    const trTitle =
                      str(tr.title) || str(tr.name) || str(tr.label);
                    const trDuration = str(tr.duration) || str(tr.meta);
                    const trNote = str(tr.note);
                    const isHl = Boolean(tr.highlight);
                    return (
                      <div
                        key={`tr-${idx}-${ti}`}
                        className={`gu-catalog__track${isHl ? " is-highlight" : ""}`}
                      >
                        <span className="gu-catalog__track-num">
                          {String(ti + 1).padStart(2, "0")}
                        </span>
                        <div className="gu-catalog__track-main">
                          <span className="gu-catalog__track-title">
                            <MistlineInline text={trTitle} sources={sources} />
                          </span>
                          {trNote && (
                            <span className="gu-catalog__track-note">
                              <MistlineInline text={trNote} sources={sources} />
                            </span>
                          )}
                        </div>
                        {trDuration && (
                          <span className="gu-catalog__track-dur">
                            {trDuration}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AnnotatedSheet({
  props,
  complete,
  sources,
}: MistlineGenProps) {
  const propTitle = props.title;
  const propSubtitle = props.subtitle ?? props.description;
  const propMeta = props.meta;
  const propSections = props.sections ?? props.verses ?? props.lyrics ?? props.items;

  let resolvedTitle = "";
  let resolvedSubtitle = "";
  let rawList: unknown[] = [];

  if (Array.isArray(propSections)) {
    rawList = propSections;
    resolvedTitle = str(propTitle);
    resolvedSubtitle = str(propSubtitle);
  } else if (Array.isArray(propTitle)) {
    rawList = propTitle;
    resolvedTitle = typeof propSubtitle === "string" ? propSubtitle : "";
  }

  const sections = rawList
    .map(rec)
    .filter((s) => {
      const hasLines = Array.isArray(s.text)
        ? s.text.length > 0
        : Boolean(str(s.text) || str(s.lines));
      return hasLines || Boolean(str(s.note) || str(s.analysis));
    });

  const uid = useId();
  const reduce = useReducedMotion();
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAll, setShowAll] = useState(false);

  if (sections.length === 0 && complete) return null;
  if (sections.length === 0) return null;

  const safeIdx = Math.min(activeIdx, sections.length - 1);
  const metaStr = str(propMeta);
  const padNum = (n: number) => String(n + 1).padStart(2, "0");

  const renderLines = (sec: Record<string, unknown>) => {
    const raw = sec.text ?? sec.lines;
    const lines = Array.isArray(raw)
      ? raw.map((x) => String(x))
      : str(raw).split("\n");
    return lines.filter((l) => l.trim().length > 0);
  };

  const renderPairedContent = (sec: Record<string, unknown>, idx: number, isFolioStage: boolean) => {
    const label = str(sec.label) || str(sec.heading) || `Bagian ${idx + 1}`;
    const tag = str(sec.tag);
    const note = str(sec.note) || str(sec.analysis);
    const lines = renderLines(sec);
    const hasBoth = lines.length > 0 && Boolean(note);

    return (
      <div
        className={`gu-annotated__pair-grid${hasBoth ? " is-paired" : " is-solo"}${isFolioStage ? " is-stage" : ""}`}
      >
        {lines.length > 0 && (
          <div className="gu-annotated__quote-col">
            <Quote
              className="gu-annotated__quote-mark"
              size={20}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div className="gu-annotated__verse-head">
              <span className="gu-annotated__num">{padNum(idx)}</span>
              <span className="gu-annotated__label">{label}</span>
              {tag && <span className="gu-annotated__tag">{tag}</span>}
            </div>
            <blockquote className="gu-annotated__lines">
              {lines.map((ln, li) => (
                <p key={`ln-${idx}-${li}`}>
                  <MistlineInline text={ln} sources={sources} />
                </p>
              ))}
            </blockquote>
          </div>
        )}
        {note && (
          <div className="gu-annotated__note-well">
            <span className="gu-annotated__note-kicker">
              {lines.length > 0 ? "Bedah bait —" : `${padNum(idx)} · ${label}`}
            </span>
            <p className="gu-annotated__note-body">
              <MistlineInline text={note} sources={sources} />
            </p>
          </div>
        )}
      </div>
    );
  };

  const activeSec = sections[safeIdx];

  return (
    <section className="gu gu-annotated">
      <div className="gu-annotated__head">
        <div className="gu-annotated__head-main">
          {(resolvedTitle || metaStr) && (
            <div className="gu-annotated__title-row">
              {resolvedTitle && (
                <h3 className="gu-title">
                  <MistlineInline text={resolvedTitle} sources={sources} />
                </h3>
              )}
              {metaStr && <span className="gu-annotated__meta">{metaStr}</span>}
            </div>
          )}
          {resolvedSubtitle && (
            <p className="gu-annotated__sub">
              <MistlineInline text={resolvedSubtitle} sources={sources} />
            </p>
          )}
        </div>
        {sections.length > 1 && (
          <motion.button
            type="button"
            className="gu-annotated__mode-btn"
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Mode Booklet" : "Lihat Semua"}
          </motion.button>
        )}
      </div>

      <div className="gu-annotated__folio">
        {!showAll && sections.length > 1 && (
          <div className="gu-annotated__dock-wrap">
            <div className="gu-annotated__dock" role="tablist" aria-label="Pilih bait">
              {sections.map((sec, i) => {
                const label = str(sec.label) || str(sec.heading) || `Bagian ${i + 1}`;
                const isSelected = i === safeIdx;
                return (
                  <button
                    key={`tab-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`gu-annotated__tab${isSelected ? " is-active" : ""}`}
                    onClick={() => setActiveIdx(i)}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId={`ann-pill-${uid}`}
                        className="gu-annotated__tab-bg"
                        transition={reduce ? INSTANT : { type: "spring", stiffness: 460, damping: 34 }}
                      />
                    )}
                    <span className="gu-annotated__tab-num">{padNum(i)}</span>
                    <span className="gu-annotated__tab-lbl">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showAll || sections.length === 1 ? (
          <div className="gu-annotated__paired-list">
            {sections.map((sec, i) => (
              <div key={`ann-row-${i}`} className="gu-annotated__paired-row">
                {renderPairedContent(sec, i, false)}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="gu-annotated__stage-wrap" role="tabpanel">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`folio-${safeIdx}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  {renderPairedContent(activeSec, safeIdx, true)}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="gu-annotated__foot">
              <button
                type="button"
                className="gu-annotated__nav-btn"
                disabled={safeIdx === 0}
                onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft size={13} />
                <span>Sebelumnya</span>
              </button>
              <span className="gu-annotated__pager">
                {padNum(safeIdx)} / {padNum(sections.length - 1)}
              </span>
              <button
                type="button"
                className="gu-annotated__nav-btn"
                disabled={safeIdx >= sections.length - 1}
                onClick={() => setActiveIdx((i) => Math.min(sections.length - 1, i + 1))}
              >
                <span>Berikutnya</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function RegionalShowcase({
  props,
  complete,
  sources,
}: MistlineGenProps) {
  const propTitle = props.title;
  const propRegions = props.regions ?? props.items;
  const propLore = props.lore ?? props.summary ?? props.description;
  const propKicker = props.kicker;
  const propSubtitle = props.subtitle;

  let resolvedTitle = "";
  let rawList: unknown[] = [];

  if (Array.isArray(propRegions)) {
    rawList = propRegions;
    resolvedTitle = str(propTitle);
  } else if (Array.isArray(propTitle)) {
    rawList = propTitle;
    resolvedTitle = typeof propSubtitle === "string" ? propSubtitle : "";
  }

  const regions = rawList
    .map(rec)
    .filter((r) => str(r.name) || str(r.title) || str(r.summary));

  const [activeIdx, setActiveIdx] = useState(0);
  const regionTabId = useId();

  if (regions.length === 0 && complete) return null;
  if (regions.length === 0) return null;

  const safeIdx = Math.min(activeIdx, regions.length - 1);
  const activeReg = regions[safeIdx];
  const loreText = str(propLore);
  const kickerText = str(propKicker) || "Worldbuilding & Variasi Regional";
  const regTitle = str(activeReg.title) || str(activeReg.name);
  const regBadge = str(activeReg.badge);
  const regSummary = str(activeReg.summary) || str(activeReg.body);
  const symLabel = str(activeReg.symbolLabel) || "Simbol / Elemen Lokal";
  const symValue = str(activeReg.symbolValue);
  const focLabel = str(activeReg.focusLabel) || "Fokus Pertunjukan";
  const focValue = str(activeReg.focusValue);

  return (
    <section className="gu gu-regional">
      <div className="gu-regional__chassis">
        <div className="gu-regional__top">
          <span className="gu-regional__kicker">
            <MistlineIcon name="globe" size={12} strokeWidth={2} />
            {kickerText}
          </span>
          {resolvedTitle && (
            <h3 className="gu-title">
              <MistlineInline text={resolvedTitle} sources={sources} />
            </h3>
          )}
          {str(propSubtitle) && (
            <p className="gu-regional__sub">
              <MistlineInline text={str(propSubtitle)} sources={sources} />
            </p>
          )}
          {loreText && (
            <p className="gu-regional__lore">
              <MistlineInline text={loreText} sources={sources} />
            </p>
          )}
        </div>

        <div className="gu-regional__split">
          <div className="gu-regional__tabs" role="tablist" aria-label={resolvedTitle || "Pilih region"}>
            {regions.map((reg, idx) => {
              const isSelected = idx === safeIdx;
              const tabName = str(reg.name) || str(reg.title) || `Region ${idx + 1}`;
              return (
                <button
                  key={`reg-tab-${idx}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`gu-regional__tab${isSelected ? " is-active" : ""}`}
                  onClick={() => setActiveIdx(idx)}
                  title={tabName}
                >
                  {isSelected && <ActivePlate layoutId={regionTabId} />}
                  <span className="gu-regional__tab-num">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="gu-regional__tab-label">{tabName}</span>
                </button>
              );
            })}
          </div>

          <motion.div
            key={`reg-panel-${safeIdx}`}
            className="gu-regional__well"
            role="tabpanel"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="gu-regional__well-head">
              <h4 className="gu-regional__well-title">
                <MistlineInline text={regTitle} sources={sources} />
              </h4>
              {regBadge && <span className="gu-regional__badge">{regBadge}</span>}
            </div>
            {regSummary && (
              <p className="gu-regional__well-body">
                <MistlineInline text={regSummary} sources={sources} />
              </p>
            )}
            {(symValue || focValue) && (
              <div className="gu-regional__specs">
                {symValue && (
                  <div className="gu-regional__spec">
                    <span>{symLabel}</span>
                    <strong>
                      <MistlineInline text={symValue} sources={sources} />
                    </strong>
                  </div>
                )}
                {focValue && (
                  <div className="gu-regional__spec">
                    <span>{focLabel}</span>
                    <strong>
                      <MistlineInline text={focValue} sources={sources} />
                    </strong>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export const MISTLINE_REGISTRY: Record<
  string,
  ComponentType<MistlineGenProps>
> = {
  Headline,
  VisualDossier,
  RegionalShowcase,
  CatalogShelf,
  AnnotatedSheet,
  BentoGrid,
  Cards: CardsComp,
  Plan,
  Steps,
  Versus,
  Stats,
  Chart,
  Palette,
  Code,
  CodeDiffPatch,
  Callout,
  Flow,
  Diagram: DiagramComp,
  Map: MapComp,
  TransitRouteCard,
  RecipeScalerCard,
  MoodboardMosaic,
  ConceptFlashcards,
  Adjuster,
  Choices,
  Quiz,
  Checklist,
  Table,
  Followups,
  AsyncImage,
  Image: ImageComp,
  ImageWithCaption,
  ImageWithCitation,
  ImageGallery: ImageGalleryComp,
  ImageGrid: ImageGridComp,
  ImageCarousel: ImageCarouselComp,
  ImageComparison: ImageComparisonComp,
  ImageLightbox: ImageLightboxComp,
};

function flattenTreeToGraph(
  rootRaw: unknown,
  defaultType: string,
): {
  nodes: Array<{ id: string; label: string; type: string; detail?: string }>;
  edges: Array<{ id: string; source: string; target: string; label?: string }>;
} {
  const nodes: Array<{
    id: string;
    label: string;
    type: string;
    detail?: string;
  }> = [];
  const edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
  }> = [];
  let seq = 0;

  const visit = (
    nodeVal: unknown,
    parentId: string | null,
    edgeLabel?: string,
  ) => {
    if (!nodeVal || typeof nodeVal !== "object" || Array.isArray(nodeVal)) {
      if (typeof nodeVal === "string" && nodeVal.trim()) {
        const id = `n-${seq++}`;
        nodes.push({ id, label: nodeVal.trim(), type: defaultType });
        if (parentId)
          edges.push({
            id: `e-${edges.length}`,
            source: parentId,
            target: id,
            label: edgeLabel,
          });
      }
      return;
    }
    const r = rec(nodeVal);
    const label =
      str(r.label) ||
      str(r.title) ||
      str(r.question) ||
      str(r.name) ||
      str(r.text) ||
      str(r.id);
    if (!label) return;
    const id = str(r.id) || `n-${seq++}`;
    nodes.push({
      id,
      label,
      type: str(r.type) || defaultType,
      detail: str(r.detail) || str(r.description) || str(r.note) || undefined,
    });
    if (parentId) {
      edges.push({
        id: `e-${edges.length}`,
        source: parentId,
        target: id,
        label: edgeLabel || str(r.edgeLabel) || undefined,
      });
    }
    const children = arr(r.children ?? r.branches ?? r.options);
    for (const ch of children) {
      const cr = rec(ch);
      visit(ch, id, str(cr.condition) || str(cr.edge) || str(cr.branch));
    }
    if (r.yes !== undefined) visit(r.yes, id, "Ya");
    if (r.no !== undefined) visit(r.no, id, "Tidak");
  };

  visit(rootRaw, null);
  return { nodes, edges };
}

function adaptIntelDataForRegistry(
  snakeId: string,
  props: Record<string, unknown>,
): { targetId: string; data: Record<string, unknown> } {
  const rawData =
    props.data && typeof props.data === "object" && !Array.isArray(props.data)
      ? { ...props, ...(props.data as Record<string, unknown>) }
      : { ...props };

  // KpiCard is the schema name for the single-KPI panel with its trend chart.
  if (snakeId === "kpi_card") {
    return {
      targetId: "metric",
      data: { ...rawData, label: str(rawData.label) || str(rawData.title) || "KPI" },
    };
  }

  if (
    snakeId === "mind_map" ||
    (snakeId === "decision_tree" &&
      !Array.isArray(rawData.nodes) &&
      rawData.root)
  ) {
    const graph = flattenTreeToGraph(
      rawData.root,
      snakeId === "mind_map" ? "concept" : "question",
    );
    return {
      targetId: snakeId === "mind_map" ? "knowledge_graph" : "decision_tree",
      data: {
        ...rawData,
        nodes: graph.nodes,
        edges: graph.edges,
      },
    };
  }

  if (snakeId === "architecture_diagram") {
    const nodes = arr(rawData.nodes).map((n, i) => {
      const nr = rec(n);
      const label =
        str(nr.label) ||
        str(nr.name) ||
        str(nr.title) ||
        str(nr.id) ||
        `Node ${i + 1}`;
      return {
        ...nr,
        id: str(nr.id) || label,
        label,
        type: str(nr.type) || "service",
      };
    });
    const edges = arr(rawData.edges).map((e, i) => {
      const er = rec(e);
      return {
        ...er,
        id: str(er.id) || `e-${i}`,
        source: str(er.source) || str(er.from),
        target: str(er.target) || str(er.to),
      };
    });
    return { targetId: snakeId, data: { ...rawData, nodes, edges } };
  }

  if (snakeId === "data_table") {
    const rawCols = arr(rawData.columns);
    const cols = rawCols.map((c, idx) => {
      if (typeof c === "string" || typeof c === "number") {
        const label = String(c);
        return { key: label, label };
      }
      const cr = rec(c);
      const key =
        str(cr.key) ||
        str(cr.label) ||
        str(cr.title) ||
        str(cr.name) ||
        `col_${idx}`;
      const label = str(cr.label) || str(cr.title) || str(cr.name) || key;
      return { ...cr, key, label };
    });
    const rows = arr(rawData.rows).map((r) => {
      if (Array.isArray(r)) {
        const obj: Record<string, unknown> = {};
        cols.forEach((col, ci) => {
          obj[col.key] = r[ci] ?? "";
        });
        return obj;
      }
      const ro = rec(r);
      const normalized: Record<string, unknown> = { ...ro };
      for (const col of cols) {
        if (
          normalized[col.key] === undefined &&
          normalized[col.label] !== undefined
        ) {
          normalized[col.key] = normalized[col.label];
        }
      }
      return normalized;
    });
    return { targetId: snakeId, data: { ...rawData, columns: cols, rows } };
  }

  if (
    snakeId === "pie_chart" &&
    !Array.isArray(rawData.slices) &&
    Array.isArray(rawData.data)
  ) {
    const slices = arr(rawData.data).map((d) => {
      const dr = rec(d);
      return {
        label:
          str(dr.label) ||
          str(dr.name) ||
          str(dr.category) ||
          str(dr.item) ||
          "Item",
        value: Number(dr.value ?? dr.count ?? dr.amount ?? dr.share ?? 0) || 0,
      };
    });
    return { targetId: snakeId, data: { ...rawData, slices } };
  }

  if (
    snakeId === "radar_chart" &&
    !Array.isArray(rawData.dimensions) &&
    Array.isArray(rawData.data)
  ) {
    const dimensions = arr(rawData.data).map((d) => {
      const dr = rec(d);
      return {
        ...dr,
        axis:
          str(dr.axis) ||
          str(dr.label) ||
          str(dr.dimension) ||
          str(dr.name) ||
          "Axis",
      };
    });
    const rawSeries = arr(rawData.series);
    let seriesKeys = rawSeries
      .map((s) =>
        typeof s === "string"
          ? s
          : str(rec(s).key) || str(rec(s).name) || str(rec(s).label),
      )
      .filter(Boolean);
    if (seriesKeys.length === 0 && dimensions[0]) {
      seriesKeys = Object.entries(dimensions[0])
        .filter(
          ([k, v]) =>
            k !== "axis" &&
            k !== "label" &&
            k !== "dimension" &&
            typeof v === "number",
        )
        .map(([k]) => k);
    }
    return {
      targetId: snakeId,
      data: { ...rawData, dimensions, series: seriesKeys },
    };
  }

  if (
    (snakeId === "line_chart" ||
      snakeId === "bar_chart" ||
      snakeId === "area_chart") &&
    Array.isArray(rawData.data) &&
    (!Array.isArray(rawData.series) ||
      !Array.isArray(rec(arr(rawData.series)[0]).data))
  ) {
    const rows = arr(rawData.data).map(rec);
    const xKey =
      str(rawData.xKey) ||
      (rows[0]
        ? Object.keys(rows[0]).find((k) => typeof rows[0][k] === "string") ||
          "label"
        : "label");
    const explicitSeries = arr(rawData.series)
      .map((s) => {
        if (typeof s === "string") return { key: s, name: s };
        const sr = rec(s);
        const key =
          str(sr.key) ||
          str(sr.dataKey) ||
          str(sr.field) ||
          str(sr.name) ||
          str(sr.label);
        const name = str(sr.name) || str(sr.label) || key;
        return { key, name };
      })
      .filter((s) => s.key);
    const seriesMeta =
      explicitSeries.length > 0
        ? explicitSeries
        : rows[0]
          ? Object.entries(rows[0])
              .filter(([k, v]) => k !== xKey && typeof v === "number")
              .map(([k]) => ({ key: k, name: k }))
          : [];
    const series = seriesMeta.map((sm) => ({
      name: sm.name,
      data: rows.map((row, rIdx) => ({
        label:
          str(row[xKey]) ||
          str(row.label) ||
          str(row.name) ||
          str(row.x) ||
          `#${rIdx + 1}`,
        value: Number(row[sm.key] ?? row.value ?? 0) || 0,
      })),
    }));
    return {
      targetId: snakeId,
      data: {
        ...rawData,
        series,
        caption: str(rawData.caption) || str(rawData.title) || undefined,
      },
    };
  }

  if (snakeId === "fact_check_panel") {
    const checks = arr(rawData.checks ?? rawData.items)
      .map((c) => {
        if (typeof c === "string") {
          return { claim: c.trim(), verdict: "unverified", explanation: "" };
        }
        const cr = rec(c);
        const rawV = (
          str(cr.verdict) ||
          str(cr.status) ||
          "unverified"
        ).toLowerCase();
        const verdict = /true|verify|verified|confirmed|benar|fakta|sah/.test(
          rawV,
        )
          ? "verified"
          : /false|myth|hoax|salah|mitos|keliru/.test(rawV)
            ? "false"
            : /disput|mixed|partial|sebagian|debat/.test(rawV)
              ? "disputed"
              : "unverified";
        return {
          claim:
            str(cr.claim) ||
            str(cr.title) ||
            str(cr.statement) ||
            str(cr.fact) ||
            str(cr.text),
          verdict,
          explanation:
            str(cr.explanation) ||
            str(cr.detail) ||
            str(cr.evidence) ||
            str(cr.summary) ||
            str(cr.reason) ||
            str(cr.note),
        };
      })
      .filter((c) => Boolean(c.claim || c.explanation));
    return { targetId: snakeId, data: { ...rawData, checks } };
  }

  if (snakeId === "executive_summary") {
    const takeaways = arr(
      rawData.takeaways ?? rawData.points ?? rawData.highlights,
    )
      .map((t) =>
        typeof t === "string"
          ? t
          : str(rec(t).text) || str(rec(t).summary) || str(rec(t).title),
      )
      .filter(Boolean);
    return { targetId: snakeId, data: { ...rawData, takeaways } };
  }

  if (snakeId === "situational_overview") {
    const advisories = arr(
      rawData.advisories ?? rawData.warnings ?? rawData.notes,
    )
      .map((a) =>
        typeof a === "string" ? a : str(rec(a).text) || str(rec(a).title),
      )
      .filter(Boolean);
    return { targetId: snakeId, data: { ...rawData, advisories } };
  }

  if (snakeId === "key_findings") {
    const findings = arr(rawData.findings ?? rawData.items)
      .map((f) => {
        if (typeof f === "string") {
          return { title: f.trim(), description: "", confidence: "medium" };
        }
        const fr = rec(f);
        const confRaw = str(fr.confidence).toLowerCase();
        const confidence =
          confRaw === "high" || confRaw === "low" ? confRaw : "medium";
        return {
          ...fr,
          title:
            str(fr.title) ||
            str(fr.label) ||
            str(fr.name) ||
            str(fr.finding) ||
            str(fr.claim) ||
            str(fr.text),
          description:
            str(fr.description) ||
            str(fr.detail) ||
            str(fr.summary) ||
            str(fr.evidence) ||
            str(fr.explanation) ||
            str(fr.impact) ||
            str(fr.note),
          confidence,
        };
      })
      .filter((f) => Boolean(f.title || f.description));
    return { targetId: snakeId, data: { ...rawData, findings } };
  }

  if (snakeId === "root_cause_analysis") {
    const contributingFactors = arr(
      rawData.contributingFactors ?? rawData.factors,
    )
      .map((f) => {
        if (typeof f === "string") {
          return {
            category: "Faktor",
            cause: f.trim(),
            weight: "Direct",
            evidence: undefined,
          };
        }
        const fr = rec(f);
        const category =
          str(fr.category) ||
          str(fr.area) ||
          str(fr.domain) ||
          str(fr.type) ||
          "Faktor";
        const cause =
          str(fr.cause) ||
          str(fr.factor) ||
          str(fr.title) ||
          str(fr.name) ||
          str(fr.label) ||
          str(fr.reason) ||
          str(fr.issue) ||
          str(fr.summary) ||
          str(fr.description) ||
          str(fr.text) ||
          str(fr.point) ||
          str(fr.detail);
        const rawEvidence =
          str(fr.evidence) ||
          str(fr.detail) ||
          str(fr.explanation) ||
          str(fr.note) ||
          str(fr.proof) ||
          str(fr.description);
        const evidence =
          rawEvidence && rawEvidence !== cause ? rawEvidence : undefined;
        const weight =
          str(fr.weight) ||
          str(fr.impact) ||
          str(fr.severity) ||
          str(fr.role) ||
          str(fr.priority) ||
          "Direct";
        return {
          ...fr,
          category,
          cause,
          weight,
          evidence,
        };
      })
      .filter((f) => Boolean(f.cause || f.evidence));
    return {
      targetId: snakeId,
      data: {
        ...rawData,
        rootCause:
          str(rawData.rootCause) ||
          str(rawData.cause) ||
          str(rawData.summary) ||
          str(rawData.diagnosis),
        contributingFactors,
      },
    };
  }

  if (snakeId === "tradeoff_matrix") {
    const toStringList = (v: unknown): string[] => {
      if (Array.isArray(v)) {
        return v
          .map((x) =>
            typeof x === "string"
              ? x.trim()
              : str(rec(x).text) ||
                str(rec(x).title) ||
                str(rec(x).label) ||
                str(rec(x).point) ||
                str(rec(x).description),
          )
          .filter(Boolean);
      }
      if (typeof v === "string" && v.trim()) {
        return v
          .split(/\n|;\s*|\s*•\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    };
    const options = arr(
      rawData.options ?? rawData.items ?? rawData.approaches ?? rawData.choices,
    )
      .map((o, idx) => {
        if (typeof o === "string") {
          return {
            name: o.trim(),
            tag: undefined,
            benefits: [] as string[],
            costs: [] as string[],
            summary: "",
          };
        }
        const or = rec(o);
        const name =
          str(or.name) ||
          str(or.label) ||
          str(or.title) ||
          str(or.option) ||
          str(or.approach) ||
          str(or.strategy) ||
          str(or.method) ||
          str(or.pendekatan) ||
          str(or.opsi) ||
          `Opsi ${idx + 1}`;
        const tag =
          str(or.tag) ||
          str(or.badge) ||
          str(or.verdict) ||
          str(or.role) ||
          undefined;
        const benefits = toStringList(
          or.benefits ??
            or.pros ??
            or.gains ??
            or.advantages ??
            or.strengths ??
            or.kelebihan ??
            or.manfaat ??
            or.keuntungan ??
            or.plus,
        );
        const costs = toStringList(
          or.costs ??
            or.cons ??
            or.sacrifices ??
            or.downsides ??
            or.tradeoffs ??
            or.drawbacks ??
            or.weaknesses ??
            or.risks ??
            or.kekurangan ??
            or.pengorbanan ??
            or.risiko ??
            or.minus,
        );
        const summary =
          str(or.summary) ||
          str(or.description) ||
          str(or.detail) ||
          str(or.explanation) ||
          str(or.text) ||
          str(or.note) ||
          str(or.penjelasan);
        return {
          name,
          tag,
          benefits,
          costs,
          summary,
        };
      })
      .filter(
        (op) =>
          Boolean(op.name) &&
          (op.benefits.length > 0 ||
            op.costs.length > 0 ||
            Boolean(op.summary)),
      );
    return { targetId: snakeId, data: { ...rawData, options } };
  }

  if (snakeId === "news_feed") {
    const articles = normalizeNewsArticles(
      rawData.articles ?? rawData.items ?? rawData.stories,
    );
    return { targetId: snakeId, data: { ...rawData, articles } };
  }

  if (snakeId === "risk_matrix") {
    const risks = arr(rawData.risks ?? rawData.items).map((r, idx) => {
      if (typeof r === "string") {
        return { code: `R${idx + 1}`, title: r, probability: 3, impact: 3 };
      }
      const rr = rec(r);
      const clamp5 = (v: unknown) =>
        Math.max(1, Math.min(5, Math.round(Number(v) || 3)));
      return {
        ...rr,
        code: str(rr.code) || `R${idx + 1}`,
        title:
          str(rr.title) ||
          str(rr.label) ||
          str(rr.name) ||
          str(rr.risk) ||
          str(rr.description),
        probability: clamp5(rr.probability ?? rr.likelihood),
        impact: clamp5(rr.impact ?? rr.severity),
      };
    });
    return { targetId: snakeId, data: { ...rawData, risks } };
  }

  if (snakeId === "cost_benefit_analysis") {
    const mapRows = (listRaw: unknown) =>
      arr(listRaw).map((x) => {
        const xr = rec(x);
        return {
          label: str(xr.label) || str(xr.name) || str(xr.item) || str(xr.title),
          amount:
            Number(xr.amount ?? xr.value ?? xr.cost ?? xr.estimate ?? 0) || 0,
        };
      });
    return {
      targetId: snakeId,
      data: {
        ...rawData,
        costs: mapRows(rawData.costs),
        benefits: mapRows(rawData.benefits),
      },
    };
  }

  if (snakeId === "quote_extraction") {
    const quotes = arr(rawData.quotes ?? rawData.items).map((q) => {
      if (typeof q === "string") {
        return { text: q };
      }
      const qr = rec(q);
      return {
        text:
          str(qr.text) ||
          str(qr.quote) ||
          str(qr.content) ||
          str(qr.excerpt) ||
          str(qr.statement),
        speaker:
          str(qr.speaker) || str(qr.author) || str(qr.source) || undefined,
        relevance:
          str(qr.relevance) || str(qr.note) || str(qr.context) || undefined,
      };
    });
    return { targetId: snakeId, data: { ...rawData, quotes } };
  }

  if (snakeId === "claim_evidence_map") {
    const nodes = arr(rawData.nodes).map((n, i) => {
      const nr = rec(n);
      const label =
        str(nr.label) || str(nr.title) || str(nr.text) || `Node ${i + 1}`;
      return {
        ...nr,
        id: str(nr.id) || `n-${i}`,
        label,
        type: str(nr.type) || "evidence",
      };
    });
    const edges = arr(rawData.edges).map((e, i) => {
      const er = rec(e);
      return {
        ...er,
        id: str(er.id) || `e-${i}`,
        source: str(er.source) || str(er.from),
        target: str(er.target) || str(er.to),
      };
    });
    return { targetId: snakeId, data: { ...rawData, nodes, edges } };
  }

  if (snakeId === "document_diff") {
    const hunks = Array.isArray(rawData.hunks)
      ? rawData.hunks
      : [
          {
            section: str(rawData.section) || str(rawData.file) || "Perubahan",
            before: str(rawData.before),
            after: str(rawData.after),
          },
        ];
    return { targetId: snakeId, data: { ...rawData, hunks } };
  }

  return { targetId: snakeId, data: rawData };
}

function resolveOpenUiCoreAdapter(
  name: string,
  props: Record<string, unknown>,
): { coreName: string; props: Record<string, unknown> } | null {
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (clean === "timeline") {
    return {
      coreName: "Steps",
      props: {
        ...props,
        style: "timeline",
        steps: props.events ?? props.steps ?? props.items ?? props.milestones,
      },
    };
  }

  if (clean === "evidencecard") {
    const parts = [
      str(props.evidence),
      str(props.source) ? `Sumber: ${str(props.source)}` : "",
    ].filter(Boolean);
    const conf = str(props.confidence).toLowerCase();
    return {
      coreName: "Callout",
      props: {
        title: str(props.claim) || str(props.title) || "Bukti & Temuan",
        text: parts.join("\n\n") || str(props.text),
        tone:
          conf === "low" ? "warning" : conf === "high" ? "success" : "insight",
      },
    };
  }

  if (clean === "comparisontable") {
    let entities: { key: string; label: string; data?: Record<string, unknown> }[] =
      arr(props.entities).map((e, idx) => {
        if (typeof e === "string" || typeof e === "number")
          return { key: String(e), label: String(e) };
        const er = rec(e);
        const label =
          str(er.label) || str(er.name) || str(er.title) || `Opsi ${idx + 1}`;
        return { key: str(er.key) || label, label, data: er };
      });

    const ROW_LABEL_HEADER_RE =
      /^(kriteria|parameter|aspek|dimensi|fitur|faktor|kategori|atribut|variabel|indikator|komponen|elemen|properti|spesifikasi|criterion|criteria|aspect|dimension|feature|factor|category|attribute|metric|property)$/i;
    let firstColHeader = "Kriteria";
    if (
      entities.length >= 2 &&
      ROW_LABEL_HEADER_RE.test(entities[0].label.trim())
    ) {
      firstColHeader = entities[0].label.trim();
      entities = entities.slice(1);
    }

    const normToken = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
    const lookupEntityValue = (
      cellRec: Record<string, unknown>,
      ent: { key: string; label: string },
      idx: number,
    ): string => {
      const direct = cellRec[ent.key] ?? cellRec[ent.label];
      if (direct !== undefined && direct !== null) return str(direct);
      const normKey = ent.key.trim().toLowerCase();
      const normLabel = ent.label.trim().toLowerCase();
      const slugKey = normToken(ent.key);
      const slugLabel = normToken(ent.label);
      const parenMatch = /\(([^)]+)\)/.exec(ent.label);
      const parenSlug = parenMatch ? normToken(parenMatch[1]) : "";
      for (const [k, v] of Object.entries(cellRec)) {
        const nk = k.trim().toLowerCase();
        const sk = normToken(k);
        if (
          nk === normKey ||
          nk === normLabel ||
          (sk &&
            (sk === slugKey ||
              sk === slugLabel ||
              (parenSlug && sk === parenSlug)))
        ) {
          return str(v);
        }
      }
      const fallbackKeys = ["a", "b", "c", "d"];
      if (cellRec[fallbackKeys[idx]] !== undefined)
        return str(cellRec[fallbackKeys[idx]]);
      return "";
    };

    const CRIT_KEY_RE =
      /^(criterion|criteria|kriteria|parameter|label|name|aspect|aspek|dimension|dimensi|feature|fitur|factor|faktor|category|kategori|attribute|atribut|key|id|field|slug)$/i;

    // Entity-major shape: criteria only define rows ({label, key}) while each
    // entity object carries the values (`{name: "Cold Brew", time: "12 jam"}`).
    const valueFromEntityData = (
      ent: { data?: Record<string, unknown> },
      critKey: string,
      critLabel: string,
    ): string => {
      if (!ent.data) return "";
      const want = [critKey, critLabel].filter(Boolean);
      for (const w of want) {
        const hit = ent.data[w];
        if (hit !== undefined && hit !== null && typeof hit !== "object") return str(hit);
      }
      const slugs = want.map(normToken).filter(Boolean);
      for (const [k, v] of Object.entries(ent.data)) {
        if (slugs.includes(normToken(k)) && v !== null && typeof v !== "object") return str(v);
      }
      const nested = rec(ent.data.values ?? ent.data.attributes ?? ent.data.specs);
      for (const w of want) {
        if (nested[w] !== undefined) return str(nested[w]);
      }
      return "";
    };

    let rows: unknown[][] = [];
    if (Array.isArray(props.criteria)) {
      const criteria = arr(props.criteria).map(rec);
      rows = criteria.map((cr) => {
        const critLabel =
          str(cr.criterion) ||
          str(cr.criteria) ||
          str(cr.parameter) ||
          str(cr.label) ||
          str(cr.name) ||
          str(cr.aspect) ||
          str(cr.dimension) ||
          str(cr.feature) ||
          str(cr.factor) ||
          str(cr.category) ||
          "Aspek";
        if (Array.isArray(cr.values)) {
          return [
            critLabel,
            ...entities.map((_, i) =>
              str(rec(arr(cr.values)[i]).value || arr(cr.values)[i]),
            ),
          ];
        }
        const critKey = str(cr.key) || str(cr.id) || str(cr.field) || str(cr.slug);
        const nonCritVals = Object.entries(cr)
          .filter(([k]) => !CRIT_KEY_RE.test(k.trim()))
          .map(([, v]) => v);
        return [
          critLabel,
          ...entities.map((ent, i) => {
            const fromEntity = valueFromEntityData(ent, critKey, critLabel);
            if (fromEntity) return fromEntity;
            const matched = lookupEntityValue(cr, ent, i);
            if (matched && matched !== critKey) return matched;
            return nonCritVals[i] !== undefined ? str(nonCritVals[i]) : "";
          }),
        ];
      });
    } else if (props.criteria && typeof props.criteria === "object") {
      // Support keyed object form: { "Overhead Protokol": { "SSE": "...", "WebSocket": "..." }, ... }
      const critEntries = Object.entries(rec(props.criteria));
      if (entities.length === 0) {
        for (const [, val] of critEntries) {
          if (val && typeof val === "object" && !Array.isArray(val)) {
            entities = Object.keys(rec(val)).map((k) => ({ key: k, label: k }));
            break;
          }
        }
      }
      rows = critEntries.map(([critLabel, cellSpec]) => {
        if (Array.isArray(cellSpec)) {
          return [critLabel, ...entities.map((_, i) => str(cellSpec[i] ?? ""))];
        }
        if (cellSpec && typeof cellSpec === "object") {
          const cellRec = rec(cellSpec);
          return [
            critLabel,
            ...entities.map((ent, i) => {
              const matched = lookupEntityValue(cellRec, ent, i);
              if (matched) return matched;
              const vals = Object.values(cellRec);
              return vals[i] !== undefined ? str(vals[i]) : "";
            }),
          ];
        }
        return [critLabel, str(cellSpec)];
      });
    }

    const columns = [firstColHeader, ...entities.map((e) => e.label)];
    rows = rows.filter((r) => r.slice(1).some((cell) => str(cell).trim()));
    return {
      coreName: "Table",
      props: {
        title: str(props.title) || "Perbandingan",
        columns,
        rows,
        caption: str(props.verdict) || undefined,
      },
    };
  }

  if (clean === "scorecard") {
    const items = arr(props.items).map(rec);
    const rows = items.map((it) => [
      str(it.criterion) ||
        str(it.label) ||
        str(it.name) ||
        str(it.title) ||
        "Kriteria",
      str(it.score) || str(it.value) || str(it.rating) || "—",
      str(it.weight) || str(it.max) || "—",
      str(it.note) || str(it.comment) || str(it.status) || "",
    ]);
    const caption =
      props.overallScore !== undefined && props.overallScore !== null
        ? `Skor Total: ${String(props.overallScore)}`
        : undefined;
    return {
      coreName: "Table",
      props: {
        title: str(props.title) || "Scorecard",
        columns: ["Kriteria", "Skor", "Bobot", "Catatan"],
        rows,
        caption,
      },
    };
  }

  if (clean === "kanbanboard") {
    const cols = arr(props.columns).map(rec);
    const cardItems: Array<Record<string, unknown>> = [];
    for (const col of cols) {
      const laneTitle =
        str(col.title) || str(col.label) || str(col.name) || "Lane";
      const items = arr(col.items ?? col.cards ?? col.tasks);
      for (const item of items) {
        if (typeof item === "string") {
          cardItems.push({ title: item, tag: laneTitle });
        } else {
          const ir = rec(item);
          const title =
            str(ir.title) || str(ir.label) || str(ir.name) || str(ir.text);
          if (title) {
            cardItems.push({
              title,
              subtitle:
                str(ir.owner) || str(ir.assignee) || str(ir.due) || undefined,
              body:
                str(ir.description) ||
                str(ir.body) ||
                str(ir.detail) ||
                undefined,
              meta: str(ir.priority) || str(ir.status) || undefined,
              tag: laneTitle,
            });
          }
        }
      }
    }
    return {
      coreName: "Cards",
      props: {
        title: str(props.title) || "Kanban Board",
        layout: "grid",
        items: cardItems,
      },
    };
  }

  if (clean === "ganttchart") {
    const tasks = arr(props.tasks).map(rec);
    const steps = tasks.map((t) => {
      const start = str(t.start) || str(t.startDate);
      const end = str(t.end) || str(t.endDate);
      const windowStr =
        start && end ? `${start} -> ${end}` : start || end || str(t.duration);
      const detailParts = [
        str(t.owner) || str(t.assignee),
        str(t.status),
        str(t.description),
      ].filter(Boolean);
      return {
        title: str(t.title) || str(t.name) || str(t.label) || "Task",
        meta: windowStr || undefined,
        detail: detailParts.join(" · ") || undefined,
      };
    });
    return {
      coreName: "Steps",
      props: {
        title: str(props.title) || "Jadwal Tugas",
        style: "timeline",
        steps,
      },
    };
  }

  return null;
}

// Minimal and editorial are container-less; the stylesheet strips card surfaces under this marker.
const bareVariantOf = (props: Record<string, unknown>) => {
  const variant = str(props.variant);
  return variant === "minimal" || variant === "editorial" ? variant : undefined;
};

export function MistlineComponent({
  name,
  ...incoming
}: MistlineGenProps & { name: string }) {
  const repairedProps = useMemo(
    () => repairOpenUiProps(name, incoming.props),
    [name, incoming.props],
  );
  const rest = { ...incoming, props: repairedProps };
  const adaptedCore = resolveOpenUiCoreAdapter(name, rest.props);
  if (adaptedCore) {
    const CoreCmp = MISTLINE_REGISTRY[adaptedCore.coreName];
    if (CoreCmp) {
      return (
        <MistlineBlockStreamContext.Provider
          value={{ complete: rest.complete, streaming: rest.streaming }}
        >
          <PaintScope bare={bareVariantOf(adaptedCore.props)}>
            <CoreCmp {...rest} props={adaptedCore.props} />
          </PaintScope>
        </MistlineBlockStreamContext.Provider>
      );
    }
  }

  const canonical = normalizeMistlineComponentName(name);
  const Cmp = MISTLINE_REGISTRY[canonical];
  if (Cmp) {
    return (
      <MistlineBlockStreamContext.Provider
        value={{ complete: rest.complete, streaming: rest.streaming }}
      >
        <PaintScope bare={bareVariantOf(rest.props)}>
          <Cmp {...rest} />
        </PaintScope>
      </MistlineBlockStreamContext.Provider>
    );
  }

  // Bridge to Momo Intelligence UI Registry (all 168 registered snake_case ids, addressed by PascalCase chat name)
  initializeIntelligenceUI();
  const snakeId = name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
  const { targetId, data: adaptedData } = adaptIntelDataForRegistry(
    snakeId,
    rest.props,
  );
  const intelEntry =
    getIntelComponent(name) ||
    getIntelComponent(targetId) ||
    getIntelComponent(snakeId);
  if (intelEntry?.component) {
    const IntelCmp = intelEntry.component;
    // A news link or photo is only shown when it traces back to one of this turn's sources.
    const intelData =
      targetId === "news_feed"
        ? {
            ...adaptedData,
            articles: bindNewsArticlesToSources(
              adaptedData.articles as NewsArticle[],
              rest.sources,
            ),
          }
        : adaptedData;
    const intelVariant = str(adaptedData.variant, "default");
    return (
      <MistlineBlockStreamContext.Provider
        value={{ complete: rest.complete, streaming: rest.streaming }}
      >
        <IntelVariantContext.Provider value={intelVariant}>
          <PaintScope>
            <IntelCmp
              data={intelData}
              variant={intelVariant}
              state={rest.complete ? "ready" : "streaming"}
              surface={rest.surface}
              live={rest.live}
              streaming={rest.streaming}
              sources={rest.sources?.map((sr) => ({
                title: sr.title,
                url: sr.url,
                description: sr.description,
                domain: sr.domain,
                publishedDate: sr.publishedDate,
              }))}
              onReady={rest.onReady}
              onError={rest.onError}
              onAction={(act) => {
                const text =
                  typeof act.payload.text === "string"
                    ? act.payload.text
                    : typeof act.payload.query === "string"
                      ? act.payload.query
                      : "";
                if (text) rest.onAction?.({ type: "send", text });
              }}
            />
          </PaintScope>
        </IntelVariantContext.Provider>
      </MistlineBlockStreamContext.Provider>
    );
  }

  return (
    <div className="gu gu-unknown">
      <span className="gu-pen momo-hand-title">komponen tidak dikenal</span>{" "}
      <code>{name}</code>
    </div>
  );
}
