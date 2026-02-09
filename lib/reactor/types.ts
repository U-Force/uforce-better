/**
 * types.ts - Type definitions for the reduced-order nuclear reactor model
 * 
 * This educational simulator models a PWR-like thermal reactor using
 * point kinetics coupled with a lumped-parameter thermal-hydraulic model.
 */

/**
 * Number of delayed neutron precursor groups.
 * Standard 6-group representation for U-235 thermal fission.
 */
export const NUM_PRECURSOR_GROUPS = 6;

/**
 * Reactor state vector - the complete state of the system at any instant.
 * All quantities use SI units unless otherwise noted.
 */
export interface ReactorState {
  /** Simulation time [s] */
  t: number;

  /** Normalized reactor power [unitless], where 1.0 = nominal full power */
  P: number;

  /**
   * Delayed neutron precursor concentrations [unitless, normalized].
   * Array of 6 groups representing different fission product families.
   * C[i] corresponds to precursor group i with decay constant λ[i].
   */
  C: number[];

  /** Lumped fuel temperature [K] - average fuel pellet temperature */
  Tf: number;

  /** Lumped coolant temperature [K] - average primary coolant temperature */
  Tc: number;

  /** Iodine-135 concentration [atoms/cm³] - precursor to Xe-135 */
  I135: number;

  /** Xenon-135 concentration [atoms/cm³] - strong neutron poison */
  Xe135: number;
}

/**
 * Control inputs to the reactor model.
 * These represent operator actions or automatic control system commands.
 */
export interface ControlInputs {
  /** 
   * Control rod position [unitless].
   * 0 = fully inserted (shutdown), 1 = fully withdrawn (max reactivity).
   * Intermediate values represent partial insertion.
   */
  rod: number;
  
  /** 
   * Primary coolant pump status.
   * true = pump running (normal flow), false = pump off (natural circulation only).
   */
  pumpOn: boolean;
  
  /** 
   * Emergency scram signal.
   * When true, initiates rapid control rod insertion regardless of 'rod' setting.
   * Models the reactor protection system (RPS) response.
   */
  scram: boolean;
}

/**
 * Computed reactivity components for diagnostics and logging.
 * All values are dimensionless (Δk/k or equivalent).
 */
export interface ReactivityComponents {
  /** External reactivity from control rods and scram [Δk/k] */
  rhoExt: number;

  /** Doppler reactivity feedback from fuel temperature [Δk/k] */
  rhoDoppler: number;

  /** Moderator temperature reactivity feedback [Δk/k] */
  rhoMod: number;

  /** Xenon-135 reactivity feedback (negative) [Δk/k] */
  rhoXenon: number;

  /** Total reactivity = rhoExt + rhoDoppler + rhoMod + rhoXenon [Δk/k] */
  rhoTotal: number;
}

/**
 * Complete output record for logging and analysis.
 * Combines state, controls, and computed values.
 */
export interface SimulationRecord {
  /** Simulation time [s] */
  t: number;
  
  /** Normalized power [unitless] */
  P: number;
  
  /** Fuel temperature [K] */
  Tf: number;
  
  /** Coolant temperature [K] */
  Tc: number;
  
  /** Total reactivity [Δk/k] */
  rho: number;
  
  /** Control rod position [0-1] */
  rod: number;
  
  /** Pump status */
  pumpOn: boolean;
  
  /** Scram status */
  scram: boolean;
}

/**
 * Integration method selection.
 * RK4 is recommended for stability; Euler only for very small timesteps.
 */
export type IntegrationMethod = 'rk4' | 'euler';

/**
 * Configuration options for the simulation.
 */
export interface SimulationConfig {
  /** Integration method (default: 'rk4') */
  method: IntegrationMethod;
  
  /** Enable verbose warnings for clamping events */
  warnOnClamp: boolean;
  
  /** Custom warning handler (defaults to console.warn) */
  warnHandler?: (message: string) => void;
}

/**
 * Time series data for benchmark output.
 */
export interface BenchmarkResult {
  /** Scenario name/description */
  name: string;
  
  /** Total simulation duration [s] */
  duration: number;
  
  /** Time step used [s] */
  dt: number;
  
  /** Array of simulation records */
  timeSeries: SimulationRecord[];
  
  /** Summary metrics */
  metrics: {
    /** Initial power */
    P_initial: number;
    /** Final power */
    P_final: number;
    /** Peak power */
    P_peak: number;
    /** Minimum power */
    P_min: number;
    /** Final fuel temperature [K] */
    Tf_final: number;
    /** Final coolant temperature [K] */
    Tc_final: number;
  };
}
