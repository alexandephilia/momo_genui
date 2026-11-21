"use client";

import { memo, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Renderer } from "@openuidev/react-lang";
import { MOTION_VOCABULARY } from "@/components/motion/MotionPrimitives";
import { MarkdownMessage } from "@/components/shell/MarkdownMessage";
import {
  MistlineBlockBoundary,
  GenerativeSkeleton,
  MistlineBlockView,
} from "@/components/genui/MistlineBlocks";
import {
  MistlineMediaScopeProvider,
  type MistlineAction,
  type MistlineSurface,
} from "@/components/genui/MistlineLibrary";
import {
  MomoOpenUiContext,
  momoOpenUiLibrary,
} from "@/lib/openui/momoLibrary";
import {
  openUiParseResultToMistlineBlocks,
  parseOpenUiMixedStream,
  type OpenUiMixedSegment,
} from "@/lib/openui/streamParser";
import type {
  SourceItem,
  UiInteractionPayload,
  WorkspaceBoardItem,
} from "@/types/momo";

export interface OpenUiStreamViewProps {
  text: string;
  streaming: boolean;
  contextText?: string;
  surface?: MistlineSurface;
  live?: boolean;
  sources?: SourceItem[];
  pinnedTitles?: Set<string>;
  onAction?: (action: MistlineAction) => void;
  onUiInteraction?: (interaction: UiInteractionPayload) => void;
  onTogglePinItem?: (item: Omit<WorkspaceBoardItem, "id" | "columnId">) => void;
}

const OpenUiProgramBlock = memo(function OpenUiProgramBlock({
  segment,
  streaming,
  isTrailingSegment,
  surface,
  live,
  sources,
  pinnedTitles,
  onAction,
  onUiInteraction,
  onTogglePinItem,
}: {
  segment: Extract<OpenUiMixedSegment, { kind: "openui" }>;
  streaming: boolean;
  isTrailingSegment: boolean;
  surface: MistlineSurface;
  live: boolean;
  sources?: SourceItem[];
  pinnedTitles?: Set<string>;
  onAction?: (action: MistlineAction) => void;
  onUiInteraction?: (interaction: UiInteractionPayload) => void;
  onTogglePinItem?: (item: Omit<WorkspaceBoardItem, "id" | "columnId">) => void;
}) {
  const [renderErrors, setRenderErrors] = useState<string[]>([]);
  const blockStreaming = streaming && (!segment.complete || isTrailingSegment);
  const hasRoot = Boolean(segment.parseResult.root);
  const renderedBlocksCount = useMemo(
    () => openUiParseResultToMistlineBlocks(segment.parseResult, { complete: true }).length,
    [segment.parseResult],
  );

  const ctxValue = useMemo(
    () => ({
      surface,
      live,
      streaming: blockStreaming,
      streamingCode: segment.complete ? null : segment.normalizedCode,
      sources,
      pinnedTitles,
      onAction,
      onUiInteraction,
      onTogglePinItem,
    }),
    [
      surface,
      live,
      blockStreaming,
      segment.complete,
      segment.normalizedCode,
      sources,
      pinnedTitles,
      onAction,
      onUiInteraction,
      onTogglePinItem,
    ],
  );

  if (!hasRoot) {
    if (blockStreaming || streaming) {
      return <GenerativeSkeleton name="Stack" />;
    }
    return (
      <div className="gu gu-unknown" data-lifecycle="error" role="alert">
        <span className="gu-pen momo-hand-title">
          blok openui tidak selesai
        </span>
      </div>
    );
  }

  return (
    <MistlineBlockBoundary name="OpenUI">
      <MomoOpenUiContext.Provider value={ctxValue}>
        <div
          className="momo-openui-region"
          data-streaming={blockStreaming ? "true" : "false"}
        >
          <Renderer
            response={segment.normalizedCode}
            library={momoOpenUiLibrary}
            isStreaming={blockStreaming}
            onError={(errs) => {
              const msgs = errs
                .filter((e) => e.severity !== "warning")
                .map((e) => e.message);
              setRenderErrors((prev) =>
                prev.join("|") === msgs.join("|") ? prev : msgs,
              );
            }}
          />
          {!blockStreaming && renderErrors.length > 0 && renderedBlocksCount === 0 && (
            <div
              className="gu gu-unknown"
              data-lifecycle="warning"
              style={{ marginTop: 8, fontSize: 12 }}
            >
              <span className="gu-pen momo-hand-title">catatan render</span>{" "}
              <span>{renderErrors[0]}</span>
            </div>
          )}
        </div>
      </MomoOpenUiContext.Provider>
    </MistlineBlockBoundary>
  );
});

export const OpenUiStreamView = memo(function OpenUiStreamView({
  text,
  streaming,
  contextText,
  surface = "chat",
  live = true,
  sources,
  pinnedTitles,
  onAction,
  onUiInteraction,
  onTogglePinItem,
}: OpenUiStreamViewProps) {
  const segments = useMemo(
    () => parseOpenUiMixedStream(text, { final: !streaming }),
    [text, streaming],
  );

  const firstTextSeg = segments.slice(0, 2).find((s) => s.kind === "text");
  const hasAnyUi = segments.some(
    (s) => s.kind === "openui" || s.kind === "legacy-ui",
  );
  const pullId =
    hasAnyUi &&
    firstTextSeg &&
    firstTextSeg.kind === "text" &&
    firstTextSeg.text.replace(/!\[[^\]]*\]\([^)]*\)/g, "").length <= 260
      ? firstTextSeg.id
      : null;

  return (
    <MistlineMediaScopeProvider
      contextText={contextText || text.slice(0, 220)}
      sources={sources}
    >
      <div className="gen-stack" style={{ gap: 16 }}>
      {segments.map((seg, idx) => {
        const isTrailingSegment = idx === segments.length - 1;
        if (seg.kind === "text") {
          const isPull = seg.id === pullId;
          return (
            <motion.div
              key={seg.id}
              className={isPull ? "gu-pull body" : "body"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: MOTION_VOCABULARY.durations.normal,
                ease: MOTION_VOCABULARY.easings.standard,
              }}
            >
              <MarkdownMessage
                text={seg.text}
                sources={sources}
                isStreaming={streaming && !seg.complete}
              />
            </motion.div>
          );
        }

        if (seg.kind === "legacy-ui") {
          return (
            <MistlineBlockView
              key={seg.id}
              block={seg.block}
              streaming={streaming}
              surface={surface}
              live={live}
              pull={false}
              sources={sources}
              onAction={onAction}
              onUiInteraction={onUiInteraction}
              pinnedTitles={pinnedTitles}
              onTogglePinItem={onTogglePinItem}
            />
          );
        }

        return (
          <motion.div
            key={seg.id}
            initial={{ opacity: 0, y: 10, scale: 0.988 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: MOTION_VOCABULARY.durations.normal,
              ease: MOTION_VOCABULARY.easings.standard,
            }}
          >
            <OpenUiProgramBlock
              segment={seg}
              streaming={streaming}
              isTrailingSegment={isTrailingSegment}
              surface={surface}
              live={live}
              sources={sources}
              pinnedTitles={pinnedTitles}
              onAction={onAction}
              onUiInteraction={onUiInteraction}
              onTogglePinItem={onTogglePinItem}
            />
          </motion.div>
        );
      })}
      </div>
    </MistlineMediaScopeProvider>
  );
});
