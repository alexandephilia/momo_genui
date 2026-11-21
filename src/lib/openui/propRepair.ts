import { MOMO_LEAF_COMPONENT_DEFS } from "./momoSchema";

type Props = Record<string, unknown>;
type SlotKind = { type: string; options?: string[] };

const URL_PROPS = new Set(["src", "image", "imageUrl", "cover", "photo"]);
const ITEM_IMAGE_ALIASES = ["imageUrl", "photo", "img", "thumbnail", "picture"];
const isUrl = (v: string) => /^(?:https?:\/\/|\/api\/image)/i.test(v.trim());

function slotKind(schema: unknown): SlotKind {
  let cur = schema as { def?: { type?: string; innerType?: unknown; entries?: Record<string, unknown> }; options?: unknown };
  for (let i = 0; i < 4; i++) {
    const t = cur?.def?.type;
    if ((t === "optional" || t === "nullable" || t === "default") && cur.def?.innerType) {
      cur = cur.def.innerType as typeof cur;
    } else break;
  }
  const type = cur?.def?.type || "any";
  const options = Array.isArray(cur?.options)
    ? (cur.options as unknown[]).map(String)
    : cur?.def?.entries
      ? Object.keys(cur.def.entries)
      : undefined;
  return { type, options };
}

const SLOT_ORDER = new Map<string, Array<[string, SlotKind]>>(
  MOMO_LEAF_COMPONENT_DEFS.map((def) => [
    def.name,
    Object.entries(def.props.shape as Record<string, unknown>).map(
      ([key, schema]) => [key, slotKind(schema)] as [string, SlotKind],
    ),
  ]),
);

const empty = (v: unknown) => v === undefined || v === null || v === "";
const CHART_COMPONENTS = new Set([
  "Chart", "PieChart", "BarChart", "LineChart", "AreaChart", "RadarChart",
  // Intel charts — same string-number row repair on their own field names.
  "MetricGroup", "HorizontalBarChart", "ScatterPlot", "BubbleChart", "Treemap",
  "Histogram", "BoxPlot", "FunnelChart", "WaterfallChart", "OutlierHighlight",
  "TrendAnalysis", "DistributionAnalysis", "ForecastChart", "AllocationChart",
  "StackedBarChart", "DonutChart",
]);

/** "12%", "Rp 6.000.000", "1,5" → number. Returns undefined when the text is not one plain number. */
function parseLooseNumber(raw: string): number | undefined {
  const bare = raw.replace(/^(?:rp\.?|idr|usd|\$|€|£)\s*/i, "").replace(/\s*(?:%|persen|idr)$/i, "").trim();
  if (!/^-?\d[\d.,]*$/.test(bare)) return undefined;
  const normalized = /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(bare)
    ? bare.replace(/\./g, "").replace(",", ".")
    : /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(bare)
      ? bare.replace(/,/g, "")
      : bare.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

const keyOf = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * Table rows written as objects only render when their keys equal the column names exactly.
 * Models often key them in another case or style ("Harga Resmi" vs `harga_resmi`), which
 * leaves every cell blank. Re-key such rows to the declared columns; returns null if unchanged.
 */
function repairTableRows(props: Props): unknown[] | null {
  if (!Array.isArray(props.columns) || !Array.isArray(props.rows)) return null;
  const columns = props.columns.map((c) => {
    if (c && typeof c === "object") {
      const col = c as Props;
      return [col.key, col.label, col.title, col.name].filter((k) => !empty(k)).map(String);
    }
    return [String(c)];
  });
  let changed = false;
  const rows = props.rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    const r = row as Props;
    if (Array.isArray(r.cells)) {
      changed = true;
      return r.cells;
    }
    if (columns.some((names) => names.some((n) => !empty(r[n])))) return row;
    const byKey = new Map(Object.entries(r).map(([k, v]) => [keyOf(k), v]));
    const matched = columns.map((names) => names.map((n) => byKey.get(keyOf(n))).find((v) => !empty(v)));
    const values = Object.values(r);
    const cells = matched.some((v) => !empty(v))
      ? matched
      : values.length === columns.length
        ? values
        : null;
    if (!cells) return row;
    changed = true;
    return cells.map((v) => v ?? "");
  });
  return changed ? rows : null;
}

/** Does a string value belong in this slot? Partial enum words still streaming in count as fitting. */
function fits(key: string, kind: SlotKind, value: string): boolean {
  const v = value.trim();
  if (kind.type === "enum" && kind.options) {
    // Only a sentence is evidence of a shifted argument. A single unknown word ("info", "split")
    // is an off-list option the component already falls back from.
    if (!/\s/.test(v) && v.length <= 24) return true;
    const lower = v.toLowerCase();
    return kind.options.some((o) => o.toLowerCase().startsWith(lower));
  }
  if (URL_PROPS.has(key)) return isUrl(v) || v.startsWith("data:");
  if (key === "imageQuery") return !isUrl(v);
  return true;
}

/**
 * OpenUI Lang arguments are positional. When the model skips an optional slot, every later
 * value lands one slot early: a verdict sentence in an enum `variant`, a photo URL in
 * `imageQuery`, a tip in `src`. Those values then render nowhere. Move each misplaced string
 * to the next slot that accepts it, and accept the common `imageUrl` spelling on list items.
 */
export function repairOpenUiProps(name: string, props: Props): Props {
  let next = props;
  const slots = SLOT_ORDER.get(name);

  if (slots) {
    const displaced: Array<{ from: number; value: string }> = [];
    slots.forEach(([key, kind], idx) => {
      const value = next[key];
      if (typeof value !== "string" || !value.trim() || fits(key, kind, value)) return;
      if (next === props) next = { ...props };
      displaced.push({ from: idx, value });
      delete next[key];
    });
    for (const { from, value } of displaced) {
      const wantsUrlSlot = isUrl(value);
      const target = slots.find(([key, kind], idx) => {
        if (!empty(next[key])) return false;
        if (wantsUrlSlot) return URL_PROPS.has(key);
        return (
          idx > from &&
          kind.type === "string" &&
          !URL_PROPS.has(key) &&
          key !== "imageQuery"
        );
      });
      if (target) next[target[0]] = value;
      // Short text in a photo slot with nowhere else to go is a photo query.
      else if (!wantsUrlSlot && URL_PROPS.has(slots[from][0]) && value.length <= 80 && empty(next.imageQuery) && slots.some(([key]) => key === "imageQuery")) {
        next.imageQuery = value;
      }
    }
  }

  if (CHART_COMPONENTS.has(name)) {
    for (const field of ["data", "items", "points", "slices", "metrics", "stages", "allocations", "bins", "steps", "buckets", "groups"]) {
      const list = next[field];
      if (!Array.isArray(list)) continue;
      let changed = false;
      const rows = list.map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return row;
        const r = row as Props;
        const key = ["value", "count", "amount", "share", "y", "size", "delta", "frequency", "x", "z", "actual", "forecast", "upper", "median"].find((k) => typeof r[k] === "string");
        const parsed = key ? parseLooseNumber(r[key] as string) : undefined;
        if (!key || parsed === undefined) return row;
        changed = true;
        return { ...r, [key]: parsed };
      });
      if (changed) next = { ...next, [field]: rows };
    }
  }

  if (name === "Table" || name === "DataTable") {
    const rows = repairTableRows(next);
    if (rows) next = { ...next, rows };
  }
  if (name === "Followups" && Array.isArray(next.items)) {
    const items = next.items.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return row;
      const r = row as Props;
      return r.text ?? r.label ?? r.question ?? r.title ?? r.prompt ?? row;
    });
    if (items.some((row, i) => row !== (next.items as unknown[])[i])) next = { ...next, items };
  }

  for (const [key, value] of Object.entries(next)) {
    if (!Array.isArray(value)) continue;
    let changed = false;
    const items = value.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return row;
      const item = row as Props;
      if (!empty(item.image)) return row;
      const alias = ITEM_IMAGE_ALIASES.find(
        (a) => typeof item[a] === "string" && isUrl(item[a] as string),
      );
      if (!alias) return row;
      changed = true;
      return { ...item, image: item[alias] };
    });
    if (changed) {
      if (next === props) next = { ...props };
      next[key] = items;
    }
  }
  return next;
}
