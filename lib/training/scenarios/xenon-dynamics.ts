/**
 * Scenario: Xenon Dynamics & Reactor Poisoning
 *
 * HRTD Source: Reactor Physics (Ch. 3), Plant Operations (Ch. 15), Rod Control (Ch. 8)
 *
 * Learning objectives:
 * - Understand Xe-135 as the dominant fission product poison
 * - Observe xenon buildup after power reduction (iodine pit)
 * - Experience the challenge of restarting through a xenon transient
 * - Grasp why xenon limits operational flexibility
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const xenonDynamicsScenario: TrainingScenario = {
  id: 'PWR_XENON_01',
  name: 'Xenon: The Invisible Poison',
  description:
    'Xenon-135 is the strongest neutron absorber in the core. After a power reduction, it builds up and fights your ability to restart. Experience the "iodine pit" and learn why xenon shapes every operational decision.',
  difficulty: 3,
  estimatedDuration: 20,
  recommendedRole: TrainingRole.RO,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.50, // 50% power — significant xenon production
      Tf: 900,
      Tc: 575,
      C: [0.001, 0.001, 0.001, 0.001, 0.001, 0.001],
      I135: 5e14, // Significant iodine inventory from power history
      Xe135: 3e14, // Equilibrium xenon at ~50% power
      decayHeat: [0.005, 0.003, 0.002],
    },
    controls: {
      rod: 0.55,
      pumpOn: true,
      scram: false,
      boronConc: 400,
    },
    timeAcceleration: 5, // Accelerated — xenon transients take hours in real time
  },

  objectives: [
    {
      id: 'OBJ1_REDUCE_POWER',
      description: 'Reduce reactor power below 10% using rod insertion',
      assessmentCriteria: [
        {
          metric: 'minPower',
          target: '<10',
          unit: '%',
          weight: 0.2,
        },
      ],
    },
    {
      id: 'OBJ2_OBSERVE_XENON',
      description: 'Observe xenon buildup after power reduction (wait 2+ minutes)',
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
      id: 'OBJ3_RESTART',
      description: 'Attempt to recover power above 30% through the xenon transient',
      assessmentCriteria: [
        {
          metric: 'finalPower',
          target: '>30',
          unit: '%',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ4_NO_TRIP',
      description: 'Complete without reactor trip',
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
    type: 'state_reached',
    parameters: {
      powerMin: 0.30,
      powerMax: 1.0,
      stableDuration: 30,
    },
  },

  failureConditions: [
    {
      type: 'trip',
      parameters: {},
      description: 'Reactor tripped — too aggressive with rods or boron during xenon transient',
    },
    {
      type: 'time_exceeded',
      parameters: { maxTime: 1200 }, // 20 minutes (accelerated time)
      description: 'Could not recover power through xenon — the "xenon precluded startup" condition',
    },
  ],

  briefing: `SCENARIO BRIEFING: Xenon — The Invisible Poison

INITIAL CONDITIONS:
• Reactor at 50% power with established xenon equilibrium
• Iodine-135 inventory: significant (from power history)
• Xenon-135 inventory: equilibrium level for 50% power
• Control rods at 55% withdrawal
• Time acceleration: 5x (xenon dynamics take hours in real time)

THE XENON PROBLEM:

Xenon-135 has the LARGEST neutron absorption cross-section of any known nuclide —
2.6 million barns. It's produced two ways:
  1. Directly from fission (~5%)
  2. From Iodine-135 decay (I-135 → Xe-135, half-life ~6.6 hours) (~95%)

And removed two ways:
  1. Neutron absorption (burnup) — proportional to POWER
  2. Radioactive decay (Xe-135 → Cs-135, half-life ~9.1 hours)

THE IODINE PIT:
When you REDUCE power, xenon burnup drops but iodine keeps decaying into xenon.
Result: xenon BUILDS UP after a power reduction — called the "iodine pit."
This adds massive NEGATIVE reactivity, fighting your ability to increase power.

Peak xenon occurs roughly 8-10 hours after a power reduction (real time).
If you can't overcome the xenon peak, you're stuck — "xenon precluded startup."

YOUR MISSION:
1. REDUCE power below 10% by inserting rods
2. WAIT and OBSERVE xenon buildup (watch the Xe-135 indicator climb)
3. ATTEMPT to recover power above 30% — you'll need to withdraw rods aggressively
   and possibly dilute boron to overcome the xenon reactivity penalty
4. No trips allowed — this requires careful, coordinated control

WHY THIS MATTERS:
• Xenon dictates when a reactor can restart after a shutdown
• Xenon transients constrain load-following capability
• Submarine and naval reactors carry extra reactivity to "burn through" xenon
• Commercial plants coordinate shutdowns with xenon predictions
• Operators must understand xenon to plan power maneuvers

This is one of the most important concepts in reactor operations.`,

  hints: [
    {
      triggerId: 'HINT_REDUCE',
      triggerCondition: 'time > 5 && power > 0.45',
      content:
        'Begin by inserting control rods to reduce power below 10%. This will start the xenon transient.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_POWER_LOW',
      triggerCondition: 'power < 0.10',
      content:
        'Power is low. Now WATCH — xenon-135 will start building up as iodine-135 decays. You\'ll see it on the Xe display. Xenon burnup has dropped but production continues.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_XENON_BUILDING',
      triggerCondition: 'time > 60 && power < 0.15',
      content:
        'Notice the xenon concentration climbing? This is the "iodine pit" — stored I-135 is decaying into Xe-135 faster than xenon can decay or be burned out.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_TRY_RESTART',
      triggerCondition: 'time > 120',
      content:
        'Time to try recovering power. Withdraw rods and consider diluting boron to overcome the xenon reactivity deficit. You may need both!',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_STRUGGLING',
      triggerCondition: 'time > 300 && power < 0.20',
      content:
        'Having trouble raising power? Xenon is holding you down. Try more aggressive rod withdrawal AND boron dilution together. If xenon is too strong, you may be "xenon precluded."',
      displayMode: 'automatic',
      priority: 'warning',
    },
    {
      triggerId: 'HINT_RECOVERING',
      triggerCondition: 'power > 0.25 && time > 120',
      content:
        'Power recovering! As power increases, xenon burnup increases, which removes xenon faster — a positive feedback loop. This is why the recovery accelerates once it starts.',
      displayMode: 'automatic',
      priority: 'info',
    },
  ],
};
