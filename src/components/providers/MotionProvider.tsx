"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { MOTION_VOCABULARY } from "@/components/motion/MotionPrimitives";

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{
        ease: MOTION_VOCABULARY.easings.standard,
        duration: MOTION_VOCABULARY.durations.normal,
      }}
    >
      {children}
    </MotionConfig>
  );
}
