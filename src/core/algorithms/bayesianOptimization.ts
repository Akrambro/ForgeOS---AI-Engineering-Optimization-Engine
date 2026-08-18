import { Problem, Trial, Variable } from '../../types';
import { SeededRandom } from '../math/random';
import { GaussianProcessRegressor } from './gaussianProcess';

export interface BayesianOptConfig {
  nInitialWarmup?: number;
  acquisitionFunction?: 'ei' | 'ucb';
  explorationFactor?: number; // xi or beta
  nSamplesPerStep?: number;
}

export class BayesianOptimizer {
  private problem: Problem;
  private rng: SeededRandom;
  private gp: GaussianProcessRegressor;
  private nInitialWarmup: number;
  private acquisition: 'ei' | 'ucb';
  private explorationFactor: number;
  private nSamplesPerStep: number;
  private history: { xNorm: number[]; rawParams: Record<string, number | string>; y: number; feasible: boolean }[] = [];

  constructor(problem: Problem, seed: number = 42, config: BayesianOptConfig = {}) {
    this.problem = problem;
    this.rng = new SeededRandom(seed);
    this.gp = new GaussianProcessRegressor('matern52', 1.0, 1e-4);
    this.nInitialWarmup = config.nInitialWarmup ?? Math.max(6, problem.variables.length * 2);
    this.acquisition = config.acquisitionFunction ?? 'ei';
    this.explorationFactor = config.explorationFactor ?? 0.01;
    this.nSamplesPerStep = config.nSamplesPerStep ?? 400;
  }

  public getSurrogateModel() {
    return this.gp;
  }

  public recordTrial(trial: Trial) {
    if (trial.status !== 'successful') return;

    const primaryObj = this.problem.objectives[0];
    const isMin = primaryObj ? primaryObj.direction === 'minimize' : true;
    const rawVal = primaryObj ? (trial.objectiveValues[primaryObj.name] ?? 0) : 0;
    
    // Penalize infeasible points
    const penalizedVal = trial.feasible ? rawVal : (isMin ? rawVal + 1e4 : rawVal - 1e4);

    const xNorm = this.normalizeParams(trial.parameters);
    this.history.push({
      xNorm,
      rawParams: trial.parameters,
      y: penalizedVal,
      feasible: trial.feasible,
    });
  }

  public generateCandidate(): { 
    parameters: Record<string, number | string>;
    prediction?: { mean: Record<string, number>; std: Record<string, number>; acquisitionValue: number };
  } {
    const vars = this.problem.variables;

    // Warm-up random stage
    if (this.history.length < this.nInitialWarmup) {
      return { parameters: this.randomSample() };
    }

    // Fit GP surrogate on historical continuous & integer features
    const X = this.history.map(h => h.xNorm);
    const Y = this.history.map(h => h.y);

    try {
      this.gp.fit(X, Y);
    } catch (err) {
      console.warn('GP fitting fallback to random sample:', err);
      return { parameters: this.randomSample() };
    }

    // Determine current best feasible objective
    const primaryObj = this.problem.objectives[0];
    const isMin = primaryObj ? primaryObj.direction === 'minimize' : true;
    const feasibleHistory = this.history.filter(h => h.feasible);
    const bestY = feasibleHistory.length > 0
      ? (isMin ? Math.min(...feasibleHistory.map(h => h.y)) : Math.max(...feasibleHistory.map(h => h.y)))
      : (isMin ? Math.min(...Y) : Math.max(...Y));

    // Optimize acquisition function over sample pool
    let bestNormVector: number[] = [];
    let bestAcquisitionScore = -Infinity;
    let bestMean = 0;
    let bestStd = 0;

    for (let s = 0; s < this.nSamplesPerStep; s++) {
      const candidateNorm: number[] = [];
      for (let i = 0; i < vars.length; i++) {
        candidateNorm.push(this.rng.next());
      }

      let acqValue = 0;
      const pred = this.gp.predict(candidateNorm);

      if (this.acquisition === 'ei') {
        acqValue = this.gp.expectedImprovement(candidateNorm, bestY, primaryObj?.direction || 'minimize', this.explorationFactor);
      } else {
        // Upper / Lower Confidence Bound
        const beta = this.explorationFactor > 0 ? this.explorationFactor : 2.0;
        acqValue = isMin ? -(pred.mean - beta * pred.std) : (pred.mean + beta * pred.std);
      }

      if (acqValue > bestAcquisitionScore || s === 0) {
        bestAcquisitionScore = acqValue;
        bestNormVector = candidateNorm;
        bestMean = pred.mean;
        bestStd = pred.std;
      }
    }

    const denormalizedParams = this.denormalizeVector(bestNormVector);
    const primaryObjName = primaryObj ? primaryObj.name : 'obj';

    return {
      parameters: denormalizedParams,
      prediction: {
        mean: { [primaryObjName]: Number(bestMean.toFixed(4)) },
        std: { [primaryObjName]: Number(bestStd.toFixed(4)) },
        acquisitionValue: Number(bestAcquisitionScore.toFixed(5)),
      },
    };
  }

  private randomSample(): Record<string, number | string> {
    const p: Record<string, number | string> = {};
    for (const v of this.problem.variables) {
      if (v.type === 'categorical' && v.choices?.length) {
        p[v.name] = this.rng.choice(v.choices);
      } else if (v.type === 'discrete' && v.discreteValues?.length) {
        p[v.name] = this.rng.choice(v.discreteValues);
      } else if (v.type === 'integer') {
        p[v.name] = this.rng.integer(v.lowerBound, v.upperBound);
      } else {
        p[v.name] = Number(this.rng.uniform(v.lowerBound, v.upperBound).toFixed(5));
      }
    }
    return p;
  }

  private normalizeParams(params: Record<string, number | string>): number[] {
    const norm: number[] = [];
    for (const v of this.problem.variables) {
      if (v.type === 'categorical' && v.choices?.length) {
        const idx = v.choices.indexOf(String(params[v.name]));
        norm.push(idx >= 0 ? idx / Math.max(v.choices.length - 1, 1) : 0);
      } else if (v.type === 'discrete' && v.discreteValues?.length) {
        const val = Number(params[v.name]);
        const idx = v.discreteValues.indexOf(val);
        norm.push(idx >= 0 ? idx / Math.max(v.discreteValues.length - 1, 1) : 0);
      } else {
        const val = Number(params[v.name] ?? v.lowerBound);
        const span = Math.max(v.upperBound - v.lowerBound, 1e-6);
        norm.push(Math.max(0, Math.min(1, (val - v.lowerBound) / span)));
      }
    }
    return norm;
  }

  private denormalizeVector(norm: number[]): Record<string, number | string> {
    const params: Record<string, number | string> = {};
    for (let i = 0; i < this.problem.variables.length; i++) {
      const v = this.problem.variables[i];
      const val01 = norm[i] ?? 0.5;

      if (v.type === 'categorical' && v.choices?.length) {
        const idx = Math.min(Math.floor(val01 * v.choices.length), v.choices.length - 1);
        params[v.name] = v.choices[idx];
      } else if (v.type === 'discrete' && v.discreteValues?.length) {
        const idx = Math.min(Math.floor(val01 * v.discreteValues.length), v.discreteValues.length - 1);
        params[v.name] = v.discreteValues[idx];
      } else if (v.type === 'integer') {
        const raw = v.lowerBound + val01 * (v.upperBound - v.lowerBound);
        params[v.name] = Math.round(raw);
      } else {
        const raw = v.lowerBound + val01 * (v.upperBound - v.lowerBound);
        params[v.name] = v.step ? Math.round(raw / v.step) * v.step : Number(raw.toFixed(5));
      }
    }
    return params;
  }

  public getInternalState(): Record<string, any> {
    return {
      rngState: this.rng.getState(),
      history: JSON.parse(JSON.stringify(this.history)),
    };
  }

  public restoreInternalState(state: Record<string, any>): void {
    if (state.rngState !== undefined) {
      this.rng.setState(state.rngState);
    }
    if (state.history) {
      this.history = JSON.parse(JSON.stringify(state.history));
    }
  }
}
