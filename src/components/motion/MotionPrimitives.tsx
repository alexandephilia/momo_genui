"use client";

export const EASE_MOMO: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_EXIT: [number, number, number, number] = [0.4, 0, 1, 1];
export const SPRING_THUMB = { type: "spring", stiffness: 340, damping: 32, mass: 0.85 } as const;

/**
 * Canonical Motion-First Interface Vocabulary used across workspaces,
 * tab transitions, progressive skeleton slots, popovers, and tactile surfaces.
 */
export const MOTION_VOCABULARY = {
  durations: {
    instant: 0.12,
    micro: 0.16,
    fast: 0.2,
    normal: 0.24,
    panel: 0.28,
    slow: 0.36,
  },
  easings: {
    standard: EASE_MOMO,
    exit: EASE_EXIT,
    linear: "linear" as const,
  },
  springs: {
    thumb: SPRING_THUMB,
    tactile: { type: "spring", stiffness: 320, damping: 28, mass: 0.85 } as const,
    hydrate: { type: "spring", stiffness: 290, damping: 26, mass: 0.84 } as const,
  },
  staggers: {
    macro: 0.05,
    micro: 0.03,
    slotRevealMs: 145,
    exploreFanCard: 0.055,
  },
  feedback: {
    hoverLiftSm: { y: -1.5, scale: 1.02 },
    hoverCard: { y: -3, scale: 1.012 },
    tapPress: { scale: 0.97 },
  },
} as const;

/**
 * Canonical hover/tap transition configs consumed by all Gen UI interactive elements.
 * Usage: `<motion.div whileHover={MH.card} whileTap={MH.press} transition={MH.spring}>`
 */
export const MH = {
  chip: undefined,
  card: undefined,
  image: undefined,
  icon: undefined,
  press: { scale: 0.965 },
  tap: { scale: 0.975 },
  row: undefined,
  node: undefined,
  spring: { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.8 },
  ease: { duration: 0.18, ease: EASE_MOMO },
} as const;
