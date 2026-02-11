"use client";

import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { COLORS, FONTS, FONT_SIZES } from "../../../lib/workbench/theme";
import { sectionHeader } from "../../../lib/workbench/styles";
import type { ProcedureStep } from "../../../lib/training/types";

interface ProcedurePanelProps {
  steps: ProcedureStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export default function ProcedurePanel({
  steps,
  currentStep,
  onStepClick,
}: ProcedurePanelProps) {
  return (
    <div style={container}>
      <div style={header}>PROCEDURE CHECKLIST</div>
      <div style={list}>
        {steps.map((step) => {
          const isComplete = step.step < currentStep;
          const isCurrent = step.step === currentStep;

          return (
            <button
              key={step.step}
              style={{
                ...stepRow,
                background: isCurrent ? COLORS.emeraldBgLight : "transparent",
                borderLeft: isCurrent
                  ? `2px solid ${COLORS.emerald}`
                  : isComplete
                  ? "2px solid rgba(16, 185, 129, 0.3)"
                  : "2px solid transparent",
              }}
              onClick={() => onStepClick(step.step)}
            >
              {isComplete ? (
                <CheckCircle2 size={14} style={{ color: COLORS.emerald, flexShrink: 0 }} />
              ) : (
                <Circle
                  size={14}
                  style={{
                    color: isCurrent ? COLORS.emerald : "#475569",
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: FONT_SIZES.md,
                  color: isComplete ? COLORS.teal : isCurrent ? COLORS.white : COLORS.slate,
                  textDecoration: isComplete ? "line-through" : "none",
                  textAlign: "left",
                  lineHeight: 1.4,
                }}
              >
                {step.instruction}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const container: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const header: React.CSSProperties = {
  ...sectionHeader(COLORS.teal),
  padding: "8px 12px",
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
  marginBottom: 0,
  paddingBottom: "8px",
};

const list: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1px",
  padding: "4px 0",
  maxHeight: "200px",
  overflowY: "auto",
};

const stepRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  padding: "6px 12px",
  border: "none",
  cursor: "pointer",
  fontFamily: FONTS.sans,
  width: "100%",
  transition: "background 0.1s",
};
