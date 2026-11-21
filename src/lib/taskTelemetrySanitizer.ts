/**
 * Production Telemetry & Task Label Sanitizer.
 *
 * Guarantees that internal routing infrastructure, gateway names, API key hints,
 * upstream model slugs (`openai/...`, `anthropic/...`, `google/...`), and raw
 * search provider identifiers (`exa`, `firecrawl`, `wikimedia`, `openverse`)
 * NEVER leak into user-facing task headers, thinking trees, or handwriting notes.
 */

const INTERNAL_INFRA_LEAK_RE =
  /\b(?:openui(?:\s+ai)?\s+gateway|thesys(?:_api_key)?|anthropic\/[a-z0-9._-]+|openai\/[a-z0-9._-]+|google\/gemini[a-z0-9._-]*|claude-(?:sonnet|opus|haiku)[a-z0-9._-]*|gpt-[45][a-z0-9._-]*|gemini-[23][a-z0-9._-]*|beralih\s+ke\s+cadangan|mengalihkan\s+ke)\b/i;

const TRAILING_PROVIDER_BADGE_RE =
  /\s*\((?:(?:tinyfish|exa|firecrawl|google|wikimedia|openverse|tavily|serper|brave)(?:\s*\+\s*(?:tinyfish|exa|firecrawl|google|wikimedia|openverse|tavily|serper|brave))*)\)\s*$/i;

const GOOGLE_SEARCH_PREFIX_RE = /^google\s+search\s*:\s*/i;
const MENELUSURI_GOOGLE_RE = /\bmenelusuri\s+google\s+search\b/gi;

export function sanitizePublicTaskLabel(
  raw?: string | null,
  fallback = "Memperdalam penelusuran konteks...",
): string {
  const trimmed = (raw || "").replace(/\s+/g, " ").trim();
  if (!trimmed) return "";

  if (INTERNAL_INFRA_LEAK_RE.test(trimmed)) {
    return fallback;
  }

  let cleaned = trimmed
    .replace(GOOGLE_SEARCH_PREFIX_RE, "Menelusuri web: ")
    .replace(MENELUSURI_GOOGLE_RE, "Menelusuri sumber web")
    .replace(TRAILING_PROVIDER_BADGE_RE, "")
    .trim();

  // Normalize bare counts left after stripping provider suffix, e.g. "5 hasil" -> "5 sumber relevan"
  if (/^\d+\s+hasil$/i.test(cleaned)) {
    cleaned = cleaned.replace(/hasil$/i, "sumber relevan");
  } else if (/^\d+\s+telusur$/i.test(cleaned)) {
    cleaned = cleaned.replace(/telusur$/i, "penelusuran web");
  } else if (/^\d+\s+foto$/i.test(cleaned)) {
    cleaned = `${cleaned} kontekstual`;
  }

  return cleaned;
}

export function formatContextualToolStep(
  fnName?: string,
  query?: string,
  argsPreview?: string,
): { actionLabel: string; detailText: string } {
  const cleanName = (fnName || "").trim();
  const actionLabel =
    cleanName === "web_search" || cleanName === "google_search"
      ? "Penelusuran sumber web"
      : cleanName === "search_images"
        ? "Pencarian foto kontekstual"
        : cleanName === "sync_workspace_board"
          ? "Sinkronisasi Pinboard"
          : "Verifikasi konteks";

  const rawDetail = (query || argsPreview || "").trim();
  if (
    !rawDetail ||
    /^google\s+grounding$/i.test(rawDetail) ||
    INTERNAL_INFRA_LEAK_RE.test(rawDetail)
  ) {
    return { actionLabel, detailText: "" };
  }

  return {
    actionLabel,
    detailText: sanitizePublicTaskLabel(rawDetail, ""),
  };
}

export function formatContextualReasoningBadge(effort?: string): string | null {
  if (!effort) return null;
  switch (effort) {
    case "off":
      return "Respons langsung";
    case "low":
      return "Penalaran ringkas";
    case "medium":
      return "Penalaran terukur";
    case "high":
      return "Penalaran mendalam";
    default:
      return "Penalaran kontekstual";
  }
}

/**
 * Removes leaked LLM internal scratchpad / planner blocks (e.g. `[Thought Process]`,
 * `[UI Plan]`, `[Drafting Prose]`, `[Final Verification]`, `[Execution]`,
 * `[Internal UI Plan Conclusion]`, or `Grounding Constraint:` lines) from visible
 * chat prose while keeping the real answer and `openui-lang` blocks intact.
 */
export function stripLeakedReasoningScratchpad(raw: string): string {
  if (!raw) return "";
  let out = raw;

  // 1) Strip full `[User Request] ... [Execution]` or `[Thought Process] ... [Execution]` wrapper
  out = out.replace(
    /(?:\[User Request\]|\[Thought Process\])[\s\S]*?\[Execution\]\s*/gi,
    "",
  );

  // 2) Strip `[Thought Process]` / `[UI Plan]` / `[Drafting Prose]` / `[Final Verification]` blocks if `[Execution]` was omitted
  out = out.replace(
    /\[(?:Thought Process|UI Plan|Drafting Prose|Final Verification)\][\s\S]*?(?=\n(?:```|root\s*=|\[[A-Z])|$)/gi,
    "",
  );

  // 3) Strip `[Internal UI Plan Conclusion]...` up to the actual paragraph / code block
  out = out.replace(
    /\[Internal UI Plan Conclusion\][^\n]*(?:\n(?![A-Z][^\n]{20,}|```|root\s*=)[^\n]*)*/gi,
    "",
  );

  // 4) Strip stray bracketed markers and leaked Grounding Constraint lines
  out = out.replace(/^\[(?:User Request|Execution|Internal UI Plan Conclusion)\]\s*/gim, "");
  out = out.replace(/^\s*(?:[-•*]\s*)?Grounding Constraint:[^\n]*\n?/gim, "");

  return out.replace(/\n{3,}/g, "\n\n").trimStart();
}
