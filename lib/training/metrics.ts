/**
 * Performance Metrics Collection and Assessment
 */

import type {
  PerformanceMetrics,
  ControlAction,
  ParameterDeviation,
  LimitViolation,
  TrainingScenario,
  AssessmentCriterion,
} from './types';
import type { ReactorState } from '../reactor';

export class MetricsCollector {
  private metrics: PerformanceMetrics;
  private lastState: ReactorState | null = null;
  private lastRodPosition: number = 0;
  private lastPumpState: boolean = true;
  private sessionStartTime: number = 0;
  private powerChangeCount: number = 0;
  private lastPower: number = 0;
  private maxFuelTemp: number = 0;
  private maxCoolantTemp: number = 0;
  private timeAt50Percent: number = 0; // Accumulated time spent at 45-55% power
  private maxPowerRate: number = 0; // Maximum power change rate in %/min
  private lastPowerRateCheckTime: number = 0;
  private lastPowerForRate: number = 0;
  private finalized: boolean = false;

  constructor(scenarioId: string, sessionId: string = crypto.randomUUID()) {
    this.metrics = {
      sessionId,
      scenarioId,
      startTime: new Date(),
      duration: 0,

      procedureStepsCompleted: 0,
      procedureStepsSkipped: 0,
      procedureStepsOutOfOrder: 0,

      timeToFirstAction: 0,
      timeToCorrectiveAction: 0,
      parameterDeviations: [],
      tripCount: 0,
      scramCount: 0,
      safetyLimitViolations: [],

      rodMovements: [],
      pumpActions: [],
      scramActions: [],

      finalPower: 0,
      finalFuelTemp: 0,
      finalCoolantTemp: 0,
      objectivesCompleted: [],

      success: false,
      score: 0,
      feedback: [],
    };

    this.sessionStartTime = Date.now();
  }

  /**
   * Record a state update from the simulator
   */
  recordState(state: ReactorState, rod: number, pumpOn: boolean, scram: boolean): void {
    const currentTime = (Date.now() - this.sessionStartTime) / 1000;

    // Track power changes (significant changes > 5%)
    const currentPowerPercent = state.P * 100;
    if (Math.abs(currentPowerPercent - this.lastPower) > 5) {
      this.powerChangeCount++;
      this.lastPower = currentPowerPercent;
    }

    // Track max temperatures
    this.maxFuelTemp = Math.max(this.maxFuelTemp, state.Tf);
    this.maxCoolantTemp = Math.max(this.maxCoolantTemp, state.Tc);

    // Track time at 50% power (45-55% range)
    if (this.lastState) {
      const dt = state.t - this.lastState.t;
      if (currentPowerPercent >= 45 && currentPowerPercent <= 55) {
        this.timeAt50Percent += dt;
      }
    }

    // Track power rate (check every second to avoid excessive calculations)
    if (currentTime - this.lastPowerRateCheckTime >= 1.0) {
      const timeDeltaMin = (currentTime - this.lastPowerRateCheckTime) / 60;
      if (timeDeltaMin > 0) {
        const powerRate = Math.abs(currentPowerPercent - this.lastPowerForRate) / timeDeltaMin;
        this.maxPowerRate = Math.max(this.maxPowerRate, powerRate);
        this.lastPowerForRate = currentPowerPercent;
        this.lastPowerRateCheckTime = currentTime;
      }
    }

    // Initialize on first call
    if (this.lastPowerRateCheckTime === 0) {
      this.lastPowerRateCheckTime = currentTime;
      this.lastPowerForRate = currentPowerPercent;
    }

    // Record rod movements
    if (this.lastRodPosition !== rod) {
      this.metrics.rodMovements.push({
        timestamp: currentTime,
        action: rod > this.lastRodPosition ? 'withdraw' : 'insert',
        fromValue: this.lastRodPosition,
        toValue: rod,
        appropriate: true, // Assessed later
      });

      if (this.metrics.timeToFirstAction === 0) {
        this.metrics.timeToFirstAction = currentTime;
      }

      this.lastRodPosition = rod;
    }

    // Record pump actions
    if (this.lastPumpState !== pumpOn) {
      this.metrics.pumpActions.push({
        timestamp: currentTime,
        action: pumpOn ? 'start' : 'stop',
        fromValue: this.lastPumpState ? 1 : 0,
        toValue: pumpOn ? 1 : 0,
        appropriate: true,
      });

      this.lastPumpState = pumpOn;
    }

    // Record SCRAM
    if (scram && this.lastState && !this.metrics.scramActions.length) {
      this.metrics.scramCount++;
      this.metrics.scramActions.push({
        timestamp: currentTime,
        action: 'scram',
        fromValue: 0,
        toValue: 1,
        appropriate: true,
      });
    }

    // Check for safety limit violations (only count NEW violation episodes, not every tick)
    if (state.P > 1.1) {
      const isNew = this.recordLimitViolation('power', currentTime, state.P, 1.1);
      if (isNew) this.metrics.tripCount++;
    }
    if (state.Tf > 1800) {
      const isNew = this.recordLimitViolation('fuelTemp', currentTime, state.Tf, 1800);
      if (isNew) this.metrics.tripCount++;
    }
    if (state.Tc > 620) {
      const isNew = this.recordLimitViolation('coolantTemp', currentTime, state.Tc, 620);
      if (isNew) this.metrics.tripCount++;
    }

    this.lastState = state;
  }

  /**
   * Record a limit violation. Returns true if this is a NEW violation episode.
   */
  private recordLimitViolation(
    parameter: string,
    timestamp: number,
    value: number,
    limit: number
  ): boolean {
    // Check if this is a continuation of an existing violation
    const existing = this.metrics.safetyLimitViolations.find(
      (v) => v.parameter === parameter && v.timestamp + v.duration > timestamp - 1
    );

    if (existing) {
      existing.duration = timestamp - existing.timestamp;
      existing.value = Math.max(existing.value, value);
      return false; // Continuation, not new
    } else {
      this.metrics.safetyLimitViolations.push({
        parameter,
        timestamp,
        value,
        limit,
        duration: 0,
      });
      return true; // New violation
    }
  }

  /**
   * Record parameter deviation from target
   */
  recordDeviation(
    parameter: 'power' | 'fuelTemp' | 'coolantTemp' | 'reactivity',
    value: number,
    target: number,
    severity: 'minor' | 'moderate' | 'major'
  ): void {
    const currentTime = (Date.now() - this.sessionStartTime) / 1000;

    this.metrics.parameterDeviations.push({
      parameter,
      timestamp: currentTime,
      value,
      deviation: value - target,
      severity,
    });
  }

  /**
   * Record procedure step completion
   */
  recordProcedureStep(completed: boolean, outOfOrder: boolean = false): void {
    if (completed) {
      this.metrics.procedureStepsCompleted++;
    } else {
      this.metrics.procedureStepsSkipped++;
    }

    if (outOfOrder) {
      this.metrics.procedureStepsOutOfOrder++;
    }
  }

  /**
   * Mark an objective as completed
   */
  completeObjective(objectiveId: string): void {
    if (!this.metrics.objectivesCompleted.includes(objectiveId)) {
      this.metrics.objectivesCompleted.push(objectiveId);
    }
  }

  /**
   * Finalize metrics and calculate score
   */
  finalize(finalState: ReactorState, scenario: TrainingScenario): PerformanceMetrics {
    // Guard against double finalize
    if (this.finalized) return this.metrics;
    this.finalized = true;

    this.metrics.endTime = new Date();
    this.metrics.duration = (Date.now() - this.sessionStartTime) / 1000;

    this.metrics.finalPower = finalState.P;
    this.metrics.finalFuelTemp = finalState.Tf;
    this.metrics.finalCoolantTemp = finalState.Tc;

    // Auto-evaluate objectives using graduated scoring
    // This ensures objectives are marked complete even if LiveCheckpointPanel
    // didn't call completeObjective (e.g. due to strict real-time evaluation)
    this.autoEvaluateObjectives(scenario);

    // Calculate success
    this.metrics.success = this.evaluateSuccess(scenario);

    // Calculate score
    this.metrics.score = this.calculateScore(scenario);

    // Generate feedback
    this.metrics.feedback = this.generateFeedback(scenario);

    return this.metrics;
  }

  /**
   * Auto-evaluate objectives using the collector's own graduated scoring.
   * Marks objectives as completed if their criteria score well enough.
   */
  private autoEvaluateObjectives(scenario: TrainingScenario): void {
    for (const objective of scenario.objectives) {
      // Skip if already marked completed by LiveCheckpointPanel
      if (this.metrics.objectivesCompleted.includes(objective.id)) continue;

      // Evaluate each criterion with graduated scoring
      let totalScore = 0;
      let totalWeight = 0;
      for (const criterion of objective.assessmentCriteria) {
        const score = this.evaluateCriterion(criterion);
        totalScore += score * criterion.weight;
        totalWeight += criterion.weight;
      }

      // Mark objective as completed if weighted average score >= 0.5
      const avgScore = totalWeight > 0 ? totalScore / totalWeight : 0;
      if (avgScore >= 0.5) {
        this.metrics.objectivesCompleted.push(objective.id);
      }
    }
  }

  /**
   * Evaluate if scenario objectives were met
   */
  private evaluateSuccess(scenario: TrainingScenario): boolean {
    // Hard failure: safety limit violations
    if (this.metrics.safetyLimitViolations.length > 0) return false;

    // Hard failure: reactor trips (actual new violation episodes, not spurious)
    if (this.metrics.tripCount > 0) return false;

    // Check if all objectives are completed (using auto-evaluated results)
    const allObjectivesCompleted = scenario.objectives.every(obj =>
      this.metrics.objectivesCompleted.includes(obj.id)
    );

    // Success if all objectives met. Completion conditions contribute to score
    // but don't block success — the objectives already capture the important criteria.
    return allObjectivesCompleted;
  }

  /**
   * Calculate overall performance score (0-100)
   *
   * Scoring breakdown:
   *   - Objective completion: up to 70 points (primary driver)
   *   - Safety record:       up to 20 points (no trips/violations)
   *   - Criteria quality:    up to 10 points (refinement bonus)
   *   - Penalties deducted from total
   */
  private calculateScore(scenario: TrainingScenario): number {
    // 1. Objective completion — 70 points
    const totalObjectives = scenario.objectives.length;
    const completedCount = this.metrics.objectivesCompleted.length;
    const objectivePoints = totalObjectives > 0
      ? (completedCount / totalObjectives) * 70
      : 70;

    // 2. Safety record — 20 points (lose points for trips/violations)
    let safetyPoints = 20;
    safetyPoints -= this.metrics.tripCount * 10;
    safetyPoints -= this.metrics.safetyLimitViolations.length * 7;
    safetyPoints = Math.max(0, safetyPoints);

    // 3. Criteria quality bonus — 10 points
    let criteriaScore = 0;
    let criteriaWeight = 0;
    for (const objective of scenario.objectives) {
      for (const criterion of objective.assessmentCriteria) {
        const score = this.evaluateCriterion(criterion);
        criteriaScore += score * criterion.weight;
        criteriaWeight += criterion.weight;
      }
    }
    const criteriaPoints = criteriaWeight > 0
      ? (criteriaScore / criteriaWeight) * 10
      : 10;

    // 4. Procedure penalties
    const procedurePenalty = this.metrics.procedureStepsSkipped * 3;

    const total = objectivePoints + safetyPoints + criteriaPoints - procedurePenalty;
    return Math.max(0, Math.min(100, Math.round(total)));
  }

  /**
   * Evaluate a single assessment criterion with graduated scoring.
   * Returns 0-1 where 1 is perfect and partial credit is given for near-misses.
   */
  private evaluateCriterion(criterion: AssessmentCriterion): number {
    const value = this.getMetricValue(criterion.metric);
    const target = criterion.target;

    if (target.startsWith('<')) {
      const threshold = parseFloat(target.substring(1));
      if (value < threshold) return 1;
      // Graduated: lose points proportionally up to 2x the threshold
      const overshoot = (value - threshold) / threshold;
      return Math.max(0, 1 - overshoot);
    } else if (target.startsWith('>')) {
      const threshold = parseFloat(target.substring(1));
      if (value > threshold) return 1;
      if (threshold === 0) return value > 0 ? 1 : 0;
      const undershoot = (threshold - value) / threshold;
      return Math.max(0, 1 - undershoot);
    } else if (target.includes('-')) {
      const [min, max] = target.split('-').map(parseFloat);
      if (value >= min && value <= max) return 1;
      const range = max - min;
      const margin = range > 0 ? range : 1;
      if (value < min) return Math.max(0, 1 - (min - value) / margin);
      return Math.max(0, 1 - (value - max) / margin);
    } else {
      const exact = parseFloat(target);
      if (value === exact) return 1;
      // For exact match targets (like tripsOccurred = 0), penalize per unit
      if (exact === 0) return Math.max(0, 1 - value * 0.5);
      const deviation = Math.abs(value - exact) / Math.max(Math.abs(exact), 1);
      return Math.max(0, 1 - deviation);
    }
  }

  /**
   * Get metric value by name
   */
  private getMetricValue(metricName: string): number {
    switch (metricName) {
      case 'finalPower':
        return this.metrics.finalPower * 100; // Convert to percentage
      case 'maxCoolantTemp':
        return this.maxCoolantTemp;
      case 'tripsOccurred':
        return this.metrics.tripCount;
      case 'timeToFirstAction':
        return this.metrics.timeToFirstAction;
      case 'timeToScram':
        return this.metrics.scramActions.length > 0 ? this.metrics.scramActions[0].timestamp : 999;
      case 'maxFuelTemp':
        return this.maxFuelTemp;
      case 'powerChangeCount':
        return this.powerChangeCount;
      case 'observationTime':
        return this.metrics.duration;
      case 'timeToFirstCriticality':
        return this.metrics.timeToFirstAction; // Approximate
      case 'timeAt50Percent':
        return this.timeAt50Percent;
      case 'maxPowerRate':
        return this.maxPowerRate;
      case 'rodWithdrawalRate':
        // Calculate net withdrawal rate (first position → last position) over time
        // This avoids penalizing many small slider adjustments
        const allMoves = this.metrics.rodMovements;
        if (allMoves.length === 0) return 0;
        const firstPos = allMoves[0].fromValue;
        const lastPos = allMoves[allMoves.length - 1].toValue;
        const netWithdrawal = Math.max(0, lastPos - firstPos); // Only positive = withdrawal
        const elapsedMinutes = this.metrics.duration / 60;
        return elapsedMinutes > 0 ? (netWithdrawal * 100) / elapsedMinutes : 0; // %/minute
      default:
        return 0;
    }
  }

  /**
   * Generate feedback messages
   */
  private generateFeedback(scenario: TrainingScenario): string[] {
    const feedback: string[] = [];

    if (this.metrics.success) {
      feedback.push('✓ Scenario completed successfully');
    } else {
      // Give specific failure reasons
      if (this.metrics.safetyLimitViolations.length > 0) {
        feedback.push('✗ Failed due to safety limit violation(s)');
      } else if (this.metrics.tripCount > 0) {
        feedback.push('✗ Failed due to automatic reactor trip(s)');
      } else {
        // Check which objectives weren't met
        const failed = scenario.objectives.filter(
          obj => !this.metrics.objectivesCompleted.includes(obj.id)
        );
        if (failed.length > 0) {
          feedback.push(`✗ ${failed.length} objective(s) not fully met`);
        } else {
          feedback.push('✗ Scenario not passed');
        }
      }
    }

    if (this.metrics.tripCount > 0) {
      feedback.push(`⚠ ${this.metrics.tripCount} automatic reactor trip(s) occurred`);
    }

    if (this.metrics.safetyLimitViolations.length > 0) {
      feedback.push(`⚠ ${this.metrics.safetyLimitViolations.length} safety limit violation(s)`);
    }

    if (this.metrics.procedureStepsSkipped > 0) {
      feedback.push(`⚠ ${this.metrics.procedureStepsSkipped} procedure step(s) skipped`);
    }

    if (this.metrics.timeToFirstAction > 30) {
      feedback.push('⚠ Slow initial response time — consider acting more quickly');
    }

    // Objective-specific feedback
    for (const objective of scenario.objectives) {
      const completed = this.metrics.objectivesCompleted.includes(objective.id);
      feedback.push(`${completed ? '✓' : '✗'} ${objective.description}`);
    }

    return feedback;
  }

  /**
   * Get current metrics (for real-time display)
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get live metric values for real-time objective evaluation
   */
  getLiveMetricValue(metricName: string): number {
    return this.getMetricValue(metricName);
  }
}
