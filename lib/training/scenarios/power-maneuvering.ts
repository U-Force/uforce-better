/**
 * Scenario: Power Level Changes
 *
 * Learning objectives:
 * - Practice changing power smoothly
 * - Learn proper rod movement rates
 * - Understand delayed neutron effects
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const powerManeuveringScenario: TrainingScenario = {
  id: 'PWR_NORMAL_02',
  name: 'Power Level Maneuvering',
  description:
    'Practice smoothly changing reactor power levels. Learn the proper rates for rod movement and how to achieve stable operation at different power levels.',
  difficulty: 2,
  estimatedDuration: 25,
  recommendedRole: TrainingRole.RO,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.2, // 20% power - good starting point
      Tf: 360,
      Tc: 335,
      C: [0.001, 0.001, 0.001, 0.001, 0.001, 0.001],
      I135: 0,
      Xe135: 0,
    },
    controls: {
      rod: 0.4,
      pumpOn: true,
      scram: false,
    },
    timeAcceleration: 1,
  },

  objectives: [
    {
      id: 'OBJ1_REACH_50',
      description: 'Increase power to 50% and stabilize',
      assessmentCriteria: [
        {
          metric: 'timeAt50Percent',
          target: '>60',
          unit: 'seconds',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ2_SMOOTH_OPERATION',
      description: 'Avoid rapid power swings (keep rate < 5%/min)',
      assessmentCriteria: [
        {
          metric: 'maxPowerRate',
          target: '<5',
          unit: '%/min',
          weight: 0.4,
        },
      ],
    },
    {
      id: 'OBJ3_TEMP_CONTROL',
      description: 'Maintain fuel temperature below 723 K (450°C)',
      assessmentCriteria: [
        {
          metric: 'maxFuelTemp',
          target: '<723',
          unit: 'K',
          weight: 0.3,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'time_limit',
    parameters: {
      minTime: 300, // 5 minutes
      targetPower: 0.5,
      powerTolerance: 0.05,
    },
  },

  failureConditions: [
    {
      type: 'limit_violation',
      parameters: {
        parameter: 'power_rate',
        limit: 10,
      },
      description: 'Power change rate exceeded 10%/min - too fast!',
    },
    {
      type: 'limit_violation',
      parameters: {
        parameter: 'fuel_temperature',
        limit: 500,
      },
      description: 'Fuel temperature exceeded safe operating limit',
    },
  ],

  briefing: `SCENARIO BRIEFING: Power Level Maneuvering

INITIAL CONDITIONS:
• Reactor at 20% power
• All systems operating normally
• Ready for power increase

YOUR MISSION:
Smoothly raise reactor power from 20% to 50% and maintain stable operation.

KEY PROCEDURES:
1. Establish current baseline - note power, temps, reactivity
2. Plan your power increase - target is 50% power
3. Withdraw rods SLOWLY in small increments
4. Watch for positive reactivity - don't let it get too high
5. Allow time for delayed neutrons to respond (30-60 seconds)
6. Stabilize at 50% by adjusting rods to zero reactivity
7. Monitor temperatures continuously

IMPORTANT LIMITS:
• Power change rate: < 5%/min (target)
• Maximum power rate: < 10%/min (absolute limit)
• Fuel temperature: < 500°C (absolute limit)
• Coolant temperature: < 400°C

LEARNING POINTS:
• Delayed neutrons cause slow power response
• Small rod movements are easier to control
• Wait and observe before making next change
• Temperature feedback helps stabilize power
• Patience prevents overshoots and oscillations

Professional operators make power changes look easy because they go slow!`,

  hints: [
    {
      triggerId: 'HINT_START_SLOW',
      triggerCondition: 'time > 15 && P < 0.25',
      content:
        'ℹ️ Start your power increase. Withdraw rods in SMALL steps (2-3% at a time), then wait 30 seconds to observe.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_TOO_FAST',
      triggerCondition: 'powerRate > 7',
      content:
        '⚠️ Power is changing too rapidly! Slow down - make smaller rod movements and wait longer between changes.',
      displayMode: 'automatic',
      priority: 'warning',
    },
    {
      triggerId: 'HINT_APPROACHING_TARGET',
      triggerCondition: 'P > 0.45 && P < 0.55',
      content:
        'ℹ️ Getting close to 50%! Start reducing your rod movements. Adjust to make reactivity near zero for stable power.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_STABILIZE',
      triggerCondition: 'P > 0.48 && P < 0.52 && time > 180',
      content:
        '💡 Good! Now hold steady at 50%. Fine-tune rod position to keep reactivity near zero. Small adjustments only!',
      displayMode: 'automatic',
      priority: 'info',
    },
  ],
};
