/**
 * Stream parser for "one stream, many decisions" Generative UI.
 *
 * The model writes ONE unified markdown stream and embeds typed UI blocks
 * inline whenever visual structure clarifies the answer:
 *
 *   ```ui Cards
 *   {"layout":"feature","items":[...]}
 *   ```
 *
 * Also tolerates ```genui ComponentName and ```json {"component":...}.
 * Runs safely per streaming chunk without DOM/React dependencies.
 */

export type MistlineTextBlock = {
  kind: "text";
  id: string;
  text: string;
};

export type MistlineUIBlock = {
  kind: "ui";
  id: string;
  name: string;
  raw: string;
  props: Record<string, unknown>;
  complete: boolean;
  /** Stream ended before the closing ``` fence — props are a salvaged prefix. */
  truncated?: boolean;
};

export type MistlineBlock = MistlineTextBlock | MistlineUIBlock;

const UI_FENCE = /^\s*`{3,}\s*(?:ui|genui)(?:[\s:/-]+((?!(?:json)\b)[A-Za-z][\w-]*))?([^\n]*)$/i;
const JSON_FENCE = /^\s*`{3,}\s*json\s*$/i;
const ANY_FENCE = /^\s*`{3,}/;
const CLOSE_FENCE = /^\s*`{3,}\s*$/;

const COMPONENT_ALIASES: Record<string, string> = {
  headline: "Headline",
  hero: "Headline",
  bento: "BentoGrid",
  bentogrid: "BentoGrid",
  "bento-grid": "BentoGrid",
  microbento: "BentoGrid",
  catalogshelf: "CatalogShelf",
  "catalog-shelf": "CatalogShelf",
  discography: "CatalogShelf",
  albumlist: "CatalogShelf",
  annotatedsheet: "AnnotatedSheet",
  "annotated-sheet": "AnnotatedSheet",
  lyricsheet: "AnnotatedSheet",
  lyrics: "AnnotatedSheet",
  regionalshowcase: "RegionalShowcase",
  "regional-showcase": "RegionalShowcase",
  loreshowcase: "RegionalShowcase",
  tourtheme: "RegionalShowcase",
  cards: "Cards",
  card: "Cards",
  places: "Cards",
  place: "Cards",
  "gu-places": "Cards",
  plan: "Plan",
  itinerary: "Plan",
  schedule: "Plan",
  steps: "Steps",
  timeline: "Steps",
  versus: "Versus",
  compare: "Versus",
  comparison: "Versus",
  stats: "Stats",
  metrics: "Stats",
  kpi: "Stats",
  chart: "Chart",
  graph: "Chart",
  palette: "Palette",
  colors: "Palette",
  code: "Code",
  callout: "Callout",
  alert: "Callout",
  note: "Callout",
  flow: "Flow",
  pipeline: "Flow",
  diagram: "Diagram",
  mermaid: "Diagram",
  sequence: "Diagram",
  erd: "Diagram",
  erdiagram: "Diagram",
  classdiagram: "Diagram",
  gantt: "Diagram",
  mindmap: "Diagram",
  architecture: "Diagram",
  map: "Map",
  geomap: "Map",
  choices: "Choices",
  options: "Choices",
  quiz: "Quiz",
  checklist: "Checklist",
  tasks: "Checklist",
  table: "Table",
  followups: "Followups",
  followup: "Followups",
  adjuster: "Adjuster",
  controls: "Adjuster",
  calculator: "Adjuster",
  form: "Adjuster",
  parameters: "Adjuster",
  asyncimage: "AsyncImage",
  image: "Image",
  photo: "AsyncImage",
  imagewithcaption: "ImageWithCaption",
  imagewithcitation: "ImageWithCitation",
  imagegallery: "ImageGallery",
  gallery: "ImageGallery",
  imagegrid: "ImageGrid",
  imagecarousel: "ImageCarousel",
  carousel: "ImageCarousel",
  imagecomparison: "ImageComparison",
  imagelightbox: "ImageLightbox",
};

export function normalizeMistlineComponentName(rawName: string): string {
  const clean = rawName.trim();
  if (!clean) return "Unknown";
  const key = clean.toLowerCase().replace(/[\s_]+/g, "");
  return COMPONENT_ALIASES[key] ?? COMPONENT_ALIASES[clean.toLowerCase()] ?? clean;
}

/** Tolerant JSON parser: returns as much partial structure as truncated input allows. */
export function parsePartialJSON(input: string): unknown {
  const s = input;
  let i = 0;
  const ESC: Record<string, string> = {
    n: "\n",
    t: "\t",
    r: "\r",
    b: "\b",
    f: "\f",
    "/": "/",
    "\\": "\\",
    '"': '"',
  };

  const ws = () => {
    while (i < s.length && (s[i] === " " || s[i] === "\n" || s[i] === "\r" || s[i] === "\t")) i++;
  };

  const parseString = (): string => {
    i++; // opening quote
    let out = "";
    while (i < s.length) {
      const c = s[i];
      if (c === '"') {
        i++;
        return out;
      }
      if (c === "\\") {
        const n = s[i + 1];
        if (n === undefined) {
          i = s.length;
          break;
        }
        if (n === "u") {
          const hex = s.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            i = s.length;
            break;
          }
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
        out += ESC[n] ?? n;
        i += 2;
        continue;
      }
      out += c;
      i++;
    }
    return out;
  };

  const parseNumber = (): number | undefined => {
    const m = /^-?\d*(?:\.\d*)?(?:[eE][+-]?\d*)?/.exec(s.slice(i));
    const tok = m ? m[0] : "";
    i += Math.max(tok.length, 1);
    const n = Number(tok);
    return tok && Number.isFinite(n) ? n : undefined;
  };

  const parseLiteral = (): unknown => {
    for (const [word, val] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ] as const) {
      if (s.startsWith(word, i)) {
        i += word.length;
        return val;
      }
      if (word.startsWith(s.slice(i))) {
        i = s.length;
        return undefined;
      }
    }
    i = s.length;
    return undefined;
  };

  const parseArray = (): unknown[] => {
    i++;
    const arr: unknown[] = [];
    while (true) {
      ws();
      if (i >= s.length) return arr;
      const c = s[i];
      if (c === "]") {
        i++;
        return arr;
      }
      if (c === ",") {
        i++;
        continue;
      }
      const before = i;
      const v = parseValue();
      if (v !== undefined) arr.push(v);
      if (i === before) {
        i = s.length;
        return arr;
      }
    }
  };

  const parseObject = (): Record<string, unknown> => {
    i++;
    const obj: Record<string, unknown> = {};
    while (true) {
      ws();
      if (i >= s.length) return obj;
      const c = s[i];
      if (c === "}") {
        i++;
        return obj;
      }
      if (c === ",") {
        i++;
        continue;
      }
      if (c !== '"') {
        i = s.length;
        return obj;
      }
      const key = parseString();
      ws();
      if (i >= s.length || s[i] !== ":") {
        i = s.length;
        return obj;
      }
      i++;
      ws();
      if (i >= s.length) return obj;
      const v = parseValue();
      if (
        v !== undefined &&
        key !== "__proto__" &&
        key !== "constructor" &&
        key !== "prototype"
      ) {
        Object.defineProperty(obj, key, {
          value: v,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
    }
  };

  function parseValue(): unknown {
    ws();
    if (i >= s.length) return undefined;
    const c = s[i];
    if (c === "{") return parseObject();
    if (c === "[") return parseArray();
    if (c === '"') return parseString();
    if (c === "-" || (c >= "0" && c <= "9")) return parseNumber();
    return parseLiteral();
  }

  try {
    return parseValue();
  } catch {
    return undefined;
  }
}

function arrayToProps(v: unknown[]): Record<string, unknown> {
  // Components read different list keys (items/steps/options/columns/rows...).
  // Alias the same array under the common ones; unknown keys are ignored.
  return {
    items: v,
    steps: v,
    options: v,
    choices: v,
    columns: v,
    rows: v,
    data: v,
    points: v,
    nodes: v,
    entries: v,
    tasks: v,
  };
}

function toProps(raw: string, complete: boolean): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  if (complete) {
    const cleaned = trimmed.replace(/,\s*([}\]])/g, "$1");
    for (const candidate of [trimmed, cleaned]) {
      try {
        const v = JSON.parse(candidate) as unknown;
        if (Array.isArray(v)) return arrayToProps(v);
        if (v && typeof v === "object") {
          return v as Record<string, unknown>;
        }
      } catch {
        // fall through to tolerant incremental parser
      }
    }
  }
  const v = parsePartialJSON(trimmed);
  if (Array.isArray(v)) return arrayToProps(v);
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function looksLikeComponentJSON(raw: string): boolean {
  if (!/^\s*\{/.test(raw)) return false;
  // Component marker may not be the first key (models reorder props).
  return /"(?:component|type|name|props)"\s*:/.test(raw.slice(0, 400));
}

/**
 * Splits a markdown+UI stream into positional blocks so React preserves
 * component state and live-hydrates props across streaming chunks.
 */
export function parseMistlineStream(
  input: string,
  opts: { final?: boolean } = {}
): MistlineBlock[] {
  const blocks: MistlineBlock[] = [];
  const normalized = (input || "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const endsWithNewline = normalized.endsWith("\n");
  let text: string[] = [];
  let mode: "text" | "code" | "ui" = "text";
  let ui: { name: string; raw: string[]; json: boolean; fence: string; closed: boolean } | null = null;

  const pushText = () => {
    const joined = text.join("\n");
    if (joined.trim()) {
      blocks.push({
        kind: "text",
        id: `b${blocks.length}`,
        text: joined.replace(/^\n+/, ""),
      });
    }
    text = [];
  };

  const pushUI = (complete: boolean) => {
    if (!ui) return;
    const raw = ui.raw.join("\n");
    const props = toProps(raw, complete);
    let name = ui.name;
    if (!name) {
      const n = props.component ?? props.type ?? props.name;
      name = typeof n === "string" ? n : "";
      if (props.props && typeof props.props === "object" && !Array.isArray(props.props)) {
        Object.assign(props, props.props as Record<string, unknown>);
      }
    }
    if (ui.json && !looksLikeComponentJSON(raw)) {
      text.push(ui.fence, ...ui.raw);
      if (complete) text.push("```");
    } else {
      // A closed fence can still carry broken/truncated JSON — strict parse
      // fails but parsePartialJSON salvages a prefix. Flag it so the UI can
      // admit the block is partial instead of silently dropping props.
      let strictJsonOk = false;
      if (complete) {
        const trimmedRaw = raw.trim();
        if (trimmedRaw) {
          const cleaned = trimmedRaw.replace(/,\s*([}\]])/g, "$1");
          for (const candidate of [trimmedRaw, cleaned]) {
            try {
              JSON.parse(candidate);
              strictJsonOk = true;
              break;
            } catch {
              // try next candidate
            }
          }
        }
      }
      blocks.push({
        kind: "ui",
        id: `b${blocks.length}`,
        name: normalizeMistlineComponentName(name || "Unknown"),
        raw,
        props,
        complete,
        truncated:
          complete && (!ui.closed || !strictJsonOk) ? true : undefined,
      });
    }
    ui = null;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const isLast = idx === lines.length - 1;
    const partialLine = isLast && !endsWithNewline && !opts.final;

    if (mode === "text") {
      // Hold back a half-typed fence ("``", "```u") so it never flashes as text
      if (partialLine && /^\s*`{1,3}[a-z]*$/i.test(line)) continue;
      const m = UI_FENCE.exec(line);
      if (m) {
        pushText();
        const tail = (m[2] ?? "").trim();
        const nm = (m[1] ?? "").trim().toLowerCase();
        const tailIsJsonMarker = /^[-_:\s]*json\b/i.test(tail);
        ui = {
          name: nm === "json" || tailIsJsonMarker ? "" : (m[1] ?? ""),
          raw:
            tail && /^[{[]/.test(tail)
              ? [tail]
              : tailIsJsonMarker && tail.replace(/^[-_:\s]*json\b/i, "").trim().startsWith("{")
                ? [tail.replace(/^[-_:\s]*json\b/i, "").trim()]
                : [],
          json: nm === "json" || tailIsJsonMarker,
          fence: line,
          closed: false,
        };
        mode = "ui";
        continue;
      }
      if (JSON_FENCE.test(line)) {
        pushText();
        ui = { name: "", raw: [], json: true, fence: line, closed: false };
        mode = "ui";
        continue;
      }
      if (ANY_FENCE.test(line)) mode = "code";
      text.push(line);
      continue;
    }

    if (mode === "code") {
      text.push(line);
      if (CLOSE_FENCE.test(line) && !partialLine) mode = "text";
      continue;
    }

    // mode === "ui"
    if (CLOSE_FENCE.test(line) && !partialLine) {
      if (ui) ui.closed = true;
      pushUI(true);
      mode = "text";
      continue;
    }
    if (partialLine && /^\s*`{1,3}$/.test(line)) continue;
    ui?.raw.push(line);
  }

  if (mode === "ui") pushUI(Boolean(opts.final));
  pushText();
  return blocks;
}
