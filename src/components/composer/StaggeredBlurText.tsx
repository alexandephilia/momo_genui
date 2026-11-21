"use client";

import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_MOMO } from "@/components/motion/MotionPrimitives";

export interface StaggeredBlurTextProps {
  text: string;
  leadingDot?: React.ReactNode;
  shimmer?: boolean;
  className?: string;
  style?: React.CSSProperties;
  mode?: "words" | "chars";
  align?: "left" | "center" | "right";
  animateOnMount?: boolean;
  staggerIn?: number;
  staggerOut?: number;
  delayIn?: number;
  blurPx?: number;
  yOffset?: number;
  durationIn?: number;
  durationOut?: number;
}

const EASE_ENTER = EASE_MOMO;
const EASE_EXIT = EASE_MOMO;

/**
 * Bidirectional staggered word/character blur-fade typography using Motion `popLayout`.
 * Overlapping exit + enter eliminates the blank visibility gap while keeping alignment locked.
 */
export const StaggeredBlurText: React.FC<StaggeredBlurTextProps> = ({
  text,
  leadingDot,
  shimmer = false,
  className = "",
  style,
  mode = "words",
  align = "left",
  animateOnMount = false,
  staggerIn = 0.036,
  staggerOut = 0.02,
  delayIn = 0.055,
  blurPx = 8,
  yOffset = 6,
  durationIn = 0.48,
  durationOut = 0.36,
}) => {
  const tokens = React.useMemo(
    () =>
      mode === "chars"
        ? Array.from(text)
        : text.trim().split(/\s+/).filter(Boolean),
    [text, mode]
  );

  const tokenVariants = React.useMemo(
    () => ({
      hidden: {
        opacity: 0,
        y: yOffset,
        scale: 0.96,
        filter: `blur(${blurPx}px)`,
        willChange: "transform, opacity, filter",
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
          duration: durationIn,
          ease: EASE_ENTER,
        },
        transitionEnd: {
          filter: "none",
          willChange: "auto",
        },
      },
      exit: {
        opacity: 0,
        y: -yOffset,
        scale: 0.96,
        filter: `blur(${blurPx}px)`,
        willChange: "transform, opacity, filter",
        transition: {
          duration: durationOut,
          ease: EASE_EXIT,
        },
      },
    }),
    [yOffset, blurPx, durationIn, durationOut]
  );

  const justifyItems =
    align === "right" ? "end" : align === "center" ? "center" : "start";

  return (
    <span
      style={{ justifyItems, ...style }}
      className={`relative inline-grid items-center whitespace-nowrap overflow-visible ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={animateOnMount}>
        <motion.span
          key={text}
          style={{ gridArea: "1 / 1" }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                delayChildren: delayIn,
                staggerChildren: staggerIn,
              },
            },
            exit: {
              transition: {
                staggerChildren: staggerOut,
                staggerDirection: 1,
              },
            },
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="inline-flex items-center whitespace-nowrap pointer-events-none"
        >
          {leadingDot != null && leadingDot !== false && (
            <motion.span
              key="__leading-dot"
              variants={tokenVariants}
              className="inline-flex items-center shrink-0"
              style={{ marginRight: tokens.length > 0 ? "6px" : 0 }}
            >
              {leadingDot}
            </motion.span>
          )}
          <span className={shimmer ? "inline-flex items-center crest-text-shimmer" : "inline-flex items-center"}>
            {tokens.map((token, idx) => (
              <motion.span
                key={`${token}-${idx}`}
                variants={tokenVariants}
                style={{
                  marginRight:
                    mode === "words" && idx < tokens.length - 1 ? "0.28em" : 0,
                  ...(shimmer ? ({ "--tok-idx": idx } as React.CSSProperties) : null),
                }}
                className={shimmer ? "inline-block crest-token" : "inline-block"}
              >
                {mode === "chars" && token === " " ? "\u00A0" : token}
              </motion.span>
            ))}
          </span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
