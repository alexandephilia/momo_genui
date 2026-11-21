"use client";

import { Server } from "lucide-react";
import IntelligenceGraph from "./IntelligenceGraph";
import type { IntelBaseProps, IntelGraphData, IntelGraphNode, IntelGraphEdge } from "@/lib/intelligence/types";

/**
 * ArchitectureDiagram — System architecture visualization
 *
 * Node types: service, database, queue, gateway, client
 * Layout: layered LR (left-to-right)
 */
export default function ArchitectureDiagram({ data, config, state, onAction }: IntelBaseProps) {
  const title = (data.title as string) || (config?.title as string) || "Architecture Diagram";

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
        <span>{(data.error as string) || "Failed to load architecture diagram"}</span>
      </div>
    );
  }

  const rawNodes = Array.isArray(data.nodes) ? (data.nodes as Record<string, unknown>[]) : [];
  const rawEdges = Array.isArray(data.edges) ? (data.edges as Record<string, unknown>[]) : [];

  if (state === "empty" || rawNodes.length === 0) {
    return (
      <div className="intel-graph-wrapper intel-graph-wrapper--empty">
        <Server size={20} />
        <span>No architecture data available</span>
      </div>
    );
  }

  const graphData: IntelGraphData = {
    nodes: rawNodes.map((n, i): IntelGraphNode => ({
      id: (n.id as string) || `node-${i}`,
      label: (n.label as string) || "Untitled",
      type: (n.type as string) || "service",
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
      type: (e.type as IntelGraphEdge["type"]) || "data_flow",
      animated: (e.animated as boolean) ?? true,
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
