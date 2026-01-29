/**
 * benchmarks.ts - Benchmark scenarios for the reactor model
 * 
 * Provides standard test scenarios that exercise different aspects of the
 * reactor model. These can be used for validation, testing, and generating
 * time series data for visualization.
 */

import {
  ReactorModel,
  createSteadyState,
  createCriticalSteadyState,
} from './model';

import type {
  ReactorState,
  ControlInputs,
  SimulationRecord,
  BenchmarkResult,
} from './types';

import { DEFAULT_PARAMS, type ReactorParams } from './params';

// ============================================================================
// BENCHMARK SCENARIOS
// ============================================================================

/**
 * Scenario 1: Steady-state hold
 * 
 * Starts at criticality with P=1.0, rod at critical position, pump on.
 * Verifies that the reactor remains stable for 30+ seconds.
 * 
 * Expected behavior:
 * - Power should remain close to 1.0 (±1%)
 * - Temperatures should remain bounded
 * - No significant drift
 */
export function runSteadyHold(
  duration: number = 60,
  dt: number = 0.05,
  params: ReactorParams = DEFAULT_PARAMS
): BenchmarkResult {
  const { state, rodPosition } = createCriticalSteadyState(1.0, params, true);
  const model = new ReactorModel(state, params);
  
  const controls: ControlInputs = {
    rod: rodPosition,
    pumpOn: true,
    scram: false,
  };
  
  const timeSeries = model.run(duration, dt, controls, 0.5);
  
  return {
    name: 'Steady Hold',
    duration,
    dt,
    timeSeries,
    metrics: computeMetrics(timeSeries),
  };
}

/**
 * Scenario 2: Rod insertion (step decrease)
 * 
 * Starts at criticality, then steps rod down by a fixed amount.
 * Tests the reactor's response to negative reactivity insertion.
 * 
 * Expected behavior:
 * - Power should decrease following point kinetics
 * - Initial rapid drop (prompt jump), then slower decay
 * - Temperatures should decrease following power
 */
export function runRodInsertion(
  rodStepSize: number = 0.1,
  duration: number = 60,
  dt: number = 0.05,
  params: ReactorParams = DEFAULT_PARAMS
): BenchmarkResult {
  const { state, rodPosition } = createCriticalSteadyState(1.0, params, true);
  const model = new ReactorModel(state, params);
  
  const stepTime = 5; // Step rod at t=5s
  const newRodPosition = Math.max(0, rodPosition - rodStepSize);
  
  const controls = (t: number): ControlInputs => ({
    rod: t < stepTime ? rodPosition : newRodPosition,
    pumpOn: true,
    scram: false,
  });
  
  const timeSeries = model.run(duration, dt, controls, 0.5);
  
  return {
    name: `Rod Insertion (step=${rodStepSize.toFixed(2)})`,
    duration,
    dt,
    timeSeries,
    metrics: computeMetrics(timeSeries),
  };
}

/**
 * Scenario 3: Rod withdrawal (step increase)
 * 
 * Starts at criticality, then steps rod up by a fixed amount.
 * Tests the reactor's response to positive reactivity insertion.
 * 
 * Expected behavior:
 * - Power should increase following point kinetics
 * - Limited by negative temperature feedback
 * - New equilibrium at higher power/temperature
 */
export function runRodWithdrawal(
  rodStepSize: number = 0.05,
  duration: number = 60,
  dt: number = 0.05,
  params: ReactorParams = DEFAULT_PARAMS
): BenchmarkResult {
  const { state, rodPosition } = createCriticalSteadyState(1.0, params, true);
  const model = new ReactorModel(state, params);
  
  const stepTime = 5; // Step rod at t=5s
  const newRodPosition = Math.min(1, rodPosition + rodStepSize);
  
  const controls = (t: number): ControlInputs => ({
    rod: t < stepTime ? rodPosition : newRodPosition,
    pumpOn: true,
    scram: false,
  });
  
  const timeSeries = model.run(duration, dt, controls, 0.5);
  
  return {
    name: `Rod Withdrawal (step=${rodStepSize.toFixed(2)})`,
    duration,
    dt,
    timeSeries,
    metrics: computeMetrics(timeSeries),
  };
}

/**
 * Scenario 4: Scram (emergency shutdown)
 * 
 * Starts at criticality, then initiates a scram at t=5s.
 * Tests the emergency shutdown response.
 * 
 * Expected behavior:
 * - Rapid power decrease (prompt drop)
 * - Power should reach <20% within a few seconds
 * - Slower tail from delayed neutron decay
 * - Power should approach decay heat levels
 */
export function runScram(
  duration: number = 60,
  dt: number = 0.05,
  params: ReactorParams = DEFAULT_PARAMS
): BenchmarkResult {
  const { state, rodPosition } = createCriticalSteadyState(1.0, params, true);
  const model = new ReactorModel(state, params);
  
  const scramTime = 5; // Scram at t=5s
  
  const controls = (t: number): ControlInputs => ({
    rod: rodPosition, // Rod position doesn't matter during scram
    pumpOn: true,
    scram: t >= scramTime,
  });
  
  const timeSeries = model.run(duration, dt, controls, 0.2);
  
  return {
    name: 'Scram',
    duration,
    dt,
    timeSeries,
    metrics: computeMetrics(timeSeries),
  };
}

/**
 * Scenario 5: Pump trip (loss of forced flow)
 * 
 * Starts at criticality with pump on, then trips pump.
 * Tests the thermal response to reduced heat removal.
 * 
 * Expected behavior:
 * - Coolant temperature should rise
 * - Negative moderator feedback reduces power
 * - New equilibrium at lower power (self-regulating)
 */
export function runPumpTrip(
  duration: number = 120,
  dt: number = 0.05,
  params: ReactorParams = DEFAULT_PARAMS
): BenchmarkResult {
  const { state, rodPosition } = createCriticalSteadyState(1.0, params, true);
  const model = new ReactorModel(state, params);
  
  const tripTime = 10; // Trip pump at t=10s
  
  const controls = (t: number): ControlInputs => ({
    rod: rodPosition,
    pumpOn: t < tripTime,
    scram: false,
  });
  
  const timeSeries = model.run(duration, dt, controls, 1.0);
  
  return {
    name: 'Pump Trip',
    duration,
    dt,
    timeSeries,
    metrics: computeMetrics(timeSeries),
  };
}

/**
 * Scenario 6: Rod ramp (gradual change)
 * 
 * Gradually withdraws the rod over time.
 * Tests quasi-static response to slow reactivity changes.
 * 
 * Expected behavior:
 * - Power gradually increases
 * - Temperature feedback limits rate of rise
 * - Approximately follows quasi-static approximation
 */
export function runRodRamp(
  rampRate: number = 0.01, // rod units per second
  rampDuration: number = 10, // seconds of ramping
  totalDuration: number = 60,
  dt: number = 0.05,
  params: ReactorParams = DEFAULT_PARAMS
): BenchmarkResult {
  const { state, rodPosition } = createCriticalSteadyState(1.0, params, true);
  const model = new ReactorModel(state, params);
  
  const rampStart = 5;
  const rampEnd = rampStart + rampDuration;
  
  const controls = (t: number): ControlInputs => {
    let rod = rodPosition;
    if (t >= rampStart && t < rampEnd) {
      rod = rodPosition + (t - rampStart) * rampRate;
    } else if (t >= rampEnd) {
      rod = rodPosition + rampDuration * rampRate;
    }
    rod = Math.min(1, Math.max(0, rod));
    
    return {
      rod,
      pumpOn: true,
      scram: false,
    };
  };
  
  const timeSeries = model.run(totalDuration, dt, controls, 0.5);
  
  return {
    name: `Rod Ramp (rate=${rampRate}/s, duration=${rampDuration}s)`,
    duration: totalDuration,
    dt,
    timeSeries,
    metrics: computeMetrics(timeSeries),
  };
}

/**
 * Scenario 7: Startup from low power
 * 
 * Starts at very low power and gradually withdraws rods.
 * Tests reactor behavior during startup sequence.
 */
export function runStartup(
  initialPower: number = 0.001, // 0.1% power
  targetPower: number = 1.0,
  duration: number = 300,
  dt: number = 0.1,
  params: ReactorParams = DEFAULT_PARAMS
): BenchmarkResult {
  // Create steady state at low power
  const state = createSteadyState(initialPower, params, true);
  const model = new ReactorModel(state, params);
  
  // Start with rod more inserted
  const initialRod = 0.3;
  const finalRod = 0.7;
  const rampStart = 10;
  const rampEnd = 200;
  
  const controls = (t: number): ControlInputs => {
    let rod = initialRod;
    if (t >= rampStart && t < rampEnd) {
      const progress = (t - rampStart) / (rampEnd - rampStart);
      rod = initialRod + progress * (finalRod - initialRod);
    } else if (t >= rampEnd) {
      rod = finalRod;
    }
    
    return {
      rod,
      pumpOn: true,
      scram: false,
    };
  };
  
  const timeSeries = model.run(duration, dt, controls, 2.0);
  
  return {
    name: 'Startup Sequence',
    duration,
    dt,
    timeSeries,
    metrics: computeMetrics(timeSeries),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Computes summary metrics from a time series.
 */
function computeMetrics(timeSeries: SimulationRecord[]): BenchmarkResult['metrics'] {
  if (timeSeries.length === 0) {
    return {
      P_initial: 0,
      P_final: 0,
      P_peak: 0,
      P_min: 0,
      Tf_final: 0,
      Tc_final: 0,
    };
  }
  
  const first = timeSeries[0];
  const last = timeSeries[timeSeries.length - 1];
  
  let P_peak = -Infinity;
  let P_min = Infinity;
  
  for (const record of timeSeries) {
    if (record.P > P_peak) P_peak = record.P;
    if (record.P < P_min) P_min = record.P;
  }
  
  return {
    P_initial: first.P,
    P_final: last.P,
    P_peak,
    P_min,
    Tf_final: last.Tf,
    Tc_final: last.Tc,
  };
}

/**
 * Runs all benchmark scenarios and returns results.
 */
export function runAllBenchmarks(
  params: ReactorParams = DEFAULT_PARAMS
): BenchmarkResult[] {
  return [
    runSteadyHold(60, 0.05, params),
    runRodInsertion(0.1, 60, 0.05, params),
    runRodWithdrawal(0.05, 60, 0.05, params),
    runScram(60, 0.05, params),
    runPumpTrip(120, 0.05, params),
    runRodRamp(0.01, 10, 60, 0.05, params),
  ];
}

/**
 * Formats benchmark result as JSON string.
 */
export function formatBenchmarkJSON(result: BenchmarkResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Formats multiple benchmark results as JSON.
 */
export function formatAllBenchmarksJSON(results: BenchmarkResult[]): string {
  return JSON.stringify(results, null, 2);
}

/**
 * Prints a summary of benchmark results to console.
 */
export function printBenchmarkSummary(result: BenchmarkResult): void {
  console.log(`\n=== ${result.name} ===`);
  console.log(`Duration: ${result.duration}s, dt: ${result.dt}s`);
  console.log(`Points: ${result.timeSeries.length}`);
  console.log('Metrics:');
  console.log(`  P_initial: ${result.metrics.P_initial.toFixed(4)}`);
  console.log(`  P_final:   ${result.metrics.P_final.toFixed(4)}`);
  console.log(`  P_peak:    ${result.metrics.P_peak.toFixed(4)}`);
  console.log(`  P_min:     ${result.metrics.P_min.toFixed(6)}`);
  console.log(`  Tf_final:  ${result.metrics.Tf_final.toFixed(1)} K`);
  console.log(`  Tc_final:  ${result.metrics.Tc_final.toFixed(1)} K`);
}

// ============================================================================
// CLI RUNNER
// ============================================================================

/**
 * Main function for running benchmarks from command line.
 */
export function main(): void {
  console.log('Nuclear Reactor Model Benchmarks');
  console.log('================================\n');
  
  const results = runAllBenchmarks();
  
  for (const result of results) {
    printBenchmarkSummary(result);
  }
  
  // Output JSON to stdout if requested
  if (process.argv.includes('--json')) {
    console.log('\n\n--- JSON OUTPUT ---\n');
    console.log(formatAllBenchmarksJSON(results));
  }
}

// Run from Node.js CLI only – avoid executing when bundled for the browser.
if (
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module
) {
  main();
}
