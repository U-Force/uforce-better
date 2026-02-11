/**
 * Scenario: Inherent Safety & Self-Regulation
 *
 * HRTD Source: Reactor Physics (Ch. 3), PWR Overview (Ch. 1), I&C (Ch. 2)
 *
 * Learning objectives:
 * - Understand Doppler (fuel temperature) feedback coefficient
 * - Understand moderator temperature coefficient (MTC)
 * - Observe how the reactor self-corrects after a perturbation
 * - Grasp why PWRs are inherently stable at power
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const selfRegulationScenario: TrainingScenario = {
  id: 'PWR_FEEDBACK_01',
  name: 'Inherent Safety: The Reactor That Corrects Itself',
  description:
    'Discover how Doppler and moderator temperature feedback make the PWR inherently stable. Perturb the reactor and watch it self-correct — no operator action required.',
  difficulty: 1,
  estimatedDuration: 12,
  recommendedRole: TrainingRole.RO_TRAINEE,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.10, // 10% power — visible dynamics without extreme temps
      Tf: 600, // Warm fuel
      Tc: 560, // Warm coolant
      C: [0.0003, 0.0003, 0.0003, 0.0003, 0.0003, 0.0003],
      I135: 0,
      Xe135: 0,
      decayHeat: [0, 0, 0],
    },
    controls: {
      rod: 0.30, // Rods partially withdrawn
      pumpOn: true,
      scram: false,
      boronConc: 0,
    },
    timeAcceleration: 1,
  },

  objectives: [
    {
      id: 'OBJ1_PERTURB_UP',
      description: 'Add positive reactivity by withdrawing rods to >45%',
      assessmentCriteria: [
        {
          metric: 'maxRodPosition',
          target: '>0.45',
          unit: 'fraction',
          weight: 0.2,
        },
      ],
    },
    {
      id: 'OBJ2_OBSERVE_SELFCORRECT',
      description: 'Watch power rise then stabilize due to negative feedback',
      assessmentCriteria: [
        {
          metric: 'observationTime',
          target: '>90',
          unit: 'seconds',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ3_PERTURB_DOWN',
      description: 'Add negative reactivity by inserting rods to <20%',
      assessmentCriteria: [
        {
          metric: 'minRodPosition',
          target: '<0.20',
          unit: 'fraction',
          weight: 0.2,
        },
      ],
    },
    {
      id: 'OBJ4_NO_TRIP',
      description: 'Complete the exercise without triggering a trip',
      assessmentCriteria: [
        {
          metric: 'tripsOccurred',
          target: '0',
          unit: 'count',
          weight: 0.3,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'time_limit',
    parameters: {
      minTime: 180, // 3 minutes of observation
    },
  },

  failureConditions: [
    {
      type: 'trip',
      parameters: {},
      description: 'Reactor tripped — you added too much reactivity too fast',
    },
    {
      type: 'time_exceeded',
      parameters: { maxTime: 720 }, // 12 minutes
      description: 'Time limit exceeded',
    },
  ],

  briefing: `SCENARIO BRIEFING: Inherent Safety — The Reactor That Corrects Itself

INITIAL CONDITIONS:
• Reactor at 10% power, stable operation
• Control rods at 30% withdrawal
• Primary coolant pump running
• Fuel temperature: 600 K
• Coolant temperature: 560 K

THE BIG IDEA:
A PWR doesn't need an operator to prevent runaway power. It has built-in
physics that AUTOMATICALLY fight power changes. This is called "inherent safety."

TWO KEY FEEDBACK MECHANISMS:

1. DOPPLER EFFECT (Fuel Temperature Coefficient)
   When fuel heats up, uranium-238 absorbs MORE neutrons.
   → Fewer neutrons available for fission → Power drops
   → This is INSTANT — the fastest safety mechanism in the reactor

2. MODERATOR TEMPERATURE COEFFICIENT (MTC)
   When coolant heats up, water becomes less dense.
   → Less effective neutron moderation → Fewer thermal fissions
   → Power drops — takes a few seconds longer than Doppler

YOUR MISSION:
1. Withdraw rods to add POSITIVE reactivity (increase to ~45%)
2. Watch: power rises → fuel heats → NEGATIVE feedback kicks in → power stabilizes
3. Then INSERT rods to add NEGATIVE reactivity (decrease to ~15%)
4. Watch: power drops → fuel cools → feedback reverses → power stabilizes at new level

WHAT TO WATCH:
• The REACTIVITY panel — see how total reactivity returns toward zero
• The TEMPERATURE displays — they drive the feedback
• The POWER display — watch it rise, slow, and stabilize WITHOUT you doing anything

WHY THIS MATTERS:
This is why Chernobyl (positive void coefficient) was so dangerous —
it lacked this self-correcting behavior. PWRs are designed to be stable.`,

  hints: [
    {
      triggerId: 'HINT_START',
      triggerCondition: 'time > 5',
      content:
        'Start by withdrawing rods from 30% up to about 45%. This adds positive reactivity and power will start rising.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_POWER_RISING',
      triggerCondition: 'power > 0.15 && time < 120',
      content:
        'Power is rising! Now STOP moving rods and just WATCH. Notice fuel temperature climbing? That\'s Doppler feedback starting to fight the power increase.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_STABILIZING',
      triggerCondition: 'power > 0.20 && Tf > 700',
      content:
        'See how the power rise is slowing down? Negative temperature feedback is counteracting the excess reactivity you added. The reactor is correcting itself!',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_TRY_INSERT',
      triggerCondition: 'time > 90 && maxRodPosition > 0.4',
      content:
        'Good observation! Now try the opposite — insert rods down to about 15-20% and watch the reverse process.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_COOLING_FEEDBACK',
      triggerCondition: 'power < 0.08 && Tf < 550',
      content:
        'As fuel cools, Doppler feedback becomes LESS negative (essentially adds positive reactivity). The reactor resists the power decrease too — it seeks equilibrium.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_TOO_AGGRESSIVE',
      triggerCondition: 'power > 0.50',
      content:
        'Power getting high! The feedback will stabilize it, but be careful not to exceed trip setpoints. This demonstrates that feedback has limits.',
      displayMode: 'automatic',
      priority: 'warning',
    },
  ],
};
