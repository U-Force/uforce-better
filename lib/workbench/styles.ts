/**
 * Shared style utilities for the workbench UI.
 * Eliminates duplicated section header, close button, and panel styles.
 */

import { COLORS, FONTS, FONT_SIZES, RADIUS } from "./theme";

/**
 * Section header style used in PlantStatusPanel, AlarmList, ProcedurePanel, etc.
 */
export function sectionHeader(
  color: string = COLORS.teal,
  borderColor?: string
): React.CSSProperties {
  return {
    fontSize: FONT_SIZES.sm,
    letterSpacing: "1.5px",
    color,
    fontWeight: 700,
    fontFamily: FONTS.sans,
    paddingBottom: "4px",
    borderBottom: `1px solid ${borderColor ?? color + "33"}`,
    marginBottom: "4px",
  };
}

/**
 * Small close / action button (used in InspectorCard, SoftControlCard, etc.)
 */
export const closeButton: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${COLORS.borderStrong}`,
  borderRadius: RADIUS.md,
  color: COLORS.slate,
  cursor: "pointer",
  padding: "2px 8px",
  fontSize: FONT_SIZES.lg,
  fontWeight: 700,
};

/**
 * Primary action button (emerald accent)
 */
export const primaryButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
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

/**
 * Ghost/dismiss button
 */
export const ghostButton: React.CSSProperties = {
  padding: "8px 12px",
  background: "transparent",
  border: `1px solid ${COLORS.borderMedium}`,
  borderRadius: RADIUS.md,
  color: COLORS.slateDark,
  fontSize: FONT_SIZES.md,
  fontWeight: 600,
  cursor: "pointer",
};

/**
 * Mono-font value display (used in status rows, gauges, etc.)
 */
export function monoValue(color: string = COLORS.emerald): React.CSSProperties {
  return {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.mono,
    fontWeight: 700,
    color,
  };
}

/**
 * Label for parameters and status rows
 */
export const paramLabel: React.CSSProperties = {
  fontSize: FONT_SIZES.xs,
  color: COLORS.teal,
  letterSpacing: "1px",
  fontWeight: 700,
};
