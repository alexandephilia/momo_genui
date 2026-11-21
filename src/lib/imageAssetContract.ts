export type ImageAssetStatus =
  | "pending"
  | "searching"
  | "resolved"
  | "loading"
  | "ready"
  | "error";

export type ImageProviderName =
  | "tinyfish"
  | "exa"
  | "firecrawl"
  | "wikimedia"
  | "openverse"
  | "bound";

export interface NormalizedImageAsset {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  sourceUrl: string;
  sourceTitle?: string;
  caption?: string;
  alt: string;
  width?: number;
  height?: number;
  provider: ImageProviderName;
  status: ImageAssetStatus;
  error?: string;
  visionScore?: number;
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fc00:/i,
  /^\[?fd00:/i,
  /\.local$/i,
  /\.internal$/i,
  /\.localhost$/i,
];

/**
 * Validates that a candidate external URL is strict HTTPS and does not target
 * loopback, RFC1918 private ranges, link-local metadata endpoints, or internal hosts.
 */
export function isSafeExternalHttpsUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (!host || !host.includes(".")) return false;
    if (PRIVATE_HOST_PATTERNS.some((re) => re.test(host))) return false;
    return true;
  } catch {
    return false;
  }
}

const NON_IMAGE_PAGE_EXT = /\.(?:html?|php|aspx?|jsp|pdf|xml|json)(?:[?#]|$)/i;
const NON_IMAGE_PAGE_ROUTE = /(?:^|\.)(?:youtube\.com\/(?:watch|playlist|channel|shorts|@)|youtu\.be\/|open\.spotify\.com\/(?:artist|track|album|playlist)|(?:en|id|commons)\.wikimedia\.org\/wiki\/|(?:en|id)\.wikipedia\.org\/wiki\/|(?:tiktok|instagram|facebook|reddit|x|twitter)\.com\/)/i;
const VECTOR_OR_ICON_EXT = /\.(?:svg|ico)(?:[?#]|$)/i;

/**
 * Rejects obvious HTML/document page URLs when a provider mixes webpage links
 * with actual image URLs.
 */
export function isLikelyImageUrl(raw: string): boolean {
  if (!isSafeExternalHttpsUrl(raw)) return false;
  try {
    const clean = raw.trim();
    const parsed = new URL(clean);
    if (NON_IMAGE_PAGE_EXT.test(parsed.pathname)) return false;
    if (NON_IMAGE_PAGE_ROUTE.test(`${parsed.hostname}${parsed.pathname}`)) return false;
    return true;
  } catch {
    return false;
  }
}

const EXPLICIT_LOGO_QUERY_RE =
  /\b(?:logo|logos|lambang|ikon|icon|simbol|emblem|brandmark|wordmark|logotype|maskot|bendera|coat\s+of\s+arms)\b/i;

/**
 * Returns `true` ONLY when the query explicitly asks for a logo, icon, emblem, or brandmark.
 * Otherwise, places/venues, transport, events, and dishes MUST resolve to real photographs.
 */
export function wantsExplicitLogoQuery(rawQuery?: string): boolean {
  return EXPLICIT_LOGO_QUERY_RE.test(rawQuery || "");
}

const TRANSPORT_SUBJECT_RE =
  /\b(?:mrt|lrt|krl|commuter(?:\s*line)?|whoosh|kereta|railink|transjakarta|busway|jaklingko|mikrotrans|shuttle|bus|damri|halte|terminal\s+bus|pesawat|maskapai|garuda|citilink|airasia|ferry|kapal|pelabuhan|taksi|bluebird|stasiun\s+(?:mrt|lrt|krl|kereta|whoosh))\b/i;

const PLACE_OR_VENUE_SUBJECT_RE =
  /\b(?:gedung|stadion|stadium|jis|gbk|senayan|arena|hall|convention|ice\s+bsd|velodrome|ancol|hotel|resort|villa|apartemen|aston|mercure|novotel|santika|favehotel|swiss-bel|ibis|pullman|mulia|fairmont|ritz|marriott|hilton|stasiun|terminal|bandara|airport|mall|plaza|taman|museum|masjid|gereja|candi|pura|pantai|gunung|danau|pulau|restoran|warung|kafe|cafe|coffee|kedai|kuliner|lokasi|venue|tempat)\b/i;

const EVENT_SUBJECT_RE =
  /\b(?:konser|concert|tour|festival|stage|panggung|live\s+in|showcase|orchestra|gig)\b/i;

export type VisualSubjectDomain = "transport" | "place" | "event" | "general";

export function detectVisualSubjectDomain(rawQuery?: string): VisualSubjectDomain {
  const q = (rawQuery || "").trim();
  if (!q) return "general";
  if (TRANSPORT_SUBJECT_RE.test(q)) return "transport";
  if (PLACE_OR_VENUE_SUBJECT_RE.test(q)) return "place";
  if (EVENT_SUBJECT_RE.test(q)) return "event";
  return "general";
}

const NON_PHOTO_URL_TOKEN_RE =
  /(?:^|[\/_.-])(?:logo|logos|logotype|brandmark|wordmark|favicon|apple-touch-icon|site-icon|app-icon|mstile|safari-pinned|icon|icons|lambang|emblem|coat-of-arms|coat_of_arms|seal_of|flag_of|avatar|profile-pic|profile_pic|user-icon|placeholder|no-image|no_image|default-thumb|default_thumb|default-og|og-default|share-image|social-card|dummy|spacer|pixel|sprite|qrcode|qr-code|qr_code|barcode|infographic|infografis|locator-map|locator_map|blank-map|blank_map|route-map|route_map|peta-rute|peta_rute|skema-rute|e-flyer|eflyer|banner-ads)(?:[\/_.-]|\d|$)/i;

const NON_PHOTO_SYNTHETIC_HOST_RE =
  /(?:grokipedia\.com\/api\/og|\/api\/og(?:\?|$)|exa\.ai\/api\/library\/og|halte\.id\/og\/|geonames\.org\/og-image|play-lh\.googleusercontent\.com|opengraph\.githubassets\.com|dummyimage\.com|via\.placeholder\.com|waze\.com\/social|ui-avatars\.com|gravatar\.com\/avatar|api\.dicebear\.com|ncbi\.nlm\.nih\.gov|pmc\.ncbi\.nlm\.nih\.gov)/i;

const NON_PHOTO_CAPTION_RE =
  /\b(?:official\s+logo|brand\s+logo|company\s+logo|vector\s+logo|logo\s+resmi|lambang\s+resmi|logotype|brandmark|wordmark|favicon|app\s+icon|vector\s+icon|clipart|pictogram|coat\s+of\s+arms|locator\s+map|blank\s+map|qr\s*code|infographic|infografis)\b/i;

const DISASTER_OR_ACCIDENT_NOISE_RE =
  /\b(?:tercebur|kecebur|tenggelam|kecelakaan|tabrakan|terguling|terbalik|terbakar|kebakaran|banjir\s+parah|evakuasi\s+mobil|mobil\s+pickup|pikap\s+tercebur|truk\s+terguling|lakalantas|jenazah|mayat|korban\s+tewas|pembunuhan|kriminal|tersangka|polsek|polres)\b/i;

/**
 * Rejects corporate logos, favicons, brandmarks, square app icons, QR codes,
 * schematic route maps, and generic site OG placeholders whenever the caller
 * wants a real photograph (`!allowLogo`).
 */
export function isNonPhotographicLogoOrGraphic(
  rawUrl: string,
  captionOrTitle = "",
  dims?: { width?: number; height?: number },
  allowLogo = false,
): boolean {
  const clean = (rawUrl || "").replace(/&amp;/g, "&").trim();
  if (!clean) return true;
  if (!allowLogo && !isPhotographicImageUrl(clean)) return true;
  if (allowLogo && !isLikelyImageUrl(clean)) return true;
  if (allowLogo) return false;

  const unwrapped = unwrapCanonicalImageUrl(clean);
  if (NON_PHOTO_SYNTHETIC_HOST_RE.test(clean) || NON_PHOTO_SYNTHETIC_HOST_RE.test(unwrapped)) {
    return true;
  }

  try {
    const parsed = new URL(unwrapped);
    const decodedPath = decodeURIComponent(parsed.pathname).toLowerCase();
    if (VECTOR_OR_ICON_EXT.test(decodedPath)) return true;
    if (/\/(?:favicon|icons?|logos?|brand|branding|avatars?|badges?|placeholders?)\//i.test(decodedPath)) {
      return true;
    }
    // Reject generic site OpenGraph / social-share branding banners (e.g. keenable-og.png, og-image.jpg)
    if (
      /(?:^|[\/_-])(?:og[-_]?image|og|opengraph|open[-_]?graph|social[-_]?(?:card|share|image)|share[-_]?image|default[-_]?og|meta[-_]?image|site[-_]?og|twitter[-_]?card)(?:\.(?:png|jpe?g|webp|avif)|$)/i.test(
        decodedPath,
      )
    ) {
      return true;
    }
    if (NON_PHOTO_URL_TOKEN_RE.test(decodedPath)) return true;
    if (DISASTER_OR_ACCIDENT_NOISE_RE.test(decodedPath.replace(/[\/_.-]+/g, " "))) {
      return true;
    }
  } catch {
    if (NON_PHOTO_URL_TOKEN_RE.test(unwrapped)) return true;
  }

  if (captionOrTitle) {
    const cleanTitle = captionOrTitle.trim();
    if (NON_PHOTO_CAPTION_RE.test(cleanTitle)) return true;
    if (DISASTER_OR_ACCIDENT_NOISE_RE.test(cleanTitle)) return true;
    // Catch standalone "Logo MRT Jakarta" / "MRT Jakarta Logo" titles on Wikimedia/web
    if (/(?:^|\s)(?:logo|lambang|favicon|wordmark|brandmark)(?:\s|[.:,|-]|$)/i.test(cleanTitle)) {
      return true;
    }
  }

  if (typeof dims?.width === "number" && typeof dims?.height === "number" && dims.width > 0 && dims.height > 0) {
    if (dims.width < 280 || dims.height < 190) return true;
    // Small square PNG/GIF assets on the web are overwhelmingly brand logos / app icons
    const nearSquare = Math.abs(dims.width - dims.height) <= Math.max(16, dims.width * 0.06);
    if (nearSquare && dims.width <= 540 && /\.(?:png|gif)(?:[?#]|$)/i.test(unwrapped)) {
      return true;
    }
  }

  return false;
}

/**
 * Stricter photographic check used by image retrieval providers so SVGs,
 * favicons, and vector icons never slip into photographic slots.
 */
export function isPhotographicImageUrl(raw: string): boolean {
  if (!isLikelyImageUrl(raw)) return false;
  try {
    const parsed = new URL(raw.trim());
    if (VECTOR_OR_ICON_EXT.test(parsed.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function buildProxiedImageUrl(httpsUrl: string): string {
  return `/api/image?proxy=1&url=${encodeURIComponent(httpsUrl.trim())}`;
}

/**
 * Selects the sharpest raster URL for card/canvas display:
 * - For Wikimedia Commons, `thumbnailUrl` is already a crisp 1600px JPEG preview
 *   (whereas raw `imageUrl` may be a multi-megabyte archival TIFF).
 * - For all other providers (`exa`, `firecrawl`, `openverse`, `bound`), full-res
 *   `imageUrl` MUST win over low-res 200px-300px preview `thumbnailUrl`s so cards
 *   never look pixelated on Retina displays.
 */
export function pickSharpDisplayImageUrl(
  asset?: Pick<NormalizedImageAsset, "imageUrl" | "thumbnailUrl" | "provider"> | null,
): string {
  if (!asset) return "";
  if (asset.provider === "wikimedia") {
    return (asset.thumbnailUrl || asset.imageUrl || "").trim();
  }
  return (asset.imageUrl || asset.thumbnailUrl || "").trim();
}

export function createStableAssetId(seed: string, index = 0): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `img_${(hash >>> 0).toString(36)}_${index}`;
}

export function inferAssetFromUnknown(
  raw: unknown,
  fallbackAlt = "Gambar referensi",
  index = 0
): NormalizedImageAsset | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const imageUrl =
    typeof r.imageUrl === "string"
      ? r.imageUrl.trim()
      : typeof r.src === "string"
        ? r.src.trim()
        : typeof r.url === "string"
          ? r.url.trim()
          : "";
  if (!isLikelyImageUrl(imageUrl)) return null;

  const thumbnailUrl =
    typeof r.thumbnailUrl === "string" && isLikelyImageUrl(r.thumbnailUrl)
      ? r.thumbnailUrl.trim()
      : undefined;
  const sourceUrl =
    typeof r.sourceUrl === "string" && isSafeExternalHttpsUrl(r.sourceUrl)
      ? r.sourceUrl.trim()
      : typeof r.source === "string" && isSafeExternalHttpsUrl(r.source)
        ? r.source.trim()
        : imageUrl;
  const caption =
    typeof r.caption === "string" && r.caption.trim()
      ? r.caption.trim()
      : typeof r.title === "string" && r.title.trim()
        ? r.title.trim()
        : undefined;
  const alt =
    typeof r.alt === "string" && r.alt.trim()
      ? r.alt.trim()
      : caption || fallbackAlt;
  const providerRaw = typeof r.provider === "string" ? r.provider : "bound";
  const provider: ImageProviderName =
    providerRaw === "tinyfish" ||
    providerRaw === "exa" ||
    providerRaw === "firecrawl" ||
    providerRaw === "wikimedia" ||
    providerRaw === "openverse"
      ? providerRaw
      : "bound";

  return {
    id:
      typeof r.id === "string" && r.id.trim()
        ? r.id.trim()
        : createStableAssetId(imageUrl, index),
    imageUrl,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    sourceUrl,
    ...(typeof r.sourceTitle === "string" && r.sourceTitle.trim()
      ? { sourceTitle: r.sourceTitle.trim() }
      : {}),
    ...(caption ? { caption } : {}),
    alt,
    ...(typeof r.width === "number" && r.width > 0 ? { width: r.width } : {}),
    ...(typeof r.height === "number" && r.height > 0 ? { height: r.height } : {}),
    provider,
    status: "resolved",
  };
}

const GENERIC_IMAGE_FILENAMES = new Set([
  "image", "img", "photo", "cover", "banner", "poster", "thumb", "thumbnail",
  "header", "hero", "default", "og", "maxresdefault", "hqdefault", "sddefault",
  "mqdefault", "index", "main", "featured", "original", "preview",
]);

/**
 * Unwraps common CDN / Next.js / proxy image wrapper URLs to the underlying origin URL
 * so syndicated assets (e.g. LiveNation `/_next/image?url=https://s1.ticketm.net/...`)
 * resolve to the exact same canonical identity as direct origin URLs.
 */
export function unwrapCanonicalImageUrl(rawUrl: string): string {
  let current = (rawUrl || "").trim();
  for (let depth = 0; depth < 3; depth++) {
    try {
      const parsed = new URL(
        current.startsWith("/") ? `https://momo.local${current}` : current,
      );
      const nested =
        parsed.searchParams.get("url") ||
        parsed.searchParams.get("img") ||
        parsed.searchParams.get("image") ||
        parsed.searchParams.get("src");
      if (nested && /^https?:\/\//i.test(nested.trim())) {
        current = nested.trim();
        continue;
      }
      break;
    } catch {
      break;
    }
  }
  return current;
}

/**
 * Extracts a canonical stem for image asset deduplication across CDNs/resizes
 * (e.g. Wikimedia thumb vs original, Ticketmaster _123456_TABLET_16_9 vs LiveNation
 * Next.js wrapper, Unsplash photo IDs, WordPress resizes, Prismic hashes).
 */
export function extractImageAssetStem(rawUrl: string): string {
  const unwrapped = unwrapCanonicalImageUrl(rawUrl);
  try {
    const u = new URL(unwrapped);
    const pathname = decodeURIComponent(u.pathname).toLowerCase();

    const uuidMatch = pathname.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    if (uuidMatch) {
      return `uuid:${uuidMatch[0].toLowerCase()}`;
    }

    const hexDigestMatch = pathname.match(/\b[0-9a-f]{24,64}\b/i);
    if (hexDigestMatch) {
      return `hash:${hexDigestMatch[0].toLowerCase()}`;
    }

    const parts = pathname.split("/").filter(Boolean);
    let file = parts[parts.length - 1] || "";
    file = file.replace(/^\d+px-/, "");
    const stem = file
      .replace(/\.(?:jpe?g|png|webp|avif|gif)$/i, "")
      .replace(/-e\d{10,}$/i, "")
      .replace(
        /(?:[_-](?:tablet|mobile|desktop|retina|artist|event|page|detail|source|custom|header|hero|banner|large|medium|small|landscape|portrait|square|wide|full|thumb|thumbnail|crop|scaled|\d+x\d+|\d+_\d+|\d+w|\d{5,9}))+$/gi,
        "",
      );
    if (stem.length >= 10 && !GENERIC_IMAGE_FILENAMES.has(stem)) {
      return `stem:${stem}`;
    }
    return `path:${u.hostname.replace(/^www\./, "").toLowerCase()}${pathname}`;
  } catch {
    return unwrapped.split("?")[0].toLowerCase();
  }
}

export function normalizeImageDedupKey(rawUrl: string): string {
  const unwrapped = unwrapCanonicalImageUrl(rawUrl);
  try {
    const u = new URL(unwrapped);
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${decodeURIComponent(u.pathname).toLowerCase()}`;
  } catch {
    return unwrapped.split("?")[0].toLowerCase();
  }
}

const GENERIC_PLACEHOLDER_QUERY_RE =
  /^(?:visual(?:\s+card|\s+\d+)?|gambar(?:\s+referensi|\s+editorial|\s+utama|\s+ilustrasi|\s+konteks)?|konteks(?:\s+visual)?|foto(?:\s+referensi|\s+masakan|\s+utama|\s+\d+)?|slide\s*\d*|material\s*\d*|image|photo|illustration|placeholder|referensi(?:\s+visual)?|catatan(?:\s+tambahan)?|untitled)$/i;

/**
 * Rejects UI placeholder strings (`"Visual card"`, `"Konteks visual"`, `"Gambar referensi"`, etc.)
 * so they can NEVER leak out as web image search queries.
 */
export function isGenericPlaceholderQuery(raw: string): boolean {
  const clean = (raw || "").replace(/\s+/g, " ").trim();
  if (clean.length < 2) return true;
  if (GENERIC_PLACEHOLDER_QUERY_RE.test(clean)) return true;
  return false;
}

const ABSTRACT_NON_VISUAL_PREFIX_RE =
  /^(?:babak\s+(?:pertama|kedua|ketiga|utama|\d+)|tahap\s+\d+|langkah\s+\d+|fase\s+\d+|bagian\s+\d+|opsi\s+[a-z0-9]|skenario\s+[a-z0-9]|strategi\b|tips?\b|catatan\b|ringkasan\b|kesimpulan\b|kelebihan\b|kekurangan\b|keunggulan\b|risiko\b|tantangan\b|masalah\b|solusi\b|faktor\b|kriteria\b|kompleksitas\b|overhead\b|perbandingan\b|matriks\b|estimasi\b|rincian\b|alokasi\b|checklist\b|persiapan\b|siapkan\b|pastikan\b|gunakan\b|hindari\b|beli\b|booking\b|pesan\b|cek\b|pilih\b|atur\b|unduh\b|bawa\b|datang\b|berangkat\b|pulang\b)/i;

const ABSTRACT_TECHNICAL_CONCEPT_RE =
  /\b(?:latency|latensi|throughput|multiplexing|handshake|websocket|sse|server-sent|payload|json|http\/[123]|redis|load\s*balanc|sticky\s*session|state\s*tracking|garbage\s*collect|event\s*loop|race\s*condition|deadlock|refactor|pull\s*request|git\s*diff|type\s*safety|unit\s*test|sql\s*injection|xss|cors|jwt|oauth)\b/i;

/**
 * Identifies abstract, procedural, or purely conceptual card/board titles that should NOT
 * trigger blind automatic photo searches unless the LLM explicitly requested an `imageQuery`.
 */
export function isAbstractNonVisualTitle(raw: string): boolean {
  const clean = (raw || "").replace(/\s+/g, " ").trim();
  if (!clean || isGenericPlaceholderQuery(clean)) return true;
  if (ABSTRACT_NON_VISUAL_PREFIX_RE.test(clean)) return true;
  if (ABSTRACT_TECHNICAL_CONCEPT_RE.test(clean)) return true;
  return false;
}

const QUERY_FILLER_WORDS = new Set([
  "the", "and", "for", "with", "from", "into", "about", "that", "this", "what", "when", "where", "how",
  "yang", "dan", "untuk", "dari", "pada", "dalam", "dengan", "atau", "saat", "oleh", "sebagai", "adalah",
  "kasih", "berikan", "tolong", "coba", "bisa", "dong", "nih", "deh", "sih", "aja", "saja", "lebih",
  "informasi", "info", "mengenai", "tentang", "soal", "terkait", "seputar", "lengkap", "detail", "rinci",
  "ringkasan", "sorotan", "analisis", "panduan", "rekomendasi", "pilihan", "opsi", "daftar", "list",
  "babak", "utama", "pertama", "kedua", "ketiga", "penutup", "pembuka", "bagian", "tahap", "langkah",
  "gambar", "foto", "visual", "potret", "suasana", "ilustrasi", "referensi", "konteks", "momen", "estetika",
  "card", "photo", "image", "picture", "view", "overview", "summary", "guide",
  "pickup", "dropoff", "drop", "safe", "zone", "zona", "titik", "jemput", "kumpul", "evakuasi", "ojol",
]);

const GENERIC_CONTEXT_MODIFIERS = new Set([
  "live", "concert", "konser", "tour", "tur", "stage", "panggung", "show", "event", "acara", "festival",
  "official", "resmi", "terbaru", "baru", "modern", "classic", "klasik", "global", "world", "asia",
  "indonesia", "nasional", "internasional", "international", "architecture", "arsitektur", "exterior",
  "interior", "aerial", "night", "malam", "siang", "pagi", "sore", "2023", "2024", "2025", "2026", "2027",
  "hotel", "resort", "villa", "hostel", "stasiun", "station", "halte", "terminal", "bandara", "airport",
  "stadion", "stadium", "arena", "venue", "gedung", "building", "mall", "plaza", "park", "taman",
  "jalan", "street", "road",
]);

/**
 * Splits a visual query into `distinctive` entity/subject tokens (e.g. `["chemical", "romance", "mcr", "jis"]`)
 * and `modifiers` (e.g. `["live", "concert", "2026", "indonesia"]`).
 * Image candidates MUST match at least 1 `distinctive` token whenever any exist, preventing
 * generic modifiers like `"Konser Live Jakarta 2026"` from matching unrelated artists/events.
 */
export function extractDistinctiveQueryTokens(query: string): {
  distinctive: string[];
  modifiers: string[];
  all: string[];
} {
  const rawTokens = (query || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/[\s-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !QUERY_FILLER_WORDS.has(t));

  const distinctive: string[] = [];
  const modifiers: string[] = [];
  const seen = new Set<string>();

  for (const tok of rawTokens) {
    if (seen.has(tok)) continue;
    seen.add(tok);
    if (GENERIC_CONTEXT_MODIFIERS.has(tok) || /^\d{4}$/.test(tok)) {
      modifiers.push(tok);
    } else {
      distinctive.push(tok);
    }
  }

  return {
    distinctive,
    modifiers,
    all: [...distinctive, ...modifiers],
  };
}

/**
 * Extracts a concise entity/topic anchor from a user prompt, Headline title, or session title
 * (e.g. `"Kasih informasi dong mengenai konser My Chemical Romance di Indonesia!"`
 * -> `"My Chemical Romance Indonesia"`).
 */
export function deriveVisualContextAnchor(rawText?: string): string {
  const clean = (rawText || "")
    .replace(/`{3,}[\s\S]*?`{3,}/g, " ")
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || isGenericPlaceholderQuery(clean)) return "";

  const words = clean.split(" ");
  const kept: string[] = [];
  const seenLower = new Set<string>();
  for (const w of words) {
    const low = w.toLowerCase();
    if (low.length < 2) continue;
    if (QUERY_FILLER_WORDS.has(low)) continue;
    if (seenLower.has(low)) continue;
    seenLower.add(low);
    kept.push(w);
    if (kept.length >= 6) break;
  }
  return kept.join(" ").trim();
}

/**
 * Normalizes an `imageQuery` by stripping conversational/structural Indonesian filler
 * and anchoring under-specified queries with the active turn/session `contextAnchor`
 * when the query lacks the primary entity or has <= 2 distinctive tokens.
 */
export function distillVisualSearchQuery(
  rawQuery: string,
  contextAnchor?: string,
): string {
  const expanded = (rawQuery || "")
    .replace(
      /\b(?:safe\s+pickup(?:\s+zone|\s+point|\s+area)?|pickup(?:\s+zone|\s+point|\s+area)?|drop\s*-?\s*off(?:\s+zone|\s+point)?|titik\s+(?:jemput|kumpul|temu|evakuasi|ojol)|zona\s+(?:aman|jemput|evakuasi|ojol)|jalur\s+evakuasi|pintu\s+(?:masuk|keluar|barat|timur|utara|selatan)|(?:west|east|north|south|main|exit|entry)\s+gate)\b/gi,
      " ",
    )
    .replace(/\bjis\b/gi, "Jakarta International Stadium")
    .replace(/\bgbk\b/gi, "Gelora Bung Karno Stadium")
    .replace(/[()[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!expanded || isGenericPlaceholderQuery(expanded)) return "";

  const words = expanded
    .replace(/[|•·—–]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");

  const coreWords = words.filter((w) => {
    const low = w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (!low) return false;
    return !QUERY_FILLER_WORDS.has(low);
  });

  const base = (coreWords.length > 0 ? coreWords : words).slice(0, 8).join(" ").trim();
  if (!base || isGenericPlaceholderQuery(base)) return "";

  if (!contextAnchor) return base;
  const anchor = deriveVisualContextAnchor(contextAnchor);
  if (!anchor) return base;

  const baseTokens = extractDistinctiveQueryTokens(base);
  const anchorTokens = extractDistinctiveQueryTokens(anchor);
  if (anchorTokens.distinctive.length === 0) return base;

  const baseSet = new Set(baseTokens.all);
  const sharesDistinctiveAnchor = anchorTokens.distinctive.some((t) => baseSet.has(t));

  // Only enrich with contextAnchor when the query is genuinely under-specified
  // (0-1 distinctive tokens, e.g. "Main Stage", "Stage Production"). A query that already
  // names its subject with 2+ distinctive tokens ("Aston Kemayoran", "Seroja Bake") is searched
  // as written: prepending session words made the relevance gate demand unrelated tokens.
  if (!sharesDistinctiveAnchor && baseTokens.distinctive.length <= 1) {
    const extra = anchorTokens.distinctive.slice(0, 3).join(" ");
    return `${extra} ${base}`.replace(/\s+/g, " ").trim();
  }

  return base;
}

/**
 * Counts how many query tokens match the asset's caption, alt, sourceTitle, or URLs.
 */
export function countImageAssetTokenHits(
  asset: Pick<NormalizedImageAsset, "caption" | "alt" | "sourceTitle" | "imageUrl" | "sourceUrl">,
  tokens: string[],
): number {
  if (tokens.length === 0) return 0;
  const decodedUrl = (() => {
    try {
      return decodeURIComponent(`${asset.imageUrl || ""} ${asset.sourceUrl || ""}`);
    } catch {
      return `${asset.imageUrl || ""} ${asset.sourceUrl || ""}`;
    }
  })();
  const words = `${asset.caption || ""} ${asset.alt || ""} ${asset.sourceTitle || ""} ${decodedUrl}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (words.length === 0) return 0;

  const wordSet = new Set(words);
  let hits = 0;
  for (const tok of tokens) {
    if (wordSet.has(tok)) {
      hits += 1;
      continue;
    }
    if (tok.length >= 5 && words.some((w) => w.startsWith(tok) || (w.length >= 5 && tok.startsWith(w)))) {
      hits += 1;
    }
  }
  return hits;
}

/**
 * Enforces strict contextual/entity relevance for retrieved image assets:
 * - Rejects empty/unparsable queries (`parsedTokens.all.length === 0`).
 * - When distinctive tokens exist (e.g. `["aston", "kemayoran"]` or `["sunter", "jakarta"]`),
 *   requires strong multi-token overlap so a partial match on a single city/brand token
 *   never pulls an unrelated location or off-context photo.
 * - When only generic modifiers exist, requires matching all modifier tokens.
 */
export function isImageAssetContextuallyRelevant(
  asset: Pick<NormalizedImageAsset, "caption" | "alt" | "sourceTitle" | "imageUrl" | "sourceUrl" | "provider">,
  parsedTokens: ReturnType<typeof extractDistinctiveQueryTokens>,
): boolean {
  if (parsedTokens.all.length === 0) return false;

  const distinctiveCount = parsedTokens.distinctive.length;
  const distinctiveHits = countImageAssetTokenHits(asset, parsedTokens.distinctive);
  const modifierHits = countImageAssetTokenHits(asset, parsedTokens.modifiers);
  const totalHits = distinctiveHits + modifierHits;

  if (distinctiveCount > 0) {
    const requiredDistinctive =
      distinctiveCount === 1
        ? 1
        : distinctiveCount === 2
          ? 2
          : Math.max(2, Math.floor((distinctiveCount + 1) / 2));
    if (distinctiveHits < requiredDistinctive) return false;
    return true;
  }

  return totalHits >= parsedTokens.all.length;
}
