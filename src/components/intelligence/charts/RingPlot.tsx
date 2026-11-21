"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { fmtPct, fmtUnit, markProps, useDvMotion, useMeasure } from "./kit";

export interface RingSlice {
  key: string;
  label: string;
  color: string;
  value: number;
}

/**
 * Donut ring or solid pie. Slices are dashed strokes on one circle so angle
 * changes interpolate cleanly (arc path flags can't be tweened).
 */
export function RingPlot({
  kind,
  label,
  slices,
  height,
  unit,
  hoverKey,
  onHover,
  onSelect,
  selectedKey = null,
  center,
}: {
  kind: "donut" | "pie";
  label: string;
  slices: RingSlice[];
  height: number;
  unit?: string;
  hoverKey: string | null;
  onHover: (key: string | null) => void;
  onSelect?: (key: string) => void;
  selectedKey?: string | null;
  center?: ReactNode;
}) {
  const m = useDvMotion();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const donut = kind === "donut";
  const leaders = !donut && width >= 380;
  const R = Math.max(
    28,
    donut ? Math.min(width, height) / 2 - 10 : Math.min(height / 2 - 14, width / 2 - (leaders ? 118 : 10)),
  );
  const stroke = donut ? Math.max(14, R * 0.27) : R;
  const rMid = R - stroke / 2;
  const C = 2 * Math.PI * rMid;
  const gap = slices.length > 1 ? (donut ? 3 : 1.5) : 0;
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;

  let acc = 0;
  const arcs = slices.map((s) => {
    const frac = s.value / total;
    const start = acc;
    acc += frac;
    const mid = (start + frac / 2) * Math.PI * 2;
    return { ...s, frac, start, mid, len: Math.max(0, frac * C - gap) };
  });
  const focusKey = hoverKey ?? selectedKey;

  return (
    <div ref={ref} className="dv-plot dv-ring" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={label}>
          <g transform={`translate(${width / 2} ${height / 2})`}>
            <g transform="rotate(-90)">
              <AnimatePresence initial={!m.reduce}>
                {arcs.map((a, i) => {
                  const on = focusKey === a.key;
                  const dim = focusKey !== null && !on;
                  const lift = on ? (donut ? 0 : 7) : 0;
                  return (
                    <motion.circle
                      key={a.key}
                      className="dv-mark"
                      r={rMid}
                      fill="none"
                      stroke={a.color}
                      initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: 0, strokeWidth: stroke, opacity: 1, x: 0, y: 0 }}
                      animate={{
                        strokeDasharray: `${a.len} ${C - a.len}`,
                        strokeDashoffset: -(a.start * C + gap / 2),
                        strokeWidth: stroke + (on && donut ? 8 : 0),
                        opacity: dim ? 0.3 : 1,
                        x: Math.cos(a.mid) * lift,
                        y: Math.sin(a.mid) * lift,
                      }}
                      exit={{ strokeDasharray: `0 ${C}`, opacity: 0 }}
                      transition={{
                        ...m.stagger(i, 0.07),
                        opacity: m.fade,
                        strokeWidth: m.snap,
                        x: m.snap,
                        y: m.snap,
                      }}
                      whileTap={onSelect && !m.reduce ? { strokeWidth: stroke - (donut ? 4 : 6) } : undefined}
                      {...markProps(`${a.label}: ${fmtUnit(a.value, unit)}, ${fmtPct(a.frac * 100)}`, {
                        enter: () => onHover(a.key),
                        leave: () => onHover(null),
                        activate: onSelect ? () => onSelect(a.key) : undefined,
                        pressed: selectedKey === a.key,
                      })}
                    />
                  );
                })}
              </AnimatePresence>
            </g>

            {!donut && (
              <g aria-hidden="true">
                <AnimatePresence initial={!m.reduce}>
                  {arcs
                    .filter((a) => a.frac >= 0.07)
                    .map((a, i) => {
                      const ang = a.mid - Math.PI / 2;
                      const lift = focusKey === a.key ? 7 : 0;
                      return (
                        <motion.text
                          key={`pct|${a.key}`}
                          className="dv-val dv-on-mark"
                          textAnchor="middle"
                          initial={{ x: 0, y: 4, opacity: 0 }}
                          animate={{
                            x: Math.cos(ang) * (R * 0.62 + lift),
                            y: Math.sin(ang) * (R * 0.62 + lift) + 4,
                            opacity: focusKey !== null && focusKey !== a.key ? 0.35 : 1,
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ ...m.stagger(i + 2, 0.07), opacity: m.fade }}
                        >
                          {fmtPct(a.frac * 100)}
                        </motion.text>
                      );
                    })}
                  {leaders &&
                    arcs
                      .filter((a) => a.frac >= 0.03)
                      .flatMap((a, i) => {
                        const ang = a.mid - Math.PI / 2;
                        const side = Math.cos(ang) >= 0 ? 1 : -1;
                        const p1 = [Math.cos(ang) * (R + 4), Math.sin(ang) * (R + 4)];
                        const p2 = [Math.cos(ang) * (R + 16), Math.sin(ang) * (R + 16)];
                        const p3 = [p2[0] + side * 14, p2[1]];
                        const d = `M${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}L${p3[0]} ${p3[1]}`;
                        const faded = focusKey !== null && focusKey !== a.key;
                        return [
                          <motion.path
                            key={`lead|${a.key}`}
                            className="dv-leader"
                            initial={{ d, opacity: 0 }}
                            animate={{ d, opacity: faded ? 0.25 : 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ ...m.spring, opacity: m.draw(1 + i * 0.4) }}
                          />,
                          <motion.text
                            key={`name|${a.key}`}
                            className="dv-leader-text"
                            textAnchor={side > 0 ? "start" : "end"}
                            initial={{ x: p3[0] + side * 5, y: p3[1], opacity: 0 }}
                            animate={{ x: p3[0] + side * 5, y: p3[1], opacity: faded ? 0.35 : 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ ...m.spring, opacity: m.draw(1 + i * 0.4) }}
                          >
                            <tspan x={0} dy="-0.1em">
                              {a.label}
                            </tspan>
                            <tspan className="dv-leader-sub" x={0} dy="1.25em">
                              {fmtUnit(a.value, unit)}
                            </tspan>
                          </motion.text>,
                        ];
                      })}
                </AnimatePresence>
              </g>
            )}
          </g>
        </svg>
      )}
      {center && <div className="dv-ring__center">{center}</div>}
    </div>
  );
}
