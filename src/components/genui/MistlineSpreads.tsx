"use client";

import { useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Heart } from "lucide-react";
import { motion } from "motion/react";
import { EASE_MOMO, MH } from "@/components/motion/MotionPrimitives";
import { MarkdownMessage } from "@/components/shell/MarkdownMessage";
import { isAbstractNonVisualTitle } from "@/lib/imageAssetContract";
import {
  buildExploreCoverBlueprint,
  type AbsorbedHeadlineMeta,
  type CoverVisualMode,
  type ExploreCoverBlueprint,
} from "@/lib/openui/exploreCoverPlanner";
import type { MistlineBlock, MistlineUIBlock } from "@/lib/mistlineParse";
import type {
  SourceItem,
  UiInteractionPayload,
  WorkspaceBoardItem,
} from "@/types/momo";
import {
  ExplorePlaceDetailModal,
  type ExploreDetailTarget,
} from "./ExplorePlaceDetailModal";
import { GenerativeSkeleton, MistlineBlockBoundary } from "./MistlineBlocks";
import { inferContextualIcon, MistlineIcon } from "./MistlineIcons";
import {
  arr,
  MistlineComponent,
  MistlineInline,
  MistlinePhoto,
  num,
  rec,
  str,
  textOnHex,
  type MistlineAction,
} from "./MistlineLibrary";

export type MistlineSpreadKind =
  | "sentence"
  | "essay"
  | "cover"
  | "mosaic"
  | "list"
  | "versus"
  | "itin"
  | "checklist"
  | "stats"
  | "quote"
  | "palette"
  | "panel";

const pickImg = (o: Record<string, unknown>): string =>
  str(o.image) || str(o.imageUrl) || str(o.thumbnailUrl) || str(o.src);

const SPREAD_TECHNICAL_ICONS = new Set([
  "bug",
  "code",
  "database",
  "cpu",
  "shield",
  "workflow",
  "compare",
  "shuffle",
  "scale",
]);

export interface MistlineSpreadPage {
  key: string;
  kind: MistlineSpreadKind;
  block: MistlineBlock;
  span: number;
  h: number;
  y: number;
  dark?: boolean;
  wide?: boolean;
  image?: string;
  imageQuery?: string;
  coverBlueprint?: ExploreCoverBlueprint;
}

export interface PlanMistlineSpreadsOptions {
  userPrompt?: string;
  sources?: SourceItem[];
}

export function planMistlineSpreads(
  blocks: MistlineBlock[],
  options?: PlanMistlineSpreadsOptions,
): {
  pages: MistlineSpreadPage[];
  followups: string[];
  absorbedHeadline?: AbsorbedHeadlineMeta;
} {
  const pages: MistlineSpreadPage[] = [];
  let followups: string[] = [];
  let absorbedHeadline: AbsorbedHeadlineMeta | undefined;
  let rhythm = 0;

  for (const b of blocks) {
    if (b.kind === "text") {
      const t = b.text.trim();
      if (!t) continue;
      const short = t.replace(/!\[[^\]]*\]\([^)]*\)/g, "").length <= 260;
      rhythm++;
      pages.push(
        short
          ? {
              key: b.id,
              kind: "sentence",
              block: b,
              span: 8,
              h: 1,
              y: rhythm % 2 ? 0.3 : 0.7,
            }
          : { key: b.id, kind: "essay", block: b, span: 10, h: 1, y: 0.5 }
      );
      continue;
    }

    const p = (b as MistlineUIBlock).props;
    switch (b.name) {
      case "Followups":
        followups = arr(p.items).filter((x): x is string => typeof x === "string");
        break;
      case "Headline": {
        const blueprint = buildExploreCoverBlueprint({
          headlineProps: p,
          allBlocks: blocks,
          userPrompt: options?.userPrompt,
          sources: options?.sources,
        });
        if (blueprint.absorbIntoTurnHead) {
          absorbedHeadline = {
            title: str(p.title),
            kicker: str(p.kicker) || undefined,
            subtitle: str(p.subtitle) || undefined,
          };
          break;
        }
        pages.push({
          key: b.id,
          kind: "cover",
          block: b,
          span: 10,
          h: 1,
          y: 0.5,
          image: blueprint.resolvedImage,
          imageQuery: blueprint.resolvedImageQuery,
          coverBlueprint: blueprint,
        });
        break;
      }
      case "Cards": {
        const cardItems = arr(p.items ?? p.cards).map(rec);
        const visualCount = cardItems.filter((it) =>
          Boolean(pickImg(it) || str(it.imageQuery)),
        ).length;
        const shouldRenderMosaic =
          str(p.layout) !== "list" &&
          cardItems.length > 0 &&
          visualCount >= Math.ceil(cardItems.length / 2);
        pages.push(
          str(p.layout) === "list"
            ? { key: b.id, kind: "list", block: b, span: 10, h: 1, y: 0.5 }
            : shouldRenderMosaic
              ? { key: b.id, kind: "mosaic", block: b, span: 11, h: 1, y: 0.5 }
              : { key: b.id, kind: "panel", block: b, span: 12, h: 1, y: 0.5, wide: true },
        );
        break;
      }
      case "Versus":
        pages.push({ key: b.id, kind: "versus", block: b, span: 11, h: 1, y: 0.5 });
        break;
      case "Plan": {
        const dayCount = Math.max(1, arr(p.days).length);
        pages.push({
          key: b.id,
          kind: "itin",
          block: b,
          span: Math.min(14, Math.max(11, dayCount * 4)),
          h: 1,
          y: 0.5,
          wide: dayCount >= 3,
        });
        break;
      }
      case "Checklist":
        pages.push({ key: b.id, kind: "checklist", block: b, span: 10, h: 1, y: 0.5 });
        break;
      case "Stats": {
        const statCount = Math.max(1, arr(p.items).length);
        pages.push({
          key: b.id,
          kind: "stats",
          block: b,
          span: Math.min(13, Math.max(10, statCount * 3)),
          h: 1,
          y: 0.5,
          wide: statCount >= 4,
        });
        break;
      }
      case "Callout":
        pages.push({
          key: b.id,
          kind: "quote",
          block: b,
          span: 8,
          h: 1,
          y: 0.58,
          dark: str(p.tone) === "warning",
        });
        break;
      case "Palette":
        pages.push({ key: b.id, kind: "palette", block: b, span: 11, h: 1, y: 0.5 });
        break;
      case "Code":
        pages.push({
          key: b.id,
          kind: "panel",
          block: b,
          span: 11,
          h: 1,
          y: 0.5,
        });
        break;
      case "BentoGrid":
      case "Flow":
      case "Diagram":
      case "Table":
      case "ComparisonTable":
      case "Scorecard":
      case "CodeDiffPatch":
      case "Map":
      case "Adjuster":
        pages.push({
          key: b.id,
          kind: "panel",
          block: b,
          span: 12,
          h: 1,
          y: 0.5,
          wide: true,
        });
        break;
      default: {
        const isWideIntel =
          /(?:_diagram$|_graph$|_tree$|_map$|_chart$|_matrix$|_simulator$|_table$|comparison|scorecard|diff|dossier|transit|recipe|moodboard|state_machine|pros_cons|swot_analysis)/i.test(
            b.name
          );
        pages.push({
          key: b.id,
          kind: "panel",
          block: b,
          span: isWideIntel ? 12 : 10,
          h: 1,
          y: 0.5,
          wide: isWideIntel,
        });
      }
    }
  }
  return { pages, followups, absorbedHeadline };
}

const fit = (len: number, steps: [number, number][]) => {
  for (const [max, f] of steps) if (len <= max) return f;
  return steps[steps.length - 1][1];
};

function Sentence({
  text,
  by,
  sources,
  streaming,
}: {
  text: string;
  by: string;
  sources?: SourceItem[];
  streaming: boolean;
}) {
  const isErrorText = /^(Upstream Gemini API|Koneksi ke server|GEMINI_API_KEY|Model menyelesaikan)/i.test(
    text.trim()
  );
  if (isErrorText) {
    return (
      <div className="sp-sentence sp-sentence--error" role="alert">
        <span className="gu-pen momo-hand-title">kendala koneksi</span>
        <p className="sp-sentence__err">{text}</p>
      </div>
    );
  }
  const len = text.replace(/!\[[^\]]*\]\([^)]*\)/g, "xx").length;
  const f = fit(len, [
    [70, 1],
    [120, 0.86],
    [180, 0.76],
    [999, 0.68],
  ]);
  return (
    <div className="sp-sentence">
      <div
        className="sp-sentence__text momo-serif"
        style={{ "--fit": f } as CSSProperties}
      >
        <MarkdownMessage text={text} sources={sources} isStreaming={streaming} />
      </div>
      <span className="gu-pen sp-sentence__pen momo-hand-title">~ {by}</span>
    </div>
  );
}

function Essay({
  text,
  sources,
  streaming,
}: {
  text: string;
  sources?: SourceItem[];
  streaming: boolean;
}) {
  const m = /^([\s\S]+?[.!?])(\s+[\s\S]*)?$/.exec(text.trim());
  const head = m ? m[1] : text;
  const rest = m?.[2]?.trim();
  return (
    <div className="sp-essay">
      <div className="sp-essay__head momo-serif">
        <MarkdownMessage text={head} sources={sources} isStreaming={streaming} />
      </div>
      {rest && (
        <div className="sp-essay__rest">
          <MarkdownMessage text={rest} sources={sources} isStreaming={streaming} />
        </div>
      )}
    </div>
  );
}

function CoverSpecimenGraphic({
  mode,
}: {
  mode: Exclude<CoverVisualMode, "photo">;
}) {
  if (mode === "schematic") {
    return (
      <svg
        viewBox="0 0 360 118"
        className="sp-cover__svg"
        aria-hidden="true"
        fill="none"
      >
        {/* Subtle technical reference hairlines */}
        <line
          x1="12"
          y1="26"
          x2="348"
          y2="26"
          stroke="currentColor"
          strokeOpacity="0.09"
          strokeDasharray="3 5"
        />
        <line
          x1="12"
          y1="92"
          x2="348"
          y2="92"
          stroke="currentColor"
          strokeOpacity="0.09"
          strokeDasharray="3 5"
        />
        {/* Secondary comparison/return channel */}
        <motion.path
          d="M 22 80 C 96 80, 118 38, 184 38 C 248 38, 272 78, 338 78"
          stroke="currentColor"
          strokeOpacity="0.28"
          strokeWidth="1.35"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.75, ease: EASE_MOMO }}
        />
        {/* Primary accent topology channel */}
        <motion.path
          d="M 22 40 C 88 40, 122 82, 184 58 C 246 34, 278 44, 338 44"
          stroke="var(--gu-accent)"
          strokeWidth="1.85"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.85, delay: 0.08, ease: EASE_MOMO }}
        />
        {/* Topology vertices */}
        <circle cx="22" cy="40" r="4" fill="var(--gu-accent)" />
        <circle
          cx="22"
          cy="80"
          r="3.5"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="1.4"
        />
        <circle
          cx="184"
          cy="58"
          r="5.5"
          fill="var(--gu-accent)"
          fillOpacity="0.18"
          stroke="var(--gu-accent)"
          strokeWidth="1.5"
        />
        <circle
          cx="184"
          cy="38"
          r="3.5"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="1.3"
        />
        <circle cx="338" cy="44" r="4" fill="var(--gu-accent)" />
        <circle
          cx="338"
          cy="78"
          r="3.5"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  if (mode === "signal") {
    return (
      <svg
        viewBox="0 0 360 118"
        className="sp-cover__svg"
        aria-hidden="true"
        fill="none"
      >
        {[24, 58, 92].map((y) => (
          <line
            key={y}
            x1="12"
            y1={y}
            x2="348"
            y2={y}
            stroke="currentColor"
            strokeOpacity="0.08"
          />
        ))}
        {[48, 114, 180, 246, 312].map((x) => (
          <line
            key={x}
            x1={x}
            y1="86"
            x2={x}
            y2="96"
            stroke="currentColor"
            strokeOpacity="0.22"
          />
        ))}
        <motion.path
          d="M 16 86 C 64 82, 92 64, 134 68 C 176 72, 206 36, 254 42 C 292 46, 316 24, 344 20"
          stroke="var(--gu-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.85, ease: EASE_MOMO }}
        />
        <motion.path
          d="M 16 92 C 72 88, 118 78, 174 74 C 230 70, 282 56, 344 50"
          stroke="currentColor"
          strokeOpacity="0.24"
          strokeWidth="1.25"
          strokeDasharray="4 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.75, delay: 0.1, ease: EASE_MOMO }}
        />
        <circle cx="254" cy="42" r="4" fill="var(--gu-accent)" />
        <circle cx="344" cy="20" r="4.5" fill="var(--gu-accent)" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 360 118"
      className="sp-cover__svg"
      aria-hidden="true"
      fill="none"
    >
      <line
        x1="16"
        y1="59"
        x2="344"
        y2="59"
        stroke="currentColor"
        strokeOpacity="0.12"
      />
      <motion.circle
        cx="154"
        cy="59"
        r="40"
        stroke="currentColor"
        strokeOpacity="0.24"
        strokeWidth="1.25"
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_MOMO }}
      />
      <motion.circle
        cx="204"
        cy="59"
        r="40"
        stroke="var(--gu-accent)"
        strokeOpacity="0.72"
        strokeWidth="1.45"
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.65, delay: 0.08, ease: EASE_MOMO }}
      />
      <circle cx="179" cy="59" r="3.5" fill="var(--gu-accent)" />
    </svg>
  );
}

function Cover({
  p,
  image,
  fallbackQuery,
  blueprint,
}: {
  p: Record<string, unknown>;
  image?: string;
  fallbackQuery?: string;
  blueprint?: ExploreCoverBlueprint;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  const title = str(p.title);
  const subtitle = str(p.subtitle);
  const resolvedImage = image || blueprint?.resolvedImage;
  const imageQuery =
    str(p.imageQuery) || fallbackQuery || blueprint?.resolvedImageQuery || "";
  const primaryMode: CoverVisualMode =
    blueprint?.mode || (resolvedImage || imageQuery ? "photo" : "monograph");

  const usePhotoPlate =
    primaryMode === "photo" &&
    !photoFailed &&
    Boolean(resolvedImage || imageQuery);

  const specimenMode: Exclude<CoverVisualMode, "photo"> =
    primaryMode !== "photo"
      ? primaryMode
      : blueprint?.fallbackMode || "monograph";

  const f = fit(title.length, [
    [14, 0.94],
    [24, 0.74],
    [38, 0.58],
    [56, 0.48],
    [999, 0.42],
  ]);

  const specimenFit = fit(title.length, [
    [18, 0.82],
    [30, 0.68],
    [46, 0.56],
    [68, 0.46],
    [999, 0.4],
  ]);

  const scrollToSiblingSpread = (spreadOffset: number) => {
    const coverSection = rootRef.current?.closest(".ex-page");
    const row = coverSection?.parentElement;
    if (!coverSection || !row) return;
    const allPages = Array.from(row.querySelectorAll(":scope > .ex-page"));
    const myIdx = allPages.indexOf(coverSection);
    const target = allPages[myIdx + spreadOffset] as HTMLElement | undefined;
    if (!target) return;
    target.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  };

  if (usePhotoPlate) {
    return (
      <div ref={rootRef} className="sp-cover has-img" data-cover-mode="photo">
        <MistlinePhoto
          src={resolvedImage}
          query={imageQuery || undefined}
          autoResolve={Boolean(!resolvedImage && imageQuery)}
          seed={title}
          ratio="auto"
          className="sp-fill"
          onFailed={() => setPhotoFailed(true)}
        />
        <div className="sp-cover__top-bar">
          <span className="gu-pen sp-cover__pen momo-hand-title">
            {str(p.kicker) || blueprint?.specimenKicker || "sorotan visual"}
          </span>
          {blueprint && blueprint.outline.length > 0 && (
            <span className="sp-cover__badge">
              {blueprint.outline.length} bagian →
            </span>
          )}
        </div>
        <div className="sp-cover__words">
          {subtitle && <p className="sp-cover__sub">{subtitle}</p>}
          <h2
            className="sp-cover__title momo-serif"
            style={{ "--fit": f } as CSSProperties}
          >
            {title || "\u00a0"}
          </h2>
        </div>
      </div>
    );
  }

  const iconName = inferContextualIcon(`${title} ${subtitle}`);
  const outline = blueprint?.outline ?? [];
  const signals = blueprint?.signals ?? [];
  const chips = blueprint?.chips ?? [];
  const kickerText =
    str(p.kicker) || blueprint?.specimenKicker || "pengantar eksplorasi";

  return (
    <div
      ref={rootRef}
      className="sp-cover is-specimen"
      data-cover-mode={specimenMode}
    >
      <header className="sp-cover__spec-top">
        <span className="gu-pen sp-cover__spec-kicker momo-hand-title">
          {kickerText}
        </span>
        <span className="sp-cover__spec-stamp">
          <MistlineIcon name={iconName} size={13.5} strokeWidth={1.75} />
          <span>
            {outline.length > 0 ? `${outline.length} bagian` : specimenMode}
          </span>
        </span>
      </header>

      <div className="sp-cover__visual-stage">
        <CoverSpecimenGraphic mode={specimenMode} />

        {signals.length > 0 ? (
          <div className="sp-cover__signals">
            {signals.map((sig, i) => (
              <div key={`sig-${i}`} className="sp-cover__signal-item">
                <span className="sp-cover__signal-lbl">{sig.label}</span>
                <strong className="sp-cover__signal-val">{sig.value}</strong>
              </div>
            ))}
          </div>
        ) : (
          chips.length > 0 && (
            <div className="sp-cover__chips">
              {chips.map((ch) => (
                <span key={ch} className="sp-cover__chip">
                  #{ch}
                </span>
              ))}
            </div>
          )
        )}
      </div>

      <div className="sp-cover__spec-bottom">
        <div className="sp-cover__spec-titles">
          <h2
            className="sp-cover__title momo-serif"
            style={{ "--fit": specimenFit } as CSSProperties}
          >
            {title || "\u00a0"}
          </h2>
          {subtitle && <p className="sp-cover__sub">{subtitle}</p>}
        </div>

        {outline.length > 0 && (
          <>
            <span className="sp-cover__hairline" aria-hidden="true" />
            <nav
              className="sp-cover__toc"
              aria-label="Daftar bagian eksplorasi"
            >
              {outline.map((item) => (
                <motion.button
                  key={item.indexLabel}
                  type="button"
                  className="sp-cover__toc-btn"
                  whileTap={MH.tap}
                  transition={MH.spring}
                  onClick={() => scrollToSiblingSpread(item.spreadOffset)}
                >
                  <span className="sp-cover__toc-idx">{item.indexLabel}</span>
                  <span className="sp-cover__toc-name">{item.title}</span>
                  <span className="sp-cover__toc-role">{item.roleTag}</span>
                  <ArrowRight
                    size={11}
                    strokeWidth={2}
                    className="sp-cover__toc-arrow"
                    aria-hidden="true"
                  />
                </motion.button>
              ))}
            </nav>
          </>
        )}
      </div>
    </div>
  );
}

function Mosaic({
  p,
  live: _live,
  onInspect,
  pinnedTitles,
  onTogglePinItem,
}: {
  p: Record<string, unknown>;
  live: boolean;
  onInspect: (target: ExploreDetailTarget) => void;
  pinnedTitles?: Set<string>;
  onTogglePinItem?: (item: Omit<WorkspaceBoardItem, "id" | "columnId">) => void;
}) {
  const items = arr(p.items)
    .map(rec)
    .filter((it) => str(it.title));
  const [resolvedImgs, setResolvedImgs] = useState<Record<string, string>>({});
  const pinnedCount = items.filter((it) =>
    pinnedTitles?.has(str(it.title).trim().toLowerCase())
  ).length;
  return (
    <div className="sp-mosaic">
      <header className="sp-head">
        <h2 className="sp-h2 momo-serif">{str(p.title) || "Pilihan utama"}</h2>
        {items.length > 0 && (
          <span className="gu-pen sp-pen momo-hand-title">
            {pinnedCount > 0 ? `${pinnedCount} tersimpan` : `${items.length} sorotan`}
          </span>
        )}
      </header>
      <div className="sp-mosaic__grid" data-count={items.length}>
        {items.map((it, i) => {
          const title = str(it.title);
          const isPinned = pinnedTitles?.has(title.trim().toLowerCase());
          const explicitImg = pickImg(it);
          const isTech = SPREAD_TECHNICAL_ICONS.has(str(it.icon).toLowerCase());
          const queryText =
            str(it.imageQuery) ||
            (!explicitImg && !isTech && !isAbstractNonVisualTitle(title)
              ? title.trim()
              : undefined);
          return (
            <motion.figure
              className="sp-mosaic__item is-interactive"
              key={`mos-${i}`}
              whileHover={MH.card}
              whileTap={MH.press}
              transition={MH.spring}
              onClick={() =>
                onInspect({
                  title,
                  subtitle: str(it.subtitle) || undefined,
                  body: str(it.body) || undefined,
                  note: str(it.note) || undefined,
                  tag: str(it.tag) || undefined,
                  meta: str(it.meta) || undefined,
                  area: str(it.area) || undefined,
                  image: resolvedImgs[title] || explicitImg || undefined,
                  imageQuery: str(it.imageQuery) || title,
                  prompt: str(it.prompt) || undefined,
                  lat: num(it.lat),
                  lng: num(it.lng),
                })
              }
            >
              <span className="sp-mosaic__photo">
                <MistlinePhoto
                  src={explicitImg || undefined}
                  query={queryText}
                  autoResolve={Boolean(queryText)}
                  seed={title}
                  icon={str(it.icon)}
                  ratio="auto"
                  className="sp-fill"
                  onResolvedUrl={(url) =>
                    setResolvedImgs((prev) =>
                      prev[title] === url ? prev : { ...prev, [title]: url }
                    )
                  }
                />
                {onTogglePinItem && (
                  <motion.button
                    type="button"
                    className={`gu-icon-btn sp-mosaic__pin${isPinned ? " is-pinned" : ""}`}
                    aria-label={isPinned ? `Hapus ${title} dari board` : `Simpan ${title} ke board`}
                    whileHover={MH.icon}
                    whileTap={MH.tap}
                    transition={MH.spring}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePinItem({
                        title,
                        subtitle: str(it.subtitle) || str(it.tag) || undefined,
                        handNote: str(it.note) || str(it.body) || undefined,
                        metric: str(it.meta) || undefined,
                        imageUrl: resolvedImgs[title] || explicitImg || undefined,
                        imageQuery: str(it.imageQuery) || title,
                        pin: "heart",
                      });
                    }}
                  >
                    <Heart size={13} fill={isPinned ? "currentColor" : "none"} />
                  </motion.button>
                )}
                {str(it.note) && (
                  <span className="gu-pen sp-mosaic__note momo-hand-title">
                    {str(it.note)}
                  </span>
                )}
              </span>
              <figcaption>
                <span className="sp-mosaic__name">{title}</span>
                <span className="sp-mosaic__sub">
                  {str(it.meta) || str(it.subtitle) || str(it.tag)}
                </span>
              </figcaption>
            </motion.figure>
          );
        })}
      </div>
    </div>
  );
}

function ListSpread({
  p,
  sources,
  onInspect,
}: {
  p: Record<string, unknown>;
  sources?: SourceItem[];
  onInspect: (target: ExploreDetailTarget) => void;
}) {
  const items = arr(p.items)
    .map(rec)
    .filter((it) => str(it.title));
  return (
    <div className="sp-list">
      <div className="sp-list__words">
        <h2 className="sp-h2 momo-serif">{str(p.title) || "Daftar ringkas"}</h2>
        <span className="gu-pen sp-pen momo-hand-title">
          urutan prioritas
        </span>
      </div>
      <ol className="sp-list__rows">
        {items.map((it, i) => {
          const title = str(it.title);
          return (
            <motion.li
              key={`sl-${i}`}
              className="is-interactive"
              whileHover={MH.row}
              whileTap={MH.tap}
              transition={MH.spring}
              onClick={() =>
                onInspect({
                  title,
                  subtitle: str(it.subtitle) || undefined,
                  body: str(it.body) || undefined,
                  note: str(it.note) || undefined,
                  tag: str(it.tag) || undefined,
                  meta: str(it.meta) || undefined,
                  area: str(it.area) || undefined,
                  image: pickImg(it) || undefined,
                  imageQuery: str(it.imageQuery) || title,
                  prompt: str(it.prompt) || undefined,
                  lat: num(it.lat),
                  lng: num(it.lng),
                })
              }
            >
              <span className="sp-list__num">{String(i + 1).padStart(2, "0")}</span>
              <span className="sp-list__text">
                <span className="sp-list__name">{title}</span>
                {str(it.body) && (
                  <span className="sp-list__body">
                    <MistlineInline text={str(it.body)} sources={sources} />
                  </span>
                )}
              </span>
              {(str(it.meta) || str(it.tag)) && (
                <span className="sp-list__aside">
                  {str(it.meta) || str(it.tag)}
                </span>
              )}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function VersusSpread({
  p,
  live,
  sources,
  onAction,
}: {
  p: Record<string, unknown>;
  live: boolean;
  sources?: SourceItem[];
  onAction?: (a: MistlineAction) => void;
}) {
  const sides = [rec(p.a), rec(p.b)];
  const [resolvedUrls, setResolvedUrls] = useState<Record<number, string>>({});
  return (
    <div className="sp-versus">
      {str(p.title) && (
        <span className="gu-pen sp-pen sp-versus__pen momo-hand-title">
          {str(p.title)}
        </span>
      )}
      <div className="sp-versus__pair">
        {sides.map((x, i) => {
          const sideImg = pickImg(x);
          const sideQuery = str(x.imageQuery);
          const label =
            str(x.label) ||
            str(x.title) ||
            str(x.name) ||
            str(x.heading) ||
            str(x.option);
          const sidePoints = arr(
            x.points ?? x.pros ?? x.bullets ?? x.items ?? x.highlights,
          )
            .map((pt) =>
              typeof pt === "string" || typeof pt === "number"
                ? str(pt)
                : str(rec(pt).text) || str(rec(pt).label) || str(rec(pt).title),
            )
            .filter(Boolean);
          const hasPhoto = Boolean(sideImg || sideQuery);
          const blurSrc = resolvedUrls[i] || sideImg || "";
          return (
            <motion.figure
              className={`sp-versus__side${hasPhoto ? " has-img" : ""}${live && label ? " is-interactive" : ""}`}
              key={`vs-${i}`}
              whileHover={live && label ? MH.card : undefined}
              whileTap={live && label ? MH.press : undefined}
              transition={MH.spring}
              onClick={() => {
                if (live && label) {
                  onAction?.({
                    type: "send",
                    text: `Saya condong ke "${label}". Jabarkan rencana detailnya.`,
                  });
                }
              }}
            >
              {hasPhoto && (
                <>
                  <MistlinePhoto
                    src={sideImg || undefined}
                    query={sideQuery || undefined}
                    seed={label}
                    ratio="auto"
                    className="sp-fill"
                    onResolvedUrl={(u) => {
                      setResolvedUrls((prev) =>
                        prev[i] === u ? prev : { ...prev, [i]: u },
                      );
                    }}
                  />
                  {blurSrc && (
                    <div className="sp-versus__blur-mask" aria-hidden="true">
                      <img
                        src={blurSrc}
                        alt=""
                        className="sp-versus__blur-img"
                        decoding="async"
                        draggable={false}
                      />
                    </div>
                  )}
                  <span className="sp-versus__scrim" aria-hidden="true" />
                </>
              )}
              <div className="sp-versus__top">
                <figcaption className="sp-versus__label momo-serif">
                  {label || "\u00a0"}
                </figcaption>
                {num(x.score) !== undefined && (
                  <span className="sp-versus__score">{num(x.score)}/10</span>
                )}
              </div>
              <div className="sp-versus__bottom">
                <ul className="sp-versus__points">
                  {sidePoints.map((pt, j) => (
                    <li key={`pt-${i}-${j}`}>
                      <MistlineInline text={pt} sources={sources} />
                    </li>
                  ))}
                </ul>
              </div>
            </motion.figure>
          );
        })}
        <h2 className="sp-versus__or momo-serif" aria-hidden="true">
          <span className="sp-versus__or-text">atau</span>
        </h2>
      </div>
      {str(p.verdict) && (
        <p className="sp-versus__verdict">
          <span className="gu-pen momo-hand-title">putusan →</span>{" "}
          <MistlineInline text={str(p.verdict)} sources={sources} />
        </p>
      )}
    </div>
  );
}

function Itin({
  p,
  sources,
}: {
  p: Record<string, unknown>;
  sources?: SourceItem[];
}) {
  const days = arr(p.days).map(rec);
  return (
    <div className="sp-itin">
      <header className="sp-head">
        <h2 className="sp-h2 momo-serif">{str(p.title) || "Rencana"}</h2>
        <span className="gu-pen sp-pen momo-hand-title">
          tersimpan ke board →
        </span>
      </header>
      <div
        className="sp-itin__days"
        style={{ "--n": Math.max(1, days.length) } as CSSProperties}
      >
        {days.map((d, i) => (
          <section className="sp-itin__day" key={`day-${i}`}>
            <p className="sp-itin__label">{str(d.label) || `Day ${i + 1}`}</p>
            <h3 className="sp-itin__title momo-serif">
              {str(d.title) || "\u00a0"}
            </h3>
            <ol>
              {arr(d.items)
                .map(rec)
                .filter((x) => str(x.title))
                .map((it, j) => (
                  <li key={`di-${i}-${j}`}>
                    <span className="sp-itin__time">{str(it.time)}</span>
                    <span className="sp-itin__name">
                      <MistlineInline text={str(it.title)} sources={sources} />
                      {str(it.note) && (
                        <span className="gu-pen gu-pen--inline momo-hand-title">
                          {str(it.note)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function StatsSpread({ p }: { p: Record<string, unknown> }) {
  const items = arr(p.items)
    .map(rec)
    .filter((x) => str(x.value) || str(x.label));
  return (
    <div className="sp-stats">
      {str(p.title) && (
        <h2 className="sp-h2 sp-h2--sm momo-serif">{str(p.title)}</h2>
      )}
      <div className="sp-stats__row">
        {items.map((it, i) => (
          <div className="sp-stat" key={`sts-${i}`}>
            <span className="sp-stat__value momo-serif">
              {str(it.value) || "—"}
            </span>
            <span className="sp-stat__label">{str(it.label)}</span>
            {str(it.delta) && (
              <span className="sp-stat__delta">
                {str(it.trend) === "down"
                  ? "↓"
                  : str(it.trend) === "up"
                    ? "↑"
                    : "→"}{" "}
                {str(it.delta)}
              </span>
            )}
            {str(it.note) && (
              <span className="gu-pen gu-pen--inline momo-hand-title">
                {str(it.note)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Quote({
  p,
  sources,
}: {
  p: Record<string, unknown>;
  sources?: SourceItem[];
}) {
  const text = str(p.text);
  const f = fit(text.length, [
    [90, 1],
    [160, 0.8],
    [240, 0.66],
    [999, 0.54],
  ]);
  return (
    <div className="sp-quote">
      <span className="gu-pen sp-pen momo-hand-title">
        {str(p.title) || str(p.tone) || "catatan"}
      </span>
      <p
        className="sp-quote__text momo-serif"
        style={{ "--fit": f } as CSSProperties}
      >
        <MistlineInline text={text} sources={sources} />
      </p>
    </div>
  );
}

function PaletteSpread({ p }: { p: Record<string, unknown> }) {
  const [copied, setCopied] = useState<string | null>(null);
  const colors = arr(p.colors)
    .map(rec)
    .filter((c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(str(c.hex).trim()));
  return (
    <div className="sp-palette">
      {str(p.title) && (
        <span className="gu-pen sp-palette__pen momo-hand-title">
          {str(p.title)}
        </span>
      )}
      {colors.map((c, i) => {
        const hex = str(c.hex).trim().toUpperCase();
        return (
          <motion.button
            type="button"
            key={`pal-${hex}-${i}`}
            className="sp-palette__stripe"
            whileHover={{ flexGrow: 1.35 }}
            whileTap={MH.tap}
            transition={MH.spring}
            style={{ background: hex, color: textOnHex(hex) }}
            onClick={() => {
              void navigator.clipboard?.writeText(hex);
              setCopied(hex);
              setTimeout(() => setCopied(null), 1200);
            }}
          >
            <span className="sp-palette__name">{str(c.name)}</span>
            <span className="sp-palette__role">{str(c.role)}</span>
            <span className="sp-palette__hex">
              {copied === hex ? "tersalin" : hex}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function MistlineSpread({
  page,
  by,
  streaming,
  live,
  sources,
  onAction,
  onUiInteraction,
  pinnedTitles,
  onTogglePinItem,
}: {
  page: MistlineSpreadPage;
  by: string;
  streaming: boolean;
  live: boolean;
  sources?: SourceItem[];
  onAction: (a: MistlineAction) => void;
  onUiInteraction?: (interaction: UiInteractionPayload) => void;
  pinnedTitles?: Set<string>;
  onTogglePinItem?: (item: Omit<WorkspaceBoardItem, "id" | "columnId">) => void;
}) {
  const { block, kind } = page;
  const [inspectTarget, setInspectTarget] = useState<ExploreDetailTarget | null>(null);
  const style = {
    "--span": page.span,
    "--h": page.h,
    "--y": page.y,
  } as CSSProperties;
  const cls = `ex-page sp sp--${kind}${page.dark ? " is-dark" : ""}`;

  if (block.kind === "text") {
    return (
      <section className={cls} style={style} data-explore-spread="true" data-page>
        {kind === "sentence" ? (
          <Sentence
            text={block.text}
            by={by}
            sources={sources}
            streaming={streaming}
          />
        ) : (
          <Essay text={block.text} sources={sources} streaming={streaming} />
        )}
      </section>
    );
  }

  const ui = block as MistlineUIBlock;
  const p = ui.props;
  const renderSpreadBody = () => {
    if (!ui.complete) {
      return (
        <div className="sp-pad">
          <GenerativeSkeleton name={ui.name} props={p} />
        </div>
      );
    }
    if (Object.keys(p).length === 0) {
      return (
        <div className="sp-pad">
          <div className="gu gu-unknown gu-region-error" role="alert">
            <span className="gu-pen momo-hand-title">blok {ui.name.toLowerCase()} tidak selesai</span>
          </div>
        </div>
      );
    }
    if (kind === "cover") {
      return (
        <Cover
          p={p}
          image={page.image}
          fallbackQuery={page.imageQuery}
          blueprint={page.coverBlueprint}
        />
      );
    }
    if (kind === "mosaic") {
      return (
        <Mosaic
          p={p}
          live={live}
          onInspect={setInspectTarget}
          pinnedTitles={pinnedTitles}
          onTogglePinItem={onTogglePinItem}
        />
      );
    }
    if (kind === "list") {
      return (
        <ListSpread
          p={p}
          sources={sources}
          onInspect={setInspectTarget}
        />
      );
    }
    if (kind === "versus") {
      return <VersusSpread p={p} live={live} sources={sources} onAction={onAction} />;
    }
    if (kind === "itin") return <Itin p={p} sources={sources} />;
    if (kind === "stats") return <StatsSpread p={p} />;
    if (kind === "quote") return <Quote p={p} sources={sources} />;
    if (kind === "palette") return <PaletteSpread p={p} />;

    return (
      <div
        className={`sp-panel${kind === "checklist" ? " sp-panel--split" : ""}`}
      >
        <div className="sp-panel__body">
          <MistlineComponent
            name={ui.name}
            props={p}
            complete={ui.complete && !ui.truncated}
            streaming={streaming}
            surface="explore"
            live={live}
            sources={sources}
            onAction={onAction}
            onUiInteraction={onUiInteraction}
            pinnedTitles={pinnedTitles}
            onTogglePinItem={onTogglePinItem}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <section
        className={cls}
        style={style}
        data-explore-spread="true"
        data-page
        data-component={ui.name}
        data-wide={page.wide ? "true" : undefined}
      >
        <MistlineBlockBoundary name={ui.name}>{renderSpreadBody()}</MistlineBlockBoundary>
        {ui.truncated && (
          <p
            className="gu-pen momo-hand-title"
            style={{ margin: "0 18px 14px", color: "var(--mute)", fontSize: 12 }}
          >
            potongan — respons terhenti di tengah
          </p>
        )}
      </section>

      <ExplorePlaceDetailModal
        item={inspectTarget}
        onClose={() => setInspectTarget(null)}
        onAskMomo={(prompt) => onAction({ type: "send", text: prompt })}
        pinnedTitles={pinnedTitles}
        onTogglePinItem={onTogglePinItem}
      />
    </>
  );
}
