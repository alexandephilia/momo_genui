import type { ReactNode } from "react";
import { ArrowLeft, ArrowLeftRight, ArrowRight } from "lucide-react";
import { CitationBadge } from "@/components/shell/CitationBadge";
import { flipPunctuationBeforeCitations } from "@/lib/citationPlacement";
import { renderHandwrittenMath, scanInlineMathToken } from "@/lib/inlineMath";
import type { SourceItem } from "@/types/momo";

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

function findClosingInlineMarker(
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
      const innerSlice = text.slice(from, idx);
      if (countUnescapedSingleAsterisks(innerSlice) % 2 === 1) {
        return idx + 1;
      }
    }
    if (marker === "*") {
      if (text[idx + 1] === "*") {
        let run = 2;
        while (text[idx + run] === "*") run += 1;
        if (run === 2) {
          idx = text.indexOf("*", idx + 2);
          continue;
        }
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

export function renderInlineMarkdown(
  rawText?: string,
  sources?: SourceItem[],
  depth = 0,
): ReactNode {
  if (!rawText) return null;
  const maxCite = sources?.length ?? 0;
  const text = flipPunctuationBeforeCitations(rawText, maxCite);
  if (depth > 4) return text;

  const nodes: ReactNode[] = [];
  let i = 0;
  let plainBuf = "";
  let keyIdx = 0;

  const flushPlain = () => {
    if (!plainBuf) return;
    nodes.push(plainBuf);
    plainBuf = "";
  };

  const attachCiteTail = (nums: number[]) => {
    const citeTail = (
      <span className="momo-cite-tail">
        {nums.map((idxNum, nIdx) => (
          <CitationBadge
            key={`md-c-${keyIdx}-${nIdx}`}
            index={idxNum}
            source={sources?.[idxNum - 1]}
          />
        ))}
      </span>
    );
    flushPlain();
    const lastIdx = nodes.length - 1;
    const prev = lastIdx >= 0 ? nodes[lastIdx] : null;
    if (typeof prev === "string") {
      const m = /(\S+)[ \t]*$/.exec(prev);
      if (m) {
        const head = prev.slice(0, m.index);
        if (head) nodes[lastIdx] = head;
        else nodes.pop();
        nodes.push(
          <span key={`md-ct-${keyIdx++}`} className="momo-cite-keep">
            {m[1]}
            {citeTail}
          </span>,
        );
        return;
      }
      if (/^[ \t]+$/.test(prev) && lastIdx > 0) {
        nodes.pop();
        const prevEl = nodes.pop();
        nodes.push(
          <span key={`md-ct-${keyIdx++}`} className="momo-cite-keep">
            {prevEl}
            {citeTail}
          </span>,
        );
        return;
      }
    } else if (prev !== null) {
      const prevEl = nodes.pop();
      nodes.push(
        <span key={`md-ct-${keyIdx++}`} className="momo-cite-keep">
          {prevEl}
          {citeTail}
        </span>,
      );
      return;
    }
    nodes.push(
      <span key={`md-ct-${keyIdx++}`} className="momo-cite-keep">
        {citeTail}
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
          key={`md-arr-${keyIdx++}`}
          className="gu-inline-arrow"
          aria-label={
            sym === "<-" || sym === "←"
              ? "ke kiri"
              : sym === "<->" || sym === "↔"
                ? "dua arah"
                : "ke kanan"
          }
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

    // Inline code `...`
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1 && end > i + 1) {
        flushPlain();
        nodes.push(
          <code
            key={`md-c-${keyIdx++}`}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.9em",
              padding: "1px 5px",
              borderRadius: 5,
              background: "color-mix(in srgb, var(--ink) 7%, transparent)",
            }}
          >
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
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
            `md-math-${keyIdx++}`,
            mathMatch.display,
          ),
        );
        i = mathMatch.nextIdx;
        continue;
      }
    }

    // Verified citation tokens (1), [1, 2]
    if ((ch === "(" || ch === "[") && maxCite > 0) {
      const prevCh = i > 0 ? text[i - 1] : "";
      if (!/[a-zA-Z0-9_$]/.test(prevCh)) {
        const citeGroupMatch =
          /^(?:\(\d{1,2}\)|\[\d{1,2}(?:\s*,\s*\d{1,2})*\])(?:[ \t]*(?:\(\d{1,2}\)|\[\d{1,2}(?:\s*,\s*\d{1,2})*\]))*/.exec(
            text.slice(i),
          );
        if (
          citeGroupMatch &&
          text[i + citeGroupMatch[0].length] !== "("
        ) {
          const token = citeGroupMatch[0];
          const nums: number[] = [];
          const numMatcher = /\d{1,2}/g;
          let nm: RegExpExecArray | null;
          let allValid = true;
          while ((nm = numMatcher.exec(token)) !== null) {
            const idxNum = parseInt(nm[0], 10);
            if (
              !Number.isFinite(idxNum) ||
              idxNum < 1 ||
              idxNum > maxCite ||
              !sources?.[idxNum - 1]
            ) {
              allValid = false;
              break;
            }
            nums.push(idxNum);
          }
          if (allValid && nums.length > 0) {
            attachCiteTail(nums);
            i += token.length;
            continue;
          }
        }
      }
    }

    // Bold + Italic (***text***)
    if (text.startsWith("***", i)) {
      const end = findClosingInlineMarker(text, i + 3, "***");
      if (end !== -1 && end > i + 3) {
        flushPlain();
        nodes.push(
          <strong
            key={`md-bi-${keyIdx++}`}
            style={{ fontWeight: 650, color: "var(--ink)" }}
          >
            <em>{renderInlineMarkdown(text.slice(i + 3, end), sources, depth + 1)}</em>
          </strong>,
        );
        i = end + 3;
        continue;
      }
    }

    // Bold (**text** or __text__)
    if (text.startsWith("**", i) || text.startsWith("__", i)) {
      const marker = text.slice(i, i + 2);
      const end = findClosingInlineMarker(text, i + 2, marker);
      if (end !== -1 && end > i + 2) {
        flushPlain();
        nodes.push(
          <strong
            key={`md-b-${keyIdx++}`}
            style={{ fontWeight: 650, color: "var(--ink)" }}
          >
            {renderInlineMarkdown(text.slice(i + 2, end), sources, depth + 1)}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    // Strikethrough (~~text~~)
    if (text.startsWith("~~", i)) {
      const end = findClosingInlineMarker(text, i + 2, "~~");
      if (end !== -1 && end > i + 2) {
        flushPlain();
        nodes.push(
          <del key={`md-del-${keyIdx++}`}>
            {renderInlineMarkdown(text.slice(i + 2, end), sources, depth + 1)}
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
        const end = findClosingInlineMarker(text, i + 1, ch, ch === "_");
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
            <em key={`md-i-${keyIdx++}`}>
              {renderInlineMarkdown(innerRaw.trim(), sources, depth + 1)}
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
  return nodes.length > 0 ? nodes : text;
}
