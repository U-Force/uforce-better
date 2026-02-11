/**
 * Scenario: Boron Dilution & Concentration Control
 *
 * HRTD Source: Rod Control (Ch. 8), Plant Operations (Ch. 15), PWR Overview (Ch. 1)
 *
 * Learning objectives:
 * - Understand soluble boron as a coarse reactivity control mechanism
 * - Practice dilution (lowering boron → adding positive reactivity)
 * - Practice boration (raising boron → adding negative reactivity)
 * - Coordinate boron and rod position for steady-state power changes
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const boronControlScenario: TrainingScenario = {
  id: 'PWR_BORON_01',
  name: 'Chemical Shim: Boron Dilution & Boration',
  description:
    'Master the use of soluble boron — the reactor\'s "coarse adjustment knob." Dilute to add reactivity, borate to remove it, and coordinate with rod position for smooth power changes.',
  difficulty: 1,
  estimatedDuration: 15,
  recommendedRole: TrainingRole.RO_TRAINEE,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.05, // 5% power — low but measurable
      Tf: 550,
      Tc: 530,
      C: [0.0002, 0.0002, 0.0002, 0.0002, 0.0002, 0.0002],
      I135: 0,
      Xe135: 0,
      decayHeat: [0, 0, 0],
    },
    controls: {
      rod: 0.25,
      pumpOn: true,
      scram: false,
      boronConc: 800, // Start at 800 ppm — room to dilute and borate
    },
    timeAcceleration: 2,
  },

  objectives: [
    {
      id: 'OBJ1_DILUTE',
      description: 'Dilute boron below 600 ppm and observe power increase',
      assessmentCriteria: [
        {
          metric: 'minBoronConc',
          target: '<600',
          unit: 'ppm',
          weight: 0.25,
        },
      ],
    },
    {
      id: 'OBJ2_BORATE',
      description: 'Borate above 900 ppm and observe power decrease',
      assessmentCriteria: [
        {
          metric: 'maxBoronConc',
          target: '>900',
          unit: 'ppm',
          weight: 0.25,
        },
      ],
    },
    {
      id: 'OBJ3_STEADY_POWER',
      description: 'Achieve stable power between 15-25% using boron adjustments',
      assessmentCriteria: [
        {
          metric: 'finalPower',
          target: '15-25',
          unit: '%',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ4_NO_TRIP',
      description: 'Complete without triggering a reactor trip',
      assessmentCriteria: [
        {
          metric: 'tripsOccurred',
          target: '0',
          unit: 'count',
          weight: 0.2,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'time_limit',
    parameters: {
      minTime: 240, // 4 minutes of practice
    },
  },

  failureConditions: [
    {
      type: 'trip',
      parameters: {},
      description: 'Reactor tripped — boron changes combined with rod position caused unsafe condition',
    },
    {
      type: 'time_exceeded',
      parameters: { maxTime: 900 }, // 15 minutes
      description: 'Time limit exceeded',
    },
  ],

  briefing: `SCENARIO BRIEFING: Chemical Shim — Boron Dilution & Boration

INITIAL CONDITIONS:
• Reactor at 5% power
• Boron concentration: 800 ppm
• Control rods at 25% withdrawal
• Primary coolant pump running

KEY CONCEPTS:

WHAT IS CHEMICAL SHIM?
Soluble boron (boric acid) is dissolved in the reactor coolant. Boron is a strong
neutron absorber. By changing its concentration, we control reactivity:

  DILUTION (lowering boron ppm):
  → Less neutron absorption → POSITIVE reactivity → Power rises
  → Like slowly withdrawing a giant, invisible control rod

  BORATION (raising boron ppm):
  → More neutron absorption → NEGATIVE reactivity → Power falls
  → Like slowly inserting a giant, invisible control rod

WHY USE BORON?
• Control rods handle FAST changes (seconds)
• Boron handles SLOW, LARGE changes (minutes to hours)
• Boron keeps rods near their optimal position ("rod control window")
• In a real plant, boron compensates for fuel burnup over months

REAL PLANT CONTEXT:
• Beginning of fuel cycle: ~1200 ppm (fresh fuel has excess reactivity)
• End of cycle: ~10 ppm (fuel depleted, less excess reactivity)
• Rate limited to 10 ppm/s in this simulator (real plant: ~2-5 ppm/min)

YOUR MISSION:
1. DILUTE boron below 600 ppm — watch power increase
2. Then BORATE above 900 ppm — watch power decrease
3. Use boron + rods together to settle at 15-25% power
4. No trips allowed!

CONTROLS:
• Use the BORON control panel to adjust concentration
• Lower the slider = dilute (less boron, more reactivity)
• Raise the slider = borate (more boron, less reactivity)
• Boron changes are SLOW — be patient and watch the trends`,

  hints: [
    {
      triggerId: 'HINT_START_DILUTE',
      triggerCondition: 'time > 5',
      content:
        'Start by DILUTING — lower the boron concentration from 800 ppm toward 600 ppm. Watch the reactivity panel as boron decreases.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_BORON_EFFECT',
      triggerCondition: 'boronConc < 700 && boronConc > 500',
      content:
        'Each 100 ppm of boron adds roughly 0.01 Δk/k of reactivity control. Notice the boron reactivity component changing on the reactivity panel.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_DILUTED_ENOUGH',
      triggerCondition: 'boronConc < 600',
      content:
        'Good — you\'ve diluted below 600 ppm! Power should be rising. Now try BORATING — raise the concentration above 900 ppm and watch the reverse effect.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_BORATION',
      triggerCondition: 'boronConc > 900',
      content:
        'Boration working! Power is dropping as the extra boron absorbs neutrons. In a real plant, operators coordinate boron and rods to keep rods in their optimal control band.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_COORDINATE',
      triggerCondition: 'time > 120',
      content:
        'Try combining ROD and BORON adjustments to reach a target power of 15-25%. Use boron for the bulk change, rods for fine-tuning.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_TOO_LOW',
      triggerCondition: 'boronConc < 200',
      content:
        'Boron getting very low! In a real plant, running out of boron dilution margin is a serious concern. Consider borating back up.',
      displayMode: 'automatic',
      priority: 'warning',
    },
  ],
};
