/**
 * Utilities for normalizing inline web citation markers (`(1)`, `[1, 2]`) so they:
 * 1. Never sit awkwardly before punctuation (`(1).` -> `. (1)`).
 * 2. In markdown paragraphs, consolidate deduplicated at the very end of the
 *    paragraph *after* the terminal period (`.` / `!` / `?`), rendered cleanly
 *    as compact subscript-scale `.momo-cite-tail` badges.
 */

function scanBalancedLinkEnd(text: string, startIdx: number): number {
  if (text[startIdx] !== "[") return -1;
  let i = startIdx + 1;
  let labelDepth = 1;
  while (i < text.length && labelDepth > 0) {
    if (text[i] === "\\" && i + 1 < text.length) {
      i += 2;
      continue;
    }
    if (text[i] === "[") labelDepth += 1;
    else if (text[i] === "]") labelDepth -= 1;
    i += 1;
  }
  if (labelDepth !== 0 || text[i] !== "(") return -1;
  i += 1;
  let hrefDepth = 1;
  while (i < text.length && hrefDepth > 0) {
    if (text[i] === "\\" && i + 1 < text.length) {
      i += 2;
      continue;
    }
    if (text[i] === "(") hrefDepth += 1;
    else if (text[i] === ")") hrefDepth -= 1;
    i += 1;
  }
  return hrefDepth === 0 ? i : -1;
}

function scanProtectedSpanEnd(text: string, idx: number): number {
  const ch = text[idx];
  if (ch === "`") {
    const closeIdx = text.indexOf("`", idx + 1);
    return closeIdx !== -1 ? closeIdx + 1 : -1;
  }
  if (ch === "[") {
    return scanBalancedLinkEnd(text, idx);
  }
  if (ch === "h" && (text.startsWith("https://", idx) || text.startsWith("http://", idx))) {
    const urlMatch = /^https?:\/\/[^\s<>\])"']+/.exec(text.slice(idx));
    return urlMatch ? idx + urlMatch[0].length : -1;
  }
  return -1;
}

function isStartOfLine(text: string, idx: number): boolean {
  let cursor = idx - 1;
  while (cursor >= 0) {
    const c = text[cursor];
    if (c === "\n") return true;
    if (c !== " " && c !== "\t") return false;
    cursor -= 1;
  }
  return true;
}

/**
 * Ensures punctuation never gets trapped *after* an inline citation (`(1).` -> `. (1)`),
 * while leaving code spans, links, raw URLs, `foo(1)`, and unverified `(n)` untouched.
 */
export function flipPunctuationBeforeCitations(raw: string, maxCite = 0): string {
  if (!raw || maxCite <= 0 || (!raw.includes("(") && !raw.includes("["))) return raw;
  let out = "";
  let i = 0;

  while (i < raw.length) {
    const protectedEnd = scanProtectedSpanEnd(raw, i);
    if (protectedEnd > i) {
      out += raw.slice(i, protectedEnd);
      i = protectedEnd;
      continue;
    }

    const citeGroup = matchCitationGroup(raw, i, maxCite);
    if (citeGroup) {
      const after = raw.slice(citeGroup.endIdx);
      const punctMatch = /^[.,:;!?]+/.exec(after);
      if (punctMatch) {
        const punct = punctMatch[0];
        // Pull back spaces right before the citation group so "word (1)." becomes "word. (1)"
        out = out.replace(/[ \t]+$/, "");
        out += `${punct} ${raw.slice(i, citeGroup.endIdx)}`;
        i = citeGroup.endIdx + punct.length;
        continue;
      }
    }

    out += raw[i];
    i += 1;
  }

  return out;
}

interface CitationGroupMatch {
  nums: number[];
  endIdx: number;
}

function matchSingleCitation(
  text: string,
  idx: number,
  maxCite: number
): { nums: number[]; endIdx: number } | null {
  if (maxCite <= 0) return null;
  const ch = text[idx];
  if (ch === "(") {
    const prevCh = idx > 0 ? text[idx - 1] : "";
    if (prevCh && /[a-zA-Z0-9_$]/.test(prevCh)) return null;
    const m = /^\((\d{1,2})\)/.exec(text.slice(idx));
    if (!m) return null;
    const n = parseInt(m[1], 10);
    if (!Number.isFinite(n) || n < 1 || n > maxCite) return null;
    const afterIdx = idx + m[0].length;
    if (isStartOfLine(text, idx) && /^\s+\S/.test(text.slice(afterIdx))) {
      return null;
    }
    const beforeSlice = text.slice(Math.max(0, idx - 6), idx);
    if (/[:;]\s*$/.test(beforeSlice) && /^\s+[A-Za-z0-9"`*]/.test(text.slice(afterIdx))) {
      return null;
    }
    return { nums: [n], endIdx: afterIdx };
  }

  if (ch === "[") {
    const m = /^\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/.exec(text.slice(idx));
    if (!m) return null;
    const afterIdx = idx + m[0].length;
    if (text[afterIdx] === "(") return null;
    const parts = m[1].split(",").map((s) => parseInt(s.trim(), 10));
    if (parts.length === 0 || parts.some((n) => !Number.isFinite(n) || n < 1 || n > maxCite)) {
      return null;
    }
    return { nums: parts, endIdx: afterIdx };
  }

  return null;
}

function matchCitationGroup(
  text: string,
  idx: number,
  maxCite: number
): CitationGroupMatch | null {
  const first = matchSingleCitation(text, idx, maxCite);
  if (!first) return null;
  const nums = [...first.nums];
  let cursor = first.endIdx;
  while (cursor < text.length) {
    const wsMatch = /^[ \t]*/.exec(text.slice(cursor));
    const afterWs = cursor + (wsMatch ? wsMatch[0].length : 0);
    const next = matchSingleCitation(text, afterWs, maxCite);
    if (!next) break;
    nums.push(...next.nums);
    cursor = next.endIdx;
  }
  return { nums, endIdx: cursor };
}

/**
 * Collects verified inline citation tokens `(n)` / `[n, m]` inside a paragraph or list item,
 * strips them from inside sentences (while preserving prose enumerations `(1) ... (2) ...`),
 * ensures terminal punctuation cleanly precedes the badges, and appends deduplicated
 * `(n)` tokens at the very end of the block after `.`.
 */
export function relocateParagraphCitationsToEnd(
  raw: string,
  opts?: { ensureClosingPeriod?: boolean; maxCite?: number }
): string {
  const maxCite = opts?.maxCite ?? 0;
  if (!raw || maxCite <= 0 || (!raw.includes("(") && !raw.includes("["))) return raw;
  const ensureClosingPeriod = opts?.ensureClosingPeriod ?? true;
  const hasInlineEnum = /(?:^|[:;]\s*)\(1\)\s+\S[\s\S]*\(2\)\s+\S/.test(raw);
  const collected: number[] = [];
  const seen = new Set<number>();

  let body = "";
  let i = 0;

  while (i < raw.length) {
    const protectedEnd = scanProtectedSpanEnd(raw, i);
    if (protectedEnd > i) {
      body += raw.slice(i, protectedEnd);
      i = protectedEnd;
      continue;
    }

    const single = matchSingleCitation(raw, i, maxCite);
    if (single) {
      if (
        hasInlineEnum &&
        raw[i] === "(" &&
        /^\s+[A-Za-z0-9"`*]/.test(raw.slice(single.endIdx))
      ) {
        body += raw.slice(i, single.endIdx);
        i = single.endIdx;
        continue;
      }
      for (const n of single.nums) {
        if (!seen.has(n)) {
          seen.add(n);
          collected.push(n);
        }
      }
      // Trim whitespace immediately preceding removed marker if followed by whitespace, punctuation, or closing markdown markers
      const nextCh = raw[single.endIdx] ?? "";
      if (!nextCh || /[ \t\n.,:;!?)_*~"'\]]/.test(nextCh)) {
        body = body.replace(/[ \t]+$/, "");
      }
      i = single.endIdx;
      continue;
    }

    body += raw[i];
    i += 1;
  }

  if (collected.length === 0) return raw;

  // Clean double spaces or orphan spaces before punctuation/closing emphasis introduced by removing citations
  let cleaned = body
    .replace(/[ \t]+([.,:;!?)\n])/g, "$1")
    .replace(/(\S)[ \t]+(\*{1,3}|_{1,2}|~~)(?=[ \t\n.,:;!?)]|$)/g, "$1$2")
    .replace(/([ \t]){2,}/g, " ")
    .replace(/[ \t]+$/gm, "")
    .trimEnd();

  if (!cleaned) {
    return collected.map((n) => `(${n})`).join("");
  }

  // Ensure terminal punctuation precedes the tail without clobbering trailing ':'
  if (/[,;]$/.test(cleaned)) {
    cleaned = cleaned.slice(0, -1) + ".";
  } else if (ensureClosingPeriod && !/[.!?:…]["'”’)\]]*$/.test(cleaned)) {
    cleaned += ".";
  }

  const tail = collected.map((n) => `(${n})`).join("");
  return `${cleaned} ${tail}`;
}
