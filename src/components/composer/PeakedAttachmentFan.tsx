"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  type MotionValue,
} from "motion/react";
import type { ComposerAttachment, ComposerAttachmentKind } from "@/types/momo";

export const MAX_COMPOSER_ATTACHMENTS = 5;

const SPRING_WING = { stiffness: 380, damping: 31, mass: 0.85 };
const SPRING_SCALE = { stiffness: 420, damping: 32, mass: 0.8 };
const SPRING_LAYER = { stiffness: 460, damping: 33, mass: 0.7 };

/**
 * Resting deck geometry (collapsed): every sibling sits on the SAME footprint as
 * the front card, nudged up a hair so its top edge peeks over the one in front.
 * Think of a pile of physical photos you are about to fan through.
 */
const ClientEventDayNum: React.FC<{ deepTone: string }> = ({ deepTone }) => {
  const [day, setDay] = useState<number>(16);
  useEffect(() => {
    setDay(new Date().getDate());
  }, []);
  return (
    <div
      className="text-base font-extrabold leading-none tracking-tight"
      style={{ color: deepTone }}
      aria-hidden="true"
    >
      {day}
    </div>
  );
};

const PEEK_STEP_Y = -8;
const PEEK_STEP_X = 1.4;
const PEEK_STEP_ROT = 2.1;
const PEEK_SCALE_STEP = 0.016;

/**
 * Hover geometry (fanned): siblings rise in a tilted cascade so each file card
 * exposes its own name strip + remove affordance.
 */
const FAN_BASE_Y = -9;
const FAN_STEP_Y = -25;
const FAN_STEP_X = 6;
const FAN_STEP_ROT = 4.6;

export const PEAKED_ACCENT_BY_KIND: Record<ComposerAttachmentKind, string> = {
  image: "#60a5fa",
  note: "#facc15",
  event: "#fb7185",
  voice: "#f43f5e",
  docs: "#34d399",
};

interface PickerTemplate {
  id: string;
  name: string;
  subtitle: string;
  kind: ComposerAttachmentKind;
  accept: string;
  accent: string;
}

const PICKER_GROUPS: PickerTemplate[] = [
  {
    id: "picker-image",
    name: "Foto",
    subtitle: "Gambar",
    kind: "image",
    accept: "image/*",
    accent: PEAKED_ACCENT_BY_KIND.image,
  },
  {
    id: "picker-note",
    name: "Catatan",
    subtitle: "Teks / Kode",
    kind: "note",
    accept: ".md,.txt,.json,.ts,.tsx,.js,.jsx,.py,.csv,.yaml,.yml,.log,text/*",
    accent: PEAKED_ACCENT_BY_KIND.note,
  },
  {
    id: "picker-event",
    name: "Jadwal",
    subtitle: "Kalender",
    kind: "event",
    accept: ".ics,text/calendar,.csv",
    accent: PEAKED_ACCENT_BY_KIND.event,
  },
  {
    id: "picker-docs",
    name: "Berkas",
    subtitle: "PDF / Semua",
    kind: "docs",
    accept: "*/*",
    accent: PEAKED_ACCENT_BY_KIND.docs,
  },
];

/**
 * Audio has no dedicated picker card, so it rides inside "Berkas" (which already
 * accepts *​/*). Nothing may ever be dropped from the deck.
 */
const GROUP_ID_BY_KIND: Record<ComposerAttachmentKind, string> = {
  image: "picker-image",
  note: "picker-note",
  event: "picker-event",
  docs: "picker-docs",
  voice: "picker-docs",
};

export function classifyAttachment(file: {
  name: string;
  type: string;
}): ComposerAttachmentKind {
  const mime = (file.type || "").toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"].includes(ext)
  ) {
    return "image";
  }
  if (mime.startsWith("audio/") || ["mp3", "m4a", "wav", "ogg", "webm"].includes(ext)) {
    return "voice";
  }
  if (ext === "ics" || mime === "text/calendar") {
    return "event";
  }
  if (
    ["md", "txt", "json", "ts", "tsx", "js", "jsx", "py", "yaml", "yml", "log"].includes(
      ext
    ) ||
    mime.startsWith("text/plain") ||
    mime === "text/markdown"
  ) {
    return "note";
  }
  return "docs";
}

export function formatAttachmentChipSummary(attachments: ComposerAttachment[]): {
  countLabel: string;
  formatsLabel: string;
  text: string;
} {
  const count = attachments.length;
  const countLabel = `${count} file`;
  const seen = new Set<string>();
  const formats: string[] = [];

  for (const item of attachments) {
    const rawExt = item.name.includes(".")
      ? item.name.split(".").pop()?.trim().toUpperCase()
      : "";
    const fmt =
      rawExt && rawExt.length <= 5
        ? rawExt
        : item.kind === "image"
          ? "IMG"
          : item.kind === "note"
            ? "TXT"
            : item.kind === "event"
              ? "ICS"
              : item.kind === "voice"
                ? "AUD"
                : "DOC";
    if (!seen.has(fmt)) {
      seen.add(fmt);
      formats.push(fmt);
    }
  }

  const head = formats.slice(0, 2).join(", ");
  const extra = formats.length > 2 ? ` +${formats.length - 2}` : "";
  const formatsLabel = `${head}${extra}`;
  return {
    countLabel,
    formatsLabel,
    text: `${countLabel} · ${formatsLabel}`,
  };
}

interface WingSlot {
  x: number;
  y: number;
  rot: number;
  z: number;
}

function computePeakedSlot(params: {
  idx: number;
  count: number;
  deckWidth: number;
  crestLeft: number;
  crestWidth: number;
  shoulderWidth: number;
  isActivePose: boolean;
}): WingSlot {
  const { idx, count, deckWidth, crestLeft, crestWidth, shoulderWidth, isActivePose } =
    params;

  const isCompact = deckWidth > 0 && deckWidth < 480;
  const cardW = isCompact ? 74 : 88;

  // Idle pose (Crest rests left) -> cards breathe across the open right horizon
  if (!isActivePose) {
    const zoneStart = Math.max(182, crestLeft + crestWidth + shoulderWidth + 8);
    const zoneEnd = Math.max(zoneStart + cardW, deckWidth - 16);
    const avail = Math.max(0, zoneEnd - zoneStart - cardW);
    const step = count <= 1 ? 0 : Math.min(isCompact ? 42 : 70, avail / (count - 1));
    const span = step * (count - 1);
    const groupStart = zoneStart + Math.max(0, avail - span) * 0.52;
    const x = groupStart + idx * step;
    const rel = idx - (count - 1) / 2;
    return {
      x,
      y: Math.abs(rel) * 3.0,
      rot: rel * 3.6,
      z: idx + 1,
    };
  }

  // Active pose (Crest centered, Momo perched above) -> split-wing around shoulders
  const leftOuter = 14;
  const leftInnerLimit = crestLeft - shoulderWidth - 10;
  const leftCapacity = leftInnerLimit - leftOuter - cardW;
  const splitAt = !isCompact && leftCapacity >= 8 && count >= 2 ? Math.floor(count / 2) : 0;

  if (idx < splitAt) {
    const wingN = splitAt;
    const availL = Math.max(0, leftCapacity);
    const stepL = wingN <= 1 ? 0 : Math.min(64, availL / (wingN - 1));
    const rightMostX = leftInnerLimit - cardW;
    const wingStart = rightMostX - stepL * (wingN - 1);
    const x = Math.max(leftOuter, wingStart + idx * stepL);
    const t = wingN === 1 ? 0.5 : idx / (wingN - 1);
    return {
      x,
      y: (wingN - 1 - idx) * 3.4,
      rot: -6.5 + t * 4,
      z: idx + 1,
    };
  }

  const rIdx = idx - splitAt;
  const rN = count - splitAt;
  const wingRStart = crestLeft + crestWidth + shoulderWidth + 10;
  const wingREnd = Math.max(wingRStart + cardW, deckWidth - 16);
  const availR = Math.max(0, wingREnd - wingRStart - cardW);
  const stepR = rN <= 1 ? 0 : Math.min(isCompact ? 20 : 64, availR / (rN - 1));
  const x = Math.min(wingREnd - cardW, wingRStart + rIdx * stepR);
  const t = rN === 1 ? 0.45 : rIdx / (rN - 1);

  return {
    x,
    y: rIdx * 3.0,
    rot: 2.5 + t * 4.8,
    z: 2 + rIdx,
  };
}

function CardMiniArtwork({
  kind,
  isDark,
}: {
  kind: ComposerAttachmentKind;
  isDark: boolean;
}) {
  const artTone = isDark ? "rgba(203, 213, 225, 0.44)" : "rgba(71, 85, 105, 0.34)";
  const deepTone = isDark ? "rgba(244, 244, 245, 0.8)" : "rgba(30, 41, 59, 0.74)";

  if (kind === "image") {
    return (
      <svg viewBox="0 0 80 52" className="h-6 w-9" fill="none" aria-hidden="true">
        <path
          d="M52 4c1.3 7 3.5 9.2 10.5 10.5-7 1.3-9.2 3.5-10.5 10.5-1.3-7-3.5-9.2-10.5-10.5 7-1.3 9.2-3.5 10.5-10.5Z"
          fill={deepTone}
        />
        <path
          d="M22 17 32 35H12Z"
          stroke={artTone}
          strokeWidth="4.8"
          strokeLinejoin="round"
        />
        <circle cx="52" cy="40" r="6.5" stroke={artTone} strokeWidth="4.8" />
      </svg>
    );
  }

  if (kind === "note") {
    return (
      <div className="w-11 space-y-1 pt-0.5" aria-hidden="true">
        <div className="h-1.5 w-full rounded-full" style={{ background: deepTone }} />
        <div className="h-1.5 w-4/5 rounded-full" style={{ background: artTone }} />
        <div className="h-1.5 w-3/5 rounded-full" style={{ background: artTone }} />
      </div>
    );
  }

  if (kind === "event") {
    return <ClientEventDayNum deepTone={deepTone} />;
  }

  if (kind === "voice") {
    return (
      <svg viewBox="0 0 80 52" className="h-6 w-9" fill="none" aria-hidden="true">
        <path
          d="M18 28c0 11 9.5 18 22 18s22-7 22-18"
          stroke={artTone}
          strokeWidth="4.8"
          strokeLinecap="round"
        />
        <rect x="28" y="3" width="24" height="33" rx="12" fill={deepTone} />
        <circle cx="40" cy="36" r="7.5" fill="#f43f5e" />
        <circle cx="40" cy="36" r="2.8" fill="#ffffff" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 80 52" className="h-6 w-9" fill="none" aria-hidden="true">
      <rect x="19" y="4" width="42" height="43" rx="6.5" fill={artTone} />
      <rect
        x="28"
        y="16"
        width="24"
        height="4.2"
        rx="2"
        fill={isDark ? "#1e2028" : "#ffffff"}
      />
      <rect
        x="28"
        y="25"
        width="18"
        height="4.2"
        rx="2"
        fill={isDark ? "#1e2028" : "#ffffff"}
      />
    </svg>
  );
}

interface CardDisplayItem {
  id: string;
  name: string;
  subtitle?: string;
  kind: ComposerAttachmentKind;
  accent: string;
  previewUrl?: string;
  status?: "uploading" | "ready";
  accept?: string;
}

interface CardChromeProps {
  item: CardDisplayItem;
  isDark: boolean;
  isPicker: boolean;
  depth: number;
  expanded: boolean;
  onRemove?: (id: string) => void;
}

function CardChrome({
  item,
  isDark,
  isPicker,
  depth,
  expanded,
  onRemove,
}: CardChromeProps) {
  const accent = item.accent || PEAKED_ACCENT_BY_KIND[item.kind];
  const hasTopBand = item.kind === "note" || item.kind === "event";
  const hasPeel = item.kind === "docs";
  const hasImagePreview = item.kind === "image" && Boolean(item.previewUrl);
  const isFront = depth === 0;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[13px]"
      style={{
        background: hasImagePreview
          ? "var(--m3-plate-idle-edge) border-box"
          : "var(--m3-plate-idle) padding-box, var(--m3-plate-idle-edge) border-box",
        backgroundColor: hasImagePreview ? undefined : "var(--card)",
        border: "1px solid transparent",
        boxShadow: isDark
          ? "var(--m3-plate-idle-in), 0 10px 22px -6px rgba(0, 0, 0, 0.72)"
          : "var(--m3-plate-idle-in), 0 8px 18px -6px rgba(15, 23, 42, 0.14)",
      }}
    >
      {hasImagePreview && (
        <>
          <img
            src={item.previewUrl}
            alt={item.name}
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-black/15 to-transparent"
          />
        </>
      )}

      {hasTopBand && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 right-0 h-[7px]"
          style={{ background: accent }}
        />
      )}

      {hasPeel && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 h-[16px] w-[16px] rounded-bl-[5px]"
          style={{
            background: isDark
              ? "linear-gradient(225deg, transparent 50%, rgba(255,255,255,0.18) 50%)"
              : "linear-gradient(225deg, transparent 50%, rgba(15,23,42,0.12) 50%)",
          }}
        />
      )}

      {!isPicker && item.status === "uploading" && (
        <motion.svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-1.5 right-1.5 h-3.5 w-3.5"
        >
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            stroke={isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)"}
            strokeWidth="2"
          />
          <motion.circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            stroke={accent}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="38"
            initial={{ strokeDashoffset: 38 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.svg>
      )}

      {!isPicker && onRemove && (
        <button
          type="button"
          data-remove-card="true"
          aria-label={`Hapus ${item.name}`}
          title={`Hapus ${item.name}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className={`absolute top-[3px] right-[3px] z-10 flex h-[14px] w-[14px] cursor-pointer items-center justify-center rounded-full bg-black/75 text-[9px] leading-none text-white transition-opacity duration-150 group-focus-within:opacity-100 ${
            expanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          &times;
        </button>
      )}

      <div
        className={`relative z-[1] flex flex-col items-start gap-0.5 px-2 ${
          !isFront ? "pt-1.5" : hasTopBand ? "pt-2.5" : "pt-2"
        }`}
      >
        <div
          className="w-full truncate pr-[17px] text-[9.5px] font-semibold leading-tight"
          style={{
            color: hasImagePreview ? "#ffffff" : "var(--ink)",
          }}
        >
          {item.name}
        </div>
        {!hasImagePreview && isFront && (
          <div className="flex w-full items-center justify-center pt-0.5">
            <CardMiniArtwork kind={item.kind} isDark={isDark} />
          </div>
        )}
      </div>

    </div>
  );
}

interface StackLayerProps {
  file: ComposerAttachment;
  depth: number;
  isDark: boolean;
  expanded: boolean;
  isCompact: boolean;
  reducedMotion: boolean;
  onRemove: (id: string) => void;
  onToggleStack: () => void;
}

const StackLayer: React.FC<StackLayerProps> = ({
  file,
  depth,
  isDark,
  expanded,
  isCompact,
  reducedMotion,
  onRemove,
  onToggleStack,
}) => {
  const dir = depth % 2 === 1 ? -1 : 1;

  const restX = dir * PEEK_STEP_X * depth;
  const restY = PEEK_STEP_Y * depth;
  const restRot = dir * PEEK_STEP_ROT * Math.min(depth, 3);
  const restScale = 1 - PEEK_SCALE_STEP * depth;

  const fanX = dir * FAN_STEP_X * depth;
  const fanY = FAN_BASE_Y + FAN_STEP_Y * depth;
  const fanRot = dir * (FAN_STEP_ROT + FAN_STEP_ROT * 0.5 * (depth - 1));
  const fanScale = 1 - PEEK_SCALE_STEP * 0.5 * depth;

  const item: CardDisplayItem = {
    id: file.id,
    name: file.name,
    kind: file.kind,
    accent: file.accent || PEAKED_ACCENT_BY_KIND[file.kind],
    previewUrl: file.previewUrl,
    status: file.status,
  };

  return (
    <motion.div
      data-peaked-card="true"
      data-peaked-mode="uploaded"
      data-card-id={file.id}
      data-file-name={file.name}
      data-stack-depth={depth}
      data-hovered="false"
      aria-label={`Lampiran ${file.name}`}
      title={file.name}
      className="absolute left-0 top-0 overflow-hidden rounded-[13px]"
      style={{
        width: isCompact ? 74 : 88,
        height: isCompact ? 80 : 86,
        zIndex: 20 - depth,
        transformOrigin: "50% 85%",
        touchAction: "manipulation",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggleStack();
      }}
      initial={{
        opacity: 0,
        x: restX,
        y: restY + 14,
        rotate: 0,
        scale: restScale * 0.9,
      }}
      animate={{
        opacity: 1,
        x: expanded ? fanX : restX,
        y: expanded ? fanY : restY,
        rotate: expanded ? fanRot : restRot,
        scale: expanded ? fanScale : restScale,
      }}
      exit={{ opacity: 0, y: restY + 18, scale: restScale * 0.88 }}
      transition={reducedMotion ? { duration: 0 } : SPRING_LAYER}
    >
      <CardChrome
        item={item}
        isDark={isDark}
        isPicker={false}
        depth={depth}
        expanded={expanded}
        onRemove={onRemove}
      />
    </motion.div>
  );
};

interface PeekGroupCardProps {
  group: PickerTemplate;
  files: ComposerAttachment[];
  idx: number;
  groupCount: number;
  hoveredGroup: string | null;
  pinnedGroup: string | null;
  deckWidth: number;
  tabLeftMV: MotionValue<number>;
  tabWidthMV: MotionValue<number>;
  shoulderWidth: number;
  isActivePose: boolean;
  isDark: boolean;
  reducedMotion: boolean;
  onHoverChange: (id: string | null) => void;
  onPinChange: (id: string | null) => void;
  onPick: (accept: string) => void;
  onRemove: (id: string) => void;
}

const PeekGroupCard: React.FC<PeekGroupCardProps> = ({
  group,
  files,
  idx,
  groupCount,
  hoveredGroup,
  pinnedGroup,
  deckWidth,
  tabLeftMV,
  tabWidthMV,
  shoulderWidth,
  isActivePose,
  isDark,
  reducedMotion,
  onHoverChange,
  onPinChange,
  onPick,
  onRemove,
}) => {
  const isHovered = hoveredGroup === group.id;
  const isPinned = pinnedGroup === group.id;
  const count = files.length;
  const hasStack = count > 0;
  const expanded = hasStack && (isHovered || isPinned);
  // A card with no files still reacts: it peaks up and tilts on hover.
  const hoverPeak = isHovered && !hasStack;
  const isDimmed = hoveredGroup !== null && !isHovered;

  // Staggered page-load entrance: card 0 lands first, then 1, 2, 3.
  const [entered, setEntered] = useState(reducedMotion);
  useEffect(() => {
    if (reducedMotion) {
      setEntered(true);
      return;
    }
    const timer = window.setTimeout(() => setEntered(true), 120 + idx * 105);
    return () => window.clearTimeout(timer);
  }, [idx, reducedMotion]);

  const initialSlot = computePeakedSlot({
    idx,
    count: groupCount,
    deckWidth,
    crestLeft: tabLeftMV.get(),
    crestWidth: tabWidthMV.get(),
    shoulderWidth,
    isActivePose,
  });

  const xSpring = useSpring(initialSlot.x, SPRING_WING);
  const ySpring = useSpring(
    reducedMotion ? initialSlot.y : initialSlot.y + 16,
    SPRING_WING
  );
  const rotSpring = useSpring(initialSlot.rot, SPRING_WING);
  const scaleSpring = useSpring(reducedMotion ? 1 : 0.82, SPRING_SCALE);
  const [zOrder, setZOrder] = useState(initialSlot.z);
  const firstEntryRef = useRef(true);

  const syncPosition = useCallback(
    (instant = false) => {
      if (!entered) return;
      const slot = computePeakedSlot({
        idx,
        count: groupCount,
        deckWidth,
        crestLeft: tabLeftMV.get(),
        crestWidth: tabWidthMV.get(),
        shoulderWidth,
        isActivePose,
      });

      // The shell only breathes; the layers own the vertical fan-out.
      const lift = expanded || hoverPeak ? -6 : 0;
      const targetScale = expanded ? 1.03 : hoverPeak ? 1.06 : 1;
      const targetRot = hoverPeak ? slot.rot + (idx % 2 === 0 ? -2.2 : 2.2) : slot.rot;

      setZOrder(expanded ? 44 : hoverPeak ? 40 : slot.z);

      // First entry: snap the lateral slot (measurements may still be cold)
      // and let only y/scale ride the spring, so cards rise instead of sliding in.
      if (firstEntryRef.current) {
        firstEntryRef.current = false;
        xSpring.jump(slot.x);
        rotSpring.jump(targetRot);
        ySpring.set(slot.y + lift);
        scaleSpring.set(targetScale);
        return;
      }

      if (instant || reducedMotion) {
        xSpring.jump(slot.x);
        ySpring.jump(slot.y + lift);
        rotSpring.jump(targetRot);
        scaleSpring.jump(targetScale);
      } else {
        xSpring.set(slot.x);
        ySpring.set(slot.y + lift);
        rotSpring.set(targetRot);
        scaleSpring.set(targetScale);
      }
    },
    [
      idx,
      groupCount,
      deckWidth,
      tabLeftMV,
      tabWidthMV,
      shoulderWidth,
      isActivePose,
      expanded,
      hoverPeak,
      entered,
      reducedMotion,
      xSpring,
      ySpring,
      rotSpring,
      scaleSpring,
    ]
  );

  useEffect(() => {
    syncPosition(false);
  }, [syncPosition, entered]);

  useMotionValueEvent(tabLeftMV, "change", () => syncPosition(false));
  useMotionValueEvent(tabWidthMV, "change", () => syncPosition(false));

  useEffect(() => {
    if (count === 0 && isPinned) onPinChange(null);
  }, [count, isPinned, onPinChange]);

  const isCompact = deckWidth > 0 && deckWidth < 480;
  const cardW = isCompact ? 74 : 88;
  const cardH = isCompact ? 80 : 86;

  const frontFile = count > 0 ? files[count - 1] : null;
  const layers = useMemo(
    () => files.slice(0, Math.max(0, count - 1)).map((f, i) => ({ file: f, depth: count - 1 - i })),
    [files, count]
  );

  const frontItem: CardDisplayItem = frontFile
    ? {
        id: frontFile.id,
        name: frontFile.name,
        kind: frontFile.kind,
        accent: frontFile.accent || PEAKED_ACCENT_BY_KIND[frontFile.kind],
        previewUrl: frontFile.previewUrl,
        status: frontFile.status,
      }
    : {
        id: group.id,
        name: group.name,
        subtitle: group.subtitle,
        kind: group.kind,
        accent: group.accent,
        accept: group.accept,
      };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      data-peaked-card="true"
      data-peaked-mode="picker"
      data-peaked-group={group.id}
      data-card-id={group.id}
      data-file-name={frontFile?.name ?? group.name}
      data-stack-count={count}
      data-entered={entered ? "true" : "false"}
      data-expanded={expanded ? "true" : "false"}
      data-hovered={isHovered ? "true" : "false"}
      aria-label={
        frontFile
          ? `Kartu ${group.name}, ${count} file. Tekan untuk membuka tumpukan.`
          : `Lampirkan ${group.name} (${group.subtitle})`
      }
      title={frontFile ? `${group.name} · ${count} file` : `Pilih ${group.name}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: entered ? (isDimmed ? 0.72 : 1) : 0 }}
      transition={{ duration: reducedMotion ? 0.1 : 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="group pointer-events-auto absolute left-0 cursor-pointer select-none focus:outline-none"
      style={{
        x: xSpring,
        y: ySpring,
        rotate: rotSpring,
        scale: scaleSpring,
        zIndex: zOrder,
        width: cardW,
        height: cardH,
        bottom: -38,
        transformOrigin: "50% 85%",
      }}
      onPointerEnter={() => onHoverChange(group.id)}
      onPointerLeave={() => onHoverChange(null)}
      onFocus={(e) => {
        if (e.target === e.currentTarget) onPinChange(group.id);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          if (isPinned) onPinChange(null);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (frontFile) onPinChange(isPinned ? null : group.id);
          else onPick(group.accept);
        }
        if (e.key === "Escape" && isPinned) {
          onPinChange(null);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (frontFile) onPinChange(isPinned ? null : group.id);
        else onPick(group.accept);
      }}
    >
      {/* Back-of-deck layers: lined up on the same footprint, peeking above. */}
      <AnimatePresence initial={false}>
        {layers.map(({ file, depth }) => (
          <StackLayer
            key={file.id}
            file={file}
            depth={depth}
            isDark={isDark}
            expanded={expanded}
            isCompact={isCompact}
            reducedMotion={reducedMotion}
            onRemove={onRemove}
            onToggleStack={() => onPinChange(isPinned ? null : group.id)}
          />
        ))}
      </AnimatePresence>

      {/* Front card owns the slot footprint. */}
      <div
        {...(frontFile
          ? {
              "data-peaked-card": "true",
              "data-peaked-mode": "uploaded",
              "data-card-id": frontFile.id,
              "data-file-name": frontItem.name,
              "data-stack-depth": 0,
              "data-hovered": isHovered ? "true" : "false",
              "aria-hidden": "true",
            }
          : { "aria-hidden": "true" })}
        className="absolute left-0 top-0 overflow-visible rounded-[13px]"
        style={{
          width: cardW,
          height: cardH,
          zIndex: 24,
          transformOrigin: "50% 85%",
        }}
      >
        <CardChrome
          item={frontItem}
          isDark={isDark}
          isPicker={!frontFile}
          depth={0}
          expanded={expanded}
          onRemove={frontFile ? onRemove : undefined}
        />
      </div>
    </motion.div>
  );
};

export interface PeakedAttachmentFanProps {
  attachments: ComposerAttachment[];
  deckWidth: number;
  tabHeight: number;
  shoulderWidth: number;
  tabLeftMV: MotionValue<number>;
  tabWidthMV: MotionValue<number>;
  isActivePose: boolean;
  isDark: boolean;
  onPickAccept: (accept: string) => void;
  onRemove: (id: string) => void;
}

export const PeakedAttachmentFan: React.FC<PeakedAttachmentFanProps> = ({
  attachments,
  deckWidth,
  tabHeight,
  shoulderWidth,
  tabLeftMV,
  tabWidthMV,
  isActivePose,
  isDark,
  onPickAccept,
  onRemove,
}) => {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [pinnedGroup, setPinnedGroup] = useState<string | null>(null);
  const groupCount = PICKER_GROUPS.length;

  // Bucket files under their owning picker card. Nothing is ever thrown away,
  // including kinds that do not have a card of their own (audio -> Berkas).
  const filesByGroup = useMemo(() => {
    const map = new Map<string, ComposerAttachment[]>();
    for (const group of PICKER_GROUPS) map.set(group.id, []);
    for (const file of attachments) {
      const key = GROUP_ID_BY_KIND[file.kind] ?? "picker-docs";
      const bucket = map.get(key) ?? map.get("picker-docs");
      bucket?.push(file);
    }
    return map;
  }, [attachments]);

  const totalCount = attachments.length;
  const prevTotalRef = useRef(totalCount);

  // Clear stale hover/pin bookkeeping when the deck content changes underneath.
  useEffect(() => {
    if (prevTotalRef.current !== totalCount) {
      prevTotalRef.current = totalCount;
      setPinnedGroup(null);
    }
  }, [totalCount]);

  return (
    <div
      style={{ top: `${tabHeight}px` }}
      className="pointer-events-none absolute left-0 right-0 z-[2] h-0 overflow-visible"
    >
      {PICKER_GROUPS.map((group, idx) => (
        <PeekGroupCard
          key={group.id}
          group={group}
          files={filesByGroup.get(group.id) ?? []}
          idx={idx}
          groupCount={groupCount}
          hoveredGroup={hoveredGroup}
          pinnedGroup={pinnedGroup}
          deckWidth={deckWidth}
          tabLeftMV={tabLeftMV}
          tabWidthMV={tabWidthMV}
          shoulderWidth={shoulderWidth}
          isActivePose={isActivePose}
          isDark={isDark}
          reducedMotion={prefersReducedMotion}
          onHoverChange={setHoveredGroup}
          onPinChange={setPinnedGroup}
          onPick={onPickAccept}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};
