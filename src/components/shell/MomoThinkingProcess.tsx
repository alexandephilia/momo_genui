"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame, useReducedMotion } from "motion/react";
import { EASE_MOMO } from "@/components/motion/MotionPrimitives";
import type { MistlineUIBlock } from "@/lib/mistlineParse";
import { parseMixedStreamToMistlineBlocks } from "@/lib/openui/streamParser";
import {
  formatContextualReasoningBadge,
  formatContextualToolStep,
  sanitizePublicTaskLabel,
} from "@/lib/taskTelemetrySanitizer";
import type { ChatMessage, GenUiPart, ToolPart } from "@/types/momo";

export type DotMatrixPattern = "pikir" | "globe" | "mag" | "pen";

interface MomoThinkingProcessProps {
  msg: ChatMessage;
  defaultOpen?: boolean;
  compact?: boolean;
}

const GRID_N = 7;
const MID = 3;
const frac = (x: number) => x - Math.floor(x);
const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = (x: number) => {
  const c = clamp(x);
  return c * c * (3 - 2 * c);
};

const toBitmap = (rows: string[]): number[][] =>
  rows.map((r) => [...r].map((c) => (c === "#" ? 1 : c === "+" ? 0.55 : 0)));

const SILHOUETTES: Record<DotMatrixPattern, number[][]> = {
  pikir: toBitmap([
    "...+...",
    "...#...",
    "..+#+..",
    "+#####+",
    "..+#+..",
    "...#...",
    "...+...",
  ]),
  globe: toBitmap([
    "..###..",
    ".#.+.#.",
    "#..+..#",
    "#+++++#",
    "#..+..#",
    ".#.+.#.",
    "..###..",
  ]),
  mag: toBitmap([
    ".###...",
    "#...#..",
    "#...#..",
    "#...#..",
    ".###...",
    ".....#.",
    "......#",
  ]),
  pen: toBitmap([
    ".......",
    "#######",
    ".......",
    "######.",
    ".......",
    "####...",
    ".......",
  ]),
};

const PEN_LINES: ReadonlyArray<readonly [number, number]> = [
  [1, 7],
  [3, 6],
  [5, 4],
];

function samplePattern(pattern: DotMatrixPattern, i: number, j: number, t: number): number {
  switch (pattern) {
    case "pikir": {
      const d = Math.hypot(i - MID, j - MID);
      let v = 0;
      for (const offset of [0, 0.5]) {
        const f = frac(t * 0.78 + offset);
        const r = f * 4.6;
        v = Math.max(v, Math.exp(-Math.pow((d - r) / 0.72, 2)) * (1 - f * 0.45));
      }
      return v;
    }
    case "globe": {
      const d = Math.hypot(i - MID, j - MID);
      if (d > 3.45) return 0;
      const rim = Math.abs(d - 3) < 0.5 ? 0.44 : 0;
      const y = (j - MID) / 3.2;
      const rr = Math.sqrt(Math.max(0.08, 1 - y * y)) * 3.2;
      const lon = Math.asin(clamp((i - MID) / rr, -1, 1));
      let v = rim + (j === MID ? 0.2 : 0);
      for (const offset of [0, Math.PI / 2]) {
        let a = (((lon - (t * 1.7 + offset)) % Math.PI) + Math.PI) % Math.PI;
        a = Math.min(a, Math.PI - a);
        v = Math.max(v, Math.exp(-Math.pow(a / 0.34, 2)) * (0.55 + 0.45 * Math.cos(lon)));
      }
      return clamp(v);
    }
    case "mag": {
      const s = SILHOUETTES.mag[j][i];
      if (s && (i > 4 || j > 4)) return 0.5;
      if (s) {
        const a = Math.atan2(j - 2, i - 2);
        const q = (((t * 4.2 - a) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        return 0.28 + 0.72 * Math.exp(-q * 1.3);
      }
      const d = Math.hypot(i - 2, j - 2);
      if (d > 1.6) return 0;
      const sy = 2 + Math.sin(t * 2.4) * 1.2;
      return Math.exp(-Math.pow((i - sy) / 0.45, 2)) * 0.58;
    }
    case "pen": {
      const line = PEN_LINES.find((p) => p[0] === j);
      if (!line || i >= line[1]) return 0;
      const total = 17;
      const u = frac(t / 2.0) * (total + 4);
      let k = i;
      for (const p of PEN_LINES) {
        if (p[0] === j) break;
        k += p[1];
      }
      const wipe = u > total + 1 ? 1 - smooth((u - total - 1) / 3) : 1;
      return k < u - 1 ? 0.62 * wipe : k < u ? 1 : 0;
    }
  }
}

const mixRgb = (a: readonly [number, number, number], b: readonly [number, number, number], k: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;

/**
 * 7x7 Dot-Matrix Socket Loader (`Pola 03`).
 * Dots never translate out of their machined sockets — only brightness & fill
 * morph smoothly from the animated field into the resting vector silhouette.
 */
const DotMatrixSocketLoader: React.FC<{
  pattern: DotMatrixPattern;
  done: boolean;
  size?: number;
  phaseOffset?: number;
}> = memo(function DotMatrixSocketLoader({ pattern, done, size = 20, phaseOffset = 0 }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();
  const doneProgressRef = useRef(done ? 1 : 0);
  const doneTargetRef = useRef(done ? 1 : 0);
  doneTargetRef.current = done ? 1 : 0;

  useAnimationFrame((timeMs) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const px = Math.round(size * dpr);
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ease doneProgress smoothly
    doneProgressRef.current += (doneTargetRef.current - doneProgressRef.current) * 0.14;
    if (Math.abs(doneTargetRef.current - doneProgressRef.current) < 0.005) {
      doneProgressRef.current = doneTargetRef.current;
    }

    const isDark =
      typeof document !== "undefined" && document.documentElement.dataset.theme === "dark";
    const cSock: readonly [number, number, number] = isDark ? [28, 28, 34] : [220, 220, 226];
    const cHi: readonly [number, number, number] = isDark ? [255, 255, 255] : [20, 20, 24];
    const cDone: readonly [number, number, number] = isDark ? [232, 232, 236] : [36, 36, 42];

    const t = reduced ? 0.37 : timeMs / 1000 + phaseOffset;
    const dVal = doneProgressRef.current;
    const cell = size / GRID_N;
    const radius = cell * 0.35;
    const sil = SILHOUETTES[pattern];
    const bandX = frac(t / 1.9 + phaseOffset * 0.21) * 44 - 10;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    for (let j = 0; j < GRID_N; j++) {
      for (let i = 0; i < GRID_N; i++) {
        const cx = (i + 0.5) * cell;
        const cy = (j + 0.5) * cell;
        const radial = Math.hypot(i - MID, j - MID) / 4.25;
        const dk = smooth(dVal * 1.65 - radial * 0.65);
        const animV = reduced ? sil[j][i] * 0.55 : samplePattern(pattern, i, j, t);
        const band = (1 - dVal) * 0.45 * Math.exp(-Math.pow((cx - bandX) / 8, 2));
        const val = clamp(animV + band * (animV > 0.05 ? 0.9 : 0.32)) * (1 - dk) + sil[j][i] * dk;

        ctx.fillStyle = val < 0.02 ? mixRgb(cSock, cSock, 0) : mixRgb(cSock, dk > 0.5 ? cDone : cHi, val);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  return (
    <canvas
      ref={canvasRef}
      className="momo-td-ld"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
});

const DIGIT_LIST = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Per-digit spring roller (`NumberFlow`) inspired directly by Hark Pola 03.
 * Renders `1.284` or `2,4` with individual vertical digit reels.
 */
const NumberFlowRoll: React.FC<{ value: string; className?: string }> = memo(
  function NumberFlowRoll({ value, className = "" }) {
    const chars = useMemo(() => [...value], [value]);

    return (
      <span className={`momo-nf-roll ${className}`.trim()} aria-label={value}>
        <AnimatePresence initial={false} mode="popLayout">
          {chars.map((ch, idx) => {
            const slotKey = `${chars.length - idx}-${/\d/.test(ch) ? "d" : ch}`;
            if (!/\d/.test(ch)) {
              return (
                <motion.span
                  key={slotKey}
                  className="momo-nf-sep"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.16, ease: EASE_MOMO }}
                >
                  {ch}
                </motion.span>
              );
            }
            const digit = Number(ch);
            return (
              <motion.span
                key={slotKey}
                className="momo-nf-digit"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "1ch" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18, ease: EASE_MOMO }}
              >
                <motion.span
                  className="momo-nf-col"
                  animate={{ y: -digit * 16 }}
                  transition={{ type: "spring", stiffness: 280, damping: 24, mass: 0.72 }}
                >
                  {DIGIT_LIST.map((d) => (
                    <i key={d}>{d}</i>
                  ))}
                </motion.span>
              </motion.span>
            );
          })}
        </AnimatePresence>
      </span>
    );
  }
);

function tidyReasoningText(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_[^_\n]+_/g, (m) => m.slice(1, -1))
    .replace(/^>\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatTokensId(n: number): string {
  return String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatSecId(s: number): string {
  return Math.max(0, s).toFixed(1).replace(".", ",");
}

interface SubStepItem {
  id: string;
  label: string;
  pattern: DotMatrixPattern;
  done: boolean;
  elapsedSec?: number;
  detailKind: "reasoning" | "tool" | "genui";
  fnName?: string;
  argsPreview?: string;
  query?: string;
  provider?: string;
  domains?: string[];
  resultsPreview?: Array<{ title: string; url: string; domain: string; imageUrl?: string }>;
  imagePreviews?: Array<{ imageUrl: string; caption?: string; sourceUrl?: string }>;
  resultBadge?: string;
  genUiOutline?: string[];
}

const FaviconChip: React.FC<{
  domain: string;
  url?: string;
  title?: string;
}> = ({ domain, url, title }) => {
  const [hideIcon, setHideIcon] = useState(false);
  const safeHref = url && /^https?:\/\//i.test(url) ? url : `https://${domain}`;
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className="momo-td-domain-chip"
      title={title || domain}
    >
      {!hideIcon && (
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
          alt=""
          width={12}
          height={12}
          referrerPolicy="no-referrer"
          onError={() => setHideIcon(true)}
        />
      )}
      <span>{domain}</span>
    </a>
  );
};

const ToolThumbItem: React.FC<{
  imageUrl: string;
  caption?: string;
  sourceUrl?: string;
}> = ({ imageUrl, caption, sourceUrl }) => {
  const [hidden, setHidden] = useState(false);
  if (hidden || !/^https?:\/\//i.test(imageUrl)) return null;
  const imgEl = (
    <img
      src={imageUrl}
      alt={caption || "Preview foto"}
      className="momo-td-img-thumb"
      referrerPolicy="no-referrer"
      onError={() => setHidden(true)}
    />
  );
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={caption || sourceUrl}
        className="momo-td-img-link"
      >
        {imgEl}
      </a>
    );
  }
  return imgEl;
};

const UI_COMPONENT_LABELS_ID: Record<string, string> = {
  Map: "Peta",
  Table: "Tabel",
  DataTable: "Tabel",
  Chart: "Grafik",
  BarChart: "Grafik",
  LineChart: "Grafik",
  AreaChart: "Grafik",
  DonutChart: "Grafik",
  RadialBarChart: "Grafik",
  RadarChart: "Grafik",
  ScatterChart: "Grafik",
  HistogramChart: "Grafik",
  FunnelChart: "Grafik",
  Versus: "Perbandingan",
  ComparisonMatrix: "Perbandingan",
  OptionComparison: "Perbandingan",
  ProsCons: "Pro & Kontra",
  Cards: "Kartu kurasi",
  BentoGrid: "Bento kontekstual",
  Plan: "Rencana",
  Timeline: "Linimasa",
  GanttChart: "Jadwal",
  KanbanBoard: "Papan alur",
  Steps: "Alur langkah",
  Flow: "Diagram alur",
  Flowchart: "Diagram alur",
  SequenceDiagram: "Diagram sekuens",
  ArchitectureDiagram: "Arsitektur",
  EntityRelationship: "Diagram entitas",
  NetworkGraph: "Graf jaringan",
  MindMap: "Peta konsep",
  TreeDiagram: "Pohon keputusan",
  FishboneDiagram: "Diagram akar masalah",
  QuadrantChart: "Kuadran",
  Checklist: "Daftar cek",
  Stats: "Ringkasan metrik",
  MetricCard: "Metrik",
  MetricGroup: "Metrik",
  ConfidenceIndicator: "Skor keyakinan",
  ImageGallery: "Galeri foto",
  ImageCarousel: "Galeri foto",
  ImageWithCitation: "Visual bersumber",
  ImageWithCaption: "Visual",
  HeroImage: "Visual utama",
  ImageComparison: "Komparasi visual",
  KeyFindings: "Temuan kunci",
  NewsFeed: "Berita terkini",
  InsightCard: "Wawasan kunci",
  ExecutiveSummary: "Ringkasan",
  ExecutiveBrief: "Ringkasan",
  RecommendationPanel: "Rekomendasi",
  ExplanationPanel: "Penjelasan terstruktur",
  ReasoningSummary: "Alur penalaran",
  Code: "Blok kode",
  Callout: "Sorotan",
  Quiz: "Kuis interaktif",
  Choices: "Pilihan cepat",
};

function trimHeadlinePhrase(raw: string, maxLen = 26): string {
  const clean = raw.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const bounded = lastSpace >= Math.floor(maxLen * 0.5) ? sliced.slice(0, lastSpace) : sliced;
  return `${bounded.trim()}…`;
}

function extractCompactSubject(
  visualUiBlocks: MistlineUIBlock[],
  toolParts: ToolPart[],
  retryPrompt?: string
): string {
  const genericTitles = new Set(["detail", "data", "ringkasan", "tabel", "chart", "grafik", "peta"]);
  for (const blk of visualUiBlocks) {
    const rawTitle = typeof blk.props?.title === "string" ? blk.props.title.trim() : "";
    if (rawTitle && !genericTitles.has(rawTitle.toLowerCase())) {
      return trimHeadlinePhrase(rawTitle, 26);
    }
  }
  const rawQuery =
    toolParts.find((t) => typeof t.query === "string" && t.query.trim())?.query ||
    retryPrompt ||
    "";
  const cleaned = rawQuery
    .replace(/[?!."“”'`]+/g, " ")
    .replace(
      /^(?:tolong\s+|coba\s+|minta\s+|boleh\s+)?(?:carikan|cari|rekomendasi|rekomendasikan|jelaskan|buatkan|daftar|info|informasi|bagaimana|apa itu|apa saja|sejarah|mengenai|tentang|perbandingan)\s+/i,
      ""
    )
    .replace(/^(?:tentang|soal|untuk|di)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return trimHeadlinePhrase(cleaned, 26);
}

function summarizeUiKindLabels(visualUiBlocks: MistlineUIBlock[], genUiParts: GenUiPart[]): string {
  const names: string[] = [];
  for (const blk of visualUiBlocks) {
    if (blk.name === "Headline") continue;
    names.push(blk.name);
  }
  for (const gp of genUiParts) {
    for (const tok of gp.outline ?? []) {
      if (tok && tok !== "Followups") names.push(tok);
    }
  }
  const labels: string[] = [];
  for (const name of names) {
    const mapped = UI_COMPONENT_LABELS_ID[name] || name;
    if (mapped && !labels.includes(mapped)) labels.push(mapped);
    if (labels.length >= 2) break;
  }
  if (labels.length === 0) return "Kartu visual";
  return labels.join(" & ");
}

function isWebTextSearchTool(name?: string): boolean {
  return name === "web_search" || name === "google_search";
}

function extractToolItemCount(toolParts: ToolPart[], targetName: "web_search" | "search_images"): number {
  let maxCount = 0;
  for (const tp of toolParts) {
    if (targetName === "web_search" ? !isWebTextSearchTool(tp.name) : tp.name !== targetName) {
      continue;
    }
    const summaryMatch = /(\d+)\s+(?:hasil|sumber|halaman|foto|telusur)/i.exec(tp.summary || "");
    if (summaryMatch) {
      maxCount = Math.max(maxCount, parseInt(summaryMatch[1], 10));
    }
    if (targetName === "web_search" && tp.resultsPreview?.length) {
      maxCount = Math.max(maxCount, tp.resultsPreview.length);
    }
    if (targetName === "search_images" && tp.imagePreviews?.length) {
      maxCount = Math.max(maxCount, tp.imagePreviews.length);
    }
  }
  return maxCount;
}

function buildSettledThinkingHeadline(opts: {
  hasRealReasoning: boolean;
  usedWebSearch: boolean;
  usedImageSearch: boolean;
  usedSyncBoard: boolean;
  usedGenUi: boolean;
  usedAnyTool: boolean;
  sourceCount: number;
  photoCount: number;
  uiLabelSummary: string;
  compactSubject: string;
  toolParts: ToolPart[];
  reasoningText?: string;
}): string {
  const {
    hasRealReasoning,
    usedWebSearch,
    usedImageSearch,
    usedSyncBoard,
    usedGenUi,
    usedAnyTool,
    sourceCount,
    photoCount,
    uiLabelSummary,
    compactSubject,
    toolParts,
    reasoningText,
  } = opts;

  const onlyWebImageTool = usedImageSearch && !toolParts.some((t) => isWebTextSearchTool(t.name));
  const webSummaryPrefix = onlyWebImageTool
    ? photoCount > 0
      ? `${photoCount} foto`
      : "Riset foto"
    : sourceCount > 0
      ? `${sourceCount} sumber`
      : usedImageSearch
        ? "Riset visual"
        : "Riset web";

  if (usedWebSearch && usedGenUi) {
    if (usedImageSearch && photoCount > 0 && !uiLabelSummary.includes("Galeri")) {
      return `${webSummaryPrefix} & ${photoCount} foto · ${uiLabelSummary}`;
    }
    return `${webSummaryPrefix} · ${uiLabelSummary}`;
  }

  if (usedWebSearch && usedSyncBoard) {
    return `${webSummaryPrefix} · Disimpan ke Pinboard`;
  }

  if (usedWebSearch) {
    const base = onlyWebImageTool
      ? photoCount > 0
        ? `${photoCount} foto ditemukan`
        : "Pencarian foto selesai"
      : sourceCount > 0
        ? `Menelusuri ${sourceCount} sumber`
        : "Riset web selesai";
    return compactSubject ? `${base} · ${compactSubject}` : base;
  }

  if (hasRealReasoning && usedGenUi) {
    return `Penalaran · ${uiLabelSummary}`;
  }

  if (hasRealReasoning) {
    if (compactSubject) return `Menalar · ${compactSubject}`;
    if (reasoningText && reasoningText.trim().length > 360) return "Penalaran mendalam";
    return "Analisis selesai";
  }

  if (usedGenUi) {
    if (compactSubject && !uiLabelSummary.includes("&")) {
      return `${uiLabelSummary} · ${compactSubject}`;
    }
    return `${uiLabelSummary} siap`;
  }

  if (usedSyncBoard) {
    const syncSummary = toolParts.find((t) => t.name === "sync_workspace_board")?.summary;
    return syncSummary ? trimHeadlinePhrase(syncSummary, 38) : "Pinboard tersinkron";
  }

  if (usedAnyTool) {
    const firstSummary = toolParts.find((t) => t.summary)?.summary;
    return firstSummary ? trimHeadlinePhrase(firstSummary, 38) : "Eksekusi alat selesai";
  }

  return "Respons langsung";
}

export const MomoThinkingProcess: React.FC<MomoThinkingProcessProps> = ({
  msg,
  defaultOpen,
  compact = false,
}) => {
  const parts = msg.parts ?? [];
  const toolParts = parts.filter((p): p is ToolPart => p.kind === "tool");
  const genUiParts = parts.filter((p): p is GenUiPart => p.kind === "gen_ui");
  const isStreaming = Boolean(msg.streaming);

  const liveUiBlocks = useMemo(() => {
    const rawText = msg.text || "";
    if (!rawText.includes("```") && !/^\s*root\s*=/m.test(rawText)) {
      return [] as MistlineUIBlock[];
    }
    return parseMixedStreamToMistlineBlocks(rawText, { final: !isStreaming }).filter(
      (b): b is MistlineUIBlock => b.kind === "ui"
    );
  }, [msg.text, isStreaming]);

  const visualUiBlocks = useMemo(
    () => liveUiBlocks.filter((b) => b.name !== "Followups"),
    [liveUiBlocks]
  );

  // Open while streaming in Chat; stay sleek collapsed in compact Explore header or when already settled
  const [userExpanded, setUserExpanded] = useState<boolean | null>(
    defaultOpen !== undefined ? defaultOpen : null
  );
  const [autoCollapsed, setAutoCollapsed] = useState<boolean>(() => !isStreaming);
  const wasStreamingRef = useRef<boolean>(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      if (!wasStreamingRef.current) {
        setUserExpanded(defaultOpen !== undefined ? defaultOpen : null);
      }
      wasStreamingRef.current = true;
      setAutoCollapsed(false);
    } else if (wasStreamingRef.current) {
      const timer = window.setTimeout(() => {
        wasStreamingRef.current = false;
        setAutoCollapsed(true);
      }, 520);
      return () => window.clearTimeout(timer);
    } else {
      setAutoCollapsed(true);
    }
  }, [isStreaming, defaultOpen]);

  const isExpanded = userExpanded !== null ? userExpanded : (!compact && (isStreaming || !autoCollapsed));

  // Elapsed timer + accurate token counter (prefers real upstream `usageMetadata`)
  const [liveClock, setLiveClock] = useState<{ sec: number; tok: number }>(() => ({
    sec: msg.elapsedSec ?? 0.2,
    tok: msg.tokenCount ?? 0,
  }));

  const uiBlockCount =
    visualUiBlocks.length +
    genUiParts.reduce(
      (sum, gp) => sum + gp.blocks.length + (gp.openuiLang ? 1 : 0),
      0
    );
  const reasoningLen = msg.reasoningText?.length || 0;
  const textLen = msg.text?.length || 0;
  const hasRealTokenCount =
    typeof msg.promptTokens === "number" ||
    typeof msg.completionTokens === "number" ||
    typeof msg.reasoningTokens === "number" ||
    (typeof msg.tokenCount === "number" && msg.tokenCount > 0);

  useEffect(() => {
    if (!isStreaming) {
      const finalSec =
        msg.elapsedSec ??
        (msg.startedAt
          ? Math.max(0.2, +((Date.now() - msg.startedAt) / 1000).toFixed(1))
          : 0.8);
      const finalTok = hasRealTokenCount
        ? (msg.tokenCount ?? ((msg.completionTokens || 0) + (msg.reasoningTokens || 0)))
        : Math.max(18, Math.round((reasoningLen + textLen) / 3.5));
      setLiveClock((prev) =>
        prev.sec === finalSec && prev.tok === finalTok
          ? prev
          : { sec: finalSec, tok: finalTok }
      );
      return;
    }

    let raf = 0;
    const startTs = msg.startedAt || Date.now();
    let lastUpdate = 0;

    const tick = (now: number) => {
      if (now - lastUpdate >= 90) {
        lastUpdate = now;
        const sec = Math.max(0.1, (Date.now() - startTs) / 1000);
        const charEstimate = Math.round((reasoningLen + textLen) / 3.5);
        const tok = hasRealTokenCount
          ? (msg.tokenCount ?? ((msg.completionTokens || 0) + (msg.reasoningTokens || 0)))
          : charEstimate;
        setLiveClock((prev) =>
          Math.abs(prev.sec - sec) < 0.05 && prev.tok === tok ? prev : { sec, tok }
        );
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    isStreaming,
    msg.startedAt,
    msg.elapsedSec,
    msg.tokenCount,
    msg.completionTokens,
    msg.reasoningTokens,
    hasRealTokenCount,
    reasoningLen,
    textLen,
    uiBlockCount,
  ]);

  const reasoningWindowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = reasoningWindowRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msg.reasoningText]);

  const subSteps: SubStepItem[] = useMemo(() => {
    const list: SubStepItem[] = [];
    for (const tp of toolParts) {
      const isSync = tp.name === "sync_workspace_board";
      const isSearch = isWebTextSearchTool(tp.name) || tp.name === "search_images";
      const defaultStepLabel =
        tp.name === "search_images"
          ? "Mencari foto kontekstual"
          : isSearch
            ? "Menelusuri sumber web"
            : isSync
              ? "Menyelaraskan Pinboard"
              : "Memverifikasi konteks";
      list.push({
        id: tp.id,
        label: sanitizePublicTaskLabel(tp.label, defaultStepLabel) || defaultStepLabel,
        pattern: isSearch ? "globe" : isSync ? "mag" : "globe",
        done: tp.status === "done" || !isStreaming,
        elapsedSec: tp.elapsedMs ? +(tp.elapsedMs / 1000).toFixed(1) : undefined,
        detailKind: "tool",
        fnName: tp.name,
        argsPreview: tp.argsPreview,
        query: tp.query,
        domains: tp.domains,
        resultsPreview: tp.resultsPreview,
        imagePreviews: tp.imagePreviews,
        resultBadge: tp.summary ? sanitizePublicTaskLabel(tp.summary, "") || undefined : undefined,
      });
    }
    if (visualUiBlocks.length > 0) {
      const activeBuilding = visualUiBlocks.find((b) => !b.complete);
      const summaryLabel = summarizeUiKindLabels(visualUiBlocks, []);
      list.push({
        id: `mistline-ui-${msg.id}`,
        label: activeBuilding
          ? `Merakit ${UI_COMPONENT_LABELS_ID[activeBuilding.name] || activeBuilding.name}`
          : `${summaryLabel} siap`,
        pattern: "pen",
        done: !isStreaming && visualUiBlocks.every((b) => b.complete),
        detailKind: "genui",
        genUiOutline: visualUiBlocks.map((b) => b.name),
        resultBadge: `${visualUiBlocks.length} blok`,
      });
    } else {
      for (const gp of genUiParts) {
        list.push({
          id: `step-${gp.id}`,
          label: gp.title ? `Merender Gen UI: ${gp.title}` : "Menyusun komponen Gen UI",
          pattern: "pen",
          done: gp.status === "ready" || gp.status === "aborted" || !isStreaming,
          detailKind: "genui",
          genUiOutline:
            gp.outline && gp.outline.length > 0
              ? gp.outline
              : gp.blocks.map((b) => b.spec?.type || "html"),
          resultBadge: gp.blocks.length > 0 ? `${gp.blocks.length} blok` : undefined,
        });
      }
    }
    return list;
  }, [toolParts, visualUiBlocks, genUiParts, isStreaming, msg.id]);

  const allToolDomains = useMemo(() => {
    const out: string[] = [];
    for (const tp of toolParts) {
      for (const d of tp.domains || []) {
        if (d && !out.includes(d)) out.push(d);
      }
    }
    if (out.length === 0 && msg.sources) {
      for (const s of msg.sources) {
        if (s.domain && !out.includes(s.domain)) out.push(s.domain);
      }
    }
    return out.slice(0, 3);
  }, [toolParts, msg.sources]);

  const hasRealReasoning = Boolean(
    msg.hasNativeReasoning || (msg.reasoningText && msg.reasoningText.trim().length > 0)
  );
  const runningTool = toolParts.find((t) => t.status === "running");
  const buildingUiBlock = visualUiBlocks.find((b) => !b.complete);
  const isRenderingGenUi =
    Boolean(buildingUiBlock) ||
    genUiParts.some((g) => g.status !== "ready" && g.status !== "aborted");
  const usedWebSearch = toolParts.some((t) => isWebTextSearchTool(t.name) || t.name === "search_images");
  const usedImageSearch = toolParts.some((t) => t.name === "search_images");
  const usedSyncBoard = toolParts.some((t) => t.name === "sync_workspace_board");
  const usedGenUi = visualUiBlocks.length > 0 || genUiParts.length > 0;
  const usedAnyTool = toolParts.length > 0;

  const sourceCount = Math.max(
    msg.sources?.length || 0,
    extractToolItemCount(toolParts, "web_search")
  );
  const photoCount = extractToolItemCount(toolParts, "search_images");
  const uiLabelSummary = usedGenUi ? summarizeUiKindLabels(visualUiBlocks, genUiParts) : "";
  const compactSubject = extractCompactSubject(visualUiBlocks, toolParts, msg.retryPrompt);

  const sanitizedActivityLabel = msg.activityLabel
    ? sanitizePublicTaskLabel(msg.activityLabel, "Memperdalam penelusuran konteks...")
    : "";

  const activeHeadline = isStreaming
    ? sanitizedActivityLabel
      ? sanitizedActivityLabel
      : runningTool
        ? sanitizePublicTaskLabel(
            runningTool.label,
            runningTool.name === "search_images"
              ? "Mencari foto kontekstual"
              : runningTool.name === "sync_workspace_board"
                ? "Menyelaraskan Pinboard"
                : "Menelusuri sumber web",
          ) ||
          (runningTool.name === "search_images"
            ? "Mencari foto kontekstual"
            : runningTool.name === "sync_workspace_board"
              ? "Menyelaraskan Pinboard"
              : "Menelusuri sumber web")
        : buildingUiBlock
          ? `Merakit ${UI_COMPONENT_LABELS_ID[buildingUiBlock.name] || buildingUiBlock.name}`
          : isRenderingGenUi
            ? "Merender komponen visual"
            : hasRealReasoning || msg.modelHasReasoning
              ? "Menalar konteks..."
              : "Menyusun respons..."
    : sanitizePublicTaskLabel(
        buildSettledThinkingHeadline({
          hasRealReasoning,
          usedWebSearch,
          usedImageSearch,
          usedSyncBoard,
          usedGenUi,
          usedAnyTool,
          sourceCount,
          photoCount,
          uiLabelSummary,
          compactSubject,
          toolParts,
          reasoningText: msg.reasoningText,
        }),
        "Analisis selesai",
      );

  const activePattern: DotMatrixPattern = isStreaming
    ? runningTool
      ? runningTool.name === "sync_workspace_board"
        ? "mag"
        : "globe"
      : isRenderingGenUi
        ? "pen"
        : hasRealReasoning || msg.modelHasReasoning
          ? "pikir"
          : "pen"
    : hasRealReasoning
      ? "pikir"
      : usedWebSearch
        ? "globe"
        : "pen";

  const tokenStr = formatTokensId(liveClock.tok);
  const secStr = formatSecId(liveClock.sec);
  const reasoningBadge = formatContextualReasoningBadge(msg.reasoningEffortUsed);
  const hasDetailBody = Boolean(
    msg.reasoningText ||
      subSteps.length > 0 ||
      reasoningBadge
  );

  return (
    <motion.section
      className={`momo-td-card${compact ? " is-compact" : ""}${isStreaming ? " is-streaming" : " is-done"}`}
      data-thinking-mode="galur"
      aria-label="Proses penalaran dan eksekusi alat Momo"
      initial={isStreaming ? { opacity: 0, y: 8, scale: 0.985 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: EASE_MOMO }}
    >
      {/* Header Row — Opsi A (Galur) */}
      <div className="momo-td-head-wrap">
        <button
          type="button"
          className="momo-td-ph"
          aria-expanded={isExpanded}
          onClick={() => setUserExpanded((prev) => !(prev !== null ? prev : isExpanded))}
        >
          <DotMatrixSocketLoader
            pattern={activePattern}
            done={!isStreaming}
            size={compact ? 18 : 20}
          />

          <span className="momo-td-lbw">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={activeHeadline}
                className={`momo-td-lb${isStreaming ? " is-shimmer" : " is-settled"}`}
                title={activeHeadline}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.14, ease: EASE_MOMO }}
              >
                {activeHeadline}
              </motion.span>
            </AnimatePresence>
          </span>

          <span className="momo-td-meta">
            {allToolDomains.length > 0 && !isExpanded && (
              <span className="momo-td-head-favicons" aria-hidden="true">
                {allToolDomains.map((dom) => (
                  <img
                    key={dom}
                    src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(dom)}&sz=32`}
                    alt=""
                    width={12}
                    height={12}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ))}
              </span>
            )}
            <NumberFlowRoll value={tokenStr} />
            <span className="momo-td-unit momo-td-ut">token</span>
            <i className="momo-td-sep" aria-hidden="true" />
            <NumberFlowRoll value={secStr} />
            <span className="momo-td-unit">dtk</span>
          </span>

          <motion.svg
            className="momo-td-cv"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: EASE_MOMO }}
            aria-hidden="true"
          >
            <path d="M6 4l4 4-4 4" />
          </motion.svg>
        </button>
      </div>

      {/* Expandable Opsi A (Galur) Tree Body */}
      <AnimatePresence initial={false}>
        {isExpanded && hasDetailBody && (
          <motion.div
            key="td-body"
            className="momo-td-body-wrap"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_MOMO }}
            style={{ overflow: "hidden" }}
          >
            <div className="momo-td-pbi">
              <i className="momo-td-rail" aria-hidden="true">
                <motion.i
                  className="momo-td-rail-lit"
                  animate={
                    isStreaming
                      ? { y: ["0%", "220%", "0%"], opacity: [0.35, 1, 0.35] }
                      : { y: "0%", opacity: 0.25 }
                  }
                  transition={
                    isStreaming
                      ? { duration: 1.9, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.3 }
                  }
                />
              </i>

              {(reasoningBadge || (msg.reasoningTokens ?? 0) > 0 || (sourceCount > 0)) && (
                <div className="momo-td-meta-pills">
                  {reasoningBadge && (
                    <span className="momo-td-meta-pill">{reasoningBadge}</span>
                  )}
                  {sourceCount > 0 && (
                    <span className="momo-td-meta-pill">
                      {sourceCount} sumber web
                    </span>
                  )}
                  {(msg.reasoningTokens ?? 0) > 0 && (
                    <span className="momo-td-meta-pill">
                      Penalaran: {formatTokensId(msg.reasoningTokens!)} tok
                    </span>
                  )}
                </div>
              )}

              {msg.reasoningText && (
                <div className="momo-td-rsw">
                  <div ref={reasoningWindowRef} className="momo-td-rs sc">
                    <p className="momo-td-rt">{tidyReasoningText(msg.reasoningText)}</p>
                  </div>
                </div>
              )}

              {subSteps.length > 0 && (
                <div className="momo-td-tree">
                  {subSteps.map((step, sIdx) => (
                    <motion.div
                      key={step.id}
                      className="momo-td-sub"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: sIdx * 0.05, ease: EASE_MOMO }}
                    >
                      <i className="momo-td-jt" aria-hidden="true" />
                      <i className="momo-td-br" aria-hidden="true" />

                      <div className="momo-td-sh">
                        <DotMatrixSocketLoader
                          pattern={step.pattern}
                          done={step.done}
                          size={18}
                          phaseOffset={(sIdx + 1) * 0.4}
                        />
                        <span
                          className={`momo-td-sl${!step.done ? " is-shimmer" : ""}`}
                          title={step.label}
                        >
                          {step.label}
                        </span>
                        {step.elapsedSec !== undefined && (
                          <span className="momo-td-tm">
                            <NumberFlowRoll value={formatSecId(step.elapsedSec)} />{" "}
                            <span>dtk</span>
                          </span>
                        )}
                      </div>

                      {step.detailKind === "tool" && step.fnName && (() => {
                        const toolStepInfo = formatContextualToolStep(
                          step.fnName,
                          step.query,
                          step.argsPreview,
                        );
                        return (
                          <div className="momo-td-sb">
                            <div className="momo-td-tool" data-tool-name={step.fnName}>
                              <span
                                className={`momo-td-tdot${!step.done ? " is-pulse" : ""}`}
                                aria-hidden="true"
                              />
                              <span
                                className="momo-td-fn"
                                title={
                                  toolStepInfo.detailText
                                    ? `${toolStepInfo.actionLabel}: ${toolStepInfo.detailText}`
                                    : toolStepInfo.actionLabel
                                }
                              >
                                {toolStepInfo.actionLabel}
                                {toolStepInfo.detailText ? (
                                  <em> · “{toolStepInfo.detailText}”</em>
                                ) : null}
                              </span>
                              {step.resultBadge && (
                                <span className="momo-td-res" title={step.resultBadge}>
                                  {step.resultBadge}
                                </span>
                              )}
                            </div>

                            {(step.resultsPreview?.length || step.domains?.length) ? (
                              <div className="momo-td-domains">
                                {step.resultsPreview && step.resultsPreview.length > 0
                                  ? step.resultsPreview.map((r, rIdx) => (
                                      <FaviconChip
                                        key={`${r.domain}-${rIdx}`}
                                        domain={r.domain}
                                        url={r.url}
                                        title={r.title}
                                      />
                                    ))
                                  : (step.domains || []).map((dom) => (
                                      <FaviconChip key={dom} domain={dom} />
                                    ))}
                              </div>
                            ) : null}

                            {step.imagePreviews && step.imagePreviews.length > 0 && (
                              <div className="momo-td-img-strip">
                                {step.imagePreviews.slice(0, 4).map((img, iIdx) => (
                                  <ToolThumbItem
                                    key={`${img.imageUrl}-${iIdx}`}
                                    imageUrl={img.imageUrl}
                                    caption={img.caption}
                                    sourceUrl={img.sourceUrl}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {step.detailKind === "genui" &&
                        step.genUiOutline &&
                        step.genUiOutline.length > 0 && (
                          <div className="momo-td-sb">
                            <div className="momo-td-chips">
                              {step.genUiOutline.slice(0, 5).map((tok, tIdx) => (
                                <span key={`${tok}-${tIdx}`} className="momo-td-chip">
                                  <span>0{tIdx + 1}</span>
                                  <span>{tok}</span>
                                </span>
                              ))}
                              {step.resultBadge && (
                                <span className="momo-td-res">{step.resultBadge}</span>
                              )}
                            </div>
                          </div>
                        )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};
