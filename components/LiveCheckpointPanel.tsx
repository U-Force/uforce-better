"use client";

import React from "react";
import type { ScenarioObjective, AssessmentCriterion } from "@/lib/training/types";
import type { ReactorState } from "@/lib/reactor";

// ============================================================================
// TYPES
// ============================================================================

export type ObjectiveStatus = "pending" | "in_progress" | "completed" | "failed";

export interface ObjectiveEvaluation {
  objectiveId: string;
  status: ObjectiveStatus;
  criteriaResults: CriterionResult[];
  completionPercentage: number; // 0-100
}

export interface CriterionResult {
  metric: string;
  target: string;
  currentValue: number;
  unit: string;
  met: boolean;
  status: "not_started" | "in_progress" | "met" | "violated";
}

export interface LiveCheckpointPanelProps {
  objectives: ScenarioObjective[];
  reactorState: ReactorState;
  currentMetrics: {
    timeElapsed: number;
    tripCount: number;
    scramCount: number;
    maxPower: number;
    maxFuelTemp: number;
    maxCoolantTemp: number;
    currentPower: number;
    rodPosition: number;
    rodWithdrawalRate: number;
    [key: string]: number;
  };
  onObjectiveComplete?: (objectiveId: string) => void;
}

// ============================================================================
// EVALUATION LOGIC
// ============================================================================

/**
 * Evaluates a single assessment criterion
 */
function evaluateCriterion(
  criterion: AssessmentCriterion,
  metrics: LiveCheckpointPanelProps["currentMetrics"],
  reactorState: ReactorState
): CriterionResult {
  const { metric, target, unit } = criterion;

  // Get current value from metrics or reactor state
  let currentValue = 0;
  if (metric in metrics) {
    currentValue = metrics[metric];
  } else if (metric === "finalPower" || metric === "maxPower") {
    currentValue = metrics.currentPower * 100; // Convert to %
  } else if (metric === "maxCoolantTemp") {
    currentValue = metrics.maxCoolantTemp;
  } else if (metric === "maxFuelTemp") {
    currentValue = metrics.maxFuelTemp;
  } else if (metric === "tripsOccurred") {
    currentValue = metrics.tripCount;
  } else if (metric === "timeToFirstCriticality") {
    // This would need special tracking in the parent component
    currentValue = metrics.timeElapsed;
  } else if (metric === "rodWithdrawalRate") {
    currentValue = Math.abs(metrics.rodWithdrawalRate);
  }

  // Parse target and evaluate
  const { met, status } = evaluateTarget(target, currentValue);

  return {
    metric,
    target,
    currentValue,
    unit,
    met,
    status,
  };
}

/**
 * Evaluates a target string (e.g., "<600", "18-22", "0")
 */
function evaluateTarget(
  target: string,
  currentValue: number
): { met: boolean; status: CriterionResult["status"] } {
  // Handle range targets (e.g., "18-22")
  if (target.includes("-")) {
    const [min, max] = target.split("-").map(Number);
    const inRange = currentValue >= min && currentValue <= max;
    return {
      met: inRange,
      status: inRange ? "met" : currentValue < min ? "in_progress" : "violated",
    };
  }

  // Handle comparison targets (e.g., "<600", ">50")
  if (target.startsWith("<")) {
    const limit = Number(target.slice(1));
    const met = currentValue < limit;
    return {
      met,
      status: met ? "met" : "violated",
    };
  }

  if (target.startsWith(">")) {
    const limit = Number(target.slice(1));
    const met = currentValue > limit;
    return {
      met,
      status: met ? "met" : "in_progress",
    };
  }

  // Handle exact match (e.g., "0")
  const targetNum = Number(target);
  const met = currentValue === targetNum;
  return {
    met,
    status: met ? "met" : currentValue < targetNum ? "in_progress" : "violated",
  };
}

/**
 * Evaluates all objectives and returns their current status
 */
export function evaluateObjectives(
  objectives: ScenarioObjective[],
  metrics: LiveCheckpointPanelProps["currentMetrics"],
  reactorState: ReactorState
): ObjectiveEvaluation[] {
  return objectives.map((objective) => {
    const criteriaResults = objective.assessmentCriteria.map((criterion) =>
      evaluateCriterion(criterion, metrics, reactorState)
    );

    const metCount = criteriaResults.filter((r) => r.met).length;
    const totalCount = criteriaResults.length;
    const completionPercentage = (metCount / totalCount) * 100;

    let status: ObjectiveStatus = "pending";

    if (completionPercentage === 100) {
      status = "completed";
    } else if (criteriaResults.some((r) => r.status === "violated")) {
      status = "failed";
    } else if (criteriaResults.some((r) => r.status === "in_progress" || r.status === "met")) {
      status = "in_progress";
    }

    return {
      objectiveId: objective.id,
      status,
      criteriaResults,
      completionPercentage,
    };
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LiveCheckpointPanel({
  objectives,
  reactorState,
  currentMetrics,
  onObjectiveComplete,
}: LiveCheckpointPanelProps) {
  const evaluations = evaluateObjectives(objectives, currentMetrics, reactorState);
  const notifiedCompletedRef = React.useRef<Set<string>>(new Set());

  // Notify parent when objectives are completed (only once per objective)
  React.useEffect(() => {
    if (onObjectiveComplete) {
      evaluations.forEach((evaluation) => {
        if (evaluation.status === "completed" && !notifiedCompletedRef.current.has(evaluation.objectiveId)) {
          notifiedCompletedRef.current.add(evaluation.objectiveId);
          onObjectiveComplete(evaluation.objectiveId);
        }
      });
    }
  }, [evaluations, onObjectiveComplete]);

  return (
    <div style={container}>
      <div style={header}>
        <div style={headerTitle}>MISSION OBJECTIVES</div>
        <div style={headerSubtitle}>Live Status</div>
      </div>

      <div style={objectivesList}>
        {objectives.map((objective, index) => {
          const evaluation = evaluations.find((e) => e.objectiveId === objective.id);
          if (!evaluation) return null;

          return (
            <div key={objective.id} style={objectiveCard}>
              <div style={objectiveHeader}>
                <div style={objectiveNumber}>#{index + 1}</div>
                <div style={objectiveStatus(evaluation.status)}>
                  {getStatusIcon(evaluation.status)} {getStatusText(evaluation.status)}
                </div>
              </div>

              <div style={objectiveDescription}>{objective.description}</div>

              <div style={progressBar}>
                <div
                  style={{
                    ...progressFill,
                    width: `${evaluation.completionPercentage}%`,
                    background: getStatusColor(evaluation.status),
                  }}
                />
              </div>

              <div style={criteriaList}>
                {evaluation.criteriaResults.map((result, idx) => (
                  <div key={idx} style={criterionRow}>
                    <div style={criterionIcon(result.status)}>
                      {getCriterionIcon(result.status)}
                    </div>
                    <div style={criterionText}>
                      <span style={criterionMetric}>{formatMetricName(result.metric)}:</span>{" "}
                      <span style={criterionValue(result.status)}>
                        {formatValue(result.currentValue, result.unit)}
                      </span>{" "}
                      <span style={criterionTarget}>
                        (target: {result.target} {result.unit})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusIcon(status: ObjectiveStatus): string {
  switch (status) {
    case "completed":
      return "✓";
    case "failed":
      return "✗";
    case "in_progress":
      return "▶";
    case "pending":
      return "○";
  }
}

function getStatusText(status: ObjectiveStatus): string {
  switch (status) {
    case "completed":
      return "COMPLETE";
    case "failed":
      return "FAILED";
    case "in_progress":
      return "IN PROGRESS";
    case "pending":
      return "PENDING";
  }
}

function getStatusColor(status: ObjectiveStatus): string {
  switch (status) {
    case "completed":
      return "#10b981";
    case "failed":
      return "#ef4444";
    case "in_progress":
      return "#f59e0b";
    case "pending":
      return "#94a3b8";
  }
}

function getCriterionIcon(status: CriterionResult["status"]): string {
  switch (status) {
    case "met":
      return "✓";
    case "violated":
      return "✗";
    case "in_progress":
      return "▶";
    case "not_started":
      return "○";
  }
}

function formatMetricName(metric: string): string {
  return metric
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(value: number, unit: string): string {
  if (unit === "%") {
    return `${value.toFixed(1)}%`;
  } else if (unit === "K") {
    return `${value.toFixed(0)} K`;
  } else if (unit === "seconds") {
    return `${value.toFixed(0)}s`;
  } else if (unit === "%/minute") {
    return `${value.toFixed(2)}%/min`;
  } else if (unit === "count") {
    return `${Math.floor(value)}`;
  }
  return `${value.toFixed(2)} ${unit}`;
}

// ============================================================================
// STYLES
// ============================================================================

const container: React.CSSProperties = {
  width: "100%",
  height: "100%",
  background: "rgba(20, 25, 30, 0.6)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const header: React.CSSProperties = {
  background: "rgba(15, 20, 25, 0.6)",
  borderBottom: "1px solid rgba(16, 185, 129, 0.2)",
  padding: "16px 20px",
};

const headerTitle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#10b981",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "0.5px",
};

const headerSubtitle: React.CSSProperties = {
  fontSize: "11px",
  color: "#6ee7b7",
  fontFamily: "'Inter', sans-serif",
  marginTop: "2px",
};

const objectivesList: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const objectiveCard: React.CSSProperties = {
  background: "rgba(15, 20, 25, 0.4)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  borderRadius: "6px",
  padding: "14px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
};

const objectiveHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
};

const objectiveNumber: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6ee7b7",
  fontFamily: "'Inter', sans-serif",
};

const objectiveStatus = (status: ObjectiveStatus): React.CSSProperties => ({
  fontSize: "12px",
  fontWeight: "600",
  color: getStatusColor(status),
  fontFamily: "'Inter', sans-serif",
});

const objectiveDescription: React.CSSProperties = {
  fontSize: "12px",
  color: "#a7f3d0",
  marginBottom: "10px",
  lineHeight: "1.5",
  fontFamily: "'Inter', sans-serif",
};

const progressBar: React.CSSProperties = {
  width: "100%",
  height: "6px",
  background: "rgba(15, 20, 25, 0.6)",
  borderRadius: "3px",
  overflow: "hidden",
  marginBottom: "10px",
  border: "1px solid rgba(16, 185, 129, 0.15)",
};

const progressFill: React.CSSProperties = {
  height: "100%",
  transition: "width 0.5s ease, background 0.3s ease",
};

const criteriaList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const criterionRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  fontSize: "12px",
  fontFamily: "'Inter', sans-serif",
};

const criterionIcon = (status: CriterionResult["status"]): React.CSSProperties => ({
  fontSize: "14px",
  color:
    status === "met"
      ? "#10b981"
      : status === "violated"
      ? "#ef4444"
      : status === "in_progress"
      ? "#f59e0b"
      : "#94a3b8",
  minWidth: "18px",
  textAlign: "center",
  marginTop: "2px",
});

const criterionText: React.CSSProperties = {
  flex: 1,
  color: "#a7f3d0",
  lineHeight: "1.5",
};

const criterionMetric: React.CSSProperties = {
  color: "#6ee7b7",
  fontWeight: "500",
};

const criterionValue = (status: CriterionResult["status"]): React.CSSProperties => ({
  color:
    status === "met"
      ? "#10b981"
      : status === "violated"
      ? "#ef4444"
      : status === "in_progress"
      ? "#f59e0b"
      : "#64748b",
  fontWeight: "600",
});

const criterionTarget: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "11px",
};
