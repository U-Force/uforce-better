/**
 * model.ts - Core reactor model implementation
 * 
 * Implements a reduced-order point kinetics model coupled with a lumped-parameter
 * thermal-hydraulic model for educational simulation of a PWR-like reactor.
 * 
 * PHYSICS OVERVIEW:
 * ================
 * 
 * Point Kinetics Equations (neutronics):
 *   dP/dt = ((ρ - β)/Λ) * P + Σ(λ_i * C_i)
 *   dC_i/dt = (β_i/Λ) * P - λ_i * C_i
 * 
 * Where:
 *   P     = normalized reactor power
 *   ρ     = total reactivity (Δk/k)
 *   β     = total delayed neutron fraction
 *   β_i   = delayed neutron fraction for group i
 *   Λ     = prompt neutron generation time
 *   λ_i   = decay constant for precursor group i
 *   C_i   = normalized precursor concentration for group i
 * 
 * Thermal Model (energy balance):
 *   dTf/dt = (Q_gen - Q_fc) / (m_f * c_f)
 *          = (k_pf * P * P_nom - h_fc * (Tf - Tc)) / (m_f * c_f)
 * 
 *   dTc/dt = (Q_fc - Q_sink) / (m_c * c_c)
 *          = (h_fc * (Tf - Tc) - h_cool * (Tc - Tc_in)) / (m_c * c_c)
 * 
 * Reactivity Model:
 *   ρ = ρ_ext(rod, scram, t) + ρ_Doppler(Tf) + ρ_mod(Tc)
 * 
 * Where:
 *   ρ_Doppler = α_f * (Tf - Tf_ref)   [fuel temperature feedback]
 *   ρ_mod     = α_c * (Tc - Tc_ref)   [moderator temperature feedback]
 *   ρ_ext     = rod worth + scram contribution
 */

import type {
  ReactorState,
  ControlInputs,
  SimulationConfig,
  ReactivityComponents,
  SimulationRecord,
  IntegrationMethod,
} from './types';

import { NUM_PRECURSOR_GROUPS } from './types';

import {
  type ReactorParams,
  DEFAULT_PARAMS,
  rodWorthCurve,
  BETA_TOTAL,
} from './params';

import {
  validateTimestep,
  validateControls,
  validateInitialState,
  validateParams,
  clampState,
  ValidationError,
} from './guards';

// ============================================================================
// REACTIVITY CALCULATIONS
// ============================================================================

/**
 * Computes the external reactivity from control rods and scram.
 * 
 * @param rod Control rod position [0=inserted, 1=withdrawn]
 * @param scram Scram signal active
 * @param scramStartTime Time when scram was initiated (if active)
 * @param currentTime Current simulation time
 * @param params Reactor parameters
 * @returns External reactivity [Δk/k]
 */
export function computeExternalReactivity(
  rod: number,
  scram: boolean,
  scramStartTime: number | null,
  currentTime: number,
  params: ReactorParams
): number {
  // Base reactivity from control rod position
  // rod=1 (withdrawn) → full rod worth (positive contribution)
  // rod=0 (inserted) → zero worth
  const rodContribution = params.rodWorthMax * rodWorthCurve(rod);
  
  // Scram contribution: exponential insertion of negative reactivity
  let scramContribution = 0;
  if (scram && scramStartTime !== null) {
    const dt = currentTime - scramStartTime;
    if (dt >= 0) {
      // Exponential approach to full scram reactivity
      // ρ_scram(t) = ρ_scram_max * (1 - exp(-t/τ))
      scramContribution = params.scramReactivity * (1 - Math.exp(-dt / params.scramTau));
    }
  }
  
  return rodContribution + scramContribution - params.shutdownMargin;
}

/**
 * Computes Doppler (fuel temperature) reactivity feedback.
 * 
 * @param Tf Current fuel temperature [K]
 * @param params Reactor parameters
 * @returns Doppler reactivity [Δk/k]
 */
export function computeDopplerReactivity(Tf: number, params: ReactorParams): number {
  // ρ_Doppler = α_f * (Tf - Tf_ref)
  // α_f is typically negative, so Tf > Tf_ref gives negative reactivity (stable)
  return params.alphaFuel * (Tf - params.TfRef);
}

/**
 * Computes moderator temperature reactivity feedback.
 * 
 * @param Tc Current coolant temperature [K]
 * @param params Reactor parameters
 * @returns Moderator reactivity [Δk/k]
 */
export function computeModeratorReactivity(Tc: number, params: ReactorParams): number {
  // ρ_mod = α_c * (Tc - Tc_ref)
  // α_c is typically negative in PWRs (stable feedback)
  return params.alphaCoolant * (Tc - params.TcRef);
}

/**
 * Computes total reactivity and all components.
 * 
 * @param state Current reactor state
 * @param controls Control inputs
 * @param scramStartTime Time when scram was initiated
 * @param params Reactor parameters
 * @returns Reactivity components object
 */
export function computeReactivity(
  state: ReactorState,
  controls: ControlInputs,
  scramStartTime: number | null,
  params: ReactorParams
): ReactivityComponents {
  const rhoExt = computeExternalReactivity(
    controls.rod,
    controls.scram,
    scramStartTime,
    state.t,
    params
  );
  
  const rhoDoppler = computeDopplerReactivity(state.Tf, params);
  const rhoMod = computeModeratorReactivity(state.Tc, params);
  
  return {
    rhoExt,
    rhoDoppler,
    rhoMod,
    rhoTotal: rhoExt + rhoDoppler + rhoMod,
  };
}

// ============================================================================
// DERIVATIVE CALCULATIONS
// ============================================================================

/**
 * State derivative vector for ODE integration.
 */
interface StateDerivatives {
  dP: number;
  dC: number[];
  dTf: number;
  dTc: number;
}

/**
 * Computes the time derivatives of all state variables.
 * This is the core physics kernel.
 * 
 * @param state Current state
 * @param rho Total reactivity
 * @param pumpOn Pump status
 * @param params Reactor parameters
 * @returns Derivatives of all state variables
 */
export function computeDerivatives(
  state: ReactorState,
  rho: number,
  pumpOn: boolean,
  params: ReactorParams
): StateDerivatives {
  const { P, C, Tf, Tc } = state;
  const beta = params.betaI.reduce((sum, b) => sum + b, 0);
  const Lambda = params.lambdaPrompt;
  
  // =========================================================================
  // Point Kinetics: dP/dt = ((ρ - β)/Λ) * P + Σ(λ_i * C_i)
  // =========================================================================
  
  // Prompt term: ((ρ - β)/Λ) * P
  const promptTerm = ((rho - beta) / Lambda) * P;
  
  // Delayed neutron source: Σ(λ_i * C_i)
  let delayedSource = 0;
  for (let i = 0; i < C.length; i++) {
    delayedSource += params.lambdaI[i] * C[i];
  }
  
  const dP = promptTerm + delayedSource;
  
  // =========================================================================
  // Precursor equations: dC_i/dt = (β_i/Λ) * P - λ_i * C_i
  // =========================================================================
  
  const dC: number[] = [];
  for (let i = 0; i < params.betaI.length; i++) {
    // Production: (β_i/Λ) * P
    const production = (params.betaI[i] / Lambda) * P;
    // Decay: λ_i * C_i
    const decay = params.lambdaI[i] * C[i];
    dC.push(production - decay);
  }
  
  // =========================================================================
  // Thermal model: fuel temperature
  // dTf/dt = (Q_gen - Q_fc) / (m_f * c_f)
  // =========================================================================
  
  // Heat generation in fuel: Q_gen = P * P_nominal
  const Q_gen = P * params.powerNominal;
  
  // Heat transfer from fuel to coolant: Q_fc = h_fc * (Tf - Tc)
  const Q_fc = params.hFuelCoolant * (Tf - Tc);
  
  // Fuel thermal inertia
  const fuelCapacity = params.massFuel * params.cpFuel;
  
  const dTf = (Q_gen - Q_fc) / fuelCapacity;
  
  // =========================================================================
  // Thermal model: coolant temperature
  // dTc/dt = (Q_fc - Q_sink) / (m_c * c_c)
  // =========================================================================
  
  // Heat removal to ultimate heat sink: Q_sink = h_cool * (Tc - Tc_in)
  // h_cool depends on pump status
  const hCool = pumpOn 
    ? params.hCoolantSinkPumpOn 
    : params.hCoolantSinkPumpOff;
  
  const Q_sink = hCool * (Tc - params.TcInlet);
  
  // Coolant thermal inertia
  const coolantCapacity = params.massCoolant * params.cpCoolant;
  
  const dTc = (Q_fc - Q_sink) / coolantCapacity;
  
  return { dP, dC, dTf, dTc };
}

// ============================================================================
// INTEGRATORS
// ============================================================================

/**
 * Applies state derivatives to create a new state.
 */
function applyDerivatives(
  state: ReactorState,
  derivatives: StateDerivatives,
  dt: number
): ReactorState {
  return {
    t: state.t + dt,
    P: state.P + derivatives.dP * dt,
    C: state.C.map((c, i) => c + derivatives.dC[i] * dt),
    Tf: state.Tf + derivatives.dTf * dt,
    Tc: state.Tc + derivatives.dTc * dt,
  };
}

/**
 * Adds two derivative vectors.
 */
function addDerivatives(
  a: StateDerivatives,
  b: StateDerivatives,
  scale: number = 1
): StateDerivatives {
  return {
    dP: a.dP + b.dP * scale,
    dC: a.dC.map((ac, i) => ac + b.dC[i] * scale),
    dTf: a.dTf + b.dTf * scale,
    dTc: a.dTc + b.dTc * scale,
  };
}

/**
 * Scales a derivative vector.
 */
function scaleDerivatives(d: StateDerivatives, scale: number): StateDerivatives {
  return {
    dP: d.dP * scale,
    dC: d.dC.map(c => c * scale),
    dTf: d.dTf * scale,
    dTc: d.dTc * scale,
  };
}

/**
 * Euler integration step.
 * Simple first-order method. Only use with small timesteps.
 */
function eulerStep(
  state: ReactorState,
  rho: number,
  pumpOn: boolean,
  dt: number,
  params: ReactorParams
): ReactorState {
  const derivatives = computeDerivatives(state, rho, pumpOn, params);
  return applyDerivatives(state, derivatives, dt);
}

/**
 * Fourth-order Runge-Kutta integration step.
 * More accurate and stable than Euler for larger timesteps.
 * 
 * k1 = f(t, y)
 * k2 = f(t + dt/2, y + dt*k1/2)
 * k3 = f(t + dt/2, y + dt*k2/2)
 * k4 = f(t + dt, y + dt*k3)
 * y_new = y + (dt/6)*(k1 + 2*k2 + 2*k3 + k4)
 */
function rk4Step(
  state: ReactorState,
  rho: number,
  pumpOn: boolean,
  dt: number,
  params: ReactorParams
): ReactorState {
  // k1 = f(t, y)
  const k1 = computeDerivatives(state, rho, pumpOn, params);
  
  // k2 = f(t + dt/2, y + dt*k1/2)
  const state2 = applyDerivatives(state, k1, dt / 2);
  const k2 = computeDerivatives(state2, rho, pumpOn, params);
  
  // k3 = f(t + dt/2, y + dt*k2/2)
  const state3 = applyDerivatives(state, k2, dt / 2);
  const k3 = computeDerivatives(state3, rho, pumpOn, params);
  
  // k4 = f(t + dt, y + dt*k3)
  const state4 = applyDerivatives(state, k3, dt);
  const k4 = computeDerivatives(state4, rho, pumpOn, params);
  
  // Combine: y_new = y + (dt/6)*(k1 + 2*k2 + 2*k3 + k4)
  // First compute weighted sum of derivatives
  let combined = scaleDerivatives(k1, 1);
  combined = addDerivatives(combined, k2, 2);
  combined = addDerivatives(combined, k3, 2);
  combined = addDerivatives(combined, k4, 1);
  combined = scaleDerivatives(combined, 1 / 6);
  
  return applyDerivatives(state, combined, dt);
}

// ============================================================================
// REACTOR MODEL CLASS
// ============================================================================

/**
 * ReactorModel - Main simulation class
 * 
 * Encapsulates the reactor state, parameters, and provides the step() method
 * for advancing the simulation in time.
 */
export class ReactorModel {
  /** Current reactor state */
  private state: ReactorState;
  
  /** Reactor parameters */
  private params: ReactorParams;
  
  /** Simulation configuration */
  private config: SimulationConfig;
  
  /** Time when scram was initiated (null if not active) */
  private scramStartTime: number | null = null;
  
  /** Flag indicating if scram was previously active */
  private scramWasActive: boolean = false;
  
  /**
   * Creates a new reactor model instance.
   * 
   * @param initialState Starting state (or use createSteadyState())
   * @param params Reactor parameters (or use DEFAULT_PARAMS)
   * @param config Simulation configuration
   */
  constructor(
    initialState: ReactorState,
    params: ReactorParams = DEFAULT_PARAMS,
    config: Partial<SimulationConfig> = {}
  ) {
    // Validate parameters first
    validateParams(params);
    this.params = params;
    
    // Validate initial state
    validateInitialState(initialState, params);
    this.state = { ...initialState, C: [...initialState.C] };
    
    // Set up configuration with defaults
    this.config = {
      method: config.method ?? 'rk4',
      warnOnClamp: config.warnOnClamp ?? false,
      warnHandler: config.warnHandler,
    };
  }
  
  /**
   * Gets the current reactor state (immutable copy).
   */
  getState(): ReactorState {
    return {
      ...this.state,
      C: [...this.state.C],
    };
  }
  
  /**
   * Gets the current parameters.
   */
  getParams(): ReactorParams {
    return { ...this.params };
  }
  
  /**
   * Computes current reactivity components.
   */
  getReactivity(controls: ControlInputs): ReactivityComponents {
    validateControls(controls);
    return computeReactivity(this.state, controls, this.scramStartTime, this.params);
  }
  
  /**
   * Advances the simulation by one timestep.
   * 
   * @param dt Timestep in seconds
   * @param controls Control inputs for this step
   * @returns Updated state after the step
   */
  step(dt: number, controls: ControlInputs): ReactorState {
    // Validate inputs
    validateTimestep(dt, this.config.method, this.params);
    validateControls(controls);
    
    // Handle scram state transitions
    if (controls.scram && !this.scramWasActive) {
      // Scram just initiated
      this.scramStartTime = this.state.t;
    } else if (!controls.scram && this.scramWasActive) {
      // Scram cleared (note: in real reactors this isn't instant)
      this.scramStartTime = null;
    }
    this.scramWasActive = controls.scram;
    
    // Compute reactivity
    const reactivity = computeReactivity(
      this.state,
      controls,
      this.scramStartTime,
      this.params
    );
    
    // Integrate
    let newState: ReactorState;
    if (this.config.method === 'euler') {
      newState = eulerStep(
        this.state,
        reactivity.rhoTotal,
        controls.pumpOn,
        dt,
        this.params
      );
    } else {
      newState = rk4Step(
        this.state,
        reactivity.rhoTotal,
        controls.pumpOn,
        dt,
        this.params
      );
    }
    
    // Apply safety clamps
    clampState(newState, this.params, this.config);
    
    // Update internal state
    this.state = newState;
    
    return this.getState();
  }
  
  /**
   * Runs the simulation for a specified duration.
   * 
   * @param duration Total time to simulate [s]
   * @param dt Timestep [s]
   * @param controls Control inputs (can be function of time)
   * @param recordInterval How often to record state (default: every step)
   * @returns Array of simulation records
   */
  run(
    duration: number,
    dt: number,
    controls: ControlInputs | ((t: number) => ControlInputs),
    recordInterval: number = dt
  ): SimulationRecord[] {
    const records: SimulationRecord[] = [];
    const startTime = this.state.t;
    const endTime = startTime + duration;
    
    let lastRecordTime = startTime - recordInterval; // Ensure first step is recorded
    
    while (this.state.t < endTime - dt / 2) {
      const currentControls = typeof controls === 'function'
        ? controls(this.state.t)
        : controls;
      
      // Record if interval has passed
      if (this.state.t >= lastRecordTime + recordInterval - dt / 2) {
        const reactivity = this.getReactivity(currentControls);
        records.push({
          t: this.state.t,
          P: this.state.P,
          Tf: this.state.Tf,
          Tc: this.state.Tc,
          rho: reactivity.rhoTotal,
          rod: currentControls.rod,
          pumpOn: currentControls.pumpOn,
          scram: currentControls.scram,
        });
        lastRecordTime = this.state.t;
      }
      
      this.step(dt, currentControls);
    }
    
    // Record final state
    const finalControls = typeof controls === 'function'
      ? controls(this.state.t)
      : controls;
    const finalReactivity = this.getReactivity(finalControls);
    records.push({
      t: this.state.t,
      P: this.state.P,
      Tf: this.state.Tf,
      Tc: this.state.Tc,
      rho: finalReactivity.rhoTotal,
      rod: finalControls.rod,
      pumpOn: finalControls.pumpOn,
      scram: finalControls.scram,
    });
    
    return records;
  }
  
  /**
   * Resets the model to a new state.
   */
  reset(newState: ReactorState): void {
    validateInitialState(newState, this.params);
    this.state = { ...newState, C: [...newState.C] };
    this.scramStartTime = null;
    this.scramWasActive = false;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates a steady-state reactor condition.
 * 
 * At steady state:
 * - dP/dt = 0 → ((ρ - β)/Λ) * P + Σ(λ_i * C_i) = 0
 * - dC_i/dt = 0 → C_i = (β_i / (Λ * λ_i)) * P
 * - ρ = 0 (critical) when we also consider thermal equilibrium
 * 
 * For thermal equilibrium at power P:
 * - Q_gen = Q_fc = Q_sink
 * - P * P_nom = h_fc * (Tf - Tc) = h_cool * (Tc - Tc_in)
 * 
 * This function computes consistent temperatures for a given power level.
 * 
 * @param P Normalized power level (default 1.0)
 * @param params Reactor parameters
 * @param pumpOn Whether pump is on (affects steady-state temperatures)
 * @returns Steady-state reactor state
 */
export function createSteadyState(
  P: number = 1.0,
  params: ReactorParams = DEFAULT_PARAMS,
  pumpOn: boolean = true
): ReactorState {
  if (P < 0) {
    throw new ValidationError(`Power must be non-negative, got: ${P}`);
  }
  
  // Compute equilibrium precursor concentrations
  // At steady state: C_i = (β_i / (Λ * λ_i)) * P
  const C: number[] = params.betaI.map((betaI, i) => 
    (betaI / (params.lambdaPrompt * params.lambdaI[i])) * P
  );
  
  // Compute equilibrium temperatures
  // At steady state: Q_gen = Q_fc = Q_sink
  // Q_gen = P * P_nom
  const Q_gen = P * params.powerNominal;
  
  // h_cool depends on pump status
  const hCool = pumpOn 
    ? params.hCoolantSinkPumpOn 
    : params.hCoolantSinkPumpOff;
  
  // From Q_sink = h_cool * (Tc - Tc_in):
  // Tc = Tc_in + Q_gen / h_cool
  const Tc = params.TcInlet + Q_gen / hCool;
  
  // From Q_fc = h_fc * (Tf - Tc):
  // Tf = Tc + Q_gen / h_fc
  const Tf = Tc + Q_gen / params.hFuelCoolant;
  
  return {
    t: 0,
    P,
    C,
    Tf,
    Tc,
  };
}

/**
 * Computes the rod position needed for criticality at given temperatures.
 * Useful for initializing scenarios where you want P to be stable.
 * 
 * At criticality: ρ_total = 0
 * So: ρ_ext = -(ρ_Doppler + ρ_mod)
 * And: rod_worth * rodWorthCurve(rod) = -(α_f*(Tf-Tf_ref) + α_c*(Tc-Tc_ref))
 * 
 * @param Tf Fuel temperature [K]
 * @param Tc Coolant temperature [K]
 * @param params Reactor parameters
 * @returns Rod position [0, 1] for criticality, or null if not achievable
 */
export function computeCriticalRodPosition(
  Tf: number,
  Tc: number,
  params: ReactorParams = DEFAULT_PARAMS
): number | null {
  const rhoDoppler = params.alphaFuel * (Tf - params.TfRef);
  const rhoMod = params.alphaCoolant * (Tc - params.TcRef);
  const rhoFeedback = rhoDoppler + rhoMod;
  
  // Need: rodWorthMax * rodWorthCurve(rod) - shutdownMargin = -rhoFeedback
  // So: rodWorthMax * rodWorthCurve(rod) = shutdownMargin - rhoFeedback
  const targetWorth = params.shutdownMargin - rhoFeedback;
  
  if (targetWorth < 0 || targetWorth > params.rodWorthMax) {
    // Cannot achieve criticality with rods alone
    return null;
  }
  
  // Invert the rod worth curve numerically (simple bisection)
  const targetNormalized = targetWorth / params.rodWorthMax;
  
  let low = 0;
  let high = 1;
  
  for (let i = 0; i < 50; i++) { // 50 iterations gives ~15 decimal places
    const mid = (low + high) / 2;
    const worth = rodWorthCurve(mid);
    
    if (worth < targetNormalized) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return (low + high) / 2;
}

/**
 * Creates a complete steady-state initial condition with correct rod position.
 * 
 * @param P Normalized power level
 * @param params Reactor parameters
 * @param pumpOn Pump status
 * @returns Object with state and critical rod position
 */
export function createCriticalSteadyState(
  P: number = 1.0,
  params: ReactorParams = DEFAULT_PARAMS,
  pumpOn: boolean = true
): { state: ReactorState; rodPosition: number } {
  const state = createSteadyState(P, params, pumpOn);
  const rodPosition = computeCriticalRodPosition(state.Tf, state.Tc, params);
  
  if (rodPosition === null) {
    throw new ValidationError(
      'Cannot find critical rod position for given conditions. ' +
      'Check that temperatures are within achievable range.'
    );
  }
  
  return { state, rodPosition };
}
