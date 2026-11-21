"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import type { WorkspaceBoardItem } from "@/types/momo";

export type StickerKind = "star" | "check" | "heart" | "none";

export const STICKER_KIND_SET = new Set<string>(["heart", "star", "check"]);

export const stickerShapeOf = (
  item: WorkspaceBoardItem,
): Exclude<StickerKind, "none"> | undefined => {
  const raw = item.sticker || item.pin;
  return raw && STICKER_KIND_SET.has(raw)
    ? (raw as Exclude<StickerKind, "none">)
    : undefined;
};

export const PinboardStickerGlyph: React.FC<{
  kind: StickerKind;
  active: boolean;
}> = ({ kind, active }) => {
  const uid = React.useId().replace(/:/g, "");
  const outlineColor = "var(--sticker-vinyl, #fffdf8)";

  if (kind === "heart") {
    const fill = active ? `url(#stk-heart-${uid})` : "var(--sticker-idle-fill)";
    return (
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="momo-board-sticker-svg"
      >
        <defs>
          <linearGradient id={`stk-heart-${uid}`} x1="0" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff7486" />
            <stop offset="55%" stopColor="#f0435b" />
            <stop offset="100%" stopColor="#cf2540" />
          </linearGradient>
        </defs>
        <path
          d="M16 26.6C15.2 26.1 5.4 19.8 5.4 12.1C5.4 8.3 8.4 5.5 11.9 5.5C14 5.5 15.2 6.6 16 8C16.8 6.6 18 5.5 20.1 5.5C23.6 5.5 26.6 8.3 26.6 12.1C26.6 19.8 16.8 26.1 16 26.6Z"
          fill={fill}
          stroke={outlineColor}
          strokeWidth="4.2"
          strokeLinejoin="round"
        />
        <path
          d="M16 26.6C15.2 26.1 5.4 19.8 5.4 12.1C5.4 8.3 8.4 5.5 11.9 5.5C14 5.5 15.2 6.6 16 8C16.8 6.6 18 5.5 20.1 5.5C23.6 5.5 26.6 8.3 26.6 12.1C26.6 19.8 16.8 26.1 16 26.6Z"
          fill={fill}
        />
        <path
          d="M9.4 10.6C9.6 9.3 10.5 8.5 11.8 8.4"
          stroke="rgba(255,255,255,0.68)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "star") {
    const fill = active ? `url(#stk-star-${uid})` : "var(--sticker-idle-fill)";
    return (
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="momo-board-sticker-svg"
      >
        <defs>
          <linearGradient id={`stk-star-${uid}`} x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffd76a" />
            <stop offset="55%" stopColor="#f6b228" />
            <stop offset="100%" stopColor="#df8910" />
          </linearGradient>
        </defs>
        <path
          d="M16 4.7L19.1 11.2L26.3 12.1L21 17L22.4 24.1L16 20.6L9.6 24.1L11 17L5.7 12.1L12.9 11.2L16 4.7Z"
          fill={fill}
          stroke={outlineColor}
          strokeWidth="4.2"
          strokeLinejoin="round"
        />
        <path
          d="M16 4.7L19.1 11.2L26.3 12.1L21 17L22.4 24.1L16 20.6L9.6 24.1L11 17L5.7 12.1L12.9 11.2L16 4.7Z"
          fill={fill}
        />
        <circle cx="15.8" cy="10.2" r="1.15" fill="rgba(255,255,255,0.72)" />
      </svg>
    );
  }

  if (kind === "check") {
    const fill = active ? `url(#stk-chk-${uid})` : "var(--sticker-idle-fill)";
    return (
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="momo-board-sticker-svg"
      >
        <defs>
          <linearGradient id={`stk-chk-${uid}`} x1="5" y1="5" x2="27" y2="27" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#56d89a" />
            <stop offset="100%" stopColor="#1fa369" />
          </linearGradient>
        </defs>
        <path
          d="M16 4.8L18.9 7.1L22.5 6.8L23.8 10.2L26.9 12L26.3 15.6L27.8 18.9L25.2 21.5L25 25.1L21.5 25.9L19.1 28.4L15.6 27.3L12.1 28.4L9.7 25.9L6.2 25.1L6 21.5L3.4 18.9L4.9 15.6L4.3 12L7.4 10.2L8.7 6.8L12.3 7.1L16 4.8Z"
          fill={fill}
          stroke={outlineColor}
          strokeWidth="3.8"
          strokeLinejoin="round"
        />
        <path
          d="M16 4.8L18.9 7.1L22.5 6.8L23.8 10.2L26.9 12L26.3 15.6L27.8 18.9L25.2 21.5L25 25.1L21.5 25.9L19.1 28.4L15.6 27.3L12.1 28.4L9.7 25.9L6.2 25.1L6 21.5L3.4 18.9L4.9 15.6L4.3 12L7.4 10.2L8.7 6.8L12.3 7.1L16 4.8Z"
          fill={fill}
        />
        <path
          d="M11.6 16.5L14.5 19.4L20.5 13.4"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="momo-board-sticker-svg"
    >
      <circle
        cx="16"
        cy="16"
        r="10.5"
        fill="var(--sticker-idle-fill)"
        stroke={outlineColor}
        strokeWidth="4"
      />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Board sticker state shared into GenUI surfaces (chat / explore). Built per
// session in MomoAppShell so sticker state can never leak across sessions.
// ---------------------------------------------------------------------------

export interface BoardItemStickerState {
  sticker?: Exclude<StickerKind, "none">;
  done?: boolean;
}

const EMPTY_STICKER_MAP: ReadonlyMap<string, BoardItemStickerState> = new Map();

export const BoardItemStateContext =
  React.createContext<ReadonlyMap<string, BoardItemStickerState>>(
    EMPTY_STICKER_MAP,
  );

export const useBoardItemStates = () =>
  React.useContext(BoardItemStateContext);

export const boardTitleKey = (title: string) => title.trim().toLowerCase();

/** Resolve the sticker glyph a board item should surface on GenUI cards. */
export function boardStickerStateOf(
  item: WorkspaceBoardItem,
): BoardItemStickerState | undefined {
  const sticker =
    stickerShapeOf(item) ??
    (item.starred ? "star" : item.done ? "check" : undefined);
  const done = Boolean(item.done);
  if (!sticker && !done) return undefined;
  return { sticker, done };
}

/**
 * Complimentary die-cut sticker that overlaps a card's top-left corner, tilted
 * like the pinboard vinyl. Rendered only when the item carries board state.
 */
export const BoardStickerOverlay: React.FC<{
  state?: BoardItemStickerState;
}> = ({ state }) => {
  const reduce = useReducedMotion();
  if (!state?.sticker) return null;
  return (
    <motion.span
      className={`gu-card-sticker is-${state.sticker}`}
      aria-hidden="true"
      initial={reduce ? false : { scale: 0.3, rotate: -26 }}
      animate={{ scale: 1, rotate: -11 }}
      transition={{ type: "spring", stiffness: 560, damping: 24 }}
    >
      <PinboardStickerGlyph kind={state.sticker} active />
    </motion.span>
  );
};
