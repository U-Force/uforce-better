"use client";

import Link from "next/link";

export default function Home() {
  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes blink {
          0%, 49%, 100% { opacity: 1; }
          50%, 99% { opacity: 0.3; }
        }
      `}</style>
      
      <div style={gridOverlay} />
      
      <div style={statusBar}>
        <div style={statusItem}>
          <span style={statusLabel}>SYSTEM STATUS</span>
          <span style={statusValue}>OPERATIONAL</span>
        </div>
        <div style={statusItem}>
          <span style={statusLabel}>CLEARANCE</span>
          <span style={statusValue}>L2-TRAINEE</span>
        </div>
        <div style={statusItem}>
          <span style={statusLabel}>FACILITY</span>
          <span style={statusValue}>U-FORCE SIM</span>
        </div>
      </div>

      <main style={mainContainer}>
        <header style={header}>
          <div style={titleContainer}>
            <div style={reactorIcon}>⚛</div>
            <div>
              <h1 style={title}>U‑FORCE</h1>
              <div style={subtitle}>REACTOR TRAINING SIMULATOR</div>
            </div>
          </div>
          <p style={description}>
            Advanced browser-based reactor training interface. Master cause & effect relationships, 
            practice emergency scenarios, and receive real-time operational feedback.
          </p>
        </header>

        <section style={controlPanel}>
          <div style={panelHeader}>
            <div style={panelIndicator} />
            <span style={panelTitle}>PRIMARY CONTROLS</span>
          </div>
          
          <div style={buttonGroup}>
            <Link href="/sim" style={launchButton}>
              <div style={buttonIcon}>▶</div>
              <div>
                <div style={buttonLabel}>LAUNCH SIMULATOR</div>
                <div style={buttonSubtext}>Initialize training environment</div>
              </div>
            </Link>
            
            <Link href="/scenario/1" style={scenarioButton}>
              <div style={buttonIcon}>◈</div>
              <div>
                <div style={buttonLabel}>SCENARIO 1</div>
                <div style={buttonSubtext}>Startup procedure training</div>
              </div>
            </Link>
          </div>
        </section>

        <section style={infoPanel}>
          <div style={infoPanelHeader}>
            <div style={warningStripe} />
            <span style={infoPanelTitle}>TRAINING OBJECTIVES</span>
          </div>
          
          <div style={objectivesList}>
            <div style={objectiveItem}>
              <div style={checkboxUnchecked}>□</div>
              <div>
                <div style={objectiveTitle}>Dashboard Implementation</div>
                <div style={objectiveDesc}>Real-time gauges for power output, coolant temperature, pressure levels, and flow rates</div>
              </div>
            </div>
            
            <div style={objectiveItem}>
              <div style={checkboxUnchecked}>□</div>
              <div>
                <div style={objectiveTitle}>Control Systems</div>
                <div style={objectiveDesc}>Rod positioning slider, coolant pump toggles, emergency SCRAM button</div>
              </div>
            </div>
            
            <div style={objectiveItem}>
              <div style={checkboxUnchecked}>□</div>
              <div>
                <div style={objectiveTitle}>Safety Protocols</div>
                <div style={objectiveDesc}>Alarm monitoring system with goal-based checklist verification</div>
              </div>
            </div>
          </div>
        </section>

        <footer style={footer}>
          <div style={warningBanner}>
            ⚠ TRAINING SIMULATION ONLY - NOT CONNECTED TO LIVE SYSTEMS
          </div>
        </footer>
      </main>
    </>
  );
}

// Styles
const gridOverlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundImage: `
    linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px)
  `,
  backgroundSize: "50px 50px",
  pointerEvents: "none",
  zIndex: 0,
};

const statusBar: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  gap: "32px",
  padding: "12px 48px",
  background: "rgba(0, 0, 0, 0.6)",
  borderBottom: "2px solid #00ffff",
  boxShadow: "0 0 20px rgba(0, 255, 255, 0.3)",
};

const statusItem: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const statusLabel: React.CSSProperties = {
  fontSize: "9px",
  color: "#00ffff",
  letterSpacing: "1px",
  fontWeight: "bold",
};

const statusValue: React.CSSProperties = {
  fontSize: "13px",
  color: "#00ff00",
  fontWeight: "bold",
  letterSpacing: "0.5px",
};

const mainContainer: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: "1000px",
  margin: "0 auto",
  padding: "48px 48px 32px",
};

const header: React.CSSProperties = {
  marginBottom: "32px",
};

const titleContainer: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
  marginBottom: "16px",
};

const reactorIcon: React.CSSProperties = {
  fontSize: "64px",
  color: "#00ffff",
  textShadow: "0 0 20px rgba(0, 255, 255, 0.8)",
  animation: "pulse 2s infinite",
};

const title: React.CSSProperties = {
  fontSize: "56px",
  margin: "0",
  fontWeight: "bold",
  color: "#00ffff",
  letterSpacing: "4px",
  textShadow: "0 0 10px rgba(0, 255, 255, 0.5)",
};

const subtitle: React.CSSProperties = {
  fontSize: "14px",
  color: "#888",
  letterSpacing: "3px",
  marginTop: "4px",
};

const description: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#b0b0b0",
  maxWidth: "700px",
  marginTop: "24px",
};

const controlPanel: React.CSSProperties = {
  marginBottom: "32px",
};

const panelHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "16px",
};

const panelIndicator: React.CSSProperties = {
  width: "8px",
  height: "8px",
  background: "#00ff00",
  borderRadius: "50%",
  boxShadow: "0 0 10px #00ff00",
  animation: "blink 1.5s infinite",
};

const panelTitle: React.CSSProperties = {
  fontSize: "12px",
  letterSpacing: "2px",
  color: "#00ffff",
  fontWeight: "bold",
};

const buttonGroup: React.CSSProperties = {
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
};

const launchButton: React.CSSProperties = {
  flex: "1",
  minWidth: "280px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "20px 24px",
  background: "linear-gradient(135deg, #003d3d 0%, #005555 100%)",
  border: "2px solid #00ffff",
  borderRadius: "4px",
  textDecoration: "none",
  color: "#00ffff",
  boxShadow: "0 0 20px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.05)",
  transition: "all 0.3s ease",
  cursor: "pointer",
};

const scenarioButton: React.CSSProperties = {
  flex: "1",
  minWidth: "280px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "20px 24px",
  background: "rgba(255, 255, 255, 0.05)",
  border: "2px solid #666",
  borderRadius: "4px",
  textDecoration: "none",
  color: "#e0e0e0",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  transition: "all 0.3s ease",
  cursor: "pointer",
};

const buttonIcon: React.CSSProperties = {
  fontSize: "32px",
  lineHeight: "1",
};

const buttonLabel: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  letterSpacing: "1px",
};

const buttonSubtext: React.CSSProperties = {
  fontSize: "11px",
  opacity: 0.7,
  marginTop: "4px",
  letterSpacing: "0.5px",
};

const infoPanel: React.CSSProperties = {
  marginBottom: "32px",
};

const infoPanelHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "20px",
};

const warningStripe: React.CSSProperties = {
  width: "4px",
  height: "20px",
  background: "repeating-linear-gradient(45deg, #ffaa00, #ffaa00 5px, #000 5px, #000 10px)",
};

const infoPanelTitle: React.CSSProperties = {
  fontSize: "12px",
  letterSpacing: "2px",
  color: "#ffaa00",
  fontWeight: "bold",
};

const objectivesList: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.4)",
  border: "1px solid #333",
  borderRadius: "4px",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const objectiveItem: React.CSSProperties = {
  display: "flex",
  gap: "16px",
  alignItems: "flex-start",
};

const checkboxUnchecked: React.CSSProperties = {
  fontSize: "20px",
  color: "#666",
  lineHeight: "1",
  marginTop: "2px",
};

const objectiveTitle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: "bold",
  color: "#00ffff",
  marginBottom: "4px",
};

const objectiveDesc: React.CSSProperties = {
  fontSize: "13px",
  color: "#999",
  lineHeight: "1.5",
};

const footer: React.CSSProperties = {
  marginTop: "48px",
};

const warningBanner: React.CSSProperties = {
  background: "rgba(255, 170, 0, 0.1)",
  border: "2px solid #ffaa00",
  borderRadius: "4px",
  padding: "16px",
  textAlign: "center",
  fontSize: "12px",
  color: "#ffaa00",
  letterSpacing: "1px",
  fontWeight: "bold",
};
