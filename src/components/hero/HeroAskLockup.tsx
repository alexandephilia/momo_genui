"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { EASE_MOMO } from "@/components/motion/MotionPrimitives";
import { ComposerBridge } from "@/runtime/composerBridge";
import { StaggeredBlurText } from "../composer/StaggeredBlurText";

interface HeroAskLockupProps {
  bridge?: ComposerBridge;
  roleId?: string;
  botName?: string;
  isCustomBot?: boolean;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

const EASE_OUT = EASE_MOMO;
const WIDTH_TRANSITION = { duration: 0.2, ease: EASE_OUT } as const;

const ROLE_ASK_COPY: Record<string, string> = {
  rest: "Spill obrolan atau drama?",
  builder: "Ada ide absurd apa nih?",
  captain: "Gas, ngoding bareng?",
  tester: "Yakin udah aman semua?",
  bug: "Bug-nya ngumpet lagi?",
  guard: "Nemu ada kejanggalan?",
  investigate: "Cari penyebab isunya?",
  designer: "Desain kurang aesthetic?",
  cook: "Laper atau cari resep baru?",
  write: "Kata-kata lagi macet?",
  tutor: "Mau nambah isi kepala?",
  music: "Butuh soundtrack hidup?",
  coach: "Masih nunggu motivasi?",
  planner: "Hidup mulai berantakan?",
  traveller: "Kabur ke mana sekarang?",
  money: "Bingung duit lari ke mana?",
  garden: "Tanaman mulai ngambek?",
  director: "Bingung konten gitu aja?",
};

function resolveAskCopy(roleId: string, isCustomBot: boolean): string {
  if (isCustomBot) return "Kerjain bareng";
  return ROLE_ASK_COPY[roleId] ?? "Siapa yang bantu?";
}

/**
 * Measures intrinsic inline text width via a ghost span and drives a MotionValue
 * initialized synchronously via `jump()` on mount so the VERY FIRST role/text change
 * after page load/reload animates smoothly from exact pixels instead of snapping from `auto`.
 */
function useMeasuredTextWidth(text: string) {
  const widthMv = useMotionValue<number | string>("auto");
  const ghostElRef = useRef<HTMLSpanElement | null>(null);
  const seededTextRef = useRef<string | null>(null);
  const targetWidthRef = useRef<number | null>(null);
  const ctrlRef = useRef<ReturnType<typeof animate> | null>(null);
  const latestTextRef = useRef(text);
  latestTextRef.current = text;

  const syncMeasure = useCallback(
    (shouldAnimate: boolean) => {
      const el = ghostElRef.current;
      if (!el) return;
      const next = Math.ceil(el.getBoundingClientRect().width);
      if (next <= 2) return;

      // Ignore ResizeObserver / font-ready echoes whose target already matches an active or settled width
      if (!shouldAnimate && targetWidthRef.current === next) return;
      targetWidthRef.current = next;

      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      ctrlRef.current?.stop();
      ctrlRef.current = null;

      if (!shouldAnimate || reduced || typeof widthMv.get() !== "number") {
        widthMv.jump(next);
        return;
      }

      ctrlRef.current = animate(widthMv, next, WIDTH_TRANSITION);
    },
    [widthMv],
  );

  // Run synchronously before paint on mount (jump) and on every subsequent text change (animate)
  useLayoutEffect(() => {
    const isInitialMount = seededTextRef.current === null;
    const textChanged = !isInitialMount && seededTextRef.current !== text;
    seededTextRef.current = text;
    syncMeasure(textChanged);
  }, [text, syncMeasure]);

  const ghostRef = useCallback(
    (el: HTMLSpanElement | null) => {
      ghostElRef.current = el;
      if (!el) return;

      const handleReflow = () => {
        // Keep font-swap or viewport reflow updates crisp without drift
        syncMeasure(false);
      };

      const ro = new ResizeObserver(handleReflow);
      ro.observe(el);

      let cancelled = false;
      let rafId = 0;
      const onVis = () => {
        if (document.visibilityState === "visible" && !cancelled) {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            rafId = 0;
            if (!cancelled) syncMeasure(false);
          });
        }
      };
      window.addEventListener("resize", handleReflow, { passive: true });
      document.addEventListener("visibilitychange", onVis);
      document.fonts?.ready?.then(() => {
        if (!cancelled && latestTextRef.current === seededTextRef.current) {
          syncMeasure(false);
        }
      });

      return () => {
        cancelled = true;
        if (rafId) cancelAnimationFrame(rafId);
        ro.disconnect();
        window.removeEventListener("resize", handleReflow);
        document.removeEventListener("visibilitychange", onVis);
        if (ghostElRef.current === el) {
          ghostElRef.current = null;
        }
      };
    },
    [syncMeasure],
  );

  useEffect(() => {
    return () => {
      ctrlRef.current?.stop();
      ctrlRef.current = null;
    };
  }, []);

  return { ghostRef, widthMv };
}

const GHOST_TYPE_MS = 38;

/**
 * Ghost-type writer: retypes `text` character by character with a caret while the
 * not-yet-typed remainder renders as a faint ghost completion (ReactBits "Ghost Type"
 * style). Instant on first mount and under prefers-reduced-motion.
 */
function GhostTypeText({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const [typed, setTyped] = useState(text.length);
  // First paint stays crisp; blur-reveal only runs for characters typed after a role change.
  const [revealing, setRevealing] = useState(false);
  const prevTextRef = useRef(text);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevTextRef.current === text) return;
    prevTextRef.current = text;
    if (reduced) {
      setTyped(text.length);
      return;
    }
    setRevealing(true);
    setTyped(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setTyped(i);
      if (i < text.length) {
        timerRef.current = window.setTimeout(tick, GHOST_TYPE_MS);
      }
    };
    timerRef.current = window.setTimeout(tick, GHOST_TYPE_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [text, reduced]);

  const done = typed >= text.length;
  return (
    <span className="ghost-type" data-ghost-visible="true" aria-label={text}>
      <span aria-hidden="true">
        {Array.from(text.slice(0, typed)).map((ch, i) => (
          <span
            key={i}
            className={
              revealing ? "ghost-type-char is-reveal" : "ghost-type-char"
            }
          >
            {ch}
          </span>
        ))}
        <span
          className={done ? "ghost-type-caret is-idle" : "ghost-type-caret"}
        />
        {!done && <span className="ghost-type-ghost">{text.slice(typed)}</span>}
      </span>
    </span>
  );
}

/**
 * Role-driven Hero Action Lockup:
 * bidirectional staggered blur-fade out + blur-fade in on `.ask-t` & `#botName`,
 * paired with pure width interpolation (no competing FLIP layout projection) so text never drifts.
 */
export const HeroAskLockup: React.FC<HeroAskLockupProps> = ({
  bridge,
  roleId: propRoleId,
  botName: propBotName,
  isCustomBot: propCustomBot,
  menuOpen = false,
  onToggleMenu,
  buttonRef,
}) => {
  const subscribeBridge = useCallback(
    (onStoreChange: () => void) => {
      if (!bridge) return () => {};
      return bridge.subscribe(() => onStoreChange());
    },
    [bridge],
  );

  const getBridgeSnap = useCallback(
    () => (bridge ? bridge.getSnapshot() : null),
    [bridge],
  );

  const snap = useSyncExternalStore(
    subscribeBridge,
    getBridgeSnap,
    getBridgeSnap,
  );

  const roleId = propRoleId ?? snap?.roleId ?? "rest";
  const botName = propBotName ?? snap?.botName ?? "Momo";
  const isCustomBot = propCustomBot ?? snap?.isCustomBot ?? false;

  const askText = resolveAskCopy(roleId, isCustomBot);
  const { ghostRef: askGhostRef, widthMv: askWidthMv } =
    useMeasuredTextWidth(askText);
  const { ghostRef: botGhostRef, widthMv: botWidthMv } =
    useMeasuredTextWidth(botName);

  return (
    <motion.h1 className="ask">
      <span className="ask-frost" aria-hidden="true">
        <s />
        <s className="nz" />
      </span>
      <motion.span
        style={{ width: askWidthMv }}
        className="ask-t relative inline-flex items-center justify-end overflow-visible"
      >
        <span
          ref={askGhostRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute left-0 top-0 inline-flex items-center whitespace-nowrap"
        >
          {askText
            .split(/\s+/)
            .filter(Boolean)
            .map((w, i, arr) => (
              <span
                key={i}
                className="inline-block"
                style={{ marginRight: i < arr.length - 1 ? "0.28em" : 0 }}
              >
                {w}
              </span>
            ))}
        </span>
        <GhostTypeText text={askText} />
      </motion.span>

      <motion.button
        ref={buttonRef}
        style={{ borderRadius: 9999 }}
        initial={false}
        animate={{
          opacity: 1,
          scale: menuOpen ? 0.98 : 1,
        }}
        whileHover={{ y: -1, scale: 1.02 }}
        whileFocus={{ scale: 1.015 }}
        whileTap={{ scale: 0.97 }}
        transition={{
          duration: 0.18,
          ease: EASE_OUT,
        }}
        className="bot-pick"
        id="botPick"
        data-react-managed="1"
        data-open={menuOpen ? "1" : "0"}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls="botMenu"
        onClick={onToggleMenu}
      >
        <span className="bot-pick-dot" aria-hidden="true" />
        <motion.span
          id="botName"
          style={{ width: botWidthMv }}
          className="relative inline-flex items-center justify-start overflow-visible"
        >
          <span
            ref={botGhostRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute left-0 top-0 inline-flex items-center whitespace-nowrap"
          >
            {botName
              .split(/\s+/)
              .filter(Boolean)
              .map((w, i, arr) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{ marginRight: i < arr.length - 1 ? "0.28em" : 0 }}
                >
                  {w}
                </span>
              ))}
          </span>
          <StaggeredBlurText
            text={botName}
            mode="words"
            align="left"
            animateOnMount={false}
            staggerIn={0.014}
            staggerOut={0.01}
            delayIn={0.01}
            blurPx={5}
            yOffset={4}
            durationIn={0.2}
            durationOut={0.14}
          />
        </motion.span>
        <motion.svg
          animate={{ rotate: menuOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12 16.2c-.33 0-.63-.13-.87-.37l-5.4-5.4a1.2 1.2 0 0 1 1.7-1.7L12 13.3l4.57-4.57a1.2 1.2 0 0 1 1.7 1.7l-5.4 5.4c-.24.24-.54.37-.87.37Z"
          />
        </motion.svg>
      </motion.button>
    </motion.h1>
  );
};
