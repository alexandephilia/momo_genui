import {
  distillVisualSearchQuery,
  extractDistinctiveQueryTokens,
  isAbstractNonVisualTitle,
  isGenericPlaceholderQuery,
  isPhotographicImageUrl,
} from "@/lib/imageAssetContract";
import type { MistlineBlock, MistlineUIBlock } from "@/lib/mistlineParse";
import type { SourceItem } from "@/types/momo";

export type CoverVisualMode = "photo" | "schematic" | "signal" | "monograph";

export interface CoverOutlineItem {
  /** 1-based position among content spreads after the cover */
  spreadOffset: number;
  indexLabel: string;
  title: string;
  roleTag: string;
  icon: string;
}

export interface CoverSignalItem {
  label: string;
  value: string;
}

export interface AbsorbedHeadlineMeta {
  title: string;
  kicker?: string;
  subtitle?: string;
}

export interface ExploreCoverBlueprint {
  mode: CoverVisualMode;
  fallbackMode: Exclude<CoverVisualMode, "photo">;
  resolvedImage?: string;
  resolvedImageQuery?: string;
  absorbIntoTurnHead: boolean;
  outline: CoverOutlineItem[];
  signals: CoverSignalItem[];
  chips: string[];
  specimenKicker: string;
}

const SCHEMATIC_BLOCK_NAMES = new Set([
  "code",
  "codediffpatch",
  "diagram",
  "architecturediagram",
  "sequencediagram",
  "statemachine",
  "networktopology",
  "causalgraph",
  "rootcauseanalysis",
  "decisiontree",
  "dependencygraph",
  "entityrelationship",
  "apireference",
  "stacktrace",
]);

const SIGNAL_BLOCK_NAMES = new Set([
  "stats",
  "kpicard",
  "chart",
  "linechart",
  "barchart",
  "areachart",
  "piechart",
  "radarchart",
  "scorecard",
  "adjuster",
  "financialsummary",
  "funnelchart",
  "heatmap",
]);

const PHOTOGRAPHIC_SIBLING_NAMES = new Set([
  "map",
  "places",
  "image",
  "asyncimage",
  "imagewithcaption",
  "imagecited",
  "imagegallery",
  "imagegrid",
  "imagecarousel",
  "moodboardmosaic",
  "recipescalercard",
  "transitroutecard",
]);

const SCHEMATIC_TOPIC_RE =
  /\b(?:sse|websocket|http\/?[123]?|tcp|udp|grpc|graphql|rest\s*api|api|endpoint|webhook|microservice|monolith|redis|postgres|mysql|mongodb|sql|nosql|indeks\s+database|query\s+plan|docker|kubernetes|k8s|ci\/cd|git|pull\s*request|diff|commit|refactor|typescript|javascript|node\.?js|next\.?js|react|python|rust|golang|compiler|runtime|event\s*loop|garbage\s*collect|memory\s*leak|race\s*condition|deadlock|mutex|thread|async|await|jwt|oauth|xss|csrf|cors|enkripsi|hash|protokol|streaming|multiplexing|load\s*balanc|arsitektur\s+sistem|struktur\s+data|algoritma|rekursi|kompleksitas\s+waktu|big-?o)\b/i;

const SIGNAL_TOPIC_RE =
  /\b(?:inflasi|suku\s+bunga|bi\s*rate|the\s*fed|kpr|cicilan|tenor|amortisasi|saham|ihsg|obligasi|reksa\s*dana|portofolio|dividen|valuasi|market\s*cap|cash\s*flow|arus\s+kas|margin|roi|roas|cagr|ebitda|pajak|ppn|pph|anggaran|alokasi\s+dana|simulasi\s+biaya|benchmark|kuartal|yoy|qoq|probabilitas|regresi|distribusi|statistik|elastisitas|hedging|kurs|rupiah)\b/i;

const PURE_CONCEPTUAL_TOPIC_RE =
  /\b(?:filsafat|stoisisme|eksistensialisme|utilitarianisme|deontologi|epistemologi|ontologi|logika\s+formal|silogisme|fallacy|bias\s+kognitif|psikologi|neurosains\s+kognitif|metodologi|kerangka\s+berpikir|mental\s+model|first\s+principles|etika|regulasi|kebijakan\s+publik|hukum\s+perdata|tata\s+kelola|paradigma|taksonomi|kurikulum|pedagogi|retorika|negosiasi|delegasi)\b/i;

const PHYSICAL_ENTITY_HINT_RE =
  /\b(?:konser|tur|festival|stadion|jis|gbk|arena|panggung|band|album|lagu|kuliner|restoran|warung|kafe|coffee|kopi|ramen|sate|bakso|nasi|resep|masakan|hotel|resor|villa|pantai|gunung|pulau|kota|wisata|rute|stasiun|bandara|kereta|mrt|lrt|mobil|motor|kamera|lensa|laptop|smartphone|kursi|meja|sepatu|jam\s+tangan|gedung|museum|taman|interior|fasad|arsitektur\s+(?:rumah|bangunan|masjid|gereja|candi|interior|tropis|japandi))\b/i;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function normalizeBlockKey(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function mapBlockRoleMeta(block: MistlineBlock): {
  roleTag: string;
  icon: string;
  fallbackTitle: string;
} {
  if (block.kind === "text") {
    const clean = block.text.replace(/\s+/g, " ").trim();
    const short = clean.length <= 260;
    return {
      roleTag: short ? "Catatan" : "Esai",
      icon: short ? "sparkles" : "book",
      fallbackTitle:
        clean
          .replace(/[#*_`>~[\]()]/g, "")
          .split(/[.!?]/)[0]
          ?.trim()
          .slice(0, 44) || (short ? "Catatan Kunci" : "Uraian Konteks"),
    };
  }

  const key = normalizeBlockKey(block.name);
  if (key === "visualdossier") {
    return { roleTag: "Dossier", icon: "layers", fallbackTitle: "Dossier Konteks" };
  }
  if (key === "versus" || key === "proscons" || key === "swotanalysis") {
    return { roleTag: "Komparasi", icon: "compare", fallbackTitle: "Adu Opsi" };
  }
  if (key === "comparisontable" || key === "table" || key === "scorecard") {
    return { roleTag: "Matriks", icon: "scale", fallbackTitle: "Matriks Data" };
  }
  if (key === "cards") {
    return { roleTag: "Sorotan", icon: "grid", fallbackTitle: "Kartu Sorotan" };
  }
  if (key === "plan" || key === "steps") {
    return { roleTag: "Rencana", icon: "route", fallbackTitle: "Tahapan Rencana" };
  }
  if (key === "checklist") {
    return { roleTag: "Checklist", icon: "check", fallbackTitle: "Daftar Periksa" };
  }
  if (key === "flow" || SCHEMATIC_BLOCK_NAMES.has(key)) {
    return {
      roleTag: key.includes("code") || key.includes("diff") ? "Kode" : "Alur",
      icon: key.includes("code") || key.includes("diff") ? "code" : "workflow",
      fallbackTitle: "Alur & Struktur",
    };
  }
  if (SIGNAL_BLOCK_NAMES.has(key)) {
    return {
      roleTag: key === "adjuster" ? "Simulasi" : "Metrik",
      icon: key === "adjuster" ? "gauge" : "trending-up",
      fallbackTitle: "Indikator Kunci",
    };
  }
  if (key === "map" || key === "places" || key === "transitroutecard") {
    return { roleTag: "Peta & Lokasi", icon: "map-pin", fallbackTitle: "Titik Lokasi" };
  }
  if (key === "callout") {
    return { roleTag: "Intisari", icon: "lightbulb", fallbackTitle: "Catatan Kritis" };
  }
  if (key === "palette" || key === "moodboardmosaic") {
    return { roleTag: "Palet", icon: "palette", fallbackTitle: "Eksplorasi Visual" };
  }
  return { roleTag: "Panel", icon: "compass", fallbackTitle: block.name };
}

function extractSiblingTitle(block: MistlineBlock, fallbackTitle: string): string {
  if (block.kind === "text") return fallbackTitle;
  const p = block.props;
  const raw =
    str(p.title) ||
    str(p.subject) ||
    str(p.heading) ||
    str(p.question) ||
    str(p.claim) ||
    fallbackTitle;
  return raw.length > 48 ? `${raw.slice(0, 46).trimEnd()}…` : raw;
}

function extractGroundedSignals(siblingBlocks: MistlineBlock[]): CoverSignalItem[] {
  const signals: CoverSignalItem[] = [];

  for (const b of siblingBlocks) {
    if (b.kind !== "ui") continue;
    const key = normalizeBlockKey(b.name);
    const p = b.props;

    if (key === "stats" || key === "kpicard") {
      const items = key === "kpicard" ? [p] : arr(p.items ?? p.metrics).map(rec);
      for (const it of items) {
        const label = str(it.label) || str(it.title);
        const value = str(it.value ?? it.metric);
        if (label && value && signals.length < 3) {
          signals.push({ label, value });
        }
      }
    } else if (key === "visualdossier") {
      for (const f of arr(p.keyFacts ?? p.facts).map(rec)) {
        const label = str(f.label);
        const value = str(f.value);
        if (label && value && signals.length < 3) {
          signals.push({ label, value });
        }
      }
    } else if (key === "versus" && signals.length < 2) {
      const a = rec(p.a);
      const bSide = rec(p.b);
      const la = str(a.label) || str(a.title) || str(a.name);
      const lb = str(bSide.label) || str(bSide.title) || str(bSide.name);
      if (la && lb) {
        signals.push({ label: "Adu Skenario", value: `${la} vs ${lb}` });
      }
    } else if (key === "comparisontable" && signals.length < 2) {
      const entities = arr(p.entities)
        .map((e) =>
          typeof e === "string" ? e.trim() : str(rec(e).name) || str(rec(e).label),
        )
        .filter(Boolean);
      const critCount = Array.isArray(p.criteria)
        ? p.criteria.length
        : Object.keys(rec(p.criteria)).length;
      if (entities.length >= 2) {
        signals.push({
          label: critCount > 0 ? `${critCount} Dimensi Uji` : "Komparasi",
          value: entities.slice(0, 2).join(" vs "),
        });
      }
    } else if (key === "table" && signals.length < 2) {
      const rowCount = arr(p.rows).length;
      const colCount = arr(p.columns).length;
      if (rowCount > 0 && colCount > 0) {
        signals.push({
          label: "Cakupan Tabel",
          value: `${rowCount} baris · ${colCount} kolom`,
        });
      }
    } else if ((key === "flow" || key === "steps") && signals.length < 2) {
      const nodeCount = arr(p.nodes ?? p.steps ?? p.items).length;
      if (nodeCount > 0) {
        signals.push({
          label: key === "flow" ? "Topologi Alur" : "Tahapan",
          value: `${nodeCount} simpul`,
        });
      }
    } else if (key === "plan" && signals.length < 2) {
      const dayCount = arr(p.days).length;
      if (dayCount > 0) {
        signals.push({ label: "Rentang Rencana", value: `${dayCount} bagian` });
      }
    }

    if (signals.length >= 3) break;
  }

  return signals.slice(0, 2);
}

function computeTitleOverlapRatio(a: string, b: string): number {
  const tokA = extractDistinctiveQueryTokens(a).all;
  const tokB = extractDistinctiveQueryTokens(b).all;
  if (tokA.length === 0 || tokB.length === 0) return 0;
  const setB = new Set(tokB);
  let hits = 0;
  for (const t of tokA) {
    if (setB.has(t)) hits++;
  }
  return hits / Math.min(tokA.length, tokB.length);
}

/**
 * Context-aware, non-rigid resolver for Explore's `sp--cover` (`Headline`).
 * Evaluates subject materiality + sibling blocks + verified sources so:
 *  - Physical/visual topics get automatic contextual photography even if arg #5/#6 was omitted.
 *  - Technical/architectural multi-spreads get a `schematic` blueprint + live TOC.
 *  - Quantitative/financial multi-spreads get a `signal` index + grounded figures.
 *  - Conceptual multi-spreads get an editorial `monograph` cover + live TOC.
 *  - Short or duplicate non-photo Headlines dissolve cleanly into `.momo-explore-turn-head`.
 */
export function buildExploreCoverBlueprint(params: {
  headlineProps: Record<string, unknown>;
  allBlocks: MistlineBlock[];
  userPrompt?: string;
  sources?: SourceItem[];
}): ExploreCoverBlueprint {
  const { headlineProps, allBlocks, userPrompt, sources } = params;
  const title = str(headlineProps.title);
  const kicker = str(headlineProps.kicker);
  const subtitle = str(headlineProps.subtitle);
  const explicitImage =
    str(headlineProps.image) || str(headlineProps.imageUrl) || undefined;
  const explicitQuery = !isGenericPlaceholderQuery(str(headlineProps.imageQuery))
    ? str(headlineProps.imageQuery)
    : undefined;

  const siblingBlocks = allBlocks.filter((b) => {
    if (b.kind === "text") return b.text.trim().length > 0;
    const n = normalizeBlockKey((b as MistlineUIBlock).name);
    return n !== "headline" && n !== "followups";
  });

  const outline: CoverOutlineItem[] = siblingBlocks.slice(0, 4).map((b, idx) => {
    const meta = mapBlockRoleMeta(b);
    return {
      spreadOffset: idx + 1,
      indexLabel: String(idx + 1).padStart(2, "0"),
      title: extractSiblingTitle(b, meta.fallbackTitle),
      roleTag: meta.roleTag,
      icon: meta.icon,
    };
  });

  const signals = extractGroundedSignals(siblingBlocks);

  const combinedContext = `${title} ${kicker} ${subtitle} ${userPrompt || ""}`.trim();
  const tokens = extractDistinctiveQueryTokens(`${title} ${userPrompt || ""}`);
  const chips = tokens.distinctive
    .slice(0, 4)
    .map((t) => (t.length <= 4 ? t.toUpperCase() : t[0].toUpperCase() + t.slice(1)));

  const siblingKeys = siblingBlocks
    .filter((b): b is MistlineUIBlock => b.kind === "ui")
    .map((b) => normalizeBlockKey(b.name));

  const hasSchematicSibling = siblingKeys.some((k) => SCHEMATIC_BLOCK_NAMES.has(k));
  const hasSignalSibling = siblingKeys.some((k) => SIGNAL_BLOCK_NAMES.has(k));
  const hasPhotographicSibling = siblingKeys.some((k) => {
    if (PHOTOGRAPHIC_SIBLING_NAMES.has(k)) return true;
    if (k === "visualdossier") {
      const vd = siblingBlocks.find(
        (sb): sb is MistlineUIBlock =>
          sb.kind === "ui" && normalizeBlockKey(sb.name) === "visualdossier",
      );
      return Boolean(
        vd && (str(vd.props.image) || str(vd.props.imageQuery)),
      );
    }
    if (k === "cards") {
      const cb = siblingBlocks.find(
        (sb): sb is MistlineUIBlock =>
          sb.kind === "ui" && normalizeBlockKey(sb.name) === "cards",
      );
      const items = cb ? arr(cb.props.items ?? cb.props.cards).map(rec) : [];
      return items.some((it) => Boolean(str(it.image) || str(it.imageQuery)));
    }
    return false;
  });

  const hasPhysicalCue = PHYSICAL_ENTITY_HINT_RE.test(combinedContext);
  const isTechnicalTopic =
    !hasPhysicalCue && (SCHEMATIC_TOPIC_RE.test(combinedContext) || hasSchematicSibling);
  const isSignalTopic =
    !hasPhysicalCue &&
    !isTechnicalTopic &&
    (SIGNAL_TOPIC_RE.test(combinedContext) || hasSignalSibling);
  const isPureConceptual =
    !hasPhysicalCue && PURE_CONCEPTUAL_TOPIC_RE.test(combinedContext);

  const fallbackMode: Exclude<CoverVisualMode, "photo"> = isTechnicalTopic
    ? "schematic"
    : isSignalTopic || hasSignalSibling
      ? "signal"
      : "monograph";

  const hasVerifiedSourcePhoto = Boolean(
    sources?.some((s) => isPhotographicImageUrl(s.imageUrl || "")),
  );

  // Decide primary visual mode
  let mode: CoverVisualMode;
  let resolvedImage = explicitImage;
  let resolvedImageQuery = explicitQuery;

  if (explicitImage || explicitQuery) {
    mode = "photo";
    if (!resolvedImage && resolvedImageQuery) {
      resolvedImageQuery = distillVisualSearchQuery(
        resolvedImageQuery,
        userPrompt || title,
      );
    }
  } else if (isTechnicalTopic) {
    mode = "schematic";
  } else if (isSignalTopic) {
    mode = "signal";
  } else if (
    !isPureConceptual &&
    (hasPhysicalCue ||
      hasPhotographicSibling ||
      (!isAbstractNonVisualTitle(title) &&
        (tokens.distinctive.length >= 1 || hasVerifiedSourcePhoto)))
  ) {
    const candidateQuery = distillVisualSearchQuery(
      title || userPrompt || "",
      userPrompt || subtitle,
    );
    if (candidateQuery && !isGenericPlaceholderQuery(candidateQuery)) {
      mode = "photo";
      resolvedImageQuery = candidateQuery;
    } else {
      mode = fallbackMode;
    }
  } else {
    mode = fallbackMode;
  }

  // Anti-duplication: dissolve non-photo Headline into `.momo-explore-turn-head`
  // when there is <= 1 content spread OR it merely repeats userPrompt without multi-spread depth.
  const overlapWithPrompt = userPrompt
    ? computeTitleOverlapRatio(title, userPrompt)
    : 0;
  const absorbIntoTurnHead =
    mode !== "photo" &&
    (siblingBlocks.length <= 1 ||
      (overlapWithPrompt >= 0.72 && siblingBlocks.length <= 2 && signals.length === 0));

  const specimenKicker =
    kicker ||
    (mode === "schematic"
      ? "arsitektur & alur"
      : mode === "signal"
        ? "indeks & metrik"
        : mode === "photo"
          ? "sorotan visual"
          : "peta eksplorasi");

  return {
    mode,
    fallbackMode,
    resolvedImage,
    resolvedImageQuery,
    absorbIntoTurnHead,
    outline,
    signals,
    chips,
    specimenKicker,
  };
}
