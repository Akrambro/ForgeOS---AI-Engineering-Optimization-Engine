import { Problem, Variable } from '../../types';
import { SeededRandom } from '../math/random';

export class RandomSearchOptimizer {
  private problem: Problem;
  private rng: SeededRandom;

  constructor(problem: Problem, seed: number = 42) {
    this.problem = problem;
    this.rng = new SeededRandom(seed);
  }

  /**
   * Generates next random candidate parameter set
   */
  public generateCandidate(): Record<string, number | string> {
    const params: Record<string, number | string> = {};
    for (const v of this.problem.variables) {
      if (v.type === 'categorical' && v.choices && v.choices.length > 0) {
        params[v.name] = this.rng.choice(v.choices);
      } else if (v.type === 'discrete' && v.discreteValues && v.discreteValues.length > 0) {
        params[v.name] = this.rng.choice(v.discreteValues);
      } else if (v.type === 'integer') {
        params[v.name] = this.rng.integer(v.lowerBound, v.upperBound);
      } else {
        const val = this.rng.uniform(v.lowerBound, v.upperBound);
        params[v.name] = v.step ? Math.round(val / v.step) * v.step : Number(val.toFixed(5));
      }
    }
    return params;
  }

  public getInternalState(): Record<string, any> {
    return {
      rngState: this.rng.getState(),
    };
  }

  public restoreInternalState(state: Record<string, any>): void {
    if (state.rngState !== undefined) {
      this.rng.setState(state.rngState);
    }
  }
}
