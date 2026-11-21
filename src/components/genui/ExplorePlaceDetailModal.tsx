"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Heart, MapPin, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { InteractiveMapBlock } from "@/components/cards/InteractiveMapBlock";
import { buildProxiedImageUrl, type NormalizedImageAsset } from "@/lib/imageAssetContract";
import { EASE_MOMO, MH } from "@/components/motion/MotionPrimitives";
import {
  BoardStickerOverlay,
  boardTitleKey,
  useBoardItemStates,
} from "./BoardSticker";
import type { WorkspaceBoardItem } from "@/types/momo";

export interface ExploreDetailTarget {
  title: string;
  subtitle?: string;
  body?: string;
  note?: string;
  tag?: string;
  meta?: string;
  area?: string;
  image?: string;
  imageQuery?: string;
  prompt?: string;
  lat?: number;
  lng?: number;
}

interface HighlightRow {
  title: string;
  url: string;
  snippet: string;
  provider: string;
}

export interface ExplorePlaceDetailModalProps {
  item: ExploreDetailTarget | null;
  onClose: () => void;
  onAskMomo: (prompt: string) => void;
  pinnedTitles?: Set<string>;
  onTogglePinItem?: (item: Omit<WorkspaceBoardItem, "id" | "columnId">) => void;
}

const PhotoTile: React.FC<{
  asset: NormalizedImageAsset;
  alt: string;
  className?: string;
}> = ({ asset, alt, className = "" }) => {
  const candidates = useMemo(() => {
    const out: string[] = [];
    const push = (u?: string) => {
      if (u && !out.includes(u)) out.push(u);
    };
    push(asset.imageUrl);
    if (asset.imageUrl && /^https?:\/\//i.test(asset.imageUrl)) {
      push(buildProxiedImageUrl(asset.imageUrl));
    }
    push(asset.thumbnailUrl);
    return out;
  }, [asset]);

  const [idx, setIdx] = useState(0);
  const src = candidates[idx];
  if (!src) return null;

  return (
    <div className={`sp-detail-photo-cell ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => {
          if (idx + 1 < candidates.length) {
            setIdx((i) => i + 1);
          } else {
            setIdx(candidates.length);
          }
        }}
      />
    </div>
  );
};

export const ExplorePlaceDetailModal: React.FC<ExplorePlaceDetailModalProps> = ({
  item,
  onClose,
  onAskMomo,
  pinnedTitles,
  onTogglePinItem,
}) => {
  const boardStickers = useBoardItemStates();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [images, setImages] = useState<NormalizedImageAsset[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  useEffect(() => {
    if (!item) return;
    const ctrl = new AbortController();
    setLoading(true);
    setHighlights([]);

    const seedAsset: NormalizedImageAsset[] = item.image
      ? [
          {
            id: "seed-img",
            imageUrl: item.image,
            sourceUrl: item.image,
            alt: item.title,
            provider: "bound",
            status: "resolved",
          },
        ]
      : [];
    setImages(seedAsset);

    const params = new URLSearchParams({
      title: item.title,
      ...(item.area || item.subtitle ? { context: item.area || item.subtitle || "" } : {}),
      ...(item.imageQuery ? { imageQuery: item.imageQuery } : {}),
    });

    fetch(`/api/explore-detail?${params.toString()}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("detail fetch failed"))))
      .then((data: { highlights?: HighlightRow[]; images?: NormalizedImageAsset[] }) => {
        if (ctrl.signal.aborted) return;
        setHighlights(Array.isArray(data.highlights) ? data.highlights : []);
        const fetched = Array.isArray(data.images) ? data.images : [];
        const merged = [...seedAsset];
        const seen = new Set(merged.map((m) => m.imageUrl));
        for (const a of fetched) {
          if (a.imageUrl && !seen.has(a.imageUrl)) {
            seen.add(a.imageUrl);
            merged.push(a);
          }
        }
        setImages(merged.slice(0, 5));
      })
      .catch(() => {
        // Seed info remains visible cleanly
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [item]);

  const mapPins = useMemo(
    () =>
      item
        ? [
            {
              name: item.title,
              area: item.area || undefined,
              lat: item.lat,
              lng: item.lng,
              note: item.note,
              category: item.tag,
              imageUrl: item.image,
              imageQuery: item.imageQuery || item.title,
            },
          ]
        : [],
    [item]
  );

  if (!mounted || typeof document === "undefined") return null;

  const isPinned = item
    ? Boolean(pinnedTitles?.has(item.title.trim().toLowerCase()))
    : false;

  const quickActions = item
    ? [
        `Rute terbaik dan estimasi biaya ke ${item.title}`,
        `Jam terbaik berkunjung dan hal wajib dicoba di ${item.title}`,
        `Rekomendasi tempat terdekat di sekitar ${item.title}`,
      ]
    : [];

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          className="gu-fs-backdrop"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_MOMO }}
          onClick={onClose}
        >
          <motion.div
            className="sp-detail-sheet sc"
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ duration: 0.24, ease: EASE_MOMO }}
            onClick={(e) => e.stopPropagation()}
          >
            <BoardStickerOverlay
              state={boardStickers.get(boardTitleKey(item.title))}
            />
            <header className="sp-detail-head">
              <div className="sp-detail-head__copy">
                <div className="sp-detail-chips">
                  {item.tag && <span className="gu-tag">{item.tag}</span>}
                  {item.meta && <span className="sp-detail-meta">{item.meta}</span>}
                </div>
                <h1 className="momo-serif sp-detail-title">{item.title}</h1>
                {item.subtitle && (
                  <p className="sp-detail-sub">{item.subtitle}</p>
                )}
              </div>

              <div className="sp-detail-head__actions">
                {onTogglePinItem && (
                  <motion.button
                    type="button"
                    className={`gu-pill-btn${isPinned ? " is-active" : ""}`}
                    whileHover={MH.chip}
                    whileTap={MH.tap}
                    transition={MH.spring}
                    onClick={() =>
                      onTogglePinItem({
                        title: item.title,
                        subtitle: item.subtitle || item.tag,
                        handNote: item.note || item.body,
                        metric: item.meta,
                        imageUrl: images[0]?.imageUrl || item.image,
                        imageQuery: item.imageQuery || item.title,
                        pin: "heart",
                      })
                    }
                  >
                    <Heart size={13} fill={isPinned ? "currentColor" : "none"} />
                    <span>{isPinned ? "Tersimpan" : "Simpan ke Board"}</span>
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  className="gu-pill-btn is-active"
                  whileHover={MH.chip}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  onClick={() => {
                    const p =
                      item.prompt ||
                      `Jabarkan panduan lengkap, jam buka, rute, dan tips untuk "${item.title}".`;
                    onClose();
                    onAskMomo(p);
                  }}
                >
                  <Sparkles size={13} />
                  <span>Dalami</span>
                </motion.button>
                <motion.button
                  type="button"
                  className="gu-icon-btn"
                  whileHover={MH.chip}
                  whileTap={MH.tap}
                  transition={MH.spring}
                  aria-label="Tutup detail"
                  onClick={onClose}
                >
                  <X size={16} />
                </motion.button>
              </div>
            </header>

            {/* OpenUI-style Bento Photo Gallery */}
            {images.length > 0 ? (
              <div
                className="sp-detail-bento"
                data-count={Math.min(5, images.length)}
              >
                {images.slice(0, 5).map((img, i) => (
                  <PhotoTile
                    key={img.id || `${img.imageUrl}-${i}`}
                    asset={img}
                    alt={`${item.title} ${i + 1}`}
                    className={i === 0 ? "is-lead" : ""}
                  />
                ))}
              </div>
            ) : loading ? (
              <div className="sp-detail-bento is-loading">
                <div className="skeleton sp-detail-skel is-lead" />
                <div className="skeleton sp-detail-skel" />
                <div className="skeleton sp-detail-skel" />
              </div>
            ) : null}

            <div className="sp-detail-body">
              <div className="sp-detail-main">
                {item.body && <p className="sp-detail-desc">{item.body}</p>}

                {loading && highlights.length === 0 ? (
                  <div className="sp-detail-highlights">
                    <span className="momo-hand sp-detail-kicker">
                      mengambil info terbaru…
                    </span>
                    <div className="skeleton" style={{ height: 52, borderRadius: 12 }} />
                    <div className="skeleton" style={{ height: 52, borderRadius: 12 }} />
                  </div>
                ) : highlights.length > 0 ? (
                  <div className="sp-detail-highlights">
                    <h3 className="sp-detail-section-title">Sorotan & Referensi</h3>
                    <div className="sp-detail-highlight-list">
                      {highlights.map((hl, i) => (
                        <motion.a
                          key={`${hl.url}-${i}`}
                          href={hl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sp-detail-hl-item"
                          whileHover={MH.card}
                          whileTap={MH.press}
                          transition={MH.spring}
                        >
                          <div className="sp-detail-hl-head">
                            <strong>{hl.title}</strong>
                            <ExternalLink size={12} />
                          </div>
                          {hl.snippet && <p>{hl.snippet}</p>}
                        </motion.a>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="sp-detail-followups">
                  <h3 className="sp-detail-section-title">Eksplorasi Lanjutan</h3>
                  <div className="sp-detail-chips-wrap">
                    {quickActions.map((q) => (
                      <motion.button
                        key={q}
                        type="button"
                        className="gu-pill-btn"
                        whileHover={MH.chip}
                        whileTap={MH.tap}
                        transition={MH.spring}
                        onClick={() => {
                          onClose();
                          onAskMomo(q);
                        }}
                      >
                        {q} ↗
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="sp-detail-side">
                {(item.note || item.area || item.meta) && (
                  <div className="sp-detail-tips-card">
                    <div className="sp-detail-tips-head">
                      <MapPin size={14} />
                      <span>Catatan & Konteks</span>
                    </div>
                    {item.note && <p className="momo-hand sp-detail-note">{item.note}</p>}
                    {item.area && (
                      <div className="sp-detail-kv">
                        <span>Area</span>
                        <strong>{item.area}</strong>
                      </div>
                    )}
                    {item.meta && (
                      <div className="sp-detail-kv">
                        <span>Estimasi</span>
                        <strong>{item.meta}</strong>
                      </div>
                    )}
                  </div>
                )}

                <InteractiveMapBlock
                  title={item.title}
                  subtitle={item.area || item.subtitle}
                  pins={mapPins}
                  connectRoute={false}
                  height={230}
                  onPromptAction={(p) => {
                    onClose();
                    onAskMomo(p);
                  }}
                  pinnedTitles={pinnedTitles}
                  onTogglePinItem={onTogglePinItem}
                />
              </aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
