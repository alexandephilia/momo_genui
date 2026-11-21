import {
  createParser,
  createStreamingParser,
  isElementNode,
  type ElementNode,
  type ParseResult,
} from "@openuidev/lang-core";
import type { MistlineBlock, MistlineUIBlock } from "@/lib/mistlineParse";
import { parseMistlineStream } from "@/lib/mistlineParse";
import { stripLeakedReasoningScratchpad } from "@/lib/taskTelemetrySanitizer";
import { finalContentProps } from "./contentContracts";
import { repairOpenUiProps } from "./propRepair";
import {
  getMomoOpenUiJSONSchema,
  MOMO_COMPONENT_PROP_ORDER,
  MOMO_OPENUI_COMPONENT_NAMES,
} from "./momoSchema";

export type OpenUiMixedSegment =
  | {
      kind: "text";
      id: string;
      text: string;
      complete: boolean;
    }
  | {
      kind: "openui";
      id: string;
      code: string;
      normalizedCode: string;
      parseResult: ParseResult;
      complete: boolean;
    }
  | {
      kind: "legacy-ui";
      id: string;
      block: MistlineUIBlock;
    };

const OPENUI_OPEN_FENCE = /^\s*`{3,}\s*(?:openui-lang|openui)\b.*$/i;
const LEGACY_UI_OPEN_FENCE = /^\s*`{3,}\s*(?:ui|genui)\b.*$/i;
const JSON_OPEN_FENCE = /^\s*`{3,}\s*json\b.*$/i;
const CLOSE_FENCE = /^\s*`{3,}\s*$/;

function splitMidLineUiFences(rawText: string): string {
  // Split mid-line / glued ```openui-lang / ```root = ... / ```ui fences onto fresh lines
  const lines = rawText.split("\n");
  let insideFence = false;
  const out: string[] = [];

  for (const line of lines) {
    const gluedOpenUi =
      /^(\s*)`{3,}\s*(?:(?:openui-lang|openui)\s+)?((?:root\s*=\s*)?[A-Za-z_][A-Za-z0-9_]*\s*(?:\(|=\s*[A-Za-z_][A-Za-z0-9_]*\s*\().*)$/i.exec(
        line,
      );
    const isGluedRoot =
      Boolean(gluedOpenUi) &&
      (/^root\s*=/i.test(gluedOpenUi![2]) ||
        /^[A-Za-z_][A-Za-z0-9_]*\s*=\s*(?:Stack|[A-Z][A-Za-z0-9_]*)\s*\(/.test(
          gluedOpenUi![2],
        ));

    if (insideFence) {
      if (isGluedRoot) {
        out.push("```", "```openui-lang", gluedOpenUi![2]);
        continue;
      }
      out.push(line);
      if (CLOSE_FENCE.test(line)) insideFence = false;
      continue;
    }
    if (isGluedRoot) {
      out.push("```openui-lang", gluedOpenUi![2]);
      insideFence = true;
      continue;
    }
    if (/^\s*`{3,}/.test(line)) {
      out.push(line);
      if (!/`{3,}[^`]+`{3,}\s*$/.test(line)) insideFence = true;
      continue;
    }
    const midMatch =
      /^(.*?[^\s`])([ \t]*)(`{3,}\s*(?:(?:openui-lang|openui)\b.*|root\s*=\s*[A-Za-z_].*)|`{3,}\s*(?:ui|genui)\b.*)$/i.exec(
        line,
      );
    if (midMatch) {
      const before = midMatch[1];
      const backticksBefore = (before.match(/`/g) || []).length;
      if (backticksBefore % 2 === 0) {
        const fenceRest = midMatch[3];
        const gluedMid = /^`{3,}\s*(?:(?:openui-lang|openui)\s+)?(root\s*=\s*.*)$/i.exec(
          fenceRest,
        );
        if (gluedMid) {
          out.push(before.trimEnd(), "```openui-lang", gluedMid[1]);
        } else {
          out.push(before.trimEnd(), fenceRest);
        }
        insideFence = true;
        continue;
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

function updateRawOpenUiDepth(line: string, prevDepth: number): number {
  let depth = prevDepth;
  let quote: '"' | "'" | null = null;
  for (let idx = 0; idx < line.length; idx++) {
    const ch = line[idx];
    if (quote) {
      if (ch === "\\" && idx + 1 < line.length) {
        idx += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth = Math.max(0, depth - 1);
    }
  }
  return depth;
}

let cachedSchema: ReturnType<typeof getMomoOpenUiJSONSchema> | null = null;
function getSchema() {
  if (!cachedSchema) {
    cachedSchema = getMomoOpenUiJSONSchema();
  }
  return cachedSchema;
}

const ARRAY_THEN_TITLE_COMPS = new Set([
  "Cards",
  "Plan",
  "Steps",
  "Stats",
  "Palette",
  "Flow",
  "Map",
  "Adjuster",
  "Checklist",
]);

const TITLE_THEN_ARRAY_COMPS = new Set([
  "BentoGrid",
  "CatalogShelf",
  "AnnotatedSheet",
  "RegionalShowcase",
  "Timeline",
  "LineChart",
  "BarChart",
  "PieChart",
  "RadarChart",
  "AreaChart",
  "GanttChart",
  "KanbanBoard",
  "Scorecard",
  "FactCheckPanel",
  "KeyFindings",
  "NewsFeed",
  "RiskMatrix",
  "QuoteExtraction",
  "ConceptFlashcards",
  "RecipeScalerCard",
  "ExecutiveSummary",
]);

const TITLE_THEN_TWO_ARGS_COMPS = new Set([
  "DataTable",
  "ComparisonTable",
]);

const CHART_KINDS = new Set(['"bar"', '"donut"', '"line"', "'bar'", "'donut'", "'line'"]);

function isQuotedOpenUiString(arg: string): boolean {
  const t = arg.trim();
  return /^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')$/.test(t);
}

function findMatchingParen(src: string, openIdx: number): number {
  let depth = 0;
  let quote: '"' | "'" | null = null;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\" && i + 1 < src.length) {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0 && ch === ")") return i;
    }
  }
  return -1;
}

function splitTopLevelOpenUiArgs(inner: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      if (ch === "\\" && i + 1 < inner.length) {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth = Math.max(0, depth - 1);
    } else if (ch === "," && depth === 0) {
      args.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  args.push(inner.slice(start));
  return args;
}

const NAMED_ARG_ALIASES: Record<string, string> = {
  cards: "items",
  albums: "items",
  releases: "items",
  verses: "sections",
  lyrics: "sections",
  rows_data: "rows",
  events: "steps",
  left: "a",
  right: "b",
  optionA: "a",
  optionB: "b",
  sideA: "a",
  sideB: "b",
  body: "summary",
};

function normalizeNamedTopLevelArgs(compName: string, args: string[]): string[] {
  const propOrder = MOMO_COMPONENT_PROP_ORDER[compName];
  if (!propOrder || propOrder.length === 0) return args;

  const parsedNamed = args.map((raw) => {
    const trimmed = raw.trim();
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:(?!\/)\s*([\s\S]+)$/.exec(trimmed);
    if (!m) return { key: null as string | null, val: raw };
    return { key: m[1], val: m[2] };
  });

  if (!parsedNamed.some((p) => p.key !== null)) return args;

  const slots: Array<string | undefined> = new Array(propOrder.length).fill(undefined);
  const unmapped: string[] = [];

  parsedNamed.forEach((entry, idx) => {
    if (!entry.key) {
      if (idx < slots.length && slots[idx] === undefined) {
        slots[idx] = entry.val.trim();
      } else {
        unmapped.push(entry.val.trim());
      }
      return;
    }
    const exactIdx = propOrder.indexOf(entry.key);
    const aliasTarget = NAMED_ARG_ALIASES[entry.key];
    const aliasIdx = aliasTarget ? propOrder.indexOf(aliasTarget) : -1;
    const targetIdx = exactIdx !== -1 ? exactIdx : aliasIdx;
    if (targetIdx !== -1) {
      slots[targetIdx] = entry.val.trim();
    } else {
      unmapped.push(entry.val.trim());
    }
  });

  for (const extra of unmapped) {
    const emptyIdx = slots.findIndex((s) => s === undefined);
    if (emptyIdx !== -1) slots[emptyIdx] = extra;
  }

  let lastDefined = -1;
  for (let idx = slots.length - 1; idx >= 0; idx--) {
    if (slots[idx] !== undefined) {
      lastDefined = idx;
      break;
    }
  }
  if (lastDefined === -1) return args;

  return slots.slice(0, lastDefined + 1).map((s) => (s === undefined ? "null" : s));
}

/**
 * Repairs LLM positional calls where `"Title"` was emitted before the required
 * array prop(s) (e.g. `Table("Title", cols, rows)` -> `Table(cols, rows, "Title")`),
 * rewrites `Versus("Title", "SideA", "SideB", [...criteria])` to `ComparisonTable(...)`,
 * and strips top-level named-argument `prop: val` syntax, preserving string literals.
 */
function repairTitleFirstOpenUiCalls(src: string): string {
  let out = "";
  let i = 0;
  let quote: '"' | "'" | null = null;

  while (i < src.length) {
    const ch = src[i];
    if (quote) {
      out += ch;
      if (ch === "\\" && i + 1 < src.length) {
        i += 1;
        out += src[i];
      } else if (ch === quote) {
        quote = null;
      }
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const prevChar = i > 0 ? src[i - 1] : "";
      if (!/[A-Za-z0-9_.]/.test(prevChar)) {
        const idMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
        if (idMatch) {
          const name = idMatch[0];
          const afterId = i + name.length;
          const wsMatch = /^\s*/.exec(src.slice(afterId));
          const openIdx = afterId + (wsMatch ? wsMatch[0].length : 0);
          if (
            src[openIdx] === "(" &&
            (name === "Stack" || MOMO_OPENUI_COMPONENT_NAMES.has(name))
          ) {
            const closeIdx = findMatchingParen(src, openIdx);
            if (closeIdx !== -1) {
              const rawArgs = splitTopLevelOpenUiArgs(src.slice(openIdx + 1, closeIdx));
              const repairedArgs = normalizeNamedTopLevelArgs(
                name,
                rawArgs.map((arg) => repairTitleFirstOpenUiCalls(arg)),
              );
              let outName = name;
              let finalArgs = repairedArgs;
              if (
                name === "Versus" &&
                repairedArgs.length >= 4 &&
                isQuotedOpenUiString(repairedArgs[0]) &&
                isQuotedOpenUiString(repairedArgs[1]) &&
                isQuotedOpenUiString(repairedArgs[2]) &&
                /^[\[{]/.test(repairedArgs[3].trim())
              ) {
                outName = "ComparisonTable";
                finalArgs = [
                  repairedArgs[0].trim(),
                  `[${repairedArgs[1].trim()}, ${repairedArgs[2].trim()}]`,
                  repairedArgs[3].trim(),
                  ...repairedArgs.slice(4).map((a) => a.trim()),
                ];
              } else if (
                name === "Versus" &&
                repairedArgs.length === 3 &&
                isQuotedOpenUiString(repairedArgs[0]) &&
                isQuotedOpenUiString(repairedArgs[1]) &&
                /^[\[{]/.test(repairedArgs[2].trim())
              ) {
                outName = "ComparisonTable";
                finalArgs = [
                  '"Perbandingan"',
                  `[${repairedArgs[0].trim()}, ${repairedArgs[1].trim()}]`,
                  repairedArgs[2].trim(),
                ];
              } else if (
                name === "Table" &&
                repairedArgs.length >= 3 &&
                isQuotedOpenUiString(repairedArgs[0]) &&
                !isQuotedOpenUiString(repairedArgs[1]) &&
                !isQuotedOpenUiString(repairedArgs[2])
              ) {
                finalArgs = [
                  repairedArgs[1].trim(),
                  repairedArgs[2].trim(),
                  repairedArgs[0].trim(),
                  ...repairedArgs.slice(3).map((a) => a.trim()),
                ];
              } else if (
                ARRAY_THEN_TITLE_COMPS.has(name) &&
                repairedArgs.length >= 2 &&
                isQuotedOpenUiString(repairedArgs[0]) &&
                !isQuotedOpenUiString(repairedArgs[1])
              ) {
                finalArgs = [
                  repairedArgs[1].trim(),
                  repairedArgs[0].trim(),
                  ...repairedArgs.slice(2).map((a) => a.trim()),
                ];
              } else if (
                TITLE_THEN_ARRAY_COMPS.has(name) &&
                repairedArgs.length >= 2 &&
                !isQuotedOpenUiString(repairedArgs[0]) &&
                isQuotedOpenUiString(repairedArgs[1])
              ) {
                finalArgs = [
                  repairedArgs[1].trim(),
                  repairedArgs[0].trim(),
                  ...repairedArgs.slice(2).map((a) => a.trim()),
                ];
              } else if (
                TITLE_THEN_ARRAY_COMPS.has(name) &&
                repairedArgs.length === 1 &&
                /^\s*\[/.test(repairedArgs[0])
              ) {
                finalArgs = ['""', repairedArgs[0].trim()];
              } else if (
                TITLE_THEN_TWO_ARGS_COMPS.has(name) &&
                repairedArgs.length >= 3 &&
                !isQuotedOpenUiString(repairedArgs[0]) &&
                !isQuotedOpenUiString(repairedArgs[1]) &&
                isQuotedOpenUiString(repairedArgs[2])
              ) {
                finalArgs = [
                  repairedArgs[2].trim(),
                  repairedArgs[0].trim(),
                  repairedArgs[1].trim(),
                  ...repairedArgs.slice(3).map((a) => a.trim()),
                ];
              } else if (
                (name === "Versus" || name === "ImageComparison") &&
                repairedArgs.length >= 3 &&
                isQuotedOpenUiString(repairedArgs[0]) &&
                !isQuotedOpenUiString(repairedArgs[1]) &&
                !isQuotedOpenUiString(repairedArgs[2])
              ) {
                finalArgs = [
                  repairedArgs[1].trim(),
                  repairedArgs[2].trim(),
                  repairedArgs[0].trim(),
                  ...repairedArgs.slice(3).map((a) => a.trim()),
                ];
              } else if (
                name === "Chart" &&
                repairedArgs.length >= 3 &&
                isQuotedOpenUiString(repairedArgs[0]) &&
                !CHART_KINDS.has(repairedArgs[0].trim().toLowerCase()) &&
                CHART_KINDS.has(repairedArgs[1].trim().toLowerCase())
              ) {
                finalArgs = [
                  repairedArgs[1].trim(),
                  repairedArgs[2].trim(),
                  repairedArgs[0].trim(),
                  ...repairedArgs.slice(3).map((a) => a.trim()),
                ];
              } else if (
                name === "Followups" &&
                repairedArgs.length >= 2 &&
                isQuotedOpenUiString(repairedArgs[0]) &&
                !isQuotedOpenUiString(repairedArgs[1])
              ) {
                finalArgs = [repairedArgs[1].trim()];
              }
              out += `${outName}(${finalArgs.join(", ")})`;
              i = closeIdx + 1;
              continue;
            }
          }
          out += name;
          i = afterId;
          continue;
        }
      }
    }

    out += ch;
    i += 1;
  }

  return out;
}

/**
 * If a model emits a single root component like `root = Callout(...)` instead of
 * `root = Stack([c1])`, wrap it in `Stack([_momo_single_root])` so the parser
 * resolves it cleanly under the Stack root contract.
 */
/**
 * Repairs common LLM OpenUI syntax glitches before parsing:
 * 1) Mid-line corrupted duplicate restarts (`cards1 = [{... "Jcards1 = [{...}]`)
 * 2) Bare array assignments referenced by `Stack([...])` (`cards1 = [{title:...}]` -> `Cards([...])`)
 * 3) Near-miss orphaned identifiers (`Stack([..., diag1])` with `diag = Diagram(...)`)
 * 4) Title-first vs array-first argument swaps & missing `root = Stack([...])`.
 */
function repairCorruptedMidLineRestarts(src: string): string {
  return src
    .split("\n")
    .map((line) => {
      const assignStart = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\[/.exec(line);
      if (!assignStart) return line;
      const id = assignStart[2];
      const dupToken = `${id} = [`;
      const firstIdx = line.indexOf(dupToken);
      const secondIdx = line.indexOf(dupToken, firstIdx + dupToken.length);
      if (secondIdx !== -1) {
        return `${assignStart[1]}${line.slice(secondIdx)}`;
      }
      return line;
    })
    .join("\n");
}

function repairBareStackArrayAndOrphanRefs(src: string): string {
  const rootStackMatch = /^\s*root\s*=\s*Stack\(\s*\[([^\]]*)\]/m.exec(src);
  if (!rootStackMatch) return src;

  const referencedIds = rootStackMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s));

  const definedMap = new Map<string, string>();
  const defRe = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*\s*\(|\[)/gm;
  let dm: RegExpExecArray | null;
  while ((dm = defRe.exec(src)) !== null) {
    if (dm[1] !== "root") {
      definedMap.set(dm[1], dm[2]);
    }
  }

  let updated = src;

  // Wrap bare `id = [{...}]` referenced directly as a Stack child into `Cards([...])`
  for (const refId of referencedIds) {
    if (definedMap.get(refId) === "[") {
      const bareArrRe = new RegExp(`(^|\\n)(${refId}\\s*=\\s*)(\\[[\\s\\S]*?\\])(?=\\n[A-Za-z_]|$)`);
      updated = updated.replace(bareArrRe, `$1$2Cards($3)`);
    }
  }

  // Repair minor typo between Stack([..., diag1, ...]) and defined `diag = Diagram(...)`
  const refSet = new Set(referencedIds);
  const orphans = Array.from(definedMap.keys()).filter((k) => !refSet.has(k));
  const missing = referencedIds.filter((r) => !definedMap.has(r));

  if (missing.length > 0 && orphans.length > 0) {
    const usedOrphans = new Set<string>();
    let nextStackList = [...referencedIds];
    for (const miss of missing) {
      const missBase = miss.replace(/\d+$/, "");
      const candidate = orphans.find((o) => {
        if (usedOrphans.has(o)) return false;
        const oBase = o.replace(/\d+$/, "");
        return (
          o === missBase ||
          oBase === missBase ||
          miss.startsWith(o) ||
          o.startsWith(missBase)
        );
      });
      if (candidate) {
        usedOrphans.add(candidate);
        nextStackList = nextStackList.map((r) => (r === miss ? candidate : r));
      }
    }
    updated = updated.replace(
      /^root\s*=\s*Stack\(\s*\[[^\]]*\]/m,
      `root = Stack([${nextStackList.join(", ")}]`,
    );
  }

  return updated;
}

export function normalizeOpenUiProgram(raw: string): string {
  const cleaned = repairCorruptedMidLineRestarts(raw);
  const repaired = repairBareStackArrayAndOrphanRefs(
    repairTitleFirstOpenUiCalls(cleaned).trim(),
  );
  if (!repaired) return "";

  const rootMatch = repaired.match(/^root\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/m);
  if (!rootMatch) {
    // Model omitted `root = ...` inside an OpenUI block: synthesize `root = Stack([...])`
    // from top-level component assignments so `<Renderer>` still mounts every block cleanly.
    const topIds: string[] = [];
    const assignRe = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm;
    let m: RegExpExecArray | null;
    while ((m = assignRe.exec(repaired)) !== null) {
      const [, id, comp] = m;
      if (id !== "root" && MOMO_OPENUI_COMPONENT_NAMES.has(comp)) {
        topIds.push(id);
      }
    }
    if (topIds.length > 0) {
      return `root = Stack([${topIds.join(", ")}])\n${repaired}`;
    }
    const bareMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(repaired);
    if (bareMatch && bareMatch[1] !== "Stack" && MOMO_OPENUI_COMPONENT_NAMES.has(bareMatch[1])) {
      return `root = Stack([_momo_root_item])\n_momo_root_item = ${repaired}`;
    }
    return repaired;
  }

  const rootComp = rootMatch[1];
  if (rootComp === "Stack" || !MOMO_OPENUI_COMPONENT_NAMES.has(rootComp)) {
    return repaired;
  }

  return repaired.replace(
    /^root\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/m,
    "root = Stack([_momo_root_item])\n_momo_root_item = $1(",
  );
}

/**
 * Auto-balances unclosed quotes and brackets at the end of a truncated OpenUI snippet
 * and strips any glued mid-line `root = Stack(...)` continuation restart (e.g.
 * `"Kejutan Proot = Stack([briefing, elements, followups])..."`).
 */
function repairGluedRestartInOpenUiCode(rawCode: string): string {
  const firstRootIdx = rawCode.search(/root\s*=\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/i);
  if (firstRootIdx === -1) return rawCode;

  const afterFirstRoot = rawCode.slice(firstRootIdx + 12);
  const secondRootRel = afterFirstRoot.search(/root\s*=\s*Stack\s*\(/i);
  if (secondRootRel === -1) return rawCode;

  const secondRootIdx = firstRootIdx + 12 + secondRootRel;
  const prefix = rawCode.slice(0, secondRootIdx);
  const suffix = rawCode.slice(secondRootIdx);

  // Auto-close any open quotes/brackets on `prefix` so we can compare both halves cleanly
  let closedPrefix = prefix;
  let quote: '"' | "'" | null = null;
  const stack: string[] = [];
  for (let i = 0; i < closedPrefix.length; i++) {
    const ch = closedPrefix[i];
    if (quote) {
      if (ch === "\\" && i + 1 < closedPrefix.length) {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") stack.push(")");
    else if (ch === "[") stack.push("]");
    else if (ch === "{") stack.push("}");
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) stack.pop();
    }
  }
  if (quote) closedPrefix += quote;
  while (stack.length > 0) closedPrefix += stack.pop();

  // Prefer the suffix if it defines more top-level component statements than prefix; otherwise keep repaired prefix
  const countTopStatements = (s: string) =>
    (s.match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*[A-Z][A-Za-z0-9_]*\s*\(/gm) || [])
      .length;
  return countTopStatements(suffix) >= countTopStatements(closedPrefix) &&
    suffix.length >= closedPrefix.length * 0.75
    ? suffix
    : closedPrefix;
}

export function parseOpenUiProgram(
  code: string,
  opts: { final?: boolean } = {},
): { normalizedCode: string; parseResult: ParseResult } {
  const deglued = repairGluedRestartInOpenUiCode(code);
  const normalizedCode = normalizeOpenUiProgram(deglued);
  const schema = getSchema();

  if (opts.final) {
    const parser = createParser(schema, "Stack");
    const parsed = parser.parse(normalizedCode);
    if (parsed.root) {
      return { normalizedCode, parseResult: parsed };
    }
    const spFallback = createStreamingParser(schema, "Stack").set(normalizedCode, true);
    return {
      normalizedCode,
      parseResult: spFallback.root ? spFallback : parsed,
    };
  }

  const sp = createStreamingParser(schema, "Stack");
  return { normalizedCode, parseResult: sp.set(normalizedCode, false) };
}

/**
 * Index (within the Stack's defined children) of the block the model is writing right now.
 * Statements usually follow the order of `root = Stack([a, b, c])`, but a model may define `c`
 * before `b`; the block in progress is the one whose statement comes last in the source.
 * Falls back to the last child when the program is written inline or the last statement is a
 * helper variable.
 */
export function findStreamingBlockIndex(code: string, childCount: number): number {
  const last = Math.max(0, childCount - 1);
  const root = /^\s*root\s*=\s*Stack\(\s*\[([^\]]*)\]/m.exec(code);
  if (!root) return last;
  const refs = root[1].split(",").map((r) => r.trim()).filter(Boolean);
  if (refs.length === 0 || !refs.every((r) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(r))) return last;
  const assigned = [...code.matchAll(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map((m) => m[1]);
  const defined = refs.filter((r) => assigned.includes(r));
  const current = defined.indexOf(assigned[assigned.length - 1] ?? "");
  return current === -1 ? last : Math.min(current, last);
}

/**
 * Converts a parsed OpenUI Lang tree into MistlineUIBlock[] so existing
 * Explore spread planning and Pinboard auto-distillation keep working cleanly.
 */
export function openUiParseResultToMistlineBlocks(
  parseResult: ParseResult,
  opts: { complete: boolean; idPrefix?: string; streamingIndex?: number },
): MistlineUIBlock[] {
  const root = parseResult.root;
  if (!root || !isElementNode(root)) return [];

  const nodes: ElementNode[] = [];
  if (root.typeName === "Stack") {
    const children = Array.isArray(root.props?.children)
      ? root.props.children
      : [];
    for (const child of children) {
      if (isElementNode(child)) nodes.push(child);
    }
  } else {
    nodes.push(root);
  }

  return nodes.flatMap((node, idx) => {
    const raw = repairOpenUiProps(node.typeName, node.props ?? {});
    // While the program streams, only the block at `streamingIndex` is still being written;
    // the others are finished and can be revealed.
    // Once the reply has ended, a block that was cut off is shown with what it has (flagged
    // `truncated`) instead of staying a skeleton forever.
    const blockComplete = opts.complete
      ? true
      : opts.streamingIndex !== undefined && idx !== opts.streamingIndex;
    const props = blockComplete ? finalContentProps(node.typeName, raw) : raw;
    if (!props) return [];
    return [{
      kind: "ui" as const,
      id: `${opts.idPrefix || "oui"}-${node.statementId || idx}`,
      name: node.typeName,
      raw: "",
      props,
      complete: blockComplete,
      ...(opts.complete && node.partial ? { truncated: true } : {}),
    }];
  });
}

/**
 * True when `text` carries renderable UI markup: an ```openui-lang / ```ui fence, a JSON
 * component block, or an unfenced `name = Component(` statement for a known component.
 * The chat thread and the parser both route on this, so they can never disagree.
 */
export function containsOpenUiMarkup(text: string): boolean {
  const kind = detectUiMarkup(text);
  return kind.openUi || kind.legacy;
}

function detectUiMarkup(text: string): { openUi: boolean; legacy: boolean } {
  const openUi =
    /^\s*`{3,}\s*(?:openui-lang|openui)\b/im.test(text) ||
    /^\s*root\s*=\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/m.test(text) ||
    text.split("\n").some((ln) => {
      const m = /^\s*(?:`{3,}\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Z][A-Za-z0-9_]*)\s*\(/.exec(ln);
      return Boolean(m && MOMO_OPENUI_COMPONENT_NAMES.has(m[2]));
    });
  const legacy =
    /^\s*`{3,}\s*(?:ui|genui)\b/im.test(text) ||
    /^\s*`{3,}\s*json\b[\s\S]{0,400}?"(?:component|type|name|props)"\s*:/im.test(text);
  return { openUi, legacy };
}

/**
 * Incremental mixed Markdown + OpenUI Lang + legacy Mistline UI stream parser.
 * Supports mixing prose, ```openui-lang, unfenced multi-line `root = ...`,
 * ```ui blocks, and ```json component blocks inside the same message.
 */
export function parseOpenUiMixedStream(
  rawText: string,
  opts: { final?: boolean } = {},
): OpenUiMixedSegment[] {
  const final = Boolean(opts.final);
  const normalized = stripLeakedReasoningScratchpad(
    (rawText || "").replace(/\r\n?/g, "\n"),
  );
  if (!normalized.trim()) return [];
  const text = splitMidLineUiFences(normalized);

  const markup = detectUiMarkup(text);
  if (!markup.openUi && !markup.legacy) {
    return [
      {
        kind: "text",
        id: "t-0",
        text: text.trim(),
        complete: final,
      },
    ];
  }

  if (!markup.openUi && markup.legacy) {
    const legacy = parseMistlineStream(text, { final });
    return legacy.map((blk, bIdx): OpenUiMixedSegment =>
      blk.kind === "text"
        ? { kind: "text", id: `t-${bIdx}`, text: blk.text, complete: final }
        : { kind: "legacy-ui", id: `lui-${bIdx}`, block: blk },
    );
  }

  const lines = text.split("\n");
  const segments: OpenUiMixedSegment[] = [];
  let textBuf: string[] = [];
  let uiBuf: string[] = [];
  let legacyBuf: string[] = [];
  let rawBracketDepth = 0;
  let mode:
    | "text"
    | "openui-fenced"
    | "openui-raw"
    | "legacy-fenced"
    | "json-maybe-ui"
    | "code-fence" = "text";
  let segIdx = 0;

  const flushText = (complete: boolean) => {
    const joined = textBuf.join("\n").trim();
    textBuf = [];
    if (!joined) return;
    segments.push({
      kind: "text",
      id: `t-${segIdx++}`,
      text: joined,
      complete,
    });
  };

  const flushOpenUi = (complete: boolean) => {
    const code = uiBuf.join("\n").trim();
    uiBuf = [];
    rawBracketDepth = 0;
    if (!code) return;
    const { normalizedCode, parseResult } = parseOpenUiProgram(code, {
      final: complete,
    });
    segments.push({
      kind: "openui",
      id: `oui-${segIdx++}`,
      code,
      normalizedCode,
      parseResult,
      complete,
    });
  };

  const flushLegacyOrJson = (complete: boolean) => {
    const rawFenced = legacyBuf.join("\n");
    legacyBuf = [];
    if (!rawFenced.trim()) return;
    const parsed = parseMistlineStream(rawFenced, { final: complete });
    for (const blk of parsed) {
      if (blk.kind === "ui") {
        segments.push({
          kind: "legacy-ui",
          id: `lui-${segIdx++}`,
          block: blk,
        });
      } else if (blk.text.trim()) {
        segments.push({
          kind: "text",
          id: `t-${segIdx++}`,
          text: blk.text.trim(),
          complete,
        });
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (mode === "openui-fenced") {
      if (CLOSE_FENCE.test(line)) {
        flushOpenUi(true);
        mode = "text";
      } else if (OPENUI_OPEN_FENCE.test(line)) {
        // Recover cleanly if a prior model stream aborted before closing ``` and a
        // fallback attempt opened a brand-new ```openui-lang fence.
        flushOpenUi(true);
        mode = "openui-fenced";
      } else {
        uiBuf.push(line);
      }
      continue;
    }

    if (mode === "legacy-fenced" || mode === "json-maybe-ui") {
      legacyBuf.push(line);
      if (CLOSE_FENCE.test(line)) {
        flushLegacyOrJson(true);
        mode = "text";
      }
      continue;
    }

    if (mode === "openui-raw") {
      const trimmedLine = line.trim();
      if (
        rawBracketDepth === 0 &&
        /^root\s*=\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(trimmedLine) &&
        /^\s*root\s*=/m.test(uiBuf.join("\n"))
      ) {
        flushOpenUi(true);
        uiBuf.push(line);
        rawBracketDepth = updateRawOpenUiDepth(line, 0);
        continue;
      }
      const continuesExpression =
        rawBracketDepth > 0 ||
        trimmedLine === "" ||
        /^[A-Za-z_$][A-Za-z0-9_]*\s*=/.test(trimmedLine) ||
        /^\s+/.test(line);
      if (!continuesExpression) {
        flushOpenUi(true);
        mode = "text";
        // Re-process this line under normal text rules
        i -= 1;
      } else {
        uiBuf.push(line);
        rawBracketDepth = updateRawOpenUiDepth(line, rawBracketDepth);
      }
      continue;
    }

    if (mode === "code-fence") {
      textBuf.push(line);
      if (CLOSE_FENCE.test(line)) {
        mode = "text";
      }
      continue;
    }

    // mode === "text"
    if (OPENUI_OPEN_FENCE.test(line)) {
      flushText(true);
      mode = "openui-fenced";
      continue;
    }

    if (LEGACY_UI_OPEN_FENCE.test(line)) {
      flushText(true);
      legacyBuf = [line];
      mode = "legacy-fenced";
      continue;
    }

    if (JSON_OPEN_FENCE.test(line)) {
      flushText(true);
      legacyBuf = [line];
      mode = "json-maybe-ui";
      continue;
    }

    const preRootAssign = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(
      line,
    );
    const isStandaloneOpenUiDecl =
      Boolean(preRootAssign) &&
      (preRootAssign![2] === "Stack" ||
        MOMO_OPENUI_COMPONENT_NAMES.has(preRootAssign![2]));

    if (/^\s*root\s*=\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(line) || isStandaloneOpenUiDecl) {
      flushText(true);
      mode = "openui-raw";
      uiBuf.push(line);
      rawBracketDepth = updateRawOpenUiDepth(line, 0);
      continue;
    }

    if (/^\s*`{3,}/.test(line)) {
      // Detect unlabeled / generic code fences (e.g. ``` or ```text or ```dsl) whose body
      // actually starts with an OpenUI program (`root = ...` or `id = MomoComp(...)`) so
      // OpenUI blocks never leak out as raw Markdown `<pre><code>` blocks.
      let firstBodyLine = "";
      for (let look = i + 1; look < lines.length; look++) {
        const cand = lines[look].trim();
        if (!cand) continue;
        if (CLOSE_FENCE.test(lines[look])) break;
        firstBodyLine = cand;
        break;
      }
      const assignInsideFence =
        /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(firstBodyLine);
      const isUnlabeledOpenUiFence =
        /^root\s*=\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(firstBodyLine) ||
        Boolean(
          assignInsideFence &&
            (assignInsideFence[2] === "Stack" ||
              MOMO_OPENUI_COMPONENT_NAMES.has(assignInsideFence[2])),
        );
      if (isUnlabeledOpenUiFence) {
        flushText(true);
        mode = "openui-fenced";
        continue;
      }
      mode = "code-fence";
    }

    textBuf.push(line);
  }

  if (mode === "openui-fenced") {
    flushOpenUi(final);
  } else if (mode === "openui-raw") {
    flushOpenUi(final || rawBracketDepth === 0);
  } else if (mode === "legacy-fenced" || mode === "json-maybe-ui") {
    flushLegacyOrJson(final);
  } else {
    flushText(final);
  }

  // 1) Merge continuation fragments when an earlier openui block had unresolved refs
  //    and the follow-up openui block only supplies those missing definitions (no new `root =`).
  // 2) Deduplicate restarted `root = Stack(...)` retry blocks in the same message,
  //    keeping the highest-quality / most complete tree.
  if (segments.length >= 2) {
    const scoreOpenUi = (seg: Extract<OpenUiMixedSegment, { kind: "openui" }>, idx: number): number => {
      const pr = seg.parseResult;
      const children = openUiParseResultToMistlineBlocks(pr, { complete: true }).length;
      const unresolved = pr.meta.unresolved?.length ?? 0;
      const errors = pr.meta.errors?.length ?? 0;
      const incomplete = pr.meta.incomplete ? 1 : 0;
      return (
        (pr.root ? 1000 : 0) +
        children * 25 -
        unresolved * 200 -
        errors * 150 -
        incomplete * 100 +
        idx
      );
    };

    // Two blocks in a row are a retry only when the first one is broken or the second one
    // repeats it. A reply may carry several healthy blocks back to back; those all render.
    const componentNames = (seg: Extract<OpenUiMixedSegment, { kind: "openui" }>) =>
      openUiParseResultToMistlineBlocks(seg.parseResult, { complete: true })
        .map((b) => b.name)
        .join(",");
    const isRestartOf = (
      prev: Extract<OpenUiMixedSegment, { kind: "openui" }>,
      next: Extract<OpenUiMixedSegment, { kind: "openui" }>,
    ): boolean => {
      const meta = prev.parseResult.meta;
      const prevBroken =
        !prev.parseResult.root ||
        Boolean(meta.incomplete) ||
        (meta.unresolved?.length ?? 0) > 0 ||
        (meta.errors?.length ?? 0) > 0;
      if (prevBroken) return true;
      const prevNames = componentNames(prev);
      return prevNames.length > 0 && prevNames === componentNames(next);
    };

    const merged: OpenUiMixedSegment[] = [];
    for (let idx = 0; idx < segments.length; idx++) {
      const seg = segments[idx];
      const prev = merged[merged.length - 1];
      // A rootless fragment completes the latest block that still has undefined variables.
      // That block is not always the previous segment: prose and other blocks may sit between.
      if (seg.kind === "openui" && !/^\s*root\s*=/m.test(seg.code)) {
        let hostIdx = -1;
        for (let k = merged.length - 1; k >= 0; k--) {
          const cand = merged[k];
          if (cand.kind === "openui" && (cand.parseResult.meta.unresolved?.length ?? 0) > 0) {
            hostIdx = k;
            break;
          }
        }
        const host = hostIdx >= 0 ? merged[hostIdx] : null;
        if (host && host.kind === "openui") {
          const combinedCode = `${host.code}\n${seg.code}`;
          const { normalizedCode, parseResult } = parseOpenUiProgram(combinedCode, {
            final: seg.complete,
          });
          merged[hostIdx] = {
            ...host,
            code: combinedCode,
            normalizedCode,
            parseResult,
            complete: seg.complete,
          };
          continue;
        }
      }
      if (prev && prev.kind === "openui" && seg.kind === "openui") {
        const segHasRoot = /^\s*root\s*=/m.test(seg.code);
        const prevHasRoot = /^\s*root\s*=/m.test(prev.code);
        if (prevHasRoot && segHasRoot && isRestartOf(prev, seg)) {
          const prevScore = scoreOpenUi(prev, idx - 1);
          const nextScore = scoreOpenUi(seg, idx);
          if (nextScore >= prevScore) {
            merged[merged.length - 1] = seg;
          }
          continue;
        }
      }
      merged.push(seg);
    }
    return merged;
  }

  return segments;
}

/**
 * Returns undefined variable names still missing from any OpenUI segment so
 * /api/brain can request a targeted continuation that completes them.
 */
export function getOpenUiUnresolvedRefs(rawText: string): string[] {
  const segments = parseOpenUiMixedStream(rawText, { final: false });
  const refs = new Set<string>();
  for (const seg of segments) {
    if (seg.kind === "openui") {
      for (const r of seg.parseResult.meta.unresolved ?? []) {
        if (r) refs.add(r);
      }
    }
  }
  return Array.from(refs);
}

/**
 * Checks whether the streamed response stopped inside an unclosed ```openui-lang
 * fence, incomplete statement, or with unresolved component references so
 * /api/brain can request a clean continuation.
 */
export function hasUnclosedOpenUiStream(rawText: string): boolean {
  const segments = parseOpenUiMixedStream(rawText, { final: false });
  if (segments.length === 0) return false;
  for (let idx = 0; idx < segments.length; idx++) {
    const seg = segments[idx];
    if (seg.kind === "openui") {
      if (
        !seg.complete ||
        Boolean(seg.parseResult.meta.incomplete) ||
        (seg.parseResult.meta.unresolved?.length ?? 0) > 0 ||
        !seg.parseResult.root
      ) {
        return true;
      }
    } else if (seg.kind === "legacy-ui" && !seg.block.complete) {
      return true;
    }
  }
  return false;
}

/**
 * Converts mixed OpenUI Lang + text output into MistlineBlock[] so Explore
 * spread planners and Pinboard auto-distillation work uniformly.
 */
export function parseMixedStreamToMistlineBlocks(
  rawText: string,
  opts: { final?: boolean } = {},
): MistlineBlock[] {
  const final = Boolean(opts.final);
  const segments = parseOpenUiMixedStream(rawText, { final });
  const out: MistlineBlock[] = [];

  for (const seg of segments) {
    if (seg.kind === "text") {
      out.push({
        kind: "text",
        id: seg.id,
        text: seg.text,
      });
    } else if (seg.kind === "legacy-ui") {
      out.push(seg.block);
    } else {
      const root = seg.parseResult.root;
      const childCount = Array.isArray(root?.props?.children) ? root.props.children.length : 1;
      const blocks = openUiParseResultToMistlineBlocks(seg.parseResult, {
        complete: seg.complete,
        idPrefix: seg.id,
        ...(seg.complete
          ? {}
          : { streamingIndex: findStreamingBlockIndex(seg.normalizedCode, childCount) }),
      });
      out.push(...blocks);
    }
  }

  return out;
}

/**
 * Summarizes ```openui-lang blocks into compact human-readable markers for
 * multi-turn conversation history, preventing raw DSL bloat or syntax poisoning.
 */
export function compressOpenUiForHistory(rawText: string): string {
  const segments = parseOpenUiMixedStream(rawText, { final: true });
  const parts: string[] = [];

  for (const seg of segments) {
    if (seg.kind === "text") {
      if (seg.text) parts.push(seg.text);
    } else if (seg.kind === "legacy-ui") {
      const title =
        typeof seg.block.props?.title === "string"
          ? ` — "${seg.block.props.title}"`
          : "";
      parts.push(`[UI: ${seg.block.name}${title}]`);
    } else {
      const blocks = openUiParseResultToMistlineBlocks(seg.parseResult, {
        complete: true,
        idPrefix: seg.id,
      });
      if (blocks.length === 0) {
        parts.push("[UI block]");
      } else {
        const names = blocks
          .filter((b) => b.name !== "Followups")
          .map((b) => {
            const title =
              typeof b.props?.title === "string"
                ? `("${b.props.title}")`
                : "";
            return `${b.name}${title}`;
          });
        if (names.length > 0) {
          parts.push(`[OpenUI rendered: ${names.join(", ")}]`);
        }
      }
    }
  }

  return parts.join("\n\n").trim();
}
