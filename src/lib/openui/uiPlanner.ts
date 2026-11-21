import type {
  TaskTransition,
  UiInteractionPayload,
  UiPlanSummaryMeta,
  WorkspaceCompositionMode,
  WorkspaceSnapshotPayload,
  WorkspaceUpdateStrategy,
  WorkspaceViewId,
} from "@/types/momo";
import { VISUAL_ENTITY_PATTERN } from "@/lib/genUiDesignSpec";

/**
 * Context-Aware Generative UI Planner for Momo.
 *
 * Separates three concerns that must never be collapsed into rigid `query -> 1 component` maps:
 *   1. Intent & Task State Understanding (`new_task | continue_task | refine_task | change_direction`)
 *   2. Available Data Grounding (what facts, numbers, entities, geo, or photos actually exist)
 *   3. Capability Space Composition (`Response UI` for ephemeral Chat vs `Persistent Workspace` for Explore/Board)
 */

export type CapabilityFamilyId =
  | "entity_briefing"
  | "comparative_evaluation"
  | "verification_diagnostics"
  | "relational_topology"
  | "temporal_planning"
  | "quantitative_metrics"
  | "spatial_logistics"
  | "artifact_learning";

export interface CapabilityFamilySpec {
  id: CapabilityFamilyId;
  label: string;
  cognitivePurpose: string;
  requiredDataShape: string;
  components: string[];
}

export const CAPABILITY_FAMILIES: Record<CapabilityFamilyId, CapabilityFamilySpec> = {
  entity_briefing: {
    id: "entity_briefing",
    label: "Entity & Context Briefing",
    cognitivePurpose: "Establish situational grounding, key takeaways, status, and verified subject context.",
    requiredDataShape: "Verified subject summary, key facts, or core advisory.",
    components: [
      "Headline",
      "VisualDossier",
      "RegionalShowcase",
      "ExecutiveSummary",
      "SituationalOverview",
      "BentoGrid",
      "Callout",
    ],
  },
  comparative_evaluation: {
    id: "comparative_evaluation",
    label: "Comparative & Trade-off Evaluation",
    cognitivePurpose: "Evaluate 2+ options, architectures, or strategies across explicit dimensions and sacrifices.",
    requiredDataShape: "At least 2 distinct entities/options with comparable attributes, pros/cons, or scores.",
    components: [
      "ComparisonTable",
      "Versus",
      "TradeoffMatrix",
      "SwotAnalysis",
      "CostBenefitAnalysis",
      "Scorecard",
    ],
  },
  verification_diagnostics: {
    id: "verification_diagnostics",
    label: "Verification, Evidence & Root-Cause Diagnostics",
    cognitivePurpose: "Audit claims against evidence, isolate failure mechanisms, assess risk, and structure raw records.",
    requiredDataShape: "Verifiable claims, causal factors, risk items, primary quotes, or multi-column records.",
    components: [
      "FactCheckPanel",
      "RootCauseAnalysis",
      "KeyFindings",
      "RiskMatrix",
      "QuoteExtraction",
      "EvidenceCard",
      "DataTable",
      "Table",
    ],
  },
  relational_topology: {
    id: "relational_topology",
    label: "Relational Topology & System Flows",
    cognitivePurpose: "Map causal chains, multi-step pipelines, system boundaries, or branching decisions.",
    requiredDataShape: "Explicit directed relationships, state transitions, or hierarchical branches between nodes.",
    components: [
      "Flow",
      "Diagram",
      "ArchitectureDiagram",
      "DecisionTree",
      "MindMap",
      "ClaimEvidenceMap",
    ],
  },
  temporal_planning: {
    id: "temporal_planning",
    label: "Temporal Progression & Execution Plans",
    cognitivePurpose: "Sequence chronological events, phased roadmaps, actionable checklists, or kanban lanes.",
    requiredDataShape: "Ordered stages, dates/timestamps, dependencies, or checkable tasks.",
    components: [
      "Steps",
      "Timeline",
      "Plan",
      "Checklist",
      "GanttChart",
      "KanbanBoard",
    ],
  },
  quantitative_metrics: {
    id: "quantitative_metrics",
    label: "Quantitative Series & Interactive Modeling",
    cognitivePurpose: "Surface numeric KPIs, distributions, trends, or user-adjustable parameter simulations.",
    requiredDataShape: "Real numeric values, percentages, time-series points, or parametric formulas.",
    components: [
      "Stats",
      "KpiCard",
      "LineChart",
      "BarChart",
      "PieChart",
      "RadarChart",
      "AreaChart",
      "Gauge",
      "Chart",
      "Adjuster",
    ],
  },
  spatial_logistics: {
    id: "spatial_logistics",
    label: "Spatial Geography & Transit Logistics",
    cognitivePurpose: "Plot real-world venues/pins, transit corridors, travel times, and curated place cards.",
    requiredDataShape: "Named real-world places, routes, travel durations/costs, or venue attributes.",
    components: ["Map", "TransitRouteCard", "Cards", "BentoGrid"],
  },
  artifact_learning: {
    id: "artifact_learning",
    label: "Code Artifacts, Media & Interactive Mastery",
    cognitivePurpose: "Present code/config diffs, study flashcards, scalable recipes, design moodboards, or verification photos.",
    requiredDataShape: "Code snippets/diffs, domain terms, culinary ingredients, color palettes, or verified image assets.",
    components: [
      "Code",
      "CodeDiffPatch",
      "DocumentDiff",
      "ConceptFlashcards",
      "CatalogShelf",
      "AnnotatedSheet",
      "RecipeScalerCard",
      "MoodboardMosaic",
      "Palette",
      "Choices",
      "Quiz",
      "ImageWithCaption",
      "ImageWithCitation",
      "AsyncImage",
      "ImageGallery",
      "ImageComparison",
      "Followups",
    ],
  },
};

export interface AvailableDataProfile {
  webResultCount: number;
  verifiedDomains: string[];
  verifiedImages: Array<{
    query: string;
    imageUrl: string;
    sourceUrl?: string;
    caption?: string;
  }>;
  hasQuantitativeNumbers: boolean;
  hasTemporalSequence: boolean;
  hasRelationalEntities: boolean;
  hasGeoOrLocations: boolean;
  hasClaimsOrDiagnostics: boolean;
  hasCodeOrDiff: boolean;
  temporalCueCount?: number;
  quantitativeCueCount?: number;
  claimEvidenceCueCount?: number;
  boardSynced: boolean;
  boardItemsCount: number;
}

export interface UIPlanningContext {
  latestUserText: string;
  lookId: string;
  workspaceView: WorkspaceViewId;
  previousUserTexts: string[];
  previousAssistantTexts: string[];
  recentComponents: string[];
  availableData: AvailableDataProfile;
  workspaceSnapshot?: WorkspaceSnapshotPayload | null;
  uiInteraction?: UiInteractionPayload | null;
  isRetry?: boolean;
}

export interface UIPlan {
  purpose: string;
  compositionMode: WorkspaceCompositionMode;
  taskTransition: TaskTransition;
  updateStrategy: WorkspaceUpdateStrategy;
  archivedPriorOnPivot: boolean;
  activeCapabilities: CapabilityFamilyId[];
  allowedComponents: string[];
  dataGroundingRules: string[];
}

const PIVOT_PATTERN =
  /\b(?:ganti topik|topik lain|hal lain|lupakan itu|sekarang bahas|beralih ke|ngomong-ngomong soal|btw soal|change topic|switch to|forget that|different question)\b/i;

const REFINE_PATTERN =
  /\b(?:ubah|revisi|perbaiki|sesuaikan|fokuskan|persempit|filter|update|koreksi|ralat|lebih singkat|lebih detail|ganti bagian|bukannya|bukan\s+di|emangnya|emang\s+di|masa\s+sih|yakin\s*(?:di|itu|gitu|\?)|salah\b|keliru|cek\s+lagi|cari\s+lagi|setahu\s+(?:gue|gw|aku|saya)|setau\s+(?:gue|gw|aku|saya)|padahal|refine|tweak|adjust|modify|narrow down)\b/i;

const CONTINUE_PATTERN =
  /(?:^\s*(?:soal|kalau|kalo|terus|trus|nah|eh\b|lalu|berarti|jadi\s+kalau|jam\s+berapa|di\s*mana\s+(?:tukar|penukaran|pertukaran|lokasi|ambil|beli))|\b(?:lanjut|lanjutkan|tambahkan|bandingkan dua|bandingkan temuan|dari hasil tadi|dari rute tadi|terus kalau|bagaimana dengan|gimana kalau|selanjutnya|expand on|compare those|add to|what about)\b)/i;

function extractSignificantTokens(text: string): Set<string> {
  const stop = new Set([
    "yang", "dan", "atau", "dari", "untuk", "buat", "dengan", "kalau", "bisa",
    "apa", "kenapa", "mengapa", "bagaimana", "gimana", "tolong", "dong", "coba",
    "saya", "gue", "aku", "kamu", "kita", "ini", "itu", "ada", "jadi", "lebih",
    "tentang", "soal", "kasih", "info", "informasi", "enak", "bagus", "baru",
    "the", "and", "for", "with", "what", "how", "why", "this", "that", "from",
  ]);
  return new Set(
    (text || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !stop.has(t)),
  );
}

const ANAPHORA_CONTINUE_PATTERN =
  /(?:\b(?:itu|ini|tadi|tersebut|barusan|terkait|lanjut|sana|situ|nya|it|that|those|this|there|them)\b|[a-z]{4,}nya\b)/i;

const SESSION_DOMAIN_CLUSTERS: ReadonlyArray<RegExp> = [
  /\b(?:konser|concert|tour|festival|mcr|jis|gbk|senayan|stadion|stadium|tiket|e-?tiket|e-?ticket|e-?voucher|voucher|wristband|gelang|penukaran|pertukaran|tukar|gate|venue|seatplan|rundown|setlist|tracklist|lineup|promotor|ravel|shuttle|parkir)\b/i,
  /\b(?:rute|akses|mrt|lrt|krl|whoosh|transjakarta|busway|stasiun|halte|bandara|hotel|aston|check-?in|ongkos|tarif|macet|berangkat|pulang)\b/i,
  /\b(?:laporan\s+keuangan|saham|dividen|laba|pendapatan|kuartal|neraca|arus\s+kas|valuasi|emiten|bunga|kpr|cicilan|pajak)\b/i,
  /\b(?:kode|bug|error|api|nextjs|react|typescript|postgres|sql|redis|query|index|latency|deploy|server|komponen)\b/i,
];

export function detectTaskTransition(opts: {
  latestUserText: string;
  previousUserTexts: string[];
  uiInteraction?: UiInteractionPayload | null;
  isRetry?: boolean;
}): TaskTransition {
  const clean = (opts.latestUserText || "").trim();
  const prior = opts.previousUserTexts.filter((t) => t.trim().length > 0);

  if (prior.length === 0) return "new_task";
  if (opts.uiInteraction) return "refine_task";
  if (PIVOT_PATTERN.test(clean)) return "change_direction";
  if (!opts.isRetry && REFINE_PATTERN.test(clean)) return "refine_task";
  if (CONTINUE_PATTERN.test(clean)) return "continue_task";

  // Check lexical & domain-facet continuity across the entire active session
  const sessionCorpus = prior.join(" ");
  const curTokens = extractSignificantTokens(clean);
  const prevTokens = extractSignificantTokens(sessionCorpus);
  let overlap = 0;
  for (const tok of curTokens) {
    if (prevTokens.has(tok)) overlap += 1;
  }

  const sharesDomainFacet = SESSION_DOMAIN_CLUSTERS.some(
    (re) => re.test(sessionCorpus) && re.test(clean),
  );

  if (
    overlap > 0 ||
    sharesDomainFacet ||
    (clean.split(/\s+/).length <= 10 && ANAPHORA_CONTINUE_PATTERN.test(clean))
  ) {
    return "continue_task";
  }
  return "change_direction";
}

export function createEmptyDataProfile(
  snapshot?: WorkspaceSnapshotPayload | null,
): AvailableDataProfile {
  return {
    webResultCount: 0,
    verifiedDomains: [],
    verifiedImages: [],
    hasQuantitativeNumbers: false,
    hasTemporalSequence: false,
    hasRelationalEntities: false,
    hasGeoOrLocations: false,
    hasClaimsOrDiagnostics: false,
    hasCodeOrDiff: false,
    boardSynced: false,
    boardItemsCount: snapshot?.items?.length ?? 0,
  };
}

export function enrichDataProfileFromTextAndTools(
  base: AvailableDataProfile,
  opts: {
    userText: string;
    attachmentText?: string;
    toolSnippets?: string[];
  },
): AvailableDataProfile {
  const corpus = [
    opts.userText,
    opts.attachmentText || "",
    ...(opts.toolSnippets ?? []),
  ].join("\n");

  const hasQuantitativeNumbers =
    base.hasQuantitativeNumbers ||
    /(?:\b\d+(?:[.,]\d+)?\s*(?:%|ms|detik|menit|jam|km|rb|ribu|jt|juta|miliar|usd|idr|rp|gb|mb|req\/s|fps|x)\b|\brp\s?\d)/i.test(
      corpus,
    );

  const hasTemporalSequence =
    base.hasTemporalSequence ||
    /(?:\b202[4-9]\b|\btahap\b|\bfase\b|\bhari\s+\d|\bstep\b|\bkronologi\b|\bjadwal\b|\btimeline\b|\broadmap\b|\b(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\b)/i.test(
      corpus,
    );

  const hasRelationalEntities =
    base.hasRelationalEntities ||
    /(?:\barsitektur\b|\btopologi\b|\bworkflow\b|\bpipeline\b|\bgraph\b|\brelasi\b|\bdependen|\bupstream\b|\bdownstream\b|\bclient\b[\s\S]{0,40}\bserver\b|\bproxy\b|\bkausal)/i.test(
      corpus,
    );

  const hasGeoOrLocations =
    base.hasGeoOrLocations ||
    /(?:\bstadion\b|\bstadium\b|\bjis\b|\bhotel\b|\bbandara\b|\bstasiun\b|\bhalte\b|\bjakarta\b|\bbandung\b|\bbali\b|\bsurabaya\b|\byogyakarta\b|\brute\b|\bjarak\b|\bkoordinat\b|\blokasi\b)/i.test(
      corpus,
    );

  const hasClaimsOrDiagnostics =
    base.hasClaimsOrDiagnostics ||
    /(?:\brumor\b|\bmitos\b|\bfakta\b|\bklaim\b|\bverifikasi\b|\broot\s*cause\b|\bpenyebab\b|\brisiko\b|\banomali\b|\bbug\b|\berror\b|\binvestigasi\b)/i.test(
      corpus,
    );

  const hasCodeOrDiff =
    base.hasCodeOrDiff ||
    /(?:`{3,}|function\s+\w+|const\s+\w+\s*=|interface\s+\w+|class\s+\w+|\bdiff\b|\bpatch\b|\brefactor\b|\btypescript\b|\bsql\b|\bnginx\b)/i.test(
      corpus,
    );

  const temporalMatches = corpus.match(
    /(?:\b(?:19\d{2}|20[0-3]\d)\b|\btahap\s+\d|\bfase\s+\d|\bhari\s+\d|\bstep\s+\d|\b(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\b)/gi,
  );
  const temporalCueCount = Math.max(
    base.temporalCueCount ?? 0,
    new Set((temporalMatches ?? []).map((m) => m.toLowerCase())).size,
  );

  const quantMatches = corpus.match(
    /\b\d+(?:[.,]\d+)?\s*(?:%|ms|detik|menit|jam|km|rb|ribu|jt|juta|miliar|usd|idr|rp|gb|mb|x)\b/gi,
  );
  const quantitativeCueCount = Math.max(
    base.quantitativeCueCount ?? 0,
    new Set((quantMatches ?? []).map((m) => m.toLowerCase())).size,
  );

  const claimMatches = corpus.match(
    /\b(?:rumor|mitos|hoax|klaim|kontroversi|dibantah|klarifikasi|verifikasi|fakta|bukti|evidence|disputed|root\s*cause|kritik|polemik)\b/gi,
  );
  const claimEvidenceCueCount = Math.max(
    base.claimEvidenceCueCount ?? 0,
    new Set((claimMatches ?? []).map((m) => m.toLowerCase())).size,
  );

  return {
    ...base,
    hasQuantitativeNumbers,
    hasTemporalSequence,
    hasRelationalEntities,
    hasGeoOrLocations,
    hasClaimsOrDiagnostics,
    hasCodeOrDiff,
    temporalCueCount,
    quantitativeCueCount,
    claimEvidenceCueCount,
  };
}

const ROLE_DEFAULT_CAPABILITIES: Record<string, CapabilityFamilyId[]> = {
  rest: ["entity_briefing", "comparative_evaluation"],
  traveller: ["spatial_logistics", "temporal_planning", "entity_briefing"],
  designer: ["artifact_learning", "comparative_evaluation"],
  money: ["quantitative_metrics", "comparative_evaluation"],
  bug: ["verification_diagnostics", "artifact_learning", "relational_topology"],
  investigate: ["verification_diagnostics", "relational_topology", "temporal_planning"],
  captain: ["entity_briefing", "verification_diagnostics", "comparative_evaluation"],
  builder: ["relational_topology", "artifact_learning", "comparative_evaluation"],
  tester: ["verification_diagnostics", "quantitative_metrics"],
  guard: ["verification_diagnostics", "relational_topology"],
  planner: ["temporal_planning", "comparative_evaluation"],
  cook: ["artifact_learning"],
  write: ["entity_briefing", "verification_diagnostics"],
  director: ["artifact_learning", "temporal_planning"],
  tutor: ["artifact_learning", "relational_topology"],
  coach: ["temporal_planning", "quantitative_metrics"],
  music: ["entity_briefing", "artifact_learning"],
  garden: ["entity_briefing", "temporal_planning"],
};

/**
 * When the user names the artefact they want ("grafik", "mind map", "kanban"), its family is
 * flagged as active for this turn. The model still decides what to compose.
 */
const EXPLICIT_UI_REQUESTS: Array<[RegExp, CapabilityFamilyId[]]> = [
  [/\b(?:cara\s+kerja|mekanisme|proses|alur|siklus|tahapan|how\s+(?:does|do))\b/i, ["relational_topology"]],
  [/\b(?:grafik|chart|diagram\s+(?:batang|garis|lingkaran|pie)|tren|statistik|persentase|pertumbuhan|proyeksi|simulasi|kalkulator|hitung(?:kan)?|cicilan)\b/i, ["quantitative_metrics"]],
  [/\b(?:mind\s*map|peta\s+(?:konsep|pikiran)|decision\s*tree|pohon\s+keputusan|flow\s*chart|diagram\s+alur|alur\s+kerja|arsitektur|topologi)\b/i, ["relational_topology"]],
  [/\b(?:kanban|gantt|timeline|lini\s+masa|linimasa|kronologi|roadmap|sprint|milestone)\b/i, ["temporal_planning"]],
  [/\b(?:swot|pro\s*(?:dan|&|\/|-)?\s*kontra|plus\s+minus|kelebihan\s+(?:dan|&)\s+kekurangan|untung\s+rugi|trade-?off|scorecard|cost\s*benefit)\b/i, ["comparative_evaluation"]],
  [/\b(?:risk\s*matrix|matriks\s+risiko|risiko|cek\s+fakta|fact\s*check|hoax|hoaks|root\s*cause|akar\s+masalah|bukti|temuan\s+utama)\b/i, ["verification_diagnostics"]],
  [/\b(?:galeri|gallery|foto-?foto|kumpulan\s+foto|moodboard|palet|flashcard|kuis|quiz)\b/i, ["artifact_learning"]],
  [/\b(?:peta|map|rute|lokasi|denah)\b/i, ["spatial_logistics"]],
];

export function planContextAwareUi(ctx: UIPlanningContext): UIPlan {
  const clean = (ctx.latestUserText || "").trim();
  const compositionMode: WorkspaceCompositionMode =
    ctx.workspaceView === "explore" || ctx.workspaceView === "board"
      ? "persistent_workspace"
      : "response_ui";

  const priorCount =
    ctx.workspaceView === "explore"
      ? (ctx.workspaceSnapshot?.exploreTurnCount ?? ctx.previousAssistantTexts.length)
      : ctx.previousAssistantTexts.length;

  const taskTransition = detectTaskTransition({
    latestUserText: clean,
    previousUserTexts: ctx.previousUserTexts,
    uiInteraction: ctx.uiInteraction,
    isRetry: ctx.isRetry,
  });

  let updateStrategy: WorkspaceUpdateStrategy = "create";
  let archivedPriorOnPivot = false;

  if (ctx.isRetry) {
    updateStrategy = "create";
  } else if (compositionMode === "persistent_workspace") {
    if (priorCount === 0 || taskTransition === "new_task") {
      updateStrategy = "create";
    } else if (taskTransition === "continue_task") {
      updateStrategy = "append";
    } else if (taskTransition === "refine_task") {
      updateStrategy = "update";
    } else {
      updateStrategy = "replace";
      archivedPriorOnPivot = true;
    }
  } else {
    updateStrategy = taskTransition === "refine_task" ? "update" : "create";
  }

  const chosenFamilies = new Set<CapabilityFamilyId>();
  chosenFamilies.add("entity_briefing");

  const roleCaps =
    ROLE_DEFAULT_CAPABILITIES[ctx.lookId] ?? ROLE_DEFAULT_CAPABILITIES.rest;
  for (const rc of roleCaps) chosenFamilies.add(rc);

  const d = ctx.availableData;
  if (d.verifiedImages.length > 0) chosenFamilies.add("artifact_learning");
  if (d.hasGeoOrLocations) chosenFamilies.add("spatial_logistics");
  if (d.hasQuantitativeNumbers) chosenFamilies.add("quantitative_metrics");
  if (d.hasTemporalSequence) chosenFamilies.add("temporal_planning");
  if (d.hasRelationalEntities) chosenFamilies.add("relational_topology");
  if (d.hasClaimsOrDiagnostics) chosenFamilies.add("verification_diagnostics");
  if (d.hasCodeOrDiff) chosenFamilies.add("artifact_learning");

  if (
    /(?:banding|compare|versus|\bvs\b|perbandingan|perbedaan|bedanya|beda\s+antara|mending|pilihan|trade-?off|opsi|alternatif|rekomendasi|\b(?:tentang|antara)\s+[^?.,]{2,40}\s+(?:dan|sama)\s+[^?.,]{2,40})/i.test(
      clean,
    )
  ) {
    chosenFamilies.add("comparative_evaluation");
  }
  if (
    /(?:resep|masak|minuman|kopi|coffee|decaf|espresso|latte|matcha|teh|seduh|french\s*press|mesin\s+press|porsi|bahan|flashcard|istilah|konsep|moodboard|palet|warna|kuis|quiz|kasih\s+ide|ide\s+\d)/i.test(
      clean,
    )
  ) {
    chosenFamilies.add("artifact_learning");
  }
  if (
    /(?:langkah|cara\s+buat|cara\s+bikin|tutorial|panduan|step|tahap|urutan|persiapan|checklist|jadwal|itinerary|rencana)/i.test(
      clean,
    )
  ) {
    chosenFamilies.add("temporal_planning");
  }

  for (const [cue, families] of EXPLICIT_UI_REQUESTS) {
    if (!cue.test(clean)) continue;
    for (const famId of families) chosenFamilies.add(famId);
  }

  // Every role sees the whole catalog. The active families above tell the model where this
  // turn's query and evidence point; the role is a preference, never a gate. A constant
  // schema also keeps the static system prompt identical between turns, which caches better.
  const allowedSet = new Set<string>(
    Object.values(CAPABILITY_FAMILIES).flatMap((family) => family.components),
  );

  const groundingRules: string[] = [];

  // Soft Gate 1: Photo/gallery grounding guidance — break the Step-0 chicken-and-egg trap!
  const isTangibleVisualTopic = VISUAL_ENTITY_PATTERN.test(clean);
  if (d.verifiedImages.length === 0 && isTangibleVisualTopic) {
    groundingRules.push(
      "Visual Grounding Action (BEFORE UI): This topic involves tangible real-world subjects and 0 verified photos are attached yet. Call `search_images` FIRST with clean descriptive photo queries for the specific concrete items/drinks/dishes/places you plan to present (e.g. 2-3 distinct calls for recommended items), then bind each returned `imageUrl` verbatim into `Cards`/`VisualDossier`/`ImageWithCaption`. Only pass `null` if `search_images` returns no usable photo.",
    );
  } else if (d.verifiedImages.length === 0) {
    groundingRules.push(
      "Soft Grounding (Media): No verified external photographs are attached yet. Avoid `ImageGallery` unless you fetch verified photos via `search_images`, never invent placeholder image URLs, and pass `null` for optional photo slots on `VisualDossier`/`Headline` on abstract topics.",
    );
  } else if (d.verifiedImages.length < 3) {
    groundingRules.push(
      `Soft Grounding (Media): Verified image count is ${d.verifiedImages.length} (< 3). Bind your verified \`imageUrl\`(s) verbatim into \`VisualDossier\`/\`ImageWithCaption\`/\`Cards\`, or call \`search_images\` for additional distinct items before rendering a 3+ card gallery.`,
    );
  }

  // Soft Gate 2: Quantitative chart grounding guidance (allow charts when AI has real figures, forbid fabrication)
  if (!d.hasQuantitativeNumbers) {
    groundingRules.push(
      "Soft Grounding (Quantitative): No numeric series were pre-detected in the prompt text. You MAY still choose `Stats`, `KpiCard`, `LineChart`, `BarChart`, `PieChart`, `AreaChart`, or `RadarChart` if you have verified/real benchmarks or fetched numbers, but NEVER fabricate numbers just to draw a chart.",
    );
  }

  // Soft Gate 3: Topology graph grounding guidance
  if (!d.hasRelationalEntities) {
    groundingRules.push(
      "Soft Grounding (Topology): Only choose `ArchitectureDiagram` or `ClaimEvidenceMap` when the answer genuinely involves multi-node dependencies, flows, or claim-to-evidence links.",
    );
  }

  // Content-Driven Data-Density Directives (Opsi B: adapt layout dominance to retrieved data shape)
  const temporalDensity = d.temporalCueCount ?? 0;
  const quantDensity = d.quantitativeCueCount ?? 0;
  const claimDensity = d.claimEvidenceCueCount ?? 0;
  const visualDensity = d.verifiedImages.length;

  if (temporalDensity >= 4) {
    groundingRules.push(
      `Content-Driven Bias (Chronology = ${temporalDensity} dated cues): Retrieved data is rich in chronological milestones; let \`Timeline\`, \`Plan\`, or \`CatalogShelf\` lead the composition instead of a generic summary.`,
    );
  }
  if (visualDensity >= 3) {
    groundingRules.push(
      `Content-Driven Bias (Visuals = ${visualDensity} verified photos): Rich verified imagery is available; lead with a visual hero (\`VisualDossier\`, \`Headline\` with image, or \`ImageGallery\`/\`MoodboardMosaic\`).`,
    );
  }
  if (claimDensity >= 3) {
    groundingRules.push(
      `Content-Driven Bias (Evidence/Claims = ${claimDensity} cues): Source material contains controversies, claims, or disputed points; prioritize \`FactCheckPanel\`, \`EvidenceCard\`, or \`ClaimEvidenceMap\`.`,
    );
  }
  if (quantDensity >= 5) {
    groundingRules.push(
      `Content-Driven Bias (Metrics = ${quantDensity} numeric points): Data is numbers-heavy; surface \`Stats\`, \`ComparisonTable\`, or \`LineChart\`/\`BarChart\` rather than prose-only cards.`,
    );
  }

  // Workspace continuity rule
  if (compositionMode === "persistent_workspace") {
    const existingComps = ctx.workspaceSnapshot?.existingExploreComponents ?? [];
    if (updateStrategy === "append" && existingComps.length > 0) {
      groundingRules.push(
        `Workspace Strategy = APPEND (continue_task): prior workspace already displays [${existingComps.slice(0, 6).join(", ")}]. Add complementary panels for the new angle instead of regenerating the entire overview from scratch.`,
      );
    } else if (updateStrategy === "update") {
      groundingRules.push(
        "Workspace Strategy = UPDATE (refine_task): refine only the targeted analysis/panel requested by the user while keeping established session facts intact.",
      );
    } else if (updateStrategy === "replace" && archivedPriorOnPivot) {
      groundingRules.push(
        "Workspace Strategy = REPLACE (change_direction): user pivoted goals; compose a fresh workspace architecture for the new objective (prior turns remain accessible in archived turn history).",
      );
    }
  }

  const activeCapabilities = Array.from(chosenFamilies);
  const purpose =
    compositionMode === "persistent_workspace"
      ? `Persistent Workspace (${updateStrategy}) via [${activeCapabilities.join(", ")}]`
      : `Ephemeral Response UI (${updateStrategy}) via [${activeCapabilities.join(", ")}]`;

  return {
    purpose,
    compositionMode,
    taskTransition,
    updateStrategy,
    archivedPriorOnPivot,
    activeCapabilities,
    allowedComponents: Array.from(allowedSet),
    dataGroundingRules: groundingRules,
  };
}

export function toUiPlanSummaryMeta(plan: UIPlan): UiPlanSummaryMeta {
  return {
    compositionMode: plan.compositionMode,
    taskTransition: plan.taskTransition,
    updateStrategy: plan.updateStrategy,
    ...(plan.archivedPriorOnPivot ? { archivedPriorOnPivot: true } : {}),
    activeCapabilities: plan.activeCapabilities,
  };
}

export function formatUiPlanPromptBlock(
  plan: UIPlan,
  ctx: UIPlanningContext,
): string {
  const snap = ctx.workspaceSnapshot;
  const lines: string[] = [
    "[INTERNAL UI PLANNER — DO NOT ECHO, QUOTE, OR OUTPUT THESE DIRECTIVES IN YOUR REPLY]",
    `Mode=${plan.compositionMode} | Transition=${plan.taskTransition} | Strategy=${plan.updateStrategy}`,
    `ActiveCapabilities=${plan.activeCapabilities
      .map((id) => `${id}(${CAPABILITY_FAMILIES[id].label})`)
      .join(", ")} — where this turn's query, session topic and fetched evidence point. The whole component catalog is available to every role: pick whatever fits the content, including components outside these families.`,
    `DataSnapshot: webResults=${ctx.availableData.webResultCount}, verifiedPhotos=${ctx.availableData.verifiedImages.length}, numbers=${ctx.availableData.hasQuantitativeNumbers}, temporal=${ctx.availableData.hasTemporalSequence}, relational=${ctx.availableData.hasRelationalEntities}, geo=${ctx.availableData.hasGeoOrLocations}`,
  ];

  if (snap && (snap.items.length > 0 || snap.pinnedTitles.length > 0)) {
    const colNames = snap.columns.map((c) => c.title).join(", ");
    const sampleItems = snap.items
      .slice(0, 8)
      .map((it) => `${it.title}${it.done ? " (done)" : ""}`)
      .join("; ");
    lines.push(
      `- Existing Session Workspace State: columns=[${colNames}] | items(${snap.items.length})=[${sampleItems}]${snap.pinnedTitles.length > 0 ? ` | pinned=[${snap.pinnedTitles.slice(0, 5).join(", ")}]` : ""}`,
    );
  }

  if (ctx.recentComponents.length > 0 && plan.updateStrategy !== "update") {
    lines.push(
      `- Anti-Redundancy: recent turn already rendered [${ctx.recentComponents.join(", ")}]. Structure information first, then pick only components justified by verified data without duplicating prose word-for-word.`,
    );
  }

  for (const rule of plan.dataGroundingRules) {
    lines.push(`[Internal Directive] ${rule}`);
  }

  return lines.join("\n");
}
