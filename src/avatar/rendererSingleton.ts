"use client";

import {
  createSafeVisorRenderer,
  type VisorDrawOptions,
  type VisorRenderer,
} from "./visorRenderer";

let sharedRenderer: VisorRenderer | null = null;

export const IDLE_FRAME_COUNT = 20;
export const IDLE_CYCLE_SEC = 4.6;
const MAX_RING_CACHE_KEYS = 32;

export function getSharedVisorRenderer(): VisorRenderer | null {
  if (typeof window === "undefined") return null;
  if (!sharedRenderer) {
    sharedRenderer = createSafeVisorRenderer();
  }
  return sharedRenderer;
}

export function getMiniAvatarPixelSize(cssSize: number): number {
  const dpr =
    typeof window !== "undefined"
      ? Math.min(3, Math.max(1, window.devicePixelRatio || 1))
      : 2;
  return Math.max(16, Math.round(cssSize * dpr));
}

const ringCache = new Map<string, (HTMLCanvasElement | null)[]>();
const lastBlitByCanvas = new WeakMap<
  HTMLCanvasElement,
  { key: string; frame: number; exact: boolean; px: number }
>();

let miniStreamBusy = false;
let miniBakedThisTick = false;
let inMiniLoop = false;

export function setMiniAvatarStreamBusy(busy: boolean): void {
  miniStreamBusy = busy;
}

function getOrCreateRing(cacheKey: string): (HTMLCanvasElement | null)[] {
  const existing = ringCache.get(cacheKey);
  if (existing) {
    ringCache.delete(cacheKey);
    ringCache.set(cacheKey, existing);
    return existing;
  }
  if (ringCache.size >= MAX_RING_CACHE_KEYS) {
    const oldestKey = ringCache.keys().next().value;
    if (oldestKey !== undefined) {
      const evicted = ringCache.get(oldestKey);
      if (evicted) {
        for (const frameCanvas of evicted) {
          if (frameCanvas) {
            frameCanvas.width = 0;
            frameCanvas.height = 0;
          }
        }
      }
      ringCache.delete(oldestKey);
    }
  }
  const fresh = new Array<HTMLCanvasElement | null>(IDLE_FRAME_COUNT).fill(null);
  ringCache.set(cacheKey, fresh);
  return fresh;
}

function circularFrameDist(a: number, b: number): number {
  const diff = Math.abs(a - b) % IDLE_FRAME_COUNT;
  return Math.min(diff, IDLE_FRAME_COUNT - diff);
}

function findNearestCachedFrame(
  ring: (HTMLCanvasElement | null)[],
  targetIdx: number
): number {
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < ring.length; i++) {
    if (!ring[i]) continue;
    const dist = circularFrameDist(i, targetIdx);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
      if (dist === 0) break;
    }
  }
  return bestIdx;
}

function blitFrame(
  target: HTMLCanvasElement,
  source: HTMLCanvasElement,
  px: number
): boolean {
  const ctx = target.getContext("2d");
  if (!ctx) return false;
  ctx.clearRect(0, 0, px, px);
  ctx.drawImage(source, 0, 0, px, px);
  return true;
}

/**
 * Draws a mini-avatar frame using the bounded lazy idle frame-ring cache.
 * Bakes at most 1 unbaked frame per rAF tick across all mini canvases and skips
 * background WebGL baking while `miniStreamBusy` is active (falling back to the
 * nearest cached frame or baking frame 0 once if the canvas has no initial paint).
 */
export function drawCachedMiniFrame(
  canvas: HTMLCanvasElement,
  cssSize: number,
  cacheKey: string,
  frameIndex: number,
  renderOpts: VisorDrawOptions | ((frameIdx: number) => VisorDrawOptions)
): boolean {
  if (typeof window === "undefined") return false;
  const px = getMiniAvatarPixelSize(cssSize);
  const idx =
    ((Math.floor(frameIndex) % IDLE_FRAME_COUNT) + IDLE_FRAME_COUNT) %
    IDLE_FRAME_COUNT;

  if (canvas.width !== px || canvas.height !== px) {
    canvas.width = px;
    canvas.height = px;
    lastBlitByCanvas.delete(canvas);
  }

  const ring = getOrCreateRing(cacheKey);
  const prev = lastBlitByCanvas.get(canvas);

  if (
    prev &&
    prev.key === cacheKey &&
    prev.px === px &&
    prev.frame === idx &&
    prev.exact &&
    ring[idx]
  ) {
    return true;
  }

  const cached = ring[idx];
  if (cached) {
    if (!blitFrame(canvas, cached, px)) return false;
    lastBlitByCanvas.set(canvas, { key: cacheKey, frame: idx, exact: true, px });
    return true;
  }

  const hasValidKeyPaint = Boolean(prev && prev.key === cacheKey && prev.px === px);
  const nearestIdx = findNearestCachedFrame(ring, idx);

  // During streaming or once the per-rAF WebGL bake budget is spent, reuse an existing cached frame.
  const budgetExhausted = miniStreamBusy || (inMiniLoop && miniBakedThisTick);
  if (budgetExhausted) {
    if (nearestIdx !== -1) {
      if (
        hasValidKeyPaint &&
        prev &&
        circularFrameDist(prev.frame, idx) <= circularFrameDist(nearestIdx, idx)
      ) {
        return true;
      }
      if (!blitFrame(canvas, ring[nearestIdx]!, px)) return false;
      lastBlitByCanvas.set(canvas, {
        key: cacheKey,
        frame: nearestIdx,
        exact: false,
        px,
      });
      return true;
    }
    if (hasValidKeyPaint) {
      return true;
    }
    // Initial cold paint with no cached frames yet: bake frame 0 once so initial paint is never blank.
  } else if (!hasValidKeyPaint && nearestIdx !== -1) {
    if (!blitFrame(canvas, ring[nearestIdx]!, px)) return false;
    lastBlitByCanvas.set(canvas, {
      key: cacheKey,
      frame: nearestIdx,
      exact: false,
      px,
    });
    return true;
  }

  const renderer = getSharedVisorRenderer();
  if (!renderer || renderer.info.lost) return false;

  const bakeIdx =
    !hasValidKeyPaint && nearestIdx === -1 && typeof renderOpts === "function"
      ? 0
      : idx;
  const resolvedOpts =
    typeof renderOpts === "function" ? renderOpts(bakeIdx) : renderOpts;

  const offscreen = document.createElement("canvas");
  offscreen.width = px;
  offscreen.height = px;
  renderer.draw(offscreen, px, { small: 1, zoom: 0.9, ...resolvedOpts });
  if (renderer.info.lost) {
    offscreen.width = 0;
    offscreen.height = 0;
    return false;
  }

  ring[bakeIdx] = offscreen;
  if (inMiniLoop) {
    miniBakedThisTick = true;
  }

  if (!blitFrame(canvas, offscreen, px)) return false;
  lastBlitByCanvas.set(canvas, {
    key: cacheKey,
    frame: bakeIdx,
    exact: bakeIdx === idx,
    px,
  });
  return true;
}

const miniListeners = new Set<(timeSec: number) => void>();
let miniRaf = 0;
let miniLastTick = 0;
let miniStartTs = 0;
let miniVisBound = false;

export function getMiniAvatarTimeSec(): number {
  if (typeof performance === "undefined" || !miniStartTs) return 0;
  return Math.max(0, (performance.now() - miniStartTs) / 1000);
}

function runMiniLoop(now: number) {
  if (miniListeners.size === 0 || document.visibilityState !== "visible") {
    miniRaf = 0;
    return;
  }
  if (!miniStartTs) miniStartTs = now;
  if (now - miniLastTick >= 33) {
    miniLastTick = now;
    miniBakedThisTick = false;
    inMiniLoop = true;
    try {
      const t = (now - miniStartTs) / 1000;
      miniListeners.forEach((cb) => cb(t));
    } finally {
      inMiniLoop = false;
    }
  }
  miniRaf = requestAnimationFrame(runMiniLoop);
}

function handleMiniVisibility() {
  if (document.visibilityState === "visible" && miniListeners.size > 0 && !miniRaf) {
    miniLastTick = 0;
    miniRaf = requestAnimationFrame(runMiniLoop);
  } else if (document.visibilityState !== "visible" && miniRaf) {
    cancelAnimationFrame(miniRaf);
    miniRaf = 0;
  }
}

export function subscribeMiniAvatarTick(cb: (timeSec: number) => void): () => void {
  if (typeof window === "undefined") return () => {};
  miniListeners.add(cb);
  if (!miniVisBound) {
    miniVisBound = true;
    document.addEventListener("visibilitychange", handleMiniVisibility);
  }
  if (!miniRaf && document.visibilityState === "visible") {
    miniRaf = requestAnimationFrame(runMiniLoop);
  }
  return () => {
    miniListeners.delete(cb);
    if (miniListeners.size === 0 && miniRaf) {
      cancelAnimationFrame(miniRaf);
      miniRaf = 0;
    }
  };
}
