/**
 * Scenario: Loss of Feedwater
 *
 * Learning objectives:
 * - Respond to loss of secondary cooling
 * - Understand primary/secondary interaction
 * - Practice emergency power reduction
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const feedwaterLossScenario: TrainingScenario = {
  id: 'PWR_TRANSIENT_02',
  name: 'Loss of Feedwater Event',
  description:
    'Respond to a loss of feedwater flow. Quickly reduce reactor power to prevent overheating while maintaining cooling to the core.',
  difficulty: 3,
  estimatedDuration: 20,
  recommendedRole: TrainingRole.RO,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.75, // 75% power - high enough to be challenging
      Tf: 420,
      Tc: 370,
      C: [0.002, 0.002, 0.002, 0.002, 0.002, 0.002],
    },
    controls: {
      rod: 0.65,
      pumpOn: true,
      scram: false,
    },
    timeAcceleration: 1,
  },

  objectives: [
    {
      id: 'OBJ1_REDUCE_POWER',
      description: 'Reduce power below 30% within 3 minutes',
      assessmentCriteria: [
        {
          metric: 'powerReductionTime',
          target: '<180',
          unit: 'seconds',
          weight: 0.4,
        },
      ],
    },
    {
      id: 'OBJ2_AVOID_SCRAM',
      description: 'Control the situation without initiating SCRAM',
      assessmentCriteria: [
        {
          metric: 'scramUsed',
          target: 'false',
          unit: 'boolean',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ3_PROTECT_FUEL',
      description: 'Keep fuel temperature below 550°C',
      assessmentCriteria: [
        {
          metric: 'maxFuelTemp',
          target: '<550',
          unit: '°C',
          weight: 0.3,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'state_reached',
    parameters: {
      targetPower: 0.2,
      maxFuelTemp: 550,
      stabilizationTime: 60,
    },
  },

  failureConditions: [
    {
      type: 'limit_violation',
      parameters: {
        parameter: 'fuel_temperature',
        limit: 600,
      },
      description: 'Fuel temperature exceeded 600°C - fuel damage likely',
    },
    {
      type: 'limit_violation',
      parameters: {
        parameter: 'coolant_temperature',
        limit: 450,
      },
      description: 'Coolant temperature exceeded limits - approaching saturation',
    },
  ],

  briefing: `SCENARIO BRIEFING: Loss of Feedwater Event

INITIAL CONDITIONS:
• Reactor operating at 75% power
• All systems normal
• Steady state operation

EVENT:
At T+30 seconds, feedwater flow to the steam generators will be lost!

CONSEQUENCES:
• Loss of heat removal from primary system
• Primary coolant temperature will rise
• Fuel temperature will increase
• Pressure may increase
• Risk of reactor trip if not controlled

YOUR MISSION:
Recognize the loss of feedwater and rapidly reduce reactor power to prevent damage.

IMMEDIATE ACTIONS (when event occurs):
1. Note rising temperatures (both Tf and Tc)
2. Begin rapid power reduction - insert rods quickly
3. Target 20-30% power to match natural circulation cooling
4. Monitor fuel temperature - must stay below 550°C
5. Avoid SCRAM if possible (controlled reduction preferred)

PROHIBITED ACTIONS:
• Do not trip the primary coolant pump (maintain forced cooling)
• Do not allow fuel temperature to exceed 600°C
• Do not allow uncontrolled power oscillations

LEARNING POINTS:
• Fast recognition and response is critical
• Secondary system failures affect primary
• Rapid power reduction may be necessary
• Natural circulation can cool low-power reactor
• Temperature is your key indicator

This is a SERIOUS transient - act quickly and decisively!`,

  hints: [
    {
      triggerId: 'HINT_EVENT_START',
      triggerCondition: 'time > 30 && time < 35',
      content:
        '🚨 LOSS OF FEEDWATER! Secondary cooling has failed. Temperatures will rise. Begin rapid power reduction NOW!',
      displayMode: 'automatic',
      priority: 'critical',
    },
    {
      triggerId: 'HINT_INSERT_RODS',
      triggerCondition: 'time > 40 && P > 0.6',
      content:
        '⚠️ Insert control rods rapidly! Target 20-30% power. You don\'t have much time before temperatures reach limits!',
      displayMode: 'automatic',
      priority: 'warning',
    },
    {
      triggerId: 'HINT_TEMP_RISING',
      triggerCondition: 'Tf > 500',
      content:
        '🚨 Fuel temperature is HIGH and rising! More negative reactivity needed - insert rods faster!',
      displayMode: 'automatic',
      priority: 'critical',
    },
    {
      triggerId: 'HINT_APPROACHING_SAFE',
      triggerCondition: 'P < 0.35 && Tf < 500',
      content:
        'ℹ️ Power reduction is working. Continue to 20% and stabilize. Monitor temperatures closely.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_CONSIDER_SCRAM',
      triggerCondition: 'Tf > 570',
      content:
        '🚨 CRITICAL: Fuel temperature approaching damage threshold! Consider manual SCRAM if unable to control!',
      displayMode: 'automatic',
      priority: 'critical',
    },
  ],
};
