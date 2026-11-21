/**
 * Category 07 — System & Architecture Intelligence UI (All 18 Components)
 */

import { registerIntelComponent } from "@/lib/intelligence/registry";
import { makeIntelSpec } from "@/lib/intelligence/specHelper";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import type { ComponentType } from "react";
import {
  SystemArchitecture,
  ServiceMap,
  ComponentDependencyMap,
  ApiFlowDiagram,
  DataFlowDiagram,
  InfrastructureMap,
  DatabaseSchemaMap,
  EventFlowDiagram,
  IntegrationMap,
  PermissionMap,
  SecurityBoundaryMap,
  AttackSurfaceMap,
  SequenceFlow,
  ErrorPropagationGraph,
  CodeDependencyGraph,
  DeploymentTopology,
  RuntimeInspector,
  PerformanceBreakdown,
} from "@/components/intelligence/graphs/SystemCatalogSuite";

const gSchema = `{ title?: string; nodes: { id: string; label: string; type?: string; detail?: string; status?: string }[]; edges: { id: string; source: string; target: string; label?: string; animated?: boolean }[] }`;

export function registerSystemComponents(): void {
  const graphEntries: Array<{
    id: string;
    desc: string;
    when: string;
    cmp: ComponentType<IntelBaseProps>;
    sample: Record<string, unknown>;
  }> = [
    {
      id: "system_architecture",
      desc: "Overall multi-tier system architecture across edge, compute, and persistence.",
      when: "Explaining end-to-end architecture of an application or platform.",
      cmp: SystemArchitecture,
      sample: {
        title: "Momo Full-Stack Architecture",
        nodes: [
          { id: "web", label: "Next.js 16 Client", type: "client", status: "active" },
          { id: "edge", label: "API Route Layer", type: "gateway", detail: "/api/brain SSE stream" },
          { id: "orch", label: "Catalog Orchestrator", type: "service", detail: "200+ GenUI specs" },
          { id: "search", label: "Exa / Firecrawl Search", type: "external" },
          { id: "store", label: "Client Store + Local Presets", type: "database" },
        ],
        edges: [
          { id: "e1", source: "web", target: "edge", label: "stream" },
          { id: "e2", source: "edge", target: "orch", label: "resolve" },
          { id: "e3", source: "edge", target: "search", label: "ground" },
          { id: "e4", source: "web", target: "store", label: "persist" },
        ],
      },
    },
    {
      id: "service_map",
      desc: "Microservice topology map showing live health and inter-service calls.",
      when: "Inspecting microservice communication and service ownership.",
      cmp: ServiceMap,
      sample: {
        title: "Production Service Mesh",
        nodes: [
          { id: "ingress", label: "Ingress Proxy", type: "gateway", status: "active" },
          { id: "chat", label: "chat-svc", type: "service", status: "active" },
          { id: "media", label: "media-resolver", type: "service", status: "warning" },
          { id: "geo", label: "geocode-svc", type: "service", status: "active" },
        ],
        edges: [
          { id: "e1", source: "ingress", target: "chat", label: "1.4k rps" },
          { id: "e2", source: "chat", target: "media", label: "gRPC" },
          { id: "e3", source: "chat", target: "geo", label: "REST" },
        ],
      },
    },
    {
      id: "component_dependency_map",
      desc: "UI or library component dependency relationships.",
      when: "Mapping how React components or SDK modules compose together.",
      cmp: ComponentDependencyMap,
      sample: {
        title: "Playground Studio Dependencies",
        nodes: [
          { id: "pg", label: "/playground Page", type: "client" },
          { id: "dk", label: "DialKit Adapter", type: "process" },
          { id: "reg", label: "Intel Registry", type: "database" },
          { id: "graph", label: "IntelligenceGraph", type: "service" },
        ],
        edges: [
          { id: "e1", source: "pg", target: "dk", label: "live controls" },
          { id: "e2", source: "pg", target: "reg", label: "lookup" },
          { id: "e3", source: "reg", target: "graph", label: "renders" },
        ],
      },
    },
    {
      id: "api_flow_diagram",
      desc: "Request validation, auth middleware, handler, and response flow.",
      when: "Tracing REST/GraphQL/RPC endpoints through backend middleware.",
      cmp: ApiFlowDiagram,
      sample: {
        title: "POST /api/brain Request Pipeline",
        nodes: [
          { id: "req", label: "HTTPS Request", type: "client" },
          { id: "ratelimit", label: "Rate Limiter", type: "gateway" },
          { id: "trim", label: "History Compressor", type: "process" },
          { id: "model", label: "Gemini Upstream", type: "external", animated: true },
        ],
        edges: [
          { id: "e1", source: "req", target: "ratelimit", label: "validate" },
          { id: "e2", source: "ratelimit", target: "trim", label: "compress" },
          { id: "e3", source: "trim", target: "model", label: "16k budget" },
        ],
      },
    },
    {
      id: "data_flow_diagram",
      desc: "Data movement from ingestion sources through transforms to sinks.",
      when: "Documenting ETL pipelines, telemetry streams, or analytics flows.",
      cmp: DataFlowDiagram,
      sample: {
        title: "Telemetry Ingestion DFD",
        nodes: [
          { id: "sdk", label: "Client Events", type: "client" },
          { id: "kafka", label: "Kafka Topic", type: "queue" },
          { id: "flink", label: "Stream Aggregator", type: "process" },
          { id: "ch", label: "ClickHouse", type: "database" },
        ],
        edges: [
          { id: "e1", source: "sdk", target: "kafka", label: "batch", animated: true },
          { id: "e2", source: "kafka", target: "flink", label: "consume", animated: true },
          { id: "e3", source: "flink", target: "ch", label: "10s flush" },
        ],
      },
    },
    {
      id: "infrastructure_map",
      desc: "Cloud infrastructure topology across VPC, compute nodes, and storage.",
      when: "Visualizing cloud resources, subnets, and managed databases.",
      cmp: InfrastructureMap,
      sample: {
        title: "ap-southeast-1 Cloud Topology",
        nodes: [
          { id: "cf", label: "Cloudflare CDN", type: "gateway" },
          { id: "alb", label: "Application LB", type: "gateway" },
          { id: "ecs", label: "ECS Fargate Tasks", type: "service", status: "active" },
          { id: "rds", label: "RDS PostgreSQL Multi-AZ", type: "database" },
        ],
        edges: [
          { id: "e1", source: "cf", target: "alb", label: "TLS 1.3" },
          { id: "e2", source: "alb", target: "ecs", label: "targets" },
          { id: "e3", source: "ecs", target: "rds", label: "pg-pool" },
        ],
      },
    },
    {
      id: "database_schema_map",
      desc: "Interactive relational/document schema table relationship map.",
      when: "Inspecting tables, primary/foreign keys, and join paths.",
      cmp: DatabaseSchemaMap,
      sample: {
        title: "Analytics Schema Map",
        nodes: [
          { id: "users", label: "users (id PK, org_id)", type: "database" },
          { id: "orgs", label: "organizations (id PK, plan)", type: "database" },
          { id: "sessions", label: "sessions (id PK, user_id FK)", type: "database" },
          { id: "events", label: "events (id PK, session_id FK)", type: "database" },
        ],
        edges: [
          { id: "e1", source: "orgs", target: "users", label: "1:N" },
          { id: "e2", source: "users", target: "sessions", label: "1:N" },
          { id: "e3", source: "sessions", target: "events", label: "1:N" },
        ],
      },
    },
    {
      id: "event_flow_diagram",
      desc: "Pub/Sub event propagation across producers, brokers, and consumers.",
      when: "Mapping asynchronous domain events and webhook fan-out.",
      cmp: EventFlowDiagram,
      sample: {
        title: "Order Paid Event Flow",
        nodes: [
          { id: "stripe", label: "payment.succeeded", type: "queue" },
          { id: "ledger", label: "Ledger Service", type: "service" },
          { id: "notify", label: "Email + Push", type: "service" },
          { id: "fulfill", label: "Fulfillment Queue", type: "queue" },
        ],
        edges: [
          { id: "e1", source: "stripe", target: "ledger", animated: true },
          { id: "e2", source: "stripe", target: "notify", animated: true },
          { id: "e3", source: "stripe", target: "fulfill", animated: true },
        ],
      },
    },
    {
      id: "integration_map",
      desc: "External SaaS, API, and internal system integration inventory.",
      when: "Auditing third-party integrations and webhook dependencies.",
      cmp: IntegrationMap,
      sample: {
        title: "External Integration Hub",
        nodes: [
          { id: "core", label: "Momo Core", type: "service", status: "active" },
          { id: "gemini", label: "Google Gemini API", type: "external" },
          { id: "exa", label: "Exa Search", type: "external" },
          { id: "osm", label: "OpenStreetMap / Nominatim", type: "external" },
          { id: "fc", label: "Firecrawl", type: "external" },
        ],
        edges: [
          { id: "e1", source: "core", target: "gemini", label: "LLM" },
          { id: "e2", source: "core", target: "exa", label: "Web search" },
          { id: "e3", source: "core", target: "osm", label: "Geocode" },
          { id: "e4", source: "core", target: "fc", label: "Scrape" },
        ],
      },
    },
    {
      id: "permission_map",
      desc: "RBAC/ABAC roles, policies, and resource access relationships.",
      when: "Reviewing authorization rules and privilege inheritance.",
      cmp: PermissionMap,
      sample: {
        title: "RBAC Permission Graph",
        nodes: [
          { id: "admin", label: "Role: Admin", type: "gateway", status: "warning" },
          { id: "editor", label: "Role: Editor", type: "process" },
          { id: "viewer", label: "Role: Viewer", type: "client" },
          { id: "prod", label: "Prod Secrets", type: "database", status: "error" },
          { id: "studio", label: "Studio Presets", type: "database" },
        ],
        edges: [
          { id: "e1", source: "admin", target: "prod", label: "read/write" },
          { id: "e2", source: "editor", target: "studio", label: "publish" },
          { id: "e3", source: "viewer", target: "studio", label: "read-only" },
        ],
      },
    },
    {
      id: "security_boundary_map",
      desc: "Trust zones, DMZ, internal VPCs, and boundary enforcement points.",
      when: "Conducting threat modeling and trust-boundary reviews.",
      cmp: SecurityBoundaryMap,
      sample: {
        title: "Zero-Trust Boundary Map",
        nodes: [
          { id: "pub", label: "Untrusted Internet", type: "external", status: "warning" },
          { id: "waf", label: "WAF + Auth Boundary", type: "gateway", status: "active" },
          { id: "app", label: "Sandboxed App Tier", type: "service" },
          { id: "vault", label: "KMS + Secrets Vault", type: "database", status: "success" },
        ],
        edges: [
          { id: "e1", source: "pub", target: "waf", label: "TLS" },
          { id: "e2", source: "waf", target: "app", label: "JWT verified" },
          { id: "e3", source: "app", target: "vault", label: "mTLS" },
        ],
      },
    },
    {
      id: "attack_surface_map",
      desc: "Exposed endpoints, input vectors, and potential exploit paths.",
      when: "Security audit of public endpoints, SSRF vectors, or auth surfaces.",
      cmp: AttackSurfaceMap,
      sample: {
        title: "Exposed Attack Surface Inventory",
        nodes: [
          { id: "proxy", label: "/api/image?url=...", type: "attack", status: "warning", detail: "SSRF target if unvalidated" },
          { id: "upload", label: "Chat Input Parser", type: "attack", detail: "XSS sanitization gate" },
          { id: "mit", label: "Host Allowlist + HTTPS Check", type: "gateway", status: "success" },
        ],
        edges: [
          { id: "e1", source: "proxy", target: "mit", label: "guarded by" },
          { id: "e2", source: "upload", target: "mit", label: "sanitized by" },
        ],
      },
    },
    {
      id: "sequence_flow",
      desc: "Runtime execution sequence across async workers and callbacks.",
      when: "Debugging distributed async execution ordering.",
      cmp: SequenceFlow,
      sample: {
        title: "Streaming Hydration Sequence",
        nodes: [
          { id: "s1", label: "Chunk Received", type: "client" },
          { id: "s2", label: "parsePartialJSON", type: "process" },
          { id: "s3", label: "Image Cache Lookup", type: "service" },
          { id: "s4", label: "DOM Commit", type: "end", status: "success" },
        ],
        edges: [
          { id: "e1", source: "s1", target: "s2", label: "16ms" },
          { id: "e2", source: "s2", target: "s3", label: "async" },
          { id: "e3", source: "s3", target: "s4", label: "paint" },
        ],
      },
    },
    {
      id: "error_propagation_graph",
      desc: "Upstream fault cascade paths and circuit breaker boundaries.",
      when: "Tracing how downstream timeout causes upstream cascading failures.",
      cmp: ErrorPropagationGraph,
      sample: {
        title: "Cascade Failure Trace",
        nodes: [
          { id: "db", label: "DB Lock Wait", type: "fault", status: "error" },
          { id: "api", label: "Checkout Pool Blocked", type: "fault", status: "warning" },
          { id: "cb", label: "Circuit Breaker Open", type: "gateway", status: "active" },
          { id: "web", label: "Degraded Cached Response", type: "end", status: "success" },
        ],
        edges: [
          { id: "e1", source: "db", target: "api", label: "timeout 5s" },
          { id: "e2", source: "api", target: "cb", label: "50% err" },
          { id: "e3", source: "cb", target: "web", label: "fallback" },
        ],
      },
    },
    {
      id: "code_dependency_graph",
      desc: "File/module import DAG showing coupling and cycle risks.",
      when: "Refactoring module boundaries or isolating circular imports.",
      cmp: CodeDependencyGraph,
      sample: {
        title: "Intelligence UI Module Graph",
        nodes: [
          { id: "types", label: "intelligence/types.ts", type: "process" },
          { id: "reg", label: "intelligence/registry.ts", type: "process" },
          { id: "lib", label: "MistlineLibrary.tsx", type: "client" },
          { id: "pg", label: "playground/page.tsx", type: "client" },
        ],
        edges: [
          { id: "e1", source: "types", target: "reg" },
          { id: "e2", source: "reg", target: "lib" },
          { id: "e3", source: "reg", target: "pg" },
        ],
      },
    },
    {
      id: "deployment_topology",
      desc: "Multi-region deployment topology showing replicas and failover routing.",
      when: "Planning rollouts, canary traffic splits, or disaster recovery.",
      cmp: DeploymentTopology,
      sample: {
        title: "Multi-Region Active-Active",
        nodes: [
          { id: "dns", label: "GeoDNS Router", type: "gateway" },
          { id: "sg", label: "Singapore Cluster (60%)", type: "service", status: "active" },
          { id: "tyo", label: "Tokyo Cluster (40%)", type: "service", status: "active" },
          { id: "rep", label: "Global Read Replica", type: "database" },
        ],
        edges: [
          { id: "e1", source: "dns", target: "sg" },
          { id: "e2", source: "dns", target: "tyo" },
          { id: "e3", source: "sg", target: "rep", label: "async" },
          { id: "e4", source: "tyo", target: "rep", label: "async" },
        ],
      },
    },
  ];

  for (const item of graphEntries) {
    registerIntelComponent({
      spec: makeIntelSpec({
        componentId: item.id,
        category: "system",
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

  /* 17. RuntimeInspector */
  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "runtime_inspector",
      category: "system",
      description: "Collapsible runtime state, environment flags, and memory object inspector.",
      dataSchema: `{ title?: string; environment?: string; status?: string; sections?: { name: string; payload: unknown }[]; runtimeState?: Record<string, unknown> }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Interactive tree inspector for runtime state, config, and session context.",
      promptWhen: "Debugging live state trees, environment config, or hydrated session payloads.",
    }),
    component: RuntimeInspector,
    sampleData: {
      title: "Brain Runtime State",
      environment: "development",
      status: "active",
      sections: [
        {
          name: "ModelConfig",
          payload: { provider: "google", model: "gemini-2.5-flash", maxTokens: 16384, thinkingBudget: 2048 },
        },
        {
          name: "SessionMetrics",
          payload: { turns: 4, historyTokensCompressed: 1840, cacheHitRate: 0.86, activeComponents: ["architecture_diagram", "risk_matrix"] },
        },
      ],
    },
  });

  /* 18. PerformanceBreakdown */
  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "performance_breakdown",
      category: "system",
      description: "Interactive trace span waterfall highlighting slow paths and bottlenecks.",
      dataSchema: `{ title?: string; totalMs?: number; spans: { id?: string; name: string; service?: string; startMs: number; durationMs: number; bottleneck?: boolean; detail?: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Latency waterfall showing timing spans and bottleneck highlights.",
      promptWhen: "Profiling request latency across middleware, DB queries, and external API calls.",
    }),
    component: PerformanceBreakdown,
    sampleData: {
      title: "Request Trace #a94f2 (840ms)",
      totalMs: 840,
      spans: [
        { id: "1", name: "Edge Auth Verify", service: "gateway", startMs: 0, durationMs: 28 },
        { id: "2", name: "Exa Web Grounding", service: "search", startMs: 28, durationMs: 390, bottleneck: true, detail: "External search query took 390ms without local cache" },
        { id: "3", name: "PostgreSQL History Fetch", service: "db", startMs: 40, durationMs: 65 },
        { id: "4", name: "Gemini First Byte", service: "llm", startMs: 420, durationMs: 420, detail: "Time to first SSE token" },
      ],
    },
  });
}
