/**
 * Scenario: Normal Startup from Cold Shutdown
 *
 * Learning objectives:
 * - Demonstrate proper approach to criticality
 * - Control reactor power using rod withdrawal
 * - Maintain thermal parameters within limits
 * - Understand reactivity feedback mechanisms
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const normalStartupScenario: TrainingScenario = {
  id: 'PWR_STARTUP_01',
  name: 'Normal Startup from Cold Shutdown',
  description:
    'Bring the reactor from cold shutdown to 20% power following standard startup procedures. Demonstrate understanding of approach to criticality and thermal feedback effects.',
  difficulty: 2,
  estimatedDuration: 15,
  recommendedRole: TrainingRole.RO,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.0001, // Near zero power (shutdown)
      Tf: 500, // Cool fuel temperature
      Tc: 500, // Cool coolant temperature
      C: [0.00001, 0.00001, 0.00001, 0.00001, 0.00001, 0.00001],
      I135: 0,
      Xe135: 0,
    },
    controls: {
      rod: 0.05, // Rods mostly inserted
      pumpOn: true,
      scram: false,
    },
    timeAcceleration: 2,
  },

  objectives: [
    {
      id: 'OBJ1_CRITICALITY',
      description: 'Achieve criticality using gradual rod withdrawal',
      assessmentCriteria: [
        {
          metric: 'timeToFirstCriticality',
          target: '<600',
          unit: 'seconds',
          weight: 0.2,
        },
        {
          metric: 'rodWithdrawalRate',
          target: '<5',
          unit: '%/minute',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ2_POWER_LEVEL',
      description: 'Reach 20% power without exceeding thermal limits',
      assessmentCriteria: [
        {
          metric: 'finalPower',
          target: '18-22',
          unit: '%',
          weight: 0.3,
        },
        {
          metric: 'maxCoolantTemp',
          target: '<570',
          unit: 'K',
          weight: 0.2,
        },
      ],
    },
    {
      id: 'OBJ3_NO_TRIPS',
      description: 'Complete startup without automatic trips',
      assessmentCriteria: [
        {
          metric: 'tripsOccurred',
          target: '0',
          unit: 'count',
          weight: 0.5,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'state_reached',
    parameters: {
      powerMin: 0.18,
      powerMax: 0.22,
      stableDuration: 30, // Must maintain stable for 30 seconds
      maxCoolantTemp: 570,
    },
  },

  failureConditions: [
    {
      type: 'trip',
      parameters: {},
      description: 'Automatic reactor trip occurred',
    },
    {
      type: 'time_exceeded',
      parameters: { maxTime: 900 }, // 15 minutes max
      description: 'Startup procedure exceeded time limit',
    },
    {
      type: 'limit_violation',
      parameters: {
        parameter: 'coolantTemp',
        limit: 600,
      },
      description: 'Coolant temperature exceeded safe operating limit',
    },
  ],

  briefing: `SCENARIO BRIEFING: Normal Startup from Cold Shutdown

INITIAL CONDITIONS:
• Reactor in cold shutdown condition
• All systems functional
• Primary coolant pump RUNNING
• Control rods at 5% withdrawal (fully inserted)
• Reactor power: ~0% (shutdown level)
• Fuel temperature: 500 K
• Coolant temperature: 500 K

YOUR MISSION:
Perform a normal reactor startup and bring the reactor to 20% rated power.

KEY PROCEDURES:
1. Verify initial conditions and system readiness
2. Begin slow, controlled rod withdrawal
3. Monitor approach to criticality
4. Once critical, continue withdrawal to increase power
5. Allow thermal feedback to stabilize reactor
6. Reach and maintain 20% power

SAFETY LIMITS:
• Reactor power must not exceed 110%
• Fuel temperature must stay below 1800 K
• Coolant temperature must stay below 620 K
• Rod withdrawal rate should not exceed 5%/minute

PERFORMANCE CRITERIA:
• Reach 20% power (±2%) within 15 minutes
• No automatic trips or safety limit violations
• Smooth, controlled power increase
• Final coolant temperature below 570 K

Good luck, Operator.`,

  proceduralGuidance: [
    {
      step: 1,
      instruction: 'Verify initial conditions: Power <1%, Rods <10%, Pump ON',
      expectedAction: 'visual_verification',
    },
    {
      step: 2,
      instruction: 'Begin rod withdrawal slowly - increase to 15%',
      expectedAction: 'rod_movement',
      validationCriteria: { rodTarget: 0.15, maxRate: 0.05 },
    },
    {
      step: 3,
      instruction: 'Monitor for power increase - indicates approach to critical',
      expectedAction: 'monitoring',
    },
    {
      step: 4,
      instruction: 'Continue withdrawal to 30% - power should begin rising',
      expectedAction: 'rod_movement',
      validationCriteria: { rodTarget: 0.3 },
    },
    {
      step: 5,
      instruction: 'Monitor reactivity feedback as fuel heats up',
      expectedAction: 'monitoring',
    },
    {
      step: 6,
      instruction: 'Adjust rods to maintain steady rise to 20% power',
      expectedAction: 'fine_control',
      validationCriteria: { powerTarget: 0.2 },
    },
    {
      step: 7,
      instruction: 'Stabilize at 20% power - verify all parameters nominal',
      expectedAction: 'verification',
      validationCriteria: { powerRange: [0.18, 0.22] },
    },
  ],

  hints: [
    {
      triggerId: 'HINT_SLOW_WITHDRAWAL',
      triggerCondition: 'rodRate > 0.1',
      content:
        '⚠️ HINT: You are withdrawing rods too quickly. Slower withdrawal gives you better control and allows you to observe reactor response.',
      displayMode: 'automatic',
      priority: 'warning',
    },
    {
      triggerId: 'HINT_APPROACHING_CRITICAL',
      triggerCondition: 'power > 0.001 && power < 0.01',
      content:
        'ℹ️ HINT: Power is starting to rise - you are approaching criticality. This is normal. Continue gradual rod withdrawal.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_FEEDBACK_EFFECT',
      triggerCondition: 'fuelTemp > 700 && reactivity < 0',
      content:
        'ℹ️ HINT: Notice how reactivity becomes negative as fuel heats up. This is Doppler feedback - your prompt safety mechanism. The reactor naturally resists power increases.',
      displayMode: 'on_demand',
      priority: 'info',
    },
    {
      triggerId: 'HINT_COOLANT_WARNING',
      triggerCondition: 'coolantTemp > 560',
      content:
        '⚠️ WARNING: Coolant temperature approaching limit. Consider slowing power increase or reducing rod withdrawal rate.',
      displayMode: 'automatic',
      priority: 'warning',
    },
    {
      triggerId: 'HINT_OVERSHOOT',
      triggerCondition: 'power > 0.25',
      content:
        '⚠️ WARNING: Power exceeding target. You may be withdrawing rods too aggressively. Consider inserting rods slightly to slow power rise.',
      displayMode: 'automatic',
      priority: 'warning',
    },
  ],
};
