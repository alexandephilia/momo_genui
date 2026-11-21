"use client";

import { Share2 } from "lucide-react";
import IntelligenceGraph from "./IntelligenceGraph";
import type { IntelBaseProps, IntelGraphData, IntelGraphNode, IntelGraphEdge } from "@/lib/intelligence/types";

/**
 * KnowledgeGraph — Entity-relationship graph with force layout
 *
 * Node types: entity, concept, attribute
 * Layout: force (spring-based)
 * Edges carry semantic labels (e.g., "has", "is-a", "relates-to")
 */
export default function KnowledgeGraph({ data, config, state, onAction }: IntelBaseProps) {
  const title = (data.title as string) || (config?.title as string) || "Knowledge Graph";

  if (state === "loading") {
    return (
      <div className="intel-graph-wrapper">
        <div className="intel-graph-wrapper__shimmer" style={{ height: 480 }}>
          <div className="intel-graph-wrapper__shimmer-title" />
          <div className="intel-graph-wrapper__shimmer-body" />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="intel-graph-wrapper intel-graph-wrapper--error">
        <Share2 size={20} />
        <span>{(data.error as string) || "Failed to load knowledge graph"}</span>
      </div>
    );
  }

  const rawNodes = Array.isArray(data.nodes) ? (data.nodes as Record<string, unknown>[]) : [];
  const rawEdges = Array.isArray(data.edges) ? (data.edges as Record<string, unknown>[]) : [];

  if (state === "empty" || rawNodes.length === 0) {
    return (
      <div className="intel-graph-wrapper intel-graph-wrapper--empty">
        <Share2 size={20} />
        <span>No knowledge data available</span>
      </div>
    );
  }

  const graphData: IntelGraphData = {
    nodes: rawNodes.map((n, i): IntelGraphNode => ({
      id: (n.id as string) || `node-${i}`,
      label: (n.label as string) || "Untitled",
      type: (n.type as string) || "entity",
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
      type: (e.type as IntelGraphEdge["type"]) || "association",
      animated: e.animated as boolean | undefined,
      strength: e.strength as number | undefined,
    })),
    layout: "force",
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
