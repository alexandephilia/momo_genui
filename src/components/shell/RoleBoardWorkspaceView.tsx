"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Check,
  Columns3,
  GripVertical,
  LayoutGrid,
  Minus,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useSpring,
} from "motion/react";
import {
  MistlineMediaScopeProvider,
  MistlinePhoto,
} from "@/components/genui/MistlineLibrary";
import {
  PinboardStickerGlyph,
  stickerShapeOf,
} from "@/components/genui/BoardSticker";
import { isAbstractNonVisualTitle } from "@/lib/imageAssetContract";
import { renderInlineMarkdown } from "@/lib/renderInlineMarkdown";
import {
  EASE_MOMO,
  MOTION_VOCABULARY,
} from "@/components/motion/MotionPrimitives";
import type {
  UiInteractionPayload,
  WorkspaceBoardColumn,
  WorkspaceBoardItem,
} from "@/types/momo";

export interface RoleBoardWorkspaceViewProps {
  roleLabel: string;
  sessionTitle: string;
  boardLabel: string;
  columns: WorkspaceBoardColumn[];
  items: WorkspaceBoardItem[];
  reshapeChips: Array<{ label: string; prompt: string }>;
  busy?: boolean;
  onMoveItem: (itemId: string, targetColumnId: string, targetIndex?: number) => void;
  onAddItem: (
    columnId: string,
    item: Omit<WorkspaceBoardItem, "id" | "columnId">,
  ) => void;
  onUpdateItem?: (
    itemId: string,
    patch: Partial<WorkspaceBoardItem>,
  ) => void;
  onDeleteItem?: (itemId: string) => void;
  onSwitchToChat?: () => void;
  onPromptAction: (
    prompt: string,
    uiInteraction?: UiInteractionPayload,
  ) => void;
}

const ESCAPE_HUD_THRESHOLD = 140;
const DEFAULT_BOARD_PAN_X = 32;
const DEFAULT_BOARD_PAN_Y = 64;
const DEFAULT_BOARD_ZOOM = 0.88;
const MIN_BOARD_ZOOM = 0.72;
const MAX_BOARD_ZOOM = 1.15;
const ABSTRACT_SLOTS = new Set([
  "stats",
  "checklist",
  "steps",
  "flow",
  "code",
  "callout",
  "versus",
  "diagram",
  "palette",
]);

type BoardFilterMode = "all" | "active" | "starred" | "done";

const mountedBoardCardIds = new Set<string>();

interface BoardItemCardProps {
  item: WorkspaceBoardItem;
  resolvedImageUrl?: string;
  colIdx: number;
  columns: WorkspaceBoardColumn[];
  roleLabel: string;
  isStarred: boolean;
  isDone: boolean;
  isDragging?: boolean;
  isDragOverlay?: boolean;
  previewMedia?: Node | null;
  onToggleStar: (itemId: string) => void;
  onToggleDone: (itemId: string) => void;
  onMoveItem: (itemId: string, targetColId: string, targetIndex?: number) => void;
  onDeepDive: (item: WorkspaceBoardItem) => void;
  onLockResolvedImage?: (itemId: string, url: string) => void;
  onUpdateItem?: (itemId: string, patch: Partial<WorkspaceBoardItem>) => void;
  onDeleteItem?: (itemId: string) => void;
  onStickerMenu?: (itemId: string, x: number, y: number) => void;
  onCardPointerDown?: (
    item: WorkspaceBoardItem,
    e: React.PointerEvent<HTMLElement>,
  ) => void;
}

const BoardItemCardInner: React.FC<BoardItemCardProps> = ({
  item,
  resolvedImageUrl,
  colIdx,
  columns,
  roleLabel,
  isStarred,
  isDone,
  isDragging = false,
  isDragOverlay = false,
  previewMedia,
  onToggleStar,
  onToggleDone,
  onMoveItem,
  onDeepDive,
  onLockResolvedImage,
  onUpdateItem,
  onDeleteItem,
  onStickerMenu,
  onCardPointerDown,
}) => {
  const skipEntranceAnim = isDragOverlay || mountedBoardCardIds.has(item.id);
  useEffect(() => {
    if (!isDragOverlay && item.id) {
      if (mountedBoardCardIds.size >= 800) {
        const first = mountedBoardCardIds.values().next().value;
        if (first) mountedBoardCardIds.delete(first);
      }
      mountedBoardCardIds.add(item.id);
    }
  }, [isDragOverlay, item.id]);

  const stickerKind = stickerShapeOf(item);
  const slotLower = (item.slot || "").trim().toLowerCase();
  const cleanTitle = (item.title || roleLabel).trim();
  const lockedSrc = (item.imageUrl || resolvedImageUrl || "").trim() || undefined;
  const cleanImageQuery =
    item.imageQuery && !isAbstractNonVisualTitle(item.imageQuery)
      ? item.imageQuery.trim()
      : undefined;
  const hasExplicitVisual = Boolean(lockedSrc || cleanImageQuery);
  const autoResolveLegacy =
    !hasExplicitVisual &&
    Boolean(item.title) &&
    item.title.length >= 4 &&
    !ABSTRACT_SLOTS.has(slotLower) &&
    !isAbstractNonVisualTitle(cleanTitle);
  const showVisual = hasExplicitVisual || autoResolveLegacy;
  const nextCol =
    columns.length > 1 ? columns[(colIdx + 1) % columns.length] : null;
  const cleanFallback =
    item.slot &&
    item.slot.trim().toLowerCase() !== cleanTitle.toLowerCase() &&
    item.slot.trim().toLowerCase() !== roleLabel.trim().toLowerCase() &&
    !ABSTRACT_SLOTS.has(slotLower) &&
    !isAbstractNonVisualTitle(item.slot)
      ? `${cleanTitle} ${item.slot.trim()}`
      : undefined;

  return (
    <motion.div
      layout={isDragOverlay ? false : "position"}
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
      className="momo-board-card-wrap"
    >
      <motion.article
        data-board-card-id={isDragOverlay ? undefined : item.id}
        data-board-drag-preview={isDragOverlay ? "true" : undefined}
        data-board-col-id={item.columnId}
        className={`momo-board-card${showVisual ? " has-photo" : ""}${isDragging ? " is-dragging" : ""}${isDragOverlay ? " is-drag-overlay" : ""}${isDone ? " is-done" : ""}`}
        style={onCardPointerDown || isDragOverlay ? undefined : { cursor: "default" }}
        initial={skipEntranceAnim ? false : { opacity: 0, y: 8, scale: 0.98 }}
        animate={{
          opacity: isDragOverlay ? 1 : isDragging ? 0.28 : isDone ? 0.72 : 1,
          y: 0,
          scale: 1,
        }}
        whileHover={isDragOverlay ? undefined : { y: -2 }}
        transition={{
          duration: MOTION_VOCABULARY.durations.fast,
          ease: MOTION_VOCABULARY.easings.standard,
        }}
        onPointerDown={
          onCardPointerDown ? (e) => onCardPointerDown(item, e) : undefined
        }
      >
        {/* Corner aesthetic tilted die-cut vinyl sticker (non-circular) */}
        <motion.button
          type="button"
          aria-label="Tandai prioritas"
          aria-pressed={isStarred}
          className={`momo-board-card-sticker${isStarred ? " is-active" : ""}${stickerKind === "heart" ? " is-heart" : ""}`}
          initial={false}
          animate={{
            rotate: isStarred ? 13 : 9,
            scale: isStarred ? 1.04 : 0.94,
          }}
          whileHover={{ rotate: -6, scale: 1.18 }}
          whileTap={{ rotate: 16, scale: 0.88 }}
          transition={{ type: "spring", stiffness: 460, damping: 24 }}
          onPointerDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!stickerKind) onStickerMenu?.(item.id, e.clientX, e.clientY);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(item.id);
          }}
        >
          <PinboardStickerGlyph kind={stickerKind || "none"} active={Boolean(stickerKind)} />
        </motion.button>

        {isDragOverlay ? previewMedia && (
          <div
            className="momo-board-card-photo"
            ref={(host) => {
              if (host && previewMedia.parentNode !== host) host.replaceChildren(previewMedia);
            }}
          />
        ) : showVisual && (
          <div className="momo-board-card-photo">
            <MistlinePhoto
              src={lockedSrc}
              query={cleanImageQuery || (autoResolveLegacy ? cleanTitle : undefined)}
              fallbackQuery={cleanFallback}
              autoResolve={autoResolveLegacy}
              seed={cleanTitle}
              ratio="16/10"
              slotKey={`board-card-${item.id}`}
              onResolvedUrl={(url) => {
                onLockResolvedImage?.(item.id, url);
                if (!item.imageUrl && onUpdateItem) {
                  onUpdateItem(item.id, { imageUrl: url });
                }
              }}
            />
          </div>
        )}

        <div className="momo-board-card-meta">
          {onCardPointerDown && (
            <span className="momo-board-drag-grip" aria-hidden="true" title="Tarik untuk memindahkan">
              <GripVertical size={12} />
            </span>
          )}
          <button
            type="button"
            className={`momo-board-done-btn${isDone ? " is-checked" : ""}`}
            aria-label={isDone ? "Tandai belum selesai" : "Tandai selesai"}
            aria-pressed={isDone}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone(item.id);
            }}
          >
            <Check size={11} strokeWidth={2.8} />
          </button>
          <span className="momo-board-card-slot" title={item.slot || roleLabel}>
            {item.slot || roleLabel}
          </span>
        </div>

        {item.metric && (
          <div className="momo-board-metric-row">
            <span className="momo-board-metric-chip" title={item.metric}>
              {item.metric}
            </span>
          </div>
        )}

        <strong className={`momo-board-card-title${isDone ? " is-done" : ""}`}>
          {renderInlineMarkdown(item.title)}
        </strong>

        {item.subtitle && (
          <p className="momo-board-card-sub">
            {renderInlineMarkdown(item.subtitle)}
          </p>
        )}

        {item.handNote && (
          <div className="momo-board-hand-caption" title={item.handNote}>
            <svg viewBox="0 0 24 22" className="momo-board-curved-arrow" aria-hidden="true">
              <path
                d="M5 2 C 5 13, 10 16, 20 15 M16 12 L20 15 L16 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="momo-hand momo-board-caption-text">
              {item.handNote}
            </span>
          </div>
        )}

        <div
          className="momo-board-card-actions"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="momo-board-card-act"
            onClick={(e) => {
              e.stopPropagation();
              onDeepDive(item);
            }}
          >
            <Sparkles size={11} />
            <span>Dalami</span>
          </button>
          {nextCol && nextCol.id !== item.columnId && (
            <button
              type="button"
              className="momo-board-card-act"
              title={`Pindah ke ${nextCol.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onMoveItem(item.id, nextCol.id);
              }}
            >
              <span>{nextCol.title}</span>
              <ArrowRight size={11} />
            </button>
          )}
          {onDeleteItem && (
            <button
              type="button"
              className="momo-board-card-act is-icon"
              title="Hapus kartu"
              aria-label="Hapus kartu"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteItem(item.id);
              }}
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </motion.article>
    </motion.div>
  );
};

const BoardItemCard = React.memo(
  BoardItemCardInner,
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.columnId === next.item.columnId &&
    prev.item.title === next.item.title &&
    prev.item.subtitle === next.item.subtitle &&
    prev.item.slot === next.item.slot &&
    prev.item.metric === next.item.metric &&
    prev.item.handNote === next.item.handNote &&
    prev.item.imageUrl === next.item.imageUrl &&
    prev.item.imageQuery === next.item.imageQuery &&
    prev.item.pin === next.item.pin &&
    prev.item.sticker === next.item.sticker &&
    prev.resolvedImageUrl === next.resolvedImageUrl &&
    prev.colIdx === next.colIdx &&
    prev.columns.length === next.columns.length &&
    prev.roleLabel === next.roleLabel &&
    prev.isStarred === next.isStarred &&
    prev.isDone === next.isDone &&
    prev.isDragging === next.isDragging &&
    prev.isDragOverlay === next.isDragOverlay &&
    prev.previewMedia === next.previewMedia &&
    Boolean(prev.onCardPointerDown) === Boolean(next.onCardPointerDown),
);

export const RoleBoardWorkspaceView: React.FC<RoleBoardWorkspaceViewProps> = ({
  roleLabel,
  sessionTitle,
  boardLabel,
  columns,
  items,
  reshapeChips,
  busy = false,
  onMoveItem,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSwitchToChat,
  onPromptAction,
}) => {
  const panX = useMotionValue(DEFAULT_BOARD_PAN_X);
  const panY = useMotionValue(DEFAULT_BOARD_PAN_Y);
  const dragOverlayX = useMotionValue(0);
  const dragOverlayY = useMotionValue(0);
  const dragRawTilt = useMotionValue(0);
  const dragTilt = useSpring(dragRawTilt, {
    stiffness: 420,
    damping: 28,
    mass: 0.4,
  });

  const [viewMode, setViewMode] = useState<"canvas" | "grid">("canvas");
  const [boardZoom, setBoardZoom] = useState<number>(DEFAULT_BOARD_ZOOM);

  const [localResolvedUrls, setLocalResolvedUrls] = useState<Record<string, string>>({});
  const resolvedUrlsRef = useRef<Record<string, string>>({});
  const lockResolvedImage = useCallback((itemId: string, url: string) => {
    if (!itemId || !url) return;
    if (resolvedUrlsRef.current[itemId] === url) return;
    resolvedUrlsRef.current = { ...resolvedUrlsRef.current, [itemId]: url };
    setLocalResolvedUrls((prev) =>
      prev[itemId] === url ? prev : { ...prev, [itemId]: url },
    );
  }, []);

  const stepBoardZoom = useCallback((delta: number) => {
    setBoardZoom((prev) => {
      const next = Math.round(
        Math.max(MIN_BOARD_ZOOM, Math.min(MAX_BOARD_ZOOM, prev + delta)) * 100,
      ) / 100;
      return next;
    });
  }, []);

  const [isPanning, setIsPanning] = useState(false);
  const [isPannedFar, setIsPannedFar] = useState(false);
  const pannedFarRef = useRef(false);

  const [dragInfo, setDragInfo] = useState<{
    item: WorkspaceBoardItem;
    media: Node | null;
    targetColId: string;
    targetIdx: number;
    width: number;
    height: number;
    offsetWidth: number;
    offsetHeight: number;
  } | null>(null);
  const [starredIds, setStarredIds] = useState<Record<string, boolean>>({});
  const [doneIds, setDoneIds] = useState<Record<string, boolean>>({});
  const [stickerMenu, setStickerMenu] = useState<{
    itemId: string;
    x: number;
    y: number;
  } | null>(null);
  const [filterMode, setFilterMode] = useState<BoardFilterMode>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftColId, setDraftColId] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canvasRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLElement>(null);
  const tiltDecayRef = useRef<number | null>(null);
  const panDragRef = useRef<{
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);

  const cardDragRef = useRef<{
    item: WorkspaceBoardItem;
    media: Node | null;
    startX: number;
    startY: number;
    lastX: number;
    grabOffsetX: number;
    grabOffsetY: number;
    width: number;
    height: number;
    offsetWidth: number;
    offsetHeight: number;
    active: boolean;
    targetColId: string;
    targetIdx: number;
  } | null>(null);

  const itemsRef = useRef<WorkspaceBoardItem[]>(items);
  itemsRef.current = items;

  const beginCardPointerDrag = useCallback(
    (
      item: WorkspaceBoardItem,
      e: React.PointerEvent<HTMLElement>,
    ) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.stopPropagation();
      const colItems = itemsRef.current.filter(
        (it) => it.columnId === item.columnId,
      );
      const rect = e.currentTarget.getBoundingClientRect();
      const grabOffsetX = e.clientX - rect.left;
      const grabOffsetY = e.clientY - rect.top;
      dragOverlayX.set(Math.round(rect.left));
      dragOverlayY.set(Math.round(rect.top));
      dragRawTilt.set(0);
      cardDragRef.current = {
        item,
        media: null,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        grabOffsetX,
        grabOffsetY,
        width: rect.width,
        height: rect.height,
        offsetWidth: e.currentTarget.offsetWidth || rect.width,
        offsetHeight: e.currentTarget.offsetHeight || rect.height,
        active: false,
        targetColId: item.columnId,
        targetIdx: Math.max(
          0,
          colItems.findIndex((it) => it.id === item.id),
        ),
      };
    },
    [dragOverlayX, dragOverlayY, dragRawTilt],
  );

  const syncPannedThreshold = useCallback(() => {
    const dist = Math.hypot(
      panX.get() - DEFAULT_BOARD_PAN_X,
      panY.get() - DEFAULT_BOARD_PAN_Y,
    );
    const nextFar = dist > ESCAPE_HUD_THRESHOLD;
    if (nextFar !== pannedFarRef.current) {
      pannedFarRef.current = nextFar;
      setIsPannedFar(nextFar);
    }
  }, [panX, panY]);

  const handleResetPan = useCallback(() => {
    animate(panX, DEFAULT_BOARD_PAN_X, { duration: 0.34, ease: EASE_MOMO });
    animate(panY, DEFAULT_BOARD_PAN_Y, { duration: 0.34, ease: EASE_MOMO });
    setBoardZoom(DEFAULT_BOARD_ZOOM);
    if (pannedFarRef.current) {
      pannedFarRef.current = false;
      setIsPannedFar(false);
    }
  }, [panX, panY]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (panDragRef.current) {
        panX.set(
          Math.round(
            panDragRef.current.origPanX + (e.clientX - panDragRef.current.startX),
          ),
        );
        panY.set(
          Math.min(
            180,
            Math.round(
              panDragRef.current.origPanY + (e.clientY - panDragRef.current.startY),
            ),
          ),
        );
        syncPannedThreshold();
        return;
      }

      const cd = cardDragRef.current;
      if (!cd) return;
      const dist = Math.hypot(e.clientX - cd.startX, e.clientY - cd.startY);
      if (!cd.active && dist < 5) return;

      const wasInactive = !cd.active;
      if (wasInactive) {
        // Both layouts remove the source card. Carry its actual image (including
        // a resolved fallback) rather than running the media resolver in the portal.
        const board = canvasRef.current ?? gridScrollRef.current;
        const photo = board?.querySelector(
          `[data-board-card-id="${CSS.escape(cd.item.id)}"] .momo-board-card-photo`,
        );
        cd.media = photo?.querySelector("img") ?? photo?.firstElementChild?.cloneNode(true) ?? null;
      }
      cd.active = true;
      const dx = e.clientX - cd.lastX;
      cd.lastX = e.clientX;
      dragOverlayX.set(Math.round(e.clientX - cd.grabOffsetX));
      dragOverlayY.set(Math.round(e.clientY - cd.grabOffsetY));

      const clampedTilt = Math.max(-4.5, Math.min(4.5, dx * 0.24));
      dragRawTilt.set(clampedTilt);
      if (tiltDecayRef.current) window.clearTimeout(tiltDecayRef.current);
      tiltDecayRef.current = window.setTimeout(() => {
        dragRawTilt.set(0);
      }, 90);

      // Edge auto-pan (canvas mode) or auto-scroll (grid mode)
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        let panned = false;
        if (e.clientX < canvasRect.left + 72) {
          panX.set(panX.get() + 10);
          panned = true;
        } else if (e.clientX > canvasRect.right - 72) {
          panX.set(panX.get() - 10);
          panned = true;
        }
        if (e.clientY < canvasRect.top + 76) {
          panY.set(Math.min(180, panY.get() + 11));
          panned = true;
        } else if (e.clientY > canvasRect.bottom - 110) {
          panY.set(panY.get() - 11);
          panned = true;
        }
        if (panned) syncPannedThreshold();
      } else if (gridScrollRef.current) {
        const gRect = gridScrollRef.current.getBoundingClientRect();
        if (e.clientY < gRect.top + 72) {
          gridScrollRef.current.scrollTop -= 12;
        } else if (e.clientY > gRect.bottom - 96) {
          gridScrollRef.current.scrollTop += 12;
        }
      }

      const boardRoot = canvasRef.current || gridScrollRef.current;
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      let foundColId = cd.targetColId;
      let colEl: HTMLElement | null = null;
      for (const el of els) {
        const colAttr = el.getAttribute?.("data-board-column-id");
        if (colAttr) {
          foundColId = colAttr;
          colEl = el as HTMLElement;
          break;
        }
      }
      if (!colEl && boardRoot) {
        const allCols = Array.from(
          boardRoot.querySelectorAll<HTMLElement>("[data-board-column-id]"),
        );
        for (const candidate of allCols) {
          const r = candidate.getBoundingClientRect();
          if (e.clientX >= r.left - 22 && e.clientX <= r.right + 22) {
            foundColId =
              candidate.getAttribute("data-board-column-id") || foundColId;
            colEl = candidate;
            break;
          }
        }
      }

      let foundIdx = cd.targetIdx;
      if (colEl) {
        const cardEls = Array.from(
          colEl.querySelectorAll<HTMLElement>("[data-board-card-id]"),
        ).filter((el) => el.getAttribute("data-board-card-id") !== cd.item.id);
        let idx = 0;
        for (let i = 0; i < cardEls.length; i++) {
          const r = cardEls[i].getBoundingClientRect();
          const thresholdRatio =
            foundColId === cd.targetColId
              ? i < cd.targetIdx
                ? 0.56
                : 0.44
              : 0.5;
          if (e.clientY > r.top + r.height * thresholdRatio) {
            idx = i + 1;
          }
        }
        foundIdx = idx;
      }

      if (wasInactive || foundColId !== cd.targetColId || foundIdx !== cd.targetIdx) {
        cd.targetColId = foundColId;
        cd.targetIdx = foundIdx;
        setDragInfo({
          item: cd.item,
          media: cd.media,
          targetColId: foundColId,
          targetIdx: foundIdx,
          width: cd.width,
          height: cd.height,
          offsetWidth: cd.offsetWidth,
          offsetHeight: cd.offsetHeight,
        });
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (tiltDecayRef.current) {
        window.clearTimeout(tiltDecayRef.current);
        tiltDecayRef.current = null;
      }
      dragRawTilt.set(0);
      if (panDragRef.current) {
        panDragRef.current = null;
        setIsPanning(false);
      }
      const cd = cardDragRef.current;
      if (cd) {
        if (event.type === "pointerup" && cd.active && cd.targetColId) {
          onMoveItem(cd.item.id, cd.targetColId, cd.targetIdx);
        }
        cardDragRef.current = null;
        setDragInfo(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "r" && e.key !== "R") return;
      const active = document.activeElement as HTMLElement | null;
      if (
        active?.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (
        Math.hypot(
          panX.get() - DEFAULT_BOARD_PAN_X,
          panY.get() - DEFAULT_BOARD_PAN_Y,
        ) > 2
      ) {
        handleResetPan();
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    dragOverlayX,
    dragOverlayY,
    dragRawTilt,
    handleResetPan,
    onMoveItem,
    panX,
    panY,
    syncPannedThreshold,
  ]);

  const hasItems = items.length > 0;

  const isItemStarred = useCallback(
    (item: WorkspaceBoardItem) => {
      if (typeof item.starred === "boolean") return item.starred;
      const stickerKind = stickerShapeOf(item);
      return (
        starredIds[item.id] ??
        Boolean(stickerKind === "heart" || stickerKind === "star")
      );
    },
    [starredIds]
  );

  const isItemDone = useCallback(
    (item: WorkspaceBoardItem) => {
      if (typeof item.done === "boolean") return item.done;
      return (
        doneIds[item.id] ?? Boolean(item.pin === "check" || item.sticker === "check")
      );
    },
    [doneIds]
  );

  const toggleStar = useCallback(
    (itemId: string) => {
      const target = items.find((i) => i.id === itemId);
      const cur = target ? isItemStarred(target) : Boolean(starredIds[itemId]);
      const next = !cur;
      if (onUpdateItem) {
        onUpdateItem(itemId, {
          starred: next,
          pin: next ? (target?.pin || "star") : undefined,
          sticker: next ? (target?.sticker || "star") : undefined,
        });
        return;
      }
      setStarredIds((prev) => ({ ...prev, [itemId]: next }));
    },
    [items, isItemStarred, starredIds, onUpdateItem]
  );

  const toggleDone = useCallback(
    (itemId: string) => {
      const target = items.find((i) => i.id === itemId);
      const cur = target ? isItemDone(target) : Boolean(doneIds[itemId]);
      const next = !cur;
      if (onUpdateItem) {
        onUpdateItem(itemId, { done: next });
        return;
      }
      setDoneIds((prev) => ({ ...prev, [itemId]: next }));
    },
    [items, isItemDone, doneIds, onUpdateItem]
  );

  const handleDeepDive = useCallback(
    (item: WorkspaceBoardItem) => {
      const prompt = `Jabarkan detail spesifik, tips praktis, dan langkah tindak lanjut untuk "${item.title}" pada ${boardLabel} (${roleLabel}).`;
      onPromptAction(prompt, {
        blockType: "board_item",
        action: "deep_dive",
        label: item.title,
        prompt,
      });
    },
    [boardLabel, roleLabel, onPromptAction]
  );

  const stats = useMemo(() => {
    let done = 0;
    let starred = 0;
    for (const it of items) {
      if (isItemDone(it)) done += 1;
      if (isItemStarred(it)) starred += 1;
    }
    const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
    return { total: items.length, done, starred, pct };
  }, [items, isItemDone, isItemStarred]);

  const effectiveReshapeChips = useMemo(() => {
    if (items.length === 0) return reshapeChips;
    const chips: Array<{ label: string; prompt: string }> = [];
    const total = items.length;
    const doneCount = items.filter(isItemDone).length;
    const colCounts = columns.map(
      (c) => items.filter((it) => it.columnId === c.id).length,
    );
    const maxCol = Math.max(0, ...colCounts);
    const minCol = Math.min(...colCounts);
    const hasDates = items.some((it) =>
      /\b(day\s*\d+|hari\s*\d+|jan|feb|mar|apr|mei|jun|jul|agu|ags|sep|okt|nov|des|\d{1,2}[/-]\d{1,2})\b/i.test(
        `${it.title} ${it.subtitle ?? ""} ${it.slot ?? ""}`,
      ),
    );
    const hasUnstarred = items.some((it) => !isItemStarred(it));
    const hasHandNotes = items.some((it) => Boolean(it.handNote));

    if (hasDates && columns.length > 1) {
      chips.push({
        label: "Kelompokkan per hari",
        prompt: `Susun ulang item di ${boardLabel} berdasarkan tanggal atau urutan hari via sync_workspace_board.`,
      });
    }
    if (columns.length > 1 && maxCol > total * 0.6 && maxCol - minCol >= 3) {
      chips.push({
        label: "Ratakan kolom",
        prompt: `Distribusikan ulang item di ${boardLabel} supaya tiap kolom seimbang via sync_workspace_board.`,
      });
    }
    if (doneCount > 0 && doneCount < total) {
      chips.push({
        label: "Tandai prioritas tersisa",
        prompt: `Dari item ${boardLabel} yang belum selesai, pilih 3 paling penting dan tandai dengan pin star via sync_workspace_board.`,
      });
    } else if (hasUnstarred) {
      chips.push({
        label: "Tandai 3 prioritas",
        prompt: `Pilih 3 item paling berdampak di ${boardLabel} dan tandai dengan pin star beserta alasannya via sync_workspace_board.`,
      });
    }
    if (total >= 8) {
      chips.push({
        label: "Ringkas jadi aksi",
        prompt: `Ringkas isi ${boardLabel} jadi langkah-langkah aksi utama yang bisa dieksekusi via sync_workspace_board.`,
      });
    }
    if (hasHandNotes) {
      chips.push({
        label: "Rapikan catatan tangan",
        prompt: `Rapikan dan perjelas item ${boardLabel} yang punya catatan tangan via sync_workspace_board.`,
      });
    }
    return chips.length > 0 ? chips.slice(0, 3) : reshapeChips;
  }, [
    items,
    columns,
    isItemDone,
    isItemStarred,
    boardLabel,
    reshapeChips,
  ]);

  const filterItem = useCallback(
    (it: WorkspaceBoardItem) => {
      if (filterMode === "active") return !isItemDone(it);
      if (filterMode === "starred") return isItemStarred(it);
      if (filterMode === "done") return isItemDone(it);
      return true;
    },
    [filterMode, isItemDone, isItemStarred]
  );

  const submitQuickCard = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = draftTitle.trim();
    if (!cleanTitle) return;
    const targetCol = draftColId || columns[0]?.id || "col-1";
    onAddItem(targetCol, {
      slot: roleLabel,
      title: cleanTitle,
      ...(draftNote.trim() ? { subtitle: draftNote.trim() } : {}),
      ...(!isAbstractNonVisualTitle(cleanTitle) ? { imageQuery: cleanTitle } : {}),
      pin: "star",
    });
    setDraftTitle("");
    setDraftNote("");
    setComposerOpen(false);
  };

  const renderBoardHeader = (isGrid = false) => (
    <motion.div
      className={isGrid ? "momo-board-deck-head" : "momo-board-floating-head"}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: MOTION_VOCABULARY.durations.panel,
        ease: MOTION_VOCABULARY.easings.standard,
      }}
    >
      <div className="momo-board-head-top">
        <div className="momo-board-title-stack">
          <div className="gen-row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <h1 className="momo-margin-note momo-board-hand-title">
              {boardLabel}
            </h1>
            <span className="momo-board-role-pill">{roleLabel}</span>
            {busy && (
              <span className="momo-board-live-pill">
                <i className="momo-board-live-dot" aria-hidden="true" />
                <span>Menyelaraskan Pinboard...</span>
                {onSwitchToChat && (
                  <button
                    type="button"
                    className="momo-board-card-act"
                    onClick={onSwitchToChat}
                  >
                    Lihat Chat ↗
                  </button>
                )}
              </span>
            )}
          </div>
          {sessionTitle && (
            <span className="momo-board-session-sub">
              Konteks sesi: {sessionTitle}
            </span>
          )}
        </div>

        <div className="momo-board-head-actions" onPointerDown={(e) => e.stopPropagation()}>
          <div className="momo-board-view-toggle" role="group" aria-label="Tampilan Pinboard">
            <button
              type="button"
              data-board-view-btn="canvas"
              className={`momo-board-view-btn${viewMode === "canvas" ? " is-active" : ""}`}
              onClick={() => setViewMode("canvas")}
            >
              <Columns3 size={12} />
              <span>Kanvas</span>
            </button>
            <button
              type="button"
              data-board-view-btn="grid"
              className={`momo-board-view-btn${viewMode === "grid" ? " is-active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid size={12} />
              <span>Grid</span>
            </button>
          </div>
          {viewMode === "canvas" && (
            <>
              <div className="momo-board-zoom-ctrl" role="group" aria-label="Skala kanvas">
                <button
                  type="button"
                  className="momo-board-zoom-btn"
                  title="Perkecil tampilan"
                  aria-label="Perkecil tampilan"
                  disabled={boardZoom <= MIN_BOARD_ZOOM}
                  onClick={() => stepBoardZoom(-0.08)}
                >
                  <Minus size={11.5} />
                </button>
                <button
                  type="button"
                  className="momo-board-zoom-readout"
                  title="Kembalikan skala default (88%)"
                  onClick={() => setBoardZoom(DEFAULT_BOARD_ZOOM)}
                >
                  {Math.round(boardZoom * 100)}%
                </button>
                <button
                  type="button"
                  className="momo-board-zoom-btn"
                  title="Perbesar tampilan"
                  aria-label="Perbesar tampilan"
                  disabled={boardZoom >= MAX_BOARD_ZOOM}
                  onClick={() => stepBoardZoom(0.08)}
                >
                  <Plus size={11.5} />
                </button>
              </div>
              <button
                type="button"
                className="momo-reshape-chip"
                onClick={handleResetPan}
              >
                Reset Kanvas
              </button>
            </>
          )}
          {columns[0] && (
            <button
              type="button"
              className={`momo-reshape-chip${composerOpen ? " is-active" : ""}`}
              onClick={() => {
                setDraftColId((prev) => prev || columns[0]?.id || "");
                setComposerOpen((o) => !o);
              }}
            >
              {composerOpen ? <X size={13} /> : <Plus size={13} />}
              <span>{composerOpen ? "Tutup" : "Tambah Kartu"}</span>
            </button>
          )}
        </div>
      </div>

      {hasItems && (
        <div className="momo-board-kpi-strip" onPointerDown={(e) => e.stopPropagation()}>
          <div className="momo-board-kpis">
            <span className="momo-board-kpi-chip">
              <strong>{stats.total}</strong> item tersusun
            </span>
            <span className="momo-board-kpi-chip">
              <strong>{columns.length}</strong> lajur {roleLabel.toLowerCase()}
            </span>
            <span className="momo-board-kpi-chip">
              <strong>{stats.starred}</strong> prioritas
            </span>
            <span className="momo-board-kpi-chip">
              <strong>
                {stats.done}/{stats.total}
              </strong>{" "}
              selesai ({stats.pct}%)
            </span>
          </div>

          <div className="momo-board-filter-tabs" role="tablist" aria-label="Filter kartu">
            {(
              [
                ["all", "Semua"],
                ["active", "Aktif"],
                ["starred", "Prioritas"],
                ["done", "Selesai"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filterMode === id}
                className={`momo-board-filter-btn${filterMode === id ? " is-active" : ""}`}
                onClick={() => setFilterMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {composerOpen && (
        <form
          className="momo-board-composer"
          onPointerDown={(e) => e.stopPropagation()}
          onSubmit={submitQuickCard}
        >
          <input
            type="text"
            className="momo-board-input"
            placeholder={`Tambah tempat / tugas / item ke ${boardLabel}...`}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            className="momo-board-input"
            placeholder="Catatan atau estimasi (opsional)"
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
          />
          {columns.length > 1 && (
            <select
              className="momo-board-select"
              value={draftColId || columns[0]?.id}
              onChange={(e) => setDraftColId(e.target.value)}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          <button type="submit" className="momo-reshape-chip is-active">
            Simpan
          </button>
        </form>
      )}
    </motion.div>
  );

  const renderReshapeBar = () =>
    hasItems && (
      <div
        className="momo-board-reshape-bar"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {items.some((it) => it.pin === "heart" || it.sticker === "heart") && (
          <motion.button
            type="button"
            data-board-make-plan="true"
            className="momo-reshape-chip is-active"
            whileHover={{ y: -1.5, scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.16, ease: EASE_MOMO }}
            onClick={() =>
              onPromptAction(
                `Susun semua item terpin (♡) dan kartu aktif ke dalam kolom terstruktur per hari/tahap di ${boardLabel} via sync_workspace_board.`,
                {
                  blockType: "board_reshape",
                  action: "make_plan",
                  label: `Susun ${boardLabel}`,
                  prompt: `Susun item ke ${boardLabel}`,
                }
              )
            }
          >
            <span aria-hidden="true">♥</span>
            <span>Susun Item ke Kolom</span>
          </motion.button>
        )}
        {effectiveReshapeChips.map((chip, idx) => (
          <motion.button
            key={`${chip.label}-${idx}`}
            type="button"
            className="momo-reshape-chip"
            whileHover={{ y: -1.5, scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.16, ease: EASE_MOMO }}
            onClick={() =>
              onPromptAction(chip.prompt, {
                blockType: "board_reshape",
                action: "reshape",
                label: chip.label,
                prompt: chip.prompt,
              })
            }
          >
            {chip.label}
          </motion.button>
        ))}
      </div>
    );

  const openStickerMenu = useCallback(
    (itemId: string, x: number, y: number) => {
      setStickerMenu({ itemId, x, y });
    },
    [],
  );

  useEffect(() => {
    if (!stickerMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStickerMenu(null);
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-sticker-menu]") || t?.closest?.(".momo-board-card-sticker")) return;
      setStickerMenu(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [stickerMenu]);

  const applyStickerChoice = useCallback(
    (kind: "heart" | "star" | "check" | null) => {
      if (!stickerMenu) return;
      const k = kind ?? undefined;
      onUpdateItem?.(stickerMenu.itemId, {
        pin: k,
        sticker: k,
        starred: kind === "heart" || kind === "star",
      });
      setStickerMenu(null);
    },
    [stickerMenu, onUpdateItem],
  );

  const renderStickerMenu = () => {
    if (!stickerMenu || typeof document === "undefined") return null;
    const menuW = 176;
    const menuH = 168;
    const x = Math.max(8, Math.min(stickerMenu.x, window.innerWidth - menuW - 8));
    const y = Math.max(8, Math.min(stickerMenu.y, window.innerHeight - menuH - 8));
    const options: Array<{
      kind: "heart" | "star" | "check" | "none" | null;
      label: string;
    }> = [
      { kind: "heart", label: "Heart" },
      { kind: "star", label: "Star" },
      { kind: "check", label: "Tandai selesai" },
      { kind: null, label: "Hapus stiker" },
    ];
    return createPortal(
      <motion.div
        role="menu"
        data-sticker-menu="true"
        className="momo-skeuo-ctx-menu"
        style={{ left: x, top: y }}
        initial={{ opacity: 0, scale: 0.95, y: -3 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { duration: 0.14, ease: EASE_MOMO },
        }}
        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
      >
        {options.map((opt, idx) => (
          <React.Fragment key={opt.label}>
            {idx > 0 && <div className="momo-skeuo-ctx-sep" />}
            <button
              type="button"
              role="menuitem"
              className="momo-skeuo-ctx-item"
              onClick={() => applyStickerChoice(opt.kind === "none" ? null : opt.kind)}
            >
              <span className="momo-sticker-menu-glyph" aria-hidden="true">
                <PinboardStickerGlyph
                  kind={opt.kind ?? "none"}
                  active={opt.kind != null}
                />
              </span>
              {opt.label}
            </button>
          </React.Fragment>
        ))}
      </motion.div>,
      document.body,
    );
  };

  const renderDragCardPortal = () =>
    mounted &&
    dragInfo &&
    createPortal(
      <motion.div
        data-board-drag-portal="true"
        className="momo-board-drag-card-portal"
        initial={{ scale: 1 }}
        animate={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 460, damping: 30 }}
        style={{
          width: viewMode === "canvas" ? undefined : dragInfo.width,
          x: dragOverlayX,
          y: dragOverlayY,
          rotate: dragTilt,
        }}
      >
        <div
          style={
            viewMode === "canvas"
              ? { zoom: boardZoom, width: dragInfo.offsetWidth }
              : undefined
          }
        >
          <BoardItemCard
            item={{ ...dragInfo.item, columnId: dragInfo.targetColId }}
            previewMedia={dragInfo.media}
            colIdx={Math.max(
              0,
              columns.findIndex((c) => c.id === dragInfo.targetColId),
            )}
            columns={columns}
            roleLabel={roleLabel}
            isStarred={isItemStarred(dragInfo.item)}
            isDone={isItemDone(dragInfo.item)}
            isDragOverlay
            onToggleStar={toggleStar}
            onToggleDone={toggleDone}
            onMoveItem={onMoveItem}
            onDeepDive={handleDeepDive}
            onDeleteItem={onDeleteItem}
          />
        </div>
      </motion.div>,
      document.body,
    );

  if (viewMode === "grid") {
    return (
      <MistlineMediaScopeProvider contextText={sessionTitle}>
        <section
          ref={gridScrollRef}
          className="momo-board-shell momo-board-shell--grid sc"
          aria-label={boardLabel}
        >
        <div className="momo-board-grid-container">
          {renderBoardHeader(true)}

          {!hasItems ? (
            <div data-board-empty="true" className="momo-board-empty-state">
              <p className="momo-hand momo-board-empty-note">
                Belum ada catatan di {boardLabel.toLowerCase()}...
              </p>
              <p className="momo-board-empty-desc">
                Mulai obrolan di Chat atau Explore agar kartu terisi otomatis,
                atau tekan Tambah Kartu untuk menempel catatan di papan ini.
              </p>
            </div>
          ) : (
            <div className="momo-board-grid-lanes">
              {columns.map((col, colIdx) => {
                const colItems = items
                  .filter((it) => it.columnId === col.id)
                  .filter(filterItem);
                const visibleForDrop = dragInfo
                  ? colItems.filter((it) => it.id !== dragInfo.item.id)
                  : colItems;
                const isDropTarget =
                  Boolean(dragInfo) && dragInfo?.targetColId === col.id;
                const dropSlotIdx = isDropTarget
                  ? Math.max(
                      0,
                      Math.min(
                        visibleForDrop.length,
                        dragInfo?.targetIdx ?? visibleForDrop.length,
                      ),
                    )
                  : -1;
                const liveCount = isDropTarget
                  ? visibleForDrop.length + 1
                  : visibleForDrop.length;

                return (
                  <div
                    key={col.id}
                    data-board-column-id={col.id}
                    className={`momo-board-grid-lane${isDropTarget ? " is-drop-target" : ""}`}
                  >
                    <div className="momo-board-grid-lane-head">
                      <div className="momo-board-col-head-main">
                        {(col.dateLabel || col.subtitle) && (
                          <span className="momo-board-lane-kicker">
                            {col.dateLabel || col.subtitle}
                          </span>
                        )}
                        <h3 className="momo-serif momo-board-lane-title">
                          {col.title}
                        </h3>
                      </div>
                      <span className="momo-board-lane-count">{liveCount}</span>
                    </div>

                    {visibleForDrop.length === 0 && !isDropTarget ? (
                      <div className="momo-board-empty-lane">
                        Belum ada item pada filter ini.
                      </div>
                    ) : (
                      <div className="momo-board-grid-cards">
                        {visibleForDrop.map((item, vIdx) => (
                          <React.Fragment key={item.id}>
                            {isDropTarget && vIdx === dropSlotIdx && dragInfo && (
                              <motion.div
                                key="__drop-slot__"
                                layout="position"
                                transition={{
                                  type: "spring",
                                  stiffness: 520,
                                  damping: 38,
                                }}
                                data-board-drop-slot="true"
                                className="momo-board-drop-slot"
                                style={{
                                  height: Math.max(
                                    96,
                                    Math.round(dragInfo.height),
                                  ),
                                }}
                              />
                            )}
                            <BoardItemCard
                              item={item}
                              resolvedImageUrl={localResolvedUrls[item.id]}
                              colIdx={colIdx}
                              columns={columns}
                              roleLabel={roleLabel}
                              isStarred={isItemStarred(item)}
                              isDone={isItemDone(item)}
                              onToggleStar={toggleStar}
                              onToggleDone={toggleDone}
                              onMoveItem={onMoveItem}
                              onDeepDive={handleDeepDive}
                              onLockResolvedImage={lockResolvedImage}
                              onUpdateItem={onUpdateItem}
                              onDeleteItem={onDeleteItem}
                              onStickerMenu={openStickerMenu}
                              onCardPointerDown={beginCardPointerDrag}
                            />
                          </React.Fragment>
                        ))}
                        {isDropTarget &&
                          dropSlotIdx >= visibleForDrop.length &&
                          dragInfo && (
                            <motion.div
                              key="__drop-slot__"
                              layout="position"
                              transition={{
                                type: "spring",
                                stiffness: 520,
                                damping: 38,
                              }}
                              data-board-drop-slot="true"
                              className="momo-board-drop-slot"
                              style={{
                                height: Math.max(
                                  96,
                                  Math.round(dragInfo.height),
                                ),
                              }}
                            />
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {renderReshapeBar()}
        </div>
        {renderDragCardPortal()}
        {renderStickerMenu()}
      </section>
      </MistlineMediaScopeProvider>
    );
  }

  return (
    <MistlineMediaScopeProvider contextText={sessionTitle}>
    <section className="momo-board-shell" aria-label={boardLabel}>
      <div
        ref={canvasRef}
        data-board-canvas="true"
        className={`momo-board-canvas${isPanning ? " is-panning" : ""}`}
        onWheel={(e) => {
          if ((e.target as HTMLElement).closest("select, textarea")) return;
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const step = e.deltaY < 0 ? 0.04 : -0.04;
            stepBoardZoom(step);
            return;
          }
          const dx = e.shiftKey && Math.abs(e.deltaX) < 1 ? e.deltaY : e.deltaX;
          const dy = e.shiftKey ? 0 : e.deltaY;
          panX.set(Math.round(panX.get() - dx));
          panY.set(Math.min(180, Math.round(panY.get() - dy * 0.85)));
          syncPannedThreshold();
        }}
        onPointerDown={(e) => {
          if (
            (e.target as HTMLElement).closest(
              "[data-board-card-id], button, input, select, a",
            )
          ) {
            return;
          }
          panDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origPanX: panX.get(),
            origPanY: panY.get(),
          };
          setIsPanning(true);
        }}
      >
        <motion.div
          className="momo-board-stage"
          data-board-stage="true"
          initial="initial"
          animate="animate"
          style={{ x: panX, y: panY }}
        >
          <div
            className="momo-board-zoom-plane"
            style={{ zoom: boardZoom }}
          >
          {renderBoardHeader(false)}

          {!hasItems ? (
            <motion.div
              data-board-empty="true"
              className="momo-board-empty-state"
              variants={{
                initial: { opacity: 0, y: 12 },
                animate: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.24, delay: 0.04, ease: EASE_MOMO },
                },
                exit: {
                  opacity: 0,
                  y: 10,
                  scale: 0.98,
                  transition: { duration: 0.18, ease: EASE_MOMO },
                },
              }}
            >
              <p className="momo-hand momo-board-empty-note">
                Belum ada catatan di {boardLabel.toLowerCase()}...
              </p>
              <p className="momo-board-empty-desc">
                Mulai obrolan di Chat atau Explore agar kartu terisi otomatis,
                atau tekan Tambah Kartu untuk menempel catatan di kanvas ini.
              </p>
            </motion.div>
          ) : (
            <div className="momo-board-columns">
              {columns.map((col, colIdx) => {
                const colItems = items
                  .filter((it) => it.columnId === col.id)
                  .filter(filterItem);
                const visibleForDrop = dragInfo
                  ? colItems.filter((it) => it.id !== dragInfo.item.id)
                  : colItems;
                const isDropTarget =
                  Boolean(dragInfo) && dragInfo?.targetColId === col.id;
                const dropSlotIdx = isDropTarget
                  ? Math.max(
                      0,
                      Math.min(
                        visibleForDrop.length,
                        dragInfo?.targetIdx ?? visibleForDrop.length,
                      ),
                    )
                  : -1;
                const liveCount = isDropTarget
                  ? visibleForDrop.length + 1
                  : visibleForDrop.length;

                return (
                  <motion.div
                    key={col.id}
                    data-board-column-id={col.id}
                    className={`momo-board-column${isDropTarget ? " is-drop-target" : ""}`}
                    variants={{
                      initial: { opacity: 0, y: 12 },
                      animate: {
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: MOTION_VOCABULARY.durations.normal,
                          delay: colIdx * MOTION_VOCABULARY.staggers.macro,
                          ease: MOTION_VOCABULARY.easings.standard,
                        },
                      },
                      exit: {
                        opacity: 0,
                        y: 10,
                        transition: {
                          duration: MOTION_VOCABULARY.durations.fast,
                          ease: MOTION_VOCABULARY.easings.exit,
                        },
                      },
                    }}
                  >
                    <div className="momo-board-grid-lane-head">
                      <div className="momo-board-col-head-main">
                        {(col.dateLabel || col.subtitle) && (
                          <span className="momo-board-lane-kicker">
                            {col.dateLabel || col.subtitle}
                          </span>
                        )}
                        <h3 className="momo-serif momo-board-lane-title">
                          {col.title}
                        </h3>
                      </div>
                      <span className="momo-board-lane-count">{liveCount}</span>
                    </div>

                    {visibleForDrop.map((item, vIdx) => (
                      <React.Fragment key={item.id}>
                        {isDropTarget && vIdx === dropSlotIdx && dragInfo && (
                          <motion.div
                            key="__drop-slot__"
                            layout="position"
                            transition={{
                              type: "spring",
                              stiffness: 520,
                              damping: 38,
                            }}
                            data-board-drop-slot="true"
                            className="momo-board-drop-slot"
                            style={{
                              height: Math.max(
                                88,
                                Math.round(dragInfo.offsetHeight),
                              ),
                            }}
                          />
                        )}
                        <BoardItemCard
                          item={item}
                          resolvedImageUrl={localResolvedUrls[item.id]}
                          colIdx={colIdx}
                          columns={columns}
                          roleLabel={roleLabel}
                          isStarred={isItemStarred(item)}
                          isDone={isItemDone(item)}
                          onToggleStar={toggleStar}
                          onToggleDone={toggleDone}
                          onMoveItem={onMoveItem}
                          onDeepDive={handleDeepDive}
                          onLockResolvedImage={lockResolvedImage}
                          onUpdateItem={onUpdateItem}
                          onDeleteItem={onDeleteItem}
                          onStickerMenu={openStickerMenu}
                          onCardPointerDown={beginCardPointerDrag}
                        />
                      </React.Fragment>
                    ))}

                    {isDropTarget &&
                      dropSlotIdx >= visibleForDrop.length &&
                      dragInfo && (
                        <motion.div
                          key="__drop-slot__"
                          layout="position"
                          transition={{
                            type: "spring",
                            stiffness: 520,
                            damping: 38,
                          }}
                          data-board-drop-slot="true"
                          className="momo-board-drop-slot"
                          style={{
                            height: Math.max(
                              88,
                              Math.round(dragInfo.offsetHeight),
                            ),
                          }}
                        />
                      )}

                    {visibleForDrop.length === 0 && !isDropTarget && (
                      <div
                        style={{
                          padding: "16px 10px",
                          borderRadius: 12,
                          border: "1px dashed var(--line)",
                          fontSize: 12,
                          color: "var(--mute)",
                          textAlign: "center",
                        }}
                      >
                        Tarik kartu ke sini
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {renderReshapeBar()}
          </div>
        </motion.div>
      </div>

      {/* Escape HUD appears only when canvas is panned beyond 140px */}
      <AnimatePresence>
        {isPannedFar && (
          <motion.button
            type="button"
            data-board-escape-hud="true"
            className="momo-board-escape-hud"
            initial={{ opacity: 0, y: -8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.94 }}
            whileHover={{ y: -1.5, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.18, ease: EASE_MOMO }}
            onClick={handleResetPan}
          >
            <kbd className="momo-board-escape-kbd">R</kbd>
            <span>Focus</span>
          </motion.button>
        )}
      </AnimatePresence>

      {renderDragCardPortal()}
      {renderStickerMenu()}
    </section>
    </MistlineMediaScopeProvider>
  );
};
