"use client";

import React from "react";
import { ICON_INSETS, ICON_PATHS } from "@/data/icons";

export interface MomoIconProps {
  name: string;
  size?: number;
  className?: string;
}

export const MomoIcon: React.FC<MomoIconProps> = ({ name, size = 24, className = "" }) => {
  const entry = ICON_PATHS[name];
  if (!entry) return null;
  const inset = ICON_INSETS[name] ?? 0;
  const paths = Array.isArray(entry) ? entry : [entry];

  return (
    <svg
      className={`ic ${className}`.trim()}
      data-ic={name}
      style={
        {
          "--in": `${inset}px`,
          "--s": `${size}px`,
        } as React.CSSProperties
      }
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths.map((item, idx) =>
        typeof item === "string" ? (
          <path key={idx} d={item} />
        ) : (
          <path key={idx} className="solid" d={item.fill} />
        )
      )}
    </svg>
  );
};
