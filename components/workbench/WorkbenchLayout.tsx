"use client";

import React, { useCallback, useMemo } from "react";
import { useWorkbench } from "./WorkbenchContext";
import ReactorViewport from "./viewport/ReactorViewport";
import { usePhysicsToScene } from "./viewport/hooks/usePhysicsToScene";
import { TopToolbar } from "./toolbar";
import {
  AlarmList,
  BottomTimeline,
  DebriefPanel,
  LeftTree,
  LevelBriefPanel,
  ModeBanner,
  PlantStatusPanel,
  ProcedurePanel,
  ReactivityPanel,
  SystemHealthTile,
} from "./panels";
import { InspectorCard } from "./overlays";
import { BoronCard, ControlRodCard, PumpCard } from "./controls";
import { GlassPanel, LearningTooltip } from "./shared";
import { COLORS, FONTS, FONT_SIZES, RADIUS, BLUR } from "../../lib/workbench/theme";
import { VIEWPORT_HELP, TREE_HELP, MODE_BANNER_HELP } from "../../lib/workbench/learning-content";
import type { TrainingScenario } from "../../lib/training/types";

export default function WorkbenchLayout() {
  const {
    sim,
    ui,
    alarms,
    setToolMode,
    setViewMode,
    selectComponent,
    setInspectorOpen,
    setControlCardOpen,
    setLeftPanelOpen,
    setLearningMode,
    setActiveScenario,
    setScenarioState,
    acknowledgeAlarm,
  } = useWorkbench();

  if (!sim) return null;

  const sceneProps = usePhysicsToScene(
    sim.state,
    sim.rodActual,
    sim.pumpOn,
    ui.viewMode
  );

  const power = sim.state ? sim.state.P * 100 : 0;
  const fuelTemp = sim.state?.Tf ?? 300;
  const coolantTemp = sim.state?.Tc ?? 300;
  const simTime = sim.state?.t ?? 0;
  const decayHeatPct = sim.state
    ? sim.state.decayHeat.reduce((s, d) => s + d, 0) * 100
    : 0;

  const handleSelectScenario = useCallback(
    (scenario: TrainingScenario) => {
      setActiveScenario(scenario);
      setScenarioState("briefing");
    },
    [setActiveScenario, setScenarioState]
  );

  const handleStartScenario = useCallback(() => {
    if (!ui.activeScenario) return;
    const s = ui.activeScenario;
    sim.initializeModel(
      s.initialState.reactorState,
      s.initialState.controls.rod,
      s.initialState.timeAcceleration,
      s.initialState.controls.boronConc
    );
    setScenarioState("running");
    sim.handleStart();
  }, [ui.activeScenario, sim, setScenarioState]);

  const handleDismissScenario = useCallback(() => {
    setActiveScenario(null);
    setScenarioState("idle");
  }, [setActiveScenario, setScenarioState]);

  // Derive system health from sim state
  const rcsHealth = sim.pumpOn ? "ok" : "degraded";
  const safetyHealth = sim.tripActive ? "failed" : "ok";

  return (
    <div style={shell}>
      {/* Global CSS */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; }
        body { background: #000; margin: 0; font-family: 'Inter', sans-serif; overflow: hidden; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      {/* TOP TOOLBAR */}
      <div style={topRow}>
        <TopToolbar
          toolMode={ui.toolMode}
          viewMode={ui.viewMode}
          learningMode={ui.learningMode}
          onToolModeChange={setToolMode}
          onViewModeChange={setViewMode}
          onLearningModeToggle={() => setLearningMode(!ui.learningMode)}
        />
      </div>

      {/* MAIN AREA: Left | Center | Right */}
      <div style={mainArea}>
        {/* LEFT PANEL - Tree Navigation */}
        {ui.leftPanelOpen && (
          <div style={leftPanel}>
            <GlassPanel style={{ height: "100%", display: "flex", flexDirection: "column" }} noPadding>
              {ui.learningMode && (
                <div style={{ padding: "6px 8px 0" }}>
                  <LearningTooltip visible={ui.learningMode} title={TREE_HELP.title} description={TREE_HELP.description} position="right" />
                </div>
              )}
              <LeftTree
                selectedNodeId={ui.selectedComponent}
                onSelectComponent={selectComponent}
                onSelectScenario={handleSelectScenario}
              />

              {/* Level Brief (if scenario selected) */}
              {ui.activeScenario && ui.scenarioState === "briefing" && (
                <div style={{ padding: "8px" }}>
                  <LevelBriefPanel
                    scenario={ui.activeScenario}
                    onStart={handleStartScenario}
                    onDismiss={handleDismissScenario}
                  />
                </div>
              )}

              {/* Procedure Panel (if scenario running with guidance) */}
              {ui.activeScenario?.proceduralGuidance &&
                ui.scenarioState === "running" && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <ProcedurePanel
                      steps={ui.activeScenario.proceduralGuidance}
                      currentStep={1}
                      onStepClick={() => {}}
                    />
                  </div>
                )}

              {/* System Health */}
              <div style={healthSection}>
                <div style={healthHeader}>SYSTEM HEALTH</div>
                <div style={healthGrid}>
                  <SystemHealthTile name="RCS" status={rcsHealth as "ok" | "degraded"} />
                  <SystemHealthTile name="SAFETY" status={safetyHealth as "ok" | "failed"} />
                  <SystemHealthTile name="CVCS" status="ok" />
                  <SystemHealthTile name="ECCS" status="ok" />
                </div>
              </div>
            </GlassPanel>
          </div>
        )}

        {/* CENTER - 3D Viewport */}
        <div style={centerViewport}>
          <ReactorViewport
            {...sceneProps}
            selectedComponent={ui.selectedComponent}
            onSelectComponent={selectComponent}
            showHotspots={ui.toolMode === "select"}
            toolMode={ui.toolMode}
          />

          {/* Learning Mode Viewport Hint */}
          {ui.learningMode && (
            <div style={viewportLearningHint}>
              <LearningTooltip visible={ui.learningMode} title={VIEWPORT_HELP.title} description={VIEWPORT_HELP.description} position="bottom" />
            </div>
          )}

          {/* Inspector Card Overlay */}
          {ui.inspectorOpen && ui.selectedComponent && (
            <InspectorCard
              componentId={ui.selectedComponent}
              state={sim.state}
              reactivity={sim.reactivity}
              rodActual={sim.rodActual}
              onClose={() => setInspectorOpen(false)}
              onOpenControl={setControlCardOpen}
            />
          )}

          {/* Soft Control Cards */}
          {ui.controlCardOpen === "rod" && (
            <ControlRodCard
              rod={sim.rod}
              rodActual={sim.rodActual}
              tripActive={sim.tripActive}
              onRodChange={sim.setRod}
              onClose={() => setControlCardOpen(null)}
              learningMode={ui.learningMode}
            />
          )}
          {ui.controlCardOpen === "boron" && (
            <BoronCard
              boronConc={sim.boronConc}
              boronActual={sim.boronActual}
              onBoronChange={sim.setBoronConc}
              onClose={() => setControlCardOpen(null)}
              learningMode={ui.learningMode}
            />
          )}
          {ui.controlCardOpen === "pump" && (
            <PumpCard
              pumpOn={sim.pumpOn}
              tripActive={sim.tripActive}
              onPumpToggle={() => sim.setPumpOn((v) => !v)}
              onScram={sim.handleScram}
              onClose={() => setControlCardOpen(null)}
              learningMode={ui.learningMode}
            />
          )}

          {/* Debrief Overlay */}
          {ui.scenarioState === "debrief" && ui.activeScenario && (
            <div style={debriefOverlay}>
              <DebriefPanel
                scenario={ui.activeScenario}
                success={true}
                score={85}
                duration={simTime}
                tripCount={sim.tripActive ? 1 : 0}
                feedback={["Good overall performance."]}
                onRestart={handleStartScenario}
                onDismiss={handleDismissScenario}
              />
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Status + Alarms */}
        {ui.rightPanelOpen && (
          <div style={rightPanel}>
            <div style={rightScroll}>
              {/* Mode Banner */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ flex: 1 }}>
                  <ModeBanner
                    mode={ui.plantMode}
                    tripActive={sim.tripActive}
                    tripReason={sim.tripReason}
                  />
                </div>
                <LearningTooltip visible={ui.learningMode} title={MODE_BANNER_HELP.title} description={MODE_BANNER_HELP.description} position="left" />
              </div>

              {/* Plant Status */}
              <PlantStatusPanel
                power={power}
                fuelTemp={fuelTemp}
                coolantTemp={coolantTemp}
                rodActual={sim.rodActual}
                boronActual={sim.boronActual}
                pumpOn={sim.pumpOn}
                decayHeatPct={decayHeatPct}
                simTime={simTime}
                history={sim.history}
                learningMode={ui.learningMode}
              />

              {/* Alarms */}
              <GlassPanel variant="dark" style={{ marginTop: "8px" }}>
                <AlarmList alarms={alarms} onAcknowledge={acknowledgeAlarm} learningMode={ui.learningMode} />
              </GlassPanel>

              {/* Reactivity Breakdown */}
              {sim.reactivity && (
                <div style={{ marginTop: "8px" }}>
                  <ReactivityPanel reactivity={sim.reactivity} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM TIMELINE */}
      <div style={bottomRow}>
        <BottomTimeline
          isRunning={sim.isRunning}
          isPaused={sim.isPaused}
          simTime={simTime}
          speed={sim.speed}
          onStart={sim.handleStart}
          onPause={sim.handlePause}
          onResume={sim.handleResume}
          onStop={sim.handleStop}
          onReset={sim.handleReset}
          onSpeedChange={sim.setSpeed}
          learningMode={ui.learningMode}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Layout Styles
// ============================================================================

const shell: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "grid",
  gridTemplateRows: "auto 1fr 48px",
  background: "linear-gradient(180deg, #060a0f 0%, #0c1117 100%)",
  overflow: "hidden",
};

const topRow: React.CSSProperties = {
  gridRow: 1,
};

const mainArea: React.CSSProperties = {
  gridRow: 2,
  display: "grid",
  gridTemplateColumns: "280px 1fr 280px",
  gap: "0",
  overflow: "hidden",
};

const leftPanel: React.CSSProperties = {
  padding: "6px",
  overflow: "hidden",
};

const centerViewport: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
};

const rightPanel: React.CSSProperties = {
  padding: "6px",
  overflow: "hidden",
};

const rightScroll: React.CSSProperties = {
  height: "100%",
  overflowY: "auto",
  padding: "8px",
  background: COLORS.bgMedium,
  border: `1px solid ${COLORS.borderSubtle}`,
  borderRadius: RADIUS.xl,
  backdropFilter: BLUR.lg,
};

const bottomRow: React.CSSProperties = {
  gridRow: 3,
};

const viewportLearningHint: React.CSSProperties = {
  position: "absolute",
  top: "12px",
  left: "12px",
  zIndex: 60,
};

const debriefOverlay: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 70,
};

const healthSection: React.CSSProperties = {
  marginTop: "auto",
  padding: "8px",
  borderTop: `1px solid ${COLORS.borderSubtle}`,
};

const healthHeader: React.CSSProperties = {
  fontSize: FONT_SIZES.xs,
  fontWeight: 700,
  color: COLORS.teal,
  letterSpacing: "1.5px",
  marginBottom: "6px",
};

const healthGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "4px",
};
