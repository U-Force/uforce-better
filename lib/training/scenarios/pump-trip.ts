/**
 * Scenario: Loss of Primary Coolant Pump
 *
 * Learning objectives:
 * - Recognize pump trip indicators
 * - Execute emergency response procedures
 * - Understand relationship between cooling and power
 * - Proper SCRAM execution
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const pumpTripScenario: TrainingScenario = {
  id: 'PWR_PUMP_TRIP_01',
  name: 'Loss of Primary Coolant Pump',
  description:
    'Respond to an unexpected loss of the primary coolant pump while operating at power. Execute emergency procedures to prevent fuel damage.',
  difficulty: 3,
  estimatedDuration: 5,
  recommendedRole: TrainingRole.RO,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.7, // 70% power - realistic operating level
      Tf: 1100, // Hot fuel at power
      Tc: 580, // Hot coolant at power
      C: [0.0008, 0.0007, 0.0006, 0.0005, 0.0004, 0.0003],
      I135: 0,
      Xe135: 0,
    },
    controls: {
      rod: 0.65, // Rods withdrawn for power operation
      pumpOn: true, // Will trip at t=60s
      scram: false,
    },
    timeAcceleration: 1, // Real-time for emergency
  },

  objectives: [
    {
      id: 'OBJ1_RECOGNIZE',
      description: 'Recognize pump trip condition immediately',
      assessmentCriteria: [
        {
          metric: 'timeToRecognition',
          target: '<5',
          unit: 'seconds',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ2_SCRAM',
      description: 'Execute manual SCRAM within 10 seconds of pump trip',
      assessmentCriteria: [
        {
          metric: 'timeToScram',
          target: '<10',
          unit: 'seconds',
          weight: 0.5,
        },
      ],
    },
    {
      id: 'OBJ3_NO_DAMAGE',
      description: 'Prevent fuel temperature from exceeding damage threshold',
      assessmentCriteria: [
        {
          metric: 'maxFuelTemp',
          target: '<1600',
          unit: 'K',
          weight: 0.5,
        },
      ],
    },
  ],

  events: [
    {
      triggerTime: 60, // Pump trips 60 seconds into scenario
      type: 'pump_trip',
      parameters: {
        tripPump: true,
        shouldAutoScram: false, // Test if operator responds
      },
      description: 'Primary coolant pump trips offline',
    },
  ],

  completionConditions: {
    type: 'state_reached',
    parameters: {
      scramActivated: true,
      powerBelow: 0.05, // Shutdown level
      stableDuration: 30,
    },
  },

  failureConditions: [
    {
      type: 'limit_violation',
      parameters: {
        parameter: 'fuelTemp',
        limit: 1700,
      },
      description: 'Fuel temperature exceeded damage threshold - core damage occurred',
    },
    {
      type: 'time_exceeded',
      parameters: {
        maxTime: 300, // 5 minutes max
      },
      description: 'Failed to safely shut down reactor within time limit',
    },
    {
      type: 'incorrect_action',
      parameters: {
        action: 'rod_withdrawal_after_trip',
      },
      description: 'CRITICAL ERROR: Rod withdrawal during loss of cooling',
    },
  ],

  briefing: `SCENARIO BRIEFING: Loss of Primary Coolant Pump

INITIAL CONDITIONS:
• Reactor operating at 70% rated power
• All systems normal
• Primary coolant pump RUNNING
• Control rods at 65% withdrawal
• Fuel temperature: 1100 K
• Coolant temperature: 580 K

SCENARIO:
You are the reactor operator on duty. The reactor is at steady-state power operation.
At approximately 60 seconds into the scenario, you will experience an equipment failure.

YOUR MISSION:
Monitor the reactor and respond appropriately to any abnormal conditions.
Protect the reactor core and maintain plant safety.

EMERGENCY PROCEDURES:
• Loss of forced cooling requires immediate reactor shutdown
• Manual SCRAM should be initiated if automatic trip fails
• Monitor fuel temperature - prevent exceeding design limits
• Verify rod insertion after SCRAM

CRITICAL PARAMETERS:
• Fuel damage begins at ~1700 K
• Without forced cooling, temperatures rise rapidly
• SCRAM must occur quickly to prevent damage

This is an evaluation scenario. No hints will be provided.
You are expected to recognize and respond to the emergency condition.

Stand by...`,

  proceduralGuidance: [
    {
      step: 1,
      instruction: 'Monitor all parameters - verify steady-state operation',
      expectedAction: 'monitoring',
    },
    {
      step: 2,
      instruction: '[AFTER PUMP TRIP] Recognize loss of coolant flow',
      expectedAction: 'recognition',
    },
    {
      step: 3,
      instruction: 'Initiate manual SCRAM immediately',
      expectedAction: 'scram',
      validationCriteria: { timeLimit: 10 },
    },
    {
      step: 4,
      instruction: 'Verify control rod insertion',
      expectedAction: 'verification',
    },
    {
      step: 5,
      instruction: 'Monitor decay heat removal via natural circulation',
      expectedAction: 'monitoring',
    },
    {
      step: 6,
      instruction: 'Verify all parameters trending to safe shutdown state',
      expectedAction: 'verification',
    },
  ],

  hints: [
    // No hints - this is an assessment scenario
    // Operator must respond based on training
  ],
};
