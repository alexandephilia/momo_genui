"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  MistlineComponent,
  type MistlineSurface,
} from "@/components/genui/MistlineLibrary";
import { MISTLINE_CATALOG } from "@/lib/mistlineCatalog";
import { PLAYGROUND_SAMPLES, COMPONENT_NAMES as MISTLINE_NAMES } from "./sampleData";
import { initializeIntelligenceUI, INTEL_CATEGORIES } from "@/lib/intelligence/registerAll";
import { getAllIntelComponents, getIntelComponent } from "@/lib/intelligence/registry";
import { motion } from "motion/react";
import { IntelVariantContext } from "@/components/intelligence/shared/IntelCardShell";
import { PaintScope } from "@/components/intelligence/shared/StateMotion";
import type { IntelComponentSpec, IntelRenderState, IntelSurface } from "@/lib/intelligence/types";
import { DialRoot, useDialKitController, type DialConfig } from "dialkit";
import "dialkit/styles.css";

import {
  BarChart3,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Code2,
  Columns3,
  Copy,
  Download,
  Eye,
  FileCheck,
  FlaskConical,
  GitBranch,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  MessageSquare,
  PenTool,
  Radar,
  RotateCcw,
  Save,
  Scale,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";

/* ═══════════════════ Types & Storage ═══════════════════ */

type LibrarySource = "all" | "intel" | "mistline";

interface StyleTokens {
  accentColor: string;
  cardBg: string;
  borderRadius: number;
  padding: number;
  gap: number;
  fontScale: number;
  borderAlpha: number;
  containerHeight: number;
  compactMode: boolean;
}

const DEFAULT_STYLE_TOKENS: StyleTokens = {
  accentColor: "#ef8c66",
  cardBg: "#111216",
  borderRadius: 12,
  padding: 16,
  gap: 12,
  fontScale: 1,
  borderAlpha: 0.08,
  containerHeight: 460,
  compactMode: false,
};

const SYSTEM_CARD_IDS = new Set(["runtime_inspector", "performance_breakdown"]);
const EXTRA_GRAPH_IDS = new Set([
  "event_correlation_map",
  "incident_relationship_graph",
  "claim_evidence_map",
  "scenario_tree",
  "flow_editor",
  "pipeline_builder",
]);

function getComponentVariants(
  _source: "intel" | "mistline",
  id: string,
  category?: string,
): string[] {
  if (id === "Flow") return ["cycle", "chevron", "alternating", "cascade"];
  if (id === "Versus") return ["cards", "radar", "bars", "editorial"];
  if (id === "Cards") return ["grid", "feature", "row", "list"];
  if (id === "Chart") return ["bar", "donut", "line", "area"];
  if (
    id === "Diagram" ||
    category === "visual_reasoning" ||
    (category === "system" && !SYSTEM_CARD_IDS.has(id)) ||
    EXTRA_GRAPH_IDS.has(id)
  ) {
    return ["default", "minimal", "pill", "blueprint"];
  }
  return ["default", "editorial", "split", "minimal"];
}

function resolveActiveVariant(
  props: Record<string, unknown>,
  id: string,
  variants: string[],
): string {
  if (typeof props.variant === "string" && variants.includes(props.variant)) {
    return props.variant;
  }
  if (id === "Cards" && typeof props.layout === "string" && variants.includes(props.layout)) {
    return props.layout;
  }
  if (id === "Chart" && typeof props.type === "string" && variants.includes(props.type)) {
    return props.type;
  }
  return variants[0] ?? "default";
}

interface StudioDraft {
  name: string;
  approved: boolean;
  surface: IntelSurface;
  renderState: IntelRenderState;
  styleTokens: StyleTokens;
  props: Record<string, unknown>;
}

type DraftsMap = Record<string, StudioDraft[]>;
const DRAFTS_STORAGE_KEY = "momo.studio.drafts.v2";

function loadDrafts(): DraftsMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function persistDrafts(map: DraftsMap) {
  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

/* ═══════════════════ Enum Dictionaries for Deep DialKit ═══════════════════ */

const ENUM_OPTIONS: Record<string, string[]> = {
  layout: ["layered", "tree", "force", "radial", "stress", "grid", "row", "list", "feature"],
  direction: ["LR", "TB", "RL", "BT"],
  align: ["left", "center"],
  tone: ["tip", "insight", "warning", "success", "neutral", "positive", "critical"],
  style: ["numbered", "timeline"],
  priority: ["critical", "high", "medium", "low"],
  confidence: ["high", "medium", "low"],
  variant: ["default", "editorial", "split", "minimal"],
  status: ["active", "inactive", "pending", "running", "done", "success", "warning", "error", "complete", "failed", "normal"],
  trend: ["up", "down", "flat"],
  severity: ["critical", "warning", "info", "success", "high", "medium", "low"],
  shape: ["text", "card", "chart", "table"],
  ratio: ["16/9", "4/3", "1/1", "21/9"],
  rating: ["good", "neutral", "bad"],
  kind: ["flowchart", "sequence", "erd", "state", "class", "gantt", "pie", "mindmap", "timeline", "input", "process", "tool", "output", "range", "stepper", "chips", "toggle"],
  type: ["insight", "finding", "warning", "observation", "bar", "donut", "line", "service", "database", "gateway", "client", "queue", "external", "premise", "inference", "conclusion", "evidence", "question", "option", "outcome", "fault", "entity", "concept", "default", "causal", "dependency", "data_flow", "sequence", "association"],
};

const MISTLINE_GROUPS: Record<string, string[]> = {
  "Classic · Layout": ["Headline", "RegionalShowcase", "CatalogShelf", "AnnotatedSheet", "BentoGrid", "Cards", "Plan", "Steps", "Followups", "Choices"],
  "Classic · Data": ["Stats", "Chart", "Table", "Versus"],
  "Classic · Interactive": ["Adjuster", "Quiz", "Checklist", "Map"],
  "Classic · Visual": ["Palette", "Code", "Callout", "Flow", "Diagram"],
  "Classic · Images": [
    "AsyncImage",
    "Image",
    "ImageWithCaption",
    "ImageWithCitation",
    "ImageGallery",
    "ImageGrid",
    "ImageCarousel",
    "ImageComparison",
    "ImageLightbox",
  ],
};

const INTEL_CATEGORY_ICONS: Record<string, typeof Lightbulb> = {
  explanation: Lightbulb,
  visual_reasoning: GitBranch,
  evidence: ShieldCheck,
  analytical: Scale,
  data: BarChart3,
  system: Server,
  investigation: Radar,
  interactive: SlidersHorizontal,
  workspace: LayoutDashboard,
};

/* ═══════════════════ Helpers for Deep DialKit Adapter ═══════════════════ */

function sanitizeDialKey(raw: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_]/g, "_");
  // Avoid collision with DialKit's reserved "type" descriptor keyword inside nested folders
  return clean === "type" ? "kindOrType" : clean;
}

function numberRangeTuple(val: number): [number, number, number, number] {
  const abs = Math.abs(val);
  if (val >= 0 && val <= 1 && !Number.isInteger(val)) return [val, 0, 1, 0.05];
  if (val >= 0 && val <= 100 && val !== 0) {
    const max = val <= 10 ? 20 : 100;
    const step = val <= 10 ? 0.5 : 1;
    return [val, 0, max, step];
  }
  const max = Math.max(10, Math.round(abs * 3));
  const step = max > 500 ? 10 : max > 50 ? 5 : 1;
  return [val, val < 0 ? -max : 0, max, step];
}

function buildPrimitiveDialEntry(
  key: string,
  val: unknown,
  variantOptions?: string[],
): unknown {
  if (typeof val === "number" && Number.isFinite(val)) {
    return numberRangeTuple(val);
  }
  if (typeof val === "boolean") {
    return val;
  }
  if (typeof val === "string") {
    if (/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(val.trim())) {
      return { type: "color", default: val };
    }
    const lowerKey = key.toLowerCase();
    if (lowerKey === "variant" && variantOptions && variantOptions.length > 0) {
      return {
        type: "select",
        options: variantOptions,
        default: variantOptions.includes(val) ? val : variantOptions[0],
      };
    }
    const opts = ENUM_OPTIONS[lowerKey];
    if (opts && opts.includes(val)) {
      return { type: "select", options: opts, default: val };
    }
    if (val.length <= 160) {
      return { type: "text", default: val, placeholder: key };
    }
  }
  return undefined;
}

interface ArrayTrackMeta {
  propKey: string;
  dialKey: string;
  template: unknown;
  exposedItems: Array<{ index: number; folderKey: string; keyMap: Record<string, string> }>;
}

function buildComponentDialConfig(
  props: Record<string, unknown>,
  styleTokens: StyleTokens,
  variantOptions?: string[],
  defaultVariant?: string,
): {
  config: DialConfig;
  topKeyMap: Record<string, string>;
  arrayTracks: ArrayTrackMeta[];
} {
  const topKeyMap: Record<string, string> = {};
  const arrayTracks: ArrayTrackMeta[] = [];
  const componentFolder: Record<string, unknown> = {};
  const normalizedProps: Record<string, unknown> = {
    ...(defaultVariant ? { variant: defaultVariant } : {}),
    ...props,
  };
  if (variantOptions && variantOptions.length > 0 && !normalizedProps.variant) {
    normalizedProps.variant = variantOptions[0];
  }

  for (const [origKey, val] of Object.entries(normalizedProps)) {
    const prim = buildPrimitiveDialEntry(origKey, val, variantOptions);
    if (prim !== undefined) {
      const dKey = sanitizeDialKey(origKey);
      topKeyMap[dKey] = origKey;
      componentFolder[dKey] = prim;
      continue;
    }

    if (Array.isArray(val) && val.length > 0 && arrayTracks.length < 4) {
      const dKey = sanitizeDialKey(origKey);
      const arrFolder: Record<string, unknown> = {
        itemCount: [val.length, 1, Math.max(12, val.length + 5), 1],
      };
      const exposedItems: ArrayTrackMeta["exposedItems"] = [];

      const maxExpose = Math.min(3, val.length);
      for (let i = 0; i < maxExpose; i++) {
        const item = val[i];
        const fKey = `item_${i + 1}`;
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const itemRec = item as Record<string, unknown>;
          const subFolder: Record<string, unknown> = {};
          const innerMap: Record<string, string> = {};
          for (const [ik, iv] of Object.entries(itemRec)) {
            const innerPrim = buildPrimitiveDialEntry(ik, iv);
            if (innerPrim !== undefined) {
              const safeIk = sanitizeDialKey(ik);
              innerMap[safeIk] = ik;
              subFolder[safeIk] = innerPrim;
            }
          }
          if (Object.keys(subFolder).length > 0) {
            if (i > 0) subFolder._collapsed = true;
            arrFolder[fKey] = subFolder;
            exposedItems.push({ index: i, folderKey: fKey, keyMap: innerMap });
          }
        } else {
          const innerPrim = buildPrimitiveDialEntry("value", item);
          if (innerPrim !== undefined) {
            arrFolder[fKey] = { value: innerPrim };
            exposedItems.push({ index: i, folderKey: fKey, keyMap: { value: "__primitive__" } });
          }
        }
      }

      arrayTracks.push({
        propKey: origKey,
        dialKey: dKey,
        template: val[val.length - 1],
        exposedItems,
      });
      componentFolder[dKey] = arrFolder;
    }
  }

  const config: DialConfig = {
    visualStyle: {
      accentColor: { type: "color", default: styleTokens.accentColor },
      cardBg: { type: "color", default: styleTokens.cardBg },
      borderRadius: [styleTokens.borderRadius, 0, 32, 1],
      padding: [styleTokens.padding, 4, 40, 2],
      gap: [styleTokens.gap, 2, 32, 2],
      fontScale: [styleTokens.fontScale, 0.75, 1.45, 0.05],
      borderAlpha: [styleTokens.borderAlpha, 0, 0.4, 0.01],
      containerHeight: [styleTokens.containerHeight, 220, 760, 20],
      compactMode: styleTokens.compactMode,
    },
    ...(Object.keys(componentFolder).length > 0
      ? { componentProps: componentFolder as DialConfig }
      : {}),
    quickActions: {
      randomizeNumbers: { type: "action", label: "Randomize Values" },
      resetDefaults: { type: "action", label: "Reset Component" },
    },
  };

  return { config, topKeyMap, arrayTracks };
}

/* ═══════════════════ DialKit Adapter Component ═══════════════════ */

function DialKitStudioAdapter({
  panelId,
  panelTitle,
  baseProps,
  initialStyleTokens,
  variantOptions,
  activeVariant,
  onSyncProps,
  onSyncStyle,
  onRandomize,
  onReset,
}: {
  panelId: string;
  panelTitle: string;
  baseProps: Record<string, unknown>;
  initialStyleTokens: StyleTokens;
  variantOptions: string[];
  activeVariant: string;
  onSyncProps: (next: Record<string, unknown>) => void;
  onSyncStyle: (next: StyleTokens) => void;
  onRandomize: () => void;
  onReset: () => void;
}) {
  const { config, topKeyMap, arrayTracks } = useMemo(
    () => buildComponentDialConfig(baseProps, initialStyleTokens, variantOptions, activeVariant),
    // Rebuild config cleanly only when this keyed adapter mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panelId],
  );

  const propsRef = useRef(baseProps);
  propsRef.current = baseProps;

  const controller = useDialKitController(panelTitle, config, {
    id: panelId,
    onAction: (actionPath) => {
      if (actionPath.endsWith("randomizeNumbers")) onRandomize();
      if (actionPath.endsWith("resetDefaults")) onReset();
    },
  });

  const mountedRef = useRef(false);
  const lastDigestRef = useRef("");

  useEffect(() => {
    const vals = controller.values as Record<string, unknown>;
    const digest = JSON.stringify(vals);
    if (!mountedRef.current) {
      mountedRef.current = true;
      lastDigestRef.current = digest;
      return;
    }
    if (digest === lastDigestRef.current) return;
    lastDigestRef.current = digest;

    // 1. Sync visualStyle folder
    const vs = (vals.visualStyle as Record<string, unknown>) || {};
    onSyncStyle({
      accentColor: String(vs.accentColor ?? initialStyleTokens.accentColor),
      cardBg: String(vs.cardBg ?? initialStyleTokens.cardBg),
      borderRadius: Number(vs.borderRadius ?? initialStyleTokens.borderRadius),
      padding: Number(vs.padding ?? initialStyleTokens.padding),
      gap: Number(vs.gap ?? initialStyleTokens.gap),
      fontScale: Number(vs.fontScale ?? initialStyleTokens.fontScale),
      borderAlpha: Number(vs.borderAlpha ?? initialStyleTokens.borderAlpha),
      containerHeight: Number(vs.containerHeight ?? initialStyleTokens.containerHeight),
      compactMode: Boolean(vs.compactMode ?? initialStyleTokens.compactMode),
    });

    // 2. Sync componentProps folder
    const cp = (vals.componentProps as Record<string, unknown>) || {};
    if (Object.keys(cp).length === 0) return;

    const nextProps: Record<string, unknown> = { ...propsRef.current };

    for (const [dKey, origKey] of Object.entries(topKeyMap)) {
      if (dKey in cp) {
        nextProps[origKey] = cp[dKey];
      }
    }

    for (const track of arrayTracks) {
      const folder = (cp[track.dialKey] as Record<string, unknown>) || {};
      const baseArr = Array.isArray(propsRef.current[track.propKey])
        ? [...(propsRef.current[track.propKey] as unknown[])]
        : [];
      const targetLen = Math.max(1, Number(folder.itemCount ?? baseArr.length));

      // Adjust item values for exposed item sub-folders
      for (const exp of track.exposedItems) {
        const sub = (folder[exp.folderKey] as Record<string, unknown>) || {};
        if (exp.index < baseArr.length) {
          const curItem = baseArr[exp.index];
          if (curItem && typeof curItem === "object" && !Array.isArray(curItem)) {
            const copy = { ...(curItem as Record<string, unknown>) };
            for (const [safeIk, origIk] of Object.entries(exp.keyMap)) {
              if (safeIk in sub) copy[origIk] = sub[safeIk];
            }
            baseArr[exp.index] = copy;
          } else if ("value" in sub) {
            baseArr[exp.index] = sub.value;
          }
        }
      }

      // Slice or append cloned entries to match itemCount slider
      if (targetLen < baseArr.length) {
        nextProps[track.propKey] = baseArr.slice(0, targetLen);
      } else if (targetLen > baseArr.length) {
        const grown = [...baseArr];
        while (grown.length < targetLen) {
          const seed = grown[grown.length % baseArr.length] ?? track.template;
          if (seed && typeof seed === "object" && !Array.isArray(seed)) {
            const clone = { ...(seed as Record<string, unknown>) };
            if (typeof clone.id === "string") clone.id = `${clone.id}_${grown.length + 1}`;
            if (typeof clone.label === "string") clone.label = `${clone.label} (${grown.length + 1})`;
            else if (typeof clone.title === "string") clone.title = `${clone.title} (${grown.length + 1})`;
            grown.push(clone);
          } else {
            grown.push(seed);
          }
        }
        nextProps[track.propKey] = grown;
      } else {
        nextProps[track.propKey] = baseArr;
      }
    }

    onSyncProps(nextProps);
  }, [controller.values, arrayTracks, topKeyMap, initialStyleTokens, onSyncProps, onSyncStyle]);

  return null;
}

/* ═══════════════════ Helper: Randomize Numeric Props ═══════════════════ */

function randomizeNumbersDeep(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) {
    const jitter = 0.6 + Math.random() * 0.85;
    return Number.isInteger(value) ? Math.max(1, Math.round(value * jitter)) : Number((value * jitter).toFixed(2));
  }
  if (Array.isArray(value)) return value.map(randomizeNumbersDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "lat" || k === "lng" || k === "min" || k === "max" || k === "step" || k === "index") {
        out[k] = v;
      } else {
        out[k] = randomizeNumbersDeep(v);
      }
    }
    return out;
  }
  return value;
}

/* ═══════════════════ Preview Renderer ═══════════════════ */

function StudioComponentPreview({
  source,
  componentId,
  props,
  surface,
  renderState,
  styleTokens,
  onError,
}: {
  source: "intel" | "mistline";
  componentId: string;
  props: Record<string, unknown>;
  surface: IntelSurface;
  renderState: IntelRenderState;
  styleTokens: StyleTokens;
  onError?: (msg: string) => void;
}) {
  const surfaceScale = surface === "explore" ? 1.08 : surface === "chat" ? 0.92 : 1;
  const surfacePad =
    surface === "explore"
      ? Math.round(styleTokens.padding * 1.25)
      : surface === "chat"
        ? Math.max(8, Math.round(styleTokens.padding * 0.72))
        : styleTokens.padding;
  const surfaceGap =
    surface === "explore"
      ? Math.round(styleTokens.gap * 1.4)
      : surface === "chat"
        ? Math.max(6, Math.round(styleTokens.gap * 0.72))
        : styleTokens.gap;

  const styleVars = {
    "--pg-accent": styleTokens.accentColor,
    "--pg-card-bg": styleTokens.cardBg,
    "--pg-radius": `${styleTokens.borderRadius}px`,
    "--pg-padding": `${styleTokens.compactMode ? Math.max(6, Math.round(surfacePad * 0.6)) : surfacePad}px`,
    "--pg-gap": `${styleTokens.compactMode ? Math.max(4, Math.round(surfaceGap * 0.65)) : surfaceGap}px`,
    "--pg-font-scale": (styleTokens.compactMode ? styleTokens.fontScale * 0.9 : styleTokens.fontScale) * surfaceScale,
    "--pg-border-alpha": styleTokens.borderAlpha,
    "--gu-accent": styleTokens.accentColor,
  } as CSSProperties;

  const surfaceClass =
    surface === "explore"
      ? "momo-ex-spreads-row"
      : surface === "board"
        ? "momo-board-preview"
        : "gen-stack";

  if (source === "intel") {
    const entry = getIntelComponent(componentId);
    if (!entry?.component) {
      return <div className="pg-error">Component {componentId} is not registered.</div>;
    }
    const IntelCmp = entry.component;
    const variantVal =
      typeof props.variant === "string" && props.variant.trim()
        ? props.variant.trim()
        : "default";
    const configOverride =
      styleTokens.containerHeight !== DEFAULT_STYLE_TOKENS.containerHeight
        ? { height: styleTokens.containerHeight }
        : undefined;
    return (
      <div className={`pg-preview-stage ${surfaceClass}`} data-surface={surface} style={styleVars}>
        <IntelVariantContext.Provider value={variantVal}>
          <PaintScope>
            <IntelCmp
              data={props}
              config={configOverride}
              state={renderState}
              surface={surface}
              live={true}
              streaming={renderState === "streaming"}
              onAction={(act) => console.log(`[Studio:${componentId}]`, act)}
              onError={onError}
            />
          </PaintScope>
        </IntelVariantContext.Provider>
      </div>
    );
  }

  // Mistline Classic preview with state wrapper support
  if (renderState === "loading") {
    return (
      <div className="pg-preview-stage" data-surface={surface} style={styleVars}>
        <div className="intel-shell intel-shell--loading">
          <div className="intel-skeleton-line" style={{ width: "45%", height: 16 }} />
          <div className="intel-skeleton-block" style={{ height: 140, marginTop: 12 }} />
        </div>
      </div>
    );
  }
  if (renderState === "empty") {
    return (
      <div className="pg-preview-stage" data-surface={surface} style={styleVars}>
        <div className="intel-shell intel-shell--empty">
          <div className="intel-shell__state-row">No sample payload for {componentId}</div>
        </div>
      </div>
    );
  }
  if (renderState === "error") {
    return (
      <div className="pg-preview-stage" data-surface={surface} style={styleVars}>
        <div className="intel-shell intel-shell--error">
          <div className="intel-shell__state-title">Simulated render error in {componentId}</div>
        </div>
      </div>
    );
  }

  const mistSurface: MistlineSurface =
    surface === "explore" ? "explore" : surface === "board" ? "board" : "chat";

  return (
    <div className={`pg-preview-stage ${surfaceClass}`} data-surface={surface} style={styleVars}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <MistlineComponent
          name={componentId}
          props={props}
          complete={renderState !== "streaming"}
          streaming={renderState === "streaming"}
          surface={mistSurface}
          live={true}
          sources={[]}
          onAction={(a) => console.log(`[Studio:${componentId}]`, a)}
          onError={onError}
        />
      </motion.div>
    </div>
  );
}

/* ═══════════════════ Main GenUI Studio Page ═══════════════════ */

export default function PlaygroundPage() {
  // Synchronously initialize all 182 Intelligence UI specs on mount
  const intelList = useMemo(() => {
    initializeIntelligenceUI();
    return getAllIntelComponents();
  }, []);

  const [libraryFilter, setLibraryFilter] = useState<LibrarySource>("all");
  const [selectedSource, setSelectedSource] = useState<"intel" | "mistline">("intel");
  const [selectedId, setSelectedId] = useState<string>("architecture_diagram");

  const [surface, setSurface] = useState<IntelSurface>("studio");
  const [renderState, setRenderState] = useState<IntelRenderState>("ready");
  const [compareMode, setCompareMode] = useState(false);
  const [fourUpMode, setFourUpMode] = useState(false);
  const [dialMode, setDialMode] = useState<"inline" | "popover">("inline");

  const [styleTokens, setStyleTokens] = useState<StyleTokens>(DEFAULT_STYLE_TOKENS);
  const [parsedProps, setParsedProps] = useState<Record<string, unknown>>(() => ({
    ...(getIntelComponent("architecture_diagram")?.sampleData || {}),
  }));
  const [jsonText, setJsonText] = useState<string>(() =>
    JSON.stringify(getIntelComponent("architecture_diagram")?.sampleData || {}, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [draftName, setDraftName] = useState("");
  const [draftsMap, setDraftsMap] = useState<DraftsMap>({});
  const [isApproved, setIsApproved] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const [dialResetEpoch, setDialResetEpoch] = useState(0);

  useEffect(() => {
    setDraftsMap(loadDrafts());
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    const prevTheme = el.dataset.theme;
    const prevScheme = el.style.colorScheme;
    el.dataset.theme = "dark";
    el.style.colorScheme = "dark";
    return () => {
      if (prevTheme !== undefined) el.dataset.theme = prevTheme;
      else delete el.dataset.theme;
      el.style.colorScheme = prevScheme;
    };
  }, []);

  const getSampleProps = useCallback(
    (source: "intel" | "mistline", id: string): Record<string, unknown> => {
      if (source === "intel") {
        return structuredClone(getIntelComponent(id)?.sampleData || {});
      }
      return structuredClone(PLAYGROUND_SAMPLES[id] || {});
    },
    [],
  );

  const handleSelectComponent = useCallback(
    (source: "intel" | "mistline", id: string) => {
      const sample = getSampleProps(source, id);
      setSelectedSource(source);
      setSelectedId(id);
      setParsedProps(sample);
      setJsonText(JSON.stringify(sample, null, 2));
      setStyleTokens(DEFAULT_STYLE_TOKENS);
      setParseError(null);
      setRenderError(null);
      setIsApproved(false);
      setDialResetEpoch((n) => n + 1);
    },
    [getSampleProps],
  );

  const handleJsonChange = useCallback((val: string) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      setParsedProps(parsed);
      setParseError(null);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }, []);

  const handleDialPropsSync = useCallback((next: Record<string, unknown>) => {
    setParsedProps(next);
    setJsonText(JSON.stringify(next, null, 2));
    setParseError(null);
  }, []);

  const handleRandomize = useCallback(() => {
    setParsedProps((cur) => {
      const next = randomizeNumbersDeep(cur) as Record<string, unknown>;
      setJsonText(JSON.stringify(next, null, 2));
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    const sample = getSampleProps(selectedSource, selectedId);
    setParsedProps(sample);
    setJsonText(JSON.stringify(sample, null, 2));
    setStyleTokens(DEFAULT_STYLE_TOKENS);
    setParseError(null);
    setDialResetEpoch((n) => n + 1);
  }, [getSampleProps, selectedSource, selectedId]);

  const handleSaveDraft = useCallback(() => {
    const cleanName = draftName.trim();
    if (!cleanName) return;
    const key = `${selectedSource}:${selectedId}`;
    const updated = { ...draftsMap };
    const existing = (updated[key] || []).filter((d) => d.name !== cleanName);
    existing.push({
      name: cleanName,
      approved: isApproved,
      surface,
      renderState,
      styleTokens,
      props: parsedProps,
    });
    updated[key] = existing;
    setDraftsMap(updated);
    persistDrafts(updated);
    setDraftName("");
  }, [draftName, selectedSource, selectedId, draftsMap, isApproved, surface, renderState, styleTokens, parsedProps]);

  const handleLoadDraft = useCallback((d: StudioDraft) => {
    setSurface(d.surface);
    setRenderState(d.renderState);
    setStyleTokens(d.styleTokens);
    setIsApproved(d.approved);
    setParsedProps(d.props);
    setJsonText(JSON.stringify(d.props, null, 2));
    setParseError(null);
    setDialResetEpoch((n) => n + 1);
  }, []);

  const handleDeleteDraft = useCallback(
    (name: string) => {
      const key = `${selectedSource}:${selectedId}`;
      const updated = { ...draftsMap };
      updated[key] = (updated[key] || []).filter((d) => d.name !== name);
      setDraftsMap(updated);
      persistDrafts(updated);
    },
    [draftsMap, selectedSource, selectedId],
  );

  const handleExportConfig = useCallback(() => {
    const payload = {
      componentId: selectedId,
      library: selectedSource,
      approved: isApproved,
      surface,
      renderState,
      styleTokens,
      props: parsedProps,
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 1600);
  }, [selectedId, selectedSource, isApproved, surface, renderState, styleTokens, parsedProps]);

  // Sidebar groupings with live search filter
  const q = searchQuery.trim().toLowerCase();

  const intelSections = useMemo(() => {
    if (libraryFilter === "mistline") return [];
    return INTEL_CATEGORIES.map((cat) => {
      const matches = intelList.filter((entry) => {
        const inCat =
          entry.spec.category === cat.id ||
          entry.spec.secondaryCategories?.includes(cat.id);
        if (!inCat) return false;
        if (!q) return true;
        return (
          entry.spec.componentId.toLowerCase().includes(q) ||
          entry.spec.description.toLowerCase().includes(q)
        );
      });
      return { ...cat, entries: matches };
    }).filter((s0) => s0.entries.length > 0);
  }, [intelList, libraryFilter, q]);

  const mistlineSections = useMemo(() => {
    if (libraryFilter === "intel") return [];
    return Object.entries(MISTLINE_GROUPS)
      .map(([label, items]) => ({
        label,
        items: items.filter((id) => !q || id.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [libraryFilter, q]);

  const activeIntelSpec: IntelComponentSpec | null =
    selectedSource === "intel" ? getIntelComponent(selectedId)?.spec || null : null;
  const activeMistlineSpec =
    selectedSource === "mistline" ? MISTLINE_CATALOG[selectedId] || null : null;

  const activeVariants = useMemo(
    () => getComponentVariants(selectedSource, selectedId, activeIntelSpec?.category),
    [selectedSource, selectedId, activeIntelSpec?.category],
  );
  const currentVariant = useMemo(
    () => resolveActiveVariant(parsedProps, selectedId, activeVariants),
    [parsedProps, selectedId, activeVariants],
  );
  const handleSelectVariant = useCallback(
    (v: string) => {
      setParsedProps((cur) => {
        const next: Record<string, unknown> = { ...cur, variant: v };
        if (selectedId === "Cards") next.layout = v;
        if (selectedId === "Chart") next.type = v;
        setJsonText(JSON.stringify(next, null, 2));
        return next;
      });
      setParseError(null);
      setDialResetEpoch((n) => n + 1);
    },
    [selectedId],
  );

  const activeDrafts = draftsMap[`${selectedSource}:${selectedId}`] || [];
  const totalCount = intelList.length + MISTLINE_NAMES.length;
  const baselineProps = useMemo(
    () => getSampleProps(selectedSource, selectedId),
    [getSampleProps, selectedSource, selectedId],
  );

  return (
    <div className="pg-root">
      {/* ═══ Left Sidebar: Catalog Explorer ═══ */}
      <aside className={`pg-sidebar ${sidebarOpen ? "" : "pg-sidebar--collapsed"}`}>
        <div className="pg-sidebar-header">
          <div className="pg-logo">
            <FlaskConical size={17} strokeWidth={2} />
            {sidebarOpen && <span>Momo GenUI Studio</span>}
          </div>
          <button
            type="button"
            className="pg-btn-icon pg-btn-icon--sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        {sidebarOpen && (
          <>
            <div className="pg-lib-tabs">
              {(
                [
                  { id: "all", label: `All (${totalCount})` },
                  { id: "intel", label: `Intel (${intelList.length})` },
                  { id: "mistline", label: `Classic (${MISTLINE_NAMES.length})` },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`pg-lib-tab ${libraryFilter === t.id ? "is-active" : ""}`}
                  onClick={() => setLibraryFilter(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="pg-search-wrap">
              <div className="pg-search-box">
                <Search size={13} strokeWidth={1.6} className="pg-search-icon" />
                <input
                  className="pg-search"
                  placeholder="Search component ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <nav className="pg-nav">
              {intelSections.map((sec) => {
                const CatIcon = INTEL_CATEGORY_ICONS[sec.id] || Sparkles;
                return (
                  <div key={sec.id} className="pg-cat">
                    <div className="pg-cat-label">
                      <CatIcon size={11} strokeWidth={2} />
                      <span style={{ flex: 1 }}>{sec.label}</span>
                      <span className="pg-cat-count">{sec.entries.length}</span>
                    </div>
                    {sec.entries.map((entry) => {
                      const id = entry.spec.componentId;
                      const isActive = selectedSource === "intel" && selectedId === id;
                      return (
                        <button
                          key={`${sec.id}-${id}`}
                          type="button"
                          className={`pg-nav-item ${isActive ? "pg-nav-item--active" : ""}`}
                          onClick={() => handleSelectComponent("intel", id)}
                        >
                          <span className="pg-nav-dot" />
                          <span className="pg-nav-name">{id}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {mistlineSections.map((grp) => (
                <div key={grp.label} className="pg-cat">
                  <div className="pg-cat-label">
                    <LayoutGrid size={11} strokeWidth={2} />
                    <span style={{ flex: 1 }}>{grp.label}</span>
                    <span className="pg-cat-count">{grp.items.length}</span>
                  </div>
                  {grp.items.map((id) => {
                    const isActive = selectedSource === "mistline" && selectedId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`pg-nav-item ${isActive ? "pg-nav-item--active" : ""}`}
                        onClick={() => handleSelectComponent("mistline", id)}
                      >
                        <span className="pg-nav-dot pg-nav-dot--classic" />
                        <span className="pg-nav-name">{id}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="pg-sidebar-footer">
              <span className="pg-count">
                {intelList.filter((c) => c.spec.implemented).length}/{intelList.length} Intel +{" "}
                {MISTLINE_NAMES.length} Classic
              </span>
            </div>
          </>
        )}
      </aside>

      {/* ═══ Main Studio Workspace ═══ */}
      <main className="pg-main">
        <header className="pg-topbar">
          <div className="pg-topbar-left">
            <h1 className="pg-comp-title">
              <Sparkles size={16} strokeWidth={1.8} />
              <code>{selectedId}</code>
            </h1>
            <span className={`intel-badge ${selectedSource === "intel" ? "intel-badge--blue" : "intel-badge--purple"}`}>
              {selectedSource === "intel" ? activeIntelSpec?.category.replace(/_/g, " ") : "Classic Mistline"}
            </span>
            {isApproved && (
              <span className="intel-badge intel-badge--green">
                <Check size={10} /> Approved
              </span>
            )}
          </div>

          <div className="pg-topbar-right">
            {/* Render State Selector */}
            <div className="pg-surface-toggle" title="Component Render State">
              {(["ready", "loading", "streaming", "empty", "error"] as IntelRenderState[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`pg-surface-btn ${renderState === st ? "pg-surface-btn--active" : ""}`}
                  onClick={() => setRenderState(st)}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Surface Selector */}
            <div className="pg-surface-toggle" title="Target Surface">
              {(["chat", "explore", "board", "studio"] as IntelSurface[]).map((sf) => {
                const sfIcons: Record<IntelSurface, ReactNode> = {
                  chat: <MessageSquare size={11} />,
                  explore: <Eye size={11} />,
                  board: <Layers size={11} />,
                  studio: <FlaskConical size={11} />,
                };
                return (
                  <button
                    key={sf}
                    type="button"
                    className={`pg-surface-btn ${surface === sf ? "pg-surface-btn--active" : ""}`}
                    onClick={() => setSurface(sf)}
                  >
                    {sfIcons[sf]} {sf}
                  </button>
                );
              })}
            </div>

            {/* 4 Variants Grid View */}
            <button
              type="button"
              className={`pg-btn-sm ${fourUpMode ? "is-active" : ""}`}
              onClick={() => {
                const next = !fourUpMode;
                setFourUpMode(next);
                if (next) setCompareMode(false);
              }}
            >
              <LayoutGrid size={12} /> 4 Variants
            </button>

            {/* Side-by-Side Variant Comparison */}
            <button
              type="button"
              className={`pg-btn-sm ${compareMode ? "is-active" : ""}`}
              onClick={() => {
                const next = !compareMode;
                setCompareMode(next);
                if (next) setFourUpMode(false);
              }}
            >
              <Columns3 size={12} /> Compare
            </button>

            {/* Approve & Export */}
            <button
              type="button"
              className={`pg-btn-sm ${isApproved ? "pg-btn-save" : ""}`}
              onClick={() => setIsApproved(!isApproved)}
            >
              <FileCheck size={12} /> {isApproved ? "Approved" : "Approve"}
            </button>

            <button type="button" className="pg-btn-sm" onClick={handleExportConfig}>
              {exportCopied ? <Check size={12} /> : <Download size={12} />}
              {exportCopied ? "Copied" : "Export"}
            </button>

            <button
              type="button"
              className="pg-btn-icon"
              onClick={() => setInspectorOpen(!inspectorOpen)}
              title={inspectorOpen ? "Hide Inspector" : "Show Inspector"}
            >
              <PenTool size={14} />
            </button>
          </div>
        </header>

        <div className={`pg-content ${inspectorOpen ? "" : "pg-content--full"}`}>
          {/* ═══ Canvas Preview ═══ */}
          <section className="pg-preview-section">
            <div className="pg-preview-label">
              <span>Live Canvas</span>
              <span className="pg-surface-badge">{surface}</span>
              <span className="pg-surface-badge">{renderState}</span>
              {activeIntelSpec && (
                <span className="pg-comp-desc-inline">{activeIntelSpec.description}</span>
              )}
              {activeMistlineSpec && (
                <span className="pg-comp-desc-inline">{activeMistlineSpec.summary}</span>
              )}
              <div className="pg-variant-bar" role="group" aria-label="Component variants">
                {activeVariants.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`pg-variant-pill ${currentVariant === v ? "is-active" : ""}`}
                    onClick={() => handleSelectVariant(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="pg-preview-container">
              {renderError && (
                <div className="pg-error" style={{ marginBottom: 12 }}>
                  Render error: {renderError}
                </div>
              )}

              {fourUpMode ? (
                <div className="pg-four-up-grid">
                  {activeVariants.map((v, idx) => {
                    const cardProps: Record<string, unknown> = { ...parsedProps, variant: v };
                    if (selectedId === "Cards") cardProps.layout = v;
                    if (selectedId === "Chart") cardProps.type = v;
                    return (
                      <div key={v} className="pg-four-up-card">
                        <div className="pg-four-up-card__head">
                          <span className="pg-four-up-card__index">0{idx + 1}</span>
                          <span className="pg-four-up-card__title">{v}</span>
                        </div>
                        <div className="pg-four-up-card__body">
                          <StudioComponentPreview
                            source={selectedSource}
                            componentId={selectedId}
                            props={cardProps}
                            surface={surface}
                            renderState={renderState}
                            styleTokens={styleTokens}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : compareMode ? (
                <div className="pg-compare-split">
                  <div className="pg-compare-pane">
                    <div className="pg-compare-pane__head">Variant A — Current Tuned</div>
                    <StudioComponentPreview
                      source={selectedSource}
                      componentId={selectedId}
                      props={parsedProps}
                      surface={surface}
                      renderState={renderState}
                      styleTokens={styleTokens}
                      onError={setRenderError}
                    />
                  </div>
                  <div className="pg-compare-pane">
                    <div className="pg-compare-pane__head">Variant B — Baseline Sample</div>
                    <StudioComponentPreview
                      source={selectedSource}
                      componentId={selectedId}
                      props={baselineProps}
                      surface={surface}
                      renderState={renderState}
                      styleTokens={DEFAULT_STYLE_TOKENS}
                    />
                  </div>
                </div>
              ) : (
                <StudioComponentPreview
                  source={selectedSource}
                  componentId={selectedId}
                  props={parsedProps}
                  surface={surface}
                  renderState={renderState}
                  styleTokens={styleTokens}
                  onError={setRenderError}
                />
              )}
            </div>
          </section>

          {/* ═══ Right Inspector: Deep DialKit + JSON + Drafts + Contract ═══ */}
          {inspectorOpen && (
            <aside className="pg-editor-section">
              {/* DialKit Mode Switcher */}
              <div className="pg-editor-header">
                <span className="pg-editor-label">
                  <SlidersHorizontal size={12} /> DialKit Controls
                </span>
                <div className="pg-editor-actions">
                  <button
                    type="button"
                    className={`pg-btn-sm ${dialMode === "inline" ? "is-active" : ""}`}
                    onClick={() => setDialMode("inline")}
                  >
                    Docked
                  </button>
                  <button
                    type="button"
                    className={`pg-btn-sm ${dialMode === "popover" ? "is-active" : ""}`}
                    onClick={() => setDialMode("popover")}
                  >
                    Floating
                  </button>
                  <button type="button" className="pg-btn-sm" onClick={handleReset} title="Reset">
                    <RotateCcw size={11} />
                  </button>
                </div>
              </div>

              {/* Register active component controls with DialKit */}
              <DialKitStudioAdapter
                key={`${selectedSource}:${selectedId}:${dialResetEpoch}`}
                panelId={`studio-${selectedSource}-${selectedId}-${dialResetEpoch}`}
                panelTitle={selectedId}
                baseProps={parsedProps}
                initialStyleTokens={styleTokens}
                variantOptions={activeVariants}
                activeVariant={currentVariant}
                onSyncProps={handleDialPropsSync}
                onSyncStyle={setStyleTokens}
                onRandomize={handleRandomize}
                onReset={handleReset}
              />

              {/* Render DialKit docked inside Inspector, or floating */}
              <div className={dialMode === "inline" ? "pg-dialkit-dock" : ""}>
                <DialRoot
                  mode={dialMode}
                  position="bottom-right"
                  theme="dark"
                  productionEnabled
                />
              </div>

              {/* JSON Editor */}
              <div className="pg-editor-header" style={{ borderTop: "1px solid rgba(255 255 255 / 0.06)" }}>
                <span className="pg-editor-label">
                  <Code2 size={12} /> Props JSON
                </span>
                <div className="pg-editor-actions">
                  <button
                    type="button"
                    className="pg-btn-sm"
                    onClick={() => navigator.clipboard?.writeText(jsonText)}
                    title="Copy JSON"
                  >
                    <Copy size={11} />
                  </button>
                  <button type="button" className="pg-btn-sm" onClick={handleReset} title="Reset JSON">
                    <RotateCcw size={11} />
                  </button>
                </div>
              </div>

              {parseError && <div className="pg-error">{parseError}</div>}

              <textarea
                className="pg-editor-textarea"
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                spellCheck={false}
              />

              {/* Drafts / Presets */}
              <div className="pg-presets">
                <div className="pg-preset-header">
                  <Save size={11} /> Saved Drafts ({activeDrafts.length})
                </div>
                <div className="pg-preset-save-row">
                  <input
                    className="pg-preset-input"
                    placeholder="Draft name..."
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveDraft()}
                  />
                  <button
                    type="button"
                    className="pg-btn-sm pg-btn-save"
                    onClick={handleSaveDraft}
                    disabled={!draftName.trim()}
                  >
                    <Save size={11} />
                  </button>
                </div>

                {activeDrafts.length > 0 ? (
                  <div className="pg-preset-list">
                    {activeDrafts.map((d) => (
                      <div key={d.name} className="pg-preset-item">
                        <button type="button" className="pg-preset-load" onClick={() => handleLoadDraft(d)}>
                          {d.name} {d.approved ? "· Approved" : ""}
                        </button>
                        <button
                          type="button"
                          className="pg-preset-delete"
                          onClick={() => handleDeleteDraft(d.name)}
                          title="Delete draft"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pg-preset-empty">No drafts saved for {selectedId}</div>
                )}
              </div>

              {/* Full 13-Point Contract Inspector */}
              {activeIntelSpec && (
                <div className="pg-schema">
                  <div className="pg-schema-header">
                    <CheckSquare size={11} /> 13-Point Contract
                  </div>
                  <div className="pg-schema-when">
                    <strong>Prompt When:</strong> {activeIntelSpec.promptWhen}
                  </div>
                  <div className="pg-contract-grid">
                    <span>Phase: <code>{activeIntelSpec.phase}</code></span>
                    <span>Complexity: <code>{activeIntelSpec.complexity}</code></span>
                    <span>Loading: <code>{activeIntelSpec.loadingState}</code></span>
                    <span>Role: <code>{activeIntelSpec.accessibility.role}</code></span>
                  </div>
                  <pre className="pg-schema-props">{activeIntelSpec.dataSchema}</pre>
                </div>
              )}

              {activeMistlineSpec && (
                <div className="pg-schema">
                  <div className="pg-schema-header">
                    <FlaskConical size={11} /> Mistline Schema
                  </div>
                  <div className="pg-schema-when">
                    <strong>When:</strong> {activeMistlineSpec.when}
                  </div>
                  <pre className="pg-schema-props">{activeMistlineSpec.props}</pre>
                </div>
              )}
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
