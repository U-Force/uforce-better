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
import { selfRegulationScenario } from './scenarios/self-regulation';
import { boronControlScenario } from './scenarios/boron-control';
import { xenonDynamicsScenario } from './scenarios/xenon-dynamics';
import { powerAscensionScenario } from './scenarios/power-ascension';
import { rpsScenario } from './scenarios/rps-demonstration';
import type { TrainingScenario } from './types';

/**
 * Scenario Registry — 13 scenarios across 3-tier HRTD curriculum
 *
 * Tier 1 — Foundations (4 scenarios)
 * Tier 2 — Systems & Operations (5 scenarios)
 * Tier 3 — Protection & Emergency (4 scenarios)
 */
export const SCENARIOS: TrainingScenario[] = [
  // Tier 1 — Foundations
  introControlsScenario,
  reactivityBasicsScenario,
  selfRegulationScenario,
  boronControlScenario,
  // Tier 2 — Systems & Operations
  coolantSystemScenario,
  normalStartupScenario,
  powerManeuveringScenario,
  powerAscensionScenario,
  xenonDynamicsScenario,
  // Tier 3 — Protection & Emergency
  rpsScenario,
  pumpTripScenario,
  feedwaterLossScenario,
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
