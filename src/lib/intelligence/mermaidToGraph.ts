/**
 * Mermaid-to-XYFlow Graph Converter
 *
 * Parses legacy Mermaid diagram syntax (flowchart, graph, sequenceDiagram,
 * erDiagram, stateDiagram-v2, mindmap) into structured IntelGraphData so any
 * existing Mermaid diagram renders interactively via XYFlow + ELK.js.
 */

import type {
  IntelGraphData,
  IntelGraphEdge,
  IntelGraphNode,
} from "./types";

function stripInlineModifiers(raw: string): string {
  return raw.trim().replace(/:::[a-zA-Z0-9_-]+$/g, "").trim();
}

function parseNodeToken(rawToken: string): {
  id: string;
  label?: string;
  type?: string;
} {
  const token = stripInlineModifiers(rawToken);
  if (!token) return { id: "" };

  // Match shapes from most specific to simplest:
  // [(Database)], ([Start/End]), [[Subroutine]], {{Hexagon}}, ((Circle)), [Label], (Label), {Decision}, >Flag]
  const patterns: Array<{ re: RegExp; type: string }> = [
    { re: /^([A-Za-z0-9_.-]+)\s*\[\((.+?)\)\]$/, type: "database" },
    { re: /^([A-Za-z0-9_.-]+)\s*\(\[(.+?)\]\)$/, type: "start" },
    { re: /^([A-Za-z0-9_.-]+)\s*\[\[(.+?)\]\]$/, type: "service" },
    { re: /^([A-Za-z0-9_.-]+)\s*\{\{(.+?)\}\}$/, type: "gateway" },
    { re: /^([A-Za-z0-9_.-]+)\s*\(\((.+?)\)\)$/, type: "concept" },
    { re: /^([A-Za-z0-9_.-]+)\s*\{(.+?)\}$/, type: "decision" },
    { re: /^([A-Za-z0-9_.-]+)\s*\((.+?)\)$/, type: "process" },
    { re: /^([A-Za-z0-9_.-]+)\s*\[(.+?)\]$/, type: "process" },
    { re: /^([A-Za-z0-9_.-]+)\s*>(.+?)\]$/, type: "queue" },
  ];

  for (const { re, type } of patterns) {
    const m = token.match(re);
    if (m) {
      const cleanLabel = m[2].replace(/^["']|["']$/g, "").replace(/<br\s*\/?>/gi, " / ");
      return { id: m[1], label: cleanLabel, type };
    }
  }

  const plainId = token.match(/^([A-Za-z0-9_.-]+)$/);
  if (plainId) {
    return { id: plainId[1] };
  }

  return { id: token.replace(/[^A-Za-z0-9_.-]/g, "_"), label: token };
}

function upsertNode(
  nodeMap: Map<string, IntelGraphNode>,
  parsed: { id: string; label?: string; type?: string; detail?: string; status?: IntelGraphNode["status"] },
) {
  if (!parsed.id) return;
  const existing = nodeMap.get(parsed.id);
  if (!existing) {
    nodeMap.set(parsed.id, {
      id: parsed.id,
      label: parsed.label || parsed.id,
      type: parsed.type || "process",
      ...(parsed.detail ? { detail: parsed.detail } : {}),
      ...(parsed.status ? { status: parsed.status } : {}),
    });
    return;
  }
  if (parsed.label && existing.label === existing.id) {
    existing.label = parsed.label;
  }
  if (parsed.type && existing.type === "process") {
    existing.type = parsed.type;
  }
  if (parsed.detail) {
    existing.detail = existing.detail
      ? `${existing.detail} • ${parsed.detail}`
      : parsed.detail;
  }
}

export function parseMermaidToGraph(
  rawCode: string,
  kindHint?: string,
): IntelGraphData | null {
  const code = rawCode.trim();
  if (!code) return null;

  const lines = code
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => {
      const t = l.trim();
      return t && !t.startsWith("%%");
    });

  if (lines.length === 0) return null;

  const first = lines[0].trim().toLowerCase();
  const kind = (kindHint || "").toLowerCase();

  // 1. ER Diagram
  if (first.startsWith("erdiagram") || kind === "erd") {
    const nodeMap = new Map<string, IntelGraphNode>();
    const edges: IntelGraphEdge[] = [];
    let currentEntity: string | null = null;
    const entityFields = new Map<string, string[]>();

    for (const rawLine of lines.slice(1)) {
      const line = rawLine.trim();
      if (!line) continue;

      if (currentEntity) {
        if (line === "}") {
          const fields = entityFields.get(currentEntity) || [];
          upsertNode(nodeMap, {
            id: currentEntity,
            label: currentEntity,
            type: "database",
            detail: fields.slice(0, 4).join(", "),
          });
          currentEntity = null;
        } else {
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            const arr = entityFields.get(currentEntity) || [];
            arr.push(`${parts[1]} (${parts[0]})`);
            entityFields.set(currentEntity, arr);
          }
        }
        continue;
      }

      const openBlock = line.match(/^([A-Za-z0-9_-]+)\s*\{$/);
      if (openBlock) {
        currentEntity = openBlock[1];
        entityFields.set(currentEntity, []);
        continue;
      }

      // Relationship: USER ||--o{ MESSAGE : sends
      const rel = line.match(
        /^([A-Za-z0-9_-]+)\s+([|o}{]{1,2}[.-]{2}[|o}{]{1,2})\s+([A-Za-z0-9_-]+)\s*(?::\s*(.+))?$/,
      );
      if (rel) {
        const [, src, card, tgt, label] = rel;
        upsertNode(nodeMap, { id: src, label: src, type: "database" });
        upsertNode(nodeMap, { id: tgt, label: tgt, type: "database" });
        edges.push({
          id: `er-${edges.length + 1}`,
          source: src,
          target: tgt,
          label: label ? label.replace(/^["']|["']$/g, "") : card,
          type: "dependency",
        });
      }
    }

    if (nodeMap.size > 0) {
      return {
        nodes: Array.from(nodeMap.values()),
        edges,
        layout: "layered",
        direction: "LR",
      };
    }
  }

  // 2. Sequence Diagram
  if (first.startsWith("sequencediagram") || kind === "sequence") {
    const nodeMap = new Map<string, IntelGraphNode>();
    const edges: IntelGraphEdge[] = [];

    for (const rawLine of lines.slice(1)) {
      const line = rawLine.trim();
      const part = line.match(/^(?:participant|actor)\s+([A-Za-z0-9_-]+)(?:\s+as\s+(.+))?$/i);
      if (part) {
        upsertNode(nodeMap, {
          id: part[1],
          label: part[2]?.trim() || part[1],
          type: line.toLowerCase().startsWith("actor") ? "client" : "service",
        });
        continue;
      }

      const msg = line.match(
        /^([A-Za-z0-9_-]+)\s*(->>|-->>|->|-->|-x|--x)\s*([A-Za-z0-9_-]+)\s*(?::\s*(.+))?$/,
      );
      if (msg) {
        const [, src, arrow, tgt, label] = msg;
        upsertNode(nodeMap, { id: src, label: src, type: "service" });
        upsertNode(nodeMap, { id: tgt, label: tgt, type: "service" });
        edges.push({
          id: `seq-${edges.length + 1}`,
          source: src,
          target: tgt,
          label: `${edges.length + 1}. ${(label || "").trim()}`,
          type: arrow.startsWith("--") ? "association" : "sequence",
          animated: !arrow.startsWith("--"),
        });
      }
    }

    if (nodeMap.size > 0) {
      return {
        nodes: Array.from(nodeMap.values()),
        edges,
        layout: "layered",
        direction: "LR",
      };
    }
  }

  // 3. State Diagram
  if (first.startsWith("statediagram") || kind === "state") {
    const nodeMap = new Map<string, IntelGraphNode>();
    const edges: IntelGraphEdge[] = [];

    const mapId = (id: string) => (id === "[*]" ? "__start__" : id);

    for (const rawLine of lines.slice(1)) {
      const line = rawLine.trim();
      if (!line || line === "{" || line === "}") continue;
      const trans = line.match(
        /^(\[\*\]|[A-Za-z0-9_-]+)\s*-->\s*(\[\*\]|[A-Za-z0-9_-]+)(?:\s*:\s*(.+))?$/,
      );
      if (trans) {
        const src = mapId(trans[1]);
        const tgtRaw = trans[2];
        const tgt = tgtRaw === "[*]" ? "__end__" : tgtRaw;
        upsertNode(nodeMap, {
          id: src,
          label: src === "__start__" ? "Start" : src,
          type: src === "__start__" ? "start" : "process",
          status: src === "__start__" ? "active" : undefined,
        });
        upsertNode(nodeMap, {
          id: tgt,
          label: tgt === "__end__" ? "End" : tgt,
          type: tgt === "__end__" ? "end" : "process",
          status: tgt === "__end__" ? "success" : undefined,
        });
        edges.push({
          id: `st-${edges.length + 1}`,
          source: src,
          target: tgt,
          label: trans[3]?.trim(),
          type: "sequence",
        });
      }
    }

    if (nodeMap.size > 0) {
      return {
        nodes: Array.from(nodeMap.values()),
        edges,
        layout: "layered",
        direction: "LR",
      };
    }
  }

  // 4. Mindmap
  if (first.startsWith("mindmap") || kind === "mindmap") {
    const nodes: IntelGraphNode[] = [];
    const edges: IntelGraphEdge[] = [];
    const stack: Array<{ indent: number; id: string }> = [];

    for (const rawLine of lines.slice(1)) {
      const indent = rawLine.search(/\S/);
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith("::icon")) continue;
      const cleanLabel = trimmed
        .replace(/^root\(\((.+)\)\)$/, "$1")
        .replace(/^\(\((.+)\)\)$/, "$1")
        .replace(/^\[(.+)\]$/, "$1")
        .replace(/^\((.+)\)$/, "$1");
      const id = `mm-${nodes.length + 1}`;
      nodes.push({
        id,
        label: cleanLabel,
        type: stack.length === 0 ? "entity" : "concept",
        status: stack.length === 0 ? "active" : undefined,
      });

      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      if (stack.length > 0) {
        edges.push({
          id: `mme-${edges.length + 1}`,
          source: stack[stack.length - 1].id,
          target: id,
          type: "association",
        });
      }
      stack.push({ indent, id });
    }

    if (nodes.length > 0) {
      return {
        nodes,
        edges,
        layout: "tree",
        direction: "LR",
      };
    }
  }

  // 5. Flowchart / Graph / Generic fallback
  const dirMatch = first.match(/^(?:flowchart|graph)\s+(tb|td|bt|lr|rl)/i);
  const dirRaw = dirMatch ? dirMatch[1].toUpperCase() : "LR";
  const direction: IntelGraphData["direction"] =
    dirRaw === "TD" || dirRaw === "TB"
      ? "TB"
      : dirRaw === "BT"
        ? "BT"
        : dirRaw === "RL"
          ? "RL"
          : "LR";

  const nodeMap = new Map<string, IntelGraphNode>();
  const edges: IntelGraphEdge[] = [];

  for (const rawLine of lines.slice(first.startsWith("flowchart") || first.startsWith("graph") ? 1 : 0)) {
    let line = rawLine.trim();
    if (!line || /^(subgraph|end|classDef|class|style|linkStyle|click)\b/i.test(line)) {
      continue;
    }

    // Handle edge with label patterns:
    // A -->|label| B   OR   A -- label --> B   OR   A -.->|label| B   OR   A -. label .-> B   OR   A ==>|label| B
    const edgeRe =
      /(.+?)\s*(?:(-->|-.->|==>|<-->|---)\s*(?:\|([^|]+)\|)?|--\s+([^-\n]+?)\s+(-->|==>|---)|-\.\s+([^.\n]+?)\s+\.->)\s*(.+)$/;
    const match = line.match(edgeRe);

    if (match) {
      const leftRaw = match[1].trim();
      const arrow = match[2] || match[5] || "-->";
      const label = (match[3] || match[4] || match[6] || "").trim() || undefined;
      const rightRaw = match[7].trim();

      // Support chained edges A --> B --> C by extracting last token from left & first from right if needed
      const leftNode = parseNodeToken(leftRaw);
      const rightParts = rightRaw.split(/\s*(?:-->|-.->|==>)\s*/);
      let prev = leftNode;
      upsertNode(nodeMap, prev);

      for (let idx = 0; idx < rightParts.length; idx++) {
        const nextNode = parseNodeToken(rightParts[idx]);
        upsertNode(nodeMap, nextNode);
        if (prev.id && nextNode.id) {
          edges.push({
            id: `fc-${edges.length + 1}`,
            source: prev.id,
            target: nextNode.id,
            label: idx === 0 ? label : undefined,
            type: arrow.includes("-.-")
              ? "causal"
              : arrow.includes("==>")
                ? "data_flow"
                : "default",
            animated: arrow.includes("==>"),
          });
        }
        prev = nextNode;
      }
      continue;
    }

    // Standalone node declaration: A[Label]
    line = line.replace(/;$/, "");
    const single = parseNodeToken(line);
    if (single.id && single.label) {
      upsertNode(nodeMap, single);
    }
  }

  if (nodeMap.size === 0) return null;

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    layout: "layered",
    direction,
  };
}
