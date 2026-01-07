import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 48, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 44, margin: 0 }}>U‑Force</h1>
        <p style={{ fontSize: 18, opacity: 0.8, lineHeight: 1.5 }}>
          A browser-based reactor training interface: learn cause → effect, practice scenarios, and get feedback.
        </p>
      </header>

      <section style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <Link href="/sim" style={buttonPrimary}>
          Launch Simulator
        </Link>
        <Link href="/scenario/1" style={buttonSecondary}>
          Start Scenario 1
        </Link>
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>What you’ll build next</h2>
        <ol style={{ lineHeight: 1.7 }}>
          <li>A dashboard with gauges (power, temp, pressure, flow)</li>
          <li>Controls (rods slider, pump toggle, SCRAM button)</li>
          <li>Alarms + a simple goal checklist</li>
        </ol>
      </section>
    </main>
  );
}

const buttonPrimary: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #333",
  textDecoration: "none",
  color: "white",
  background: "#111",
  fontWeight: 600,
};

const buttonSecondary: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #ccc",
  textDecoration: "none",
  color: "#111",
  background: "white",
  fontWeight: 600,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 16,
  padding: 20,
};

