"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Code2, Copy, Expand, Minus, Plus, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { MH } from "@/components/motion/MotionPrimitives";
import { FullscreenPortalModal } from "./FullscreenPortalModal";

export interface MermaidRendererProps {
  code: string;
  title?: string;
  kind?: string;
  caption?: string;
  complete?: boolean;
  allowFullscreen?: boolean;
}

function isDarkDoc(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.theme === "dark";
}

function detectDiagramKind(code: string, explicitKind?: string): string {
  if (explicitKind && explicitKind.trim()) return explicitKind.trim();
  const firstLine = code
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("%%")) || "";
  if (/^sequenceDiagram\b/i.test(firstLine)) return "Sequence Diagram";
  if (/^erDiagram\b/i.test(firstLine)) return "ER Diagram";
  if (/^classDiagram\b/i.test(firstLine)) return "Class Diagram";
  if (/^stateDiagram/i.test(firstLine)) return "State Diagram";
  if (/^gantt\b/i.test(firstLine)) return "Gantt Timeline";
  if (/^pie\b/i.test(firstLine)) return "Pie Chart";
  if (/^mindmap\b/i.test(firstLine)) return "Mindmap";
  if (/^gitGraph\b/i.test(firstLine)) return "Git Graph";
  if (/^timeline\b/i.test(firstLine)) return "Timeline";
  return "Flowchart";
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({
  code,
  title,
  kind,
  caption,
  complete = true,
  allowFullscreen = true,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [dark, setDark] = useState(isDarkDoc);
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const cleanCode = useMemo(() => code.trim(), [code]);
  const badgeLabel = useMemo(() => detectDiagramKind(cleanCode, kind), [cleanCode, kind]);

  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDarkDoc()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!complete || !cleanCode) {
      setSvgHtml("");
      setRenderError(null);
      return;
    }

    let dead = false;
    void import("mermaid")
      .then(async (mod) => {
        if (dead) return;
        const mermaid = mod.default ?? mod;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "var(--gu-sans, Inter, system-ui, sans-serif)",
          themeVariables: dark
            ? {
                darkMode: true,
                background: "transparent",
                mainBkg: "#1c1d24",
                nodeBorder: "#ea855e",
                primaryColor: "#1f212a",
                primaryTextColor: "#f3f4f6",
                primaryBorderColor: "#ea855e",
                secondaryColor: "#17181f",
                secondaryBorderColor: "rgba(255, 255, 255, 0.16)",
                secondaryTextColor: "#e5e7eb",
                tertiaryColor: "#14151a",
                tertiaryBorderColor: "rgba(255, 255, 255, 0.12)",
                tertiaryTextColor: "#d1d5db",
                lineColor: "#8b93a7",
                clusterBkg: "rgba(255, 255, 255, 0.03)",
                clusterBorder: "rgba(255, 255, 255, 0.14)",
                edgeLabelBackground: "#16171d",
                fontSize: "13.5px",
              }
            : {
                darkMode: false,
                background: "transparent",
                mainBkg: "#fffaf6",
                nodeBorder: "#da6c4d",
                primaryColor: "#fff8f4",
                primaryTextColor: "#141416",
                primaryBorderColor: "#da6c4d",
                secondaryColor: "#f5f4f1",
                secondaryBorderColor: "rgba(20, 20, 22, 0.18)",
                secondaryTextColor: "#1e1f24",
                tertiaryColor: "#ffffff",
                tertiaryBorderColor: "rgba(20, 20, 22, 0.14)",
                tertiaryTextColor: "#33363f",
                lineColor: "#525763",
                clusterBkg: "rgba(20, 20, 22, 0.025)",
                clusterBorder: "rgba(20, 20, 22, 0.14)",
                edgeLabelBackground: "#faf9f7",
                fontSize: "13.5px",
              },
          themeCSS: `
            .node rect, .node circle, .node ellipse, .node polygon, .node path,
            .cluster rect, .actor, rect.note {
              filter: none !important;
              box-shadow: none !important;
              rx: 10px;
              ry: 10px;
            }
            .edgePath .path {
              stroke-width: 1.6px !important;
            }
            .edgeLabel rect {
              opacity: 0.96 !important;
              rx: 6px;
              ry: 6px;
            }
            .label {
              font-weight: 500;
            }
          `,
          flowchart: {
            htmlLabels: true,
            curve: "basis",
            padding: 14,
            nodeSpacing: 34,
            rankSpacing: 42,
          },
        });

        const renderId = `momo_mermaid_${uid}_${Date.now().toString(36)}`;
        const out = await mermaid.render(renderId, cleanCode);
        if (!dead && out?.svg) {
          setSvgHtml(out.svg);
          setRenderError(null);
        }
      })
      .catch((err) => {
        if (dead) return;
        setSvgHtml("");
        setRenderError(err instanceof Error ? err.message : "Sintaks Mermaid tidak valid.");
      });

    return () => {
      dead = true;
    };
  }, [cleanCode, complete, dark, uid]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(cleanCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Ignore clipboard refusal
    }
  };

  const renderSurface = (isFs = false) => (
    <figure className={`gu gu-diagram${isFs ? " is-fs" : ""}`}>
      <div className="gu-diagram__head">
        <div className="gu-diagram__titles">
          <span className="gu-tag">{badgeLabel}</span>
          {title && <h3 className="gu-diagram__title">{title}</h3>}
        </div>
        <div className="gu-diagram__tools">
          {svgHtml && !showCode && (
            <>
              <motion.button
                type="button"
                className="gu-icon-btn"
                whileHover={MH.chip}
                whileTap={MH.tap}
                transition={MH.spring}
                aria-label="Perkecil diagram"
                title="Perkecil"
                onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
              >
                <ZoomOut size={14} />
              </motion.button>
              <motion.button
                type="button"
                className="gu-icon-btn"
                whileHover={MH.chip}
                whileTap={MH.tap}
                transition={MH.spring}
                aria-label="Reset zoom diagram"
                title="Reset zoom"
                onClick={() => setZoom(1)}
              >
                <RotateCcw size={13} />
              </motion.button>
              <motion.button
                type="button"
                className="gu-icon-btn"
                whileHover={MH.chip}
                whileTap={MH.tap}
                transition={MH.spring}
                aria-label="Perbesar zoom diagram"
                title="Perbesar"
                onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))}
              >
                <ZoomIn size={14} />
              </motion.button>
            </>
          )}
          <motion.button
            type="button"
            className={`gu-icon-btn${showCode ? " is-active" : ""}`}
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            aria-label={showCode ? "Lihat diagram visual" : "Lihat kode Mermaid"}
            title={showCode ? "Lihat visual" : "Lihat kode Mermaid"}
            onClick={() => setShowCode((s) => !s)}
          >
            <Code2 size={14} />
          </motion.button>
          <motion.button
            type="button"
            className={`gu-icon-btn${copied ? " is-active" : ""}`}
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            aria-label="Salin kode Mermaid"
            title="Salin kode"
            onClick={handleCopy}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </motion.button>
          {!isFs && allowFullscreen && svgHtml && (
            <motion.button
              type="button"
              className="gu-icon-btn"
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              aria-label="Buka diagram layar penuh"
              title="Layar penuh"
              onClick={() => setFullscreen(true)}
            >
              <Expand size={14} />
            </motion.button>
          )}
        </div>
      </div>

      {!complete ? (
        <div className="gu-diagram__loading">
          <span>Menyusun diagram {badgeLabel.toLowerCase()}…</span>
        </div>
      ) : showCode || (!svgHtml && renderError) ? (
        <div className="gu-diagram__codewrap">
          {renderError && !showCode && (
            <div className="gu-diagram__err">Sintaks diagram tidak dapat dirender otomatis ({renderError})</div>
          )}
          <pre className="gu-diagram__pre sc">
            <code>{cleanCode}</code>
          </pre>
        </div>
      ) : svgHtml ? (
        <div className="gu-diagram__stage sc" style={{ position: "relative" }}>
          <div className="intel-canvas-zoom" role="group" aria-label="Diagram zoom controls">
            <motion.button
              type="button"
              className="intel-canvas-zoom__btn"
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              aria-label="Perbesar zoom diagram"
              title="Perbesar"
              onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))}
            >
              <Plus size={13} />
            </motion.button>
            <motion.button
              type="button"
              className="intel-canvas-zoom__btn"
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              aria-label="Perkecil diagram"
              title="Perkecil"
              onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
            >
              <Minus size={13} />
            </motion.button>
            <motion.button
              type="button"
              className="intel-canvas-zoom__btn"
              whileHover={MH.chip}
              whileTap={MH.tap}
              transition={MH.spring}
              aria-label="Reset zoom diagram"
              title="Reset zoom"
              onClick={() => setZoom(1)}
            >
              <RotateCcw size={12} />
            </motion.button>
          </div>
          <motion.div
            className="gu-diagram__svg"
            initial={false}
            animate={{ scale: zoom }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{ transformOrigin: "top center" }}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        </div>
      ) : (
        <div className="gu-diagram__loading">
          <span>Merender diagram…</span>
        </div>
      )}

      {caption && <figcaption className="gu-caption">{caption}</figcaption>}
    </figure>
  );

  return (
    <>
      {renderSurface(false)}
      <FullscreenPortalModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title={title || badgeLabel}
        subtitle={caption}
        variant="map"
      >
        {renderSurface(true)}
      </FullscreenPortalModal>
    </>
  );
};
