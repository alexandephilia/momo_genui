"use client";

/**
 * Category 07 — System & Architecture Intelligence UI (18 Components)
 * - 16 XYFlow interactive system/architecture/topology/schema diagrams
 * - runtime_inspector (interactive JSON/object tree explorer)
 * - performance_breakdown (interactive span waterfall & bottleneck analyzer)
 */

import { useState, type ComponentType } from "react";
import { motion } from "motion/react";
import { MH } from "@/components/motion/MotionPrimitives";
import { Server, Cpu, Gauge, ChevronDown, ChevronRight } from "lucide-react";
import IntelligenceGraph from "./IntelligenceGraph";
import type {
  IntelBaseProps,
  IntelGraphData,
  IntelGraphEdge,
  IntelGraphNode,
} from "@/lib/intelligence/types";
import { IntelCardShell, badgeClassForTone, toneColor, s, n, a } from "../shared/IntelCardShell";

function makeSystemGraph(preset: {
  defaultTitle: string;
  layout: NonNullable<IntelGraphData["layout"]>;
  direction: NonNullable<IntelGraphData["direction"]>;
  defaultNodeType: string;
  defaultEdgeType: NonNullable<IntelGraphEdge["type"]>;
}): ComponentType<IntelBaseProps> {
  return function SystemGraphComponent({
    data,
    config,
    state,
    onAction,
  }: IntelBaseProps) {
    const title = s(data.title) || s(config?.title) || preset.defaultTitle;

    if (state === "loading") {
      return (
        <div className="intel-graph-wrapper">
          <div className="intel-graph-wrapper__shimmer" style={{ height: 420 }}>
            <div className="intel-graph-wrapper__shimmer-title" />
            <div className="intel-graph-wrapper__shimmer-body" />
          </div>
        </div>
      );
    }

    if (state === "error") {
      return (
        <div className="intel-graph-wrapper intel-graph-wrapper--error">
          <Server size={20} />
          <span>{s(data.error, `Failed to load ${preset.defaultTitle}`)}</span>
        </div>
      );
    }

    const rawNodes = a<Record<string, unknown>>(data.nodes);
    const rawEdges = a<Record<string, unknown>>(data.edges);

    if (state === "empty" || rawNodes.length === 0) {
      return (
        <div className="intel-graph-wrapper intel-graph-wrapper--empty">
          <Server size={20} />
          <span>No topology nodes available for {preset.defaultTitle}</span>
        </div>
      );
    }

    const graphData: IntelGraphData = {
      nodes: rawNodes.map((node, i): IntelGraphNode => ({
        id: s(node.id, `sys-${i}`),
        label: s(node.label, "Node"),
        type: s(node.type, preset.defaultNodeType),
        detail: s(node.detail) || undefined,
        status: (node.status as IntelGraphNode["status"]) || undefined,
        metadata: node.metadata as Record<string, unknown> | undefined,
        children: node.children as IntelGraphNode[] | undefined,
      })),
      edges: rawEdges.map((edge, i): IntelGraphEdge => ({
        id: s(edge.id, `se-${i}`),
        source: s(edge.source),
        target: s(edge.target),
        label: s(edge.label) || undefined,
        type: (edge.type as IntelGraphEdge["type"]) || preset.defaultEdgeType,
        animated: Boolean(edge.animated),
        strength: typeof edge.strength === "number" ? edge.strength : undefined,
      })),
      layout: (s(data.layout) as IntelGraphData["layout"]) || preset.layout,
      direction: (s(data.direction) as IntelGraphData["direction"]) || preset.direction,
    };

    return (
      <IntelligenceGraph
        graphData={graphData}
        title={title}
        caption={s(data.caption) || undefined}
        height={typeof config?.height === "number" ? config.height : undefined}
        onNodeClick={(node) => onAction?.({ type: "select", payload: { nodeId: node.id, node } })}
      />
    );
  };
}

export const SystemArchitecture = makeSystemGraph({
  defaultTitle: "System Architecture",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "service",
  defaultEdgeType: "data_flow",
});

export const ServiceMap = makeSystemGraph({
  defaultTitle: "Service Map",
  layout: "force",
  direction: "LR",
  defaultNodeType: "service",
  defaultEdgeType: "dependency",
});

export const ComponentDependencyMap = makeSystemGraph({
  defaultTitle: "Component Dependency Map",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "process",
  defaultEdgeType: "dependency",
});

export const ApiFlowDiagram = makeSystemGraph({
  defaultTitle: "API Flow Diagram",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "gateway",
  defaultEdgeType: "sequence",
});

export const DataFlowDiagram = makeSystemGraph({
  defaultTitle: "Data Flow Diagram",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "queue",
  defaultEdgeType: "data_flow",
});

export const InfrastructureMap = makeSystemGraph({
  defaultTitle: "Infrastructure Topology Map",
  layout: "layered",
  direction: "TB",
  defaultNodeType: "service",
  defaultEdgeType: "dependency",
});

export const DatabaseSchemaMap = makeSystemGraph({
  defaultTitle: "Database Schema Map",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "database",
  defaultEdgeType: "dependency",
});

export const EventFlowDiagram = makeSystemGraph({
  defaultTitle: "Event Flow Diagram",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "queue",
  defaultEdgeType: "data_flow",
});

export const IntegrationMap = makeSystemGraph({
  defaultTitle: "Integration Map",
  layout: "radial",
  direction: "LR",
  defaultNodeType: "external",
  defaultEdgeType: "data_flow",
});

export const PermissionMap = makeSystemGraph({
  defaultTitle: "Permission & Access Map",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "gateway",
  defaultEdgeType: "dependency",
});

export const SecurityBoundaryMap = makeSystemGraph({
  defaultTitle: "Security Boundary Map",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "gateway",
  defaultEdgeType: "dependency",
});

export const AttackSurfaceMap = makeSystemGraph({
  defaultTitle: "Attack Surface Map",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "attack",
  defaultEdgeType: "causal",
});

export const SequenceFlow = makeSystemGraph({
  defaultTitle: "Runtime Sequence Flow",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "service",
  defaultEdgeType: "sequence",
});

export const ErrorPropagationGraph = makeSystemGraph({
  defaultTitle: "Error Propagation Graph",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "fault",
  defaultEdgeType: "causal",
});

export const CodeDependencyGraph = makeSystemGraph({
  defaultTitle: "Code Dependency Graph",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "process",
  defaultEdgeType: "dependency",
});

export const DeploymentTopology = makeSystemGraph({
  defaultTitle: "Deployment Topology",
  layout: "layered",
  direction: "TB",
  defaultNodeType: "service",
  defaultEdgeType: "data_flow",
});

/* 17. RuntimeInspector */
function InspectorBranch({
  label,
  value,
  depth = 0,
}: {
  label: string;
  value: unknown;
  depth?: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isObj = typeof value === "object" && value !== null;

  if (!isObj) {
    const color =
      typeof value === "number"
        ? "#ef8c66"
        : typeof value === "boolean"
          ? "#c9973b"
          : "var(--gu-ink, #141416)";
    return (
      <div className="intel-tree-leaf" style={{ paddingLeft: depth * 14 }}>
        <span className="intel-tree-key">{label}:</span>{" "}
        <span style={{ color }}>{JSON.stringify(value)}</span>
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((v, i) => [`[${i}]`, v] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div style={{ paddingLeft: depth * 14 }}>
      <motion.button type="button" className="intel-tree-branch" whileHover={MH.row} whileTap={MH.tap} transition={MH.spring} onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="intel-tree-key">{label}</span>
        <span className="intel-muted-mono">
          {Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </motion.button>
      {open &&
        entries.map(([k, v]) => (
          <InspectorBranch key={k} label={k} value={v} depth={depth + 1} />
        ))}
    </div>
  );
}

export function RuntimeInspector({ data, state, streaming, sources }: IntelBaseProps) {
  const sections = a<Record<string, unknown>>(data.sections);
  const stateObj = (data.runtimeState as Record<string, unknown>) || {};
  const [tab, setTab] = useState(0);
  const activeSection = sections[tab];

  return (
    <IntelCardShell
      title={s(data.title, "Runtime Inspector")}
      badge={s(data.environment, "production")}
      badgeTone={badgeClassForTone(s(data.status, "active"))}
      icon={<Cpu size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={sections.length === 0 && Object.keys(stateObj).length === 0}
      emptyMessage="No runtime state captured"
    >
      {sections.length > 0 && (
        <div className="intel-filter-pills" style={{ marginBottom: 10 }}>
          {sections.map((sec, i) => (
            <motion.button
              key={s(sec.name, `sec-${i}`)}
              type="button"
              className={`intel-pill ${tab === i ? "is-active" : ""}`}
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() => setTab(i)}
            >
              {s(sec.name)}
            </motion.button>
          ))}
        </div>
      )}
      <div className="intel-tree-box">
        {activeSection ? (
          <InspectorBranch label={s(activeSection.name, "state")} value={activeSection.payload ?? activeSection} />
        ) : (
          Object.entries(stateObj).map(([k, v]) => (
            <InspectorBranch key={k} label={k} value={v} />
          ))
        )}
      </div>
    </IntelCardShell>
  );
}

/* 18. PerformanceBreakdown */
export function PerformanceBreakdown({ data, state, streaming, sources, onAction }: IntelBaseProps) {
  const spans = a<Record<string, unknown>>(data.spans);
  const totalMs = n(data.totalMs) || Math.max(1, ...spans.map((sp) => n(sp.startMs) + n(sp.durationMs)));
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  return (
    <IntelCardShell
      title={s(data.title, "Performance Breakdown")}
      badge={`${totalMs}ms total`}
      badgeTone={totalMs > 500 ? "amber" : "green"}
      icon={<Gauge size={15} />}
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={spans.length === 0}
      emptyMessage="No trace spans collected"
    >
      <div className="intel-waterfall">
        {spans.map((sp, i) => {
          const start = n(sp.startMs, 0);
          const dur = n(sp.durationMs, 10);
          const leftPct = Math.min(95, (start / totalMs) * 100);
          const widthPct = Math.max(2, Math.min(100 - leftPct, (dur / totalMs) * 100));
          const bottleneck = Boolean(sp.bottleneck) || dur / totalMs > 0.35;
          const color = bottleneck ? "#ef8c66" : toneColor(s(sp.status, "neutral"));
          const isOpen = selectedIdx === i;

          return (
            <motion.div
              key={s(sp.id, `sp-${i}`)}
              className={`intel-waterfall__row ${isOpen ? "is-selected" : ""}`}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() => {
                setSelectedIdx(isOpen ? null : i);
                onAction?.({ type: "select", payload: { span: sp } });
              }}
            >
              <div className="intel-waterfall__label">
                <span>{s(sp.name)}</span>
                {s(sp.service) && <span className="intel-badge intel-badge--neutral">{s(sp.service)}</span>}
              </div>
              <div className="intel-waterfall__track">
                <div
                  className="intel-waterfall__bar"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    background: color,
                  }}
                />
              </div>
              <span className="intel-muted-mono">{dur}ms</span>
            </motion.div>
          );
        })}
      </div>
      {selectedIdx !== null && spans[selectedIdx] && (
        <div className="intel-subcard__expand" style={{ marginTop: 10 }}>
          <strong>{s(spans[selectedIdx].name)}</strong>: {s(spans[selectedIdx].detail, `Executed in ${n(spans[selectedIdx].durationMs)}ms starting at +${n(spans[selectedIdx].startMs)}ms`)}
        </div>
      )}
    </IntelCardShell>
  );
}
