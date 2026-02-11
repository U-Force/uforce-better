"use client";

import React from "react";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { COLORS, FONTS, FONT_SIZES, RADIUS, BLUR } from "../../../lib/workbench/theme";

interface BottomTimelineProps {
  isRunning: boolean;
  isPaused: boolean;
  simTime: number;
  speed: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 5, 10];

export default function BottomTimeline({
  isRunning,
  isPaused,
  simTime,
  speed,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  onSpeedChange,
}: BottomTimelineProps) {
  const mins = Math.floor(simTime / 60);
  const secs = Math.floor(simTime % 60);

  return (
    <div style={bar}>
      {/* Play/Pause/Stop */}
      <div style={controlGroup}>
        {!isRunning ? (
          <button style={iconBtn} onClick={onStart} title="Start">
            <Play size={14} />
          </button>
        ) : isPaused ? (
          <button style={iconBtn} onClick={onResume} title="Resume">
            <Play size={14} />
          </button>
        ) : (
          <button style={iconBtn} onClick={onPause} title="Pause">
            <Pause size={14} />
          </button>
        )}
        <button
          style={{ ...iconBtn, opacity: isRunning ? 1 : 0.4 }}
          onClick={onStop}
          disabled={!isRunning}
          title="Stop"
        >
          <Square size={14} />
        </button>
        <button style={iconBtn} onClick={onReset} title="Reset">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Time Display */}
      <div style={timeDisplay}>
        T+ {mins}:{secs.toString().padStart(2, "0")}
      </div>

      {/* Speed Pills */}
      <div style={speedGroup}>
        <span style={speedLabel}>SPEED:</span>
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            style={speedPill(speed === s)}
            onClick={() => onSpeedChange(s)}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Status Indicator */}
      <div style={statusDot(isRunning, isPaused)}>
        {isRunning ? (isPaused ? "PAUSED" : "RUNNING") : "READY"}
      </div>
    </div>
  );
}

const bar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "0 12px",
  height: "48px",
  background: "rgba(10, 15, 20, 0.9)",
  borderTop: `1px solid ${COLORS.borderSubtle}`,
  backdropFilter: BLUR.md,
};

const controlGroup: React.CSSProperties = {
  display: "flex",
  gap: "4px",
};

const iconBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  background: "rgba(255,255,255,0.05)",
  border: `1px solid ${COLORS.borderMedium}`,
  borderRadius: RADIUS.md,
  color: COLORS.slate,
  cursor: "pointer",
  transition: "all 0.15s",
};

const timeDisplay: React.CSSProperties = {
  fontSize: FONT_SIZES.xl,
  fontFamily: FONTS.mono,
  fontWeight: 700,
  color: COLORS.emerald,
  letterSpacing: "1px",
  minWidth: "80px",
};

const speedGroup: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  marginLeft: "auto",
};

const speedLabel: React.CSSProperties = {
  fontSize: FONT_SIZES.xs,
  color: COLORS.slateDark,
  letterSpacing: "1px",
  fontWeight: 700,
};

const speedPill = (active: boolean): React.CSSProperties => ({
  padding: "3px 8px",
  borderRadius: RADIUS.sm,
  fontSize: FONT_SIZES.sm,
  fontWeight: 700,
  cursor: "pointer",
  border: "none",
  background: active ? COLORS.amber : "rgba(255,255,255,0.05)",
  color: active ? "#000" : COLORS.slateDark,
  transition: "all 0.15s",
});

const statusDot = (running: boolean, paused: boolean): React.CSSProperties => ({
  fontSize: FONT_SIZES.xs,
  fontWeight: 700,
  letterSpacing: "1.5px",
  color: running ? (paused ? COLORS.amber : COLORS.emerald) : COLORS.slateDark,
  display: "flex",
  alignItems: "center",
  gap: "6px",
});
