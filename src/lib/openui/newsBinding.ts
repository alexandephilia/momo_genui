/**
 * NewsFeed articles are written by the model, but their link, outlet, date and photo must
 * come from this turn's search results. This binds each article to the source it cites and
 * drops whatever cannot be traced back to one.
 */

export interface NewsArticle {
  headline: string;
  summary?: string;
  url?: string;
  outlet?: string;
  publishedAt?: string;
  imageUrl?: string;
  tag?: string;
}

export interface NewsSourceLike {
  title?: string;
  url: string;
  domain?: string;
  description?: string;
  snippet?: string;
  publishedDate?: string;
  articleImageUrl?: string;
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

function hostOf(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Host + path, so tracking params, fragments and a trailing slash do not break a match. */
function urlKey(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const path = decodeURIComponent(u.pathname).replace(/\/+$/, "").toLowerCase();
    return `${u.hostname.replace(/^www\./i, "").toLowerCase()}${path}`;
  } catch {
    return "";
  }
}

const squash = (v: string): string => v.toLowerCase().replace(/[^a-z0-9]+/g, "");

const GENERIC_HOST_LABELS = new Set([
  "www", "m", "amp", "mobile", "news", "berita", "nasional", "money", "finance", "bisnis",
  "com", "net", "org", "co", "id", "go", "ac", "or", "web", "my", "biz", "info", "tv", "uk",
]);

/** The labels of a hostname that name the publisher: `news.okezone.com` -> ["okezone"]. */
function publisherLabels(host: string): string[] {
  return host
    .toLowerCase()
    .split(".")
    .filter((label) => label.length >= 3 && !GENERIC_HOST_LABELS.has(label));
}

function outletMatchesHost(outlet: string, host: string): boolean {
  const want = squash(outlet);
  if (want.length < 3) return false;
  return publisherLabels(host).some((label) => want.includes(label) || label.includes(want));
}

/** Reads the model's article list, accepting the usual aliases. Never keeps a model-supplied photo. */
export function normalizeNewsArticles(raw: unknown): NewsArticle[] {
  if (!Array.isArray(raw)) return [];
  const out: NewsArticle[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      if (item.trim()) out.push({ headline: item.trim() });
      continue;
    }
    const r = record(item);
    const headline = text(r.headline) || text(r.title) || text(r.name);
    if (!headline) continue;
    const url = text(r.url) || text(r.link) || text(r.sourceUrl) || text(r.href);
    const summary = text(r.summary) || text(r.description) || text(r.excerpt) || text(r.body);
    const outlet = text(r.outlet) || text(r.source) || text(r.publisher);
    const publishedAt = text(r.publishedAt) || text(r.publishedDate) || text(r.date) || text(r.time);
    const tag = text(r.tag) || text(r.category);
    out.push({
      headline,
      ...(summary ? { summary } : {}),
      ...(/^https?:\/\//i.test(url) ? { url } : {}),
      ...(outlet ? { outlet } : {}),
      ...(publishedAt ? { publishedAt } : {}),
      ...(tag ? { tag } : {}),
    });
  }
  return out;
}

/**
 * Decides what each article may link to and show:
 * 1. its `url` is one of this turn's sources: take that source's link, date and photo;
 * 2. its `url` is quoted inside a source's text (an index page listing it): keep the link;
 * 3. it has no `url` (native search grounding hands the model none) and exactly one source
 *    belongs to its outlet: link that source;
 * 4. anything else keeps its text and loses the link, so nothing clickable is unverified.
 * A photo only ever comes from the matched source.
 */
export function bindNewsArticlesToSources(
  articles: NewsArticle[],
  sources: NewsSourceLike[] | undefined,
): NewsArticle[] {
  const pool = (sources ?? []).filter((s) => /^https?:\/\//i.test(s.url));
  const byKey = new Map<string, NewsSourceLike>();
  for (const s of pool) {
    const key = urlKey(s.url);
    if (key && !byKey.has(key)) byKey.set(key, s);
  }
  const hostOfSource = (s: NewsSourceLike) => (s.domain || hostOf(s.url)).replace(/^www\./i, "").toLowerCase();

  const used = new Set<NewsSourceLike>();
  return articles.map((art) => {
    const { url: claimedUrl, imageUrl: _claimedImage, ...rest } = art;
    let match = claimedUrl ? byKey.get(urlKey(claimedUrl)) : undefined;
    if (!match && claimedUrl) {
      const quoted = pool.some((s) => `${s.snippet ?? ""}\n${s.description ?? ""}`.includes(claimedUrl));
      return quoted ? { ...rest, url: claimedUrl } : rest;
    }
    if (!match && art.outlet) {
      const sameOutlet = pool.filter((s) => outletMatchesHost(art.outlet as string, hostOfSource(s)));
      if (sameOutlet.length === 1 && !used.has(sameOutlet[0])) match = sameOutlet[0];
    }
    if (!match) return rest;
    used.add(match);
    const outlet = art.outlet || hostOfSource(match);
    const publishedAt = art.publishedAt || match.publishedDate;
    return {
      ...rest,
      url: match.url,
      ...(outlet ? { outlet } : {}),
      ...(publishedAt ? { publishedAt } : {}),
      ...(match.articleImageUrl ? { imageUrl: match.articleImageUrl } : {}),
    };
  });
}
