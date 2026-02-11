/**
 * Scenario: Reactor Protection System Demonstration
 *
 * HRTD Source: Reactor Protection System (Ch. 13), Trip Signals (Ch. 14),
 *              Engineered Safety Features (Ch. 5), ECCS (Ch. 6)
 *
 * Learning objectives:
 * - Understand the purpose and function of the Reactor Protection System
 * - Learn the automatic trip setpoints and what parameters trigger them
 * - Observe automatic SCRAM response when limits are exceeded
 * - Appreciate defense-in-depth: multiple independent trip signals
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const rpsScenario: TrainingScenario = {
  id: 'PWR_RPS_01',
  name: 'Reactor Protection System: The Ultimate Safety Net',
  description:
    'Explore the automatic protection system that stands between normal operation and core damage. Deliberately challenge trip setpoints to observe how the RPS responds — and understand why each trip signal exists.',
  difficulty: 2,
  estimatedDuration: 15,
  recommendedRole: TrainingRole.RO_TRAINEE,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.70, // 70% power — high enough that trips are reachable
      Tf: 1050,
      Tc: 585,
      C: [0.0008, 0.0007, 0.0006, 0.0005, 0.0004, 0.0003],
      I135: 3e14,
      Xe135: 2e14,
      decayHeat: [0.005, 0.003, 0.002],
    },
    controls: {
      rod: 0.60,
      pumpOn: true,
      scram: false,
      boronConc: 300,
    },
    timeAcceleration: 1,
  },

  objectives: [
    {
      id: 'OBJ1_UNDERSTAND_TRIPS',
      description: 'Run the simulation for at least 3 minutes to study trip setpoints',
      assessmentCriteria: [
        {
          metric: 'observationTime',
          target: '>180',
          unit: 'seconds',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ2_TRIGGER_TRIP',
      description: 'Deliberately trigger at least one automatic reactor trip',
      assessmentCriteria: [
        {
          metric: 'tripsOccurred',
          target: '>0',
          unit: 'count',
          weight: 0.4,
        },
      ],
    },
    {
      id: 'OBJ3_OBSERVE_SCRAM',
      description: 'Observe the automatic SCRAM sequence and post-trip behavior',
      assessmentCriteria: [
        {
          metric: 'postTripObservation',
          target: '>30',
          unit: 'seconds',
          weight: 0.3,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'time_limit',
    parameters: {
      minTime: 180,
    },
  },

  failureConditions: [
    {
      type: 'time_exceeded',
      parameters: { maxTime: 900 }, // 15 minutes
      description: 'Scenario time limit exceeded',
    },
  ],

  briefing: `SCENARIO BRIEFING: Reactor Protection System — The Ultimate Safety Net

INITIAL CONDITIONS:
• Reactor at 70% power
• All systems normal
• Control rods at 60% withdrawal
• Boron concentration: 300 ppm

THE REACTOR PROTECTION SYSTEM (RPS):

The RPS is the most important safety system in the plant. It automatically
shuts down the reactor when parameters exceed safe limits. It operates
INDEPENDENTLY of the operator — you cannot override it (except SRO bypass).

AUTOMATIC TRIP SETPOINTS IN THIS SIMULATOR:
┌─────────────────────┬──────────────┬──────────────────────────┐
│ Parameter           │ Trip Point   │ Why It Exists            │
├─────────────────────┼──────────────┼──────────────────────────┤
│ Reactor Power       │ > 110%       │ Prevent fuel damage from │
│                     │              │ excess power             │
├─────────────────────┼──────────────┼──────────────────────────┤
│ Fuel Temperature    │ > 1800 K     │ Protect fuel cladding    │
│                     │              │ integrity (Zircaloy)     │
├─────────────────────┼──────────────┼──────────────────────────┤
│ Coolant Temperature │ > 620 K      │ Prevent departure from   │
│                     │              │ nucleate boiling (DNB)   │
└─────────────────────┴──────────────┴──────────────────────────┘

REAL PLANT CONTEXT:
A Westinghouse 4-loop PWR has dozens of trip signals including:
• High neutron flux (power range)
• Overtemperature ΔT and Overpower ΔT
• High pressurizer pressure / Low pressurizer pressure
• Low reactor coolant flow
• Steam generator low-low level
• Safety injection signal
• Turbine trip (above P-9)
Each uses redundant sensor channels with 2-out-of-4 voting logic.

YOUR MISSION:
1. Study the current parameters — how close are they to trip points?
2. DELIBERATELY push one parameter past its trip setpoint
   (e.g., withdraw rods aggressively to approach 110% power)
3. OBSERVE: the RPS will SCRAM the reactor automatically
4. Watch the post-trip behavior — how fast do rods insert?
   How does power drop? What happens to temperatures?

THIS IS A LEARNING SCENARIO:
Unlike other scenarios, triggering a trip here is the GOAL, not a failure.
You're learning what happens when the safety net catches you.

DEFENSE IN DEPTH:
The RPS is just ONE layer of protection:
  Layer 1: Fuel itself (inherent feedback)
  Layer 2: Operator action
  Layer 3: RPS automatic trip ← YOU ARE HERE
  Layer 4: Engineered Safety Features (ECCS, containment)
  Layer 5: Containment structure`,

  hints: [
    {
      triggerId: 'HINT_EXPLORE_LIMITS',
      triggerCondition: 'time > 10',
      content:
        'Look at current power (70%), fuel temp, and coolant temp. Compare them to the trip setpoints: Power >110%, Tf >1800K, Tc >620K. How much margin do you have?',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_TRY_POWER_TRIP',
      triggerCondition: 'time > 30 && tripsOccurred === 0',
      content:
        'Try withdrawing rods aggressively to push power toward 110%. Or turn off the pump to challenge the coolant temperature limit. The RPS will catch you!',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_APPROACHING_TRIP',
      triggerCondition: 'power > 0.95 && tripsOccurred === 0',
      content:
        'Power approaching trip setpoint (110%). Keep going — the RPS will activate automatically when you cross the threshold.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_TRIP_OCCURRED',
      triggerCondition: 'tripsOccurred > 0',
      content:
        'TRIP! The RPS automatically scrammed the reactor. Watch: all rods inserting rapidly, power dropping fast. Notice how fuel temperature continues to rise briefly due to thermal lag, then begins falling.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_POST_TRIP',
      triggerCondition: 'scram === true && power < 0.05',
      content:
        'Post-trip: Power is at decay heat levels. Temperature is declining. In a real plant, operators would now enter emergency operating procedures and investigate the cause of the trip.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_COOLANT_TRIP',
      triggerCondition: 'coolantTemp > 610 && tripsOccurred === 0',
      content:
        'Coolant temperature approaching trip point (620K). The RPS monitors this to prevent departure from nucleate boiling, which could damage fuel.',
      displayMode: 'automatic',
      priority: 'warning',
    },
  ],
};
