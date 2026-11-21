import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rerankAssetsWithVision } from "@/lib/visionRerank";
import type { SourceItem } from "@/types/momo";
import {
  countImageAssetTokenHits,
  createStableAssetId,
  distillVisualSearchQuery,
  extractDistinctiveQueryTokens,
  extractImageAssetStem,
  isGenericPlaceholderQuery,
  isImageAssetContextuallyRelevant,
  isLikelyImageUrl,
  isNonPhotographicLogoOrGraphic,
  isPhotographicImageUrl,
  isSafeExternalHttpsUrl,
  normalizeImageDedupKey,
  wantsExplicitLogoQuery,
  type ImageProviderName,
  type NormalizedImageAsset,
} from "@/lib/imageAssetContract";

export { extractImageAssetStem, normalizeImageDedupKey };

export type WebSearchProviderName = "tinyfish" | "exa" | "firecrawl";

export interface WebSearchResultItem {
  title: string;
  url: string;
  snippet: string;
  imageUrl?: string;
  provider: WebSearchProviderName;
  publishedDate?: string;
}

export interface WebSearchResponse {
  query: string;
  providersUsed: WebSearchProviderName[];
  results: WebSearchResultItem[];
  sources: SourceItem[];
  error?: string;
}

function readServerEnvKeys(): {
  tinyfishKey: string;
  exaKey: string;
  firecrawlKey: string;
} {
  let tinyfishKey = process.env.TINYFISH_API_KEY || "";
  let exaKey = process.env.EXA_API_KEY || "";
  let firecrawlKey = process.env.FIRECRAWL_API_KEY || "";
  if (tinyfishKey && exaKey && firecrawlKey) {
    return { tinyfishKey, exaKey, firecrawlKey };
  }

  try {
    const raw = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (k === "TINYFISH_API_KEY" && !tinyfishKey) tinyfishKey = v;
      if (k === "EXA_API_KEY" && !exaKey) exaKey = v;
      if (k === "FIRECRAWL_API_KEY" && !firecrawlKey) firecrawlKey = v;
    }
  } catch {
    // `.env.local` optional
  }

  if (!tinyfishKey) {
    try {
      const tfCfgPath = path.join(os.homedir(), ".tinyfish", "config.json");
      const parsed = JSON.parse(fs.readFileSync(tfCfgPath, "utf8")) as {
        api_key?: string;
        apiKey?: string;
      };
      tinyfishKey = (parsed.api_key || parsed.apiKey || "").trim();
    } catch {
      // `~/.tinyfish/config.json` optional
    }
  }

  return { tinyfishKey, exaKey, firecrawlKey };
}

function combineTimeoutSignal(ms: number, external?: AbortSignal): AbortSignal {
  const t = AbortSignal.timeout(ms);
  return external ? AbortSignal.any([external, t]) : t;
}

async function searchTinyFish(
  query: string,
  numResults: number,
  apiKey: string,
  signal?: AbortSignal,
  timeoutMs = 6200,
): Promise<WebSearchResultItem[]> {
  if (!apiKey) return [];
  try {
    const searchUrl = new URL("https://api.search.tinyfish.ai/");
    searchUrl.searchParams.set("query", query);
    const res = await fetch(searchUrl.toString(), {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
        "X-TF-Request-Origin": "tinyfish-js",
      },
      signal: combineTimeoutSignal(timeoutMs, signal),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        snippet?: string;
        date?: string;
      }>;
    };
    const items = Array.isArray(data.results)
      ? data.results.slice(0, Math.max(1, numResults))
      : [];
    const out: WebSearchResultItem[] = [];
    for (const it of items) {
      const url = String(it.url || "").trim();
      if (!/^https?:\/\//i.test(url)) continue;
      const snippet = String(it.snippet || "")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, 2800);
      out.push({
        title: String(it.title || url).trim(),
        url,
        snippet,
        provider: "tinyfish",
        ...(it.date ? { publishedDate: it.date } : {}),
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function searchExa(
  query: string,
  numResults: number,
  apiKey: string,
  signal?: AbortSignal,
  timeoutMs = 6800
): Promise<WebSearchResultItem[]> {
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      signal: combineTimeoutSignal(timeoutMs, signal),
      body: JSON.stringify({
        query,
        numResults,
        type: "auto",
        contents: {
          text: {
            maxCharacters: 3400,
          },
          highlights: {
            numSentences: 6,
            highlightsPerUrl: 4,
          },
        },
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        image?: string;
        publishedDate?: string;
        highlights?: string[];
        text?: string;
      }>;
    };
    const items = Array.isArray(data.results) ? data.results : [];
    const out: WebSearchResultItem[] = [];
    for (const it of items) {
      const url = String(it.url || "").trim();
      if (!/^https?:\/\//i.test(url)) continue;
      const highlightBlock = Array.isArray(it.highlights)
        ? it.highlights.map((h) => h.trim()).filter(Boolean).join("\n")
        : "";
      const fullText = String(it.text || "")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const combined =
        fullText.length > highlightBlock.length * 1.15
          ? highlightBlock && !fullText.includes(highlightBlock.slice(0, 80))
            ? `${highlightBlock}\n\n${fullText}`
            : fullText
          : highlightBlock || fullText;
      const img =
        typeof it.image === "string" && /^https?:\/\//i.test(it.image.trim())
          ? it.image.trim()
          : undefined;
      out.push({
        title: String(it.title || url).trim(),
        url,
        snippet: combined.trim().slice(0, 2800),
        ...(img ? { imageUrl: img } : {}),
        provider: "exa",
        ...(it.publishedDate ? { publishedDate: it.publishedDate } : {}),
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function searchFirecrawl(
  query: string,
  limit: number,
  apiKey: string,
  signal?: AbortSignal
): Promise<WebSearchResultItem[]> {
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: combineTimeoutSignal(7500, signal),
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success?: boolean;
      data?: Array<{
        title?: string;
        url?: string;
        description?: string;
        markdown?: string;
        metadata?: {
          ogImage?: string;
          twitterImage?: string;
        };
      }>;
    };
    const items = Array.isArray(data.data) ? data.data : [];
    const out: WebSearchResultItem[] = [];
    for (const it of items) {
      const url = String(it.url || "").trim();
      if (!/^https?:\/\//i.test(url)) continue;
      const cleanMd = String(it.markdown || "")
        .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const desc = String(it.description || "").trim();
      const rawBody =
        cleanMd.length > desc.length
          ? desc && !cleanMd.includes(desc.slice(0, 60))
            ? `${desc}\n\n${cleanMd}`
            : cleanMd
          : desc || cleanMd;
      const snippet = rawBody.trim().slice(0, 2800);
      const mdImgMatch = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i.exec(it.markdown || "");
      const candidateImg =
        it.metadata?.ogImage || it.metadata?.twitterImage || mdImgMatch?.[1] || "";
      const img = /^https?:\/\//i.test(candidateImg.trim()) ? candidateImg.trim() : undefined;
      out.push({
        title: String(it.title || url).trim(),
        url,
        snippet,
        ...(img ? { imageUrl: img } : {}),
        provider: "firecrawl",
      });
    }
    return out;
  } catch {
    return [];
  }
}

function getHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

const CHAT_FILLER_WORDS = new Set([
  "gue", "gw", "aku", "saya", "lu", "lo", "kamu", "mau", "pergi", "nanti",
  "kira", "kira-kira", "kalau", "jika", "tolong", "bantu", "dong", "sih",
  "deh", "nih", "ya", "yak", "kah", "gak", "nggak", "engga", "buat",
  "untuk", "sama", "bareng", "berdua", "berduaan", "dari", "ke", "di",
  "yang", "apa", "gimana", "bagaimana", "kenapa", "mengapa", "bisa", "aja",
]);

const EXHAUSTIVE_LIST_ANCHOR_RE =
  /\b(setlist|tracklist|daftar\s+lagu|list\s+lagu|rundown|jadwal|schedule|lineup|line-up|menu|spesifikasi|specs|kurikulum|episode|cast|pemeran|katalog)\b/i;

/**
 * Expands a natural user prompt into crisp, multi-facet search queries so web search
 * never relies solely on one rigid literal chat sentence (and retries explore new angles).
 * When `sessionAnchor` is provided in a multi-turn session, under-specified follow-up
 * sub-queries (e.g. "pertukaran e-tiket", "eh bukannya di senayan") are automatically
 * anchored to the session's active subject entities.
 */
export function expandWebSearchQueries(
  rawQuery: string,
  isRetry = false,
  sessionAnchor?: string,
): string[] {
  const trimmed = rawQuery.replace(/\s+/g, " ").trim();
  if (!trimmed) return [];

  const tokens = trimmed
    .replace(/[?!.,()"']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const meaningful = tokens.filter(
    (t) => t.length >= 2 && !CHAT_FILLER_WORDS.has(t.toLowerCase()),
  );
  let cleanCore =
    meaningful.length >= 2 ? meaningful.slice(0, 14).join(" ") : trimmed;

  // Anchor follow-up queries that omit the session's root proper-noun subject
  const anchorClean = (sessionAnchor || "").replace(/\s+/g, " ").trim();
  if (anchorClean) {
    const coreLower = new Set(
      cleanCore
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
    );
    const anchorTokens = anchorClean
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !CHAT_FILLER_WORDS.has(w.toLowerCase()));
    const missingAnchor = anchorTokens.filter(
      (w) => !coreLower.has(w.toLowerCase()),
    );
    const sharesAnyAnchor = anchorTokens.some((w) =>
      coreLower.has(w.toLowerCase()),
    );
    if (!sharesAnyAnchor && missingAnchor.length > 0) {
      cleanCore = `${cleanCore} ${missingAnchor.slice(0, 5).join(" ")}`.trim();
    } else if (missingAnchor.length > 0 && meaningful.length <= 6) {
      cleanCore = `${cleanCore} ${missingAnchor.slice(0, 4).join(" ")}`.trim();
    }
  }

  const queries: string[] = [cleanCore];

  // Expand common band/venue shorthand so promoter announcements using full names always surface
  if (/\bmcr\b/i.test(cleanCore) && !/my\s+chemical\s+romance/i.test(cleanCore)) {
    const expandedBand = cleanCore.replace(/\bmcr\b/gi, "My Chemical Romance");
    queries.push(expandedBand);
  }

  const listMatch = EXHAUSTIVE_LIST_ANCHOR_RE.exec(trimmed);
  const listAnchor = listMatch ? listMatch[1].toLowerCase() : "";
  const isMusicSetlist = /setlist|tracklist|lagu/i.test(listAnchor);

  // Extract capitalized / proper-noun anchor phrase for a focused secondary query
  const properSpans =
    cleanCore.match(/\b[A-Z][a-zA-Z0-9-]+(?:\s+[A-Z0-9][a-zA-Z0-9-]+){0,3}\b/g) || [];
  const filteredSpans = Array.from(
    new Set(
      properSpans.filter(
        (s) => !CHAT_FILLER_WORDS.has(s.toLowerCase()) && s.length >= 3,
      ),
    ),
  );

  if (listAnchor) {
    const subjectBase =
      filteredSpans.length >= 1
        ? filteredSpans.slice(0, 4).join(" ")
        : meaningful
            .filter((t) => t.toLowerCase() !== listAnchor)
            .slice(0, 6)
            .join(" ");
    const fullListQuery = isMusicSetlist
      ? `${subjectBase} setlist full tracklist setlist.fm`.trim()
      : `${subjectBase} ${listAnchor} lengkap full`.trim();
    if (fullListQuery && fullListQuery.toLowerCase() !== cleanCore.toLowerCase()) {
      queries.push(fullListQuery);
    }
  } else if (
    /\b(?:penukaran|pertukaran|tukar|e-?tiket|e-?ticket|e-?voucher|wristband|gelang)\b/i.test(
      cleanCore,
    )
  ) {
    const subjectHint =
      filteredSpans.length > 0 ? filteredSpans.slice(0, 4).join(" ") : cleanCore;
    const redemptionAngle = `${subjectHint} lokasi jadwal penukaran e-voucher wristband tiket resmi promotor`.trim();
    if (!queries.some((q) => q.toLowerCase() === redemptionAngle.toLowerCase())) {
      queries.push(redemptionAngle);
    }
  } else if (filteredSpans.length >= 2) {
    const entityCombo = filteredSpans.slice(0, 4).join(" ");
    if (entityCombo.toLowerCase() !== cleanCore.toLowerCase()) {
      queries.push(entityCombo);
    }
  } else if (meaningful.length >= 4) {
    const tailAngle = `${meaningful.slice(0, 6).join(" ")} informasi resmi terbaru`;
    queries.push(tailAngle);
  }

  const baseUnique = Array.from(new Set(queries)).slice(0, 3);
  if (isRetry) {
    const retryAngle = listAnchor
      ? `${filteredSpans.slice(0, 3).join(" ") || cleanCore} ${listAnchor} urutan lengkap terbaru`
      : filteredSpans.length > 0
        ? `${filteredSpans.slice(0, 3).join(" ")} review kondisi update terbaru`
        : `${cleanCore} analisis mendalam alternatif`;
    if (!baseUnique.includes(retryAngle)) {
      baseUnique.push(retryAngle);
    }
  }

  return baseUnique;
}

/**
 * Runs live web search using a Hybrid TinyFish + Exa Search fast path with
 * Firecrawl fallback/expansion. Supports query expansion (`expand: true`),
 * session entity anchoring (`sessionAnchor`), and retry broadening (`isRetry: true`).
 */
export async function runWebSearch(opts: {
  query: string;
  numResults?: number;
  provider?: "auto" | "tinyfish" | "exa" | "firecrawl";
  expand?: boolean;
  isRetry?: boolean;
  sessionAnchor?: string;
  signal?: AbortSignal;
}): Promise<WebSearchResponse> {
  const query = opts.query.trim();
  const rawLimit =
    typeof opts.numResults === "number" && Number.isFinite(opts.numResults)
      ? opts.numResults
      : 6;
  const limit = Math.max(1, Math.min(10, Math.round(rawLimit)));
  if (!query) {
    return {
      query: "",
      providersUsed: [],
      results: [],
      sources: [],
      error: "Empty search query",
    };
  }

  const { tinyfishKey, exaKey, firecrawlKey } = readServerEnvKeys();
  const mode = opts.provider ?? "auto";
  const wantTinyFish =
    (mode === "auto" || mode === "tinyfish") && Boolean(tinyfishKey);
  const wantExa = (mode === "auto" || mode === "exa") && Boolean(exaKey);
  const wantFirecrawlDirect = mode === "firecrawl" && Boolean(firecrawlKey);

  if (
    !wantTinyFish &&
    !wantExa &&
    !(mode === "auto" && Boolean(firecrawlKey)) &&
    !wantFirecrawlDirect
  ) {
    return {
      query,
      providersUsed: [],
      results: [],
      sources: [],
      error: "TINYFISH_API_KEY, EXA_API_KEY, and FIRECRAWL_API_KEY are not configured.",
    };
  }

  const queriesToRun =
    opts.expand || opts.isRetry || opts.sessionAnchor
      ? expandWebSearchQueries(query, Boolean(opts.isRetry), opts.sessionAnchor)
      : [query];
  const perQueryLimit = Math.max(3, Math.min(6, limit));

  let tfRes: WebSearchResultItem[] = [];
  let exaRes: WebSearchResultItem[] = [];
  let fcRes: WebSearchResultItem[] = [];

  if (mode === "firecrawl") {
    const batches = await Promise.all(
      queriesToRun.map((q) =>
        firecrawlKey ? searchFirecrawl(q, perQueryLimit, firecrawlKey, opts.signal) : [],
      ),
    );
    fcRes = batches.flat();
  } else if (mode === "tinyfish") {
    const batches = await Promise.all(
      queriesToRun.map((q) =>
        tinyfishKey
          ? searchTinyFish(q, perQueryLimit, tinyfishKey, opts.signal, 6200)
          : [],
      ),
    );
    tfRes = batches.flat();
  } else if (mode === "exa") {
    const batches = await Promise.all(
      queriesToRun.map((q) =>
        exaKey ? searchExa(q, perQueryLimit, exaKey, opts.signal, 6500) : [],
      ),
    );
    exaRes = batches.flat();
  } else {
    // Auto mode (Hybrid): run TinyFish and Exa in parallel across expanded sub-queries;
    // also hit Firecrawl if combined results are sparse OR on retry
    const [tfBatches, exaBatches] = await Promise.all([
      wantTinyFish
        ? Promise.all(
            queriesToRun.map((q) =>
              searchTinyFish(q, perQueryLimit, tinyfishKey, opts.signal, 6200),
            ),
          )
        : Promise.resolve([] as WebSearchResultItem[][]),
      wantExa
        ? Promise.all(
            queriesToRun.map((q) =>
              searchExa(q, perQueryLimit, exaKey, opts.signal, 6500),
            ),
          )
        : Promise.resolve([] as WebSearchResultItem[][]),
    ]);
    tfRes = tfBatches.flat();
    exaRes = exaBatches.flat();

    const needFirecrawl =
      Boolean(firecrawlKey) &&
      (Boolean(opts.isRetry) || tfRes.length + exaRes.length < Math.min(4, limit));
    if (needFirecrawl) {
      const fcQuery = queriesToRun[queriesToRun.length - 1] || query;
      fcRes = await searchFirecrawl(fcQuery, perQueryLimit, firecrawlKey, opts.signal);
    }
  }

  const providersUsed: WebSearchProviderName[] = [];
  if (tfRes.length > 0) providersUsed.push("tinyfish");
  if (exaRes.length > 0) providersUsed.push("exa");
  if (fcRes.length > 0) providersUsed.push("firecrawl");

  const merged: WebSearchResultItem[] = [];
  const urlToIndex = new Map<string, number>();
  let orderedPool: WebSearchResultItem[] = [];

  if (opts.isRetry) {
    const perQuery = Math.max(2, Math.ceil(perQueryLimit));
    const retrySlices: WebSearchResultItem[][] = [];
    if (fcRes.length > 0) retrySlices.push(fcRes);
    if (tfRes.length > 0) retrySlices.push(tfRes);
    for (let offset = exaRes.length - perQuery; offset >= 0; offset -= perQuery) {
      retrySlices.push(exaRes.slice(offset, offset + perQuery));
    }
    const maxLen = Math.max(0, ...retrySlices.map((s) => s.length));
    for (let idx = 0; idx < maxLen; idx++) {
      for (const slice of retrySlices) {
        if (slice[idx]) orderedPool.push(slice[idx]);
      }
    }
  } else {
    // Interleave TinyFish (exact live web precision) + Exa (deep neural text highlights) + Firecrawl
    const maxLen = Math.max(tfRes.length, exaRes.length, fcRes.length);
    for (let idx = 0; idx < maxLen; idx++) {
      if (tfRes[idx]) orderedPool.push(tfRes[idx]);
      if (exaRes[idx]) orderedPool.push(exaRes[idx]);
      if (fcRes[idx]) orderedPool.push(fcRes[idx]);
    }
  }

  for (const item of orderedPool) {
    const normUrl = item.url.replace(/\/$/, "");
    const existingIdx = urlToIndex.get(normUrl);
    if (existingIdx !== undefined) {
      const prev = merged[existingIdx];
      // Merge richer snippet / image / date when both TinyFish and Exa return the same URL
      if (item.snippet.length > prev.snippet.length * 1.15) {
        prev.snippet = prev.snippet
          ? `${prev.snippet}\n\n${item.snippet}`.slice(0, 2800)
          : item.snippet;
      }
      if (!prev.imageUrl && item.imageUrl) prev.imageUrl = item.imageUrl;
      if (!prev.publishedDate && item.publishedDate) {
        prev.publishedDate = item.publishedDate;
      }
      continue;
    }
    if (merged.length >= limit) continue;
    urlToIndex.set(normUrl, merged.length);
    merged.push({ ...item });
  }

  const sources: SourceItem[] = merged.map((r) => ({
    title: r.title,
    url: r.url,
    description: r.snippet,
    snippet: r.snippet,
    domain: getHostname(r.url),
    ...(r.imageUrl ? { imageUrl: r.imageUrl } : {}),
    ...(r.publishedDate ? { publishedDate: r.publishedDate } : {}),
  }));

  return {
    query,
    providersUsed,
    results: merged,
    sources,
  };
}

export interface ImageSearchResponse {
  query: string;
  providersUsed: ImageProviderName[];
  assets: NormalizedImageAsset[];
  sources: SourceItem[];
  error?: string;
}

async function searchWikimediaImages(
  query: string,
  limit: number,
  allowLogo = false,
): Promise<NormalizedImageAsset[]> {
  try {
    const gsrQuery = allowLogo
      ? `${query} filetype:bitmap`
      : `${query} -logo -icon -wordmark filetype:bitmap`;
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: gsrQuery,
      gsrlimit: String(Math.min(10, Math.max(2, limit))),
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: "1600",
      format: "json",
      origin: "*",
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
      headers: { "User-Agent": "MomoGenUI/1.0 (+https://localhost)" },
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            imageinfo?: Array<{
              url?: string;
              thumburl?: string;
              descriptionurl?: string;
              width?: number;
              height?: number;
              mime?: string;
              extmetadata?: {
                ObjectName?: { value?: string };
                ImageDescription?: { value?: string };
              };
            }>;
          }
        >;
      };
    };
    const pages = Object.values(data.query?.pages || {});
    const assets: NormalizedImageAsset[] = [];
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const mime = String(info.mime || "").toLowerCase();
      if (mime.includes("svg") || (mime && !mime.startsWith("image/"))) continue;
      const thumb = typeof info.thumburl === "string" ? info.thumburl.trim() : "";
      const full = typeof info.url === "string" ? info.url.trim() : "";
      const chosen = isPhotographicImageUrl(thumb)
        ? thumb
        : isPhotographicImageUrl(full)
          ? full
          : "";
      if (!chosen) continue;
      const sourceUrl =
        typeof info.descriptionurl === "string" && isSafeExternalHttpsUrl(info.descriptionurl)
          ? info.descriptionurl
          : chosen;
      const rawTitle =
        info.extmetadata?.ObjectName?.value ||
        String(p.title || "").replace(/^File:/i, "").replace(/\.[^.]+$/, "");
      const cleanCaption = rawTitle.replace(/<[^>]+>/g, "").trim().slice(0, 140) || query;
      if (
        isRejectedNonPhotoAsset(
          chosen,
          cleanCaption,
          full,
          mime,
          { width: info.width, height: info.height },
          allowLogo,
        )
      )
        continue;
      assets.push({
        id: createStableAssetId(chosen, i),
        imageUrl: chosen,
        ...(isPhotographicImageUrl(thumb) && isPhotographicImageUrl(full) && thumb !== full
          ? { thumbnailUrl: thumb, imageUrl: full }
          : {}),
        sourceUrl,
        sourceTitle: "Wikimedia Commons",
        caption: cleanCaption,
        alt: cleanCaption,
        ...(typeof info.width === "number" ? { width: info.width } : {}),
        ...(typeof info.height === "number" ? { height: info.height } : {}),
        provider: "wikimedia",
        status: "resolved",
      });
    }
    return assets.slice(0, limit);
  } catch {
    return [];
  }
}

async function searchOpenverseImages(
  query: string,
  limit: number,
  allowLogo = false,
): Promise<NormalizedImageAsset[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      page_size: String(Math.min(12, Math.max(4, limit * 2))),
      ...(allowLogo ? {} : { category: "photograph" }),
    });
    const res = await fetch(`https://api.openverse.org/v1/images/?${params.toString()}`, {
      headers: { "User-Agent": "MomoGenUI/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        id?: string;
        title?: string;
        url?: string;
        thumbnail?: string;
        foreign_landing_url?: string;
        width?: number;
        height?: number;
      }>;
    };
    const out: NormalizedImageAsset[] = [];
    for (let i = 0; i < (data.results || []).length; i++) {
      const it = data.results![i];
      const imgUrl = typeof it.url === "string" ? it.url.trim() : "";
      const thumb = typeof it.thumbnail === "string" ? it.thumbnail.trim() : "";
      const usable = isPhotographicImageUrl(imgUrl)
        ? imgUrl
        : isPhotographicImageUrl(thumb)
          ? thumb
          : "";
      if (!usable) continue;
      const sourceUrl =
        typeof it.foreign_landing_url === "string" && isSafeExternalHttpsUrl(it.foreign_landing_url)
          ? it.foreign_landing_url
          : usable;
      const caption = (it.title || query).trim().slice(0, 140);
      if (
        isRejectedNonPhotoAsset(
          usable,
          caption,
          imgUrl,
          "",
          { width: it.width, height: it.height },
          allowLogo,
        )
      )
        continue;
      out.push({
        id: it.id ? `ov_${it.id}` : createStableAssetId(usable, i),
        imageUrl: usable,
        ...(usable !== imgUrl && isPhotographicImageUrl(thumb) ? { thumbnailUrl: thumb } : {}),
        sourceUrl,
        sourceTitle: "Openverse",
        caption,
        alt: caption,
        ...(typeof it.width === "number" ? { width: it.width } : {}),
        ...(typeof it.height === "number" ? { height: it.height } : {}),
        provider: "openverse",
        status: "resolved",
      });
    }
    return out.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Independent web image retrieval pipeline: combines existing web search (Exa/Firecrawl)
 * image hits with Wikimedia Commons & Openverse photographic lookup, enforcing strict
 * HTTPS + SSRF-safe URL validation and preserving source attribution.
 */
const VECTOR_NON_PHOTO_RE = /(?:^|[^a-z])(?:logo|wordmark|brandmark|favicon|clipart|pictogram|locator[-_ ]map|world[-_ ]map|blank[-_ ]map|outline[-_ ]map|dot[-_ ]map|svg|app[-_ ]icon)(?:[^a-z]|$)/i;

function decodeHtmlUrlEntities(raw: string): string {
  return raw.replace(/&amp;/g, "&").trim();
}

function isLogoLikeImageUrl(rawUrl: string): boolean {
  return isNonPhotographicLogoOrGraphic(decodeHtmlUrlEntities(rawUrl), "", undefined, false);
}

function isRejectedNonPhotoAsset(
  primaryUrl: string,
  title = "",
  rawFullUrl = "",
  mime = "",
  dims?: { width?: number; height?: number },
  allowLogo = false,
): boolean {
  const cleanUrl = decodeHtmlUrlEntities(primaryUrl);
  if (!allowLogo && mime.toLowerCase().includes("svg")) return true;
  if (!allowLogo && !isPhotographicImageUrl(cleanUrl)) return true;
  if (allowLogo && !isLikelyImageUrl(cleanUrl)) return true;
  if (!allowLogo && rawFullUrl && /\.(?:svg|ico)(?:[?#]|$)/i.test(rawFullUrl)) return true;
  if (isNonPhotographicLogoOrGraphic(cleanUrl, title, dims, allowLogo)) return true;
  if (!allowLogo && title && VECTOR_NON_PHOTO_RE.test(title)) return true;
  if (!allowLogo && VECTOR_NON_PHOTO_RE.test(cleanUrl)) return true;
  if (!allowLogo && typeof dims?.width === "number" && dims.width > 0 && dims.width < 300) return true;
  if (!allowLogo && typeof dims?.height === "number" && dims.height > 0 && dims.height < 200) return true;
  return false;
}

async function searchWikipediaPageImages(
  query: string,
  limit: number,
  allowLogo = false,
  externalSignal?: AbortSignal,
): Promise<NormalizedImageAsset[]> {
  const fetchLang = async (lang: "en" | "id"): Promise<NormalizedImageAsset[]> => {
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        query,
      )}&gsrlimit=${Math.min(6, Math.max(3, limit))}&prop=pageimages|info&inprop=url&piprop=original|thumbnail&pithumbsize=1200&format=json&origin=*`;
      const res = await fetch(url, {
        headers: { "User-Agent": "MomoBot/1.0 (+https://momo.local)", Accept: "application/json" },
        signal: combineTimeoutSignal(3200, externalSignal),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              pageid?: number;
              title?: string;
              fullurl?: string;
              original?: { source?: string; width?: number; height?: number };
              thumbnail?: { source?: string; width?: number; height?: number };
            }
          >;
        };
      };
      const pages = Object.values(data.query?.pages ?? {});
      const out: NormalizedImageAsset[] = [];
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const orig = p.original?.source || "";
        const thumb = p.thumbnail?.source || "";
        const bestUrl = isLikelyImageUrl(orig) ? orig : isLikelyImageUrl(thumb) ? thumb : "";
        if (!bestUrl) continue;
        const w = p.original?.width || p.thumbnail?.width;
        const h = p.original?.height || p.thumbnail?.height;
        if (isRejectedNonPhotoAsset(bestUrl, p.title || "", "", "", { width: w, height: h }, allowLogo)) {
          continue;
        }
        out.push({
          id: createStableAssetId(bestUrl, i),
          imageUrl: bestUrl,
          thumbnailUrl: thumb && thumb !== bestUrl ? thumb : undefined,
          sourceUrl: p.fullurl || `https://${lang}.wikipedia.org/?curid=${p.pageid ?? ""}`,
          sourceTitle: p.title || query,
          caption: p.title || query,
          alt: p.title || query,
          width: w,
          height: h,
          provider: "wikimedia",
          status: "resolved",
        });
      }
      return out;
    } catch {
      return [];
    }
  };

  const [enHits, idHits] = await Promise.all([fetchLang("en"), fetchLang("id")]);
  return [...enHits, ...idHits];
}

async function extractOgImageFromPage(
  pageUrl: string,
  externalSignal?: AbortSignal
): Promise<string | null> {
  if (!isSafeExternalHttpsUrl(pageUrl)) return null;
  try {
    let currentUrl = pageUrl;
    let res: Response | null = null;
    for (let hop = 0; hop < 3; hop++) {
      if (!isSafeExternalHttpsUrl(currentUrl)) return null;
      const attempt = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: combineTimeoutSignal(2600, externalSignal),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml;q=0.9",
        },
      });
      if (attempt.status >= 300 && attempt.status < 400) {
        void attempt.body?.cancel().catch(() => {});
        const loc = attempt.headers.get("location");
        if (!loc) return null;
        currentUrl = new URL(loc, currentUrl).toString();
        continue;
      }
      res = attempt;
      break;
    }
    if (!res || !res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ct)) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let html = "";
    while (html.length < 32000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    void reader.cancel().catch(() => {});

    const patterns = [
      /<meta[^>]+(?:property|name)=["'](?:og:image:secure_url|og:image|twitter:image:src|twitter:image)["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image:secure_url|og:image|twitter:image:src|twitter:image)["']/i,
    ];
    for (const re of patterns) {
      const m = re.exec(html);
      const rawCand = decodeHtmlUrlEntities(m?.[1] || "");
      if (!rawCand) continue;
      const absUrl = new URL(rawCand, currentUrl).toString();
      if (isPhotographicImageUrl(absUrl) && !isRejectedNonPhotoAsset(absUrl)) {
        return absUrl;
      }
    }
    return null;
  } catch {
    return null;
  }
}

const IMAGE_QUERY_STOPWORDS = new Set([
  "dan",
  "atau",
  "yang",
  "untuk",
  "dengan",
  "dari",
  "pada",
  "ke",
  "di",
  "the",
  "and",
  "or",
  "for",
  "with",
  "from",
  "of",
  "in",
  "at",
  "on",
  "to",
  "foto",
  "photo",
  "photos",
  "picture",
  "image",
  "images",
  "gambar",
  "interior",
  "exterior",
  "view",
]);

function countImageTokenHits(asset: NormalizedImageAsset, tokens: string[]): number {
  return countImageAssetTokenHits(asset, tokens);
}

const LOW_SIGNAL_IMAGE_HOST_RE =
  /(?:^|\.)(?:qoo10|shopee|tokopedia|bukalapak|lazada|blibli|olx|carousell|scribd|slideshare|coursehero|studocu|123rf|depositphotos|dreamstime|alamy|vecteezy|shutterstock)\./i;

function isLowSignalImageHost(asset: NormalizedImageAsset): boolean {
  const hostA = getHostname(asset.imageUrl);
  const hostB = getHostname(asset.sourceUrl);
  return LOW_SIGNAL_IMAGE_HOST_RE.test(hostA) || LOW_SIGNAL_IMAGE_HOST_RE.test(hostB);
}

/* image dedup helpers re-exported from @/lib/imageAssetContract */

function isPromoBannerOrWatermark(asset: NormalizedImageAsset): boolean {
  const hay = `${asset.imageUrl} ${asset.caption || ""} ${asset.sourceTitle || ""}`.toLowerCase();
  return /(?:akcdn\.detik|detikcom.*logo|promo-banner|coming-soon|placeholder|default-og|share-image|watermark|shutterstock|123rf|depositphotos|dreamstime|alamy)/i.test(
    hay,
  );
}

function stableUrlHash(raw: string): number {
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const UNREQUESTED_TRANSIT_SUBENTITY_RE =
  /\b(?:stasiun|station|halte|transjakarta|busway|bus\s+stop|railway|railroad|commuter\s+line|platform\s+\d+|terminal|mrt|lrt|krl)\b/i;

const GENERIC_STOCK_PHOTO_HOST_RE =
  /(?:^|\.)(?:pexels\.com|pixabay\.com|freepik\.com|vecteezy\.com|shutterstock\.com|istockphoto\.com|dreamstime\.com|depositphotos\.com|123rf\.com|alamy\.com|gettyimages\.com)$/i;

const VENUE_TYPE_CONFLICT_PAIRS: Array<[RegExp, RegExp]> = [
  [/\b(?:stadium|stadion|arena)\b/i, /\b(?:expo|fair|mall|plaza|hotel|hospital|airport|bandara)\b/i],
  [/\b(?:museum|gallery|galeri)\b/i, /\b(?:hotel|mall|airport|bandara|stadium|stadion)\b/i],
  [/\b(?:beach|pantai)\b/i, /\b(?:mall|airport|bandara|stadium|stadion|hospital)\b/i],
];

function normalizeSubjectLabel(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .replace(/^(?:file|berkas)\s*:\s*/i, "")
    .replace(/\.(?:jpe?g|png|webp|avif)$/i, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function hasUnrequestedTransitDrift(
  asset: NormalizedImageAsset,
  parsedTokens: ReturnType<typeof extractDistinctiveQueryTokens>,
): boolean {
  const queryText = parsedTokens.all.join(" ");
  if (UNREQUESTED_TRANSIT_SUBENTITY_RE.test(queryText)) return false;
  const assetText = `${asset.caption || ""} ${asset.sourceTitle || ""} ${asset.sourceUrl || ""} ${asset.imageUrl || ""}`
    .replace(/[\/_.-]+/g, " ");
  return UNREQUESTED_TRANSIT_SUBENTITY_RE.test(assetText);
}

function hasVenueTypeConflict(
  asset: NormalizedImageAsset,
  parsedTokens: ReturnType<typeof extractDistinctiveQueryTokens>,
): boolean {
  const queryText = parsedTokens.all.join(" ");
  const assetText = `${asset.caption || ""} ${asset.sourceTitle || ""} ${asset.sourceUrl || ""}`.replace(/[\/_.-]+/g, " ");
  for (const [queryTypeRe, conflictTypeRe] of VENUE_TYPE_CONFLICT_PAIRS) {
    if (queryTypeRe.test(queryText) && !queryTypeRe.test(assetText) && conflictTypeRe.test(assetText)) {
      return true;
    }
  }
  return false;
}

function isAssetContextuallyRelevant(
  asset: NormalizedImageAsset,
  parsedTokens: ReturnType<typeof extractDistinctiveQueryTokens>,
): boolean {
  if (isLowSignalImageHost(asset)) return false;
  if (hasVenueTypeConflict(asset, parsedTokens)) return false;
  if (hasUnrequestedTransitDrift(asset, parsedTokens)) return false;
  return isImageAssetContextuallyRelevant(asset, parsedTokens);
}

function scoreImageRelevance(
  asset: NormalizedImageAsset,
  parsedTokens: ReturnType<typeof extractDistinctiveQueryTokens>,
): number {
  const isWeb =
    asset.provider === "tinyfish" || asset.provider === "exa" || asset.provider === "firecrawl";
  const distinctiveHits = countImageTokenHits(asset, parsedTokens.distinctive);
  const modifierHits = countImageTokenHits(asset, parsedTokens.modifiers);
  let score = isWeb ? 1.5 : 0;

  if (parsedTokens.distinctive.length > 0 && distinctiveHits === 0) {
    return -100;
  }

  score += distinctiveHits * (isWeb ? 4.2 : 4.0) + modifierHits * 1.4;
  if (distinctiveHits >= 2) score += 3;
  if (
    parsedTokens.distinctive.length >= 2 &&
    distinctiveHits === parsedTokens.distinctive.length
  ) {
    score += 4.5;
  }

  const normQuery = normalizeSubjectLabel(parsedTokens.distinctive.join(" "));
  const normCaption = normalizeSubjectLabel(asset.caption || asset.sourceTitle || "");
  if (normQuery && normCaption && (normCaption === normQuery || normCaption.startsWith(`${normQuery} `))) {
    score += 7;
  }

  if (
    /\.(?:jpe?g|webp|avif)(?:[?#]|$)/i.test(asset.imageUrl) ||
    /(?:images\.unsplash|lh3\.googleusercontent|cloudinary|tripadvisor|traveloka|wikimedia|ticketm\.net)/i.test(asset.imageUrl)
  ) {
    score += 1;
  }
  if (/wikipedia\.org\/wiki\//i.test(asset.sourceUrl)) {
    score += 2.5;
  }
  try {
    const imgHost = new URL(asset.imageUrl).hostname.toLowerCase();
    const isStockCaption = /\bfree\s+stock\s+photo\b/i.test(asset.caption || asset.sourceTitle || "");
    if (
      parsedTokens.distinctive.length >= 1 &&
      (GENERIC_STOCK_PHOTO_HOST_RE.test(imgHost) || isStockCaption)
    ) {
      score -= 14;
    }
  } catch {
    // ignore malformed URL
  }
  if (/\/api\/wm\//i.test(asset.imageUrl)) {
    score -= 10;
  }
  if (isPromoBannerOrWatermark(asset)) {
    score -= 6;
  }
  if (isLogoLikeImageUrl(asset.imageUrl)) {
    score -= 12;
  }
  return score;
}

async function collectImagesForQuery(
  query: string,
  limit: number,
  signal?: AbortSignal,
  allowLogo = false,
): Promise<{ assets: NormalizedImageAsset[]; providers: Set<ImageProviderName> }> {
  const cleanSearchQuery = distillVisualSearchQuery(query) || query.trim();
  const webPhotoQuery = cleanSearchQuery;

  const [wikiRes, wpPageRes, openverseRes, webRes] = await Promise.all([
    searchWikimediaImages(cleanSearchQuery, limit, allowLogo),
    searchWikipediaPageImages(cleanSearchQuery, limit, allowLogo, signal),
    searchOpenverseImages(cleanSearchQuery, limit, allowLogo),
    runWebSearch({
      query: webPhotoQuery,
      numResults: Math.min(8, Math.max(5, limit)),
      provider: "auto",
      signal,
    }).catch(() => ({
      query: webPhotoQuery,
      providersUsed: [],
      results: [],
      sources: [],
    })),
  ]);

  const webImageAssets: NormalizedImageAsset[] = [];
  const pagesNeedingOg: WebSearchResultItem[] = [];

  for (let i = 0; i < webRes.results.length; i++) {
    const r = webRes.results[i];
    const cleanImgUrl = r.imageUrl ? decodeHtmlUrlEntities(r.imageUrl) : "";
    if (
      cleanImgUrl &&
      (allowLogo ? isLikelyImageUrl(cleanImgUrl) : isPhotographicImageUrl(cleanImgUrl)) &&
      !isRejectedNonPhotoAsset(cleanImgUrl, r.title, "", "", undefined, allowLogo)
    ) {
      webImageAssets.push({
        id: createStableAssetId(cleanImgUrl, i),
        imageUrl: cleanImgUrl,
        sourceUrl: isSafeExternalHttpsUrl(r.url) ? r.url : cleanImgUrl,
        sourceTitle: r.title,
        caption: r.title || "",
        alt: r.title || "",
        provider: r.provider,
        status: "resolved",
      });
    } else if (isSafeExternalHttpsUrl(r.url)) {
      pagesNeedingOg.push(r);
    }
  }

  // Extract verified og:image from top search pages when search result omits imageUrl
  if (webImageAssets.length < 4 && pagesNeedingOg.length > 0) {
    const ogHits = await Promise.all(
      pagesNeedingOg.slice(0, 4).map(async (page, idx) => {
        const ogUrl = await extractOgImageFromPage(page.url, signal);
        if (!ogUrl) return null;
        if (isRejectedNonPhotoAsset(ogUrl, page.title || "", "", "", undefined, allowLogo)) {
          return null;
        }
        return {
          id: createStableAssetId(ogUrl, 100 + idx),
          imageUrl: ogUrl,
          sourceUrl: page.url,
          sourceTitle: page.title,
          caption: page.title || "",
          alt: page.title || "",
          provider: page.provider,
          status: "resolved" as const,
        };
      })
    );
    for (const hit of ogHits) {
      if (hit) webImageAssets.push(hit);
    }
  }

  const parsedTokens = extractDistinctiveQueryTokens(cleanSearchQuery);

  // Strict context-relevance gate: never bypass relevance check with soft modifier-only fallbacks.
  const relevantCommons = [...wpPageRes, ...wikiRes, ...openverseRes].filter((asset) =>
    isAssetContextuallyRelevant(asset, parsedTokens),
  );
  const relevantWeb = webImageAssets.filter((asset) =>
    isAssetContextuallyRelevant(asset, parsedTokens),
  );

  const combined = [...relevantWeb, ...relevantCommons];
  combined.sort((a, b) => {
    const diff = scoreImageRelevance(b, parsedTokens) - scoreImageRelevance(a, parsedTokens);
    if (Math.abs(diff) > 0.001) return diff;
    return stableUrlHash(a.imageUrl) - stableUrlHash(b.imageUrl);
  });

  const seen = new Set<string>();
  const assets: NormalizedImageAsset[] = [];
  const providers = new Set<ImageProviderName>();

  for (const asset of combined) {
    if (
      isRejectedNonPhotoAsset(
        asset.imageUrl,
        asset.caption || asset.alt,
        "",
        "",
        { width: asset.width, height: asset.height },
        allowLogo,
      )
    ) {
      continue;
    }
    const urlKey = normalizeImageDedupKey(asset.imageUrl);
    const stemKey = extractImageAssetStem(asset.thumbnailUrl || asset.imageUrl);
    const fullStemKey = extractImageAssetStem(asset.imageUrl);
    if (seen.has(urlKey) || seen.has(stemKey) || seen.has(fullStemKey)) continue;
    seen.add(urlKey);
    seen.add(stemKey);
    seen.add(fullStemKey);
    assets.push(asset);
    providers.add(asset.provider);
  }

  return { assets, providers };
}

interface ServerCachedImageSearch {
  expiresAt: number;
  response: ImageSearchResponse;
}

const SERVER_IMAGE_HIT_TTL_MS = 6 * 60 * 60_000;
const SERVER_IMAGE_MISS_TTL_MS = 5 * 60_000;
const SERVER_IMAGE_CACHE_MAX = 400;

declare global {
  // eslint-disable-next-line no-var
  var __momoImageSearchCache: Map<string, ServerCachedImageSearch> | undefined;
  // eslint-disable-next-line no-var
  var __momoImageSearchInflight: Map<string, Promise<ImageSearchResponse>> | undefined;
}

function getServerImageSearchCache(): Map<string, ServerCachedImageSearch> {
  if (!globalThis.__momoImageSearchCache) {
    globalThis.__momoImageSearchCache = new Map<string, ServerCachedImageSearch>();
  }
  return globalThis.__momoImageSearchCache;
}

function getServerImageSearchInflight(): Map<string, Promise<ImageSearchResponse>> {
  if (!globalThis.__momoImageSearchInflight) {
    globalThis.__momoImageSearchInflight = new Map<string, Promise<ImageSearchResponse>>();
  }
  return globalThis.__momoImageSearchInflight;
}

export async function runImageSearch(opts: {
  query: string;
  fallbackQuery?: string;
  contextAnchor?: string;
  limit?: number;
  isRetry?: boolean;
  signal?: AbortSignal;
}): Promise<ImageSearchResponse> {
  const rawQuery = opts.query.trim();
  const rawLimit =
    typeof opts.limit === "number" && Number.isFinite(opts.limit) ? opts.limit : 6;
  const limit = Math.max(1, Math.min(10, Math.round(rawLimit)));

  if (!rawQuery || isGenericPlaceholderQuery(rawQuery)) {
    return { query: "", providersUsed: [], assets: [], sources: [], error: "Empty image query" };
  }

  const allowLogo = wantsExplicitLogoQuery(rawQuery);
  const query = distillVisualSearchQuery(rawQuery, opts.contextAnchor) || rawQuery;
  const cacheKey = `v6::${allowLogo ? "logo" : "photo"}::${query.toLowerCase()}::${(opts.fallbackQuery || "").trim().toLowerCase()}::${limit}`;
  const cache = getServerImageSearchCache();

  if (!opts.isRetry) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.response;
    }
    if (cached) cache.delete(cacheKey);
  }

  const inflight = getServerImageSearchInflight();
  if (!opts.isRetry) {
    const pending = inflight.get(cacheKey);
    if (pending) return pending;
  }

  const execute = async (): Promise<ImageSearchResponse> => {
    const fetchLimit = opts.isRetry ? Math.min(10, limit + 4) : Math.max(limit, 6);
    const primary = await collectImagesForQuery(query, fetchLimit, opts.signal, allowLogo);
    const seen = new Set<string>();
    const merged: NormalizedImageAsset[] = [];
    for (const a of primary.assets) {
      const k1 = normalizeImageDedupKey(a.imageUrl);
      const k2 = extractImageAssetStem(a.thumbnailUrl || a.imageUrl);
      const k3 = extractImageAssetStem(a.imageUrl);
      if (seen.has(k1) || seen.has(k2) || seen.has(k3)) continue;
      seen.add(k1);
      seen.add(k2);
      seen.add(k3);
      merged.push(a);
    }
    const providersSet = new Set(primary.providers);

    // Focused fallback preserving distinctive proper nouns when primary returns < 2 photos
    if (merged.filter((a) => allowLogo || !isLogoLikeImageUrl(a.imageUrl)).length < (opts.isRetry ? 4 : 2)) {
      const fallbackCandidates: string[] = [];
      const cleanFallback = (opts.fallbackQuery || "").trim();
      if (cleanFallback && !isGenericPlaceholderQuery(cleanFallback)) {
        const distilledFb = distillVisualSearchQuery(cleanFallback, opts.contextAnchor);
        if (distilledFb) fallbackCandidates.push(distilledFb);
      }
      const strippedWords = query
        .replace(/[()[\],/|·–—-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);
      const distinctTokens = strippedWords.filter(
        (w) => w.length >= 2 && !IMAGE_QUERY_STOPWORDS.has(w.toLowerCase()),
      );
      if (distinctTokens.length >= 2) {
        const capitalizedFirst = distinctTokens.filter((w) => /^[A-Z0-9]/.test(w));
        const focused = (capitalizedFirst.length >= 2 ? capitalizedFirst : distinctTokens)
          .slice(0, 4)
          .join(" ");
        if (focused && !isGenericPlaceholderQuery(focused)) {
          fallbackCandidates.push(focused);
        }
      }

      for (const fb of fallbackCandidates) {
        if (fb.toLowerCase() === query.toLowerCase()) continue;
        const secondary = await collectImagesForQuery(fb, fetchLimit, opts.signal, allowLogo);
        // `collectImagesForQuery` already gated these on the focused query's own tokens. Re-gating
        // them on the long original query rejected everything a descriptive query could find
        // ("Raja Ampat underwater diving marine life coral reef" → 0 photos); the vision rerank
        // below still scores every survivor against the original query and context.
        for (const a of secondary.assets) {
          const k1 = normalizeImageDedupKey(a.imageUrl);
          const k2 = extractImageAssetStem(a.thumbnailUrl || a.imageUrl);
          const k3 = extractImageAssetStem(a.imageUrl);
          if (seen.has(k1) || seen.has(k2) || seen.has(k3)) continue;
          seen.add(k1);
          seen.add(k2);
          seen.add(k3);
          merged.push(a);
          providersSet.add(a.provider);
        }
        if (merged.length >= fetchLimit) break;
      }
    }

    const sortedAssets = merged.sort(
      (a, b) => (isLogoLikeImageUrl(a.imageUrl) ? 1 : 0) - (isLogoLikeImageUrl(b.imageUrl) ? 1 : 0),
    );

    let finalAssets = (
      opts.isRetry && sortedAssets.length > limit
        ? [...sortedAssets.slice(1), sortedAssets[0]]
        : sortedAssets
    ).slice(0, limit);

    // Vision rerank: metadata token-matching can't tell a generic stock photo
    // from a contextually right one. Score top candidates visually and drop
    // anything below the relevance floor — an honest empty result beats a
    // confidently wrong image.
    const VISION_MIN_SCORE = 4;
    const VISION_FALLBACK_SCORE = 3;
    if (!allowLogo && finalAssets.length > 0) {
      const reranked = await rerankAssetsWithVision(finalAssets, {
        query,
        contextAnchor: opts.contextAnchor,
        signal: opts.signal,
      }).catch(() => null);
      if (reranked && reranked.scoredCount > 0) {
        const kept = reranked.assets.filter(
          (a) => a.visionScore === undefined || a.visionScore >= VISION_MIN_SCORE,
        );
        const scoredKept = kept.filter((a) => a.visionScore !== undefined);
        if (scoredKept.length === 0) {
          // Everything failed the floor: keep the single best candidate only
          // when it clears a minimal bar, else return an honest empty result.
          const best = reranked.assets.find((a) => a.visionScore !== undefined);
          finalAssets =
            best && (best.visionScore ?? 0) >= VISION_FALLBACK_SCORE
              ? [best]
              : [];
        } else {
          finalAssets = kept.slice(0, limit);
        }
      }
    }

    const sources: SourceItem[] = finalAssets.slice(0, 5).map((a) => ({
      title: a.caption || a.sourceTitle || query,
      url: a.sourceUrl,
      description: `${a.provider} image asset`,
      snippet: a.caption,
      domain: getHostname(a.sourceUrl),
      imageUrl: a.thumbnailUrl || a.imageUrl,
    }));

    const response: ImageSearchResponse = {
      query,
      providersUsed: Array.from(providersSet),
      assets: finalAssets,
      sources,
      ...(finalAssets.length === 0 ? { error: "Tidak ada gambar terverifikasi ditemukan." } : {}),
    };

    if (!opts.isRetry) {
      if (cache.size >= SERVER_IMAGE_CACHE_MAX) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
      }
      cache.set(cacheKey, {
        expiresAt:
          Date.now() +
          (finalAssets.length > 0 ? SERVER_IMAGE_HIT_TTL_MS : SERVER_IMAGE_MISS_TTL_MS),
        response,
      });
    }

    return response;
  };

  const promise = execute().finally(() => {
    inflight.delete(cacheKey);
  });

  if (!opts.isRetry) {
    inflight.set(cacheKey, promise);
  }
  return promise;
}
