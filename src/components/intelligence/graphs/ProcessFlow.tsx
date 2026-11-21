"use client";

import { Workflow } from "lucide-react";
import IntelligenceGraph from "./IntelligenceGraph";
import type { IntelBaseProps, IntelGraphData, IntelGraphNode, IntelGraphEdge } from "@/lib/intelligence/types";

/**
 * ProcessFlow — Sequential process / flowchart visualization
 *
 * Node types: start, process, decision, end
 * Layout: layered LR (left-to-right)
 */
export default function ProcessFlow({ data, config, state, onAction }: IntelBaseProps) {
  const title = (data.title as string) || (config?.title as string) || "Process Flow";

  if (state === "loading") {
    return (
      <div className="intel-graph-wrapper">
        <div className="intel-graph-wrapper__shimmer" style={{ height: 380 }}>
          <div className="intel-graph-wrapper__shimmer-title" />
          <div className="intel-graph-wrapper__shimmer-body" />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-graph-wrapper intel-graph-wrapper--error">
        <Workflow size={20} />
        <span>{(data.error as string) || "Failed to load process flow"}</span>
      </div>
    );
  }

  const rawNodes = Array.isArray(data.nodes) ? (data.nodes as Record<string, unknown>[]) : [];
  const rawEdges = Array.isArray(data.edges) ? (data.edges as Record<string, unknown>[]) : [];

  if (state === "empty" || rawNodes.length === 0) {
    return (
      <div className="intel-graph-wrapper intel-graph-wrapper--empty">
        <Workflow size={20} />
        <span>No process data available</span>
      </div>
    );
  }

  const graphData: IntelGraphData = {
    nodes: rawNodes.map((n, i): IntelGraphNode => ({
      id: (n.id as string) || `node-${i}`,
      label: (n.label as string) || "Untitled",
      type: (n.type as string) || "process",
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
      type: (e.type as IntelGraphEdge["type"]) || "sequence",
      animated: e.animated as boolean | undefined,
      strength: e.strength as number | undefined,
    })),
    layout: "layered",
    direction: "LR",
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
