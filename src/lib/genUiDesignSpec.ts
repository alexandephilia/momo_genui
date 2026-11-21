import {
  getRoleLens,
  getRoleWorkspaceConfig,
} from "@/lib/roleWorkspaceRegistry";
import { buildMomoSubsetOpenUiPrompt } from "@/lib/openui/momoSchema";
import { contentContractPrompt } from "@/lib/openui/contentContracts";
import { buildWritingCraft, formatRegisterLock, formatRolePersona, getRolePersona } from "@/lib/rolePersonas";
import type {
  UiInteractionPayload,
  WorkspaceSnapshotPayload,
  WorkspaceViewId,
} from "@/types/momo";

type UiCompositionMode = "prose_only" | "auto_light" | "rich_ui";

interface TurnContextSignals {
  spatialTransit: boolean;
  visualEntity: boolean;
  groupOrCost: boolean;
  comparison: boolean;
  planningProcess: boolean;
  quantitativeData: boolean;
  architectureFlow: boolean;
  deepAnalytical: boolean;
  newsIntent: boolean;
  imageQueries: string[];
  recommendedComponents: string[];
  mode: UiCompositionMode;
}

const SURFACE_HINTS: Record<WorkspaceViewId, string> = {
  explore:
    "Persistent Spatial Workspace (Explore Horizontal Broadsheet): do NOT write long chat walls of paragraphs. Compose a cohesive horizontal sequence of visual/analytical spreads (`Headline` cover + 2-4 distinct non-redundant OpenUI panels paired with punchy 1-2 paragraph editorial beats) and ALWAYS close `root = Stack([...])` with `Followups([5 concrete next-step branches])` (minimum 5 items) derived 100% from the user's latest query & exact entities.",
  chat:
    "Response UI (Inline Conversational Chat): lead with thorough, direct Markdown analysis anchored strictly to the user's latest query & active topic, weave focused OpenUI Lang views inline only where structure sharpens clarity, and include `Followups([...])` (at least 5 distinct items) grounded in the exact subject just discussed.",
  board:
    "Persistent Workspace (Pinboard): inspect existing board columns/items and call `sync_workspace_board` whenever curating, adding, or reorganizing actionable cards.",
};

/**
 * Aligned 1:1 with all 18 roles in `roleWorkspaceRegistry.ts`.
 * Roles set analytical posture and capability bias — never a rigid cage.
 */
export const ROLE_PREFERRED_FAMILIES: Record<string, string[]> = {
  rest: ["NewsFeed", "WeatherForecast", "ExecutiveSummary", "FactCheckPanel", "Map", "Versus", "CatalogShelf", "AnnotatedSheet", "RegionalShowcase", "Adjuster", "SwotAnalysis"],
  traveller: ["TransitRouteCard", "Map", "WeatherForecast", "ImageWithCaption", "Versus", "Adjuster"],
  designer: ["MoodboardMosaic", "Palette", "ImageComparison", "ImageGallery", "TradeoffMatrix", "Diagram", "Headline"],
  money: ["Adjuster", "CostBenefitAnalysis", "KpiCard", "LineChart", "PieChart", "ComparisonTable", "DataTable", "Scorecard"],
  bug: ["RootCauseAnalysis", "CodeDiffPatch", "Diagram", "Code", "Flow"],
  investigate: ["FactCheckPanel", "ClaimEvidenceMap", "EvidenceCard", "KeyFindings", "NewsFeed", "QuoteExtraction", "SituationalOverview", "DecisionTree"],
  captain: ["SituationalOverview", "RiskMatrix", "TradeoffMatrix", "CodeDiffPatch", "Diagram", "GanttChart"],
  builder: ["ArchitectureDiagram", "CodeDiffPatch", "DocumentDiff", "TradeoffMatrix", "Flow", "Code", "Versus"],
  tester: ["FactCheckPanel", "DataTable", "RiskMatrix", "BarChart", "Scorecard", "CodeDiffPatch", "Code"],
  guard: ["RiskMatrix", "FactCheckPanel", "DecisionTree", "ArchitectureDiagram", "Scorecard", "EvidenceCard", "Code"],
  planner: ["GanttChart", "KanbanBoard", "SwotAnalysis", "Adjuster", "Scorecard"],
  cook: ["RecipeScalerCard", "ImageWithCaption", "Table", "Adjuster"],
  write: ["AnnotatedSheet", "ExecutiveSummary", "QuoteExtraction", "ConceptFlashcards", "Versus", "Choices"],
  director: ["MoodboardMosaic", "CatalogShelf", "ImageGallery", "Palette", "Flow"],
  tutor: ["ConceptFlashcards", "AnnotatedSheet", "MindMap", "CodeDiffPatch", "Flow", "Diagram", "Code", "Quiz", "Choices"],
  coach: ["SwotAnalysis", "Adjuster", "LineChart", "KpiCard"],
  music: ["RegionalShowcase", "CatalogShelf", "AnnotatedSheet", "MoodboardMosaic", "TransitRouteCard", "FactCheckPanel", "ImageGallery", "Palette"],
  garden: ["ConceptFlashcards", "ImageWithCaption", "Gauge", "Plan"],
};

/**
 * Per-turn component spotlight: surfaces fresh catalog archetypes that fit the
 * turn's detected signals but haven't been used in this session. Counteracts the
 * model's anchor bias toward the role affinity list — names present in context
 * are what actually get sampled, so fresh names must be injected every turn.
 */
const SPOTLIGHT_BY_SIGNAL: Record<string, string[]> = {
  comparison: ["OptionEvaluation", "DecisionMatrix", "TradeoffMatrix", "ComparisonTable", "Scorecard", "PriorityMatrix", "ProsCons", "SwotAnalysis"],
  planning: ["GanttChart", "KanbanBoard", "Plan", "Timeline", "Steps", "Checklist"],
  quantitative: ["ForecastChart", "KpiCard", "Gauge", "CorrelationMatrix", "DistributionAnalysis", "Histogram", "BoxPlot", "TrendAnalysis", "ScenarioPlanner"],
  deep: ["ImpactAnalysis", "RootCauseTree", "AssumptionPanel", "LimitationPanel", "ConfidenceIndicator", "HypothesisPanel", "ArgumentMap", "ExplanationPanel", "FiveWhys", "ContradictionPanel"],
  news: ["NewsFeed", "AlertFeed", "EventStream", "CaseTimeline", "SourceCard", "FactCheckPanel"],
  spatial: ["Map", "TransitRouteCard", "RegionalShowcase", "WeatherForecast", "GeographicHeatmap"],
  visual: ["VisualDossier", "Cards", "ImageGallery", "MoodboardMosaic", "CatalogShelf"],
  flow: ["ArchitectureDiagram", "Flow", "DependencyGraph", "DecisionTree", "CausalGraph", "MindMap", "FaultTree", "ConceptMap"],
  cost: ["CostBenefitAnalysis", "KpiCard", "ComparisonTable"],
};

const SPOTLIGHT_ROTATION_POOL = [
  "ImpactAnalysis", "OptionEvaluation", "DecisionMatrix", "ScenarioPlanner",
  "RiskRegister", "CorrelationTimeline", "PatternDetection", "ThreatAssessment",
  "LimitationPanel", "AssumptionPanel", "PriorityMatrix", "RootCauseTree",
  "HypothesisPanel", "ArgumentMap", "ContradictionPanel", "ConfidenceExplorer",
  "TrendAnalysis", "InsightPanel", "EvidenceMatrix", "IndicatorPanel",
  "AnomalyDetectionPanel", "ChangeDetection", "EntityTracking", "EventCorrelationMap",
  "DependencyGraph", "FaultTree", "ConceptMap", "ForecastChart",
  "DistributionAnalysis", "InsightComparison",
];

const PROSE_ONLY_PATTERN =
  /^(?:halo|hai|hi|hey|hello|pagi|siang|sore|malam|thanks|makasih|terima kasih|oke|ok|sip|noted|siap|mantap|good|nice|yo|p|(?:kamu|lo|lu|elo|anda)\s+(?:itu\s+)?siapa|siapa\s+(?:sih\s+)?(?:kamu|lo|lu|elo|anda)|who\s+are\s+you|apa\s+kabar)\b/i;

const PURE_GREETING_PATTERN =
  /^(?:halo|hai|hi|hey|hello|pagi|siang|sore|malam|thanks|makasih|terima kasih|oke|ok|sip|noted|siap|mantap|yo|p)\b[!.?,\s]*$/i;

const LOCAL_CODE_OR_TRANSFORM_ONLY_PATTERN =
  /^(?:tolong\s+)?(?:refactor|perbaiki\s+kode|fix\s+bug|debug\s+fungsi|terjemahkan|translate|parafrase|ringkas\s+teks\s+ini|ubah\s+kode|convert\s+json|tulis\s+unit\s+test\s+untuk)\b|(?:apa\s+perbedaan\s+konseptual|berapa\s+(?:turunan|integral|hasil\s+dari)\b)/i;

const LIVE_FACT_OVERRIDE_PATTERN =
  /\b(?:202[5-9]|terbaru|latest|release|rilis|versi|benchmark|harga|pricing|jadwal|konser|setlist|tracklist|daftar\s+lagu|rundown|lineup|line-up|berita|news|dokumentasi|docs|cve|security\s+advisory)\b/i;

/** The user wants to know what is happening: a digest of current stories, not one subject. */
export const NEWS_INTENT_PATTERN =
  /\b(?:berita|news|headline|breaking|kabar\s+(?:terbaru|terkini|hari\s+ini|apa)|isu\s+(?:terkini|terbaru|hangat|panas)|trending|viral|lagi\s+(?:rame|ramai|heboh)|apa\s+yang\s+(?:lagi\s+)?terjadi|ada\s+apa\s+(?:hari\s+ini|dengan|sama|di)|update\s+(?:terbaru|terkini|hari\s+ini)|what(?:'s|\s+is)\s+happening|current\s+events)\b/i;

const EXHAUSTIVE_ENUMERATION_PATTERN =
  /\b(?:setlist|tracklist|daftar\s+lagu|list\s+lagu|urutan\s+lagu|rundown|jadwal\s+lengkap|full\s+list|daftar\s+lengkap|semua\s+lagu|menu\s+lengkap|spesifikasi\s+lengkap|kurikulum|daftar\s+episode)\b/i;

const SPATIAL_TRANSIT_PATTERN =
  /(?:\bdari\b[\s\S]{1,40}\bke\b|berapa lama|estimasi|pergi|berangkat|rute|route|arah|macet|lalu lintas|naik apa|transit|stasiun|halte|bandara|hotel|stadium|stadion|jis\b|arena|venue|peta|map|lokasi|dimana|where|jarak|parkir|tol|ojol|gocar|grab|transjakarta|krl|mrt|lrt|wisata|kuliner|restoran|kafe|cafe)/i;

/**
 * Topics with something real to photograph. Shared with the UI planner so both ask for
 * `search_images` on the same turns. The leading boundary keeps "tas" from matching "atas".
 */
export const VISUAL_ENTITY_PATTERN =
  /\b(?:konser|concert|nonton|live|tour|tur|festival|band|artis|penyanyi|mcr\b|my chemical romance|stadion|stadium|jis\b|hotel|aston|museum|wisata|gedung|landmark|arsitektur\s+(?:bangunan|gedung|rumah|interior|masjid|katedral)|masjid|gereja|candi|pantai|gunung|kafe|restoran|kuliner|masak|masakan|hidangan|makanan|minuman|resep|kopi|coffee|decaf|espresso|latte|cappuccino|americano|cold\s*brew|french\s*press|mesin\s+press|moka\s*pot|v60|teh|tea|matcha|cokelat|cocktail|mocktail|smoothie|jus|boba|roti|kue|pastry|dessert|nasi|mie|soto|rendang|ramen|sushi|pasta|pizza|burger|sepatu|kamera|laptop|smartphone|headphone|earphone|jam\s+tangan|tas|jaket|parfum|furnitur|interior|motor|mobil|bunga|tanaman|hewan|foto|gambar|gallery|galeri|poster|cover|liburan|jalan-jalan|trip|itinerary|destinasi|tempat\s+(?:wisata|makan|nongkrong|ngopi)|air\s+terjun|danau|taman|pasar|keraton|istana|kuil|pulau|bangunan|produk|album|moodboard|visual)/i;

const GROUP_COST_PATTERN =
  /(?:\bberdua(?:an)?\b|\bbertiga\b|\bberempat\b|\bkeluarga\b|\bpasangan\b|\bgrup\b|orang\b|patungan|ongkos|tarif|harga|budget|anggaran|biaya|tiket|estimasi biaya|spend|cost)/i;

const COMPARISON_PATTERN =
  /(?:bandingkan|compare|versus|\bvs\b|perbandingan|perbedaan|bedanya|beda\s+antara|lebih baik|mana yang|mending|rekomendasi|alternatif|pilihan|\b(?:tentang|antara)\s+[^?.,]{2,40}\s+(?:dan|sama)\s+[^?.,]{2,40})/i;

const PLANNING_PATTERN =
  /(?:itinerary|jadwal|schedule|setlist|tracklist|rundown|daftar\s+lagu|roadmap|rencana|plan|jam berapa|susun|timeline|gantt|kanban|checklist|persiapan|langkah|step|cara|tips)/i;

const QUANT_PATTERN =
  /(?:chart|grafik|statistik|stat|data|tabel|table|matrix|skor|scorecard|persen|%|tren|trend|kpi|metrik|benchmark|rasio|kapasitas)/i;

const ARCH_FLOW_PATTERN =
  /(?:arsitektur|architecture|diagram|flowchart|sequence|erd|mindmap|decision tree|pipeline|alur|bug|error|debug|stack ?trace|system design)/i;

const DEEP_ANALYTICAL_PATTERN =
  /(?:kenapa|mengapa|bagaimana|cara kerja|mekanisme|strategi|analisis|evaluasi|optimasi|diagnosa|perbedaan|bedanya|perbandingan|penjelasan|jelaskan|jelasin|kasih\s+ide|rekomendasiin|saranin|tutorial|panduan|rekomendasi|dampak|risiko|efek|dosis|kelebihan|kekurangan|sebaiknya|mending|apa saja|why|how does|how to|explain|trade-?off|bottleneck|skala|scale)/i;

const ENTITY_IMAGE_RULES: Array<[RegExp, string]> = [
  [/\bmcr\b|my chemical romance/i, "My Chemical Romance live concert"],
  [/\bjis\b|jakarta international stadium/i, "Jakarta International Stadium exterior"],
  [/\baston\s+kemayoran/i, "Aston Kemayoran Hotel Jakarta"],
  [/\bgbk\b|gelora bung karno/i, "Stadion Utama Gelora Bung Karno Jakarta"],
  [/\bbraga\b/i, "Jalan Braga Bandung"],
  [/\bmonas\b/i, "Monumen Nasional Jakarta"],
  [/\bmalioboro\b|\byogyakarta\b|\bjogja\b/i, "Tugu Yogyakarta Malioboro"],
  [/\blabuan\s+bajo\b|\bkomodo\b/i, "Padar Island Labuan Bajo Indonesia"],
  [/\bprambanan\b/i, "Candi Prambanan Yogyakarta"],
  [/\bborobudur\b/i, "Candi Borobudur Magelang"],
  [/\bcihapit\b/i, "Pasar Cihapit Bandung kuliner"],
];

const STOP_PROPER_NOUNS = new Set([
  "Gue", "Lu", "Saya", "Aku", "Kamu", "Kita", "Kami", "Mereka", "Ini", "Itu",
  "Yang", "Dan", "Atau", "Kalau", "Jika", "Saat", "Dari", "Buat", "Untuk",
  "Dengan", "Bagaimana", "Kenapa", "Mengapa", "Apakah", "Tolong", "Bantu",
  "Jelaskan", "Bandingkan", "Berikan", "Rekomendasi", "Contoh", "Jakarta",
]);

function extractAccurateImageQueries(text: string): string[] {
  const clean = (text || "").trim();
  if (!clean) return [];

  const found: string[] = [];
  for (const [re, canonical] of ENTITY_IMAGE_RULES) {
    if (re.test(clean) && !found.includes(canonical)) {
      found.push(canonical);
    }
  }

  const domainMatches = clean.matchAll(
    /(?:konser|nonton|festival|tur|film|album)\s+([A-Za-z0-9&'\s-]{2,36}?)(?:\s+(?:di|negara|kota|jam|tanggal|bareng|berdua|kira|terbaru)|[?!.,]|$)|(?:resep|masak|makan|kuliner|minum|kopi)\s+([A-Za-z0-9\s-]{3,36}?)(?:\s+(?:yang|enak|pedas|di|untuk)|[?!.,]|$)|(?:wisata|hotel|museum|pantai|gunung|stadion|stadium|kafe)\s+([A-Za-z0-9\s-]{3,36}?)(?:\s+(?:di|negara|kota|yang|dekat|buat)|[?!.,]|$)/gi,
  );
  for (const m of domainMatches) {
    const raw = (m[1] || m[2] || m[3] || "")
      .replace(/\b(?:negara|indonesia|kota|acara|event|tiket|info|informasi)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!raw || raw.length < 3) continue;
    if (!found.some((x) => x.toLowerCase().includes(raw.toLowerCase()))) {
      found.push(raw);
    }
  }

  if (found.length < 2) {
    const properMatches = clean.match(/\b[A-Z][a-zA-Z0-9-]+(?:\s+[A-Z0-9][a-zA-Z0-9-]+){1,3}\b/g) || [];
    for (const span of properMatches) {
      const words = span.split(/\s+/);
      if (words.every((w) => STOP_PROPER_NOUNS.has(w))) continue;
      if (!found.some((x) => x.toLowerCase().includes(span.toLowerCase()))) {
        found.push(span);
      }
      if (found.length >= 3) break;
    }
  }

  return found.slice(0, 3);
}

/**
 * Multi-signal intent & context analyzer across domains, spatial transit,
 * visual entities, group/cost dimensions, and surface needs.
 */
export function analyzeTurnContext(opts: {
  latestUserText: string;
  previousUserTexts?: string[];
  lookId: string;
  workspaceView: WorkspaceViewId;
  hasInteraction?: boolean;
}): TurnContextSignals {
  const clean = (opts.latestUserText || "").trim();
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  const recentTopicCorpus =
    wordCount <= 12 && opts.previousUserTexts && opts.previousUserTexts.length > 0
      ? `${opts.previousUserTexts.join(" ")} ${clean}`
      : clean;
  const spatialTransit = SPATIAL_TRANSIT_PATTERN.test(recentTopicCorpus);
  const visualEntity = VISUAL_ENTITY_PATTERN.test(recentTopicCorpus);
  const groupOrCost = GROUP_COST_PATTERN.test(recentTopicCorpus);
  const comparison = COMPARISON_PATTERN.test(recentTopicCorpus);
  const planningProcess = PLANNING_PATTERN.test(recentTopicCorpus);
  const quantitativeData = QUANT_PATTERN.test(recentTopicCorpus);
  const architectureFlow = ARCH_FLOW_PATTERN.test(recentTopicCorpus);
  const deepAnalytical = DEEP_ANALYTICAL_PATTERN.test(recentTopicCorpus);
  const newsIntent = NEWS_INTENT_PATTERN.test(clean);
  const imageQueries = visualEntity ? extractAccurateImageQueries(recentTopicCorpus) : [];
  const isPureGreeting =
    (wordCount <= 5 || clean.length <= 36) &&
    PROSE_ONLY_PATTERN.test(clean) &&
    !spatialTransit &&
    !visualEntity &&
    !groupOrCost &&
    !comparison &&
    !planningProcess &&
    !quantitativeData &&
    !architectureFlow &&
    !deepAnalytical;

  let mode: UiCompositionMode = "auto_light";
  if (opts.hasInteraction) {
    mode = "rich_ui";
  } else if (isPureGreeting) {
    mode = "prose_only";
  } else if (
    opts.workspaceView === "explore" ||
    newsIntent ||
    spatialTransit ||
    visualEntity ||
    comparison ||
    planningProcess ||
    quantitativeData ||
    architectureFlow ||
    (deepAnalytical && wordCount >= 5) ||
    (groupOrCost && wordCount >= 5) ||
    wordCount >= 10
  ) {
    mode = "rich_ui";
  }

  const recommended: string[] = [];
  const pushRec = (name: string) => {
    if (!recommended.includes(name)) recommended.push(name);
  };

  if (newsIntent) {
    pushRec("NewsFeed");
    pushRec("KeyFindings");
    pushRec("Timeline");
  }
  if (spatialTransit) {
    pushRec("TransitRouteCard");
    pushRec("Map");
    pushRec("Versus");
  }
  if (visualEntity || imageQueries.length > 0) {
    pushRec("VisualDossier");
    pushRec(imageQueries.length >= 2 ? "MoodboardMosaic" : "ImageWithCaption");
    pushRec("Cards");
  }
  if (spatialTransit && visualEntity && wordCount >= 14) {
    pushRec("BentoGrid");
  }
  if (/(?:fakta|rumor|mitos|hoax|beneran|benarkah|valid|verifikasi|terkonfirmasi|konfirmasi|fact ?check)/i.test(clean)) {
    pushRec("FactCheckPanel");
    pushRec("ClaimEvidenceMap");
    pushRec("QuoteExtraction");
  }
  if (/(?:tema|lore|narasi|konsep|regional|tiap\s+negara|tiap\s+benua|dunia\s+fiktif|storyline|plot)/i.test(clean)) {
    pushRec("RegionalShowcase");
  }
  if (/(?:album|diskografi|discography|tracklist|daftar lagu|filmografi|rilisan|ep\b|lp\b|single\b)/i.test(clean)) {
    pushRec("CatalogShelf");
  }
  if (/(?:lirik|lyric|lyrics|makna lagu|arti lagu|bedah lagu|puisi|bait|pasal|verse)/i.test(clean)) {
    pushRec("AnnotatedSheet");
  }
  if (/(?:resep|masak|minuman|kopi|teh|matcha|seduh|french\s*press|mesin\s+press|bumbu|porsi|bahan|goreng|rebus|panggang|kukus|kuah|sambal|adonan)/i.test(clean)) {
    pushRec("RecipeScalerCard");
    pushRec("Cards");
  }
  if (/(?:kasih\s+ide|ide\s+\d|minimal\s+\d|at\s+least\s+\d|beberapa\s+(?:ide|opsi|pilihan))/i.test(clean)) {
    pushRec("Cards");
    pushRec("ComparisonTable");
  }
  if (/(?:bug|patch|diff|fix|refactor|perbaiki|error|exception|stack ?trace|commit)/i.test(clean)) {
    pushRec("CodeDiffPatch");
    pushRec("RootCauseAnalysis");
  }
  if (/(?:swot|risiko|risk|roi|biaya vs manfaat|trade-?off|keputusan|strategi)/i.test(clean)) {
    pushRec("TradeoffMatrix");
    pushRec("SwotAnalysis");
    pushRec("RiskMatrix");
    pushRec("CostBenefitAnalysis");
  }
  if (/(?:jelaskan konsep|apa itu|arti dari|etimologi|flashcard|belajar|pahami|hafal)/i.test(clean)) {
    pushRec("ConceptFlashcards");
  }
  if (/(?:moodboard|estetika|vibe|referensi visual|color palette|palet warna|tema desain|cinematography)/i.test(clean)) {
    pushRec("MoodboardMosaic");
  }
  if (groupOrCost) {
    pushRec("Table");
    pushRec("Adjuster");
    pushRec("Stats");
  }
  if (comparison) {
    pushRec("Versus");
    pushRec("ComparisonTable");
    pushRec("TradeoffMatrix");
  }
  if (planningProcess) {
    pushRec("Checklist");
    pushRec("Plan");
    pushRec("Steps");
    pushRec("Timeline");
  }
  if (quantitativeData) {
    pushRec("LineChart");
    pushRec("BarChart");
    pushRec("DataTable");
    pushRec("KpiCard");
  }
  if (architectureFlow) {
    pushRec("ArchitectureDiagram");
    pushRec("Diagram");
    pushRec("Flow");
    pushRec("Code");
  }
  if (deepAnalytical) {
    pushRec("ExecutiveSummary");
    pushRec("KeyFindings");
    pushRec("Callout");
    pushRec("Diagram");
    pushRec("DecisionTree");
    pushRec("MindMap");
  }

  const rolePrefs =
    ROLE_PREFERRED_FAMILIES[opts.lookId] ?? ROLE_PREFERRED_FAMILIES.rest;
  for (const r of rolePrefs) pushRec(r);

  return {
    spatialTransit,
    visualEntity,
    groupOrCost,
    comparison,
    planningProcess,
    quantitativeData,
    architectureFlow,
    deepAnalytical,
    newsIntent,
    imageQueries,
    recommendedComponents: recommended,
    mode,
  };
}

const FACTUAL_CORRECTION_OR_CHALLENGE_RE =
  /\b(?:bukannya|bukan\s+di|emangnya|emang\s+di|masa\s+sih|yakin\b|salah\b|keliru|cek\s+lagi|cari\s+lagi|setahu\s+(?:gue|gw|aku|saya)|setau\s+(?:gue|gw|aku|saya)|padahal|kata\s+(?:web|promotor|resmi)|resminya)\b/i;

const LOGISTICAL_OR_LIVE_SUBFACET_RE =
  /\b(?:penukaran|pertukaran|tukar|redeem|e-?tiket|e-?ticket|e-?voucher|voucher|wristband|gelang|tiket|lokasi|di\s+mana|dimana|tempat\s+tukar|venue|gedung|stadion|stadium|jis|gbk|senayan|gate|open\s+gate|rundown|setlist|tracklist|daftar\s+lagu|lineup|line-up|jadwal|tanggal|jam\s+(?:berapa|buka|mulai|operasional)|harga|biaya|tarif|shuttle|parkir|rute|akses|mrt|lrt|krl|whoosh|transjakarta|syarat|ketentuan|dokumen|surat\s+kuasa|promotor|ravel|pk\s+entertainment|konser|concert|live\s+in|tour|2025|2026|2027|terbaru|hari\s+ini|minggu\s+ini|bulan\s+ini)\b/i;

const SESSION_ENTITY_NOISE = new Set([
  "gue", "gw", "aku", "saya", "lo", "lu", "kamu", "kita", "kami", "mereka",
  "yang", "dan", "atau", "buat", "untuk", "dengan", "dari", "pada", "dalam",
  "kalau", "kalo", "jika", "terus", "trus", "soal", "tentang", "mengenai",
  "kasih", "tolong", "coba", "bisa", "dong", "nih", "deh", "sih", "aja",
  "apa", "siapa", "kapan", "dimana", "gimana", "bagaimana", "kenapa", "mengapa",
  "eh", "oh", "nah", "iya", "ya", "gak", "engga", "bukan", "bukannya", "ini", "itu",
  "info", "informasi", "detail", "lengkap", " UI", "OpenUI", "Stack", "Cards",
  "Versus", "Headline", "Timeline", "Steps", "Followups", "Callout", "VisualDossier",
]);

export interface SessionMemoryLedger {
  isActiveContinuation: boolean;
  isUserChallengeOrCorrection: boolean;
  entitySpine: string[];
  sessionSearchAnchor: string;
  priorTurnsTrail: string;
}

/**
 * Extracts a persistent Session Entity Spine & Turn Trail across ALL turns in the
 * current chat session so follow-up turns (Turn 2, Turn 3, Turn 8...) never suffer
 * amnesia, never drop Turn 1's root entities, and never repeat prior answers.
 */
export function buildSessionMemoryLedger(opts: {
  latestUserText: string;
  previousUserTexts?: string[];
  previousAssistantTexts?: string[];
  taskTransition?: "new_task" | "continue_task" | "refine_task" | "change_direction";
}): SessionMemoryLedger {
  const priorUsers = (opts.previousUserTexts ?? []).filter((t) => t.trim().length > 0);
  const priorAssts = (opts.previousAssistantTexts ?? []).filter((t) => t.trim().length > 0);
  const cleanLatest = (opts.latestUserText || "").trim();
  const isUserChallengeOrCorrection = FACTUAL_CORRECTION_OR_CHALLENGE_RE.test(cleanLatest);

  if (priorUsers.length === 0 || opts.taskTransition === "change_direction") {
    return {
      isActiveContinuation: false,
      isUserChallengeOrCorrection,
      entitySpine: [],
      sessionSearchAnchor: "",
      priorTurnsTrail: "",
    };
  }

  const combinedSessionUserText = priorUsers.join(" \n ");
  const combinedAssistantSample = priorAssts
    .slice(-4)
    .map((t) => t.slice(0, 600))
    .join(" \n ");
  const fullCorpus = `${combinedSessionUserText}\n${combinedAssistantSample}`;

  const entities: string[] = [];
  const pushEntity = (val: string) => {
    const clean = val.replace(/\s+/g, " ").trim();
    if (!clean || clean.length < 2) return;
    if (SESSION_ENTITY_NOISE.has(clean) || SESSION_ENTITY_NOISE.has(clean.toLowerCase())) return;
    if (
      !entities.some(
        (existing) =>
          existing.toLowerCase() === clean.toLowerCase() ||
          existing.toLowerCase().includes(clean.toLowerCase()),
      )
    ) {
      entities.push(clean);
    }
  };

  // Canonical high-value entity expansions when abbreviations appear in session
  if (/\b(?:my\s+chemical\s+romance|mcr)\b/i.test(fullCorpus)) {
    pushEntity("My Chemical Romance");
  }
  if (/\bravel(?:\s+entertainment)?\b/i.test(fullCorpus)) {
    pushEntity("Ravel Entertainment");
  }
  if (/\b(?:jakarta\s+international\s+stadium|\bjis\b)\b/i.test(fullCorpus)) {
    pushEntity("Jakarta");
  }
  const yearMatches = fullCorpus.match(/\b202[5-8]\b/g) ?? [];
  for (const ym of yearMatches.slice(0, 2)) {
    pushEntity(ym);
  }

  // Extract capitalized multi-word & single proper nouns from user turns first (highest signal)
  const userProperSpans =
    combinedSessionUserText.match(
      /\b(?:[A-Z0-9][A-Za-z0-9.-]{1,})(?:\s+[A-Z0-9][A-Za-z0-9.-]{1,}){0,3}\b/g,
    ) ?? [];
  for (const span of userProperSpans) {
    const filtered = span
      .split(/\s+/)
      .filter((w) => !SESSION_ENTITY_NOISE.has(w) && !SESSION_ENTITY_NOISE.has(w.toLowerCase()))
      .join(" ");
    if (filtered.length >= 3) pushEntity(filtered);
    if (entities.length >= 7) break;
  }

  // Also capture lowercase domain nouns from early user turns (e.g. "tentang jis dan mcr konser")
  if (entities.length < 4) {
    const rawUserWords = combinedSessionUserText
      .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !SESSION_ENTITY_NOISE.has(w.toLowerCase()));
    for (const w of rawUserWords.slice(0, 8)) {
      pushEntity(w);
      if (entities.length >= 6) break;
    }
  }

  const priorTurnsTrail = priorUsers
    .slice(-6)
    .map((u, idx) => {
      const turnNum = Math.max(1, priorUsers.length - Math.min(6, priorUsers.length) + idx + 1);
      return `T${turnNum}: "${u.replace(/\s+/g, " ").slice(0, 95)}"`;
    })
    .join(" -> ");

  const anchorParts = entities.slice(0, 5);
  return {
    isActiveContinuation: true,
    isUserChallengeOrCorrection,
    entitySpine: entities.slice(0, 7),
    sessionSearchAnchor: anchorParts.join(" ").slice(0, 110).trim(),
    priorTurnsTrail,
  };
}

/**
 * Determines whether Step 0 of `/api/brain` MUST execute a live `web_search` tool call
 * BEFORE synthesizing an answer (applies to BOTH reasoning and non-reasoning turns!)
 * so logistical sub-facets (e.g. e-ticket/wristband redemption venue & dates) and user
 * factual corrections ("eh bukannya di senayan") can NEVER be hallucinated from memory.
 */
export function shouldEnforceFreshWebVerification(opts: {
  latestUserText: string;
  previousUserTexts?: string[];
  hasInteraction?: boolean;
}): boolean {
  const clean = (opts.latestUserText || "").trim();
  if (!clean) return false;
  if (PURE_GREETING_PATTERN.test(clean)) return false;

  const words = clean.split(/\s+/).filter(Boolean);
  if (
    words.length <= 2 &&
    /^(?:ok|oke|sip|ya|iya|tidak|gak|engga|halo|hai|hi|makasih|thanks)$/i.test(
      words[0],
    )
  ) {
    return false;
  }

  if (opts.hasInteraction && !LIVE_FACT_OVERRIDE_PATTERN.test(clean) && !LOGISTICAL_OR_LIVE_SUBFACET_RE.test(clean)) {
    return false;
  }

  // Self-contained code / math / local refactor without external live-fact cues
  const hasInlineCodeFence = /`{3,}/.test(clean);
  if (
    (hasInlineCodeFence || LOCAL_CODE_OR_TRANSFORM_ONLY_PATTERN.test(clean)) &&
    !LIVE_FACT_OVERRIDE_PATTERN.test(clean) &&
    !LOGISTICAL_OR_LIVE_SUBFACET_RE.test(clean)
  ) {
    return false;
  }

  // 1) User factual correction / doubt ("eh bukannya di senayan", "yakin?", "salah") -> ALWAYS verify on web!
  if (FACTUAL_CORRECTION_OR_CHALLENGE_RE.test(clean)) {
    return true;
  }

  // 2) Logistical / live event / venue / ticket / schedule / price / transit facts -> ALWAYS verify on web!
  if (LOGISTICAL_OR_LIVE_SUBFACET_RE.test(clean) || LIVE_FACT_OVERRIDE_PATTERN.test(clean)) {
    return true;
  }

  // 3) Short follow-up question in an active session whose root topic involves live events/places/years
  const priorJoined = (opts.previousUserTexts ?? []).join(" ");
  if (
    priorJoined &&
    LOGISTICAL_OR_LIVE_SUBFACET_RE.test(priorJoined) &&
    /\b(?:di\s*mana|dimana|kapan|jam|berapa|gimana|bagaimana|apa\s+aja|boleh|bisa|syarat|cara)\b/i.test(clean)
  ) {
    return true;
  }

  return false;
}

/**
 * Determines whether a turn touches external live facts (`web_search`).
 * - When `reasoningEnabled` is true, returns `true` ONLY when `shouldEnforceFreshWebVerification`
 *   detects live logistical/event facts or user factual corrections so the model cannot skip verification.
 * - Filters out pure greetings, short confirmations, UI micro-interactions, and
 *   self-contained local code/math/concept queries unless live facts are requested.
 */
export function shouldMandateAutoWebSearch(opts: {
  latestUserText: string;
  previousUserTexts?: string[];
  hasInteraction?: boolean;
  reasoningEnabled?: boolean;
}): boolean {
  if (opts.reasoningEnabled) return false;
  if (opts.hasInteraction && !LIVE_FACT_OVERRIDE_PATTERN.test(opts.latestUserText || "")) {
    return false;
  }

  const clean = (opts.latestUserText || "").trim();
  if (!clean) return false;
  if (PURE_GREETING_PATTERN.test(clean)) return false;

  const words = clean.split(/\s+/).filter(Boolean);
  if (
    words.length <= 2 &&
    /^(?:ok|oke|sip|ya|iya|tidak|gak|engga|halo|hai|hi|makasih|thanks)$/i.test(
      words[0],
    )
  ) {
    return false;
  }

  // Self-contained code snippets / local refactor / conceptual math without live version/fact cues
  const hasInlineCodeFence = /`{3,}/.test(clean);
  if (
    (hasInlineCodeFence || LOCAL_CODE_OR_TRANSFORM_ONLY_PATTERN.test(clean)) &&
    !LIVE_FACT_OVERRIDE_PATTERN.test(clean)
  ) {
    return false;
  }

  return true;
}

export function shouldFetchVisualImages(opts: {
  latestUserText: string;
  hasInteraction?: boolean;
}): boolean {
  const clean = (opts.latestUserText || "").trim();
  if (!clean) return false;
  if (opts.hasInteraction) return false;
  if (PURE_GREETING_PATTERN.test(clean)) return false;
  const hasInlineCodeFence = /`{3,}/.test(clean);
  if (
    (hasInlineCodeFence || LOCAL_CODE_OR_TRANSFORM_ONLY_PATTERN.test(clean)) &&
    !VISUAL_ENTITY_PATTERN.test(clean)
  ) {
    return false;
  }
  return VISUAL_ENTITY_PATTERN.test(clean);
}

export function decideUiCompositionMode(opts: {
  latestUserText: string;
  lookId: string;
  workspaceView: WorkspaceViewId;
  hasInteraction?: boolean;
}): UiCompositionMode {
  return analyzeTurnContext(opts).mode;
}

/**
 * One worked reply per prompt. Each shows the rhythm the model should follow: prose, a block
 * where it helps, more prose, a closing block with Followups.
 */
function selectMicroExample(lookId: string, allowed?: Set<string>): string[] {
  const has = (...names: string[]) => !allowed || names.every((c) => allowed.has(c));

  if (["builder", "bug", "tester"].includes(lookId) && has("CodeDiffPatch", "RootCauseAnalysis", "Followups")) {
    return [
      [
        "Counter-nya berhenti di 1 karena callback `setInterval` dibuat sekali saat mount dan terus memegang `count` dari render pertama.",
        "",
        "```openui-lang",
        "root = Stack([rc1])",
        'rc1 = RootCauseAnalysis("Stale Closure pada Interval Timer", "Callback useEffect mengunci nilai awal state karena dependency array kosong.", [{category: "Lifecycle", cause: "Closure menangkap nilai count=0 saat mount pertama", weight: "Direct", evidence: "setInterval tidak pernah di-reset maupun membaca ref terbaru"}], "High")',
        "```",
        "",
        "Perbaikannya tidak perlu membuat ulang timer. Cukup minta React memberi nilai terbaru lewat updater function, jadi closure lama tidak lagi dibaca.",
        "",
        "```openui-lang",
        "root = Stack([diff1, f1])",
        'diff1 = CodeDiffPatch("Gunakan Functional State Updater", "setInterval(() => {\\n  setCount(count + 1);\\n}, 1000);", "setInterval(() => {\\n  setCount((prev) => prev + 1);\\n}, 1000);", "Counter.tsx", "tsx", "Menghindari pembacaan closure kadaluarsa tanpa me-recreate timer.")',
        'f1 = Followups(["Kapan perlu useRef dibanding functional update?", "Audit memory leak cleanup interval", "Simulasi race condition pada async timer", "Pola custom hook useInterval yang aman", "Benchmark re-render React DevTools"])',
        "```",
      ].join("\n"),
    ];
  }

  if (!has("ComparisonTable", "Steps", "Followups")) return [];
  if (lookId === "rest") {
    return [
      [
        "**Arabika** itu yang asem-buah dan wangi, **robusta** yang pahit nendang. Bedanya udah dari kebun: arabika tumbuh di 1.000-2.000 mdpl dan matengnya pelan, jadi gulanya lebih kompleks. Robusta tahan panas dan hama gara-gara kafeinnya hampir dua kali lipat, dan itu juga yang bikin dia pahit.",
        "",
        "```openui-lang",
        "root = Stack([ct1])",
        'ct1 = ComparisonTable("Arabika vs robusta", [{name: "Arabika"}, {name: "Robusta"}], [{criterion: "Kafein", "Arabika": "1,2-1,5%", "Robusta": "2,2-2,7%"}, {criterion: "Rasa", "Arabika": "Asem buah, manis", "Robusta": "Pahit, bodi tebel"}], "Arabika buat seduh manual, robusta buat kopi susu.")',
        "```",
        "",
        "Makanya cara nyeduhnya beda. Arabika paling keluar rasanya kalau lo seduh manual pakai air yang belum mendidih banget.",
        "",
        "```openui-lang",
        "root = Stack([s1, f1])",
        's1 = Steps([{title: "Giling medium", detail: "15 g biji, sehalus gula pasir"}, {title: "Blooming 30 detik", detail: "Tuang 30 ml air 92°C, diemin dulu"}, {title: "Tuang pelan-pelan", detail: "Sampai 240 ml, kelar di 2:30"}], "Nyeduh V60 buat arabika")',
        'f1 = Followups(["Rasio kopi-air buat french press", "Kenapa robusta enak buat kopi susu", "Bedanya proses natural sama washed", "Suhu air yang pas tiap metode", "Nyimpen biji biar nggak cepet apek"])',
        "```",
      ].join("\n"),
    ];
  }
  return [
    [
      "**Arabika** itu yang asem-buah dan wangi — tumbuh di 1.000-2.000 mdpl, matengnya pelan, jadi rasanya kompleks. **Robusta** kebalikannya: bandel, tahan panas sama hama, kafeinnya hampir dua kali lipat, makanya pahitnya nendang.",
      "",
      "```openui-lang",
      "root = Stack([ct1])",
      'ct1 = ComparisonTable("Arabika vs Robusta", [{name: "Arabika"}, {name: "Robusta"}], [{criterion: "Kafein", "Arabika": "1,2-1,5%", "Robusta": "2,2-2,7%"}, {criterion: "Rasa", "Arabika": "Asem buah, manis", "Robusta": "Pahit, bodi tebel"}], "Arabika buat seduh manual, robusta buat kopi susu.")',
      "```",
      "",
      "Nah, bedanya itu yang bikin cara nyeduhnya beda juga. Kalau lo seduh arabika manual, airnya jangan mendidih banget biar asem-buahnya keluar.",
      "",
      "```openui-lang",
      "root = Stack([s1, f1])",
      's1 = Steps([{title: "Giling medium", detail: "15 g biji, sehalus gula pasir"}, {title: "Blooming 30 detik", detail: "Tuang 30 ml air 92°C"}, {title: "Tuang bertahap", detail: "Sampai 240 ml, kelar di 2:30"}], "Nyeduh V60 buat arabika")',
      'f1 = Followups(["Rasio kopi-air buat french press", "Kenapa robusta enak buat kopi susu", "Beda proses natural sama washed", "Suhu air yang pas tiap metode", "Nyimpen biji biar tetep seger"])',
      "```",
    ].join("\n"),
  ];
}

export const MOMO_CORE_PREAMBLE = [
  "You work inside Momo: sharp, analytical, context-aware, and always speaking as the role described above.",
  "Reply naturally in the user's language (Indonesian/English matching their exact tone, depth, and nuance). All internal reasoning/thinking must be written in the user's language — Indonesian by default, English only when the user writes in English.",
  "",
  "## Situational Awareness, First-Principles Depth & Complementary Prose-UI Architecture",
  "- READ THE REAL INTENT & IMPLICIT CONTEXT: Parse the user's explicit question AND implicit situational constraints across the active session (who is involved, where they are going, what era/version/event is being discussed, what trade-offs or risks matter in practice). Never treat a follow-up turn as an isolated cold query.",
  "- COMPLEMENTARY PROSE vs GENUI DIVISION OF LABOR (ZERO DUPLICATION):",
  "  1. **Markdown Prose Layer**: Deliver deep causal synthesis, narrative context, behind-the-scenes mechanisms ('mengapa' & 'bagaimana'), multi-angle nuances, and concrete operational caveats. Use clean Markdown typography (`**bold**` for target concepts/entities, `*italic*` for foreign terms/titles/quotes, `` `code` `` for technical identifiers, and inline `(1)`, `(2)` citations). NEVER write shallow 2-sentence summaries when the user asks for detail, and NEVER telegraph or narrate which UI components you are rendering.",
  "  2. **OpenUI Lang Layer (`root = Stack([...])`)**: Select complementary, data-backed components from the active schema driven by actual content topology (Hybrid Semantic + Content-Driven Composition) that let the user inspect, compare, scale, or act on facets NOT repeated verbatim from prose. Spread them through the answer in several small blocks (see Response Rhythm below) instead of one block at the end:",
  "     - 2-way explanation/comparison ('X dan Y', 'X vs Y', 'bedanya X dan Y', e.g. kopi biasa vs decaf) -> `Versus(title, a, b, verdict)` or `ComparisonTable(title, options, criteria, recommendation)` (omit arbitrary `x/10` scores on narrative/conceptual comparisons), paired with fetched photos via `search_images` when subjects are tangible",
  "     - Multi-option ideation + recommendation (e.g. 'kasih 3 ide minuman dari kopi bubuk & mesin press, mana rekomendasi') -> call `search_images` for each concrete drink/dish/option FIRST, then render `Cards` (all options with bound `imageUrl`, flavor profile & why) + a comparative or interactive preparation block (`ComparisonTable`, `Steps`, or a recipe scaler when available in the active schema)",
  "     - Thematic lore, worldbuilding & regional/era variations -> `RegionalShowcase(title, regions, lore, kicker, subtitle)`",
  "     - Discographies, album/act tracklists, filmographies, or release catalogs -> `CatalogShelf(title, items, subtitle)`",
  "     - Song lyrics, poetry, or legal/code clauses with side-by-side verse analysis -> `AnnotatedSheet(title, sections, subtitle, meta)`",
  "     - 2 or 4 multi-facet operational dimensions (rules, symbolism, characters, venue access, CLI runbooks) -> `BentoGrid(title, items, subtitle)` using descriptive Indonesian `meta` labels (e.g. `\"Simbolisme\"`, `\"Kementerian\"`, `\"Wajib\"`, `\"Dilarang\"`) and semantic `slot` names (NEVER single letters `\"a\"`, `\"b\"`, `\"c\"`, `\"d\"`!)",
  "     - Interactive budget, headcount, dosage, or parameter estimation -> `Adjuster(title, controls, outputs, description)`",
  "",
  "## Response Rhythm: Where UI and Photos Sit",
  "- YOU decide the layout of the reply from three signals, in this order: what this session has been about (entities, decisions, UI already shown), what the latest message asks for, and what kind of evidence you now hold. Every role may use every component in the schema. Your role card below decides how you frame the answer, what you notice first and which components you reach for by habit; an explicit request from the user decides what must be in it.",
  "- Place each ```openui-lang block at the point where it helps: explain, show, explain further, show again. A comparison belongs right after the paragraph that introduces the two sides; steps belong after the reasoning that justifies them; a chart belongs next to the numbers it plots. Never append all UI after the last paragraph as an afterthought.",
  "- Vary the size of the blocks: an early block usually carries one or two components, a later one may carry up to three or four. Two to four blocks is typical for a rich answer, one for a focused answer, none for small talk.",
  "- Inline photo in prose: when a verified photo from `search_images` illustrates a specific point, you may drop a small inset between two paragraphs, on its own line: `![Title: one-sentence description](imageUrl \"left\")` (or `\"right\"`). It renders as a small indented thumbnail with the title and description beside it, so the description must add something the paragraphs do not say (what is shown, where, when). Variants: append `summary` after the side (`\"left summary\"`) when the caption should read as a short summary card; append `kronologi` and write `|`-separated alt segments (`![Kronologi: e1 | e2 | e3](url \"kronologi\")`, max five) for a mini timeline of key moments; `|` segments on a normal figure render as fact chips. Consecutive bare photo lines (no side) merge into a photo grid, max four. Use the returned `imageUrl` verbatim, at most three insets or one grid per reply, and never use this for logos or for a photo already shown in a block.",
  "",
  "## Dual Web Grounding, Multi-Turn Continuity & Zero-Hallucination Contract",
  "- Think and verify BEFORE answering: whenever a question involves live facts, concert setlists, tracklists, dates, events, ticket/e-voucher/wristband redemption, venues, pricing, news, documentation, benchmarks, or real-world places, call `web_search` (Exa + Firecrawl expanded full-text/Markdown) AND/OR leverage native Google Search grounding (`google_search`) first with focused, decomposed queries instead of guessing.",
  "- CRITICAL SUB-FACET ANTI-EXTRAPOLATION RULE: In multi-turn sessions, NEVER extrapolate ancillary event logistics (such as e-ticket / e-voucher / wristband exchange locations & dates, shuttle pickup points, or merch booths) from the main concert/event venue mentioned in earlier turns! Promoters (e.g. Ravel Entertainment) frequently hold ticket/wristband exchanges on earlier dates at a DIFFERENT venue (such as Gedung Serbaguna Senayan / GBK) than the concert stadium (such as JIS). Always run a dedicated `web_search` combining the session's active event/artist + the specific logistical sub-facet BEFORE answering.",
  "- ANTI-SYCOPHANCY ON USER CORRECTIONS: If the user doubts or corrects a fact (e.g. 'eh bukannya di Senayan?'), NEVER blindly flip your answer just to agree AND NEVER stubbornly defend an unverified prior claim. Immediately run `web_search` for the exact official announcement, verify the true location/date/rules, and state the verified truth plainly.",
  "- FULL-SESSION MEMORY & ZERO REPETITION: Maintain complete continuity across all previous turns in the active session without forgetting established entities, and NEVER repeat introductory paragraphs, facts, or UI layouts already delivered in earlier turns.",
  "- For concert setlists, album tracklists, or event rundowns, query authoritative sources directly (e.g. `\"<Artist> <Tour/Year> setlist full setlist.fm\"`) so you retrieve the complete song-by-song sequence.",
  "- Visual contract (all roles): if anything in the user's query or your answer is a tangible real-world subject (concerts, artists, people, places, venues/buildings, transit vehicles/stations, hotels, landmarks, dishes, products, artwork, gear), call `search_images` BEFORE composing UI with real-photo entity queries (e.g. exterior/interior/stage/train photo — NEVER logos or brand icons unless the user explicitly asks for a logo), and bind each returned `imageUrl` verbatim into image-bearing props — never invent photo URLs.",
  "- Skip `web_search` and `search_images` on self-contained local code debugging, refactoring, formal math, or pure text editing that needs no external facts.",
  "- Cite verified web sources inline using `(1)`, `(2)` or `[1]`, `[2]`. Never fabricate URLs, quotes, venues, dates, song titles, or coordinates.",
  "",
  "## Anti-Omission & Complete Enumeration Mandate (ZERO TRUNCATION)",
  "- NEVER omit, abbreviate, or cut short requested enumerations such as concert `setlist`s, album tracklists, event rundowns/schedules, full menus, specification tables, curricula, or step-by-step procedures.",
  "- Strictly BAN lazy truncation fillers like `\"dll.\"`, `\"dst.\"`, `\"dan lagu-lagu hits lainnya\"`, `\"...and more\"`, or listing only 4-5 sample items when the user asks for a setlist or full list.",
  "- If a concert setlist has 18-26 songs across Act I / Babak Utama, Act II / B-Stage, and Encore, write out EVERY SINGLE verified song in exact order (grouped cleanly by Act/Babak in Markdown or structured inside `CatalogShelf` / `Plan` / `Table` / `DataTable` / `Steps`).",
  "",
  "## Information Architecture & Contextual Iconography",
  "- Do NOT map queries mechanically 1-to-1 to a template component. Plan information architecture from user intent, task transition (`new_task | continue_task | refine_task | change_direction`), and verified available data.",
  "- Treat the OpenUI Lang components below as your active Capability Space (`Response UI` in Chat vs `Persistent Workspace` in Explore/Pinboard): select ONLY components backed by real available data. Never emit empty matrices, unverified charts, or redundant cards that repeat prose verbatim.",
  "- For `VisualDossier` `highlights` (`[{text, icon}, ...]`), `BentoGrid` items, and `Cards` `icon`, ALWAYS assign specific contextual icons per item rather than repeating one generic icon. Curated icon vocabulary: `ticket`, `mic`, `disc`, `list-music`, `headphones`, `guitar`, `radio`, `film`, `music`, `calendar`, `clock`, `pin`, `navigation`, `compass`, `route`, `globe`, `car`, `bus`, `bike`, `train`, `plane`, `footprints`, `coins`, `wallet`, `credit-card`, `tag`, `utensils`, `coffee`, `flame`, `shield`, `lock`, `code`, `terminal`, `wrench`, `cpu`, `database`, `git-branch`, `layers`, `activity`, `file-text`, `book`, `award`, `trophy`, `info`, `circle-check`, `check`, `alert`, `ban`, `sparkles`, `star`, `heart`, `users`, `sun`, `leaf`, `camera`, `palette`, `bag`, `droplets`, `pill`, `smartphone`, `package`, `megaphone`.",
  "- Let Markdown prose deliver nuanced reasoning, complete enumerations, causal mechanisms, and caveats, while ```openui-lang (`root = Stack([...])`) delivers scannable comparative, diagnostic, topological, spatial, or interactive structure.",
  "- NEVER emit legacy ```ui ComponentName {JSON} blocks.",
].join("\n");

export function buildRolePostureInstructions(
  lookId = "rest",
  workspaceView: WorkspaceViewId = "chat",
  allowedComponents?: Iterable<string>,
): string {
  const cfg = getRoleWorkspaceConfig(lookId);
  const roleLens = getRoleLens(cfg.lookId);
  const allowedSet = allowedComponents ? new Set(allowedComponents) : undefined;
  const preferred = (
    ROLE_PREFERRED_FAMILIES[cfg.lookId] ?? ROLE_PREFERRED_FAMILIES.rest
  ).filter((c) => !allowedSet || allowedSet.has(c));

  return [
    "## Active Role & Surface Posture",
    `- Role: ${cfg.label} (${cfg.lookId})`,
    `- Domain Expertise: ${cfg.identity.expertise}`,
    `- Register: ${cfg.identity.communicationStyle}`,
    `- Analytical Lens: ${roleLens.lens}`,
    `- Role affordances (intent hints, NOT component identifiers): ${cfg.capability.primaryAffordances.join(", ")}. Let the user's current task and available evidence override role defaults; choose only from the active schema.`,
    preferred.length > 0
      ? `- Role Capability Affinity: ${preferred.join(", ")}`
      : "",
    `- Active Surface: ${SURFACE_HINTS[workspaceView]}`,
    !allowedSet || allowedSet.has("RecipeScalerCard")
      ? "- For drink/food recipes or top recommended preparation with quantities, emit `RecipeScalerCard` with scalable servings, exact gram/ml ingredients, and concise steps."
      : "",
    "- Before emitting UI, check each block has usable content. If evidence is partial, state what is missing in prose. Never invent rows, measurements, or tracks to fill a component or a layout quota.",
    contentContractPrompt(allowedSet),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Role-specialized System Prompt with dynamic Capability-Space OpenUI Lang subsetting
 * and explicit Agentic Tool Harness discipline.
 */
export function buildStaticMomoSystemPrompt(
  lookId = "rest",
  workspaceView: WorkspaceViewId = "chat",
  options?: {
    allowedComponents?: Iterable<string>;
  },
): string {
  const allowedSet = options?.allowedComponents
    ? new Set(options.allowedComponents)
    : undefined;

  const roleCfg = getRoleWorkspaceConfig(lookId);
  const openUiPrompt = buildMomoSubsetOpenUiPrompt(allowedSet, {
    inlineMode: true,
    // Identity first: the role card and the writing craft open the prompt.
    preamble: [
      formatRolePersona(roleCfg.lookId, roleCfg.label),
      "",
      buildWritingCraft(roleCfg.lookId),
      "",
      MOMO_CORE_PREAMBLE,
    ].join("\n"),
    additionalRules: [
      "Positional arguments ONLY inside Component(...). Never use `prop: value` named syntax.",
      "Every identifier defined (except `root`) MUST be referenced inside `Stack([...])` or a parent component, otherwise it is dropped.",
      "A reply may hold several ```openui-lang blocks. Each one starts with its own `root = Stack([...])`, defines all of its own variables, and sits right after the prose it supports. `Followups` goes in the last block only.",
      "For `Code(code, language, title, ...)`, escape newlines as `\\n` and quotes as `\\\"` inside the string literal.",
      "Pass `null` for optional image slots when no verified photo URL or concrete real-world visual subject exists.",
      "NEVER truncate requested lists/setlists/tracklists/schedules with 'dll.' or '...'; enumerate all verified items completely.",
      "In `VisualDossier(..., highlights)`, pass `{text: \"...\", icon: \"<contextual-icon>\"}` objects so every highlight bullet displays a distinct domain-accurate icon.",
      "Use `BentoGrid(title, items, subtitle)` ONLY for synthesized multi-angle dashboards (strictly 2 or 4 complementary micro-widgets) where each slot is a verified, distinct facet of the active topic — never as a generic container. Comparisons use `Versus`/`ComparisonTable`; collections use `Cards`; chronology uses `Steps`/`Plan`.",
      "Use `CatalogShelf(title, items, subtitle)` for discographies, album tracklists, filmographies, or release catalogs (`items` with `title`, `year`, `kind`, `imageQuery`, `summary`, and `tracks` array `{title, duration, note, highlight}`).",
      "Use `AnnotatedSheet(title, sections, subtitle, meta)` for song lyrics + verse-by-verse meaning, poetry, or clause analysis (`sections` with `label`, `text`, `note`/`analysis`, `tag`). NEVER fabricate or guess unverified lyric lines — only include verified lines retrieved via `web_search`.",
      "Use `RegionalShowcase(title, regions, lore, kicker, subtitle)` when explaining thematic lore/worldbuilding alongside regional or era variations (`regions` with `{name, badge, title, summary, symbolLabel, symbolValue, focusLabel, focusValue}`), AND pair it with thorough Markdown prose when the user asks for deep detail.",
      "In `Checklist(items)`, every item starts `done: false` when you first create the list — never pre-check anything yourself. Set `done: true` ONLY on items the user has explicitly said are already finished or skipped; when they report progress ('yang pertama udah', 'belum semua'), re-emit the list mirroring exactly what they said is done and what is not.",
      "NEVER invent arbitrary `x/10` scores or `winner` badges on `Versus` for narrative, timeline, or conceptual comparisons unless verified numeric ratings actually exist.",
      "NEVER print internal planning scratchpad tags (`[Thought Process]`, `[UI Plan]`, `[Drafting Prose]`, `[Final Verification]`, `[Execution]`, `[Internal UI Plan Conclusion]`) in your visible answer, and ALWAYS wrap all `openui-lang` statements (including `Followups`) inside ```openui-lang ... ``` fences.",
    ],
    examples: selectMicroExample(lookId, allowedSet),
  });

  return [
    openUiPrompt,
    "",
    buildRolePostureInstructions(lookId, workspaceView, allowedSet),
  ].join("\n");
}

export function extractRecentOpenUiComponents(prevTexts: string[]): {
  counts: Record<string, number>;
  last: string[];
} {
  let counts: Record<string, number>;
  counts = {};
  let last: string[] = [];
  const rawCompRe = /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*([A-Z][A-Za-z0-9_]*)\s*\(/gm;
  const renderedSummaryRe = /\[OpenUI rendered:\s*([^\]]+)\]/g;
  const legacySummaryRe = /\[UI(?::\s*|\s+)([A-Z][A-Za-z0-9_]*)/g;

  const pushComp = (name: string, found: string[]) => {
    if (!name || name === "Stack" || name === "Followups") return;
    counts[name] = (counts[name] || 0) + 1;
    if (!found.includes(name)) found.push(name);
  };

  for (const text of prevTexts) {
    const found: string[] = [];
    let match: RegExpExecArray | null;
    rawCompRe.lastIndex = 0;
    while ((match = rawCompRe.exec(text)) !== null) {
      pushComp(match[1], found);
    }
    renderedSummaryRe.lastIndex = 0;
    while ((match = renderedSummaryRe.exec(text)) !== null) {
      const inner = match[1];
      const names = inner.match(/\b([A-Z][A-Za-z0-9_]*)(?=\s*\(|\s*,|\s*$)/g) ?? [];
      for (const n of names) pushComp(n, found);
    }
    legacySummaryRe.lastIndex = 0;
    while ((match = legacySummaryRe.exec(text)) !== null) {
      pushComp(match[1], found);
    }
    if (found.length > 0) last = found;
  }

  return { counts, last };
}

/**
 * Dynamic Turn Guidance pairing intent signals, harness tool posture,
 * anti-repetition history, and Context-Aware UIPlan instructions.
 */
export function buildDynamicTurnGuidance(opts: {
  lookId: string;
  latestUserText: string;
  previousUserTexts?: string[];
  taskTransition?: "new_task" | "continue_task" | "refine_task" | "change_direction";
  pinnedBot?: { name?: string; job?: string; look?: string } | null;
  uiInteraction?: UiInteractionPayload | null;
  workspaceView?: WorkspaceViewId;
  previousAssistantTexts?: string[];
  isRetry?: boolean;
  retryPreviousText?: string;
  uiPlanBlock?: string;
  needsExternalSearchHint?: boolean;
  workspaceSnapshot?: WorkspaceSnapshotPayload | null;
  reasoningEnabled?: boolean;
}): string {
  const cfg = getRoleWorkspaceConfig(opts.lookId);
  const name = opts.pinnedBot?.name || cfg.label;
  const activeView: WorkspaceViewId = opts.workspaceView || "chat";
  const prevTexts = [
    ...(opts.previousAssistantTexts ?? []),
    ...(opts.isRetry && opts.retryPreviousText ? [opts.retryPreviousText] : []),
  ];
  const usage = extractRecentOpenUiComponents(prevTexts.slice(-4));
  const countsStr = Object.entries(usage.counts)
    .sort((a, b) => b[1] - a[1])
    .map(([comp, count]) => `${comp}x${count}`)
    .join(", ");
  const cooldown = Object.entries(usage.counts)
    .filter(([, n]) => n >= 3)
    .map(([c]) => c);

  const sessionLedger = buildSessionMemoryLedger({
    latestUserText: opts.latestUserText,
    previousUserTexts: opts.previousUserTexts,
    previousAssistantTexts: opts.previousAssistantTexts,
    taskTransition: opts.taskTransition,
  });
  const isContinuingTopic = sessionLedger.isActiveContinuation;
  const priorUserAnchor = isContinuingTopic
    ? sessionLedger.sessionSearchAnchor ||
      (opts.previousUserTexts && opts.previousUserTexts.length > 0
        ? opts.previousUserTexts[opts.previousUserTexts.length - 1]
        : "")
    : "";

  const signals = analyzeTurnContext({
    latestUserText: opts.latestUserText,
    previousUserTexts: isContinuingTopic ? opts.previousUserTexts : undefined,
    lookId: cfg.lookId,
    workspaceView: activeView,
    hasInteraction: Boolean(opts.uiInteraction),
  });

  const activeSignalFlags = [
    signals.spatialTransit ? "spatial_transit" : "",
    signals.visualEntity ? "visual_entity" : "",
    signals.groupOrCost ? "group_or_cost" : "",
    signals.comparison ? "comparison" : "",
    signals.planningProcess ? "planning_process" : "",
    signals.quantitativeData ? "quantitative_data" : "",
    signals.architectureFlow ? "architecture_flow" : "",
    signals.deepAnalytical ? "deep_analytical" : "",
    signals.newsIntent ? "news_digest" : "",
  ].filter(Boolean);

  const freshOptions = signals.recommendedComponents.filter(
    (c) => !usage.last.includes(c),
  );
  const pickPool =
    freshOptions.length >= 3 ? freshOptions : signals.recommendedComponents;

  // Spotlight: fresh catalog archetypes matching this turn's signals, minus
  // anything already used — rotated deterministically per turn so every reply
  // surfaces different candidates instead of collapsing to the affinity list.
  const usedSet = new Set([...usage.last, ...cooldown]);
  const signalPool = [
    ...new Set([
      ...(signals.comparison ? SPOTLIGHT_BY_SIGNAL.comparison : []),
      ...(signals.planningProcess ? SPOTLIGHT_BY_SIGNAL.planning : []),
      ...(signals.quantitativeData ? SPOTLIGHT_BY_SIGNAL.quantitative : []),
      ...(signals.deepAnalytical ? SPOTLIGHT_BY_SIGNAL.deep : []),
      ...(signals.newsIntent ? SPOTLIGHT_BY_SIGNAL.news : []),
      ...(signals.spatialTransit ? SPOTLIGHT_BY_SIGNAL.spatial : []),
      ...(signals.visualEntity ? SPOTLIGHT_BY_SIGNAL.visual : []),
      ...(signals.architectureFlow ? SPOTLIGHT_BY_SIGNAL.flow : []),
      ...(signals.groupOrCost ? SPOTLIGHT_BY_SIGNAL.cost : []),
    ]),
  ].filter((c) => !usedSet.has(c));
  const freshPool =
    signalPool.length >= 3
      ? signalPool
      : SPOTLIGHT_ROTATION_POOL.filter((c) => !usedSet.has(c));
  const turnSeed =
    (opts.previousUserTexts?.length ?? 0) + (opts.isRetry ? 7 : 0);
  const spotlight = [
    ...new Set(
      Array.from(
        { length: Math.min(6, freshPool.length) },
        (_, i) => freshPool[(turnSeed + i) % freshPool.length],
      ),
    ),
  ];

  const wantsExhaustiveEnumeration = EXHAUSTIVE_ENUMERATION_PATTERN.test(
    `${priorUserAnchor} ${opts.latestUserText}`,
  );

  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  const lines = [
    `[Turn Context] Role: ${name} (${cfg.lookId}) | Surface: ${activeView} | UI Mode: ${signals.mode}`,
    `Today: ${today} (WIB). Judge "hari ini", "terbaru" and "sekarang" against this date, not against what you remember; never present an older event as current.`,
    isContinuingTopic
      ? `Session Continuity Spine: Active session entities = [${sessionLedger.entitySpine.join(", ") || priorUserAnchor.slice(0, 120)}] | Prior user arc = (${sessionLedger.priorTurnsTrail}). User's new follow-up is "${opts.latestUserText}". Keep ALL web searches, entity choices, prose, UI blocks, and Followups anchored to this session's subject + new sub-question, DO NOT repeat general overview already given in earlier turns, and DO NOT extrapolate unverified sub-facet locations/dates from Turn 1's main venue without calling \`web_search\`!`
      : `Latest Query Lock: Anchor 100% of your reasoning, searches, UI components, and Followups to "${opts.latestUserText}". Never use generic placeholder examples.`,
    sessionLedger.isUserChallengeOrCorrection
      ? `Factual Challenge / Correction Alert: The user is challenging or correcting a claim ("${opts.latestUserText}"). You MUST verify the exact official announcement via \`web_search\` (combining [${sessionLedger.entitySpine.slice(0, 4).join(" ")}] + "${opts.latestUserText}") BEFORE answering — neither guess nor flip-flop without primary web evidence.`
      : "",
    activeSignalFlags.length > 0
      ? `Detected Intent Signals: ${activeSignalFlags.join(", ")}`
      : "",
    wantsExhaustiveEnumeration
      ? `Complete Enumeration Lock: The user is asking for a full list/setlist/tracklist/schedule ("${opts.latestUserText.slice(0, 100)}"). Search authoritative sources (e.g. setlist.fm / official listings) first and output EVERY SINGLE track/item in complete order (Act I, Act II/B-Stage, Encore, etc.) — ZERO truncation, ZERO "dll." or "...and others".`
      : "",
    opts.pinnedBot?.job ? `Custom Brief: ${opts.pinnedBot.job}` : "",
    opts.uiInteraction
      ? `UI Interaction: user triggered \`${opts.uiInteraction.blockType}\` (${opts.uiInteraction.action}: "${opts.uiInteraction.label}"). Respond directly without filler.`
      : "",
    opts.needsExternalSearchHint
      ? `Tool Harness Directive: This query touches external facts, logistical sub-facets, schedules, venues, or live entities. Call \`web_search\`${sessionLedger.sessionSearchAnchor ? ` (anchoring query with "${sessionLedger.sessionSearchAnchor}")` : ""}${signals.visualEntity ? ` and \`search_images\` for real photographs (not logos)` : ""} FIRST before synthesizing your final answer.`
      : "",
    usage.last.length > 0
      ? `Anti-Repetition Lock: Last turn already used [${usage.last.join(", ")}] (History: ${countsStr}). Choose a DIFFERENT structural composition this turn unless strictly required by an explicit refinement.${cooldown.length > 0 ? ` Cooldown — used 3+ times this session, prefer a different archetype entirely: [${cooldown.join(", ")}].` : ""}`
      : "",
    spotlight.length > 0
      ? `Fresh Fit Spotlight: [${spotlight.join(", ")}] — catalog archetypes that fit this query's shape and haven't been used in this session. Lead with one of these over the usual defaults when the content supports it.`
      : "",
    opts.isRetry
      ? `Fresh Re-Response Directive (Retry): The user wants a brand-new response — NOT a repeat or light paraphrase of the discarded previous answer${opts.retryPreviousText ? ` (previous opening: "${opts.retryPreviousText.replace(/\s+/g, " ").slice(0, 140)}...")` : ""}. Drop the old framing, open from a sharper angle with newly surfaced verified specifics, and pick fresh UI components from [${pickPool.slice(0, 6).join(", ")}] instead of repeating the old layout.`
      : "",
  ].filter(Boolean);

  const persona = getRolePersona(cfg.lookId);
  lines.push(
    `Role Lock: You are ${cfg.label}, and this reply must read like ${cfg.label} wrote it. Open from what ${cfg.label} notices first (${persona.instinct.split(" Asks back")[0]}).${signals.mode === "prose_only" ? "" : ` Build the UI the way ${cfg.label} would: ${persona.ui} Another role would lay this answer out differently; if yours looks like a generic overview, redo it.`}`,
  );

  const registerLock = formatRegisterLock(cfg.lookId, opts.latestUserText, opts.previousUserTexts);
  if (registerLock) lines.push(registerLock);

  if (signals.newsIntent && signals.mode !== "prose_only") {
    lines.push(
      "News Directive: the user wants current events. Run `web_search` first, asking for what is being reported now (e.g. 'berita Indonesia hari ini', 'berita politik terbaru'), never for events you remember; two or three focused queries beat one broad one. Check each result's `publishedDate` against today's date: the feed carries only stories from the last few days, and anything older is background you mention in prose with its date. Open with one or two sentences that answer, then `NewsFeed(title, articles)` built only from those results: every article carries the exact `url` of the result it came from, a headline and a one-to-two sentence summary retold the way you would tell a friend (same register as your prose, never the outlet's own headline or newsroom phrasing), plus `outlet` and `publishedAt` when the result states them. Prefer results that are single articles over homepages and section indexes. Give the feed a plain spoken title. The app attaches each story's photo from the article itself, so pass no image. After the feed, say in prose what ties the stories together and what you make of it. Do not open with `VisualDossier` (a template for one subject or place), and do not emit `RiskMatrix` or any scored panel: news reports carry no probability or impact scores, and inventing them is fabrication.",
    );
  }

  if (signals.mode === "prose_only") {
    lines.push(
      "Decision: Respond in direct, friendly Markdown prose ONLY. Do NOT emit any ```openui-lang block for this casual/short turn.",
    );
  } else if (activeView === "explore") {
    lines.push(
      `Decision (Explore Spatial Canvas): Compose a distinct horizontal editorial spread sequence — keep prose tight and high-impact (1-2 crisp editorial beats, never a long chat essay), build 2-4 complementary visual/interactive blocks from [${pickPool.slice(0, 6).join(", ")}], and ALWAYS include \`Followups(["...", "...", "...", "...", "..."])\` at the end of \`root = Stack([...])\` with AT LEAST 5 specific next-branch prompts naming the exact entities/topic of "${opts.latestUserText.slice(0, 90)}".`,
    );
  } else if (signals.mode === "auto_light") {
    lines.push(
      `Decision: Deliver thorough Markdown explanation anchored to "${opts.latestUserText.slice(0, 90)}". Where structured UI genuinely sharpens a point, drop a small \`\`\`openui-lang\`\`\` block right there (likely fits: ${pickPool.slice(0, 5).join(", ")} — any schema component is allowed), then continue the prose. Close with a block that carries at least 5 contextual \`Followups\`.`,
    );
  } else {
    lines.push(
      `Decision: Plan information architecture first, then write deep analytical Markdown prose anchored to "${opts.latestUserText.slice(0, 90)}" with data-grounded \`\`\`openui-lang\`\`\` blocks woven in where each belongs (prose → block → prose → block; one or two components early, up to three or four later; each block its own \`root = Stack([...])\`). The last block includes AT LEAST 5 contextual \`Followups(["...", "...", "...", "...", "..."])\` specific to this exact topic.`,
    );
  }

  if (signals.mode !== "prose_only") {
    lines.push(
      `Visual Grounding Directive — Visual Contract (all roles): if anything in this query or your answer is a tangible real-world subject (drinks, dishes, ingredients, places, venues, artists, bands, albums, products, landmarks, artwork, gear), call \`search_images\` FIRST — before composing UI — using clean, descriptive photo queries for the SPECIFIC items you plan to showcase (if recommending 3 drinks or comparing 2 types of coffee, fetch a distinct photo for each concrete item; never search raw user filler words). When the tool returns verified assets, bind each returned \`imageUrl\` VERBATIM into the block's \`image\`/\`imageUrl\` prop (and \`sourceUrl\` into \`sourceUrl\`) — copy the URL exactly, never rewrite or guess it, and never invent photo URLs. Only fall back to \`imageQuery\` when no returned asset fits the slot, and then ALWAYS include the full primary entity/subject name (e.g. "My Chemical Romance The Black Parade album cover", NEVER bare "The Black Parade" or "Main Stage"). Assign DISTINCT assets to distinct slots — never reuse the same \`imageUrl\` across two cards unless they depict the same subject. Leave \`imageQuery\` omitted (\`null\`) on purely abstract, procedural, or code/math cards.`,
    );
  }

  if (signals.spatialTransit && signals.groupOrCost) {
    lines.push(
      "Logistics & Group Nuance: Include real transit duration ranges (normal vs peak/event rush), ingress/egress bottlenecks, and explicit per-person vs combined group/couple cost & convenience comparisons.",
    );
  }

  if (opts.uiPlanBlock) {
    lines.push("", opts.uiPlanBlock);
  }

  if (opts.reasoningEnabled) {
    // Demanding a thinking *language* here made the model skip thinking altogether (0 thought
    // tokens in every measured run), so this only asks for the plan-before-acting order.
    lines.push(
      "Reasoning Order: Think first. Before calling any tool or writing the answer, work out what the user needs, which facts or photos must be fetched, and how the reply will be structured. Then act on that plan.",
    );
  }

  return lines.join("\n");
}

/**
 * Clean native Gemini functionDeclarations (strictly omits `additionalProperties`
 * which Gemini's Schema object rejects with HTTP 400).
 */
export const GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: "web_search",
    description:
      "Search the live web using Exa & Firecrawl to ground answers in current facts, pricing, news, places, coordinates, release notes, or documentation. Formulate focused, specific search queries.",
    parameters: {
      type: "OBJECT",
      required: ["query"],
      properties: {
        query: {
          type: "STRING",
          description: "Specific concise web search query.",
        },
        statusNote: {
          type: "STRING",
          description:
            "Short dynamic Indonesian status label (e.g. 'Mencari benchmark React 19').",
        },
        numResults: {
          type: "NUMBER",
          description: "Number of results (1-8, defaults to 5).",
        },
        provider: {
          type: "STRING",
          enum: ["auto", "tinyfish", "exa", "firecrawl"],
        },
      },
    },
  },
  {
    name: "search_images",
    description:
      "Retrieve real, verified photographs from the web (concerts, artists, venues, places, landmarks, architecture, products, food, people). Returns normalized image assets (`imageUrl`, `sourceUrl`, `caption`) for binding into visual components. Skip for pure code/abstract math.",
    parameters: {
      type: "OBJECT",
      required: ["query"],
      properties: {
        query: {
          type: "STRING",
          description:
            "Short subject-first photo query: the subject's proper name plus at most one or two descriptors (e.g. 'My Chemical Romance live concert', 'Jakarta International Stadium exterior', 'Raja Ampat diving'). One subject per call; long descriptive sentences find nothing.",
        },
        statusNote: {
          type: "STRING",
          description:
            "Short dynamic Indonesian status label (e.g. 'Mencari foto konser My Chemical Romance').",
        },
        limit: {
          type: "NUMBER",
          description: "Number of image assets to retrieve (1-8, defaults to 4).",
        },
      },
    },
  },
  {
    name: "sync_workspace_board",
    description:
      "Persist multi-item itineraries, plans, or curated session items into Pinboard columns. Use when curating or updating trackable board cards/steps.",
    parameters: {
      type: "OBJECT",
      required: ["columns", "items"],
      properties: {
        columns: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            required: ["id", "title"],
            properties: {
              id: { type: "STRING" },
              title: { type: "STRING" },
              subtitle: { type: "STRING" },
              dateLabel: { type: "STRING" },
            },
          },
        },
        items: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            required: ["id", "columnId", "title"],
            properties: {
              id: { type: "STRING" },
              columnId: { type: "STRING" },
              slot: { type: "STRING" },
              title: { type: "STRING" },
              subtitle: { type: "STRING" },
              handNote: { type: "STRING" },
              metric: { type: "STRING" },
              imageQuery: { type: "STRING" },
              sticker: {
                type: "STRING",
                enum: ["heart", "star", "check", "sun"],
              },
              pin: {
                type: "STRING",
                enum: ["star", "alert", "check", "sun", "heart"],
              },
            },
          },
        },
      },
    },
  },
];
