"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { SimulationControls, HistoryPoint } from "../../hooks/useReactorSimulation";
import type { TrainingScenario } from "../../lib/training/types";

// ============================================================================
// Types
// ============================================================================

export type ToolMode = "select" | "pan" | "orbit";
export type ViewMode = "normal" | "xray" | "section" | "interior";
export type PlantMode = "normal" | "abnormal" | "emergency";

export interface Alarm {
  id: string;
  parameter: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  timestamp: number;
  acknowledged: boolean;
  value: number;
  limit: number;
}

export interface WorkbenchUIState {
  toolMode: ToolMode;
  viewMode: ViewMode;
  plantMode: PlantMode;
  selectedComponent: string | null;
  inspectorOpen: boolean;
  controlCardOpen: string | null; // "rod" | "boron" | "pump" | null
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  activeScenario: TrainingScenario | null;
  scenarioState: "idle" | "briefing" | "running" | "debrief";
  learningMode: boolean;
}

export interface WorkbenchContextValue {
  // Simulation state (passed through from useReactorSimulation)
  sim: SimulationControls | null;

  // UI state
  ui: WorkbenchUIState;
  setToolMode: (mode: ToolMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setPlantMode: (mode: PlantMode) => void;
  selectComponent: (id: string | null) => void;
  setInspectorOpen: (open: boolean) => void;
  setControlCardOpen: (card: string | null) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setLearningMode: (on: boolean) => void;

  // Scenario
  setActiveScenario: (scenario: TrainingScenario | null) => void;
  setScenarioState: (state: WorkbenchUIState["scenarioState"]) => void;

  // Alarms
  alarms: Alarm[];
  setAlarms: React.Dispatch<React.SetStateAction<Alarm[]>>;
  acknowledgeAlarm: (id: string) => void;
}

// ============================================================================
// Context
// ============================================================================

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null);

export function useWorkbench(): WorkbenchContextValue {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) throw new Error("useWorkbench must be used within WorkbenchProvider");
  return ctx;
}

// ============================================================================
// Provider
// ============================================================================

interface WorkbenchProviderProps {
  sim: SimulationControls;
  children: React.ReactNode;
}

export function WorkbenchProvider({ sim, children }: WorkbenchProviderProps) {
  const [ui, setUI] = useState<WorkbenchUIState>({
    toolMode: "orbit",
    viewMode: "interior",
    plantMode: "normal",
    selectedComponent: null,
    inspectorOpen: false,
    controlCardOpen: null,
    leftPanelOpen: true,
    rightPanelOpen: true,
    activeScenario: null,
    scenarioState: "idle",
    learningMode: false,
  });

  const [alarms, setAlarms] = useState<Alarm[]>([]);

  const setToolMode = useCallback((mode: ToolMode) => {
    setUI((prev) => ({ ...prev, toolMode: mode }));
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setUI((prev) => ({ ...prev, viewMode: mode }));
  }, []);

  const setPlantMode = useCallback((mode: PlantMode) => {
    setUI((prev) => ({ ...prev, plantMode: mode }));
  }, []);

  const selectComponent = useCallback((id: string | null) => {
    setUI((prev) => ({
      ...prev,
      selectedComponent: id,
      inspectorOpen: id !== null,
    }));
  }, []);

  const setInspectorOpen = useCallback((open: boolean) => {
    setUI((prev) => ({
      ...prev,
      inspectorOpen: open,
      selectedComponent: open ? prev.selectedComponent : null,
    }));
  }, []);

  const setControlCardOpen = useCallback((card: string | null) => {
    setUI((prev) => ({ ...prev, controlCardOpen: card }));
  }, []);

  const setLeftPanelOpen = useCallback((open: boolean) => {
    setUI((prev) => ({ ...prev, leftPanelOpen: open }));
  }, []);

  const setRightPanelOpen = useCallback((open: boolean) => {
    setUI((prev) => ({ ...prev, rightPanelOpen: open }));
  }, []);

  const setLearningMode = useCallback((on: boolean) => {
    setUI((prev) => ({ ...prev, learningMode: on }));
  }, []);

  const setActiveScenario = useCallback((scenario: TrainingScenario | null) => {
    setUI((prev) => ({ ...prev, activeScenario: scenario }));
  }, []);

  const setScenarioState = useCallback(
    (state: WorkbenchUIState["scenarioState"]) => {
      setUI((prev) => ({ ...prev, scenarioState: state }));
    },
    []
  );

  const acknowledgeAlarm = useCallback((id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  }, []);

  const value = useMemo<WorkbenchContextValue>(
    () => ({
      sim,
      ui,
      setToolMode,
      setViewMode,
      setPlantMode,
      selectComponent,
      setInspectorOpen,
      setControlCardOpen,
      setLeftPanelOpen,
      setRightPanelOpen,
      setLearningMode,
      setActiveScenario,
      setScenarioState,
      alarms,
      setAlarms,
      acknowledgeAlarm,
    }),
    [
      sim, ui, alarms,
      setToolMode, setViewMode, setPlantMode, selectComponent,
      setInspectorOpen, setControlCardOpen, setLeftPanelOpen, setRightPanelOpen,
      setLearningMode, setActiveScenario, setScenarioState, acknowledgeAlarm,
    ]
  );

  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  );
}
