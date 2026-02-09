"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  ReactorModel,
  DEFAULT_PARAMS,
  type ControlInputs,
  type ReactorState,
  type ReactivityComponents,
} from "../lib/reactor";
import NavigationBar from "../components/NavigationBar";

const DT = 0.01; // 10ms timestep for smooth simulation
const HISTORY_LENGTH = 500; // 5 seconds of history at 100 samples/s
const ROD_SPEED = 0.05; // 5%/second max rod movement rate

interface HistoryPoint {
  t: number;
  P: number;
  Tf: number;
  Tc: number;
  rho: number;
}

export default function SimulatorPage() {
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
  const [initError, setInitError] = useState<string | null>(null);
  const [rodActual, setRodActual] = useState(0.05); // Actual rod position (rate-limited)

  // Refs for animation
  const modelRef = useRef<ReactorModel | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  // Refs for real-time controls (avoid stale closures)
  const rodRef = useRef(rod);
  const pumpRef = useRef(pumpOn);
  const scramRef = useRef(scram);
  const rodActualRef = useRef(rod); // Actual rod position sent to model (rate-limited)

  // Keep refs in sync with state
  useEffect(() => { rodRef.current = rod; }, [rod]);
  useEffect(() => { pumpRef.current = pumpOn; }, [pumpOn]);
  useEffect(() => { scramRef.current = scram; }, [scram]);

  // Initialize model
  const initializeModel = useCallback(() => {
    try {
      setInitError(null);

      // Start in TRUE COLD SHUTDOWN - subcritical, stable, low power
      // This matches what operators expect: reactor is OFF until you withdraw rods
      const initialPower = 1e-8; // Essentially zero power (shutdown)
      const coldTemp = 300; // Cold shutdown temperature (K)

      // Calculate equilibrium precursor concentrations for this tiny power
      // C_i = (beta_i / lambda_i) * (P / Lambda) in equilibrium
      const beta = [0.000215, 0.00142, 0.00127, 0.00257, 0.00075, 0.00027]; // Delayed neutron fractions
      const lambda = [0.0124, 0.0305, 0.111, 0.301, 1.14, 3.01]; // Decay constants (1/s)
      const Lambda = 1e-3; // Prompt neutron lifetime (s) - MUST MATCH params.ts LAMBDA_PROMPT

      const precursors = beta.map((b, i) => (b / lambda[i]) * (initialPower / Lambda));

      const shutdownState: ReactorState = {
        t: 0,
        P: initialPower,
        Tf: coldTemp,
        Tc: coldTemp,
        C: precursors,
        I135: 0, // No xenon at cold shutdown
        Xe135: 0,
      };

      modelRef.current = new ReactorModel(shutdownState, DEFAULT_PARAMS);
      setState(shutdownState);

      // Start with rods fully inserted (0%) - truly shutdown state
      const initialRod = 0.0;
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
        P: initialPower,
        Tf: coldTemp,
        Tc: coldTemp,
        rho: 0,
      }]);

      // Compute initial reactivity (should be negative - subcritical)
      const controls: ControlInputs = { rod: initialRod, pumpOn: true, scram: false };
      const rho = modelRef.current.getReactivity(controls);
      setReactivity(rho);

      console.log(`Initialized in cold shutdown: P=${initialPower}, T=${coldTemp}K, rod=${initialRod*100}%, rho=${(rho.rhoTotal*1e5).toFixed(0)} pcm`);
    } catch (error) {
      console.error("Initialization error:", error);
      setInitError(error instanceof Error ? error.message : "Failed to initialize reactor model");
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeModel();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initializeModel]);

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

    // Accumulate simulation time
    const simDelta = (deltaMs / 1000) * speed;
    accumulatedRef.current += simDelta;

    // Step simulation
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
  }, [isPaused, speed, tripActive, checkTrips]);

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
  };

  const handleReset = () => {
    handleStop();
    initializeModel();
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

  // Computed values
  const power = state ? state.P * 100 : 0.01; // Default to 0.01% when no state
  const fuelTemp = state ? state.Tf : 500;
  const coolantTemp = state ? state.Tc : 500;
  const simTime = state ? state.t : 0;

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
          margin: 0;
          font-family: 'Inter', sans-serif;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px currentColor, 0 0 10px currentColor; }
          50% { box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor; }
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>

      <NavigationBar />

      <main style={container}>
        <header style={header}>
          <div style={headerRow}>
            <div style={titleContainer}>
              <img src="/logo.png" alt="U-FORCE Logo" style={logoIcon} />
              <div>
                <h1 style={title}>U-FORCE Reactor Simulator</h1>
                <p style={subtitle}>
                  Free Play Mode - Real-time point kinetics simulation
                </p>
              </div>
            </div>
            <div style={statusBadge(isRunning, isPaused, tripActive)}>
              {tripActive ? "TRIP" : isRunning ? (isPaused ? "PAUSED" : "RUNNING") : "READY"}
            </div>
          </div>
        </header>

        {/* Error/Trip Alert Banners */}
        {initError && (
          <div style={tripBanner}>
            <span style={tripIcon}>⚠</span>
            <span>INITIALIZATION ERROR: {initError}</span>
          </div>
        )}
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
              <button style={resetButton} onClick={handleReset}>↺ RESET</button>
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

            {/* Learning Mode Toggle */}
            <div style={learningModeSection}>
              <button
                style={learningModeButton(learningMode)}
                onClick={() => setLearningMode(!learningMode)}
              >
                <span>💡 LEARNING MODE</span>
                <span style={learningMode ? statusOn : statusOff}>
                  {learningMode ? "ON" : "OFF"}
                </span>
              </button>
              {learningMode && (
                <div style={learningHint}>
                  Learning mode shows helpful tips about each control. Perfect for beginners!
                </div>
              )}
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
                disabled={false}
                style={slider}
              />
              <div style={rodActualDisplay}>
                ACTUAL: {Math.round(rodActual * 100)}%
              </div>
              <div style={helpText}>
                0% = fully inserted (subcritical) · 100% = fully withdrawn
              </div>
              {!tripActive && (
                <div style={activeControlHint}>
                  ✓ Adjustable during simulation
                </div>
              )}
              {tripActive && (
                <div style={warningText}>
                  ⚠ SCRAM ACTIVE - Rods were inserted to 0% (still adjustable)
                </div>
              )}
              {learningMode && (
                <div style={learningHint}>
                  💡 <strong>Control Rods:</strong> Absorb neutrons to control the fission chain reaction.
                  Inserting rods (lower %) reduces power. Withdrawing rods (higher %) increases power.
                  Move slowly to maintain control!
                </div>
              )}
            </div>

            {/* Pump & Scram */}
            <div style={controlRow}>
              <button
                type="button"
                style={{ ...toggleButton, ...(pumpOn ? toggleButtonActive : {}) }}
                onClick={() => setPumpOn(v => !v)}
              >
                <span style={toggleLabel}>PRIMARY PUMP</span>
                <span style={pumpOn ? statusOn : statusOff}>{pumpOn ? "ON" : "OFF"}</span>
              </button>

              <button
                type="button"
                style={{ ...scramButton, ...(tripActive ? scramActive : {}) }}
                onClick={handleScram}
                disabled={false}
              >
                <span style={toggleLabel}>SCRAM</span>
                <span style={tripActive ? statusOff : statusArmed}>
                  {tripActive ? "FIRED" : "ARMED"}
                </span>
              </button>
            </div>

            {learningMode && (
              <div style={controlGroup}>
                <div style={learningHint}>
                  💡 <strong>Primary Pump:</strong> Circulates coolant through the reactor core to remove heat.
                  Turning OFF the pump reduces cooling efficiency - temperatures will rise!
                </div>
                <div style={{...learningHint, marginTop: "8px"}}>
                  💡 <strong>SCRAM:</strong> Emergency shutdown button. Instantly inserts all control rods to 0%
                  and stops the chain reaction. Use this if power or temperature gets too high!
                </div>
              </div>
            )}

            {/* Quick Guide */}
            <div style={hintBox}>
              <div style={hintTitle}>Quick Guide</div>
              <ul style={hintList as React.CSSProperties}>
                <li>Start simulation, then adjust rod slider in real-time</li>
                <li>Slowly withdraw rods (drag right) to increase power</li>
                <li>Watch thermal feedback stabilize the reactor</li>
                <li>All controls work during simulation - just like a real control room</li>
                <li>Protection system auto-trips at 110% power</li>
              </ul>
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
              {learningMode && (
                <div style={{...learningHint, marginTop: "12px"}}>
                  💡 <strong>Reactor Power:</strong> Shows how much thermal energy the reactor is producing.
                  100% = 3000 MWth (3 billion watts). Power above 110% triggers automatic shutdown!
                </div>
              )}
            </div>

            {/* Power History Graph */}
            <div style={graphContainer}>
              <div style={graphHeader}>
                <span style={graphTitle}>POWER HISTORY</span>
                <span style={graphTime}>{simTime.toFixed(1)}s</span>
              </div>
              <svg width="100%" height="80" style={graphSvg}>
                {/* Grid lines */}
                <line x1="0" y1="40" x2="100%" y2="40" stroke="#333" strokeDasharray="4" />
                <line x1="0" y1="20" x2="100%" y2="20" stroke="#222" strokeDasharray="2" />
                <line x1="0" y1="60" x2="100%" y2="60" stroke="#222" strokeDasharray="2" />

                {/* Power line */}
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

                {/* 100% reference line */}
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

            {learningMode && (
              <div style={learningHint}>
                💡 <strong>Temperatures:</strong> Fuel heats up from fission. Coolant removes this heat.
                As temperatures rise, negative feedback reduces reactivity - this is the reactor's natural safety mechanism!
              </div>
            )}

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
              {learningMode && (
                <div style={{...learningHint, marginTop: "12px"}}>
                  💡 <strong>Reactivity:</strong> Measures the balance of the chain reaction in "pcm" (parts per million).
                  Positive = power rising, Negative = power falling, Zero = stable.
                  External = rod position, Doppler & Moderator = temperature feedback effects.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const container: React.CSSProperties = {
  maxWidth: "100vw",
  minHeight: "100vh",
  margin: "0",
  padding: "16px",
  paddingTop: "76px", // Account for 60px nav bar + 16px spacing
  background: "#0f1419",
  position: "relative",
};

const header: React.CSSProperties = {
  marginBottom: "16px",
  background: "rgba(20, 25, 30, 0.8)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  borderRadius: "6px",
  padding: "12px 20px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
  position: "relative",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
};

const titleContainer: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const logoIcon: React.CSSProperties = {
  width: "42px",
  height: "42px",
  filter: "brightness(0) saturate(100%) invert(60%) sepia(98%) saturate(2000%) hue-rotate(0deg) brightness(98%) contrast(101%)",
  animation: "glow 3s ease-in-out infinite",
};

const title: React.CSSProperties = {
  fontSize: "24px",
  margin: "0 0 2px",
  color: "#10b981",
  letterSpacing: "0px",
  textTransform: "none",
  fontFamily: "'Inter', sans-serif",
  // textShadow: "0 0 10px rgba(0, 255, 136, 0.5)",
};

const subtitle: React.CSSProperties = {
  fontSize: "11px",
  color: "#6f6",
  margin: 0,
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "1px",
};

const statusBadge = (running: boolean, paused: boolean, trip: boolean): React.CSSProperties => ({
  padding: "8px 16px",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: "bold",
  letterSpacing: "0.5px",
  fontFamily: "'Inter', sans-serif",
  background: trip
    ? "rgba(239, 68, 68, 0.2)"
    : running
      ? (paused ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)")
      : "rgba(100, 116, 139, 0.2)",
  color: trip ? "#ef4444" : running ? (paused ? "#f59e0b" : "#10b981") : "#94a3b8",
  border: `1px solid ${trip ? "#ef4444" : running ? (paused ? "#f59e0b" : "#10b981") : "#64748b"}`,
  animation: trip ? "blink 0.5s infinite" : "none",
});

const tripBanner: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "16px 20px",
  marginBottom: "16px",
  background: "rgba(239, 68, 68, 0.15)",
  border: "2px solid #ef4444",
  borderRadius: "6px",
  color: "#ef4444",
  fontSize: "15px",
  fontWeight: "bold",
  letterSpacing: "0.5px",
  fontFamily: "'Inter', sans-serif",
  animation: "blink 0.5s infinite",
};

const tripIcon: React.CSSProperties = {
  fontSize: "28px",
  animation: "pulse 1s ease-in-out infinite",
};

const layout: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "400px 1fr",
  gap: "16px",
  minHeight: "calc(100vh - 120px)",
};

const controlColumn: React.CSSProperties = {
  background: "rgba(20, 25, 30, 0.6)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  borderRadius: "6px",
  padding: "16px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
  position: "relative",
};

const displayColumn: React.CSSProperties = {
  background: "rgba(20, 25, 30, 0.6)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  borderRadius: "6px",
  padding: "20px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
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
  letterSpacing: "0.5px",
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
  borderRadius: "3px",
  fontSize: "11px",
  fontWeight: "bold",
  letterSpacing: "1.5px",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
  transition: "all 0.15s",
  position: "relative",
  boxShadow: "0 4px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
};

const startButton: React.CSSProperties = {
  ...buttonBase,
  background: "#10b981",
  color: "#000",
  border: "1px solid #6ee7b7",
};

const pauseButton: React.CSSProperties = {
  ...buttonBase,
  background: "#f59e0b",
  color: "#000",
  border: "1px solid #fbbf24",
};

const stopButton: React.CSSProperties = {
  ...buttonBase,
  background: "#64748b",
  color: "#fff",
  border: "1px solid #94a3b8",
};

const resetButton: React.CSSProperties = {
  ...buttonBase,
  background: "#64748b",
  color: "#fff",
  border: "1px solid #94a3b8",
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
  border: "1px solid #ff5555",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "bold",
  letterSpacing: "1px",
  cursor: "pointer",
  background: "#ef4444",
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

const learningModeSection: React.CSSProperties = {
  marginBottom: "16px",
  padding: "12px",
  background: "rgba(0, 255, 170, 0.05)",
  border: "1px solid rgba(0, 255, 170, 0.2)",
  borderRadius: "6px",
};

const learningModeButton = (active: boolean): React.CSSProperties => ({
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderRadius: "3px",
  fontSize: "12px",
  fontWeight: "bold",
  letterSpacing: "1.5px",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
  cursor: "pointer",
  border: active ? "2px solid #6ee7b7" : "2px solid #444",
  background: active
    ? "linear-gradient(180deg, rgba(0, 255, 170, 0.2) 0%, rgba(0, 255, 170, 0.1) 100%)"
    : "linear-gradient(180deg, #333 0%, #222 100%)",
  color: active ? "#6ee7b7" : "#888",
  boxShadow: active
    ? "0 0 15px rgba(0, 255, 170, 0.4), 0 4px 0 rgba(0,0,0,0.3)"
    : "0 4px 0 rgba(0,0,0,0.3)",
  transition: "all 0.2s",
});

const learningHint: React.CSSProperties = {
  marginTop: "12px",
  padding: "10px",
  background: "rgba(0, 255, 170, 0.1)",
  border: "1px solid rgba(0, 255, 170, 0.3)",
  borderRadius: "3px",
  fontSize: "11px",
  color: "#6ee7b7",
  lineHeight: 1.6,
  fontFamily: "'Inter', sans-serif",
};

const controlGroup: React.CSSProperties = {
  marginBottom: "16px",
};

const label: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "11px",
  letterSpacing: "1.5px",
  color: "#6ee7b7",
  marginBottom: "8px",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
};

const labelValue: React.CSSProperties = {
  color: "#10b981",
  fontWeight: "bold",
  fontSize: "13px",
  textShadow: "none",
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
  color: "#555",
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
  textShadow: "none",
};

const activeControlHint: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "9px",
  color: "#10b981",
  fontWeight: "bold",
  fontFamily: "'Inter', sans-serif",
  textShadow: "none",
  letterSpacing: "1px",
};

const warningText: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "9px",
  color: "#ff5555",
  fontWeight: "bold",
  fontFamily: "'Inter', sans-serif",
  // textShadow: "0 0 5px rgba(255, 85, 85, 0.5)",
  letterSpacing: "1px",
  animation: "blink 1s infinite",
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
  letterSpacing: "1.5px",
  color: "#6ee7b7",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
};

const statusOn: React.CSSProperties = {
  fontSize: "12px",
  color: "#10b981",
  fontWeight: "bold",
  fontFamily: "'Inter', sans-serif",
  // textShadow: "0 0 10px rgba(0, 255, 0, 0.8)",
  letterSpacing: "1px",
};

const statusOff: React.CSSProperties = {
  fontSize: "12px",
  color: "#ff5555",
  fontWeight: "bold",
  fontFamily: "'Inter', sans-serif",
  // textShadow: "0 0 10px rgba(255, 85, 85, 0.8)",
  letterSpacing: "1px",
};

const statusArmed: React.CSSProperties = {
  fontSize: "12px",
  color: "#ffaa00",
  fontWeight: "bold",
  fontFamily: "'Inter', sans-serif",
  // textShadow: "0 0 10px rgba(255, 170, 0, 0.8)",
  letterSpacing: "1px",
};

const hintBox: React.CSSProperties = {
  padding: "12px",
  borderRadius: "6px",
  border: "1px solid #333",
  background: "rgba(0, 0, 0, 0.4)",
};

const hintTitle: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "1px",
  color: "#ff9900",
  marginBottom: "8px",
};

const hintList: React.CSSProperties = {
  margin: 0,
  paddingLeft: "16px",
  fontSize: "11px",
  color: "#888",
  lineHeight: 1.6,
};

// Display styles
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
  letterSpacing: "0.5px",
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
  // textShadow removed for cleaner look
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
  // textShadow removed for cleaner look
  letterSpacing: "0.5px",
});

const powerUnit: React.CSSProperties = {
  fontSize: "28px",
  color: "#666",
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
  letterSpacing: "0.5px",
  color: "#6ee7b7",
  fontFamily: "'Inter', sans-serif",
  textTransform: "none",
};

const graphTime: React.CSSProperties = {
  fontSize: "13px",
  color: "#10b981",
  fontFamily: "'Inter', sans-serif",
  textShadow: "none",
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
  letterSpacing: "1.5px",
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
  // textShadow removed for cleaner look
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
  textShadow: "none",
};

const reactivityValueTotal = (rho: number): React.CSSProperties => ({
  ...reactivityValue,
  color: rho > 0.0001 ? "#ffaa00" : rho < -0.0001 ? "#66aaff" : "#10b981",
  fontWeight: "bold",
  fontSize: "14px",
  // textShadow removed for cleaner look
});
