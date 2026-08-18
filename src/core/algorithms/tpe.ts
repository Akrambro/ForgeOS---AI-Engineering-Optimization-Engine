import { Problem, Trial } from '../../types';
import { SeededRandom } from '../math/random';

export interface TPEConfig {
  gamma?: number; // Top quantile threshold (default 0.15)
  nStartupTrials?: number;
  nCandidates?: number;
}

export class TPEOptimizer {
  private problem: Problem;
  private rng: SeededRandom;
  private gamma: number;
  private nStartupTrials: number;
  private nCandidates: number;
  private history: { params: Record<string, number | string>; score: number }[] = [];

  constructor(problem: Problem, seed: number = 42, config: TPEConfig = {}) {
    this.problem = problem;
    this.rng = new SeededRandom(seed);
    this.gamma = config.gamma ?? 0.15;
    this.nStartupTrials = config.nStartupTrials ?? Math.max(8, problem.variables.length * 3);
    this.nCandidates = config.nCandidates ?? 24;
  }

  public recordTrial(trial: Trial) {
    if (trial.status !== 'successful') return;
    const primaryObj = this.problem.objectives[0];
    const isMin = primaryObj ? primaryObj.direction === 'minimize' : true;
    const rawVal = primaryObj ? (trial.objectiveValues[primaryObj.name] ?? 1e9) : 0;
    const score = trial.feasible ? (isMin ? rawVal : -rawVal) : (isMin ? rawVal + 1e5 : -rawVal + 1e5);

    this.history.push({
      params: trial.parameters,
      score,
    });
  }

  public generateCandidate(): Record<string, number | string> {
    const vars = this.problem.variables;

    // Startup phase: random exploration
    if (this.history.length < this.nStartupTrials) {
      const p: Record<string, number | string> = {};
      for (const v of vars) {
        if (v.type === 'categorical' && v.choices?.length) {
          p[v.name] = this.rng.choice(v.choices);
        } else if (v.type === 'integer') {
          p[v.name] = this.rng.integer(v.lowerBound, v.upperBound);
        } else {
          p[v.name] = Number(this.rng.uniform(v.lowerBound, v.upperBound).toFixed(5));
        }
      }
      return p;
    }

    // Sort historical observations by score
    const sorted = [...this.history].sort((a, b) => a.score - b.score);
    const nGood = Math.max(Math.ceil(this.gamma * sorted.length), 3);
    const goodTrials = sorted.slice(0, nGood);
    const badTrials = sorted.slice(nGood);

    // Generate candidate samples from good KDE and pick maximum ratio l(x)/g(x)
    let bestCandidate: Record<string, number | string> | null = null;
    let maxRatio = -Infinity;

    for (let c = 0; c < this.nCandidates; c++) {
      const candidate: Record<string, number | string> = {};
      let totalLogL = 0;
      let totalLogG = 0;

      for (const v of vars) {
        if (v.type === 'continuous' || v.type === 'integer') {
          // Sample from good KDE
          const goodVals = goodTrials.map(t => Number(t.params[v.name]));
          const sampledCenter = this.rng.choice(goodVals);
          const range = v.upperBound - v.lowerBound;
          const bandwidth = Math.max(range * 0.1, 1e-4);

          let sampledVal = this.rng.normal(sampledCenter, bandwidth);
          // Clip to bounds
          sampledVal = Math.max(v.lowerBound, Math.min(v.upperBound, sampledVal));
          if (v.type === 'integer') {
            sampledVal = Math.round(sampledVal);
          } else {
            sampledVal = Number(sampledVal.toFixed(5));
          }
          candidate[v.name] = sampledVal;

          // Estimate density l(x) and g(x)
          const lDensity = this.kdeDensity(sampledVal, goodVals, bandwidth);
          const badVals = badTrials.map(t => Number(t.params[v.name]));
          const gDensity = this.kdeDensity(sampledVal, badVals, bandwidth * 1.5);

          totalLogL += Math.log(Math.max(lDensity, 1e-12));
          totalLogG += Math.log(Math.max(gDensity, 1e-12));
        } else {
          // Categorical dimension
          const choices = v.choices || [];
          const goodChoices = goodTrials.map(t => String(t.params[v.name]));
          const chosen = this.rng.choice(choices.length ? choices : goodChoices);
          candidate[v.name] = chosen;
        }
      }

      const logRatio = totalLogL - totalLogG;
      if (logRatio > maxRatio || !bestCandidate) {
        maxRatio = logRatio;
        bestCandidate = candidate;
      }
    }

    return bestCandidate!;
  }

  private kdeDensity(x: number, points: number[], bandwidth: number): number {
    if (points.length === 0) return 1.0;
    let sum = 0;
    for (const pt of points) {
      const u = (x - pt) / bandwidth;
      const gaussian = (1.0 / (Math.sqrt(2 * Math.PI) * bandwidth)) * Math.exp(-0.5 * u * u);
      sum += gaussian;
    }
    return sum / points.length;
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
