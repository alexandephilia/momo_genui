"use client";

import { GitBranch } from "lucide-react";
import IntelligenceGraph from "./IntelligenceGraph";
import type { IntelBaseProps, IntelGraphData, IntelGraphNode, IntelGraphEdge } from "@/lib/intelligence/types";

/**
 * ReasoningTree — Visualizes logical reasoning chains
 *
 * Node types: premise, inference, conclusion, evidence
 * Layout: tree TB (top-to-bottom)
 */
export default function ReasoningTree({ data, config, state, onAction }: IntelBaseProps) {
  const title = (data.title as string) || (config?.title as string) || "Reasoning Tree";

  if (state === "loading") {
    return (
      <div className="intel-graph-wrapper">
        <div className="intel-graph-wrapper__shimmer" style={{ height: 400 }}>
          <div className="intel-graph-wrapper__shimmer-title" />
          <div className="intel-graph-wrapper__shimmer-body" />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-graph-wrapper intel-graph-wrapper--error">
        <GitBranch size={20} />
        <span>{(data.error as string) || "Failed to load reasoning tree"}</span>
      </div>
    );
  }

  const rawNodes = Array.isArray(data.nodes) ? (data.nodes as Record<string, unknown>[]) : [];
  const rawEdges = Array.isArray(data.edges) ? (data.edges as Record<string, unknown>[]) : [];

  if (state === "empty" || rawNodes.length === 0) {
    return (
      <div className="intel-graph-wrapper intel-graph-wrapper--empty">
        <GitBranch size={20} />
        <span>No reasoning data available</span>
      </div>
    );
  }

  const graphData: IntelGraphData = {
    nodes: rawNodes.map((n, i): IntelGraphNode => ({
      id: (n.id as string) || `node-${i}`,
      label: (n.label as string) || "Untitled",
      type: (n.type as string) || "inference",
      detail: n.detail as string | undefined,
      status: (n.status as IntelGraphNode["status"]) || "active",
      metadata: n.metadata as Record<string, unknown> | undefined,
      children: n.children as IntelGraphNode[] | undefined,
    })),
    edges: rawEdges.map((e, i): IntelGraphEdge => ({
      id: (e.id as string) || `edge-${i}`,
      source: (e.source as string) || "",
      target: (e.target as string) || "",
      label: e.label as string | undefined,
      type: (e.type as IntelGraphEdge["type"]) || "causal",
      animated: e.animated as boolean | undefined,
      strength: e.strength as number | undefined,
    })),
    layout: "tree",
    direction: "TB",
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
