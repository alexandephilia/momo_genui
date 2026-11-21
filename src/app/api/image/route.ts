import { NextResponse } from "next/server";
import {
  isGenericPlaceholderQuery,
  isLikelyImageUrl,
  isSafeExternalHttpsUrl,
  pickSharpDisplayImageUrl,
} from "@/lib/imageAssetContract";
import { runImageSearch } from "@/lib/webSearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/image?q=<semantic query>&limit=<1..10>
 * OR
 * GET /api/image?proxy=1&url=<https image URL>
 *
 * Resolves real, verified web images or safely proxies hotlink-restricted HTTPS
 * images after strict SSRF and Content-Type checks.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const proxy = searchParams.get("proxy") === "1";

  if (proxy) {
    const target = searchParams.get("url")?.trim() || "";
    if (!isSafeExternalHttpsUrl(target)) {
      return NextResponse.json({ error: "URL gambar tidak valid atau diblokir." }, { status: 400 });
    }
    try {
      let currentUrl = target;
      let upstream: Response | null = null;
      for (let hop = 0; hop < 4; hop++) {
        if (!isSafeExternalHttpsUrl(currentUrl)) {
          return NextResponse.json({ error: "Redirect target diblokir." }, { status: 403 });
        }
        const originHeader = `${new URL(currentUrl).origin}/`;
        const res = await fetch(currentUrl, {
          headers: {
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Referer: originHeader,
          },
          redirect: "manual",
          signal: AbortSignal.timeout(8000),
        });
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("location");
          if (!loc) break;
          currentUrl = new URL(loc, currentUrl).toString();
          continue;
        }
        upstream = res;
        break;
      }
      if (!upstream || !upstream.ok || !upstream.body) {
        return NextResponse.json(
          { error: `Upstream HTTP ${upstream?.status || 502}` },
          { status: 502 }
        );
      }
      const ctype = (upstream.headers.get("content-type") || "").toLowerCase();
      if (!ctype.startsWith("image/") || ctype.includes("svg+xml")) {
        return NextResponse.json({ error: "Resource bukan gambar raster valid." }, { status: 415 });
      }
      const buf = await upstream.arrayBuffer();
      if (buf.byteLength === 0 || buf.byteLength > 8 * 1024 * 1024) {
        return NextResponse.json({ error: "Ukuran gambar di luar batas." }, { status: 413 });
      }
      return new Response(buf, {
        status: 200,
        headers: {
          "Content-Type": ctype.split(";")[0],
          "Cache-Control": "public, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Proxy gambar gagal." },
        { status: 502 }
      );
    }
  }

  const q = searchParams.get("q")?.trim();
  if (!q || q.length > 200) {
    return NextResponse.json({ error: "Query wajib diisi (maks 200 karakter)." }, { status: 400 });
  }
  if (isGenericPlaceholderQuery(q)) {
    return NextResponse.json(
      { error: "Query terlalu generik.", query: q, assets: [] },
      { status: 200, headers: { "Cache-Control": "public, max-age=86400" } }
    );
  }
  const fallback = searchParams.get("fallback")?.trim() || undefined;
  const contextAnchor = searchParams.get("ctx")?.trim() || undefined;
  const limitRaw = Number(searchParams.get("limit") || "6");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(10, Math.round(limitRaw))) : 6;

  try {
    const out = await runImageSearch({
      query: q,
      fallbackQuery: fallback,
      contextAnchor,
      limit,
    });
    const primary = out.assets.find((a) => isLikelyImageUrl(pickSharpDisplayImageUrl(a)));
    if (!primary) {
      return NextResponse.json(
        { error: out.error || "Tidak ada gambar ditemukan.", query: q, assets: [] },
        { status: 200, headers: { "Cache-Control": "public, max-age=600" } }
      );
    }
    const sharpUrl = pickSharpDisplayImageUrl(primary);
    return NextResponse.json(
      {
        url: sharpUrl,
        imageUrl: primary.imageUrl || sharpUrl,
        thumbnailUrl: primary.provider === "wikimedia" ? primary.thumbnailUrl : undefined,
        source: primary.sourceUrl,
        caption: primary.caption,
        provider: primary.provider,
        asset: primary,
        assets: out.assets,
      },
      { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image search gagal." },
      { status: 502 }
    );
  }
}
