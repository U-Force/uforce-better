/**
 * Centralized theme constants for the workbench UI.
 * All colors, fonts, sizes, and blur values used across components.
 *
 * Usage: import { COLORS, FONTS, RADIUS, BLUR } from "@/lib/workbench/theme";
 */

// ============================================================================
// Colors
// ============================================================================

export const COLORS = {
  // Accent palette
  emerald: "#10b981",
  teal: "#6ee7b7",
  red: "#ef4444",
  amber: "#f59e0b",
  blue: "#3b82f6",
  yellow: "#eab308",

  // Neutral palette
  slate: "#94a3b8",
  slateLight: "#cbd5e1",
  slateDark: "#64748b",
  white: "#e2e8f0",

  // Backgrounds
  bgDark: "rgba(10, 15, 20, 0.94)",
  bgMedium: "rgba(12, 17, 23, 0.75)",
  bgLight: "rgba(5, 10, 15, 0.85)",
  bgPanel: "rgba(15, 20, 25, 0.8)",
  bgOverlay: "rgba(0, 0, 0, 0.3)",
  bgTransparent: "transparent",

  // Accent backgrounds (with alpha)
  emeraldBg: "rgba(16, 185, 129, 0.15)",
  emeraldBgLight: "rgba(16, 185, 129, 0.08)",
  emeraldBgStrong: "rgba(16, 185, 129, 0.2)",
  redBg: "rgba(239, 68, 68, 0.15)",
  amberBg: "rgba(245, 158, 11, 0.15)",
  blueBg: "rgba(59, 130, 246, 0.15)",
  slateBgLight: "rgba(100, 116, 139, 0.15)",

  // Borders
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  borderMedium: "rgba(255, 255, 255, 0.1)",
  borderStrong: "rgba(255, 255, 255, 0.15)",
  borderEmerald: "rgba(16, 185, 129, 0.4)",
  borderEmeraldLight: "rgba(16, 185, 129, 0.25)",
  borderRed: "rgba(239, 68, 68, 0.4)",
  borderAmber: "rgba(245, 158, 11, 0.4)",

  // 3D scene colors
  pipeHot: "#f44336",
  pipeCold: "#2196f3",
  coreGlowLow: "#1a237e",
  coreGlowMid: "#4a148c",
  coreGlowHigh: "#ff6f00",
  metalDark: "#3a3a3a",
  metalMedium: "#4a4a4a",
  metalLight: "#888888",
  highlightEmissive: "#335599",
} as const;

// ============================================================================
// Fonts
// ============================================================================

export const FONTS = {
  sans: "'Inter', sans-serif",
  mono: "'Share Tech Mono', monospace",
} as const;

export const FONT_SIZES = {
  xs: "9px",
  sm: "10px",
  md: "11px",
  lg: "12px",
  xl: "14px",
  xxl: "20px",
} as const;

// ============================================================================
// Spacing & Radius
// ============================================================================

export const RADIUS = {
  sm: "3px",
  md: "4px",
  lg: "6px",
  xl: "8px",
} as const;

// ============================================================================
// Backdrop Blur
// ============================================================================

export const BLUR = {
  sm: "blur(4px)",
  md: "blur(8px)",
  lg: "blur(12px)",
  xl: "blur(16px)",
} as const;

// ============================================================================
// Status color maps (used by StatusBadge, SystemHealthTile, ModeBanner, etc.)
// ============================================================================

export interface StatusColor {
  fg: string;
  bg: string;
  border: string;
}

export const STATUS_COLORS: Record<string, StatusColor> = {
  normal: { fg: COLORS.emerald, bg: COLORS.emeraldBg, border: COLORS.borderEmerald },
  ok: { fg: COLORS.emerald, bg: COLORS.emeraldBgLight, border: COLORS.borderEmerald },
  warning: { fg: COLORS.amber, bg: COLORS.amberBg, border: COLORS.borderAmber },
  danger: { fg: COLORS.red, bg: COLORS.redBg, border: COLORS.borderRed },
  info: { fg: COLORS.blue, bg: COLORS.blueBg, border: `rgba(59, 130, 246, 0.4)` },
  offline: { fg: COLORS.slateDark, bg: COLORS.slateBgLight, border: `rgba(100, 116, 139, 0.4)` },
  degraded: { fg: COLORS.amber, bg: COLORS.amberBg, border: COLORS.borderAmber },
  failed: { fg: COLORS.red, bg: COLORS.redBg, border: COLORS.borderRed },
  na: { fg: COLORS.slateDark, bg: COLORS.slateBgLight, border: `rgba(100, 116, 139, 0.4)` },
} as const;

// ============================================================================
// Priority color map (used by AlarmList, hints, etc.)
// ============================================================================

export const PRIORITY_COLORS: Record<string, string> = {
  critical: COLORS.red,
  high: COLORS.amber,
  medium: COLORS.yellow,
  low: COLORS.blue,
} as const;
