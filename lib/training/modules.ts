/**
 * Training Modules - Organized curriculum structure
 * Groups scenarios into logical learning modules with completion tracking
 */

import type { TrainingScenario } from './types';

export enum ModuleId {
  BASICS = 'basics',
  SYSTEMS = 'systems',
  NORMAL_OPS = 'normal_ops',
  TRANSIENTS = 'transients',
  EMERGENCY = 'emergency',
}

export interface TrainingModule {
  id: ModuleId;
  name: string;
  description: string;
  order: number;
  color: string;
  scenarioIds: string[];
}

/**
 * Training Module Definitions
 */
export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: ModuleId.BASICS,
    name: 'Basics',
    description: 'Fundamental reactor physics and control principles',
    order: 1,
    color: '#00ffaa',
    scenarioIds: ['PWR_INTRO_01', 'PWR_BASICS_02'],
  },
  {
    id: ModuleId.SYSTEMS,
    name: 'Systems',
    description: 'Reactor systems and component operation',
    order: 2,
    color: '#00aaff',
    scenarioIds: ['PWR_SYSTEMS_01'],
  },
  {
    id: ModuleId.NORMAL_OPS,
    name: 'Normal Operations',
    description: 'Standard operational procedures and startup/shutdown',
    order: 3,
    color: '#00ff00',
    scenarioIds: ['PWR_STARTUP_01', 'PWR_NORMAL_02'],
  },
  {
    id: ModuleId.TRANSIENTS,
    name: 'Transient Conditions',
    description: 'Handling abnormal conditions and upsets',
    order: 4,
    color: '#ffaa00',
    scenarioIds: ['PWR_PUMP_TRIP_01', 'PWR_TRANSIENT_02'],
  },
  {
    id: ModuleId.EMERGENCY,
    name: 'Emergency',
    description: 'Emergency procedures and accident mitigation',
    order: 5,
    color: '#ff5555',
    scenarioIds: ['PWR_EMERGENCY_01'],
  },
];

/**
 * Module Completion Tracking
 */
export interface ModuleProgress {
  moduleId: ModuleId;
  completedScenarios: string[];
  totalScenarios: number;
  completionPercent: number;
  lastAttempt?: Date;
}

/**
 * Get module by ID
 */
export function getModuleById(id: ModuleId): TrainingModule | undefined {
  return TRAINING_MODULES.find((m) => m.id === id);
}

/**
 * Get module for a scenario
 */
export function getModuleForScenario(scenarioId: string): TrainingModule | undefined {
  return TRAINING_MODULES.find((m) => m.scenarioIds.includes(scenarioId));
}

/**
 * Calculate module progress
 */
export function calculateModuleProgress(
  moduleId: ModuleId,
  completedScenarioIds: string[]
): ModuleProgress {
  const module = getModuleById(moduleId);
  if (!module) {
    return {
      moduleId,
      completedScenarios: [],
      totalScenarios: 0,
      completionPercent: 0,
    };
  }

  const completedInModule = module.scenarioIds.filter((id) =>
    completedScenarioIds.includes(id)
  );

  const percent =
    module.scenarioIds.length > 0
      ? Math.round((completedInModule.length / module.scenarioIds.length) * 100)
      : 0;

  return {
    moduleId,
    completedScenarios: completedInModule,
    totalScenarios: module.scenarioIds.length,
    completionPercent: percent,
  };
}

/**
 * Get all module progress
 */
export function getAllModuleProgress(
  completedScenarioIds: string[]
): ModuleProgress[] {
  return TRAINING_MODULES.map((module) =>
    calculateModuleProgress(module.id, completedScenarioIds)
  );
}

/**
 * Storage key for completion tracking
 */
export const COMPLETION_STORAGE_KEY = 'u-force-training-completion';

/**
 * Load completion data from localStorage
 */
export function loadCompletionData(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(COMPLETION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load completion data:', error);
    return [];
  }
}

/**
 * Save completion data to localStorage
 */
export function saveCompletionData(completedScenarioIds: string[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(completedScenarioIds));
  } catch (error) {
    console.error('Failed to save completion data:', error);
  }
}

/**
 * Mark scenario as completed
 */
export function markScenarioCompleted(scenarioId: string): string[] {
  const completed = loadCompletionData();
  if (!completed.includes(scenarioId)) {
    completed.push(scenarioId);
    saveCompletionData(completed);
  }
  return completed;
}

/**
 * Reset all completion data
 */
export function resetCompletionData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(COMPLETION_STORAGE_KEY);
}
