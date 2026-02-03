/**
 * Training System Type Definitions
 * Core types for scenario-based training, assessment, and role management
 */

import type { ReactorState, ControlInputs } from '../reactor';

// ============================================================================
// ROLES AND PERMISSIONS
// ============================================================================

export enum TrainingRole {
  RO_TRAINEE = 'ro_trainee',
  RO = 'ro',
  SRO = 'sro',
  MAINTENANCE = 'maintenance',
  FREE_PLAY = 'free_play', // Existing unrestricted mode
}

export interface RolePermissions {
  canControlRods: boolean;
  maxRodChangePercent: number | null; // null = unlimited
  canScram: boolean;
  canBypassTrips: boolean;
  canControlPump: boolean;
  requiresApproval: boolean;
  showHints: boolean;
  showProcedures: boolean;
}

// ============================================================================
// SCENARIOS
// ============================================================================

export interface TrainingScenario {
  id: string;
  name: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4;
  estimatedDuration: number; // minutes
  recommendedRole: TrainingRole;

  // Initial conditions
  initialState: {
    reactorState: ReactorState;
    controls: ControlInputs;
    timeAcceleration: number;
  };

  // Learning objectives
  objectives: ScenarioObjective[];

  // Events (optional perturbations)
  events?: ScenarioEvent[];

  // Success criteria
  completionConditions: CompletionCondition;
  failureConditions: FailureCondition[];

  // Educational content
  briefing: string;
  proceduralGuidance?: ProcedureStep[];
  hints?: ContextualHint[];
}

export interface ScenarioObjective {
  id: string;
  description: string;
  assessmentCriteria: AssessmentCriterion[];
}

export interface AssessmentCriterion {
  metric: string;
  target: string; // e.g., "<600", "18-22", "0"
  unit: string;
  weight: number; // 0-1, for scoring
}

export interface ScenarioEvent {
  triggerTime: number; // seconds from start
  type: 'pump_trip' | 'parameter_drift' | 'rod_drop' | 'alarm';
  parameters: Record<string, any>;
  description: string;
}

export interface CompletionCondition {
  type: 'time_limit' | 'state_reached' | 'manual_completion' | 'objectives_met';
  parameters: Record<string, any>;
}

export interface FailureCondition {
  type: 'trip' | 'limit_violation' | 'time_exceeded' | 'incorrect_action';
  parameters: Record<string, any>;
  description: string;
}

export interface ProcedureStep {
  step: number;
  instruction: string;
  expectedAction?: string;
  validationCriteria?: Record<string, any>;
  completed?: boolean;
}

export interface ContextualHint {
  triggerId: string;
  triggerCondition: string; // e.g., "power > 0.5", "coolantTemp > 600"
  content: string;
  displayMode: 'on_demand' | 'automatic';
  priority: 'info' | 'warning' | 'critical';
}

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

export interface PerformanceMetrics {
  sessionId: string;
  scenarioId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds

  // Procedural Compliance
  procedureStepsCompleted: number;
  procedureStepsSkipped: number;
  procedureStepsOutOfOrder: number;

  // Operational Proficiency
  timeToFirstAction: number; // seconds
  timeToCorrectiveAction: number; // for upset scenarios
  parameterDeviations: ParameterDeviation[];
  tripCount: number;
  scramCount: number;
  safetyLimitViolations: LimitViolation[];

  // Control Actions
  rodMovements: ControlAction[];
  pumpActions: ControlAction[];
  scramActions: ControlAction[];

  // Final State
  finalPower: number;
  finalFuelTemp: number;
  finalCoolantTemp: number;
  objectivesCompleted: string[]; // objective IDs

  // Overall Assessment
  success: boolean;
  score: number; // 0-100
  feedback: string[];
}

export interface ParameterDeviation {
  parameter: 'power' | 'fuelTemp' | 'coolantTemp' | 'reactivity';
  timestamp: number;
  value: number;
  deviation: number; // from target
  severity: 'minor' | 'moderate' | 'major';
}

export interface LimitViolation {
  parameter: string;
  timestamp: number;
  value: number;
  limit: number;
  duration: number; // seconds violated
}

export interface ControlAction {
  timestamp: number;
  action: string;
  fromValue: number;
  toValue: number;
  appropriate: boolean; // assessed post-scenario
}

// ============================================================================
// TRAINING SESSION
// ============================================================================

export interface TrainingSession {
  sessionId: string;
  userId?: string;
  scenario: TrainingScenario;
  role: TrainingRole;
  mode: 'training' | 'assessment';

  startTime: Date;
  endTime?: Date;

  currentState: 'briefing' | 'running' | 'paused' | 'completed' | 'failed';

  metrics: PerformanceMetrics;

  // Real-time tracking
  currentObjectiveIndex: number;
  eventsTriggered: string[];
  hintsDisplayed: string[];
}

// ============================================================================
// COMPETENCY TRACKING
// ============================================================================

export interface CompetencyRecord {
  userId: string;
  scenarios: ScenarioCompletion[];
  overallReadiness: {
    reactorOperator: 'trainee' | 'qualified' | 'maintain_proficiency';
    seniorOperator: 'not_ready' | 'in_training' | 'qualified';
  };
  lastUpdated: Date;
}

export interface ScenarioCompletion {
  scenarioId: string;
  attempts: number;
  bestScore: number;
  bestPerformance: PerformanceMetrics;
  certificationDate?: Date;
  recertificationDue?: Date;
  status: 'not_started' | 'in_progress' | 'passed' | 'failed';
}
