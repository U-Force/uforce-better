"use client";

import React from "react";
import {
  COLORS,
  FONT_SIZES,
  RADIUS,
  PRIORITY_COLORS,
} from "../../../lib/workbench/theme";
import type { Alarm } from "../WorkbenchContext";

interface AlarmListProps {
  alarms: Alarm[];
  onAcknowledge: (id: string) => void;
}

export default function AlarmList({ alarms, onAcknowledge }: AlarmListProps) {
  if (alarms.length === 0) {
    return (
      <div style={emptyStyle}>
        <span style={{ color: COLORS.emerald, fontSize: FONT_SIZES.md }}>
          NO ACTIVE ALARMS
        </span>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={headerStyle}>
        ALARMS ({alarms.filter((a) => !a.acknowledged).length} ACTIVE)
      </div>
      {alarms.map((alarm) => {
        const color = PRIORITY_COLORS[alarm.priority];
        return (
          <div
            key={alarm.id}
            style={{
              ...alarmRow,
              borderLeft: `3px solid ${color}`,
              opacity: alarm.acknowledged ? 0.5 : 1,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: FONT_SIZES.sm,
                  fontWeight: 700,
                  color,
                  letterSpacing: "0.5px",
                  ...(!alarm.acknowledged && alarm.priority === "critical"
                    ? { animation: "blink 1s infinite" }
                    : {}),
                }}
              >
                {alarm.message}
              </div>
              <div style={{ fontSize: FONT_SIZES.xs, color: COLORS.slateDark, marginTop: "2px" }}>
                {alarm.parameter} = {alarm.value.toFixed(1)} (limit: {alarm.limit})
              </div>
            </div>
            {!alarm.acknowledged && (
              <button style={ackBtn} onClick={() => onAcknowledge(alarm.id)}>
                ACK
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

const container: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const headerStyle: React.CSSProperties = {
  fontSize: FONT_SIZES.sm,
  letterSpacing: "1.5px",
  color: COLORS.amber,
  fontWeight: 700,
  paddingBottom: "4px",
  borderBottom: `1px solid ${COLORS.borderAmber}`,
};

const alarmRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 8px",
  background: COLORS.bgOverlay,
  borderRadius: RADIUS.md,
};

const ackBtn: React.CSSProperties = {
  padding: "2px 8px",
  background: "rgba(255,255,255,0.05)",
  border: `1px solid ${COLORS.borderStrong}`,
  borderRadius: RADIUS.sm,
  color: COLORS.slate,
  fontSize: FONT_SIZES.xs,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "1px",
};

const emptyStyle: React.CSSProperties = {
  padding: "8px",
  textAlign: "center",
  background: COLORS.emeraldBgLight,
  borderRadius: RADIUS.md,
  border: `1px solid ${COLORS.borderEmeraldLight}`,
};
