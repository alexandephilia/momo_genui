import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildMomoOpenUiPrompt,
  buildMomoSubsetOpenUiPrompt,
  getMomoOpenUiJSONSchema,
  INTEL_CHAT_COMPONENTS,
  MOMO_OPENUI_COMPONENT_NAMES,
} from "../momoSchema";
import {
  createEmptyDataProfile,
  detectTaskTransition,
  enrichDataProfileFromTextAndTools,
  planContextAwareUi,
} from "../uiPlanner";
import {
  compressOpenUiForHistory,
  getOpenUiUnresolvedRefs,
  hasUnclosedOpenUiStream,
  openUiParseResultToMistlineBlocks,
  parseMixedStreamToMistlineBlocks,
  parseOpenUiMixedStream,
} from "../streamParser";
import {
  analyzeTurnContext,
  buildDynamicTurnGuidance,
  buildStaticMomoSystemPrompt,
  decideUiCompositionMode,
  extractRecentOpenUiComponents,
  ROLE_PREFERRED_FAMILIES,
  shouldFetchVisualImages,
  shouldMandateAutoWebSearch,
} from "../../genUiDesignSpec";
import { inferLookByKeyword } from "../../localBrain";
import { replaceProseEmDashes } from "../../genUiStreamParser";
import { ROLE_PERSONAS, formatRegisterLock, readUserRegister } from "../../rolePersonas";
import { bindNewsArticlesToSources, normalizeNewsArticles } from "../newsBinding";
import { LOOK_NAMES } from "../../../data/looks";
import { expandWebSearchQueries, extractImageAssetStem, isLikelyArticleUrl } from "../../webSearch";
import {
  distillVisualSearchQuery,
  extractDistinctiveQueryTokens,
  isAbstractNonVisualTitle,
  isImageAssetContextuallyRelevant,
  isNonPhotographicLogoOrGraphic,
  isGenericPlaceholderQuery,
  isPhotographicImageUrl,
  isUsableArticleImageUrl,
} from "../../imageAssetContract";
import {
  inferContextualIcon,
  MOMO_ICON_VOCABULARY,
  normalizeMistlineIconName,
} from "../../../components/genui/MistlineIcons";

describe("OpenUI Lang Schema & Prompt", () => {
  it("uses role hints and only advertises relevant content contracts in the prompt", () => {
    const direct = buildStaticMomoSystemPrompt("music", "chat", { allowedComponents: ["CatalogShelf"] });
    assert.match(direct, /Role affordances .*editorial_cards/);
    assert.match(direct, /CatalogShelf: items: at least one named release/);
    assert.doesNotMatch(direct, /Chart: data: labeled points/);
  });

  it("preserves prose and siblings, removes empty final UI, and never turns missing chart values into zero", () => {
    const response = [
      "Angka untuk rilisan lainnya belum tersedia.",
      "```openui-lang",
      "root = Stack([catalog, metrics, actions])",
      'catalog = CatalogShelf("Diskografi", [{}])',
      'metrics = Chart("bar", [{label:"Confirmed",value:0},{label:"Unknown"}])',
      'actions = Checklist(["Cek sumber"])',
      "```",
    ].join("\n");
    const seg = parseOpenUiMixedStream(response, { final: true }).find(s => s.kind === "openui");
    assert.ok(seg?.kind === "openui");
    assert.ok(openUiParseResultToMistlineBlocks(seg.parseResult, { complete: false }).some(b => b.name === "CatalogShelf"));
    const blocks = parseMixedStreamToMistlineBlocks(response, { final: true });
    assert.deepEqual(blocks.map(b => b.kind === "ui" ? b.name : b.text), [
      "Angka untuk rilisan lainnya belum tersedia.", "Chart", "Checklist",
    ]);
    assert.deepEqual(blocks[1].kind === "ui" && blocks[1].props.data, [{ label: "Confirmed", value: 0 }]);
  });

  it("exports valid JSON schema and inline openui-lang prompt", () => {
    const schema = getMomoOpenUiJSONSchema();
    assert.ok(schema, "JSON schema should exist");
    const prompt = buildMomoOpenUiPrompt({ inlineMode: true });
    assert.ok(prompt.includes("Stack"), "Prompt should include Stack root");
    assert.ok(prompt.includes("Cards"), "Prompt should include Cards");
    assert.ok(prompt.includes("Map"), "Prompt should include Map");
  });
});

describe("Incremental OpenUI Lang Mixed Stream Parser", () => {
  it("parses partial streaming chunks incrementally without throwing", () => {
    const partial = [
      "Berikut ringkasan rute singkatnya:",
      "",
      "```openui-lang",
      "root = Stack([h1, c1])",
      'h1 = Headline("Bandung Pagi", "Braga")',
      'c1 = Callout("Bawa payung',
    ].join("\n");

    assert.equal(hasUnclosedOpenUiStream(partial), true);
    const segments = parseOpenUiMixedStream(partial, { final: false });
    assert.equal(segments.length, 2);
    assert.equal(segments[0].kind, "text");
    assert.equal(segments[1].kind, "openui");
    if (segments[1].kind === "openui") {
      assert.ok(segments[1].parseResult.root, "Root Stack should resolve during partial stream");
    }
  });

  it("completes full openui-lang block and bridges to Mistline blocks", () => {
    const full = [
      "Ini dua opsi utamanya.",
      "",
      "```openui-lang",
      "root = Stack([c1, f1])",
      'c1 = Callout("Gunakan App Router untuk RSC.", "tip", "Rekomendasi")',
      'f1 = Followups(["Bandingkan caching", "Lihat contoh kode"])',
      "```",
    ].join("\n");

    assert.equal(hasUnclosedOpenUiStream(full), false);
    const mistBlocks = parseMixedStreamToMistlineBlocks(full, { final: true });
    const uiBlocks = mistBlocks.filter((b) => b.kind === "ui");
    assert.equal(uiBlocks.length, 2);
    assert.equal(uiBlocks[0].name, "Callout");
    assert.equal(uiBlocks[0].complete, true);
    assert.equal(uiBlocks[1].name, "Followups");
  });

  it("normalizes standalone root component into Stack", () => {
    const standalone = [
      "```openui-lang",
      'root = Callout("Cek koneksi dulu.", "warning", "Perhatian")',
      "```",
    ].join("\n");

    const mistBlocks = parseMixedStreamToMistlineBlocks(standalone, { final: true });
    const uiBlocks = mistBlocks.filter((b) => b.kind === "ui");
    assert.equal(uiBlocks.length, 1);
    assert.equal(uiBlocks[0].name, "Callout");
  });

  it("compresses openui-lang blocks cleanly for multi-turn history", () => {
    const raw = [
      "Oke, ini perbandingannya.",
      "",
      "```openui-lang",
      "root = Stack([c1])",
      'c1 = Callout("Detail penting", "insight", "Catatan Arsitektur")',
      "```",
    ].join("\n");

    const compressed = compressOpenUiForHistory(raw);
    assert.ok(!compressed.includes("```openui-lang"));
    assert.ok(compressed.includes("[OpenUI rendered: Callout"));
  });
});

describe("Role Specialization & Auto-UI Decision", () => {
  it("keeps simple greetings in prose_only mode on chat surface", () => {
    const mode = decideUiCompositionMode({
      latestUserText: "Halo pagi Momo!",
      lookId: "rest",
      workspaceView: "chat",
    });
    assert.equal(mode, "prose_only");
  });

  it("activates rich_ui for comparison/map/planning queries", () => {
    const mode = decideUiCompositionMode({
      latestUserText: "Bandingkan Next.js vs Astro plus peta arsitektur singkat",
      lookId: "coder",
      workspaceView: "chat",
    });
    assert.equal(mode, "rich_ui");
  });

  it("differentiates system prompts per role across all 18 real roles", () => {
    const all18Roles = [
      "rest", "traveller", "designer", "money", "bug", "investigate",
      "captain", "builder", "tester", "guard", "planner", "cook",
      "write", "director", "tutor", "coach", "music", "garden",
    ];
    for (const r of all18Roles) {
      assert.ok(ROLE_PREFERRED_FAMILIES[r]?.length >= 4, `Role ${r} must be explicitly mapped`);
    }
    const travelPrompt = buildStaticMomoSystemPrompt("traveller", "explore");
    const builderPrompt = buildStaticMomoSystemPrompt("builder", "chat");
    assert.notEqual(travelPrompt, builderPrompt);
    assert.ok(travelPrompt.includes("TransitRouteCard, VisualDossier, Map"));
    assert.ok(builderPrompt.includes("ArchitectureDiagram, CodeDiffPatch"));
  });

  it("analyzes multi-signal context accurately (Aston Kemayoran -> JIS -> MCR berduaan)", () => {
    const query =
      "Gue mau pergi nanti dari Aston kemayoran, jakarta ke JIS stadium buat nonton MCR kira kira berapa lama dari sana? kalau gue berduaan";
    assert.equal(inferLookByKeyword(query), "traveller");
    const sig = analyzeTurnContext({
      latestUserText: query,
      lookId: "traveller",
      workspaceView: "chat",
    });
    assert.equal(sig.mode, "rich_ui");
    assert.equal(sig.spatialTransit, true);
    assert.equal(sig.visualEntity, true);
    assert.equal(sig.groupOrCost, true);
    assert.ok(sig.imageQueries.includes("My Chemical Romance live concert"));
    assert.ok(sig.imageQueries.includes("Jakarta International Stadium exterior"));

    const techSig = analyzeTurnContext({
      latestUserText: "Kenapa query JOIN Postgres gue lambat dan bagaimana strategi optimasi index B-Tree?",
      lookId: "builder",
      workspaceView: "chat",
    });
    assert.equal(techSig.mode, "rich_ui");
    assert.equal(techSig.deepAnalytical, true);

    const foodSig = analyzeTurnContext({
      latestUserText: "Bagaimana cara masak Rendang Padang biar dagingnya empuk dan meresap?",
      lookId: "cook",
      workspaceView: "chat",
    });
    assert.equal(foodSig.mode, "rich_ui");
    assert.equal(foodSig.visualEntity, true);
    assert.ok(foodSig.imageQueries.some((q) => /Rendang Padang/i.test(q)));
  });

  it("expands conversational queries into focused sub-queries and adds retry angles", () => {
    const q = "Gue mau pergi nanti dari Aston Kemayoran ke JIS Stadium buat nonton MCR kira kira berapa lama";
    const normal = expandWebSearchQueries(q, false);
    const retry = expandWebSearchQueries(q, true);
    assert.ok(normal.length >= 2);
    assert.ok(!normal[0].toLowerCase().startsWith("gue mau pergi"));
    assert.ok(retry.length > normal.length || retry[retry.length - 1] !== normal[normal.length - 1]);
  });

  it("injects anti-repetition guidance when previous turns used overlapping UI", () => {
    const dyn = buildDynamicTurnGuidance({
      lookId: "rest",
      latestUserText: "Bandingkan Next.js 16 vs Astro untuk dashboard internal",
      workspaceView: "chat",
      previousAssistantTexts: [
        '```openui-lang\nroot = Stack([c1])\nc1 = Cards([{title: "A"}], "Opsi")\n```',
      ],
    });
    assert.ok(dyn.includes("Anti-Repetition Lock"));
    assert.ok(dyn.includes("Cards"));
  });

  it("enforces mandatory auto web_search for substantive queries without manual prompting", () => {
    assert.equal(shouldMandateAutoWebSearch({ latestUserText: "Halo!" }), false);
    assert.equal(shouldMandateAutoWebSearch({ latestUserText: "makasih" }), false);
    assert.equal(
      shouldMandateAutoWebSearch({ latestUserText: "Jelaskan arsitektur Next.js 16" }),
      true,
    );
    assert.equal(
      shouldMandateAutoWebSearch({ latestUserText: "Bandingkan Next.js dan Astro" }),
      true,
    );
  });
});

describe("OpenUI Finalization, Unresolved Refs & Timeline Schema Recovery", () => {
  it("flags unresolved symbols even after premature fence closure and merges continuation", () => {
    const truncated = [
      "```openui-lang",
      "root = Stack([cards1, tl1])",
      'cards1 = Cards([{title: "Jadwal"}], "Info")',
      "```",
    ].join("\n");

    assert.equal(hasUnclosedOpenUiStream(truncated), true);
    assert.deepEqual(getOpenUiUnresolvedRefs(truncated), ["tl1"]);

    const withContinuation = [
      truncated,
      "```openui-lang",
      'tl1 = Timeline("Rangkaian Fakta Tur MCR", [{title: "2008", detail: "Konser pertama"}])',
      "```",
    ].join("\n");

    assert.equal(hasUnclosedOpenUiStream(withContinuation), false);
    const blocks = parseMixedStreamToMistlineBlocks(withContinuation, { final: true });
    const uiBlocks = blocks.filter((b) => b.kind === "ui");
    assert.equal(uiBlocks.length, 2);
    assert.equal(uiBlocks[1].name, "Timeline");
    assert.equal(uiBlocks[1].props.title, "Rangkaian Fakta Tur MCR");
    assert.ok(Array.isArray(uiBlocks[1].props.events));
  });

  it("synthesizes root Stack when model omits `root =` inside openui-lang block", () => {
    const noRoot = [
      "```openui-lang",
      's1 = Stats([{label: "Durasi", value: "25 mnt"}], "Ringkasan")',
      't1 = Timeline([{title: "Fase 1", meta: "2026"}], "Rangkaian")',
      "```",
    ].join("\n");

    const blocks = parseMixedStreamToMistlineBlocks(noRoot, { final: true });
    const uiBlocks = blocks.filter((b) => b.kind === "ui");
    assert.equal(uiBlocks.length, 2);
    assert.equal(uiBlocks[0].name, "Stats");
    assert.equal(uiBlocks[1].name, "Timeline");
    assert.equal(uiBlocks[1].props.title, "Rangkaian");
  });

  it("captures unfenced bottom-up helper declarations written before `root = Stack(...)`", () => {
    const rawBottomUp = [
      "Berikut ringkasannya:",
      "",
      'c1 = Callout("Cek rute tol", "tip", "Tips")',
      "root = Stack([c1])",
    ].join("\n");

    const blocks = parseMixedStreamToMistlineBlocks(rawBottomUp, { final: true });
    const uiBlocks = blocks.filter((b) => b.kind === "ui");
    assert.equal(uiBlocks.length, 1);
    assert.equal(uiBlocks[0].name, "Callout");
    assert.equal(uiBlocks[0].props.title, "Tips");
  });

  it("handles balanced unfenced openui-raw without infinite continuations and collapses glued ```root retries", () => {
    const cleanUnfenced = [
      "root = Stack([h1, s1])",
      'h1 = Headline("MCR Jakarta", "2026", "Stadion JIS")',
      's1 = Steps([{title: "Gate buka", meta: "15:00"}], "Jadwal")',
    ].join("\n");
    assert.equal(hasUnclosedOpenUiStream(cleanUnfenced), false);

    // Exact reproduced multi-copy + corrupted line + glued ```root = + diag1/diag typo trace
    const cursedOutput = [
      "root = Stack([h1, gal1, stat1, cards1, steps1, diag1, chk1, f1])",
      'h1 = Headline("My Chemical Romance Tur Asia & Jakarta 2026", "Analisis Jadwal", "Ringkasan.")',
      'gal1 = ImageGallery("Kontekstual Tur", null, [{query: "MCR stage", src: "https://example.com/a.jpg", caption: "Live"}])',
      'stat1 = Stats([{label: "Penantian", value: "18 Tahun"}], "Statistik")',
      'cards1 = [{title: "Format", tag: "Jcards1 = [{title: "Format Teatrikal", subtitle: "Setlist", body: "Babak pertama.", tag: "Babak Utama", imageQuery: "Black Parade"}, {title: "Jakarta Finale", subtitle: "22 Nov 2026", body: "Penutup Asia.", tag: "Finale Tour", imageQuery: "JIS"}]',
      'steps1 = Steps([{title: "Fase 1", detail: "War tiket", meta: "Done"}], "Kronologi")',
      'diag = Diagram("flowchart TD\\n A --> B", "flowchart", "Alur")',
      'chk1 = Checklist([{text: "Cek jadwal", done: true}], "Checklist")',
      'f1 = Followups(["Detail setlist"])',
      "",
      "```root = Stack([h1, gal1, stat1, cards1, steps1, diag, chk1, f1])",
      'h1 = Headline("My Chemical Romance Tur Asia & Jakarta 2026", "Analisis Jadwal", "Ringkasan.")',
      'gal1 = ImageGallery("Kontekstual Tur", null, [{query: "MCR stage", src: "https://example.com/a.jpg", caption: "Live"}])',
      'stat1 = Stats([{label: "Penantian", value: "18 Tahun"}], "Statistik")',
      'cards1 = Cards([{title: "Format Teatrikal", subtitle: "Setlist", body: "Babak pertama.", tag: "Babak Utama", imageQuery: "Black Parade"}], "Pilar Tur MCR 2026", "grid")',
      'steps1 = Steps([{title: "Fase 1", detail: "War tiket", meta: "Done"}], "Kronologi")',
      'diag = Diagram("flowchart TD\\n A --> B", "flowchart", "Alur")',
      'chk1 = Checklist([{text: "Cek jadwal", done: true}], "Checklist")',
      'f1 = Followups(["Detail setlist"])',
    ].join("\n");

    const segments = parseOpenUiMixedStream(cursedOutput, { final: true });
    const uiSegs = segments.filter((s) => s.kind === "openui");
    assert.equal(uiSegs.length, 1, "Should collapse repeated root retries to 1 clean OpenUI block");
    const mistBlocks = parseMixedStreamToMistlineBlocks(cursedOutput, { final: true });
    const uiBlocks = mistBlocks.filter((b) => b.kind === "ui");
    assert.equal(uiBlocks.length, 8, "All 8 components including Diagram & Cards should resolve");
    assert.deepEqual(
      uiBlocks.map((b) => b.name),
      ["Headline", "ImageGallery", "Stats", "Cards", "Steps", "Diagram", "Checklist", "Followups"],
    );
  });

  it("steers Retry away from the discarded draft with fresh component rotation", () => {
    const retryGuidance = buildDynamicTurnGuidance({
      lookId: "rest",
      latestUserText: "Dari Aston Kemayoran ke JIS naik apa buat berdua nonton MCR?",
      workspaceView: "chat",
      isRetry: true,
      retryPreviousText:
        '[OpenUI rendered: Headline("Rute MCR"), Cards("Pilihan"), Steps("Langkah")]',
    });
    assert.ok(retryGuidance.includes("Fresh Re-Response Directive (Retry)"));
    assert.ok(retryGuidance.includes("Anti-Repetition Lock"));
  });

  it("rejects webpage URLs as images and deduplicates matching CDN/thumb image stems", () => {
    assert.equal(
      isPhotographicImageUrl("https://www.youtube.com/playlist?list=PLdzRm0nlFGnEikBUhljWeO0t4dsFROnCd"),
      false,
    );
    assert.equal(
      isPhotographicImageUrl("https://upload.wikimedia.org/wikipedia/commons/c/c4/My_Chemical_Romance_07.jpg"),
      true,
    );

    const a = extractImageAssetStem(
      "https://s1.ticketm.net/dam/a/b67/0aae6aa9-4e17-482b-81d9-5282ff937b67_TABLET_LANDSCAPE_LARGE_16_9.jpg",
    );
    const b = extractImageAssetStem(
      "https://media.livenation.com/dam/a/b67/0aae6aa9-4e17-482b-81d9-5282ff937b67_RETINA_LANDSCAPE_16_9.jpg",
    );
    assert.equal(a, b);
  });

  it("parses expanded role-specialist and unlocked context Intelligence components", () => {
    const rich = [
      "```openui-lang",
      "root = Stack([vd1, fc1, tr1, rs1, mb1, cf1, cd1])",
      'vd1 = VisualDossier("Konser MCR Jakarta", "Konser penutup Asia di JIS.", [{label: "Tanggal", value: "22 Nov 2026"}], "My Chemical Romance live concert", null, "Tur Asia", "Verified")',
      'fc1 = FactCheckPanel("Verifikasi Rumor Tur", [{claim: "Tur terakhir selamanya?", verdict: "false", explanation: "Hanya penutup tur regional Asia."}])',
      'tr1 = TransitRouteCard("Aston Kemayoran", "JIS", [{mode: "GoCar", normalTime: "18 mnt", peakTime: "50 mnt", costGroup: "Rp25rb/org"}], "~5.8 km")',
      'rs1 = RecipeScalerCard("Rendang Daging", [{name: "Daging sapi", amount: 500, unit: "gr"}], 4, "20 mnt", "2 jam")',
      'mb1 = MoodboardMosaic("Estetika Black Parade", [{hex: "#0A0B0E", name: "Obsidian"}], [{query: "My Chemical Romance stage", caption: "Stage lighting"}])',
      'cf1 = ConceptFlashcards("Istilah Sistem", [{term: "Idempoten", root: "idem + potens", summary: "Pemanggilan berulang menghasilkan state akhir sama."}])',
      'cd1 = CodeDiffPatch("Fix Stale Closure", "const x = count;", "const x = countRef.current;", "App.tsx", "tsx")',
      "```",
    ].join("\n");

    const blocks = parseMixedStreamToMistlineBlocks(rich, { final: true });
    const uiBlocks = blocks.filter((b) => b.kind === "ui");
    assert.deepEqual(
      uiBlocks.map((b) => b.name),
      [
        "VisualDossier",
        "FactCheckPanel",
        "TransitRouteCard",
        "RecipeScalerCard",
        "MoodboardMosaic",
        "ConceptFlashcards",
        "CodeDiffPatch",
      ],
    );
    assert.equal(uiBlocks.every((b) => b.complete), true);

    const cookSig = analyzeTurnContext({
      latestUserText: "Resep rendang daging empuk untuk 4 porsi",
      lookId: "cook",
      workspaceView: "chat",
    });
    assert.ok(cookSig.recommendedComponents.includes("RecipeScalerCard"));

    const factSig = analyzeTurnContext({
      latestUserText: "Apakah benar konser MCR Jakarta ini rumor tur terakhir mereka?",
      lookId: "tester",
      workspaceView: "explore",
    });
    assert.ok(factSig.recommendedComponents.includes("VisualDossier"));
    assert.ok(factSig.recommendedComponents.includes("FactCheckPanel"));
  });

  it("exposes every registered Intelligence component to chat: schema, parser, and planner", () => {
    // The React registry can't be imported in node (it pulls XYFlow CSS), so the
    // component ids are extracted straight from the registration sources instead:
    // `componentId:` fields plus `{ id, desc }` array-entry heads.
    const intelRoot = fileURLToPath(new URL("../../intelligence", import.meta.url));
    const registerFiles: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith(".ts")) registerFiles.push(p);
      }
    };
    walk(intelRoot);
    const registeredIds = new Set<string>();
    const idPatterns = [
      /componentId:\s*"([a-z][a-z0-9_]*)"/g,
      /\{\s*\n\s*id:\s*"([a-z][a-z0-9_]*)",\s*\n\s*(?:desc|dataSchema)\s*:/g,
    ];
    for (const file of registerFiles) {
      const src = readFileSync(file, "utf8");
      if (!/registerIntelComponent|makeIntelSpec/.test(src)) continue;
      for (const re of idPatterns) {
        for (const m of src.matchAll(re)) registeredIds.add(m[1]);
      }
    }
    assert.ok(
      registeredIds.size >= 160,
      `registry inventory should cover ~168 components, got ${registeredIds.size}`,
    );

    const toPascal = (id: string) =>
      id.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
    const chatNames = [...registeredIds].map(toPascal);
    // Parser recognition is schema-driven: every registry id resolves as a chat name.
    assert.deepEqual(
      chatNames.filter((n) => !MOMO_OPENUI_COMPONENT_NAMES.has(n)),
      [],
    );
    assert.deepEqual(
      INTEL_CHAT_COMPONENTS.filter((n) => !MOMO_OPENUI_COMPONENT_NAMES.has(n)),
      [],
    );
    // And every one of them is planner-available for any role.
    const plan = planContextAwareUi({
      latestUserText: "halo",
      lookId: "rest",
      workspaceView: "chat",
      previousUserTexts: [],
      previousAssistantTexts: [],
      recentComponents: [],
      availableData: createEmptyDataProfile(),
    });
    assert.deepEqual(
      chatNames.filter((n) => !plan.allowedComponents.includes(n)),
      [],
    );
  });

  it("parses newly exposed Intelligence components through the full stream pipeline", () => {
    const program = [
      "```openui-lang",
      "root = Stack([mg1, af1, ta1, ia1, kg1, pc1])",
      'mg1 = MetricGroup("Platform KPIs", [{label: "Uptime", value: "99.95%", trend: "up", status: "good"}, {label: "Latency p50", value: 142, unit: "ms", trend: "down"}])',
      'af1 = AlertFeed([{id: "a1", severity: "critical", title: "Checkout 5xx spike"}, {id: "a2", severity: "info", title: "Deploy selesai"}], "Alert Production")',
      'ta1 = ThreatAssessment("high", [{name: "Token replay", likelihood: "medium", severity: "high", mitigation: "Rotasi token"}], "Postur Keamanan")',
      'ia1 = ImpactAnalysis("Migrasi Skema", [{domain: "Checkout", severity: "high", effect: "Kontrak order berubah"}, {domain: "Search", severity: "low", effect: "Re-index ulang"}])',
      'kg1 = KnowledgeGraph("Relasi Sistem", [{id: "web", label: "Web Client", type: "client"}, {id: "api", label: "API", type: "service"}], [{source: "web", target: "api", label: "REST"}])',
      'pc1 = ProsCons("CDN Sendiri", ["Kontrol penuh", "Biaya tetap"], ["Kompleksitas ops", "Skala terbatas"], "Mulai dari CDN managed dulu")',
      "```",
    ].join("\n");

    const blocks = parseMixedStreamToMistlineBlocks(program, { final: true });
    const uiBlocks = blocks.filter((b) => b.kind === "ui");
    assert.deepEqual(
      uiBlocks.map((b) => b.name),
      ["MetricGroup", "AlertFeed", "ThreatAssessment", "ImpactAnalysis", "KnowledgeGraph", "ProsCons"],
    );
    assert.equal(uiBlocks.every((b) => b.complete), true);
  });

  it("preserves all 6 blocks across streaming and final for ComparisonTable record criteria and VisualDossier null slot", () => {
    const sseProgram = [
      "root = Stack([headline, dossier, compTable, flowPerf, calloutTrx, followups])",
      "",
      "headline = Headline(",
      '  "Performa Mendalam: SSE vs WebSocket",',
      '  "Benchmark & Analisis Teknikal",',
      '  "Membedah efisiensi resource, latensi, dan perilaku jaringan untuk beban kerja LLM streaming."',
      ")",
      "",
      "dossier = VisualDossier(",
      '  "Ringkasan Kinerja AI Streaming",',
      '  "Untuk kasus penggunaan LLM standar (chat/completion), SSE menawarkan efisiensi memori yang lebih baik.",',
      "  [",
      '    {"label": "Kemenangan SSE", "value": "Hemat Memori & Auto-Reconnect"},',
      '    {"label": "Kemenangan WebSocket", "value": "Full Duplex Sejati"},',
      '    {"label": "Protokol", "value": "HTTP/2 vs TCP Handshake"}',
      "  ],",
      "  null,",
      '  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",',
      '  "Arsitektur Jaringan Real-Time",',
      '  "Verified Benchmark",',
      '  ["HTTP/2 Multiplexing membuat SSE sangat efisien", "WebSocket membutuhkan state tracking per koneksi"]',
      ")",
      "",
      "compTable = ComparisonTable(",
      '  "Matriks Komparasi Performa Teknis",',
      "  [",
      '    {"name": "Server-Sent Events (SSE)", "badge": "Rekomendasi AI Chat"},',
      '    {"name": "WebSocket", "badge": "Real-time Bidirectional"}',
      "  ],",
      "  {",
      '    "Overhead Protokol": {"Server-Sent Events (SSE)": "Sangat rendah", "WebSocket": "Rendah setelah handshake TCP"},',
      '    "Kompleksitas Scaling": {"Server-Sent Events (SSE)": "Mudah", "WebSocket": "Butuh sticky sessions"},',
      '    "Dukungan Firewall": {"Server-Sent Events (SSE)": "Lolos tanpa konfigurasi", "WebSocket": "Sering perlu pengecualian port"},',
      '    "Penanganan Drop Koneksi": {"Server-Sent Events (SSE)": "Otomatis", "WebSocket": "Manual"}',
      "  },",
      '  "Gunakan SSE untuk teks AI searah."',
      ")",
      "",
      "flowPerf = Flow([",
      '  {"label": "Klien Mengirim Prompt", "detail": "HTTP POST JSON", "kind": "input"},',
      '  {"label": "Rendering UI Real-time", "detail": "Efek ketik di browser", "kind": "output"}',
      '], "Alur Pengiriman Token via SSE", "chevron", "Transmisi satu arah.")',
      "",
      "calloutTrx = Callout(",
      '  "Pastikan proxy_buffering off di Nginx.",',
      '  "warning",',
      '  "Perhatian Konfigurasi Server"',
      ")",
      "",
      'followups = Followups(["Cara setting Nginx untuk SSE", "Contoh Node.js SSE"])',
    ].join("\n");

    const expectedNames = [
      "Headline",
      "VisualDossier",
      "ComparisonTable",
      "Flow",
      "Callout",
      "Followups",
    ];

    for (const final of [false, true]) {
      const segs = parseOpenUiMixedStream(sseProgram, { final });
      assert.equal(segs.length, 1);
      assert.equal(segs[0].kind, "openui");
      if (segs[0].kind === "openui") {
        assert.deepEqual(segs[0].parseResult.meta.errors, []);
        assert.deepEqual(segs[0].parseResult.meta.unresolved, []);
        const rawChildren = segs[0].parseResult.root?.props?.children;
        const children = Array.isArray(rawChildren) ? rawChildren : [];
        assert.deepEqual(
          children.map((c: unknown) =>
            c && typeof c === "object" && "typeName" in c
              ? (c as { typeName: string }).typeName
              : null,
          ),
          expectedNames,
        );
      }

      const blocks = parseMixedStreamToMistlineBlocks(sseProgram, { final }).filter(
        (b) => b.kind === "ui",
      );
      assert.deepEqual(
        blocks.map((b) => b.name),
        expectedNames,
      );
    }

    // Truncated unclosed tail should still preserve rendered root on finalization
    const truncatedTail = sseProgram.split("\n").slice(0, -1).join("\n") + '\nfollowups = Followups(["Cara setting';
    const truncSegs = parseOpenUiMixedStream(truncatedTail, { final: true });
    assert.equal(truncSegs[0].kind, "openui");
    if (truncSegs[0].kind === "openui") {
      assert.ok(truncSegs[0].parseResult.root, "Final parse should fall back cleanly to preserve streamed root");
    }
  });
});

describe("Agentic Tool Harness & Context-Aware Generative UI Planner", () => {
  it("disables blind pre-flight search in reasoning mode and skips pure local code refactors", () => {
    assert.equal(
      shouldMandateAutoWebSearch({
        latestUserText: "Info konser MCR Jakarta 2026 di JIS",
        reasoningEnabled: true,
      }),
      false,
      "Reasoning mode must let the model drive the tool harness first",
    );

    assert.equal(
      shouldMandateAutoWebSearch({
        latestUserText: "refactor fungsi ini\n```ts\nfunction sum(a: number, b: number) { return a + b; }\n```",
        reasoningEnabled: false,
      }),
      false,
      "Pure local code refactor without live fact cues must skip external web search",
    );

    assert.equal(
      shouldMandateAutoWebSearch({
        latestUserText: "Apa fitur terbaru Next.js 16.4 release notes?",
        reasoningEnabled: false,
      }),
      true,
    );
  });

  it("subsets server OpenUI prompt by capability space while keeping full 60-component AST schema", () => {
    const fullPrompt = buildMomoOpenUiPrompt({ inlineMode: true });
    const subsetPrompt = buildMomoSubsetOpenUiPrompt(
      ["ExecutiveSummary", "ComparisonTable", "Followups"],
      { inlineMode: true },
    );

    assert.ok(subsetPrompt.length < fullPrompt.length * 0.45, "Subset prompt should be dramatically leaner");
    assert.ok(subsetPrompt.includes("ComparisonTable"));
    assert.ok(!subsetPrompt.includes("RecipeScalerCard"));
    assert.ok(!subsetPrompt.includes("MoodboardMosaic"));

    const fullSchema = getMomoOpenUiJSONSchema() as { $defs?: Record<string, unknown> };
    assert.ok(Object.keys(fullSchema.$defs ?? {}).length >= 58, "Full AST schema must remain intact");
  });

  it("plans Response UI vs Persistent Workspace transitions with the full catalog for every role + data-grounding guidance", () => {
    // 1) Ephemeral Chat turn without images or numbers -> whole catalog stays available, families flag where the turn points, soft grounding warnings
    const emptyData = enrichDataProfileFromTextAndTools(createEmptyDataProfile(), {
      userText: "Apa perbedaan konseptual antara pendekatan deklaratif dan imperatif?",
    });
    const chatPlan = planContextAwareUi({
      latestUserText: "Apa perbedaan konseptual antara pendekatan deklaratif dan imperatif?",
      lookId: "tutor",
      workspaceView: "chat",
      previousUserTexts: [],
      previousAssistantTexts: [],
      recentComponents: [],
      availableData: emptyData,
    });
    assert.equal(chatPlan.compositionMode, "response_ui");
    assert.equal(chatPlan.taskTransition, "new_task");
    assert.equal(chatPlan.updateStrategy, "create");
    assert.ok(chatPlan.allowedComponents.includes("Versus"));
    assert.ok(chatPlan.allowedComponents.includes("ComparisonTable"));
    assert.ok(chatPlan.allowedComponents.includes("LineChart"), "A tutor may still chart numbers it finds");
    assert.ok(chatPlan.allowedComponents.includes("GanttChart"), "No role is cut off from a component");
    assert.ok(chatPlan.activeCapabilities.includes("comparative_evaluation"), "The comparison in the query is flagged as an active family");
    assert.ok(!chatPlan.activeCapabilities.includes("quantitative_metrics"), "Families still follow the content, not the catalog");
    assert.ok(
      chatPlan.dataGroundingRules.some((r) => /Soft Grounding \(Media\)/i.test(r)),
    );
    assert.ok(
      chatPlan.dataGroundingRules.some((r) => /Soft Grounding \(Quantitative\)/i.test(r)),
    );

    // 2) Persistent Workspace (Explore) continuing an investigation with verified numbers & 4 photos -> APPEND + unlocks charts & gallery
    const richData = enrichDataProfileFromTextAndTools(
      {
        ...createEmptyDataProfile({
          columns: [{ id: "c1", title: "Temuan" }],
          items: [{ title: "Laporan Q3", columnId: "c1" }],
          pinnedTitles: [],
          exploreTurnCount: 1,
          existingExploreComponents: ["ExecutiveSummary", "Timeline"],
        }),
        webResultCount: 5,
        verifiedImages: [
          { query: "A", imageUrl: "https://ex.com/1.jpg" },
          { query: "B", imageUrl: "https://ex.com/2.jpg" },
          { query: "C", imageUrl: "https://ex.com/3.jpg" },
        ],
      },
      {
        userText: "Bandingkan dua temuan pendapatan tadi dengan pertumbuhan 24% YoY",
        toolSnippets: ["Pendapatan naik 24% menjadi Rp 150 miliar pada 2026"],
      },
    );
    const exploreAppendPlan = planContextAwareUi({
      latestUserText: "Bandingkan dua temuan pendapatan tadi dengan pertumbuhan 24% YoY",
      lookId: "investigate",
      workspaceView: "explore",
      previousUserTexts: ["Analisis laporan keuangan perusahaan X"],
      previousAssistantTexts: ['[OpenUI rendered: ExecutiveSummary("Overview"), Timeline("Kronologi")]'],
      recentComponents: ["ExecutiveSummary", "Timeline"],
      availableData: richData,
      workspaceSnapshot: {
        columns: [{ id: "c1", title: "Temuan" }],
        items: [{ title: "Laporan Q3", columnId: "c1" }],
        pinnedTitles: [],
        exploreTurnCount: 1,
        existingExploreComponents: ["ExecutiveSummary", "Timeline"],
      },
    });
    assert.equal(exploreAppendPlan.compositionMode, "persistent_workspace");
    assert.equal(exploreAppendPlan.taskTransition, "continue_task");
    assert.equal(exploreAppendPlan.updateStrategy, "append");
    assert.ok(exploreAppendPlan.allowedComponents.includes("ComparisonTable"));
    assert.ok(exploreAppendPlan.allowedComponents.includes("LineChart"));
    assert.ok(
      exploreAppendPlan.allowedComponents.includes("ImageGallery"),
    );
  });

  it("handles everyday Indonesian coffee comparison & press drink ideation with visual grounding, cook lens, and focused schema subset", () => {
    const q1 = "Kasih dong penjelasan tentang kopi hitam biasa dan decaf?";
    const q2 = "Butuh resep minuman. Gue ada kopi hitam bubuk dan mesin press? kasih ide dong 3 at least? mana yang rekomendasi";

    // Both queries trigger visual image fetching & cook expertise
    assert.equal(shouldFetchVisualImages({ latestUserText: q1 }), true);
    assert.equal(shouldFetchVisualImages({ latestUserText: q2 }), true);
    assert.equal(inferLookByKeyword(q1), "cook");
    assert.equal(inferLookByKeyword(q2), "cook");

    // Q1: recognized as rich_ui + visualEntity + comparison (not weak auto_light)
    const sig1 = analyzeTurnContext({ latestUserText: q1, lookId: "cook", workspaceView: "chat" });
    assert.equal(sig1.mode, "rich_ui");
    assert.equal(sig1.visualEntity, true);
    assert.equal(sig1.comparison, true);
    assert.ok(sig1.recommendedComponents.includes("Versus"));

    // Q2: recommends Cards + RecipeScalerCard + ComparisonTable
    const sig2 = analyzeTurnContext({ latestUserText: q2, lookId: "cook", workspaceView: "chat" });
    assert.equal(sig2.mode, "rich_ui");
    assert.equal(sig2.visualEntity, true);
    assert.ok(sig2.recommendedComponents.includes("Cards"));
    assert.ok(sig2.recommendedComponents.includes("RecipeScalerCard"));

    // Dynamic guidance still emits Visual Grounding Directive even when needsExternalSearchHint is false (Reasoning ON)
    const guidance1 = buildDynamicTurnGuidance({
      lookId: "cook",
      latestUserText: q1,
      workspaceView: "chat",
      needsExternalSearchHint: false,
    });
    assert.match(guidance1, /Visual Grounding Directive.*search_images/i);

    // Planner emits active Visual Grounding Action (not passive "pass null" trap); the cook role keeps the whole catalog
    const plan2 = planContextAwareUi({
      latestUserText: q2,
      lookId: "cook",
      workspaceView: "chat",
      previousUserTexts: [],
      previousAssistantTexts: [],
      recentComponents: [],
      availableData: enrichDataProfileFromTextAndTools(createEmptyDataProfile(), { userText: q2 }),
    });
    assert.ok(plan2.allowedComponents.includes("RecipeScalerCard"));
    assert.ok(plan2.allowedComponents.includes("Cards"));
    assert.ok(plan2.allowedComponents.includes("ComparisonTable"));
    assert.ok(plan2.allowedComponents.includes("GanttChart"));
    assert.ok(plan2.allowedComponents.includes("ArchitectureDiagram"));
    assert.ok(plan2.activeCapabilities.includes("artifact_learning"));
    assert.ok(
      plan2.dataGroundingRules.some((r) => /Visual Grounding Action \(BEFORE UI\)/i.test(r)),
      "Must instruct search_images before UI instead of telling model to pass null",
    );
  });

  it("handles direction pivot on explore workspace", () => {
    const pivotTrans = detectTaskTransition({
      latestUserText: "Sekarang ganti topik, bahas resep rendang sapi empuk buat 4 porsi",
      previousUserTexts: ["Analisis laporan keuangan perusahaan X"],
    });
    assert.equal(pivotTrans, "change_direction");
    const pivotPlan = planContextAwareUi({
      latestUserText: "Sekarang ganti topik, bahas resep rendang sapi empuk buat 4 porsi",
      lookId: "cook",
      workspaceView: "explore",
      previousUserTexts: ["Analisis laporan keuangan perusahaan X"],
      previousAssistantTexts: ["..."],
      recentComponents: ["ExecutiveSummary"],
      availableData: createEmptyDataProfile({
        columns: [],
        items: [],
        pinnedTitles: [],
        exploreTurnCount: 2,
        existingExploreComponents: ["ExecutiveSummary"],
      }),
    });
    assert.equal(pivotPlan.updateStrategy, "replace");
    assert.equal(pivotPlan.archivedPriorOnPivot, true);

    // 4) Short unrelated prompt without anaphora pivots cleanly instead of false-positive continue_task
    assert.equal(
      detectTaskTransition({
        latestUserText: "Resep nasi goreng kampung enak",
        previousUserTexts: ["Analisis laporan keuangan BCA kuartal ketiga"],
      }),
      "change_direction",
    );

    // 5) Substring words like "junior" or "IMEI" do not trigger false temporal month matches
    const nonTemporal = enrichDataProfileFromTextAndTools(createEmptyDataProfile(), {
      userText: "Panduan code review untuk junior developer soal nomor IMEI",
    });
    assert.equal(nonTemporal.hasTemporalSequence, false);
  });

  it("detects serialized [UI Component: ...] history", () => {
    const parsedHistory = extractRecentOpenUiComponents([
      "Ringkasan singkat.\n\n[UI VisualDossier: Konser MCR]\n[UI ComparisonTable: SSE vs WS]",
    ]);
    assert.deepEqual(parsedHistory.last, ["VisualDossier", "ComparisonTable"]);
  });

  it("preserves setlist/tracklist completeness queries and enforces Anti-Omission instructions", () => {
    const setlistQueries = expandWebSearchQueries(
      "Kasih setlist lagu konser My Chemical Romance Jakarta 2026 lengkap dong!",
    );
    assert.ok(setlistQueries.length >= 2);
    assert.ok(
      setlistQueries.some((q) => /setlist\.fm|tracklist/i.test(q)),
      `Expected authoritative setlist expansion, got: ${JSON.stringify(setlistQueries)}`,
    );
    assert.ok(
      !setlistQueries.some((q) => /panduan estimasi/i.test(q)),
      "Setlist query must not append unrelated travel estimation fluff",
    );

    const sysPrompt = buildStaticMomoSystemPrompt("music", "chat");
    assert.ok(sysPrompt.includes("Anti-Omission & Complete Enumeration Mandate"));
    assert.ok(sysPrompt.includes("google_search"));

    const turnGuidance = buildDynamicTurnGuidance({
      lookId: "music",
      latestUserText: "Apa aja setlist lagu konser MCR di JIS nanti?",
      workspaceView: "chat",
    });
    assert.ok(turnGuidance.includes("Complete Enumeration Lock"));
  });

  it("supports contextual {text, icon} highlights on VisualDossier and infers non-generic domain icons", () => {
    const dossierWithIcons = [
      "```openui-lang",
      "root = Stack([vd])",
      'vd = VisualDossier("Konser MCR Jakarta 2026", "Penutup tur Asia di JIS.", [{label: "Venue", value: "JIS"}], "My Chemical Romance live", null, "Asia Finale", "Confirmed", [{text: "Babak pertama membawakan album The Black Parade utuh", icon: "disc"}, {text: "Tiket presale mulai Rp 1,5 juta", icon: "ticket"}, {text: "Setlist total 24 lagu termasuk encore", icon: "list-music"}])',
      "```",
    ].join("\n");

    const blocks = parseMixedStreamToMistlineBlocks(dossierWithIcons, { final: true });
    const uiBlocks = blocks.filter((b) => b.kind === "ui");
    assert.equal(uiBlocks.length, 1);
    assert.equal(uiBlocks[0].name, "VisualDossier");
    assert.equal(uiBlocks[0].complete, true);
    const hl = uiBlocks[0].props.highlights as Array<{ text: string; icon: string }>;
    assert.equal(hl.length, 3);
    assert.equal(hl[0].icon, "disc");
    assert.equal(hl[1].icon, "ticket");
    assert.equal(hl[2].icon, "list-music");

    assert.ok(MOMO_ICON_VOCABULARY.length >= 40);
    assert.equal(normalizeMistlineIconName("setlist"), "list-music");
    assert.equal(normalizeMistlineIconName("microphone"), "mic");

    const used = new Set<string>();
    const ic1 = inferContextualIcon("HTTP/2 Multiplexing membuat SSE sangat efisien", undefined, 0, used);
    const ic2 = inferContextualIcon("WebSocket membutuhkan state tracking per koneksi", undefined, 1, used);
    const ic3 = inferContextualIcon("Tiket presale VIP tersedia terbatas", undefined, 2, used);
    assert.notEqual(ic1, "sparkles");
    assert.notEqual(ic2, "sparkles");
    assert.equal(ic3, "ticket");
    assert.notEqual(ic1, ic2);
  });

  it("deduplicates syndicated LiveNation/Ticketmaster DAM wrappers and gates abstract/placeholder image queries", () => {
    const ticketmasterUrl =
      "https://s1.ticketm.net/dam/a/61c/8f2b74a1-90ab-4c12-b123-456789abcdef_1829401_TABLET_LANDSCAPE_LARGE_16_9.jpg";
    const liveNationWrappedUrl =
      "https://www.livenation.com/_next/image?url=https%3A%2F%2Fs1.ticketm.net%2Fdam%2Fa%2F61c%2F8f2b74a1-90ab-4c12-b123-456789abcdef_1829402_ARTIST_PAGE_3_2.jpg&w=1200&q=75";

    assert.equal(
      extractImageAssetStem(ticketmasterUrl),
      extractImageAssetStem(liveNationWrappedUrl),
      "Syndicated Ticketmaster & LiveNation Next.js wrapper URLs sharing a DAM UUID must collapse to one stem",
    );

    assert.equal(isGenericPlaceholderQuery("Visual card"), true);
    assert.equal(isGenericPlaceholderQuery("Konteks visual"), true);
    assert.equal(isGenericPlaceholderQuery("Gambar referensi"), true);
    assert.equal(isGenericPlaceholderQuery("My Chemical Romance live concert"), false);

    assert.equal(isAbstractNonVisualTitle("Babak Pertama: Album Utuh"), true);
    assert.equal(isAbstractNonVisualTitle("Overhead Protokol HTTP/2 Multiplexing"), true);
    assert.equal(isAbstractNonVisualTitle("Siapkan E-Money Rp 50.000"), true);
    assert.equal(isAbstractNonVisualTitle("Jakarta International Stadium"), false);

    const parsed = extractDistinctiveQueryTokens("My Chemical Romance Live Concert Indonesia 2026");
    assert.deepEqual(parsed.distinctive, ["chemical", "romance"]);
    assert.ok(parsed.modifiers.includes("live"));
    assert.ok(parsed.modifiers.includes("2026"));

    const enriched = distillVisualSearchQuery(
      "Stage Production",
      "Kasih informasi dong mengenai konser My Chemical Romance di Indonesia!",
    );
    assert.ok(
      /chemical/i.test(enriched) && /romance/i.test(enriched),
      `Expected contextAnchor enrichment for brief query, got: ${enriched}`,
    );

    const rcaProgram = [
      "```openui-lang",
      "root = Stack([rca])",
      'rca = RootCauseAnalysis("Mengapa PR Besar Sering Lolos Bawa Bug?", "Pencampuran Niat (Mixing Intentions) dalam Satu Diff", [{"faktor": "Reviewer Fatigue pada >400 baris kode", "bukti": "Studi Cisco menunjukkan deteksi defek turun drastis setelah 60 menit", "weight": "Direct"}, "Noise perubahan spasi menutupi mutasi state kritis"], "Sedang-Tinggi")',
      "```",
    ].join("\n");
    const rcaBlocks = parseMixedStreamToMistlineBlocks(rcaProgram, { final: true }).filter(
      (b) => b.kind === "ui",
    );
    assert.equal(rcaBlocks.length, 1);
    assert.equal(rcaBlocks[0].name, "RootCauseAnalysis");
    assert.equal(
      (rcaBlocks[0].props.contributingFactors as unknown[]).length,
      2,
    );
  });

  it("parses Versus with {title, points}, rewrites 4-arg Versus criteria matrix to ComparisonTable, and unwraps unlabeled OpenUI fences", () => {
    const s1 = [
      "root = Stack([vs1, cr1, f1])",
      'vs1 = Versus({title: "Sebelum Hari H (H-1)", points: ["Antrean longgar & cepat (rata-rata 10-15 menit)", "Stamina fisik utuh untuk hari konser"]}, {title: "Hari H Konser", points: ["Antrean panjang & padat di sekitar JIS", "Menguras energi & kaki pegal sebelum masuk venue"]}, "Perbandingan Penukaran Tiket")',
      'cr1 = Cards([{title: "Dokumen Wajib", subtitle: "Syarat Mutlak Penukaran", body: "Bawa e-voucher beserta KTP asli.", icon: "file-text"}, {title: "Jika Diwakilkan", subtitle: "Surat Kuasa Resmi", body: "Wajib membawa surat kuasa bermeterai Rp10.000.", icon: "users"}], "Ketentuan Dokumen Ravel Entertainment", "grid")',
      'f1 = Followups(["Tips menjaga gelang tiket agar tidak rusak", "Jam operasional penukaran tiket Ravel", "Lokasi gate masuk JIS sesuai kategori"])',
    ].join("\n");

    const s2FencedUnlabeled = [
      "Berikut ringkasannya:",
      "",
      "```",
      "root = Stack([vs1, card1, act1, f1])",
      'vs1 = Versus("Perbandingan Penukaran Tiket", "H-1 (Hari Sebelum Konser)", "Hari H Konser di JIS", [{criterion: "Waktu Antrean", "H-1 (Hari Sebelum Konser)": "Singkat (5-15 menit)", "Hari H Konser di JIS": "Sangat panjang & padat (1-2 jam)"}, {criterion: "Risiko Terlambat Masuk", "H-1 (Hari Sebelum Konser)": "Nol (Tiket sudah di tangan)", "Hari H Konser di JIS": "Tinggi jika datang mepet"}])',
      'card1 = Cards([{title: "Keuntungan Tukar H-1", subtitle: "Rekomendasi Utama", body: "Bisa santai, antrean sepi.", icon: "check"}, {title: "Risiko Tukar Hari H", subtitle: "Waspada Chaos", body: "Harus datang pagi-pagi sekali.", icon: "alert"}], "Analisis Risiko Penukaran Tiket", "grid")',
      'act1 = Adjuster([{key: "waktu_berangkat", label: "Waktu Penukaran Pilihan", kind: "chips", value: "H-1 (Sehari Sebelumnya)", options: ["H-1 (Sehari Sebelumnya)", "Hari H Pagi (09:00 WIB)", "Hari H Siang (Mendekati Gate)"]}], "Simulasi Kesiapan Tiket", "Pilih waktu penukaran yang paling ideal untuk menghemat energi fisik berdua.")',
      'f1 = Followups(["Dokumen wajib saat tukar e-ticket Ravel", "Bolehkah diwakilkan orang lain?", "Jam berapa gate JIS dibuka untuk MCR?"])',
      "```",
    ].join("\n");

    const b1 = parseMixedStreamToMistlineBlocks(s1, { final: true }).filter((b) => b.kind === "ui");
    assert.deepEqual(
      b1.map((b) => b.name),
      ["Versus", "Cards", "Followups"],
    );
    assert.equal((b1[0].props.a as { title?: string }).title, "Sebelum Hari H (H-1)");

    const segs2 = parseOpenUiMixedStream(s2FencedUnlabeled, { final: true });
    assert.equal(segs2[0].kind, "text");
    assert.equal(segs2[1].kind, "openui");
    if (segs2[1].kind === "openui") {
      assert.equal(segs2[1].parseResult.meta.errors?.length ?? 0, 0);
    }

    const b2 = parseMixedStreamToMistlineBlocks(s2FencedUnlabeled, { final: true }).filter(
      (b) => b.kind === "ui",
    );
    assert.deepEqual(
      b2.map((b) => b.name),
      ["ComparisonTable", "Cards", "Adjuster", "Followups"],
    );
  });

  it("adapts Explore sp--cover across photo, schematic, signal, and anti-duplication modes without rigid rules", async () => {
    const { buildExploreCoverBlueprint } = await import("../exploreCoverPlanner");

    // 1. Physical event Headline WITHOUT positional arg #5/#6 -> auto-resolves photo query
    const mcrBlocks = parseMixedStreamToMistlineBlocks(
      [
        "root = Stack([h, c, f])",
        'h = Headline("My Chemical Romance: Live in Jakarta 2026", "Tur Global", "Penutup rangkaian Long Live The Black Parade di JIS.")',
        'c = Cards([{title: "Jakarta International Stadium", body: "Venue utama konser MCR."}], "Panduan Venue")',
        'f = Followups(["Harga tiket MCR Jakarta"])',
      ].join("\n"),
      { final: true },
    );
    const mcrHead = mcrBlocks.find((b) => b.kind === "ui" && b.name === "Headline");
    assert.ok(mcrHead && mcrHead.kind === "ui");
    const mcrBp = buildExploreCoverBlueprint({
      headlineProps: mcrHead.props,
      allBlocks: mcrBlocks,
      userPrompt: "Kasih info konser My Chemical Romance di Indonesia!",
    });
    assert.equal(mcrBp.mode, "photo");
    assert.equal(mcrBp.absorbIntoTurnHead, false);
    assert.ok(
      mcrBp.resolvedImageQuery && /chemical\s+romance/i.test(mcrBp.resolvedImageQuery),
      `Expected MCR imageQuery, got ${mcrBp.resolvedImageQuery}`,
    );

    // 2. Technical multi-spread Headline -> schematic mode + live outline + grounded signals, NO photo search
    const sseBlocks = parseMixedStreamToMistlineBlocks(
      [
        "root = Stack([h, d, ct, fl])",
        'h = Headline("Performa Mendalam: SSE vs WebSocket", "Benchmark & Analisis Teknikal", "Membedah efisiensi jaringan LLM streaming.")',
        'd = VisualDossier("Ringkasan Kinerja", "SSE unggul untuk streaming searah.", [{"label": "Kemenangan SSE", "value": "HTTP/2 Multiplexing"}])',
        'ct = ComparisonTable("Matriks Komparasi", [{"name": "SSE"}, {"name": "WebSocket"}], {"Overhead": {"SSE": "Rendah", "WebSocket": "Handshake TCP"}})',
        'fl = Flow([{"id": "1", "label": "Client"}, {"id": "2", "label": "SSE Stream"}], [{"from": "1", "to": "2"}], "Alur Koneksi")',
      ].join("\n"),
      { final: true },
    );
    const sseHead = sseBlocks.find((b) => b.kind === "ui" && b.name === "Headline");
    assert.ok(sseHead && sseHead.kind === "ui");
    const sseBp = buildExploreCoverBlueprint({
      headlineProps: sseHead.props,
      allBlocks: sseBlocks,
      userPrompt: "Bandingkan performa SSE vs WebSocket untuk AI streaming",
    });
    assert.equal(sseBp.mode, "schematic");
    assert.equal(sseBp.absorbIntoTurnHead, false);
    assert.equal(sseBp.resolvedImageQuery, undefined);
    assert.equal(sseBp.outline.length, 3);
    assert.ok(sseBp.signals.length >= 1);

    // 3. Quantitative financial multi-spread -> signal mode + grounded Stats figure
    const finBlocks = parseMixedStreamToMistlineBlocks(
      [
        "root = Stack([h, st, adj, tb])",
        'h = Headline("Simulasi KPR Floating vs Fixed 2026", "Analisis Cicilan", "Evaluasi sensitivitas bunga terhadap arus kas bulanan.")',
        'st = Stats([{"label": "BI Rate Acuan", "value": "5.75%"}, {"label": "Bunga Floating", "value": "11.5%"}], "Indikator Bunga")',
        'adj = Adjuster([{"key": "tenor", "label": "Tenor", "min": 5, "max": 20, "value": 15}], "Kalkulator Tenor")',
        'tb = Table(["Tahun", "Bunga"], [["1-3", "Fixed 7.5%"], ["4-15", "Floating 11.5%"]], "Skema Bunga")',
      ].join("\n"),
      { final: true },
    );
    const finHead = finBlocks.find((b) => b.kind === "ui" && b.name === "Headline");
    assert.ok(finHead && finHead.kind === "ui");
    const finBp = buildExploreCoverBlueprint({
      headlineProps: finHead.props,
      allBlocks: finBlocks,
      userPrompt: "Simulasi bunga KPR floating vs fixed",
    });
    assert.equal(finBp.mode, "signal");
    assert.equal(finBp.absorbIntoTurnHead, false);
    assert.equal(finBp.signals[0]?.value, "5.75%");

    // 4. Short single-sibling non-photo Headline -> dissolves into Turn Head to prevent twin-title bloat
    const shortBlocks = parseMixedStreamToMistlineBlocks(
      [
        "root = Stack([h, cd])",
        'h = Headline("Perbedaan let dan const", "JavaScript Dasar", "Aturan reassignment variabel.")',
        'cd = Code("const x = 1;\\nlet y = 2;", "typescript", "Contoh Variabel")',
      ].join("\n"),
      { final: true },
    );
    const shortHead = shortBlocks.find((b) => b.kind === "ui" && b.name === "Headline");
    assert.ok(shortHead && shortHead.kind === "ui");
    const shortBp = buildExploreCoverBlueprint({
      headlineProps: shortHead.props,
      allBlocks: shortBlocks,
      userPrompt: "Apa perbedaan let dan const?",
    });
    assert.equal(shortBp.absorbIntoTurnHead, true);
  });

  it("enforces multi-turn session continuity, mandatory sub-facet web verification (MCR JIS -> e-ticket -> Senayan), telemetry sanitization, and photo-vs-logo filtering", async () => {
    const {
      buildSessionMemoryLedger,
      shouldEnforceFreshWebVerification,
    } = await import("../../genUiDesignSpec");
    const {
      detectVisualSubjectDomain,
      isNonPhotographicLogoOrGraphic,
      pickSharpDisplayImageUrl,
      wantsExplicitLogoQuery,
    } = await import("../../imageAssetContract");
    const {
      formatContextualToolStep,
      sanitizePublicTaskLabel,
    } = await import("../../taskTelemetrySanitizer");
    const { resolveModelMeta } = await import("../../modelCatalog");

    // 1. Multi-turn MCR JIS -> e-ticket exchange -> "eh bukannya di senayan" continuity & mandatory web search
    const turn1User = "tentang jis dan mcr konser";
    const turn1Assistant =
      "My Chemical Romance menggelar konser di Jakarta International Stadium (JIS) pada 22 November 2026 bersama promotor Ravel Entertainment.";
    const turn2User = "soal pertukaran e-tiket gimana?";

    const t2Transition = detectTaskTransition({
      latestUserText: turn2User,
      previousUserTexts: [turn1User],
    });
    assert.equal(t2Transition, "continue_task", "Follow-up ticket exchange must continue session");

    const ledgerT2 = buildSessionMemoryLedger({
      latestUserText: turn2User,
      previousUserTexts: [turn1User],
      previousAssistantTexts: [turn1Assistant],
      taskTransition: t2Transition,
    });
    assert.equal(ledgerT2.isActiveContinuation, true);
    assert.ok(
      /My Chemical Romance/i.test(ledgerT2.sessionSearchAnchor),
      `Expected MCR in sessionSearchAnchor, got: ${ledgerT2.sessionSearchAnchor}`,
    );
    assert.ok(
      /Ravel Entertainment/i.test(ledgerT2.sessionSearchAnchor),
      `Expected Ravel Entertainment in sessionSearchAnchor, got: ${ledgerT2.sessionSearchAnchor}`,
    );

    assert.equal(
      shouldEnforceFreshWebVerification({
        latestUserText: turn2User,
        previousUserTexts: [turn1User],
      }),
      true,
      "Sub-facet ticket exchange question must enforce Step-0 web_search across both reasoning and non-reasoning modes",
    );

    const anchoredQueries = expandWebSearchQueries(
      "pertukaran e-tiket",
      false,
      ledgerT2.sessionSearchAnchor,
    );
    assert.ok(
      anchoredQueries.some((q) => /My Chemical Romance/i.test(q)),
      `Follow-up web_search query must be anchored to MCR, got: ${JSON.stringify(anchoredQueries)}`,
    );
    assert.ok(
      anchoredQueries.some((q) => /wristband|e-voucher/i.test(q)),
      `Ticket exchange query should expand to e-voucher/wristband angle, got: ${JSON.stringify(anchoredQueries)}`,
    );

    // Turn 3: User factual challenge ("eh bukannya di senayan") retains Turn 1 MCR entity & triggers correction alert
    const turn3User = "eh bukannya di senayan";
    const t3Transition = detectTaskTransition({
      latestUserText: turn3User,
      previousUserTexts: [turn1User, turn2User],
    });
    assert.equal(t3Transition, "refine_task");

    const ledgerT3 = buildSessionMemoryLedger({
      latestUserText: turn3User,
      previousUserTexts: [turn1User, turn2User],
      previousAssistantTexts: [turn1Assistant, "Penukaran dilakukan sebelum konser."],
      taskTransition: t3Transition,
    });
    assert.equal(ledgerT3.isActiveContinuation, true);
    assert.equal(ledgerT3.isUserChallengeOrCorrection, true);
    assert.ok(/My Chemical Romance/i.test(ledgerT3.sessionSearchAnchor));
    assert.equal(
      shouldEnforceFreshWebVerification({
        latestUserText: turn3User,
        previousUserTexts: [turn1User, turn2User],
      }),
      true,
    );

    const t3Guidance = buildDynamicTurnGuidance({
      lookId: "music",
      latestUserText: turn3User,
      previousUserTexts: [turn1User, turn2User],
      previousAssistantTexts: [turn1Assistant],
      taskTransition: t3Transition,
      needsExternalSearchHint: true,
    });
    assert.ok(t3Guidance.includes("Session Continuity Spine"));
    assert.ok(t3Guidance.includes("Factual Challenge / Correction Alert"));

    // 2. Production Task Telemetry Sanitizer: zero OpenUI Gateway / Anthropic / GPT / Exa leaks
    assert.equal(
      sanitizePublicTaskLabel(
        "OpenUI Gateway HTTP 402 (insufficient balance), beralih ke cadangan Gemini...",
      ),
      "Memperdalam penelusuran konteks...",
    );
    assert.equal(
      sanitizePublicTaskLabel("5 hasil (exa + firecrawl)"),
      "5 sumber relevan",
    );
    assert.equal(
      sanitizePublicTaskLabel("Google Search: penukaran tiket MCR Senayan"),
      "Menelusuri web: penukaran tiket MCR Senayan",
    );
    const toolStep = formatContextualToolStep("web_search", "Gedung Serbaguna Senayan MCR");
    assert.equal(toolStep.actionLabel, "Penelusuran sumber web");
    assert.ok(!/anthropic|openai|claude|gpt/i.test(resolveModelMeta("anthropic/claude-sonnet-4.6").shortLabel));
    assert.ok(!/anthropic|openai|claude|gpt/i.test(resolveModelMeta("openai/gpt-5").shortLabel));

    // 3. Context-accurate Photo vs Logo Filtering for Places & Transport
    assert.equal(detectVisualSubjectDomain("Gedung Serbaguna Senayan GBK"), "place");
    assert.equal(detectVisualSubjectDomain("MRT Jakarta Bundaran HI"), "transport");
    assert.equal(wantsExplicitLogoQuery("MRT Jakarta"), false);
    assert.equal(wantsExplicitLogoQuery("logo resmi MRT Jakarta"), true);

    assert.equal(
      isNonPhotographicLogoOrGraphic(
        "https://mrtjakarta.co.id/assets/img/mrt-jakarta-logo.png",
        "MRT Jakarta",
        undefined,
        false,
      ),
      true,
    );
    assert.equal(
      isNonPhotographicLogoOrGraphic(
        "https://ravelentertainment.com/static/ravel_logo_white.webp",
        "Ravel Entertainment",
        undefined,
        false,
      ),
      true,
    );
    assert.equal(
      isNonPhotographicLogoOrGraphic(
        "https://cdn.example.com/brand-mark.png",
        "MRT",
        { width: 256, height: 256 },
        false,
      ),
      true,
    );
    assert.equal(
      isNonPhotographicLogoOrGraphic(
        "https://mrtjakarta.co.id/assets/img/mrt-jakarta-logo.png",
        "Logo MRT Jakarta",
        undefined,
        true,
      ),
      false,
      "Explicit logo query should permit logo assets",
    );
    assert.equal(
      isNonPhotographicLogoOrGraphic(
        "https://upload.wikimedia.org/wikipedia/commons/8/8b/Jakarta_International_Stadium_night.jpg",
        "Iconic Stadium Architecture at Night",
        { width: 1280, height: 800 },
        false,
      ),
      false,
      "Real exterior stadium photo with word 'Iconic' must NOT be falsely rejected",
    );

    // 4. Retina sharpness selector: Openverse/Exa pick full-res imageUrl over low-res thumbnailUrl; Wikimedia picks 1600px raster thumb
    assert.equal(
      pickSharpDisplayImageUrl({
        provider: "openverse",
        imageUrl: "https://live.staticflickr.com/65535/jis_highres_1600.jpg",
        thumbnailUrl: "https://api.openverse.org/v1/images/abc/thumb/",
      }),
      "https://live.staticflickr.com/65535/jis_highres_1600.jpg",
    );
    assert.equal(
      pickSharpDisplayImageUrl({
        provider: "wikimedia",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Raw_25MB.tif",
        thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Raw_25MB.tif/1600px-Raw_25MB.tif.jpg",
      }),
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Raw_25MB.tif/1600px-Raw_25MB.tif.jpg",
    );
  });

  it("parses dynamic BentoGrid slots (flight, train, concert, fun fact) in both title-first and items-first order", () => {
    const blocksA = parseMixedStreamToMistlineBlocks(
      [
        "```openui-lang",
        "root = Stack([bg])",
        'bg = BentoGrid("Ringkasan Konteks", [{"slot": "flight_route_arc", "title": "GA-884 · CGK ke HND", "from": "CGK", "to": "HND", "departTime": "08:15 WIB", "arriveTime": "17:40 JST", "gate": "T3 · G6"}, {"slot": "concert_stage_time", "title": "Jadwal Panggung", "rows": [{"label": "Hindia", "badge": "20:45"}]}], "Subjudul Bento")',
        "```",
      ].join("\n"),
      { final: true },
    );
    const uiA = blocksA.find((b) => b.kind === "ui" && b.name === "BentoGrid");
    assert.ok(uiA && uiA.kind === "ui", "Should parse title-first BentoGrid");
    assert.equal(uiA.props.title, "Ringkasan Konteks");
    assert.equal((uiA.props.items as unknown[])?.length, 2);

    const blocksB = parseMixedStreamToMistlineBlocks(
      [
        "```openui-lang",
        "root = Stack([bg])",
        'bg = BentoGrid([{"slot": "fun_fact_spotlight", "title": "Fakta Gurita", "statValue": "3×", "summary": "Tiga jantung aktif."}], "Bento Balik")',
        "```",
      ].join("\n"),
      { final: true },
    );
    const uiB = blocksB.find((b) => b.kind === "ui" && b.name === "BentoGrid");
    assert.ok(uiB && uiB.kind === "ui", "Should auto-repair items-first BentoGrid");
    assert.equal(uiB.props.title, "Bento Balik");
    assert.equal((uiB.props.items as unknown[])?.length, 1);

    const blocksC = parseMixedStreamToMistlineBlocks(
      [
        "```openui-lang",
        "root = Stack([bg])",
        'bg = BentoGrid([{"slot": "syarat_dokumen", "label": "Syarat Masuk", "summary": "Bawa KTP fisik asli.", "dos": ["Siapkan KTP", "Bawa e-voucher"]}])',
        "```",
      ].join("\n"),
      { final: true },
    );
    const uiC = blocksC.find((b) => b.kind === "ui" && b.name === "BentoGrid");
    assert.ok(uiC && uiC.kind === "ui", "Should auto-repair single-arg items BentoGrid");
    assert.equal((uiC.props.items as unknown[])?.length, 1);

    // Verify BentoGrid is NOT placed at index 0 across all roles
    assert.notEqual(ROLE_PREFERRED_FAMILIES.rest[0], "BentoGrid");
    assert.notEqual(ROLE_PREFERRED_FAMILIES.traveller[0], "BentoGrid");
    assert.notEqual(ROLE_PREFERRED_FAMILIES.bug[0], "BentoGrid");
    assert.notEqual(ROLE_PREFERRED_FAMILIES.builder[0], "BentoGrid");
  });

  it("guarantees >= 5 consistent Explore endcap followups with icons, semantic kickers, and 5-item prompt guidance", async () => {
    const { buildContextualExploreBranches, shortenTopicLabel } = await import(
      "../exploreEndcapPlanner"
    );
    assert.ok(shortenTopicLabel("Kasih informasi dong mengenai konser My Chemical Romance", 28).endsWith("…"));

    const sparseTurnBranches = buildContextualExploreBranches({
      userText: "Kasih informasi lengkap mengenai konser My Chemical Romance di Jakarta International Stadium 2026",
      botMsg: {
        id: "m1",
        role: "momo",
        text: [
          "```openui-lang",
          "root = Stack([h1, f1])",
          'h1 = Headline("My Chemical Romance Jakarta 2026", "Tur Asia", "Konser di JIS.")',
          'f1 = Followups(["Harga tiket resmi per kategori", "Lokasi penukaran e-voucher Senayan"])',
          "```",
        ].join("\n"),
      },
    });
    assert.ok(
      sparseTurnBranches.length >= 5,
      `Expected >= 5 Explore endcap followups even when AI emitted 2, got ${sparseTurnBranches.length}`,
    );
    for (const b of sparseTurnBranches) {
      assert.ok(b.icon && b.icon.length > 0, "Every branch row must carry a contextual icon");
      assert.ok(b.kicker && b.kicker.length > 0, "Every branch row must carry a semantic kicker");
      assert.ok(b.label && b.label.length > 0, "Every branch row must carry a clean label");
    }

    const exploreGuidance = buildDynamicTurnGuidance({
      lookId: "music",
      latestUserText: "Konser MCR di Jakarta",
      workspaceView: "explore",
    });
    assert.ok(exploreGuidance.includes("AT LEAST 5"), "Explore turn guidance must require >= 5 Followups");
  });

  it("parses CatalogShelf and AnnotatedSheet in title-first, items-first, and single-arg order, and recommends them contextually", () => {
    const blocksCat = parseMixedStreamToMistlineBlocks(
      [
        "```openui-lang",
        "root = Stack([cat1, ann1])",
        'cat1 = CatalogShelf("Diskografi MCR", [{"title": "The Black Parade", "year": "2006", "tracks": [{"title": "Welcome to the Black Parade", "duration": "5:11", "highlight": true}]}], "Album Studio")',
        'ann1 = AnnotatedSheet([{"label": "Verse 1", "text": "When I was a young boy", "note": "Memori parade masa kecil."}], "Welcome to the Black Parade")',
        "```",
      ].join("\n"),
      { final: true },
    );

    const catUi = blocksCat.find((b) => b.kind === "ui" && b.name === "CatalogShelf");
    assert.ok(catUi && catUi.kind === "ui", "Should parse CatalogShelf");
    assert.equal(catUi.props.title, "Diskografi MCR");
    assert.equal((catUi.props.items as unknown[])?.length, 1);

    const annUi = blocksCat.find((b) => b.kind === "ui" && b.name === "AnnotatedSheet");
    assert.ok(annUi && annUi.kind === "ui", "Should auto-repair items-first AnnotatedSheet");
    assert.equal(annUi.props.title, "Welcome to the Black Parade");
    assert.equal((annUi.props.sections as unknown[])?.length, 1);

    const albumCtx = analyzeTurnContext({
      latestUserText: "Kasih list album My Chemical Romance dan tracklist The Black Parade",
      lookId: "music",
      workspaceView: "chat",
    });
    assert.ok(albumCtx.recommendedComponents.includes("CatalogShelf"), "Should recommend CatalogShelf for discography queries");

    const lyricCtx = analyzeTurnContext({
      latestUserText: "Bedah lirik dan makna lagu Welcome to the Black Parade",
      lookId: "music",
      workspaceView: "chat",
    });
    assert.ok(lyricCtx.recommendedComponents.includes("AnnotatedSheet"), "Should recommend AnnotatedSheet for lyric analysis queries");
  });

  it("applies content-driven data-density bias in uiPlanner based on tool snippet density", async () => {
    const { createEmptyDataProfile, enrichDataProfileFromTextAndTools, planContextAwareUi } =
      await import("../uiPlanner");

    const bioProfile = enrichDataProfileFromTextAndTools(createEmptyDataProfile(), {
      userText: "Ceritakan biografi dan perjalanan karir My Chemical Romance",
      toolSnippets: [
        "Formed in 2001 in Newark. Debut album Bullets released in 2002. Three Cheers in 2004, Black Parade in 2006, Danger Days in 2010, disbanded 2013, reunited 2019.",
      ],
    });
    const bioPlan = planContextAwareUi({
      latestUserText: "Ceritakan biografi dan perjalanan karir My Chemical Romance",
      lookId: "music",
      workspaceView: "chat",
      previousUserTexts: [],
      previousAssistantTexts: [],
      recentComponents: [],
      availableData: bioProfile,
    });
    assert.ok(
      bioPlan.dataGroundingRules.some((r) => r.includes("Content-Driven Bias (Chronology")),
      "Should emit Content-Driven Chronology bias when tool snippets contain >= 4 dated milestones",
    );

    const controversyProfile = enrichDataProfileFromTextAndTools(createEmptyDataProfile(), {
      userText: "Bagaimana fakta kontroversi band ini?",
      toolSnippets: [
        "Rumor dan klaim media sempat dibantah dalam klarifikasi resmi dengan bukti wawancara.",
      ],
    });
    const controversyPlan = planContextAwareUi({
      latestUserText: "Bagaimana fakta kontroversi band ini?",
      lookId: "investigate",
      workspaceView: "chat",
      previousUserTexts: [],
      previousAssistantTexts: [],
      recentComponents: [],
      availableData: controversyProfile,
    });
    assert.ok(
      controversyPlan.dataGroundingRules.some((r) => r.includes("Content-Driven Bias (Evidence/Claims")),
      "Should emit Content-Driven Evidence/Claims bias when snippets are controversy-heavy",
    );
  });

  it("strips leaked [Thought Process]/[UI Plan]/[Execution] scratchpad, parses unfenced Followups, and parses RegionalShowcase", () => {
    const leakedMessage = [
      "[User Request]Iya itu Draag narasi temanya beda beda?",
      "[Thought Process]Internal thinking here.",
      "[UI Plan]",
      "0",
      "[Drafting Prose]Drafting...",
      "[Final Verification]Verified.",
      "[Execution]",
      "[Internal UI Plan Conclusion]Done planning.",
      "Narasi Draag memang berkembang antar benua.",
      "",
      'f1 = Followups(["Apa arti simbol MOAT?", "Siapa Grand Immortal Dictator?", "Merch eksklusif Jakarta?", "Posisi berdiri terbaik?", "Teori ending Draag"])',
    ].join("\n");

    const blocks = parseMixedStreamToMistlineBlocks(leakedMessage, { final: true });
    const textJoined = blocks
      .filter((b) => b.kind === "text")
      .map((b) => b.text)
      .join("\n");

    assert.ok(!textJoined.includes("[Thought Process]"), "Must strip [Thought Process]");
    assert.ok(!textJoined.includes("[UI Plan]"), "Must strip [UI Plan]");
    assert.ok(!textJoined.includes("[Internal UI Plan Conclusion]"), "Must strip [Internal UI Plan Conclusion]");
    assert.ok(!textJoined.includes("f1 = Followups"), "Must NOT leak unfenced Followups as raw text");
    assert.ok(textJoined.includes("Narasi Draag memang berkembang"), "Must preserve real prose");

    const followupsUi = blocks.find((b) => b.kind === "ui" && b.name === "Followups");
    assert.ok(followupsUi && followupsUi.kind === "ui", "Must parse unfenced Followups into Followups UI block");

    const regBlocks = parseMixedStreamToMistlineBlocks(
      [
        "```openui-lang",
        "root = Stack([rs1])",
        'rs1 = RegionalShowcase("Tema Draag", [{"name": "Amerika Utara", "summary": "Eksekusi panggung."}, {"name": "Jakarta", "summary": "Babak akhir."}], "Dunia diktator fiktif Draag.")',
        "```",
      ].join("\n"),
      { final: true },
    );
    const regUi = regBlocks.find((b) => b.kind === "ui" && b.name === "RegionalShowcase");
    assert.ok(regUi && regUi.kind === "ui", "Should parse RegionalShowcase");
    assert.equal((regUi.props.regions as unknown[])?.length, 2);

    const themeCtx = analyzeTurnContext({
      latestUserText: "Kasih tau gue dong temanya MCR tour ini secara detail dan katanya bertema tiap regional",
      lookId: "music",
      workspaceView: "chat",
    });
    assert.ok(themeCtx.recommendedComponents.includes("RegionalShowcase"), "Should recommend RegionalShowcase for regional theme queries");
  });

  it("switches adaptive Momo roles per turn via semantic scoring while preserving fallbackLook on ambiguous follow-ups", () => {
    const t1 = inferLookByKeyword("Dari Aston Kemayoran ke JIS naik apa biar nggak macet?");
    assert.equal(t1, "traveller");

    const t2 = inferLookByKeyword(
      "Bedah makna lirik dan setlist lagu album The Black Parade MCR dong",
      { fallbackLook: t1 },
    );
    assert.equal(t2, "music");

    const t3 = inferLookByKeyword(
      "Simulasi budget dan alokasi gaji buat nabung tiket konser tanpa ganggu dana darurat",
      { fallbackLook: t2 },
    );
    assert.equal(t3, "money");

    const t4Ambiguous = inferLookByKeyword("Terus kalau begitu gimana menurut lo?", {
      fallbackLook: t3,
    });
    assert.equal(t4Ambiguous, "money", "Short ambiguous follow-up should inherit active turn fallbackLook");
  });

  it("enforces strict location/entity contextual relevance and rejects generic-modifier or accident-noise images", () => {
    const astonTokens = extractDistinctiveQueryTokens("Aston Kemayoran Hotel Jakarta");
    assert.deepEqual(astonTokens.distinctive, ["aston", "kemayoran", "jakarta"]);
    assert.ok(astonTokens.modifiers.includes("hotel"));

    // Must reject unrelated Jakarta hotel that only matches "aston" + "jakarta" (missing "kemayoran")?
    // Wait: 3 distinctive tokens requires ceil(3 * 0.65) = 2, whereas 2-token "Aston Kemayoran" requires both!
    const twoTokenAston = extractDistinctiveQueryTokens("Aston Kemayoran Hotel");
    assert.equal(
      isImageAssetContextuallyRelevant(
        {
          imageUrl: "https://cdn.example.com/aston-bali.jpg",
          sourceUrl: "https://example.com/aston-bali",
          sourceTitle: "Aston Bali Resort",
          caption: "Aston Bali Resort Exterior",
          alt: "Aston Bali",
          provider: "exa",
        },
        twoTokenAston,
      ),
      false,
      "Must reject partial brand match when location token (kemayoran) is missing",
    );

    assert.equal(
      isImageAssetContextuallyRelevant(
        {
          imageUrl: "https://cdn.example.com/aston-kemayoran-exterior.jpg",
          sourceUrl: "https://example.com/aston-kemayoran",
          sourceTitle: "Aston Kemayoran City Hotel",
          caption: "Aston Kemayoran City Hotel Exterior",
          alt: "Aston Kemayoran",
          provider: "tinyfish",
        },
        twoTokenAston,
      ),
      true,
      "Should accept photo matching both Aston and Kemayoran",
    );

    // Must reject empty/unparsable queries rather than returning true for everything
    const emptyTokens = extractDistinctiveQueryTokens("foto gambar view");
    assert.equal(
      isImageAssetContextuallyRelevant(
        {
          imageUrl: "https://cdn.example.com/random.jpg",
          sourceUrl: "https://example.com/random",
          caption: "Random photo",
          alt: "Random photo",
          provider: "exa",
        },
        emptyTokens,
      ),
      false,
    );

    // Must reject disaster/accident news images even when location token matches
    assert.equal(
      isNonPhotographicLogoOrGraphic(
        "https://cdn.example.com/news/mobil-pickup-tercebur-kali-sunter.jpg",
        "Mobil Pickup Tercebur di Kali Sunter",
      ),
      true,
    );

    // Must expand stadium shorthand and strip gate noise without polluting multi-token places with unrelated contextAnchor
    assert.equal(distillVisualSearchQuery("JIS West Gate"), "Jakarta International Stadium");
    assert.equal(
      distillVisualSearchQuery("Aston Kemayoran", "My Chemical Romance JIS Jakarta"),
      "Aston Kemayoran",
    );
    assert.match(
      distillVisualSearchQuery("Main Stage", "My Chemical Romance JIS"),
      /Chemical Romance/i,
    );
  });
});

describe("Inline UI placement and role-agnostic catalog", () => {
  const block = (body: string) => `\`\`\`openui-lang\n${body}\n\`\`\``;
  const callout = block('root = Stack([c1])\nc1 = Callout("satu")');
  const steps = block('root = Stack([s1, f1])\ns1 = Steps([{title: "a"}], "t")\nf1 = Followups(["a b c d", "e f g h", "i j k l", "m n o p", "q r s t"])');

  it("keeps prose and several UI blocks in the order they were written", () => {
    const segs = parseOpenUiMixedStream(`Pembuka.\n\n${callout}\n\nLanjutan.\n\n${steps}\n\nPenutup.`, { final: true });
    assert.deepEqual(segs.map((sg) => sg.kind), ["text", "openui", "text", "openui", "text"]);
    assert.ok(segs.every((sg) => sg.kind !== "openui" || (sg.complete && Boolean(sg.parseResult.root))));
  });

  it("renders two healthy blocks written back to back, and still collapses a restarted block", () => {
    const healthy = parseOpenUiMixedStream(`${callout}\n${steps}`, { final: true });
    assert.deepEqual(healthy.map((sg) => sg.kind), ["openui", "openui"]);

    const broken = block('root = Stack([c1, s1])\nc1 = Callout("satu")');
    const redo = block('root = Stack([c1, s1])\nc1 = Callout("satu")\ns1 = Steps([{title: "a"}], "t")');
    const retried = parseOpenUiMixedStream(`${broken}\n${redo}`, { final: true });
    assert.equal(retried.length, 1);
    assert.equal(retried[0].kind === "openui" ? retried[0].parseResult.meta.unresolved?.length ?? 0 : -1, 0);
  });

  it("completes an early block from a fragment that arrives after later prose and blocks", () => {
    const early = block('root = Stack([c1, s1])\nc1 = Callout("satu")');
    const fragment = block('s1 = Steps([{title: "a"}], "t")');
    const segs = parseOpenUiMixedStream(`${early}\n\nTeks di tengah.\n\n${callout}\n\n${fragment}`, { final: true });
    assert.deepEqual(segs.map((sg) => sg.kind), ["openui", "text", "openui"]);
    assert.equal(getOpenUiUnresolvedRefs(`${early}\n\nTeks di tengah.\n\n${callout}\n\n${fragment}`).length, 0);
  });

  it("gives every role the same full catalog and tells the model to place blocks inline", () => {
    const base = {
      latestUserText: "jelasin cara kerja inflasi dan dampaknya ke tabungan",
      workspaceView: "chat" as const,
      previousUserTexts: [],
      previousAssistantTexts: [],
      recentComponents: [],
      availableData: createEmptyDataProfile(),
    };
    const sizes = ["rest", "cook", "money", "music", "bug"].map(
      (lookId) => new Set(planContextAwareUi({ ...base, lookId }).allowedComponents).size,
    );
    assert.ok(sizes.every((n) => n === sizes[0] && n >= 60), `Expected one full catalog, got ${sizes.join(",")}`);

    const prompt = buildStaticMomoSystemPrompt("cook", "chat", {
      allowedComponents: planContextAwareUi({ ...base, lookId: "cook" }).allowedComponents,
    });
    assert.ok(prompt.includes("KpiCard") && prompt.includes("ArchitectureDiagram"));
    assert.match(prompt, /A reply may contain SEVERAL fenced/);
    assert.match(prompt, /## Response Rhythm/);
    assert.doesNotMatch(prompt, /inside a single fenced/);
  });
});

describe("Role personas and writing craft", () => {
  it("gives all 18 roles their own card, opens the prompt with it, and renames Koki to Chef", () => {
    const ids = ["rest", ...Object.keys(LOOK_NAMES)];
    assert.equal(ids.length, 18);
    for (const id of ids) assert.ok(ROLE_PERSONAS[id], `no persona for ${id}`);
    assert.equal(new Set(Object.values(ROLE_PERSONAS).map((p) => p.voice)).size, 18);
    assert.equal(new Set(Object.values(ROLE_PERSONAS).map((p) => p.ui)).size, 18);
    assert.equal(LOOK_NAMES.cook, "Chef");

    const chef = buildStaticMomoSystemPrompt("cook", "chat");
    assert.ok(chef.indexOf("## You Are Chef") >= 0 && chef.indexOf("## You Are Chef") < 400, "role card opens the prompt");
    assert.match(chef, /## Writing Craft/);
    assert.doesNotMatch(chef, /Koki/);
    assert.match(buildStaticMomoSystemPrompt("money", "chat"), /## You Are Finansial/);
  });

  it("turns prose em dashes into commas and leaves code, photo lines and ranges alone", () => {
    const out = replaceProseEmDashes('salah strategi—misalnya pagi — siang, 10—12 jam, `a—b`\n```\nx — y\n```\n![T — d](u "left")');
    assert.equal(out, 'salah strategi, misalnya pagi, siang, 10–12 jam, `a—b`\n```\nx — y\n```\n![T — d](u "left")');
  });
});

describe("Momo register and profanity", () => {
  it("reads the user's register from the latest message, then from the session", () => {
    assert.equal(readUserRegister("Bro ada berita apa hari ini dengan negara indonesia yang kacau").level, "casual");
    assert.equal(readUserRegister("anjir ini kenapa error mulu bangsat").level, "rough");
    assert.equal(readUserRegister("Mohon jelaskan apakah kebijakan ini berlaku").level, "formal");
    assert.equal(readUserRegister("lanjut", ["gue bingung nih"]).level, "casual");
    assert.equal(readUserRegister("Inflasi 2024").level, "neutral");
  });

  it("lets only Momo swear on its own and makes it casual by default", () => {
    const momo = buildStaticMomoSystemPrompt("rest", "chat");
    const chef = buildStaticMomoSystemPrompt("cook", "chat");
    assert.match(momo, /Profanity is normal vocabulary for you/);
    assert.doesNotMatch(momo, /never exceeds their level/);
    assert.match(chef, /never exceeds their level/);
    assert.doesNotMatch(chef, /Profanity is normal vocabulary/);
    assert.match(momo, /kalau lo seduh manual/, "Momo's worked example is written in gue/lo");
    assert.doesNotMatch(chef, /kalau lo seduh manual/);

    assert.match(formatRegisterLock("rest", "apa itu inflasi"), /use your default: casual/);
    assert.match(formatRegisterLock("cook", "apa itu inflasi"), /use your default: casual/);
    assert.match(formatRegisterLock("cook", "apa itu inflasi"), /Profanity still waits/);
    assert.doesNotMatch(formatRegisterLock("rest", "apa itu inflasi"), /Profanity still waits/);
    assert.match(formatRegisterLock("rest", "bro kok gini sih"), /user does not have to go first/);
    assert.match(formatRegisterLock("rest", "Mohon bantuan Anda"), /no swearing/);
    assert.match(formatRegisterLock("cook", "anjir gosong"), /up to their level/);

    const turn = buildDynamicTurnGuidance({ lookId: "rest", latestUserText: "bro jelasin inflasi dong" });
    assert.match(turn, /Register Lock: the user writes casually \("bro", "dong"\)/);
  });
});

describe("NewsFeed for current events", () => {
  const sources = [
    { title: "A", url: "https://news.detik.com/berita/d-1/banjir-riau?utm_source=x", domain: "news.detik.com", publishedDate: "2026-01-05T02:00:00.000Z", articleImageUrl: "https://akcdn.detik.net.id/visual/2026/01/05/banjir_169.jpeg" },
    { title: "B", url: "https://www.tempo.co/ekonomi/bi-rate-123/", domain: "tempo.co", snippet: "Baca juga https://www.tempo.co/ekonomi/rupiah-melemah-456 soal rupiah" },
    { title: "C", url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc", domain: "kompas.com" },
  ];

  it("routes a news question to NewsFeed and warns against scored panels", () => {
    const text = "Bro ada berita apa hari ini dengan negara indonesia yang kacau";
    const signals = analyzeTurnContext({ latestUserText: text, lookId: "rest", workspaceView: "chat" });
    assert.equal(signals.newsIntent, true);
    assert.equal(signals.mode, "rich_ui");
    assert.equal(signals.recommendedComponents[0], "NewsFeed");
    assert.equal(analyzeTurnContext({ latestUserText: "jelasin cara kerja inflasi", lookId: "rest", workspaceView: "chat" }).newsIntent, false);

    const turn = buildDynamicTurnGuidance({ lookId: "rest", latestUserText: text });
    assert.match(turn, /News Directive: .*NewsFeed\(title, articles\)/);
    assert.match(turn, /do not emit `RiskMatrix`/);

    const plan = planContextAwareUi({
      latestUserText: text, lookId: "money", workspaceView: "chat", previousUserTexts: [],
      previousAssistantTexts: [], recentComponents: [], availableData: createEmptyDataProfile(),
    });
    assert.ok(plan.allowedComponents.includes("NewsFeed"), "every role can emit NewsFeed");
    assert.match(buildStaticMomoSystemPrompt("money", "chat"), /NewsFeed/);
  });

  it("parses a NewsFeed block with positional title and articles", () => {
    const reply = 'Ini yang rame.\n\n```openui-lang\nroot = Stack([n1])\nn1 = NewsFeed("Yang rame hari ini", [{headline: "Banjir Riau meluas", url: "https://news.detik.com/berita/d-1/banjir-riau", summary: "Tiga kabupaten siaga.", outlet: "Detik"}])\n```';
    const ui = parseMixedStreamToMistlineBlocks(reply, { final: true }).filter((b) => b.kind === "ui");
    assert.equal(ui.length, 1);
    assert.equal(ui[0].kind === "ui" && ui[0].name, "NewsFeed");
    const props = ui[0].kind === "ui" ? ui[0].props : {};
    assert.equal(props.title, "Yang rame hari ini");
    assert.equal(normalizeNewsArticles(props.articles)[0].headline, "Banjir Riau meluas");
  });

  it("gives a matched article the source's link, date and photo, and strips what it cannot trace", () => {
    const articles = normalizeNewsArticles([
      { headline: "Banjir", url: "https://news.detik.com/berita/d-1/banjir-riau/", image: "https://evil.example/x.jpg" },
      { title: "BI Rate", source: "Tempo", url: "https://tempo.co/ngarang" },
      { headline: "Gempa", outlet: "Kompas.com" },
      { headline: "Rupiah", url: "https://www.tempo.co/ekonomi/rupiah-melemah-456" },
      { headline: "Karangan", url: "https://ngarang.example/a", outlet: "Ngarang" },
      { headline: "" },
    ]);
    assert.equal(articles.length, 5);
    assert.ok(articles.every((a) => !("imageUrl" in a)), "a model-supplied image never survives");

    const bound = bindNewsArticlesToSources(articles, sources);
    assert.equal(bound[0].url, sources[0].url);
    assert.equal(bound[0].imageUrl, sources[0].articleImageUrl);
    assert.equal(bound[0].publishedAt, sources[0].publishedDate);
    assert.equal(bound[0].outlet, "news.detik.com");
    assert.equal(bound[1].url, undefined, "a made-up path never borrows another article's link");
    assert.equal(bound[2].url, sources[2].url, "with no url, a grounding source matches by outlet");
    assert.equal(bound[3].url, "https://www.tempo.co/ekonomi/rupiah-melemah-456", "a url quoted in a source's text stays");
    assert.equal(bound[3].imageUrl, undefined);
    assert.equal(bound[4].url, undefined);
    assert.equal(bound[4].headline, "Karangan");
    assert.ok(bindNewsArticlesToSources(articles, undefined).every((a) => !a.url && !a.imageUrl));
  });

  it("tells article pages from homepages and section indexes", () => {
    assert.equal(isLikelyArticleUrl("https://nasional.kompas.com/read/2026/11/21/06081701/update-pemilihan-wapres"), true);
    assert.equal(isLikelyArticleUrl("https://www.antaranews.com/berita/5868971/politik-kemarin"), true);
    assert.equal(isLikelyArticleUrl("https://bsinews.id/anak-yatim-tanam-pohon-bandung"), true);
    assert.equal(isLikelyArticleUrl("https://www.tempo.co/politik"), false);
    assert.equal(isLikelyArticleUrl("https://rmol.id/rubrik/politik"), false);
    assert.equal(isLikelyArticleUrl("https://kompas.com"), false);
  });

  it("accepts a real article photo and refuses logos and default share banners", () => {
    assert.equal(isUsableArticleImageUrl("https://akcdn.detik.net.id/visual/2026/01/05/banjir-parah-di-riau_169.jpeg?w=650"), true);
    assert.equal(isUsableArticleImageUrl("https://cdn.site.com/assets/logo.png"), false);
    assert.equal(isUsableArticleImageUrl("https://site.com/og-image.jpg"), false);
    assert.equal(isUsableArticleImageUrl("https://site.com/images/default.jpg"), false);
    assert.equal(isUsableArticleImageUrl("https://site.com/berita/banjir.html"), false);
  });
});

