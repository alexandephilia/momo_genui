/**
 * Category 08 — Remaining 18 Investigation & Monitoring Intelligence UI Components
 * (AlertFeed already registered under "investigation")
 */

import { registerIntelComponent } from "@/lib/intelligence/registry";
import { makeIntelSpec } from "@/lib/intelligence/specHelper";
import {
  IncidentTimeline,
  IncidentMap,
  EventCorrelationMap,
  EntityTracking,
  AnomalyDetectionPanel,
  ThreatAssessment,
  SignalMonitor,
  EventStream,
  SituationalOverview,
  InvestigationBoard,
  CaseTimeline,
  IndicatorPanel,
  PatternDetection,
  ChangeDetection,
  CorrelationTimeline,
  GeographicHeatmap,
  Watchlist,
  IncidentRelationshipGraph,
} from "@/components/intelligence/activity/InvestigationCatalogSuite";

export function registerInvestigationComponents(): void {
  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "incident_timeline",
      category: "investigation",
      description: "Chronological timeline of incident detection, triage, and mitigation events.",
      dataSchema: `{ title?: string; severity?: string; events: { title: string; timestamp: string; detail?: string; actor?: string; severity?: string }[] }`,
      promptSummary: "Chronological incident response log.",
      promptWhen: "Documenting incident progression from alert to resolution.",
    }),
    component: IncidentTimeline,
    sampleData: {
      title: "SEV-2 Checkout Latency Incident",
      severity: "warning",
      events: [
        { title: "P99 Latency > 2.5s Alert", timestamp: "09:14 UTC", detail: "Triggered PagerDuty alert on api-checkout", actor: "Datadog", severity: "critical" },
        { title: "Rolled back release v4.12", timestamp: "09:22 UTC", detail: "Restored nominal 140ms latency", actor: "On-Call SRE", severity: "good" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "incident_map",
      category: "investigation",
      description: "Geographic incident visualization powered by OpenStreetMap + Leaflet pins.",
      dataSchema: `{ title?: string; connectRoute?: boolean; incidents: { name: string; lat: number; lng: number; severity?: string; note?: string; time?: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Interactive OpenStreetMap plotting geolocated incidents.",
      promptWhen: "Visualizing regional outages, logistics disruptions, or field incidents.",
    }),
    component: IncidentMap,
    sampleData: {
      title: "Regional Outage Footprint",
      incidents: [
        { name: "Jakarta Edge POP", lat: -6.2088, lng: 106.8456, severity: "degraded", note: "Packet loss 4.2%", time: "09:15" },
        { name: "Singapore Core", lat: 1.3521, lng: 103.8198, severity: "healthy", note: "Nominal routing", time: "09:16" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "event_correlation_map",
      category: "investigation",
      description: "Interactive XYFlow graph correlating causal chains across distributed events.",
      dataSchema: `{ title?: string; nodes: { id: string; label: string; type?: string }[]; edges: { id: string; source: string; target: string; label?: string }[] }`,
      complexity: "high",
      promptSummary: "Interactive graph connecting correlated telemetry events.",
      promptWhen: "Linking seemingly separate log events into a unified root-cause story.",
    }),
    component: EventCorrelationMap,
    sampleData: {
      title: "Correlated Auth Failure Chain",
      nodes: [
        { id: "e1", label: "Redis Eviction Surge", type: "warning", status: "warning" },
        { id: "e2", label: "Session Cache Misses +90%", type: "inference" },
        { id: "e3", label: "DB Auth Lookups 10x", type: "fault", status: "error" },
      ],
      edges: [
        { id: "l1", source: "e1", target: "e2", label: "triggers" },
        { id: "l2", source: "e2", target: "e3", label: "amplifies" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "entity_tracking",
      category: "investigation",
      description: "Tracks state mutations across monitored hosts, domains, or accounts.",
      dataSchema: `{ title?: string; entities: { name: string; type: string; status: string; lastChange: string; updatedAt: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "List of tracked entities and their latest detected mutations.",
      promptWhen: "Monitoring watched domains, packages, or infrastructure entities.",
    }),
    component: EntityTracking,
    sampleData: {
      title: "Tracked Production Entities",
      entities: [
        { name: "api.momo.app", type: "Endpoint", status: "active", lastChange: "TLS cert rotated cleanly", updatedAt: "12m ago" },
        { name: "worker-pool-02", type: "Compute", status: "warning", lastChange: "RSS grew +18% over baseline", updatedAt: "4m ago" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "anomaly_detection_panel",
      category: "investigation",
      description: "Highlights statistical anomalies with baseline vs current values and anomaly score.",
      dataSchema: `{ title?: string; detections: { signal: string; severity?: string; anomalyScore: number; explanation: string; window: string; baseline: string; current: string }[] }`,
      promptSummary: "Signal anomalies scored against rolling baseline.",
      promptWhen: "Flagging sudden spikes or drops across telemetry streams.",
    }),
    component: AnomalyDetectionPanel,
    sampleData: {
      title: "Active Signal Anomalies",
      detections: [
        { signal: "Outbound 429 Rate", severity: "critical", anomalyScore: 94, explanation: "Rate limiter triggered on external geocoding client.", window: "15m", baseline: "0.1%", current: "14.8%" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "threat_assessment",
      category: "investigation",
      description: "Structured threat posture summary detailing attack vectors, likelihood, and mitigations.",
      dataSchema: `{ title?: string; overallLevel: string; summary?: string; vectors: { name: string; likelihood: string; severity: string; mitigation: string }[] }`,
      promptSummary: "Threat assessment breakdown by vector and mitigation.",
      promptWhen: "Assessing security exposure or emerging threat advisories.",
    }),
    component: ThreatAssessment,
    sampleData: {
      title: "Web App Threat Assessment",
      overallLevel: "Moderate",
      summary: "No exposed admin surfaces; primary residual vector is unauthenticated media proxying.",
      vectors: [
        { name: "Image Proxy SSRF", likelihood: "Low (guarded)", severity: "high", mitigation: "Enforces HTTPS and rejects RFC1918 IP ranges" },
        { name: "Markdown XSS", likelihood: "Low", severity: "medium", mitigation: "React escaped rendering + no dangerouslySetInnerHTML" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "signal_monitor",
      category: "investigation",
      description: "Real-time golden signal tile monitor comparing observed metrics vs SLO thresholds.",
      dataSchema: `{ title?: string; signals: { name: string; value: string; threshold: string; status: string }[] }`,
      promptSummary: "Tile board of golden telemetry signals vs SLO thresholds.",
      promptWhen: "Displaying real-time latency, error rate, and saturation gauges.",
    }),
    component: SignalMonitor,
    sampleData: {
      title: "Golden Signals",
      signals: [
        { name: "P95 Latency", value: "184ms", threshold: "< 300ms", status: "normal" },
        { name: "5xx Error Rate", value: "0.04%", threshold: "< 0.5%", status: "normal" },
        { name: "Queue Lag", value: "412 msgs", threshold: "< 250 msgs", status: "warning" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "event_stream",
      category: "investigation",
      description: "Filterable raw operational event log sorted by arrival timestamp.",
      dataSchema: `{ title?: string; events: { timestamp: string; type: string; severity?: string; message: string; source?: string }[] }`,
      promptSummary: "Filterable chronological stream of structured system events.",
      promptWhen: "Streaming live audit or operational events.",
    }),
    component: EventStream,
    sampleData: {
      title: "Edge Telemetry Stream",
      events: [
        { timestamp: "02:44:10", type: "cache", severity: "info", message: "Image cache warmed for 4 Jakarta coffee spots", source: "edge-01" },
        { timestamp: "02:44:18", type: "rate_limit", severity: "warning", message: "Throttled burst from 203.0.113.8", source: "waf" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "situational_overview",
      category: "investigation",
      description: "High-level operational briefing combining status posture, KPIs, and active advisories.",
      dataSchema: `{ title?: string; posture?: string; tone?: string; summary: string; metrics: { label: string; value: string }[]; advisories: string[] }`,
      promptSummary: "Unified operational situation report.",
      promptWhen: "Briefing stakeholders during live events or shift handoffs.",
    }),
    component: SituationalOverview,
    sampleData: {
      title: "Operational Situational Overview",
      posture: "Nominal",
      tone: "good",
      summary: "All core chat, explore, and Studio endpoints operating inside SLA after recent token cap upgrade.",
      metrics: [
        { label: "Active Users", value: "1,420" },
        { label: "Uptime", value: "99.98%" },
        { label: "Open Incidents", value: "0" },
      ],
      advisories: ["Monitor upstream Gemini quota utilization during evening peak"],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "investigation_board",
      category: "investigation",
      description: "Multi-column Kanban workspace grouping leads, active checks, and verified findings. Every card must include a concise description.",
      dataSchema: `{ title?: string; columns: { title: string; cards: { title: string; description: string; tag?: string; tone?: string; note?: string }[] }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Kanban board organizing investigative leads by status; always include a short description on every card.",
      promptWhen: "Coordinating multi-lead investigations across stages.",
    }),
    component: InvestigationBoard,
    sampleData: {
      title: "Active Audit Board",
      columns: [
        {
          title: "Leads",
          cards: [
            {
              title: "Test Redis failover latency",
              tag: "P2",
              description: "Measure primary-to-replica promotion lag under 2k req/s burst traffic before rollout.",
            },
          ],
        },
        {
          title: "Investigating",
          cards: [
            {
              title: "Verify DialKit folder sync",
              tag: "In Progress",
              description: "Checking nested token keys and live state hydration across studio surface switches.",
            },
          ],
        },
        {
          title: "Verified",
          cards: [
            {
              title: "16k token cap prevents cutoffs",
              tag: "Confirmed",
              description: "Stress-tested 12 long-form OpenUI streams with zero mid-block truncation events.",
            },
          ],
        },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "case_timeline",
      category: "investigation",
      description: "Structured timeline of investigative milestones and case updates.",
      dataSchema: `{ title?: string; caseId?: string; milestones: { title: string; date: string; summary: string; status?: string }[] }`,
      promptSummary: "Chronological milestone tracker for long-running cases.",
      promptWhen: "Summarizing multi-day audits or investigations.",
    }),
    component: CaseTimeline,
    sampleData: {
      title: "Reliability Overhaul Case",
      caseId: "CASE-2026-08",
      milestones: [
        { title: "Opened investigation on stream truncation", date: "Nov 17", summary: "Reproduced mid-UI block termination", status: "done" },
        { title: "Shipped Tier 1 cap + history compression", date: "Nov 18", summary: "Cut prompt bloat by 78%", status: "success" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "indicator_panel",
      category: "investigation",
      description: "Tile panel tracking critical indicators (IOCs, leading health KPIs) with side-by-side metric value and summary.",
      dataSchema: `{ title?: string; indicators: { name: string; value: string; summary: string; category?: string; status?: string }[] }`,
      promptSummary: "Indicator panel for key signals and IOCs; always include a concise summary beside each metric value.",
      promptWhen: "Highlighting watched indicators alongside value, summary, category, and health.",
    }),
    component: IndicatorPanel,
    sampleData: {
      title: "Leading System Indicators",
      indicators: [
        {
          name: "Mean Context Ratio",
          value: "22%",
          summary: "Prompt load stays well under the 35% ceiling after history compression.",
          category: "Efficiency",
          status: "good",
        },
        {
          name: "Blocked Domains",
          value: "3",
          summary: "Suspicious proxy hosts auto-quarantined during the last 24h scan.",
          category: "Security",
          status: "warning",
        },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "pattern_detection",
      category: "investigation",
      description: "Identifies recurring behavioral or failure patterns with match count and confidence.",
      dataSchema: `{ title?: string; patterns: { name: string; confidence: number; occurrences: number; signature: string; description: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Lists recurring patterns discovered across logs or traces.",
      promptWhen: "Reporting clustered signatures or recurring user/error patterns.",
    }),
    component: PatternDetection,
    sampleData: {
      title: "Detected Behavioral Patterns",
      patterns: [
        { name: "Monday Morning Cold Spike", confidence: 91, occurrences: 12, signature: "08:00-08:15 UTC +300% reqs", description: "Predictable weekly login surge hits uncached DB path." },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "change_detection",
      category: "investigation",
      description: "Compares before/after state snapshots to highlight meaningful deltas.",
      dataSchema: `{ title?: string; changes: { subject: string; before: string; after: string; delta: string; direction: "up"|"down" }[] }`,
      promptSummary: "Before-and-after delta comparison across monitored metrics.",
      promptWhen: "Tracking configuration drift, performance deltas, or snapshot changes.",
    }),
    component: ChangeDetection,
    sampleData: {
      title: "Post-Optimization State Changes",
      changes: [
        { subject: "History Token Count", before: "11,200", after: "2,400", delta: "-78%", direction: "up" },
        { subject: "Component Catalog Coverage", before: "28", after: "182", delta: "+550%", direction: "up" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "correlation_timeline",
      category: "investigation",
      description: "Groups concurrent events into time-window correlation clusters.",
      dataSchema: `{ title?: string; clusters: { window: string; correlationScore: number; events: string[] }[] }`,
      promptSummary: "Co-occurring event clusters grouped by temporal window.",
      promptWhen: "Showing events that happened simultaneously across different layers.",
    }),
    component: CorrelationTimeline,
    sampleData: {
      title: "Temporal Correlation Clusters",
      clusters: [
        { window: "14:30 – 14:33 UTC", correlationScore: 93, events: ["Migration job acquired exclusive lock", "API checkout P99 exceeded 5s", "Queue consumer heartbeats timed out"] },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "geographic_heatmap",
      category: "investigation",
      description: "Regional event density cards paired with interactive OpenStreetMap hotspot view.",
      dataSchema: `{ title?: string; hotspots: { region: string; intensity: number; lat?: number; lng?: number; summary?: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Spatial intensity visualization across geographic regions.",
      promptWhen: "Showing regional concentration of alerts, traffic, or incidents.",
    }),
    component: GeographicHeatmap,
    sampleData: {
      title: "Request & Alert Concentration",
      hotspots: [
        { region: "Jakarta", intensity: 420, lat: -6.2088, lng: 106.8456, summary: "Peak local traffic" },
        { region: "Bandung", intensity: 145, lat: -6.9175, lng: 107.6191, summary: "Steady usage" },
        { region: "Surabaya", intensity: 98, lat: -7.2575, lng: 112.7521, summary: "Growing adoption" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "watchlist",
      category: "investigation",
      description: "Watchlist table tracking high-priority entities, status, and latest signal.",
      dataSchema: `{ title?: string; items: { name: string; category: string; status: string; lastSignal: string }[] }`,
      promptSummary: "Interactive watchlist table for tracked targets.",
      promptWhen: "Tracking active watch targets during monitoring workflows.",
    }),
    component: Watchlist,
    sampleData: {
      title: "Active Watchlist",
      items: [
        { name: "Nominatim API Quota", category: "External API", status: "active", lastSignal: "2m ago (OK)" },
        { name: "Gemini Upstream Latency", category: "Inference", status: "warning", lastSignal: "1m ago (940ms)" },
      ],
    },
  });

  registerIntelComponent({
    spec: makeIntelSpec({
      componentId: "incident_relationship_graph",
      category: "investigation",
      description: "Interactive XYFlow graph showing linked incidents, shared root causes, and affected services.",
      dataSchema: `{ title?: string; nodes: { id: string; label: string; type?: string }[]; edges: { id: string; source: string; target: string; label?: string }[] }`,
      phase: "P3",
      complexity: "high",
      promptSummary: "Force graph linking related incidents and shared blast zones.",
      promptWhen: "Connecting multiple historical or ongoing incidents cleanly.",
    }),
    component: IncidentRelationshipGraph,
    sampleData: {
      title: "Linked Incident Cluster",
      nodes: [
        { id: "inc1", label: "INC-401 Checkout 500", type: "fault", status: "error" },
        { id: "inc2", label: "INC-404 Billing Webhook Fail", type: "fault", status: "warning" },
        { id: "root", label: "Shared Auth Secret Desync", type: "gateway", status: "active" },
      ],
      edges: [
        { id: "e1", source: "root", target: "inc1", label: "triggered" },
        { id: "e2", source: "root", target: "inc2", label: "triggered" },
      ],
    },
  });
}
