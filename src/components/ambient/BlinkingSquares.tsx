"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

interface BlinkCell {
  x: number;
  y: number;
  sq: number;
  base: number;
  phase: number;
  bornAt: number;
}

export interface BlinkingSquaresProps {
  direction?: "right" | "left" | "top" | "bottom";
  /** Number of grid cells along the long axis (8–200). */
  gridSize?: number;
  /** Square fill % within each cell (0.05–0.98). */
  squareSize?: number;
  /** Where the field first becomes non-empty along `direction` (0–1). */
  fadeStart?: number;
  /** Where the field reaches full density along `direction` (0–1). */
  fadeEnd?: number;
  /** Density curve sharpness between fadeStart and fadeEnd. */
  falloff?: number;
  /** Minimum brightness of a lit cell (0–1). */
  minBrightness?: number;
  /** Per-cell twinkle rate, cycles per second (0 freezes the field). */
  twinkleSpeed?: number;
  /** Oscillation depth of each cell's brightness (0–1). */
  twinkleStrength?: number;
  /** Master brightness multiplier (0–2). */
  intensity?: number;
  /** Device pixel ratio cap (1–3). */
  dpr?: number;
  /** Explicit square color (e.g. the active role accent). When omitted the field
   * resolves `--accent` from the canvas' computed style — which inherits any
   * scoped custom property set on an ancestor. */
  color?: string;
  className?: string;
}

/**
 * Canvas "blinking squares" ambient field — squares anchored to `direction`,
 * density ramping from `fadeStart` to `fadeEnd`, each lit cell twinkling on its
 * own phase. Mounts with a sweep: the wrapper clip-reveals from the anchor edge
 * and cells ignite progressively toward it inside the draw loop.
 */
export function BlinkingSquares({
  direction = "right",
  gridSize = 52,
  squareSize = 0.26,
  fadeStart = 0.33,
  fadeEnd = 1,
  falloff = 1.25,
  minBrightness = 0.48,
  twinkleSpeed = 1.4,
  twinkleStrength = 0.94,
  intensity = 0.55,
  dpr = 1.5,
  color: colorProp,
  className,
}: BlinkingSquaresProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let raf = 0;
    let cells: BlinkCell[] = [];
    let color = "#ef8c66";
    const t0 = performance.now();
    let firstBuild = true;
    const ignite = reduce ? 0 : 1.15;

    const resolveColor = () => {
      if (colorProp) {
        color = colorProp;
        return;
      }
      const v = getComputedStyle(canvas)
        .getPropertyValue("--accent")
        .trim();
      if (v) color = v;
    };

    const rebuild = () => {
      const r = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, dpr);
      canvas.width = Math.max(1, Math.round(r.width * ratio));
      canvas.height = Math.max(1, Math.round(r.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const cell = Math.max(r.width, r.height) / gridSize;
      const cols = Math.ceil(r.width / cell);
      const rows = Math.ceil(r.height / cell);
      const sq = cell * squareSize;
      cells = [];
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const p =
            direction === "right"
              ? (cx + 0.5) / cols
              : direction === "left"
                ? 1 - (cx + 0.5) / cols
                : direction === "bottom"
                  ? (cy + 0.5) / rows
                  : 1 - (cy + 0.5) / rows;
          const density =
            p <= fadeStart
              ? 0
              : Math.min(
                  1,
                  Math.pow(
                    (p - fadeStart) / Math.max(0.001, fadeEnd - fadeStart),
                    falloff,
                  ),
                );
          if (Math.random() < density) {
            cells.push({
              x: cx * cell + (cell - sq) / 2,
              y: cy * cell + (cell - sq) / 2,
              sq,
              base: minBrightness + Math.random() * (1 - minBrightness),
              phase: Math.random() * Math.PI * 2,
              bornAt:
                (firstBuild ? ignite * (1 - p) : 0) +
                (performance.now() - t0) / 1000,
            });
          }
        }
      }
    };

    resolveColor();
    rebuild();
    firstBuild = false;
    const ro = new ResizeObserver(rebuild);
    ro.observe(canvas);
    const mo = new MutationObserver(resolveColor);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const speed = reduce ? 0 : twinkleSpeed;
    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      for (const c of cells) {
        const life = t - c.bornAt;
        if (life <= 0) continue;
        const birth = life < 0.28 ? life / 0.28 : 1;
        const dip =
          speed === 0
            ? 0
            : (0.5 - 0.5 * Math.sin(2 * Math.PI * speed * t + c.phase)) *
              twinkleStrength;
        ctx.globalAlpha = Math.min(1, c.base * (1 - dip) * intensity) * birth;
        ctx.fillRect(c.x, c.y, c.sq, c.sq);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [
    direction,
    gridSize,
    squareSize,
    fadeStart,
    fadeEnd,
    falloff,
    minBrightness,
    twinkleSpeed,
    twinkleStrength,
    intensity,
    dpr,
    colorProp,
    reduce,
  ]);

  const sweepClip =
    direction === "right"
      ? "inset(0% 0% 0% 100%)"
      : direction === "left"
        ? "inset(0% 100% 0% 0%)"
        : direction === "bottom"
          ? "inset(100% 0% 0% 0%)"
          : "inset(0% 0% 100% 0%)";

  return (
    <motion.div
      className={className}
      aria-hidden="true"
      initial={
        reduce
          ? { opacity: 0 }
          : {
              opacity: 0,
              clipPath: sweepClip,
              filter: "blur(10px)",
            }
      }
      animate={
        reduce
          ? { opacity: 1 }
          : {
              opacity: 1,
              clipPath: "inset(0% 0% 0% 0%)",
              filter: "blur(0px)",
            }
      }
      exit={{ opacity: 0, transition: { duration: 0.28, ease: "easeOut" } }}
      transition={
        reduce
          ? { duration: 0.3 }
          : { delay: 0.12, duration: 0.85, ease: [0.22, 1, 0.36, 1] }
      }
    >
      <canvas ref={canvasRef} className="chat-ambient-grid__canvas" />
    </motion.div>
  );
}
