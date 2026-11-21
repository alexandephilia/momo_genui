"use client";

/**
 * Category 02 — Visual Reasoning UI (15 Components)
 * Powered by XYFlow + ELK.js via IntelligenceGraph + bespoke Fishbone & Sequence renderers.
 *
 * Components:
 * - hypothesis_tree, concept_map, dependency_graph, system_diagram,
 *   causal_graph, influence_diagram, network_graph, entity_relationship_map,
 *   argument_map, sequence_diagram, state_machine, root_cause_tree,
 *   five_whys, fishbone_diagram, fault_tree
 */

import { useState, useContext, type ComponentType } from "react";
import { motion } from "motion/react";
import { GitBranch, Share2, Workflow, Cpu, Plus, Minus, RotateCcw } from "lucide-react";
import IntelligenceGraph from "./IntelligenceGraph";
import type {
  IntelBaseProps,
  IntelGraphData,
  IntelGraphEdge,
  IntelGraphNode,
} from "@/lib/intelligence/types";
import { IntelVariantContext, s, a } from "../shared/IntelCardShell";

interface GraphWrapperPreset {
  defaultTitle: string;
  layout: NonNullable<IntelGraphData["layout"]>;
  direction: NonNullable<IntelGraphData["direction"]>;
  defaultNodeType: string;
  defaultEdgeType: NonNullable<IntelGraphEdge["type"]>;
}

function buildGraphData(
  data: Record<string, unknown>,
  preset: GraphWrapperPreset,
): IntelGraphData {
  const rawNodes = a<Record<string, unknown>>(data.nodes);
  const rawEdges = a<Record<string, unknown>>(data.edges);

  return {
    nodes: rawNodes.map((n, i): IntelGraphNode => ({
      id: s(n.id, `node-${i}`),
      label: s(n.label, "Untitled"),
      type: s(n.type, preset.defaultNodeType),
      detail: s(n.detail) || undefined,
      status: (n.status as IntelGraphNode["status"]) || undefined,
      metadata: n.metadata as Record<string, unknown> | undefined,
      children: n.children as IntelGraphNode[] | undefined,
    })),
    edges: rawEdges.map((e, i): IntelGraphEdge => ({
      id: s(e.id, `edge-${i}`),
      source: s(e.source),
      target: s(e.target),
      label: s(e.label) || undefined,
      type: (e.type as IntelGraphEdge["type"]) || preset.defaultEdgeType,
      animated: Boolean(e.animated),
      strength: typeof e.strength === "number" ? e.strength : undefined,
    })),
    layout: (s(data.layout) as IntelGraphData["layout"]) || preset.layout,
    direction:
      (s(data.direction) as IntelGraphData["direction"]) || preset.direction,
  };
}

function makeVisualGraphComponent(
  preset: GraphWrapperPreset,
): ComponentType<IntelBaseProps> {
  return function VisualGraphComponent({
    data,
    config,
    state,
    onAction,
  }: IntelBaseProps) {
    const title = s(data.title) || s(config?.title) || preset.defaultTitle;

    if (state === "loading") {
      return (
        <div className="intel-graph-wrapper">
          <div className="intel-graph-wrapper__shimmer" style={{ height: 220 }}>
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
          <span>{s(data.error, `Failed to load ${preset.defaultTitle}`)}</span>
        </div>
      );
    }

    const rawNodes = a<Record<string, unknown>>(data.nodes);
    if (state === "empty" || rawNodes.length === 0) {
      return (
        <div className="intel-graph-wrapper intel-graph-wrapper--empty">
          <Share2 size={20} />
          <span>No graph nodes available for {preset.defaultTitle}</span>
        </div>
      );
    }

    const graphData = buildGraphData(data, preset);

    return (
      <IntelligenceGraph
        graphData={graphData}
        title={title}
        caption={s(data.caption) || undefined}
        height={typeof config?.height === "number" ? config.height : undefined}
        onNodeClick={(node) =>
          onAction?.({ type: "select", payload: { nodeId: node.id, node } })
        }
      />
    );
  };
}

export const HypothesisTree = makeVisualGraphComponent({
  defaultTitle: "Hypothesis Tree",
  layout: "tree",
  direction: "TB",
  defaultNodeType: "inference",
  defaultEdgeType: "causal",
});

export const ConceptMap = makeVisualGraphComponent({
  defaultTitle: "Concept Map",
  layout: "force",
  direction: "LR",
  defaultNodeType: "concept",
  defaultEdgeType: "association",
});

export const DependencyGraph = makeVisualGraphComponent({
  defaultTitle: "Dependency Graph",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "service",
  defaultEdgeType: "dependency",
});

export const SystemDiagram = makeVisualGraphComponent({
  defaultTitle: "System Diagram",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "service",
  defaultEdgeType: "data_flow",
});

export const CausalGraph = makeVisualGraphComponent({
  defaultTitle: "Causal Graph",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "inference",
  defaultEdgeType: "causal",
});

export const InfluenceDiagram = makeVisualGraphComponent({
  defaultTitle: "Influence Diagram",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "decision",
  defaultEdgeType: "causal",
});

export const NetworkGraph = makeVisualGraphComponent({
  defaultTitle: "Network Graph",
  layout: "force",
  direction: "LR",
  defaultNodeType: "entity",
  defaultEdgeType: "association",
});

export const EntityRelationshipMap = makeVisualGraphComponent({
  defaultTitle: "Entity Relationship Map",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "database",
  defaultEdgeType: "dependency",
});

export const ArgumentMap = makeVisualGraphComponent({
  defaultTitle: "Argument Map",
  layout: "tree",
  direction: "TB",
  defaultNodeType: "premise",
  defaultEdgeType: "causal",
});

export const StateMachine = makeVisualGraphComponent({
  defaultTitle: "State Machine",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "process",
  defaultEdgeType: "sequence",
});

export const RootCauseTree = makeVisualGraphComponent({
  defaultTitle: "Root Cause Tree",
  layout: "tree",
  direction: "TB",
  defaultNodeType: "fault",
  defaultEdgeType: "causal",
});

export const FaultTree = makeVisualGraphComponent({
  defaultTitle: "Fault Tree",
  layout: "tree",
  direction: "TB",
  defaultNodeType: "fault",
  defaultEdgeType: "causal",
});

/* ═══════════════════ SequenceDiagram (Bespoke Lifeline + 4 Variants) ═══════════════════ */

const SequenceGraphFallback = makeVisualGraphComponent({
  defaultTitle: "Sequence Diagram",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "service",
  defaultEdgeType: "sequence",
});

export function SequenceDiagram(props: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const { data, state, config, onAction } = props;
  const [activeMsg, setActiveMsg] = useState<string | null>(null);
  const [activeActor, setActiveActor] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  if (variant !== "default") {
    return <SequenceGraphFallback {...props} />;
  }

  const title = s(data.title) || s(config?.title) || "Sequence Diagram";
  const rawNodes = a<Record<string, unknown>>(data.nodes);
  const rawEdges = a<Record<string, unknown>>(data.edges);

  if (state === "loading") {
    return (
      <div className="intel-graph-wrapper">
        <div className="intel-graph-wrapper__shimmer" style={{ height: 220 }}>
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
        <span>{s(data.error, "Failed to load sequence diagram")}</span>
      </div>
    );
  }
  if (state === "empty" || rawNodes.length === 0) {
    return (
      <div className="intel-graph-wrapper intel-graph-wrapper--empty">
        <Workflow size={20} />
        <span>No sequence actors provided</span>
      </div>
    );
  }

  const actors = rawNodes.map((n, i) => ({
    id: s(n.id, `actor-${i}`),
    label: s(n.label, `Actor ${i + 1}`),
    detail: s(n.detail) || undefined,
  }));
  const actorIndexMap = new Map<string, number>();
  actors.forEach((act, i) => actorIndexMap.set(act.id, i));

  const messages = rawEdges.map((e, i) => {
    const srcId = s(e.source);
    const tgtId = s(e.target);
    const srcIdx = actorIndexMap.get(srcId) ?? 0;
    const tgtIdx = actorIndexMap.get(tgtId) ?? Math.min(actors.length - 1, srcIdx + 1);
    return {
      id: s(e.id, `msg-${i}`),
      label: s(e.label, `Step ${i + 1}`),
      srcIdx,
      tgtIdx,
      isReturn: tgtIdx < srcIdx,
      isSelf: tgtIdx === srcIdx,
    };
  });

  const colCount = Math.max(2, actors.length);
  const colCenterPct = (idx: number) => ((idx + 0.5) / colCount) * 100;

  return (
    <div className="intel-seq" data-variant="default">
      <div className="intel-graph__header">
        <h3 className="gu-title intel-graph__title">{title}</h3>
      </div>

      <div className="intel-seq__stage-wrap">
        <div className="intel-canvas-zoom" role="group" aria-label="Sequence zoom controls">
          <motion.button
            type="button"
            className="intel-canvas-zoom__btn"
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.15).toFixed(2)))}
          >
            <Plus size={13} />
          </motion.button>
          <motion.button
            type="button"
            className="intel-canvas-zoom__btn"
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
          >
            <Minus size={13} />
          </motion.button>
          <motion.button
            type="button"
            className="intel-canvas-zoom__btn"
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            title="Reset zoom"
            aria-label="Reset zoom"
            onClick={() => setZoom(1)}
          >
            <RotateCcw size={12} />
          </motion.button>
        </div>

        <div
          className="intel-seq__zoom-inner"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            transition: "transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div className="intel-seq__actors" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
            {actors.map((act, idx) => {
              const isActorActive = activeActor === act.id || (activeActor === null && idx === 0);
              return (
                <motion.button
                  key={act.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className={`intel-seq__actor ${isActorActive ? "is-primary" : ""}`}
                  onClick={() => {
                    setActiveActor(activeActor === act.id ? null : act.id);
                    onAction?.({ type: "select", payload: { nodeId: act.id, node: act } });
                  }}
                >
                  <span className={`intel-node__badge ${isActorActive ? "is-accent" : ""}`}>
                    {idx + 1}
                  </span>
                  <span className="intel-seq__actor-name">{act.label}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="intel-seq__stage">
            <div
              className="intel-seq__lifelines"
              style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
              aria-hidden="true"
            >
              {actors.map((act) => (
                <div key={act.id} className="intel-seq__lifeline-col">
                  <div className={`intel-seq__lifeline ${activeActor === act.id ? "is-active" : ""}`} />
                </div>
              ))}
            </div>

            <div className="intel-seq__messages">
              {messages.map((m, idx) => {
                const leftCol = Math.min(m.srcIdx, m.tgtIdx);
                const rightCol = Math.max(m.srcIdx, m.tgtIdx);
                const startPct = colCenterPct(leftCol);
                const spanPct = m.isSelf
                  ? 18
                  : Math.max(8, colCenterPct(rightCol) - startPct);
                const isSelected = activeMsg === m.id;
                const touchesActor =
                  activeActor !== null &&
                  (actors[m.srcIdx]?.id === activeActor || actors[m.tgtIdx]?.id === activeActor);

                return (
                  <div key={m.id} className="intel-seq__row">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.985 }}
                      transition={{ type: "spring", stiffness: 420, damping: 28 }}
                      onClick={() => setActiveMsg(isSelected ? null : m.id)}
                      className={`intel-seq__connector ${m.isReturn ? "is-return" : "is-call"} ${isSelected || touchesActor ? "is-active" : ""}`}
                      style={{ left: `${startPct}%`, width: `${spanPct}%` }}
                    >
                      <span className="intel-seq__msg-pill">
                        <b>{idx + 1}</b>
                        <span>{m.label.replace(/^\d+\.\s*/, "")}</span>
                      </span>
                      <div className="intel-seq__arrow-line">
                        <span className="intel-seq__endpoint is-start" />
                        {m.isReturn && <span className="intel-seq__arrowhead is-left" />}
                        <span className="intel-seq__line-bar" />
                        {!m.isReturn && <span className="intel-seq__arrowhead is-right" />}
                        <span className="intel-seq__endpoint is-end" />
                      </div>
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ FishboneDiagram (Bespoke Ishikawa + 4 Variants) ═══════════════════ */

const FishboneGraphFallback = makeVisualGraphComponent({
  defaultTitle: "Fishbone (Ishikawa) Diagram",
  layout: "layered",
  direction: "LR",
  defaultNodeType: "inference",
  defaultEdgeType: "causal",
});

export function FishboneDiagram(props: IntelBaseProps) {
  const variant = useContext(IntelVariantContext);
  const { data, state, config, onAction } = props;
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  if (variant !== "default") {
    return <FishboneGraphFallback {...props} />;
  }

  const title = s(data.title) || s(config?.title) || "Fishbone Diagram";
  const rawNodes = a<Record<string, unknown>>(data.nodes);
  const rawEdges = a<Record<string, unknown>>(data.edges);

  if (state === "loading") {
    return (
      <div className="intel-graph-wrapper">
        <div className="intel-graph-wrapper__shimmer" style={{ height: 220 }}>
          <div className="intel-graph-wrapper__shimmer-title" />
          <div className="intel-graph-wrapper__shimmer-body" />
        </div>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="intel-graph-wrapper intel-graph-wrapper--error">
        <Cpu size={20} />
        <span>{s(data.error, "Failed to load fishbone diagram")}</span>
      </div>
    );
  }
  if (state === "empty" || rawNodes.length === 0) {
    return (
      <div className="intel-graph-wrapper intel-graph-wrapper--empty">
        <Cpu size={20} />
        <span>No cause-and-effect nodes available</span>
      </div>
    );
  }

  const nodes = rawNodes.map((n, i) => ({
    id: s(n.id, `n-${i}`),
    label: s(n.label, "Factor"),
    type: s(n.type, "inference"),
    status: s(n.status),
  }));
  const edges = rawEdges.map((e) => ({
    source: s(e.source),
    target: s(e.target),
  }));

  const outCount = new Map<string, number>();
  edges.forEach((e) => outCount.set(e.source, (outCount.get(e.source) || 0) + 1));

  const effectNode =
    nodes.find((n) => n.status === "error" || n.type === "fault") ||
    nodes.find((n) => (outCount.get(n.id) || 0) === 0) ||
    nodes[0];

  const categoryEdges = edges.filter((e) => e.target === effectNode.id);
  const categoryIds = new Set(categoryEdges.map((e) => e.source));
  const categories = nodes
    .filter((n) => categoryIds.has(n.id) && n.id !== effectNode.id)
    .map((cat) => {
      const childIds = new Set(edges.filter((e) => e.target === cat.id).map((e) => e.source));
      const leaves = nodes.filter((n) => childIds.has(n.id));
      return { ...cat, leaves };
    });

  // Fallback if graph isn't strictly 2-level (map non-effect nodes into categories)
  const effectiveCats =
    categories.length > 0
      ? categories
      : nodes
          .filter((n) => n.id !== effectNode.id)
          .map((n) => ({ ...n, leaves: [] as typeof nodes }));

  const topCats = effectiveCats.filter((_, i) => i % 2 === 0);
  const bottomCats = effectiveCats.filter((_, i) => i % 2 === 1);

  return (
    <div className="intel-fishbone" data-variant="default">
      <div className="intel-graph__header">
        <h3 className="gu-title intel-graph__title">{title}</h3>
      </div>

      <div className="intel-fishbone__stage-wrap">
        <div className="intel-canvas-zoom" role="group" aria-label="Fishbone zoom controls">
          <motion.button
            type="button"
            className="intel-canvas-zoom__btn"
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.15).toFixed(2)))}
          >
            <Plus size={13} />
          </motion.button>
          <motion.button
            type="button"
            className="intel-canvas-zoom__btn"
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
          >
            <Minus size={13} />
          </motion.button>
          <motion.button
            type="button"
            className="intel-canvas-zoom__btn"
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            title="Reset zoom"
            aria-label="Reset zoom"
            onClick={() => setZoom(1)}
          >
            <RotateCcw size={12} />
          </motion.button>
        </div>

        <div
          className="intel-fishbone__board"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            transition: "transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
        <div className="intel-fishbone__ribs-col">
          {/* Upper ribs */}
          <div className="intel-fishbone__half is-top">
            {topCats.map((cat, idx) => (
              <div key={cat.id} className={`intel-fishbone__bone is-top ${activeCat === cat.id ? "is-active" : ""}`}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className={`intel-fishbone__cat ${activeCat === cat.id ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveCat(activeCat === cat.id ? null : cat.id);
                    onAction?.({ type: "select", payload: { nodeId: cat.id, node: cat } });
                  }}
                >
                  <span className={`intel-node__badge ${activeCat === cat.id ? "is-accent" : ""}`}>{idx * 2 + 1}</span>
                  <span>{cat.label}</span>
                </motion.button>
                {cat.leaves.length > 0 && (
                  <ul className="intel-fishbone__twigs">
                    {cat.leaves.map((leaf) => (
                      <li key={leaf.id}>{leaf.label}</li>
                    ))}
                  </ul>
                )}
                <span className="intel-fishbone__diag" aria-hidden="true" />
                <span className="intel-fishbone__joint" aria-hidden="true" />
              </div>
            ))}
          </div>

          {/* Central horizontal spine */}
          <div className="intel-fishbone__spine-row" aria-hidden="true">
            <span className="intel-fishbone__spine-line" />
            <span className="intel-fishbone__spine-tip" />
          </div>

          {/* Lower ribs */}
          <div className="intel-fishbone__half is-bottom">
            {bottomCats.map((cat, idx) => (
              <div key={cat.id} className={`intel-fishbone__bone is-bottom ${activeCat === cat.id ? "is-active" : ""}`}>
                <span className="intel-fishbone__joint" aria-hidden="true" />
                <span className="intel-fishbone__diag" aria-hidden="true" />
                {cat.leaves.length > 0 && (
                  <ul className="intel-fishbone__twigs">
                    {cat.leaves.map((leaf) => (
                      <li key={leaf.id}>{leaf.label}</li>
                    ))}
                  </ul>
                )}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className={`intel-fishbone__cat ${activeCat === cat.id ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveCat(activeCat === cat.id ? null : cat.id);
                    onAction?.({ type: "select", payload: { nodeId: cat.id, node: cat } });
                  }}
                >
                  <span className={`intel-node__badge ${activeCat === cat.id ? "is-accent" : ""}`}>{idx * 2 + 2}</span>
                  <span>{cat.label}</span>
                </motion.button>
              </div>
            ))}
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="intel-fishbone__head"
          onClick={() => {
            setActiveCat(null);
            onAction?.({ type: "select", payload: { nodeId: effectNode.id, node: effectNode } });
          }}
        >
          <span className="intel-fishbone__head-kicker">Effect</span>
          <strong>{effectNode.label}</strong>
        </motion.button>
      </div>
      </div>
    </div>
  );
}

/* ═══════════════════ FiveWhys (Clean Delegation -> All 4 Variants Work) ═══════════════════ */

const FiveWhysGraph = makeVisualGraphComponent({
  defaultTitle: "Five Whys Root Cause",
  layout: "layered",
  direction: "TB",
  defaultNodeType: "fault",
  defaultEdgeType: "causal",
});

export function FiveWhys(props: IntelBaseProps) {
  const { data } = props;
  const whys = a<Record<string, unknown>>(data.whys);

  const hasExplicitNodes = Array.isArray(data.nodes) && data.nodes.length > 0;
  const graphProps: IntelBaseProps = hasExplicitNodes
    ? props
    : {
        ...props,
        data: {
          ...data,
          nodes: [
            ...(s(data.problem)
              ? [
                  {
                    id: "problem",
                    label: s(data.problem),
                    type: "fault",
                    status: "active",
                    detail: "Initial symptom",
                  },
                ]
              : []),
            ...whys.map((w, i) => ({
              id: `why-${i + 1}`,
              label: s(w.answer || w.cause),
              type: i === whys.length - 1 ? "conclusion" : "inference",
              detail: s(w.question, `Why #${i + 1}?`),
              status: i === whys.length - 1 ? "success" : "pending",
            })),
          ],
          edges: [
            ...(s(data.problem) && whys.length > 0
              ? [{ id: "e-0", source: "problem", target: "why-1", label: "Why 1?" }]
              : []),
            ...whys.slice(1).map((_, i) => ({
              id: `e-${i + 1}`,
              source: `why-${i + 1}`,
              target: `why-${i + 2}`,
              label: `Why ${i + 2}?`,
            })),
          ],
        },
      };

  return <FiveWhysGraph {...graphProps} />;
}
