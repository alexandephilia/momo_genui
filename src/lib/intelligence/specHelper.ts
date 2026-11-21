/**
 * Helper to create valid 13-point IntelComponentSpec entries concisely
 * while guaranteeing all contract fields are complete and consistent.
 */

import type {
  IntelCategory,
  IntelComplexity,
  IntelComponentSpec,
  IntelInteraction,
  IntelPhase,
} from "./types";

interface MakeSpecInput {
  componentId: string;
  category: IntelCategory;
  secondaryCategories?: IntelCategory[];
  description: string;
  dataSchema: string;
  propsSchema?: string;
  interactions?: IntelInteraction;
  loadingState?: IntelComponentSpec["loadingState"];
  emptyState?: string;
  errorState?: string;
  mobile?: IntelComponentSpec["responsive"]["mobile"];
  minHeight?: number;
  role?: string;
  keyboardNav?: boolean;
  ariaLabel?: string;
  supportsCitations?: boolean;
  requiresSources?: boolean;
  distinguishesInference?: boolean;
  renderReadiness?: string[];
  phase?: IntelPhase;
  complexity?: IntelComplexity;
  promptSummary: string;
  promptWhen: string;
  dependsOn?: string[];
}

export function makeIntelSpec(input: MakeSpecInput): IntelComponentSpec {
  return {
    componentId: input.componentId,
    category: input.category,
    ...(input.secondaryCategories ? { secondaryCategories: input.secondaryCategories } : {}),
    description: input.description,
    dataSchema: input.dataSchema,
    propsSchema: input.propsSchema || "IntelBaseProps",
    interactions: input.interactions || { clickable: true, hoverable: true },
    loadingState: input.loadingState || "skeleton",
    emptyState: input.emptyState || `Shows centered empty state for ${input.componentId}`,
    errorState: input.errorState || `Shows alert banner with error detail for ${input.componentId}`,
    responsive: {
      compactBreakpoint: 520,
      mobile: input.mobile || "stack",
      tablet: "full",
      ...(input.minHeight ? { minHeight: input.minHeight } : {}),
    },
    accessibility: {
      role: input.role || "region",
      keyboardNav: input.keyboardNav ?? true,
      ariaLabel: input.ariaLabel || `${input.componentId.replace(/_/g, " ")} panel`,
      reducedMotion: true,
      highContrast: true,
    },
    sourceContract: {
      supportsCitations: input.supportsCitations ?? true,
      requiresSources: input.requiresSources ?? false,
      distinguishesInference: input.distinguishesInference ?? false,
    },
    renderReadiness: input.renderReadiness || ["data payload validated", "non-empty items"],
    phase: input.phase || "P2",
    complexity: input.complexity || "medium",
    promptSummary: input.promptSummary,
    promptWhen: input.promptWhen,
    ...(input.dependsOn ? { dependsOn: input.dependsOn } : {}),
    implemented: true,
  };
}
