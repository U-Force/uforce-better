/**
 * Training Modules - HRTD-Based 3-Tier Curriculum
 *
 * Organized from the USNRC HRTD (Human Resources Training Division) PWR
 * training documents into three progressive tiers:
 *   Tier 1 — Foundations (Novice)
 *   Tier 2 — Systems & Operations (Intermediate)
 *   Tier 3 — Protection & Emergency (Operator-Ready)
 *
 * Each module groups related scenarios with completion tracking.
 */

export enum ModuleId {
  // Tier 1 — Foundations
  FUNDAMENTALS = 'fundamentals',
  FEEDBACK = 'feedback',
  REACTIVITY_CONTROL = 'reactivity_control',
  // Tier 2 — Systems & Operations
  THERMAL_HYDRAULICS = 'thermal_hydraulics',
  NORMAL_OPS = 'normal_ops',
  XENON_KINETICS = 'xenon_kinetics',
  // Tier 3 — Protection & Emergency
  PROTECTION = 'protection',
  TRANSIENTS = 'transients',
  EMERGENCY = 'emergency',
}

export type Tier = 1 | 2 | 3;

export interface TrainingModule {
  id: ModuleId;
  name: string;
  description: string;
  tier: Tier;
  order: number;
  color: string;
  scenarioIds: string[];
  hrtdSources: string[];
}

/**
 * Tier display metadata
 */
export const TIER_INFO: Record<Tier, { name: string; label: string; color: string }> = {
  1: { name: 'Foundations', label: 'Novice', color: '#00ffaa' },
  2: { name: 'Systems & Operations', label: 'Intermediate', color: '#00aaff' },
  3: { name: 'Protection & Emergency', label: 'Operator-Ready', color: '#ff6644' },
};

/**
 * Training Module Definitions — 3-Tier HRTD Curriculum
 */
export const TRAINING_MODULES: TrainingModule[] = [
  // ═══════════════════════════════════════════════════════════════
  // TIER 1 — FOUNDATIONS (Novice)
  // ═══════════════════════════════════════════════════════════════
  {
    id: ModuleId.FUNDAMENTALS,
    name: 'PWR Fundamentals',
    description: 'What is a nuclear power plant? Learn basic controls, see how reactivity drives power.',
    tier: 1,
    order: 1,
    color: '#00ffaa',
    scenarioIds: ['PWR_INTRO_01', 'PWR_BASICS_02'],
    hrtdSources: ['PWR Overview (Ch. 1)', 'I&C Overview (Ch. 2)'],
  },
  {
    id: ModuleId.FEEDBACK,
    name: 'Self-Regulation & Feedback',
    description: 'Discover how Doppler and moderator temperature feedback make the reactor inherently stable.',
    tier: 1,
    order: 2,
    color: '#33ffbb',
    scenarioIds: ['PWR_FEEDBACK_01'],
    hrtdSources: ['Reactor Physics (Ch. 3)', 'PWR Overview (Ch. 1)'],
  },
  {
    id: ModuleId.REACTIVITY_CONTROL,
    name: 'Reactivity Control: Rods & Boron',
    description: 'Master the two primary reactivity control mechanisms: mechanical (rods) and chemical (boron).',
    tier: 1,
    order: 3,
    color: '#66ffcc',
    scenarioIds: ['PWR_BORON_01'],
    hrtdSources: ['Rod Control (Ch. 8)', 'Plant Operations (Ch. 15)'],
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 2 — SYSTEMS & OPERATIONS (Intermediate)
  // ═══════════════════════════════════════════════════════════════
  {
    id: ModuleId.THERMAL_HYDRAULICS,
    name: 'Thermal-Hydraulics',
    description: 'Understand coolant flow, heat removal, and the relationship between power and temperature.',
    tier: 2,
    order: 4,
    color: '#00aaff',
    scenarioIds: ['PWR_SYSTEMS_01'],
    hrtdSources: ['RCS (Ch. 4)', 'Condensate & Feedwater (Ch. 7)'],
  },
  {
    id: ModuleId.NORMAL_OPS,
    name: 'Normal Operations',
    description: 'Startup from cold shutdown, power maneuvering, and full power ascension.',
    tier: 2,
    order: 5,
    color: '#33bbff',
    scenarioIds: ['PWR_STARTUP_01', 'PWR_NORMAL_02', 'PWR_ASCENSION_01'],
    hrtdSources: ['Plant Operations (Ch. 15)', 'Rod Control (Ch. 8)', 'SG Level Control (Ch. 12)'],
  },
  {
    id: ModuleId.XENON_KINETICS,
    name: 'Xenon & Core Physics',
    description: 'Confront the most challenging operational physics: xenon poisoning and the iodine pit.',
    tier: 2,
    order: 6,
    color: '#66ccff',
    scenarioIds: ['PWR_XENON_01'],
    hrtdSources: ['Reactor Physics (Ch. 3)', 'Plant Operations (Ch. 15)'],
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 3 — PROTECTION & EMERGENCY (Operator-Ready)
  // ═══════════════════════════════════════════════════════════════
  {
    id: ModuleId.PROTECTION,
    name: 'Reactor Protection System',
    description: 'Explore the automatic safety net: trip setpoints, SCRAM response, and defense-in-depth.',
    tier: 3,
    order: 7,
    color: '#ff9944',
    scenarioIds: ['PWR_RPS_01'],
    hrtdSources: ['RPS (Ch. 13)', 'Trip Signals (Ch. 14)'],
  },
  {
    id: ModuleId.TRANSIENTS,
    name: 'Transient Response',
    description: 'Handle abnormal conditions: pump trips, feedwater loss, and equipment failures.',
    tier: 3,
    order: 8,
    color: '#ff6644',
    scenarioIds: ['PWR_PUMP_TRIP_01', 'PWR_TRANSIENT_02'],
    hrtdSources: ['ESF (Ch. 5)', 'ECCS (Ch. 6)', 'Condensate & Feedwater (Ch. 7)'],
  },
  {
    id: ModuleId.EMERGENCY,
    name: 'Emergency Operations',
    description: 'The ultimate test: LOCA response, core damage prevention, and emergency procedures.',
    tier: 3,
    order: 9,
    color: '#ff4433',
    scenarioIds: ['PWR_EMERGENCY_01'],
    hrtdSources: ['ESF (Ch. 5)', 'ECCS (Ch. 6)', 'RPS (Ch. 13)'],
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
 * Get modules by tier
 */
export function getModulesByTier(tier: Tier): TrainingModule[] {
  return TRAINING_MODULES.filter((m) => m.tier === tier).sort((a, b) => a.order - b.order);
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
 * Calculate tier progress (all modules in a tier)
 */
export function getTierProgress(
  tier: Tier,
  completedScenarioIds: string[]
): { completed: number; total: number; percent: number } {
  const modules = getModulesByTier(tier);
  const total = modules.reduce((sum, m) => sum + m.scenarioIds.length, 0);
  const completed = modules.reduce(
    (sum, m) => sum + m.scenarioIds.filter((id) => completedScenarioIds.includes(id)).length,
    0
  );
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
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
