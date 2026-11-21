const SOURCE_DAY = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
const SOURCE_YEAR = new Intl.DateTimeFormat("id-ID", { year: "numeric", timeZone: "Asia/Jakarta" });

/** Hostname without `www.` — empty string when the url cannot be parsed. */
export function sourceHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

/** "22 Nov" or "22 Nov 2024" — the year only shows when it differs from the current one. */
export function sourceTime(raw: string): string {
  const t = raw.trim();
  if (!/\d{4}/.test(t) && !t.includes("T")) return raw;
  const ms = Date.parse(t);
  if (Number.isNaN(ms)) return raw;
  const d = new Date(ms);
  const base = SOURCE_DAY.format(d);
  return SOURCE_YEAR.format(d) === SOURCE_YEAR.format(new Date()) ? base : `${base} ${SOURCE_YEAR.format(d)}`;
}
