export type MdFigureAlign = "left" | "right" | "full";
export type MdFigureKind = "plain" | "summary" | "kronologi";

export const MD_FIG_MAX_IMAGES = 4;

/**
 * A photo on its own line: `![Title: description](url "left")`. With a side it is a small
 * indented inset between paragraphs, thumbnail on that side and the description beside it;
 * without one the photo is a full-width block. The title attribute can add a kind token
 * after the side — `"left summary"` keeps the photo inset with a roomier summary caption,
 * `"kronologi"` turns `|`-separated alt entries into a mini timeline. A line that has
 * started as an image but is still streaming parses with an empty url and renders as a
 * placeholder.
 */
export function parseFigureLine(line: string): {
  alt: string;
  url: string;
  align: MdFigureAlign;
  kind: MdFigureKind;
} | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("![")) return null;
  const done = /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+["']([^"']*)["'])?\s*\)$/.exec(trimmed);
  if (done) {
    const side = (done[3] ?? "").toLowerCase();
    const align: MdFigureAlign = /\b(?:left|kiri)\b/.test(side)
      ? "left"
      : /\b(?:right|kanan)\b/.test(side)
        ? "right"
        : "full";
    const kind: MdFigureKind = /\b(?:kronologi|chrono|timeline)\b/.test(side)
      ? "kronologi"
      : /\b(?:summary|ringkasan)\b/.test(side)
        ? "summary"
        : "plain";
    return { alt: done[1].trim(), url: done[2], align, kind };
  }
  const partial = /^!\[([^\]]*)(?:\]\([^)]*)?$/.exec(trimmed);
  return partial ? { alt: partial[1].trim(), url: "", align: "full", kind: "plain" } : null;
}
