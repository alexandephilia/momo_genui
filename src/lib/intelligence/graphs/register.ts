/**
 * Intelligence UI — Graph component registrations
 *
 * Registers all 6 XYFlow graph wrapper components with
 * their 13-point specs and realistic sample data.
 */

import { registerIntelComponent } from "@/lib/intelligence/registry";
import type { IntelComponentSpec, IntelBaseProps } from "@/lib/intelligence/types";
import type { ComponentType } from "react";

import ReasoningTree from "@/components/intelligence/graphs/ReasoningTree";
import DecisionTree from "@/components/intelligence/graphs/DecisionTree";
import KnowledgeGraph from "@/components/intelligence/graphs/KnowledgeGraph";
import ArchitectureDiagram from "@/components/intelligence/graphs/ArchitectureDiagram";
import ProcessFlow from "@/components/intelligence/graphs/ProcessFlow";
import WorkflowGraph from "@/components/intelligence/graphs/WorkflowGraph";

/* ═══════════════════ Shared spec fragments ═══════════════════ */

const graphInteractions = {
  clickable: true,
  draggable: true,
  zoomable: true,
  pannable: true,
  selectable: true,
  fullscreen: true,
  exportable: true,
  hoverable: true,
};

const graphResponsive = {
  compactBreakpoint: 480,
  mobile: "collapse" as const,
  tablet: "scroll" as const,
  minHeight: 300,
};

const graphAccessibilityBase = {
  role: "img",
  keyboardNav: true,
  reducedMotion: true,
  highContrast: false,
};

const graphSourceContract = {
  supportsCitations: false,
  requiresSources: false,
  distinguishesInference: false,
};

/* ═══════════════════ 1. Reasoning Tree ═══════════════════ */

registerIntelComponent({
  spec: {
    componentId: "reasoning_tree",
    category: "visual_reasoning",
    description: "Visualizes logical reasoning chains as a top-down tree with premise, inference, conclusion, and evidence nodes.",
    dataSchema: `{ title?: string; caption?: string; nodes: { id: string; label: string; type: "premise"|"inference"|"conclusion"|"evidence"; detail?: string; status?: string }[]; edges: { id: string; source: string; target: string; label?: string; type?: string }[] }`,
    propsSchema: "IntelBaseProps",
    interactions: graphInteractions,
    loadingState: "shimmer",
    emptyState: "Shows centered message with GitBranch icon: No reasoning data available",
    errorState: "Shows error message with GitBranch icon and data.error text",
    responsive: graphResponsive,
    accessibility: { ...graphAccessibilityBase, ariaLabel: "Reasoning tree diagram showing logical deduction steps" },
    sourceContract: { ...graphSourceContract, distinguishesInference: true },
    renderReadiness: ["nodes array is non-empty", "ELK layout computation completes"],
    phase: "P2",
    complexity: "high",
    promptSummary: "Tree diagram showing reasoning steps: premises → inferences → conclusions with supporting evidence.",
    promptWhen: "The response traces a logical argument, proof, or multi-step deduction with identifiable premises and conclusions.",
    implemented: true,
  } satisfies IntelComponentSpec,
  component: ReasoningTree as ComponentType<IntelBaseProps>,
  sampleData: {
    title: "Should we migrate to microservices?",
    nodes: [
      { id: "p1", label: "High traffic growth rate", type: "premise", detail: "Traffic doubled in 6 months", status: "active" },
      { id: "p2", label: "Monolith deploy takes 45min", type: "premise", detail: "CI/CD pipeline bottleneck", status: "warning" },
      { id: "e1", label: "Netflix case study", type: "evidence", detail: "Scaled to 1B+ users post-migration" },
      { id: "i1", label: "Current architecture won't scale", type: "inference", detail: "Based on growth trajectory" },
      { id: "i2", label: "Team velocity is decreasing", type: "inference", detail: "Merge conflicts and coupled deploys" },
      { id: "c1", label: "Migrate auth and payments first", type: "conclusion", detail: "Strangler fig pattern recommended", status: "success" },
    ],
    edges: [
      { id: "e-p1-i1", source: "p1", target: "i1", label: "supports" },
      { id: "e-p2-i2", source: "p2", target: "i2", label: "implies" },
      { id: "e-e1-i1", source: "e1", target: "i1", label: "corroborates" },
      { id: "e-i1-c1", source: "i1", target: "c1", label: "therefore" },
      { id: "e-i2-c1", source: "i2", target: "c1", label: "therefore" },
    ],
  },
});

/* ═══════════════════ 2. Decision Tree ═══════════════════ */

registerIntelComponent({
  spec: {
    componentId: "decision_tree",
    category: "visual_reasoning",
    description: "Binary/multi-way decision tree with question nodes branching via Yes/No or labeled options to outcome leaves.",
    dataSchema: `{ title?: string; caption?: string; nodes: { id: string; label: string; type: "question"|"option"|"outcome"; detail?: string; status?: string }[]; edges: { id: string; source: string; target: string; label?: string }[] }`,
    propsSchema: "IntelBaseProps",
    interactions: graphInteractions,
    loadingState: "shimmer",
    emptyState: "Shows centered message with HelpCircle icon: No decision data available",
    errorState: "Shows error message with HelpCircle icon and data.error text",
    responsive: graphResponsive,
    accessibility: { ...graphAccessibilityBase, ariaLabel: "Decision tree diagram with branching choices and outcomes" },
    sourceContract: graphSourceContract,
    renderReadiness: ["nodes array is non-empty", "ELK layout computation completes"],
    phase: "P2",
    complexity: "high",
    promptSummary: "Decision tree showing questions branching to outcomes via Yes/No or labeled paths.",
    promptWhen: "The response helps the user decide between options via a series of qualifying questions or criteria.",
    implemented: true,
  } satisfies IntelComponentSpec,
  component: DecisionTree as ComponentType<IntelBaseProps>,
  sampleData: {
    title: "Choosing a State Management Solution",
    nodes: [
      { id: "q1", label: "Is state shared across routes?", type: "question" },
      { id: "q2", label: "Need server state sync?", type: "question" },
      { id: "q3", label: "Complex derived state?", type: "question" },
      { id: "o1", label: "Use useState/useReducer", type: "outcome", detail: "Local component state suffices", status: "success" },
      { id: "o2", label: "Use TanStack Query", type: "outcome", detail: "Best for server cache management", status: "success" },
      { id: "o3", label: "Use Zustand", type: "outcome", detail: "Lightweight global store", status: "success" },
      { id: "o4", label: "Use Jotai", type: "outcome", detail: "Atomic state with derived atoms", status: "success" },
    ],
    edges: [
      { id: "e1", source: "q1", target: "o1", label: "No" },
      { id: "e2", source: "q1", target: "q2", label: "Yes" },
      { id: "e3", source: "q2", target: "o2", label: "Yes" },
      { id: "e4", source: "q2", target: "q3", label: "No" },
      { id: "e5", source: "q3", target: "o4", label: "Yes" },
      { id: "e6", source: "q3", target: "o3", label: "No" },
    ],
  },
});

/* ═══════════════════ 3. Knowledge Graph ═══════════════════ */

registerIntelComponent({
  spec: {
    componentId: "knowledge_graph",
    category: "visual_reasoning",
    description: "Entity-relationship graph with force-directed layout. Nodes represent entities, concepts, or attributes connected by labeled semantic edges.",
    dataSchema: `{ title?: string; caption?: string; nodes: { id: string; label: string; type: "entity"|"concept"|"attribute"; detail?: string }[]; edges: { id: string; source: string; target: string; label?: string; strength?: number }[] }`,
    propsSchema: "IntelBaseProps",
    interactions: graphInteractions,
    loadingState: "shimmer",
    emptyState: "Shows centered message with Share2 icon: No knowledge data available",
    errorState: "Shows error message with Share2 icon and data.error text",
    responsive: graphResponsive,
    accessibility: { ...graphAccessibilityBase, ariaLabel: "Knowledge graph showing entities and their relationships" },
    sourceContract: { ...graphSourceContract, supportsCitations: true },
    renderReadiness: ["nodes array is non-empty", "ELK force layout converges"],
    phase: "P2",
    complexity: "very_high",
    promptSummary: "Force-directed knowledge graph showing entities, concepts, and attributes with labeled relationship edges.",
    promptWhen: "The response describes interconnected entities, taxonomies, ontologies, or relationship networks.",
    implemented: true,
  } satisfies IntelComponentSpec,
  component: KnowledgeGraph as ComponentType<IntelBaseProps>,
  sampleData: {
    title: "React Ecosystem",
    nodes: [
      { id: "react", label: "React", type: "entity", detail: "UI library by Meta" },
      { id: "nextjs", label: "Next.js", type: "entity", detail: "Full-stack React framework" },
      { id: "vdom", label: "Virtual DOM", type: "concept", detail: "In-memory UI representation" },
      { id: "ssr", label: "Server-Side Rendering", type: "concept" },
      { id: "jsx", label: "JSX", type: "attribute", detail: "XML-like syntax extension" },
      { id: "hooks", label: "Hooks", type: "concept", detail: "Function component state/effects" },
      { id: "rsc", label: "React Server Components", type: "concept" },
      { id: "vercel", label: "Vercel", type: "entity", detail: "Deployment platform" },
    ],
    edges: [
      { id: "e1", source: "react", target: "vdom", label: "uses", strength: 0.9 },
      { id: "e2", source: "react", target: "jsx", label: "extends", strength: 0.8 },
      { id: "e3", source: "react", target: "hooks", label: "provides", strength: 0.9 },
      { id: "e4", source: "nextjs", target: "react", label: "built on", strength: 1.0 },
      { id: "e5", source: "nextjs", target: "ssr", label: "enables", strength: 0.8 },
      { id: "e6", source: "nextjs", target: "rsc", label: "supports", strength: 0.7 },
      { id: "e7", source: "vercel", target: "nextjs", label: "maintains", strength: 0.9 },
      { id: "e8", source: "rsc", target: "ssr", label: "extends", strength: 0.6 },
    ],
  },
});

/* ═══════════════════ 4. Architecture Diagram ═══════════════════ */

registerIntelComponent({
  spec: {
    componentId: "architecture_diagram",
    category: "visual_reasoning",
    description: "System architecture diagram with layered left-to-right layout showing services, databases, queues, gateways, and clients.",
    dataSchema: `{ title?: string; caption?: string; nodes: { id: string; label: string; type: "service"|"database"|"queue"|"gateway"|"client"; detail?: string; status?: string }[]; edges: { id: string; source: string; target: string; label?: string; animated?: boolean }[] }`,
    propsSchema: "IntelBaseProps",
    interactions: graphInteractions,
    loadingState: "shimmer",
    emptyState: "Shows centered message with Server icon: No architecture data available",
    errorState: "Shows error message with Server icon and data.error text",
    responsive: graphResponsive,
    accessibility: { ...graphAccessibilityBase, ariaLabel: "System architecture diagram showing service topology and data flows" },
    sourceContract: graphSourceContract,
    renderReadiness: ["nodes array is non-empty", "ELK layered layout completes"],
    phase: "P2",
    complexity: "high",
    replaces: "Diagram (Mermaid)",
    promptSummary: "Layered architecture diagram with services, databases, queues, gateways, and clients connected by data flow edges.",
    promptWhen: "The response describes system architecture, infrastructure topology, service interactions, or deployment layout.",
    implemented: true,
  } satisfies IntelComponentSpec,
  component: ArchitectureDiagram as ComponentType<IntelBaseProps>,
  sampleData: {
    title: "E-Commerce Platform Architecture",
    nodes: [
      { id: "client", label: "Web Client", type: "client", detail: "Next.js SPA" },
      { id: "mobile", label: "Mobile App", type: "client", detail: "React Native" },
      { id: "gw", label: "API Gateway", type: "gateway", detail: "Kong / rate limiting", status: "active" },
      { id: "auth", label: "Auth Service", type: "service", detail: "JWT + OAuth2" },
      { id: "catalog", label: "Catalog Service", type: "service", detail: "Product search and listing" },
      { id: "orders", label: "Order Service", type: "service", detail: "Order lifecycle management" },
      { id: "payments", label: "Payment Service", type: "service", detail: "Stripe integration", status: "active" },
      { id: "queue", label: "Event Bus", type: "queue", detail: "Kafka cluster" },
      { id: "db-catalog", label: "Catalog DB", type: "database", detail: "PostgreSQL" },
      { id: "db-orders", label: "Orders DB", type: "database", detail: "PostgreSQL" },
      { id: "cache", label: "Redis Cache", type: "database", detail: "Session + product cache" },
    ],
    edges: [
      { id: "e1", source: "client", target: "gw", label: "HTTPS" },
      { id: "e2", source: "mobile", target: "gw", label: "HTTPS" },
      { id: "e3", source: "gw", target: "auth", label: "verify" },
      { id: "e4", source: "gw", target: "catalog", label: "query" },
      { id: "e5", source: "gw", target: "orders", label: "submit" },
      { id: "e6", source: "orders", target: "payments", label: "charge", animated: true },
      { id: "e7", source: "orders", target: "queue", label: "emit events", animated: true },
      { id: "e8", source: "catalog", target: "db-catalog", label: "read/write" },
      { id: "e9", source: "orders", target: "db-orders", label: "read/write" },
      { id: "e10", source: "catalog", target: "cache", label: "cache" },
      { id: "e11", source: "auth", target: "cache", label: "sessions" },
    ],
  },
});

/* ═══════════════════ 5. Process Flow ═══════════════════ */

registerIntelComponent({
  spec: {
    componentId: "process_flow",
    category: "visual_reasoning",
    description: "Sequential process flowchart with start, process, decision, and end nodes in a left-to-right layered layout.",
    dataSchema: `{ title?: string; caption?: string; nodes: { id: string; label: string; type: "start"|"process"|"decision"|"end"; detail?: string; status?: string }[]; edges: { id: string; source: string; target: string; label?: string }[] }`,
    propsSchema: "IntelBaseProps",
    interactions: graphInteractions,
    loadingState: "shimmer",
    emptyState: "Shows centered message with Workflow icon: No process data available",
    errorState: "Shows error message with Workflow icon and data.error text",
    responsive: graphResponsive,
    accessibility: { ...graphAccessibilityBase, ariaLabel: "Process flow diagram showing sequential steps and decision points" },
    sourceContract: graphSourceContract,
    renderReadiness: ["nodes array is non-empty", "ELK layered layout completes"],
    phase: "P2",
    complexity: "medium",
    promptSummary: "Sequential flowchart with start, process, decision, and end nodes connected by labeled transitions.",
    promptWhen: "The response describes a business process, algorithm steps, approval workflow, or any sequential procedure with decision points.",
    implemented: true,
  } satisfies IntelComponentSpec,
  component: ProcessFlow as ComponentType<IntelBaseProps>,
  sampleData: {
    title: "Pull Request Review Process",
    nodes: [
      { id: "start", label: "PR Opened", type: "start" },
      { id: "lint", label: "Run Linter + Tests", type: "process", detail: "CI pipeline runs automatically" },
      { id: "ci-pass", label: "CI Passes?", type: "decision" },
      { id: "review", label: "Code Review", type: "process", detail: "Requires 2 approvals" },
      { id: "approved", label: "Approved?", type: "decision" },
      { id: "fix", label: "Address Feedback", type: "process", detail: "Push new commits" },
      { id: "merge", label: "Merge to main", type: "end", status: "success" },
      { id: "close", label: "PR Closed", type: "end", status: "error" },
    ],
    edges: [
      { id: "e1", source: "start", target: "lint" },
      { id: "e2", source: "lint", target: "ci-pass" },
      { id: "e3", source: "ci-pass", target: "review", label: "Yes" },
      { id: "e4", source: "ci-pass", target: "fix", label: "No" },
      { id: "e5", source: "review", target: "approved" },
      { id: "e6", source: "approved", target: "merge", label: "Yes" },
      { id: "e7", source: "approved", target: "fix", label: "No" },
      { id: "e8", source: "fix", target: "lint" },
    ],
  },
});

/* ═══════════════════ 6. Workflow Graph ═══════════════════ */

registerIntelComponent({
  spec: {
    componentId: "workflow_graph",
    category: "visual_reasoning",
    description: "Workflow graph with parallel execution, conditional branches, task nodes, and join/synchronization points.",
    dataSchema: `{ title?: string; caption?: string; direction?: "LR"|"TB"; nodes: { id: string; label: string; type: "task"|"parallel"|"condition"|"join"; detail?: string; status?: string }[]; edges: { id: string; source: string; target: string; label?: string }[] }`,
    propsSchema: "IntelBaseProps",
    interactions: graphInteractions,
    loadingState: "shimmer",
    emptyState: "Shows centered message with GitMerge icon: No workflow data available",
    errorState: "Shows error message with GitMerge icon and data.error text",
    responsive: graphResponsive,
    accessibility: { ...graphAccessibilityBase, ariaLabel: "Workflow graph showing parallel tasks, conditions, and synchronization points" },
    sourceContract: graphSourceContract,
    renderReadiness: ["nodes array is non-empty", "ELK layered layout completes"],
    phase: "P2",
    complexity: "high",
    promptSummary: "Workflow graph with parallel execution lanes, conditional branches, task nodes, and join/sync points.",
    promptWhen: "The response describes a workflow with parallel tasks, fan-out/fan-in patterns, conditional execution, or orchestration logic.",
    implemented: true,
  } satisfies IntelComponentSpec,
  component: WorkflowGraph as ComponentType<IntelBaseProps>,
  sampleData: {
    title: "CI/CD Deployment Pipeline",
    nodes: [
      { id: "trigger", label: "Git Push", type: "task", detail: "main branch" },
      { id: "fork", label: "Parallel Build", type: "parallel" },
      { id: "build-web", label: "Build Web", type: "task", detail: "Next.js build", status: "success" },
      { id: "build-api", label: "Build API", type: "task", detail: "Docker image", status: "success" },
      { id: "test-web", label: "Test Web", type: "task", detail: "Playwright e2e" },
      { id: "test-api", label: "Test API", type: "task", detail: "Integration tests" },
      { id: "join", label: "Sync", type: "join" },
      { id: "staging-check", label: "Deploy to staging?", type: "condition" },
      { id: "deploy-staging", label: "Deploy Staging", type: "task", detail: "preview.example.com" },
      { id: "deploy-prod", label: "Deploy Production", type: "task", detail: "example.com", status: "active" },
    ],
    edges: [
      { id: "e1", source: "trigger", target: "fork" },
      { id: "e2", source: "fork", target: "build-web" },
      { id: "e3", source: "fork", target: "build-api" },
      { id: "e4", source: "build-web", target: "test-web" },
      { id: "e5", source: "build-api", target: "test-api" },
      { id: "e6", source: "test-web", target: "join" },
      { id: "e7", source: "test-api", target: "join" },
      { id: "e8", source: "join", target: "staging-check" },
      { id: "e9", source: "staging-check", target: "deploy-staging", label: "Yes" },
      { id: "e10", source: "staging-check", target: "deploy-prod", label: "Skip" },
      { id: "e11", source: "deploy-staging", target: "deploy-prod" },
    ],
  },
});

/** Call this once at app startup to register all graph components */
export function registerGraphComponents(): void {
  // All registrations happen at module evaluation time above.
  // This function exists as an explicit entry point for initialization code.
}
