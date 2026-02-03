/**
 * Training System - Main Exports
 */

// Types
export * from './types';

// Roles
export * from './roles';

// Metrics
export { MetricsCollector } from './metrics';

// Modules
export * from './modules';

// Scenarios
import { normalStartupScenario } from './scenarios/startup';
import { pumpTripScenario } from './scenarios/pump-trip';
import { introControlsScenario } from './scenarios/intro-controls';
import { reactivityBasicsScenario } from './scenarios/reactivity-basics';
import { coolantSystemScenario } from './scenarios/coolant-system';
import { powerManeuveringScenario } from './scenarios/power-maneuvering';
import { feedwaterLossScenario } from './scenarios/feedwater-loss';
import { locaScenario } from './scenarios/loca';
import type { TrainingScenario } from './types';

/**
 * Scenario Registry
 * All available training scenarios
 */
export const SCENARIOS: TrainingScenario[] = [
  // Basics
  introControlsScenario,
  reactivityBasicsScenario,
  // Systems
  coolantSystemScenario,
  // Normal Operations
  normalStartupScenario,
  powerManeuveringScenario,
  // Transients
  pumpTripScenario,
  feedwaterLossScenario,
  // Emergency
  locaScenario,
];

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): TrainingScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/**
 * Get scenarios by difficulty level
 */
export function getScenariosByDifficulty(difficulty: 1 | 2 | 3 | 4): TrainingScenario[] {
  return SCENARIOS.filter((s) => s.difficulty === difficulty);
}

/**
 * Get scenarios by role
 */
export function getScenariosByRole(role: string): TrainingScenario[] {
  return SCENARIOS.filter((s) => s.recommendedRole === role);
}
