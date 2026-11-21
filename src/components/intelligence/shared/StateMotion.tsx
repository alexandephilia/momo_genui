"use client";

/**
 * Motion helpers for state changes that used to be CSS transitions:
 * check marks, meters, collapsibles, sliding tab plates and staggered entry.
 * Colours stay in the stylesheets; these only move, size and fade things.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
  type AnimationPlaybackControls,
  type Transition,
  type Variants,
} from "motion/react";
import { EASE_MOMO, MH, SPRING_THUMB } from "@/components/motion/MotionPrimitives";

export const INSTANT: Transition = { duration: 0 };

const EASE_FAST: Transition = { duration: 0.2, ease: EASE_MOMO };
const EASE_PANEL: Transition = { duration: 0.26, ease: EASE_MOMO };
export const METER: Transition = { duration: 0.6, ease: EASE_MOMO };

/* ── Staggered entry ── */

// Labels are namespaced: variant labels propagate down the tree, and a generic
// "hidden" from some ancestor would otherwise leave these items invisible.
const STAGGER_FROM = "stagger-from";
const STAGGER_TO = "stagger-to";

export const STAGGER_LIST: Variants = {
  [STAGGER_FROM]: {},
  [STAGGER_TO]: { transition: { staggerChildren: 0.045 } },
};

export const STAGGER_ITEM: Variants = {
  [STAGGER_FROM]: { opacity: 0, y: 6 },
  [STAGGER_TO]: { opacity: 1, y: 0, transition: EASE_PANEL },
};

/** Spread on the container; give each child `variants={STAGGER_ITEM}`. */
export function useStagger() {
  const reduce = useReducedMotion();
  return {
    variants: STAGGER_LIST,
    initial: reduce ? (false as const) : STAGGER_FROM,
    animate: STAGGER_TO,
  };
}

/* ── Check marks ── */

/** Same markup as lucide's `Check`, drawn in with pathLength and scaled out. */
export function CheckGlyph({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  const reduce = useReducedMotion();
  const t = reduce ? INSTANT : EASE_FAST;
  return (
    <motion.svg
      className="lucide lucide-check"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      initial={reduce ? false : { scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={t}
    >
      <motion.path
        d="M20 6 9 17l-5-5"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={t}
      />
    </motion.svg>
  );
}

/** The "✓" text glyph used by the skeuomorphic checkbox, scaled in and out. */
export function CheckTick() {
  const reduce = useReducedMotion();
  return (
    <motion.span
      style={{ display: "inline-block" }}
      initial={reduce ? false : { scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.4, opacity: 0 }}
      transition={reduce ? INSTANT : EASE_FAST}
    >
      ✓
    </motion.span>
  );
}

const PAINT = ["backgroundColor", "borderColor", "color"] as const;
type Paint = Record<(typeof PAINT)[number], string>;

const readPaint = (el: HTMLElement): Paint => {
  const cs = getComputedStyle(el);
  return { backgroundColor: cs.backgroundColor, borderColor: cs.borderTopColor, color: cs.color };
};

const clearPaint = (el: HTMLElement) => {
  for (const p of PAINT) el.style[p] = "";
};

const paintTweens = new WeakMap<HTMLElement, AnimationPlaybackControls>();

function runPaintTween(el: HTMLElement, from: Paint, to: Paint) {
  if (PAINT.every((p) => from[p] === to[p])) return;
  const apply = (t: number) => {
    for (const p of PAINT) {
      el.style[p] = `color-mix(in srgb, ${to[p]} ${t * 100}%, ${from[p]})`;
    }
  };
  apply(0);
  const tween = animate(0, 1, {
    ...EASE_FAST,
    onUpdate: apply,
    onComplete: () => {
      clearPaint(el);
      paintTweens.delete(el);
    },
  });
  paintTweens.set(el, tween);
}

/**
 * Call in the handler that flips a class-driven colour state, before setState.
 * Tweens the element from the colours it has now to whatever the stylesheet
 * gives it after React commits, then hands control back to the stylesheet.
 */
export function tweenPaint(target: Element | null, reduce: boolean | null) {
  if (reduce || !(target instanceof HTMLElement)) return;
  const el = target;
  const from = readPaint(el);
  requestAnimationFrame(() => {
    paintTweens.get(el)?.stop();
    clearPaint(el);
    runPaintTween(el, from, readPaint(el));
  });
}

/* ── Colour states for a whole block ── */

// Loading and layout flags flip constantly while a block streams and carry no colour state.
const PAINT_IGNORED = new Set(["is-loaded", "is-searching", "is-instant", "is-growing", "is-ready", "is-ghost"]);
// A state class on a row usually repaints a few children too (number badge, label).
const PAINT_REACH = 12;

const stateOf = (cls: string) =>
  cls
    .split(/\s+/)
    .filter((c) => /^(is|has)-/.test(c) && !PAINT_IGNORED.has(c))
    .sort()
    .join(" ");

const hasInlinePaint = (el: HTMLElement) => PAINT.some((p) => el.style[p] !== "");

/**
 * Stylesheets say what each `is-*` state looks like; this makes the change between
 * two states a Motion tween instead of a CSS transition. It watches class changes
 * under `root`, reads the colours of the old and new class, and tweens between them.
 */
function watchPaint(root: HTMLElement) {
  const observer = new MutationObserver((records) => {
    const flips = new Map<HTMLElement, string>();
    for (const r of records) {
      const el = r.target;
      if (el instanceof HTMLElement && !flips.has(el)) flips.set(el, r.oldValue ?? "");
    }

    const jobs: Array<{ el: HTMLElement; from?: Paint; to: Paint }> = [];
    const owners: Array<{ el: HTMLElement; prev: string; next: string }> = [];
    const queued = new Set<HTMLElement>();
    for (const [el, prev] of flips) {
      const next = el.className;
      if (stateOf(prev) === stateOf(next)) continue;
      owners.push({ el, prev, next });
      const reach = [el, ...Array.from(el.querySelectorAll<HTMLElement>("*")).slice(0, PAINT_REACH)];
      for (const target of reach) {
        if (!(target instanceof HTMLElement) || queued.has(target)) continue;
        const running = paintTweens.get(target);
        if (!running && hasInlinePaint(target)) continue;
        queued.add(target);
        // Mid-tween: carry on from the colour on screen, not from the old class.
        let from: Paint | undefined;
        if (running) {
          from = readPaint(target);
          running.stop();
          paintTweens.delete(target);
          clearPaint(target);
        }
        jobs.push({ el: target, from, to: readPaint(target) });
      }
    }
    if (jobs.length === 0) return;

    for (const o of owners) o.el.className = o.prev;
    for (const job of jobs) job.from ??= readPaint(job.el);
    for (const o of owners) o.el.className = o.next;
    observer.takeRecords();

    for (const job of jobs) runPaintTween(job.el, job.from!, job.to);
  });
  observer.observe(root, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
    attributeOldValue: true,
  });
  return () => observer.disconnect();
}

const CONTENTS: CSSProperties = { display: "contents" };

/**
 * Wraps one GenUI block without adding a box. `bare` marks minimal/editorial
 * variants so the stylesheet can drop card surfaces inside.
 */
export function PaintScope({ bare, children }: { bare?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const ref = useCallback(
    (el: HTMLDivElement | null) => (el && !reduce ? watchPaint(el) : undefined),
    [reduce],
  );
  return (
    <div ref={ref} data-gu-bare={bare || undefined} style={CONTENTS}>
      {children}
    </div>
  );
}

/* ── Switches ── */

/** Put on the switch track: the thumb's resting side comes from layout, not a CSS translate. */
export const switchTrack = (on: boolean): CSSProperties => ({
  justifyContent: on ? "flex-end" : "flex-start",
});

/** `x: 0` keeps the stylesheet's old translateX off the thumb so `layout` owns its position. */
export function SwitchThumb({ className }: { className: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={className}
      layout
      style={{ x: 0 }}
      transition={reduce ? INSTANT : SPRING_THUMB}
    />
  );
}

/* ── Meters ── */

/** Bar fill that grows from 0 on mount and animates to each new width. */
export function MeterFill({
  as = "div",
  className,
  width,
  style,
}: {
  as?: "div" | "span";
  className: string;
  width: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const Fill = as === "span" ? motion.span : motion.div;
  return (
    <Fill
      className={className}
      style={style}
      initial={reduce ? false : { width: 0 }}
      animate={{ width }}
      transition={reduce ? INSTANT : METER}
    />
  );
}

/* ── Expand / collapse ── */

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse"
          style={{ overflow: "hidden" }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={reduce ? INSTANT : EASE_PANEL}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Sliding tab plate ── */

const PLATE_STYLE: CSSProperties = {
  position: "absolute",
  zIndex: -1,
  borderRadius: "inherit",
  pointerEvents: "none",
};

/**
 * Moves the host's stylesheet-defined active look onto the plate, so the plate
 * is the only thing painting it and can slide. Re-read when the theme flips.
 */
function adoptHostPaint(plate: HTMLElement, shadow: boolean, border: boolean) {
  const host = plate.parentElement;
  if (!host) return;
  const hs = host.style;
  const ps = plate.style;

  const release = () => {
    hs.removeProperty("background");
    if (shadow) hs.removeProperty("box-shadow");
    if (border) hs.removeProperty("border-color");
  };

  const adopt = () => {
    release();
    const cs = getComputedStyle(host);
    ps.backgroundColor = cs.backgroundColor;
    ps.backgroundImage = cs.backgroundImage;
    ps.inset = `-${cs.borderTopWidth} -${cs.borderRightWidth} -${cs.borderBottomWidth} -${cs.borderLeftWidth}`;
    if (shadow) ps.boxShadow = cs.boxShadow;
    if (border) ps.border = `${cs.borderTopWidth} solid ${cs.borderTopColor}`;
    hs.background = "none";
    if (shadow) hs.boxShadow = "none";
    if (border) hs.borderColor = "transparent";
  };

  const wasStatic = getComputedStyle(host).position === "static";
  if (wasStatic) hs.position = "relative";
  hs.isolation = "isolate";
  adopt();

  const theme = new MutationObserver(adopt);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

  return () => {
    theme.disconnect();
    release();
    hs.removeProperty("isolation");
    if (wasStatic) hs.removeProperty("position");
  };
}

/**
 * Render inside the active tab/segment button. One `layoutId` per control
 * instance makes it slide between options. `shadow` / `border` say which parts
 * of the active look besides the background belong to the plate.
 */
export function ActivePlate({
  layoutId,
  shadow = false,
  border = false,
}: {
  layoutId: string;
  shadow?: boolean;
  border?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useCallback(
    (plate: HTMLElement | null) => (plate ? adoptHostPaint(plate, shadow, border) : undefined),
    [shadow, border],
  );
  return (
    <motion.span
      ref={ref}
      aria-hidden="true"
      layoutId={layoutId}
      style={PLATE_STYLE}
      transition={reduce ? INSTANT : MH.spring}
    />
  );
}
