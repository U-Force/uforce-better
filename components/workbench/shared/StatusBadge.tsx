"use client";

import React from "react";
import { STATUS_COLORS, FONTS, FONT_SIZES, RADIUS } from "../../../lib/workbench/theme";

interface StatusBadgeProps {
  label: string;
  status: "normal" | "warning" | "danger" | "info" | "offline";
}

export default function StatusBadge({ label, status }: StatusBadgeProps) {
  const c = STATUS_COLORS[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: RADIUS.md,
        fontSize: FONT_SIZES.sm,
        fontWeight: 700,
        letterSpacing: "0.5px",
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        fontFamily: FONTS.sans,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: c.fg,
          ...(status === "danger" ? { animation: "blink 1s infinite" } : {}),
        }}
      />
      {label}
    </span>
  );
}
