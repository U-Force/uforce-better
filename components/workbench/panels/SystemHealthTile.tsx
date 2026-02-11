"use client";

import React from "react";
import { STATUS_COLORS, COLORS, FONT_SIZES, RADIUS } from "../../../lib/workbench/theme";

interface SystemHealthTileProps {
  name: string;
  status: "ok" | "degraded" | "failed" | "na";
}

const HEALTH_LABELS: Record<string, string> = {
  ok: "OK",
  degraded: "DEGR",
  failed: "FAIL",
  na: "N/A",
};

export default function SystemHealthTile({ name, status }: SystemHealthTileProps) {
  const c = STATUS_COLORS[status];
  const label = HEALTH_LABELS[status];

  return (
    <div
      style={{
        padding: "6px 8px",
        background: c.bg,
        borderRadius: RADIUS.md,
        border: `1px solid ${c.fg}30`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: FONT_SIZES.xs,
          color: COLORS.slate,
          fontWeight: 700,
          letterSpacing: "0.5px",
        }}
      >
        {name}
      </span>
      <span
        style={{
          fontSize: FONT_SIZES.xs,
          color: c.fg,
          fontWeight: 700,
          letterSpacing: "1px",
        }}
      >
        {label}
      </span>
    </div>
  );
}
