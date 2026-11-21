"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ArrowUpRight, RotateCcw } from "lucide-react";
import { MistlineIcon } from "@/components/genui/MistlineIcons";
import {
  MistlineFollowChips,
  MistlineMediaScopeProvider,
} from "@/components/genui/MistlineLibrary";
import {
  MistlineSpread,
  planMistlineSpreads,
} from "@/components/genui/MistlineSpreads";
import {
  EASE_MOMO,
  MOTION_VOCABULARY,
} from "@/components/motion/MotionPrimitives";
import { MarkdownMessage } from "@/components/shell/MarkdownMessage";
import { SourcePillRow } from "@/components/shell/SourcePillRow";
import {
  buildContextualExploreBranches,
  shortenTopicLabel,
} from "@/lib/openui/exploreEndcapPlanner";
import { parseMixedStreamToMistlineBlocks } from "@/lib/openui/streamParser";
import { sanitizePublicTaskLabel } from "@/lib/taskTelemetrySanitizer";
import {
  getRoleWorkspaceConfig,
  type ArtworkFamily,
} from "@/lib/roleWorkspaceRegistry";
import type {
  ChatMessage,
  ChatSession,
  GenUiPart,
  ToolPart,
  UiInteractionPayload,
  WorkspaceBoardItem,
} from "@/types/momo";

export interface ExploreWorkspaceViewProps {
  roleId: string;
  session: ChatSession | null;
  busy: boolean;
  slotExploreRef?: React.RefObject<HTMLDivElement | null>;
  onSubmitPrompt: (
    prompt: string,
    uiInteraction?: UiInteractionPayload,
    targetChannel?: "chat" | "explore",
  ) => void;
  onRetryTurn?: (botMsg: ChatMessage) => void;
  onOpenBoard?: () => void;
  pinnedTitles?: Set<string>;
  onTogglePinItem?: (item: Omit<WorkspaceBoardItem, "id" | "columnId">) => void;
  /** Turn to bring into view, e.g. picked from the history sub-tree. `seq` changes per request. */
  focusTurn?: { idx: number; seq: number } | null;
}

interface LiveWeatherInfo {
  temp: string;
  tempNum: number;
  cond: string;
  icon: "sun-cloud" | "breeze" | "sun" | "rain";
  flag: string;
  area: string;
}

function getTimeBucket(): "pagi" | "siang" | "sore" | "malam" {
  const hr = new Date().getHours();
  if (hr >= 4 && hr < 11) return "pagi";
  if (hr >= 11 && hr < 15) return "siang";
  if (hr >= 15 && hr < 19) return "sore";
  return "malam";
}

function getAdaptiveWeatherGreeting(
  roleId: string,
  weather: LiveWeatherInfo | null,
): string {
  const waktu = getTimeBucket();
  if (!weather) {
    if (roleId === "cook") return `Pas buat racik menu ${waktu}.`;
    if (roleId === "traveller") return `Waktunya susun rute ${waktu}.`;
    if (
      ["bug", "investigate", "captain", "builder", "tester", "guard"].includes(
        roleId,
      )
    ) {
      return `Jernih buat bedah arsitektur ${waktu}.`;
    }
    if (["designer", "write", "director", "music"].includes(roleId)) {
      return `Enak buat ngulik ide kreatif ${waktu}.`;
    }
    return `Ide apa yang mau dikuliti ${waktu} ini?`;
  }

  const coldOrCool = weather.tempNum <= 22;
  const hot = weather.tempNum >= 31;
  if (weather.icon === "rain") {
    if (roleId === "cook")
      return `Hujan ${weather.temp}, pas bikin yang hangat.`;
    if (roleId === "garden") return `Lagi hujan, cek drainase media tanam.`;
    if (roleId === "traveller") return `Gerimis, asyik cari rute kafe indoor.`;
    return `Hujan di luar, tenang buat riset.`;
  }
  if (weather.icon === "sun-cloud" || weather.icon === "breeze") {
    if (roleId === "traveller") return `Mendung sejuk, enak jalan kaki santai.`;
    if (["designer", "write", "director", "music"].includes(roleId)) {
      return `Langit teduh, fokus nulis dan sketsa.`;
    }
    return `Langit adem ${weather.temp}, enak buat fokus.`;
  }
  if (roleId === "traveller") {
    return coldOrCool
      ? `Udara sejuk ${weather.temp}, gas jelajah outdoor.`
      : hot
        ? `Cukup terik ${weather.temp}, cari spot teduh.`
        : `Cuaca cerah ${weather.temp}, rute lagi ramah.`;
  }
  if (roleId === "cook") {
    return coldOrCool
      ? `Hawa sejuk ${weather.temp}, pas buat sup hangat.`
      : `Panas ${weather.temp}, bikin menu segar dulu.`;
  }
  if (
    ["bug", "investigate", "captain", "builder", "tester", "guard"].includes(
      roleId,
    )
  ) {
    return `Cuaca tenang ${weather.temp}, gampang trace bug.`;
  }
  if (["designer", "write", "director", "music"].includes(roleId)) {
    return `Cahaya pas di luar, ngulik komposisi.`;
  }
  if (["money", "planner", "tutor", "coach"].includes(roleId)) {
    return `Hari cerah ${weather.temp}, beresin prioritas.`;
  }
  return coldOrCool
    ? `Hawa sejuk ${weather.temp}, siap mulai eksplorasi.`
    : hot
      ? `Terik di luar (${weather.temp}), ngadem sambil riset.`
      : `Hari cerah ${weather.temp}, siap mulai eksplorasi.`;
}

const WeatherSvg: React.FC<{ icon: LiveWeatherInfo["icon"] }> = ({ icon }) => {
  if (icon === "sun") {
    return (
      <svg
        className="momo-weather-icon"
        viewBox="0 0 18 18"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="3.4" fill="currentColor" fillOpacity="0.2" />
        <path d="M9 1.8v1.6M9 14.6v1.6M1.8 9h1.6M14.6 9h1.6M3.9 3.9l1.1 1.1M13 13l1.1 1.1M14.1 3.9 13 5M5 13l-1.1 1.1" />
      </svg>
    );
  }
  if (icon === "rain") {
    return (
      <svg
        className="momo-weather-icon"
        viewBox="0 0 18 18"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path
          d="M4.8 11.2h7.6a2.6 2.6 0 0 0 .3-5.2A3.7 3.7 0 0 0 5.6 5a2.9 2.9 0 0 0-.8 6.2Z"
          fill="currentColor"
          fillOpacity="0.14"
        />
        <path d="M6.4 13.4l-.8 2M9.4 13.4l-.8 2M12.4 13.4l-.8 2" />
      </svg>
    );
  }
  if (icon === "breeze") {
    return (
      <svg
        className="momo-weather-icon"
        viewBox="0 0 18 18"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M2.5 7h8.2a1.8 1.8 0 1 0-1.8-1.8" />
        <path d="M2.5 10.2h11a1.9 1.9 0 1 1-1.9 1.9" />
        <path d="M4 13.4h4.8" />
      </svg>
    );
  }
  return (
    <svg
      className="momo-weather-icon"
      viewBox="0 0 18 18"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6.5" cy="6.5" r="2.5" fill="currentColor" fillOpacity="0.2" />
      <path d="M6.5 2v1M2 6.5h1M3.4 3.4l.7.7M9.6 3.4l-.7.7" />
      <path
        d="M5.6 13.2h6.8a2.3 2.3 0 0 0 .2-4.6 3.3 3.3 0 0 0-6.2-.7 2.5 2.5 0 0 0-.8 5.3Z"
        fill="var(--bg)"
        fillOpacity="0.8"
      />
    </svg>
  );
};

/**
 * Hand-sketched SVG path driven by pure CSS keyframes so it draws, breathes,
 * and erases stroke-by-stroke with zero main-thread JS interpolation overhead.
 */
const SketchPath: React.FC<{
  d: string;
  accent?: boolean;
  strokeWidth?: number;
  dur?: number;
  delay?: number;
  fill?: string;
  fillOpacity?: number;
}> = ({
  d,
  accent = true,
  strokeWidth = 1.85,
  dur = 8.4,
  delay = 0,
  fill = "none",
  fillOpacity = 0,
}) => (
  <path
    d={d}
    pathLength={1}
    className="momo-sketch-path"
    stroke={accent ? "var(--accent)" : "currentColor"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    fill={fill}
    fillOpacity={fillOpacity}
    style={
      {
        "--sketch-dur": `${dur}s`,
        "--sketch-delay": `${delay}s`,
      } as React.CSSProperties
    }
  />
);

/**
 * Ambient role-driven SVG layer behind Explore strictly below prompt input (`top: 452px`):
 * each role paints 3 layered multi-stroke illustrations (left, center, right)
 * using GPU CSS animations instead of 30+ concurrent Framer Motion JS loops.
 */
const ExploreRoleAmbientBackdrop: React.FC<{
  family: ArtworkFamily;
  roleId: string;
}> = ({ family, roleId }) => {
  const renderMotifs = () => {
    if (family === "botany") {
      return (
        <>
          <g className="momo-ambient-float">
            <SketchPath
              d="M120 325 C 142 230, 178 165, 210 78"
              dur={8.4}
              delay={0}
            />
            <SketchPath
              d="M166 205 C 122 178, 92 128, 126 98 C 164 114, 178 158, 166 205 Z"
              dur={8.4}
              delay={0.35}
              fill="var(--accent)"
              fillOpacity={0.14}
            />
            <SketchPath
              d="M188 148 C 232 122, 274 134, 266 172 C 236 184, 198 176, 188 148 Z"
              accent={false}
              dur={8.4}
              delay={0.65}
            />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M460 285 Q 595 235 740 278"
              accent={false}
              dur={9.2}
              delay={1.2}
            />
            <SketchPath
              d="M565 262 C 578 190, 610 142, 646 96"
              dur={9.2}
              delay={1.45}
            />
            <SketchPath
              d="M610 172 C 572 138, 560 98, 588 84 C 618 102, 622 142, 610 172 Z"
              dur={9.2}
              delay={1.75}
              fill="var(--accent)"
              fillOpacity={0.12}
            />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M1020 44 A 64 64 0 1 1 1019.9 44 Z"
              accent={false}
              dur={9.6}
              delay={0.6}
            />
            <SketchPath
              d="M976 286 C 986 218, 1024 176, 1082 132"
              dur={9.6}
              delay={0.95}
            />
            <SketchPath
              d="M1080 202 C 1104 226, 1098 258, 1080 258 C 1062 258, 1056 226, 1080 202 Z"
              dur={9.6}
              delay={1.3}
              fill="var(--accent)"
              fillOpacity={0.14}
            />
          </g>
        </>
      );
    }

    if (family === "travel") {
      return (
        <>
          <g className="momo-ambient-float">
            <SketchPath
              d="M48 278 L 136 142 L 208 212 L 266 154 L 348 278"
              accent={false}
              dur={9}
              delay={0}
            />
            <SketchPath
              d="M230 98 A 28 28 0 1 1 229.9 98 Z"
              dur={9}
              delay={0.35}
              fill="var(--accent)"
              fillOpacity={0.12}
            />
            <SketchPath d="M52 296 Q 196 254 344 294" dur={9} delay={0.6} />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M430 220 C 535 95, 685 110, 775 186"
              dur={8.2}
              delay={1.1}
            />
            <SketchPath
              d="M615 92 L 668 112 L 610 130 L 626 111 Z"
              dur={8.2}
              delay={1.45}
              fill="var(--accent)"
              fillOpacity={0.16}
            />
            <SketchPath
              d="M424 220 A 6 6 0 1 1 423.9 220 Z M775 186 A 6 6 0 1 1 774.9 186 Z"
              accent={false}
              dur={8.2}
              delay={1.7}
            />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M1020 90 A 78 78 0 1 1 1019.9 90 Z"
              accent={false}
              dur={9.4}
              delay={0.5}
            />
            <SketchPath
              d="M1020 112 L 1034 156 L 1078 170 L 1034 184 L 1020 228 L 1006 184 L 962 170 L 1006 156 Z"
              dur={9.4}
              delay={0.9}
              fill="var(--accent)"
              fillOpacity={0.14}
            />
          </g>
        </>
      );
    }

    if (family === "culinary") {
      return (
        <>
          <g className="momo-ambient-float">
            <SketchPath
              d="M110 210 H270 C 266 286, 224 308, 190 308 C 156 308, 114 286, 110 210 Z"
              dur={8.6}
              delay={0}
              fill="var(--accent)"
              fillOpacity={0.12}
            />
            <SketchPath
              d="M154 184 Q 134 146 154 110 Q 174 82 154 58"
              accent={false}
              dur={8.6}
              delay={0.35}
            />
            <SketchPath
              d="M214 182 Q 236 142 214 106 Q 194 78 214 52"
              dur={8.6}
              delay={0.65}
            />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M510 212 C 562 146, 652 146, 704 212 C 652 248, 562 248, 510 212 Z"
              accent={false}
              dur={9.4}
              delay={1.2}
            />
            <SketchPath d="M560 120 L 656 216" dur={9.4} delay={1.5} />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M1015 86 C 1062 142, 1054 224, 1015 248 C 976 224, 968 142, 1015 86 Z"
              dur={8.8}
              delay={0.6}
            />
            <SketchPath
              d="M1015 248 V312"
              accent={false}
              strokeWidth={2.2}
              dur={8.8}
              delay={0.9}
            />
            <SketchPath
              d="M970 116 A 56 56 0 0 1 1072 148"
              dur={8.8}
              delay={1.2}
            />
          </g>
        </>
      );
    }

    if (family === "engineering") {
      return (
        <>
          <g className="momo-ambient-float">
            <SketchPath
              d="M58 172 H134 L168 122 H262 L292 172 H356"
              dur={8.2}
              delay={0}
            />
            <SketchPath
              d="M92 224 H188 L220 264 H324"
              accent={false}
              dur={8.2}
              delay={0.35}
            />
            <SketchPath
              d="M212 104 A 18 18 0 1 1 211.9 104 Z"
              dur={8.2}
              delay={0.7}
              fill="var(--accent)"
              fillOpacity={0.16}
            />
            <SketchPath
              d="M134 172 L 154 196 H 244"
              accent={false}
              dur={8.2}
              delay={1.0}
            />
          </g>
          <g className="momo-ambient-float">
            <SketchPath d="M548 140 L 502 184 L 548 228" dur={9} delay={1.1} />
            <SketchPath d="M672 140 L 718 184 L 672 228" dur={9} delay={1.35} />
            <SketchPath
              d="M628 128 L 592 240"
              accent={false}
              dur={9}
              delay={1.6}
            />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M1020 96 L 1094 138 V 222 L 1020 264 L 946 222 V 138 Z"
              accent={false}
              dur={8.8}
              delay={0.5}
            />
            <SketchPath
              d="M946 138 L 1020 180 L 1094 138 M1020 180 V 264"
              dur={8.8}
              delay={0.9}
            />
            <SketchPath
              d="M910 286 Q 970 250 1020 286 T 1130 286"
              dur={8.8}
              delay={1.25}
            />
          </g>
        </>
      );
    }

    if (family === "design" || family === "creative") {
      return (
        <>
          <g className="momo-ambient-float">
            <SketchPath
              d="M68 258 C 122 108, 256 266, 336 106"
              dur={8.4}
              delay={0}
            />
            <SketchPath
              d="M68 258 L 146 112"
              accent={false}
              dur={8.4}
              delay={0.35}
            />
            <SketchPath
              d="M138 104 H 154 V 120 H 138 Z"
              dur={8.4}
              delay={0.65}
              fill="var(--accent)"
              fillOpacity={0.2}
            />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M518 112 H652 V224 H518 Z"
              accent={false}
              dur={9.2}
              delay={1.1}
            />
            <SketchPath
              d="M558 144 H692 V256 H558 Z"
              dur={9.2}
              delay={1.45}
              fill="var(--accent)"
              fillOpacity={0.1}
            />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M1020 82 L 1068 184 L 1020 264 L 972 184 Z"
              dur={8.8}
              delay={0.5}
              fill="var(--accent)"
              fillOpacity={0.14}
            />
            <SketchPath
              d="M1020 82 V 176"
              accent={false}
              dur={8.8}
              delay={0.85}
            />
            <SketchPath
              d="M960 278 C 998 250, 1052 302, 1094 268"
              dur={8.8}
              delay={1.15}
            />
          </g>
        </>
      );
    }

    if (family === "finance") {
      return (
        <>
          <g className="momo-ambient-float">
            <SketchPath
              d="M84 282 V 214 H 130 V 282 M 156 282 V 168 H 202 V 282 M 228 282 V 124 H 274 V 282"
              dur={8.8}
              delay={0}
            />
            <SketchPath
              d="M68 282 H 296"
              accent={false}
              dur={8.8}
              delay={0.4}
            />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M466 254 C 542 238, 608 184, 728 112"
              dur={9}
              delay={1.1}
            />
            <SketchPath d="M694 110 H 730 V 146" dur={9} delay={1.45} />
          </g>
          <g className="momo-ambient-float">
            <SketchPath d="M946 154 L 1094 134" dur={8.6} delay={0.5} />
            <SketchPath
              d="M1020 144 V 278"
              accent={false}
              dur={8.6}
              delay={0.8}
            />
            <SketchPath
              d="M946 154 C 930 202, 976 218, 984 186"
              accent={false}
              dur={8.6}
              delay={1.05}
            />
          </g>
        </>
      );
    }

    if (family === "learning") {
      return (
        <>
          <g className="momo-ambient-float">
            <SketchPath
              d="M74 144 Q 140 120 198 158 V 274 Q 140 242 74 264 Z"
              dur={8.6}
              delay={0}
              fill="var(--accent)"
              fillOpacity={0.1}
            />
            <SketchPath
              d="M322 144 Q 256 120 198 158 V 274 Q 256 242 322 264 Z"
              accent={false}
              dur={8.6}
              delay={0.35}
            />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M510 185 A 100 42 0 1 1 509.9 185.1"
              dur={9.2}
              delay={1.1}
            />
            <SketchPath
              d="M565 95 A 42 96 0 1 1 564.9 95.1"
              accent={false}
              dur={9.2}
              delay={1.45}
            />
          </g>
          <g className="momo-ambient-float">
            <SketchPath
              d="M936 184 H 1004 C 1030 184, 1044 126, 1084 126 H 1126 M 1004 184 C 1030 184, 1044 242, 1084 242 H 1126"
              dur={8.8}
              delay={0.6}
            />
            <SketchPath
              d="M1084 106 A 20 20 0 1 1 1083.9 106 Z"
              accent={false}
              dur={8.8}
              delay={0.95}
            />
          </g>
        </>
      );
    }

    return (
      <>
        <g className="momo-ambient-float">
          <SketchPath
            d="M74 266 C 142 146, 224 276, 308 134"
            dur={8.4}
            delay={0}
          />
          <SketchPath
            d="M188 94 L 200 132 L 238 144 L 200 156 L 188 194 L 176 156 L 138 144 L 176 132 Z"
            dur={8.4}
            delay={0.4}
            fill="var(--accent)"
            fillOpacity={0.14}
          />
        </g>
        <g className="momo-ambient-float">
          <SketchPath
            d="M484 224 Q 608 128 738 220"
            accent={false}
            dur={9.2}
            delay={1.2}
          />
          <SketchPath d="M548 258 Q 612 224 680 258" dur={9.2} delay={1.55} />
        </g>
        <g className="momo-ambient-float">
          <SketchPath
            d="M1020 92 A 76 76 0 1 1 1019.9 92 Z"
            dur={8.8}
            delay={0.5}
          />
          <SketchPath
            d="M966 196 A 54 32 0 1 1 965.9 196.1"
            accent={false}
            dur={8.8}
            delay={0.9}
          />
          <SketchPath
            d="M1020 144 L 1030 170 L 1056 180 L 1030 190 L 1020 216 L 1010 190 L 984 180 L 1010 170 Z"
            dur={8.8}
            delay={1.2}
            fill="var(--accent)"
            fillOpacity={0.16}
          />
        </g>
      </>
    );
  };

  return (
    <div className="momo-explore-ambient-bg" aria-hidden="true">
      <AnimatePresence mode="wait">
        <motion.svg
          key={`${roleId}-${family}`}
          className="momo-explore-ambient-svg"
          viewBox="0 0 1200 720"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE_MOMO }}
        >
          {/* Upper side margin architectural / notebook contours framing full viewport height */}
          <g className="momo-ambient-float">
            <SketchPath
              d="M24 128 Q 74 96 116 146 T 178 188"
              accent={false}
              strokeWidth={1.3}
              dur={10.2}
              delay={0.2}
            />
            <SketchPath
              d="M1044 108 C 1094 84, 1148 118, 1174 176"
              accent
              strokeWidth={1.3}
              dur={10.2}
              delay={0.8}
            />
          </g>
          {/* Lower full-height role composition */}
          <g transform="translate(0 368)">{renderMotifs()}</g>
        </motion.svg>
      </AnimatePresence>
    </div>
  );
};

const ArtworkFrame: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <motion.svg
    viewBox="0 0 240 84"
    width="100%"
    height="72"
    fill="none"
    aria-hidden="true"
    variants={{
      rest: { scale: 1, y: 0 },
      hover: { scale: 1.07, y: -3 },
    }}
    transition={{ duration: 0.26, ease: EASE_MOMO }}
  >
    {children}
  </motion.svg>
);

const FollowupArtwork: React.FC<{ index: number }> = ({ index }) => {
  const slot = index % 4;
  if (slot === 0) {
    return (
      <ArtworkFrame>
        {[46, 102, 158].map((x, i) => (
          <rect
            key={x}
            x={x}
            y="14"
            width="36"
            height="44"
            rx="7"
            stroke="currentColor"
            strokeOpacity={i === 1 ? "0.34" : "0.2"}
            strokeWidth="1.3"
            fill={i === 1 ? "var(--accent)" : "currentColor"}
            fillOpacity={i === 1 ? "0.08" : "0.03"}
          />
        ))}
        <rect
          x="52"
          y="22"
          width="24"
          height="10"
          rx="3"
          fill="currentColor"
          fillOpacity="0.22"
        />
        <rect
          x="164"
          y="22"
          width="24"
          height="10"
          rx="3"
          fill="currentColor"
          fillOpacity="0.22"
        />
        <motion.rect
          x="52"
          y="36"
          width="24"
          height="12"
          rx="3.5"
          fill="var(--accent)"
          fillOpacity="0.72"
          animate={{ x: [52, 108, 108, 52], y: [36, 22, 22, 36] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </ArtworkFrame>
    );
  }
  if (slot === 1) {
    return (
      <ArtworkFrame>
        {[
          { y: 18, w: 68, accent: false },
          { y: 31, w: 120, accent: true },
          { y: 44, w: 86, accent: false },
        ].map((row, i) => (
          <g key={i}>
            <line
              x1="44"
              y1={row.y + 4}
              x2="196"
              y2={row.y + 4}
              stroke="currentColor"
              strokeOpacity="0.14"
              strokeWidth="1.2"
            />
            <motion.rect
              x="44"
              y={row.y}
              width={row.w}
              height="8"
              rx="4"
              fill={row.accent ? "var(--accent)" : "currentColor"}
              fillOpacity={row.accent ? 0.78 : 0.28}
              animate={{ width: [row.w * 0.72, row.w, row.w * 0.72] }}
              transition={{
                duration: 2.6,
                delay: i * 0.25,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </g>
        ))}
      </ArtworkFrame>
    );
  }
  if (slot === 2) {
    return (
      <ArtworkFrame>
        <path
          d="M44 36 H104 C124 36, 128 18, 152 18 H186 M104 36 H186 M104 36 C124 36, 128 54, 152 54 H186"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1.4"
        />
        <motion.path
          d="M44 36 H104 C124 36, 128 18, 152 18 H186"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeDasharray="6 6"
          animate={{ strokeDashoffset: [0, -24] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
        />
        <circle cx="44" cy="36" r="5" fill="var(--accent)" />
        <circle
          cx="186"
          cy="18"
          r="4.5"
          fill="var(--accent)"
          fillOpacity="0.85"
        />
        <circle
          cx="186"
          cy="36"
          r="3.5"
          fill="currentColor"
          fillOpacity="0.4"
        />
        <circle
          cx="186"
          cy="54"
          r="3.5"
          fill="currentColor"
          fillOpacity="0.4"
        />
      </ArtworkFrame>
    );
  }
  return (
    <ArtworkFrame>
      <motion.path
        d="M42 52 Q120 8 192 26"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeDasharray="5 5"
        animate={{ strokeDashoffset: [0, -20] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
      />
      <circle cx="42" cy="52" r="4" fill="currentColor" fillOpacity="0.35" />
      <g transform="translate(192 26)">
        <motion.circle
          r="12"
          stroke="var(--accent)"
          strokeOpacity="0.45"
          strokeWidth="1.4"
          animate={{ scale: [0.82, 1.18, 0.82], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <polygon points="-4,-5 7,0 -4,5" fill="var(--accent)" />
      </g>
    </ArtworkFrame>
  );
};

/**
 * Role-family animated SVG artwork placed directly under Explore card titles.
 */
const ExploreCardArtwork: React.FC<{
  family: ArtworkFamily;
  index: number;
  mode?: "primary" | "followup";
}> = ({ family, index, mode = "primary" }) => {
  if (mode === "followup") {
    return <FollowupArtwork index={index} />;
  }

  const variant = index % 4;

  if (family === "travel") {
    if (variant === 0) {
      return (
        <ArtworkFrame>
          <path
            d="M24 58 Q120 18 216 58"
            stroke="currentColor"
            strokeOpacity="0.18"
            strokeWidth="1.3"
            strokeDasharray="4 4"
          />
          <motion.path
            d="M28 56 C76 16, 152 64, 212 22"
            stroke="var(--accent)"
            strokeWidth="2.1"
            strokeDasharray="7 5"
            animate={{ strokeDashoffset: [0, -24] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          />
          <motion.polygon
            points="0,-6 14,0 0,6 3,0"
            fill="var(--accent)"
            animate={{
              x: [32, 120, 206],
              y: [54, 42, 24],
              rotate: [-28, 14, -22],
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle
            cx="28"
            cy="56"
            r="4"
            fill="var(--card)"
            stroke="var(--accent)"
            strokeWidth="1.8"
          />
          <circle cx="212" cy="22" r="4.5" fill="var(--accent)" />
        </ArtworkFrame>
      );
    }
    if (variant === 1) {
      return (
        <ArtworkFrame>
          <g transform="translate(120 42)">
            <motion.circle
              r="30"
              stroke="currentColor"
              strokeOpacity="0.22"
              strokeWidth="1.3"
              strokeDasharray="10 6"
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              r="20"
              stroke="var(--accent)"
              strokeOpacity="0.6"
              strokeWidth="1.6"
              strokeDasharray="8 5"
              animate={{ rotate: -360 }}
              transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
            />
            <motion.polygon
              points="0,-16 4,-4 16,0 4,4 0,16 -4,4 -16,0 -4,-4"
              fill="var(--accent)"
              fillOpacity="0.28"
              stroke="var(--accent)"
              strokeWidth="1.5"
              animate={{ rotate: [-14, 18, -14] }}
              transition={{
                duration: 3.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </g>
        </ArtworkFrame>
      );
    }
    if (variant === 2) {
      return (
        <ArtworkFrame>
          <path
            d="M20 62 Q120 26 220 56"
            stroke="currentColor"
            strokeOpacity="0.18"
            strokeWidth="1.4"
          />
          {[56, 120, 184].map((x, i) => (
            <motion.g
              key={x}
              transform={`translate(${x} ${i === 1 ? 30 : 42})`}
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 2.1,
                delay: i * 0.28,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <path
                d="M0,-12 C6,-12 10,-7 10,-2 C10,5 0,13 0,13 C0,13 -10,5 -10,-2 C-10,-7 -6,-12 0,-12 Z"
                fill="var(--accent)"
                fillOpacity={i === 1 ? 0.4 : 0.2}
                stroke="var(--accent)"
                strokeWidth="1.6"
              />
              <circle cy="-3" r="2.8" fill="var(--accent)" />
            </motion.g>
          ))}
        </ArtworkFrame>
      );
    }
    return (
      <ArtworkFrame>
        <path
          d="M28 60 H212"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1.4"
          strokeDasharray="4 5"
        />
        <motion.path
          d="M40 52 C74 18, 166 18, 200 52"
          stroke="var(--accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          animate={{ pathLength: [0.35, 1, 0.35] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="120"
          cy="26"
          r="14"
          fill="var(--accent)"
          fillOpacity="0.2"
          stroke="var(--accent)"
          strokeWidth="1.5"
          animate={{ scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "120px 26px" }}
        />
      </ArtworkFrame>
    );
  }

  if (family === "learning") {
    if (variant === 0) {
      return (
        <ArtworkFrame>
          <g transform="translate(120 42)">
            <motion.ellipse
              rx="46"
              ry="16"
              stroke="var(--accent)"
              strokeOpacity="0.65"
              strokeWidth="1.5"
              animate={{ rotate: [18, 378] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
            <motion.ellipse
              rx="46"
              ry="16"
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeWidth="1.3"
              animate={{ rotate: [-28, -388] }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              r="8"
              fill="var(--accent)"
              animate={{ scale: [0.88, 1.2, 0.88] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </g>
        </ArtworkFrame>
      );
    }
    if (variant === 1) {
      return (
        <ArtworkFrame>
          {[0, 1, 2, 3].map((i) => {
            const x = 44 + i * 44;
            const y = 60 - i * 11;
            return (
              <motion.rect
                key={i}
                x={x}
                y={y}
                width="32"
                height={14 + i * 11}
                rx="5"
                fill={i === 3 ? "var(--accent)" : "currentColor"}
                fillOpacity={i === 3 ? 0.32 : 0.1}
                stroke={i === 3 ? "var(--accent)" : "currentColor"}
                strokeOpacity={i === 3 ? 0.9 : 0.35}
                strokeWidth="1.5"
                animate={{ y: [y + 3, y - 3, y + 3] }}
                transition={{
                  duration: 2.2,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            );
          })}
        </ArtworkFrame>
      );
    }
    if (variant === 2) {
      return (
        <ArtworkFrame>
          <path
            d="M36 42 H108 C126 42, 134 22, 158 22 H204 M108 42 C126 42, 134 62, 158 62 H204"
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeWidth="1.4"
          />
          <motion.path
            d="M36 42 H108 C126 42, 134 22, 158 22 H204"
            stroke="var(--accent)"
            strokeWidth="2.1"
            strokeDasharray="7 5"
            animate={{ strokeDashoffset: [0, -24] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "linear" }}
          />
          <motion.circle
            cx="158"
            cy="22"
            r="5.5"
            fill="var(--accent)"
            animate={{ scale: [0.85, 1.3, 0.85] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "158px 22px" }}
          />
        </ArtworkFrame>
      );
    }
    return (
      <ArtworkFrame>
        <g transform="translate(120 42)">
          {[28, 18, 8].map((r, i) => (
            <motion.circle
              key={r}
              r={r}
              stroke="var(--accent)"
              strokeOpacity={0.3 + i * 0.28}
              strokeWidth="1.7"
              fill={i === 2 ? "var(--accent)" : "none"}
              animate={{ scale: [0.9, 1.14, 0.9] }}
              transition={{
                duration: 2.2,
                delay: i * 0.22,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </g>
      </ArtworkFrame>
    );
  }

  if (family === "botany") {
    if (variant === 0) {
      return (
        <ArtworkFrame>
          <path
            d="M120 60 V22"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="1.6"
          />
          <motion.path
            d="M120 42 C120 24, 148 16, 160 26 C152 44, 132 46, 120 42 Z"
            fill="var(--accent)"
            fillOpacity="0.26"
            stroke="var(--accent)"
            strokeWidth="1.6"
            animate={{ rotate: [0, 3, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "120px 42px" }}
          />
          <motion.path
            d="M120 46 C120 30, 92 22, 80 32 C88 50, 108 52, 120 46 Z"
            fill="currentColor"
            fillOpacity="0.12"
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="1.4"
            animate={{ rotate: [0, -3, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "120px 46px" }}
          />
        </ArtworkFrame>
      );
    }
    if (variant === 1) {
      return (
        <ArtworkFrame>
          <ellipse
            cx="120"
            cy="54"
            rx="52"
            ry="8"
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeWidth="1.3"
          />
          {[96, 120, 144].map((x, i) => (
            <motion.path
              key={x}
              d={`M${x} 16 C${x + 6} 26, ${x + 5} 34, ${x} 34 C${x - 5} 34, ${x - 6} 26, ${x} 16 Z`}
              fill="var(--accent)"
              fillOpacity="0.42"
              stroke="var(--accent)"
              strokeWidth="1.4"
              animate={{ y: [0, 10, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 2.2,
                delay: i * 0.35,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </ArtworkFrame>
      );
    }
    if (variant === 2) {
      return (
        <ArtworkFrame>
          <motion.circle
            cx="120"
            cy="36"
            r="14"
            fill="var(--accent)"
            fillOpacity="0.24"
            stroke="var(--accent)"
            strokeWidth="1.6"
            animate={{ scale: [0.94, 1.08, 0.94] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "120px 36px" }}
          />
          <motion.circle
            cx="120"
            cy="36"
            r="26"
            stroke="var(--accent)"
            strokeOpacity="0.45"
            strokeWidth="1.4"
            strokeDasharray="6 6"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "120px 36px" }}
          />
          <path
            d="M56 54 H184"
            stroke="currentColor"
            strokeOpacity="0.18"
            strokeWidth="1.2"
          />
        </ArtworkFrame>
      );
    }
    return (
      <ArtworkFrame>
        <path
          d="M120 14 V34 M120 34 C104 42, 86 48, 72 58 M120 34 C136 42, 154 48, 168 58 M120 34 L120 60"
          stroke="currentColor"
          strokeOpacity="0.28"
          strokeWidth="1.5"
        />
        <motion.path
          d="M72 58 C86 48, 104 42, 120 34 C136 42, 154 48, 168 58"
          stroke="var(--accent)"
          strokeWidth="1.8"
          strokeDasharray="6 5"
          animate={{ strokeDashoffset: [0, -22] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <circle cx="120" cy="14" r="4.5" fill="var(--accent)" />
        <circle cx="72" cy="58" r="3" fill="var(--accent)" />
        <circle cx="168" cy="58" r="3" fill="var(--accent)" />
      </ArtworkFrame>
    );
  }

  if (family === "culinary") {
    if (variant === 0) {
      return (
        <ArtworkFrame>
          <path
            d="M76 40 H164 C162 56, 144 62, 120 62 C96 62, 78 56, 76 40 Z"
            fill="var(--accent)"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />
          {[98, 120, 142].map((x, i) => (
            <motion.path
              key={x}
              d={`M${x} 34 Q${x - 6} 24 ${x} 16 Q${x + 6} 10 ${x} 6`}
              stroke="var(--accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
              animate={{ y: [2, -4, 2], opacity: [0.35, 0.95, 0.35] }}
              transition={{
                duration: 2.3,
                delay: i * 0.28,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </ArtworkFrame>
      );
    }
    if (variant === 1) {
      return (
        <ArtworkFrame>
          <path
            d="M62 46 A58 58 0 0 1 178 46"
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <motion.path
            d="M62 46 A58 58 0 0 1 152 16"
            stroke="var(--accent)"
            strokeWidth="2.4"
            strokeLinecap="round"
            animate={{ strokeOpacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle cx="120" cy="46" r="5" fill="var(--accent)" />
          <motion.line
            x1="120"
            y1="46"
            x2="152"
            y2="20"
            stroke="var(--accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            animate={{ rotate: [-12, 8, -12] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "120px 46px" }}
          />
        </ArtworkFrame>
      );
    }
    if (variant === 2) {
      return (
        <ArtworkFrame>
          <path
            d="M46 46 H194"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="1.3"
            strokeDasharray="4 4"
          />
          <motion.path
            d="M72 42 L152 20 L166 28 C144 42, 108 46, 72 42 Z"
            fill="var(--accent)"
            fillOpacity="0.2"
            stroke="var(--accent)"
            strokeWidth="1.5"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle
            cx="62"
            cy="46"
            r="4"
            fill="var(--accent)"
            fillOpacity="0.7"
          />
        </ArtworkFrame>
      );
    }
    return (
      <ArtworkFrame>
        {[66, 120, 174].map((cx, i) => (
          <g key={cx} transform={`translate(${cx} 36)`}>
            <motion.circle
              r={i === 1 ? 22 : 15}
              stroke={i === 1 ? "var(--accent)" : "currentColor"}
              strokeOpacity={i === 1 ? 0.85 : 0.3}
              strokeWidth="1.5"
              fill={i === 1 ? "var(--accent)" : "none"}
              fillOpacity={i === 1 ? 0.14 : 0}
              animate={{ scale: [0.95, 1.06, 0.95] }}
              transition={{
                duration: 2.8,
                delay: i * 0.25,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <circle
              r="4"
              fill="var(--accent)"
              fillOpacity={i === 1 ? 0.9 : 0.45}
            />
          </g>
        ))}
      </ArtworkFrame>
    );
  }

  if (family === "engineering") {
    if (variant === 0) {
      return (
        <ArtworkFrame>
          <path
            d="M24 36 H216"
            stroke="currentColor"
            strokeOpacity="0.16"
            strokeWidth="1.2"
          />
          <motion.path
            d="M30 36 H74 L88 18 L104 54 L120 26 L134 36 H210"
            stroke="var(--accent)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="10 6"
            animate={{ strokeDashoffset: [0, -32] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
          />
          <motion.circle
            cx="104"
            cy="54"
            r="5"
            fill="var(--accent)"
            animate={{ scale: [0.85, 1.3, 0.85] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "104px 54px" }}
          />
        </ArtworkFrame>
      );
    }
    if (variant === 1) {
      return (
        <ArtworkFrame>
          <path
            d="M40 24 H200"
            stroke="currentColor"
            strokeOpacity="0.28"
            strokeWidth="1.6"
          />
          <motion.path
            d="M78 24 C96 24, 98 50, 118 50 H152 C170 50, 174 24, 192 24"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeDasharray="6 5"
            animate={{ strokeDashoffset: [0, -22] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
          />
          <circle
            cx="48"
            cy="24"
            r="4"
            fill="currentColor"
            fillOpacity="0.45"
          />
          <circle cx="78" cy="24" r="4.5" fill="var(--accent)" />
          <circle cx="135" cy="50" r="4.5" fill="var(--accent)" />
          <circle cx="192" cy="24" r="4.5" fill="var(--accent)" />
        </ArtworkFrame>
      );
    }
    if (variant === 2) {
      return (
        <ArtworkFrame>
          {[
            { x: 42, y: 14, w: 84, a: true },
            { x: 78, y: 28, w: 96, a: false },
            { x: 112, y: 42, w: 82, a: true },
            { x: 56, y: 56, w: 62, a: false },
          ].map((b, i) => (
            <motion.rect
              key={i}
              x={b.x}
              y={b.y}
              width={b.w}
              height="6"
              rx="2"
              fill={b.a ? "var(--accent)" : "currentColor"}
              fillOpacity={b.a ? 0.78 : 0.25}
              animate={{ scaleX: [0.85, 1.05, 0.85] }}
              transition={{
                duration: 2.2,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: `${b.x}px ${b.y + 3}px` }}
            />
          ))}
        </ArtworkFrame>
      );
    }
    return (
      <ArtworkFrame>
        <g transform="translate(120 36)">
          <polygon
            points="0,-24 22,-12 22,12 0,24 -22,12 -22,-12"
            fill="var(--accent)"
            fillOpacity="0.14"
            stroke="var(--accent)"
            strokeWidth="1.6"
          />
          <motion.circle
            r="14"
            stroke="currentColor"
            strokeOpacity="0.32"
            strokeWidth="1.3"
            strokeDasharray="6 4"
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          />
          <circle r="4" fill="var(--accent)" />
        </g>
      </ArtworkFrame>
    );
  }

  if (family === "finance") {
    if (variant === 0) {
      return (
        <ArtworkFrame>
          <path
            d="M40 54 H200"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="1.3"
          />
          <motion.path
            d="M46 50 Q116 48 188 16"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            animate={{ pathLength: [0.65, 1, 0.65] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle cx="188" cy="16" r="5" fill="var(--accent)" />
        </ArtworkFrame>
      );
    }
    if (variant === 1) {
      return (
        <ArtworkFrame>
          <g transform="translate(120 36)">
            <motion.circle
              r="22"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeDasharray="76 62"
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            />
            <circle
              r="12"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="2"
            />
          </g>
        </ArtworkFrame>
      );
    }
    if (variant === 2) {
      return (
        <ArtworkFrame>
          <motion.line
            x1="64"
            y1="32"
            x2="176"
            y2="32"
            stroke="var(--accent)"
            strokeWidth="2"
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "120px 32px" }}
          />
          <polygon
            points="120,34 112,56 128,56"
            fill="currentColor"
            fillOpacity="0.24"
          />
          <circle
            cx="70"
            cy="40"
            r="6"
            fill="var(--accent)"
            fillOpacity="0.7"
          />
          <circle
            cx="170"
            cy="40"
            r="6"
            fill="currentColor"
            fillOpacity="0.35"
          />
        </ArtworkFrame>
      );
    }
    return (
      <ArtworkFrame>
        <g transform="translate(120 36)">
          {[24, 15, 6].map((r, i) => (
            <motion.circle
              key={r}
              r={r}
              stroke={
                i === 2 ? "none" : i === 0 ? "currentColor" : "var(--accent)"
              }
              strokeOpacity={i === 0 ? 0.25 : 0.72}
              strokeWidth="1.6"
              fill={i === 2 ? "var(--accent)" : "none"}
              animate={{ scale: [0.94, 1.06, 0.94] }}
              transition={{
                duration: 2.4,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </g>
      </ArtworkFrame>
    );
  }

  if (family === "design" || family === "creative") {
    if (variant === 0) {
      return (
        <ArtworkFrame>
          <motion.path
            d="M44 50 C76 14, 164 58, 196 22"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ pathLength: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <line
            x1="44"
            y1="50"
            x2="76"
            y2="18"
            stroke="currentColor"
            strokeOpacity="0.28"
            strokeDasharray="3 3"
          />
          <line
            x1="196"
            y1="22"
            x2="164"
            y2="54"
            stroke="currentColor"
            strokeOpacity="0.28"
            strokeDasharray="3 3"
          />
          <circle cx="76" cy="18" r="4" fill="var(--accent)" />
          <circle cx="164" cy="54" r="4" fill="var(--accent)" />
        </ArtworkFrame>
      );
    }
    if (variant === 1) {
      return (
        <ArtworkFrame>
          {[-14, 0, 14].map((deg, i) => (
            <motion.rect
              key={deg}
              x="104"
              y="16"
              width="32"
              height="42"
              rx="6"
              fill={i === 1 ? "var(--accent)" : "currentColor"}
              fillOpacity={i === 1 ? 0.26 : 0.08}
              stroke={i === 1 ? "var(--accent)" : "currentColor"}
              strokeOpacity={i === 1 ? 0.9 : 0.35}
              strokeWidth="1.4"
              animate={{ rotate: [deg - 2, deg + 2, deg - 2] }}
              transition={{
                duration: 3.2,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "120px 56px" }}
            />
          ))}
        </ArtworkFrame>
      );
    }
    if (variant === 2) {
      const heights = [18, 34, 24, 48, 30, 40, 20];
      return (
        <ArtworkFrame>
          {heights.map((h, i) => {
            const x = 68 + i * 16;
            return (
              <motion.rect
                key={i}
                x={x}
                y={36 - h / 2}
                width="6"
                height={h}
                rx="3"
                fill={i % 2 === 0 ? "var(--accent)" : "currentColor"}
                fillOpacity={i % 2 === 0 ? 0.72 : 0.28}
                animate={{ scaleY: [0.7, 1.18, 0.7] }}
                transition={{
                  duration: 2.1,
                  delay: i * 0.14,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{ transformOrigin: `${x + 3}px 36px` }}
              />
            );
          })}
        </ArtworkFrame>
      );
    }
    return (
      <ArtworkFrame>
        <path
          d="M54 20 H68 M54 20 V34 M186 20 H172 M186 20 V34 M54 54 H68 M54 54 V40 M186 54 H172 M186 54 V40"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <motion.circle
          cx="120"
          cy="37"
          r="9"
          fill="var(--accent)"
          fillOpacity="0.32"
          stroke="var(--accent)"
          strokeWidth="1.6"
          animate={{ scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "120px 37px" }}
        />
      </ArtworkFrame>
    );
  }

  if (variant === 0) {
    return (
      <ArtworkFrame>
        <g transform="translate(120 42)">
          <motion.circle
            r="28"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="1.3"
            strokeDasharray="16 6"
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          />
          <motion.circle
            r="19"
            stroke="var(--accent)"
            strokeOpacity="0.65"
            strokeWidth="1.6"
            strokeDasharray="10 5"
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />
          <motion.polygon
            points="0,-14 3.6,-3.6 14,0 3.6,3.6 0,14 -3.6,3.6 -14,0 -3.6,-3.6"
            fill="var(--accent)"
            fillOpacity="0.28"
            stroke="var(--accent)"
            strokeWidth="1.6"
            strokeLinejoin="round"
            animate={{ rotate: [0, 36, -18, 0], scale: [0.92, 1.14, 0.92] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>
        <motion.path
          d="M26 60 Q120 14 214 60"
          stroke="var(--accent)"
          strokeOpacity="0.45"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
        />
      </ArtworkFrame>
    );
  }

  if (variant === 1) {
    const heights = [18, 34, 24, 48, 30, 40, 20];
    return (
      <ArtworkFrame>
        <g transform="translate(52 36)">
          <motion.polygon
            points="0,-24 22,0 0,24 -22,0"
            fill="var(--accent)"
            fillOpacity="0.12"
            stroke="var(--accent)"
            strokeWidth="1.5"
            animate={{ rotate: [0, 6, 0] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <polygon
            points="0,-13 12,0 0,13 -12,0"
            fill="var(--accent)"
            fillOpacity="0.28"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="1.1"
          />
        </g>
        <motion.path
          d="M78 36 H112"
          stroke="var(--accent)"
          strokeWidth="1.6"
          strokeDasharray="4 4"
          animate={{ strokeDashoffset: [0, -16] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        />
        {heights.map((h, i) => {
          const x = 122 + i * 14;
          return (
            <motion.rect
              key={i}
              x={x}
              y={36 - h / 2}
              width="6"
              height={h}
              rx="3"
              fill={i % 2 === 0 ? "var(--accent)" : "currentColor"}
              fillOpacity={i % 2 === 0 ? 0.72 : 0.26}
              animate={{ scaleY: [0.72, 1.15, 0.72], opacity: [0.6, 1, 0.6] }}
              transition={{
                duration: 2.2,
                delay: i * 0.14,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: `${x + 3}px 36px` }}
            />
          );
        })}
      </ArtworkFrame>
    );
  }

  if (variant === 2) {
    return (
      <ArtworkFrame>
        <path
          d="M16 56 C 58 24, 96 62, 138 30 C 174 4, 206 34, 226 16"
          stroke="currentColor"
          strokeOpacity="0.16"
          strokeWidth="1.2"
        />
        <path
          d="M16 42 C 62 12, 102 52, 146 22 C 180 0, 208 24, 226 10"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="1.1"
        />
        <motion.path
          d="M28 52 C 74 52, 86 20, 126 30 C 164 40, 174 16, 208 20"
          stroke="var(--accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="6 6"
          animate={{ strokeDashoffset: [0, -24] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <circle
          cx="28"
          cy="52"
          r="5"
          fill="var(--card)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <circle cx="28" cy="52" r="2" fill="var(--accent)" />
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle
            cx="126"
            cy="30"
            r="6"
            fill="var(--accent)"
            fillOpacity="0.2"
          />
          <circle cx="126" cy="30" r="3" fill="var(--accent)" />
        </motion.g>
        <g transform="translate(208 22)">
          <motion.g
            animate={{ y: [0, -3.5, 0], scale: [1, 1.08, 1] }}
            transition={{
              duration: 2.4,
              delay: 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <circle r="11" fill="var(--accent)" fillOpacity="0.16" />
            <path
              d="M0,-12 C5.2,-12 9,-8.1 9,-3.2 C9,2.8 0,10 0,10 C0,10 -9,2.8 -9,-3.2 C-9,-8.1 -5.2,-12 0,-12 Z"
              fill="var(--accent)"
              fillOpacity="0.32"
              stroke="var(--accent)"
              strokeWidth="1.6"
            />
            <circle cy="-3.5" r="2.6" fill="var(--accent)" />
          </motion.g>
        </g>
      </ArtworkFrame>
    );
  }

  return (
    <ArtworkFrame>
      <path
        d="M36 46 L86 22 L134 44 L182 18 L210 42 M86 22 L182 18 M36 46 L134 44"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1.3"
      />
      <motion.path
        d="M36 46 L86 22 L134 44 L182 18"
        stroke="var(--accent)"
        strokeOpacity="0.65"
        strokeWidth="1.8"
        strokeDasharray="6 6"
        animate={{ strokeDashoffset: [0, -24] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
      />
      {[
        { cx: 36, cy: 46, r: 3.5 },
        { cx: 86, cy: 22, r: 4.5 },
        { cx: 134, cy: 44, r: 4.5 },
        { cx: 210, cy: 42, r: 3.2 },
      ].map((pt, i) => (
        <motion.circle
          key={i}
          cx={pt.cx}
          cy={pt.cy}
          r={pt.r}
          fill={i === 1 || i === 2 ? "var(--accent)" : "currentColor"}
          fillOpacity={i === 1 || i === 2 ? 0.78 : 0.45}
          animate={{ scale: [0.9, 1.25, 0.9] }}
          transition={{
            duration: 2.6,
            delay: i * 0.35,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: `${pt.cx}px ${pt.cy}px` }}
        />
      ))}
      <g transform="translate(182 28)">
        <motion.circle
          r="19"
          stroke="var(--accent)"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeDasharray="9 5"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
          r="8"
          fill="var(--accent)"
          fillOpacity="0.22"
          stroke="var(--accent)"
          strokeWidth="1.6"
          animate={{ scale: [0.88, 1.16, 0.88] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </g>
    </ArtworkFrame>
  );
};

const WAVY_TILDE_PATH = Array.from({ length: 16 }, (_, k) => {
  const x0 = k * 32;
  const move = k === 0 ? `M ${x0} 7 ` : "";
  return `${move}C ${x0 + 5.5} 2, ${x0 + 10.5} 2, ${x0 + 16} 7 C ${x0 + 21.5} 12, ${x0 + 26.5} 12, ${x0 + 32} 7`;
}).join(" ");

const ExploreWavyTildeLine: React.FC<{ active: boolean }> = ({ active }) => {
  return (
    <div className="momo-explore-wave-wrap" aria-hidden="true">
      <svg
        className="momo-explore-wave-svg"
        viewBox="0 0 512 14"
        preserveAspectRatio="none"
      >
        <motion.path
          d={WAVY_TILDE_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 1.8 : 1.45}
          strokeLinecap="round"
          strokeOpacity={active ? 0.78 : 0.42}
          initial={{ pathLength: 0, opacity: 0, x: 0 }}
          animate={{
            pathLength: 1,
            opacity: 1,
            x: active ? [0, -32] : 0,
          }}
          transition={{
            pathLength: { duration: 0.52, ease: EASE_MOMO },
            opacity: { duration: 0.25, ease: EASE_MOMO },
            x: active
              ? { duration: 1.45, repeat: Infinity, ease: "linear" }
              : { duration: 0.3, ease: EASE_MOMO },
          }}
        />
      </svg>
    </div>
  );
};

function sanitizeReasoningPhrase(raw: string): string {
  const scrubbed = sanitizePublicTaskLabel(raw, "");
  const clean = scrubbed
    .replace(/[*_`#>~"“”]+/g, " ")
    .replace(/^\s*[-*\d.)]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  if (clean.length <= 96) return clean;
  const cut = clean.slice(0, 94);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 42 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

function buildExploreHandwritingNotes(
  msg: ChatMessage,
  userText: string,
  roleLabel: string,
): { liveNotes: string[]; settledNote: string } {
  const parts = msg.parts ?? [];
  const toolParts = parts.filter((p): p is ToolPart => p.kind === "tool");
  const genUiParts = parts.filter((p): p is GenUiPart => p.kind === "gen_ui");
  const mistUiCount =
    (msg.text || "").includes("```") || /^root\s*=/m.test(msg.text || "")
      ? parseMixedStreamToMistlineBlocks(msg.text || "", {
          final: !msg.streaming,
        }).filter((b) => b.kind === "ui" && b.name !== "Followups").length
      : 0;
  const totalBlocks =
    mistUiCount + genUiParts.reduce((sum, gp) => sum + gp.blocks.length, 0);

  const liveNotes: string[] = [];
  const pushUnique = (txt: string) => {
    const clean = txt.trim();
    if (!clean || liveNotes.includes(clean)) return;
    liveNotes.push(clean);
  };

  // Extract live reasoning clauses if streamed
  if (msg.reasoningText) {
    const rawClauses = msg.reasoningText
      .split(/(?<=[.!?])\s+|\n+|;+/)
      .map((s) => sanitizeReasoningPhrase(s.replace(/[.!?]+$/, "")))
      .filter((s) => s.length >= 14);
    for (const clause of rawClauses.slice(-5)) {
      pushUnique(clause);
    }
  }

  // Active & recent tool signals (prefers real AI query over raw fallback text)
  for (const tp of toolParts) {
    const qText = tp.query || tp.argsPreview;
    const cleanTpLabel = tp.label ? sanitizePublicTaskLabel(tp.label, "") : "";
    if (tp.status === "running") {
      if (qText) {
        pushUnique(
          `${cleanTpLabel || "Menelisik"}: ${sanitizeReasoningPhrase(qText)}`,
        );
      } else {
        pushUnique(`${cleanTpLabel || `Menggali konteks ${roleLabel}`}...`);
      }
    } else if (tp.summary) {
      pushUnique(sanitizeReasoningPhrase(tp.summary));
    }
  }

  // Live GenUI composition signals
  for (const gp of genUiParts) {
    if (gp.status !== "ready") {
      if (gp.outline && gp.outline.length > 0) {
        pushUnique(`Menata ${gp.outline.slice(0, 2).join(" & ")}...`);
      } else if (gp.title) {
        pushUnique(`Merangkai ${sanitizeReasoningPhrase(gp.title)}...`);
      } else {
        pushUnique(`Menyusun lembar visual ${roleLabel}...`);
      }
    }
  }

  const topicSnippet = sanitizeReasoningPhrase(userText);
  if (liveNotes.length === 0) {
    if (topicSnippet) {
      pushUnique(`Membaca arah “${topicSnippet}”...`);
    }
    pushUnique(`Meramu sudut pandang ${roleLabel}...`);
    pushUnique("Menyiapkan komponen visual & alur...");
  } else if (liveNotes.length === 1) {
    pushUnique(`Memadukan sudut pandang ${roleLabel}...`);
  }

  const settledNote =
    totalBlocks > 0
      ? `${totalBlocks} komponen visual ${roleLabel.toLowerCase()} siap dijelajahi`
      : toolParts.find((t) => t.summary)?.summary ||
        liveNotes[liveNotes.length - 1] ||
        `Catatan ${roleLabel} siap`;

  return { liveNotes, settledNote };
}

const ExploreHandwritingReasoning: React.FC<{
  msg: ChatMessage;
  userText: string;
  roleLabel: string;
}> = ({ msg, userText, roleLabel }) => {
  const isStreaming = Boolean(msg.streaming);
  const { liveNotes, settledNote } = useMemo(
    () => buildExploreHandwritingNotes(msg, userText, roleLabel),
    [msg, userText, roleLabel],
  );
  const [tickIdx, setTickIdx] = useState(0);

  // Jump toward latest live note as new clauses arrive during streaming
  useEffect(() => {
    if (!isStreaming) return;
    setTickIdx((prev) => {
      if (liveNotes.length <= 1) return 0;
      const newest = liveNotes.length - 1;
      return prev < newest ? newest : prev;
    });
  }, [isStreaming, liveNotes.length]);

  useEffect(() => {
    if (!isStreaming || liveNotes.length <= 1) return;
    const id = window.setInterval(() => {
      setTickIdx((i) => (i + 1) % liveNotes.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, [isStreaming, liveNotes.length]);

  const activeText = isStreaming
    ? liveNotes[tickIdx % liveNotes.length]
    : settledNote;

  return (
    <div
      className="momo-explore-hand-wrap"
      aria-live={isStreaming ? "polite" : "off"}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={`${isStreaming ? "live" : "done"}-${activeText}`}
          data-explore-reasoning="handwriting"
          className={`momo-hand momo-explore-hand-status${isStreaming ? " is-live" : " is-settled"}`}
          title={activeText}
          initial={{ opacity: 0, y: 3, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -3, filter: "blur(6px)" }}
          transition={{ duration: 0.3, ease: EASE_MOMO }}
        >
          {activeText}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export const ExploreWorkspaceView: React.FC<ExploreWorkspaceViewProps> = ({
  roleId,
  session,
  busy,
  slotExploreRef,
  onSubmitPrompt,
  onRetryTurn,
  onOpenBoard,
  pinnedTitles,
  onTogglePinItem,
  focusTurn,
}) => {
  const cfg = useMemo(() => getRoleWorkspaceConfig(roleId), [roleId]);
  const [inlinePrompt, setInlinePrompt] = useState("");
  const [endCapPrompt, setEndCapPrompt] = useState("");
  const [selectedTurnIdx, setSelectedTurnIdx] = useState<number>(-1);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherInfo | null>(null);
  const [geoStatus, setGeoStatus] = useState<
    "idle" | "loading" | "ready" | "denied"
  >("idle");
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripEl, setStripEl] = useState<HTMLDivElement | null>(null);
  const bindStripRef = useCallback((el: HTMLDivElement | null) => {
    stripRef.current = el;
    setStripEl(el);
  }, []);
  const turnColRefs = useRef<Array<HTMLDivElement | null>>([]);

  const weatherAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const prevTurnsCountRef = useRef(0);
  const prevSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      weatherAbortRef.current?.abort();
    };
  }, []);

  const requestRealLocationWeather = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      if (mountedRef.current) setGeoStatus("denied");
      return;
    }
    if (mountedRef.current) setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!mountedRef.current) return;
        weatherAbortRef.current?.abort();
        const ctrl = new AbortController();
        weatherAbortRef.current = ctrl;
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/weather?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`,
            { signal: ctrl.signal },
          );
          if (!res.ok) throw new Error("Weather lookup failed");
          const data = (await res.json()) as LiveWeatherInfo;
          if (!mountedRef.current) return;
          setLiveWeather(data);
          setGeoStatus("ready");
        } catch {
          if (mountedRef.current && !ctrl.signal.aborted)
            setGeoStatus("denied");
        }
      },
      () => {
        if (mountedRef.current) setGeoStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 600_000 },
    );
  }, []);

  useEffect(() => {
    requestRealLocationWeather();
  }, [requestRealLocationWeather]);

  const adaptiveGreeting = useMemo(
    () => getAdaptiveWeatherGreeting(roleId, liveWeather),
    [roleId, liveWeather],
  );

  const bindSlotExplore = useCallback(
    (el: HTMLDivElement | null) => {
      if (slotExploreRef) {
        slotExploreRef.current = el;
      }
      window.dispatchEvent(new Event("momo:slot-sync"));
      return () => {
        if (slotExploreRef && slotExploreRef.current === el) {
          slotExploreRef.current = null;
          window.dispatchEvent(new Event("momo:slot-sync"));
        }
      };
    },
    [slotExploreRef],
  );

  const turns = useMemo(() => {
    const src = session?.exploreMessages ?? [];
    if (src.length === 0) return [];
    const list: Array<{
      userText: string;
      botMsg: (typeof src)[number] | null;
    }> = [];
    for (let i = 0; i < src.length; i++) {
      const m = src[i];
      if (m.role !== "user") continue;
      const next = src[i + 1];
      list.push({
        userText: m.text,
        botMsg: next && next.role === "momo" ? next : null,
      });
    }
    return list;
  }, [session?.exploreMessages]);

  // Bridges from Chat: one per distinct question asked in this session, newest first.
  const chatBridgeTopics = useMemo(() => {
    if (!session || (session.exploreMessages?.length ?? 0) > 0) return [];
    const seen = new Set<string>();
    const topics: string[] = [];
    for (let i = session.messages.length - 1; i >= 0 && topics.length < 3; i--) {
      const m = session.messages[i];
      const raw = m.role === "user" ? m.text.trim() : "";
      const key = raw.toLowerCase();
      if (!raw || seen.has(key)) continue;
      seen.add(key);
      topics.push(raw);
    }
    return topics;
  }, [session]);
  const chatBridgeTopic = chatBridgeTopics[0]
    ? { fullQuery: chatBridgeTopics[0] }
    : null;

  const activeStarterSuggestions = useMemo(() => {
    if (!chatBridgeTopic) return cfg.exploreSuggestions;
    const shortT = shortenTopicLabel(chatBridgeTopic.fullQuery, 30);
    return [
      {
        kicker: "Peta Visual",
        label: `Bentangkan lanskap “${shortT}”`,
        prompt: `Susun Explore Visual Spread utuh untuk memetakan komponen utama, konteks, dan sorotan penting dari "${chatBridgeTopic.fullQuery}".`,
      },
      {
        kicker: "Adu Opsi",
        label: `Bandingkan pendekatan “${shortT}”`,
        prompt: `Bandingkan pendekatan atau opsi terkuat terkait "${chatBridgeTopic.fullQuery}" lengkap dengan kelebihan dan komprominya.`,
      },
      {
        kicker: "Alur & Tahap",
        label: `Urutan langkah & titik rawan`,
        prompt: `Petakan tahapan eksekusi berurutan, dependensi, dan risiko praktis untuk "${chatBridgeTopic.fullQuery}".`,
      },
      {
        kicker: "Matriks Pilihan",
        label: `Checklist keputusan “${shortT}”`,
        prompt: `Buatkan matriks kriteria keputusan dan daftar periksa produksi untuk "${chatBridgeTopic.fullQuery}".`,
      },
    ];
  }, [chatBridgeTopic, cfg.exploreSuggestions]);

  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;
  const endCapBranches = useMemo(
    () => buildContextualExploreBranches(lastTurn),
    [lastTurn],
  );

  const scrollToTurn = useCallback((idx: number) => {
    setSelectedTurnIdx(idx);
    const el = turnColRefs.current[idx];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    }
  }, []);

  const pendingFocusRef = useRef<number | null>(null);
  useEffect(() => {
    if (!focusTurn) return;
    // Same session: scroll now. Other session: the session effect below picks it up after mount.
    if (session?.id === prevSessionIdRef.current) scrollToTurn(focusTurn.idx);
    else pendingFocusRef.current = focusTurn.idx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTurn?.seq]);

  useEffect(() => {
    if (turns.length === 0) {
      prevTurnsCountRef.current = 0;
      setSelectedTurnIdx(-1);
      return;
    }
    const pendingFocus = pendingFocusRef.current;
    pendingFocusRef.current = null;
    const last =
      pendingFocus !== null && pendingFocus < turns.length ? pendingFocus : turns.length - 1;
    const sessionChanged = session?.id !== prevSessionIdRef.current;
    prevSessionIdRef.current = session?.id ?? null;
    const isNewTurn = turns.length !== prevTurnsCountRef.current;
    prevTurnsCountRef.current = turns.length;
    if (sessionChanged || isNewTurn) {
      setSelectedTurnIdx(last);
      const scrollToLast = (behavior: ScrollBehavior) => {
        turnColRefs.current[last]?.scrollIntoView({
          behavior,
          inline: "start",
          block: "nearest",
        });
      };
      if (sessionChanged) {
        // Session switch: spreads still mount async, so the last turn column's
        // offsetLeft keeps growing after first paint. Scroll instantly, then
        // re-scroll once layout settles — a single early scrollIntoView lands
        // short and leaves the strip parked on turn 1 while the active chip
        // says latest.
        const raf = window.requestAnimationFrame(() => scrollToLast("auto"));
        const settle = window.setTimeout(() => scrollToLast("auto"), 350);
        const settle2 = window.setTimeout(() => scrollToLast("auto"), 900);
        return () => {
          window.cancelAnimationFrame(raf);
          window.clearTimeout(settle);
          window.clearTimeout(settle2);
        };
      }
      const raf = window.requestAnimationFrame(() => scrollToLast("smooth"));
      return () => window.cancelAnimationFrame(raf);
    }
  }, [turns.length, session?.id]);

  const activeTurn =
    turns.length > 0
      ? turns[
          Math.max(
            0,
            Math.min(
              turns.length - 1,
              selectedTurnIdx === -1 ? turns.length - 1 : selectedTurnIdx,
            ),
          )
        ]
      : null;

  const submitInline = (raw: string, reset: (v: string) => void) => {
    const clean = raw.trim();
    if (!clean || busy) return;
    reset("");
    onSubmitPrompt(clean, undefined, "explore");
  };

  const spreadCountRef = useRef(0);

  // Follow newly arriving Explore horizontal spreads automatically & convert vertical wheel into horizontal glide
  useEffect(() => {
    const strip = stripEl;
    if (!strip) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Route horizontal trackpad/wheel swipes exclusively to the main Explore page strip
        // so individual panels never trap or disturb horizontal page scrolling.
        if (strip.scrollWidth > strip.clientWidth) {
          e.preventDefault();
          strip.scrollLeft += e.deltaX;
        }
        return;
      }
      let inner: HTMLElement | null = e.target as HTMLElement | null;
      while (inner && inner !== strip) {
        const oy = getComputedStyle(inner).overflowY;
        if (
          (oy === "auto" || oy === "scroll") &&
          inner.scrollHeight > inner.clientHeight + 2
        ) {
          break;
        }
        inner = inner.parentElement;
      }
      if (inner && inner !== strip) {
        const down = e.deltaY > 0;
        if (
          down
            ? inner.scrollTop + inner.clientHeight < inner.scrollHeight - 1
            : inner.scrollTop > 0
        ) {
          return;
        }
      }
      e.preventDefault();
      strip.scrollLeft += e.deltaY;
    };
    strip.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => strip.removeEventListener("wheel", onWheel, true);
  }, [stripEl, activeTurn?.userText]);

  useEffect(() => {
    const strip = stripEl;
    if (!strip || turns.length === 0) return;
    const pages = strip.querySelectorAll<HTMLElement>("[data-explore-spread]");
    if (pages.length === spreadCountRef.current) return;
    const prevCount = spreadCountRef.current;
    spreadCountRef.current = pages.length;
    if (prevCount === 0) {
      // Initial turn mount: keep the turn header + first spread cleanly framed at left
      const lastTurnCol = turnColRefs.current[turns.length - 1];
      if (lastTurnCol) {
        const pad = parseFloat(getComputedStyle(strip).paddingLeft || "0");
        strip.scrollTo({
          left: Math.max(0, lastTurnCol.offsetLeft - pad),
          behavior: "auto",
        });
      }
    }
  }, [stripEl, activeTurn, turns.length]);

  const scrollStrip = (dir: -1 | 1) => {
    const strip = stripRef.current;
    if (!strip) return;
    const pages = Array.from(
      strip.querySelectorAll<HTMLElement>(
        "[data-explore-spread], [data-explore-endcap]",
      ),
    );
    if (pages.length > 0) {
      const pad = parseFloat(getComputedStyle(strip).paddingLeft || "0");
      const x = strip.scrollLeft + pad;
      const target =
        dir > 0
          ? pages.find((p) => p.offsetLeft > x + 8)
          : [...pages].reverse().find((p) => p.offsetLeft < x - 8);
      if (target) {
        strip.scrollTo({
          left: Math.max(0, target.offsetLeft - pad),
          behavior: "smooth",
        });
        return;
      }
    }
    strip.scrollBy({ left: dir * 520, behavior: "smooth" });
  };

  // Dynamic vertical scroll scrim fade-out state (data-vfade) across all scrollable AI containers
  useEffect(() => {
    const strip = stripEl;
    if (!strip || turns.length === 0) return;

    const VSCROLL_SELECTOR =
      ".sp-panel, .sp-essay, .sp-sentence, .sp-quote, .sp-stats, .sp-itin, .sp-itin__days, .sp-list, .sp-list__rows, .sp-mosaic, .sp-mosaic__grid, .sp-versus, .momo-explore-prose, .momo-explore-turn-head";

    const syncOne = (el: HTMLElement) => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      let next = "none";
      if (maxScroll > 4) {
        const atTop = el.scrollTop <= 3;
        const atBottom = el.scrollTop >= maxScroll - 3;
        next = atTop ? "bottom" : atBottom ? "top" : "both";
      }
      if (el.getAttribute("data-vfade") !== next) {
        el.setAttribute("data-vfade", next);
      }
    };

    const syncAll = () => {
      const nodes = strip.querySelectorAll<HTMLElement>(VSCROLL_SELECTOR);
      nodes.forEach(syncOne);
    };

    let rafId = 0;
    const scheduleSync = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        syncAll();
      });
    };

    const onCaptureScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof HTMLElement && target.matches(VSCROLL_SELECTOR)) {
        syncOne(target);
      }
    };

    syncAll();
    strip.addEventListener("scroll", onCaptureScroll, {
      capture: true,
      passive: true,
    });
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleSync)
        : null;
    ro?.observe(strip);
    const mo =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(scheduleSync)
        : null;
    mo?.observe(strip, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", scheduleSync, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      strip.removeEventListener("scroll", onCaptureScroll, true);
      ro?.disconnect();
      mo?.disconnect();
      window.removeEventListener("resize", scheduleSync);
    };
  }, [stripEl, turns, busy, activeTurn?.userText, activeTurn?.botMsg?.text]);

  return (
    <AnimatePresence mode="wait">
      {!activeTurn ? (
        <motion.section
          key="explore-empty"
          className="momo-explore-shell sc"
          data-role-mode={cfg.presentation.editorialMode}
          aria-label="Explore Workspace"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={{
            initial: { opacity: 0 },
            animate: {
              opacity: 1,
              transition: { duration: 0.22, ease: EASE_MOMO },
            },
            exit: {
              opacity: 0,
              transition: { duration: 0.18, ease: EASE_MOMO },
            },
          }}
        >
          <AnimatePresence>
            {inlinePrompt.trim().length === 0 && (
              <motion.div
                key="explore-ambient-bg"
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: EASE_MOMO }}
                style={{
                  position: "fixed",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              >
                <ExploreRoleAmbientBackdrop
                  family={cfg.presentation.artworkFamily}
                  roleId={roleId}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="momo-explore-empty">
            <div className="momo-explore-stage-chassis">
              <motion.div
                className="momo-explore-title-stack"
                variants={{
                  initial: { opacity: 0 },
                  animate: {
                    opacity: 1,
                    transition: { duration: 0.22, ease: EASE_MOMO },
                  },
                  exit: {
                    opacity: 0,
                    transition: { duration: 0.14, ease: EASE_MOMO },
                  },
                }}
              >
                <span className="momo-margin-note momo-explore-hand-title">
                  Explore
                </span>
                <span className="momo-serif momo-explore-role-sub">
                  {cfg.label}
                </span>
              </motion.div>

              <div className="momo-explore-hero-row">
                <div className="momo-explore-hero-copy">
                  <motion.div
                    className="momo-explore-weather-bar"
                    variants={{
                      initial: { opacity: 0 },
                      animate: {
                        opacity: 1,
                        transition: {
                          duration: 0.22,
                          delay: 0.02,
                          ease: EASE_MOMO,
                        },
                      },
                      exit: {
                        opacity: 0,
                        transition: { duration: 0.14, ease: EASE_MOMO },
                      },
                    }}
                  >
                    <motion.button
                      type="button"
                      data-weather-trigger="true"
                      data-geo-status={geoStatus}
                      className="momo-weather-trigger"
                      title="Klik untuk deteksi lokasi & cuaca real-time"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.15, ease: EASE_MOMO }}
                      onClick={requestRealLocationWeather}
                    >
                      <WeatherSvg icon={liveWeather?.icon ?? "sun-cloud"} />
                      <span className="momo-weather-main-text">
                        {liveWeather
                          ? `${liveWeather.temp} ${liveWeather.cond} di ${liveWeather.flag} ${liveWeather.area}.`
                          : geoStatus === "loading"
                            ? "Mendeteksi lokasi & cuaca lokal..."
                            : "Izinkan lokasi untuk cuaca real-time."}
                      </span>
                    </motion.button>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={`${roleId}-${geoStatus}-${liveWeather?.area || "base"}`}
                        className="momo-weather-greet"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: EASE_MOMO }}
                      >
                        {adaptiveGreeting}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>

                  <motion.h1
                    className="momo-serif"
                    variants={{
                      initial: { opacity: 0 },
                      animate: {
                        opacity: 1,
                        transition: {
                          duration: 0.24,
                          delay: 0.04,
                          ease: EASE_MOMO,
                        },
                      },
                      exit: {
                        opacity: 0,
                        transition: { duration: 0.14, ease: EASE_MOMO },
                      },
                    }}
                    style={{
                      fontSize: "clamp(36px, 4.3vw, 50px)",
                      lineHeight: 1.03,
                      color: "var(--ink)",
                    }}
                  >
                    {cfg.exploreHeadline}
                  </motion.h1>
                  <motion.p
                    variants={{
                      initial: { opacity: 0 },
                      animate: {
                        opacity: 1,
                        transition: {
                          duration: 0.24,
                          delay: 0.05,
                          ease: EASE_MOMO,
                        },
                      },
                      exit: {
                        opacity: 0,
                        transition: { duration: 0.14, ease: EASE_MOMO },
                      },
                    }}
                    style={{
                      fontSize: 13.5,
                      lineHeight: "19px",
                      color: "var(--ink-2)",
                      maxWidth: "38ch",
                    }}
                  >
                    {cfg.exploreSubline}
                  </motion.p>
                </div>

                <div
                  id="slotExplore"
                  ref={bindSlotExplore}
                  className="hero-slot explore-head-slot"
                />
              </div>

              <motion.form
                className="momo-explore-prompt-well"
                variants={{
                  initial: { opacity: 0 },
                  animate: {
                    opacity: 1,
                    transition: {
                      duration: 0.24,
                      delay: 0.06,
                      ease: EASE_MOMO,
                    },
                  },
                  exit: {
                    opacity: 0,
                    transition: { duration: 0.14, ease: EASE_MOMO },
                  },
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitInline(inlinePrompt, setInlinePrompt);
                }}
              >
                <input
                  type="text"
                  data-explore-input="true"
                  className="momo-explore-prompt-input"
                  placeholder="Tulis topik, tujuan, atau skenario..."
                  value={inlinePrompt}
                  onChange={(e) => setInlinePrompt(e.target.value)}
                />
                <motion.button
                  type="submit"
                  data-explore-submit="true"
                  className={`momo-explore-submit-btn${inlinePrompt.trim() ? " is-ready" : ""}`}
                  aria-label="Kirim prompt"
                  disabled={busy}
                  whileHover={{ y: -1.5, scale: 1.05 }}
                  whileTap={{ scale: 0.93 }}
                  transition={{ duration: 0.16, ease: EASE_MOMO }}
                >
                  <svg
                    viewBox="0 0 20 20"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10 15.5V4.5" />
                    <path d="m5.2 9.2 4.8-4.7 4.8 4.7" />
                  </svg>
                </motion.button>
              </motion.form>

              {chatBridgeTopics.length > 0 && (
                <motion.div
                  data-explore-bridge="from-chat"
                  className="momo-explore-bridge-banner"
                  initial="hidden"
                  animate="shown"
                  variants={{ shown: { transition: { staggerChildren: 0.05 } } }}
                >
                  <span className="skw-kicker momo-explore-bridge-label">
                    Dari obrolan ini
                  </span>
                  {chatBridgeTopics.map((topic, idx) => (
                    <motion.button
                      key={topic}
                      type="button"
                      {...(idx === 0 ? { "data-explore-bridge-trigger": "true" } : {})}
                      className="momo-explore-bridge-link"
                      disabled={busy}
                      variants={{
                        hidden: { opacity: 0, y: 5 },
                        shown: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_MOMO } },
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        onSubmitPrompt(
                          `Lanjutkan dari obrolan Chat tentang "${topic}" dan susun Explore Visual Spread utuh.`,
                          undefined,
                          "explore",
                        )
                      }
                    >
                      <ArrowUpRight size={13} strokeWidth={2.2} aria-hidden="true" />
                      <span>{topic}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>

            <div className="momo-explore-suggestions">
              {activeStarterSuggestions.map((item, idx) => {
                const fanOffsetX = (1.5 - idx) * 48;
                const fanAngle = (idx - 1.5) * 5;
                return (
                  <motion.div
                    key={`${roleId}-fan-${idx}`}
                    className="momo-explore-sugg-fan-slot"
                    variants={{
                      initial: {
                        opacity: 0,
                        x: fanOffsetX,
                        y: 96,
                        rotate: fanAngle,
                        scale: 0.93,
                      },
                      animate: {
                        opacity: 1,
                        x: 0,
                        y: 0,
                        rotate: 0,
                        scale: 1,
                        transition: {
                          ...MOTION_VOCABULARY.springs.hydrate,
                          delay:
                            idx * MOTION_VOCABULARY.staggers.exploreFanCard,
                        },
                      },
                      exit: {
                        opacity: 0,
                        y: 44,
                        scale: 0.95,
                        transition: {
                          duration: MOTION_VOCABULARY.durations.micro,
                          ease: MOTION_VOCABULARY.easings.exit,
                        },
                      },
                    }}
                  >
                    <motion.button
                      key={`${item.label}-${idx}`}
                      type="button"
                      data-explore-suggestion={idx}
                      className="momo-explore-sugg-card"
                      title={item.prompt}
                      aria-label={`${item.label}: ${item.prompt}`}
                      initial="rest"
                      animate="rest"
                      whileHover="hover"
                      whileTap="tap"
                      variants={{
                        rest: { y: 0, scale: 1 },
                        hover: MOTION_VOCABULARY.feedback.hoverCard,
                        tap: MOTION_VOCABULARY.feedback.tapPress,
                      }}
                      transition={{
                        duration: MOTION_VOCABULARY.durations.fast,
                        ease: MOTION_VOCABULARY.easings.standard,
                      }}
                      onClick={() =>
                        onSubmitPrompt(item.prompt, undefined, "explore")
                      }
                    >
                      <div className="momo-sugg-head">
                        <span
                          className="skw-kicker"
                          style={{ color: "var(--mute)" }}
                        >
                          {item.kicker}
                        </span>
                        <span className="momo-circle-mark">
                          {cfg.presentation.editorialMode === "technical"
                            ? `[0${idx + 1}]`
                            : `0${idx + 1}`}
                        </span>
                      </div>

                      <div className="momo-sugg-body">
                        <strong className="momo-serif momo-sugg-title">
                          {item.label}
                        </strong>
                        <div className="momo-sugg-artwork">
                          <ExploreCardArtwork
                            family={cfg.presentation.artworkFamily}
                            index={idx}
                            mode="primary"
                          />
                        </div>
                      </div>

                      <div className="momo-sugg-foot">
                        <span className="momo-sugg-note">mulai</span>
                        <span className="momo-sugg-arrow" aria-hidden="true">
                          ↗
                        </span>
                      </div>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>

          </div>
        </motion.section>
      ) : (
        <motion.section
          key="explore-strip"
          className="momo-explore-shell is-active-strip sc"
          data-role-mode={cfg.presentation.editorialMode}
          aria-label="Explore Editorial Strip"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{
            opacity: 0,
            y: -8,
            transition: {
              duration: MOTION_VOCABULARY.durations.micro,
              ease: MOTION_VOCABULARY.easings.exit,
            },
          }}
          transition={{
            duration: MOTION_VOCABULARY.durations.normal,
            ease: MOTION_VOCABULARY.easings.standard,
          }}
        >
          {/* Stacked Editorial Masthead ("Explore" big on top, controls stacked underneath) */}
          <div className="momo-explore-turn-nav">
            <span
              className="momo-margin-note momo-explore-hand-title momo-explore-strip-masthead"
              data-explore-masthead="true"
            >
              Explore
            </span>

            <div className="momo-explore-turn-subbar">
              <div className="gen-row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span
                  className="momo-serif-italic"
                  style={{ fontSize: 18, color: "var(--ink-2)" }}
                >
                  {cfg.label}
                </span>
                {turns.map((t, tIdx) => {
                  const activeIdx =
                    selectedTurnIdx === -1 ? turns.length - 1 : selectedTurnIdx;
                  const isSelected = tIdx === activeIdx;
                  const archivedByLaterPivot = turns
                    .slice(tIdx + 1)
                    .some((later) =>
                      Boolean(later.botMsg?.uiPlanMeta?.archivedPriorOnPivot),
                    );
                  const strat = t.botMsg?.uiPlanMeta?.updateStrategy;
                  const stratTag =
                    strat === "append"
                      ? " · +"
                      : strat === "update"
                        ? " · ↻"
                        : archivedByLaterPivot
                          ? " · Arsip"
                          : "";
                  return (
                    <motion.button
                      key={`${t.userText}-${tIdx}`}
                      type="button"
                      data-explore-turn-pill={tIdx + 1}
                      className={`momo-reshape-chip${isSelected ? " is-active" : ""}`}
                      style={
                        archivedByLaterPivot && !isSelected
                          ? { opacity: 0.62 }
                          : undefined
                      }
                      whileHover={MOTION_VOCABULARY.feedback.hoverLiftSm}
                      whileTap={MOTION_VOCABULARY.feedback.tapPress}
                      transition={{
                        duration: MOTION_VOCABULARY.durations.micro,
                        ease: MOTION_VOCABULARY.easings.standard,
                      }}
                      onClick={() => scrollToTurn(tIdx)}
                    >
                      Turn {tIdx + 1}
                      {stratTag}
                    </motion.button>
                  );
                })}
              </div>

              <div className="gen-row" style={{ gap: 8, alignItems: "center" }}>
                {activeTurn && (
                  <>
                    {onOpenBoard && (
                      <motion.button
                        type="button"
                        data-explore-open-board="true"
                        className="momo-reshape-chip"
                        disabled={busy}
                        whileHover={MOTION_VOCABULARY.feedback.hoverLiftSm}
                        whileTap={MOTION_VOCABULARY.feedback.tapPress}
                        onClick={onOpenBoard}
                        title={`Buka ${cfg.boardLabel}`}
                      >
                        {cfg.boardLabel}
                      </motion.button>
                    )}
                    <motion.button
                      type="button"
                      data-explore-to-chat="true"
                      className="momo-reshape-chip"
                      disabled={busy}
                      whileHover={MOTION_VOCABULARY.feedback.hoverLiftSm}
                      whileTap={MOTION_VOCABULARY.feedback.tapPress}
                      onClick={() =>
                        onSubmitPrompt(
                          `Bedah lebih dalam hasil eksplorasi soal "${activeTurn.userText}" dan susun analisis serta langkah konkretnya.`,
                          undefined,
                          "chat",
                        )
                      }
                      title="Lanjutkan topik ini ke diskusi mendalam di Chat"
                    >
                      Bedah di Chat ↗
                    </motion.button>
                    <motion.button
                      type="button"
                      className="momo-explore-scroll-btn"
                      aria-label="Geser ke kiri"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => scrollStrip(-1)}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m10 3-5 5 5 5" />
                      </svg>
                    </motion.button>
                    <motion.button
                      type="button"
                      className="momo-explore-scroll-btn"
                      aria-label="Geser ke kanan"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => scrollStrip(1)}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m6 3 5 5-5 5" />
                      </svg>
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="momo-explore-strip-wrap">
            <div ref={bindStripRef} className="momo-explore-strip sc">
              {turns.map((turn, tIdx) => {
                const turnParts = (turn.botMsg?.parts ?? []).filter(
                  (p) => p.kind !== "tool",
                );
                const hasNativeReasoning = Boolean(
                  turn.botMsg?.reasoningText &&
                  turn.botMsg.reasoningText.trim().length > 0,
                );
                const firstTextPart = turnParts.find(
                  (p): p is Extract<(typeof turnParts)[number], { kind: "text" }> =>
                    p.kind === "text" && p.text.trim().length > 0,
                );
                const headAbsorbedMeta = firstTextPart
                  ? planMistlineSpreads(
                      parseMixedStreamToMistlineBlocks(firstTextPart.text, {
                        final: !turn.botMsg?.streaming,
                      }),
                      {
                        userPrompt: turn.userText,
                        sources: turn.botMsg?.sources,
                      },
                    ).absorbedHeadline
                  : undefined;
                return (
                  <motion.div
                    key={`turn-${tIdx}-${turn.userText.slice(0, 18)}`}
                    ref={(el) => {
                      turnColRefs.current[tIdx] = el;
                    }}
                    data-explore-turn={tIdx + 1}
                    className="momo-explore-turn-col"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: MOTION_VOCABULARY.durations.normal,
                      delay: tIdx * 0.04,
                      ease: MOTION_VOCABULARY.easings.standard,
                    }}
                  >
                    {/* Prompt Header + Handwritten Indie Flower Title + Wavy ~ SVG */}
                    <div className="momo-explore-turn-head">
                      <div
                        className="gen-row momo-explore-turn-meta-row"
                        style={{
                          gap: 8,
                          alignItems: "center",
                          justifyContent: "space-between",
                          minHeight: 28,
                          height: 28,
                          flexShrink: 0,
                          width: "100%",
                        }}
                      >
                        <div
                          className="gen-row"
                          style={{
                            gap: 6,
                            alignItems: "center",
                            minWidth: 0,
                            overflow: "hidden",
                          }}
                        >
                          <span
                            className="skw-kicker"
                            style={{ color: "var(--mute)", flexShrink: 0 }}
                          >
                            Turn {tIdx + 1}
                          </span>
                          {headAbsorbedMeta?.kicker && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "var(--accent)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              · {headAbsorbedMeta.kicker}
                            </span>
                          )}
                          {turn.botMsg?.uiPlanMeta && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--mute)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              ·{" "}
                              {turn.botMsg.uiPlanMeta.updateStrategy ===
                              "append"
                                ? "Append"
                                : turn.botMsg.uiPlanMeta.updateStrategy ===
                                    "update"
                                  ? "Refine"
                                  : turn.botMsg.uiPlanMeta.archivedPriorOnPivot
                                    ? "Pivot Baru"
                                    : "Baru"}
                            </span>
                          )}
                        </div>
                        {onRetryTurn &&
                          !busy &&
                          tIdx === turns.length - 1 &&
                          turn.botMsg &&
                          !turn.botMsg.streaming && (
                            <button
                              type="button"
                              className="act"
                              data-action="explore-retry"
                              data-tip="Respon ulang dengan model aktif"
                              aria-label="Respon ulang Explore"
                              title="Respon ulang"
                              style={{ width: 26, height: 26, flexShrink: 0 }}
                              onClick={() => onRetryTurn(turn.botMsg!)}
                            >
                              <span className="momo-act-glyph">
                                <RotateCcw
                                  size={13.5}
                                  strokeWidth={1.9}
                                  aria-hidden="true"
                                />
                              </span>
                            </button>
                          )}
                      </div>
                      <h2
                        className="momo-hand-title"
                        data-explore-prompt-title="true"
                        style={{
                          fontSize: "clamp(26px, 2.8vw, 36px)",
                          lineHeight: 1.15,
                          color: "var(--ink)",
                          margin: 0,
                        }}
                      >
                        {turn.userText}
                      </h2>
                      <ExploreWavyTildeLine
                        active={Boolean(
                          turn.botMsg?.streaming ||
                          (busy && tIdx === turns.length - 1),
                        )}
                      />
                      {headAbsorbedMeta?.subtitle && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13.5,
                            lineHeight: 1.5,
                            color: "var(--ink-2)",
                          }}
                        >
                          {headAbsorbedMeta.subtitle}
                        </p>
                      )}
                      {turn.botMsg &&
                      (hasNativeReasoning ||
                        turn.botMsg.streaming ||
                        Boolean(turn.botMsg.text || turn.botMsg.tokenCount)) ? (
                        <ExploreHandwritingReasoning
                          msg={turn.botMsg}
                          userText={turn.userText}
                          roleLabel={cfg.label}
                        />
                      ) : (
                        <div
                          className="momo-explore-hand-wrap"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Detached Full-Height Vertical Flow (No Forced Chassis Cut-Off!) */}
                    <div className="momo-explore-turn-flow">
                      {turn.botMsg?.streaming && turnParts.length === 0 ? (
                        <div
                          className="momo-stream-waiting"
                          data-lifecycle="pending"
                          aria-hidden="true"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "12px 0",
                          }}
                        >
                          <span className="gu-skel__dot" />
                          <span
                            className="gu-skel__bar"
                            style={{ width: 112 }}
                          />
                        </div>
                      ) : (
                        turnParts.map((part, pIdx) => {
                          if (part.kind === "text") {
                            if (!part.text.trim()) return null;
                            const isStreamingPart = Boolean(
                              part.streaming ||
                              (turn.botMsg?.streaming &&
                                pIdx === turnParts.length - 1),
                            );
                            const parsed = parseMixedStreamToMistlineBlocks(
                              part.text,
                              {
                                final: !isStreamingPart,
                              },
                            );
                            const hasUiOrNoLegacyCard =
                              parsed.some((b) => b.kind === "ui") ||
                              !turnParts.some((tp) => tp.kind === "gen_ui");
                            if (hasUiOrNoLegacyCard) {
                              const { pages, followups } = planMistlineSpreads(
                                parsed,
                                {
                                  userPrompt: turn.userText,
                                  sources: turn.botMsg?.sources,
                                },
                              );
                              if (pages.length > 0 || followups.length > 0) {
                                return (
                                  <MistlineMediaScopeProvider
                                    key={part.id}
                                    contextText={turn.userText || session?.title}
                                    sources={turn.botMsg?.sources}
                                  >
                                    <div
                                      className="momo-ex-spreads-row"
                                    >
                                      {pages.map((pg) => (
                                        <MistlineSpread
                                          key={`${part.id}-${pg.key}`}
                                          page={pg}
                                          by={cfg.label}
                                          streaming={isStreamingPart}
                                          live={
                                            tIdx === turns.length - 1 && !busy
                                          }
                                          sources={turn.botMsg?.sources}
                                          onAction={(a) =>
                                            onSubmitPrompt(
                                              a.text,
                                              undefined,
                                              "explore",
                                            )
                                          }
                                          onUiInteraction={(interaction) =>
                                            onSubmitPrompt(
                                              interaction.prompt,
                                              interaction,
                                              "explore",
                                            )
                                          }
                                          pinnedTitles={pinnedTitles}
                                          onTogglePinItem={onTogglePinItem}
                                        />
                                      ))}
                                      {followups.length > 0 &&
                                        !isStreamingPart &&
                                        tIdx < turns.length - 1 && (
                                          <div
                                            style={{
                                              alignSelf: "center",
                                              flex: "0 0 auto",
                                              maxWidth: 340,
                                            }}
                                          >
                                            <MistlineFollowChips
                                              items={followups}
                                              live={!busy}
                                              onAction={(a) =>
                                                onSubmitPrompt(
                                                  a.text,
                                                  undefined,
                                                  "explore",
                                                )
                                              }
                                            />
                                          </div>
                                        )}
                                    </div>
                                  </MistlineMediaScopeProvider>
                                );
                              }
                            }
                            return (
                              <div
                                key={part.id}
                                className="momo-explore-prose body"
                              >
                                <MarkdownMessage
                                  text={part.text}
                                  sources={turn.botMsg?.sources}
                                  isStreaming={isStreamingPart}
                                />
                              </div>
                            );
                          }
                          return null;
                        })
                      )}
                      {turn.botMsg?.truncated && !turn.botMsg?.streaming && (
                        <p
                          className="gu-pen momo-hand-title"
                          style={{
                            margin: "10px 2px 0",
                            color: "var(--mute)",
                            fontSize: 12,
                          }}
                        >
                          jawaban terpotong, respons terhenti di tengah
                        </p>
                      )}
                      {!turn.botMsg?.streaming &&
                        turn.botMsg?.sources &&
                        turn.botMsg.sources.length > 0 && (
                          <SourcePillRow sources={turn.botMsg.sources} />
                        )}
                    </div>
                  </motion.div>
                );
              })}

              {/* OpenUI-style Horizontal End-Cap ("Mau lanjut ke mana?") */}
              <motion.div
                key="explore-endcap"
                data-explore-endcap="true"
                className="momo-explore-turn-col momo-explore-endcap-col"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: 0.08, ease: EASE_MOMO }}
              >
                <div className="momo-explore-endcap-head">
                  <span className="skw-kicker" style={{ color: "var(--mute)" }}>
                    Cabang berikutnya · {endCapBranches.length} jalur
                  </span>
                  <h2 className="momo-serif momo-explore-endcap-title">
                    Mau lanjut ke mana?
                  </h2>
                </div>

                <form
                  className="momo-explore-prompt-well momo-explore-endcap-well"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitInline(endCapPrompt, setEndCapPrompt);
                  }}
                >
                  <input
                    type="text"
                    data-explore-endcap-input="true"
                    className="momo-explore-prompt-input"
                    title={
                      lastTurn
                        ? `Lanjut telusuri “${lastTurn.userText.trim()}”`
                        : "Tulis eksplorasi lanjutan..."
                    }
                    placeholder={
                      lastTurn
                        ? `Lanjut telusuri “${shortenTopicLabel(lastTurn.userText, 42)}”`
                        : "Tulis eksplorasi lanjutan..."
                    }
                    value={endCapPrompt}
                    onChange={(e) => setEndCapPrompt(e.target.value)}
                  />
                  <motion.button
                    type="submit"
                    className={`momo-explore-submit-btn is-sm${endCapPrompt.trim() ? " is-ready" : ""}`}
                    aria-label="Kirim eksplorasi lanjutan"
                    disabled={busy}
                    whileHover={{ y: -1.5, scale: 1.05 }}
                    whileTap={{ scale: 0.93 }}
                  >
                    <svg
                      viewBox="0 0 20 20"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M10 15.5V4.5" />
                      <path d="m5.2 9.2 4.8-4.7 4.8 4.7" />
                    </svg>
                  </motion.button>
                </form>

                <div className="momo-explore-endcap-list" role="list">
                  {endCapBranches.map((branch, sIdx) => {
                    const isChat = branch.target === "chat";
                    return (
                      <motion.button
                        key={`endcap-${sIdx}-${branch.label}`}
                        type="button"
                        role="listitem"
                        data-explore-endcap-card={branch.target}
                        className={`momo-explore-endcap-row${isChat ? " is-chat" : ""}`}
                        disabled={busy}
                        title={branch.prompt}
                        whileHover={busy ? undefined : { x: 4 }}
                        whileTap={busy ? undefined : { scale: 0.988 }}
                        transition={{ type: "spring", stiffness: 460, damping: 32 }}
                        onClick={() =>
                          onSubmitPrompt(branch.prompt, undefined, branch.target)
                        }
                      >
                        <span className="momo-endcap-row__icon" aria-hidden="true">
                          <MistlineIcon name={branch.icon} size={14} strokeWidth={1.8} />
                        </span>
                        <span className="momo-endcap-row__body">
                          <span className="momo-endcap-row__meta">
                            <span className="momo-endcap-row__idx">
                              {String(sIdx + 1).padStart(2, "0")}
                            </span>
                            <i className="momo-endcap-row__dot" aria-hidden="true" />
                            <span className="momo-endcap-row__kicker">
                              {branch.kicker}
                            </span>
                          </span>
                          <span className="momo-endcap-row__title">
                            {branch.label}
                          </span>
                        </span>
                        <span className="momo-endcap-row__trail" aria-hidden="true">
                          <span className="momo-endcap-row__surface">
                            {isChat ? "Chat" : "Spread"}
                          </span>
                          <span className="momo-endcap-row__arrow">
                            {isChat ? (
                              <ArrowUpRight size={13} strokeWidth={2} />
                            ) : (
                              <ArrowRight size={13} strokeWidth={2} />
                            )}
                          </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};
