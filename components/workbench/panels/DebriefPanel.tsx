"use client";

import React from "react";
import { Award, AlertTriangle, Clock, Target } from "lucide-react";
import { COLORS, FONTS, FONT_SIZES, RADIUS } from "../../../lib/workbench/theme";
import { primaryButton, ghostButton } from "../../../lib/workbench/styles";
import type { TrainingScenario } from "../../../lib/training/types";

interface DebriefPanelProps {
  scenario: TrainingScenario;
  success: boolean;
  score: number;
  duration: number;
  tripCount: number;
  feedback: string[];
  onRestart: () => void;
  onDismiss: () => void;
}

export default function DebriefPanel({
  scenario,
  success,
  score,
  duration,
  tripCount,
  feedback,
  onRestart,
  onDismiss,
}: DebriefPanelProps) {
  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);

  return (
    <div style={panel}>
      <div style={header}>
        <div style={headerTitle}>SCENARIO DEBRIEF</div>
        <div style={scenarioName}>{scenario.name}</div>
      </div>

      {/* Result Badge */}
      <div
        style={{
          ...resultBadge,
          background: success ? COLORS.emeraldBg : COLORS.redBg,
          borderColor: success ? COLORS.emerald : COLORS.red,
        }}
      >
        {success ? (
          <Award size={20} style={{ color: COLORS.emerald }} />
        ) : (
          <AlertTriangle size={20} style={{ color: COLORS.red }} />
        )}
        <div>
          <div
            style={{
              fontSize: FONT_SIZES.xl,
              fontWeight: 700,
              color: success ? COLORS.emerald : COLORS.red,
            }}
          >
            {success ? "SCENARIO PASSED" : "SCENARIO FAILED"}
          </div>
          <div style={{ fontSize: FONT_SIZES.md, color: COLORS.slate }}>
            Score: {score}/100
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={statsGrid}>
        <div style={statCard}>
          <Clock size={14} style={{ color: COLORS.blue }} />
          <div>
            <div style={statLabel}>DURATION</div>
            <div style={statValue}>
              {mins}:{secs.toString().padStart(2, "0")}
            </div>
          </div>
        </div>
        <div style={statCard}>
          <Target size={14} style={{ color: COLORS.emerald }} />
          <div>
            <div style={statLabel}>SCORE</div>
            <div style={statValue}>{score}%</div>
          </div>
        </div>
        <div style={statCard}>
          <AlertTriangle
            size={14}
            style={{ color: tripCount > 0 ? COLORS.red : COLORS.emerald }}
          />
          <div>
            <div style={statLabel}>TRIPS</div>
            <div style={statValue}>{tripCount}</div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback.length > 0 && (
        <div style={feedbackSection}>
          <div style={feedbackLabel}>FEEDBACK</div>
          {feedback.map((f, i) => (
            <div key={i} style={feedbackItem}>
              {f}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={actions}>
        <button style={restartBtn} onClick={onRestart}>
          RETRY SCENARIO
        </button>
        <button style={dismissBtn} onClick={onDismiss}>
          CLOSE
        </button>
      </div>
    </div>
  );
}

const panel: React.CSSProperties = {
  background: COLORS.bgDark,
  border: `1px solid ${COLORS.borderEmeraldLight}`,
  borderRadius: RADIUS.xl,
  overflow: "hidden",
  maxWidth: "400px",
};

const header: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
};

const headerTitle: React.CSSProperties = {
  fontSize: FONT_SIZES.sm,
  letterSpacing: "1.5px",
  color: COLORS.teal,
  fontWeight: 700,
};

const scenarioName: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: COLORS.white,
  marginTop: "4px",
};

const resultBadge: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  margin: "12px 14px",
  padding: "12px",
  borderRadius: RADIUS.lg,
  border: "1px solid",
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "8px",
  padding: "0 14px",
  marginBottom: "12px",
};

const statCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px",
  background: COLORS.bgOverlay,
  borderRadius: RADIUS.md,
};

const statLabel: React.CSSProperties = {
  fontSize: "8px",
  color: COLORS.slateDark,
  letterSpacing: "1px",
  fontWeight: 700,
};

const statValue: React.CSSProperties = {
  fontSize: FONT_SIZES.xl,
  fontFamily: FONTS.mono,
  fontWeight: 700,
  color: COLORS.white,
};

const feedbackSection: React.CSSProperties = {
  padding: "0 14px 12px",
};

const feedbackLabel: React.CSSProperties = {
  fontSize: FONT_SIZES.xs,
  color: COLORS.teal,
  letterSpacing: "1.5px",
  fontWeight: 700,
  marginBottom: "6px",
};

const feedbackItem: React.CSSProperties = {
  fontSize: FONT_SIZES.md,
  lineHeight: 1.5,
  color: COLORS.slate,
  padding: "4px 0",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
};

const actions: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  padding: "10px 14px",
  borderTop: `1px solid ${COLORS.borderSubtle}`,
};

const restartBtn: React.CSSProperties = {
  ...primaryButton,
  flex: 1,
};

const dismissBtn: React.CSSProperties = {
  ...ghostButton,
};
