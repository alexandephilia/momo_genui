import {
  distillVisualSearchQuery,
  extractImageAssetStem,
  isAbstractNonVisualTitle,
  isGenericPlaceholderQuery,
  normalizeImageDedupKey,
} from "@/lib/imageAssetContract";
import { runImageSearch } from "@/lib/webSearch";
import type { WorkspaceBoardItem } from "@/types/momo";

/**
 * Resolves context-verified, non-duplicate photographic URLs for Pinboard items.
 * Never falls back to unfiltered raw Wikimedia hits; abstract/procedural items
 * cleanly omit `imageUrl` so Pinboard renders crisp typographic cards.
 */
export async function hydrateBoardItemsMedia(
  items: WorkspaceBoardItem[],
  contextAnchor?: string,
): Promise<WorkspaceBoardItem[]> {
  const candidatesPerItem = await Promise.all(
    items.map(async (item) => {
      if (item.imageUrl) return { item, candidates: [] };
      const rawQuery = (item.imageQuery || "").trim();
      if (!rawQuery || isGenericPlaceholderQuery(rawQuery)) {
        return { item, candidates: [] };
      }
      if (isAbstractNonVisualTitle(rawQuery) && isAbstractNonVisualTitle(item.title)) {
        return { item, candidates: [] };
      }
      const query = distillVisualSearchQuery(rawQuery, contextAnchor);
      if (!query) return { item, candidates: [] };

      const fallbackTitle = !isAbstractNonVisualTitle(item.title) ? item.title : undefined;
      const out = await runImageSearch({
        query,
        fallbackQuery: fallbackTitle,
        contextAnchor,
        limit: 4,
      }).catch(() => null);

      return { item, candidates: out?.assets || [] };
    }),
  );

  const usedKeys = new Set<string>();
  const registerUsed = (url: string) => {
    usedKeys.add(normalizeImageDedupKey(url));
    usedKeys.add(extractImageAssetStem(url));
  };

  for (const { item } of candidatesPerItem) {
    if (item.imageUrl) registerUsed(item.imageUrl);
  }

  return candidatesPerItem.map(({ item, candidates }) => {
    if (item.imageUrl || candidates.length === 0) return item;
    const pick = candidates.find((a) => {
      const u = a.thumbnailUrl || a.imageUrl;
      if (!u) return false;
      return (
        !usedKeys.has(normalizeImageDedupKey(u)) &&
        !usedKeys.has(extractImageAssetStem(u)) &&
        !usedKeys.has(extractImageAssetStem(a.imageUrl))
      );
    });
    const bestUrl = pick?.thumbnailUrl || pick?.imageUrl;
    if (!bestUrl) return item;
    registerUsed(bestUrl);
    if (pick?.imageUrl) registerUsed(pick.imageUrl);
    return { ...item, imageUrl: bestUrl };
  });
}
