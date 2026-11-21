"use client";

import { memo, useLayoutEffect, useRef } from "react";
import { LOOK_POSES, OUTFIT_INDICES, ROLE_PALETTES } from "@/data/looks";
import { hexToRgbTuple, resolvePaletteKey } from "@/lib/localBrain";
import {
  IDLE_CYCLE_SEC,
  IDLE_FRAME_COUNT,
  drawCachedMiniFrame,
  getMiniAvatarPixelSize,
  getMiniAvatarTimeSec,
  subscribeMiniAvatarTick,
} from "./rendererSingleton";
import type { RgbTriplet, VisorDrawOptions } from "./visorRenderer";

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 100;
}

export interface MomoMiniCanvasProps {
  look: string;
  size: number;
  className?: string;
  paletteKey?: string;
  paletteOverrides?: Record<string, string>;
  dead?: boolean;
  darkFloor?: boolean;
  animated?: boolean;
  yaw?: number;
  roll?: number;
  squish?: number;
  ariaLabel?: string;
  width?: number;
  height?: number;
}

export const MomoMiniCanvas = memo(function MomoMiniCanvas({
  look,
  size,
  className,
  paletteKey,
  paletteOverrides = {},
  dead = false,
  darkFloor = false,
  animated = false,
  yaw,
  roll,
  squish = 0,
  ariaLabel,
  width,
  height,
}: MomoMiniCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const isVisibleRef = useRef(true);
  const effectiveKey = paletteKey ?? resolvePaletteKey(look, paletteOverrides);

  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const hexTuple = ROLE_PALETTES[effectiveKey] ?? ROLE_PALETTES.persimmon;
    const colors = hexTuple.map(hexToRgbTuple) as [RgbTriplet, RgbTriplet, RgbTriplet, RgbTriplet];
    const outfit = OUTFIT_INDICES[look] ?? 0;
    const pose = LOOK_POSES[look];
    const phase = hashSeed(look);
    const defaultYaw = pose?.yaw ?? 0;
    const defaultRoll = pose?.roll ?? 0;
    const baseYaw = yaw ?? defaultYaw;
    const baseRoll = roll ?? defaultRoll;
    const baseLook = pose?.look ?? [0, 0];
    const px = getMiniAvatarPixelSize(size);
    const hasCustomPose =
      (yaw !== undefined && yaw !== defaultYaw) ||
      (roll !== undefined && roll !== defaultRoll) ||
      squish !== 0;
    const cacheKey = hasCustomPose
      ? `${look}|${effectiveKey}|${dead ? 1 : 0}|${darkFloor ? 1 : 0}|${px}|y${baseYaw.toFixed(3)}|r${baseRoll.toFixed(3)}|s${squish.toFixed(3)}`
      : `${look}|${effectiveKey}|${dead ? 1 : 0}|${darkFloor ? 1 : 0}|${px}`;

    const buildFrameOpts = (frameIdx: number): VisorDrawOptions => {
      const u = frameIdx / IDLE_FRAME_COUNT;
      const theta = u * Math.PI * 2;
      const smoothTime = (1 - Math.cos(theta)) * 1.5;

      if (dead) {
        const shiver = animated ? Math.sin(theta) * 0.018 : 0;
        return {
          outfit,
          colors,
          look: [0, 0],
          brows: pose?.brows ?? [0, 0, 0, 0],
          yaw: baseYaw,
          roll: baseRoll + shiver,
          eyeScale: pose?.eyeScale ?? [1, 1],
          tip: [1.2, 0.25, 0.86],
          leaf: -0.6,
          squash: squish,
          dead: 1,
          fall: 1,
          bug: 1,
          glassY: 0,
          darkFloor: darkFloor ? 1 : 0,
          time: animated ? smoothTime : 0,
        };
      }

      const breathSq = animated ? Math.sin(theta * 2) * 0.14 : 0;
      const idleRoll = animated ? Math.sin(theta) * 0.048 : 0;
      const idleYaw = animated ? Math.sin(theta) * 0.075 : 0;
      const idleLeaf = animated
        ? (pose?.leaf ?? 0.5) + Math.sin(theta * 2) * 0.22
        : pose?.leaf ?? 0.5;
      const blinkU = (u - 0.45) / 0.13;
      const blink =
        animated && blinkU > 0 && blinkU < 1 ? Math.sin(blinkU * Math.PI) : 0;

      return {
        outfit,
        colors,
        look: baseLook,
        brows: pose?.brows ?? [0, 0, 0, 0],
        yaw: baseYaw + idleYaw,
        roll: baseRoll + idleRoll,
        eyeScale: pose?.eyeScale ?? [1, 1],
        tip: pose?.tip ?? [0, 0, 1],
        leaf: idleLeaf,
        squash: squish + breathSq,
        blink,
        dead: 0,
        fall: 0,
        bug: 1,
        glassY: 0,
        darkFloor: darkFloor ? 1 : 0,
        time: animated ? smoothTime : 0,
      };
    };

    const paintAtTime = (t: number) => {
      const frameIndex = animated
        ? Math.floor(
            (((((t + phase) % IDLE_CYCLE_SEC) + IDLE_CYCLE_SEC) %
              IDLE_CYCLE_SEC) /
              IDLE_CYCLE_SEC) *
              IDLE_FRAME_COUNT
          ) % IDLE_FRAME_COUNT
        : 0;
      drawCachedMiniFrame(cv, size, cacheKey, frameIndex, buildFrameOpts);
    };

    const mq =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const isReduced = () => Boolean(mq?.matches);

    isVisibleRef.current = true;
    paintAtTime(animated && !isReduced() ? getMiniAvatarTimeSec() : 0);
    if (!animated) return;

    let unsubTick: (() => void) | null = null;
    const ensureSub = () => {
      if (isReduced()) return;
      if (!unsubTick) {
        unsubTick = subscribeMiniAvatarTick((t) => {
          if (!isVisibleRef.current || isReduced()) return;
          paintAtTime(t);
        });
      }
    };
    const dropSub = () => {
      if (unsubTick) {
        unsubTick();
        unsubTick = null;
      }
    };

    const onReduceChange = () => {
      if (isReduced()) {
        dropSub();
        paintAtTime(0);
      } else if (isVisibleRef.current) {
        paintAtTime(getMiniAvatarTimeSec());
        ensureSub();
      }
    };
    mq?.addEventListener?.("change", onReduceChange);

    ensureSub();

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          const visible = entry.isIntersecting;
          const becameVisible = visible && !isVisibleRef.current;
          isVisibleRef.current = visible;
          if (visible) {
            if (becameVisible) {
              paintAtTime(isReduced() ? 0 : getMiniAvatarTimeSec());
            }
            ensureSub();
          } else {
            dropSub();
          }
        },
        { rootMargin: "24px" }
      );
      observer.observe(cv);
    }

    return () => {
      mq?.removeEventListener?.("change", onReduceChange);
      dropSub();
      observer?.disconnect();
    };
  }, [look, size, effectiveKey, dead, darkFloor, animated, yaw, roll, squish]);

  return (
    <canvas
      ref={ref}
      className={className}
      width={width ?? size * 2}
      height={height ?? size * 2}
      style={{ width: size, height: size }}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    />
  );
});
