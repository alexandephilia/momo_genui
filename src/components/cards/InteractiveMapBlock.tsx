"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Clock,
  Compass,
  Expand,
  ExternalLink,
  Heart,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import type * as LeafletNS from "leaflet";
import { FullscreenPortalModal } from "@/components/genui/FullscreenPortalModal";
import { EASE_MOMO } from "@/components/motion/MotionPrimitives";
import { useResolvedWebImage } from "@/lib/clientImageCache";
import { buildProxiedImageUrl } from "@/lib/imageAssetContract";
import type { UiInteractionPayload, WorkspaceBoardItem } from "@/types/momo";

export interface InteractiveMapPin {
  name: string;
  lat?: number;
  lng?: number;
  area?: string;
  address?: string;
  category?: string;
  note?: string;
  time?: string;
  rating?: string | number;
  price?: string;
  status?: string;
  imageQuery?: string;
  imageUrl?: string;
  prompt?: string;
}

interface ResolvedMapPin extends InteractiveMapPin {
  lat: number;
  lng: number;
}

export interface InteractiveMapBlockProps {
  title?: string;
  subtitle?: string;
  pins: InteractiveMapPin[];
  connectRoute?: boolean;
  height?: number;
  partId?: string;
  blockId?: string;
  onPromptAction?: (prompt: string) => void;
  onUiInteraction?: (interaction: UiInteractionPayload) => void;
  pinnedTitles?: Set<string>;
  onTogglePinItem?: (item: Omit<WorkspaceBoardItem, "id" | "columnId">) => void;
}

function buildCleanMapPinImageQuery(
  pin: InteractiveMapPin | null,
  _contextHint?: string,
): string | undefined {
  if (!pin) return undefined;
  const rawBase = (pin.imageQuery || pin.name || "").trim();
  if (!rawBase) return undefined;

  // Strip tactical/logistical words ("Safe Pickup Zone", "Drop-off", "West Gate", "Pintu Barat")
  // that pollute web image search or hide the actual landmark name.
  const stripped = rawBase
    .replace(
      /\b(?:safe\s+pickup(?:\s+zone|\s+point|\s+area)?|pickup(?:\s+zone|\s+point|\s+area)?|drop\s*-?\s*off(?:\s+zone|\s+point)?|titik\s+(?:jemput|kumpul|temu|evakuasi|ojol)|zona\s+(?:aman|jemput|evakuasi|ojol)|jalur\s+evakuasi|pintu\s+(?:masuk|keluar|barat|timur|utara|selatan)|(?:west|east|north|south|main|exit|entry)\s+gate|ojol|grab|gojek)\b/gi,
      " ",
    )
    .replace(/[()[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const areaClean = (pin.area || "")
    .replace(/\b(?:pickup|drop\s*-?\s*off|ojol|evakuasi|safe\s+zone)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const subject = stripped.length >= 3 ? stripped : areaClean;
  if (!subject) return undefined;

  // Expand well-known shorthand landmarks for accurate exterior photography
  const expandedSubject = /\bjis\b/i.test(subject)
    ? subject.replace(/\bjis\b/gi, "Jakarta International Stadium")
    : /\bgbk\b/i.test(subject)
      ? subject.replace(/\bgbk\b/gi, "Gelora Bung Karno Stadium")
      : subject;

  return [
    expandedSubject,
    areaClean && !expandedSubject.toLowerCase().includes(areaClean.toLowerCase()) ? areaClean : "",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
function hasValidCoords(p?: InteractiveMapPin | null): p is ResolvedMapPin {
  if (!p) return false;
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return true;
}

interface OsrmRouteData {
  coordinates: Array<[number, number]>;
  distanceKm: number;
  durationMin: number;
  legs: Array<{ distanceKm: number; durationMin: number }>;
}

const clientGeocodeCache = new Map<string, { lat: number; lng: number } | null>();
const clientRouteCache = new Map<string, OsrmRouteData | null>();

function buildGeocodeQuery(pin: InteractiveMapPin, contextHint?: string): string {
  const hintParts = [pin.name, pin.area || pin.address || contextHint || ""]
    .map((s) => s.trim())
    .filter(Boolean);
  return hintParts.join(", ");
}

function haversineKm(a: ResolvedMapPin, b: ResolvedMapPin): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.theme === "dark";
}

const OSM_TILE_SOURCES = [
  {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    subdomains: "abc",
  },
  {
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors, HOT",
    subdomains: "abc",
  },
] as const;

interface LeafletCanvasProps {
  pins: ResolvedMapPin[];
  selectedIdx: number;
  connectRoute: boolean;
  routePath?: Array<[number, number]>;
  height: number | string;
  onSelectPin: (idx: number) => void;
  isFullscreen?: boolean;
  onOpenFullscreen?: () => void;
}

const LeafletMapCanvas: React.FC<LeafletCanvasProps> = ({
  pins,
  selectedIdx,
  height,
  onSelectPin,
  isFullscreen = false,
  onOpenFullscreen,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const leafletRef = useRef<typeof LeafletNS | null>(null);
  const tileLayerRef = useRef<LeafletNS.TileLayer | null>(null);
  const markersRef = useRef<LeafletNS.Marker[]>([]);
  const onSelectRef = useRef(onSelectPin);
  onSelectRef.current = onSelectPin;
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const fittedSigRef = useRef<string>("");
  const userSelectedRef = useRef<number>(selectedIdx);

  const [dark, setDark] = useState(isDarkTheme);
  const [mapReady, setMapReady] = useState(false);

  const pinsCoordSig = useMemo(
    () => pins.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|"),
    [pins]
  );

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(isDarkTheme());
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  const fitMapToCurrentPins = useCallback(
    (L: typeof LeafletNS, map: LeafletNS.Map, animate = true) => {
      const current = pinsRef.current;
      if (current.length === 0) return;
      if (current.length === 1) {
        map.setView([current[0].lat, current[0].lng], 14, { animate });
        return;
      }
      const pts = current.map((p) => [p.lat, p.lng] as [number, number]);
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds, {
        padding: [42, 42],
        maxZoom: 15,
        animate,
      });
    },
    []
  );

  // Initialize Leaflet ONCE per canvas mount (never recreate while streaming pins)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let dead = false;
    let rafId = 0;
    let resizeTimer = 0;

    void import("leaflet").then((mod) => {
      if (dead || !containerRef.current) return;
      const L = (mod.default ?? mod) as typeof LeafletNS;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: isFullscreen,
      });
      mapRef.current = map;

      let sourceIdx = 0;
      let tileErrors = 0;
      const attachTileLayer = (idx: number) => {
        const cfg = OSM_TILE_SOURCES[idx] || OSM_TILE_SOURCES[0];
        if (tileLayerRef.current) {
          map.removeLayer(tileLayerRef.current);
        }
        const nextLayer = L.tileLayer(cfg.url, {
          attribution: cfg.attribution,
          maxZoom: 19,
          subdomains: cfg.subdomains,
        });
        nextLayer.on("tileerror", () => {
          tileErrors += 1;
          if (tileErrors >= 3 && sourceIdx + 1 < OSM_TILE_SOURCES.length) {
            sourceIdx += 1;
            tileErrors = 0;
            attachTileLayer(sourceIdx);
          }
        });
        nextLayer.addTo(map);
        tileLayerRef.current = nextLayer;
      };
      attachTileLayer(0);

      fitMapToCurrentPins(L, map, false);
      fittedSigRef.current = pinsRef.current
        .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
        .join("|");
      setMapReady(true);

      rafId = window.requestAnimationFrame(() => {
        if (!dead && mapRef.current) {
          mapRef.current.invalidateSize();
          fitMapToCurrentPins(L, mapRef.current, false);
        }
      });

      resizeTimer = window.setTimeout(() => {
        if (!dead && mapRef.current) {
          mapRef.current.invalidateSize();
          fitMapToCurrentPins(L, mapRef.current, false);
        }
      }, 220);
    });

    return () => {
      dead = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      setMapReady(false);
      fittedSigRef.current = "";
      markersRef.current = [];
      tileLayerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [fitMapToCurrentPins, isFullscreen]);

  // Render numbered pins without overlay connector lines; re-fit bounds ONLY when pin coordinates change
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    pins.forEach((pin, idx) => {
      const isSelected = idx === selectedIdx;
      const icon = L.divIcon({
        className: "momo-leaflet-marker-wrap",
        html: `<div class="momo-leaflet-pin${isSelected ? " is-selected" : ""}"><span>${idx + 1}</span></div>`,
        iconSize: isSelected ? [32, 32] : [26, 26],
        iconAnchor: isSelected ? [16, 16] : [13, 13],
      });

      const marker = L.marker([pin.lat, pin.lng], {
        icon,
        zIndexOffset: isSelected ? 500 : 100 + idx,
      })
        .addTo(map)
        .bindTooltip(pin.name, {
          direction: "top",
          offset: [0, -14],
          className: "momo-leaflet-tooltip",
        });

      marker.on("click", () => {
        onSelectRef.current(idx);
      });

      markersRef.current.push(marker);
    });

    if (pinsCoordSig && fittedSigRef.current !== pinsCoordSig) {
      fittedSigRef.current = pinsCoordSig;
      map.invalidateSize();
      fitMapToCurrentPins(L, map, false);
    }
  }, [pins, pinsCoordSig, selectedIdx, mapReady, fitMapToCurrentPins]);

  // Pan smoothly ONLY when the user selects a different pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (userSelectedRef.current === selectedIdx) return;
    userSelectedRef.current = selectedIdx;
    const target = pins[selectedIdx];
    if (!target) return;
    const currentZoom = map.getZoom();
    map.flyTo([target.lat, target.lng], Math.max(currentZoom, pins.length === 1 ? 14 : 13), {
      duration: 0.45,
    });
  }, [selectedIdx, pins, mapReady]);

  // Keep Leaflet sizing accurate if container resizes (e.g. skeleton reveal -> visible)
  useEffect(() => {
    const el = containerRef.current;
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!el || !map || !L || typeof ResizeObserver === "undefined") return;
    let hadSize = el.clientWidth > 0 && el.clientHeight > 0;
    const ro = new ResizeObserver(() => {
      const nowHasSize = el.clientWidth > 0 && el.clientHeight > 0;
      map.invalidateSize();
      if (!hadSize && nowHasSize) {
        hadSize = true;
        fitMapToCurrentPins(L, map, false);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady, fitMapToCurrentPins]);

  return (
    <div
      className={`momo-map-canvas momo-map-canvas--leaflet${dark ? " is-dark" : ""}${isFullscreen ? " is-fullscreen" : ""}`}
      style={{ height }}
    >
      <div ref={containerRef} className="momo-leaflet-root" />

      <div className="momo-map-controls">
        <button
          type="button"
          className="gu-icon-btn"
          aria-label="Perbesar peta"
          title="Perbesar peta"
          onClick={() => mapRef.current?.zoomIn()}
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          className="gu-icon-btn"
          aria-label="Perkecil peta"
          title="Perkecil peta"
          onClick={() => mapRef.current?.zoomOut()}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          className="gu-icon-btn"
          aria-label="Reset posisi peta"
          title="Paskan semua titik"
          onClick={() => {
            if (leafletRef.current && mapRef.current) {
              fitMapToCurrentPins(leafletRef.current, mapRef.current, true);
            }
          }}
        >
          <LocateFixed size={14} />
        </button>
        {!isFullscreen && onOpenFullscreen && (
          <button
            type="button"
            className="gu-icon-btn"
            aria-label="Buka peta layar penuh"
            title="Layar penuh"
            onClick={onOpenFullscreen}
          >
            <Expand size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export const InteractiveMapBlock: React.FC<InteractiveMapBlockProps> = ({
  title,
  subtitle,
  pins,
  connectRoute = true,
  height = 330,
  partId,
  blockId,
  onPromptAction,
  onUiInteraction,
  pinnedTitles,
  onTogglePinItem,
}) => {
  const rawPins = useMemo(
    () =>
      (Array.isArray(pins) ? pins : []).filter(
        (p) => p && typeof p.name === "string" && p.name.trim().length > 0
      ),
    [pins]
  );

  const contextHint = useMemo(() => {
    const combined = `${title || ""} ${subtitle || ""}`.trim();
    return combined.length > 0 && combined.length <= 64 ? combined : "";
  }, [title, subtitle]);

  const [geoVersion, setGeoVersion] = useState(0);
  const [geocoding, setGeocoding] = useState(false);

  // `pins` arrives as a fresh array every render — key effects on a content
  // signature so geocode/route fetches don't refire in a loop.
  const pinsSig = rawPins
    .map((p) =>
      [p.name, p.lat ?? "", p.lng ?? "", p.area ?? "", p.address ?? ""]
        .join("|")
        .toLowerCase()
    )
    .join(";");
  const rawPinsRef = useRef(rawPins);
  rawPinsRef.current = rawPins;

  useEffect(() => {
    const currentPins = rawPinsRef.current;
    const missing = currentPins.filter((p) => {
      if (hasValidCoords(p)) return false;
      const q = buildGeocodeQuery(p, contextHint).toLowerCase();
      return Boolean(q) && !clientGeocodeCache.has(q);
    });
    if (missing.length === 0) return;

    let dead = false;
    const queries = Array.from(
      new Set(missing.map((p) => buildGeocodeQuery(p, contextHint)))
    );
    setGeocoding(true);
    fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries }),
      signal: AbortSignal.timeout(30000),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Geocode failed"))))
      .then((data: { results?: Record<string, { lat: number; lng: number } | null> }) => {
        if (dead) return;
        const mapResults = data.results || {};
        for (const q of queries) {
          const hit = mapResults[q];
          clientGeocodeCache.set(
            q.toLowerCase(),
            hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)
              ? { lat: hit.lat, lng: hit.lng }
              : null
          );
        }
        setGeoVersion((v) => v + 1);
      })
      .catch(() => {
        // Leave unset so pins with existing coordinates remain intact
      })
      .finally(() => {
        if (!dead) setGeocoding(false);
      });

    return () => {
      dead = true;
    };
  }, [pinsSig, contextHint]);

  const validPins = useMemo<ResolvedMapPin[]>(() => {
    void geoVersion;
    const resolved: ResolvedMapPin[] = [];
    for (const p of rawPins) {
      if (hasValidCoords(p)) {
        resolved.push({ ...p, lat: Number(p.lat), lng: Number(p.lng) });
        continue;
      }
      const q = buildGeocodeQuery(p, contextHint).toLowerCase();
      const cached = clientGeocodeCache.get(q);
      if (cached) {
        resolved.push({ ...p, lat: cached.lat, lng: cached.lng });
      }
    }
    return resolved;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rawPins is derived from pinsSig
  }, [pinsSig, contextHint, geoVersion]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [localPinned, setLocalPinned] = useState<Set<string>>(() => new Set());

  const safeIdx = selectedIdx < validPins.length ? selectedIdx : 0;
  const activePin = validPins[safeIdx] || null;
  const [pinDirectFailed, setPinDirectFailed] = useState(false);

  useEffect(() => {
    setPinDirectFailed(false);
  }, [activePin?.imageUrl, safeIdx]);

  const { imageUrl: resolvedPinThumb, candidateUrls: pinCandidates } = useResolvedWebImage({
    src: pinDirectFailed ? undefined : activePin?.imageUrl,
    query: buildCleanMapPinImageQuery(activePin, contextHint),
    alt: activePin?.name,
    enabled: Boolean(activePin),
  });

  const pinThumbQueue = useMemo(() => {
    const directs: string[] = [];
    const proxies: string[] = [];
    const seen = new Set<string>();
    const add = (u?: string) => {
      if (!u || seen.has(u)) return;
      seen.add(u);
      directs.push(u);
      if (/^https?:\/\//i.test(u) && !u.startsWith("/api/image")) {
        const p = buildProxiedImageUrl(u);
        if (!seen.has(p)) {
          seen.add(p);
          proxies.push(p);
        }
      }
    };
    if (resolvedPinThumb) add(resolvedPinThumb);
    for (const c of pinCandidates) add(c);
    return [...directs, ...proxies];
  }, [resolvedPinThumb, pinCandidates]);

  const [thumbIdx, setThumbIdx] = useState(0);
  const [thumbHidden, setThumbHidden] = useState(false);
  const pinThumbSig = pinThumbQueue.join("|");
  useEffect(() => {
    setThumbIdx(0);
    setThumbHidden(false);
  }, [pinThumbSig, safeIdx]);
  const activeThumbSrc = !thumbHidden ? pinThumbQueue[thumbIdx] : undefined;

  const [routeVersion, setRouteVersion] = useState(0);
  const validCoordSig = useMemo(
    () => validPins.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(";"),
    [validPins]
  );

  useEffect(() => {
    if (!connectRoute || validPins.length < 2 || !validCoordSig) return;
    if (clientRouteCache.has(validCoordSig)) return;

    let dead = false;
    fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "route",
        points: validPins.map((p) => ({ lat: p.lat, lng: p.lng })),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { route?: OsrmRouteData | null } | null) => {
        if (dead || !data) return;
        clientRouteCache.set(validCoordSig, data.route || null);
        setRouteVersion((v) => v + 1);
      })
      .catch(() => {
        // Fallback smoothly to Haversine direct line
      });

    return () => {
      dead = true;
    };
  }, [connectRoute, validCoordSig, validPins]);

  const osrmRoute = useMemo(() => {
    void routeVersion;
    if (!connectRoute || !validCoordSig) return null;
    return clientRouteCache.get(validCoordSig) || null;
  }, [connectRoute, validCoordSig, routeVersion]);

  const routeMetrics = useMemo(() => {
    if (osrmRoute && osrmRoute.legs.length > 0) {
      return {
        totalKm: osrmRoute.distanceKm,
        durationMin: osrmRoute.durationMin,
        legKm: osrmRoute.legs.map((l) => l.distanceKm),
        legMin: osrmRoute.legs.map((l) => l.durationMin),
        isRoad: true,
      };
    }
    let totalKm = 0;
    const legKm: number[] = [];
    for (let i = 1; i < validPins.length; i++) {
      const d = haversineKm(validPins[i - 1], validPins[i]);
      legKm.push(d);
      totalKm += d;
    }
    return {
      totalKm,
      durationMin: 0,
      legKm,
      legMin: [] as number[],
      isRoad: false,
    };
  }, [validPins, osrmRoute]);

  const dispatchAction = (pin: InteractiveMapPin) => {
    const prompt =
      pin.prompt ||
      `Jelaskan detail rute, jam terbaik, dan rekomendasi praktis di sekitar ${pin.name}.`;
    if (onUiInteraction) {
      onUiInteraction({
        partId,
        blockId,
        blockType: "map",
        action: "select_pin",
        label: pin.name,
        value: { lat: pin.lat, lng: pin.lng },
        prompt,
      });
    } else if (onPromptAction) {
      onPromptAction(prompt);
    }
  };

  if (rawPins.length === 0) return null;

  if (validPins.length === 0) {
    return (
      <div className="momo-map-wrap">
        {(title || subtitle) && (
          <div className="momo-map-head">
            <div style={{ minWidth: 0 }}>
              {title && <h4 className="momo-map-title">{title}</h4>}
              {subtitle && <p className="momo-map-sub">{subtitle}</p>}
            </div>
            <span className="momo-map-span">
              {geocoding ? "Mem-pinpoint lokasi…" : `${rawPins.length} lokasi`}
            </span>
          </div>
        )}
        <div
          className="momo-map-canvas momo-map-canvas--loading"
          style={{ height: Math.max(260, Math.min(440, height || 330)) }}
        >
          <span>{geocoding ? "Mencari koordinat titik otomatis…" : "Koordinat titik tidak ditemukan."}</span>
        </div>
      </div>
    );
  }

  const mapHeight = Math.max(260, Math.min(440, height || 330));

  const renderDrawer = () => {
    if (!activePin) return null;
    const pinKey = activePin.name.trim().toLowerCase();
    const isPinned = pinnedTitles ? pinnedTitles.has(pinKey) : localPinned.has(pinKey);
    const prevPin = safeIdx > 0 ? validPins[safeIdx - 1] : null;
    const legKm = safeIdx > 0 ? routeMetrics.legKm[safeIdx - 1] : undefined;
    const legMin = safeIdx > 0 ? routeMetrics.legMin[safeIdx - 1] : undefined;
    const ratingStr =
      activePin.rating !== undefined && activePin.rating !== null && String(activePin.rating).trim() !== ""
        ? String(activePin.rating).trim()
        : "";
    const locationLine = activePin.area || activePin.address;

    const handleSaveClick = () => {
      if (onTogglePinItem) {
        onTogglePinItem({
          title: activePin.name,
          subtitle: locationLine || activePin.category || activePin.time,
          handNote: activePin.note,
          metric:
            [activePin.category, ratingStr ? `★ ${ratingStr}` : "", activePin.time]
              .filter(Boolean)
              .join(" · ") || undefined,
          imageUrl: resolvedPinThumb || activePin.imageUrl,
          imageQuery: activePin.imageQuery || activePin.name,
          pin: "heart",
        });
        return;
      }
      setLocalPinned((prev) => {
        const next = new Set(prev);
        if (next.has(pinKey)) next.delete(pinKey);
        else next.add(pinKey);
        return next;
      });
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activePin.name}-${safeIdx}`}
          className="momo-map-drawer"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: EASE_MOMO }}
        >
          <div className="momo-map-drawer-media">
            <span className="momo-map-pin-num">{String(safeIdx + 1).padStart(2, "0")}</span>
            {activeThumbSrc ? (
              <img
                key={activeThumbSrc}
                src={activeThumbSrc}
                alt={activePin.name}
                className="momo-map-pin-thumb"
                referrerPolicy="no-referrer"
                onError={() => {
                  if (thumbIdx + 1 < pinThumbQueue.length) {
                    setThumbIdx((idx) => idx + 1);
                  } else if (activePin.imageUrl && !pinDirectFailed) {
                    setPinDirectFailed(true);
                  } else {
                    setThumbHidden(true);
                  }
                }}
              />
            ) : (
              <div className="momo-map-pin-fallback" aria-hidden="true">
                <MapPin size={20} strokeWidth={1.6} />
              </div>
            )}
          </div>

          <div className="momo-map-drawer-body">
            <div className="momo-map-drawer-top">
              <strong className="momo-map-pin-name">{activePin.name}</strong>
              {(activePin.category || ratingStr || activePin.price || activePin.time || activePin.status) && (
                <div className="momo-map-meta-pills">
                  {activePin.category && (
                    <span className="momo-map-pin-cat">{activePin.category}</span>
                  )}
                  {ratingStr && (
                    <span className="momo-map-pin-chip is-accent">
                      <Star size={10} fill="currentColor" />
                      <span>{ratingStr}</span>
                    </span>
                  )}
                  {activePin.price && (
                    <span className="momo-map-pin-chip">{activePin.price}</span>
                  )}
                  {activePin.time && (
                    <span className="momo-map-pin-time">
                      <Clock size={10} />
                      <span>{activePin.time}</span>
                    </span>
                  )}
                  {activePin.status && (
                    <span className="momo-map-pin-chip">{activePin.status}</span>
                  )}
                </div>
              )}
            </div>

            <div className="momo-map-drawer-sub">
              {locationLine && (
                <span className="momo-map-sub-item">
                  <MapPin size={11} />
                  <span>{locationLine}</span>
                </span>
              )}
              {prevPin && legKm !== undefined && (
                <span className="momo-map-sub-item">
                  <Compass size={11} />
                  <span>
                    {legKm.toFixed(1)} km{legMin ? ` (~${legMin} mnt)` : ""} dari {prevPin.name}
                  </span>
                </span>
              )}
              {!locationLine && !legKm && (
                <span className="momo-map-sub-item is-mono">
                  <Compass size={11} />
                  <span>
                    {activePin.lat.toFixed(4)}, {activePin.lng.toFixed(4)}
                  </span>
                </span>
              )}
            </div>

            {activePin.note && (
              <p className="momo-map-pin-note">{activePin.note}</p>
            )}

            <div className="momo-map-drawer-actions">
              <button
                type="button"
                className="gu-pill-btn momo-map-act-btn is-primary-act"
                onClick={() => dispatchAction(activePin)}
              >
                <Sparkles size={12} />
                <span>Dalami lokasi</span>
                <ArrowUpRight size={12} />
              </button>
              <button
                type="button"
                className={`gu-pill-btn momo-map-act-btn is-pin${isPinned ? " on" : ""}`}
                onClick={handleSaveClick}
              >
                <Heart size={12.5} fill={isPinned ? "currentColor" : "none"} />
                <span>{isPinned ? "Tersimpan" : "Simpan ke Board"}</span>
              </button>
              <a
                className="gu-pill-btn momo-map-act-btn"
                href={`https://www.openstreetmap.org/?mlat=${activePin.lat}&mlon=${activePin.lng}#map=16/${activePin.lat}/${activePin.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>OpenStreetMap</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="momo-map-wrap">
      {(title || subtitle || validPins.length > 0) && (
        <div className="momo-map-head">
          <div style={{ minWidth: 0 }}>
            {title && <h4 className="momo-map-title">{title}</h4>}
            {subtitle && <p className="momo-map-sub">{subtitle}</p>}
          </div>
          <span className="momo-map-span">
            {validPins.length} titik
            {routeMetrics.totalKm > 0
              ? routeMetrics.isRoad && routeMetrics.durationMin > 0
                ? ` · ${routeMetrics.totalKm.toFixed(1)} km (~${routeMetrics.durationMin} mnt)`
                : ` · ~${routeMetrics.totalKm.toFixed(1)} km`
              : ""}
          </span>
        </div>
      )}

      {validPins.length > 1 && (
        <div className="momo-map-stops sc" role="tablist" aria-label="Titik lokasi peta">
          {validPins.map((pin, idx) => (
            <button
              key={`stop-${pin.name}-${idx}`}
              type="button"
              role="tab"
              aria-selected={idx === safeIdx}
              className={`momo-map-stop-pill${idx === safeIdx ? " is-active" : idx < safeIdx ? " is-passed" : ""}`}
              onClick={() => setSelectedIdx(idx)}
              title={pin.name}
            >
              <span className="momo-map-stop-num">{String(idx + 1).padStart(2, "0")}</span>
              <span className="momo-map-stop-name">{pin.name}</span>
              {idx > 0 && routeMetrics.legKm[idx - 1] !== undefined && (
                <span className="momo-map-stop-leg">
                  {routeMetrics.legKm[idx - 1].toFixed(1)} km
                  {routeMetrics.legMin[idx - 1] ? ` · ${routeMetrics.legMin[idx - 1]}m` : ""}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <LeafletMapCanvas
        pins={validPins}
        selectedIdx={safeIdx}
        connectRoute={connectRoute}
        routePath={osrmRoute?.coordinates}
        height={mapHeight}
        onSelectPin={setSelectedIdx}
        onOpenFullscreen={() => setFullscreenOpen(true)}
      />

      {renderDrawer()}

      <FullscreenPortalModal
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        title={title || "Peta Lokasi Interaktif"}
        subtitle={
          validPins.length > 1
            ? routeMetrics.isRoad && routeMetrics.durationMin > 0
              ? `${validPins.length} titik lokasi · Rute jalan ${routeMetrics.totalKm.toFixed(1)} km (~${routeMetrics.durationMin} mnt)`
              : `${validPins.length} titik lokasi · Total jarak ~${routeMetrics.totalKm.toFixed(1)} km`
            : validPins[0]?.name
        }
        variant="map"
      >
        <div className="momo-map-fs-layout">
          {validPins.length > 1 && (
            <div className="momo-map-stops sc">
              {validPins.map((pin, idx) => (
                <button
                  key={`fs-stop-${pin.name}-${idx}`}
                  type="button"
                  className={`momo-map-stop-pill${idx === safeIdx ? " is-active" : idx < safeIdx ? " is-passed" : ""}`}
                  onClick={() => setSelectedIdx(idx)}
                  title={pin.name}
                >
                  <span className="momo-map-stop-num">{String(idx + 1).padStart(2, "0")}</span>
                  <span className="momo-map-stop-name">{pin.name}</span>
                </button>
              ))}
            </div>
          )}
          <LeafletMapCanvas
            pins={validPins}
            selectedIdx={safeIdx}
            connectRoute={connectRoute}
            routePath={osrmRoute?.coordinates}
            height="min(58vh, 560px)"
            onSelectPin={setSelectedIdx}
            isFullscreen
          />
          {renderDrawer()}
        </div>
      </FullscreenPortalModal>
    </div>
  );
};
