"use client";

import { useEffect, useRef, useCallback } from "react";
import type { ReactorState } from "../lib/reactor/types";
import { ALARM_DEFINITIONS, type AlarmDefinition } from "../lib/workbench/alarm-definitions";
import type { Alarm } from "../components/workbench/WorkbenchContext";

/**
 * Derives alarms from the current ReactorState using defined thresholds.
 * Manages alarm lifecycle: activation, acknowledgement, clearing.
 */
export function useAlarmEngine(
  state: ReactorState | null,
  setAlarms: React.Dispatch<React.SetStateAction<Alarm[]>>
) {
  const activeRef = useRef<Set<string>>(new Set());

  const evaluate = useCallback(
    (s: ReactorState) => {
      const newAlarms: Alarm[] = [];
      const nowActive = new Set<string>();

      for (const def of ALARM_DEFINITIONS) {
        const val = def.getValue(s);
        const db = def.deadband ?? 0;
        let triggered = false;

        if (def.highLimit !== undefined && val >= def.highLimit) {
          triggered = true;
        }
        if (def.lowLimit !== undefined && val <= def.lowLimit) {
          triggered = true;
        }

        // Apply deadband for clearing
        if (!triggered && activeRef.current.has(def.id)) {
          if (def.highLimit !== undefined && val >= def.highLimit - db) {
            triggered = true;
          }
          if (def.lowLimit !== undefined && val <= def.lowLimit + db) {
            triggered = true;
          }
        }

        if (triggered) {
          nowActive.add(def.id);
          if (!activeRef.current.has(def.id)) {
            newAlarms.push({
              id: def.id,
              parameter: def.parameter,
              message: def.message,
              priority: def.priority,
              timestamp: s.t,
              acknowledged: false,
              value: val,
              limit: def.highLimit ?? def.lowLimit ?? 0,
            });
          }
        }
      }

      // Update active set
      const cleared = [...activeRef.current].filter((id) => !nowActive.has(id));
      activeRef.current = nowActive;

      if (newAlarms.length > 0 || cleared.length > 0) {
        setAlarms((prev) => {
          let updated = [...prev];
          // Add new alarms
          for (const a of newAlarms) {
            if (!updated.find((x) => x.id === a.id)) {
              updated.push(a);
            }
          }
          // Remove cleared alarms that were acknowledged
          updated = updated.filter(
            (a) => !(cleared.includes(a.id) && a.acknowledged)
          );
          // Sort: unacknowledged first, then by priority
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          updated.sort((a, b) => {
            if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          });
          return updated;
        });
      }
    },
    [setAlarms]
  );

  useEffect(() => {
    if (state) evaluate(state);
  }, [state, evaluate]);
}

