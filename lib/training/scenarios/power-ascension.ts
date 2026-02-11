/**
 * Scenario: Power Ascension to Full Power
 *
 * HRTD Source: Plant Operations (Ch. 15), Rod Control (Ch. 8),
 *              Condensate & Feedwater (Ch. 7), SG Level Control (Ch. 12)
 *
 * Learning objectives:
 * - Execute a controlled power ascension from 20% to 100%
 * - Coordinate rod withdrawal and boron dilution
 * - Understand plateau holds for thermal stabilization
 * - Maintain parameters within normal operating limits
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const powerAscensionScenario: TrainingScenario = {
  id: 'PWR_ASCENSION_01',
  name: 'Power Ascension: 20% to Full Power',
  description:
    'Take the reactor from low power to 100% rated power in controlled steps. Coordinate rods and boron, observe thermal-hydraulic changes, and hold at plateaus for stabilization. This is the culmination of your training.',
  difficulty: 3,
  estimatedDuration: 25,
  recommendedRole: TrainingRole.RO,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.20, // 20% power — post-startup
      Tf: 750,
      Tc: 565,
      C: [0.0006, 0.0006, 0.0006, 0.0006, 0.0006, 0.0006],
      I135: 1e14,
      Xe135: 1e14,
      decayHeat: [0.003, 0.002, 0.001],
    },
    controls: {
      rod: 0.40,
      pumpOn: true,
      scram: false,
      boronConc: 600, // Moderate boron — will need to dilute during ascension
    },
    timeAcceleration: 3,
  },

  objectives: [
    {
      id: 'OBJ1_REACH_50',
      description: 'Reach 50% power plateau',
      assessmentCriteria: [
        {
          metric: 'timeAt50Percent',
          target: '>20',
          unit: 'seconds',
          weight: 0.2,
        },
      ],
    },
    {
      id: 'OBJ2_REACH_75',
      description: 'Reach 75% power plateau',
      assessmentCriteria: [
        {
          metric: 'timeAt75Percent',
          target: '>20',
          unit: 'seconds',
          weight: 0.2,
        },
      ],
    },
    {
      id: 'OBJ3_FULL_POWER',
      description: 'Reach and hold 95-100% power for 30 seconds',
      assessmentCriteria: [
        {
          metric: 'finalPower',
          target: '95-100',
          unit: '%',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ4_SMOOTH_ASCENT',
      description: 'No trips and power rate below 10%/min average',
      assessmentCriteria: [
        {
          metric: 'tripsOccurred',
          target: '0',
          unit: 'count',
          weight: 0.2,
        },
        {
          metric: 'maxPowerRate',
          target: '<10',
          unit: '%/min',
          weight: 0.1,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'state_reached',
    parameters: {
      powerMin: 0.95,
      powerMax: 1.05,
      stableDuration: 30,
    },
  },

  failureConditions: [
    {
      type: 'trip',
      parameters: {},
      description: 'Reactor tripped during power ascension',
    },
    {
      type: 'time_exceeded',
      parameters: { maxTime: 1500 }, // 25 minutes
      description: 'Power ascension took too long',
    },
    {
      type: 'limit_violation',
      parameters: {
        parameter: 'coolantTemp',
        limit: 615,
      },
      description: 'Coolant temperature exceeded operational limit during ascension',
    },
  ],

  briefing: `SCENARIO BRIEFING: Power Ascension — 20% to Full Power

INITIAL CONDITIONS:
• Reactor at 20% power (post-startup)
• Control rods at 40% withdrawal
• Boron concentration: 600 ppm
• Xenon/Iodine present from power history
• Time acceleration: 3x

YOUR MISSION:
Take the reactor from 20% power to 100% rated power in a controlled ascension
with holds at 50% and 75% for thermal stabilization.

POWER ASCENSION PROCEDURE:

Phase 1: 20% → 50% Power
  • Withdraw rods gradually while monitoring temperatures
  • Consider diluting boron to support the power increase
  • Fuel and coolant temperatures will rise significantly
  • Hold at ~50% for at least 20 seconds to stabilize

Phase 2: 50% → 75% Power
  • Continue rod withdrawal and/or boron dilution
  • Temperature feedback becomes stronger at higher power
  • You may need larger rod/boron changes to overcome feedback
  • Hold at ~75% for thermal stabilization

Phase 3: 75% → 100% Power
  • Final approach to rated power
  • Be precise — rod control is critical here
  • Xenon equilibrium shifts as power changes
  • Target: 95-100% stable for 30 seconds

KEY PRINCIPLES:
• Rod withdrawal adds reactivity FAST — use for step changes
• Boron dilution adds reactivity SLOW — use for sustained changes
• At higher power, temperature feedback is stronger → need more reactivity input
• Smooth, controlled rate of rise (<10%/min) — no rushing
• Each plateau lets xenon and temperatures partially equilibrate

REAL PLANT CONTEXT:
A real power ascension takes 24-48 hours with physics testing at each plateau.
Multiple departments coordinate: operations, reactor engineering, and I&C.
The operator's job is to make smooth, predictable power changes while keeping
all parameters within their normal bands.

SAFETY LIMITS:
• Reactor power must not exceed 110%
• Fuel temperature: < 1800 K
• Coolant temperature: < 615 K
• No automatic trips

Good luck reaching full power!`,

  proceduralGuidance: [
    {
      step: 1,
      instruction: 'Verify initial conditions: 20% power, stable parameters',
      expectedAction: 'visual_verification',
    },
    {
      step: 2,
      instruction: 'Begin rod withdrawal toward 50% — increase rods 5-10% at a time',
      expectedAction: 'rod_movement',
      validationCriteria: { powerTarget: 0.50 },
    },
    {
      step: 3,
      instruction: 'Hold at 50% (±5%) for stabilization — adjust rods/boron to maintain',
      expectedAction: 'stabilize',
      validationCriteria: { powerRange: [0.45, 0.55] },
    },
    {
      step: 4,
      instruction: 'Resume ascension toward 75% — may need boron dilution to support',
      expectedAction: 'rod_movement',
      validationCriteria: { powerTarget: 0.75 },
    },
    {
      step: 5,
      instruction: 'Hold at 75% (±5%) — verify temperatures within limits',
      expectedAction: 'stabilize',
      validationCriteria: { powerRange: [0.70, 0.80] },
    },
    {
      step: 6,
      instruction: 'Final ascension to 100% — careful rod control, small adjustments',
      expectedAction: 'rod_movement',
      validationCriteria: { powerTarget: 1.0 },
    },
    {
      step: 7,
      instruction: 'Stabilize at 95-100% for 30 seconds — mission complete',
      expectedAction: 'verification',
      validationCriteria: { powerRange: [0.95, 1.05] },
    },
  ],

  hints: [
    {
      triggerId: 'HINT_START_ASCENSION',
      triggerCondition: 'time > 10 && power < 0.25',
      content:
        'Begin withdrawing rods to increase power toward 50%. Increase rod position 5-10% at a time.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_APPROACHING_50',
      triggerCondition: 'power > 0.40 && power < 0.55',
      content:
        'Approaching 50% plateau. Start moderating your rod withdrawal rate to avoid overshoot.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_HOLD_50',
      triggerCondition: 'power > 0.48 && power < 0.55 && timeAt50Percent < 20',
      content:
        'Good — hold at ~50% for thermal stabilization. Let temperatures settle before continuing.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_USE_BORON',
      triggerCondition: 'power > 0.50 && rod > 0.70',
      content:
        'Rods getting high. Consider diluting boron to support the next power increase. This keeps rods in a better control band.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_HIGH_POWER',
      triggerCondition: 'power > 0.85',
      content:
        'Above 85% — you are in the final approach. Small rod adjustments only. Temperature feedback is strong here.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_COOLANT_WARNING',
      triggerCondition: 'coolantTemp > 605',
      content:
        'Coolant temperature approaching limit (615 K). Slow your power increase rate.',
      displayMode: 'automatic',
      priority: 'warning',
    },
  ],
};
