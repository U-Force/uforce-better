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

    // Check for safety limit violations
    if (state.P > 1.1) {
      this.recordLimitViolation('power', currentTime, state.P, 1.1);
      this.metrics.tripCount++;
    }
    if (state.Tf > 1800) {
      this.recordLimitViolation('fuelTemp', currentTime, state.Tf, 1800);
      this.metrics.tripCount++;
    }
    if (state.Tc > 620) {
      this.recordLimitViolation('coolantTemp', currentTime, state.Tc, 620);
      this.metrics.tripCount++;
    }

    this.lastState = state;
  }

  /**
   * Record a limit violation
   */
  private recordLimitViolation(
    parameter: string,
    timestamp: number,
    value: number,
    limit: number
  ): void {
    // Check if this is a continuation of an existing violation
    const existing = this.metrics.safetyLimitViolations.find(
      (v) => v.parameter === parameter && v.timestamp + v.duration > timestamp - 1
    );

    if (existing) {
      existing.duration = timestamp - existing.timestamp;
      existing.value = Math.max(existing.value, value);
    } else {
      this.metrics.safetyLimitViolations.push({
        parameter,
        timestamp,
        value,
        limit,
        duration: 0,
      });
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
    this.metrics.endTime = new Date();
    this.metrics.duration = (Date.now() - this.sessionStartTime) / 1000;

    this.metrics.finalPower = finalState.P;
    this.metrics.finalFuelTemp = finalState.Tf;
    this.metrics.finalCoolantTemp = finalState.Tc;

    // Calculate success
    this.metrics.success = this.evaluateSuccess(scenario);

    // Calculate score
    this.metrics.score = this.calculateScore(scenario);

    // Generate feedback
    this.metrics.feedback = this.generateFeedback(scenario);

    return this.metrics;
  }

  /**
   * Evaluate if scenario objectives were met
   */
  private evaluateSuccess(scenario: TrainingScenario): boolean {
    // Check failure conditions first
    if (this.metrics.tripCount > 0) return false;
    if (this.metrics.safetyLimitViolations.length > 0) return false;

    // Check if all objectives are completed
    const allObjectivesCompleted = scenario.objectives.every(obj =>
      this.metrics.objectivesCompleted.includes(obj.id)
    );
    if (!allObjectivesCompleted) return false;

    // Check completion conditions
    const conditions = scenario.completionConditions;

    if (conditions.type === 'state_reached') {
      const params = conditions.parameters;

      if (params.powerMin !== undefined && this.metrics.finalPower < params.powerMin) {
        return false;
      }
      if (params.powerMax !== undefined && this.metrics.finalPower > params.powerMax) {
        return false;
      }
      if (
        params.maxCoolantTemp !== undefined &&
        this.metrics.finalCoolantTemp > params.maxCoolantTemp
      ) {
        return false;
      }
    }

    // All checks passed
    return true;
  }

  /**
   * Calculate overall performance score (0-100)
   */
  private calculateScore(scenario: TrainingScenario): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const objective of scenario.objectives) {
      for (const criterion of objective.assessmentCriteria) {
        const criterionScore = this.evaluateCriterion(criterion);
        totalScore += criterionScore * criterion.weight;
        totalWeight += criterion.weight;
      }
    }

    // Normalize to 0-100
    const normalizedScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

    // Apply penalties
    let penaltyScore = normalizedScore;
    penaltyScore -= this.metrics.tripCount * 20; // -20 per trip
    penaltyScore -= this.metrics.safetyLimitViolations.length * 15; // -15 per violation
    penaltyScore -= this.metrics.procedureStepsSkipped * 5; // -5 per skipped step

    return Math.max(0, Math.min(100, penaltyScore));
  }

  /**
   * Evaluate a single assessment criterion
   */
  private evaluateCriterion(criterion: AssessmentCriterion): number {
    const value = this.getMetricValue(criterion.metric);
    const target = criterion.target;

    // Parse target (e.g., "<600", "18-22", "0")
    if (target.startsWith('<')) {
      const threshold = parseFloat(target.substring(1));
      return value < threshold ? 1 : 0;
    } else if (target.startsWith('>')) {
      const threshold = parseFloat(target.substring(1));
      return value > threshold ? 1 : 0;
    } else if (target.includes('-')) {
      const [min, max] = target.split('-').map(parseFloat);
      return value >= min && value <= max ? 1 : 0;
    } else {
      const exact = parseFloat(target);
      return value === exact ? 1 : 0;
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
        // Calculate average withdrawal rate
        const withdrawals = this.metrics.rodMovements.filter(m => m.action === 'withdraw');
        if (withdrawals.length === 0) return 0;
        const totalWithdrawal = withdrawals.reduce((sum, m) => sum + Math.abs(m.toValue - m.fromValue), 0);
        const totalTime = this.metrics.duration / 60; // Convert to minutes
        return totalTime > 0 ? (totalWithdrawal * 100) / totalTime : 0; // %/minute
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
      feedback.push('✗ Scenario objectives not met');
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
      feedback.push('⚠ Slow initial response time - consider acting more quickly');
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
