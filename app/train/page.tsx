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
import { LiveCheckpointPanel } from "../../components/LiveCheckpointPanel";

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

  // Real-time metrics for checkpoint evaluation
  const [liveMetrics, setLiveMetrics] = useState({
    timeElapsed: 0,
    tripCount: 0,
    scramCount: 0,
    maxPower: 0,
    maxFuelTemp: 0,
    maxCoolantTemp: 0,
    currentPower: 0,
    rodPosition: 0,
    rodWithdrawalRate: 0,
    timeToFirstCriticality: -1, // -1 = not yet critical
    powerChangeCount: 0,
    observationTime: 0,
    finalPower: 0,
    timeAt50Percent: 0,
    maxPowerRate: 0,
  });
  const lastRodPositionRef = useRef(0.05);
  const lastRodTimestampRef = useRef(0);
  const lastPowerRef = useRef(0);

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
          I135: 0, // No xenon at cold shutdown
          Xe135: 0,
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

    // Update live metrics for checkpoint evaluation
    if (selectedScenario) {
      const currentPowerPercent = currentState.P * 100;

      // Calculate rod withdrawal rate
      const rodDelta = rodRef.current - lastRodPositionRef.current;
      const timeDelta = currentState.t - lastRodTimestampRef.current;
      const rodRate = timeDelta > 0 ? Math.abs(rodDelta * 100 / (timeDelta / 60)) : 0; // %/minute

      if (rodDelta !== 0) {
        lastRodPositionRef.current = rodRef.current;
        lastRodTimestampRef.current = currentState.t;
      }

      // Track power changes (significant changes > 5%)
      const powerChanged = Math.abs(currentPowerPercent - lastPowerRef.current) > 5;
      if (powerChanged) {
        lastPowerRef.current = currentPowerPercent;
      }

      setLiveMetrics(prev => ({
        timeElapsed: currentState.t,
        tripCount: tripActive ? prev.tripCount + (prev.tripCount === 0 ? 1 : 0) : prev.tripCount,
        scramCount: scramRef.current ? prev.scramCount + (prev.scramCount === 0 ? 1 : 0) : prev.scramCount,
        maxPower: Math.max(prev.maxPower, currentPowerPercent),
        maxFuelTemp: Math.max(prev.maxFuelTemp, currentState.Tf),
        maxCoolantTemp: Math.max(prev.maxCoolantTemp, currentState.Tc),
        currentPower: currentPowerPercent,
        rodPosition: rodRef.current * 100,
        rodWithdrawalRate: rodRate,
        timeToFirstCriticality:
          prev.timeToFirstCriticality === -1 && currentState.P > 0.001
            ? currentState.t
            : prev.timeToFirstCriticality,
        powerChangeCount: prev.powerChangeCount + (powerChanged ? 1 : 0),
        observationTime: currentState.t,
        finalPower: currentPowerPercent,
        timeAt50Percent: metricsCollector ? metricsCollector.getLiveMetricValue('timeAt50Percent') : 0,
        maxPowerRate: metricsCollector ? metricsCollector.getLiveMetricValue('maxPowerRate') : 0,
      }));
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          background: #0f1419;
          margin: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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

                <line x1="0" y1="0" x2="100%" y2="0" stroke="#10b981" strokeWidth="1" opacity="0.3" />
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
                <div style={reactivityRow}>
                  <span style={reactivityLabel}>Xenon-135</span>
                  <span style={reactivityValue}>{reactivity ? (reactivity.rhoXenon * 1e5).toFixed(0) : 0} pcm</span>
                </div>
                <div style={xenonAccelNote}>
                  <span style={{opacity: 0.6}}>⚡ Xenon dynamics accelerated 500× for simulation</span>
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

          {/* Right Column - Mission Objectives (only in training mode) */}
          {selectedScenario && state && (
            <div style={objectivesColumn}>
              <LiveCheckpointPanel
                objectives={selectedScenario.objectives}
                reactorState={state}
                currentMetrics={liveMetrics}
                onObjectiveComplete={(objectiveId) => {
                  if (metricsCollector) {
                    metricsCollector.completeObjective(objectiveId);
                  }
                }}
              />
            </div>
          )}
        </section>
      </main>
    </>
  );
}

// ============================================================================
// STYLES (abbreviated for length - includes all existing styles plus new ones)
// ============================================================================

const container: React.CSSProperties = {
  maxWidth: "100vw",
  minHeight: "100vh",
  margin: "0",
  padding: "20px",
  paddingTop: "80px",
  background: "#0f1419",
  position: "relative",
};

const header: React.CSSProperties = {
  marginBottom: "20px",
  background: "rgba(20, 25, 30, 0.8)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  borderRadius: "8px",
  padding: "16px 24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  position: "relative",
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
  width: "40px",
  height: "40px",
  filter: "brightness(0) saturate(100%) invert(40%) sepia(98%) saturate(2000%) hue-rotate(200deg)",
};

const title: React.CSSProperties = {
  fontSize: "20px",
  margin: "0 0 4px",
  color: "#10b981",
  fontWeight: "600",
  fontFamily: "'Inter', sans-serif",
};

const subtitle: React.CSSProperties = {
  fontSize: "13px",
  margin: 0,
  fontFamily: "'Inter', sans-serif",
  color: "#6ee7b7",
  fontWeight: "400",
};

const exitButton: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "500",
  fontFamily: "'Inter', sans-serif",
  background: "rgba(20, 25, 30, 0.6)",
  color: "#6ee7b7",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  cursor: "pointer",
  transition: "all 0.2s",
};

const tripBanner: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 20px",
  marginBottom: "20px",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  color: "#991b1b",
  fontSize: "15px",
  fontWeight: "bold",
  letterSpacing: "0px",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
  boxShadow: "0 0 30px rgba(255, 0, 0, 0.8), inset 0 2px 0 rgba(255,255,255,0.3), 0 4px 0 rgba(0,0,0,0.3)",
  textShadow: "0 1px 0 rgba(255,255,255,0.5)",
};

const tripIcon: React.CSSProperties = {
  fontSize: "28px",
};

const layout: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "400px 1fr 380px",
  gap: "16px",
  minHeight: "calc(100vh - 120px)",
};

const controlColumn: React.CSSProperties = {
  background: "rgba(20, 25, 30, 0.6)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  borderRadius: "8px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  position: "relative",
};

const objectivesColumn: React.CSSProperties = {
  background: "rgba(20, 25, 30, 0.6)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  borderRadius: "8px",
  padding: "0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  position: "relative",
  overflow: "hidden",
};

const displayColumn: React.CSSProperties = {
  background: "rgba(20, 25, 30, 0.6)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  borderRadius: "8px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  position: "relative",
};

const panelHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "16px",
  padding: "8px 12px",
  background: "rgba(15, 20, 25, 0.4)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  borderRadius: "6px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
};

const panelIndicator = (active: boolean): React.CSSProperties => ({
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  background: active ? "#10b981" : "#374151",
  boxShadow: active ? "0 0 8px rgba(16, 185, 129, 0.6)" : "none",
  border: active ? "2px solid #6ee7b7" : "2px solid #4b5563",
});

const panelTitle: React.CSSProperties = {
  fontSize: "13px",
  letterSpacing: "0px",
  color: "#6ee7b7",
  fontWeight: "bold",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
  flex: 1,
};

const simControls: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "12px",
};

const buttonBase: React.CSSProperties = {
  flex: 1,
  padding: "12px 8px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: "bold",
  letterSpacing: "0px",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
  transition: "all 0.15s",
  position: "relative",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.2)",
};

const startButton: React.CSSProperties = {
  ...buttonBase,
  background: "#10b981",
  color: "#000",
  border: "2px solid #10b981",
  textShadow: "0 1px 0 rgba(0,0,0,0.5)",
};

const pauseButton: React.CSSProperties = {
  ...buttonBase,
  background: "#f59e0b",
  color: "#000",
  border: "2px solid #ffcc00",
  textShadow: "0 1px 0 rgba(0,0,0,0.5)",
};

const stopButton: React.CSSProperties = {
  ...buttonBase,
  background: "#64748b",
  color: "#aaa",
  border: "2px solid #666",
  textShadow: "0 1px 0 rgba(0,0,0,0.5)",
};

const tripResetSection: React.CSSProperties = {
  marginBottom: "16px",
  padding: "12px",
  background: "rgba(255, 85, 85, 0.1)",
  border: "1px solid #ff5555",
  borderRadius: "6px",
};

const tripResetButton: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  border: "none",
  borderRadius: "6px",
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
  color: "#6ee7b7",
  letterSpacing: "1px",
};

const speedButton = (active: boolean): React.CSSProperties => ({
  padding: "4px 8px",
  borderRadius: "6px",
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
  letterSpacing: "0px",
  color: "#6ee7b7",
  marginBottom: "8px",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
};

const labelValue: React.CSSProperties = {
  color: "#10b981",
  fontWeight: "bold",
  fontSize: "13px",
  fontFamily: "'Inter', sans-serif",
};

const slider: React.CSSProperties = {
  width: "100%",
  height: "8px",
  accentColor: "#10b981",
  background: "rgba(15, 20, 25, 0.5)",
  borderRadius: "6px",
  cursor: "pointer",
};

const helpText: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "9px",
  color: "#86efac",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "0.5px",
};

const rodActualDisplay: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "11px",
  color: "#10b981",
  fontWeight: "bold",
  letterSpacing: "1px",
  fontFamily: "'Inter', sans-serif",
};

const activeControlHint: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "9px",
  color: "#10b981",
  fontWeight: "bold",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "1px",
};

const warningText: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "9px",
  color: "#ff5555",
  fontWeight: "bold",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "1px",
};

const controlRow: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "16px",
};

const toggleButton: React.CSSProperties = {
  flex: 1,
  padding: "14px 16px",
  borderRadius: "6px",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  background: "rgba(15, 20, 25, 0.4)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  transition: "all 0.15s",
};

const toggleButtonActive: React.CSSProperties = {
  borderColor: "#10b981",
  background: "rgba(16, 185, 129, 0.1)",
};

const scramButton: React.CSSProperties = {
  ...toggleButton,
  borderColor: "rgba(239, 68, 68, 0.3)",
  background: "rgba(15, 20, 25, 0.4)",
};

const scramActive: React.CSSProperties = {
  borderColor: "#ef4444",
  background: "rgba(239, 68, 68, 0.2)",
};

const toggleLabel: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "0px",
  color: "#6ee7b7",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
};

const statusOn: React.CSSProperties = {
  fontSize: "12px",
  color: "#10b981",
  fontWeight: "bold",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "1px",
};

const statusOff: React.CSSProperties = {
  fontSize: "12px",
  color: "#ff5555",
  fontWeight: "bold",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "1px",
};

const statusArmed: React.CSSProperties = {
  fontSize: "12px",
  color: "#ffaa00",
  fontWeight: "bold",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "1px",
};

const powerDisplay: React.CSSProperties = {
  padding: "20px",
  borderRadius: "6px",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  background: "rgba(20, 25, 30, 0.6)",
  marginBottom: "20px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
  position: "relative",
};

const powerHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "12px",
  padding: "6px 10px",
  background: "rgba(0, 255, 170, 0.05)",
  borderRadius: "6px",
};

const powerLabel: React.CSSProperties = {
  fontSize: "12px",
  letterSpacing: "0px",
  color: "#6ee7b7",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
};

const powerStatus = (power: number): React.CSSProperties => ({
  fontSize: "11px",
  fontWeight: "bold",
  letterSpacing: "1px",
  fontFamily: "'Inter', sans-serif",
  color: power > 105 ? "#ff0000" : power < 50 ? "#ffaa00" : "#10b981",
  animation: "none",
});

const powerValueContainer: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "8px",
  padding: "10px",
  background: "rgba(20, 25, 30, 0.6)",
  border: "1px solid rgba(16, 185, 129, 0.25)",
  borderRadius: "6px",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
};

const powerValue = (power: number): React.CSSProperties => ({
  fontSize: "64px",
  fontWeight: "bold",
  color: power > 110 ? "#ff0000" : power > 105 ? "#ffaa00" : "#10b981",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "0px",
});

const powerUnit: React.CSSProperties = {
  fontSize: "28px",
  color: "#86efac",
  fontFamily: "'Inter', sans-serif",
};

const powerBar: React.CSSProperties = {
  height: "8px",
  background: "rgba(15, 20, 25, 0.5)",
  borderRadius: "6px",
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
  padding: "16px",
  borderRadius: "6px",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  background: "rgba(20, 25, 30, 0.6)",
  marginBottom: "20px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
};

const graphHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "12px",
  padding: "6px 10px",
  background: "rgba(0, 255, 170, 0.05)",
  borderRadius: "6px",
};

const graphTitle: React.CSSProperties = {
  fontSize: "12px",
  letterSpacing: "0px",
  color: "#6ee7b7",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
};

const graphTime: React.CSSProperties = {
  fontSize: "13px",
  color: "#10b981",
  fontFamily: "'Inter', sans-serif",
};

const graphSvg: React.CSSProperties = {
  background: "rgba(20, 25, 30, 0.6)",
  border: "2px solid #1a1a1a",
  borderRadius: "6px",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
};

const graphLabels: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "10px",
  color: "#6ee7b7",
  marginTop: "8px",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "1px",
};

const metricsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
  marginBottom: "16px",
};

const metricCard: React.CSSProperties = {
  padding: "14px",
  borderRadius: "6px",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  background: "rgba(20, 25, 30, 0.6)",
  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
};

const metricLabel: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "0px",
  color: "#6ee7b7",
  marginBottom: "8px",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
};

const metricValue = (warning: boolean): React.CSSProperties => ({
  fontSize: "28px",
  fontWeight: "bold",
  color: warning ? "#ff0000" : "#10b981",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "1px",
});

const metricUnit: React.CSSProperties = {
  fontSize: "14px",
  color: "#6ee7b7",
  marginLeft: "4px",
  fontFamily: "'Inter', sans-serif",
};

const reactivityPanel: React.CSSProperties = {
  padding: "16px",
  borderRadius: "6px",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  background: "rgba(20, 25, 30, 0.6)",
  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
};

const reactivityGrid: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const reactivityRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "12px",
  padding: "6px 8px",
  background: "rgba(0, 255, 170, 0.03)",
  borderRadius: "6px",
};

const xenonAccelNote: React.CSSProperties = {
  fontSize: "9px",
  color: "#6ee7b7",
  textAlign: "center",
  padding: "4px 8px",
  marginTop: "-4px",
  marginBottom: "4px",
  fontFamily: "'Inter', sans-serif",
  fontStyle: "italic",
};

const reactivityRowTotal: React.CSSProperties = {
  ...reactivityRow,
  borderTop: "2px solid #6ee7b7",
  paddingTop: "10px",
  marginTop: "8px",
  background: "rgba(0, 255, 170, 0.08)",
  fontSize: "13px",
};

const reactivityLabel: React.CSSProperties = {
  color: "#6ee7b7",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "1px",
};

const reactivityValue: React.CSSProperties = {
  color: "#10b981",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "1px",
};

const reactivityValueTotal = (rho: number): React.CSSProperties => ({
  ...reactivityValue,
  color: rho > 0.0001 ? "#ffaa00" : rho < -0.0001 ? "#66aaff" : "#10b981",
  fontWeight: "bold",
  fontSize: "14px",
});

