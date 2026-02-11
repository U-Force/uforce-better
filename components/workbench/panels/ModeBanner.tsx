"use client";

import React from "react";
import { COLORS, FONTS, FONT_SIZES, RADIUS } from "../../../lib/workbench/theme";
import type { PlantMode } from "../WorkbenchContext";

interface ModeBannerProps {
  mode: PlantMode;
  tripActive: boolean;
  tripReason: string | null;
}

const MODE_CONFIG: Record<PlantMode, { label: string; color: string; bg: string }> = {
  normal: { label: "NORMAL OPERATION", color: COLORS.emerald, bg: COLORS.emeraldBgLight },
  abnormal: { label: "ABNORMAL CONDITION", color: COLORS.amber, bg: COLORS.amberBg },
  emergency: { label: "EMERGENCY", color: COLORS.red, bg: COLORS.redBg },
};

export default function ModeBanner({ mode, tripActive, tripReason }: ModeBannerProps) {
  const effectiveMode = tripActive ? "emergency" : mode;
  const cfg = MODE_CONFIG[effectiveMode];

  return (
    <div
      style={{
        padding: "6px 12px",
        background: cfg.bg,
        borderRadius: RADIUS.md,
        border: `1px solid ${cfg.color}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        ...(tripActive ? { animation: "blink 1s infinite" } : {}),
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: cfg.color,
          ...(tripActive ? { animation: "blink 0.5s infinite" } : {}),
        }}
      />
      <span
        style={{
          fontSize: FONT_SIZES.sm,
          fontWeight: 700,
          letterSpacing: "1.5px",
          color: cfg.color,
          fontFamily: FONTS.sans,
        }}
      >
        {tripActive ? `REACTOR TRIP: ${tripReason}` : cfg.label}
      </span>
    </div>
  );
}
