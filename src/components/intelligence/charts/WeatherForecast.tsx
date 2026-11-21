"use client";

/** weather_forecast — current conditions hero with a Day (hourly) / Week (daily) toggle. */

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Moon,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelCardShell, s, n, a } from "../shared/IntelCardShell";
import { ActivePlate, STAGGER_ITEM, useStagger } from "../shared/StateMotion";
import { MH } from "@/components/motion/MotionPrimitives";

const WX_ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  "clear-day": Sun,
  "sun-cloud": CloudSun,
  "cloud-sun": CloudSun,
  "partly-cloudy": CloudSun,
  cloud: Cloud,
  cloudy: Cloud,
  overcast: Cloud,
  "clear-night": Moon,
  moon: Moon,
  "cloud-moon": CloudMoon,
  rain: CloudRain,
  "rain-heavy": CloudRain,
  showers: CloudRain,
  drizzle: CloudDrizzle,
  storm: CloudLightning,
  thunderstorm: CloudLightning,
  snow: CloudSnow,
  fog: CloudFog,
  mist: CloudFog,
  haze: CloudFog,
  breeze: Wind,
  wind: Wind,
};

function wxIcon(v: unknown): LucideIcon {
  const key = s(v).toLowerCase().replace(/[\s_]+/g, "-");
  return WX_ICONS[key] ?? CloudSun;
}

const pct = (v: unknown): number | null => {
  const x = typeof v === "number" && Number.isFinite(v) ? v : Number(s(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(x) ? Math.round(Math.min(100, Math.max(0, x))) : null;
};

type View = "day" | "week";

export function WeatherForecast({ data, state, streaming, sources }: IntelBaseProps) {
  const reduce = useReducedMotion();
  const stagger = useStagger();
  const pillId = useId();
  const cur = (data.current && typeof data.current === "object" ? data.current : data) as Record<string, unknown>;
  const hours = a<Record<string, unknown>>(data.hourly ?? data.hours ?? data.today);
  const days = a<Record<string, unknown>>(data.daily ?? data.week ?? data.weekly);
  const unit = s(cur.unit, "C");

  const hasDay = hours.length > 0;
  const hasWeek = days.length > 0;
  const [view, setView] = useState<View>(hasDay ? "day" : "week");
  const activeView: View = view === "day" && !hasDay ? "week" : view === "week" && !hasWeek ? "day" : view;

  const temp = n(cur.temp ?? cur.temperature, Number.NaN);
  const CurIcon = wxIcon(cur.icon ?? cur.cond);
  const cond = s(cur.cond, s(cur.condition, s(cur.summary, "Conditions")));
  const hi = n(cur.hi, Number.NaN);
  const lo = n(cur.lo, Number.NaN);
  const feels = n(cur.feelsLike, Number.NaN);
  const humidity = pct(cur.humidity);
  const wind = n(cur.windKph, Number.NaN);
  const precip = pct(cur.precipChance);
  const uv = n(cur.uvIndex, Number.NaN);

  const metaRows: [string, string][] = [
    ["Feels like", Number.isFinite(feels) ? `${feels}°${unit}` : ""],
    ["Humidity", humidity !== null ? `${humidity}%` : ""],
    ["Wind", Number.isFinite(wind) ? `${Math.round(wind)} km/h` : ""],
    ["Precip chance", precip !== null ? `${precip}%` : ""],
    ["UV index", Number.isFinite(uv) ? `${uv}` : ""],
  ];

  const weekTemps = days.flatMap((d) => [n(d.lo, Number.NaN), n(d.hi, Number.NaN)]).filter(Number.isFinite);
  const weekLo = weekTemps.length ? Math.min(...weekTemps) : 0;
  const weekHi = weekTemps.length ? Math.max(...weekTemps) : 1;
  const weekSpan = Math.max(weekHi - weekLo, 1);

  return (
    <IntelCardShell
      title={s(data.location, s(data.title, "Weather"))}
      subtitle={s(data.subtitle, s(cur.updatedAt, "Local forecast"))}
      badge={cond}
      badgeTone="blue"
      icon={<CurIcon size={16} />}
      headerRight={
        hasDay && hasWeek ? (
          <div className="intel-filter-pills" role="tablist" aria-label="Forecast range">
            {(["day", "week"] as const).map((v) => (
              <motion.button
                key={v}
                type="button"
                role="tab"
                aria-selected={activeView === v}
                className={`intel-pill ${activeView === v ? "is-active" : ""}`}
                whileTap={MH.tap}
                transition={MH.spring}
                onClick={() => setView(v)}
              >
                {activeView === v && <ActivePlate layoutId={pillId} shadow />}
                {v === "day" ? "Day" : "Week"}
              </motion.button>
            ))}
          </div>
        ) : undefined
      }
      spineExtra={
        <div className="intel-ws__meta">
          <span className="intel-ws__meta-label">Conditions</span>
          {metaRows.map(([label, value]) =>
            value ? (
              <div key={label} className="intel-ws__meta-row">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ) : null,
          )}
        </div>
      }
      state={state}
      streaming={streaming}
      sources={sources}
      isEmpty={!Number.isFinite(temp) && !hasDay && !hasWeek}
      emptyMessage="No forecast data"
    >
      <div className="intel-wx">
        <div className="intel-wx__hero">
          <motion.span
            className="intel-wx__orb"
            animate={reduce ? undefined : { y: [0, -4, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <CurIcon size={30} strokeWidth={1.8} aria-hidden="true" />
          </motion.span>
          <div className="intel-wx__now">
            {Number.isFinite(temp) && (
              <motion.span
                key={temp}
                className="intel-wx__temp"
                initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={MH.spring}
              >
                {Math.round(temp)}
                <small>°{unit}</small>
              </motion.span>
            )}
            <div className="intel-wx__now-meta">
              <span className="intel-wx__cond">{cond}</span>
              {(Number.isFinite(hi) || Number.isFinite(lo)) && (
                <span className="intel-wx__hilo">
                  {Number.isFinite(hi) ? `H ${Math.round(hi)}°` : ""}
                  {Number.isFinite(hi) && Number.isFinite(lo) ? " · " : ""}
                  {Number.isFinite(lo) ? `L ${Math.round(lo)}°` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {activeView === "day" && hasDay && (
            <motion.div
              key="wx-day"
              {...stagger}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={MH.spring}
              className="intel-wx__hours"
              role="tabpanel"
            >
              {hours.map((h, i) => {
                const HIcon = wxIcon(h.icon);
                const hp = pct(h.precipChance);
                return (
                  <motion.div key={s(h.time, `h-${i}`)} className="intel-wx__hour" variants={STAGGER_ITEM}>
                    <span className="intel-wx__hour-time">{s(h.time, `${i}`)}</span>
                    <HIcon size={16} strokeWidth={1.9} aria-hidden="true" className="intel-wx__hour-icon" />
                    <strong className="intel-wx__hour-temp">{Math.round(n(h.temp, 0))}°</strong>
                    <span className={`intel-wx__pop ${hp !== null && hp > 0 ? "" : "is-nil"}`}>
                      <Droplets size={9} aria-hidden="true" />
                      {hp !== null ? `${hp}%` : "—"}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {activeView === "week" && hasWeek && (
            <motion.div
              key="wx-week"
              {...stagger}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={MH.spring}
              className="intel-wx__days"
              role="tabpanel"
            >
              {days.map((d, i) => {
                const DIcon = wxIcon(d.icon);
                const dp = pct(d.precipChance);
                const dLo = n(d.lo, weekLo);
                const dHi = n(d.hi, weekHi);
                const left = ((dLo - weekLo) / weekSpan) * 100;
                const width = Math.max(((dHi - dLo) / weekSpan) * 100, 4);
                return (
                  <motion.div key={s(d.day, `d-${i}`)} className={`intel-wx__day ${i === 0 ? "is-today" : ""}`} variants={STAGGER_ITEM}>
                    <span className="intel-wx__day-name">{s(d.day, `Day ${i + 1}`)}</span>
                    <DIcon size={15} strokeWidth={1.9} aria-hidden="true" className="intel-wx__day-icon" />
                    <span className={`intel-wx__pop ${dp !== null && dp > 0 ? "" : "is-nil"}`}>
                      <Droplets size={9} aria-hidden="true" />
                      {dp !== null ? `${dp}%` : "—"}
                    </span>
                    <span className="intel-wx__day-lo">{Math.round(dLo)}°</span>
                    <span className="intel-wx__range" aria-hidden="true">
                      <motion.span
                        className="intel-wx__range-fill"
                        initial={reduce ? false : { left: "0%", width: "0%" }}
                        animate={{ left: `${left}%`, width: `${width}%` }}
                        transition={MH.spring}
                      />
                    </span>
                    <span className="intel-wx__day-hi">{Math.round(dHi)}°</span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </IntelCardShell>
  );
}
