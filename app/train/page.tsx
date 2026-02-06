"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  ReactorModel,
  DEFAULT_PARAMS,
  type ControlInputs,
  type ReactorState,
  type ReactivityComponents,
} from "../../lib/reactor";
import {
  SCENARIOS,
  TrainingRole,
  type TrainingScenario,
  type TrainingSession,
  MetricsCollector,
  getRolePermissions,
  markScenarioCompleted,
} from "../../lib/training";
import ScenarioSelector from "../../components/ScenarioSelector";
import ScenarioBriefing from "../../components/ScenarioBriefing";
import ScenarioDebrief from "../../components/ScenarioDebrief";
import TrainingModulesSidebar from "../../components/TrainingModulesSidebar";
import NavigationBar from "../../components/NavigationBar";

const DT = 0.01; // 10ms timestep
const HISTORY_LENGTH = 500; // 5 seconds of history
const ROD_SPEED = 0.05; // 5%/second max rod movement rate

interface HistoryPoint {
  t: number;
  P: number;
  Tf: number;
  Tc: number;
  rho: number;
}

type AppState = 'selector' | 'briefing' | 'running' | 'debrief';

export default function TrainingPage() {
  // App state
  const [appState, setAppState] = useState<AppState>('selector');
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [currentRole, setCurrentRole] = useState<TrainingRole>(TrainingRole.RO);
  const [metricsCollector, setMetricsCollector] = useState<MetricsCollector | null>(null);

  // Control states
  const [rod, setRod] = useState(0.05);
  const [pumpOn, setPumpOn] = useState(true);
  const [scram, setScram] = useState(false);
  const [speed, setSpeed] = useState(0.5); // Start at 0.5x speed - balanced pace
  const [learningMode, setLearningMode] = useState(false); // Learning hints toggle

  // Simulation states
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [state, setState] = useState<ReactorState | null>(null);
  const [reactivity, setReactivity] = useState<ReactivityComponents | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tripActive, setTripActive] = useState(false);
  const [tripReason, setTripReason] = useState<string | null>(null);
  const [rodActual, setRodActual] = useState(0.05); // Actual rod position (rate-limited)

  // Refs
  const modelRef = useRef<ReactorModel | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const scenarioTimeRef = useRef<number>(0);

  // Refs for real-time controls (avoid stale closures)
  const rodRef = useRef(rod);
  const pumpRef = useRef(pumpOn);
  const scramRef = useRef(scram);
  const rodActualRef = useRef(rod); // Actual rod position sent to model (rate-limited)

  // Keep refs in sync with state
  useEffect(() => { rodRef.current = rod; }, [rod]);
  useEffect(() => { pumpRef.current = pumpOn; }, [pumpOn]);
  useEffect(() => { scramRef.current = scram; }, [scram]);

  // Get role permissions
  const permissions = getRolePermissions(currentRole);

  // Initialize model for scenario or free play
  const initializeModel = useCallback((scenario?: TrainingScenario) => {
    try {
      let initialState: ReactorState;
      let initialRod: number;

      if (scenario) {
        initialState = scenario.initialState.reactorState;
        initialRod = scenario.initialState.controls.rod;
        setSpeed(scenario.initialState.timeAcceleration);
      } else {
        // Free play mode - start in TRUE COLD SHUTDOWN (subcritical, stable)
        const initialPower = 1e-8; // Essentially zero power (shutdown)
        const coldTemp = 300; // Cold shutdown temperature (K)

        // Calculate equilibrium precursor concentrations for this tiny power
        const beta = [0.000215, 0.00142, 0.00127, 0.00257, 0.00075, 0.00027];
        const lambda = [0.0124, 0.0305, 0.111, 0.301, 1.14, 3.01];
        const Lambda = 1e-3; // MUST MATCH params.ts LAMBDA_PROMPT

        const precursors = beta.map((b, i) => (b / lambda[i]) * (initialPower / Lambda));

        initialState = {
          t: 0,
          P: initialPower,
          Tf: coldTemp,
          Tc: coldTemp,
          C: precursors,
        };
        initialRod = 0.0; // Start with rods fully inserted (0%) - truly shutdown
      }

      modelRef.current = new ReactorModel(initialState, DEFAULT_PARAMS);
      setState(initialState);
      setRod(initialRod);
      rodRef.current = initialRod;
      rodActualRef.current = initialRod;
      setRodActual(initialRod);
      setScram(false);
      scramRef.current = false;
      setPumpOn(true);
      pumpRef.current = true;
      setTripActive(false);
      setTripReason(null);
      setHistory([{
        t: 0,
        P: initialState.P,
        Tf: initialState.Tf,
        Tc: initialState.Tc,
        rho: 0,
      }]);

      const controls: ControlInputs = { rod: initialRod, pumpOn: true, scram: false };
      const rho = modelRef.current.getReactivity(controls);
      setReactivity(rho);

      scenarioTimeRef.current = 0;

      if (!scenario) {
        console.log(`Initialized in cold shutdown: P=${initialState.P}, T=${initialState.Tf}K, rod=${initialRod*100}%, rho=${(rho.rhoTotal*1e5).toFixed(0)} pcm`);
      }
    } catch (error) {
      console.error("Initialization error:", error);
    }
  }, []);

  // Protection system check
  const checkTrips = useCallback((currentState: ReactorState): { trip: boolean; reason: string | null } => {
    if (currentState.P > 1.1) {
      return { trip: true, reason: "HIGH POWER >110%" };
    }
    if (currentState.Tf > 1800) {
      return { trip: true, reason: "HIGH FUEL TEMP >1800K" };
    }
    if (currentState.Tc > 620) {
      return { trip: true, reason: "HIGH COOLANT TEMP >620K" };
    }
    return { trip: false, reason: null };
  }, []);

  // Animation loop
  const tick = useCallback((timestamp: number) => {
    if (!modelRef.current) {
      animationRef.current = requestAnimationFrame(tick);
      return;
    }

    // PAUSE: Don't update simulation, but keep loop running for responsiveness
    if (isPaused) {
      lastTimeRef.current = 0; // Reset time on unpause
      animationRef.current = requestAnimationFrame(tick);
      return;
    }

    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }

    const deltaMs = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    const simDelta = (deltaMs / 1000) * speed;
    accumulatedRef.current += simDelta;
    scenarioTimeRef.current += simDelta;

    const stepsNeeded = Math.floor(accumulatedRef.current / DT);
    accumulatedRef.current -= stepsNeeded * DT;

    // Rate-limit rod movement
    const rodTarget = rodRef.current;
    const rodActualNow = rodActualRef.current;
    const maxDelta = ROD_SPEED * simDelta;
    rodActualRef.current = rodActualNow + Math.max(-maxDelta, Math.min(maxDelta, rodTarget - rodActualNow));

    // Use refs for real-time control values
    let currentScram = scramRef.current;
    const controls: ControlInputs = {
      rod: rodActualRef.current,
      pumpOn: pumpRef.current,
      scram: currentScram
    };

    try {
      for (let i = 0; i < stepsNeeded; i++) {
        const newState = modelRef.current.step(DT, { ...controls, scram: currentScram });

        // Check protection system
        if (!tripActive && !currentScram) {
          const { trip, reason } = checkTrips(newState);
          if (trip) {
            setTripActive(true);
            setTripReason(reason);
            setScram(true);
            scramRef.current = true;
            setRod(0); // Auto-trip: Insert all rods
            rodRef.current = 0;
            rodActualRef.current = 0; // Trip bypasses rate limit
            currentScram = true;

            // Record trip in metrics
            if (metricsCollector) {
              metricsCollector.recordState(newState, rodRef.current, pumpRef.current, true);
            }
          }
        }
      }
    } catch (error) {
      console.error("Simulation error:", error);
      setTripActive(true);
      setTripReason("SIMULATION ERROR");
      setScram(true);
      scramRef.current = true;
      setRod(0); // Error: Insert all rods
      rodRef.current = 0;
      rodActualRef.current = 0;
      handleStop();
      return;
    }

    const currentState = modelRef.current.getState();
    const currentReactivity = modelRef.current.getReactivity(controls);

    setState(currentState);
    setReactivity(currentReactivity);
    setRodActual(rodActualRef.current);

    // Record metrics if in training mode
    if (metricsCollector) {
      metricsCollector.recordState(currentState, rodRef.current, pumpRef.current, scramRef.current);
    }

    // Update history
    setHistory(prev => {
      const newPoint: HistoryPoint = {
        t: currentState.t,
        P: currentState.P,
        Tf: currentState.Tf,
        Tc: currentState.Tc,
        rho: currentReactivity.rhoTotal,
      };
      const updated = [...prev, newPoint];
      return updated.slice(-HISTORY_LENGTH);
    });

    animationRef.current = requestAnimationFrame(tick);
  }, [isPaused, speed, tripActive, checkTrips, metricsCollector]);

  // Start/Stop handlers
  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(tick);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    lastTimeRef.current = 0;
  };

  const handleStop = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);

    // Finalize metrics if in training mode
    if (metricsCollector && selectedScenario && state) {
      const finalMetrics = metricsCollector.finalize(state, selectedScenario);

      // Track completion if scenario passed
      if (finalMetrics.success) {
        markScenarioCompleted(selectedScenario.id);
      }

      setAppState('debrief');
    }
  };

  const handleScram = () => {
    setScram(true);
    scramRef.current = true;
    setRod(0); // SCRAM: Insert all rods immediately
    rodRef.current = 0;
    rodActualRef.current = 0; // SCRAM bypasses rate limit
    setTripActive(true);
    setTripReason("MANUAL SCRAM");
  };

  const handleResetTrip = () => {
    setScram(false);
    scramRef.current = false;
    setTripActive(false);
    setTripReason(null);
    // Note: Rods stay inserted at 0% - operator must manually withdraw
  };

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
      initializeModel(selectedScenario);
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
    if (selectedScenario) {
      setAppState('briefing');
    }
  };

  // Computed values
  const power = state ? state.P * 100 : 0;
  const fuelTemp = state ? state.Tf : 500;
  const coolantTemp = state ? state.Tc : 500;
  const simTime = state ? state.t : 0;

  // Render based on app state
  if (appState === 'selector') {
    return (
      <>
        <NavigationBar />
        <TrainingModulesSidebar />
        <ScenarioSelector
          scenarios={SCENARIOS}
          onSelectScenario={handleSelectScenario}
          onSelectFreePlay={handleSelectFreePlay}
        />
      </>
    );
  }

  if (appState === 'briefing' && selectedScenario) {
    return (
      <>
        <NavigationBar />
        <TrainingModulesSidebar currentScenarioId={selectedScenario.id} />
        <ScenarioBriefing
          scenario={selectedScenario}
          role={currentRole}
          onStart={handleStartScenario}
          onBack={handleBackToSelector}
        />
      </>
    );
  }

  if (appState === 'debrief' && metricsCollector && selectedScenario) {
    return (
      <>
        <NavigationBar />
        <TrainingModulesSidebar currentScenarioId={selectedScenario.id} />
        <ScenarioDebrief
          metrics={metricsCollector.getMetrics()}
          scenario={selectedScenario}
          onRestart={handleRestartScenario}
          onBackToScenarios={handleBackToSelector}
        />
      </>
    );
  }

  // Running state - show simulator
  return (
    <>
      <NavigationBar />
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <main style={container}>
        <header style={header}>
          <div style={headerRow}>
            <div style={titleContainer}>
              <img src="/logo.png" alt="U-FORCE Logo" style={logoIcon} />
              <div>
                <h1 style={title}>
                  {selectedScenario ? selectedScenario.name : 'U-FORCE Reactor Simulator'}
                </h1>
                <p style={subtitle}>
                  {selectedScenario
                    ? `Training Mode - ${currentRole}`
                    : 'Free Play Mode - Real-time point kinetics simulation'}
                </p>
              </div>
            </div>
            <div>
              <button style={exitButton} onClick={handleBackToSelector}>
                ← EXIT
              </button>
            </div>
          </div>
        </header>

        {/* Trip Alert Banner */}
        {tripActive && tripReason && (
          <div style={tripBanner}>
            <span style={tripIcon}>⚠</span>
            <span>REACTOR TRIP: {tripReason}</span>
          </div>
        )}

        <section style={layout}>
          {/* Left Column - Controls */}
          <div style={controlColumn}>
            <div style={panelHeader}>
              <div style={panelIndicator(isRunning && !isPaused)} />
              <span style={panelTitle}>CORE INPUTS</span>
            </div>

            {/* Simulation Controls */}
            <div style={simControls}>
              {!isRunning ? (
                <button style={startButton} onClick={handleStart}>▶ START</button>
              ) : isPaused ? (
                <button style={startButton} onClick={handleResume}>▶ RESUME</button>
              ) : (
                <button style={pauseButton} onClick={handlePause}>⏸ PAUSE</button>
              )}
              <button style={stopButton} onClick={handleStop} disabled={!isRunning}>⏹ STOP</button>
            </div>

            {/* Trip Reset */}
            {tripActive && (
              <div style={tripResetSection}>
                <button style={tripResetButton} onClick={handleResetTrip}>
                  🔄 RESET TRIP
                </button>
                <div style={tripResetHint}>
                  Clears SCRAM and re-enables controls
                </div>
              </div>
            )}

            {/* Speed Control */}
            <div style={speedControl}>
              <span style={speedLabel}>SPEED:</span>
              {[0.25, 0.5, 1, 2, 5, 10].map(s => (
                <button
                  key={s}
                  style={speedButton(speed === s)}
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Rod Control */}
            <div style={controlGroup}>
              <label style={label}>
                CONTROL ROD TARGET
                <span style={labelValue}>{Math.round(rod * 100)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={rod}
                onChange={(e) => setRod(parseFloat(e.target.value))}
                disabled={!permissions.canControlRods}
                style={slider}
              />
              <div style={rodActualDisplay}>
                ACTUAL: {Math.round(rodActual * 100)}%
              </div>
              <div style={helpText}>
                0% = fully inserted (subcritical) · 100% = fully withdrawn
              </div>
              {!tripActive && permissions.canControlRods && (
                <div style={activeControlHint}>
                  ✓ Adjustable during simulation
                </div>
              )}
              {tripActive && permissions.canControlRods && (
                <div style={warningText}>
                  ⚠ SCRAM ACTIVE - Rods were inserted to 0% (still adjustable)
                </div>
              )}
              {!permissions.canControlRods && (
                <div style={warningText}>
                  ⚠ Rod control disabled for this role
                </div>
              )}
            </div>

            {/* Pump & Scram */}
            <div style={controlRow}>
              <button
                type="button"
                style={{ ...toggleButton, ...(pumpOn ? toggleButtonActive : {}) }}
                onClick={() => setPumpOn(v => !v)}
                disabled={!permissions.canControlPump}
              >
                <span style={toggleLabel}>PRIMARY PUMP</span>
                <span style={pumpOn ? statusOn : statusOff}>{pumpOn ? "ON" : "OFF"}</span>
              </button>

              <button
                type="button"
                style={{ ...scramButton, ...(tripActive ? scramActive : {}) }}
                onClick={handleScram}
                disabled={!permissions.canScram}
              >
                <span style={toggleLabel}>SCRAM</span>
                <span style={tripActive ? statusOff : statusArmed}>
                  {tripActive ? "FIRED" : "ARMED"}
                </span>
              </button>
            </div>
          </div>

          {/* Right Column - Displays */}
          <div style={displayColumn}>
            {/* Power Display */}
            <div style={powerDisplay}>
              <div style={powerHeader}>
                <span style={powerLabel}>REACTOR POWER</span>
                <span style={powerStatus(power)}>
                  {power > 105 ? "HIGH" : power < 50 ? "LOW" : "NOMINAL"}
                </span>
              </div>
              <div style={powerValueContainer}>
                <span style={powerValue(power)}>{power.toFixed(1)}</span>
                <span style={powerUnit}>%</span>
              </div>
              <div style={powerBar}>
                <div style={powerBarFill(power)} />
              </div>
            </div>

            {/* Power History Graph */}
            <div style={graphContainer}>
              <div style={graphHeader}>
                <span style={graphTitle}>POWER HISTORY</span>
                <span style={graphTime}>{simTime.toFixed(1)}s</span>
              </div>
              <svg width="100%" height="80" style={graphSvg}>
                <line x1="0" y1="40" x2="100%" y2="40" stroke="#333" strokeDasharray="4" />
                <line x1="0" y1="20" x2="100%" y2="20" stroke="#222" strokeDasharray="2" />
                <line x1="0" y1="60" x2="100%" y2="60" stroke="#222" strokeDasharray="2" />

                <polyline
                  fill="none"
                  stroke="#ff9900"
                  strokeWidth="2"
                  points={history.map((p, i) => {
                    const x = (i / HISTORY_LENGTH) * 100;
                    const y = 80 - Math.min(p.P * 80, 80);
                    return `${x}%,${y}`;
                  }).join(" ")}
                />

                <line x1="0" y1="0" x2="100%" y2="0" stroke="#00ff00" strokeWidth="1" opacity="0.3" />
              </svg>
              <div style={graphLabels}>
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div style={metricsGrid}>
              <div style={metricCard}>
                <div style={metricLabel}>FUEL TEMP</div>
                <div style={metricValue(fuelTemp > 1500)}>{fuelTemp.toFixed(0)} <span style={metricUnit}>K</span></div>
              </div>
              <div style={metricCard}>
                <div style={metricLabel}>COOLANT TEMP</div>
                <div style={metricValue(coolantTemp > 600)}>{coolantTemp.toFixed(0)} <span style={metricUnit}>K</span></div>
              </div>
            </div>

            {/* Reactivity Breakdown */}
            <div style={reactivityPanel}>
              <div style={panelHeader}>
                <div style={panelIndicator(true)} />
                <span style={panelTitle}>REACTIVITY</span>
              </div>
              <div style={reactivityGrid}>
                <div style={reactivityRow}>
                  <span style={reactivityLabel}>External (Rods)</span>
                  <span style={reactivityValue}>{reactivity ? (reactivity.rhoExt * 1e5).toFixed(0) : 0} pcm</span>
                </div>
                <div style={reactivityRow}>
                  <span style={reactivityLabel}>Doppler (Fuel)</span>
                  <span style={reactivityValue}>{reactivity ? (reactivity.rhoDoppler * 1e5).toFixed(0) : 0} pcm</span>
                </div>
                <div style={reactivityRow}>
                  <span style={reactivityLabel}>Moderator</span>
                  <span style={reactivityValue}>{reactivity ? (reactivity.rhoMod * 1e5).toFixed(0) : 0} pcm</span>
                </div>
                <div style={reactivityRowTotal}>
                  <span style={reactivityLabel}>TOTAL</span>
                  <span style={reactivityValueTotal(reactivity?.rhoTotal || 0)}>
                    {reactivity ? (reactivity.rhoTotal * 1e5).toFixed(0) : 0} pcm
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

// ============================================================================
// STYLES (abbreviated for length - includes all existing styles plus new ones)
// ============================================================================

const container: React.CSSProperties = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "24px",
  paddingTop: "84px", // Account for 60px nav bar + 24px spacing
};

const header: React.CSSProperties = {
  marginBottom: "20px",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
};

const titleContainer: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const logoIcon: React.CSSProperties = {
  width: "48px",
  height: "48px",
  filter: "brightness(0) saturate(100%) invert(60%) sepia(98%) saturate(2000%) hue-rotate(0deg) brightness(98%) contrast(101%) drop-shadow(0 0 15px rgba(255, 153, 0, 0.8))",
};

const title: React.CSSProperties = {
  fontSize: "24px",
  margin: "0 0 4px",
  color: "#ff9900",
  letterSpacing: "2px",
};

const subtitle: React.CSSProperties = {
  fontSize: "12px",
  color: "#888",
  margin: 0,
};

const exitButton: React.CSSProperties = {
  padding: "8px 16px",
  background: "rgba(0, 0, 0, 0.4)",
  color: "#888",
  border: "1px solid #444",
  borderRadius: "4px",
  fontSize: "12px",
  fontWeight: "bold",
  cursor: "pointer",
};

const tripBanner: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 16px",
  marginBottom: "16px",
  background: "rgba(255, 0, 0, 0.15)",
  border: "2px solid #ff0000",
  borderRadius: "4px",
  color: "#ff5555",
  fontSize: "14px",
  fontWeight: "bold",
  letterSpacing: "1px",
  animation: "blink 1s infinite",
};

const tripIcon: React.CSSProperties = {
  fontSize: "20px",
};

const layout: React.CSSProperties = {
  display: "flex",
  gap: "24px",
  flexWrap: "wrap",
};

const controlColumn: React.CSSProperties = {
  flex: "1 1 320px",
  minWidth: "300px",
};

const displayColumn: React.CSSProperties = {
  flex: "2 1 500px",
  minWidth: "400px",
};

const panelHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "12px",
};

const panelIndicator = (active: boolean): React.CSSProperties => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: active ? "#00ff00" : "#444",
  boxShadow: active ? "0 0 8px #00ff00" : "none",
});

const panelTitle: React.CSSProperties = {
  fontSize: "12px",
  letterSpacing: "2px",
  color: "#ff9900",
  fontWeight: "bold",
};

const simControls: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "12px",
};

const buttonBase: React.CSSProperties = {
  flex: 1,
  padding: "10px",
  border: "none",
  borderRadius: "4px",
  fontSize: "12px",
  fontWeight: "bold",
  letterSpacing: "1px",
  cursor: "pointer",
};

const startButton: React.CSSProperties = {
  ...buttonBase,
  background: "linear-gradient(135deg, #3d2200, #554400)",
  color: "#ff9900",
  border: "1px solid #ff9900",
};

const pauseButton: React.CSSProperties = {
  ...buttonBase,
  background: "linear-gradient(135deg, #3d3d00, #555500)",
  color: "#ffaa00",
  border: "1px solid #ffaa00",
};

const stopButton: React.CSSProperties = {
  ...buttonBase,
  background: "rgba(0, 0, 0, 0.4)",
  color: "#888",
  border: "1px solid #444",
};

const tripResetSection: React.CSSProperties = {
  marginBottom: "16px",
  padding: "12px",
  background: "rgba(255, 85, 85, 0.1)",
  border: "1px solid #ff5555",
  borderRadius: "4px",
};

const tripResetButton: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  border: "none",
  borderRadius: "4px",
  fontSize: "12px",
  fontWeight: "bold",
  letterSpacing: "1px",
  cursor: "pointer",
  background: "linear-gradient(135deg, #ff5555, #ff3333)",
  color: "#fff",
};

const tripResetHint: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "10px",
  color: "#ff9999",
  textAlign: "center",
};

const speedControl: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginBottom: "16px",
};

const speedLabel: React.CSSProperties = {
  fontSize: "11px",
  color: "#888",
  letterSpacing: "1px",
};

const speedButton = (active: boolean): React.CSSProperties => ({
  padding: "4px 8px",
  borderRadius: "3px",
  fontSize: "11px",
  fontWeight: "bold",
  cursor: "pointer",
  border: "none",
  background: active ? "#ff9900" : "rgba(0, 0, 0, 0.4)",
  color: active ? "#000" : "#888",
});

const controlGroup: React.CSSProperties = {
  marginBottom: "16px",
};

const label: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "11px",
  letterSpacing: "1px",
  color: "#ccc",
  marginBottom: "6px",
};

const labelValue: React.CSSProperties = {
  color: "#ff9900",
  fontWeight: "bold",
};

const slider: React.CSSProperties = {
  width: "100%",
  accentColor: "#ff9900",
};

const helpText: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "10px",
  color: "#666",
};

const rodActualDisplay: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "11px",
  color: "#ff9900",
  fontWeight: "bold",
  letterSpacing: "1px",
};

const activeControlHint: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "10px",
  color: "#00ff00",
  fontWeight: "bold",
};

const warningText: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "10px",
  color: "#ff5555",
  fontWeight: "bold",
};

const controlRow: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "16px",
};

const toggleButton: React.CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: "4px",
  border: "1px solid #444",
  background: "rgba(0, 0, 0, 0.4)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
};

const toggleButtonActive: React.CSSProperties = {
  borderColor: "#ff9900",
  boxShadow: "0 0 10px rgba(255, 153, 0, 0.3)",
};

const scramButton: React.CSSProperties = {
  ...toggleButton,
  borderColor: "#aa0000",
};

const scramActive: React.CSSProperties = {
  borderColor: "#ff0000",
  boxShadow: "0 0 12px rgba(255, 0, 0, 0.5)",
};

const toggleLabel: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "1px",
  color: "#ccc",
};

const statusOn: React.CSSProperties = { fontSize: "12px", color: "#00ff00", fontWeight: "bold" };
const statusOff: React.CSSProperties = { fontSize: "12px", color: "#ff5555", fontWeight: "bold" };
const statusArmed: React.CSSProperties = { fontSize: "12px", color: "#ffaa00", fontWeight: "bold" };

const powerDisplay: React.CSSProperties = {
  padding: "16px",
  borderRadius: "4px",
  border: "1px solid #333",
  background: "rgba(0, 0, 0, 0.5)",
  marginBottom: "16px",
};

const powerHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "8px",
};

const powerLabel: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "1px",
  color: "#888",
};

const powerStatus = (power: number): React.CSSProperties => ({
  fontSize: "11px",
  fontWeight: "bold",
  color: power > 105 ? "#ff5555" : power < 50 ? "#ffaa00" : "#00ff00",
});

const powerValueContainer: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "4px",
};

const powerValue = (power: number): React.CSSProperties => ({
  fontSize: "48px",
  fontWeight: "bold",
  color: power > 110 ? "#ff5555" : power > 105 ? "#ffaa00" : "#ff9900",
  fontFamily: "monospace",
});

const powerUnit: React.CSSProperties = {
  fontSize: "24px",
  color: "#666",
};

const powerBar: React.CSSProperties = {
  height: "8px",
  background: "#222",
  borderRadius: "4px",
  overflow: "hidden",
  marginTop: "8px",
};

const powerBarFill = (power: number): React.CSSProperties => ({
  height: "100%",
  width: `${Math.min(power, 120)}%`,
  background: power > 110 ? "#ff5555" : power > 105 ? "#ffaa00" : "#ff9900",
  transition: "width 0.1s, background 0.3s",
});

const graphContainer: React.CSSProperties = {
  padding: "12px",
  borderRadius: "4px",
  border: "1px solid #333",
  background: "rgba(0, 0, 0, 0.5)",
  marginBottom: "16px",
};

const graphHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "8px",
};

const graphTitle: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "1px",
  color: "#888",
};

const graphTime: React.CSSProperties = {
  fontSize: "12px",
  color: "#ff9900",
  fontFamily: "monospace",
};

const graphSvg: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.3)",
  borderRadius: "2px",
};

const graphLabels: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "9px",
  color: "#555",
  marginTop: "4px",
};

const metricsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
  marginBottom: "16px",
};

const metricCard: React.CSSProperties = {
  padding: "12px",
  borderRadius: "4px",
  border: "1px solid #333",
  background: "rgba(0, 0, 0, 0.5)",
};

const metricLabel: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "1px",
  color: "#888",
  marginBottom: "4px",
};

const metricValue = (warning: boolean): React.CSSProperties => ({
  fontSize: "24px",
  fontWeight: "bold",
  color: warning ? "#ff5555" : "#ff9900",
  fontFamily: "monospace",
});

const metricUnit: React.CSSProperties = {
  fontSize: "12px",
  color: "#666",
  marginLeft: "4px",
};

const reactivityPanel: React.CSSProperties = {
  padding: "12px",
  borderRadius: "4px",
  border: "1px solid #333",
  background: "rgba(0, 0, 0, 0.5)",
};

const reactivityGrid: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const reactivityRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "12px",
};

const reactivityRowTotal: React.CSSProperties = {
  ...reactivityRow,
  borderTop: "1px solid #333",
  paddingTop: "6px",
  marginTop: "4px",
};

const reactivityLabel: React.CSSProperties = {
  color: "#888",
};

const reactivityValue: React.CSSProperties = {
  color: "#ccc",
  fontFamily: "monospace",
};

const reactivityValueTotal = (rho: number): React.CSSProperties => ({
  ...reactivityValue,
  color: rho > 0.0001 ? "#ffaa00" : rho < -0.0001 ? "#66aaff" : "#00ff00",
  fontWeight: "bold",
});
