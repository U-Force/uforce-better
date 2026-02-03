/**
 * Scenario: Understanding Reactivity
 *
 * Learning objectives:
 * - Understand what reactivity means
 * - See how reactivity affects power
 * - Learn about positive and negative reactivity
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const reactivityBasicsScenario: TrainingScenario = {
  id: 'PWR_BASICS_02',
  name: 'Understanding Reactivity',
  description:
    'Learn what reactivity is and how it drives reactor power changes. Understand the relationship between reactivity, neutron population, and power level.',
  difficulty: 1,
  estimatedDuration: 15,
  recommendedRole: TrainingRole.RO_TRAINEE,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.005, // 0.5% power
      Tf: 325,
      Tc: 315,
      C: [0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001],
    },
    controls: {
      rod: 0.2, // 20% withdrawal
      pumpOn: true,
      scram: false,
    },
    timeAcceleration: 1,
  },

  objectives: [
    {
      id: 'OBJ1_POSITIVE_REACTIVITY',
      description: 'Observe positive reactivity by withdrawing control rods',
      assessmentCriteria: [
        {
          metric: 'positiveReactivityTime',
          target: '>30',
          unit: 'seconds',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ2_NEGATIVE_REACTIVITY',
      description: 'Observe negative reactivity by inserting control rods',
      assessmentCriteria: [
        {
          metric: 'negativeReactivityTime',
          target: '>30',
          unit: 'seconds',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ3_MAINTAIN_CONTROL',
      description: 'Keep reactor power between 0.1% and 15%',
      assessmentCriteria: [
        {
          metric: 'maxPower',
          target: '<15',
          unit: '%',
          weight: 0.4,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'time_limit',
    parameters: {
      minTime: 180, // 3 minutes of practice
      maxPower: 0.15,
    },
  },

  failureConditions: [
    {
      type: 'limit_violation',
      parameters: {
        parameter: 'power',
        limit: 0.2,
      },
      description: 'Power exceeded 20% - too high for this exercise',
    },
  ],

  briefing: `SCENARIO BRIEFING: Understanding Reactivity

INITIAL CONDITIONS:
• Reactor at low power (~0.5%)
• Control rods at 20% withdrawal
• All systems operational

YOUR MISSION:
Learn what reactivity is and how it controls reactor behavior.

KEY CONCEPTS:
• REACTIVITY (ρ) measures how far the reactor is from being critical
• ρ > 0 (POSITIVE): Power is rising - more neutrons produced than absorbed
• ρ = 0 (CRITICAL): Power is steady - neutron production balanced
• ρ < 0 (NEGATIVE): Power is falling - more neutrons absorbed than produced

PROCEDURES:
1. Watch the REACTIVITY display carefully
2. Withdraw rods slowly and observe positive reactivity
3. Notice how power increases when reactivity is positive
4. Insert rods and observe negative reactivity
5. Notice how power decreases when reactivity is negative
6. Try to find the rod position where reactivity is near zero

LEARNING POINTS:
• Reactivity tells you what the reactor WILL DO next
• Power follows reactivity with some delay
• Temperature changes also affect reactivity (feedback)
• The reactor naturally seeks equilibrium through feedback

Understanding reactivity is key to controlling the reactor!`,

  hints: [
    {
      triggerId: 'HINT_WATCH_REACTIVITY',
      triggerCondition: 'time > 5',
      content:
        'ℹ️ Look at the REACTIVITY panel. This number tells you if power is rising (positive) or falling (negative).',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_MAKE_POSITIVE',
      triggerCondition: 'time > 20 && positiveReactivityTime < 10',
      content:
        'ℹ️ Try withdrawing control rods (move slider right) to add POSITIVE reactivity. Watch power rise!',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_MAKE_NEGATIVE',
      triggerCondition: 'positiveReactivityTime > 20 && negativeReactivityTime < 10',
      content:
        'ℹ️ Now try inserting control rods (move slider left) to add NEGATIVE reactivity. Watch power fall!',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_FIND_CRITICAL',
      triggerCondition: 'time > 60',
      content:
        '💡 Can you find the rod position where reactivity stays near zero? This is called "going critical" - power will be steady.',
      displayMode: 'automatic',
      priority: 'info',
    },
  ],
};
