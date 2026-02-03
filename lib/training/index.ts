/**
 * Training System - Main Exports
 */

// Types
export * from './types';

// Roles
export * from './roles';

// Metrics
export { MetricsCollector } from './metrics';

// Scenarios
import { normalStartupScenario } from './scenarios/startup';
import { pumpTripScenario } from './scenarios/pump-trip';
import type { TrainingScenario } from './types';

/**
 * Scenario Registry
 * All available training scenarios
 */
export const SCENARIOS: TrainingScenario[] = [
  normalStartupScenario,
  pumpTripScenario,
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
