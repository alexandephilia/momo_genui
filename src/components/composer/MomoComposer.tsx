"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { buildSeamlessComposerPath } from "@/utils/seamlessPath";
import {
  ModelBrandIcon,
  ReasoningMotionIcon,
} from "@/components/icons/ModelBrandIcon";
import { EASE_MOMO } from "@/components/motion/MotionPrimitives";
import {
  MOMO_MODEL_CATALOG,
  normalizeReasoningEffort,
  resolveModelMeta,
  type ReasoningEffort,
} from "@/lib/modelCatalog";
import type {
  ComposerBridge,
  ComposerSnapshot,
} from "@/runtime/composerBridge";
import type { ComposerAttachment } from "@/types/momo";
import { MicSvg } from "./MicSvg";
import {
  classifyAttachment,
  formatAttachmentChipSummary,
  MAX_COMPOSER_ATTACHMENTS,
  PEAKED_ACCENT_BY_KIND,
  PeakedAttachmentFan,
} from "./PeakedAttachmentFan";
import { SendSvg, StopSvg } from "./SendSvg";
import { StaggeredBlurText } from "./StaggeredBlurText";

interface MomoComposerProps {
  bridge?: ComposerBridge;
  snapshot?: ComposerSnapshot;
  attachments?: ComposerAttachment[];
  speechSupported?: boolean;
  onInputChange?: (value: string) => void;
  onAddAttachments?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  onSubmit?: (text: string, attachments?: ComposerAttachment[]) => void;
  onStop?: () => void;
  onToggleMic?: () => void;
  onCancelDictation?: () => void;
  onDismissDictateError?: () => void;
  onFormElement?: (el: HTMLElement | null) => void;
  slotPerchRef?: React.RefObject<HTMLDivElement | null>;
  slotInputLeftRef?: React.RefObject<HTMLDivElement | null>;
  selectedModelId?: string;
  reasoningEffort?: ReasoningEffort;
  onSelectModel?: (modelId: string) => void;
  onChangeReasoningEffort?: (effort: ReasoningEffort) => void;
  onCrestMenuToggle?: (open: boolean) => void;
}

const EASE_SEAMLESS: [number, number, number, number] = [0.42, 0, 0.85, 1];
const EASE_IN_MORPH: [number, number, number, number] = [0.42, 0, 0.58, 1];
const EASE_HOVER_GLOW: [number, number, number, number] = [0.42, 0, 0.58, 1];

const TAB_HEIGHT = 20;
const SHOULDER_WIDTH = 24;
const CORNER_RADIUS = 19;

const FOCUSED_SUGGESTIONS = [
  (bot: string) => `Tanya ${bot} apa saja`,
  () => "Minta ide cepat, draf, atau kode...",
  () => "Susun jadwal olahraga 20 menit tanpa alat...",
  () => "Tekan ikon mik untuk coba Dikte suara...",
];

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

function hexToRgb(hex: string): [number, number, number] {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return [239, 140, 102];
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function rgba(rgb: [number, number, number], a: number) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a.toFixed(3)})`;
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  w: number,
): [number, number, number] {
  const t = clamp(w, 0, 1);
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ];
}

function rgbToHex(rgb: [number, number, number]) {
  return (
    "#" +
    rgb
      .map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

const DEFAULT_COMPOSER_SNAPSHOT: ComposerSnapshot = {
  roleId: "rest",
  rolePalette: ["#FBC2A2", "#EF8C66", "#DA6C4D", "#B5523C"],
  botName: "Momo",
  isCustomBot: false,
  inputValue: "",
  busy: false,
  dictating: false,
  dictateError: null,
  sentSeq: 0,
  placeholder: "Tanya Momo apa saja",
};

const noopSubscribe = () => () => {};

function subscribeDocumentTheme(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const obs = new MutationObserver(onStoreChange);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => obs.disconnect();
}

function getDocumentThemeSnapshot(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.theme === "dark";
}

function getSpeechSupportedSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(
    (w.SpeechRecognition || w.webkitSpeechRecognition) &&
    window.isSecureContext,
  );
}

const getFalseSnapshot = () => false;
const getDefaultBridgeSnapshot = () => DEFAULT_COMPOSER_SNAPSHOT;

const CHEVRON_VERT_SRC = `
  attribute vec2 a_pos;
  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const CHEVRON_FRAG_SRC = `
  precision highp float;
  uniform float u_time;
  uniform float u_progress;
  uniform float u_effort;
  uniform float u_vel;
  uniform vec3 u_accent;
  uniform vec2 u_res;
  uniform float u_dpr;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 px = gl_FragCoord.xy / max(1.0, u_dpr);
    vec2 size = u_res / max(1.0, u_dpr);
    float aa = 0.65 / max(1.0, u_dpr);
    float knobX = mix(12.0, max(13.0, size.x - 12.0), u_progress);
    float t = u_time;
    float velBoost = clamp(abs(u_vel) * 10.0, 0.0, 1.0);

    float pitch = 4.6;
    float rows = 4.0;
    float cols = floor((size.x - 6.0) / pitch);
    float marginX = (size.x - cols * pitch) * 0.5;
    float marginY = (size.y - rows * pitch) * 0.5;
    vec2 gp = vec2(px.x - marginX, px.y - marginY);
    vec2 cid = floor(gp / pitch);
    float col = cid.x;
    float row = cid.y;

    if (col < 0.0 || col >= cols || row < 0.0 || row >= rows) {
      gl_FragColor = vec4(0.0);
      return;
    }

    float cellX = marginX + (col + 0.5) * pitch;
    vec2 local = (fract(gp / pitch) - 0.5) * pitch;
    float cellRadius = 1.55;
    float dist = sdRoundBox(local, vec2(cellRadius, cellRadius), 0.42);

    float cellMask = 1.0 - smoothstep(-aa, aa, dist);
    float rimMask = smoothstep(-0.2, 0.35, dist) * (1.0 - smoothstep(0.35, 0.95, dist));
    float bottomSpec = clamp(-local.y / cellRadius, 0.0, 1.0);
    float topShadow = clamp(local.y / cellRadius, 0.0, 1.0);

    vec3 socketPit = mix(vec3(0.035, 0.04, 0.055), vec3(0.02, 0.022, 0.03), topShadow);
    vec3 socketRim = vec3(0.20, 0.22, 0.28) * bottomSpec * rimMask;

    float lum = 0.0;
    float hotCore = 0.0;
    float activeCol = step(cellX, knobX + 1.0);

    if (u_effort < 0.06) {
      if (col < 0.5 && (row > 0.5 && row < 2.5)) {
        lum = 0.14 + 0.08 * sin(t * 2.5);
      }
    } else {
      float tLow = smoothstep(0.05, 0.35, u_effort);
      float tMed = smoothstep(0.35, 0.70, u_effort);
      float tHigh = smoothstep(0.70, 1.0, u_effort);

      float stepCol = col - floor(t * 7.5);
      float bit = step(0.68, hash21(vec2(stepCol, row)));
      float lowPat = 0.16 + 0.78 * bit * (1.0 - 0.55 * step(1.0, abs(row - 1.5)));

      float chevDist = abs(row - 1.5);
      float phaseMed = mod(col + chevDist * 1.15 - floor(t * 9.5), 5.0);
      float chevMed = phaseMed < 1.6 ? 0.96 : (phaseMed < 2.6 ? 0.24 : 0.08);

      float phaseHigh = mod(col + chevDist * 1.15 - floor(t * 16.5), 4.0);
      float chevHigh = phaseHigh < 1.85 ? 1.05 : 0.24;
      float windowFlare = exp(-abs(cellX - (knobX - 7.0)) * 0.18) * 0.42;

      lum = mix(lowPat, chevMed, tMed);
      lum = mix(lum, max(chevHigh, windowFlare), tHigh) * tLow * activeCol;
      lum = clamp(lum + velBoost * activeCol * 0.4, 0.0, 1.25);
      hotCore = smoothstep(0.78, 1.18, lum) * mix(0.25, 1.0, tHigh);
    }

    vec3 ledBody = mix(u_accent * 0.9, vec3(1.0, 0.98, 0.93), hotCore * 0.78);
    float centerHot = exp(-dot(local, local) / (cellRadius * cellRadius * 0.55));
    vec3 litColor = mix(ledBody * 0.85, ledBody * (1.15 + 0.35 * hotCore), centerHot);

    vec3 cellColor = mix(socketPit, litColor, clamp(lum, 0.0, 1.0));
    float channelBloom = exp(-max(0.0, dist) * 1.4) * clamp(lum, 0.0, 1.0) * 0.28;
    vec3 outerColor = socketRim + u_accent * channelBloom;

    vec3 finalRgb = mix(outerColor, cellColor, cellMask);
    float finalAlpha = max(cellMask * 0.96, max(rimMask * 0.85, channelBloom));
    gl_FragColor = vec4(finalRgb, clamp(finalAlpha, 0.0, 1.0));
  }
`;

interface ChevronMatrixSurface {
  render: (
    timeSec: number,
    progress: number,
    effort: number,
    vel: number,
    rgb: [number, number, number],
  ) => void;
  destroy: () => void;
}

function createChevron2DFallback(
  canvas: HTMLCanvasElement,
): ChevronMatrixSurface | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return {
    render(timeSec, progress, effort, _vel, rgb) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 200;
      const h = canvas.clientHeight || 22;
      const targetW = Math.max(1, Math.floor(w * dpr));
      const targetH = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const pitch = 4.6;
      const rows = 4;
      const cols = Math.floor((w - 6) / pitch);
      const mx = (w - cols * pitch) * 0.5;
      const my = (h - rows * pitch) * 0.5;
      const knobX = 12 + progress * Math.max(1, w - 24);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = mx + (c + 0.5) * pitch;
          const cy = my + (r + 0.5) * pitch;
          let lum = 0;
          if (cx <= knobX + 1.0 && effort >= 0.06) {
            const chevDist = Math.abs(r - 1.5);
            const speed = effort > 0.7 ? 16.5 : 9.5;
            const period = effort > 0.7 ? 4 : 5;
            const phase =
              (((c + chevDist * 1.15 - Math.floor(timeSec * speed)) % period) +
                period) %
              period;
            lum = (phase < 1.7 ? 0.96 : 0.22) * effort;
          }
          ctx.fillStyle =
            lum > 0.05
              ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamp(lum, 0, 1)})`
              : "rgba(6, 8, 12, 0.8)";
          const half = 1.55;
          ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
        }
      }
    },
    destroy() {},
  };
}

function createChevronWebGLSurface(
  canvas: HTMLCanvasElement,
): ChevronMatrixSurface | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: false,
    antialias: true,
  });
  if (!gl) return createChevron2DFallback(canvas);

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, CHEVRON_VERT_SRC);
  const fs = compile(gl.FRAGMENT_SHADER, CHEVRON_FRAG_SRC);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return createChevron2DFallback(canvas);
  }

  const prog = gl.createProgram();
  if (!prog) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return createChevron2DFallback(canvas);
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return createChevron2DFallback(canvas);
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, "u_time");
  const uProg = gl.getUniformLocation(prog, "u_progress");
  const uEff = gl.getUniformLocation(prog, "u_effort");
  const uVel = gl.getUniformLocation(prog, "u_vel");
  const uAcc = gl.getUniformLocation(prog, "u_accent");
  const uRes = gl.getUniformLocation(prog, "u_res");
  const uDpr = gl.getUniformLocation(prog, "u_dpr");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    render(timeSec, progress, effort, vel, rgb) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform1f(uTime, timeSec);
      gl.uniform1f(uProg, progress);
      gl.uniform1f(uEff, effort);
      gl.uniform1f(uVel, vel);
      gl.uniform3f(uAcc, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uDpr, dpr);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    destroy() {
      if (buf) gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}

function getEffortShortLabel(lvl: ReasoningEffort): string {
  switch (lvl) {
    case "off":
      return "Off";
    case "low":
      return "Low";
    case "medium":
      return "Med";
    case "high":
      return "High";
    default:
      return lvl;
  }
}

function ReasoningEffortSlider({
  levels,
  effectiveEffort,
  accentRgb,
  expanded,
  reducedMotion,
  onChange,
}: {
  levels: ReasoningEffort[];
  effectiveEffort: ReasoningEffort;
  accentRgb: [number, number, number];
  expanded: boolean;
  reducedMotion: boolean;
  onChange: (lvl: ReasoningEffort) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);

  const currentIndex = Math.max(0, levels.indexOf(effectiveEffort));
  const maxIndex = Math.max(1, levels.length - 1);
  const targetRatio = currentIndex / maxIndex;

  const liveRef = useRef({
    targetRatio,
    accentRgb,
    expanded,
    reducedMotion,
  });
  liveRef.current = { targetRatio, accentRgb, expanded, reducedMotion };

  const collapseUntilRef = useRef(0);
  const prevExpandedRef = useRef(expanded);
  const wakeLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const surface = createChevronWebGLSurface(canvas);
    let rafId = 0;
    const startMs = performance.now();
    let animPos = liveRef.current.targetRatio;
    let animEffort = liveRef.current.targetRatio;
    let vel = 0;

    const tick = (now: number) => {
      rafId = 0;
      const {
        targetRatio: tgt,
        accentRgb: rgb,
        expanded: exp,
        reducedMotion: rm,
      } = liveRef.current;
      const prevPos = animPos;
      if (rm) {
        animPos = tgt;
        animEffort = tgt;
        vel = 0;
      } else {
        animPos += (tgt - animPos) * 0.18;
        animEffort += (tgt - animEffort) * 0.15;
        vel = vel * 0.8 + (animPos - prevPos);
      }

      const trackEl = trackRef.current;
      const knobEl = knobRef.current;
      if (trackEl && knobEl) {
        const w = trackEl.clientWidth || 200;
        const pad = 12;
        const usable = Math.max(1, w - pad * 2);
        const px = pad + animPos * usable;
        knobEl.style.left = `${px.toFixed(2)}px`;
      }

      if (surface) {
        const timeSec = rm ? 0 : (now - startMs) * 0.001;
        surface.render(timeSec, animPos, animEffort, vel, rgb);
      }

      const settling =
        Math.abs(tgt - animPos) > 0.001 ||
        Math.abs(tgt - animEffort) > 0.001 ||
        Math.abs(vel) > 0.001;
      const keepAlive =
        !rm && (exp || now <= collapseUntilRef.current || settling);
      if (keepAlive || settling) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const startLoop = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(tick);
    };
    wakeLoopRef.current = startLoop;

    tick(startMs);
    return () => {
      wakeLoopRef.current = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      surface?.destroy();
    };
  }, []);

  useEffect(() => {
    if (prevExpandedRef.current && !expanded) {
      collapseUntilRef.current = performance.now() + 280;
    }
    prevExpandedRef.current = expanded;
    wakeLoopRef.current?.();
  }, [expanded, targetRatio, accentRgb, reducedMotion]);

  return (
    <div
      className="momo-reason-slider-card"
      data-effort={effectiveEffort}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={trackRef}
        className="momo-reason-slider-track-box"
        data-effort={effectiveEffort}
      >
        <div className="momo-reason-slider-rail">
          <canvas
            ref={canvasRef}
            className="momo-reason-slider-gl"
            aria-hidden="true"
          />
        </div>
        <div
          ref={knobRef}
          className="momo-reason-slider-knob"
          data-effort={effectiveEffort}
          aria-hidden="true"
          style={{
            left: `calc(12px + ${targetRatio} * (100% - 24px))`,
          }}
        >
          <span className="momo-reason-slider-knob-grip" />
          <span className="momo-reason-slider-knob-bar" />
          <span className="momo-reason-slider-knob-grip" />
        </div>
        <input
          type="range"
          min={0}
          max={maxIndex}
          step={1}
          value={currentIndex}
          tabIndex={expanded ? 0 : -1}
          onChange={(e) => {
            const targetLvl = levels[Number(e.target.value)];
            if (targetLvl) onChange(targetLvl);
          }}
          className="momo-reason-slider-input"
          aria-label="Thinking effort level"
          aria-valuetext={effectiveEffort}
        />
      </div>

      {/* Step Clickable Stops */}
      <div className="momo-reason-slider-stops">
        {levels.map((lvl) => {
          const isAct = lvl === effectiveEffort;
          return (
            <button
              key={`stop-${lvl}`}
              type="button"
              tabIndex={expanded ? 0 : -1}
              className={`momo-reason-slider-stop-btn${isAct ? " is-active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(lvl);
              }}
            >
              {getEffortShortLabel(lvl)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const MomoComposer: React.FC<MomoComposerProps> = ({
  bridge,
  snapshot: controlledSnapshot,
  attachments: controlledAttachments,
  speechSupported: controlledSpeechSupported,
  onInputChange,
  onAddAttachments,
  onRemoveAttachment,
  onSubmit,
  onStop,
  onToggleMic,
  onCancelDictation,
  onDismissDictateError,
  onFormElement,
  slotPerchRef,
  slotInputLeftRef: _slotInputLeftRef,
  selectedModelId,
  reasoningEffort = "off",
  onSelectModel,
  onChangeReasoningEffort,
  onCrestMenuToggle,
}) => {
  const onCancelDictationRef = useRef(onCancelDictation);
  onCancelDictationRef.current = onCancelDictation;
  const uid = useId().replace(/:/g, "");
  const subscribeBridge = useCallback(
    (onStoreChange: () => void) => {
      if (!bridge) return () => {};
      return bridge.subscribe(onStoreChange);
    },
    [bridge],
  );
  const getBridgeSnapshot = useCallback(
    () => (bridge ? bridge.getSnapshot() : DEFAULT_COMPOSER_SNAPSHOT),
    [bridge],
  );
  const bridgeSnap = useSyncExternalStore(
    subscribeBridge,
    getBridgeSnapshot,
    getDefaultBridgeSnapshot,
  );
  const snap = controlledSnapshot ?? bridgeSnap;
  const isDark = useSyncExternalStore(
    subscribeDocumentTheme,
    getDocumentThemeSnapshot,
    getFalseSnapshot,
  );
  const detectedSpeech = useSyncExternalStore(
    noopSubscribe,
    getSpeechSupportedSnapshot,
    getFalseSnapshot,
  );
  const speechSupported = controlledSpeechSupported ?? detectedSpeech;

  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Direct DOM refs for zero-React-rerender 60/120fps Crown 03 & CNC Prism Bevel 01 motion
  const crownAuraRef = useRef<HTMLDivElement | null>(null);
  const crownAuraClipRef = useRef<HTMLDivElement | null>(null);
  const crownRimRef = useRef<HTMLDivElement | null>(null);
  const crownAuraWave1Ref = useRef<HTMLDivElement | null>(null);
  const crownAuraWave2Ref = useRef<HTMLDivElement | null>(null);
  const crownRimWave1Ref = useRef<HTMLDivElement | null>(null);
  const crownRimWave2Ref = useRef<HTMLDivElement | null>(null);
  const crownGradRef = useRef<SVGLinearGradientElement | null>(null);
  const crownStrokeRef = useRef<SVGPathElement | null>(null);
  const crownWashRef = useRef<HTMLDivElement | null>(null);

  const baseFillPathRef = useRef<SVGPathElement | null>(null);
  const washClipRef = useRef<HTMLDivElement | null>(null);
  const rimBorderPathRef = useRef<SVGPathElement | null>(null);
  const composerCrestRef = useRef<HTMLDivElement | null>(null);

  const horGradRef = useRef<SVGLinearGradientElement | null>(null);
  const rimStopRef = useRef<SVGStopElement | null>(null);
  const horBaseStrokeRef = useRef<SVGPathElement | null>(null);
  const horBlurStrokeRef = useRef<SVGPathElement | null>(null);
  const horStrokeRef = useRef<SVGPathElement | null>(null);
  const horWashRef = useRef<HTMLDivElement | null>(null);
  const topSpecRef = useRef<SVGPathElement | null>(null);
  const lastGeomRef = useRef<{
    w: number;
    h: number;
    tl: number;
    tw: number;
    geom: ReturnType<typeof buildSeamlessComposerPath>;
  } | null>(null);

  const [dimensions, setDimensions] = useState<{ w: number; h: number }>({
    w: 560,
    h: 56,
  });
  const [targetTabWidth, setTargetTabWidth] = useState<number>(109);

  const [isFocused, setIsFocused] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [localAttachments, setLocalAttachments] = useState<
    ComposerAttachment[]
  >([]);
  const [sentReturnLock, setSentReturnLock] = useState(false);
  const [sentBanner, setSentBanner] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(0);
  const [idleIdx, setIdleIdx] = useState(0);
  const [crestPhraseIdx, setCrestPhraseIdx] = useState(0);
  const [crestMenuOpen, setCrestMenuOpen] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const crestMenuWrapRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const updateCrestMenuOpen = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      setCrestMenuOpen((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        onCrestMenuToggle?.(next);
        return next;
      });
    },
    [onCrestMenuToggle],
  );

  const activeModelMeta = useMemo(
    () => resolveModelMeta(selectedModelId),
    [selectedModelId],
  );
  const effectiveEffort = useMemo(
    () => normalizeReasoningEffort(activeModelMeta, reasoningEffort),
    [activeModelMeta, reasoningEffort],
  );
  const effectiveReasoningOn =
    activeModelMeta.supportsReasoning && effectiveEffort !== "off";

  useEffect(() => {
    if (!crestMenuOpen) return;
    const onDocDown = (e: PointerEvent) => {
      if (
        crestMenuWrapRef.current &&
        !crestMenuWrapRef.current.contains(e.target as Node)
      ) {
        updateCrestMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") updateCrestMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDocDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDocDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [crestMenuOpen, updateCrestMenuOpen]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const localObjectUrlsRef = useRef<Set<string>>(new Set());
  const localUploadTimersRef = useRef<Set<number>>(new Set());
  const isHoveredRef = useRef(false);
  const lastPointerActiveRef = useRef(0);
  const phaseRef = useRef(0);
  const hoverCtrlRef = useRef<ReturnType<typeof animate> | null>(null);
  const surgeCtrlRef = useRef<ReturnType<typeof animate> | null>(null);
  const prevSentSeqRef = useRef(snap.sentSeq);
  const latestOnFormElementRef = useRef(onFormElement);
  latestOnFormElementRef.current = onFormElement;

  const activeAttachments = controlledAttachments ?? localAttachments;
  const hasAttachments = activeAttachments.length > 0;
  const attachmentChipSummary = useMemo(
    () =>
      hasAttachments ? formatAttachmentChipSummary(activeAttachments) : null,
    [hasAttachments, activeAttachments],
  );

  const openFilePicker = useCallback(
    (accept = "*/*") => {
      if (activeAttachments.length >= MAX_COMPOSER_ATTACHMENTS) return;
      const input = fileInputRef.current;
      if (!input) return;
      input.accept = accept;
      input.click();
    },
    [activeAttachments.length],
  );

  useEffect(() => {
    const urls = localObjectUrlsRef.current;
    const timers = localUploadTimersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);

  const localAttachmentsCountRef = useRef(0);
  localAttachmentsCountRef.current = localAttachments.length;

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming || []).filter((f) => f && f.size >= 0);
      if (files.length === 0) return;
      if (onAddAttachments) {
        onAddAttachments(files);
        return;
      }
      const room = Math.max(
        0,
        MAX_COMPOSER_ATTACHMENTS - localAttachmentsCountRef.current,
      );
      if (room === 0) return;

      const prepared = files.slice(0, room).map((file, i) => {
        const kind = classifyAttachment(file);
        const id = `att_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`;
        let previewUrl: string | undefined;
        if (kind === "image" && typeof URL !== "undefined") {
          previewUrl = URL.createObjectURL(file);
          localObjectUrlsRef.current.add(previewUrl);
        }
        const item: ComposerAttachment = {
          id,
          name:
            file.name || `Lampiran ${localAttachmentsCountRef.current + i + 1}`,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          kind,
          previewUrl,
          status: "uploading",
          accent: PEAKED_ACCENT_BY_KIND[kind],
        };
        return { id, file, item };
      });

      setLocalAttachments((prev) => {
        const avail = Math.max(0, MAX_COMPOSER_ATTACHMENTS - prev.length);
        if (avail === 0) return prev;
        return [...prev, ...prepared.slice(0, avail).map((p) => p.item)];
      });

      // Asynchronously read real payloads (downscaled DataURL for images, UTF-8 text for notes/events/code)
      for (const entry of prepared) {
        void (async () => {
          let imageDataUrl: string | undefined;
          let extractedText: string | undefined;
          try {
            if (entry.item.kind === "image") {
              imageDataUrl = await new Promise<string | undefined>(
                (resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const res =
                      typeof reader.result === "string"
                        ? reader.result
                        : undefined;
                    if (!res || res.length <= 320_000) {
                      resolve(res);
                      return;
                    }
                    const img = new Image();
                    img.onload = () => {
                      const maxDim = 1024;
                      const scale = Math.min(
                        1,
                        maxDim / Math.max(img.width, img.height),
                      );
                      const canvas = document.createElement("canvas");
                      canvas.width = Math.max(1, Math.round(img.width * scale));
                      canvas.height = Math.max(
                        1,
                        Math.round(img.height * scale),
                      );
                      const ctx = canvas.getContext("2d");
                      if (!ctx) {
                        resolve(res);
                        return;
                      }
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      resolve(canvas.toDataURL("image/jpeg", 0.82));
                    };
                    img.onerror = () => resolve(res);
                    img.src = res;
                  };
                  reader.onerror = () => resolve(undefined);
                  reader.readAsDataURL(entry.file);
                },
              );
            } else if (
              /^(text\/|application\/(json|xml|javascript|x-javascript))/i.test(
                entry.file.type || "",
              ) ||
              /\.(txt|md|markdown|json|csv|ics|ts|tsx|js|jsx|py|html|css|yml|yaml|xml)$/i.test(
                entry.file.name || "",
              )
            ) {
              const rawText = await entry.file.text();
              extractedText = rawText.slice(0, 8000);
            }
          } catch {
            // Keep graceful filename metadata if browser blocks file read
          }

          setLocalAttachments((cur) =>
            cur.map((a) =>
              a.id === entry.id
                ? {
                    ...a,
                    ...(imageDataUrl ? { imageDataUrl } : {}),
                    ...(extractedText ? { extractedText } : {}),
                    status: "ready",
                  }
                : a,
            ),
          );
        })();
      }
    },
    [onAddAttachments],
  );

  const removeAttachmentById = useCallback(
    (id: string) => {
      if (onRemoveAttachment) {
        onRemoveAttachment(id);
        return;
      }
      setLocalAttachments((prev) => {
        const target = prev.find((a) => a.id === id);
        if (
          target?.previewUrl &&
          localObjectUrlsRef.current.has(target.previewUrl)
        ) {
          URL.revokeObjectURL(target.previewUrl);
          localObjectUrlsRef.current.delete(target.previewUrl);
        }
        return prev.filter((a) => a.id !== id);
      });
    },
    [onRemoveAttachment],
  );

  // Trigger post-send return choreography cleanly in effects (never synchronous setState in render)
  useEffect(() => {
    if (snap.sentSeq === prevSentSeqRef.current) return;
    prevSentSeqRef.current = snap.sentSeq;
    setSentReturnLock(true);
    setSentBanner(true);
  }, [snap.sentSeq]);

  useEffect(() => {
    if (!sentBanner || snap.busy) return;
    const t = window.setTimeout(() => setSentBanner(false), 950);
    return () => window.clearTimeout(t);
  }, [sentBanner, snap.busy, snap.sentSeq]);

  useEffect(() => {
    if (snap.dictating) {
      setSentReturnLock(false);
    }
  }, [snap.dictating]);

  // Auto-grow textarea cleanly within [40px, 208px] without CSS height transition stalls
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (!snap.inputValue) {
      ta.style.height = "40px";
      ta.classList.remove("overflow");
      return;
    }
    ta.style.height = "auto";
    const nextH = Math.min(208, Math.max(40, ta.scrollHeight));
    ta.style.height = `${nextH}px`;
    ta.classList.toggle("overflow", ta.scrollHeight > 208);
  }, [snap.inputValue, dimensions.w]);

  const DICTATING_RED_PALETTE: [string, string, string, string] = [
    "#fda4af",
    "#fb7185",
    "#e11d48",
    "#9f1239",
  ];

  const hasText = snap.inputValue.trim().length > 0;
  const dictateErrorText =
    !snap.dictating && !snap.busy && snap.dictateError?.trim()
      ? snap.dictateError.trim()
      : "";
  const hasDictateError = Boolean(dictateErrorText);
  const hasCrestActionBtn = snap.dictating || hasDictateError;
  const isActivePose =
    !sentReturnLock &&
    (isFocused ||
      snap.dictating ||
      hasDictateError ||
      hasText ||
      hasAttachments);
  const isActivePoseRef = useRef(isActivePose);
  isActivePoseRef.current = isActivePose;
  const isDictatingRef = useRef(snap.dictating);
  isDictatingRef.current = snap.dictating;

  useEffect(() => {
    return () => {
      if (isDictatingRef.current) {
        onCancelDictationRef.current?.();
      }
    };
  }, []);

  // Derive luminous glow colors from active avatar role palette (crimson red strictly ONLY while snap.dictating is active)
  const roleTheme = useMemo(() => {
    const activePalette = snap.dictating
      ? DICTATING_RED_PALETTE
      : snap.rolePalette;
    const light = hexToRgb(activePalette[0]);
    const base = hexToRgb(activePalette[1]);
    const shade = hexToRgb(activePalette[2]);
    const deep = hexToRgb(activePalette[3]);
    const core = mixRgb(light, [255, 255, 255], 0.8);
    const wingLeft = mixRgb(light, [255, 244, 224], 0.25);
    const wingRight = mixRgb(
      shade,
      snap.dictating ? [251, 113, 133] : [192, 132, 252],
      0.22,
    );
    const eclipseDarkTop = mixRgb([12, 16, 22], base, 0.34);
    const eclipseDarkBottom = mixRgb([8, 11, 16], deep, 0.28);
    const eclipseLightTop = mixRgb([255, 255, 255], light, 0.42);
    const eclipseLightBottom = mixRgb([241, 245, 249], base, 0.28);
    const luma = (0.299 * base[0] + 0.587 * base[1] + 0.114 * base[2]) / 255;
    return {
      light,
      base,
      shade,
      deep,
      core,
      wingLeft,
      wingRight,
      coreHex: rgbToHex(core),
      wingLeftHex: rgbToHex(wingLeft),
      wingRightHex: rgbToHex(wingRight),
      lightHex: activePalette[0],
      baseHex: activePalette[1],
      shadeHex: activePalette[2],
      deepHex: activePalette[3],
      eclipseDarkTopHex: rgbToHex(eclipseDarkTop),
      eclipseDarkBottomHex: rgbToHex(eclipseDarkBottom),
      eclipseLightTopHex: rgbToHex(eclipseLightTop),
      eclipseLightBottomHex: rgbToHex(eclipseLightBottom),
      sendTextDark: luma > 0.56,
    };
  }, [snap.dictating, snap.rolePalette]);

  // Responsive spring pointer X for magnetic 1:1 3-Octave Solaris mouse tracking
  const pointerX = useMotionValue(0.5);
  const smoothPointerX = useSpring(pointerX, {
    stiffness: 180,
    damping: 28,
    mass: 0.95,
  });

  const formRectRef = useRef<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });
  const idleSettledRef = useRef(false);

  // Track pointer globally across window while focused so Horizon blade follows cursor accurately
  useEffect(() => {
    if (!isActivePose) return;
    const updateFormRect = () => {
      const form = formRef.current;
      if (!form) return;
      const r = form.getBoundingClientRect();
      if (r.width) formRectRef.current = { left: r.left, width: r.width };
    };
    updateFormRect();
    window.addEventListener("resize", updateFormRect, { passive: true });
    window.addEventListener("scroll", updateFormRect, {
      passive: true,
      capture: true,
    });
    const onWinPointerMove = (e: PointerEvent) => {
      let rect = formRectRef.current;
      if (!rect.width) {
        updateFormRect();
        rect = formRectRef.current;
      }
      if (!rect.width) return;
      const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      pointerX.set(ratio);
      lastPointerActiveRef.current = performance.now();
      idleSettledRef.current = false;
    };
    window.addEventListener("pointermove", onWinPointerMove, { passive: true });
    return () => {
      window.removeEventListener("resize", updateFormRect);
      window.removeEventListener("scroll", updateFormRect, { capture: true });
      window.removeEventListener("pointermove", onWinPointerMove);
    };
  }, [isActivePose, pointerX]);

  // Smooth focus morph energy (0 = Resting Crown 03, 1 = Centered Crown 03 + Focused Solaris Horizon 01)
  const focusEnergyMV = useMotionValue(isActivePose ? 1 : 0);
  useEffect(() => {
    const ctrl = animate(focusEnergyMV, isActivePose ? 1 : 0, {
      duration: isActivePose ? 0.28 : 0.34,
      ease: EASE_IN_MORPH,
    });
    return () => ctrl.stop();
  }, [isActivePose, focusEnergyMV]);

  // Smooth Motion hover energy & focus surge driven directly from pointer/focus events
  const hoverEnergyMV = useMotionValue(0);
  const focusSurgeMV = useMotionValue(0);

  const triggerFocusSurge = useCallback(() => {
    surgeCtrlRef.current?.stop();
    surgeCtrlRef.current = animate(focusSurgeMV, 1, {
      duration: 0.22,
      ease: EASE_SEAMLESS,
      onComplete: () => {
        surgeCtrlRef.current = animate(focusSurgeMV, 0, {
          duration: 0.3,
          ease: EASE_SEAMLESS,
        });
      },
    });
  }, [focusSurgeMV]);

  const formCallbackRef = useCallback(
    (el: HTMLFormElement | null) => {
      formRef.current = el;
      latestOnFormElementRef.current?.(el);
      if (!el) return;
      const clearTransientHover = () => {
        isHoveredRef.current = false;
        hoverCtrlRef.current?.stop();
        hoverCtrlRef.current = animate(hoverEnergyMV, 0, {
          duration: 0.2,
          ease: EASE_HOVER_GLOW,
        });
      };
      const syncOnVisible = () => {
        if (document.visibilityState === "visible") {
          clearTransientHover();
          const hasFocusInside = Boolean(
            formRef.current?.contains(document.activeElement),
          );
          setIsFocused(hasFocusInside);
          if (!hasFocusInside) setSentReturnLock(false);
        } else {
          clearTransientHover();
        }
      };
      window.addEventListener("blur", clearTransientHover);
      document.addEventListener("visibilitychange", syncOnVisible);
      return () => {
        window.removeEventListener("blur", clearTransientHover);
        document.removeEventListener("visibilitychange", syncOnVisible);
        hoverCtrlRef.current?.stop();
        surgeCtrlRef.current?.stop();
        latestOnFormElementRef.current?.(null);
      };
    },
    [hoverEnergyMV],
  );

  // Crest phrase & suggestions (busy / dictating / dictateError always take priority over transient sentBanner)
  const effortShortTag =
    effectiveEffort === "high"
      ? "High"
      : effectiveEffort === "medium"
        ? "Med"
        : effectiveEffort === "low"
          ? "Low"
          : "";
  const idleCrestTag = effectiveReasoningOn
    ? `${activeModelMeta.shortLabel} · ${effortShortTag}`
    : `${activeModelMeta.shortLabel}`;

  const crestLabel = snap.dictating
    ? "Mendengarkan..."
    : snap.busy
      ? `${snap.botName} · Meracik`
      : hasDictateError
        ? dictateErrorText
        : sentBanner
          ? `${snap.botName} · Terkirim`
          : hasText
            ? `Siap · ${activeModelMeta.shortLabel}`
            : isActivePose
              ? [
                  `${snap.botName} · ${idleCrestTag}`,
                  "Tulis pertanyaanmu",
                  "Coba fitur Dikte",
                ][crestPhraseIdx % 3]
              : `${snap.botName} · ${idleCrestTag}`;

  // Default (unfocused) state rotates its own list so the blur animation runs
  // before the composer is ever focused.
  const idleSuggestions = useMemo(
    () => [
      snap.placeholder || `Tanya ${snap.botName} apa saja`,
      `Minta ${snap.botName} menulis atau merangkum`,
      "Lampirkan file lewat kartu di atas...",
      "Tekan ikon mik untuk coba Dikte suara...",
    ],
    [snap.placeholder, snap.botName],
  );

  const activeSuggestion = isActivePose
    ? FOCUSED_SUGGESTIONS[suggestIdx % FOCUSED_SUGGESTIONS.length](snap.botName)
    : idleSuggestions[idleIdx % idleSuggestions.length];

  // Rotate suggestions & crest phrases while focused and empty
  const shouldRotate =
    isActivePose &&
    !hasText &&
    !snap.dictating &&
    !hasDictateError &&
    !snap.busy &&
    !sentBanner;

  useEffect(() => {
    if (!shouldRotate) {
      setSuggestIdx(0);
      setCrestPhraseIdx(0);
      return;
    }
    const t1 = window.setInterval(() => {
      setSuggestIdx((i) => (i + 1) % FOCUSED_SUGGESTIONS.length);
    }, 3500);
    const t2 = window.setInterval(() => {
      setCrestPhraseIdx((i) => (i + 1) % 3);
    }, 3200);
    return () => {
      window.clearInterval(t1);
      window.clearInterval(t2);
    };
  }, [shouldRotate]);

  // Idle rotation: keeps the placeholder blur-fading in the default state too.
  const shouldRotateIdle =
    !isActivePose &&
    !hasText &&
    !snap.dictating &&
    !hasDictateError &&
    !snap.busy &&
    !sentBanner;

  useEffect(() => {
    if (!shouldRotateIdle) {
      setIdleIdx(0);
      return;
    }
    const t = window.setInterval(() => {
      setIdleIdx((i) => (i + 1) % idleSuggestions.length);
    }, 4200);
    return () => window.clearInterval(t);
  }, [shouldRotateIdle, idleSuggestions.length]);

  // Measure live form dimensions via React 19 ref callback
  const deckCallbackRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure ghost crest label width & resting default width via React 19 ref callbacks
  const ghostTextCallbackRef = useCallback((el: HTMLSpanElement | null) => {
    if (!el) return;
    const measure = () => {
      const w = Math.ceil(el.getBoundingClientRect().width);
      if (w > 0) {
        setTargetTabWidth(Math.max(92, w + 36));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const effectiveTabWidth = useMemo(() => {
    const maxTabW = Math.max(
      92,
      dimensions.w - (CORNER_RADIUS + SHOULDER_WIDTH + 8) * 2,
    );
    return Math.min(targetTabWidth, maxTabW);
  }, [dimensions.w, targetTabWidth]);

  // Compute idle left vs centered plateau coordinates
  const targetLeft = useMemo(() => {
    const minLeft = Math.max(CORNER_RADIUS + SHOULDER_WIDTH + 6, 48);
    const maxLeft = Math.max(
      minLeft,
      dimensions.w - effectiveTabWidth - CORNER_RADIUS - SHOULDER_WIDTH - 8,
    );
    const centerLeft = clamp(
      Math.round((dimensions.w - effectiveTabWidth) * 0.5),
      minLeft,
      maxLeft,
    );
    return isActivePose ? centerLeft : minLeft;
  }, [dimensions.w, effectiveTabWidth, isActivePose]);

  // Synchronized crest width & horizontal position glides (snap cleanly on mount/font-reflow/resize; animate on interactive pose/label changes)
  const crestInteractionKey = `${isActivePose ? 1 : 0}:${snap.busy ? 1 : 0}:${snap.dictating ? 1 : 0}:${dictateErrorText}:${sentBanner ? 1 : 0}:${hasText ? 1 : 0}:${crestPhraseIdx}:${snap.botName}:${activeModelMeta.id}:${effectiveEffort}`;
  const prevCrestInteractionKeyRef = useRef(crestInteractionKey);
  const crestInteractiveUntilRef = useRef(
    typeof window !== "undefined" ? performance.now() + 500 : 0,
  );
  const tabWidthMV = useMotionValue(effectiveTabWidth);
  const tabLeftMV = useMotionValue(targetLeft);

  useLayoutEffect(() => {
    if (prevCrestInteractionKeyRef.current !== crestInteractionKey) {
      prevCrestInteractionKeyRef.current = crestInteractionKey;
      crestInteractiveUntilRef.current = performance.now() + 300;
    }
    const shouldAnimate = performance.now() <= crestInteractiveUntilRef.current;
    if (!shouldAnimate) {
      tabWidthMV.jump(effectiveTabWidth);
      tabLeftMV.jump(targetLeft);
      idleSettledRef.current = false;
      latestOpticalRef.current?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("momo:slot-sync"));
      }
      return;
    }
    idleSettledRef.current = false;
    const wCtrl = animate(tabWidthMV, effectiveTabWidth, {
      duration: 0.24,
      ease: EASE_MOMO,
    });
    const lCtrl = animate(tabLeftMV, targetLeft, {
      duration: 0.24,
      ease: EASE_MOMO,
    });
    return () => {
      wCtrl.stop();
      lCtrl.stop();
    };
  }, [
    crestInteractionKey,
    effectiveTabWidth,
    targetLeft,
    tabWidthMV,
    tabLeftMV,
  ]);

  const geometry = useMemo(
    () =>
      buildSeamlessComposerPath({
        width: dimensions.w,
        bodyHeight: dimensions.h,
        tabHeight: TAB_HEIGHT,
        tabLeft: targetLeft,
        tabWidth: effectiveTabWidth,
        cornerRadius: CORNER_RADIUS,
        shoulderWidth: SHOULDER_WIDTH,
      }),
    [dimensions.w, dimensions.h, targetLeft, effectiveTabWidth],
  );

  // Zero-React-Rerender 60/120fps Optical Pipeline: updates GPU refs directly
  const applyOpticalFrame = useCallback(() => {
    const energy = focusEnergyMV.get();
    const hoverEnergy = hoverEnergyMV.get();
    const surgeEnergy = focusSurgeMV.get();
    const restingHover = (1 - energy) * hoverEnergy;
    const horizonEnergy = clamp(
      Math.max((energy - 0.06) / 0.94, restingHover * 0.26),
      0,
      1,
    );

    const rad = (phaseRef.current * Math.PI) / 180;
    const w = dimensions.w;
    const bodyH = dimensions.h;
    const tl = tabLeftMV.get();
    const tw = tabWidthMV.get();
    const prevGeom = lastGeomRef.current;
    const geomChanged =
      !prevGeom ||
      prevGeom.w !== w ||
      prevGeom.h !== bodyH ||
      prevGeom.tl !== tl ||
      prevGeom.tw !== tw;

    const geom = geomChanged
      ? buildSeamlessComposerPath({
          width: w,
          bodyHeight: bodyH,
          tabHeight: TAB_HEIGHT,
          tabLeft: tl,
          tabWidth: tw,
          cornerRadius: CORNER_RADIUS,
          shoulderWidth: SHOULDER_WIDTH,
        })
      : prevGeom.geom;

    if (geomChanged) {
      lastGeomRef.current = { w, h: bodyH, tl, tw, geom };
      if (crownAuraClipRef.current) {
        crownAuraClipRef.current.style.clipPath = `path('${geom.auraOutsetPath}')`;
      }
      if (crownRimRef.current) {
        crownRimRef.current.style.clipPath = `path('${geom.rimOutsetPath}')`;
      }
      const wave1Left = `${(geom.outsetPad + geom.tongueCenterX - 135).toFixed(2)}px`;
      const wave2Left = `${(geom.outsetPad + geom.tongueCenterX - 110).toFixed(2)}px`;
      if (crownAuraWave1Ref.current) {
        crownAuraWave1Ref.current.style.left = wave1Left;
      }
      if (crownAuraWave2Ref.current) {
        crownAuraWave2Ref.current.style.left = wave2Left;
      }
      if (crownRimWave1Ref.current) {
        crownRimWave1Ref.current.style.left = wave1Left;
      }
      if (crownRimWave2Ref.current) {
        crownRimWave2Ref.current.style.left = wave2Left;
      }
      if (baseFillPathRef.current) {
        baseFillPathRef.current.setAttribute("d", geom.fullPath);
      }
      if (washClipRef.current) {
        washClipRef.current.style.clipPath = `path('${geom.fullPath}')`;
        washClipRef.current.style.height = `${geom.totalHeight}px`;
      }
      if (rimBorderPathRef.current) {
        rimBorderPathRef.current.setAttribute("d", geom.fullPath);
      }
      if (topSpecRef.current) {
        topSpecRef.current.setAttribute("d", geom.topSpecularPath);
      }
      if (crownStrokeRef.current) {
        crownStrokeRef.current.setAttribute("d", geom.tongueCrownPath);
      }
      if (horBaseStrokeRef.current) {
        horBaseStrokeRef.current.setAttribute("d", geom.bottomHorizonPath);
      }
      if (horBlurStrokeRef.current) {
        horBlurStrokeRef.current.setAttribute("d", geom.bottomHorizonPath);
      }
      if (horStrokeRef.current) {
        horStrokeRef.current.setAttribute("d", geom.bottomHorizonPath);
      }
      if (composerCrestRef.current) {
        composerCrestRef.current.style.left = `${geom.plateauLeft.toFixed(2)}px`;
        composerCrestRef.current.style.width = `${geom.plateauWidth.toFixed(2)}px`;
      }
      if (slotPerchRef?.current) {
        slotPerchRef.current.style.left = `${geom.tongueCenterX.toFixed(2)}px`;
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("momo:slot-sync"));
        }
      }
    }

    // 03 Seamless Crest Corona (1.3px razor rim + 3.8px micro-aura inside 14px padded silhouette; zero top cut-off or input leak)
    const dictActive = isDictatingRef.current;
    const rawVoice =
      dictActive && formRef.current
        ? parseFloat(
            formRef.current.style.getPropertyValue("--crest-voice-level") ||
              "0",
          ) || 0
        : 0;
    const voiceBoost = dictActive ? clamp(rawVoice, 0, 1) : 0;
    const dictWaveBoost = dictActive ? 1 + voiceBoost * 0.65 : 0;
    const wave1X =
      Math.sin(rad * (dictActive ? 1.95 : 1.15)) *
      (10 + 16 * energy + 4 * hoverEnergy + 13 * dictWaveBoost);
    const wave1ScaleX =
      1.02 +
      Math.cos(rad * (dictActive ? 2.25 : 1.65)) *
        (0.04 + 0.08 * energy + 0.1 * dictWaveBoost);
    const wave2X =
      Math.sin(rad * (dictActive ? 1.55 : 0.9) + Math.PI) *
      (8 + 14 * energy + 3 * hoverEnergy + 10 * dictWaveBoost);

    const crownAuraOpacity = clamp(
      (isDark ? 0.3 : 0.22) +
        energy * (isDark ? 0.36 : 0.26) +
        restingHover * (isDark ? 0.22 : 0.16) +
        surgeEnergy * 0.14 +
        dictWaveBoost * (0.46 + 0.14 * Math.sin(rad * 2.4)),
      0,
      1,
    );
    const crownRimOpacity = clamp(
      (isDark ? 0.4 : 0.32) +
        energy * (isDark ? 0.5 : 0.42) +
        restingHover * (isDark ? 0.24 : 0.18) +
        dictWaveBoost * 0.34,
      0,
      1,
    );
    const crownStrokeOpacity = clamp(
      0.44 + energy * 0.44 + restingHover * 0.2 + dictWaveBoost * 0.32,
      0,
      1,
    );

    if (crownAuraRef.current) {
      crownAuraRef.current.style.opacity = crownAuraOpacity.toFixed(3);
    }
    if (crownRimRef.current) {
      crownRimRef.current.style.opacity = crownRimOpacity.toFixed(3);
    }
    const wave1Transform = `translate3d(${wave1X.toFixed(1)}px, 0, 0) scaleX(${wave1ScaleX.toFixed(3)})`;
    const wave2Transform = `translate3d(${wave2X.toFixed(1)}px, 0, 0)`;
    if (crownAuraWave1Ref.current) {
      crownAuraWave1Ref.current.style.transform = wave1Transform;
    }
    if (crownAuraWave2Ref.current) {
      crownAuraWave2Ref.current.style.transform = wave2Transform;
    }
    if (crownRimWave1Ref.current) {
      crownRimWave1Ref.current.style.transform = wave1Transform;
    }
    if (crownRimWave2Ref.current) {
      crownRimWave2Ref.current.style.transform = wave2Transform;
    }
    if (crownWashRef.current) {
      const washRx = 82 + Math.sin(rad * 1.6) * 10 * energy;
      const washRy = 18 + Math.cos(rad * 1.6) * 2 * energy;
      crownWashRef.current.style.opacity = clamp(
        (isDark ? 0.18 : 0.12) + energy * (isDark ? 0.22 : 0.14),
        0,
        1,
      ).toFixed(3);
      crownWashRef.current.style.background = `radial-gradient(${washRx.toFixed(1)}px ${washRy.toFixed(1)}px at ${(geom.tongueCenterX + wave1X * 0.3).toFixed(1)}px 2px, ${rgba(roleTheme.light, isDark ? 0.24 : 0.16)} 0%, ${rgba(roleTheme.base, isDark ? 0.08 : 0.05)} 54%, transparent 94%)`;
    }
    if (crownStrokeRef.current) {
      crownStrokeRef.current.setAttribute(
        "opacity",
        crownStrokeOpacity.toFixed(3),
      );
    }
    if (crownGradRef.current) {
      crownGradRef.current.setAttribute(
        "x1",
        (geom.tongueLeftX - 16 + wave1X * 0.35).toFixed(1),
      );
      crownGradRef.current.setAttribute(
        "x2",
        (geom.tongueRightX + 22 + wave1X * 0.35).toFixed(1),
      );
    }

    // 01 Solaris CNC Prism Bevel Edge (original subtle focused intensity + smooth progressive corner fade)
    const autoHorizonSweep = 0.5 + Math.sin(rad * 0.85) * 0.28 * horizonEnergy;
    const cursorRatio = smoothPointerX.get();
    const pointerRecentlyMoved =
      performance.now() - lastPointerActiveRef.current < 6500;
    const horizonRatio = isHoveredRef.current
      ? cursorRatio
      : pointerRecentlyMoved
        ? cursorRatio * 0.8 + autoHorizonSweep * 0.2
        : autoHorizonSweep;
    const bladeCenterX = w * horizonRatio;
    const pctNum = clamp(horizonRatio * 100, 0, 100);
    const bladePct = pctNum.toFixed(2);
    const focusBoost = 1 + 0.16 * surgeEnergy;

    if (horWashRef.current) {
      horWashRef.current.style.opacity = horizonEnergy.toFixed(3);
      if (horizonEnergy > 0.002) {
        horWashRef.current.style.background = `radial-gradient(30% 26px at ${bladePct}% 100%, ${rgba(roleTheme.core, (isDark ? 0.24 : 0.16) * focusBoost)} 0%, ${rgba(roleTheme.base, isDark ? 0.1 : 0.07)} 52%, transparent 96%)`;
      } else {
        horWashRef.current.style.background = "none";
      }
    }
    if (horGradRef.current) {
      horGradRef.current.setAttribute(
        "x1",
        (bladeCenterX - w * 0.26).toFixed(1),
      );
      horGradRef.current.setAttribute(
        "x2",
        (bladeCenterX + w * 0.26).toFixed(1),
      );
    }
    if (rimStopRef.current) {
      rimStopRef.current.setAttribute(
        "stop-color",
        rgba(
          isDark ? roleTheme.light : roleTheme.shade,
          0.12 + horizonEnergy * (isDark ? 0.36 : 0.28),
        ),
      );
    }
    if (horBaseStrokeRef.current) {
      horBaseStrokeRef.current.setAttribute(
        "opacity",
        (horizonEnergy * (isDark ? 0.26 : 0.2)).toFixed(3),
      );
    }
    if (horBlurStrokeRef.current) {
      horBlurStrokeRef.current.setAttribute(
        "opacity",
        (horizonEnergy * (isDark ? 0.34 : 0.24)).toFixed(3),
      );
    }
    if (horStrokeRef.current) {
      horStrokeRef.current.setAttribute("opacity", horizonEnergy.toFixed(3));
    }
    if (topSpecRef.current) {
      topSpecRef.current.setAttribute(
        "opacity",
        (0.2 + horizonEnergy * 0.45).toFixed(3),
      );
    }
  }, [
    dimensions.h,
    dimensions.w,
    focusEnergyMV,
    focusSurgeMV,
    hoverEnergyMV,
    isDark,
    roleTheme,
    smoothPointerX,
    tabLeftMV,
    tabWidthMV,
  ]);

  const latestOpticalRef = useRef(applyOpticalFrame);
  latestOpticalRef.current = applyOpticalFrame;

  useLayoutEffect(() => {
    idleSettledRef.current = false;
    latestOpticalRef.current();
  }, [applyOpticalFrame, isActivePose, isDark, roleTheme, snap.dictating]);

  const tickOpticalFrame = useCallback(
    (_: number, delta: number) => {
      const e = focusEnergyMV.get();
      const h = hoverEnergyMV.get();
      const s = focusSurgeMV.get();
      const d = isDictatingRef.current;
      const isIdle =
        !d &&
        e < 0.002 &&
        h < 0.002 &&
        s < 0.002 &&
        !tabWidthMV.isAnimating() &&
        !tabLeftMV.isAnimating();
      if (isIdle && idleSettledRef.current) {
        return;
      }
      const clampedDelta = Math.min(delta, 40);
      const speed = 0.012 + e * 0.105 + (d ? 0.115 : 0);
      phaseRef.current = (phaseRef.current + clampedDelta * speed) % 3600;
      latestOpticalRef.current();
      if (isIdle) {
        idleSettledRef.current = true;
      }
    },
    [focusEnergyMV, focusSurgeMV, hoverEnergyMV, tabLeftMV, tabWidthMV],
  );

  useAnimationFrame(tickOpticalFrame);

  const handlePointerMove = (e: React.PointerEvent<HTMLFormElement>) => {
    idleSettledRef.current = false;
    let rect = formRectRef.current;
    if (!rect.width) {
      const r = e.currentTarget.getBoundingClientRect();
      if (r.width) {
        formRectRef.current = { left: r.left, width: r.width };
        rect = formRectRef.current;
      }
    }
    if (!rect.width) return;
    pointerX.set(clamp((e.clientX - rect.left) / rect.width, 0, 1));
    lastPointerActiveRef.current = performance.now();
  };

  const handleFocusTextarea = () => {
    setIsFocused(true);
    if (!sentReturnLock) {
      triggerFocusSurge();
    }
  };

  // Only a real focus on the input raises the Crest to center. Focusing a
  // peaked card (or the hidden file input) must not re-layout the deck.
  const handleFocusForm = (e: React.FocusEvent<HTMLFormElement>) => {
    if ((e.target as HTMLElement | null) !== textareaRef.current) return;
    handleFocusTextarea();
  };

  const handlePointerDownForm = (e: React.PointerEvent<HTMLFormElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width) {
      pointerX.set(clamp((e.clientX - rect.left) / rect.width, 0, 1));
      lastPointerActiveRef.current = performance.now();
    }
    if (sentReturnLock) {
      setSentReturnLock(false);
      triggerFocusSurge();
    }
  };

  const handleBlurForm = (e: React.FocusEvent<HTMLFormElement>) => {
    if (e.relatedTarget && formRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsFocused(false);
    setSentReturnLock(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (snap.busy && onStop) {
      onStop();
      return;
    }
    if (snap.dictating) {
      onCancelDictation?.();
    }
    const trimmed = (textareaRef.current?.value ?? snap.inputValue).trim();
    if (!trimmed && !hasAttachments && !snap.busy) return;
    const outgoing = activeAttachments.slice();
    if (!controlledAttachments && outgoing.length > 0) {
      setLocalAttachments([]);
      localObjectUrlsRef.current.clear();
    }
    if (onSubmit) onSubmit(trimmed, outgoing.length > 0 ? outgoing : undefined);
    else bridge?.submitFromReact(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && (snap.dictating || hasDictateError)) {
      e.preventDefault();
      if (snap.dictating) onCancelDictation?.();
      if (hasDictateError) onDismissDictateError?.();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (
        (textareaRef.current?.value ?? snap.inputValue).trim() ||
        hasAttachments
      ) {
        formRef.current?.requestSubmit();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = e.clipboardData?.files;
    if (pastedFiles && pastedFiles.length > 0) {
      e.preventDefault();
      addFiles(pastedFiles);
    }
  };

  const isDotPulsing = snap.dictating || snap.busy;
  const isDotLit = isActivePose || isDotPulsing;
  const dotCore: [number, number, number] = snap.dictating
    ? [255, 232, 236]
    : hasDictateError
      ? [254, 205, 211]
      : roleTheme.core;
  const dotLight: [number, number, number] = snap.dictating
    ? [251, 113, 133]
    : hasDictateError
      ? [251, 113, 133]
      : roleTheme.light;
  const dotBase: [number, number, number] = snap.dictating
    ? [244, 63, 94]
    : hasDictateError
      ? [225, 29, 72]
      : roleTheme.base;
  const dotEdge: [number, number, number] = snap.dictating
    ? [225, 29, 72]
    : hasDictateError
      ? [190, 18, 60]
      : roleTheme.shade;

  const idleDotShadow = [
    `0 0 3px ${rgba(dotCore, isDark ? 0.9 : 0.78)}`,
    `0 0 7px ${rgba(dotLight, isDark ? 0.72 : 0.6)}`,
    `0 0 12px ${rgba(dotBase, isDark ? 0.52 : 0.44)}`,
  ].join(", ");
  const activeDotShadow = [
    `0 0 4px ${rgba(dotCore, isDark ? 1 : 0.94)}`,
    `0 0 9px ${rgba(dotLight, isDark ? 0.9 : 0.82)}`,
    `0 0 16px ${rgba(dotBase, isDark ? 0.72 : 0.62)}`,
  ].join(", ");
  const pulsePeakDotShadow = [
    `0 0 5px ${rgba(dotCore, 1)}`,
    `0 0 12px ${rgba(dotLight, isDark ? 0.98 : 0.9)}`,
    `0 0 22px ${rgba(dotBase, isDark ? 0.85 : 0.74)}`,
  ].join(", ");

  const pulseDuration = isDotPulsing
    ? snap.dictating
      ? 1.15
      : 1.45
    : isActivePose
      ? 1.9
      : 2.6;

  const crestDotNode = (
    <AnimatePresence mode="popLayout" initial={false}>
      {snap.dictating ? (
        <motion.span
          key="crest-voice-wave"
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.72, filter: "blur(3px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.72, filter: "blur(3px)" }}
          transition={{ duration: 0.2, ease: EASE_SEAMLESS }}
          className="relative inline-flex w-[11px] h-[10px] items-center justify-between shrink-0"
        >
          {[0, 1, 2].map((barIdx) => (
            <motion.span
              key={barIdx}
              aria-hidden="true"
              className="w-[2px] h-[9px] rounded-full origin-center"
              style={{
                background: `linear-gradient(180deg, ${rgba(dotCore, 1)} 0%, ${rgba(dotLight, 0.98)} 45%, ${rgba(dotBase, 0.96)} 100%)`,
                boxShadow: activeDotShadow,
              }}
              animate={
                prefersReducedMotion
                  ? { scaleY: barIdx === 1 ? 0.9 : 0.55 }
                  : {
                      scaleY:
                        barIdx === 1
                          ? [0.42, 1.08, 0.52, 0.95, 0.42]
                          : barIdx === 0
                            ? [0.35, 0.85, 0.4, 0.98, 0.35]
                            : [0.55, 0.38, 1.02, 0.44, 0.55],
                      opacity: [0.85, 1, 0.85],
                    }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0.2 }
                  : {
                      duration: 0.86,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: barIdx * 0.11,
                    }
              }
            />
          ))}
        </motion.span>
      ) : (
        <motion.span
          key="crest-status-dot"
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.72 }}
          transition={{ duration: 0.18, ease: EASE_SEAMLESS }}
          className="relative inline-flex w-[6px] h-[6px] items-center justify-center shrink-0"
        >
          <motion.span
            aria-hidden="true"
            initial={false}
            className="relative inline-block w-[6px] h-[6px] rounded-full"
            style={{
              background: `radial-gradient(circle at 36% 34%, ${rgba(dotCore, 1)} 0%, ${rgba(dotLight, isDotLit ? 0.98 : 0.92)} 42%, ${rgba(dotBase, isDotLit ? 0.95 : 0.88)} 76%, ${rgba(dotEdge, isDark ? 0.85 : 0.95)} 100%)`,
            }}
            animate={
              prefersReducedMotion
                ? {
                    scale: isDotLit ? 1.08 : 1,
                    opacity: isDotLit ? 1 : 0.92,
                    boxShadow: isDotLit ? activeDotShadow : idleDotShadow,
                  }
                : isDotPulsing
                  ? {
                      scale: [1, 1.28, 1],
                      opacity: [0.86, 1, 0.86],
                      boxShadow: [
                        activeDotShadow,
                        pulsePeakDotShadow,
                        activeDotShadow,
                      ],
                    }
                  : isActivePose
                    ? {
                        scale: [1.02, 1.22, 1.02],
                        opacity: [0.9, 1, 0.9],
                        boxShadow: [
                          activeDotShadow,
                          pulsePeakDotShadow,
                          activeDotShadow,
                        ],
                      }
                    : {
                        scale: [1, 1.16, 1],
                        opacity: [0.8, 1, 0.8],
                        boxShadow: [
                          idleDotShadow,
                          activeDotShadow,
                          idleDotShadow,
                        ],
                      }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.2 }
                : {
                    duration: pulseDuration,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          />
        </motion.span>
      )}
    </AnimatePresence>
  );

  return (
    <form
      ref={formCallbackRef}
      id="composer"
      style={{
        paddingTop: `${TAB_HEIGHT}px`,
        zIndex: crestMenuOpen ? 70 : undefined,
      }}
      className={`composer has-crest ${crestMenuOpen ? "is-model-menu-open" : ""} ${isActivePose ? "is-focused" : ""} ${snap.dictating ? "dictating is-dictating" : ""} ${hasDictateError ? "is-dictate-error" : ""} ${snap.busy ? "is-busy" : ""} ${dragActive ? "is-drag-over" : ""} relative isolate w-full select-none`}
      autoComplete="off"
      onPointerDown={handlePointerDownForm}
      onFocus={handleFocusForm}
      onBlur={handleBlurForm}
      onSubmit={handleSubmit}
      onPointerMove={handlePointerMove}
      onDragEnter={(e) => {
        if (e.dataTransfer?.types?.includes("Files")) {
          e.preventDefault();
          setDragActive(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes("Files")) {
          e.preventDefault();
          if (!dragActive) setDragActive(true);
        }
      }}
      onDragLeave={(e) => {
        if (
          !e.relatedTarget ||
          !e.currentTarget.contains(e.relatedTarget as Node)
        ) {
          setDragActive(false);
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer?.files?.length) {
          e.preventDefault();
          setDragActive(false);
          addFiles(e.dataTransfer.files);
        } else {
          setDragActive(false);
        }
      }}
      onPointerEnter={(e) => {
        isHoveredRef.current = true;
        hoverCtrlRef.current?.stop();
        hoverCtrlRef.current = animate(hoverEnergyMV, 1, {
          duration: 0.24,
          ease: EASE_HOVER_GLOW,
        });
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width) {
          pointerX.set(clamp((e.clientX - rect.left) / rect.width, 0, 1));
          lastPointerActiveRef.current = performance.now();
        }
      }}
      onPointerLeave={() => {
        isHoveredRef.current = false;
        hoverCtrlRef.current?.stop();
        hoverCtrlRef.current = animate(hoverEnergyMV, 0, {
          duration: 0.26,
          ease: EASE_HOVER_GLOW,
        });
        if (!isActivePose) {
          pointerX.set(0.5);
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.csv,.json,.ics,audio/*"
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            addFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* Hidden Ghost Sizer — instant target width measurement (includes 6px dot + 6px gap) before blur exit finishes */}
      <span
        ref={ghostTextCallbackRef}
        aria-hidden="true"
        className="pointer-events-none invisible fixed -top-96 left-0 inline-flex items-center whitespace-nowrap text-[10.5px] font-semibold tracking-[0.015em]"
        style={{
          fontFamily: 'var(--font-space-grotesk), "Space Grotesk", var(--font)',
        }}
      >
        <span
          className={`inline-block h-[6px] shrink-0 mr-[6px] ${snap.dictating ? "w-[11px]" : "w-[6px]"}`}
        />
        {crestLabel}
        {hasCrestActionBtn ? (
          <span className="inline-block w-[19px] h-[14px] shrink-0" />
        ) : (
          <span className="inline-block w-[14px] h-[12px] shrink-0" />
        )}
      </span>

      {/* Pin-UI Peaked Card Deck: 4 picker cards always stay; uploaded files stack
          per card (foto -> Foto, catatan -> Catatan, dst) and fan upward on hover */}
      <PeakedAttachmentFan
        attachments={activeAttachments}
        deckWidth={dimensions.w}
        tabHeight={TAB_HEIGHT}
        shoulderWidth={SHOULDER_WIDTH}
        tabLeftMV={tabLeftMV}
        tabWidthMV={tabWidthMV}
        isActivePose={isActivePose}
        isDark={isDark}
        onPickAccept={openFilePicker}
        onRemove={removeAttachmentById}
      />

      {/* Active & Resting Avatar Perch — tracks the moving Crest plateau seamlessly */}
      <div
        ref={slotPerchRef}
        className="hero-slot perch"
        id="slotPerch"
        style={{ left: `${geometry.tongueCenterX}px` }}
      />

      {/* =====================================================================
          03 SEAMLESS CREST CORONA (Left -> Center Role-Tinted Rim + Micro-Aura)
          Uses padded 14px silhouette outsets (2.4px @ blur(3.8px) + 1.3px razor rim)
          so top glow never clips and zero fog spills down into the input field.
          Focus 01 CNC Prism Bevel renders inline along bottomHorizonPath SVG.
         ===================================================================== */}
      <div
        ref={crownAuraRef}
        aria-hidden="true"
        style={{
          left: `-${geometry.outsetPad}px`,
          top: `-${geometry.outsetPad}px`,
          width: `${dimensions.w + geometry.outsetPad * 2}px`,
          height: `${geometry.totalHeight + geometry.outsetPad * 2}px`,
          filter: snap.dictating
            ? `blur(5.6px) drop-shadow(0 0 14px ${rgba([244, 63, 94], isDark ? 0.72 : 0.5)})`
            : "blur(3.8px)",
        }}
        className="pointer-events-none absolute z-0 gpu-smooth"
      >
        <div
          ref={crownAuraClipRef}
          style={{
            width: "100%",
            height: "100%",
            clipPath: `path('${geometry.auraOutsetPath}')`,
            WebkitMaskImage: `linear-gradient(180deg, #000 0%, #000 ${geometry.outsetPad + TAB_HEIGHT + 4}px, transparent ${geometry.outsetPad + TAB_HEIGHT + 20}px)`,
            maskImage: `linear-gradient(180deg, #000 0%, #000 ${geometry.outsetPad + TAB_HEIGHT + 4}px, transparent ${geometry.outsetPad + TAB_HEIGHT + 20}px)`,
          }}
          className="relative overflow-hidden"
        >
          <div
            ref={crownAuraWave1Ref}
            style={{
              left: `${geometry.outsetPad + geometry.tongueCenterX - 135}px`,
              top: 0,
              width: "270px",
              height: `${geometry.outsetPad + TAB_HEIGHT + 22}px`,
              background: `radial-gradient(48% 78% at 50% 24%, ${rgba(roleTheme.core, isDark ? 0.96 : 0.72)} 0%, ${rgba(roleTheme.light, isDark ? 0.72 : 0.54)} 42%, ${rgba(roleTheme.base, isDark ? 0.42 : 0.34)} 68%, ${rgba(roleTheme.base, 0)} 96%)`,
            }}
            className="absolute gpu-smooth"
          />
          <div
            ref={crownAuraWave2Ref}
            style={{
              left: `${geometry.outsetPad + geometry.tongueCenterX - 110}px`,
              top: 0,
              width: "220px",
              height: `${geometry.outsetPad + TAB_HEIGHT + 18}px`,
              background: `radial-gradient(46% 75% at 50% 22%, ${rgba(roleTheme.core, isDark ? 0.98 : 0.78)} 0%, ${rgba(roleTheme.wingRight, isDark ? 0.62 : 0.42)} 48%, ${rgba(roleTheme.base, 0)} 96%)`,
            }}
            className="absolute gpu-smooth"
          />
        </div>
      </div>

      {/* Layer B: 0px Blur Razor-Sharp 1.3px Zenith Tongue Corona Rim */}
      <div
        ref={crownRimRef}
        aria-hidden="true"
        style={{
          left: `-${geometry.outsetPad}px`,
          top: `-${geometry.outsetPad}px`,
          width: `${dimensions.w + geometry.outsetPad * 2}px`,
          height: `${geometry.totalHeight + geometry.outsetPad * 2}px`,
          clipPath: `path('${geometry.rimOutsetPath}')`,
          WebkitMaskImage: `linear-gradient(180deg, #000 0%, #000 ${geometry.outsetPad + TAB_HEIGHT + 2}px, transparent ${geometry.outsetPad + TAB_HEIGHT + 16}px)`,
          maskImage: `linear-gradient(180deg, #000 0%, #000 ${geometry.outsetPad + TAB_HEIGHT + 2}px, transparent ${geometry.outsetPad + TAB_HEIGHT + 16}px)`,
        }}
        className="pointer-events-none absolute z-[1] overflow-hidden gpu-smooth"
      >
        <div
          ref={crownRimWave1Ref}
          style={{
            left: `${geometry.outsetPad + geometry.tongueCenterX - 135}px`,
            top: 0,
            width: "270px",
            height: `${geometry.outsetPad + TAB_HEIGHT + 20}px`,
            background: `radial-gradient(48% 78% at 50% 24%, ${rgba(roleTheme.core, isDark ? 1 : 0.88)} 0%, ${rgba(roleTheme.light, isDark ? 0.82 : 0.68)} 44%, ${rgba(roleTheme.base, isDark ? 0.48 : 0.4)} 72%, ${rgba(roleTheme.base, 0)} 96%)`,
          }}
          className="absolute gpu-smooth"
        />
        <div
          ref={crownRimWave2Ref}
          style={{
            left: `${geometry.outsetPad + geometry.tongueCenterX - 110}px`,
            top: 0,
            width: "220px",
            height: `${geometry.outsetPad + TAB_HEIGHT + 16}px`,
            background: `radial-gradient(46% 75% at 50% 22%, ${rgba(roleTheme.core, isDark ? 1 : 0.9)} 0%, ${rgba(roleTheme.wingLeft, isDark ? 0.72 : 0.56)} 50%, ${rgba(roleTheme.base, 0)} 96%)`,
          }}
          className="absolute gpu-smooth"
        />
      </div>

      {/* Subtle Elevation Shadow below crest */}
      <div
        aria-hidden="true"
        style={{
          top: `${TAB_HEIGHT + 1}px`,
          bottom: "1px",
          left: "1px",
          right: "1px",
          borderRadius: `${CORNER_RADIUS - 1}px`,
          boxShadow: "var(--cmp-shadow)",
        }}
        className="pointer-events-none absolute z-[1]"
      />

      {/* Base SVG Chassis */}
      <svg
        aria-hidden="true"
        width={dimensions.w}
        height={geometry.totalHeight}
        viewBox={`0 0 ${dimensions.w} ${geometry.totalHeight}`}
        shapeRendering="geometricPrecision"
        style={{
          left: 0,
          top: 0,
          width: `${dimensions.w}px`,
          height: `${geometry.totalHeight}px`,
        }}
        className="pointer-events-none absolute z-[2] overflow-visible"
      >
        <defs>
          <linearGradient id={`fill-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "var(--cmp-fill-1)" }} />
            <stop offset="42%" style={{ stopColor: "var(--cmp-fill-2)" }} />
            <stop offset="100%" style={{ stopColor: "var(--cmp-fill-3)" }} />
          </linearGradient>

          <linearGradient
            id={`top-spec-${uid}`}
            x1="0"
            y1="0"
            x2={dimensions.w}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="14%" style={{ stopColor: "var(--cmp-spec-edge)" }} />
            <stop offset="50%" style={{ stopColor: "var(--cmp-spec-peak)" }} />
            <stop offset="86%" style={{ stopColor: "var(--cmp-spec-edge)" }} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "var(--cmp-rim-1)" }} />
            <stop offset="62%" style={{ stopColor: "var(--cmp-rim-2)" }} />
            <stop
              ref={rimStopRef}
              offset="100%"
              stopColor={rgba(
                isDark ? roleTheme.light : roleTheme.shade,
                isActivePose ? (isDark ? 0.48 : 0.4) : 0.12,
              )}
            />
          </linearGradient>

          <linearGradient
            id={`blade-base-${uid}`}
            x1="0"
            y1="0"
            x2={dimensions.w}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={rgba(roleTheme.wingLeft, 0)} />
            <stop offset="6%" stopColor={rgba(roleTheme.wingLeft, 0.24)} />
            <stop offset="50%" stopColor={rgba(roleTheme.light, 0.72)} />
            <stop offset="94%" stopColor={rgba(roleTheme.wingRight, 0.24)} />
            <stop offset="100%" stopColor={rgba(roleTheme.wingRight, 0)} />
          </linearGradient>

          <linearGradient
            ref={horGradRef}
            id={`blade-core-${uid}`}
            x1="0"
            y1="0"
            x2={dimensions.w}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={rgba(roleTheme.wingLeft, 0)} />
            <stop offset="22%" stopColor={rgba(roleTheme.wingLeft, 0.65)} />
            <stop
              offset="44%"
              stopColor={isDark ? roleTheme.lightHex : roleTheme.baseHex}
            />
            <stop
              offset="50%"
              stopColor={isDark ? roleTheme.coreHex : roleTheme.deepHex}
            />
            <stop
              offset="56%"
              stopColor={isDark ? roleTheme.baseHex : roleTheme.shadeHex}
            />
            <stop offset="78%" stopColor={rgba(roleTheme.wingRight, 0.68)} />
            <stop offset="100%" stopColor={rgba(roleTheme.wingRight, 0)} />
          </linearGradient>

          <linearGradient
            ref={crownGradRef}
            id={`crown-core-${uid}`}
            x1={geometry.tongueLeftX - 18}
            y1="0"
            x2={geometry.tongueRightX + 28}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={rgba(roleTheme.base, 0)} />
            <stop
              offset="20%"
              stopColor={isDark ? roleTheme.baseHex : roleTheme.shadeHex}
            />
            <stop
              offset="48%"
              stopColor={isDark ? roleTheme.coreHex : roleTheme.deepHex}
            />
            <stop offset="76%" stopColor={roleTheme.wingRightHex} />
            <stop offset="100%" stopColor={rgba(roleTheme.wingRight, 0)} />
          </linearGradient>
        </defs>

        <path
          ref={baseFillPathRef}
          d={geometry.fullPath}
          fill={`url(#fill-${uid})`}
        />
      </svg>

      {/* GPU-Clipped Internal Volumetric Washes (03 top vs 01 bottom) */}
      <div
        ref={washClipRef}
        aria-hidden="true"
        style={{
          left: 0,
          top: 0,
          width: `${dimensions.w}px`,
          height: `${geometry.totalHeight}px`,
          clipPath: `path('${geometry.fullPath}')`,
        }}
        className="pointer-events-none absolute z-[3] overflow-hidden gpu-smooth"
      >
        <div ref={crownWashRef} className="absolute inset-0" />
        <div ref={horWashRef} className="absolute inset-0" />
      </div>

      {/* Crisp Seamless Vector Border Overlay */}
      <svg
        aria-hidden="true"
        width={dimensions.w + 4}
        height={geometry.totalHeight + 4}
        viewBox={`-2 -2 ${dimensions.w + 4} ${geometry.totalHeight + 4}`}
        shapeRendering="geometricPrecision"
        style={{
          left: "-2px",
          top: "-2px",
          width: `${dimensions.w + 4}px`,
          height: `${geometry.totalHeight + 4}px`,
        }}
        className="pointer-events-none absolute z-[4] overflow-visible"
      >
        <defs>
          <linearGradient
            id={`horizon-edge-mask-grad-${uid}`}
            x1="0"
            y1={Math.max(0, geometry.totalHeight - CORNER_RADIUS)}
            x2="0"
            y2={geometry.totalHeight}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#000000" />
            <stop offset="35%" stopColor="#262626" />
            <stop offset="68%" stopColor="#808080" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          <mask
            id={`horizon-edge-mask-${uid}`}
            maskUnits="userSpaceOnUse"
            x={-28}
            y={-18}
            width={dimensions.w + 56}
            height={geometry.totalHeight + 44}
          >
            <rect
              x={-28}
              y={-18}
              width={dimensions.w + 56}
              height={geometry.totalHeight + 44}
              fill={`url(#horizon-edge-mask-grad-${uid})`}
            />
          </mask>
        </defs>
        <path
          ref={rimBorderPathRef}
          d={geometry.fullPath}
          fill="none"
          stroke={`url(#rim-${uid})`}
          strokeWidth={1.15}
        />
        <path
          ref={topSpecRef}
          d={geometry.topSpecularPath}
          fill="none"
          stroke={`url(#top-spec-${uid})`}
          strokeWidth={1}
          opacity={0.2}
        />
        <path
          ref={crownStrokeRef}
          d={geometry.tongueCrownPath}
          fill="none"
          stroke={`url(#crown-core-${uid})`}
          strokeWidth={snap.dictating ? 2.25 : 1.6}
          strokeLinecap="round"
        />
        <path
          ref={horBaseStrokeRef}
          d={geometry.bottomHorizonPath}
          fill="none"
          stroke={`url(#blade-base-${uid})`}
          strokeWidth={1.1}
          strokeLinecap="round"
          mask={`url(#horizon-edge-mask-${uid})`}
          opacity={0}
        />
        <path
          ref={horBlurStrokeRef}
          d={geometry.bottomHorizonPath}
          fill="none"
          stroke={`url(#blade-core-${uid})`}
          strokeWidth={4.8}
          strokeLinecap="round"
          mask={`url(#horizon-edge-mask-${uid})`}
          style={{ filter: "blur(3.5px)" }}
          opacity={0}
        />
        <path
          ref={horStrokeRef}
          d={geometry.bottomHorizonPath}
          fill="none"
          stroke={`url(#blade-core-${uid})`}
          strokeWidth={1.5}
          strokeLinecap="round"
          mask={`url(#horizon-edge-mask-${uid})`}
          opacity={0}
        />
      </svg>

      {/* =====================================================================
          1. INTEGRATED TOP-LEFT CORNER CREST (Model & Reasoning Switcher)
         ===================================================================== */}
      <div
        ref={(el) => {
          composerCrestRef.current = el;
          crestMenuWrapRef.current = el;
        }}
        style={{
          left: `${geometry.plateauLeft}px`,
          width: `${geometry.plateauWidth}px`,
          top: "1px",
          height: `${TAB_HEIGHT}px`,
          zIndex: crestMenuOpen ? 90 : 14,
        }}
        className="composer-crest pointer-events-auto absolute flex items-center justify-center gap-[5px] overflow-visible select-none"
      >
        <AnimatePresence>
          {crestMenuOpen && (
            <motion.div
              key="composer-crest-model-menu"
              data-composer-model-popover="true"
              className="momo-crest-model-pop"
              style={
                {
                  "--crest-role-accent": roleTheme.baseHex,
                  "--crest-role-deep": roleTheme.deepHex,
                  "--crest-role-light": roleTheme.lightHex,
                } as React.CSSProperties
              }
              initial={{ opacity: 0, y: 8, scale: 0.94, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 6, scale: 0.95, filter: "blur(5px)" }}
              transition={{
                type: "spring",
                stiffness: 480,
                damping: 32,
                mass: 0.78,
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="momo-crest-model-list">
                {MOMO_MODEL_CATALOG.map((m) => {
                  const isSel = m.id === activeModelMeta.id;
                  const hasReasoning = m.reasoningMode !== "none";
                  const itemEffort: ReasoningEffort = isSel
                    ? effectiveEffort
                    : m.defaultEffort;
                  return (
                    <div
                      key={m.id}
                      data-model-item-wrap={m.id}
                      className={`momo-crest-model-item${isSel ? " is-selected" : ""}`}
                    >
                      <div className="momo-crest-model-row">
                        <button
                          type="button"
                          data-model-option={m.id}
                          className="momo-crest-model-row-btn"
                          onClick={() => {
                            if (isSel) {
                              if (hasReasoning) {
                                setReasoningExpanded((prev) => !prev);
                              }
                            } else {
                              onSelectModel?.(m.id);
                              if (!hasReasoning) updateCrestMenuOpen(false);
                            }
                          }}
                        >
                          <span className="momo-crest-m-ico">
                            <ModelBrandIcon
                              brand={m.brand}
                              size={17}
                              active={isSel}
                            />
                          </span>
                          <span className="momo-crest-m-copy">
                            <strong>{m.label}</strong>
                            <small>{m.description}</small>
                          </span>
                        </button>
                        {hasReasoning && (
                          <button
                            type="button"
                            data-reasoning-toggle={m.id}
                            aria-expanded={isSel && reasoningExpanded}
                            className={`momo-crest-reason-chip${isSel && effectiveEffort !== "off" ? " is-on" : ""}${isSel && reasoningExpanded ? " is-expanded" : ""}`}
                            title="Atur Thinking Effort"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSel) {
                                onSelectModel?.(m.id);
                                setReasoningExpanded(true);
                              } else {
                                setReasoningExpanded((prev) => !prev);
                              }
                            }}
                          >
                            <ReasoningMotionIcon
                              effort={isSel ? itemEffort : m.defaultEffort}
                              size={12}
                            />
                            <span className="momo-crest-reason-label">
                              {getEffortShortLabel(itemEffort)}
                            </span>
                            <motion.svg
                              width="9"
                              height="9"
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                              animate={{
                                rotate: isSel && reasoningExpanded ? 180 : 0,
                              }}
                              transition={{
                                duration: 0.2,
                                ease: EASE_SEAMLESS,
                              }}
                              style={{ opacity: 0.72, flexShrink: 0 }}
                            >
                              <path d="m3 4.5 3 3 3-3" />
                            </motion.svg>
                          </button>
                        )}
                      </div>

                      {isSel && hasReasoning && (
                        <motion.div
                          key={`reason-drawer-${m.id}`}
                          data-model-reasoning-drawer={m.id}
                          className="momo-crest-item-drawer"
                          initial={false}
                          animate={{
                            height: reasoningExpanded ? "auto" : 0,
                            opacity: reasoningExpanded ? 1 : 0,
                          }}
                          transition={{
                            duration: prefersReducedMotion ? 0 : 0.25,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{ overflow: "hidden" }}
                        >
                          <motion.div
                            className="momo-crest-item-drawer-inner"
                            aria-hidden={!reasoningExpanded}
                            initial={false}
                            animate={{
                              y: reasoningExpanded ? 0 : -4,
                              scale: reasoningExpanded ? 1 : 0.985,
                            }}
                            transition={{
                              duration: prefersReducedMotion ? 0 : 0.25,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            style={{
                              pointerEvents: reasoningExpanded
                                ? "auto"
                                : "none",
                            }}
                          >
                            <ReasoningEffortSlider
                              levels={m.reasoningLevels}
                              effectiveEffort={effectiveEffort}
                              accentRgb={roleTheme.base}
                              expanded={reasoningExpanded}
                              reducedMotion={Boolean(prefersReducedMotion)}
                              onChange={(lvl) => onChangeReasoningEffort?.(lvl)}
                            />
                          </motion.div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          data-composer-model-crest="true"
          aria-expanded={crestMenuOpen}
          aria-haspopup="dialog"
          title="Pilih Model & Toggle Reasoning"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setCrestMenuOpen((o) => !o);
          }}
          className="inline-flex h-full items-center justify-center gap-[5px] bg-transparent border-0 p-0 cursor-pointer"
        >
          <AnimatePresence>
            {snap.dictating && (
              <motion.span
                key="crest-dictate-wave-halo"
                aria-hidden="true"
                initial={{ opacity: 0, scaleX: 0.72, scaleY: 0.85 }}
                animate={
                  prefersReducedMotion
                    ? { opacity: isDark ? 0.78 : 0.56, scaleX: 1, scaleY: 1 }
                    : {
                        opacity: isDark ? [0.64, 1, 0.64] : [0.46, 0.84, 0.46],
                        scaleX: [0.9, 1.18, 0.9],
                        scaleY: [0.92, 1.16, 0.92],
                      }
                }
                exit={{ opacity: 0, scaleX: 0.72, scaleY: 0.85 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0.2 }
                    : { duration: 1.15, repeat: Infinity, ease: "easeInOut" }
                }
                style={{
                  background: `radial-gradient(66% 92% at 50% 42%, ${rgba([251, 113, 133], isDark ? 0.62 : 0.38)} 0%, ${rgba([244, 63, 94], isDark ? 0.34 : 0.22)} 48%, ${rgba([225, 29, 72], isDark ? 0.14 : 0.08)} 72%, transparent 96%)`,
                  boxShadow: `0 0 18px 2px ${rgba([244, 63, 94], isDark ? 0.52 : 0.32)}`,
                  filter: "blur(5.5px)",
                }}
                className="pointer-events-none absolute -inset-x-4 -inset-y-1.5 rounded-full"
              />
            )}
          </AnimatePresence>
          {crestDotNode}
          <StaggeredBlurText
            text={crestLabel}
            shimmer={isDotPulsing}
            align="center"
            staggerIn={0.016}
            staggerOut={0.01}
            delayIn={0.016}
            blurPx={5}
            yOffset={4}
            durationIn={0.22}
            durationOut={0.16}
            style={
              {
                fontFamily:
                  'var(--font-space-grotesk), "Space Grotesk", var(--font)',
                color: snap.dictating
                  ? isDark
                    ? "#ffe4e6"
                    : "#be123c"
                  : hasDictateError
                    ? isDark
                      ? "#fda4af"
                      : "#be123c"
                    : isDotLit
                      ? "var(--cmp-crest-active)"
                      : "var(--cmp-crest-idle)",
                "--shimmer-base": isDark
                  ? roleTheme.lightHex
                  : roleTheme.deepHex,
                "--shimmer-peak": isDark ? "#ffffff" : roleTheme.baseHex,
              } as React.CSSProperties
            }
            className="relative z-[1] text-[10.5px] font-semibold tracking-[0.015em] whitespace-nowrap"
          />
          {!hasCrestActionBtn && (
            <motion.svg
              width="9"
              height="9"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              animate={{ rotate: crestMenuOpen ? 180 : 0 }}
              transition={{ duration: 0.2, ease: EASE_SEAMLESS }}
              style={{ opacity: 0.65, color: "var(--cmp-crest-active)" }}
            >
              <path d="m3 4.5 3 3 3-3" />
            </motion.svg>
          )}
        </button>
        <AnimatePresence>
          {hasCrestActionBtn && (
            <motion.button
              key="crest-dictate-cleanup"
              type="button"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              whileTap={{ scale: 0.88 }}
              transition={{ duration: 0.16, ease: EASE_SEAMLESS }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (snap.dictating) {
                  if (onCancelDictation) onCancelDictation();
                  else onToggleMic?.();
                } else {
                  onDismissDictateError?.();
                }
              }}
              aria-label={
                snap.dictating ? "Hentikan dikte" : "Tutup info dikte"
              }
              data-tip={snap.dictating ? "Hentikan dikte" : "Tutup info dikte"}
              style={
                snap.dictating
                  ? {
                      border: "1px solid transparent",
                      background: isDark
                        ? "linear-gradient(180deg, rgba(244, 63, 94, 0.34), rgba(159, 18, 57, 0.28)) padding-box, linear-gradient(180deg, rgba(251, 113, 133, 0.45), rgba(225, 29, 72, 0.18)) border-box"
                        : "linear-gradient(180deg, rgba(244, 63, 94, 0.18), rgba(225, 29, 72, 0.12)) padding-box, linear-gradient(180deg, rgba(244, 63, 94, 0.38), rgba(225, 29, 72, 0.14)) border-box",
                      color: isDark ? "#ffe4e6" : "#be123c",
                    }
                  : {
                      border: "1px solid transparent",
                      background: "var(--m3-plate-idle)",
                      color: isDark ? "#f4f4f6" : "#1c1e24",
                    }
              }
              className="pointer-events-auto relative z-[2] inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full cursor-pointer"
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* =====================================================================
          2. MAIN COMPOSER DECK: ATTACHMENT CHIP + TEXTAREA (.sc) + CNC ROCKER WELL
         ===================================================================== */}
      <div
        ref={deckCallbackRef}
        className="relative z-10 flex w-full items-end gap-2 pl-[16px] pr-[5px] pt-[8px] pb-[6px]"
      >
        <div className="relative z-10 flex flex-1 min-w-0 items-end gap-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {attachmentChipSummary && (
              <motion.div
                key="attachment-chip-badge"
                data-attachment-chip="true"
                role="group"
                initial={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: -18, scale: 0.9 }
                }
                animate={
                  prefersReducedMotion
                    ? { opacity: 1 }
                    : { opacity: 1, x: 0, scale: 1 }
                }
                exit={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: -14, scale: 0.9 }
                }
                transition={{
                  type: "spring",
                  stiffness: 460,
                  damping: 32,
                  mass: 0.8,
                }}
                title={activeAttachments.map((a) => a.name).join(", ")}
                aria-label={`${attachmentChipSummary.countLabel} terlampir (${attachmentChipSummary.formatsLabel})`}
                style={{
                  color: isDark ? "#f4f4f5" : "#18181b",
                  background: isDark
                    ? `linear-gradient(180deg, ${rgba(roleTheme.base, 0.24)} 0%, rgba(36, 39, 51, 0.94) 100%)`
                    : `linear-gradient(180deg, ${rgba(roleTheme.base, 0.14)} 0%, #f5f7fc 100%)`,
                  boxShadow: isDark
                    ? "0 2px 6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12)"
                    : "0 1px 3px rgba(15, 23, 42, 0.08), inset 0 1px 0 #ffffff",
                }}
                className="mb-[6px] inline-flex h-[28px] max-w-[170px] sm:max-w-[230px] shrink-0 select-none items-center gap-1.5 rounded-full pl-1 pr-2.5 text-[11.5px] font-semibold tracking-tight"
              >
                <motion.button
                  type="button"
                  data-attachment-chip-add="true"
                  onClick={() => openFilePicker("*/*")}
                  disabled={
                    activeAttachments.length >= MAX_COMPOSER_ATTACHMENTS
                  }
                  whileTap={
                    activeAttachments.length < MAX_COMPOSER_ATTACHMENTS
                      ? { scale: 0.86 }
                      : undefined
                  }
                  aria-label="Tambah file lagi"
                  title={
                    activeAttachments.length < MAX_COMPOSER_ATTACHMENTS
                      ? "Tambah file lagi"
                      : "Maks 5 file"
                  }
                  style={{
                    background: isDark
                      ? `linear-gradient(180deg, ${rgba(roleTheme.light, 0.9)} 0%, ${rgba(roleTheme.base, 0.95)} 100%)`
                      : `linear-gradient(180deg, ${rgba(roleTheme.light, 0.55)} 0%, ${rgba(roleTheme.base, 0.9)} 100%)`,
                    boxShadow: isDark
                      ? "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 1px rgba(0,0,0,0.28), 0 1px 2px rgba(0,0,0,0.4)"
                      : "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 1px rgba(15,23,42,0.12), 0 1px 2px rgba(15,23,42,0.18)",
                    color: "#ffffff",
                    textShadow: isDark
                      ? "0 1px 1px rgba(0,0,0,0.35)"
                      : "0 1px 1px rgba(15,23,42,0.22)",
                  }}
                  className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full ${
                    activeAttachments.length >= MAX_COMPOSER_ATTACHMENTS
                      ? "cursor-default opacity-55"
                      : "cursor-pointer"
                  }`}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                    className="block"
                  >
                    <path d="M6 2.4V9.6M2.4 6H9.6" />
                  </svg>
                </motion.button>
                <span className="truncate">{attachmentChipSummary.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            layout="position"
            transition={
              prefersReducedMotion
                ? { duration: 0.1 }
                : { type: "spring", stiffness: 430, damping: 34, mass: 0.85 }
            }
            className="composer-input-wrap relative flex-1 min-w-0"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {!snap.inputValue && (
                <motion.div
                  key="animated-placeholder-stage"
                  initial={{ opacity: 0, filter: "blur(6px)", y: 3 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0, filter: "blur(6px)", y: -3 }}
                  transition={{ duration: 0.42, ease: EASE_SEAMLESS }}
                  aria-hidden="true"
                  style={{ color: "var(--cmp-placeholder)" }}
                  className="pointer-events-none absolute -inset-y-2 -left-2.5 right-0 pl-2.5 flex items-center text-[15px] overflow-x-clip whitespace-nowrap"
                >
                  <StaggeredBlurText
                    text={activeSuggestion}
                    staggerIn={0.032}
                    staggerOut={0.018}
                    delayIn={0.04}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <textarea
              ref={textareaRef}
              id="input"
              style={{ color: "var(--cmp-text)" }}
              className="sc relative z-10 block w-full py-[9px] text-[15px] placeholder:text-transparent"
              rows={1}
              value={snap.inputValue}
              onChange={(e) => {
                if (sentReturnLock) setSentReturnLock(false);
                if (onInputChange) onInputChange(e.target.value);
                else bridge?.pushInputFromReact(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={snap.placeholder}
              aria-label={`Pesan untuk ${snap.botName}`}
              enterKeyHint="send"
            />
          </motion.div>
        </div>

        {/* OPTION 01: CONCENTRIC SPLIT ROCKER WELL matching 01-skeuo-ui Porcelain/Charcoal keycaps */}
        <div
          style={{
            backgroundColor: "var(--cmp-well-bg)",
            boxShadow:
              hasText || hasAttachments || snap.busy || snap.dictating
                ? isDark
                  ? `inset 0 1.5px 3px rgba(0,0,0,0.82), inset 0 0 0 1px ${rgba(roleTheme.base, 0.24)}, 0 1px 0 rgba(255,255,255,0.06)`
                  : `inset 0 1.5px 2.5px rgba(0,0,0,0.085), inset 0 0 0 1px ${rgba(roleTheme.shade, 0.24)}, 0 1px 0 #ffffff`
                : "var(--cmp-well-shadow)",
          }}
          className="composer-tools relative z-10 flex items-center rounded-l-[10px] rounded-r-[15px] p-[2px] shrink-0"
        >
          <motion.button
            type="button"
            id="mic"
            hidden={!speechSupported}
            onClick={onToggleMic}
            className={`mic relative z-10 h-[36px] w-[35px] min-w-[35px] items-center justify-center rounded-l-[7px] rounded-r-[4px] cursor-pointer ${
              speechSupported ? "flex" : "hidden"
            }`}
            aria-label="Dikte"
            aria-pressed={snap.dictating}
            data-tip={snap.dictating ? "Hentikan Dikte" : "Dikte"}
            whileTap={{ scale: 0.93 }}
            style={
              snap.dictating
                ? isDark
                  ? {
                      color: roleTheme.coreHex,
                      border: "1px solid transparent",
                      background:
                        "linear-gradient(180deg, rgba(244, 63, 94, 0.24) 0%, rgba(190, 18, 60, 0.16) 100%) padding-box, linear-gradient(180deg, rgba(251, 113, 133, 0.45), rgba(225, 29, 72, 0.16)) border-box",
                      boxShadow:
                        "var(--m3-plate-act-in), 0 0 12px rgba(244, 63, 94, 0.28)",
                    }
                  : {
                      color: "#be123c",
                      border: "1px solid transparent",
                      background:
                        "linear-gradient(180deg, rgba(244, 63, 94, 0.18) 0%, rgba(225, 29, 72, 0.1) 100%) padding-box, linear-gradient(180deg, rgba(244, 63, 94, 0.32), rgba(225, 29, 72, 0.12)) border-box",
                      boxShadow:
                        "inset 0 1.5px 3px rgba(190, 18, 60, 0.12), 0 0 10px rgba(244, 63, 94, 0.18)",
                    }
                : {
                    color: "var(--cmp-key-muted)",
                    background: "var(--cmp-key-bg)",
                    boxShadow: "var(--cmp-key-shadow)",
                  }
            }
          >
            <MicSvg className="w-[17px] h-[17px]" />
          </motion.button>

          {speechSupported && (
            <div
              aria-hidden="true"
              style={{
                background: "var(--cmp-divider)",
              }}
              className="relative z-10 mx-[2px] h-5 w-px shrink-0"
            />
          )}

          <motion.button
            type="submit"
            id="send"
            disabled={!hasText && !hasAttachments && !snap.busy}
            aria-label={snap.busy ? "Hentikan" : "Kirim"}
            data-tip={snap.busy ? "Hentikan" : "Kirim"}
            whileTap={
              hasText || hasAttachments || snap.busy
                ? { scale: 0.94 }
                : undefined
            }
            style={
              hasText || hasAttachments || snap.busy
                ? isDark
                  ? {
                      color: roleTheme.coreHex,
                      border: "1px solid transparent",
                      background:
                        "linear-gradient(180deg, #2d303c 0%, #232630 100%) padding-box, var(--m3-plate-act-edge) border-box",
                      boxShadow: "var(--m3-plate-act-in)",
                    }
                  : {
                      color: "#ffffff",
                      border: "1px solid transparent",
                      background:
                        "var(--button) padding-box, linear-gradient(180deg, rgba(255,255,255,0.2), rgba(0,0,0,0.45)) border-box",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(18,20,28,0.16), 0 3px 8px -3px rgba(18,20,28,0.2)",
                    }
                : {
                    color: "var(--cmp-key-disabled)",
                    background: "var(--cmp-send-idle-bg)",
                    boxShadow: "var(--cmp-send-idle-shadow)",
                  }
            }
            className={`send relative z-10 flex h-[36px] w-[38px] min-w-[38px] items-center justify-center p-0 opacity-100 ${
              speechSupported
                ? "rounded-l-[4px] rounded-r-[12px]"
                : "rounded-l-[7px] rounded-r-[12px]"
            } ${
              hasText || hasAttachments || snap.busy
                ? "cursor-pointer"
                : "cursor-not-allowed"
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {snap.busy ? (
                <motion.span
                  key="stop-icon"
                  initial={{ opacity: 0, scale: 0.72, filter: "blur(3px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.72, filter: "blur(3px)" }}
                  transition={{ duration: 0.38, ease: EASE_SEAMLESS }}
                  className="inline-flex items-center justify-center"
                >
                  <StopSvg className="w-[14px] h-[14px]" />
                </motion.span>
              ) : (
                <motion.span
                  key="send-icon"
                  initial={{ opacity: 0, scale: 0.72, filter: "blur(3px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.72, filter: "blur(3px)" }}
                  transition={{ duration: 0.38, ease: EASE_SEAMLESS }}
                  className="inline-flex items-center justify-center"
                >
                  <SendSvg className="w-[17px] h-[17px]" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </form>
  );
};
