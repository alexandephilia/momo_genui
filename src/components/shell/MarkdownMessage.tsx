"use client";

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Quote } from "lucide-react";
import { MomoIcon } from "@/components/icons/MomoIcon";
import { MermaidRenderer } from "@/components/genui/MermaidRenderer";
import { MistlinePhoto } from "@/components/genui/MistlineLibrary";
import {
  CitationBadge,
  InlineLinkWithTooltip,
} from "@/components/shell/CitationBadge";
import {
  flipPunctuationBeforeCitations,
  relocateParagraphCitationsToEnd,
} from "@/lib/citationPlacement";
import { dedupeConsecutiveParagraphs, replaceProseEmDashes } from "@/lib/genUiStreamParser";
import { renderHandwrittenMath, scanInlineMathToken } from "@/lib/inlineMath";
import {
  MD_FIG_MAX_IMAGES,
  parseFigureLine,
  type MdFigureAlign,
  type MdFigureKind,
} from "@/lib/figureLine";
import { sourceHost, sourceTime } from "@/lib/sourceMeta";
import type { SourceItem } from "@/types/momo";

export interface MarkdownMessageProps {
  text: string;
  sources?: SourceItem[];
  isStreaming: boolean;
}

type MdBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { type: "hr" }
  | { type: "code"; lang: string; code: string; closed: boolean }
  | { type: "blockquote"; lines: string[] }
  | {
      type: "list";
      ordered: boolean;
      start: number;
      items: { text: string; checked: boolean | null }[];
    }
  | {
      type: "table";
      headers: string[];
      alignments: Array<"left" | "center" | "right">;
      rows: string[][];
    }
  | {
      type: "figure";
      alt: string;
      url: string;
      align: MdFigureAlign;
      kind: MdFigureKind;
      images: { alt: string; url: string }[];
    }
  | { type: "paragraph"; lines: string[] };

function isSafeHref(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "mailto:"
    ) {
      return parsed.href;
    }
  } catch {
    return null;
  }
  return null;
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  const stripped = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === "\\" && i + 1 < stripped.length && stripped[i + 1] === "|") {
      cur += "|";
      i += 1;
      continue;
    }
    if (ch === "|") {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function isTableDividerRow(
  line: string,
): Array<"left" | "center" | "right"> | null {
  if (!line.includes("|") && !line.includes("-")) return null;
  const cells = splitTableRow(line);
  if (cells.length === 0) return null;
  const alignments: Array<"left" | "center" | "right"> = [];
  for (const cell of cells) {
    if (!/^:?-{2,}:?$/.test(cell)) return null;
    if (cell.startsWith(":") && cell.endsWith(":")) alignments.push("center");
    else if (cell.endsWith(":")) alignments.push("right");
    else alignments.push("left");
  }
  return alignments;
}

function isHorizontalRule(line: string): boolean {
  return /^\s{0,3}(?:-\s*-\s*-[-\s]*|\*\s*\*\s*\*[\*\s]*|_\s*_\s*_[_\s]*)$/.test(
    line,
  );
}

function parseHeading(
  line: string,
): { level: 1 | 2 | 3 | 4; text: string } | null {
  const m = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
  if (!m) return null;
  const level = Math.min(4, m[1].length) as 1 | 2 | 3 | 4;
  return { level, text: m[2] };
}

function parseListLine(line: string): {
  ordered: boolean;
  start: number;
  text: string;
  checked: boolean | null;
} | null {
  const ulMatch = /^\s*[-*+]\s+(.*)$/.exec(line);
  if (ulMatch) {
    let text = ulMatch[1];
    let checked: boolean | null = null;
    const taskMatch = /^\[([ xX])\]\s+(.*)$/.exec(text);
    if (taskMatch) {
      checked = taskMatch[1].toLowerCase() === "x";
      text = taskMatch[2];
    }
    return { ordered: false, start: 1, text, checked };
  }
  const olMatch = /^\s*(\d{1,4})[.)]\s+(.*)$/.exec(line);
  if (olMatch) {
    return {
      ordered: true,
      start: Math.max(1, Number(olMatch[1]) || 1),
      text: olMatch[2],
      checked: null,
    };
  }
  return null;
}

function parseMarkdownBlocks(raw: string, inQuote = false): MdBlock[] {
  const normalized = raw.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // 1. Fenced code block (supports unclosed open stream safely)
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})([^\n`~]*)$/.exec(line);
    if (fenceMatch) {
      const fenceChar = fenceMatch[1][0];
      const fenceLen = fenceMatch[1].length;
      const lang = fenceMatch[2].trim();
      const codeLines: string[] = [];
      let closed = false;
      i += 1;
      const closeRe = new RegExp(
        `^\\s{0,3}${fenceChar === "`" ? "`" : "~"}{${fenceLen},}\\s*$`,
      );
      while (i < lines.length) {
        if (closeRe.test(lines[i])) {
          closed = true;
          i += 1;
          break;
        }
        codeLines.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: "code", lang, code: codeLines.join("\n"), closed });
      continue;
    }

    // 2. ATX Heading
    const heading = parseHeading(line);
    if (heading) {
      blocks.push({ type: "heading", ...heading });
      i += 1;
      continue;
    }

    // 3. Horizontal rule
    if (isHorizontalRule(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    // 4. GFM Table (header + divider row + body rows)
    if (line.includes("|") && i + 1 < lines.length) {
      const alignments = isTableDividerRow(lines[i + 1]);
      if (alignments) {
        const headers = splitTableRow(line);
        const rows: string[][] = [];
        i += 2;
        while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
          rows.push(splitTableRow(lines[i]));
          i += 1;
        }
        blocks.push({ type: "table", headers, alignments, rows });
        continue;
      }
    }

    // 5. Blockquote
    if (/^\s{0,3}>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    // 6. Ordered / Unordered List
    const listFirst = parseListLine(line);
    if (listFirst) {
      const ordered = listFirst.ordered;
      const start = listFirst.start;
      const items: { text: string; checked: boolean | null }[] = [
        { text: listFirst.text, checked: listFirst.checked },
      ];
      i += 1;
      while (i < lines.length) {
        const cur = lines[i];
        if (!cur.trim()) break;
        const parsedItem = parseListLine(cur);
        if (parsedItem && parsedItem.ordered === ordered) {
          items.push({ text: parsedItem.text, checked: parsedItem.checked });
          i += 1;
          continue;
        }
        // Continuation indented line inside list item
        if (
          /^\s{2,}\S/.test(cur) &&
          !parseHeading(cur) &&
          !/^\s{0,3}(`{3,}|~{3,})/.test(cur)
        ) {
          items[items.length - 1].text += ` ${cur.trim()}`;
          i += 1;
          continue;
        }
        break;
      }
      blocks.push({ type: "list", ordered, start, items });
      continue;
    }

    // 7. Photo on its own line — consecutive photo lines merge into one figure grid
    const figure = parseFigureLine(line);
    if (figure) {
      const images = [{ alt: figure.alt, url: figure.url }];
      while (
        images.length < MD_FIG_MAX_IMAGES &&
        figure.align === "full" &&
        i + 1 < lines.length &&
        lines[i + 1].trim() !== ""
      ) {
        const next = parseFigureLine(lines[i + 1]);
        if (!next || next.kind !== "plain" || next.align !== "full") break;
        images.push({ alt: next.alt, url: next.url });
        i += 1;
      }
      blocks.push({ type: "figure", ...figure, images });
      i += 1;
      continue;
    }

    // 8. Paragraph (coalesce contiguous lines until blank line or next block opener)
    const paraLines: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i];
      if (!next.trim()) break;
      if (
        /^\s{0,3}(`{3,}|~{3,})/.test(next) ||
        parseHeading(next) ||
        isHorizontalRule(next) ||
        /^\s{0,3}>\s?/.test(next) ||
        parseListLine(next) ||
        parseFigureLine(next)
      ) {
        break;
      }
      if (
        next.includes("|") &&
        i + 1 < lines.length &&
        isTableDividerRow(lines[i + 1])
      ) {
        break;
      }
      paraLines.push(next);
      i += 1;
    }
    const paragraph = inQuote
      ? paraLines.join("\n").replace(/( {2,}|(?<!\\)\\)?\n[ \t]*/g, (_, hardBreak) => hardBreak ? "\n" : " ").split("\n")
      : paraLines;
    blocks.push({ type: "paragraph", lines: paragraph });
  }

  return blocks;
}

const KineticWord = memo<{
  word: string;
  animateIn: boolean;
}>(function KineticWord({ word, animateIn }) {
  if (!animateIn) return <>{word}</>;
  return <span className="kinetic-word">{word}</span>;
});

function renderKineticText(
  segment: string,
  keyPrefix: string,
  animateIn: boolean,
): React.ReactNode {
  if (!animateIn) return segment;
  const words = segment.match(/\S+\s*|\s+/g);
  if (!words) return segment;
  return words.map((w, idx) => (
    <KineticWord key={`${keyPrefix}-w-${idx}`} word={w} animateIn />
  ));
}

function countUnescapedSingleAsterisks(segment: string): number {
  let count = 0;
  for (let k = 0; k < segment.length; k++) {
    if (segment[k] === "\\" && k + 1 < segment.length) {
      k += 1;
      continue;
    }
    if (segment[k] === "*") {
      let run = 1;
      while (k + run < segment.length && segment[k + run] === "*") {
        run += 1;
      }
      if (run % 2 === 1) {
        count += 1;
      }
      k += run - 1;
    }
  }
  return count;
}

function findClosingMarker(
  text: string,
  from: number,
  marker: string,
  wordBoundaryUnderscore = false,
): number {
  let idx = text.indexOf(marker, from);
  while (idx !== -1) {
    if (idx > 0 && text[idx - 1] === "\\") {
      idx = text.indexOf(marker, idx + marker.length);
      continue;
    }
    if (marker === "**" && text[idx + 2] === "*") {
      // Handle `**bold with *italic***`: if an inner single `*` is open, let the first `*` close italic and close `**` at idx + 1
      const innerSlice = text.slice(from, idx);
      if (countUnescapedSingleAsterisks(innerSlice) % 2 === 1) {
        return idx + 1;
      }
    }
    if (marker === "*") {
      // Skip `**` (double asterisks for bold inside italic) so `*italic with **bold** inside*` doesn't close early
      if (text[idx + 1] === "*") {
        let run = 2;
        while (text[idx + run] === "*") run += 1;
        if (run === 2) {
          idx = text.indexOf("*", idx + 2);
          continue;
        }
        // For `***` inside `*...*`, the first two `*` close inner `**` and the 3rd `*` closes outer `*`
        return idx + run - 1;
      }
    }
    if (wordBoundaryUnderscore && marker === "_") {
      const nextCh = text[idx + 1] || "";
      if (/[a-zA-Z0-9]/.test(nextCh)) {
        idx = text.indexOf(marker, idx + 1);
        continue;
      }
    }
    return idx;
  }
  return -1;
}

function scanBalancedMarkdownLink(
  text: string,
  startIdx: number,
): { label: string; rawHref: string; endIdx: number } | null {
  if (text[startIdx] !== "[") return null;
  let depth = 0;
  let closeBracket = -1;
  for (let k = startIdx; k < text.length; k++) {
    const c = text[k];
    if (c === "\\") {
      k += 1;
      continue;
    }
    if (c === "[") depth += 1;
    else if (c === "]") {
      depth -= 1;
      if (depth === 0) {
        closeBracket = k;
        break;
      }
    }
  }
  if (closeBracket === -1 || text[closeBracket + 1] !== "(") return null;
  let parenDepth = 0;
  let closeParen = -1;
  for (let k = closeBracket + 1; k < text.length; k++) {
    const c = text[k];
    if (c === "\\") {
      k += 1;
      continue;
    }
    if (c === "(") parenDepth += 1;
    else if (c === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        closeParen = k;
        break;
      }
    } else if (c === "\n") {
      return null;
    }
  }
  if (closeParen === -1) return null;
  const label = text.slice(startIdx + 1, closeBracket);
  const inner = text.slice(closeBracket + 2, closeParen).trim();
  const rawHref = inner.replace(/\s+(?:"[^"]*"|'[^']*')\s*$/, "").trim();
  if (!rawHref) return null;
  return { label, rawHref, endIdx: closeParen + 1 };
}

function findMatchingSource(
  href: string,
  sources?: SourceItem[],
): { source?: SourceItem; citeNumber?: number } {
  if (!sources?.length) return {};
  const norm = href.replace(/\/+$/, "").toLowerCase();
  const idx = sources.findIndex(
    (s) => s.url.replace(/\/+$/, "").toLowerCase() === norm,
  );
  if (idx !== -1) {
    return { source: sources[idx], citeNumber: idx + 1 };
  }
  return {};
}

function renderInlineMarkdown(
  rawText: string,
  keyPrefix: string,
  animateIn: boolean,
  sources?: SourceItem[],
  depth = 0,
): React.ReactNode[] {
  const maxCite = sources?.length ?? 0;
  const text = flipPunctuationBeforeCitations(rawText, maxCite);
  if (depth > 4) {
    return [renderKineticText(text, keyPrefix, animateIn)];
  }
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let plainBuf = "";
  let tokIdx = 0;

  const flushPlain = () => {
    if (!plainBuf) return;
    nodes.push(
      <React.Fragment key={`${keyPrefix}-p-${tokIdx++}`}>
        {renderKineticText(plainBuf, `${keyPrefix}-p-${tokIdx}`, animateIn)}
      </React.Fragment>,
    );
    plainBuf = "";
  };

  const pushCitePreventBreak = (citeEl: React.ReactNode, keySuffix: string) => {
    if (plainBuf) {
      const m = /(\S+)[ \t]*$/.exec(plainBuf);
      if (m) {
        plainBuf = plainBuf.slice(0, m.index);
        flushPlain();
        nodes.push(
          <span key={`${keyPrefix}-${keySuffix}`} className="momo-cite-keep">
            {renderKineticText(m[1], `${keyPrefix}-${keySuffix}-w`, animateIn)}
            {citeEl}
          </span>,
        );
        return;
      }
      if (/^[ \t]+$/.test(plainBuf) && nodes.length > 0) {
        plainBuf = "";
        const prevNode = nodes.pop();
        nodes.push(
          <span key={`${keyPrefix}-${keySuffix}`} className="momo-cite-keep">
            {prevNode}
            {citeEl}
          </span>,
        );
        return;
      }
      flushPlain();
    } else if (nodes.length > 0) {
      const prevNode = nodes.pop();
      nodes.push(
        <span key={`${keyPrefix}-${keySuffix}`} className="momo-cite-keep">
          {prevNode}
          {citeEl}
        </span>,
      );
      return;
    }
    nodes.push(
      <span key={`${keyPrefix}-${keySuffix}`} className="momo-cite-keep">
        {citeEl}
      </span>,
    );
  };

  while (i < text.length) {
    const ch = text[i];

    // Escaped markdown punctuation
    if (
      ch === "\\" &&
      i + 1 < text.length &&
      /[\\`*_{}[\]()#+\-.!~|>$]/.test(text[i + 1])
    ) {
      plainBuf += text[i + 1];
      i += 2;
      continue;
    }

    // Contextual directional arrow icons (<->, ↔, ->, →, <-, ←)
    const arrowMatch = /^(?:<->|↔|->|→|<-|←)/.exec(text.slice(i));
    if (arrowMatch) {
      const sym = arrowMatch[0];
      flushPlain();
      const IconComp =
        sym === "<->" || sym === "↔"
          ? ArrowLeftRight
          : sym === "<-" || sym === "←"
            ? ArrowLeft
            : ArrowRight;
      nodes.push(
        <span
          key={`${keyPrefix}-arr-${tokIdx++}`}
          className="gu-inline-arrow"
          style={{
            display: "inline-flex",
            alignItems: "center",
            verticalAlign: "-0.14em",
            margin: "0 3px",
            opacity: 0.88,
          }}
        >
          <IconComp size="0.95em" strokeWidth={2.15} aria-hidden="true" />
        </span>,
      );
      i += sym.length;
      continue;
    }

    // Inline code `...` (absorb tight wrapper parentheses `(code)` inside the skeuo pill)
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1 && end > i + 1) {
        let codeContent = text.slice(i + 1, end);
        let nextIndex = end + 1;
        const openMatch = /\(\s*$/.exec(plainBuf);
        const closeMatch = /^\s*\)/.exec(text.slice(end + 1));
        if (openMatch && closeMatch) {
          plainBuf = plainBuf.slice(0, plainBuf.length - openMatch[0].length);
          codeContent =
            codeContent.startsWith("(") && codeContent.endsWith(")")
              ? codeContent
              : `(${codeContent})`;
          nextIndex = end + 1 + closeMatch[0].length;
        }
        flushPlain();
        nodes.push(
          <code key={`${keyPrefix}-ic-${tokIdx++}`} className="md-inline-code">
            {codeContent}
          </code>,
        );
        i = nextIndex;
        continue;
      }
    }

    // Inline / display LaTeX math ($CO_2$, $90^\circ C$, $$...$$) rendered in handwritten style
    if (ch === "$") {
      const mathMatch = scanInlineMathToken(text, i);
      if (mathMatch) {
        flushPlain();
        nodes.push(
          renderHandwrittenMath(
            mathMatch.content,
            `${keyPrefix}-math-${tokIdx++}`,
            mathMatch.display,
          ),
        );
        i = mathMatch.nextIdx;
        continue;
      }
    }

    // Image syntax ![alt](url) -> clean link/alt pill rather than broken literal "!<a..."
    if (ch === "!" && text[i + 1] === "[") {
      const scannedImg = scanBalancedMarkdownLink(text, i + 1);
      if (scannedImg) {
        const safeUrl = isSafeHref(scannedImg.rawHref);
        flushPlain();
        if (safeUrl) {
          const matched = findMatchingSource(safeUrl, sources);
          nodes.push(
            <InlineLinkWithTooltip
              key={`${keyPrefix}-img-${tokIdx++}`}
              href={safeUrl}
              source={matched.source}
              citeNumber={matched.citeNumber}
            >
              {scannedImg.label || "Gambar"}
            </InlineLinkWithTooltip>,
          );
        } else {
          plainBuf += scannedImg.label;
        }
        i = scannedImg.endIdx;
        continue;
      }
    }

    // Autolinks <https://...>
    if (ch === "<") {
      const autoMatch = /^<(https?:\/\/[^\s>]+)>/i.exec(text.slice(i));
      if (autoMatch) {
        const safeUrl = isSafeHref(autoMatch[1]);
        if (safeUrl) {
          const matched = findMatchingSource(safeUrl, sources);
          const afterEnd = i + autoMatch[0].length;
          const tailMatch = /^[.,:;!?)]+/.exec(text.slice(afterEnd));
          const tail = tailMatch ? tailMatch[0] : "";
          flushPlain();
          nodes.push(
            <InlineLinkWithTooltip
              key={`${keyPrefix}-auto-${tokIdx++}`}
              href={safeUrl}
              source={matched.source}
              citeNumber={matched.citeNumber}
              trailingPunct={tail}
            >
              {autoMatch[1].replace(/^https?:\/\/(?:www\.)?/, "").slice(0, 48)}
            </InlineLinkWithTooltip>,
          );
          i = afterEnd + tail.length;
          continue;
        }
      }
    }

    // Inline circular citation (1), (2) when verified against sources (never fake non-cited numbers)
    if (ch === "(" && maxCite > 0) {
      const prevCh = i > 0 ? text[i - 1] : "";
      const parenCite = /^\((\d{1,2})\)/.exec(text.slice(i));
      if (parenCite && !/[a-zA-Z0-9_$]/.test(prevCh)) {
        const firstNum = parseInt(parenCite[1], 10);
        const firstSrc = sources?.[firstNum - 1];
        if (firstNum >= 1 && firstNum <= maxCite && firstSrc) {
          const groupNums: number[] = [firstNum];
          let cursor = i + parenCite[0].length;
          while (cursor < text.length) {
            const ws = /^[ \t]*/.exec(text.slice(cursor))?.[0] ?? "";
            const nextStart = cursor + ws.length;
            const nextParen = /^\((\d{1,2})\)/.exec(text.slice(nextStart));
            if (nextParen) {
              const n = parseInt(nextParen[1], 10);
              if (n >= 1 && n <= maxCite && sources?.[n - 1]) {
                groupNums.push(n);
                cursor = nextStart + nextParen[0].length;
                continue;
              }
            }
            const nextBracket = /^\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/.exec(
              text.slice(nextStart),
            );
            if (
              nextBracket &&
              text[nextStart + nextBracket[0].length] !== "("
            ) {
              const parts = nextBracket[1]
                .split(",")
                .map((s) => parseInt(s.trim(), 10));
              if (
                parts.length > 0 &&
                parts.every(
                  (n) =>
                    Number.isFinite(n) &&
                    n >= 1 &&
                    n <= maxCite &&
                    Boolean(sources?.[n - 1]),
                )
              ) {
                groupNums.push(...parts);
                cursor = nextStart + nextBracket[0].length;
                continue;
              }
            }
            break;
          }
          const kIdx = tokIdx++;
          pushCitePreventBreak(
            <span className="momo-cite-tail">
              {groupNums.map((idxNum, gIdx) => (
                <CitationBadge
                  key={`${keyPrefix}-pc-${kIdx}-${gIdx}`}
                  index={idxNum}
                  source={sources?.[idxNum - 1]}
                  extraClassName={animateIn ? "kinetic-word" : ""}
                />
              ))}
            </span>,
            `pct-${kIdx}`,
          );
          i = cursor;
          continue;
        }
      }
    }

    // Links [label](url) OR verified citation [n] / [1, 2]
    if (ch === "[") {
      const scannedLink = scanBalancedMarkdownLink(text, i);
      if (scannedLink) {
        const safeUrl = isSafeHref(scannedLink.rawHref);
        const tailMatch = /^[.,:;!?)]+/.exec(text.slice(scannedLink.endIdx));
        const tail = tailMatch ? tailMatch[0] : "";
        flushPlain();
        if (safeUrl) {
          const matched = findMatchingSource(safeUrl, sources);
          nodes.push(
            <InlineLinkWithTooltip
              key={`${keyPrefix}-a-${tokIdx++}`}
              href={safeUrl}
              source={
                matched.source || { title: scannedLink.label, url: safeUrl }
              }
              citeNumber={matched.citeNumber}
              trailingPunct={tail}
            >
              {renderInlineMarkdown(
                scannedLink.label,
                `${keyPrefix}-al-${tokIdx}`,
                animateIn,
                sources,
                depth + 1,
              )}
            </InlineLinkWithTooltip>,
          );
        } else {
          nodes.push(
            <React.Fragment key={`${keyPrefix}-at-${tokIdx++}`}>
              {renderInlineMarkdown(
                scannedLink.label,
                `${keyPrefix}-atl-${tokIdx}`,
                animateIn,
                sources,
                depth + 1,
              )}
              {tail}
            </React.Fragment>,
          );
        }
        i = scannedLink.endIdx + tail.length;
        continue;
      }

      const citeGroupMatch =
        maxCite > 0
          ? /^\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/.exec(text.slice(i))
          : null;
      if (citeGroupMatch) {
        const parsedNums = citeGroupMatch[1]
          .split(",")
          .map((n) => parseInt(n.trim(), 10));
        if (
          parsedNums.length > 0 &&
          parsedNums.every(
            (n) =>
              Number.isFinite(n) &&
              n >= 1 &&
              n <= maxCite &&
              Boolean(sources?.[n - 1]),
          )
        ) {
          const nums = [...parsedNums];
          let cursor = i + citeGroupMatch[0].length;
          while (cursor < text.length) {
            const ws = /^[ \t]*/.exec(text.slice(cursor))?.[0] ?? "";
            const nextStart = cursor + ws.length;
            const nextBracket = /^\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/.exec(
              text.slice(nextStart),
            );
            if (
              nextBracket &&
              text[nextStart + nextBracket[0].length] !== "("
            ) {
              const ns = nextBracket[1]
                .split(",")
                .map((s) => parseInt(s.trim(), 10));
              if (
                ns.length > 0 &&
                ns.every(
                  (n) =>
                    Number.isFinite(n) &&
                    n >= 1 &&
                    n <= maxCite &&
                    Boolean(sources?.[n - 1]),
                )
              ) {
                nums.push(...ns);
                cursor = nextStart + nextBracket[0].length;
                continue;
              }
            }
            const nextParen = /^\((\d{1,2})\)/.exec(text.slice(nextStart));
            if (nextParen) {
              const n = parseInt(nextParen[1], 10);
              if (n >= 1 && n <= maxCite && sources?.[n - 1]) {
                nums.push(n);
                cursor = nextStart + nextParen[0].length;
                continue;
              }
            }
            break;
          }
          const kIdx = tokIdx++;
          pushCitePreventBreak(
            <span className="momo-cite-tail">
              {nums.map((idxNum, nIdx) => {
                const src = sources?.[idxNum - 1];
                return (
                  <CitationBadge
                    key={`${keyPrefix}-c-${kIdx}-${nIdx}`}
                    index={idxNum}
                    source={src}
                    extraClassName={animateIn ? "kinetic-word" : ""}
                  />
                );
              })}
            </span>,
            `ct-${kIdx}`,
          );
          i = cursor;
          continue;
        }
      }
    }

    // Bold + Italic (***text***)
    if (text.startsWith("***", i)) {
      const end = findClosingMarker(text, i + 3, "***");
      if (end !== -1 && end > i + 3) {
        flushPlain();
        nodes.push(
          <strong key={`${keyPrefix}-bi-${tokIdx++}`}>
            <em>
              {renderInlineMarkdown(
                text.slice(i + 3, end),
                `${keyPrefix}-bii-${tokIdx}`,
                animateIn,
                sources,
                depth + 1,
              )}
            </em>
          </strong>,
        );
        i = end + 3;
        continue;
      }
    }

    // Bold (**text** or __text__)
    if (text.startsWith("**", i) || text.startsWith("__", i)) {
      const marker = text.slice(i, i + 2);
      const end = findClosingMarker(text, i + 2, marker);
      if (end !== -1 && end > i + 2) {
        flushPlain();
        nodes.push(
          <strong key={`${keyPrefix}-b-${tokIdx++}`}>
            {renderInlineMarkdown(
              text.slice(i + 2, end),
              `${keyPrefix}-bi-${tokIdx}`,
              animateIn,
              sources,
              depth + 1,
            )}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    // Strikethrough (~~text~~)
    if (text.startsWith("~~", i)) {
      const end = findClosingMarker(text, i + 2, "~~");
      if (end !== -1 && end > i + 2) {
        flushPlain();
        nodes.push(
          <del key={`${keyPrefix}-del-${tokIdx++}`} className="md-del">
            {renderInlineMarkdown(
              text.slice(i + 2, end),
              `${keyPrefix}-deli-${tokIdx}`,
              animateIn,
              sources,
              depth + 1,
            )}
          </del>,
        );
        i = end + 2;
        continue;
      }
    }

    // Italic (*text* or word-bounded _text_)
    if (
      (ch === "*" && !text.startsWith("**", i)) ||
      (ch === "_" &&
        !text.startsWith("__", i) &&
        (i === 0 || !/[a-zA-Z0-9]/.test(text[i - 1])))
    ) {
      const nextCh = text[i + 1] || "";
      if (nextCh && nextCh !== "\n") {
        const end = findClosingMarker(text, i + 1, ch, ch === "_");
        const innerRaw = end !== -1 && end > i + 1 ? text.slice(i + 1, end) : "";
        const isStrictValid =
          nextCh !== " " && end !== -1 && text[end - 1] !== " ";
        const isSingleLineLenientStar =
          ch === "*" &&
          end !== -1 &&
          innerRaw.trim().length > 0 &&
          !innerRaw.includes("\n") &&
          !/^\s*\*\s*$/.test(innerRaw);
        if (end !== -1 && end > i + 1 && (isStrictValid || isSingleLineLenientStar)) {
          flushPlain();
          nodes.push(
            <em key={`${keyPrefix}-em-${tokIdx++}`}>
              {renderInlineMarkdown(
                innerRaw.trim(),
                `${keyPrefix}-emi-${tokIdx}`,
                animateIn,
                sources,
                depth + 1,
              )}
            </em>,
          );
          i = end + 1;
          continue;
        }
      }
    }

    plainBuf += ch;
    i += 1;
  }

  flushPlain();
  return nodes;
}

const MarkdownCodeBlock = memo<{ lang: string; code: string; closed: boolean }>(
  function MarkdownCodeBlock({ lang, code, closed }) {
    const isMermaid = /^mermaid$/i.test(lang.trim());
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
      return () => {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      };
    }, []);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        // Ignore clipboard denial
      }
      setCopied(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setCopied(false);
      }, 1400);
    }, [code]);

    if (isMermaid) {
      return <MermaidRenderer code={code} complete={closed} />;
    }

    return (
      <div className="md-code">
        <div className="md-code-head">
          <span className="md-code-lang">
            {lang || "code"}
            {!closed ? " ..." : ""}
          </span>
          <button
            type="button"
            className={`md-code-copy${copied ? " on" : ""}`}
            aria-label="Salin kode"
            onClick={handleCopy}
          >
            <MomoIcon name={copied ? "check" : "copy"} size={13} />
            <span>{copied ? "Tersalin" : "Salin"}</span>
          </button>
        </div>
        <pre className="md-code-pre sc">
          <code>{code}</code>
        </pre>
      </div>
    );
  },
);

function renderBlock(
  block: MdBlock,
  idx: number,
  isStreaming: boolean,
  sources?: SourceItem[],
): React.ReactNode {
  const key = `md-blk-${idx}`;

  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as "h1" | "h2" | "h3" | "h4";
      return (
        <Tag key={key} className={`md-h md-h${block.level}`}>
          {renderInlineMarkdown(block.text, key, isStreaming, sources)}
        </Tag>
      );
    }

    case "hr":
      return <hr key={key} className="md-hr" />;

    case "figure":
      // No url means the line was cut off: a placeholder while streaming, nothing once final.
      if (!block.url && !block.images.some((im) => im.url) && !isStreaming) return null;
      return (
        <MarkdownFigure
          key={key}
          alt={block.alt}
          url={block.url}
          images={block.images}
          align={block.align}
          kind={block.kind}
          sources={sources}
        />
      );

    case "code":
      return (
        <MarkdownCodeBlock
          key={key}
          lang={block.lang}
          code={block.code}
          closed={block.closed}
        />
      );

    case "blockquote":
      return (
        <blockquote key={key} className="md-quote">
          <Quote className="md-quote-mark" size={22} strokeWidth={1.5} aria-hidden="true" />
          <MarkdownBlockList
            blocks={parseMarkdownBlocks(block.lines.join("\n"), true)}
            sources={sources}
            isStreaming={isStreaming}
          />
        </blockquote>
      );

    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag
          key={key}
          className={block.ordered ? "md-ol" : "md-ul"}
          start={block.ordered && block.start !== 1 ? block.start : undefined}
        >
          {block.items.map((item, itemIdx) => (
            <li
              key={`${key}-li-${itemIdx}`}
              className={item.checked !== null ? "md-li md-task" : "md-li"}
            >
              {item.checked !== null ? (
                <span
                  className={`md-task-box${item.checked ? " on" : ""}`}
                  aria-hidden="true"
                >
                  {item.checked ? "✓" : ""}
                </span>
              ) : null}
              <span className="md-li-body">
                {renderInlineMarkdown(
                  relocateParagraphCitationsToEnd(item.text, {
                    ensureClosingPeriod: false,
                    maxCite: sources?.length ?? 0,
                  }),
                  `${key}-li-${itemIdx}`,
                  isStreaming,
                  sources,
                )}
              </span>
            </li>
          ))}
        </ListTag>
      );
    }

    case "table":
      return (
        <div key={key} className="md-table-wrap skw-well sc">
          <table className="md-table">
            <thead>
              <tr>
                {block.headers.map((h, cIdx) => (
                  <th
                    key={`${key}-th-${cIdx}`}
                    style={{ textAlign: block.alignments[cIdx] || "left" }}
                  >
                    {renderInlineMarkdown(
                      h,
                      `${key}-th-${cIdx}`,
                      isStreaming,
                      sources,
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            {block.rows.length > 0 && (
              <tbody>
                {block.rows.map((row, rIdx) => (
                  <tr key={`${key}-tr-${rIdx}`}>
                    {block.headers.map((_, cIdx) => (
                      <td
                        key={`${key}-td-${rIdx}-${cIdx}`}
                        style={{ textAlign: block.alignments[cIdx] || "left" }}
                      >
                        {renderInlineMarkdown(
                          row[cIdx] ?? "",
                          `${key}-td-${rIdx}-${cIdx}`,
                          isStreaming,
                          sources,
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      );

    case "paragraph": {
      const normalizedLines = relocateParagraphCitationsToEnd(
        block.lines.join("\n"),
        {
          ensureClosingPeriod: !isStreaming,
          maxCite: sources?.length ?? 0,
        },
      ).split("\n");
      return (
        <p key={key} className="md-p">
          {normalizedLines.map((line, lIdx) => (
            <React.Fragment key={`${key}-l-${lIdx}`}>
              {lIdx > 0 ? <br /> : null}
              {renderInlineMarkdown(
                line,
                `${key}-l-${lIdx}`,
                isStreaming,
                sources,
              )}
            </React.Fragment>
          ))}
        </p>
      );
    }
  }
}

/** Same url modulo query/hash/trailing slash — the emitted src may differ in params. */
function sameUrl(a: string, b: string | undefined): boolean {
  if (!b) return false;
  const norm = (s: string) => s.trim().replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
  return norm(a) === norm(b);
}

/** A figure is "sourced" when its photo or title traces back to one of this turn's sources. */
function matchFigureSource(url: string, title: string, sources: SourceItem[] | undefined) {
  if (!sources?.length) return undefined;
  if (url) {
    const hit = sources.find(
      (s) => sameUrl(url, s.url) || sameUrl(url, s.imageUrl) || sameUrl(url, s.articleImageUrl),
    );
    if (hit) return hit;
  }
  const t = title.trim().toLowerCase();
  if (t.length >= 8) {
    return sources.find((s) => {
      const st = s.title.trim().toLowerCase();
      return st.length >= 8 && (st.includes(t) || t.includes(st));
    });
  }
  return undefined;
}

/** Inline photo from the answer's own prose. Unverifiable or dead photos disappear. */
const MarkdownFigure = memo<{
  alt: string;
  url: string;
  images?: { alt: string; url: string }[];
  align: MdFigureAlign;
  kind?: MdFigureKind;
  sources?: SourceItem[];
}>(
  function MarkdownFigure({ alt, url, images, align, kind = "plain", sources }) {
    const [failed, setFailed] = useState<Set<number>>(new Set());
    const onFailed = useCallback((i: number) => {
      setFailed((prev) => {
        if (prev.has(i)) return prev;
        const next = new Set(prev);
        next.add(i);
        return next;
      });
    }, []);
    // Consecutive bare photo lines arrive as one block: a photo grid capped at four.
    const list = images?.length ? images : [{ alt, url }];
    const visible = list
      .map((im, i) => ({ ...im, i }))
      .filter((im) => !failed.has(im.i));
    if (!visible.length) return null;

    // "Title: description | fact | fact" — `|` segments become fact chips, or
    // timeline entries when the kind is kronologi.
    const [head, ...parts] = list[0].alt.split("|");
    const cut = /\s[—–-]\s|:\s/.exec(head);
    const title = (cut ? head.slice(0, cut.index) : head).trim();
    const desc = cut ? head.slice(cut.index + cut[0].length).trim() : "";
    const entries = parts.map((p) => p.trim()).filter(Boolean);
    const facts = kind === "kronologi" ? [] : entries.slice(0, 4);
    const chrono = kind === "kronologi" ? entries.slice(0, 5) : [];

    const photoOf = (im: { alt: string; url: string; i: number }) => {
      if (!im.url) {
        return <span className="ph is-searching" style={{ aspectRatio: "4/3" }} aria-busy="true" />;
      }
      const imTitle = im.alt.split("|")[0].split(/\s[—–-]\s|:\s/)[0].trim();
      return (
        <MistlinePhoto
          src={im.url}
          fallbackQuery={imTitle || title || undefined}
          seed={imTitle || title}
          icon="image"
          ratio="4/3"
          onFailed={() => onFailed(im.i)}
        />
      );
    };

    const linkedPhoto = (im: { alt: string; url: string; i: number }) => {
      const src = matchFigureSource(im.url, title, sources);
      const node = photoOf(im);
      return src ? (
        <a
          key={im.i}
          className="md-fig__imglink"
          href={src.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {node}
        </a>
      ) : (
        <React.Fragment key={im.i}>{node}</React.Fragment>
      );
    };

    const source = matchFigureSource(visible[0].url, title, sources);
    const host = source ? source.domain || sourceHost(source.url) : "";
    const figDesc =
      desc ||
      (source?.snippet || source?.description || "").trim().slice(0, 280);
    const isGrid = visible.length > 1;
    const cls = [
      "md-fig",
      `is-${isGrid ? "full" : align}`,
      kind !== "plain" ? `is-${kind}` : "",
      isGrid ? `is-grid is-n${Math.min(visible.length, 4)}` : "",
      !visible[0].url && !isGrid ? "is-pending" : "",
      source ? "is-linked" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <figure className={cls}>
        {isGrid ? (
          <div className={`md-fig__grid is-n${Math.min(visible.length, 4)}`}>
            {visible.map((im) => linkedPhoto(im))}
          </div>
        ) : (
          linkedPhoto(visible[0])
        )}
        {(title || chrono.length > 0) && (
          <figcaption className="md-fig__cap">
            <strong className="md-fig__title">{title}</strong>
            {figDesc && <span className="md-fig__desc">{figDesc}</span>}
            {facts.length > 0 && (
              <span className="md-fig__facts">
                {facts.map((f) => (
                  <span key={f} className="md-fig__fact">
                    {f}
                  </span>
                ))}
              </span>
            )}
            {chrono.length > 0 && (
              <span className="md-fig__chrono">
                {chrono.map((e) => (
                  <span key={e} className="md-fig__chrono-item">
                    {e}
                  </span>
                ))}
              </span>
            )}
            {source && (
              <a
                className="md-fig__meta"
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="md-fig__meta-src">{host}</span>
                {source.publishedDate && <span className="md-fig__meta-date">{sourceTime(source.publishedDate)}</span>}
                <ArrowUpRight className="md-fig__meta-ic" aria-hidden />
              </a>
            )}
          </figcaption>
        )}
      </figure>
    );
  },
);

const MarkdownBlockList = memo<{
  blocks: MdBlock[];
  sources?: SourceItem[];
  isStreaming: boolean;
}>(function MarkdownBlockList({ blocks, sources, isStreaming }) {
  return (
    <>{blocks.map((blk, idx) => renderBlock(blk, idx, isStreaming, sources))}</>
  );
});

export const MarkdownMessage = memo<MarkdownMessageProps>(
  function MarkdownMessage({ text, sources, isStreaming }) {
    const cleanText = useMemo(
      () => replaceProseEmDashes(dedupeConsecutiveParagraphs(text)),
      [text],
    );
    const blocks = useMemo(() => parseMarkdownBlocks(cleanText), [cleanText]);
    if (blocks.length === 0) return null;
    return (
      <div className="md-root">
        <MarkdownBlockList
          blocks={blocks}
          sources={sources}
          isStreaming={isStreaming}
        />
      </div>
    );
  },
);
