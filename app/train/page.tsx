"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { ReactorState, ReactivityComponents } from "../../lib/reactor";
import {
  SCENARIOS,
  TrainingRole,
  type TrainingScenario,
  MetricsCollector,
  getRolePermissions,
  markScenarioCompleted,
  getRoleDisplayName,
  loadCompletionData,
} from "../../lib/training";
import ScenarioBriefing from "../../components/ScenarioBriefing";
import ScenarioDebrief from "../../components/ScenarioDebrief";
import NavigationBar from "../../components/NavigationBar";
import {
  useReactorSimulation,
} from "../../hooks/useReactorSimulation";
import { useAlarmEngine } from "../../hooks/useAlarmEngine";
import {
  WorkbenchProvider,
  useWorkbench,
} from "../../components/workbench/WorkbenchContext";
import WorkbenchLayout from "../../components/workbench/WorkbenchLayout";
import { LiveCheckpointPanel, type LiveCheckpointPanelProps } from "../../components/LiveCheckpointPanel";
import { COLORS, FONTS, FONT_SIZES, RADIUS, BLUR } from "../../lib/workbench/theme";

type AppState = 'selector' | 'briefing' | 'running' | 'debrief';

/** Inner component that uses workbench context for alarms + training overlays */
function TrainingWorkbenchInner({
  scenario,
  liveMetrics,
  metricsCollector,
  onExit,
}: {
  scenario: TrainingScenario | null;
  liveMetrics: LiveCheckpointPanelProps["currentMetrics"];
  metricsCollector: MetricsCollector | null;
  onExit: () => void;
}) {
  const { sim, setAlarms } = useWorkbench();
  useAlarmEngine(sim?.state ?? null, setAlarms);

  // Draggable + resizable state for objectives panel
  const [panelPos, setPanelPos] = useState({ x: -1, y: 42 }); // x=-1 means use default (right side)
  const [panelSize, setPanelSize] = useState({ w: 300, h: 420 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Resolve default position on first render
  const resolvedX = panelPos.x === -1 ? (typeof window !== 'undefined' ? window.innerWidth - panelSize.w - 6 : 800) : panelPos.x;

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Only drag from the title bar area
    if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
    e.preventDefault();
    setDragging(true);
    dragOffset.current = { x: e.clientX - resolvedX, y: e.clientY - panelPos.y };
  }, [resolvedX, panelPos.y]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: panelSize.w, h: panelSize.h };
  }, [panelSize]);

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y));
        setPanelPos({ x: newX, y: newY });
      }
      if (resizing) {
        const dw = e.clientX - resizeStart.current.x;
        const dh = e.clientY - resizeStart.current.y;
        setPanelSize({
          w: Math.max(220, Math.min(600, resizeStart.current.w + dw)),
          h: Math.max(200, Math.min(window.innerHeight - 60, resizeStart.current.h + dh)),
        });
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
      setResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, resizing]);

  return (
    <>
      <WorkbenchLayout />

      {/* Training Mode Banner */}
      {scenario && (
        <div style={trainingBanner}>
          <div style={trainingBannerLeft}>
            <span style={trainingBannerDot} />
            <span style={trainingBannerLabel}>TRAINING</span>
            <span style={trainingBannerName}>{scenario.name}</span>
          </div>
          <button style={trainingExitBtn} onClick={onExit}>
            Exit Scenario
          </button>
        </div>
      )}

      {/* Draggable + Resizable Objectives Panel */}
      {scenario && sim?.state && (
        <div
          style={{
            position: 'fixed',
            left: resolvedX,
            top: panelPos.y,
            width: panelSize.w,
            height: panelSize.h,
            zIndex: 150,
            borderRadius: RADIUS.xl,
            border: `1px solid rgba(245, 158, 11, 0.3)`,
            background: 'rgba(10, 15, 20, 0.92)',
            backdropFilter: BLUR.lg,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            userSelect: dragging || resizing ? 'none' : 'auto',
          }}
        >
          {/* Drag handle (title bar) */}
          <div
            onMouseDown={handleDragStart}
            style={objPanelTitleBar}
          >
            <span style={objPanelTitleText}>MISSION OBJECTIVES</span>
            <span style={objPanelDragHint}>drag to move</span>
          </div>

          {/* Scrollable content */}
          <div style={objPanelContent}>
            <LiveCheckpointPanel
              objectives={scenario.objectives}
              reactorState={sim.state}
              currentMetrics={liveMetrics}
              onObjectiveComplete={(objectiveId) => {
                if (metricsCollector) {
                  metricsCollector.completeObjective(objectiveId);
                }
              }}
            />
          </div>

          {/* Resize handle */}
          <div
            data-resize-handle
            onMouseDown={handleResizeStart}
            style={objResizeHandle}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}
    </>
  );
}

export default function TrainingPage() {
  // App state
  const [appState, setAppState] = useState<AppState>('selector');
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [currentRole, setCurrentRole] = useState<TrainingRole>(TrainingRole.RO);
  const [metricsCollector, setMetricsCollector] = useState<MetricsCollector | null>(null);

  // Completion tracking for selector
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    setCompletedIds(loadCompletionData());
  }, [appState]);

  // Real-time metrics for checkpoint evaluation
  const [liveMetrics, setLiveMetrics] = useState({
    timeElapsed: 0, tripCount: 0, scramCount: 0, maxPower: 0,
    maxFuelTemp: 0, maxCoolantTemp: 0, currentPower: 0, rodPosition: 0,
    rodWithdrawalRate: 0, timeToFirstCriticality: -1, powerChangeCount: 0,
    observationTime: 0, finalPower: 0, timeAt50Percent: 0, maxPowerRate: 0,
  });
  const lastRodPositionRef = useRef(0.05);
  const lastRodTimestampRef = useRef(0);
  const lastPowerRef = useRef(0);

  const metricsCollectorRef = useRef(metricsCollector);
  metricsCollectorRef.current = metricsCollector;
  const selectedScenarioRef = useRef(selectedScenario);
  selectedScenarioRef.current = selectedScenario;

  const handleTick = useCallback(
    (currentState: ReactorState, _reactivity: ReactivityComponents, controls: { rod: number; pumpOn: boolean; scram: boolean; tripActive: boolean }, _simDelta: number) => {
      const collector = metricsCollectorRef.current;
      const scenario = selectedScenarioRef.current;

      if (collector) {
        collector.recordState(currentState, controls.rod, controls.pumpOn, controls.scram);
      }

      if (scenario) {
        const currentPowerPercent = currentState.P * 100;
        const rodDelta = controls.rod - lastRodPositionRef.current;
        const timeDelta = currentState.t - lastRodTimestampRef.current;
        const rodRate = timeDelta > 0 ? Math.abs(rodDelta * 100 / (timeDelta / 60)) : 0;

        if (rodDelta !== 0) {
          lastRodPositionRef.current = controls.rod;
          lastRodTimestampRef.current = currentState.t;
        }

        const powerChanged = Math.abs(currentPowerPercent - lastPowerRef.current) > 5;
        if (powerChanged) lastPowerRef.current = currentPowerPercent;

        setLiveMetrics(prev => ({
          timeElapsed: currentState.t,
          tripCount: controls.tripActive ? prev.tripCount + (prev.tripCount === 0 ? 1 : 0) : prev.tripCount,
          scramCount: controls.scram ? prev.scramCount + (prev.scramCount === 0 ? 1 : 0) : prev.scramCount,
          maxPower: Math.max(prev.maxPower, currentPowerPercent),
          maxFuelTemp: Math.max(prev.maxFuelTemp, currentState.Tf),
          maxCoolantTemp: Math.max(prev.maxCoolantTemp, currentState.Tc),
          currentPower: currentPowerPercent,
          rodPosition: controls.rod * 100,
          rodWithdrawalRate: rodRate,
          timeToFirstCriticality: prev.timeToFirstCriticality === -1 && currentState.P > 0.001 ? currentState.t : prev.timeToFirstCriticality,
          powerChangeCount: prev.powerChangeCount + (powerChanged ? 1 : 0),
          observationTime: currentState.t,
          finalPower: currentPowerPercent,
          timeAt50Percent: collector ? collector.getLiveMetricValue('timeAt50Percent') : 0,
          maxPowerRate: collector ? collector.getLiveMetricValue('maxPowerRate') : 0,
        }));
      }
    },
    []
  );

  const handleTrip = useCallback(
    (tripState: ReactorState, _reason: string, controls: { rod: number; pumpOn: boolean; scram: boolean; tripActive: boolean }) => {
      const collector = metricsCollectorRef.current;
      if (collector) collector.recordState(tripState, 0, controls.pumpOn, true);
    },
    []
  );

  const handleSimStop = useCallback((finalState: ReactorState | null) => {
    const collector = metricsCollectorRef.current;
    const scenario = selectedScenarioRef.current;
    if (collector && scenario && finalState) {
      const finalMetrics = collector.finalize(finalState, scenario);
      if (finalMetrics.success) markScenarioCompleted(scenario.id);
      setAppState('debrief');
    }
  }, []);

  const sim = useReactorSimulation({
    onTick: handleTick,
    onTrip: handleTrip,
    onStop: handleSimStop,
  });

  const { handleStart, handleStop, initializeModel } = sim;

  // Scenario selection handlers
  const handleSelectScenario = (scenario: TrainingScenario) => {
    setSelectedScenario(scenario);
    setCurrentRole(scenario.recommendedRole);
    setAppState('briefing');
  };

  const handleSelectFreePlay = () => {
    setSelectedScenario(null);
    setCurrentRole(TrainingRole.FREE_PLAY);
    initializeModel();
    setAppState('running');
  };

  const handleStartScenario = () => {
    if (selectedScenario) {
      initializeModel(
        selectedScenario.initialState.reactorState,
        selectedScenario.initialState.controls.rod,
        selectedScenario.initialState.timeAcceleration
      );
      const collector = new MetricsCollector(selectedScenario.id);
      setMetricsCollector(collector);
      setAppState('running');
      handleStart();
    }
  };

  const handleBackToSelector = () => {
    handleStop();
    setSelectedScenario(null);
    setMetricsCollector(null);
    setAppState('selector');
  };

  const handleRestartScenario = () => {
    if (selectedScenario) setAppState('briefing');
  };

  // Helpers
  const getDifficultyColor = (d: number) => {
    return d === 1 ? COLORS.emerald : d === 2 ? COLORS.amber : d === 3 ? '#ff9900' : d === 4 ? COLORS.red : COLORS.slate;
  };
  const getDifficultyLabel = (d: number) => {
    return d === 1 ? 'Beginner' : d === 2 ? 'Intermediate' : d === 3 ? 'Advanced' : d === 4 ? 'Expert' : 'Unknown';
  };

  // ── SELECTOR STATE ──────────────────────────────────────────────────
  if (appState === 'selector') {
    return (
      <>
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
          * { box-sizing: border-box; }
          body { background: #060a0f; margin: 0; font-family: ${FONTS.sans}; overflow: auto; }
        `}</style>

        <div style={selectorShell}>
          {/* Top bar matching workbench */}
          <div style={selectorTopBar}>
            <div style={selectorTopBarLeft}>
              <img src="/logo.png" alt="U-FORCE" style={selectorLogo} />
              <span style={selectorBrand}>U-FORCE</span>
              <span style={selectorBrandSub}>TRAINING CENTER</span>
            </div>
            <button style={selectorBackBtn} onClick={() => window.location.href = '/'}>
              Back to Simulator
            </button>
          </div>

          {/* Scenario Grid */}
          <div style={selectorContent}>
            <div style={selectorHeader}>
              <h1 style={selectorTitle}>Training Scenarios</h1>
              <p style={selectorSubtitle}>Select a scenario to begin training, or explore freely in sandbox mode</p>
            </div>

            {/* Free Play Card */}
            <div style={cardStyle(false)} onClick={handleSelectFreePlay}>
              <div style={cardRow}>
                <div style={cardInfo}>
                  <div style={cardNameRow}>
                    <span style={cardName}>Free Play Mode</span>
                    <span style={badgeStyle(COLORS.slate)}>SANDBOX</span>
                  </div>
                  <p style={cardDesc}>
                    Full control authority with no objectives or time limits. Experiment with reactor physics freely.
                  </p>
                  <div style={cardMetas}>
                    <span style={metaItem}>Unlimited time</span>
                    <span style={metaDot} />
                    <span style={metaItem}>All controls</span>
                    <span style={metaDot} />
                    <span style={metaItem}>No scoring</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenario Cards */}
            {SCENARIOS.map((scenario) => {
              const done = completedIds.includes(scenario.id);
              return (
                <div
                  key={scenario.id}
                  style={cardStyle(done)}
                  onClick={() => handleSelectScenario(scenario)}
                >
                  <div style={cardRow}>
                    <div style={cardInfo}>
                      <div style={cardNameRow}>
                        <span style={cardName}>{scenario.name}</span>
                        <span style={badgeStyle(getDifficultyColor(scenario.difficulty))}>
                          {getDifficultyLabel(scenario.difficulty)}
                        </span>
                        {done && <span style={doneBadge}>COMPLETED</span>}
                      </div>
                      <p style={cardDesc}>{scenario.description}</p>
                      <div style={cardMetas}>
                        <span style={metaItem}>~{scenario.estimatedDuration} min</span>
                        <span style={metaDot} />
                        <span style={metaItem}>{getRoleDisplayName(scenario.recommendedRole)}</span>
                        <span style={metaDot} />
                        <span style={metaItem}>{scenario.objectives.length} objective{scenario.objectives.length > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // ── BRIEFING STATE ──────────────────────────────────────────────────
  if (appState === 'briefing' && selectedScenario) {
    return (
      <>
        <NavigationBar />
        <ScenarioBriefing
          scenario={selectedScenario}
          role={currentRole}
          onStart={handleStartScenario}
          onBack={handleBackToSelector}
        />
      </>
    );
  }

  // ── DEBRIEF STATE ───────────────────────────────────────────────────
  if (appState === 'debrief' && metricsCollector && selectedScenario) {
    return (
      <>
        <NavigationBar />
        <ScenarioDebrief
          metrics={metricsCollector.getMetrics()}
          scenario={selectedScenario}
          onRestart={handleRestartScenario}
          onBackToScenarios={handleBackToSelector}
        />
      </>
    );
  }

  // ── RUNNING STATE — Use Workbench Layout with training overlays ─────
  return (
    <WorkbenchProvider sim={sim}>
      <TrainingWorkbenchInner
        scenario={selectedScenario}
        liveMetrics={liveMetrics}
        metricsCollector={metricsCollector}
        onExit={handleBackToSelector}
      />
    </WorkbenchProvider>
  );
}

// ============================================================================
// STYLES — Selector (matching workbench dark theme)
// ============================================================================

const selectorShell: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #060a0f 0%, #0c1117 100%)',
  fontFamily: FONTS.sans,
};

const selectorTopBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  height: '42px',
  background: COLORS.bgDark,
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
  backdropFilter: BLUR.md,
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const selectorTopBarLeft: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const selectorLogo: React.CSSProperties = {
  width: '22px',
  height: '22px',
  filter: 'brightness(0) invert(1) opacity(0.7)',
};

const selectorBrand: React.CSSProperties = {
  fontSize: FONT_SIZES.lg,
  fontWeight: 700,
  color: COLORS.white,
  letterSpacing: '1px',
};

const selectorBrandSub: React.CSSProperties = {
  fontSize: FONT_SIZES.sm,
  color: COLORS.slateDark,
  letterSpacing: '1.5px',
  marginLeft: '4px',
};

const selectorBackBtn: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: FONT_SIZES.sm,
  fontWeight: 600,
  fontFamily: FONTS.sans,
  color: COLORS.slate,
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${COLORS.borderMedium}`,
  borderRadius: RADIUS.md,
  cursor: 'pointer',
  letterSpacing: '0.3px',
};

const selectorContent: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '40px 24px 60px',
};

const selectorHeader: React.CSSProperties = {
  marginBottom: '32px',
};

const selectorTitle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: COLORS.white,
  margin: '0 0 6px',
  letterSpacing: '0.3px',
};

const selectorSubtitle: React.CSSProperties = {
  fontSize: FONT_SIZES.xl,
  color: COLORS.slateDark,
  margin: 0,
};

const cardStyle = (completed: boolean): React.CSSProperties => ({
  padding: '16px 20px',
  marginBottom: '8px',
  background: completed ? 'rgba(16, 185, 129, 0.04)' : COLORS.bgMedium,
  border: `1px solid ${completed ? COLORS.borderEmeraldLight : COLORS.borderSubtle}`,
  borderRadius: RADIUS.lg,
  cursor: 'pointer',
  transition: 'all 0.12s ease',
});

const cardRow: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  alignItems: 'flex-start',
};

const cardInfo: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const cardNameRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '6px',
  flexWrap: 'wrap',
};

const cardName: React.CSSProperties = {
  fontSize: FONT_SIZES.xl,
  fontWeight: 600,
  color: COLORS.white,
};

const badgeStyle = (color: string): React.CSSProperties => ({
  padding: '2px 6px',
  borderRadius: RADIUS.sm,
  fontSize: FONT_SIZES.xs,
  fontWeight: 700,
  letterSpacing: '0.5px',
  background: `${color}20`,
  color: color,
  border: `1px solid ${color}40`,
});

const doneBadge: React.CSSProperties = {
  ...badgeStyle(COLORS.emerald),
  background: COLORS.emeraldBg,
  color: COLORS.emerald,
  border: `1px solid ${COLORS.borderEmeraldLight}`,
};

const cardDesc: React.CSSProperties = {
  fontSize: FONT_SIZES.md,
  color: COLORS.slate,
  lineHeight: 1.5,
  margin: '0 0 8px',
};

const cardMetas: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexWrap: 'wrap',
};

const metaItem: React.CSSProperties = {
  fontSize: FONT_SIZES.sm,
  color: COLORS.slateDark,
};

const metaDot: React.CSSProperties = {
  width: '3px',
  height: '3px',
  borderRadius: '50%',
  background: COLORS.slateDark,
  opacity: 0.5,
};

// ============================================================================
// STYLES — Training Overlays (running state)
// ============================================================================

const trainingBanner: React.CSSProperties = {
  position: 'fixed',
  top: '6px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '5px 14px',
  background: 'rgba(245, 158, 11, 0.12)',
  border: `1px solid rgba(245, 158, 11, 0.35)`,
  borderRadius: RADIUS.lg,
  backdropFilter: BLUR.md,
  zIndex: 200,
  fontFamily: FONTS.sans,
};

const trainingBannerLeft: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const trainingBannerDot: React.CSSProperties = {
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  background: COLORS.amber,
  boxShadow: `0 0 6px ${COLORS.amber}`,
  animation: 'pulse 2s infinite',
};

const trainingBannerLabel: React.CSSProperties = {
  fontSize: FONT_SIZES.sm,
  fontWeight: 700,
  color: COLORS.amber,
  letterSpacing: '1.5px',
};

const trainingBannerName: React.CSSProperties = {
  fontSize: FONT_SIZES.md,
  fontWeight: 600,
  color: COLORS.white,
};

const trainingExitBtn: React.CSSProperties = {
  padding: '3px 10px',
  fontSize: FONT_SIZES.sm,
  fontWeight: 600,
  fontFamily: FONTS.sans,
  color: COLORS.red,
  background: 'rgba(239, 68, 68, 0.12)',
  border: `1px solid rgba(239, 68, 68, 0.3)`,
  borderRadius: RADIUS.md,
  cursor: 'pointer',
  letterSpacing: '0.3px',
};

const objPanelTitleBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 12px',
  borderBottom: `1px solid rgba(245, 158, 11, 0.2)`,
  cursor: 'grab',
  flexShrink: 0,
  borderRadius: `${RADIUS.xl} ${RADIUS.xl} 0 0`,
  background: 'rgba(245, 158, 11, 0.06)',
};

const objPanelTitleText: React.CSSProperties = {
  fontSize: FONT_SIZES.sm,
  fontWeight: 700,
  color: COLORS.amber,
  letterSpacing: '1.5px',
};

const objPanelDragHint: React.CSSProperties = {
  fontSize: FONT_SIZES.xs,
  color: COLORS.slateDark,
  opacity: 0.6,
  fontStyle: 'italic',
};

const objPanelContent: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  minHeight: 0,
};

const objResizeHandle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: '18px',
  height: '18px',
  cursor: 'nwse-resize',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: `0 0 ${RADIUS.xl} 0`,
};
