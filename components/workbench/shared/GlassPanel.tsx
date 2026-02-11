"use client";

import React from "react";
import { COLORS, RADIUS, BLUR } from "../../../lib/workbench/theme";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: "default" | "dark" | "accent";
  noPadding?: boolean;
}

const VARIANT_BG: Record<string, string> = {
  default: COLORS.bgMedium,
  dark: COLORS.bgLight,
  accent: COLORS.emeraldBgLight,
};

export default function GlassPanel({
  children,
  style,
  variant = "default",
  noPadding = false,
}: GlassPanelProps) {
  const bg = VARIANT_BG[variant];
  const border =
    variant === "accent"
      ? `1px solid ${COLORS.borderEmerald}`
      : `1px solid ${COLORS.borderSubtle}`;

  return (
    <div
      style={{
        background: bg,
        border,
        borderRadius: RADIUS.xl,
        backdropFilter: BLUR.lg,
        padding: noPadding ? 0 : "12px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
