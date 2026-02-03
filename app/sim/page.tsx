"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ReactorModel,
  createCriticalSteadyState,
  DEFAULT_PARAMS,
  type ControlInputs,
  type ReactorState,
  type ReactivityComponents,
} from "../../lib/reactor";

const DT = 0.01; // 10ms timestep for smooth simulation
const HISTORY_LENGTH = 500; // 5 seconds of history at 100 samples/s

interface HistoryPoint {
  t: number;
  P: number;
  Tf: number;
  Tc: number;
  rho: number;
}

export default function SimulatorPage() {
  // Control states
  const [rod, setRod] = useState(1);
  const [pumpOn, setPumpOn] = useState(true);
  const [scram, setScram] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Simulation states
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [state, setState] = useState<ReactorState | null>(null);
  const [reactivity, setReactivity] = useState<ReactivityComponents | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tripActive, setTripActive] = useState(false);
  const [tripReason, setTripReason] = useState<string | null>(null);

  // Refs for animation
  const modelRef = useRef<ReactorModel | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  // Initialize model
  const initializeModel = useCallback(() => {
    const { state: initialState, rodPosition } = createCriticalSteadyState(
      1.0,
      DEFAULT_PARAMS,
      true
    );
    modelRef.current = new ReactorModel(initialState, DEFAULT_PARAMS);
    setState(initialState);
    setRod(rodPosition);
    setScram(false);
    setPumpOn(true);
    setTripActive(false);
    setTripReason(null);
    setHistory([{
      t: 0,
      P: initialState.P,
      Tf: initialState.Tf,
      Tc: initialState.Tc,
      rho: 0,
    }]);

    // Compute initial reactivity
    const controls: ControlInputs = { rod: rodPosition, pumpOn: true, scram: false };
    const rho = modelRef.current.getReactivity(controls);
    setReactivity(rho);
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
    if (!modelRef.current || isPaused) {
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

    let currentScram = scram;
    const controls: ControlInputs = { rod, pumpOn, scram: currentScram };

    for (let i = 0; i < stepsNeeded; i++) {
      const newState = modelRef.current.step(DT, { ...controls, scram: currentScram });

      // Check protection system
      if (!tripActive && !currentScram) {
        const { trip, reason } = checkTrips(newState);
        if (trip) {
          setTripActive(true);
          setTripReason(reason);
          setScram(true);
          currentScram = true;
        }
      }
    }

    const currentState = modelRef.current.getState();
    const currentReactivity = modelRef.current.getReactivity({ rod, pumpOn, scram: currentScram });

    setState(currentState);
    setReactivity(currentReactivity);

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
  }, [isPaused, speed, rod, pumpOn, scram, tripActive, checkTrips]);

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
    setTripActive(true);
    setTripReason("MANUAL SCRAM");
  };

  // Computed values
  const power = state ? state.P * 100 : 100;
  const fuelTemp = state ? state.Tf : 600;
  const coolantTemp = state ? state.Tc : 560;
  const simTime = state ? state.t : 0;

  return (
    <>
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
          <div style={breadcrumbs}>
            <Link href="/" style={breadcrumbLink}>HOME</Link>
            <span style={breadcrumbSeparator}>/</span>
            <span style={breadcrumbCurrent}>SIMULATOR</span>
          </div>
          <div style={headerRow}>
            <div>
              <h1 style={title}>Core Reactor Simulator</h1>
              <p style={subtitle}>
                Real-time point kinetics simulation with thermal feedback
              </p>
            </div>
            <div style={statusBadge(isRunning, isPaused, tripActive)}>
              {tripActive ? "TRIP" : isRunning ? (isPaused ? "PAUSED" : "RUNNING") : "READY"}
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
              <button style={resetButton} onClick={handleReset}>↺ RESET</button>
            </div>

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
                CONTROL ROD POSITION
                <span style={labelValue}>{Math.round(rod * 100)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={rod}
                onChange={(e) => setRod(parseFloat(e.target.value))}
                disabled={tripActive}
                style={slider}
              />
              <div style={helpText}>
                0% = fully inserted (subcritical) · 100% = fully withdrawn
              </div>
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
                disabled={tripActive}
              >
                <span style={toggleLabel}>SCRAM</span>
                <span style={tripActive ? statusOff : statusArmed}>
                  {tripActive ? "FIRED" : "ARMED"}
                </span>
              </button>
            </div>

            {/* Quick Guide */}
            <div style={hintBox}>
              <div style={hintTitle}>Quick Guide</div>
              <ul style={hintList as React.CSSProperties}>
                <li>Start simulation, then slowly withdraw rods to increase power</li>
                <li>Watch thermal feedback stabilize the reactor</li>
                <li>Trip pump to see coolant temperature rise</li>
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
                  stroke="#00ffff"
                  strokeWidth="2"
                  points={history.map((p, i) => {
                    const x = (i / HISTORY_LENGTH) * 100;
                    const y = 80 - Math.min(p.P * 80, 80);
                    return `${x}%,${y}`;
                  }).join(" ")}
                />

                {/* 100% reference line */}
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
// STYLES
// ============================================================================

const container: React.CSSProperties = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "24px",
};

const header: React.CSSProperties = {
  marginBottom: "20px",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const breadcrumbs: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  fontSize: "11px",
  letterSpacing: "1px",
  color: "#888",
  marginBottom: "8px",
};

const breadcrumbLink: React.CSSProperties = {
  textDecoration: "none",
  color: "#00ffff",
};

const breadcrumbSeparator: React.CSSProperties = { opacity: 0.6 };
const breadcrumbCurrent: React.CSSProperties = { color: "#aaa" };

const title: React.CSSProperties = {
  fontSize: "28px",
  margin: "0 0 4px",
  color: "#00ffff",
  letterSpacing: "2px",
};

const subtitle: React.CSSProperties = {
  fontSize: "13px",
  color: "#888",
  margin: 0,
};

const statusBadge = (running: boolean, paused: boolean, trip: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: "4px",
  fontSize: "12px",
  fontWeight: "bold",
  letterSpacing: "1px",
  background: trip ? "rgba(255, 0, 0, 0.2)" : running ? (paused ? "rgba(255, 170, 0, 0.2)" : "rgba(0, 255, 0, 0.2)") : "rgba(255, 255, 255, 0.1)",
  color: trip ? "#ff5555" : running ? (paused ? "#ffaa00" : "#00ff00") : "#888",
  border: `1px solid ${trip ? "#ff0000" : running ? (paused ? "#ffaa00" : "#00ff00") : "#444"}`,
});

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
  color: "#00ffff",
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
  background: "linear-gradient(135deg, #003d3d, #005555)",
  color: "#00ffff",
  border: "1px solid #00ffff",
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

const resetButton: React.CSSProperties = {
  ...buttonBase,
  background: "rgba(0, 0, 0, 0.4)",
  color: "#888",
  border: "1px solid #444",
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
  background: active ? "#00ffff" : "rgba(0, 0, 0, 0.4)",
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
  color: "#00ffbf",
  fontWeight: "bold",
};

const slider: React.CSSProperties = {
  width: "100%",
  accentColor: "#00ffff",
};

const helpText: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "10px",
  color: "#666",
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
  borderColor: "#00ffbf",
  boxShadow: "0 0 10px rgba(0, 255, 191, 0.3)",
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

const hintBox: React.CSSProperties = {
  padding: "12px",
  borderRadius: "4px",
  border: "1px solid #333",
  background: "rgba(0, 0, 0, 0.4)",
};

const hintTitle: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "1px",
  color: "#00ffff",
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
  color: power > 110 ? "#ff5555" : power > 105 ? "#ffaa00" : "#00ffbf",
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
  background: power > 110 ? "#ff5555" : power > 105 ? "#ffaa00" : "#00ffbf",
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
  color: "#00ffff",
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
  color: warning ? "#ff5555" : "#00ffbf",
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
  color: rho > 0.0001 ? "#ffaa00" : rho < -0.0001 ? "#00aaff" : "#00ff00",
  fontWeight: "bold",
});
