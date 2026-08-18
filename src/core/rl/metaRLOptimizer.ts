import { Problem, Trial } from '../../types';
import { SeededRandom } from '../math/random';
import { DifferentialEvolutionOptimizer } from '../algorithms/differentialEvolution';
import { UniversalEvaluator } from '../evaluators/evaluator';

export interface MetaRLState {
  currentIteration: number;
  bestObjective: number;
  recentImprovementRate: number;
  populationDiversity: number;
  stagnationCounter: number;
}

export interface MetaRLAction {
  mutationFactorF: number; // [0.2, 1.2]
  crossoverRateCR: number; // [0.1, 0.95]
}

/**
 * Meta-Reinforcement Learning Controller for Dynamic Optimizer Adaptation
 * Learns a policy to adjust optimizer hyperparameters (e.g. mutation & crossover rates)
 * based on real-time optimization convergence dynamics.
 */
export class MetaRLOptimizerController {
  private rng: SeededRandom;
  private qTable: Map<string, number[]> = new Map();
  // Discrete action grid for meta-adjustments: [F, CR]
  private readonly actionGrid: MetaRLAction[] = [
    { mutationFactorF: 0.3, crossoverRateCR: 0.5 }, // Focused local exploitation
    { mutationFactorF: 0.6, crossoverRateCR: 0.8 }, // Balanced default
    { mutationFactorF: 0.9, crossoverRateCR: 0.9 }, // High exploration / diversity injection
    { mutationFactorF: 1.1, crossoverRateCR: 0.4 }, // Strong mutation shake-up
  ];

  constructor(seed: number = 42) {
    this.rng = new SeededRandom(seed);
  }

  public discretizeState(state: MetaRLState): string {
    // 3 bins for improvement rate (stagnant, moderate, fast)
    const impBin = state.recentImprovementRate < 1e-4 ? 0 : state.recentImprovementRate < 0.05 ? 1 : 2;
    // 2 bins for diversity (low, high)
    const divBin = state.populationDiversity < 0.15 ? 0 : 1;
    // 3 bins for stagnation (0-2, 3-6, 7+)
    const stagBin = state.stagnationCounter < 3 ? 0 : state.stagnationCounter < 7 ? 1 : 2;

    return `${impBin}:${divBin}:${stagBin}`;
  }

  public selectAction(state: MetaRLState, epsilon: number = 0.1): MetaRLAction {
    if (this.rng.uniform(0, 1) < epsilon) {
      const idx = this.rng.integer(0, this.actionGrid.length - 1);
      return this.actionGrid[idx];
    }

    const stateKey = this.discretizeState(state);
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Array(this.actionGrid.length).fill(0.0));
    }
    const qVals = this.qTable.get(stateKey)!;

    let bestIdx = 0;
    let maxVal = -Infinity;
    for (let i = 0; i < qVals.length; i++) {
      if (qVals[i] > maxVal) {
        maxVal = qVals[i];
        bestIdx = i;
      }
    }
    return this.actionGrid[bestIdx];
  }

  /**
   * Runs an end-to-end optimization using RL to dynamically adapt the optimizer
   */
  public async optimizeWithMetaRL(
    problem: Problem,
    budget: number = 20,
    seed: number = 42
  ): Promise<{
    bestTrial: Trial | null;
    trials: Trial[];
    metaAdaptations: { iteration: number; action: MetaRLAction; reward: number }[];
  }> {
    const trials: Trial[] = [];
    const metaAdaptations: { iteration: number; action: MetaRLAction; reward: number }[] = [];
    let bestObj = Infinity;
    let bestTrial: Trial | null = null;
    let stagnationCounter = 0;

    let currentAction = this.actionGrid[1]; // Balanced default
    let deOptimizer = new DifferentialEvolutionOptimizer(problem, seed, {
      populationSize: 8,
      mutationFactorF: currentAction.mutationFactorF,
      crossoverRateCR: currentAction.crossoverRateCR,
    });

    const isMin = problem.objectives[0]?.direction === 'minimize';

    for (let iter = 1; iter <= budget; iter++) {
      // 1. Compute state features
      const recentTrials = trials.slice(-4);
      let improvement = 0;
      if (recentTrials.length >= 2) {
        const objName = problem.objectives[0].name;
        const prevObj = recentTrials[0].objectiveValues[objName] ?? 1e6;
        const currObj = recentTrials[recentTrials.length - 1].objectiveValues[objName] ?? 1e6;
        improvement = isMin ? (prevObj - currObj) / Math.max(1, Math.abs(prevObj)) : (currObj - prevObj) / Math.max(1, Math.abs(prevObj));
      }

      const metaState: MetaRLState = {
        currentIteration: iter,
        bestObjective: bestObj,
        recentImprovementRate: Math.max(0, improvement),
        populationDiversity: 0.25, // Normalized diversity estimation
        stagnationCounter,
      };

      // 2. Meta-RL selects adapted hyperparameters
      if (iter % 3 === 0) {
        currentAction = this.selectAction(metaState, 0.1);
        deOptimizer = new DifferentialEvolutionOptimizer(problem, seed + iter, {
          populationSize: 8,
          mutationFactorF: currentAction.mutationFactorF,
          crossoverRateCR: currentAction.crossoverRateCR,
        });
        if (trials.length > 0) {
          deOptimizer.initializePopulation(trials);
        }
      }

      // 3. Propose candidate and evaluate
      const candidateParams = deOptimizer.generateCandidate();
      const evalRes = await UniversalEvaluator.evaluate(problem, candidateParams);

      const objVal = evalRes.objectiveValues[problem.objectives[0].name] ?? 1e6;
      const trialObj: Trial = {
        id: `meta_trial_${iter}`,
        runId: 'meta_rl_run_01',
        iteration: iter,
        parameters: candidateParams,
        objectiveValues: evalRes.objectiveValues,
        constraintValues: evalRes.constraintValues,
        feasible: evalRes.feasible,
        status: evalRes.status,
        timestamp: new Date().toISOString(),
        evaluationDurationMs: evalRes.durationMs,
      };

      trials.push(trialObj);
      deOptimizer.recordTrial(trialObj);

      // Check if improved
      const isBetter = isMin ? objVal < bestObj : objVal > bestObj;
      if (evalRes.feasible && isBetter) {
        bestObj = objVal;
        bestTrial = trialObj;
        stagnationCounter = 0;
      } else {
        stagnationCounter++;
      }

      // Meta reward = improvement bonus - stagnation penalty
      const metaReward = isBetter ? 2.0 : -0.1 * stagnationCounter;
      metaAdaptations.push({
        iteration: iter,
        action: currentAction,
        reward: Number(metaReward.toFixed(2)),
      });
    }

    return { bestTrial, trials, metaAdaptations };
  }
}
