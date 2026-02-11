"use client";

import React from "react";
import type { ReactivityComponents } from "../../../lib/reactor/types";
import { COLORS, FONTS, FONT_SIZES, RADIUS } from "../../../lib/workbench/theme";

interface ReactivityPanelProps {
  reactivity: ReactivityComponents;
}

interface ReactivityRow {
  label: string;
  key: keyof ReactivityComponents;
  color: string;
  description: string;
}

const ROWS: ReactivityRow[] = [
  { label: "RODS", key: "rhoExt", color: COLORS.amber, description: "Control rod worth" },
  { label: "DOPPLER", key: "rhoDoppler", color: "#e06040", description: "Fuel temp feedback" },
  { label: "MODERATOR", key: "rhoMod", color: COLORS.blue, description: "Coolant temp feedback" },
  { label: "XENON", key: "rhoXenon", color: "#a855f7", description: "Xe-135 poison" },
  { label: "BORON", key: "rhoBoron", color: "#06b6d4", description: "Soluble boron" },
];

export default function ReactivityPanel({ reactivity }: ReactivityPanelProps) {
  const totalPcm = reactivity.rhoTotal * 1e5;

  // Find max absolute pcm for scaling bars
  const allPcm = ROWS.map((r) => Math.abs(reactivity[r.key] * 1e5));
  const maxPcm = Math.max(50, ...allPcm); // min 50 pcm scale

  const totalColor =
    totalPcm > 5 ? COLORS.red : totalPcm < -5 ? COLORS.blue : COLORS.emerald;

  return (
    <div style={container}>
      <div style={header}>
        <span style={headerLabel}>REACTIVITY</span>
        <span style={headerTotal(totalColor)}>
          {totalPcm >= 0 ? "+" : ""}{totalPcm.toFixed(1)} pcm
        </span>
      </div>

      {ROWS.map((row) => {
        const pcm = reactivity[row.key] * 1e5;
        const absPcm = Math.abs(pcm);
        const barWidth = Math.min(100, (absPcm / maxPcm) * 100);
        const isPositive = pcm > 0.5;
        const isNegative = pcm < -0.5;

        return (
          <div key={row.key} style={rowStyle}>
            <div style={rowTop}>
              <div style={rowLabelWrap}>
                <span style={rowDot(row.color)} />
                <span style={rowLabel}>{row.label}</span>
              </div>
              <span style={rowValue(isPositive ? COLORS.red : isNegative ? row.color : COLORS.slateDark)}>
                {pcm >= 0 ? "+" : ""}{pcm.toFixed(1)}
              </span>
            </div>
            <div style={barOuter}>
              <div
                style={barFill(row.color, barWidth, pcm >= 0)}
              />
            </div>
            <div style={rowDesc}>{row.description}</div>
          </div>
        );
      })}

      {/* Total divider + summary */}
      <div style={totalRow}>
        <div style={totalDivider} />
        <div style={totalInner}>
          <span style={totalLabel}>NET TOTAL</span>
          <span style={totalValue(totalColor)}>
            {totalPcm >= 0 ? "+" : ""}{totalPcm.toFixed(1)} pcm
          </span>
        </div>
        <div style={totalBar}>
          <div style={totalBarInner(totalColor, Math.min(100, (Math.abs(totalPcm) / maxPcm) * 100))} />
        </div>
        <div style={totalState}>
          {totalPcm > 5 ? "SUPERCRITICAL" : totalPcm < -5 ? "SUBCRITICAL" : "CRITICAL"}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const container: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "4px",
};

const headerLabel: React.CSSProperties = {
  fontSize: FONT_SIZES.xs,
  fontWeight: 700,
  color: COLORS.teal,
  letterSpacing: "1.5px",
};

const headerTotal = (color: string): React.CSSProperties => ({
  fontSize: FONT_SIZES.sm,
  fontWeight: 700,
  fontFamily: FONTS.mono,
  color,
  letterSpacing: "0.5px",
});

const rowStyle: React.CSSProperties = {
  padding: "5px 0",
};

const rowTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "2px",
};

const rowLabelWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
};

const rowDot = (color: string): React.CSSProperties => ({
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  background: color,
  boxShadow: `0 0 4px ${color}60`,
  flexShrink: 0,
});

const rowLabel: React.CSSProperties = {
  fontSize: FONT_SIZES.xs,
  fontWeight: 700,
  color: COLORS.slate,
  letterSpacing: "0.8px",
};

const rowValue = (color: string): React.CSSProperties => ({
  fontSize: FONT_SIZES.sm,
  fontWeight: 700,
  fontFamily: FONTS.mono,
  color,
});

const barOuter: React.CSSProperties = {
  height: "3px",
  background: "rgba(255,255,255,0.04)",
  borderRadius: "2px",
  overflow: "hidden",
  marginBottom: "1px",
};

const barFill = (color: string, width: number, positive: boolean): React.CSSProperties => ({
  height: "100%",
  width: `${width}%`,
  background: positive ? COLORS.red : color,
  borderRadius: "2px",
  transition: "width 0.3s ease",
  opacity: width < 1 ? 0.3 : 0.8,
});

const rowDesc: React.CSSProperties = {
  fontSize: "8px",
  color: COLORS.slateDark,
  letterSpacing: "0.3px",
};

const totalRow: React.CSSProperties = {
  marginTop: "4px",
};

const totalDivider: React.CSSProperties = {
  height: "1px",
  background: COLORS.borderSubtle,
  marginBottom: "6px",
};

const totalInner: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "3px",
};

const totalLabel: React.CSSProperties = {
  fontSize: FONT_SIZES.xs,
  fontWeight: 700,
  color: COLORS.white,
  letterSpacing: "1px",
};

const totalValue = (color: string): React.CSSProperties => ({
  fontSize: FONT_SIZES.lg,
  fontWeight: 700,
  fontFamily: FONTS.mono,
  color,
});

const totalBar: React.CSSProperties = {
  height: "4px",
  background: "rgba(255,255,255,0.06)",
  borderRadius: "2px",
  overflow: "hidden",
  marginBottom: "3px",
};

const totalBarInner = (color: string, width: number): React.CSSProperties => ({
  height: "100%",
  width: `${width}%`,
  background: color,
  borderRadius: "2px",
  transition: "width 0.3s ease",
  boxShadow: `0 0 6px ${color}40`,
});

const totalState: React.CSSProperties = {
  fontSize: "8px",
  fontWeight: 700,
  color: COLORS.slateDark,
  letterSpacing: "1px",
  textAlign: "right",
};
