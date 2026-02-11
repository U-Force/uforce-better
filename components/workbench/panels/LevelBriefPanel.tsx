"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Play } from "lucide-react";
import LevelBriefTabs from "./LevelBriefTabs";
import { COLORS, FONTS, FONT_SIZES, RADIUS } from "../../../lib/workbench/theme";
import { primaryButton, ghostButton } from "../../../lib/workbench/styles";
import type { TrainingScenario } from "../../../lib/training/types";

interface LevelBriefPanelProps {
  scenario: TrainingScenario;
  onStart: () => void;
  onDismiss: () => void;
}

const DIFFICULTY_LABELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];
const DIFFICULTY_COLORS = ["", COLORS.emerald, COLORS.blue, COLORS.amber, COLORS.red];

export default function LevelBriefPanel({
  scenario,
  onStart,
  onDismiss,
}: LevelBriefPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={panel}>
      {/* Header */}
      <button
        style={header}
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <div style={title}>{scenario.name}</div>
          <div style={meta}>
            <span
              style={{
                color: DIFFICULTY_COLORS[scenario.difficulty],
                fontWeight: 700,
              }}
            >
              {DIFFICULTY_LABELS[scenario.difficulty]}
            </span>
            <span style={{ color: COLORS.slateDark }}>
              ~{scenario.estimatedDuration} min
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={14} style={{ color: COLORS.slateDark }} />
        ) : (
          <ChevronDown size={14} style={{ color: COLORS.slateDark }} />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <>
          <div style={desc}>{scenario.description}</div>
          <LevelBriefTabs scenario={scenario} />

          {/* Actions */}
          <div style={actions}>
            <button style={startBtn} onClick={onStart}>
              <Play size={12} /> START SCENARIO
            </button>
            <button style={dismissBtn} onClick={onDismiss}>
              DISMISS
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const panel: React.CSSProperties = {
  background: "rgba(10, 15, 20, 0.92)",
  border: `1px solid ${COLORS.borderEmeraldLight}`,
  borderRadius: RADIUS.xl,
  overflow: "hidden",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: "10px 12px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: FONTS.sans,
};

const title: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: COLORS.emerald,
  marginBottom: "2px",
};

const meta: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  fontSize: FONT_SIZES.sm,
};

const desc: React.CSSProperties = {
  padding: "0 12px 8px",
  fontSize: FONT_SIZES.md,
  lineHeight: 1.5,
  color: COLORS.slate,
};

const actions: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  padding: "8px 12px",
  borderTop: `1px solid ${COLORS.borderSubtle}`,
};

const startBtn: React.CSSProperties = {
  ...primaryButton,
  flex: 1,
};

const dismissBtn: React.CSSProperties = {
  ...ghostButton,
};
