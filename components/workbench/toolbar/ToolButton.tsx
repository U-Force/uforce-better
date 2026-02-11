"use client";

import React from "react";
import { COLORS, FONTS, FONT_SIZES, RADIUS } from "../../../lib/workbench/theme";

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  variant?: "default" | "danger";
}

export default function ToolButton({
  icon,
  label,
  active = false,
  onClick,
  variant = "default",
}: ToolButtonProps) {
  const isDanger = variant === "danger";

  const bg = active
    ? isDanger ? "rgba(239, 68, 68, 0.25)" : COLORS.emeraldBgStrong
    : COLORS.bgTransparent;

  const border = active
    ? `1px solid ${isDanger ? "rgba(239, 68, 68, 0.5)" : COLORS.borderEmerald}`
    : `1px solid rgba(255, 255, 255, 0.08)`;

  const color = active
    ? isDanger ? COLORS.red : COLORS.emerald
    : COLORS.slate;

  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "5px 10px",
        background: bg,
        border,
        borderRadius: RADIUS.md,
        color,
        fontSize: FONT_SIZES.md,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: FONTS.sans,
        transition: "all 0.15s",
        letterSpacing: "0.3px",
      }}
    >
      <span style={{ fontSize: FONT_SIZES.xl, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
