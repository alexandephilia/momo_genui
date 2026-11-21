/**
 * Intelligence UI — Master Registration
 *
 * Initializes all unique components across the Momo Intelligence UI Catalog.
 */

import { registerGraphComponents } from "./graphs/register";
import { registerVisualReasoningExtra } from "./graphs/registerVisualReasoningExtra";
import { registerSystemComponents } from "./graphs/registerSystem";
import { registerChartComponents } from "./charts/register";
import { registerDataExtra } from "./charts/registerDataExtra";
import { registerPanelComponents } from "./panels/register";
import { registerPanelsExtra } from "./panels/registerPanelsExtra";
import { registerActivityComponents } from "./activity/register";
import { registerActivityAndEvidenceExtra } from "./activity/registerActivityExtra";
import { registerInvestigationComponents } from "./activity/registerInvestigation";
import { registerWorkspaceAndInteractive } from "./workspace/register";
import type { IntelCategory } from "./types";

let initialized = false;

export function initializeIntelligenceUI(): void {
  if (initialized) return;
  registerGraphComponents();
  registerVisualReasoningExtra();
  registerSystemComponents();
  registerChartComponents();
  registerDataExtra();
  registerPanelComponents();
  registerPanelsExtra();
  registerActivityComponents();
  registerActivityAndEvidenceExtra();
  registerInvestigationComponents();
  registerWorkspaceAndInteractive();
  initialized = true;
}

/** Category metadata for the Studio/Playground */
export const INTEL_CATEGORIES: {
  id: IntelCategory;
  label: string;
  description: string;
}[] = [
  { id: "explanation", label: "01. Explanation", description: "Analysis, findings, and reasoning" },
  { id: "visual_reasoning", label: "02. Visual Reasoning", description: "XYFlow graphs, trees, and diagrams" },
  { id: "evidence", label: "03. Evidence & Research", description: "Sources, citations, and verification" },
  { id: "analytical", label: "04. Analytical & Decision", description: "Matrices, risks, and trade-offs" },
  { id: "data", label: "05. Data Visualization", description: "Metrics, charts, and tables" },
  { id: "system", label: "06. System & Architecture", description: "Topologies, schemas, and traces" },
  { id: "investigation", label: "07. Investigation & Monitoring", description: "Incidents, alerts, and patterns" },
  { id: "interactive", label: "08. Interactive Controls", description: "Filters, simulators, and query builders" },
  { id: "workspace", label: "09. Workspace Compositions", description: "Multi-panel intelligence suites" },
];
