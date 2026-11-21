export type ModelBrandId = "nvidia" | "google" | "deepseek" | "openai";

export type ReasoningEffort = "off" | "low" | "medium" | "high";

export type ModelReasoningMode = "none" | "optional_levels" | "always_levels";

export interface MomoModelOption {
  id: string;
  brand: ModelBrandId;
  label: string;
  shortLabel: string;
  description: string;
  supportsReasoning: boolean;
  reasoningMode: ModelReasoningMode;
  reasoningLevels: ReasoningEffort[];
  defaultEffort: ReasoningEffort;
}

export const MOMO_MODEL_CATALOG: MomoModelOption[] = [
  {
    id: "gemini-3.5-flash-lite",
    brand: "google",
    label: "Gemini 3.5 Flash Lite",
    shortLabel: "3.5 Lite",
    description: "Kencang · Responsif & pikir",
    supportsReasoning: true,
    reasoningMode: "optional_levels",
    reasoningLevels: ["off", "low", "medium", "high"],
    defaultEffort: "off",
  },
  {
    id: "gemini-3.5-flash",
    brand: "google",
    label: "Gemini 3.5 Flash",
    shortLabel: "3.5 Flash",
    description: "Utama · Multimodal & mendalam",
    supportsReasoning: true,
    reasoningMode: "optional_levels",
    reasoningLevels: ["off", "low", "medium", "high"],
    defaultEffort: "off",
  },
  {
    id: "gemini-3-flash-preview",
    brand: "google",
    label: "Gemini 3 Flash",
    shortLabel: "Gemini 3",
    description: "Analitis · Penalaran kompleks",
    supportsReasoning: true,
    reasoningMode: "optional_levels",
    reasoningLevels: ["off", "low", "medium", "high"],
    defaultEffort: "off",
  },
];

export function normalizeReasoningEffort(
  meta: MomoModelOption,
  requested?: ReasoningEffort | boolean | null
): ReasoningEffort {
  if (meta.reasoningMode === "none" || meta.reasoningLevels.length === 0) {
    return "off";
  }
  if (typeof requested === "boolean") {
    return requested
      ? meta.defaultEffort === "off"
        ? "medium"
        : meta.defaultEffort
      : meta.reasoningLevels.includes("off")
        ? "off"
        : meta.defaultEffort;
  }
  if (requested && meta.reasoningLevels.includes(requested)) {
    return requested;
  }
  return meta.defaultEffort;
}

export function resolveModelMeta(modelId?: string | null): MomoModelOption {
  const clean = (modelId || "").trim().replace(/^google\//i, "");
  const matched = MOMO_MODEL_CATALOG.find((m) => m.id === clean);
  if (matched) return matched;
  if (clean === "gemini-flash-lite-latest") {
    return {
      ...MOMO_MODEL_CATALOG[0],
      id: clean,
    };
  }
  if (/pro|gpt-5|claude/i.test(clean)) {
    return MOMO_MODEL_CATALOG[2] ?? MOMO_MODEL_CATALOG[0];
  }
  if (/flash/i.test(clean) && !/lite/i.test(clean)) {
    return MOMO_MODEL_CATALOG[1] ?? MOMO_MODEL_CATALOG[0];
  }
  return MOMO_MODEL_CATALOG[0];
}
