"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ReactorModel,
  createCriticalSteadyState,
  DEFAULT_PARAMS,
  type ControlInputs,
  type SimulationRecord,
} from "../../lib/reactor";

const DEFAULT_DT = 0.05; // 50 ms
const DEFAULT_DURATION = 30; // 30 s

export default function SimulatorPage() {
  const [rod, setRod] = useState(1);
  const [pumpOn, setPumpOn] = useState(true);
  const [scram, setScram] = useState(false);
  const [records, setRecords] = useState<SimulationRecord[] | null>(null);

  const { initialState, initialRod } = useMemo(() => {
    const { state, rodPosition } = createCriticalSteadyState(
      1.0,
      DEFAULT_PARAMS,
      true,
    );
    return { initialState: state, initialRod: rodPosition };
  }, []);

  const controls: ControlInputs = {
    rod,
    pumpOn,
    scram,
  };

  const handleRun = () => {
    const model = new ReactorModel(initialState, DEFAULT_PARAMS);
    const result = model.run(DEFAULT_DURATION, DEFAULT_DT, controls);
    setRecords(result);
  };

  const latest = records && records.length > 0 ? records[records.length - 1] : null;

  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
      `}</style>

      <main style={container}>
        <header style={header}>
          <div style={breadcrumbs}>
            <Link href="/" style={breadcrumbLink}>
              HOME
            </Link>
            <span style={breadcrumbSeparator}>/</span>
            <span style={breadcrumbCurrent}>SIMULATOR</span>
          </div>
          <h1 style={title}>Core Reactor Simulator</h1>
          <p style={subtitle}>
            This panel is wired directly into the reduced-order nuclear reactor model.
            Adjust the core inputs, then execute a short run to observe power and
            temperature response.
          </p>
        </header>

        <section style={layout}>
          <div style={controlColumn}>
            <h2 style={sectionTitle}>Core Inputs</h2>

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
                style={slider}
              />
              <div style={helpText}>
                0% = fully inserted (highly subcritical). 100% = fully withdrawn
                (maximum positive reactivity).
              </div>
            </div>

            <div style={controlRow}>
              <button
                type="button"
                style={{
                  ...toggleButton,
                  ...(pumpOn ? toggleButtonActive : {}),
                }}
                onClick={() => setPumpOn((v) => !v)}
              >
                <span style={toggleLabel}>PRIMARY PUMP</span>
                <span style={pumpOn ? statusOn : statusOff}>
                  {pumpOn ? "ON" : "OFF"}
                </span>
              </button>

              <button
                type="button"
                style={{
                  ...toggleButton,
                  ...(scram ? scramActive : scramIdle),
                }}
                onClick={() => setScram(true)}
              >
                <span style={toggleLabel}>SCRAM</span>
                <span style={scram ? statusOn : statusOff}>
                  {scram ? "FIRED" : "ARMED"}
                </span>
              </button>
            </div>

            <button type="button" style={runButton} onClick={handleRun}>
              RUN {DEFAULT_DURATION}s SIMULATION
            </button>

            <div style={hintBox}>
              <div style={hintTitle}>How to explore</div>
              <ul style={hintList as React.CSSProperties}>
                <li>Start with rods near their initial critical position.</li>
                <li>Trip the pump while keeping rods high to see thermal response.</li>
                <li>Fire SCRAM and re-run to observe the rapid power reduction.</li>
              </ul>
            </div>
          </div>

          <div style={readoutColumn}>
            <h2 style={sectionTitle}>Core Readout</h2>

            {!latest && (
              <div style={placeholder}>
                No run executed yet. Adjust controls and select{" "}
                <strong>RUN SIMULATION</strong>.
              </div>
            )}

            {latest && (
              <div style={cardsGrid}>
                <div style={metricCard}>
                  <div style={metricLabel}>FINAL POWER</div>
                  <div style={metricValue}>
                    {latest.P.toFixed(3)} <span style={metricUnit}>× nominal</span>
                  </div>
                </div>

                <div style={metricCard}>
                  <div style={metricLabel}>FUEL TEMPERATURE</div>
                  <div style={metricValue}>
                    {latest.Tf.toFixed(1)} <span style={metricUnit}>K</span>
                  </div>
                </div>

                <div style={metricCard}>
                  <div style={metricLabel}>COOLANT TEMPERATURE</div>
                  <div style={metricValue}>
                    {latest.Tc.toFixed(1)} <span style={metricUnit}>K</span>
                  </div>
                </div>

                <div style={metricCard}>
                  <div style={metricLabel}>SIMULATION TIME</div>
                  <div style={metricValue}>
                    {latest.t.toFixed(1)} <span style={metricUnit}>s</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

// Styles

const container: React.CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "32px 24px 40px",
};

const header: React.CSSProperties = {
  marginBottom: "24px",
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

const breadcrumbSeparator: React.CSSProperties = {
  opacity: 0.6,
};

const breadcrumbCurrent: React.CSSProperties = {
  color: "#aaa",
};

const title: React.CSSProperties = {
  fontSize: "32px",
  margin: "0 0 4px",
  color: "#00ffff",
  letterSpacing: "2px",
};

const subtitle: React.CSSProperties = {
  fontSize: "14px",
  color: "#b0b0b0",
  maxWidth: "640px",
  lineHeight: 1.5,
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

const readoutColumn: React.CSSProperties = {
  flex: "1 1 320px",
  minWidth: "300px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "13px",
  letterSpacing: "2px",
  color: "#00ffff",
  marginBottom: "12px",
};

const controlGroup: React.CSSProperties = {
  marginBottom: "20px",
};

const label: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
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
};

const helpText: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "11px",
  color: "#888",
  lineHeight: 1.4,
};

const controlRow: React.CSSProperties = {
  display: "flex",
  gap: "10px",
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

const toggleLabel: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "1px",
  color: "#ccc",
};

const statusOn: React.CSSProperties = {
  fontSize: "12px",
  color: "#00ff00",
  fontWeight: "bold",
};

const statusOff: React.CSSProperties = {
  fontSize: "12px",
  color: "#ff5555",
  fontWeight: "bold",
};

const scramIdle: React.CSSProperties = {
  borderColor: "#aa0000",
};

const scramActive: React.CSSProperties = {
  borderColor: "#ff0000",
  boxShadow: "0 0 12px rgba(255, 0, 0, 0.5)",
};

const runButton: React.CSSProperties = {
  width: "100%",
  marginTop: "4px",
  padding: "12px 16px",
  borderRadius: "4px",
  border: "2px solid #00ffff",
  background: "linear-gradient(135deg, #003d3d 0%, #005555 100%)",
  color: "#00ffff",
  fontSize: "13px",
  letterSpacing: "1px",
  fontWeight: "bold",
  cursor: "pointer",
};

const hintBox: React.CSSProperties = {
  marginTop: "20px",
  padding: "10px 12px",
  borderRadius: "4px",
  border: "1px solid #333",
  background: "rgba(0, 0, 0, 0.4)",
};

const hintTitle: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "1px",
  color: "#aaa",
  marginBottom: "4px",
};

const hintList: React.CSSProperties = {
  margin: 0,
  paddingLeft: "16px",
  fontSize: "11px",
  color: "#888",
  lineHeight: 1.4,
};

const placeholder: React.CSSProperties = {
  borderRadius: "4px",
  border: "1px dashed #333",
  padding: "16px",
  fontSize: "13px",
  color: "#888",
};

const cardsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const metricCard: React.CSSProperties = {
  borderRadius: "4px",
  border: "1px solid #333",
  padding: "12px",
  background: "rgba(0, 0, 0, 0.5)",
};

const metricLabel: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "1px",
  color: "#888",
  marginBottom: "4px",
};

const metricValue: React.CSSProperties = {
  fontSize: "20px",
  color: "#00ffbf",
  fontWeight: "bold",
};

const metricUnit: React.CSSProperties = {
  fontSize: "11px",
  marginLeft: "4px",
  color: "#aaa",
};


