/**
 * params.ts - Physical parameters and constants for the reactor model
 * 
 * All parameters have physically reasonable default values for a generic
 * PWR-like thermal reactor. Values are drawn from standard nuclear engineering
 * references and are suitable for educational demonstrations.
 * 
 * UNITS: SI throughout unless explicitly noted.
 */

import { NUM_PRECURSOR_GROUPS } from './types';

// ============================================================================
// NEUTRONICS PARAMETERS
// ============================================================================

/**
 * Delayed neutron fractions (β_i) for 6-group representation of U-235.
 * Sum of all groups = total delayed neutron fraction β ≈ 0.0065.
 * Source: Standard 6-group data (Keepin et al.)
 * Units: [dimensionless]
 */
export const BETA_I: readonly number[] = [
  0.000215,  // Group 1: Br-87 family
  0.001424,  // Group 2: I-137 family  
  0.001274,  // Group 3: Br-89 family
  0.002568,  // Group 4: I-139, Br-90 families
  0.000748,  // Group 5: Delayed neutron emitters
  0.000273,  // Group 6: Long-lived precursors
] as const;

/**
 * Total delayed neutron fraction β = Σβ_i
 * Units: [dimensionless]
 */
export const BETA_TOTAL: number = BETA_I.reduce((sum, b) => sum + b, 0);

/**
 * Decay constants (λ_i) for delayed neutron precursor groups.
 * Units: [1/s]
 */
export const LAMBDA_I: readonly number[] = [
  0.0124,   // Group 1: ~56 s half-life
  0.0305,   // Group 2: ~23 s half-life
  0.111,    // Group 3: ~6.2 s half-life
  0.301,    // Group 4: ~2.3 s half-life
  1.14,     // Group 5: ~0.6 s half-life
  3.01,     // Group 6: ~0.23 s half-life
] as const;

/**
 * Prompt neutron generation time (Λ).
 * Increased from realistic 1e-4 to 1e-3 for human-scale response times.
 * This makes the reactor respond ~10x slower, giving operators time to react.
 * Units: [s]
 */
export const LAMBDA_PROMPT: number = 1e-3; // 1 ms, slow enough for human reaction

// ============================================================================
// REACTIVITY FEEDBACK COEFFICIENTS
// ============================================================================

/**
 * Fuel temperature (Doppler) reactivity coefficient (α_f).
 * Negative coefficient provides inherent safety (negative feedback).
 * Strengthened to -4 pcm/K for better stability in simulation.
 * Units: [Δk/k per K] or [1/K]
 */
export const ALPHA_FUEL: number = -4.0e-5; // -4 pcm/K (stronger Doppler feedback)

/**
 * Moderator (coolant) temperature reactivity coefficient (α_c).
 * Negative in most PWR designs (provides negative feedback).
 * Strengthened to -25 pcm/K for better stability in simulation.
 * Units: [Δk/k per K] or [1/K]
 */
export const ALPHA_COOLANT: number = -2.5e-4; // -25 pcm/K (stronger moderator feedback)

/**
 * Reference fuel temperature for reactivity feedback calculation.
 * Set to cold shutdown to prevent huge positive reactivity at startup.
 * Units: [K]
 */
export const TF_REFERENCE: number = 300; // Cold shutdown (27°C)

/**
 * Reference coolant temperature for reactivity feedback calculation.
 * Set to cold shutdown to prevent huge positive reactivity at startup.
 * Units: [K]
 */
export const TC_REFERENCE: number = 300; // Cold shutdown (27°C)

// ============================================================================
// CONTROL ROD PARAMETERS
// ============================================================================

/**
 * Maximum control rod worth (fully withdrawn vs fully inserted).
 * This is the total reactivity change available from rods.
 * Reduced from 5000 to 3000 pcm for more controllable operation.
 * Units: [Δk/k]
 */
export const ROD_WORTH_MAX: number = 0.03; // 3000 pcm total worth (more controllable)

/**
 * Rod worth curve coefficients.
 * Models non-linear rod worth: more worth in central region.
 * Worth(x) = ROD_WORTH_MAX * rodWorthCurve(x), where x ∈ [0,1].
 * Using a simple sine-squared approximation for differential worth peaking.
 */
export function rodWorthCurve(position: number): number {
  // Integral of sin²(πx) from 0 to pos, normalized
  // This gives S-curve characteristic: flat at ends, steep in middle
  const x = Math.max(0, Math.min(1, position));
  return x - Math.sin(2 * Math.PI * x) / (2 * Math.PI);
}

/**
 * Scram reactivity (additional negative reactivity during scram).
 * Represents rapid insertion beyond normal rod worth.
 * Units: [Δk/k]
 */
export const SCRAM_REACTIVITY: number = -0.08; // -8000 pcm (strong shutdown)

/**
 * Scram insertion time constant.
 * Time for scram reactivity to reach ~63% of final value.
 * Real scram: ~1-2 seconds for full insertion.
 * Units: [s]
 */
export const SCRAM_TAU: number = 1.0;

// ============================================================================
// THERMAL-HYDRAULIC PARAMETERS
// ============================================================================

/**
 * Effective fuel mass (lumped parameter).
 * Reduced from 80,000 to 15,000 kg for faster thermal response in simulation.
 * Makes temperature feedback kick in more quickly.
 * Units: [kg]
 */
export const MASS_FUEL: number = 35000; // 35 tonnes (realistic fuel time constant ~0.42s)

/**
 * Effective coolant mass in core.
 * Reduced from 25,000 to 8,000 kg for faster thermal response.
 * Units: [kg]
 */
export const MASS_COOLANT: number = 18000; // 18 tonnes (realistic coolant time constant ~1.65s)

/**
 * Fuel specific heat capacity.
 * UO2 at operating temperature.
 * Units: [J/(kg·K)]
 */
export const CP_FUEL: number = 300; // J/(kg·K) for UO2

/**
 * Coolant specific heat capacity.
 * Water at PWR operating conditions (~300°C, 155 bar).
 * Units: [J/(kg·K)]
 */
export const CP_COOLANT: number = 5500; // J/(kg·K) for pressurized water

/**
 * Fuel-to-coolant heat transfer coefficient × area.
 * Lumped parameter representing total heat transfer from fuel to coolant.
 * Units: [W/K]
 */
export const H_FUEL_COOLANT: number = 2.5e7; // 25 MW/K

/**
 * Coolant-to-ultimate-heat-sink heat transfer coefficient × area.
 * Represents heat removal by steam generators / heat exchangers.
 * WITH pump running (forced circulation).
 * Increased to 60 MW/K for better heat removal.
 * Units: [W/K]
 */
export const H_COOLANT_SINK_PUMP_ON: number = 6.0e7; // 60 MW/K (doubled for better cooling)

/**
 * Coolant-to-ultimate-heat-sink heat transfer coefficient × area.
 * WITHOUT pump (natural circulation only).
 * Significantly reduced due to lower flow rates.
 * Units: [W/K]
 */
export const H_COOLANT_SINK_PUMP_OFF: number = 1.0e7; // 10 MW/K (natural circ)

/**
 * Coolant inlet temperature (from steam generator cold leg).
 * Set low for cold shutdown operation to enable effective cooling.
 * Units: [K]
 */
export const TC_INLET: number = 300; // 27°C (cold shutdown inlet)

/**
 * Nominal thermal power output.
 * Used to scale the normalized power to actual watts.
 * Units: [W]
 */
export const POWER_NOMINAL: number = 3.0e9; // 3000 MWth (typical large PWR)

// ============================================================================
// NUMERICAL / SAFETY LIMITS
// ============================================================================

/**
 * Minimum allowed timestep.
 * Units: [s]
 */
export const DT_MIN: number = 1e-6;

/**
 * Maximum allowed timestep for RK4.
 * Larger steps may cause instability in stiff kinetics equations.
 * Units: [s]
 */
export const DT_MAX_RK4: number = 0.2;

/**
 * Maximum allowed timestep for Euler method.
 * Euler requires smaller steps for stability.
 * Units: [s]
 */
export const DT_MAX_EULER: number = 0.01;

/**
 * Maximum allowed normalized power before clamping.
 * Prevents runaway in case of numerical issues.
 * Units: [dimensionless]
 */
export const P_MAX: number = 3.0; // 300% nominal power (tighter safety clamp)

/**
 * Shutdown margin: minimum subcritical reactivity with all rods inserted.
 * Ensures the reactor is subcritical at cold shutdown.
 * Units: [Δk/k]
 */
export const SHUTDOWN_MARGIN: number = 0.003; // 300 pcm

/**
 * Minimum allowed normalized power.
 * Small positive to avoid numerical issues at very low power.
 * Units: [dimensionless]
 */
export const P_MIN: number = 1e-10;

/**
 * Maximum fuel temperature before clamping.
 * UO2 melting point ~3100 K; we clamp well below.
 * Units: [K]
 */
export const TF_MAX: number = 2500; // Well below melting

/**
 * Minimum fuel temperature.
 * Room temperature as absolute floor.
 * Units: [K]
 */
export const TF_MIN: number = 293; // ~20°C

/**
 * Maximum coolant temperature before clamping.
 * Below boiling at operating pressure, but allows some margin.
 * Units: [K]
 */
export const TC_MAX: number = 650; // ~377°C (below critical point)

/**
 * Minimum coolant temperature.
 * Units: [K]
 */
export const TC_MIN: number = 293; // ~20°C

// ============================================================================
// PARAMETER PACK FOR EASY OVERRIDE
// ============================================================================

/**
 * Complete parameter set that can be customized.
 * Allows users to modify parameters without touching defaults.
 */
export interface ReactorParams {
  // Neutronics
  betaI: readonly number[];
  lambdaI: readonly number[];
  lambdaPrompt: number;
  
  // Reactivity feedback
  alphaFuel: number;
  alphaCoolant: number;
  TfRef: number;
  TcRef: number;
  
  // Control rods
  rodWorthMax: number;
  scramReactivity: number;
  scramTau: number;
  
  // Thermal-hydraulics
  massFuel: number;
  massCoolant: number;
  cpFuel: number;
  cpCoolant: number;
  hFuelCoolant: number;
  hCoolantSinkPumpOn: number;
  hCoolantSinkPumpOff: number;
  TcInlet: number;
  powerNominal: number;
  
  // Safety
  shutdownMargin: number;

  // Limits
  dtMin: number;
  dtMaxRk4: number;
  dtMaxEuler: number;
  PMax: number;
  PMin: number;
  TfMax: number;
  TfMin: number;
  TcMax: number;
  TcMin: number;
}

/**
 * Default parameter set using all the constants defined above.
 */
export const DEFAULT_PARAMS: ReactorParams = {
  betaI: BETA_I,
  lambdaI: LAMBDA_I,
  lambdaPrompt: LAMBDA_PROMPT,
  
  alphaFuel: ALPHA_FUEL,
  alphaCoolant: ALPHA_COOLANT,
  TfRef: TF_REFERENCE,
  TcRef: TC_REFERENCE,
  
  rodWorthMax: ROD_WORTH_MAX,
  scramReactivity: SCRAM_REACTIVITY,
  scramTau: SCRAM_TAU,
  
  massFuel: MASS_FUEL,
  massCoolant: MASS_COOLANT,
  cpFuel: CP_FUEL,
  cpCoolant: CP_COOLANT,
  hFuelCoolant: H_FUEL_COOLANT,
  hCoolantSinkPumpOn: H_COOLANT_SINK_PUMP_ON,
  hCoolantSinkPumpOff: H_COOLANT_SINK_PUMP_OFF,
  TcInlet: TC_INLET,
  powerNominal: POWER_NOMINAL,
  
  shutdownMargin: SHUTDOWN_MARGIN,

  dtMin: DT_MIN,
  dtMaxRk4: DT_MAX_RK4,
  dtMaxEuler: DT_MAX_EULER,
  PMax: P_MAX,
  PMin: P_MIN,
  TfMax: TF_MAX,
  TfMin: TF_MIN,
  TcMax: TC_MAX,
  TcMin: TC_MIN,
};

/**
 * Create a parameter set with custom overrides.
 * @param overrides Partial parameter object to merge with defaults
 * @returns Complete parameter set
 */
export function createParams(overrides: Partial<ReactorParams> = {}): ReactorParams {
  return { ...DEFAULT_PARAMS, ...overrides };
}
