import fs from "node:fs";
import path from "node:path";
import type { NormalizedImageAsset } from "@/lib/imageAssetContract";

/**
 * Vision reranker: sends the top retrieved image candidates to a Gemini
 * vision model and scores each 0-10 on *visual* relevance to the query +
 * session context. Metadata token-matching cannot tell a generic stock
 * photo from a contextually correct one; this can.
 *
 * Returns null when no usable API key exists or the call fails — callers
 * must treat null as "keep metadata ranking", never as "no images".
 */

const VISION_MODEL = "gemini-3.5-flash-lite";
const MAX_CANDIDATES = 6;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;
const VISION_TIMEOUT_MS = 12000;

function readGeminiApiKeys(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (v: string | undefined) => {
    const clean = (v || "").trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  };

  push(process.env.GEMINI_API_KEY);
  push(process.env.GEMINI_API_KEYS?.split(/[\s,;]+/)[0]);

  try {
    const raw = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (k === "GEMINI_API_KEY") push(v);
      if (k === "GEMINI_API_KEYS") {
        for (const part of v.split(/[\s,;]+/)) push(part);
      }
    }
  } catch {
    // `.env.local` optional
  }
  return out;
}

async function fetchImagePart(
  asset: NormalizedImageAsset,
): Promise<{ mimeType: string; data: string } | null> {
  // Prefer the smaller thumbnail for vision input — same subject, less bytes.
  const url = asset.thumbnailUrl || asset.imageUrl;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    if (!ctype.startsWith("image/") || ctype.includes("svg")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;
    const mimeType = ctype.split(";")[0];
    return {
      mimeType,
      data: Buffer.from(buf).toString("base64"),
    };
  } catch {
    return null;
  }
}

export interface VisionRerankResult {
  assets: NormalizedImageAsset[];
  scoredCount: number;
}

/**
 * Reranks `assets` by actual visual relevance. Assets whose image bytes could
 * not be fetched keep `visionScore: undefined` and sort after scored ones.
 * Never throws — returns null on missing keys or total failure.
 */
export async function rerankAssetsWithVision(
  assets: NormalizedImageAsset[],
  opts: { query: string; contextAnchor?: string; signal?: AbortSignal },
): Promise<VisionRerankResult | null> {
  if (assets.length < 1) return null;
  const keys = readGeminiApiKeys();
  if (keys.length === 0) return null;

  const candidates = assets.slice(0, MAX_CANDIDATES);
  const parts = await Promise.all(
    candidates.map(async (asset) => {
      const img = await fetchImagePart(asset);
      return img ? { asset, img } : null;
    }),
  );
  const usable = parts.filter(
    (p): p is { asset: NormalizedImageAsset; img: { mimeType: string; data: string } } =>
      p !== null,
  );
  if (usable.length < 1) return null;

  const context = (opts.contextAnchor || "").trim();
  const promptText = [
    `Kamu menilai relevansi visual kandidat gambar untuk konteks pencarian.`,
    `Konteks user: "${context || opts.query}"`,
    `Query gambar: "${opts.query}"`,
    ``,
    `Gambar dinomori 1 sampai ${usable.length} sesuai urutan kemunculan.`,
    `Beri skor 0-10 untuk tiap gambar: seberapa cocok SECARA VISUAL dengan subjek/spesifik konteks di atas.`,
    `Foto stok generik yang hanya satu kategori tapi subjeknya salah dapat skor <= 3.`,
    `Logo, diagram, peta, atau screenshot mendapat skor 0.`,
    `Jawab HANYA dengan JSON array berisi ${usable.length} angka, contoh: [8,3,7]`,
  ].join("\n");

  const contents = [
    {
      role: "user",
      parts: [
        { text: promptText },
        ...usable.flatMap((p) => [
          { text: `Gambar ${usable.indexOf(p) + 1}:` },
          { inlineData: { mimeType: p.img.mimeType, data: p.img.data } },
        ]),
      ],
    },
  ];

  const signals = [AbortSignal.timeout(VISION_TIMEOUT_MS)];
  if (opts.signal) signals.push(opts.signal);

  let scores: number[] | null = null;
  for (const key of keys.slice(0, 2)) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.any(signals),
        },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const rawText =
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || "")
          .join("")
          .trim() || "";
      const match = /\[[\d\s,.\-]+\]/.exec(rawText);
      if (!match) continue;
      const parsed = JSON.parse(match[0]) as unknown;
      if (Array.isArray(parsed)) {
        const nums = parsed
          .map((n) => (typeof n === "number" ? n : Number(n)))
          .filter((n) => Number.isFinite(n));
        if (nums.length >= usable.length) {
          scores = nums.slice(0, usable.length);
          break;
        }
      }
    } catch {
      // try next key
    }
  }
  if (!scores) return null;

  const scoredAssets = usable.map((p, i) => ({
    ...p.asset,
    visionScore: Math.max(0, Math.min(10, scores![i])),
  }));
  const scoredIds = new Set(scoredAssets.map((a) => a.id));
  const unscored = candidates
    .filter((a) => !scoredIds.has(a.id))
    .map((a) => ({ ...a, visionScore: undefined }));
  const rest = assets.slice(candidates.length);

  const all = [...scoredAssets, ...unscored, ...rest];
  all.sort((a, b) => (b.visionScore ?? -1) - (a.visionScore ?? -1));
  return { assets: all, scoredCount: usable.length };
}
