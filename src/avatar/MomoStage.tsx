"use client";

import type { RefObject } from "react";

export function MomoHeroCanvas({
  canvasRef,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  return (
    <canvas
      id="hero"
      ref={canvasRef}
      width={268}
      height={268}
      aria-hidden="true"
      style={{ width: 268, height: 268, transformOrigin: "0 0" }}
    />
  );
}
