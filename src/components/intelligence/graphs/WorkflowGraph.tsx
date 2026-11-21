"use client";

import { GitMerge } from "lucide-react";
import IntelligenceGraph from "./IntelligenceGraph";
import type { IntelBaseProps, IntelGraphData, IntelGraphNode, IntelGraphEdge } from "@/lib/intelligence/types";

/**
 * WorkflowGraph — Parallel/conditional workflow visualization
 *
 * Node types: task, parallel, condition, join
 * Layout: layered (default LR)
 */
export default function WorkflowGraph({ data, config, state, onAction }: IntelBaseProps) {
  const title = (data.title as string) || (config?.title as string) || "Workflow";

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
        <GitMerge size={20} />
        <span>{(data.error as string) || "Failed to load workflow"}</span>
      </div>
    );
  }

  const rawNodes = Array.isArray(data.nodes) ? (data.nodes as Record<string, unknown>[]) : [];
  const rawEdges = Array.isArray(data.edges) ? (data.edges as Record<string, unknown>[]) : [];

  if (state === "empty" || rawNodes.length === 0) {
    return (
      <div className="intel-graph-wrapper intel-graph-wrapper--empty">
        <GitMerge size={20} />
        <span>No workflow data available</span>
      </div>
    );
  }

  const graphData: IntelGraphData = {
    nodes: rawNodes.map((n, i): IntelGraphNode => ({
      id: (n.id as string) || `node-${i}`,
      label: (n.label as string) || "Untitled",
      type: (n.type as string) || "task",
      detail: n.detail as string | undefined,
      status: (n.status as IntelGraphNode["status"]) || "active",
      metadata: n.metadata as Record<string, unknown> | undefined,
      children: n.children as IntelGraphNode[] | undefined,
    })),
    edges: rawEdges.map((e, i): IntelGraphEdge => ({
      id: (e.id as string) || `edge-${i}`,
      source: (e.source as string) || "",
      target: (e.target as string) || "",
      label: (e.label as string) || undefined,
      type: (e.type as IntelGraphEdge["type"]) || "dependency",
      animated: e.animated as boolean | undefined,
      strength: e.strength as number | undefined,
    })),
    layout: "layered",
    direction: (data.direction as IntelGraphData["direction"]) || "LR",
  };

  return (
    <IntelligenceGraph
      graphData={graphData}
      title={title}
      caption={data.caption as string | undefined}
      height={typeof config?.height === "number" ? config.height : undefined}
      onNodeClick={(node) => onAction?.({ type: "select", payload: { nodeId: node.id, node } })}
    />
  );
}
