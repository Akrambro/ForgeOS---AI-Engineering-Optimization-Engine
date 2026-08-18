import { Problem, Trial, Variable } from '../../types';
import { SeededRandom } from '../math/random';

export interface DEConfig {
  populationSize?: number;
  mutationFactorF?: number;
  crossoverRateCR?: number;
  strategy?: 'rand/1/bin' | 'best/1/bin';
}

export class DifferentialEvolutionOptimizer {
  private problem: Problem;
  private rng: SeededRandom;
  private populationSize: number;
  private F: number;
  private CR: number;
  private strategy: 'rand/1/bin' | 'best/1/bin';
  private population: { params: Record<string, number | string>; score: number; feasible: boolean }[] = [];
  private currentPopIndex: number = 0;

  constructor(problem: Problem, seed: number = 42, config: DEConfig = {}) {
    this.problem = problem;
    this.rng = new SeededRandom(seed);
    this.populationSize = config.populationSize || Math.max(10, Math.min(30, problem.variables.length * 5));
    this.F = config.mutationFactorF || 0.7;
    this.CR = config.crossoverRateCR || 0.8;
    this.strategy = config.strategy || 'rand/1/bin';
  }

  public initializePopulation(initialTrials: Trial[]) {
    this.population = [];
    const primaryObj = this.problem.objectives[0];
    const isMin = primaryObj ? primaryObj.direction === 'minimize' : true;

    for (const t of initialTrials) {
      if (t.status === 'successful') {
        const objVal = primaryObj ? (t.objectiveValues[primaryObj.name] ?? 1e9) : 0;
        const score = isMin ? objVal : -objVal;
        this.population.push({
          params: t.parameters,
          score: t.feasible ? score : score + 1e6,
          feasible: t.feasible,
        });
      }
    }
  }

  public generateCandidate(): Record<string, number | string> {
    const vars = this.problem.variables;

    // Warm-up phase: generate random individuals if population not yet full
    if (this.population.length < this.populationSize) {
      const p: Record<string, number | string> = {};
      for (const v of vars) {
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

    // Target individual
    const targetIdx = this.currentPopIndex % this.population.length;
    const target = this.population[targetIdx];

    // Select distinct random indices r1, r2, r3 != targetIdx
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = this.rng.integer(0, this.population.length - 1);
      if (idx !== targetIdx && !indices.includes(idx)) {
        indices.push(idx);
      }
    }
    const [r1, r2, r3] = indices;

    // Identify best individual in population
    let bestIdx = 0;
    let bestScore = Infinity;
    for (let i = 0; i < this.population.length; i++) {
      if (this.population[i].score < bestScore) {
        bestScore = this.population[i].score;
        bestIdx = i;
      }
    }

    const baseInd = this.strategy === 'best/1/bin' ? this.population[bestIdx] : this.population[r1];
    const ind2 = this.population[r2];
    const ind3 = this.population[r3];

    // Trial vector via mutation + binomial crossover
    const trialParams: Record<string, number | string> = {};
    const forcedDim = this.rng.integer(0, vars.length - 1);

    for (let j = 0; j < vars.length; j++) {
      const v = vars[j];
      if (this.rng.next() < this.CR || j === forcedDim) {
        if (v.type === 'continuous' || v.type === 'integer') {
          const vBase = Number(baseInd.params[v.name] ?? v.lowerBound);
          const v2 = Number(ind2.params[v.name] ?? v.lowerBound);
          const v3 = Number(ind3.params[v.name] ?? v.lowerBound);

          // Mutant = vBase + F * (v2 - v3)
          let mutant = vBase + this.F * (v2 - v3);

          // Boundary handling (bounce-back reflection)
          if (mutant < v.lowerBound) {
            mutant = v.lowerBound + this.rng.uniform(0, 0.2) * (v.upperBound - v.lowerBound);
          } else if (mutant > v.upperBound) {
            mutant = v.upperBound - this.rng.uniform(0, 0.2) * (v.upperBound - v.lowerBound);
          }

          if (v.type === 'integer') {
            trialParams[v.name] = Math.round(mutant);
          } else {
            trialParams[v.name] = Number(mutant.toFixed(5));
          }
        } else if (v.type === 'discrete' && v.discreteValues?.length) {
          trialParams[v.name] = this.rng.choice(v.discreteValues);
        } else if (v.type === 'categorical' && v.choices?.length) {
          trialParams[v.name] = this.rng.choice(v.choices);
        } else {
          trialParams[v.name] = target.params[v.name];
        }
      } else {
        // Inherit from target vector
        trialParams[v.name] = target.params[v.name];
      }
    }

    this.currentPopIndex++;
    return trialParams;
  }

  public updatePopulation(trial: Trial) {
    this.recordTrial(trial);
  }

  public recordTrial(trial: Trial) {
    if (trial.status !== 'successful') return;

    const primaryObj = this.problem.objectives[0];
    const isMin = primaryObj ? primaryObj.direction === 'minimize' : true;
    const objVal = primaryObj ? (trial.objectiveValues[primaryObj.name] ?? 1e9) : 0;
    const rawScore = isMin ? objVal : -objVal;
    const score = trial.feasible ? rawScore : rawScore + 1e6;

    if (this.population.length < this.populationSize) {
      this.population.push({
        params: trial.parameters,
        score,
        feasible: trial.feasible,
      });
      return;
    }

    // Replace target individual if candidate score is strictly better (elitist selection)
    const targetIdx = (this.currentPopIndex - 1 + this.population.length) % this.population.length;
    const target = this.population[targetIdx];

    if (score < target.score) {
      this.population[targetIdx] = {
        params: trial.parameters,
        score,
        feasible: trial.feasible,
      };
    }
  }

  public getInternalState(): Record<string, any> {
    return {
      rngState: this.rng.getState(),
      population: JSON.parse(JSON.stringify(this.population)),
      currentPopIndex: this.currentPopIndex,
    };
  }

  public restoreInternalState(state: Record<string, any>): void {
    if (state.rngState !== undefined) {
      this.rng.setState(state.rngState);
    }
    if (state.population) {
      this.population = JSON.parse(JSON.stringify(state.population));
    }
    if (state.currentPopIndex !== undefined) {
      this.currentPopIndex = state.currentPopIndex;
    }
  }
}
