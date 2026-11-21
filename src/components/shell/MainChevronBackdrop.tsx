"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { EASE_MOMO } from "@/components/motion/MotionPrimitives";
import { ROLE_PALETTES } from "@/data/looks";
import { hexToRgbTuple, resolvePaletteKey } from "@/lib/localBrain";

const CHARS = "+.:-=+*#%@";
const CELL_SIZE = 12;
const DENSITY = 0.55;
const GLYPH_OPACITY = 0.18;
const GRAD_OPACITY = 0.86;

const LAGOON_DEEP: [number, number, number] = [13, 148, 136];
const LAGOON_MID: [number, number, number] = [94, 234, 212];
const LAGOON_BRIGHT: [number, number, number] = [240, 253, 250];

export interface MainChevronBackdropProps {
  activeLook: string;
  paletteOverrides: Record<string, string>;
  started: boolean;
  busy: boolean;
  dark: boolean;
  offline: boolean;
  sideHidden?: boolean;
}

interface TargetState {
  look: string;
  paletteOverrides: Record<string, string>;
  started: boolean;
  busy: boolean;
  dark: boolean;
  offline: boolean;
}

interface PaletteStops {
  deep: [number, number, number];
  mid: [number, number, number];
  bright: [number, number, number];
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function lerpRgbInPlace(
  cur: [number, number, number],
  target: [number, number, number],
  k: number
): void {
  cur[0] += (target[0] - cur[0]) * k;
  cur[1] += (target[1] - cur[1]) * k;
  cur[2] += (target[2] - cur[2]) * k;
}

function to255(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgbTuple(hex);
  return [r * 255, g * 255, b * 255];
}

function resolveLagoonBlendedPalette(
  look: string,
  overrides: Record<string, string>,
  offline: boolean
): PaletteStops {
  if (offline) {
    const ash = ROLE_PALETTES.ash;
    return {
      deep: to255(ash[3]),
      mid: to255(ash[1]),
      bright: to255(ash[0]),
    };
  }
  const key = resolvePaletteKey(look, overrides);
  if (key === "teal") {
    return {
      deep: [...LAGOON_DEEP],
      mid: [...LAGOON_MID],
      bright: [...LAGOON_BRIGHT],
    };
  }
  const tuple = ROLE_PALETTES[key] ?? ROLE_PALETTES.persimmon;
  return {
    deep: mixRgb(to255(tuple[3]), LAGOON_DEEP, 0.25),
    mid: mixRgb(to255(tuple[1]), LAGOON_MID, 0.22),
    bright: mixRgb(to255(tuple[0]), LAGOON_BRIGHT, 0.28),
  };
}

function hashNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 41.3) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Home (!started): Wing Fold blades stretching edge-to-edge across `<main>`.
 */
function sampleHomeWingFold(
  nx: number,
  ny: number,
  t: number,
  transPhase: number
): number {
  const ax = Math.abs(nx - 0.5) * 2;
  const diagA = Math.abs(ny - (0.5 - 0.038) - ax * 0.16);
  const diagB = Math.abs(ny - (0.5 + 0.038) + ax * 0.13);
  const flow = 0.8 + 0.2 * Math.sin(ax * 10 - t * 2.1);

  let field =
    Math.max(
      1 - smoothstep(0.014, 0.072, diagA),
      1 - smoothstep(0.014, 0.072, diagB)
    ) * flow;

  if (transPhase > 0.01) {
    const sweepAx = Math.max(0, Math.min(1, 1 - transPhase));
    const foldSweep = Math.exp(-Math.pow((ax - sweepAx) / 0.18, 2));
    field = Math.min(1, field * (1 + foldSweep * transPhase * 0.65));
  }

  return field;
}

/**
 * Home spatial scrim: clears only the center hero ellipse behind Momo & HeroAskLockup;
 * left & right viewport edges stay 100% open.
 */
function evalHomeScrim(nx: number, ny: number): number {
  const rHomeCenter = Math.hypot((nx - 0.5) / 0.24, (ny - 0.56) / 0.34);
  const homeCenterClear = smoothstep(0.24, 1.05, rHomeCenter);
  const homeVertSafe =
    smoothstep(0.0, 0.05, ny) * (1 - smoothstep(0.95, 1.0, ny));
  return (0.06 + 0.94 * homeCenterClear) * homeVertSafe;
}

/**
 * Animated Lagoon Gradient-ASCII backdrop for `<main>` on Home (`!started`):
 * renders the Wing Fold at 12px cellSize, 0.86 grad opacity, 0.18 glyph opacity
 * and fades smoothly to clean canvas background in Chat (`started = true`).
 */
export function MainChevronBackdrop({
  activeLook,
  paletteOverrides,
  started,
  busy,
  dark,
  offline,
  sideHidden = false,
}: MainChevronBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRef = useRef<TargetState>({
    look: activeLook,
    paletteOverrides,
    started,
    busy,
    dark,
    offline,
  });

  const transImpulseRef = useRef<number>(0);
  const repaintStaticRef = useRef<(() => void) | null>(null);
  const prevMotionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const motionSignalKey = `${activeLook}:${resolvePaletteKey(activeLook, paletteOverrides)}:${started ? 1 : 0}:${offline ? 1 : 0}:${sideHidden ? 1 : 0}`;
    if (
      prevMotionKeyRef.current !== null &&
      prevMotionKeyRef.current !== motionSignalKey
    ) {
      transImpulseRef.current = 1.0;
    }
    prevMotionKeyRef.current = motionSignalKey;
    targetRef.current = {
      look: activeLook,
      paletteOverrides,
      started,
      busy,
      dark,
      offline,
    };
    repaintStaticRef.current?.();
  }, [activeLook, paletteOverrides, started, busy, dark, offline, sideHidden]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const mainEl = canvas?.parentElement;
    if (!canvas || !mainEl) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const gradBuffer = document.createElement("canvas");
    const gradCtx = gradBuffer.getContext("2d");
    const atlas = document.createElement("canvas");
    const atlasCtx = atlas.getContext("2d");
    if (!gradCtx || !atlasCtx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let width = 1;
    let height = 1;
    let gw = 200;
    let gh = 120;
    let gradImg = gradCtx.createImageData(gw, gh);
    let atlasCell = 20;

    // Read authoritative DOM theme immediately on mount so SSR dark=false never flashes Light -> Dark
    const liveDomDark = () => document.documentElement.dataset.theme === "dark";
    const initialDark = liveDomDark();
    targetRef.current.dark = initialDark;
    let themeReadyArmed = false;

    const initStops = resolveLagoonBlendedPalette(
      targetRef.current.look,
      targetRef.current.paletteOverrides,
      targetRef.current.offline
    );

    const anim = {
      chatMix: targetRef.current.started ? 1 : 0,
      busyMix: targetRef.current.busy ? 1 : 0,
      darkMix: initialDark ? 1 : 0,
      entranceMix: reducedMotion.matches ? 1 : 0,
      deep: [...initStops.deep] as [number, number, number],
      mid: [...initStops.mid] as [number, number, number],
      bright: [...initStops.bright] as [number, number, number],
      lastAtlasKey: "",
    };

    const rebuildAtlas = (
      deep: [number, number, number],
      mid: [number, number, number],
      bright: [number, number, number],
      isDark: boolean
    ) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      atlasCell = Math.ceil(CELL_SIZE * dpr);
      atlas.width = CHARS.length * atlasCell;
      atlas.height = 3 * atlasCell;
      atlasCtx.clearRect(0, 0, atlas.width, atlas.height);
      atlasCtx.font = `600 ${Math.round(CELL_SIZE * 0.92 * dpr)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      atlasCtx.textAlign = "center";
      atlasCtx.textBaseline = "middle";

      const stops: [number, number, number][] = isDark
        ? [mid, bright, [255, 255, 255]]
        : [
            [deep[0] * 0.65, deep[1] * 0.65, deep[2] * 0.65],
            [15, 118, 110],
            [10, 82, 76],
          ];

      for (let b = 0; b < 3; b++) {
        const c = stops[b];
        atlasCtx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
        const cy = b * atlasCell + atlasCell * 0.54;
        for (let i = 0; i < CHARS.length; i++) {
          const cx = i * atlasCell + atlasCell * 0.5;
          atlasCtx.fillText(CHARS[i], cx, cy);
        }
      }
    };

    let rafId = 0;
    let lastTs = performance.now();

    const renderFrame = (now: number) => {
      rafId = 0;
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      const cur = targetRef.current;
      const isDomDark = liveDomDark();
      cur.dark = isDomDark;

      if (cur.started) {
        anim.chatMix = 1;
        return;
      }
      anim.chatMix = 0;
      const t = reducedMotion.matches ? 0 : now * 0.00058 * 1.8;

      const k = 1 - Math.exp(-dt * 4.8);
      anim.busyMix += ((cur.busy ? 1 : 0) - anim.busyMix) * (1 - Math.exp(-dt * 7));

      if (!themeReadyArmed) {
        anim.darkMix = isDomDark ? 1 : 0;
        if (document.documentElement.classList.contains("theme-ready")) {
          themeReadyArmed = true;
        }
      } else {
        anim.darkMix +=
          ((isDomDark ? 1 : 0) - anim.darkMix) * (1 - Math.exp(-dt * 10));
      }

      anim.entranceMix = reducedMotion.matches
        ? 1
        : anim.entranceMix + (1 - anim.entranceMix) * (1 - Math.exp(-dt * 11));

      transImpulseRef.current *= Math.exp(-dt * 2.4);
      const tr = transImpulseRef.current;

      const eased = anim.chatMix * anim.chatMix * (3 - 2 * anim.chatMix);
      const homeFade = 1 - eased;

      ctx.clearRect(0, 0, width, height);

      if (homeFade <= 0.004) {
        const settledDark = Math.abs(anim.darkMix - (isDomDark ? 1 : 0)) < 0.002;
        const settledEntrance = anim.entranceMix > 0.996;
        if (!cur.started || !settledDark || !settledEntrance) {
          if (
            !document.hidden &&
            !reducedMotion.matches &&
            !(cur.started && settledDark && settledEntrance)
          ) {
            rafId = requestAnimationFrame(renderFrame);
          }
        }
        return;
      }

      const sampleAt = (nx: number, ny: number): [number, number] => [
        sampleHomeWingFold(nx, ny, t, tr),
        evalHomeScrim(nx, ny) * homeFade,
      ];

      const stops = resolveLagoonBlendedPalette(
        cur.look,
        cur.paletteOverrides,
        cur.offline
      );
      lerpRgbInPlace(anim.deep, stops.deep, k);
      lerpRgbInPlace(anim.mid, stops.mid, k);
      lerpRgbInPlace(anim.bright, stops.bright, k);

      const atlasKey = `${isDomDark ? 1 : 0}:${anim.deep[0] >> 2},${anim.deep[1] >> 2},${anim.mid[0] >> 2},${anim.mid[1] >> 2}`;
      if (atlasKey !== anim.lastAtlasKey) {
        rebuildAtlas(anim.deep, anim.mid, anim.bright, isDomDark);
        anim.lastAtlasKey = atlasKey;
      }

      const data = gradImg.data;
      const dR = anim.deep[0], dG = anim.deep[1], dB = anim.deep[2];
      const mR = anim.mid[0], mG = anim.mid[1], mB = anim.mid[2];
      const bR = anim.bright[0], bG = anim.bright[1], bB = anim.bright[2];
      const lightFactor = 1 - anim.darkMix;
      const grainTick = (now * 0.03) | 0;

      let ptr = 0;
      for (let py = 0; py < gh; py++) {
        const ny = (py + 0.5) / gh;
        for (let px = 0; px < gw; px++) {
          const nx = (px + 0.5) / gw;
          const [f, sMask] = sampleAt(nx, ny);
          const alpha = Math.max(0, Math.min(1, f * GRAD_OPACITY * sMask));

          if (alpha < 0.004 || anim.entranceMix < 0.004) {
            data[ptr] = 0;
            data[ptr + 1] = 0;
            data[ptr + 2] = 0;
            data[ptr + 3] = 0;
          } else {
            let r: number, g: number, b: number;
            if (f < 0.56) {
              const u = f / 0.56;
              r = dR + (mR - dR) * u;
              g = dG + (mG - dG) * u;
              b = dB + (mB - dB) * u;
            } else {
              const u = (f - 0.56) / 0.44;
              r = mR + (bR - mR) * u;
              g = mG + (bG - mG) * u;
              b = mB + (bB - mB) * u;
            }
            const effAlpha = alpha * (1 - lightFactor * 0.46) * anim.entranceMix;
            const grain = (hashNoise(px, py, grainTick) - 0.5) * 10 * alpha;
            data[ptr] = Math.max(0, Math.min(255, r + grain));
            data[ptr + 1] = Math.max(0, Math.min(255, g + grain));
            data[ptr + 2] = Math.max(0, Math.min(255, b + grain));
            data[ptr + 3] = Math.max(0, Math.min(255, Math.round(effAlpha * 255)));
          }
          ptr += 4;
        }
      }
      gradCtx.putImageData(gradImg, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(gradBuffer, 0, 0, width, height);

      ctx.imageSmoothingEnabled = false;
      const cols = Math.ceil(width / CELL_SIZE);
      const rows = Math.ceil(height / CELL_SIZE);
      const tick = reducedMotion.matches
        ? 0
        : Math.floor(now / (cur.busy ? 70 : 130));

      for (let gy = 0; gy < rows; gy++) {
        const yPos = gy * CELL_SIZE;
        const ny = (yPos + CELL_SIZE * 0.5) / height;

        for (let gx = 0; gx < cols; gx++) {
          const xPos = gx * CELL_SIZE;
          const nx = (xPos + CELL_SIZE * 0.5) / width;

          const [intensity, sMask] = sampleAt(nx, ny);
          const raw = intensity * sMask;

          if (raw < 0.08) continue;

          const staticNoise = hashNoise(gx, gy, 1);
          if (raw < (1 - DENSITY) * 0.8 * (1 - staticNoise * 0.7)) {
            continue;
          }

          const liveNoise = hashNoise(gx, gy, tick);
          const charIdx = Math.floor(
            Math.max(0, Math.min(0.999, raw + (liveNoise - 0.5) * 0.16)) *
              CHARS.length
          );
          const bucket = raw > 0.75 ? 2 : raw > 0.4 ? 1 : 0;

          const streamLift = anim.busyMix * 0.045;
          const gAlpha =
            (GLYPH_OPACITY + streamLift + tr * 0.1) * raw * anim.entranceMix;
          if (gAlpha < 0.01) continue;

          ctx.globalAlpha = Math.min(0.45, gAlpha);
          ctx.drawImage(
            atlas,
            charIdx * atlasCell,
            bucket * atlasCell,
            atlasCell,
            atlasCell,
            xPos,
            yPos,
            CELL_SIZE,
            CELL_SIZE
          );
        }
      }
      ctx.globalAlpha = 1;

      if (!document.hidden && !reducedMotion.matches) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    const scheduleFrame = () => {
      cancelAnimationFrame(rafId);
      if (!document.hidden) {
        lastTs = performance.now();
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    let resizeTimer = 0;
    const handleResize = (immediate = false) => {
      const applySize = () => {
        const rect = mainEl.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const nextW = Math.max(1, Math.floor(rect.width));
        const nextH = Math.max(1, Math.floor(rect.height));

        if (nextW === width && nextH === height) return;

        // Preserve existing rendered content so canvas never paints blank [0,0,0,0] during resize settle
        let preserved: HTMLCanvasElement | null = null;
        if (width > 1 && height > 1 && canvas.width > 0 && canvas.height > 0) {
          preserved = document.createElement("canvas");
          preserved.width = canvas.width;
          preserved.height = canvas.height;
          const pctx = preserved.getContext("2d");
          if (pctx) {
            pctx.drawImage(canvas, 0, 0);
          }
        }

        width = nextW;
        height = nextH;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (preserved) {
          ctx.drawImage(preserved, 0, 0, width, height);
        }

        gw = Math.max(140, Math.min(280, Math.floor(width / 4)));
        gh = Math.max(90, Math.min(190, Math.floor(height / 4)));
        gradBuffer.width = gw;
        gradBuffer.height = gh;
        gradImg = gradCtx.createImageData(gw, gh);
        anim.lastAtlasKey = "";

        scheduleFrame();
      };

      if (immediate || width <= 1) {
        applySize();
      } else {
        if (resizeTimer) clearTimeout(resizeTimer);
        // During 0.28s CSS layout transitions, let the GPU scale the canvas smoothly with zero CPU load
        resizeTimer = window.setTimeout(applySize, 120);
      }
    };

    const ro = new ResizeObserver(() => handleResize(false));
    ro.observe(mainEl);
    handleResize(true);

    repaintStaticRef.current = () => {
      if (!document.hidden) {
        scheduleFrame();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        scheduleFrame();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", scheduleFrame);
    scheduleFrame();

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      repaintStaticRef.current = null;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", scheduleFrame);
    };
  }, []);

  return (
    <motion.canvas
      ref={canvasRef}
      aria-hidden="true"
      className="main-lagoon-backdrop"
      initial={false}
      animate={{
        opacity: started ? 0 : 1,
      }}
      transition={{
        duration: 0.28,
        ease: EASE_MOMO,
      }}
    />
  );
}
