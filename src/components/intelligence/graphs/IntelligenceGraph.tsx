"use client";

/**
 * IntelligenceGraph — Base interactive graph component (XYFlow + ELK.js)
 *
 * - Uncontained & fit-content by default: blends seamlessly into Chat, Explore, and Studio
 * - Zero minimap or floating control box clutter
 * - Neutral Momo surface tokens + coral selection highlight (zero colored borders)
 * - 4 distinct structural variants:
 *   - "default":   Interactive XYFlow + ELK node-link graph with Momo badge nodes
 *   - "minimal":   Momo stepped cascade sequence with L-elbow connectors
 *   - "pill":      Horizontal wrapping chevron/pill relational strip
 *   - "blueprint": Borderless Momo editorial relational table
 */

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { IntelVariantContext } from "../shared/IntelCardShell";
import {
  ReactFlow,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
  type FitViewOptions,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK, { type ElkNode, type ElkExtendedEdge } from "elkjs/lib/elk.bundled.js";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Minimize2, X, Maximize2, Plus, Minus, RotateCcw } from "lucide-react";
import type {
  IntelGraphData,
  IntelGraphNode,
  IntelGraphEdge,
} from "@/lib/intelligence/types";

const elk = new ELK();

const ELK_LAYOUT_OPTIONS: Record<string, Record<string, string>> = {
  layered: {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.spacing.nodeNode": "56",
    "elk.layered.spacing.nodeNodeBetweenLayers": "124",
    "elk.layered.spacing.edgeNodeBetweenLayers": "42",
    "elk.spacing.edgeEdge": "32",
    "elk.edgeRouting": "ORTHOGONAL",
  },
  tree: {
    "elk.algorithm": "mrtree",
    "elk.direction": "DOWN",
    "elk.spacing.nodeNode": "58",
    "elk.mrtree.weighting": "CONSTRAINT",
    "elk.mrtree.searchOrder": "DFS",
  },
  force: {
    "elk.algorithm": "force",
    "elk.force.iterations": "280",
    "elk.spacing.nodeNode": "104",
  },
  radial: {
    "elk.algorithm": "radial",
    "elk.radial.compactor": "WEDGE_COMPACTION",
    "elk.spacing.nodeNode": "82",
  },
  stress: {
    "elk.algorithm": "stress",
    "elk.stress.desiredEdgeLength": "132",
    "elk.spacing.nodeNode": "54",
  },
  grid: {
    "elk.algorithm": "rectpacking",
    "elk.spacing.nodeNode": "38",
  },
};

const NODE_WIDTH = 216;

function estimateNodeSize(node: IntelGraphNode): { width: number; height: number } {
  const metaCount = node.metadata ? Math.min(3, Object.keys(node.metadata).length) : 0;
  const labelLines = Math.max(1, Math.ceil((node.label?.length || 8) / 22));
  const detailLines = node.detail ? Math.min(3, Math.ceil(node.detail.length / 26)) : 0;
  const height =
    40 +
    labelLines * 17 +
    (detailLines > 0 ? detailLines * 15 + 4 : 0) +
    (metaCount > 0 ? metaCount * 18 + 8 : 0);
  return { width: NODE_WIDTH, height };
}

function isPrimaryNode(node: IntelGraphNode, idx: number): boolean {
  return (
    idx === 0 ||
    node.status === "active" ||
    node.status === "success" ||
    node.type === "conclusion" ||
    node.type === "decision"
  );
}

function orderNodesTopologically(
  rawNodes: IntelGraphNode[],
  rawEdges: IntelGraphEdge[],
): IntelGraphNode[] {
  if (rawNodes.length <= 1) return rawNodes;
  const idSet = new Set(rawNodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const orderIdx = new Map<string, number>();

  rawNodes.forEach((n, i) => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
    orderIdx.set(n.id, i);
  });

  for (const e of rawEdges) {
    if (!idSet.has(e.source) || !idSet.has(e.target) || e.source === e.target) continue;
    adj.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  }

  const queue: IntelGraphNode[] = rawNodes.filter((n) => (inDegree.get(n.id) || 0) === 0);
  const visited = new Set<string>();
  const ordered: IntelGraphNode[] = [];

  while (queue.length > 0) {
    queue.sort((a, b) => (orderIdx.get(a.id) || 0) - (orderIdx.get(b.id) || 0));
    const cur = queue.shift()!;
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);
    ordered.push(cur);
    for (const nxt of adj.get(cur.id) || []) {
      const deg = (inDegree.get(nxt) || 1) - 1;
      inDegree.set(nxt, deg);
      if (deg <= 0 && !visited.has(nxt)) {
        const targetNode = rawNodes.find((n) => n.id === nxt);
        if (targetNode) queue.push(targetNode);
      }
    }
  }

  for (const n of rawNodes) {
    if (!visited.has(n.id)) ordered.push(n);
  }
  return ordered;
}

interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
  contentHeight: number;
}

function pickEdgeHandles(
  src: NodeRect | undefined,
  tgt: NodeRect | undefined,
  layout: string,
  direction: string,
): { sourceHandle: string; targetHandle: string } {
  if (!src || !tgt) {
    return layout === "tree" || direction === "TB"
      ? { sourceHandle: "s-bottom", targetHandle: "t-top" }
      : { sourceHandle: "s-right", targetHandle: "t-left" };
  }
  const dx = tgt.x + tgt.width / 2 - (src.x + src.width / 2);
  const dy = tgt.y + tgt.height / 2 - (src.y + src.height / 2);

  if (layout === "tree" || direction === "TB") {
    if (dy > 16) return { sourceHandle: "s-bottom", targetHandle: "t-top" };
    if (dy < -16) return { sourceHandle: "s-top", targetHandle: "t-bottom" };
    return dx >= 0
      ? { sourceHandle: "s-right", targetHandle: "t-left" }
      : { sourceHandle: "s-left", targetHandle: "t-right" };
  }

  if (layout === "layered" && direction === "LR") {
    if (dx > 16) return { sourceHandle: "s-right", targetHandle: "t-left" };
    if (Math.abs(dy) > Math.abs(dx)) {
      return dy >= 0
        ? { sourceHandle: "s-bottom", targetHandle: "t-top" }
        : { sourceHandle: "s-top", targetHandle: "t-bottom" };
    }
    return dx >= 0
      ? { sourceHandle: "s-right", targetHandle: "t-left" }
      : { sourceHandle: "s-left", targetHandle: "t-right" };
  }

  if (Math.abs(dx) >= Math.abs(dy) * 0.85) {
    return dx >= 0
      ? { sourceHandle: "s-right", targetHandle: "t-left" }
      : { sourceHandle: "s-left", targetHandle: "t-right" };
  }
  return dy >= 0
    ? { sourceHandle: "s-bottom", targetHandle: "t-top" }
    : { sourceHandle: "s-top", targetHandle: "t-bottom" };
}

function buildFlowEdges(
  rawEdges: IntelGraphEdge[],
  validNodeIds: Set<string>,
  nodeRects: Map<string, NodeRect>,
  layout: string,
  direction: string,
): Edge[] {
  const edgeStyleMap: Record<string, string> = {
    causal: "3 4",
    dependency: "6 3",
    data_flow: "1 0",
    sequence: "1 0",
    association: "4 4",
    default: "1 0",
  };

  return rawEdges
    .filter((edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target))
    .map((edge, idx) => {
      const handles = pickEdgeHandles(
        nodeRects.get(edge.source),
        nodeRects.get(edge.target),
        layout,
        direction,
      );
      return {
        id: edge.id || `e-${edge.source}-${edge.target}-${idx}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        label: edge.label,
        animated: edge.animated ?? edge.type === "data_flow",
        type: "smoothstep" as const,
        pathOptions: { borderRadius: 14, offset: 20 },
        style: {
          stroke: "rgba(239, 140, 102, 0.42)",
          strokeDasharray: edgeStyleMap[edge.type || "default"],
          strokeWidth: 1.7 + (edge.strength || 0.25),
        },
        labelStyle: {
          fill: "var(--gu-ink, #141416)",
          fontSize: 11,
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: "var(--gu-card, #ffffff)",
          fillOpacity: 0.96,
          stroke: "rgba(239, 140, 102, 0.24)",
          strokeWidth: 1,
        },
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 8,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: "#ef8c66",
        },
      } as Edge;
    });
}

async function computeElkLayout(
  graphData: IntelGraphData,
  layoutOverride?: NonNullable<IntelGraphData["layout"]>,
): Promise<LayoutResult> {
  const layout = layoutOverride || graphData.layout || "layered";
  const direction = layout === "tree" ? "TB" : graphData.direction || "LR";

  const validNodeIds = new Set(graphData.nodes.map((n) => n.id));
  const safeEdges = graphData.edges.filter(
    (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target) && e.source !== e.target,
  );

  const layoutOptions = {
    ...(ELK_LAYOUT_OPTIONS[layout] || ELK_LAYOUT_OPTIONS.layered),
  };

  if (layout === "tree") {
    layoutOptions["elk.direction"] = "DOWN";
  } else if (direction && layoutOptions["elk.direction"]) {
    const dirMap: Record<string, string> = {
      TB: "DOWN",
      BT: "UP",
      LR: "RIGHT",
      RL: "LEFT",
    };
    layoutOptions["elk.direction"] = dirMap[direction] || "RIGHT";
  }

  const dimMap = new Map<string, { width: number; height: number }>();
  graphData.nodes.forEach((node) => {
    dimMap.set(node.id, estimateNodeSize(node));
  });

  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions,
    children: graphData.nodes.map((node) => {
      const sz = dimMap.get(node.id) || { width: NODE_WIDTH, height: 64 };
      return {
        id: node.id,
        width: sz.width,
        height: sz.height,
      };
    }),
    edges: safeEdges.map(
      (edge, idx): ElkExtendedEdge => ({
        id: edge.id || `elk-e-${idx}`,
        sources: [edge.source],
        targets: [edge.target],
      }),
    ),
  };

  const isHorizontal = direction === "LR" || direction === "RL";

  try {
    const layouted = await elk.layout(elkGraph);
    const children = layouted.children || [];
    const minX = children.length > 0 ? Math.min(...children.map((c) => c.x || 0)) : 0;
    const minY = children.length > 0 ? Math.min(...children.map((c) => c.y || 0)) : 0;

    let treeYScale = 1;
    if (layout === "tree" && children.length > 1) {
      const rawYs = children.map((c) => (c.y || 0) - minY).sort((a, b) => a - b);
      const uniqueLevels: number[] = [];
      for (const y of rawYs) {
        if (uniqueLevels.length === 0 || y - uniqueLevels[uniqueLevels.length - 1] > 8) {
          uniqueLevels.push(y);
        }
      }
      if (uniqueLevels.length > 1) {
        let minStep = Infinity;
        for (let i = 1; i < uniqueLevels.length; i++) {
          const step = uniqueLevels[i] - uniqueLevels[i - 1];
          if (step > 8 && step < minStep) minStep = step;
        }
        if (minStep < 112) {
          treeYScale = Math.max(1.35, 112 / Math.max(1, minStep));
        }
      }
    }

    const nodeRects = new Map<string, NodeRect>();
    let maxBottom = 160;
    const nodes: Node[] = children.map((elkNode) => {
      const idx = graphData.nodes.findIndex((n) => n.id === elkNode.id);
      const original = idx >= 0 ? graphData.nodes[idx] : graphData.nodes[0];
      const sz = dimMap.get(elkNode.id) || { width: NODE_WIDTH, height: 64 };
      const nx = (elkNode.x || 0) - minX;
      const ny = Math.round(((elkNode.y || 0) - minY) * treeYScale);
      maxBottom = Math.max(maxBottom, ny + sz.height);
      nodeRects.set(elkNode.id, { x: nx, y: ny, width: sz.width, height: sz.height });
      return {
        id: elkNode.id,
        position: { x: nx, y: ny },
        data: {
          label: original.label,
          detail: original.detail,
          icon: original.icon,
          status: original.status,
          type: original.type,
          metadata: original.metadata,
          children: original.children,
          horizontal: isHorizontal,
          stepIndex: idx >= 0 ? idx + 1 : 1,
          isPrimary: isPrimaryNode(original, Math.max(0, idx)),
        },
        type: "intelNode",
        style: {
          width: sz.width,
          minHeight: sz.height,
        },
      };
    });

    return {
      nodes,
      edges: buildFlowEdges(graphData.edges, validNodeIds, nodeRects, layout, direction),
      contentHeight: maxBottom,
    };
  } catch {
    const cols = Math.max(2, Math.ceil(Math.sqrt(graphData.nodes.length)));
    const nodeRects = new Map<string, NodeRect>();
    let maxBottom = 160;
    const nodes: Node[] = graphData.nodes.map((original, idx) => {
      const sz = dimMap.get(original.id) || { width: NODE_WIDTH, height: 64 };
      const nx = (idx % cols) * (NODE_WIDTH + 56);
      const ny = Math.floor(idx / cols) * 132;
      maxBottom = Math.max(maxBottom, ny + sz.height);
      nodeRects.set(original.id, { x: nx, y: ny, width: sz.width, height: sz.height });
      return {
        id: original.id,
        position: { x: nx, y: ny },
        data: {
          label: original.label,
          detail: original.detail,
          icon: original.icon,
          status: original.status,
          type: original.type,
          metadata: original.metadata,
          children: original.children,
          horizontal: isHorizontal,
          stepIndex: idx + 1,
          isPrimary: isPrimaryNode(original, idx),
        },
        type: "intelNode",
        style: {
          width: sz.width,
          minHeight: sz.height,
        },
      };
    });
    return {
      nodes,
      edges: buildFlowEdges(graphData.edges, validNodeIds, nodeRects, layout, direction),
      contentHeight: maxBottom,
    };
  }
}

/* ═══════════════════ Custom Momo Badge Node ═══════════════════ */

function IntelNodeComponent({
  data,
  selected,
}: {
  data: Record<string, unknown>;
  selected?: boolean;
}) {
  const label = (data.label as string) || "";
  const detail = data.detail as string | undefined;
  const stepIndex = typeof data.stepIndex === "number" ? data.stepIndex : 1;
  const isPrimary = Boolean(data.isPrimary);
  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? Object.entries(data.metadata as Record<string, unknown>).slice(0, 3)
      : [];

  return (
    <motion.div
      className={`intel-node ${selected ? "intel-node--selected" : ""}`}
      data-active={isPrimary ? "true" : undefined}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <Handle id="t-top" type="target" position={Position.Top} className="intel-node__handle" />
      <Handle id="t-right" type="target" position={Position.Right} className="intel-node__handle" />
      <Handle id="t-bottom" type="target" position={Position.Bottom} className="intel-node__handle" />
      <Handle id="t-left" type="target" position={Position.Left} className="intel-node__handle" />
      <div className="intel-node__row">
        <span className={`intel-node__badge ${isPrimary || selected ? "is-accent" : ""}`}>
          {stepIndex}
        </span>
        <div className="intel-node__body">
          <div className="intel-node__label">{label}</div>
          {detail && <div className="intel-node__detail">{detail}</div>}
          {metadata.length > 0 && (
            <dl className="intel-node__kv">
              {metadata.map(([k, v]) => (
                <div key={k} className="intel-node__kv-row">
                  <dt>{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
      <Handle id="s-top" type="source" position={Position.Top} className="intel-node__handle" />
      <Handle id="s-right" type="source" position={Position.Right} className="intel-node__handle" />
      <Handle id="s-bottom" type="source" position={Position.Bottom} className="intel-node__handle" />
      <Handle id="s-left" type="source" position={Position.Left} className="intel-node__handle" />
    </motion.div>
  );
}

const nodeTypes: NodeTypes = {
  intelNode: IntelNodeComponent as unknown as NodeTypes[string],
};

/* ═══════════════════ Node Inspector Panel ═══════════════════ */

function NodeInspector({
  node,
  edges,
  onClose,
}: {
  node: IntelGraphNode | null;
  edges: IntelGraphEdge[];
  onClose: () => void;
}) {
  const incoming = node ? edges.filter((e) => e.target === node.id) : [];
  const outgoing = node ? edges.filter((e) => e.source === node.id) : [];

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key={node.id}
          className="intel-graph__inspector"
          initial={{ opacity: 0, x: 14, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 10, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        >
          <div className="intel-graph__inspector-header">
            <h4>{node.label}</h4>
            <motion.button
              type="button"
              onClick={onClose}
              className="intel-graph__inspector-close"
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              aria-label="Close inspector"
            >
              <X size={14} />
            </motion.button>
          </div>
          {node.type && (
            <div className="intel-graph__inspector-row">
              <span className="intel-graph__inspector-key">Type</span>
              <span>{node.type}</span>
            </div>
          )}
          {node.detail && (
            <div className="intel-graph__inspector-row">
              <span className="intel-graph__inspector-key">Detail</span>
              <span>{node.detail}</span>
            </div>
          )}
          {node.status && (
            <div className="intel-graph__inspector-row">
              <span className="intel-graph__inspector-key">Status</span>
              <span className="intel-graph__inspector-status">{node.status}</span>
            </div>
          )}
          <div className="intel-graph__inspector-row">
            <span className="intel-graph__inspector-key">Connections</span>
            <span>
              {incoming.length} in / {outgoing.length} out
            </span>
          </div>
          {node.metadata &&
            Object.entries(node.metadata).map(([k, v]) => (
              <div key={k} className="intel-graph__inspector-row">
                <span className="intel-graph__inspector-key">{k}</span>
                <span>{String(v)}</span>
              </div>
            ))}
          {node.children && node.children.length > 0 && (
            <div className="intel-graph__inspector-children">
              <span className="intel-graph__inspector-key">
                Children ({node.children.length})
              </span>
              {node.children.map((c) => (
                <div key={c.id} className="intel-graph__inspector-child">
                  {c.label}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════ Main Graph Component (Fit-Content, Zero Minimap) ═══════════════════ */

export interface IntelligenceGraphProps {
  graphData: IntelGraphData;
  title?: string;
  caption?: string;
  variant?: "default" | "minimal" | "pill" | "blueprint";
  /** Kept for caller compatibility; minimap is disabled per design system */
  minimap?: boolean;
  showGrid?: boolean;
  allowLayoutSwitch?: boolean;
  height?: number | string;
  customNodeTypes?: NodeTypes;
  onNodeClick?: (node: IntelGraphNode) => void;
  onEdgeClick?: (edge: IntelGraphEdge) => void;
  controls?: ReactNode;
}

const FIT_VIEW_OPTIONS: FitViewOptions = {
  padding: 0.12,
  maxZoom: 1.05,
  duration: 220,
};

const LAYOUT_OPTIONS: Array<{ id: NonNullable<IntelGraphData["layout"]>; label: string }> = [
  { id: "layered", label: "Layered" },
  { id: "tree", label: "Tree" },
  { id: "force", label: "Force" },
  { id: "radial", label: "Radial" },
];

export default function IntelligenceGraph({
  graphData,
  title,
  caption,
  variant,
  allowLayoutSwitch = true,
  height,
  customNodeTypes,
  onNodeClick,
  onEdgeClick,
  controls,
}: IntelligenceGraphProps) {
  const ctxVariant = useContext(IntelVariantContext);
  const resolvedVariant = (variant || ctxVariant || "default") as NonNullable<
    IntelligenceGraphProps["variant"]
  >;
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<IntelGraphNode | null>(null);
  const [activeLayout, setActiveLayout] = useState<NonNullable<IntelGraphData["layout"]>>(
    graphData.layout || "layered",
  );
  const [contentHeight, setContentHeight] = useState<number>(220);
  const [fullscreen, setFullscreen] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  useEffect(() => {
    setActiveLayout(graphData.layout || "layered");
  }, [graphData.layout, resolvedVariant]);

  useEffect(() => {
    if (resolvedVariant !== "default") {
      setLayoutReady(true);
      return;
    }
    let cancelled = false;
    setLayoutReady(false);
    computeElkLayout(graphData, activeLayout).then((result) => {
      if (cancelled) return;
      setNodes(result.nodes);
      setEdges(result.edges);
      setContentHeight(result.contentHeight);
      setLayoutReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [graphData, activeLayout, resolvedVariant, setNodes, setEdges]);

  useEffect(() => {
    if (!layoutReady || resolvedVariant !== "default") return;
    const raf = requestAnimationFrame(() => {
      rfInstanceRef.current?.fitView(FIT_VIEW_OPTIONS);
    });
    return () => cancelAnimationFrame(raf);
  }, [layoutReady, nodes.length, contentHeight, resolvedVariant]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof ResizeObserver === "undefined" || resolvedVariant !== "default") return;
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        rfInstanceRef.current?.fitView(FIT_VIEW_OPTIONS);
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resolvedVariant]);

  const orderedNodes = useMemo(
    () => orderNodesTopologically(graphData.nodes, graphData.edges),
    [graphData.nodes, graphData.edges],
  );

  const nodeLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    graphData.nodes.forEach((n) => map.set(n.id, n.label));
    return map;
  }, [graphData.nodes]);

  const styledEdges = useMemo(() => {
    if (!selectedNode) return edges;
    return edges.map((e) => {
      const connected = e.source === selectedNode.id || e.target === selectedNode.id;
      return {
        ...e,
        animated: connected,
        style: {
          ...e.style,
          stroke: connected ? "var(--gu-accent, #ef8c66)" : "var(--gu-line-2, rgba(128,128,140,0.28))",
          strokeWidth: connected ? 2.2 : 1.1,
          opacity: connected ? 1 : 0.36,
        },
        labelStyle: {
          fill: connected ? "var(--gu-ink, #141416)" : "var(--gu-ink-3, #6b6b73)",
          fontSize: 10.5,
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: "transparent",
          fillOpacity: 0,
          stroke: "none",
          strokeWidth: 0,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: connected ? "#ef8c66" : "#8e909b",
        },
      };
    });
  }, [edges, selectedNode]);

  const mergedNodeTypes = useMemo(
    () => ({ ...nodeTypes, ...customNodeTypes }),
    [customNodeTypes],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const original = graphData.nodes.find((n) => n.id === node.id);
      if (original) {
        setSelectedNode(original);
        onNodeClick?.(original);
      }
    },
    [graphData.nodes, onNodeClick],
  );

  const selectDirectNode = useCallback(
    (nd: IntelGraphNode) => {
      setSelectedNode((prev) => (prev?.id === nd.id ? null : nd));
      onNodeClick?.(nd);
    },
    [onNodeClick],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const original = graphData.edges.find((e) => e.id === edge.id);
      if (original) onEdgeClick?.(original);
    },
    [graphData.edges, onEdgeClick],
  );

  const toggleFullscreen = useCallback(() => {
    if (!fullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
      setFullscreen(true);
    } else if (fullscreen) {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }, [fullscreen]);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const fittedHeight = Math.max(200, Math.min(480, Math.round(contentHeight + 36)));
  const pixelHeight = typeof height === "number" ? Math.max(180, height) : fittedHeight;
  const canvasBoxStyle: CSSProperties = {
    width: "100%",
    height: fullscreen ? "100%" : `${pixelHeight}px`,
    minHeight: fullscreen ? 320 : `${pixelHeight}px`,
  };

  return (
    <div
      ref={containerRef}
      className={`intel-graph ${fullscreen ? "intel-graph--fullscreen" : ""}`}
      data-variant={resolvedVariant}
      style={{ height: fullscreen ? "100vh" : "auto" }}
    >
      {(title || (allowLayoutSwitch && resolvedVariant === "default") || controls) && (
        <div className="intel-graph__header">
          <div>
            <div className="gu-pen intel-hand-note">{activeLayout} graph</div>
            <h3 className="gu-title intel-graph__title">{title || "Visual Reasoning"}</h3>
          </div>
          <div className="intel-graph__header-controls">
            {allowLayoutSwitch && resolvedVariant === "default" && (
              <div className="intel-graph__layout-pills" role="group" aria-label="Graph layout">
                {LAYOUT_OPTIONS.map((opt) => (
                  <motion.button
                    key={opt.id}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 450, damping: 28 }}
                    className={`intel-graph__layout-pill ${
                      activeLayout === opt.id ? "is-active" : ""
                    }`}
                    onClick={() => setActiveLayout(opt.id)}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            )}
            {controls}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="intel-graph__btn"
              onClick={toggleFullscreen}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </motion.button>
          </div>
        </div>
      )}

      {resolvedVariant === "default" && (
        <div
          ref={canvasRef}
          className="intel-graph__canvas"
          style={canvasBoxStyle}
        >
          {!layoutReady && (
            <div className="intel-graph__loading">
              <div className="intel-graph__loading-spinner" />
              <span>Computing layout...</span>
            </div>
          )}

          {layoutReady && (
            <>
              <div className="intel-canvas-zoom" role="group" aria-label="Canvas zoom controls">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                  className="intel-canvas-zoom__btn"
                  title="Zoom in"
                  aria-label="Zoom in"
                  onClick={() => rfInstanceRef.current?.zoomIn({ duration: 180 })}
                >
                  <Plus size={13} />
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                  className="intel-canvas-zoom__btn"
                  title="Zoom out"
                  aria-label="Zoom out"
                  onClick={() => rfInstanceRef.current?.zoomOut({ duration: 180 })}
                >
                  <Minus size={13} />
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                  className="intel-canvas-zoom__btn"
                  title="Fit view"
                  aria-label="Reset zoom"
                  onClick={() => rfInstanceRef.current?.fitView(FIT_VIEW_OPTIONS)}
                >
                  <RotateCcw size={12} />
                </motion.button>
              </div>
              <ReactFlow
                style={{
                  width: "100%",
                  height: fullscreen ? "100%" : `${pixelHeight}px`,
                }}
                nodes={nodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onPaneClick={() => setSelectedNode(null)}
                onInit={(inst) => {
                  rfInstanceRef.current = inst;
                  requestAnimationFrame(() => inst.fitView(FIT_VIEW_OPTIONS));
                }}
                nodeTypes={mergedNodeTypes}
                fitView
                fitViewOptions={FIT_VIEW_OPTIONS}
                zoomOnScroll={false}
                preventScrolling={false}
                proOptions={{ hideAttribution: true }}
                minZoom={0.2}
                maxZoom={2}
                defaultEdgeOptions={{
                  type: "smoothstep",
                  animated: false,
                }}
              />
            </>
          )}

          <NodeInspector
            node={selectedNode}
            edges={graphData.edges}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}

      {resolvedVariant === "minimal" && (
        <div className="intel-graph__structural">
          <ol className="gu-flow-cascade intel-graph-cascade" role="list">
            {orderedNodes.map((nd, idx) => {
              const isSelected = selectedNode?.id === nd.id;
              const isAccent = isSelected || isPrimaryNode(nd, idx);
              const outEdges = graphData.edges.filter((e) => e.source === nd.id);
              const stepStyle = { "--cascade-step": idx } as CSSProperties;
              return (
                <motion.li
                  key={nd.id}
                  className="gu-flow-cascade__row"
                  style={stepStyle}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28, delay: Math.min(idx * 0.025, 0.2) }}
                >
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    className={`gu-flow-cascade__card ${isSelected ? "is-active" : ""}`}
                    onClick={() => selectDirectNode(nd)}
                  >
                    <span className={`gu-flow-cascade__num ${isAccent ? "is-active" : ""}`}>
                      {idx + 1}
                    </span>
                    <div className="gu-flow-cascade__body">
                      <strong>{nd.label}</strong>
                      {nd.detail && <div className="gu-flow-cascade__sub">{nd.detail}</div>}
                      {outEdges.length > 0 && (
                        <div className="intel-graph-edge-chips">
                          {outEdges.slice(0, 3).map((e, eIdx) => (
                            <span key={e.id || eIdx} className="intel-graph-edge-chip">
                              <ArrowRight size={10} />
                              {e.label ? `${e.label}: ` : ""}
                              {nodeLabelMap.get(e.target) || e.target}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.button>
                  {idx < orderedNodes.length - 1 && (
                    <div
                      className={`gu-flow-cascade__elbow ${isAccent ? "is-active" : ""}`}
                      aria-hidden="true"
                    />
                  )}
                </motion.li>
              );
            })}
          </ol>
          <NodeInspector
            node={selectedNode}
            edges={graphData.edges}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}

      {resolvedVariant === "pill" && (
        <div className="intel-graph__structural">
          <ol className="intel-graph-pills" role="list">
            {orderedNodes.map((nd, idx) => {
              const isSelected = selectedNode?.id === nd.id;
              const isAccent = isSelected || isPrimaryNode(nd, idx);
              const outEdge = graphData.edges.find((e) => e.source === nd.id);
              return (
                <motion.li
                  key={nd.id}
                  className="intel-graph-pill-item"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28, delay: Math.min(idx * 0.025, 0.2) }}
                >
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    className={`intel-graph-pill-card ${isSelected ? "is-selected" : ""} ${
                      isAccent ? "is-accent" : ""
                    }`}
                    onClick={() => selectDirectNode(nd)}
                  >
                    <span className={`intel-node__badge ${isAccent ? "is-accent" : ""}`}>
                      {idx + 1}
                    </span>
                    <div className="intel-graph-pill-text">
                      <strong>{nd.label}</strong>
                      {nd.detail && <span>{nd.detail}</span>}
                    </div>
                  </motion.button>
                  {idx < orderedNodes.length - 1 && (
                    <span className="intel-graph-pill-conn" aria-hidden="true">
                      <ArrowRight size={13} />
                      {outEdge?.label && <em>{outEdge.label}</em>}
                    </span>
                  )}
                </motion.li>
              );
            })}
          </ol>
          <NodeInspector
            node={selectedNode}
            edges={graphData.edges}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}

      {resolvedVariant === "blueprint" && (
        <div className="intel-graph__structural">
          <div className="intel-graph-editorial" role="table" aria-label={title || "Graph relation table"}>
            <div className="intel-graph-editorial__row is-head" role="row">
              <span role="columnheader">Step / Node</span>
              <span role="columnheader">Detail &amp; Metadata</span>
              <span role="columnheader">Connections</span>
            </div>
            {orderedNodes.map((nd, idx) => {
              const isSelected = selectedNode?.id === nd.id;
              const isAccent = isSelected || isPrimaryNode(nd, idx);
              const outgoing = graphData.edges.filter((e) => e.source === nd.id);
              const incoming = graphData.edges.filter((e) => e.target === nd.id);
              const metaEntries = nd.metadata ? Object.entries(nd.metadata).slice(0, 2) : [];
              return (
                <motion.button
                  key={nd.id}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28, delay: Math.min(idx * 0.025, 0.2) }}
                  className={`intel-graph-editorial__row ${isSelected ? "is-selected" : ""}`}
                  onClick={() => selectDirectNode(nd)}
                  role="row"
                >
                  <span className="intel-graph-editorial__node" role="cell">
                    <span className={`intel-node__dot ${isAccent ? "is-accent" : ""}`} />
                    <span className="intel-graph-editorial__idx">0{idx + 1}</span>
                    <strong>{nd.label}</strong>
                  </span>
                  <span className="intel-graph-editorial__detail" role="cell">
                    <span>{nd.detail || nd.type || "Node"}</span>
                    {metaEntries.length > 0 && (
                      <small>
                        {metaEntries.map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                      </small>
                    )}
                  </span>
                  <span className="intel-graph-editorial__links" role="cell">
                    {outgoing.length > 0
                      ? outgoing.map((e, i) => (
                          <span key={e.id || i} className="intel-graph-edge-chip">
                            <ArrowRight size={10} />
                            {e.label ? `${e.label} · ` : ""}
                            {nodeLabelMap.get(e.target) || e.target}
                          </span>
                        ))
                      : incoming.length > 0
                        ? `${incoming.length} upstream input${incoming.length > 1 ? "s" : ""}`
                        : "Terminal node"}
                  </span>
                </motion.button>
              );
            })}
          </div>
          <NodeInspector
            node={selectedNode}
            edges={graphData.edges}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}

      {caption && <div className="gu-caption intel-graph__caption">{caption}</div>}
    </div>
  );
}
