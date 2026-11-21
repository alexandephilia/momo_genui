import { extractImageAssetStem, normalizeImageDedupKey } from "@/lib/imageAssetContract";

/**
 * Turn/session-scoped registry of image URLs that were actually verified by
 * the backend (`search_images` tool results, board hydration). Model-authored
 * `image`/`imageUrl` props are checked against this pool: an external image
 * URL that was never verified gets rejected at render time and the component
 * falls back to query resolution instead of showing a hallucinated/wrong photo.
 *
 * The pool only ever grows (bounded) — it whitelists, never blacklists, so a
 * stale entry can only *allow* a URL, never wrongly reject a legit one.
 */

const POOL_MAX = 1200;
const POOL_STORAGE_KEY = "momo-verified-images-v1";
const verifiedKeys = new Set<string>();
// Raw URLs verified in this page session, for near-miss repair (not persisted).
const verifiedUrls = new Set<string>();
// Same photo, other address: models rewrite CDN variants (thumb.wikimedia.org/…/1920px-X.jpg →
// upload.wikimedia.org/…/X.jpg). The asset stem identifies the photo across those variants.
const verifiedByStem = new Map<string, string>();

function stemOf(raw: string): string {
  try {
    const stem = extractImageAssetStem(raw);
    return /^(?:stem|hash|uuid):/.test(stem) ? stem : "";
  } catch {
    return "";
  }
}
let hydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function hydratePool(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(POOL_STORAGE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    for (const k of arr) {
      if (typeof k === "string" && k) verifiedKeys.add(k);
    }
  } catch {
    // corrupted storage — start fresh
  }
}

function schedulePersist(): void {
  if (typeof window === "undefined") return;
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      window.localStorage.setItem(
        POOL_STORAGE_KEY,
        JSON.stringify([...verifiedKeys].slice(-POOL_MAX)),
      );
    } catch {
      // storage full / private mode — pool stays in-memory
    }
  }, 400);
}

function keyOf(raw: string): string {
  const clean = (raw || "").trim();
  if (!clean) return "";
  try {
    return normalizeImageDedupKey(clean);
  } catch {
    return clean.split("?")[0].toLowerCase();
  }
}

export function recordVerifiedImageUrls(urls: Array<string | undefined | null>): void {
  hydratePool();
  for (const raw of urls) {
    const key = keyOf(raw || "");
    if (!key) continue;
    if (raw && /^https?:\/\//i.test(raw.trim())) {
      if (verifiedUrls.size >= POOL_MAX) {
        const oldestUrl = verifiedUrls.values().next().value;
        if (oldestUrl !== undefined) verifiedUrls.delete(oldestUrl);
      }
      verifiedUrls.add(raw.trim());
      const stem = stemOf(raw);
      if (stem) {
        verifiedKeys.add(stem);
        if (!verifiedByStem.has(stem)) verifiedByStem.set(stem, raw.trim());
      }
    }
    if (verifiedKeys.size >= POOL_MAX) {
      const oldest = verifiedKeys.values().next().value;
      if (oldest !== undefined) verifiedKeys.delete(oldest);
    }
    verifiedKeys.add(key);
  }
  schedulePersist();
}

/**
 * Returns true when `raw` is safe to render as a direct external image.
 * Internal/proxied/data URLs always pass; external URLs pass only when the
 * pool is empty (nothing verified yet this session) or the URL was verified.
 */
/** Edit distance, abandoned as soon as it exceeds `max`. */
function boundedEditDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (row[j] < best) best = row[j];
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

/**
 * Models copy long image URLs character by character and sometimes get one or two wrong.
 * Returns the verified URL to render for `raw`: itself when verified, the verified URL it was
 * evidently copied from when it differs by at most two characters, or "" when unverified.
 */
export function resolveVerifiedImageUrl(raw: string): string {
  const clean = (raw || "").trim();
  if (!clean) return "";
  if (isDirectImageUrlAllowed(clean)) {
    // Verified only as a variant of a known photo: render the address that was actually checked.
    if (verifiedKeys.has(keyOf(clean))) return clean;
    return verifiedByStem.get(stemOf(clean)) ?? clean;
  }
  if (clean.length < 40) return "";
  const head = clean.slice(0, 24);
  for (const candidate of verifiedUrls) {
    if (!candidate.startsWith(head)) continue;
    if (boundedEditDistance(clean, candidate, 2) <= 2) return candidate;
  }
  return "";
}

/** Replaces near-miss copies of verified image URLs inside `text` with the verified URL. */
export function repairImageUrlsInText(text: string): string {
  if (!text || verifiedUrls.size === 0 || !text.includes("http")) return text;
  return text.replace(/https?:\/\/[^\s"'<>\\)]+/g, (url) => {
    if (verifiedUrls.has(url)) return url;
    const fixed = resolveVerifiedImageUrl(url);
    return fixed && fixed !== url && verifiedUrls.has(fixed) ? fixed : url;
  });
}

export function isDirectImageUrlAllowed(raw: string): boolean {
  hydratePool();
  const clean = (raw || "").trim();
  if (!clean) return false;
  if (clean.startsWith("/api/image") || clean.startsWith("data:")) return true;
  if (!/^https?:\/\//i.test(clean)) return true;
  if (verifiedKeys.size === 0) return true;
  if (verifiedKeys.has(keyOf(clean))) return true;
  const stem = stemOf(clean);
  return Boolean(stem && verifiedKeys.has(stem));
}
