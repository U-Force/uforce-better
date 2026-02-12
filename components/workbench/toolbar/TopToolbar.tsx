"use client";

import React from "react";
import ToolButton from "./ToolButton";
import type { ToolMode, ViewMode } from "../WorkbenchContext";
import { LearningTooltip } from "../shared";
import { TOOLBAR_HELP } from "../../../lib/workbench/learning-content";
import { useRouter } from "next/navigation";
import {
  MousePointer2,
  Move,
  RotateCcw,
  Eye,
  Layers,
  Building,
  BookOpen,
  GraduationCap,
} from "lucide-react";

interface TopToolbarProps {
  toolMode: ToolMode;
  viewMode: ViewMode;
  learningMode: boolean;
  onToolModeChange: (mode: ToolMode) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onLearningModeToggle: () => void;
}

export default function TopToolbar({
  toolMode,
  viewMode,
  learningMode,
  onToolModeChange,
  onViewModeChange,
  onLearningModeToggle,
}: TopToolbarProps) {
  const router = useRouter();

  return (
    <div style={bar}>
      {/* Tool Mode Group */}
      <div style={group}>
        <ToolButton
          icon={<MousePointer2 size={14} />}
          label="Select"
          active={toolMode === "select"}
          onClick={() => onToolModeChange("select")}
        />
        <ToolButton
          icon={<Move size={14} />}
          label="Pan"
          active={toolMode === "pan"}
          onClick={() => onToolModeChange("pan")}
        />
        <ToolButton
          icon={<RotateCcw size={14} />}
          label="Orbit"
          active={toolMode === "orbit"}
          onClick={() => onToolModeChange("orbit")}
        />
        <LearningTooltip
          visible={learningMode}
          title={TOOLBAR_HELP.toolMode.title}
          description={TOOLBAR_HELP.toolMode.description}
          position="bottom"
        />
      </div>

      <div style={separator} />

      {/* View Mode Group */}
      <div style={group}>
        <ToolButton
          icon={<Eye size={14} />}
          label="Normal"
          active={viewMode === "normal"}
          onClick={() => onViewModeChange("normal")}
        />
        <ToolButton
          icon={<Layers size={14} />}
          label="X-Ray"
          active={viewMode === "xray"}
          onClick={() => onViewModeChange("xray")}
        />
        <ToolButton
          icon={<Building size={14} />}
          label="Interior"
          active={viewMode === "interior"}
          onClick={() => onViewModeChange("interior")}
        />
        <LearningTooltip
          visible={learningMode}
          title={TOOLBAR_HELP.viewMode.title}
          description={TOOLBAR_HELP.viewMode.description}
          position="bottom"
        />
      </div>

      {/* Spacer pushes Learn button to the right */}
      <div style={{ flex: 1 }} />

      {/* Training Mode */}
      <ToolButton
        icon={<GraduationCap size={14} />}
        label="Training"
        onClick={() => router.push("/train")}
      />

      {/* Learning Mode */}
      <ToolButton
        icon={<BookOpen size={14} />}
        label={learningMode ? "Learn ON" : "Learn"}
        active={learningMode}
        onClick={onLearningModeToggle}
      />
    </div>
  );
}

const bar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 8px",
  background: "rgba(10, 15, 20, 0.85)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  backdropFilter: "blur(8px)",
};

const group: React.CSSProperties = {
  display: "flex",
  gap: "2px",
};

const separator: React.CSSProperties = {
  width: "1px",
  height: "20px",
  background: "rgba(255, 255, 255, 0.1)",
  margin: "0 4px",
};
