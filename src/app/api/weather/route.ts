import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function countryCodeToFlag(code?: string): string {
  const clean = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) return "🌍";
  return String.fromCodePoint(
    0x1f1e6 + clean.charCodeAt(0) - 65,
    0x1f1e6 + clean.charCodeAt(1) - 65
  );
}

function decodeWmoWeather(code: number, isDay: boolean): {
  cond: string;
  icon: "sun-cloud" | "breeze" | "sun" | "rain";
} {
  if (code === 0) {
    return { cond: isDay ? "cerah" : "malam cerah", icon: isDay ? "sun" : "breeze" };
  }
  if (code >= 1 && code <= 3) {
    return { cond: code === 1 ? "cerah berawan" : "berawan", icon: "sun-cloud" };
  }
  if (code === 45 || code === 48) {
    return { cond: "berkabut ringan", icon: "breeze" };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 99)) {
    return { cond: code >= 95 ? "hujan badai" : "hujan ringan", icon: "rain" };
  }
  return { cond: "sejuk berangin", icon: "breeze" };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLat = url.searchParams.get("lat");
  const rawLon = url.searchParams.get("lon");
  if (!rawLat || !rawLat.trim() || !rawLon || !rawLon.trim()) {
    return NextResponse.json({ error: "Missing valid lat/lon" }, { status: 400 });
  }
  const lat = Number(rawLat);
  const lon = Number(rawLon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "Missing valid lat/lon" }, { status: 400 });
  }

  try {
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&localityLanguage=id`;

    const [meteoRes, geoRes] = await Promise.all([
      fetch(meteoUrl, { signal: AbortSignal.timeout(4500) }),
      fetch(geoUrl, { signal: AbortSignal.timeout(4500) }).catch(() => null),
    ]);

    if (!meteoRes.ok) {
      return NextResponse.json({ error: "Weather provider failed" }, { status: 502 });
    }

    const meteoJson = (await meteoRes.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        is_day?: number;
      };
    };

    const geoJson = geoRes && geoRes.ok
      ? ((await geoRes.json()) as {
          city?: string;
          locality?: string;
          principalSubdivision?: string;
          countryName?: string;
          countryCode?: string;
        })
      : {};

    const tempVal = Math.round(meteoJson.current?.temperature_2m ?? 26);
    const wmo = decodeWmoWeather(
      meteoJson.current?.weather_code ?? 2,
      (meteoJson.current?.is_day ?? 1) === 1
    );

    const city = geoJson.city || geoJson.locality || geoJson.principalSubdivision || "";
    const country = geoJson.countryName || "";
    const area =
      city && country ? `${city}, ${country}` : city || country || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

    return NextResponse.json({
      temp: `${tempVal}°`,
      tempNum: tempVal,
      cond: wmo.cond,
      icon: wmo.icon,
      flag: countryCodeToFlag(geoJson.countryCode),
      area,
      countryCode: geoJson.countryCode || "",
    });
  } catch {
    return NextResponse.json({ error: "Failed to resolve live weather" }, { status: 502 });
  }
}
