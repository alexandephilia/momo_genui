import type { ReactNode } from "react";

const LATEX_SYMBOLS: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  phi: "φ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
  approx: "≈",
  sim: "∼",
  simeq: "≃",
  equiv: "≡",
  neq: "≠",
  ne: "≠",
  leq: "≤",
  le: "≤",
  geq: "≥",
  ge: "≥",
  pm: "±",
  mp: "∓",
  times: "×",
  cdot: "·",
  div: "÷",
  circ: "°",
  degree: "°",
  infty: "∞",
  propto: "∝",
  partial: "∂",
  nabla: "∇",
  sum: "∑",
  prod: "∏",
  int: "∫",
  rightarrow: "→",
  to: "→",
  leftarrow: "←",
  leftrightarrow: "↔",
  Rightarrow: "⇒",
  Leftarrow: "⇐",
  Leftrightarrow: "⇔",
  forall: "∀",
  exists: "∃",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  subseteq: "⊆",
  cup: "∪",
  cap: "∩",
  emptyset: "∅",
  dots: "…",
  ldots: "…",
  cdots: "⋯",
  quad: " ",
  qquad: "  ",
};

const TEXT_WRAPPERS = new Set([
  "text",
  "mathrm",
  "mathbf",
  "mathit",
  "mathsf",
  "texttt",
  "operatorname",
  "ce",
  "rm",
  "bf",
]);

function readBracedGroup(src: string, openIdx: number): { content: string; nextIdx: number } | null {
  if (src[openIdx] !== "{") return null;
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === "\\" && i + 1 < src.length) {
      i += 1;
      continue;
    }
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        return { content: src.slice(openIdx + 1, i), nextIdx: i + 1 };
      }
    }
  }
  return null;
}

export interface MathTokenMatch {
  content: string;
  nextIdx: number;
  display: boolean;
}

/**
 * Scans inline `$...$` or display `$$...$$` LaTeX math while strictly guarding
 * against currency ranges like `$5 sampai $12` or `$5-$12`.
 */
export function scanInlineMathToken(text: string, start: number): MathTokenMatch | null {
  if (text[start] !== "$") return null;
  if (start > 0 && text[start - 1] === "\\") return null;

  // Display math $$...$$
  if (text[start + 1] === "$") {
    let end = text.indexOf("$$", start + 2);
    while (end !== -1 && text[end - 1] === "\\") {
      end = text.indexOf("$$", end + 2);
    }
    if (end === -1) return null;
    const raw = text.slice(start + 2, end).trim();
    if (!raw) return null;
    return { content: raw, nextIdx: end + 2, display: true };
  }

  // Inline math $...$
  const firstCh = text[start + 1];
  if (!firstCh || /\s/.test(firstCh)) return null;

  let end = -1;
  for (let j = start + 1; j < text.length; j++) {
    if (text[j] === "\n") return null;
    if (text[j] === "\\" && j + 1 < text.length) {
      j += 1;
      continue;
    }
    if (text[j] === "$") {
      if (text[j + 1] === "$") return null;
      end = j;
      break;
    }
  }
  if (end === -1 || end <= start + 1) return null;

  // Closing $ must not be preceded by whitespace or immediately followed by a digit (currency guard)
  if (/\s/.test(text[end - 1])) return null;
  if (end + 1 < text.length && /\d/.test(text[end + 1])) return null;

  const inner = text.slice(start + 1, end);

  // Reject plain numeric currency values like `$5`, `$12.50`, `$1,000`, or prose sentences between two prices
  if (/^\d+(?:[.,]\d+)?(?:\s*[kKmMbB])?$/.test(inner)) return null;
  if (/^\d+(?:[.,]\d+)?\s+[a-zA-Z]{2,}/.test(inner) && !/[_^\\=<>+\-*/]/.test(inner)) {
    return null;
  }

  // Must contain a genuine math/chemistry cue (sub/sup/command/operator) or a compact formula/variable
  const hasMathCue = /[_^\\=<>+\-*/~±×÷≈≤≥°]/.test(inner);
  const isCompactSymbol = /^[A-Za-z][A-Za-z0-9]{0,5}$/.test(inner);
  if (!hasMathCue && !isCompactSymbol) return null;

  return { content: inner, nextIdx: end + 1, display: false };
}

function renderMathNodes(raw: string, keyPrefix: string, depth = 0): ReactNode[] {
  if (depth > 6) return [raw];
  const out: ReactNode[] = [];
  let buf = "";
  let i = 0;
  let k = 0;

  const flush = () => {
    if (!buf) return;
    out.push(buf);
    buf = "";
  };

  while (i < raw.length) {
    const ch = raw[i];

    // Special degree superscript: ^\circ or ^{\circ} -> °
    if (ch === "^") {
      const rest = raw.slice(i + 1);
      const degMatch = /^(?:\\circ\b|\{\s*\\circ\s*\})/.exec(rest);
      if (degMatch) {
        buf += "°";
        i += 1 + degMatch[0].length;
        if (raw[i] === " " && /[CF]\b/.test(raw.slice(i + 1))) {
          i += 1;
        }
        continue;
      }
    }

    // Subscript _ or Superscript ^
    if ((ch === "_" || ch === "^") && i + 1 < raw.length) {
      const Tag = ch === "_" ? "sub" : "sup";
      let content = "";
      let nextIdx = i + 1;
      if (raw[i + 1] === "{") {
        const grp = readBracedGroup(raw, i + 1);
        if (grp) {
          content = grp.content;
          nextIdx = grp.nextIdx;
        }
      } else if (raw[i + 1] === "\\") {
        const cmd = /^\\([A-Za-z]+)/.exec(raw.slice(i + 1));
        if (cmd) {
          content = cmd[0];
          nextIdx = i + 1 + cmd[0].length;
        }
      } else {
        content = raw[i + 1];
        nextIdx = i + 2;
      }
      if (content) {
        flush();
        out.push(
          <Tag key={`${keyPrefix}-${Tag}-${k++}`} className={`md-math-${Tag}`}>
            {renderMathNodes(content, `${keyPrefix}-${Tag}-${k}`, depth + 1)}
          </Tag>,
        );
        i = nextIdx;
        continue;
      }
    }

    // LaTeX commands \...
    if (ch === "\\" && i + 1 < raw.length) {
      const nextCh = raw[i + 1];
      if (nextCh === "%" || nextCh === "$" || nextCh === "_" || nextCh === "{" || nextCh === "}" || nextCh === "&") {
        buf += nextCh;
        i += 2;
        continue;
      }
      if (nextCh === "," || nextCh === ";" || nextCh === ":" || nextCh === " ") {
        buf += " ";
        i += 2;
        continue;
      }
      if (nextCh === "!") {
        i += 2;
        continue;
      }
      const cmdMatch = /^\\([A-Za-z]+)/.exec(raw.slice(i));
      if (cmdMatch) {
        const name = cmdMatch[1];
        const afterCmd = i + cmdMatch[0].length;

        if (name === "frac" || name === "dfrac" || name === "tfrac") {
          const numGrp = readBracedGroup(raw, afterCmd);
          const denGrp = numGrp ? readBracedGroup(raw, numGrp.nextIdx) : null;
          if (numGrp && denGrp) {
            flush();
            out.push(
              <span key={`${keyPrefix}-fr-${k++}`} className="md-math-frac">
                <sup className="md-math-sup">
                  {renderMathNodes(numGrp.content, `${keyPrefix}-fn-${k}`, depth + 1)}
                </sup>
                <span className="md-math-slash">/</span>
                <sub className="md-math-sub">
                  {renderMathNodes(denGrp.content, `${keyPrefix}-fd-${k}`, depth + 1)}
                </sub>
              </span>,
            );
            i = denGrp.nextIdx;
            continue;
          }
        }

        if (name === "sqrt") {
          const grp = readBracedGroup(raw, afterCmd);
          if (grp) {
            flush();
            out.push(
              <span key={`${keyPrefix}-sq-${k++}`} className="md-math-sqrt">
                √({renderMathNodes(grp.content, `${keyPrefix}-sqi-${k}`, depth + 1)})
              </span>,
            );
            i = grp.nextIdx;
            continue;
          }
        }

        if (TEXT_WRAPPERS.has(name)) {
          const grp = readBracedGroup(raw, afterCmd);
          if (grp) {
            flush();
            out.push(
              <span key={`${keyPrefix}-tx-${k++}`}>
                {renderMathNodes(grp.content, `${keyPrefix}-txi-${k}`, depth + 1)}
              </span>,
            );
            i = grp.nextIdx;
            continue;
          }
        }

        if (name in LATEX_SYMBOLS) {
          buf += LATEX_SYMBOLS[name];
          i = afterCmd;
          continue;
        }

        // Ignore formatting-only directives like \left, \right, \displaystyle
        if (name === "left" || name === "right" || name === "displaystyle" || name === "textstyle") {
          i = afterCmd;
          continue;
        }
      }
    }

    // Stray grouping braces inside math
    if (ch === "{" || ch === "}") {
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }

  flush();
  return out;
}

export function renderHandwrittenMath(
  content: string,
  key: string,
  display = false,
): ReactNode {
  return (
    <span
      key={key}
      className={display ? "md-math is-block" : "md-math"}
    >
      {renderMathNodes(content, key)}
    </span>
  );
}
