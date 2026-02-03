/**
 * Scenario: Loss of Coolant Accident (LOCA)
 *
 * Learning objectives:
 * - Respond to worst-case accident scenario
 * - Execute emergency procedures under pressure
 * - Understand accident progression and mitigation
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const locaScenario: TrainingScenario = {
  id: 'PWR_EMERGENCY_01',
  name: 'Loss of Coolant Accident (LOCA)',
  description:
    'The most serious accident scenario - a break in the primary coolant system. Execute emergency procedures, initiate SCRAM, and prevent core damage.',
  difficulty: 4,
  estimatedDuration: 15,
  recommendedRole: TrainingRole.SRO,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.95, // 95% power - near full power
      Tf: 450,
      Tc: 385,
      C: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003],
    },
    controls: {
      rod: 0.75,
      pumpOn: true,
      scram: false,
    },
    timeAcceleration: 1,
  },

  objectives: [
    {
      id: 'OBJ1_IMMEDIATE_SCRAM',
      description: 'Initiate reactor SCRAM within 10 seconds of event',
      assessmentCriteria: [
        {
          metric: 'scramResponseTime',
          target: '<10',
          unit: 'seconds',
          weight: 0.5,
        },
      ],
    },
    {
      id: 'OBJ2_MONITOR_TEMPS',
      description: 'Monitor and understand temperature behavior',
      assessmentCriteria: [
        {
          metric: 'tempMonitoringScore',
          target: '>80',
          unit: 'points',
          weight: 0.25,
        },
      ],
    },
    {
      id: 'OBJ3_SURVIVE',
      description: 'Prevent fuel temperature from exceeding 800°C',
      assessmentCriteria: [
        {
          metric: 'maxFuelTemp',
          target: '<800',
          unit: '°C',
          weight: 0.25,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'time_limit',
    parameters: {
      minTime: 0,
      maxTime: 300,
      scramRequired: true,
      maxFuelTemp: 800,
    },
  },

  failureConditions: [
    {
      type: 'limit_violation',
      parameters: {
        parameter: 'fuel_temperature',
        limit: 900,
      },
      description: 'Fuel temperature exceeded 900°C - CORE DAMAGE',
    },
    {
      type: 'time_exceeded',
      parameters: {
        maxTime: 20,
        requiredAction: 'scram',
      },
      description: 'Failed to SCRAM reactor within 20 seconds - procedure violation',
    },
  ],

  briefing: `SCENARIO BRIEFING: Loss of Coolant Accident (LOCA)

⚠️  WARNING: This is the MOST SERIOUS training scenario ⚠️

INITIAL CONDITIONS:
• Reactor at 95% power (near full power)
• All systems operating normally
• Routine power operation

EVENT:
At T+15 seconds, a RUPTURE will occur in the primary coolant system!

CONSEQUENCES:
• Rapid loss of coolant inventory
• Loss of core cooling capability
• Reactor power must be shut down IMMEDIATELY
• Even after shutdown, decay heat will cause temperature rise
• Without cooling, fuel damage is CERTAIN

YOUR MISSION:
Execute emergency procedures to minimize consequences and prevent core damage.

IMMEDIATE ACTIONS (Recognition < 5 sec, Action < 10 sec):
1. When alarm sounds: RECOGNIZE LOCA condition
2. INITIATE REACTOR SCRAM IMMEDIATELY
3. Verify all rods inserted (power dropping rapidly)
4. Monitor fuel temperature - will rise despite shutdown
5. Understand: Even with reactor scrammed, decay heat continues
6. Pray your SCRAM worked, because that's your only tool here

CRITICAL FACTS:
• After SCRAM, ~7% decay heat continues (initially)
• Decay heat decreases slowly over minutes/hours
• Without cooling, fuel WILL overheat from decay heat alone
• Temperature > 900°C = fuel damage and radioactive release
• In real plant: Emergency Core Cooling System (ECCS) would activate
• In this sim: You only have SCRAM - make it count!

LEARNING POINTS:
• LOCA is the design-basis accident for nuclear plants
• Fast SCRAM is ESSENTIAL - every second counts
• Even shutdown reactor needs cooling (decay heat)
• Multiple safety systems required (defense in depth)
• Operator speed and decisiveness matter

This scenario teaches you why nuclear safety is taken so seriously.
Professional operators drill this scenario repeatedly.

EXPECTED OUTCOME:
• You will SCRAM immediately
• Power will drop rapidly to ~7% (decay heat)
• Fuel temperature will STILL RISE due to loss of cooling
• You will watch helplessly as temperature climbs
• Your success is measured by SCRAM speed and final temperature

This is why we have Emergency Core Cooling Systems.

Good luck. You'll need it.`,

  hints: [
    {
      triggerId: 'HINT_EVENT_START',
      triggerCondition: 'time > 15 && time < 18',
      content:
        '🚨🚨🚨 LOSS OF COOLANT ACCIDENT! PRIMARY SYSTEM BREACH! INITIATE REACTOR SCRAM IMMEDIATELY! 🚨🚨🚨',
      displayMode: 'automatic',
      priority: 'critical',
    },
    {
      triggerId: 'HINT_SCRAM_NOW',
      triggerCondition: 'time > 18 && scram === false',
      content:
        '🚨 EMERGENCY: HIT THE SCRAM BUTTON NOW! Every second without SCRAM increases core damage risk!',
      displayMode: 'automatic',
      priority: 'critical',
    },
    {
      triggerId: 'HINT_STILL_NOT_SCRAMMED',
      triggerCondition: 'time > 25 && scram === false',
      content:
        '🚨 CRITICAL FAILURE: Reactor not scrammed! This is a procedure violation! INITIATE SCRAM!',
      displayMode: 'automatic',
      priority: 'critical',
    },
    {
      triggerId: 'HINT_SCRAM_GOOD',
      triggerCondition: 'scram === true && time < 25',
      content:
        'ℹ️ SCRAM initiated. Power dropping. Note: Decay heat (~7%) continues. Temperature will still rise without coolant flow.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_TEMP_RISING',
      triggerCondition: 'scram === true && Tf > 600',
      content:
        '⚠️ Fuel temperature rising despite shutdown - this is decay heat. Without ECCS, temperature will continue climbing. Monitor closely.',
      displayMode: 'automatic',
      priority: 'warning',
    },
    {
      triggerId: 'HINT_APPROACHING_DAMAGE',
      triggerCondition: 'Tf > 750',
      content:
        '🚨 Fuel temperature approaching damage threshold. In a real plant, ECCS would be flooding the core right now. You can only watch and hope.',
      displayMode: 'automatic',
      priority: 'critical',
    },
  ],
};
