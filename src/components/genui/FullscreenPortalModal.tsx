"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { MH } from "@/components/motion/MotionPrimitives";

export interface FullscreenPortalModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  variant?: "default" | "media" | "map" | "spread";
  children: ReactNode;
}

/**
 * Portals fullscreen UI directly to `document.body` so ancestors with
 * `container-type: size`, `overflow: hidden`, or CSS transforms (e.g. Explore
 * spreads `.sp`) never trap `position: fixed` overlays inside a smaller card.
 */
export const FullscreenPortalModal: React.FC<FullscreenPortalModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  variant = "default",
  children,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`gu-fs-backdrop gu-fs-backdrop--${variant}`}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Tampilan layar penuh"}
      onClick={onClose}
    >
      <div
        className={`gu-fs-shell gu-fs-shell--${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="gu-fs-head">
          <div className="gu-fs-titles">
            {title && <h3 className="gu-fs-title">{title}</h3>}
            {subtitle && <p className="gu-fs-sub">{subtitle}</p>}
          </div>
          <motion.button
            type="button"
            className="gu-icon-btn gu-fs-close"
            whileHover={MH.chip}
            whileTap={MH.tap}
            transition={MH.spring}
            onClick={onClose}
            aria-label="Tutup layar penuh"
            title="Tutup (Esc)"
          >
            <X size={16} />
          </motion.button>
        </header>
        <div className="gu-fs-body sc">{children}</div>
      </div>
    </div>,
    document.body
  );
};
