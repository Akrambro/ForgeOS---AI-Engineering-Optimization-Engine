import { Problem, Trial, Variable } from '../../types';
import { SeededRandom } from '../math/random';

export interface NSGA2Config {
  populationSize?: number;
  crossoverProb?: number;
  mutationProb?: number;
  etaC?: number; // SBX index
  etaM?: number; // Mutation index
}

export interface Individual {
  parameters: Record<string, number | string>;
  objectiveValues: Record<string, number>;
  constraintValues: Record<string, number>;
  feasible: boolean;
  rank?: number;
  crowdingDistance?: number;
  dominationCount?: number;
  dominatedSet?: Individual[];
}

export class NSGA2Optimizer {
  private problem: Problem;
  private rng: SeededRandom;
  private popSize: number;
  private pC: number;
  private pM: number;
  private etaC: number;
  private etaM: number;
  private population: Individual[] = [];
  private currentGen: number = 0;
  private pendingCandidates: Record<string, number | string>[] = [];

  constructor(problem: Problem, seed: number = 42, config: NSGA2Config = {}) {
    this.problem = problem;
    this.rng = new SeededRandom(seed);
    this.popSize = config.populationSize ?? Math.max(16, Math.min(40, problem.variables.length * 6));
    this.pC = config.crossoverProb ?? 0.9;
    this.pM = config.mutationProb ?? (1.0 / Math.max(problem.variables.length, 1));
    this.etaC = config.etaC ?? 15.0;
    this.etaM = config.etaM ?? 20.0;
  }

  public getPopulation(): Individual[] {
    return this.population;
  }

  public recordTrial(trial: Trial) {
    if (trial.status !== 'successful') return;

    this.population.push({
      parameters: trial.parameters,
      objectiveValues: trial.objectiveValues,
      constraintValues: trial.constraintValues,
      feasible: trial.feasible,
    });
  }

  public generateCandidate(): Record<string, number | string> {
    const vars = this.problem.variables;

    // Check if we have queued offspring from evolutionary operators
    if (this.pendingCandidates.length > 0) {
      return this.pendingCandidates.shift()!;
    }

    // Warm-up initial population
    if (this.population.length < this.popSize) {
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

    // Perform Fast Non-Dominated Sort & Crowding Distance on existing population
    const fronts = this.fastNonDominatedSort(this.population);
    for (const front of fronts) {
      this.assignCrowdingDistance(front);
    }

    // Breed offspring via Tournament Selection, SBX and Polynomial Mutation
    const p1 = this.tournamentSelect(this.population);
    const p2 = this.tournamentSelect(this.population);

    const [child1Params, child2Params] = this.crossoverSBX(p1, p2);
    const mutated1 = this.polynomialMutation(child1Params);
    const mutated2 = this.polynomialMutation(child2Params);

    this.pendingCandidates.push(mutated2);
    return mutated1;
  }

  /**
   * Fast Non-Dominated Sort algorithm (Deb et al., 2002)
   */
  public fastNonDominatedSort(pop: Individual[]): Individual[][] {
    const fronts: Individual[][] = [[]];

    for (const p of pop) {
      p.dominatedSet = [];
      p.dominationCount = 0;

      for (const q of pop) {
        if (this.dominates(p, q)) {
          p.dominatedSet.push(q);
        } else if (this.dominates(q, p)) {
          p.dominationCount++;
        }
      }

      if (p.dominationCount === 0) {
        p.rank = 1;
        fronts[0].push(p);
      }
    }

    let i = 0;
    while (fronts[i] && fronts[i].length > 0) {
      const nextFront: Individual[] = [];
      for (const p of fronts[i]) {
        if (p.dominatedSet) {
          for (const q of p.dominatedSet) {
            q.dominationCount = (q.dominationCount || 1) - 1;
            if (q.dominationCount === 0) {
              q.rank = i + 2;
              nextFront.push(q);
            }
          }
        }
      }
      i++;
      if (nextFront.length > 0) {
        fronts.push(nextFront);
      } else {
        break;
      }
    }

    return fronts;
  }

  /**
   * Checks if individual A Pareto-dominates individual B
   */
  private dominates(a: Individual, b: Individual): boolean {
    // Feasibility constraint-dominance check
    if (a.feasible && !b.feasible) return true;
    if (!a.feasible && b.feasible) return false;
    if (!a.feasible && !b.feasible) {
      // Both infeasible: smaller total violation dominates
      const violA = this.calcTotalViolation(a);
      const violB = this.calcTotalViolation(b);
      return violA < violB;
    }

    // Both feasible: check objectives (assumed minimization)
    let strictlyBetterInAtLeastOne = false;
    for (const obj of this.problem.objectives) {
      const valA = a.objectiveValues[obj.name] ?? 0;
      const valB = b.objectiveValues[obj.name] ?? 0;

      const normA = obj.direction === 'minimize' ? valA : -valA;
      const normB = obj.direction === 'minimize' ? valB : -valB;

      if (normA > normB) {
        return false; // A is worse in this objective
      }
      if (normA < normB) {
        strictlyBetterInAtLeastOne = true;
      }
    }

    return strictlyBetterInAtLeastOne;
  }

  private calcTotalViolation(ind: Individual): number {
    let sum = 0;
    for (const c of this.problem.constraints) {
      const v = ind.constraintValues[c.name];
      if (v === undefined) {
        sum += 1.0;
      } else if (c.operator === '<=' && v > c.threshold) {
        sum += (v - c.threshold);
      } else if (c.operator === '>=' && v < c.threshold) {
        sum += (c.threshold - v);
      }
    }
    return sum;
  }

  /**
   * Assigns Crowding Distance metric to front individuals
   */
  public assignCrowdingDistance(front: Individual[]) {
    const l = front.length;
    if (l === 0) return;

    for (const ind of front) {
      ind.crowdingDistance = 0;
    }

    if (l <= 2) {
      for (const ind of front) {
        ind.crowdingDistance = Infinity;
      }
      return;
    }

    for (const obj of this.problem.objectives) {
      // Sort front by objective m
      front.sort((a, b) => (a.objectiveValues[obj.name] ?? 0) - (b.objectiveValues[obj.name] ?? 0));

      front[0].crowdingDistance = Infinity;
      front[l - 1].crowdingDistance = Infinity;

      const objMin = front[0].objectiveValues[obj.name] ?? 0;
      const objMax = front[l - 1].objectiveValues[obj.name] ?? 0;
      const span = Math.max(objMax - objMin, 1e-6);

      for (let i = 1; i < l - 1; i++) {
        if (front[i].crowdingDistance !== Infinity) {
          const nextVal = front[i + 1].objectiveValues[obj.name] ?? 0;
          const prevVal = front[i - 1].objectiveValues[obj.name] ?? 0;
          front[i].crowdingDistance = (front[i].crowdingDistance || 0) + (nextVal - prevVal) / span;
        }
      }
    }
  }

  /**
   * Binary Tournament Selection (Rank first, then Crowding Distance)
   */
  private tournamentSelect(pop: Individual[]): Individual {
    const i1 = this.rng.integer(0, pop.length - 1);
    const i2 = this.rng.integer(0, pop.length - 1);
    const a = pop[i1];
    const b = pop[i2];

    const rankA = a.rank ?? 999;
    const rankB = b.rank ?? 999;

    if (rankA < rankB) return a;
    if (rankB < rankA) return b;

    const distA = a.crowdingDistance ?? 0;
    const distB = b.crowdingDistance ?? 0;

    return distA >= distB ? a : b;
  }

  /**
   * Simulated Binary Crossover (SBX)
   */
  private crossoverSBX(p1: Individual, p2: Individual): [Record<string, number | string>, Record<string, number | string>] {
    const c1: Record<string, number | string> = {};
    const c2: Record<string, number | string> = {};

    for (const v of this.problem.variables) {
      if (this.rng.next() <= this.pC && (v.type === 'continuous' || v.type === 'integer')) {
        const y1 = Math.min(Number(p1.parameters[v.name]), Number(p2.parameters[v.name]));
        const y2 = Math.max(Number(p1.parameters[v.name]), Number(p2.parameters[v.name]));

        if (Math.abs(y1 - y2) > 1e-6) {
          const rand = this.rng.next();
          let betaQ = 1.0;
          if (rand <= 0.5) {
            betaQ = Math.pow(2.0 * rand, 1.0 / (this.etaC + 1.0));
          } else {
            betaQ = Math.pow(1.0 / (2.0 * (1.0 - rand)), 1.0 / (this.etaC + 1.0));
          }

          let child1 = 0.5 * ((y1 + y2) - betaQ * (y2 - y1));
          let child2 = 0.5 * ((y1 + y2) + betaQ * (y2 - y1));

          child1 = Math.max(v.lowerBound, Math.min(v.upperBound, child1));
          child2 = Math.max(v.lowerBound, Math.min(v.upperBound, child2));

          c1[v.name] = v.type === 'integer' ? Math.round(child1) : Number(child1.toFixed(5));
          c2[v.name] = v.type === 'integer' ? Math.round(child2) : Number(child2.toFixed(5));
        } else {
          c1[v.name] = p1.parameters[v.name];
          c2[v.name] = p2.parameters[v.name];
        }
      } else {
        c1[v.name] = p1.parameters[v.name];
        c2[v.name] = p2.parameters[v.name];
      }
    }

    return [c1, c2];
  }

  /**
   * Polynomial Mutation Operator
   */
  private polynomialMutation(params: Record<string, number | string>): Record<string, number | string> {
    const mutated = { ...params };

    for (const v of this.problem.variables) {
      if (this.rng.next() <= this.pM) {
        if (v.type === 'categorical' && v.choices?.length) {
          mutated[v.name] = this.rng.choice(v.choices);
        } else if (v.type === 'discrete' && v.discreteValues?.length) {
          mutated[v.name] = this.rng.choice(v.discreteValues);
        } else if (v.type === 'continuous' || v.type === 'integer') {
          const y = Number(params[v.name]);
          const yl = v.lowerBound;
          const yu = v.upperBound;
          const delta1 = (y - yl) / (yu - yl);
          const delta2 = (yu - y) / (yu - yl);
          const rand = this.rng.next();
          const mutPow = 1.0 / (this.etaM + 1.0);

          let deltaQ = 0.0;
          if (rand <= 0.5) {
            const xy = 1.0 - delta1;
            const val = 2.0 * rand + (1.0 - 2.0 * rand) * Math.pow(xy, this.etaM + 1.0);
            deltaQ = Math.pow(val, mutPow) - 1.0;
          } else {
            const xy = 1.0 - delta2;
            const val = 2.0 * (1.0 - rand) + 2.0 * (rand - 0.5) * Math.pow(xy, this.etaM + 1.0);
            deltaQ = 1.0 - Math.pow(val, mutPow);
          }

          let newY = y + deltaQ * (yu - yl);
          newY = Math.max(yl, Math.min(yu, newY));

          mutated[v.name] = v.type === 'integer' ? Math.round(newY) : Number(newY.toFixed(5));
        }
      }
    }

    return mutated;
  }

  public getInternalState(): Record<string, any> {
    return {
      rngState: this.rng.getState(),
      population: JSON.parse(JSON.stringify(this.population)),
      currentGen: this.currentGen,
      pendingCandidates: JSON.parse(JSON.stringify(this.pendingCandidates)),
    };
  }

  public restoreInternalState(state: Record<string, any>): void {
    if (state.rngState !== undefined) {
      this.rng.setState(state.rngState);
    }
    if (state.population) {
      this.population = JSON.parse(JSON.stringify(state.population));
    }
    if (state.currentGen !== undefined) {
      this.currentGen = state.currentGen;
    }
    if (state.pendingCandidates) {
      this.pendingCandidates = JSON.parse(JSON.stringify(state.pendingCandidates));
    }
  }
}
