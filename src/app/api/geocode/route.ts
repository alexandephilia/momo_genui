import { NextResponse } from "next/server";
import { runWebSearch } from "@/lib/webSearch";

export const runtime = "nodejs";

export interface GeocodePoint {
  lat: number;
  lng: number;
  displayName?: string;
}

export interface OsrmRouteLeg {
  distanceKm: number;
  durationMin: number;
}

export interface OsrmRouteResult {
  coordinates: Array<[number, number]>;
  distanceKm: number;
  durationMin: number;
  legs: OsrmRouteLeg[];
}

const geocodeCache = new Map<string, GeocodePoint | null>();
const routeCache = new Map<string, OsrmRouteResult | null>();
const MAX_CACHE_ENTRIES = 400;

function cacheSet<T>(map: Map<string, T>, key: string, val: T) {
  if (map.size >= MAX_CACHE_ENTRIES) {
    const oldest = map.keys().next().value;
    if (oldest) map.delete(oldest);
  }
  map.set(key, val);
}

const LOCATION_ABBREV_RULES: Array<[RegExp, string]> = [
  [/\bastron\b/gi, "Aston"],
  [/\bjis\b/gi, "Jakarta International Stadium"],
  [/\bgbk\b/gi, "Gelora Bung Karno"],
  [/\bmrt\s+hi\b/gi, "Bundaran HI"],
  [/\bscbd\b/gi, "SCBD Jakarta"],
  [/\bpik\b/gi, "Pantai Indah Kapuk Jakarta"],
  [/\bsoetta\b|\bcgk\b/gi, "Bandara Soekarno Hatta"],
  [/\bgambir\b/gi, "Stasiun Gambir Jakarta"],
  [/\bpvJ\b/gi, "Paris Van Java Bandung"],
  [/\bciwalk\b/gi, "Cihampelas Walk Bandung"],
  [/\btsb\b/gi, "Trans Studio Bandung"],
];

function expandQueryVariants(rawQuery: string): string[] {
  const clean = rawQuery
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return [];

  const variants: string[] = [];
  let expanded = clean;
  for (const [re, rep] of LOCATION_ABBREV_RULES) {
    expanded = expanded.replace(re, rep);
  }
  expanded = expanded.replace(/\s+/g, " ").trim();

  if (expanded.toLowerCase() !== clean.toLowerCase()) {
    variants.push(expanded);
  }
  variants.push(clean);

  // Also add simplified punctuation-stripped variant
  const stripped = expanded
    .replace(/[()[\],/|·–—-]+/g, " ")
    .replace(/\b(?:konser|acara|nanti|pergi|ke|dari|menuju|dekat|hotel|stasiun)\b/gi, (m) =>
      // Preserve "Hotel" when part of proper name like "Hotel Aston" unless isolated, actually keep core words if > 3 tokens
      m.toLowerCase() === "hotel" ? "Hotel" : " "
    )
    .replace(/\s+/g, " ")
    .trim();
  if (stripped && !variants.includes(stripped)) {
    variants.push(stripped);
  }
  const words = stripped.split(" ").filter(Boolean);
  if (words.length > 3) {
    const head = words.slice(0, 3).join(" ");
    if (!variants.includes(head)) variants.push(head);
  }
  return variants;
}

async function fetchPhoton(q: string, signal?: AbortSignal): Promise<GeocodePoint | null> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=3`;
    const res = await fetch(url, {
      signal,
      headers: { "User-Agent": "MomoWorkspace/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: {
          name?: string;
          street?: string;
          city?: string;
          state?: string;
          country?: string;
        };
      }>;
    };
    const features = Array.isArray(data.features) ? data.features : [];
    // Prefer Indonesian matches when query looks Indonesian or generic
    const idHit = features.find((f) =>
      String(f.properties?.country || "").toLowerCase().includes("indonesia")
    );
    const chosen = idHit || features[0];
    const coords = chosen?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const label = [
      chosen.properties?.name,
      chosen.properties?.street,
      chosen.properties?.city || chosen.properties?.state,
      chosen.properties?.country,
    ]
      .filter(Boolean)
      .join(", ");
    return { lat, lng, displayName: label || q };
  } catch {
    return null;
  }
}

async function fetchNominatim(q: string, signal?: AbortSignal): Promise<GeocodePoint | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=2&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      signal,
      headers: {
        "User-Agent": "MomoWorkspace/1.0 (https://127.0.0.1:4173)",
        "Accept-Language": "id,en",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const first = Array.isArray(rows) ? rows[0] : null;
    if (!first?.lat || !first?.lon) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      lat,
      lng,
      displayName: typeof first.display_name === "string" ? first.display_name : undefined,
    };
  } catch {
    return null;
  }
}

async function lookupPlacePoint(rawQuery: string, signal?: AbortSignal): Promise<GeocodePoint | null> {
  const clean = rawQuery.trim();
  if (!clean) return null;
  const key = clean.toLowerCase();
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key) ?? null;
  }

  const variants = expandQueryVariants(clean);
  const isId = (pt: GeocodePoint | null): boolean =>
    Boolean(pt?.displayName && /indonesia/i.test(pt.displayName));
  for (const variant of variants) {
    const [photonHit, nomHit] = await Promise.all([
      fetchPhoton(variant, signal),
      fetchNominatim(variant, signal),
    ]);
    const chosen =
      isId(nomHit)
        ? nomHit
        : isId(photonHit)
          ? photonHit
          : nomHit || photonHit;
    if (chosen) {
      cacheSet(geocodeCache, key, chosen);
      return chosen;
    }
  }

  // Web-search disambiguation fallback for misspelled venues / landmarks
  try {
    const web = await runWebSearch({
      query: `${variants[0] || clean} alamat lokasi`,
      numResults: 2,
      provider: "auto",
      signal,
    });
    for (const r of web.results) {
      const candidateTitle = r.title.split(/[-|·—]/)[0]?.trim();
      if (!candidateTitle || candidateTitle.length < 3) continue;
      const hit =
        (await fetchPhoton(candidateTitle, signal)) ||
        (await fetchNominatim(candidateTitle, signal));
      if (hit) {
        cacheSet(geocodeCache, key, hit);
        return hit;
      }
    }
  } catch {
    // Web fallback optional
  }

  cacheSet(geocodeCache, key, null);
  return null;
}

async function lookupDrivingRoute(
  points: Array<{ lat: number; lng: number }>,
  signal?: AbortSignal
): Promise<OsrmRouteResult | null> {
  if (points.length < 2) return null;
  const cacheKey = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(";");
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey) ?? null;
  }

  try {
    const coordsPath = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsPath}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url, {
      signal,
      headers: { "User-Agent": "MomoWorkspace/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: Array<[number, number]> };
        legs?: Array<{ distance?: number; duration?: number }>;
      }>;
    };
    const route = data.routes?.[0];
    const rawCoords = route?.geometry?.coordinates;
    if (!route || !Array.isArray(rawCoords) || rawCoords.length < 2) {
      cacheSet(routeCache, cacheKey, null);
      return null;
    }

    const coordinates: Array<[number, number]> = rawCoords
      .filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
      .map((c) => [Number(c[1]), Number(c[0])]);

    const out: OsrmRouteResult = {
      coordinates,
      distanceKm: Math.round(((Number(route.distance) || 0) / 1000) * 10) / 10,
      durationMin: Math.max(1, Math.round((Number(route.duration) || 0) / 60)),
      legs: (route.legs || []).map((leg) => ({
        distanceKm: Math.round(((Number(leg.distance) || 0) / 1000) * 10) / 10,
        durationMin: Math.max(1, Math.round((Number(leg.duration) || 0) / 60)),
      })),
    };
    cacheSet(routeCache, cacheKey, out);
    return out;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ query: "", point: null }, { status: 200 });
  }
  const point = await lookupPlacePoint(q, request.signal);
  return NextResponse.json({ query: q, point }, { status: 200 });
}

export async function POST(request: Request) {
  let body: {
    mode?: unknown;
    queries?: unknown;
    points?: unknown;
  };
  try {
    body = (await request.json()) as {
      mode?: unknown;
      queries?: unknown;
      points?: unknown;
    };
  } catch {
    return NextResponse.json({ results: {} }, { status: 400 });
  }

  if (body.mode === "route") {
    const rawPoints = Array.isArray(body.points) ? body.points : [];
    const points = rawPoints
      .map((p) => {
        if (!p || typeof p !== "object") return null;
        const rec = p as Record<string, unknown>;
        const lat = Number(rec.lat);
        const lng = Number(rec.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
      })
      .filter((x): x is { lat: number; lng: number } => Boolean(x))
      .slice(0, 12);

    const route = await lookupDrivingRoute(points, request.signal);
    return NextResponse.json({ route }, { status: 200 });
  }

  const rawList = Array.isArray(body.queries) ? body.queries : [];
  const queries = rawList
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, 10);

  const results: Record<string, GeocodePoint | null> = {};
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    const cached = geocodeCache.has(q.toLowerCase());
    results[q] = await lookupPlacePoint(q, request.signal);
    if (!cached && i + 1 < queries.length) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  return NextResponse.json({ results }, { status: 200 });
}
