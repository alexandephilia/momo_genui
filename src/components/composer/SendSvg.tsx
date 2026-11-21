"use client";

import React from "react";

export const SendSvg: React.FC<{ className?: string }> = ({
  className = "w-[17px] h-[17px]",
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path
      d="M12 19V5M12 5L6.5 10.5M12 5L17.5 10.5"
      stroke="currentColor"
      strokeWidth="2.15"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const StopSvg: React.FC<{ className?: string }> = ({
  className = "w-[15px] h-[15px]",
}) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path
      fill="currentColor"
      d="M4.21 17.63C4.21 18.98 5.05 19.79 6.44 19.79H17.56C18.95 19.79 19.79 18.98 19.79 17.63V6.37C19.79 5.03 18.95 4.21 17.56 4.21H6.44C5.05 4.21 4.21 5.03 4.21 6.37Z"
    />
  </svg>
);
