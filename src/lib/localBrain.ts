import {
  LOOK_DEFAULT_PALETTE,
  LOOK_KEYWORD_RULES,
  ROLE_PALETTES,
} from "@/data/looks";
import type { MoodId, RolePaletteTuple, SourceItem } from "@/types/momo";

const SEMANTIC_LOOK_BOOSTS: Array<[string, RegExp, number]> = [
  ["music", /\b(?:mcr|my\s+chemical\s+romance|setlist|tracklist|daftar\s+lagu|lirik|diskografi|album|band|lagu|konser.*(?:tema|lore|babak)|encore|b-stage|chord|bpm|aransemen)\b/i, 2],
  ["traveller", /\b(?:\bdari\b[\s\S]{1,30}\bke\b|rute|naik\s+apa|macet|ojol|gocar|grab|transjakarta|krl|mrt|lrt|stasiun|halte|bandara|hotel|aston|jis|gbk|senayan|parkir|itinerary|estimasi\s+(?:waktu|jarak))\b/i, 2],
  ["money", /\b(?:budget|anggaran|gaji|cicilan|kpr|investasi|nabung|tabungan|dana\s+darurat|cashflow|arus\s+kas|pajak|patungan|biaya|harga\s+tiket)\b/i, 2],
  ["bug", /\b(?:stack\s*trace|stale\s+closure|race\s+condition|hydration|error|crash|exception|undefined|null|debug|bug|memory\s+leak)\b/i, 2],
  ["builder", /\b(?:react|next\.?js|typescript|tailwind|framer\s+motion|layoutid|api\s+route|sse|websocket|komponen|refactor|arsitektur|database|schema|reflow|gpu)\b/i, 2],
  ["designer", /\b(?:tipografi|typography|skeuo|skeuomorphic|hierarki\s+visual|kontras|palet\s+warna|color\s+palette|moodboard|figma|ui\/ux|design\s+system)\b/i, 2],
  ["investigate", /\b(?:root\s+cause|akar\s+masalah|investigasi|hipotesis|bukti|anomali|kenapa\s+latency|kenapa\s+lambat|audit\s+data)\b/i, 2],
  ["guard", /\b(?:xss|csrf|idor|sql\s+injection|csp|oauth|jwt|kebocoran\s+session|blast\s+radius|destructive)\b/i, 2],
  ["cook", /\b(?:resep|bumbu|marinasi|tumis|goreng|rebus|kukus|panggang|ulen|adonan|porsi|kalori\s+masak|kopi|decaf|espresso|latte|cappuccino|americano|cold\s*brew|french\s*press|mesin\s+press|seduh|barista|minuman|matcha|v60|moka\s*pot)\b/i, 2],
  ["tutor", /\b(?:ajarin|ngajarin|tutorial|belajar|materi\s+belajar|cara\s+kerja|bagaimana\s+mekanisme|analogi|prinsip\s+dasar|konsep\s+dasar|pahami|mengerti)\b/i, 2],
];

function collectLookScores(clean: string): Map<string, number> {
  const scores = new Map<string, number>();
  if (!clean) return scores;

  for (const [look, re] of LOOK_KEYWORD_RULES) {
    const globalRe = new RegExp(
      re.source,
      re.flags.includes("g") ? re.flags : `${re.flags}g`,
    );
    const matches = clean.match(globalRe);
    if (matches && matches.length > 0) {
      scores.set(look, (scores.get(look) ?? 0) + matches.length);
    }
  }

  for (const [look, boostRe, weight] of SEMANTIC_LOOK_BOOSTS) {
    const globalRe = new RegExp(
      boostRe.source,
      boostRe.flags.includes("g") ? boostRe.flags : `${boostRe.flags}g`,
    );
    const matches = clean.match(globalRe);
    if (matches && matches.length > 0) {
      scores.set(look, (scores.get(look) ?? 0) + matches.length * weight);
    }
  }

  return scores;
}

export function getLookMatchScores(
  input: string,
): Array<{ look: string; score: number }> {
  const scores = collectLookScores((input || "").trim());
  return [...scores.entries()]
    .map(([look, score]) => ({ look, score }))
    .sort((a, b) => b.score - a.score);
}

const ADJACENT_ROLE_DOMAINS: Record<string, readonly string[]> = {
  builder: ["bug", "designer", "tester", "investigate", "guard", "tutor"],
  bug: ["builder", "tester", "investigate", "guard"],
  designer: ["builder", "write"],
  tester: ["builder", "bug", "guard"],
  traveller: ["money", "cook"],
  music: ["traveller", "money", "write"],
  cook: ["money"],
  investigate: ["builder", "bug", "guard", "money"],
  tutor: ["builder", "bug", "designer", "write", "investigate"],
  write: ["designer", "music", "tutor"],
};

export type RoleDecision =
  | { kind: "answer" }
  | { kind: "needs_handoff" | "clarify"; suggestedLook: string };

const DELIVERABLES: Array<[string, RegExp]> = [
  ["builder", /^(?:aplikasi|app|website|situs\s+web|web|landing page|kode|code|component|function|endpoint|api|database|program\s+(?:python|javascript|komputer|kalkulator))\b/i],
  ["cook", /^(?:resep|recipe|adonan|masakan|hidangan|bumbu)\b/i],
  ["write", /^(?:artikel|surat|caption|esai|cerpen|puisi|email)\b/i],
  ["money", /^(?:anggaran|budget|simulasi cicilan)\b/i],
  ["traveller", /^(?:itinerary|rute perjalanan)\b/i],
  ["designer", /^(?:wireframe|mockup|moodboard|palet warna)\b/i],
  ["tester", /^(?:unit test|integration test|test case)\b/i],
];
const BUILD_VERB = /\b(?:bikin(?:in|kan)?|buat(?:in|kan)?|membuat|bangun|kembangkan|implementasikan|tulis(?:kan)?|create|build|write)\s+(?:(?:sebuah|contoh|satu|an?|me|gue|aku|saya)\s+)*/gi;
const PROGRAMMING = /\b(?:coding|ngoding|pemrograman|programming|python|javascript|typescript|golang|node\.?js)\b|\bc\+\+(?!\w)/i;

export function decideRoleTurn(
  input: string,
  activeLook: string | undefined,
  previousUserText = "",
): RoleDecision {
  const answer = { kind: "answer" } as const;
  if (!activeLook || activeLook === "rest") return answer;
  let text = input.trim();
  // Only inherit the task for an explicit continuation, never for a fresh request.
  if (/^(?:lanjut(?:in|kan)?|teruskan|yang tadi|continue)(?:\s+(?:yang\s+)?tadi)?[.!\s]*$/i.test(text)) {
    text = previousUserText.trim() || text;
  }
  const scores = collectLookScores(text);
  if (PROGRAMMING.test(text)) scores.set("builder", (scores.get("builder") ?? 0) + 3);
  const adjacent = (look: string) => ADJACENT_ROLE_DOMAINS[activeLook]?.includes(look)
    || ADJACENT_ROLE_DOMAINS[look]?.includes(activeLook);

  // The requested output outranks its subject: a recipe app is software;
  // a recipe for a website is still a recipe.
  for (const verb of text.matchAll(BUILD_VERB)) {
    const object = text.slice(verb.index + verb[0].length);
    const owner = DELIVERABLES.find(([, re]) => re.test(object))?.[0];
    if (!owner) continue;
    if (owner === activeLook) return answer;
    if (!adjacent(owner)) return { kind: "needs_handoff", suggestedLook: owner };
    break;
  }

  const active = scores.get(activeLook) ?? 0;
  const challenger = [...scores].filter(([look]) => look !== activeLook)
    .sort((a, b) => b[1] - a[1])[0];
  if (!challenger) return answer;
  const [look, score] = challenger;
  // "Jelaskan"/"kenapa" alone describe the way to answer, not a change of job.
  if (active && (look === "tutor" || look === "investigate")) return answer;
  if (score >= (adjacent(look) ? 6 : 3) && score >= active + 2) {
    return { kind: active ? "clarify" : "needs_handoff", suggestedLook: look };
  }
  if (active && look === "builder" && !adjacent(look) &&
      /^(?:website|aplikasi|coding|ngoding|source code)\b/i.test(text)) {
    return { kind: "clarify", suggestedLook: look };
  }
  return answer;
}

/**
 * Finds a decisive alternative role for inputs that clearly belong to a
 * different domain than `currentLook` (used to suggest a role switch while a
 * bot is pinned). Requires the challenger to score >= minScore and strictly
 * beat the current look's own score.
 */
export function findAlternativeLook(
  input: string,
  currentLook: string,
  minScore = 3,
): string | null {
  const scores = collectLookScores((input || "").trim());
  const currentScore = scores.get(currentLook) ?? 0;
  let bestLook = "";
  let bestScore = 0;
  for (const [look, score] of scores.entries()) {
    if (look === currentLook) continue;
    if (score > bestScore) {
      bestScore = score;
      bestLook = look;
    }
  }
  if (!bestLook || bestScore < minScore || bestScore <= currentScore) {
    return null;
  }
  return bestLook;
}

export function inferLookByKeyword(
  input: string,
  options?: { fallbackLook?: string },
): string {
  const clean = (input || "").trim();
  const scores = collectLookScores(clean);
  const fallback =
    options?.fallbackLook && options.fallbackLook !== "rest"
      ? options.fallbackLook
      : "";

  // Session Inertia Hysteresis: when an active session already has a specialist role
  // (e.g. Mentor/tutor, Maker/builder), give that active role a continuity inertia
  // bonus (+1.5 when it already has >=1 domain match, or requiring a new role to score >= 3
  // to hijack the session). This prevents incidental words like "css" or "layout" inside
  // a Mentor session from randomly flipping the session to Desainer.
  if (fallback) {
    const activeFallbackScore = scores.get(fallback) ?? 0;
    if (activeFallbackScore > 0) {
      scores.set(fallback, activeFallbackScore + 1.5);
    }
  }

  let bestLook = "";
  let bestScore = 0;
  for (const [look, score] of scores.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestLook = look;
    }
  }

  if (fallback && bestLook && bestLook !== fallback) {
    const fallbackScore = scores.get(fallback) ?? 0;
    // Require a decisive domain shift (score >= 3 and strictly higher than fallback)
    // before hijacking an active session's established role.
    if (bestScore < 3 || bestScore <= fallbackScore) {
      return fallback;
    }
  }

  if (bestLook) return bestLook;
  if (fallback) {
    return fallback;
  }
  return "rest";
}

export function inferMoodByInput(input: string, look: string): MoodId {
  if (/\b(urgent|asap|broken|down|crash\w*|stuck|rusak|error|gagal|panik)\b/i.test(input)) {
    return "concerned";
  }
  const words = input.trim().split(/\s+/).filter(Boolean).length;
  if (look === "rest" && words < 3) return "curious";
  if (look === "cook") return "happy";
  return "focused";
}

export function stripMarkdownAndCites(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6})\s+/gm, "")
    .replace(/^\s{0,3}(?:---|___|\*\*\*)\s*$/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/(\*{1,3}|_{1,3}|~~)/g, "")
    .replace(/\[\d+\]|\(\d{1,2}\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatWithSourcesForCopy(text: string, sources?: SourceItem[]): string {
  const plain = text.replace(/\*\*/g, "").trim();
  if (!sources?.length) return plain;
  return `${plain}\n\nSources:\n${sources.map((s, idx) => `[${idx + 1}] ${s.title}: ${s.url}`).join("\n")}`;
}

export function resolvePaletteKey(look: string, overrides: Record<string, string>): string {
  return overrides[look] || LOOK_DEFAULT_PALETTE[look] || "persimmon";
}

export function resolvePaletteTuple(look: string, overrides: Record<string, string>): RolePaletteTuple {
  const key = resolvePaletteKey(look, overrides);
  return ROLE_PALETTES[key] || ROLE_PALETTES.persimmon;
}

export function hexToRgbTuple(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export function rgbTupleToHex([r, g, b]: [number, number, number]): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mixHex(a: string, b: string, t: number): string {
  const ra = hexToRgbTuple(a);
  const rb = hexToRgbTuple(b);
  return rgbTupleToHex([
    ra[0] + (rb[0] - ra[0]) * t,
    ra[1] + (rb[1] - ra[1]) * t,
    ra[2] + (rb[2] - ra[2]) * t,
  ]);
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgbTuple(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

export function contrastInkOn(fgHex: string, bgHex: string): string {
  const lum = (hex: string) =>
    hexToRgbTuple(hex).reduce((acc, c, idx) => {
      const lin = c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      return acc + lin * [0.2126, 0.7152, 0.0722][idx];
    }, 0);
  const lFg = lum(fgHex);
  const lBg = lum(bgHex);
  const ratio = (Math.max(lFg, lBg) + 0.05) / (Math.min(lFg, lBg) + 0.05);
  if (ratio >= 4.5) return fgHex;
  return lBg > 0.2 ? "#111113" : "#f4f4f6";
}
