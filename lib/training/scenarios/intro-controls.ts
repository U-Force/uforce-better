/**
 * Scenario: Introduction to Controls
 *
 * Learning objectives:
 * - Familiarize with control interface
 * - Practice adjusting control rods
 * - Understand power response without pressure
 */

import type { TrainingScenario } from '../types';
import { TrainingRole } from '../types';

export const introControlsScenario: TrainingScenario = {
  id: 'PWR_INTRO_01',
  name: 'Introduction to Reactor Controls',
  description:
    'Learn the basics of reactor controls in a safe, low-power environment. Practice rod manipulation and observe reactor response with minimal consequences.',
  difficulty: 1,
  estimatedDuration: 10,
  recommendedRole: TrainingRole.RO_TRAINEE,

  initialState: {
    reactorState: {
      t: 0,
      P: 0.001, // 0.1% power - very low
      Tf: 320,
      Tc: 310,
      C: [0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001],
      I135: 0,
      Xe135: 0,
    },
    controls: {
      rod: 0.15, // 15% - some rods withdrawn
      pumpOn: true,
      scram: false,
    },
    timeAcceleration: 1,
  },

  objectives: [
    {
      id: 'OBJ1_MOVE_RODS',
      description: 'Practice moving control rods between 10% and 30%',
      assessmentCriteria: [
        {
          metric: 'rodMovementCount',
          target: '>5',
          unit: 'movements',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ2_OBSERVE_POWER',
      description: 'Observe how power responds to rod changes',
      assessmentCriteria: [
        {
          metric: 'observationTime',
          target: '>60',
          unit: 'seconds',
          weight: 0.3,
        },
      ],
    },
    {
      id: 'OBJ3_STAY_SAFE',
      description: 'Keep power below 10% throughout the exercise',
      assessmentCriteria: [
        {
          metric: 'maxPower',
          target: '<10',
          unit: '%',
          weight: 0.4,
        },
      ],
    },
  ],

  completionConditions: {
    type: 'time_limit',
    parameters: {
      minTime: 120, // At least 2 minutes of practice
      maxPower: 0.1,
    },
  },

  failureConditions: [
    {
      type: 'limit_violation',
      parameters: {
        parameter: 'power',
        limit: 0.15,
      },
      description: 'Power exceeded 15% - too high for this exercise',
    },
  ],

  briefing: `SCENARIO BRIEFING: Introduction to Reactor Controls

INITIAL CONDITIONS:
• Reactor at very low power (~0.1%)
• All systems functional
• Control rods at 15% withdrawal
• Safe operating regime

YOUR MISSION:
Get comfortable with the basic controls without worrying about safety limits.

KEY PROCEDURES:
1. Observe the initial state - note power, temperatures, reactivity
2. Slowly move control rods up and down (stay between 10-30%)
3. Watch how power responds to your inputs
4. Notice the delay between rod movement and power change
5. Observe reactivity feedback from temperature changes

LEARNING POINTS:
• Control rods absorb neutrons - inserting them reduces power
• Power changes slowly due to delayed neutrons
• Temperature feedback provides natural stability
• Small changes are easier to control than large ones

This is a safe learning environment. Experiment freely!`,

  hints: [
    {
      triggerId: 'HINT_FIRST_MOVE',
      triggerCondition: 'time > 10 && rodMovementCount === 0',
      content:
        'ℹ️ Try moving the control rod slider! Drag it left or right to see how the reactor responds.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_WATCH_POWER',
      triggerCondition: 'rodMovementCount > 0',
      content:
        'ℹ️ Good! Now watch the REACTOR POWER display. Notice how it changes gradually after you move the rods.',
      displayMode: 'automatic',
      priority: 'info',
    },
    {
      triggerId: 'HINT_REACTIVITY',
      triggerCondition: 'rodMovementCount > 2',
      content:
        'ℹ️ Look at the REACTIVITY panel. Positive = power rising, Negative = power falling. This shows you what the reactor will do next!',
      displayMode: 'automatic',
      priority: 'info',
    },
  ],
};
