/**
 * Scenario: Coolant System Operation
 *
 * Learning objectives:
 * - Understand primary coolant flow
 * - Learn temperature feedback effects
 * - Practice managing heat removal
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const coolantSystemScenario: TrainingScenario = {
  id: 'PWR_SYSTEMS_01',
  name: 'Coolant System Fundamentals',
  description:
    'Learn how the primary coolant system removes heat from the reactor. Understand the relationship between flow, temperature, and power.',
  difficulty: 2,
  estimatedDuration: 20,
  recommendedRole: TrainingRole.RO_TRAINEE,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.15, // 15% power
      Tf: 350,
      Tc: 330,
      C: [0.0005, 0.0005, 0.0005, 0.0005, 0.0005, 0.0005],
    },
    controls: {
      rod: 0.35,
      pumpOn: true,
      scram: false,
    },
    timeAcceleration: 1,
  },

  objectives: [
    {
      id: 'OBJ1_OBSERVE_FLOW',
      description: 'Observe coolant temperatures at different power levels',
      assessmentCriteria: [
        {
          metric: 'powerChangeCount',
          target: '>3',
          unit: 'changes',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ2_TEMP_FEEDBACK',
      description: 'Understand temperature feedback on reactivity',
      assessmentCriteria: [
        {
          metric: 'observationTime',
          target: '>120',
          unit: 'seconds',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ3_MAINTAIN_TEMPS',
      description: 'Keep fuel temperature below 400°C',
      assessmentCriteria: [
        {
          metric: 'maxFuelTemp',
          target: '<400',
          unit: '°C',
          weight: 0.4,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'time_limit',
    parameters: {
      minTime: 180,
      maxFuelTemp: 420,
    },
  },

  failureConditions: [
    {
      type: 'limit_violation',
      parameters: {
        parameter: 'fuel_temperature',
        limit: 450,
      },
      description: 'Fuel temperature exceeded 450°C - potential damage',
    },
  ],

  briefing: `SCENARIO BRIEFING: Coolant System Fundamentals

INITIAL CONDITIONS:
• Reactor at 15% power
• Primary coolant pump operating
• Fuel temperature: 350°C
• Coolant temperature: 330°C

YOUR MISSION:
Understand how the coolant system removes heat and affects reactor behavior.

KEY CONCEPTS:
• PRIMARY COOLANT circulates through reactor core
• FUEL TEMPERATURE (Tf) is temperature at fuel centerline
• COOLANT TEMPERATURE (Tc) is bulk coolant temperature
• Temperature difference (Tf - Tc) shows heat removal rate
• Hot coolant provides NEGATIVE reactivity feedback (stability!)

PROCEDURES:
1. Note the initial temperature readings
2. Slowly increase power by withdrawing rods
3. Watch how both temperatures respond
4. Observe temperature feedback in reactivity display
5. Notice how rising temperature helps limit power increases
6. Practice adjusting power while monitoring temperatures

LEARNING POINTS:
• Higher power → higher temperatures
• Temperature rise causes negative reactivity (stabilizing)
• This feedback helps prevent runaway power increases
• Coolant flow is essential for heat removal
• Temperature limits protect fuel integrity

The coolant system is your primary safety barrier!`,

  hints: [
    {
      triggerId: 'HINT_WATCH_TEMPS',
      triggerCondition: 'time > 10',
      content:
        'ℹ️ Watch the TEMPERATURES panel. Tf is fuel temperature, Tc is coolant. The difference shows how much heat is being removed.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_INCREASE_POWER',
      triggerCondition: 'time > 30 && P < 0.2',
      content:
        'ℹ️ Try increasing power slowly and watch what happens to the temperatures. Notice the delay!',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_FEEDBACK',
      triggerCondition: 'time > 60',
      content:
        '💡 Look at the reactivity components. See the negative feedback from temperature? This naturally stabilizes the reactor!',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_TEMP_LIMIT',
      triggerCondition: 'Tf > 380',
      content:
        '⚠️ Fuel temperature is getting high. Consider reducing power to protect fuel integrity.',
      displayMode: 'automatic',
      priority: 'warning',
    },
  ],
};
