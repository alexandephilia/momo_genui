"use client";

import { createContext, memo, useContext } from "react";
import { motion } from "motion/react";
import { z } from "zod";
import { finalContentProps } from "./contentContracts";
import { repairOpenUiProps } from "./propRepair";
import { findStreamingBlockIndex } from "./streamParser";
import {
  createLibrary,
  defineComponent,
  useIsStreaming,
  type ComponentRenderProps,
} from "@openuidev/react-lang";
import { GenerativeSkeleton, MistlineBlockBoundary } from "@/components/genui/MistlineBlocks";
import {
  MistlineComponent,
  type MistlineAction,
  type MistlineSurface,
} from "@/components/genui/MistlineLibrary";
import type {
  SourceItem,
  UiInteractionPayload,
  WorkspaceBoardItem,
} from "@/types/momo";
import {
  MOMO_COMPONENT_GROUPS,
  MOMO_LEAF_COMPONENT_DEFS,
  toPermissiveRuntimePropsSchema,
} from "./momoSchema";

export interface MomoOpenUiRuntimeContextValue {
  surface: MistlineSurface;
  live: boolean;
  streaming: boolean;
  /** Source of the program being rendered; null once its fence is closed (every block complete). */
  streamingCode?: string | null;
  sources?: SourceItem[];
  pinnedTitles?: Set<string>;
  onAction?: (action: MistlineAction) => void;
  onUiInteraction?: (interaction: UiInteractionPayload) => void;
  onTogglePinItem?: (item: Omit<WorkspaceBoardItem, "id" | "columnId">) => void;
}

const DEFAULT_CONTEXT: MomoOpenUiRuntimeContextValue = {
  surface: "chat",
  live: true,
  streaming: false,
};

export const MomoOpenUiContext =
  createContext<MomoOpenUiRuntimeContextValue>(DEFAULT_CONTEXT);

export function useMomoOpenUiContext(): MomoOpenUiRuntimeContextValue {
  return useContext(MomoOpenUiContext);
}

/**
 * Whether the block being rendered has been fully written. Blocks are written in order, so
 * every block before the last one in the Stack is complete while the stream is still running.
 */
const BlockCompleteContext = createContext<boolean | null>(null);

const StackRenderer = memo(function StackRenderer({
  props,
  renderNode,
}: ComponentRenderProps<{ children?: unknown[]; gap?: "sm" | "md" | "lg" }>) {
  const gapPx = props.gap === "sm" ? 10 : props.gap === "lg" ? 22 : 16;
  const ctx = useMomoOpenUiContext();
  const rendererStreaming = useIsStreaming();
  const streaming = Boolean(ctx.streaming || rendererStreaming);
  const items = Array.isArray(props.children) ? props.children : [];
  if (items.length === 0) return null;
  const writingIdx =
    streaming && ctx.streamingCode != null
      ? findStreamingBlockIndex(ctx.streamingCode, items.length)
      : -1;
  return (
    <div className="gen-stack momo-openui-stack" style={{ gap: gapPx }}>
      {items.map((child, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.24,
            delay: Math.min(idx * 0.04, 0.16),
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <BlockCompleteContext.Provider value={idx !== writingIdx}>
            {renderNode(child)}
          </BlockCompleteContext.Provider>
        </motion.div>
      ))}
    </div>
  );
});

function createLeafRenderer(componentName: string) {
  const LeafComponent = memo(function OpenUiLeafAdapter({
    props,
  }: ComponentRenderProps<Record<string, unknown>>) {
    const ctx = useMomoOpenUiContext();
    const rendererStreaming = useIsStreaming();
    const blockComplete = useContext(BlockCompleteContext);
    const streaming =
      blockComplete === null ? Boolean(ctx.streaming || rendererStreaming) : !blockComplete;
    const repaired = repairOpenUiProps(componentName, props ?? {});
    // Still being written: outline it from the data received so far, reveal when complete.
    if (streaming) return <GenerativeSkeleton name={componentName} props={repaired} />;
    const content = finalContentProps(componentName, repaired);
    if (!content) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <MistlineBlockBoundary name={componentName}>
          <MistlineComponent
            name={componentName}
            props={content}
            complete={!streaming}
            streaming={streaming}
            surface={ctx.surface}
            live={ctx.live}
            sources={ctx.sources}
            pinnedTitles={ctx.pinnedTitles}
            onAction={ctx.onAction}
            onUiInteraction={ctx.onUiInteraction}
            onTogglePinItem={ctx.onTogglePinItem}
          />
        </MistlineBlockBoundary>
      </motion.div>
    );
  });
  LeafComponent.displayName = `OpenUi_${componentName}`;
  return LeafComponent;
}

const StackComponent = defineComponent({
  name: "Stack",
  props: z.object({
    children: z.array(z.any()),
    gap: z.any().optional(),
  }),
  description:
    "Root layout container stacking Momo UI components vertically in order.",
  component: StackRenderer,
});

const leafComponents = MOMO_LEAF_COMPONENT_DEFS.map((def) =>
  defineComponent({
    name: def.name,
    props: toPermissiveRuntimePropsSchema(def.props),
    description: def.description,
    component: createLeafRenderer(def.name),
  }),
);

export const momoOpenUiLibrary = createLibrary({
  components: [StackComponent, ...leafComponents],
  componentGroups: MOMO_COMPONENT_GROUPS,
  root: "Stack",
});
