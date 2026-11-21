import type { MistlineBlock, MistlineUIBlock } from "./mistlineParse";

/**
 * Component catalog written as a semantic vocabulary (what each primitive
 * communicates and when it helps) plus clean board distillation per role.
 */
export interface MistlineComponentSpec {
  summary: string;
  when: string;
  props: string;
  board: "items" | "block" | "none";
}

export const MISTLINE_CATALOG: Record<string, MistlineComponentSpec> = {
  Headline: {
    summary: "Big editorial title.",
    when: "Opening a substantial, multi-part answer. Never for short replies, never twice in a row across turns.",
    props: `{"kicker"?: string, "title": string, "subtitle"?: string, "align"?: "left"|"center", "image"?: string, "imageQuery"?: string /* semantic photo query when visual cover fits */}`,
    board: "none",
  },
  Cards: {
    summary: "A collection of parallel things: places, references, suspects, concepts, accounts, dishes.",
    when: "2–6 items the user may want to inspect, save, filter, or compare. layout: feature = one hero + rest, grid = visual cards, row = scrollable strip, list = dense ranked list with icons.",
    props: `{"title"?: string, "layout"?: "feature"|"grid"|"row"|"list", "items": [{"title": string, "subtitle"?: string, "body"?: string, "tag"?: string, "meta"?: string, "note"?: string /* handwritten aside, max 5 words */, "icon"?: Icon, "image"?: string /* verified https URL */, "imageQuery"?: string /* descriptive query for automatic real web photo */, "prompt"?: string /* follow-up prompt when user clicks this card */}]}`,
    board: "items",
  },
  BentoGrid: {
    summary: "Dynamic 2-column or 2x2 tactile Bento micro-widget grid.",
    when: "Multi-facet contextual briefings (flights A->B, train routes, concert stage times, fun facts, trace bottlenecks, diffs, recipes, design tokens, or cashflow ledgers) in 2 or 4 slots (never 3).",
    props: `{"title": string, "subtitle"?: string, "items": [{"slot"?: string, "title": string, "meta"?: string, "badge"?: string, "from"?: string, "to"?: string, "departTime"?: string, "arriveTime"?: string, "duration"?: string, "gate"?: string, "seat"?: string, "baggage"?: string, "statValue"?: string, "summary"?: string, "command"?: string, "before"?: string, "after"?: string, "leftTitle"?: string, "leftItems"?: string[], "rightTitle"?: string, "rightItems"?: string[], "swatches"?: [{"hex": string, "name"?: string, "meta"?: string}], "rows"?: [{"label": string, "value"?: string, "sub"?: string, "badge"?: string, "tone"?: string, "time"?: string, "done"?: boolean}], "footer"?: string, "prompt"?: string}]}`,
    board: "block",
  },
  Plan: {
    summary: "Schedule grouped by day / week / phase.",
    when: "Itineraries, study plans, roadmaps, weekly sprints. Each group routes cleanly to its own lane on the board.",
    props: `{"title"?: string, "days": [{"label": string /* "Day 1", "Minggu 2" */, "title"?: string, "items": [{"time"?: string, "title": string, "note"?: string}]}]}`,
    board: "items",
  },
  Steps: {
    summary: "Ordered procedure or unfolding chronology.",
    when: "How-tos, reproduction steps, processes, cooking methods. style: numbered for instructions, timeline for unfolding stages.",
    props: `{"title"?: string, "style"?: "numbered"|"timeline", "steps": [{"title": string, "detail"?: string, "meta"?: string}]}`,
    board: "block",
  },
  Versus: {
    summary: "Two options side by side with scores, quick comparison metrics, pros/cons points, and a clear verdict.",
    when: "Real trade-offs between two competing choices. Include metrics (cost/ETA/pros) for instant scan. ONLY set imageQuery when comparing two visually distinct physical places, hotels, dishes, or hardware products; omit imageQuery for transport modes, plans, APIs, or abstract options.",
    props: `{"title"?: string, "variant"?: "cards"|"radar"|"bars"|"editorial", "dimensions"?: [{"axis": string, "a": number, "b": number}], "a": {"label": string, "tagline"?: string, "badge"?: string, "metrics"?: [{"label": string, "value": string}], "points": string[], "score"?: number /* 0-10 */, "image"?: string, "imageQuery"?: string}, "b": {"label": string, "tagline"?: string, "badge"?: string, "metrics"?: [{"label": string, "value": string}], "points": string[], "score"?: number, "image"?: string, "imageQuery"?: string}, "verdict"?: string}`,
    board: "block",
  },
  Stats: {
    summary: "2–4 headline metrics with optional delta and trend.",
    when: "Key figures, benchmarks, yields, timings that matter more than prose.",
    props: `{"title"?: string, "items": [{"label": string, "value": string, "delta"?: string, "trend"?: "up"|"down"|"flat", "note"?: string}]}`,
    board: "block",
  },
  Chart: {
    summary: "Clean SVG chart visual.",
    when: "type: donut = parts of a whole, bar = comparing categories, line = trend over time.",
    props: `{"title"?: string, "type": "bar"|"donut"|"line", "unit"?: string, "data": [{"label": string, "value": number}], "caption"?: string}`,
    board: "block",
  },
  Palette: {
    summary: "Interactive hex colour swatches (click to copy).",
    when: "Any time colours, themes, or moodboard swatches are part of the answer.",
    props: `{"title"?: string, "colors": [{"hex": string, "name"?: string, "role"?: string}], "note"?: string}`,
    board: "block",
  },
  Code: {
    summary: "Syntax-highlighted runnable code or config with line highlights.",
    when: "Fixes, SQL/API queries, snippets, commands.",
    props: `{"title"?: string, "language"?: string, "code": string, "highlight"?: number[], "caption"?: string}`,
    board: "block",
  },
  Callout: {
    summary: "Highlighted callout or pull-quote.",
    when: "Root-cause diagnosis, key rule, caution, or core takeaway.",
    props: `{"tone"?: "tip"|"insight"|"warning"|"success", "title"?: string, "text": string}`,
    board: "block",
  },
  Flow: {
    summary: "Left-to-right system pipeline / mechanism diagram.",
    when: "Architectures, data pipelines, biological/logical stages.",
    props: `{"title"?: string, "variant"?: "cycle"|"chevron"|"alternating"|"cascade", "nodes": [{"label": string, "detail"?: string, "kind"?: "input"|"process"|"tool"|"output"}], "caption"?: string}`,
    board: "block",
  },
  Map: {
    summary: "Interactive open-source OpenStreetMap geo map with automatic Nominatim geocoding pinpoints, selectable numbered pins, route polyline, distance calculation, and fullscreen mode.",
    when: "Any location, neighborhood, multi-stop trip, venue, or geographic exploration where real coordinates or place names clarify spatial layout (works for 1 pin or multi-pin routes; missing lat/lng auto-pinpoints by name/area).",
    props: `{"title"?: string, "subtitle"?: string, "connectRoute"?: boolean, "pins": [{"name": string, "lat"?: number, "lng"?: number, "area"?: string, "category"?: string, "note"?: string, "time"?: string, "imageQuery"?: string, "imageUrl"?: string, "prompt"?: string}]}`,
    board: "items",
  },
  Adjuster: {
    summary: "Interactive live parameter controls (sliders, +/- steppers, toggle chips, switches) with instant client-side metric recalculation and Apply-to-Momo action.",
    when: "When the user can tune parameters on the fly — trip budget/nights/travelers, recipe servings, financial projections, investment yields, or design/configuration tuning.",
    props: `{"title"?: string, "description"?: string, "controls": [{"key": string, "label": string, "kind": "range"|"stepper"|"chips"|"toggle", "value": number|string|boolean, "min"?: number, "max"?: number, "step"?: number, "unit"?: string, "options"?: string[]}], "outputs"?: [{"label": string, "formula": string /* arithmetic using control keys e.g. "budget * days" or "income * rate / 100" */, "unit"?: string, "prefix"?: string}], "submitLabel"?: string}`,
    board: "none",
  },
  Diagram: {
    summary: "Interactive Mermaid diagram renderer supporting Flowchart, Sequence, ER, State, Class, Gantt, Mindmap, and Timeline with zoom, code view, and fullscreen.",
    when: "System architectures, API/auth sequences, database ERDs, decision trees, state machines, project Gantt timelines, or concept mindmaps.",
    props: `{"title"?: string, "kind"?: "flowchart"|"sequence"|"erd"|"state"|"class"|"gantt"|"pie"|"mindmap"|"timeline", "code": string /* valid Mermaid syntax without triple backticks */, "caption"?: string}`,
    board: "none",
  },
  Choices: {
    summary: "Interactive click-to-answer choice cards for the user.",
    when: "Request is open-ended or an ambiguity changes the direction.",
    props: `{"question": string, "options": [{"label": string, "detail"?: string}], "allowCustom"?: boolean}`,
    board: "none",
  },
  Quiz: {
    summary: "One interactive multiple-choice comprehension check.",
    when: "Testing understanding after explaining a mechanism or concept.",
    props: `{"question": string, "options": string[], "answer": number /* 0-based index */, "explain"?: string}`,
    board: "none",
  },
  Checklist: {
    summary: "Interactive checkable action list.",
    when: "Verification checklists, packing lists, audit tasks.",
    props: `{"title"?: string, "items": [{"text": string, "done"?: boolean, "note"?: string}]}`,
    board: "block",
  },
  Table: {
    summary: "Clean comparison or line-item table.",
    when: "Comparing 3+ attributes or structured figures side by side.",
    props: `{"title"?: string, "columns": string[], "rows": (string|number)[][], "caption"?: string}`,
    board: "block",
  },
  Followups: {
    summary: "Short next-step suggestion chips at the end of a reply.",
    when: "End of a multi-part turn when clear next paths exist (max 3 chips, max 6 words each).",
    props: `{"items": string[]}`,
    board: "none",
  },
  AsyncImage: {
    summary: "Real photograph resolved from the web — never a generated placeholder.",
    when: "Places, landmarks, products, food, architecture, people, news imagery — anywhere a real photo materially helps. Provide EITHER `query` (semantic description, server resolves it) OR `src` / `asset` (verified https asset returned by search_images/web_search). Never invent URLs. Skip for pure text/data-only replies.",
    props: `{"query"?: string, "src"?: string, "asset"?: {"imageUrl": string, "sourceUrl"?: string, "caption"?: string, "alt"?: string}, "alt"?: string, "caption"?: string, "sourceUrl"?: string, "ratio"?: string}`,
    board: "none",
  },
  Image: {
    summary: "Single verified photograph (supports query or bound asset).",
    when: "Same as AsyncImage when a single crisp photo anchors an explanation.",
    props: `{"query"?: string, "src"?: string, "asset"?: {"imageUrl": string, "sourceUrl"?: string, "caption"?: string}, "alt"?: string, "caption"?: string, "sourceUrl"?: string, "ratio"?: string}`,
    board: "none",
  },
  ImageWithCaption: {
    summary: "Photograph paired with editorial title/caption and optional source link.",
    when: "Architecture, product showcase, or landmark highlight where context under the photo matters.",
    props: `{"query"?: string, "src"?: string, "asset"?: {"imageUrl": string, "sourceUrl"?: string}, "title"?: string, "caption": string, "alt"?: string, "sourceUrl"?: string, "ratio"?: string}`,
    board: "none",
  },
  ImageWithCitation: {
    summary: "Photograph with prominent source provenance badge and citation link.",
    when: "News, journalism, historical or factual visual evidence where attribution must stay visible.",
    props: `{"query"?: string, "src"?: string, "asset"?: {"imageUrl": string, "sourceUrl"?: string}, "caption"?: string, "sourceTitle"?: string, "sourceUrl"?: string, "citationIndex"?: number, "ratio"?: string}`,
    board: "none",
  },
  ImageGallery: {
    summary: "Curated multi-photo gallery (supports per-item semantic `query` or bound `assets` from search_images).",
    when: "Travel destinations, architecture studies, design references, or dish sets needing 3–6 photos.",
    props: `{"title"?: string, "query"?: string /* batch query */, "items"?: [{"query"?: string, "src"?: string, "caption"?: string, "sourceUrl"?: string, "alt"?: string}]}`,
    board: "none",
  },
  ImageGrid: {
    summary: "Even multi-column photographic grid with click-to-lightbox zoom.",
    when: "Visual inspiration boards, material palettes, or product lineups.",
    props: `{"title"?: string, "columns"?: 2|3, "query"?: string, "items"?: [{"query"?: string, "src"?: string, "caption"?: string, "sourceUrl"?: string}]}`,
    board: "none",
  },
  ImageCarousel: {
    summary: "Horizontal scrollable photo strip with prev/next controls and lightbox.",
    when: "Compact visual tour in Chat or Explore without taking excessive vertical space.",
    props: `{"title"?: string, "query"?: string, "items"?: [{"query"?: string, "src"?: string, "caption"?: string, "sourceUrl"?: string}]}`,
    board: "none",
  },
  ImageComparison: {
    summary: "Two photographs side by side for visual comparison.",
    when: "Before/after, two landmarks, two architectural styles, or two product variants.",
    props: `{"title"?: string, "left": {"label": string, "query"?: string, "src"?: string, "caption"?: string, "sourceUrl"?: string}, "right": {"label": string, "query"?: string, "src"?: string, "caption"?: string, "sourceUrl"?: string}, "note"?: string}`,
    board: "none",
  },
  ImageLightbox: {
    summary: "Hero photograph card with interactive fullscreen lightbox modal and metadata.",
    when: "When the user wants to inspect a single visual reference in detail.",
    props: `{"query"?: string, "src"?: string, "caption"?: string, "sourceUrl"?: string, "alt"?: string, "ratio"?: string}`,
    board: "none",
  },
};

export interface MistlineBoardDraft {
  idKey: string;
  laneTitle?: string;
  component: string;
  title: string;
  subtitle?: string;
  slot?: string;
  metric?: string;
  note?: string;
  pin?: "star" | "alert" | "check" | "sun" | "heart";
  image?: string;
  imageQuery?: string;
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const INTEL_BOARD_COMPONENTS = new Set([
  "comparison_matrix",
  "decision_matrix",
  "pros_cons",
  "key_findings",
  "recommendation_panel",
  "metric_group",
  "hypothesis_panel",
  "executive_summary",
  "swot_analysis",
  "risk_matrix",
  "root_cause_analysis",
]);

/** Distils finished ```ui blocks into structured pinboard drafts routed by role lane hints. */
export function extractMistlineBoardDrafts(
  blocks: MistlineBlock[],
  laneHints: Record<string, string> = {}
): MistlineBoardDraft[] {
  const drafts: MistlineBoardDraft[] = [];

  for (const b of blocks) {
    if (b.kind !== "ui") continue;
    const block = b as MistlineUIBlock;
    const spec = MISTLINE_CATALOG[block.name];
    const isIntelBoard = INTEL_BOARD_COMPONENTS.has(block.name);
    if ((!spec || spec.board === "none") && !isIntelBoard) continue;

    if (block.name === "Cards") {
      const groupTitle = str(block.props.title);
      for (const it of arr(block.props.items)) {
        const item = rec(it);
        const title = str(item.title);
        if (!title) continue;
        drafts.push({
          idKey: `cards:${title.toLowerCase()}`,
          laneTitle: laneHints.Cards,
          component: "Cards",
          title,
          subtitle: str(item.body) || str(item.subtitle),
          slot: str(item.tag) || str(item.subtitle) || groupTitle,
          metric: str(item.meta),
          note: str(item.note),
          image: str(item.image) || str(item.imageUrl),
          imageQuery: str(item.imageQuery),
          pin: "star",
        });
      }
      continue;
    }

    if (block.name === "Plan") {
      arr(block.props.days).forEach((d, di) => {
        const day = rec(d);
        const lane = str(day.label) || `Day ${di + 1}`;
        const dayTitle = str(day.title);
        for (const it of arr(day.items)) {
          const item = rec(it);
          const title = str(item.title);
          if (!title) continue;
          drafts.push({
            idKey: `plan:${lane}:${title.toLowerCase()}`,
            laneTitle: lane,
            component: "Plan",
            title,
            subtitle: str(item.detail) || dayTitle,
            slot: str(item.time) || lane,
            note: str(item.note),
            image: str(item.image) || str(item.imageUrl),
            imageQuery: str(item.imageQuery),
            pin: "sun",
          });
        }
      });
      continue;
    }

    if (block.name === "Map") {
      const groupTitle = str(block.props.title);
      for (const it of arr(block.props.pins)) {
        const pin = rec(it);
        const title = str(pin.name);
        if (!title) continue;
        drafts.push({
          idKey: `map:${title.toLowerCase()}`,
          laneTitle: laneHints.Map || laneHints.Cards,
          component: "Map",
          title,
          subtitle: [str(pin.area), str(pin.note)].filter(Boolean).join(" · ") || groupTitle,
          slot: str(pin.category) || str(pin.time) || "Lokasi",
          metric: str(pin.time),
          note: str(pin.note),
          image: str(pin.imageUrl) || str(pin.image),
          imageQuery: str(pin.imageQuery) || [title, str(pin.area)].filter(Boolean).join(" "),
          pin: "heart",
        });
      }
      continue;
    }

    const title =
      str(block.props.title) ||
      str(block.props.question) ||
      (block.name === "Versus"
        ? `${str(rec(block.props.a).label) || "A"} vs ${str(rec(block.props.b).label) || "B"}`
        : undefined) ||
      (block.name === "Callout" ? str(block.props.text)?.slice(0, 48) : undefined) ||
      (isIntelBoard ? block.name.replace(/_/g, " ") : undefined);

    if (!title) continue;

    let summarySubtitle: string | undefined;
    let summaryMetric: string | undefined;
    let summaryNote: string | undefined;
    if (isIntelBoard) {
      summarySubtitle =
        str(block.props.summary) ||
        str(block.props.verdict) ||
        str(block.props.recommendation) ||
        arr(block.props.options).map((o) => str(o)).filter(Boolean).slice(0, 3).join(" · ") ||
        arr(block.props.findings).map(rec).map((f) => str(f.title) || str(f.finding)).filter(Boolean).slice(0, 2).join(" · ") ||
        arr(block.props.metrics).map(rec).map((m) => `${str(m.label)}: ${str(m.value)}`).filter(Boolean).slice(0, 3).join(" · ");
      summaryMetric = str(block.props.confidence) || undefined;
      summaryNote = str(block.props.rationale) || str(block.props.caption) || undefined;
    } else if (block.name === "Palette") {
      summarySubtitle = arr(block.props.colors)
        .map(rec)
        .map((c) => str(c.name) || str(c.hex))
        .filter(Boolean)
        .slice(0, 5)
        .join(" · ");
      summaryNote = str(block.props.note);
    } else if (block.name === "Versus") {
      const aRec = rec(block.props.a);
      const bRec = rec(block.props.b);
      const aLabel = str(aRec.label) || "Opsi A";
      const bLabel = str(bRec.label) || "Opsi B";
      const sa = typeof aRec.score === "number" ? aRec.score : undefined;
      const sb = typeof bRec.score === "number" ? bRec.score : undefined;
      summarySubtitle = [
        sa !== undefined ? `${aLabel} (${sa}/10)` : aLabel,
        sb !== undefined ? `${bLabel} (${sb}/10)` : bLabel,
      ].join(" vs ");
      if (sa !== undefined && sb !== undefined && sa !== sb) {
        summaryMetric = `${sa > sb ? aLabel : bLabel} unggul`;
      }
      summaryNote = str(block.props.verdict);
    } else if (block.name === "Callout") {
      summarySubtitle = str(block.props.text);
    } else if (block.name === "Stats") {
      const statItems = arr(block.props.items).map(rec);
      summarySubtitle = statItems
        .map((x) => [str(x.label), str(x.value)].filter(Boolean).join(": "))
        .filter(Boolean)
        .slice(0, 4)
        .join(" · ");
      summaryMetric = str(statItems[0]?.value);
    } else if (block.name === "Checklist") {
      const list = arr(block.props.items).map((x) => {
        if (typeof x === "string") return x.trim();
        const r = rec(x);
        return str(r.label) || str(r.text) || "";
      }).filter(Boolean);
      summarySubtitle = list.slice(0, 3).join(" · ") || `${list.length} item checklist`;
      summaryMetric = `${list.length} item`;
    } else if (block.name === "Steps") {
      const stepList = arr(block.props.steps).map(rec);
      summarySubtitle = stepList
        .map((s, idx) => `${idx + 1}. ${str(s.title) || ""}`)
        .filter((s) => s.length > 3)
        .slice(0, 3)
        .join(" · ");
      summaryMetric = `${stepList.length} langkah`;
    } else if (block.name === "Flow") {
      summarySubtitle = arr(block.props.nodes)
        .map(rec)
        .map((n) => str(n.label))
        .filter(Boolean)
        .slice(0, 5)
        .join(" → ");
    } else if (block.name === "Code") {
      summarySubtitle = str(block.props.caption);
      summaryMetric = str(block.props.language);
    }

    drafts.push({
      idKey: `${block.name}:${title.toLowerCase()}`,
      laneTitle: laneHints[block.name],
      component: block.name,
      title,
      ...(summarySubtitle ? { subtitle: summarySubtitle } : {}),
      slot: block.name,
      ...(summaryMetric ? { metric: summaryMetric } : {}),
      ...(summaryNote ? { note: summaryNote } : {}),
      pin:
        block.name === "Callout"
          ? "alert"
          : block.name === "Checklist"
            ? "check"
            : "star",
    });
  }

  return drafts;
}
