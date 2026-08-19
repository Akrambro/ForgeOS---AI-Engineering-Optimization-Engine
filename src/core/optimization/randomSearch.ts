import { Problem } from '../../types';
import { CandidateParameters } from '../candidate';
import { validateCandidate } from '../candidate/validation';
import { EvaluationAdapter } from '../evaluation/contract';
import { createQueuedTrial, completeTrial, startTrial, TrialRecord } from '../runs/trialLifecycle';
import { SeededRandom } from '../math/random';

export interface RandomSearchResult {
  trials: TrialRecord[];
  bestFeasibleTrial?: TrialRecord;
}

export class Phase01RandomSearch {
  private readonly random: SeededRandom;

  constructor(private readonly problem: Problem, seed: number) {
    this.random = new SeededRandom(seed);
  }

  public generateCandidate(): CandidateParameters {
    const candidate: CandidateParameters = {};
    for (const variable of this.problem.variables) {
      if (variable.type === 'integer') {
        candidate[variable.name] = this.random.integer(variable.lowerBound, variable.upperBound);
      } else {
        candidate[variable.name] = Number(this.random.uniform(variable.lowerBound, variable.upperBound).toPrecision(12));
      }
    }
    return candidate;
  }

  public async execute(adapter: EvaluationAdapter, runId: string, budget: number): Promise<RandomSearchResult> {
    if (!Number.isInteger(budget) || budget <= 0) throw new Error('evaluation budget must be a positive integer');
    const trials: TrialRecord[] = [];
    let bestFeasibleTrial: TrialRecord | undefined;

    for (let iteration = 0; iteration < budget; iteration += 1) {
      const candidate = this.generateCandidate();
      const validation = validateCandidate(this.problem.variables, candidate);
      if (!validation.valid) throw new Error(`Generated invalid candidate: ${validation.errors.map(error => error.message).join('; ')}`);
      const queued = createQueuedTrial(`${runId}-trial-${iteration + 1}`, runId, candidate);
      const running = startTrial(queued);
      const completed = completeTrial(running, await adapter.evaluate(candidate), this.problem.constraints);
      trials.push(completed);
      if (completed.feasibility === true && this.isBetter(completed, bestFeasibleTrial)) bestFeasibleTrial = completed;
    }

    return { trials, bestFeasibleTrial };
  }

  private isBetter(candidate: TrialRecord, current: TrialRecord | undefined): boolean {
    if (!current) return true;
    const objective = this.problem.objectives[0];
    const candidateValue = candidate.objectives[objective.name];
    const currentValue = current.objectives[objective.name];
    return objective.direction === 'minimize' ? candidateValue < currentValue : candidateValue > currentValue;
  }
}
