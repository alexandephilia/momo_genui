"use client";

import { useCallback, useEffect, useRef } from "react";
import { cubicBezier } from "motion/react";
import {
  DEFAULT_FACE_BY_LOOK,
  LOOK_POSES,
  MOOD_POSES,
  OUTFIT_INDICES,
  ROLE_PALETTES,
} from "@/data/looks";
import { hexToRgbTuple, resolvePaletteKey } from "@/lib/localBrain";
import type { ExpressionId, MoodId } from "@/types/momo";
import { getSharedVisorRenderer } from "./rendererSingleton";
import type { RgbTriplet } from "./visorRenderer";

// Keep shader scale (HERO_ZOOM) * DOM scale (1 / HERO_ZOOM) == 1.0 so Momo's screen
// size and center stay unchanged while offline hats tuck behind Momo cleanly.
const HERO_ZOOM = 0.8;
const HERO_BLEED = (1 / HERO_ZOOM - 1) * 0.5;

const EXPR_MAP: Record<ExpressionId, number> = {
  happy: 1,
  surprised: 5,
  dizzy: 6,
  sparkle: 7,
  wink: 8,
  sleepy: 9,
  sorry: 10,
  working: 11,
  speaking: 12,
  listening: 13,
};

interface ExprPreset {
  smile?: number;
  scale?: [number, number];
  lift?: number;
  brows: [number, number, number, number];
  lids?: [number, number];
  wink?: boolean;
  inMs: number;
  outMs: number;
}

const EXPR_PRESETS: Record<number, ExprPreset> = {
  1: { smile: 1, brows: [0.026, 0.026, 0.026, 0.026], inMs: 240, outMs: 320 },
  5: { scale: [1.27, 1.02], lift: 0.03, brows: [0.09, 0.11, 0.11, 0.09], inMs: 90, outMs: 340 },
  7: { scale: [1.11, 1.1], lift: 0.01, brows: [0.06, 0.066, 0.066, 0.06], inMs: 170, outMs: 300 },
  8: { lids: [1, 0], wink: true, scale: [1.1, 1.09], lift: 0.01, brows: [-0.016, -0.03, 0.07, 0.078], inMs: 190, outMs: 280 },
  10: { scale: [0.89, 0.88], lids: [0.08, 0.08], brows: [-0.004, 0.028, 0.028, -0.004], inMs: 120, outMs: 360 },
};

const stepSpring = (val: number, vel: number, target: number, k: number, c: number, dt: number): [number, number] => {
  if (!Number.isFinite(val) || !Number.isFinite(vel)) return [target, 0];
  const sub = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / sub;
  for (let s = 0; s < sub; s++) {
    vel += ((target - val) * k - vel * c) * h;
    val += vel * h;
  }
  return [val, vel];
};

const smoothstep = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeCubicDeriv = (t: number) => (t < 0.5 ? 12 * t * t : 3 * (2 - 2 * t) ** 2);
const overshootBack = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const flightEase = cubicBezier(0.22, 1, 0.36, 1);
const idleWave = (t: number) => Math.sin(t) * 0.5 + Math.sin(t * 2.31 + 1.3) * 0.3 + Math.sin(t * 4.07 + 2.1) * 0.2;

export interface StageSlotRefs {
  heroCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  slotBigRef: React.RefObject<HTMLDivElement | null>;
  slotPerchRef: React.RefObject<HTMLDivElement | null>;
  slotExploreRef?: React.RefObject<HTMLDivElement | null>;
  slotInputLeftRef: React.RefObject<HTMLDivElement | null>;
  composerRef: React.RefObject<HTMLDivElement | null>;
}

export interface StageStateInput {
  look: string;
  mood: MoodId;
  busy: boolean;
  offline: boolean;
  speaking: boolean;
  started: boolean;
  workspaceView?: "explore" | "chat" | "board";
  dark: boolean;
  paletteOverrides: Record<string, string>;
  onPerfText?: (txt: string) => void;
}

export function useMomoStage(refs: StageSlotRefs, state: StageStateInput) {
  const refsRef = useRef(refs);
  refsRef.current = refs;

  const latestRef = useRef(state);
  latestRef.current = state;

  const prevOverridesRef = useRef(state.paletteOverrides);

  const spinRef = useRef<{
    t: number;
    dur: number;
    next: string;
    swapped: boolean;
    reveal: number | null;
    landed: boolean;
    resolvers: Array<() => void>;
    queued: { look: string; resolvers: Array<() => void> } | null;
  } | null>(null);

  const mascotRef = useRef({
    look: state.look || "rest",
    mood: (state.mood || "neutral") as MoodId,
    focus: null as null | "think" | string,
    idea: 0,
    tipKick: 0,
    peekHold: 0,
    squash: 0,
    squashV: 0,
    lift: 0,
    liftV: 0,
    yaw: 0,
    yawV: 0,
    pitch: 0,
    pitchV: 0,
    roll: 0,
    rollV: 0,
    hatTilt: 0,
    hatV: 0,
    browOn: 0.78,
    wobble: 0,
    wiggle: 0,
    topple: 1,
    dead: state.offline ? 1 : 0,
    deadV: 0,
    deadTarget: state.offline ? 1 : 0,
    fall: state.offline ? 1 : 0,
    fallV: 0,
    fallTarget: state.offline ? 1 : 0,
    eye: [0, 0] as [number, number],
    eyeV: [0, 0] as [number, number],
    eyeTarget: [0, 0] as [number, number],
    eyeScale: [1, 1] as [number, number],
    brows: [0, 0, 0, 0] as [number, number, number, number],
    blink: 0,
    blinkT: -1,
    blinkDouble: false,
    doubleBlinkTimer: -1,
    nextBlink: 1.8,
    nextSaccade: 1.4,
    armL: 0.62,
    armLV: 0,
    armR: 0.62,
    armRV: 0,
    waveT: -1,
    nextWave: 3.5,
    tip: [0, 0, 1] as [number, number, number],
    tipV: [0, 0, 1] as [number, number, number],
    glassT: 0,
    glassY: 0,
    leaf: 0.5,
    glow: 0,
    sleepW: 0,
    exprSq: 0,
    exprSqV: 0,
    sorryEnv: 0,
    sorryT: 0,
    antSplay: 0,
    antSplayV: 0,
    antSway: 0,
    antSwayV: 0,
    antTwitch: [0, 0] as [number, number],
    antTwitchV: [0, 0] as [number, number],
    legs: [0, 0, 0, 0, 0, 0],
    legsV: [0, 0, 0, 0, 0, 0],
    colors: (
      ROLE_PALETTES[resolvePaletteKey(state.look, state.paletteOverrides)] ??
      ROLE_PALETTES.persimmon
    ).map(hexToRgbTuple) as [
      RgbTriplet,
      RgbTriplet,
      RgbTriplet,
      RgbTriplet,
    ],
    colorTarget: (
      ROLE_PALETTES[resolvePaletteKey(state.look, state.paletteOverrides)] ??
      ROLE_PALETTES.persimmon
    ).map(hexToRgbTuple) as [
      RgbTriplet,
      RgbTriplet,
      RgbTriplet,
      RgbTriplet,
    ],
  });

  const ptrRef = useRef({ x: 0, y: 0, hover: false, seen: false, poke: 0 });
  const ptrTrailRef = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const dizzyCooldownRef = useRef(0);
  const modeRef = useRef<{ mode: ExpressionId | null; until: number; hold: boolean }>({
    mode: null,
    until: 0,
    hold: false,
  });
  const faceSeqRef = useRef({
    shown: 0,
    cur: 0,
    k: 0,
    close: 0,
    sleep: 0,
    wake: -1,
    stretched: false,
  });
  const roleMotionRef = useRef({ peekIn: 3, peek: 0, lids: [0, 0] as [number, number], acted: "rest", since: 0 });
  const prevOfflineRef = useRef(state.offline);
  const offlineFallDelayRef = useRef(0);
  const stagePosRef = useRef({
    x: 0,
    y: 0,
    w: 0,
    vx: 0,
    vy: 0,
    vw: 0,
    started: false,
    slotEl: null as HTMLDivElement | null,
    flight: null as null | { sx: number; sy: number; sw: number; t: number; dur: number },
  });
  const timeRef = useRef({ rt: 0, lastActivity: 0 });

  const blink = useCallback((double = false) => {
    const m = mascotRef.current;
    if (m.blinkT < 0) {
      m.blinkT = 0;
      m.blinkDouble = double;
      m.doubleBlinkTimer = -1;
    }
  }, []);

  const triggerExpression = useCallback((mode: ExpressionId, durationMs = 1500, hold = false) => {
    timeRef.current.lastActivity = timeRef.current.rt;
    modeRef.current = {
      mode,
      until: timeRef.current.rt + durationMs / 1000,
      hold,
    };
  }, []);

  const wakeFromIdle = useCallback(() => {
    timeRef.current.lastActivity = timeRef.current.rt;
    if (modeRef.current.mode === "sleepy") {
      modeRef.current = { mode: null, until: 0, hold: false };
    }
  }, []);

  const syncColors = useCallback((look: string, overrides: Record<string, string>) => {
    const key = resolvePaletteKey(look, overrides);
    const pal = ROLE_PALETTES[key] ?? ROLE_PALETTES.persimmon;
    mascotRef.current.colorTarget = pal.map(hexToRgbTuple) as [RgbTriplet, RgbTriplet, RgbTriplet, RgbTriplet];
  }, []);

  const spinToLook = useCallback(
    (nextLook: string): Promise<void> =>
      new Promise((resolve) => {
        const sp = spinRef.current;
        if (sp && !sp.swapped) {
          sp.next = nextLook;
          sp.resolvers.push(resolve);
          return;
        }
        if (sp) {
          sp.queued = { look: nextLook, resolvers: [...(sp.queued?.resolvers || []), resolve] };
          return;
        }
        if (nextLook === mascotRef.current.look) {
          resolve();
          return;
        }
        mascotRef.current.squashV -= 2.2;
        blink(false);
        spinRef.current = {
          t: 0,
          dur: 0.92,
          next: nextLook,
          swapped: false,
          reveal: null,
          landed: false,
          resolvers: [resolve],
          queued: null,
        };
      }),
    [blink]
  );

  // Global pointer tracking for eye contact & poke detection
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const cv = refsRef.current.heroCanvasRef.current;
      if (!cv) return;
      wakeFromIdle();
      const r = cv.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / Math.max(120, r.width);
      const dy = -(e.clientY - cy) / Math.max(120, r.height);
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      ptrRef.current.x = clamp(dx, -1, 1);
      ptrRef.current.y = clamp(dy, -1, 1);
      ptrRef.current.seen = true;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      ptrRef.current.hover = dist < r.width * 0.42;

      // Dizzy trigger: frantic circular scribbling or rapid back-and-forth
      // shaking in a ~700ms window makes Momo see spirals.
      const trail = ptrTrailRef.current;
      const last = trail[trail.length - 1];
      if (!last || last.x !== e.clientX || last.y !== e.clientY) {
        trail.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      }
      while (trail.length > 2 && e.timeStamp - trail[0].t > 700) trail.shift();
      if (
        trail.length >= 8 &&
        e.timeStamp > dizzyCooldownRef.current &&
        mascotRef.current.dead <= 0.35
      ) {
        let mcx = 0;
        let mcy = 0;
        for (const p of trail) {
          mcx += p.x;
          mcy += p.y;
        }
        mcx /= trail.length;
        mcy /= trail.length;
        let path = 0;
        let rot = 0;
        let flips = 0;
        for (let i = 1; i < trail.length; i++) {
          const p = trail[i];
          const q = trail[i - 1];
          const sx = p.x - q.x;
          const sy = p.y - q.y;
          path += Math.hypot(sx, sy);
          if (i >= 2) {
            const px = q.x - trail[i - 2].x;
            const py = q.y - trail[i - 2].y;
            const dot = sx * px + sy * py;
            if (dot < -0.3 * Math.hypot(sx, sy) * Math.hypot(px, py)) flips += 1;
          }
          const ax = q.x - mcx;
          const ay = q.y - mcy;
          const bx = p.x - mcx;
          const by = p.y - mcy;
          if (ax * ax + ay * ay > 25 && bx * bx + by * by > 25) {
            let d = Math.atan2(by, bx) - Math.atan2(ay, ax);
            if (d > Math.PI) d -= 2 * Math.PI;
            if (d < -Math.PI) d += 2 * Math.PI;
            rot += d;
          }
        }
        if ((Math.abs(rot) > Math.PI * 2.8 && path > 700) || (flips >= 4 && path > 600)) {
          triggerExpression("dizzy", 2600);
          dizzyCooldownRef.current = e.timeStamp + 4500;
          trail.length = 0;
        }
      }
    };

    const onDown = (e: PointerEvent) => {
      const cv = refsRef.current.heroCanvasRef.current;
      if (!cv) return;
      wakeFromIdle();
      const r = cv.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) < r.width * 0.44) {
        const m = mascotRef.current;
        ptrRef.current.poke = 1;
        m.squashV -= 2.8;
        m.wobble = 0.85;
        m.idea = 0.45;
        if (m.dead > 0.35) {
          m.peekHold = 0.48;
          m.rollV -= 1.6;
          m.fallV -= 0.7;
        } else {
          blink(true);
          triggerExpression(Math.random() < 0.5 ? "happy" : "surprised", 950);
        }
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [blink, triggerExpression, wakeFromIdle]);

  // Continuous 60fps spring & WebGL frame loop
  const wakeLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const renderer = getSharedVisorRenderer();
    if (!renderer) return;

    let rafId = 0;
    let lastTs = performance.now();
    let perfStamp = 0;
    let lastPerfStr = "";
    let frameSize = 0;
    let cachedSlotRect: { left: number; top: number; width: number } | null = null;
    let slotRectDirty = true;
    let lastPerchStyleLeft = "";
    let sideSyncUntil = 0;
    let observedSlotEl: Element | null = null;
    let observedMainEl: Element | null = null;

    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    let reducedMotion = Boolean(mq?.matches);

    const markSlotDirty = () => {
      slotRectDirty = true;
    };

    const scheduleTick = () => {
      if (!rafId && document.visibilityState === "visible") {
        lastTs = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };
    wakeLoopRef.current = scheduleTick;

    const slotRo =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(markSlotDirty) : null;

    const tick = (now: number) => {
      rafId = 0;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const cur = latestRef.current;
      const m = mascotRef.current;
      const tr = timeRef.current;
      tr.rt += dt;

      ptrRef.current.poke = Math.max(0, ptrRef.current.poke - dt * 1.4);

      if (renderer.info.lost) {
        const lostMsg = "WebGL context reset. Restoring 3D mascot...";
        if (cur.onPerfText && now - perfStamp > 600 && lastPerfStr !== lostMsg) {
          perfStamp = now;
          lastPerfStr = lostMsg;
          cur.onPerfText(lostMsg);
        }
        if (document.visibilityState === "visible") {
          rafId = requestAnimationFrame(tick);
        }
        return;
      }

      // Sync React state targets directly inside RAF loop + reactive offline impact physics
      if (cur.offline !== prevOfflineRef.current) {
        prevOfflineRef.current = cur.offline;
        if (cur.offline) {
          offlineFallDelayRef.current = 0.16;
          m.squashV -= 5.4;
          m.rollV -= 4.2;
          m.yawV += 1.8;
          m.liftV -= 2.2;
          m.hatV += 7.5;
          m.wobble = 0.92;
          m.wiggle = 0.7;
          m.tipKick = 0.25;
        } else {
          offlineFallDelayRef.current = 0;
          m.squashV -= 3.6;
          m.liftV += 2.8;
          m.hatV -= 5.2;
          blink(false);
          triggerExpression("sparkle", 850);
        }
      }
      if (offlineFallDelayRef.current > 0) {
        offlineFallDelayRef.current = Math.max(0, offlineFallDelayRef.current - dt);
      }
      m.mood = cur.mood;
      m.deadTarget = cur.offline ? 1 : 0;
      m.fallTarget = cur.offline && offlineFallDelayRef.current <= 0 ? 1 : 0;
      if (prevOverridesRef.current !== cur.paletteOverrides) {
        prevOverridesRef.current = cur.paletteOverrides;
        syncColors(m.look, cur.paletteOverrides);
      }
      if (
        cur.look &&
        cur.look !== m.look &&
        cur.look !== spinRef.current?.next &&
        cur.look !== spinRef.current?.queued?.look
      ) {
        void spinToLook(cur.look).then(() => {
          if (latestRef.current.look === "builder" && mascotRef.current.look === "builder") {
            mascotRef.current.squashV -= 4.2;
          }
        });
      }

      // 1. Target slot rect (fly seamlessly between #slotBig, #slotExplore, and #slotPerch on Crest)
      const slotRefs = refsRef.current;
      const activeSlot =
        cur.workspaceView === "explore"
          ? cur.started
            ? slotRefs.slotPerchRef.current
            : slotRefs.slotExploreRef?.current ?? slotRefs.slotPerchRef.current
          : cur.started || cur.workspaceView === "board"
            ? slotRefs.slotPerchRef.current
            : slotRefs.slotBigRef.current;

      if (slotRo && activeSlot && activeSlot !== observedSlotEl) {
        observedSlotEl = activeSlot;
        slotRo.observe(activeSlot);
        const mainEl = activeSlot.closest(".main");
        if (mainEl && mainEl !== observedMainEl) {
          observedMainEl = mainEl;
          slotRo.observe(mainEl);
        }
        slotRectDirty = true;
      }
      if (now < sideSyncUntil) {
        slotRectDirty = true;
      }

      const spPos = stagePosRef.current;
      const canvasEl = slotRefs.heroCanvasRef.current;

      const curPerchLeft =
        activeSlot === slotRefs.slotPerchRef.current ? activeSlot?.style.left || "" : "";
      if (curPerchLeft !== lastPerchStyleLeft) {
        lastPerchStyleLeft = curPerchLeft;
        slotRectDirty = true;
      }

      if (
        activeSlot &&
        (slotRectDirty || spPos.slotEl !== activeSlot || !cachedSlotRect)
      ) {
        const r = activeSlot.getBoundingClientRect();
        let dx = 0;
        let dy = 0;
        const stageEl = activeSlot.closest(".momo-workspace-stage");
        if (stageEl) {
          const tr = getComputedStyle(stageEl).transform;
          if (tr && tr !== "none") {
            const mat = new DOMMatrixReadOnly(tr);
            dx += mat.m41;
            dy += mat.m42;
          }
        }
        const dockEl = activeSlot.closest(".dock");
        if (dockEl) {
          const tr = getComputedStyle(dockEl).transform;
          if (tr && tr !== "none") {
            const mat = new DOMMatrixReadOnly(tr);
            dx += mat.m41;
            dy += mat.m42;
          }
        }
        cachedSlotRect = { left: r.left - dx, top: r.top - dy, width: r.width };
        slotRectDirty = false;
      }
      const slotRect = activeSlot ? cachedSlotRect : null;

      if (slotRect && slotRect.width > 0 && canvasEl) {
        const tgtX = slotRect.left;
        const tgtY = slotRect.top;
        const tgtW = slotRect.width;

        if (!spPos.w || reducedMotion) {
          spPos.x = tgtX;
          spPos.y = tgtY;
          spPos.w = tgtW;
          spPos.vx = spPos.vy = spPos.vw = 0;
          spPos.flight = null;
          spPos.started = cur.started;
          spPos.slotEl = activeSlot;
        } else {
          if (spPos.started !== cur.started || spPos.slotEl !== activeSlot) {
            spPos.started = cur.started;
            spPos.slotEl = activeSlot;
            spPos.flight = { sx: spPos.x, sy: spPos.y, sw: spPos.w, t: 0, dur: 0.38 };
            spPos.vx = spPos.vy = spPos.vw = 0;
          }
          if (spPos.flight) {
            spPos.flight.t += dt;
            const u = Math.min(1, spPos.flight.t / spPos.flight.dur);
            const p = flightEase(u);
            spPos.x = spPos.flight.sx + (tgtX - spPos.flight.sx) * p;
            spPos.y = spPos.flight.sy + (tgtY - spPos.flight.sy) * p - Math.sin(Math.PI * p) * 10;
            spPos.w = spPos.flight.sw + (tgtW - spPos.flight.sw) * p;
            if (u >= 1) spPos.flight = null;
          } else if (activeSlot === slotRefs.slotPerchRef.current && now >= sideSyncUntil) {
            spPos.x = tgtX;
            spPos.y = tgtY;
            spPos.w = tgtW;
            spPos.vx = 0;
            spPos.vy = 0;
            spPos.vw = 0;
          } else {
            [spPos.x, spPos.vx] = stepSpring(spPos.x, spPos.vx, tgtX, 260, 32.2, dt);
            [spPos.y, spPos.vy] = stepSpring(spPos.y, spPos.vy, tgtY, 260, 32.2, dt);
            [spPos.w, spPos.vw] = stepSpring(spPos.w, spPos.vw, tgtW, 260, 32.2, dt);
          }
        }

        const baseSize = 268;
        canvasEl.style.transform = `translate(${spPos.x - spPos.w * HERO_BLEED}px, ${spPos.y - spPos.w * HERO_BLEED}px) scale(${spPos.w / baseSize / HERO_ZOOM})`;
      }

      // 2. Brows, eyes, blink, colors
      const lookPose = LOOK_POSES[m.look];
      const ptrW = m.dead <= 0.35 && !spinRef.current && ptrRef.current.seen ? 1 : 0;
      const moodPose = MOOD_POSES[m.mood] ?? MOOD_POSES.neutral;
      const kLerp = 1 - Math.exp(-dt * 7);
      const bpY = ptrRef.current.y * 0.026 * ptrW;
      const bpX = ptrRef.current.x * 0.022 * ptrW;
      const bpH = ptrW && ptrRef.current.hover ? 0.012 : 0;
      const bpT = [
        bpY + bpH + (bpX < 0 ? -bpX : -0.25 * bpX),
        bpY + bpH + (bpX < 0 ? -0.55 * bpX : 0.15 * bpX),
        bpY + bpH + (bpX > 0 ? 0.55 * bpX : -0.15 * bpX),
        bpY + bpH + (bpX > 0 ? bpX : 0.25 * bpX),
      ];
      const lookBrows = lookPose?.brows ?? [0, 0, 0, 0];
      for (let idx = 0; idx < 4; idx++) {
        m.brows[idx] += (moodPose.brows[idx] + lookBrows[idx] + bpT[idx] - m.brows[idx]) * kLerp;
      }
      for (let idx = 0; idx < 2; idx++) {
        m.eyeScale[idx] += (moodPose.eye[idx] - m.eyeScale[idx]) * kLerp;
      }

      const rm = roleMotionRef.current;
      const activeRole = m.dead > 0.35 ? "dead" : m.look;
      if (activeRole !== rm.acted) {
        rm.acted = activeRole;
        rm.since = 0;
      }
      rm.since += dt;
      const roleMotion = {
        eye: lookPose?.look ? ([lookPose.look[0], lookPose.look[1]] as [number, number]) : (null as [number, number] | null),
        roll: lookPose?.roll ?? 0,
        squash: 0,
        lids: [0, 0] as [number, number],
        peek: false,
      };
      if (!spinRef.current && m.focus == null) {
        const a = rm.since;
        if (activeRole === "cook") {
          roleMotion.roll += Math.sin(a * 2 * Math.PI * 0.55) * 0.04;
          roleMotion.squash = Math.max(0, Math.sin(a * 2 * Math.PI * 1.1)) * 0.1;
        } else if (activeRole === "traveller") {
          const step = Math.sin(a * 2.6);
          roleMotion.squash = Math.abs(step) * 0.15 - 0.05;
          roleMotion.roll += Math.sin(a * 1.3) * 0.045;
          roleMotion.eye = [Math.sin(a * 0.75) * 0.045, 0.02 + Math.sin(a * 1.5) * 0.015];
        } else if (activeRole === "investigate") {
          const s = Math.sin(a * 0.85);
          roleMotion.eye = [s * 0.055, -0.012 + Math.max(0, Math.sin(a * 0.43)) * 0.02];
          roleMotion.roll = 0.035 + s * 0.02;
          roleMotion.squash = 0.12;
        } else if (activeRole === "music") {
          roleMotion.squash = Math.sin(a * 2 * Math.PI * 1.55) * 0.13;
          roleMotion.roll += Math.sin(a * 2 * Math.PI * 0.78) * 0.03;
        } else if (activeRole === "coach") {
          roleMotion.squash = Math.abs(Math.sin(a * 2 * Math.PI * 1.1)) * 0.16 - 0.04;
          roleMotion.roll += Math.sin(a * 2 * Math.PI * 0.55) * 0.025;
        } else if (activeRole === "guard") {
          roleMotion.eye = [Math.sin(a * 0.65) * 0.035, 0];
          roleMotion.roll += Math.sin(a * 0.65) * 0.012;
        } else if (activeRole === "bug") {
          roleMotion.eye = [Math.sin(a * 1.4) * 0.04, Math.cos(a * 0.9) * 0.015];
          roleMotion.squash = Math.max(0, Math.sin(a * 2.8)) * 0.06;
        } else if (activeRole === "designer") {
          roleMotion.roll += Math.sin(a * 1.1) * 0.025;
        } else if (activeRole === "garden") {
          roleMotion.roll += Math.sin(a * 0.8) * 0.03;
        } else if (activeRole === "dead") {
          rm.peekIn -= dt;
          if (rm.peekIn < 0) {
            rm.peek = 0.55;
            rm.peekIn = 3 + Math.random() * 2.5;
          }
          rm.peek = Math.max(0, rm.peek - dt);
          roleMotion.peek = rm.peek > 0 && m.dead > 0.9;
        }
      }

      const eyeFocus: [number, number] | null =
        m.focus === "think"
          ? [-0.045, 0.055]
          : m.dead <= 0.35 && !spinRef.current && ptrRef.current.seen
            ? [ptrRef.current.x * 0.115, ptrRef.current.y * 0.125]
            : roleMotion.eye;

      if (eyeFocus) {
        m.eyeTarget = eyeFocus;
      } else {
        m.nextSaccade -= dt;
        if (m.nextSaccade < 0) {
          const r = Math.random();
          m.eyeTarget =
            r < 0.5
              ? [(Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.014]
              : r < 0.85
                ? [(Math.random() - 0.5) * 0.09, (Math.random() - 0.35) * 0.04]
                : [0.04, 0.03];
          m.nextSaccade = 0.8 + Math.random() * 2.6;
        }
      }

      const jitter: [number, number] = [idleWave(tr.rt * 3.1) * 0.0025, idleWave(tr.rt * 2.7 + 7) * 0.002];
      [m.eye[0], m.eyeV[0]] = stepSpring(m.eye[0], m.eyeV[0], m.eyeTarget[0] + jitter[0], 700, 46, dt);
      [m.eye[1], m.eyeV[1]] = stepSpring(m.eye[1], m.eyeV[1], m.eyeTarget[1] + jitter[1], 700, 46, dt);

      m.nextBlink -= dt;
      if (faceSeqRef.current.shown === 9) m.nextBlink = Math.max(m.nextBlink, 0.6);
      if (m.nextBlink < 0) {
        blink(Math.random() < 0.18);
        m.nextBlink = 2.4 + Math.random() * 3.6;
      }
      if (m.doubleBlinkTimer >= 0) {
        m.doubleBlinkTimer -= dt;
        if (m.doubleBlinkTimer <= 0) {
          m.doubleBlinkTimer = -1;
          blink(false);
        }
      }
      if (m.blinkT >= 0) {
        m.blinkT += dt;
        const bt = m.blinkT;
        m.blink = bt < 0.07 ? (bt / 0.07) ** 2 : bt < 0.1 ? 1 : bt < 0.24 ? 1 - ((bt - 0.1) / 0.14) ** 0.7 : 0;
        if (bt >= 0.24) {
          m.blink = 0;
          m.blinkT = -1;
          if (m.blinkDouble) {
            m.blinkDouble = false;
            m.doubleBlinkTimer = 0.09;
          }
        }
      }

      [m.squash, m.squashV] = stepSpring(m.squash, m.squashV, 0, 170, 11, dt);
      [m.dead, m.deadV] = stepSpring(m.dead, m.deadV, m.deadTarget, 70, 9, dt);
      [m.lift, m.liftV] = stepSpring(m.lift, m.liftV, 0, 120, 12, dt);
      m.dead = Math.max(0, Math.min(1.08, m.dead));

      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          m.colors[r][c] += (m.colorTarget[r][c] - m.colors[r][c]) * (1 - Math.exp(-dt * 5));
        }
      }

      // Spin state machine
      let spinYaw = 0;
      let spinVel = 0;
      if (spinRef.current) {
        const sp = spinRef.current;
        sp.t += dt / sp.dur;
        const u = Math.min(1, sp.t);
        spinYaw = u < 1 ? easeCubic(u) * Math.PI * 2 : 0;
        spinVel = u < 1 ? (easeCubicDeriv(u) * Math.PI * 2) / sp.dur : 0;
        if (!sp.swapped && u >= 0.5) {
          sp.swapped = true;
          const prevCols = m.colors;
          m.look = sp.next;
          syncColors(sp.next, cur.paletteOverrides);
          if (sp.next === "bug") {
            m.colors = prevCols;
            m.liftV += 2.2;
            sp.reveal = 0;
          }
        }
        if (sp.reveal != null) sp.reveal += dt;
        if (u >= 1 && !sp.landed) {
          sp.landed = true;
          m.squashV -= 2.4;
          if (sp.reveal != null) {
            triggerExpression("surprised", 700);
            m.antSplayV += 4;
            for (let j = 0; j < 6; j++) m.legsV[j] += 2.5;
          }
        }
        const revealPending = sp.reveal != null && sp.reveal < 1.05;
        if (u >= 1 && !revealPending) {
          spinRef.current = null;
          sp.resolvers.forEach((r) => r());
          if (sp.queued && sp.queued.look !== m.look) {
            m.squashV -= 2.2;
            spinRef.current = {
              t: 0,
              dur: sp.dur,
              next: sp.queued.look,
              swapped: false,
              reveal: null,
              landed: false,
              resolvers: sp.queued.resolvers,
              queued: null,
            };
          } else {
            sp.queued?.resolvers.forEach((r) => r());
          }
        }
      }

      // Idle sleepy trigger
      if (!cur.busy && !cur.offline && !modeRef.current.mode && tr.rt - tr.lastActivity > 25) {
        triggerExpression("sleepy", 0, true);
      }

      const activeExpr = modeRef.current.mode && (modeRef.current.hold || tr.rt < modeRef.current.until);
      if (!activeExpr) modeRef.current.mode = null;
      const exprKey = activeExpr ? modeRef.current.mode! : null;
      const isWork = !activeExpr && cur.busy && m.focus !== "think";
      const targetFace =
        exprKey != null
          ? EXPR_MAP[exprKey]
          : m.dead > 0.35
            ? 4
            : cur.speaking
              ? 12
              : isWork
                ? 11
                : m.mood === "listening"
                  ? 13
                  : DEFAULT_FACE_BY_LOOK[m.look] ?? 0;

      // Face sequencer (sleep wake / swap smooth)
      const fs = faceSeqRef.current;
      const mvFade = (v: number, dst: number, dur: number) => {
        const step = (dt * 1000) / dur;
        return v < dst ? Math.min(dst, v + step) : Math.max(dst, v - step);
      };
      if (fs.wake >= 0) {
        fs.wake += dt / 1.3;
        const w = Math.min(1, fs.wake);
        fs.close = w < 0.1 ? 1 : w < 0.28 ? 1 - 0.45 * Math.sin(((w - 0.1) / 0.18) * Math.PI * 0.5) : w < 0.65 ? 0.55 + 0.45 * smoothstep((w - 0.58) / 0.07) : 1 - Math.sin(Math.min(1, (w - 0.65) / 0.35) * Math.PI * 0.5);
        if (!fs.stretched && fs.wake >= 0.65) {
          fs.stretched = true;
          m.squashV -= 2.6;
          m.liftV += 1.4;
        }
        if (fs.wake >= 1) {
          fs.wake = -1;
          fs.close = 0;
        }
      } else if (fs.shown === 9 && targetFace !== 9) {
        fs.shown = 0;
        fs.k = 0;
        fs.close = 1;
        fs.sleep = 0;
        fs.wake = 0;
        fs.stretched = false;
      } else if (targetFace === 9 && fs.shown === 0) {
        if (fs.k > 0) {
          fs.k = mvFade(fs.k, 0, EXPR_PRESETS[fs.cur]?.outMs || 300);
        } else {
          fs.sleep = Math.min(1, fs.sleep + dt / 2.4);
          fs.close = smoothstep(fs.sleep);
          if (fs.sleep >= 1) {
            fs.shown = 9;
            fs.close = 0;
          }
        }
      } else {
        if (targetFace !== 9) fs.sleep = 0;
        if (fs.shown !== 0 && fs.shown !== targetFace) {
          if (EXPR_PRESETS[fs.shown]) {
            fs.cur = fs.shown;
            fs.k = 1;
            fs.shown = 0;
          } else {
            fs.close = mvFade(fs.close, 1, 85);
            if (fs.close >= 1) fs.shown = 0;
          }
        } else if (fs.shown === 0 && fs.cur !== 0 && !EXPR_PRESETS[targetFace]) {
          fs.k = mvFade(fs.k, 0, EXPR_PRESETS[fs.cur]?.outMs || 300);
          if (fs.k <= 0) fs.cur = 0;
        } else if (fs.shown === 0 && targetFace !== 0) {
          if (EXPR_PRESETS[targetFace]) {
            if (fs.cur !== targetFace && fs.k > 0) {
              fs.k = mvFade(fs.k, 0, EXPR_PRESETS[fs.cur]?.outMs || 300);
              if (fs.k <= 0) fs.cur = 0;
            } else {
              fs.cur = targetFace;
              fs.k = mvFade(fs.k, 1, EXPR_PRESETS[targetFace].inMs);
              if (fs.k >= 1) {
                fs.shown = targetFace;
                fs.cur = 0;
                fs.k = 0;
              }
            }
          } else {
            fs.close = 1;
            fs.shown = targetFace;
          }
        } else if (fs.close > 0) {
          fs.close = mvFade(fs.close, 0, 140);
        }
      }

      // Compute preset overlay ONLY during transition-in so active face modes never double-stack offsets
      const pWeight = fs.shown === 0 ? fs.k : 0;
      const pId = pWeight > 0 ? fs.cur : 0;
      const preset = EXPR_PRESETS[pId];
      const qOverlay = {
        smile: (preset?.smile || 0) * pWeight,
        sleepy: fs.shown === 9 ? 1 : fs.sleep * 0.65,
        wink: preset?.wink ? pWeight : 0,
        lift: (preset?.lift || 0) * pWeight,
        scale: [1 + ((preset?.scale?.[0] || 1) - 1) * pWeight, 1 + ((preset?.scale?.[1] || 1) - 1) * pWeight] as [
          number,
          number,
        ],
        lids: [(preset?.lids?.[0] || 0) * pWeight, (preset?.lids?.[1] || 0) * pWeight] as [number, number],
        brows: (preset?.brows || [0, 0, 0, 0]).map((v) => v * pWeight),
      };

      const prevYaw = m.yaw;
      const tgtYaw = idleWave(tr.rt * 0.35) * 0.04 + m.eye[0] * 0.45 + ptrRef.current.x * 0.04 * ptrW + (lookPose?.yaw || 0);
      [m.yaw, m.yawV] = stepSpring(m.yaw, m.yawV, tgtYaw, 60, 14, dt);

      const isSorry =
        m.dead <= 0.35 && ((activeExpr && exprKey === "sorry") || fs.shown === 10 || (fs.cur === 10 && fs.k > 0.05));
      m.sorryEnv += ((isSorry ? 1 : 0) - m.sorryEnv) * (1 - Math.exp(-dt * (isSorry ? 7 : 5)));
      m.sorryT = isSorry ? m.sorryT + dt : m.sorryEnv > 0.02 ? m.sorryT : 0;
      const nodWave = 0.5 - 0.5 * Math.cos(Math.min(m.sorryT, 2.24) * 5.6);
      const tgtPitch =
        idleWave(tr.rt * 0.31 + 1.7) * 0.02 +
        m.eye[1] * 0.38 +
        ptrRef.current.y * 0.03 * ptrW +
        (-0.09 - 0.16 * nodWave) * m.sorryEnv;
      [m.pitch, m.pitchV] = stepSpring(m.pitch, m.pitchV, tgtPitch, 65, 13, dt);

      m.browOn += ((m.dead > 0.35 ? 0 : ptrW || m.mood !== "neutral" ? 1 : 0.78) - m.browOn) * (1 - Math.exp(-dt * 8));
      m.wobble = Math.max(0, m.wobble - dt * 1.2);
      m.wiggle = Math.max(0, m.wiggle - dt * 1.6);

      // Arms
      let armL = m.look === "traveller" ? 0.64 + Math.sin(tr.rt * 2.6) * 0.18 : m.look === "designer" ? 1.05 + Math.sin(tr.rt * 2.1) * 0.12 : 0.62 + Math.sin(tr.rt * 1.6) * 0.07;
      let armR = m.look === "traveller" ? 0.64 - Math.sin(tr.rt * 2.6) * 0.18 : 0.62 + Math.sin(tr.rt * 1.6 + 1.3) * 0.07;

      if (m.dead <= 0.35 && !cur.busy && !activeExpr && !cur.speaking && !spinRef.current && m.mood === "neutral") {
        m.nextWave -= dt;
        if (m.nextWave <= 0 && m.waveT < 0) {
          m.waveT = 0;
          m.nextWave = 4.5 + Math.random() * 3.5;
        }
      } else if (activeExpr || cur.busy || cur.speaking) {
        m.waveT = -1;
      }
      if (m.waveT >= 0) {
        m.waveT += dt;
        const wEnv = Math.sin(Math.PI * Math.min(m.waveT / 1.7, 1));
        armR += wEnv * (1.85 - armR) + Math.sin(m.waveT * 11) * 0.28 * wEnv;
        if (m.waveT > 1.7) m.waveT = -1;
      }

      if (m.dead > 0.35) armL = armR = 0.48;
      else if (exprKey === "working" || isWork) {
        armL = 0.78 + Math.sin(tr.rt * 12) * 0.36;
        armR = 0.78 - Math.sin(tr.rt * 12) * 0.36;
      } else if (exprKey === "speaking" || cur.speaking) {
        armL = 0.58 + Math.sin(tr.rt * 2.4) * 0.08;
        armR = 1.08 + Math.sin(tr.rt * 5.2) * 0.44;
      } else if (exprKey === "happy" || exprKey === "sparkle") {
        armL = 1.88 + Math.sin(tr.rt * 8) * 0.22;
        armR = 1.88 - Math.sin(tr.rt * 8) * 0.22;
      } else if (exprKey === "surprised") {
        armL = armR = 1.95;
      } else if (exprKey === "wink") {
        armR = 1.85 + Math.sin(tr.rt * 6.5) * 0.24;
      } else if (exprKey === "sleepy" || exprKey === "dizzy") {
        armL = armR = 0.5;
      } else if (exprKey === "listening" || m.mood === "listening") {
        armL = 2.05 + Math.sin(tr.rt * 3) * 0.08;
      } else if (m.mood === "thinking") {
        armR = 1.55 + Math.sin(tr.rt * 2.2) * 0.14;
      }
      if (m.look === "designer") armL = Math.min(armL, 1.45);
      if (m.look === "director") armR = Math.min(armR, 0.75);
      if (m.look === "guard") armL = Math.min(armL, 0.75);
      [m.armL, m.armLV] = stepSpring(m.armL, m.armLV, armL, 260, 26, dt);
      [m.armR, m.armRV] = stepSpring(m.armR, m.armRV, armR, 260, 26, dt);

      // Roll, hat, tip, glasses, glow, legs, antennae
      m.sleepW += ((fs.shown === 9 ? 1 : fs.sleep) - m.sleepW) * (1 - Math.exp(-dt * 1.6));
      [m.exprSq, m.exprSqV] = stepSpring(m.exprSq, m.exprSqV, exprKey === "surprised" ? -0.55 : 0, 320, 20, dt);

      const tgtRoll =
        idleWave(tr.rt * 0.27 + 3) * 0.018 +
        (moodPose.roll + roleMotion.roll * (1 - ptrW * 0.65)) * (1 - Math.min(1, m.dead)) +
        (exprKey === "wink" ? 0.09 : 0) +
        0.045 * m.sorryEnv +
        m.wobble * Math.sin(tr.rt * 11) * 0.14 +
        m.wiggle * Math.sin(tr.rt * 22) * 0.06 +
        m.topple * Math.min(1, m.dead) * 0.2 +
        (exprKey === "sleepy" ? 0.06 : 0) -
        ptrRef.current.x * 0.016 * ptrW;
      [m.roll, m.rollV] = stepSpring(m.roll, m.rollV, tgtRoll, 50, 11, dt);

      const yawRate = (m.yaw - prevYaw) / Math.max(dt, 0.001);
      [m.hatTilt, m.hatV] = stepSpring(m.hatTilt, m.hatV, -m.roll * 0.75 - m.squashV * 0.018 + yawRate * 0.032, 95, 6.5, dt);

      m.idea = Math.max(0, m.idea - dt);
      m.tipKick = Math.max(0, m.tipKick - dt);
      m.peekHold = Math.max(0, m.peekHold - dt);

      const baseTip = lookPose?.tip || [0, 0, 1];
      let nextTip = [...baseTip] as [number, number, number];
      if (m.deadTarget > 0.5 && m.tipKick <= 0) nextTip = [1.2, 0.25, 0.86];
      else if (spinRef.current) nextTip = [...baseTip] as [number, number, number];
      else if (exprKey === "surprised") nextTip = [-0.25 + Math.sin(tr.rt * 42) * 0.03, 0, Math.max(baseTip[2], 1.1)];
      else if (m.idea > 0) nextTip = [-0.25, 0, Math.max(baseTip[2], 1.06)];
      else if (exprKey === "sleepy") nextTip = [baseTip[0] + 0.32, 0.14, baseTip[2] * 0.95];
      else if (m.mood === "listening") nextTip = [baseTip[0] + 0.14, 0.06, baseTip[2]];
      else if (m.mood === "thinking") nextTip = [baseTip[0] - 0.16, 0.18, baseTip[2] * 0.97];
      else if (m.mood === "unsure") nextTip = [baseTip[0] - 0.2, 0, baseTip[2]];
      if (lookPose?.tip) nextTip[2] = Math.min(nextTip[2], baseTip[2]);

      const tipOmega = m.deadTarget > 0.5 ? 4.2 : 7.5;
      for (let idx = 0; idx < 3; idx++) {
        [m.tip[idx], m.tipV[idx]] = stepSpring(m.tip[idx], m.tipV[idx], nextTip[idx], tipOmega * tipOmega, 2 * tipOmega, dt);
      }

      [m.fall, m.fallV] = stepSpring(m.fall, m.fallV, m.fallTarget, m.fallTarget ? 68 : 150, m.fallTarget ? 9.5 : 16, dt);
      m.fall = clamp01(m.fall);

      const isDead = m.dead > 0.35;
      if (m.look === "designer" && !isDead) {
        m.glassT += dt;
        m.glassY = Math.min(0.045, m.glassT * 0.006);
        if (m.glassT > 8) {
          m.glassT = 0;
          m.squashV -= 2.2;
          blink(false);
        }
      } else {
        m.glassY += (0 - m.glassY) * (1 - Math.exp(-dt * 8));
        m.glassT = 0;
      }

      const leafTgt = m.deadTarget > 0.5 ? -0.6 : cur.busy ? 1 : lookPose?.leaf ?? 0.5;
      m.leaf += (leafTgt - m.leaf) * (1 - Math.exp(-dt * 4));
      m.glow += ((m.idea > 0 || exprKey === "sparkle" ? 1 : 0) - m.glow) * (1 - Math.exp(-dt * (m.idea > 0 ? 10 : 2.5)));

      const breath =
        m.dead > 0.3 || reducedMotion
          ? 0
          : Math.sin((tr.rt * 2 * Math.PI) / 5.2) * 0.3 * m.sleepW + Math.sin((tr.rt * 2 * Math.PI) / 3.8) * 0.16 * (1 - m.sleepW);

      const rev = spinRef.current?.reveal;
      const bugVal = rev == null ? 1 : clamp01((rev - 0.08) / 0.8);
      const antPop = rev == null ? 1 : overshootBack(clamp01((rev - 0.3) / 0.34));
      const squashVal = reducedMotion
        ? 0
        : m.squash +
          breath +
          roleMotion.squash +
          m.exprSq +
          (exprKey === "working" || isWork ? Math.sin(tr.rt * 7) * 0.025 : 0) +
          (0.045 + 0.045 * nodWave) * m.sorryEnv;

      [m.antSplay, m.antSplayV] = stepSpring(m.antSplay, m.antSplayV, Math.min(0.32, spinVel * 0.02) + Math.min(1, m.dead) * 0.6 + squashVal * 0.25, 220, 4.5, dt);
      [m.antSway, m.antSwayV] = stepSpring(m.antSway, m.antSwayV, m.rollV * 0.25, 90, 6, dt);
      for (let idx = 0; idx < 2; idx++) {
        [m.antTwitch[idx], m.antTwitchV[idx]] = stepSpring(m.antTwitch[idx], m.antTwitchV[idx], 0, 260, 8, dt);
      }
      if (m.look === "bug" && !spinRef.current && !isDead && Math.random() < dt * 0.4) {
        const s = Math.random() < 0.5 ? 0 : 1;
        m.antTwitchV[s] += 4.5;
      }
      for (let idx = 0; idx < 6; idx++) {
        const legTgt = isDead ? 0.7 + Math.sin(tr.rt * 6 + idx * 1.7) * 0.06 : 0;
        [m.legs[idx], m.legsV[idx]] = stepSpring(m.legs[idx], m.legsV[idx], legTgt, 320, 16, dt);
      }

      // 3. Draw into hero Canvas 2D or WebGL target
      // Scale backing resolution proportionally so HERO_ZOOM bleed keeps Retina crispness on Home hero
      const dpr = Math.min(2.25, Math.max(1, window.devicePixelRatio || 1));
      const desiredSize = Math.max(
        48,
        Math.min(640, Math.round(Math.max(220, slotRect?.width || 220, spPos.w || 220) * dpr))
      );
      if (!frameSize || (!spPos.flight && (frameSize < desiredSize * 0.98 || frameSize > desiredSize * 1.45))) {
        frameSize = desiredSize;
      }

      if (canvasEl) {
        if (canvasEl.width !== frameSize || canvasEl.height !== frameSize) {
          canvasEl.width = frameSize;
          canvasEl.height = frameSize;
        }
        renderer.draw(canvasEl, frameSize, {
          zoom: HERO_ZOOM,
          outfit: OUTFIT_INDICES[m.look] ?? 0,
          face: fs.shown,
          speaking: cur.speaking || exprKey === "speaking",
          working: exprKey === "working" || isWork,
          armL: m.armL,
          armR: m.armR,
          smile: qOverlay.smile,
          sleepy: qOverlay.sleepy,
          wink: qOverlay.wink,
          tip: m.tip,
          fall: m.fall,
          glow: m.glow,
          glassY: m.glassY,
          leaf: m.leaf,
          colors: m.colors,
          yaw: spinYaw + m.yaw,
          pitch: m.pitch,
          roll: m.roll,
          squash: squashVal,
          bug: bugVal,
          legL: m.legs.slice(0, 3),
          legR: m.legs.slice(3),
          ant: [antPop, m.antSplay + m.antSway + m.antTwitch[0], -m.antSplay + m.antSway - m.antTwitch[1]],
          dead: Math.min(1, m.dead),
          blink: Math.max(isDead ? 0 : m.blink, fs.close),
          look: isDead ? [0, 0] : [m.eye[0], m.eye[1] + qOverlay.lift],
          lift: (m.lift - 0.45 * nodWave * m.sorryEnv) * 0.06,
          lids: [Math.max(roleMotion.lids[0], qOverlay.lids[0]), Math.max(roleMotion.lids[1], qOverlay.lids[1])],
          peek: roleMotion.peek || m.peekHold > 0,
          brows: m.brows.map((v, idx) => v + qOverlay.brows[idx]),
          eyeScale: [
            m.eyeScale[0] * (lookPose?.eyeScale?.[0] ?? 1) * qOverlay.scale[0],
            m.eyeScale[1] * (lookPose?.eyeScale?.[1] ?? 1) * qOverlay.scale[1],
          ],
          hatTilt: m.hatTilt,
          browOn: m.browOn,
          restMouth: true,
          darkFloor:
            (typeof document !== "undefined"
              ? document.documentElement.dataset.theme === "dark"
              : cur.dark)
              ? 1
              : 0,
          small: 0,
          fuzz: 1,
          hover: ptrRef.current.hover ? 1 : 0,
          poke: ptrRef.current.poke,
          time: tr.rt,
        });
      }

      if (cur.onPerfText && now - perfStamp > 600) {
        perfStamp = now;
        const fps = reducedMotion ? 0 : Math.round(1 / Math.max(0.008, dt));
        const nextPerf = `${renderer.info.gpu.replace(/^ANGLE \(|\)$/g, "").split(",").slice(0, 2).join(", ")}. Shader ready in ${renderer.info.compileMs} ms. Hero ${frameSize} px${reducedMotion ? " (reduced motion)" : `, ${fps} fps`} (${renderer.info.renderer}).`;
        if (nextPerf !== lastPerfStr) {
          lastPerfStr = nextPerf;
          cur.onPerfText(nextPerf);
        }
      }

      const settledForReduce =
        reducedMotion &&
        !spinRef.current &&
        !cur.busy &&
        !cur.speaking &&
        !spPos.flight &&
        now >= sideSyncUntil &&
        Math.abs(m.dead - m.deadTarget) < 0.01;

      if (document.visibilityState === "visible" && !settledForReduce) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const resyncStageOnReturn = () => {
      lastTs = performance.now();
      timeRef.current.lastActivity = timeRef.current.rt;
      ptrRef.current.hover = false;
      ptrRef.current.seen = false;
      wakeFromIdle();
      const spPos = stagePosRef.current;
      if (spPos.slotEl) {
        const r = spPos.slotEl.getBoundingClientRect();
        if (r.width > 0 && !spPos.flight) {
          spPos.x = r.left;
          spPos.y = r.top;
          spPos.w = r.width;
          spPos.vx = spPos.vy = spPos.vw = 0;
        }
      }
      scheduleTick();
    };

    const onVis = () => {
      if (document.visibilityState === "visible") {
        resyncStageOnReturn();
      } else {
        ptrRef.current.hover = false;
        ptrRef.current.seen = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      }
    };

    const onWindowBlur = () => {
      ptrRef.current.hover = false;
      ptrRef.current.seen = false;
    };

    const onReduceChange = () => {
      reducedMotion = Boolean(mq?.matches);
      slotRectDirty = true;
      scheduleTick();
    };
    mq?.addEventListener?.("change", onReduceChange);

    rafId = requestAnimationFrame(tick);
    if (slotRo) {
      if (refsRef.current.slotBigRef.current) {
        observedSlotEl = refsRef.current.slotBigRef.current;
        slotRo.observe(refsRef.current.slotBigRef.current);
      }
      if (refsRef.current.slotPerchRef.current) slotRo.observe(refsRef.current.slotPerchRef.current);
      if (refsRef.current.slotInputLeftRef.current) slotRo.observe(refsRef.current.slotInputLeftRef.current);
      if (refsRef.current.composerRef.current) slotRo.observe(refsRef.current.composerRef.current);
      const mainEl = refsRef.current.composerRef.current?.closest(".main") ?? refsRef.current.slotBigRef.current?.closest(".main");
      if (mainEl) {
        observedMainEl = mainEl;
        slotRo.observe(mainEl);
      }
    }
    const appEl = refsRef.current.heroCanvasRef.current?.closest(".app") ?? null;
    const onSideClassChange = () => {
      sideSyncUntil = performance.now() + 480;
      slotRectDirty = true;
      scheduleTick();
    };
    const appMo =
      typeof MutationObserver !== "undefined" && appEl
        ? new MutationObserver(onSideClassChange)
        : null;
    appMo?.observe(appEl!, { attributes: true, attributeFilter: ["class"] });

    const onResizeMark = () => {
      markSlotDirty();
      scheduleTick();
    };
    window.addEventListener("resize", onResizeMark, { passive: true });
    window.addEventListener("momo:slot-sync", onResizeMark, { passive: true });
    window.addEventListener("scroll", markSlotDirty, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", resyncStageOnReturn);
    window.addEventListener("focus", resyncStageOnReturn);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      wakeLoopRef.current = null;
      if (rafId) cancelAnimationFrame(rafId);
      mq?.removeEventListener?.("change", onReduceChange);
      appMo?.disconnect();
      slotRo?.disconnect();
      window.removeEventListener("resize", onResizeMark);
      window.removeEventListener("momo:slot-sync", onResizeMark);
      window.removeEventListener("scroll", markSlotDirty, true);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", resyncStageOnReturn);
      window.removeEventListener("focus", resyncStageOnReturn);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [blink, spinToLook, syncColors, triggerExpression, wakeFromIdle]);

  // Wake settled reduced-motion loop whenever React stage inputs change
  useEffect(() => {
    wakeLoopRef.current?.();
  }, [
    state.look,
    state.mood,
    state.busy,
    state.offline,
    state.speaking,
    state.started,
    state.workspaceView,
    state.dark,
    state.paletteOverrides,
  ]);

  const pulseIdea = useCallback(() => {
    const m = mascotRef.current;
    m.idea = 0.55;
    m.liftV += 1.6;
  }, []);

  const bumpSquash = useCallback((dv = -1.6) => {
    mascotRef.current.squashV += dv;
  }, []);

  const setFocusTarget = useCallback((focus: null | "think" | string) => {
    mascotRef.current.focus = focus;
  }, []);

  const resetToRest = useCallback(() => {
    mascotRef.current.focus = null;
    mascotRef.current.idea = 0;
    modeRef.current = { mode: null, until: 0, hold: false };
    wakeFromIdle();
  }, [wakeFromIdle]);

  return {
    blink,
    triggerExpression,
    wakeFromIdle,
    pulseIdea,
    bumpSquash,
    setFocusTarget,
    resetToRest,
  };
}
