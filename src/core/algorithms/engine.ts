import { 
  Problem, 
  OptimizationRun, 
  Trial, 
  OptimizationResult, 
  AlgorithmType 
} from '../../types';
import { UniversalEvaluator } from '../evaluators/evaluator';
import { RandomSearchOptimizer } from './randomSearch';
import { DifferentialEvolutionOptimizer } from './differentialEvolution';
import { TPEOptimizer } from './tpe';
import { BayesianOptimizer } from './bayesianOptimization';
import { NSGA2Optimizer, Individual } from './nsga2';

export interface RunCallbacks {
  onTrialComplete?: (trial: Trial, progress: number) => void;
  onRunFinished?: (result: OptimizationResult) => void;
  onError?: (error: Error) => void;
}

export class OptimizationEngine {
  private problem: Problem;
  private evaluator: UniversalEvaluator;
  private isAborted: boolean = false;
  private isPaused: boolean = false;

  constructor(problem: Problem) {
    this.problem = problem;
    this.evaluator = new UniversalEvaluator(problem);
  }

  public abort() {
    this.isAborted = true;
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
  }

  /**
   * Executes a complete or continuing optimization run
   */
  public async executeRun(
    runConfig: {
      id: string;
      algorithm: AlgorithmType;
      seed: number;
      budget: number;
      algorithmConfig?: Record<string, any>;
      existingTrials?: Trial[];
    },
    callbacks?: RunCallbacks
  ): Promise<OptimizationResult> {
    const startTime = performance.now();
    this.isAborted = false;
    this.isPaused = false;

    const trials: Trial[] = [...(runConfig.existingTrials || [])];
    const seed = runConfig.seed ?? 42;
    const budget = runConfig.budget ?? 30;
    const algorithm = runConfig.algorithm;

    // Instantiate appropriate algorithm wrapper
    let rs: RandomSearchOptimizer | null = null;
    let de: DifferentialEvolutionOptimizer | null = null;
    let tpe: TPEOptimizer | null = null;
    let bo: BayesianOptimizer | null = null;
    let nsga: NSGA2Optimizer | null = null;

    if (algorithm === 'random_search') {
      rs = new RandomSearchOptimizer(this.problem, seed);
    } else if (algorithm === 'differential_evolution') {
      de = new DifferentialEvolutionOptimizer(this.problem, seed, runConfig.algorithmConfig);
      de.initializePopulation(trials);
    } else if (algorithm === 'tpe') {
      tpe = new TPEOptimizer(this.problem, seed, runConfig.algorithmConfig);
      trials.forEach(t => tpe!.recordTrial(t));
    } else if (algorithm === 'bayesian_optimization' || algorithm === 'surrogate_active_learning') {
      bo = new BayesianOptimizer(this.problem, seed, runConfig.algorithmConfig);
      trials.forEach(t => bo!.recordTrial(t));
    } else if (algorithm === 'nsga_ii') {
      nsga = new NSGA2Optimizer(this.problem, seed, runConfig.algorithmConfig);
      trials.forEach(t => nsga!.recordTrial(t));
    }

    const primaryObj = this.problem.objectives[0];
    const isMin = primaryObj ? primaryObj.direction === 'minimize' : true;

    // Execution Loop
    while (trials.length < budget && !this.isAborted) {
      if (this.isPaused) {
        await new Promise(r => setTimeout(r, 100));
        continue;
      }

      const iter = trials.length + 1;
      let candidateParams: Record<string, number | string>;
      let surrogatePred: any = undefined;

      // 1. Generate next candidate from optimizer
      if (rs) {
        candidateParams = rs.generateCandidate();
      } else if (de) {
        candidateParams = de.generateCandidate();
      } else if (tpe) {
        candidateParams = tpe.generateCandidate();
      } else if (bo) {
        const boGen = bo.generateCandidate();
        candidateParams = boGen.parameters;
        surrogatePred = boGen.prediction;
      } else if (nsga) {
        candidateParams = nsga.generateCandidate();
      } else {
        candidateParams = new RandomSearchOptimizer(this.problem, seed + iter).generateCandidate();
      }

      // 2. Evaluate candidate with Evaluation Adapter
      const evalResult = await this.evaluator.evaluate(candidateParams);

      const trial: Trial = {
        id: `trial_${runConfig.id}_${iter}`,
        runId: runConfig.id,
        iteration: iter,
        parameters: candidateParams,
        objectiveValues: evalResult.objectiveValues,
        constraintValues: evalResult.constraintValues,
        feasible: evalResult.feasible,
        evaluationDurationMs: evalResult.durationMs,
        status: evalResult.status,
        error: evalResult.error,
        timestamp: new Date().toISOString(),
        surrogatePrediction: surrogatePred,
      };

      // 3. Update optimizer memory
      if (de) de.updatePopulation(trial);
      if (tpe) tpe.recordTrial(trial);
      if (bo) bo.recordTrial(trial);
      if (nsga) nsga.recordTrial(trial);

      trials.push(trial);

      // 4. Progress callback
      const progress = Number((trials.length / budget).toFixed(3));
      if (callbacks?.onTrialComplete) {
        callbacks.onTrialComplete(trial, progress);
      }

      // Yield event loop to allow UI updates and prevent thread starvation
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    // 5. Final Result Synthesis
    const totalDurationMs = performance.now() - startTime;
    const feasibleTrials = trials.filter(t => t.feasible && t.status === 'successful');
    const successfulTrials = trials.filter(t => t.status === 'successful');

    let bestFeasibleTrial: Trial | undefined = undefined;
    if (feasibleTrials.length > 0 && primaryObj) {
      bestFeasibleTrial = [...feasibleTrials].sort((a, b) => {
        const valA = a.objectiveValues[primaryObj.name] ?? 0;
        const valB = b.objectiveValues[primaryObj.name] ?? 0;
        return isMin ? valA - valB : valB - valA;
      })[0];
    }

    // Convergence History
    let bestSoFar = isMin ? Infinity : -Infinity;
    let bestFeasibleSoFar: number | undefined = undefined;
    const convergenceHistory: { iteration: number; bestObjective: number; feasibleBestObjective?: number }[] = [];

    for (const t of successfulTrials) {
      const val = primaryObj ? (t.objectiveValues[primaryObj.name] ?? 0) : 0;
      if (isMin) {
        if (val < bestSoFar) bestSoFar = val;
        if (t.feasible && (bestFeasibleSoFar === undefined || val < bestFeasibleSoFar)) {
          bestFeasibleSoFar = val;
        }
      } else {
        if (val > bestSoFar) bestSoFar = val;
        if (t.feasible && (bestFeasibleSoFar === undefined || val > bestFeasibleSoFar)) {
          bestFeasibleSoFar = val;
        }
      }

      convergenceHistory.push({
        iteration: t.iteration,
        bestObjective: Number(bestSoFar.toFixed(4)),
        feasibleBestObjective: bestFeasibleSoFar !== undefined ? Number(bestFeasibleSoFar.toFixed(4)) : undefined,
      });
    }

    // Compute Pareto Front for multi-objective problems
    let paretoFront: Trial[] = [];
    if (this.problem.objectives.length >= 2) {
      const nsgaHelper = new NSGA2Optimizer(this.problem, seed);
      const pop: Individual[] = successfulTrials.map(t => ({
        parameters: t.parameters,
        objectiveValues: t.objectiveValues,
        constraintValues: t.constraintValues,
        feasible: t.feasible,
      }));

      const fronts = nsgaHelper.fastNonDominatedSort(pop);
      if (fronts.length > 0) {
        const rank1Pop = fronts[0];
        paretoFront = successfulTrials.filter(t => 
          rank1Pop.some(r => JSON.stringify(r.parameters) === JSON.stringify(t.parameters))
        );
      }
    }

    const result: OptimizationResult = {
      bestFeasibleSolution: bestFeasibleTrial?.parameters,
      bestObjectiveValues: bestFeasibleTrial?.objectiveValues,
      paretoFront: paretoFront.length > 0 ? paretoFront : undefined,
      totalEvaluations: trials.length,
      feasibleEvaluations: feasibleTrials.length,
      failedEvaluations: trials.filter(t => t.status !== 'successful').length,
      terminationReason: this.isAborted ? 'User aborted run' : 'Budget reached',
      totalDurationMs: Number(totalDurationMs.toFixed(1)),
      convergenceHistory,
    };

    if (callbacks?.onRunFinished) {
      callbacks.onRunFinished(result);
    }

    return result;
  }
}
