import { Problem } from '../../types';
import { CandidateParameters } from '../candidate';
import { validateCandidate } from '../candidate/validation';
import { EvaluationAdapter } from '../evaluation/contract';
import { SeededRandom } from '../math/random';
import { completeTrial, createQueuedTrial, startTrial, TrialRecord } from '../runs/trialLifecycle';

export interface DifferentialEvolutionResult {
  trials: TrialRecord[];
  bestFeasibleTrial?: TrialRecord;
}

export interface DifferentialEvolutionOptions {
  populationSize?: number;
  mutationFactor?: number;
  crossoverRate?: number;
}

export class Phase01DifferentialEvolution {
  private readonly random: SeededRandom;
  private readonly populationSize: number;
  private readonly mutationFactor: number;
  private readonly crossoverRate: number;

  constructor(private readonly problem: Problem, seed: number, options: DifferentialEvolutionOptions = {}) {
    this.random = new SeededRandom(seed);
    this.populationSize = options.populationSize ?? Math.max(4, problem.variables.length * 4);
    this.mutationFactor = options.mutationFactor ?? 0.8;
    this.crossoverRate = options.crossoverRate ?? 0.9;
    if (!Number.isInteger(this.populationSize) || this.populationSize < 4) throw new Error('populationSize must be an integer >= 4');
    if (this.mutationFactor <= 0 || this.mutationFactor > 2) throw new Error('mutationFactor must be in (0, 2]');
    if (this.crossoverRate < 0 || this.crossoverRate > 1) throw new Error('crossoverRate must be in [0, 1]');
    if (problem.variables.some(variable => variable.type !== 'continuous' && variable.type !== 'integer')) {
      throw new Error('Phase 01 Differential Evolution supports only continuous and integer variables');
    }
  }

  public async execute(adapter: EvaluationAdapter, runId: string, budget: number): Promise<DifferentialEvolutionResult> {
    if (!Number.isInteger(budget) || budget <= 0) throw new Error('evaluation budget must be a positive integer');
    const trials: TrialRecord[] = [];
    const population: TrialRecord[] = [];
    let bestFeasibleTrial: TrialRecord | undefined;
    const initialCount = Math.min(this.populationSize, budget);

    for (let index = 0; index < initialCount; index += 1) {
      const trial = await this.evaluate(adapter, runId, index + 1, this.randomCandidate());
      trials.push(trial);
      population.push(trial);
      bestFeasibleTrial = this.selectBetter(trial, bestFeasibleTrial);
    }

    let nextTrial = initialCount + 1;
    while (trials.length < budget) {
      for (let targetIndex = 0; targetIndex < population.length && trials.length < budget; targetIndex += 1) {
        const target = population[targetIndex];
        const donorIndexes = this.randomDistinctIndexes(population.length, targetIndex, 3);
        const donorA = population[donorIndexes[0]].candidate;
        const donorB = population[donorIndexes[1]].candidate;
        const donorC = population[donorIndexes[2]].candidate;
        const candidate = this.crossOver(target.candidate, donorA, donorB, donorC);
        const evaluated = await this.evaluate(adapter, runId, nextTrial, candidate);
        nextTrial += 1;
        trials.push(evaluated);
        const selected = this.selectBetter(evaluated, target) === evaluated ? evaluated : target;
        population[targetIndex] = selected;
        bestFeasibleTrial = this.selectBetter(selected, bestFeasibleTrial);
      }
    }

    return { trials, bestFeasibleTrial };
  }

  private randomCandidate(): CandidateParameters {
    const candidate: CandidateParameters = {};
    for (const variable of this.problem.variables) {
      candidate[variable.name] = variable.type === 'integer'
        ? this.random.integer(variable.lowerBound, variable.upperBound)
        : Number(this.random.uniform(variable.lowerBound, variable.upperBound).toPrecision(12));
    }
    return candidate;
  }

  private crossOver(target: CandidateParameters, a: CandidateParameters, b: CandidateParameters, c: CandidateParameters): CandidateParameters {
    const candidate: CandidateParameters = {};
    const forcedVariable = this.random.integer(0, this.problem.variables.length - 1);
    this.problem.variables.forEach((variable, index) => {
      const range = variable.upperBound - variable.lowerBound;
      const proposed = Number(a[variable.name]) + this.mutationFactor * (Number(b[variable.name]) - Number(c[variable.name]));
      const inherited = this.random.next() < this.crossoverRate || index === forcedVariable ? proposed : target[variable.name];
      const bounded = Math.max(variable.lowerBound, Math.min(variable.upperBound, inherited));
      candidate[variable.name] = variable.type === 'integer' ? Math.round(bounded) : Number((bounded + (this.random.next() * range * 0)).toPrecision(12));
    });
    return candidate;
  }

  private async evaluate(adapter: EvaluationAdapter, runId: string, iteration: number, candidate: CandidateParameters): Promise<TrialRecord> {
    const validation = validateCandidate(this.problem.variables, candidate);
    if (!validation.valid) throw new Error(`Generated invalid candidate: ${validation.errors.map(error => error.message).join('; ')}`);
    const running = startTrial(createQueuedTrial(`${runId}-trial-${iteration}`, runId, candidate));
    return completeTrial(running, await adapter.evaluate(candidate), this.problem.constraints);
  }

  private selectBetter(candidate: TrialRecord, current: TrialRecord | undefined): TrialRecord | undefined {
    if (!current) return candidate.feasibility === true ? candidate : undefined;
    if (candidate.feasibility !== current.feasibility) return candidate.feasibility === true ? candidate : current;
    if (candidate.feasibility !== true) return current;
    const objective = this.problem.objectives[0];
    const candidateValue = candidate.objectives[objective.name];
    const currentValue = current.objectives[objective.name];
    return objective.direction === 'minimize'
      ? (candidateValue < currentValue ? candidate : current)
      : (candidateValue > currentValue ? candidate : current);
  }

  private randomDistinctIndexes(size: number, excluded: number, count: number): number[] {
    const available = Array.from({ length: size }, (_, index) => index).filter(index => index !== excluded);
    return this.random.shuffle(available).slice(0, count);
  }
}
