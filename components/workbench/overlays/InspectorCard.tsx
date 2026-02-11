"use client";

import React from "react";
import { INSPECTOR_DATA } from "../../../lib/workbench/inspector-data";
import { COLORS, FONTS, FONT_SIZES, RADIUS, BLUR } from "../../../lib/workbench/theme";
import { closeButton, monoValue, paramLabel as paramLabelStyle } from "../../../lib/workbench/styles";
import type { ReactorState, ReactivityComponents } from "../../../lib/reactor/types";

interface InspectorCardProps {
  componentId: string;
  state: ReactorState | null;
  reactivity: ReactivityComponents | null;
  rodActual: number;
  onClose: () => void;
  onOpenControl: (card: string) => void;
}

export default function InspectorCard({
  componentId,
  state,
  reactivity,
  rodActual,
  onClose,
  onOpenControl,
}: InspectorCardProps) {
  const meta = INSPECTOR_DATA[componentId];
  if (!meta) return null;

  const getParamValue = (key: string): number => {
    if (!state) return 0;
    if (key === "rodActual") return rodActual;
    if (key === "rhoTotal") return reactivity?.rhoTotal ?? 0;
    if (key === "rhoExt") return reactivity?.rhoExt ?? 0;
    return (state as unknown as Record<string, number>)[key] ?? 0;
  };

  return (
    <div style={card}>
      {/* Header */}
      <div style={header}>
        <div>
          <div style={nameStyle}>{meta.name}</div>
          <div style={idStyle}>{meta.id.toUpperCase()}</div>
        </div>
        <button style={closeButton} onClick={onClose}>
          x
        </button>
      </div>

      {/* Description */}
      <div style={descStyle}>{meta.description}</div>

      {/* Live Parameters */}
      {meta.parameters.length > 0 && (
        <div style={paramSection}>
          <div style={sectionLabel}>LIVE DATA</div>
          {meta.parameters.map((p) => {
            const val = getParamValue(p.key);
            const display = p.format ? p.format(val) : val.toFixed(1);
            return (
              <div key={p.key} style={paramRow}>
                <span style={paramLabel}>{p.label}</span>
                <span style={paramValue}>
                  {display} {p.unit}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Educational Note */}
      {meta.educationalNote && (
        <div style={eduNote}>{meta.educationalNote}</div>
      )}

      {/* Control Card Button */}
      {meta.controlCard && (
        <button
          style={controlBtn}
          onClick={() => onOpenControl(meta.controlCard!)}
        >
          OPEN CONTROLS
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const card: React.CSSProperties = {
  position: "absolute",
  top: "80px",
  right: "16px",
  width: "300px",
  background: "rgba(10, 15, 20, 0.92)",
  border: "1px solid rgba(16, 185, 129, 0.35)",
  borderRadius: RADIUS.xl,
  padding: "16px",
  backdropFilter: BLUR.lg,
  zIndex: 50,
  color: COLORS.white,
  fontFamily: FONTS.sans,
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "12px",
};

const nameStyle: React.CSSProperties = {
  fontSize: FONT_SIZES.xl,
  fontWeight: 700,
  color: COLORS.emerald,
};

const idStyle: React.CSSProperties = {
  ...paramLabelStyle,
  marginTop: "2px",
};

const descStyle: React.CSSProperties = {
  fontSize: FONT_SIZES.md,
  lineHeight: 1.5,
  color: COLORS.slate,
  marginBottom: "12px",
};

const paramSection: React.CSSProperties = {
  marginBottom: "12px",
  padding: "8px",
  background: COLORS.bgOverlay,
  borderRadius: RADIUS.md,
};

const sectionLabel: React.CSSProperties = {
  fontSize: FONT_SIZES.xs,
  color: COLORS.teal,
  letterSpacing: "1.5px",
  fontWeight: 700,
  marginBottom: "6px",
};

const paramRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "3px 0",
};

const paramLabel: React.CSSProperties = {
  fontSize: FONT_SIZES.md,
  color: COLORS.slate,
};

const paramValue: React.CSSProperties = {
  ...monoValue(COLORS.emerald),
};

const eduNote: React.CSSProperties = {
  fontSize: FONT_SIZES.sm,
  lineHeight: 1.5,
  color: COLORS.teal,
  padding: "8px",
  background: COLORS.emeraldBgLight,
  border: `1px solid ${COLORS.emeraldBgStrong}`,
  borderRadius: RADIUS.md,
  marginBottom: "12px",
};

const controlBtn: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  background: COLORS.emeraldBg,
  border: `1px solid ${COLORS.borderEmerald}`,
  borderRadius: RADIUS.md,
  color: COLORS.emerald,
  fontSize: FONT_SIZES.md,
  fontWeight: 700,
  letterSpacing: "1px",
  cursor: "pointer",
  fontFamily: FONTS.sans,
};
