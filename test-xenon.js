// Quick test to see if xenon calculations work
import { createSteadyState, DEFAULT_PARAMS } from './lib/reactor/index.ts';

const state = createSteadyState(1.0, DEFAULT_PARAMS, true);
console.log('Steady state at 100% power:');
console.log('I135:', state.I135);
console.log('Xe135:', state.Xe135);
console.log('Power:', state.P);
