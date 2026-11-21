"use client";

import { useEffect, useState } from "react";
import {
  countImageAssetTokenHits,
  createStableAssetId,
  distillVisualSearchQuery,
  extractDistinctiveQueryTokens,
  extractImageAssetStem,
  inferAssetFromUnknown,
  isAbstractNonVisualTitle,
  isGenericPlaceholderQuery,
  isImageAssetContextuallyRelevant,
  isLikelyImageUrl,
  isNonPhotographicLogoOrGraphic,
  normalizeImageDedupKey,
  pickSharpDisplayImageUrl,
  wantsExplicitLogoQuery,
  type NormalizedImageAsset,
} from "@/lib/imageAssetContract";
import { recordVerifiedImageUrls } from "@/lib/verifiedImagePool";
import type { SourceItem } from "@/types/momo";

export interface ResolvedWebImageBundle {
  primary: NormalizedImageAsset | null;
  candidates: NormalizedImageAsset[];
  lockedUrl?: string;
}

interface TimedCacheEntry {
  bundle: ResolvedWebImageBundle;
  expiresAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "momo.verifiedImageCache.v7";
const MAX_PERSISTED_ENTRIES = 240;
const HIT_TTL_MS = 7 * 24 * 60 * 60_000; // 7 days across browser refreshes
const MISS_TTL_MS = 10 * 60_000; // 10 minutes for verified empty results

const resolvedBundleCache = new Map<string, TimedCacheEntry>();
const inflightRequests = new Map<string, Promise<ResolvedWebImageBundle>>();
let storageHydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function ensureStorageHydrated(): void {
  if (storageHydrated || typeof window === "undefined") return;
  storageHydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, TimedCacheEntry>;
    if (!parsed || typeof parsed !== "object") return;
    const now = Date.now();
    for (const [k, entry] of Object.entries(parsed)) {
      if (
        entry &&
        typeof entry === "object" &&
        typeof entry.expiresAt === "number" &&
        entry.expiresAt > now &&
        entry.bundle &&
        Array.isArray(entry.bundle.candidates)
      ) {
        resolvedBundleCache.set(k, entry);
        whitelistBundle(entry.bundle);
      }
    }
  } catch {
    // Ignore corrupt or quota-restricted localStorage
  }
}

function schedulePersistToStorage(): void {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const now = Date.now();
      const validEntries = Array.from(resolvedBundleCache.entries())
        .filter(([, entry]) => entry.expiresAt > now && entry.bundle.candidates.length > 0)
        .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
        .slice(0, MAX_PERSISTED_ENTRIES);

      const serialized: Record<string, TimedCacheEntry> = {};
      for (const [k, v] of validEntries) {
        serialized[k] = v;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch {
      // Ignore storage quota errors
    }
  }, 180);
}

export function buildImageCacheKey(
  query: string,
  fallbackQuery?: string,
  contextAnchor?: string,
): string {
  const effectiveQuery = distillVisualSearchQuery(query, contextAnchor) || query.trim();
  const rawFb = (fallbackQuery || "").trim();
  const safeFb =
    rawFb && !isGenericPlaceholderQuery(rawFb) && !isAbstractNonVisualTitle(rawFb)
      ? distillVisualSearchQuery(rawFb, contextAnchor)
      : "";
  return `${effectiveQuery.toLowerCase()}||${safeFb.toLowerCase()}`;
}

export function peekVerifiedWebImages(
  query: string,
  fallbackQuery?: string,
  contextAnchor?: string,
): ResolvedWebImageBundle | undefined {
  const clean = (query || "").trim();
  if (!clean || isGenericPlaceholderQuery(clean)) return undefined;
  ensureStorageHydrated();
  const key = buildImageCacheKey(clean, fallbackQuery, contextAnchor);
  const entry = resolvedBundleCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    resolvedBundleCache.delete(key);
    return undefined;
  }
  return entry.bundle;
}

/**
 * `/api/image` results passed the same server checks as `search_images` results. Whitelist them,
 * or blocks that hand a resolved asset on as a direct `src` (galleries, moodboards, captioned
 * images) get it rejected as unverified and fall back to an empty tile.
 */
function whitelistBundle(bundle: ResolvedWebImageBundle): void {
  recordVerifiedImageUrls(
    bundle.candidates.flatMap((c) => [c.imageUrl, c.thumbnailUrl, pickSharpDisplayImageUrl(c)]),
  );
  if (bundle.lockedUrl) recordVerifiedImageUrls([bundle.lockedUrl]);
}

function setCachedBundle(key: string, bundle: ResolvedWebImageBundle): void {
  ensureStorageHydrated();
  whitelistBundle(bundle);
  const now = Date.now();
  const ttl = bundle.candidates.length > 0 ? HIT_TTL_MS : MISS_TTL_MS;
  resolvedBundleCache.set(key, {
    bundle,
    expiresAt: now + ttl,
    updatedAt: now,
  });
  if (bundle.candidates.length > 0) {
    schedulePersistToStorage();
  }
}

/**
 * Locks the exact URL that decoded cleanly in `<img>` as the primary candidate
 * in persistent storage so future page refreshes (`Cmd+R`) render the identical
 * proven URL immediately with zero candidate rotation.
 */
export function lockVerifiedWorkingUrl(
  query: string,
  workingUrl: string,
  fallbackQuery?: string,
  contextAnchor?: string,
): void {
  const cleanQ = (query || "").trim();
  const cleanUrl = (workingUrl || "").trim();
  if (!cleanQ || !cleanUrl || isGenericPlaceholderQuery(cleanQ)) return;
  // Unwrap proxy URL if needed so we match the canonical candidate, while keeping workingUrl
  ensureStorageHydrated();
  const key = buildImageCacheKey(cleanQ, fallbackQuery, contextAnchor);
  const existing = resolvedBundleCache.get(key);
  if (!existing || existing.bundle.candidates.length === 0) return;
  if (existing.bundle.lockedUrl === cleanUrl) return;

  const matched =
    existing.bundle.candidates.find(
      (c) => c.thumbnailUrl === cleanUrl || c.imageUrl === cleanUrl,
    ) || existing.bundle.primary;

  if (!matched) return;
  const promoted: NormalizedImageAsset = {
    ...matched,
    thumbnailUrl: cleanUrl,
  };
  const rest = existing.bundle.candidates.filter((c) => c.id !== matched.id);
  const updatedBundle: ResolvedWebImageBundle = {
    primary: promoted,
    candidates: [promoted, ...rest],
    lockedUrl: cleanUrl,
  };
  setCachedBundle(key, updatedBundle);
}

/**
 * Checks the current turn's verified `SourceItem[]` pool (populated by `search_images`
 * and `web_search` in `/api/brain`) for contextually matching photographic assets
 * before issuing extra network calls.
 */
export function matchVerifiedSourcesPool(
  query: string,
  sources?: SourceItem[],
  contextAnchor?: string,
): NormalizedImageAsset[] {
  if (!sources || sources.length === 0) return [];
  const effectiveQuery = distillVisualSearchQuery(query, contextAnchor) || query.trim();
  if (!effectiveQuery || isGenericPlaceholderQuery(effectiveQuery)) return [];

  const parsed = extractDistinctiveQueryTokens(effectiveQuery);
  if (parsed.all.length === 0) return [];

  const allowLogo = wantsExplicitLogoQuery(query);
  const scored: Array<{ asset: NormalizedImageAsset; score: number }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const imgUrl = (src.imageUrl || "").trim();
    if (!imgUrl || !isLikelyImageUrl(imgUrl)) continue;
    if (isNonPhotographicLogoOrGraphic(imgUrl, src.title || "", undefined, allowLogo)) {
      continue;
    }

    const kUrl = normalizeImageDedupKey(imgUrl);
    const kStem = extractImageAssetStem(imgUrl);
    if (seen.has(kUrl) || seen.has(kStem)) continue;

    const candidateAsset: NormalizedImageAsset = {
      id: createStableAssetId(imgUrl, i),
      imageUrl: imgUrl,
      thumbnailUrl: imgUrl,
      sourceUrl: src.url || imgUrl,
      sourceTitle: `${src.title || ""} ${src.snippet || ""} ${src.description || ""}`.trim() || src.domain,
      caption: src.title,
      alt: src.title || "",
      provider: "bound",
      status: "resolved",
    };

    if (!isImageAssetContextuallyRelevant(candidateAsset, parsed)) continue;

    const distHits = countImageAssetTokenHits(candidateAsset, parsed.distinctive);
    const modHits = countImageAssetTokenHits(candidateAsset, parsed.modifiers);

    seen.add(kUrl);
    seen.add(kStem);
    scored.push({
      score: distHits * 5 + modHits * 1.5,
      asset: {
        ...candidateAsset,
        sourceTitle: src.title || src.domain,
        alt: src.title || effectiveQuery,
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.asset);
}

const isSafeUrl = (v: string) => /^https?:\/\//i.test(v) || v.startsWith("/");

export async function fetchVerifiedWebImages(
  query: string,
  fallbackAlt?: string,
  fallbackQuery?: string,
  opts?: {
    contextAnchor?: string;
    sources?: SourceItem[];
    bypassCache?: boolean;
  },
): Promise<ResolvedWebImageBundle> {
  const rawClean = (query || "").trim();
  if (!rawClean || isGenericPlaceholderQuery(rawClean)) {
    return { primary: null, candidates: [] };
  }

  const contextAnchor = opts?.contextAnchor;
  const effectiveQuery = distillVisualSearchQuery(rawClean, contextAnchor) || rawClean;
  const rawFb = (fallbackQuery || "").trim();
  const safeFallbackQuery =
    rawFb &&
    !isGenericPlaceholderQuery(rawFb) &&
    !isAbstractNonVisualTitle(rawFb) &&
    rawFb.toLowerCase() !== rawClean.toLowerCase()
      ? distillVisualSearchQuery(rawFb, contextAnchor)
      : "";

  const key = buildImageCacheKey(rawClean, safeFallbackQuery, contextAnchor);

  if (!opts?.bypassCache) {
    const hit = peekVerifiedWebImages(rawClean, safeFallbackQuery, contextAnchor);
    if (hit) return hit;

    const existing = inflightRequests.get(key);
    if (existing) return existing;
  }

  const altLabel =
    fallbackAlt && !isGenericPlaceholderQuery(fallbackAlt)
      ? fallbackAlt.trim()
      : effectiveQuery;

  const queryOnce = async (qStr: string, fb?: string): Promise<ResolvedWebImageBundle> => {
    const params = new URLSearchParams({ q: qStr, limit: "6" });
    if (fb && fb.trim()) params.set("fallback", fb.trim());
    if (contextAnchor && contextAnchor.trim()) params.set("ctx", contextAnchor.trim().slice(0, 120));

    const res = await fetch(`/api/image?${params.toString()}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { primary: null, candidates: [] };
    const d = (await res.json()) as {
      url?: string;
      imageUrl?: string;
      thumbnailUrl?: string;
      source?: string;
      caption?: string;
      provider?: string;
      asset?: unknown;
      assets?: unknown[];
    };

    const candidates: NormalizedImageAsset[] = [];
    const seen = new Set<string>();

    const allowLogo = wantsExplicitLogoQuery(rawClean);
    const pushCandidate = (a: NormalizedImageAsset | null) => {
      if (!a) return;
      const u = pickSharpDisplayImageUrl(a);
      if (!u) return;
      if (
        isNonPhotographicLogoOrGraphic(
          u,
          a.caption || a.alt || "",
          { width: a.width, height: a.height },
          allowLogo,
        )
      ) {
        return;
      }
      const kUrl = normalizeImageDedupKey(u);
      const kStem = extractImageAssetStem(u);
      const kFullStem = extractImageAssetStem(a.imageUrl);
      if (seen.has(kUrl) || seen.has(kStem) || seen.has(kFullStem)) return;
      seen.add(kUrl);
      seen.add(kStem);
      seen.add(kFullStem);
      candidates.push(a);
    };

    // Include turn-verified sources that match distinctive tokens of this query
    for (const poolHit of matchVerifiedSourcesPool(qStr, opts?.sources, contextAnchor)) {
      pushCandidate(poolHit);
    }

    if (Array.isArray(d.assets)) {
      for (const rawItem of d.assets) {
        pushCandidate(inferAssetFromUnknown(rawItem, altLabel));
      }
    }
    pushCandidate(inferAssetFromUnknown(d.asset, altLabel));
    if (d.url && isLikelyImageUrl(d.url)) {
      pushCandidate({
        id: createStableAssetId(d.url, 0),
        imageUrl: d.imageUrl && isLikelyImageUrl(d.imageUrl) ? d.imageUrl : d.url,
        thumbnailUrl: d.url,
        sourceUrl: d.source && isSafeUrl(d.source) ? d.source : d.url,
        caption: d.caption,
        alt: altLabel,
        provider:
          d.provider === "tinyfish" ||
          d.provider === "exa" ||
          d.provider === "wikimedia" ||
          d.provider === "openverse" ||
          d.provider === "firecrawl"
            ? d.provider
            : ("bound" as const),
        status: "resolved" as const,
      });
    }

    return { primary: candidates[0] ?? null, candidates };
  };

  const task = (async () => {
    try {
      let bundle = await queryOnce(effectiveQuery, safeFallbackQuery || undefined);
      if (bundle.candidates.length === 0 && safeFallbackQuery) {
        bundle = await queryOnce(safeFallbackQuery);
      }
      if (bundle.candidates.length === 0) {
        const poolFallback = matchVerifiedSourcesPool(rawClean, opts?.sources, contextAnchor);
        if (poolFallback.length > 0) {
          bundle = { primary: poolFallback[0], candidates: poolFallback };
        }
      }
      setCachedBundle(key, bundle);
      return bundle;
    } catch {
      const poolFallback = matchVerifiedSourcesPool(rawClean, opts?.sources, contextAnchor);
      if (poolFallback.length > 0) {
        const bundle = { primary: poolFallback[0], candidates: poolFallback };
        setCachedBundle(key, bundle);
        return bundle;
      }
      return { primary: null, candidates: [] };
    } finally {
      inflightRequests.delete(key);
    }
  })();

  if (!opts?.bypassCache) {
    inflightRequests.set(key, task);
  }
  return task;
}

/**
 * Resolves either an explicit image URL or a semantic web query via `/api/image`
 * using a persistent two-tier client cache (`Memory` + `localStorage`) so cards,
 * spreads, and Pinboard items retain exact verified photos across page refreshes.
 */
export function useResolvedWebImage(opts: {
  src?: string;
  query?: string;
  fallbackQuery?: string;
  contextAnchor?: string;
  sources?: SourceItem[];
  alt?: string;
  enabled?: boolean;
}) {
  const direct = (opts.src || "").trim();
  const query = (opts.query || "").trim();
  const fallbackQuery = (opts.fallbackQuery || "").trim();
  const contextAnchor = opts.contextAnchor;
  const sources = opts.sources;
  const enabled = opts.enabled !== false && Boolean(query) && !isGenericPlaceholderQuery(query);
  const hasDirect = Boolean(direct && isSafeUrl(direct));
  const cacheKey = buildImageCacheKey(query, fallbackQuery, contextAnchor);

  const syncHit =
    !hasDirect && enabled
      ? peekVerifiedWebImages(query, fallbackQuery, contextAnchor)
      : undefined;

  const [settledState, setSettledState] = useState<{
    key: string;
    bundle: ResolvedWebImageBundle;
  }>(() => ({
    key: syncHit ? cacheKey : "",
    bundle: syncHit ?? { primary: null, candidates: [] },
  }));

  useEffect(() => {
    if (hasDirect || !enabled) {
      return;
    }
    const freshHit = peekVerifiedWebImages(query, fallbackQuery, contextAnchor);
    if (freshHit) {
      setSettledState({ key: cacheKey, bundle: freshHit });
      return;
    }
    let dead = false;
    void fetchVerifiedWebImages(query, opts.alt, fallbackQuery, {
      contextAnchor,
      sources,
    }).then((next) => {
      if (dead) return;
      setSettledState({ key: cacheKey, bundle: next });
    });
    return () => {
      dead = true;
    };
  }, [hasDirect, enabled, query, fallbackQuery, contextAnchor, cacheKey, opts.alt, sources]);

  const activeBundle =
    syncHit ??
    (settledState.key === cacheKey
      ? settledState.bundle
      : { primary: null, candidates: [] });
  const searching =
    !hasDirect && enabled && !syncHit && settledState.key !== cacheKey;

  const resolved = activeBundle.primary;
  const sharpPrimary = pickSharpDisplayImageUrl(resolved);
  const candidateUrls = hasDirect
    ? [direct]
    : [
        ...(activeBundle.lockedUrl ? [activeBundle.lockedUrl] : []),
        ...activeBundle.candidates
          .map((c) => pickSharpDisplayImageUrl(c))
          .filter((u): u is string => Boolean(u && isSafeUrl(u) && u !== activeBundle.lockedUrl)),
      ];

  return {
    imageUrl: hasDirect ? direct : activeBundle.lockedUrl || sharpPrimary || undefined,
    fullImageUrl: hasDirect ? direct : resolved?.imageUrl || sharpPrimary || undefined,
    candidateUrls,
    sourceUrl: resolved?.sourceUrl,
    sourceTitle: resolved?.sourceTitle,
    caption: resolved?.caption,
    searching,
  };
}
