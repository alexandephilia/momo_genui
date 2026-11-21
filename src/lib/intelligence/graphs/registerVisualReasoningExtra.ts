/**
 * Category 03 — Remaining 15 Visual Reasoning XYFlow Graph Components
 */

import { registerIntelComponent } from "@/lib/intelligence/registry";
import { makeIntelSpec } from "@/lib/intelligence/specHelper";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import type { ComponentType } from "react";
import {
  HypothesisTree,
  ConceptMap,
  DependencyGraph,
  SystemDiagram,
  CausalGraph,
  InfluenceDiagram,
  NetworkGraph,
  EntityRelationshipMap,
  ArgumentMap,
  SequenceDiagram,
  StateMachine,
  RootCauseTree,
  FiveWhys,
  FishboneDiagram,
  FaultTree,
} from "@/components/intelligence/graphs/VisualReasoningCatalogSuite";

const gSchema = `{ title?: string; nodes: { id: string; label: string; type?: string; detail?: string; status?: string }[]; edges: { id: string; source: string; target: string; label?: string }[] }`;

export function registerVisualReasoningExtra(): void {
  const entries: Array<{
    id: string;
    desc: string;
    when: string;
    cmp: ComponentType<IntelBaseProps>;
    sample: Record<string, unknown>;
  }> = [
    {
      id: "hypothesis_tree",
      desc: "Hierarchical decomposition of hypotheses and verifiable sub-claims.",
      when: "Structuring competing hypotheses into testable sub-branches.",
      cmp: HypothesisTree,
      sample: {
        title: "Conversion Drop Root Hypothesis Tree",
        nodes: [
          { id: "h0", label: "Checkout Conversion Dropped 18%", type: "inference", status: "warning" },
          { id: "h1", label: "Mobile UI Regression", type: "premise" },
          { id: "h2", label: "Payment Gateway Timeout", type: "premise", status: "error" },
          { id: "e1", label: "Safari iOS +400ms latency", type: "evidence" },
          { id: "e2", label: "3DS webhook 504 spikes", type: "evidence", status: "error" },
        ],
        edges: [
          { id: "e1", source: "h0", target: "h1", label: "Frontend" },
          { id: "e2", source: "h0", target: "h2", label: "Backend" },
          { id: "e3", source: "h1", target: "e1", label: "Test" },
          { id: "e4", source: "h2", target: "e2", label: "Confirmed" },
        ],
      },
    },
    {
      id: "concept_map",
      desc: "Force-directed semantic map linking domain concepts.",
      when: "Explaining conceptual relationships or mental models.",
      cmp: ConceptMap,
      sample: {
        title: "Generative UI Architecture Concepts",
        nodes: [
          { id: "c1", label: "Streaming Parser", type: "concept" },
          { id: "c2", label: "Component Registry", type: "entity" },
          { id: "c3", label: "XYFlow Canvas", type: "concept" },
          { id: "c4", label: "ELK Auto-Layout", type: "attribute" },
          { id: "c5", label: "Source Provenance", type: "evidence" },
        ],
        edges: [
          { id: "e1", source: "c1", target: "c2", label: "resolves" },
          { id: "e2", source: "c2", target: "c3", label: "renders" },
          { id: "e3", source: "c3", target: "c4", label: "positions via" },
          { id: "e4", source: "c2", target: "c5", label: "binds" },
        ],
      },
    },
    {
      id: "dependency_graph",
      desc: "Directed dependency graph between modules, packages, or tasks.",
      when: "Visualizing upstream/downstream dependencies and critical paths.",
      cmp: DependencyGraph,
      sample: {
        title: "Build Task Dependency Graph",
        nodes: [
          { id: "types", label: "@momo/types", type: "process", status: "success" },
          { id: "parser", label: "stream-parser", type: "process" },
          { id: "elk", label: "elkjs-layout", type: "service" },
          { id: "studio", label: "genui-studio", type: "client", status: "active" },
        ],
        edges: [
          { id: "e1", source: "types", target: "parser", label: "imports" },
          { id: "e2", source: "types", target: "elk", label: "imports" },
          { id: "e3", source: "parser", target: "studio", label: "feeds" },
          { id: "e4", source: "elk", target: "studio", label: "positions" },
        ],
      },
    },
    {
      id: "system_diagram",
      desc: "High-level component and interaction overview.",
      when: "Explaining major system parts and how messages flow across them.",
      cmp: SystemDiagram,
      sample: {
        title: "Momo Brain Request Lifecycle",
        nodes: [
          { id: "ui", label: "Chat Client", type: "client" },
          { id: "api", label: "/api/brain", type: "gateway", status: "active" },
          { id: "llm", label: "Gemini Streaming", type: "external" },
          { id: "search", label: "Web + Image Resolver", type: "service" },
        ],
        edges: [
          { id: "e1", source: "ui", target: "api", label: "POST /chat" },
          { id: "e2", source: "api", target: "search", label: "grounding" },
          { id: "e3", source: "api", target: "llm", label: "prompt + tools" },
          { id: "e4", source: "llm", target: "ui", label: "SSE blocks" },
        ],
      },
    },
    {
      id: "causal_graph",
      desc: "Cause-and-effect graph tracing causal chains and feedback loops.",
      when: "Explaining causal drivers, bottlenecks, or systemic feedback.",
      cmp: CausalGraph,
      sample: {
        title: "API Latency Escalation Causal Graph",
        nodes: [
          { id: "n1", label: "Unindexed Query", type: "fault", status: "error" },
          { id: "n2", label: "DB CPU Saturation", type: "inference", status: "warning" },
          { id: "n3", label: "Connection Pool Exhausted", type: "fault", status: "error" },
          { id: "n4", label: "Client Retries Spike", type: "inference" },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2", label: "causes" },
          { id: "e2", source: "n2", target: "n3", label: "slows queries" },
          { id: "e3", source: "n3", target: "n4", label: "triggers 503" },
          { id: "e4", source: "n4", target: "n2", label: "amplifies load" },
        ],
      },
    },
    {
      id: "influence_diagram",
      desc: "Decision/chance/utility nodes showing factors shaping an outcome.",
      when: "Modeling variables that influence a strategic decision or KPI.",
      cmp: InfluenceDiagram,
      sample: {
        title: "Cloud Cost Influence Diagram",
        nodes: [
          { id: "d1", label: "Caching Strategy", type: "decision" },
          { id: "c1", label: "Traffic Volume", type: "inference" },
          { id: "c2", label: "DB Read Queries", type: "process" },
          { id: "u1", label: "Monthly Infra Spend", type: "outcome", status: "success" },
        ],
        edges: [
          { id: "e1", source: "d1", target: "c2", label: "reduces" },
          { id: "e2", source: "c1", target: "c2", label: "drives" },
          { id: "e3", source: "c2", target: "u1", label: "determines" },
        ],
      },
    },
    {
      id: "network_graph",
      desc: "General weighted network graph of connected nodes and clusters.",
      when: "Visualizing social, organizational, traffic, or entity networks.",
      cmp: NetworkGraph,
      sample: {
        title: "Service Mesh Communication Network",
        nodes: [
          { id: "gw", label: "Edge Proxy", type: "gateway" },
          { id: "auth", label: "Auth", type: "service" },
          { id: "users", label: "Users", type: "service" },
          { id: "billing", label: "Billing", type: "service" },
          { id: "events", label: "Kafka", type: "queue" },
        ],
        edges: [
          { id: "e1", source: "gw", target: "auth" },
          { id: "e2", source: "gw", target: "users" },
          { id: "e3", source: "users", target: "billing" },
          { id: "e4", source: "billing", target: "events" },
          { id: "e5", source: "users", target: "events" },
        ],
      },
    },
    {
      id: "entity_relationship_map",
      desc: "Structured entity-relationship graph with cardinality labels.",
      when: "Modeling domain entities, foreign keys, or conceptual data models.",
      cmp: EntityRelationshipMap,
      sample: {
        title: "Momo Persistence Entities",
        nodes: [
          { id: "thread", label: "ChatThread", type: "database", detail: "id, title, updatedAt" },
          { id: "msg", label: "Message", type: "database", detail: "id, role, blocks[]" },
          { id: "board", label: "BoardPin", type: "database", detail: "id, lane, component" },
          { id: "preset", label: "StudioPreset", type: "database", detail: "id, componentId, config" },
        ],
        edges: [
          { id: "e1", source: "thread", target: "msg", label: "1 : N" },
          { id: "e2", source: "thread", target: "board", label: "1 : N" },
          { id: "e3", source: "msg", target: "preset", label: "uses" },
        ],
      },
    },
    {
      id: "argument_map",
      desc: "Claims, supporting premises, and counter-objections mapped spatially.",
      when: "Debate analysis, policy review, or weighing arguments objectively.",
      cmp: ArgumentMap,
      sample: {
        title: "Monorepo vs Polyrepo Argument Map",
        nodes: [
          { id: "claim", label: "Adopt Monorepo with Turborepo", type: "conclusion" },
          { id: "pro1", label: "Atomic cross-package refactors", type: "premise", status: "success" },
          { id: "pro2", label: "Shared lint & TS config", type: "premise", status: "success" },
          { id: "obj1", label: "CI build times grow with repo size", type: "objection", status: "warning" },
          { id: "reb1", label: "Remote caching mitigates rebuilds", type: "evidence", status: "active" },
        ],
        edges: [
          { id: "e1", source: "pro1", target: "claim", label: "supports" },
          { id: "e2", source: "pro2", target: "claim", label: "supports" },
          { id: "e3", source: "obj1", target: "claim", label: "objects" },
          { id: "e4", source: "reb1", target: "obj1", label: "rebuts" },
        ],
      },
    },
    {
      id: "sequence_diagram",
      desc: "Interactive actor/service interaction flow rendered via XYFlow.",
      when: "Tracing OAuth handshakes, API protocols, or request-response hops.",
      cmp: SequenceDiagram,
      sample: {
        title: "OAuth2 PKCE Sequence",
        nodes: [
          { id: "browser", label: "Browser App", type: "client" },
          { id: "idp", label: "Identity Provider", type: "gateway" },
          { id: "backend", label: "Momo API", type: "service" },
        ],
        edges: [
          { id: "s1", source: "browser", target: "idp", label: "1. /authorize + challenge" },
          { id: "s2", source: "idp", target: "browser", label: "2. auth_code" },
          { id: "s3", source: "browser", target: "backend", label: "3. code + verifier" },
          { id: "s4", source: "backend", target: "idp", label: "4. /token exchange" },
        ],
      },
    },
    {
      id: "state_machine",
      desc: "Finite state machine showing valid states and guarded transitions.",
      when: "Documenting UI lifecycles, payment states, or streaming parser states.",
      cmp: StateMachine,
      sample: {
        title: "GenUI Block Lifecycle States",
        nodes: [
          { id: "idle", label: "Idle", type: "start" },
          { id: "loading", label: "Loading Skeleton", type: "process", status: "warning" },
          { id: "streaming", label: "Streaming Partial", type: "process", status: "active" },
          { id: "ready", label: "Ready / Interactive", type: "end", status: "success" },
          { id: "error", label: "Error Fallback", type: "fault", status: "error" },
        ],
        edges: [
          { id: "e1", source: "idle", target: "loading", label: "submit" },
          { id: "e2", source: "loading", target: "streaming", label: "first chunk" },
          { id: "e3", source: "streaming", target: "ready", label: "EOF" },
          { id: "e4", source: "streaming", target: "error", label: "timeout" },
        ],
      },
    },
    {
      id: "root_cause_tree",
      desc: "Top-down decomposition from symptom to contributing causes.",
      when: "Postmortem investigation or structured fault isolation.",
      cmp: RootCauseTree,
      sample: {
        title: "Stream Truncation Root Cause Tree",
        nodes: [
          { id: "top", label: "AI Response Cut Off Mid-Block", type: "fault", status: "error" },
          { id: "b1", label: "Output Token Budget Exhausted", type: "inference", status: "warning" },
          { id: "b2", label: "History Context Bloat", type: "premise" },
          { id: "r1", label: "max_tokens capped at 8192", type: "evidence" },
          { id: "r2", label: "Full UI JSON sent every turn", type: "evidence" },
        ],
        edges: [
          { id: "e1", source: "top", target: "b1" },
          { id: "e2", source: "top", target: "b2" },
          { id: "e3", source: "b1", target: "r1" },
          { id: "e4", source: "b2", target: "r2" },
        ],
      },
    },
    {
      id: "five_whys",
      desc: "Iterative 5-Whys causal chain with Interactive Graph and Narrative Chain modes.",
      when: "Drilling from a surface symptom down to the process/architectural root cause.",
      cmp: FiveWhys,
      sample: {
        title: "Why Did the Deploy Fail?",
        problem: "Production checkout returned 500 after release v2.14",
        whys: [
          { question: "Why 1?", answer: "Billing webhook handler threw NullReferenceException" },
          { question: "Why 2?", answer: "Payload lacked currency_code field for IDR invoices" },
          { question: "Why 3?", answer: "Staging mock fixture only tested USD payloads" },
          { question: "Why 4?", answer: "Contract schema validation wasn't enforced in CI" },
          { question: "Why 5?", answer: "No Zod/OpenAPI schema gate on webhook ingestion" },
        ],
        rootCause: "Missing schema validation gate + multi-currency fixtures in CI.",
      },
    },
    {
      id: "fishbone_diagram",
      desc: "Ishikawa (fishbone) diagram categorizing causes across People, Process, Tech, Infra.",
      when: "Brainstorming categorized contributors to a defect or bottleneck.",
      cmp: FishboneDiagram,
      sample: {
        title: "Slow Page Load Fishbone",
        nodes: [
          { id: "effect", label: "LCP > 4.2s", type: "fault", status: "error" },
          { id: "cat1", label: "Bundle Size", type: "inference" },
          { id: "cat2", label: "Network / API", type: "inference" },
          { id: "cat3", label: "Rendering", type: "inference" },
          { id: "c1", label: "Unshaken icon barrel", type: "premise" },
          { id: "c2", label: "Blocking waterfall queries", type: "premise" },
          { id: "c3", label: "Unoptimized hero PNGs", type: "premise" },
        ],
        edges: [
          { id: "e1", source: "c1", target: "cat1" },
          { id: "e2", source: "c2", target: "cat2" },
          { id: "e3", source: "c3", target: "cat3" },
          { id: "e4", source: "cat1", target: "effect" },
          { id: "e5", source: "cat2", target: "effect" },
          { id: "e6", source: "cat3", target: "effect" },
        ],
      },
    },
    {
      id: "fault_tree",
      desc: "Boolean gate fault tree modeling how leaf faults propagate to system failure.",
      when: "Reliability engineering, SRE failure analysis, or safety review.",
      cmp: FaultTree,
      sample: {
        title: "Region Outage Fault Tree",
        nodes: [
          { id: "top", label: "Complete API Unavailability", type: "fault", status: "error" },
          { id: "and1", label: "AND Gate: Dual AZ Failure", type: "decision" },
          { id: "f1", label: "Primary DB Failover Timeout", type: "fault" },
          { id: "f2", label: "Read Replica Stale DNS TTL", type: "fault" },
        ],
        edges: [
          { id: "e1", source: "top", target: "and1" },
          { id: "e2", source: "and1", target: "f1" },
          { id: "e3", source: "and1", target: "f2" },
        ],
      },
    },
  ];

  for (const item of entries) {
    registerIntelComponent({
      spec: makeIntelSpec({
        componentId: item.id,
        category: "visual_reasoning",
        description: item.desc,
        dataSchema: gSchema,
        interactions: { clickable: true, draggable: true, zoomable: true, pannable: true, selectable: true, fullscreen: true },
        loadingState: "shimmer",
        minHeight: 340,
        role: "img",
        phase: "P2",
        complexity: "high",
        promptSummary: item.desc,
        promptWhen: item.when,
      }),
      component: item.cmp,
      sampleData: item.sample,
    });
  }
}
