"use client";

/** weather_forecast — current conditions hero with a Day (day-part timeline) / Week (daily) toggle. */

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
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { IntelBaseProps } from "@/lib/intelligence/types";
import { IntelCardShell, s, n, a } from "../shared/IntelCardShell";
import { ActivePlate, STAGGER_ITEM, useStagger } from "../shared/StateMotion";
import { MH } from "@/components/motion/MotionPrimitives";

type WxKind =
  | "sun"
  | "cloud-sun"
  | "cloud"
  | "night"
  | "night-cloud"
  | "rain"
  | "drizzle"
  | "storm"
  | "snow"
  | "fog"
  | "wind";

const WX: Record<string, [LucideIcon, WxKind]> = {
  sun: [Sun, "sun"],
  "clear-day": [Sun, "sun"],
  "sun-cloud": [CloudSun, "cloud-sun"],
  "cloud-sun": [CloudSun, "cloud-sun"],
  "partly-cloudy": [CloudSun, "cloud-sun"],
  cloud: [Cloud, "cloud"],
  cloudy: [Cloud, "cloud"],
  overcast: [Cloud, "cloud"],
  "clear-night": [Moon, "night"],
  moon: [Moon, "night"],
  "cloud-moon": [CloudMoon, "night-cloud"],
  rain: [CloudRain, "rain"],
  "rain-heavy": [CloudRain, "rain"],
  showers: [CloudRain, "rain"],
  drizzle: [CloudDrizzle, "drizzle"],
  storm: [CloudLightning, "storm"],
  thunderstorm: [CloudLightning, "storm"],
  snow: [CloudSnow, "snow"],
  fog: [CloudFog, "fog"],
  mist: [CloudFog, "fog"],
  haze: [CloudFog, "fog"],
  breeze: [Wind, "wind"],
  wind: [Wind, "wind"],
};

function wx(v: unknown): [LucideIcon, WxKind] {
  const key = s(v).toLowerCase().replace(/[\s_]+/g, "-");
  return WX[key] ?? [CloudSun, "cloud-sun"];
}

const pct = (v: unknown): number | null => {
  const x = typeof v === "number" && Number.isFinite(v) ? v : Number(s(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(x) ? Math.round(Math.min(100, Math.max(0, x))) : null;
};

const KIND_WORD: Record<WxKind, string> = {
  sun: "Cerah",
  "cloud-sun": "Cerah berawan",
  cloud: "Berawan",
  night: "Cerah",
  "night-cloud": "Berawan",
  rain: "Hujan",
  drizzle: "Gerimis",
  storm: "Badai",
  snow: "Salju",
  fog: "Berkabut",
  wind: "Berangin",
};

const STAR_POS: [string, string, number][] = [
  ["16%", "20%", 0],
  ["76%", "10%", 1.2],
];

const FOG_LINES: [string, number][] = [
  ["60%", 0],
  ["78%", 1],
];

function AnimatedWx({ icon: Icon, kind, size, className }: { icon: LucideIcon; kind: WxKind; size: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <Icon size={size} strokeWidth={1.9} aria-hidden="true" className={className} />;
  const cx = `intel-wxa${className ? ` ${className}` : ""}`;
  const box = { width: size, height: size };
  const el = <Icon size={size} strokeWidth={1.9} aria-hidden="true" />;

  if (kind === "sun") {
    return (
      <motion.span className={cx} style={box} animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}>
        {el}
      </motion.span>
    );
  }

  if (kind === "cloud" || kind === "cloud-sun" || kind === "wind") {
    const amp = kind === "wind" ? 3 : 1.5;
    return (
      <motion.span className={cx} style={box} animate={{ x: [-amp, amp, -amp] }} transition={{ duration: kind === "wind" ? 2.4 : 4.4, repeat: Infinity, ease: "easeInOut" }}>
        {el}
      </motion.span>
    );
  }

  if (kind === "night" || kind === "night-cloud") {
    return (
      <span className={cx} style={box}>
        {el}
        {STAR_POS.map(([l, t, d]) => (
          <motion.span
            key={l}
            className="intel-wxa__star"
            style={{ left: l, top: t }}
            animate={{ opacity: [0.15, 1, 0.15] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: d, ease: "easeInOut" }}
          />
        ))}
      </span>
    );
  }

  if (kind === "rain" || kind === "drizzle" || kind === "snow") {
    const flake = kind === "snow";
    const count = kind === "drizzle" ? 2 : 3;
    return (
      <span className={cx} style={box}>
        <Cloud size={size} strokeWidth={1.9} aria-hidden="true" />
        {Array.from({ length: count }, (_, i) => (
          <motion.span
            key={i}
            className={flake ? "intel-wxa__flake" : "intel-wxa__drop"}
            style={{ left: `${30 + i * (flake ? 22 : 20)}%`, top: "52%" }}
            animate={
              flake
                ? { y: [0, size * 0.4], x: [0, i % 2 ? 2.5 : -2.5, 0], opacity: [0, 1, 1, 0] }
                : { y: [0, size * 0.42], opacity: [0, 1, 0.85, 0] }
            }
            transition={{ duration: flake ? 2 : 1.1, repeat: Infinity, delay: i * (flake ? 0.6 : 0.38), ease: "easeIn" }}
          />
        ))}
      </span>
    );
  }

  if (kind === "storm") {
    return (
      <span className={cx} style={box}>
        <Cloud size={size} strokeWidth={1.9} aria-hidden="true" />
        <motion.span
          className="intel-wxa__bolt"
          animate={{ opacity: [0, 0, 1, 0.2, 0.9, 0, 0], scale: [1, 1, 1.15, 1, 1.05, 1, 1] }}
          transition={{ duration: 3.4, repeat: Infinity, times: [0, 0.6, 0.66, 0.72, 0.78, 0.84, 1] }}
        >
          <Zap size={Math.round(size * 0.55)} fill="currentColor" aria-hidden="true" />
        </motion.span>
      </span>
    );
  }

  return (
    <span className={cx} style={box}>
      <Cloud size={size} strokeWidth={1.9} aria-hidden="true" />
      {FOG_LINES.map(([t, i]) => (
        <motion.span
          key={t}
          className="intel-wxa__fog"
          style={{ top: t }}
          animate={{ x: i ? [size * 0.15, -size * 0.25, size * 0.15] : [-size * 0.2, size * 0.2, -size * 0.2] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

function hourOf(v: unknown): number | null {
  const t = s(v).trim();
  if (!t) return null;
  const ap = t.match(/(\d{1,2})(?::\d{2})?\s*([ap])\.?m\.?/i);
  if (ap) return (+ap[1] % 12) + (/p/i.test(ap[2]) ? 12 : 0);
  if (/^\d{4}-|T\d{2}:/.test(t)) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d.getHours();
  }
  const hm = t.match(/\b(\d{1,2})(?::\d{2})/);
  if (hm) return +hm[1] % 24;
  const bare = t.match(/^(\d{1,2})$/);
  return bare ? +bare[1] % 24 : null;
}

const DAY_PARTS: { key: string; label: string; test: (h: number) => boolean }[] = [
  { key: "pagi", label: "Pagi", test: (h) => h >= 5 && h < 11 },
  { key: "siang", label: "Siang", test: (h) => h >= 11 && h < 16 },
  { key: "sore", label: "Sore", test: (h) => h >= 16 && h < 20 },
  { key: "malam", label: "Malam", test: (h) => h >= 20 || h < 5 },
];

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
  const [CurIcon, curKind] = wx(cur.icon ?? cur.cond);
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

  const parsed = hours.map((h) => ({ h, hour: hourOf(h.time) }));
  if (parsed.some((e) => e.hour !== null)) {
    for (let i = 0; i < parsed.length; i++) {
      if (parsed[i].hour !== null) continue;
      let best = -1;
      let dist = Infinity;
      for (let j = 0; j < parsed.length; j++) {
        if (parsed[j].hour === null) continue;
        const d = Math.abs(j - i);
        if (d < dist) { dist = d; best = j; }
      }
      if (best >= 0) parsed[i].hour = (((parsed[best].hour as number) + (i - best)) % 24 + 24) % 24;
    }
  }

  const hourTemps = hours.map((h) => n(h.temp, Number.NaN)).filter(Number.isFinite);
  const dayLo = hourTemps.length ? Math.min(...hourTemps) : 0;
  const dayHi = hourTemps.length ? Math.max(...hourTemps) : 1;
  const daySpan = Math.max(dayHi - dayLo, 1);

  const segments = DAY_PARTS.flatMap((p) => {
    const inPart = parsed.filter((e) => e.hour !== null && p.test(e.hour as number));
    if (!inPart.length) return [];
    const temps = inPart.map((x) => n(x.h.temp, Number.NaN)).filter(Number.isFinite);
    const pops = inPart.map((x) => pct(x.h.precipChance)).filter((x): x is number => x !== null);
    const hrs = inPart.map((e) => {
      const h = e.hour as number;
      return p.key === "malam" && h < 5 ? h + 24 : h;
    });
    const mid = inPart[Math.floor(inPart.length / 2)].h;
    return [{
      key: p.key,
      label: p.label,
      iconV: mid.icon,
      lo: temps.length ? Math.min(...temps) : dayLo,
      hi: temps.length ? Math.max(...temps) : dayHi,
      pop: pops.length ? Math.max(...pops) : null,
      cover: `${String(Math.min(...hrs) % 24).padStart(2, "0")}–${String(Math.max(...hrs) % 24).padStart(2, "0")}h`,
    }];
  });
  const useParts = segments.length >= 2;
  const nextHours = hours.slice(0, 6);

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
          <AnimatedWx icon={CurIcon} kind={curKind} size={42} className="intel-wx__hero-icon" />
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
              className="intel-wx__dayview"
              role="tabpanel"
            >
              {useParts ? (
                <>
                  <div className="intel-wx__plist">
                    {segments.map((seg) => {
                      const [PIcon, PKind] = wx(seg.iconV);
                      return (
                        <motion.div key={seg.key} className="intel-wx__pl" variants={STAGGER_ITEM}>
                          <span className="intel-wx__pl-side">
                            <strong>{seg.label}</strong>
                            <small>{seg.cover}</small>
                          </span>
                          <AnimatedWx icon={PIcon} kind={PKind} size={26} className="intel-wx__pl-icon" />
                          <span className="intel-wx__pl-temp">
                            {Math.round(seg.lo)}–{Math.round(seg.hi)}°
                          </span>
                          <span className="intel-wx__pl-cond">{KIND_WORD[PKind]}</span>
                          <span className={`intel-wx__pop ${seg.pop !== null && seg.pop > 0 ? "" : "is-nil"}`}>
                            <Droplets size={12} aria-hidden="true" />
                            {seg.pop !== null ? `${seg.pop}%` : "—"}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                  {nextHours.length > 0 && (
                    <div className="intel-wx__next">
                      <span className="intel-wx__next-label">Next</span>
                      {nextHours.map((h, i) => {
                        const [HIcon, HKind] = wx(h.icon);
                        const hp = pct(h.precipChance);
                        return (
                          <motion.span key={s(h.time, `h-${i}`)} className="intel-wx__ncell" variants={STAGGER_ITEM}>
                            <span className="intel-wx__ncell-time">{s(h.time, `${i}`)}</span>
                            <AnimatedWx icon={HIcon} kind={HKind} size={19} className="intel-wx__ncell-icon" />
                            <strong className="intel-wx__ncell-temp">{Math.round(n(h.temp, 0))}°</strong>
                            {hp !== null && hp > 0 && (
                              <span className="intel-wx__pop">
                                <Droplets size={10} aria-hidden="true" />
                                {hp}%
                              </span>
                            )}
                          </motion.span>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="intel-wx__hours">
                  {hours.map((h, i) => {
                    const [HIcon, HKind] = wx(h.icon);
                    const hp = pct(h.precipChance);
                    return (
                      <motion.div key={s(h.time, `h-${i}`)} className="intel-wx__hour" variants={STAGGER_ITEM}>
                        <span className="intel-wx__hour-time">{s(h.time, `${i}`)}</span>
                        <AnimatedWx icon={HIcon} kind={HKind} size={18} className="intel-wx__hour-icon" />
                        <strong className="intel-wx__hour-temp">{Math.round(n(h.temp, 0))}°</strong>
                        <span className={`intel-wx__pop ${hp !== null && hp > 0 ? "" : "is-nil"}`}>
                          <Droplets size={10} aria-hidden="true" />
                          {hp !== null ? `${hp}%` : "—"}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
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
                const [DIcon] = wx(d.icon);
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
