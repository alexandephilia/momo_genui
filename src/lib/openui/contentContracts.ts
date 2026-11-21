type Props = Record<string, unknown>;
type ContentContract = {
  requirement: string;
  fields: string[];
  accepts: (row: unknown, props: Props) => boolean;
};

const record = (value: unknown): Props =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Props : {};
const text = (v: unknown) =>
  (typeof v === "string" && v.trim().length > 0) || (typeof v === "number" && Number.isFinite(v));
const named = (row: unknown, ...keys: string[]) => keys.some(k => text(record(row)[k]));
const chartValue = (row: Props) => row.value ?? row.count ?? row.amount ?? row.share ?? row.y;
const columnName = (c: unknown) => text(c) || named(c, "key", "label", "title", "name");

// Keep legacy field names accepted by Mistline, but never pad missing data.
const contracts: Record<string, ContentContract> = {
  CatalogShelf: {
    requirement: "items: at least one named release; include verified tracks when requested, cover optional",
    fields: ["items", "albums", "releases", "entries", "title"],
    accepts: row => named(row, "title", "name", "label"),
  },
  Chart: {
    requirement: "data: labeled points with actual numeric values; missing is not zero",
    fields: ["data", "items"],
    accepts: row => {
      const value = chartValue(record(row));
      return named(row, "label", "name", "category", "title", "x") && text(value) && Number.isFinite(Number(value));
    },
  },
  Stats: {
    requirement: "items: labeled metrics with real values",
    fields: ["items", "metrics", "stats"],
    accepts: row => named(row, "label", "title", "name") && text(record(row).value ?? record(row).metric ?? record(row).amount),
  },
  Table: {
    requirement: "columns and rows: named columns and at least one populated row",
    fields: ["rows"],
    accepts: (row, { columns }) => Array.isArray(columns) && columns.some(columnName) &&
      columns.some((c, i) => {
        if (!columnName(c)) return false;
        if (Array.isArray(row)) return text(row[i]);
        const col = record(c);
        return [c, col.key, col.label, col.title, col.name].some(k => text(k) && text(record(row)[String(k)]));
      }),
  },
  Cards: {
    requirement: "items: identifiable, named entries",
    fields: ["items", "cards"],
    accepts: row => text(row) || named(row, "title", "name", "label", "headline"),
  },
  Steps: {
    requirement: "steps: concrete ordered actions or events",
    fields: ["steps", "events", "items", "milestones"],
    accepts: row => text(row) || named(row, "title", "name", "label", "event", "milestone", "headline", "summary", "description", "date"),
  },
  Checklist: {
    requirement: "items: actionable tasks with text",
    fields: ["items", "tasks"],
    accepts: row => text(row) || named(row, "text", "title", "label", "task"),
  },
  Followups: {
    requirement: "items: concrete nonblank next questions",
    fields: ["items"],
    accepts: row => typeof row === "string" && text(row),
  },
};

export function finalContentProps(name: string, props: Props): Props | null {
  const contract = Object.hasOwn(contracts, name) ? contracts[name] : undefined;
  if (!contract) return props;
  const field = contract.fields.find(key => Array.isArray(props[key]));
  if (!field) return null;
  const list = props[field] as unknown[];
  const usable = list.filter(row => contract.accepts(row, props));
  if (!usable.length) return null;
  return usable.length === list.length ? props : { ...props, [field]: usable };
}

export function contentContractPrompt(allowed?: Set<string>) {
  return Object.entries(contracts)
    .filter(([name]) => !allowed || allowed.has(name))
    .map(([name, contract]) => `- ${name}: ${contract.requirement}.`)
    .join("\n");
}
