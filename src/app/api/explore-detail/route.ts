import { NextResponse } from "next/server";
import { runImageSearch, runWebSearch } from "@/lib/webSearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "").trim();
  const context = (searchParams.get("context") || "").trim();
  const imageQuery = (searchParams.get("imageQuery") || "").trim();

  if (!title) {
    return NextResponse.json(
      { highlights: [], images: [], sources: [] },
      { status: 200 }
    );
  }

  const searchQuery = [title, context].filter(Boolean).join(" ").trim();
  const imgQuery = imageQuery || searchQuery;

  const [webRes, imgRes] = await Promise.all([
    runWebSearch({
      query: searchQuery,
      numResults: 4,
      provider: "auto",
      signal: request.signal,
    }).catch(() => ({
      query: searchQuery,
      providersUsed: [],
      results: [],
      sources: [],
    })),
    runImageSearch({
      query: imgQuery,
      fallbackQuery: title,
      limit: 5,
      signal: request.signal,
    }).catch(() => ({
      query: imgQuery,
      providersUsed: [],
      assets: [],
      sources: [],
    })),
  ]);

  const highlights = webRes.results
    .filter((r) => Boolean(r.title && r.url))
    .slice(0, 4)
    .map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      provider: r.provider,
    }));

  return NextResponse.json(
    {
      title,
      highlights,
      images: imgRes.assets.slice(0, 5),
      sources: webRes.sources.slice(0, 4),
    },
    { status: 200 }
  );
}
