import { 
  Problem, 
  Trial, 
  AuditTrialRecord, 
  ExperimentCheckpoint, 
  ExperimentMetrics, 
  OptimizationResult, 
  AlgorithmType,
  RunStatus 
} from '../../types';
import { UniversalEvaluator } from '../evaluators/evaluator';
import { RandomSearchOptimizer } from '../algorithms/randomSearch';
import { DifferentialEvolutionOptimizer } from '../algorithms/differentialEvolution';
import { TPEOptimizer } from '../algorithms/tpe';
import { BayesianOptimizer } from '../algorithms/bayesianOptimization';
import { NSGA2Optimizer } from '../algorithms/nsga2';
import { AuditTrailManager } from './auditTrail';
import { MetricsEngine } from './metricsEngine';

export interface ExperimentEngineConfig {
  experimentId: string;
  problem: Problem;
  algorithm: AlgorithmType;
  seed: number;
  budget: number;
  algorithmConfig?: Record<string, any>;
  knownOptimum?: number;
}

export class ExperimentEngine {
  private problem: Problem;
  private evaluator: UniversalEvaluator;
  private experimentId: string;
  private algorithm: AlgorithmType;
  private seed: number;
  private budget: number;
  private algorithmConfig: Record<string, any>;
  private knownOptimum?: number;

  private trials: AuditTrialRecord[] = [];
  private status: RunStatus = 'pending';
  private currentStep: number = 0;

  // Algorithm instance references
  private rsOptimizer: RandomSearchOptimizer | null = null;
  private deOptimizer: DifferentialEvolutionOptimizer | null = null;
  private tpeOptimizer: TPEOptimizer | null = null;
  private boOptimizer: BayesianOptimizer | null = null;
  private nsgaOptimizer: NSGA2Optimizer | null = null;

  constructor(config: ExperimentEngineConfig) {
    this.experimentId = config.experimentId;
    this.problem = config.problem;
    this.algorithm = config.algorithm;
    this.seed = config.seed;
    this.budget = config.budget;
    this.algorithmConfig = config.algorithmConfig || {};
    this.knownOptimum = config.knownOptimum;
    this.evaluator = new UniversalEvaluator(config.problem);

    this.initOptimizer();
  }

  private initOptimizer() {
    if (this.algorithm === 'random_search') {
      this.rsOptimizer = new RandomSearchOptimizer(this.problem, this.seed);
    } else if (this.algorithm === 'differential_evolution') {
      this.deOptimizer = new DifferentialEvolutionOptimizer(this.problem, this.seed, this.algorithmConfig);
      this.deOptimizer.initializePopulation(this.trials);
    } else if (this.algorithm === 'tpe') {
      this.tpeOptimizer = new TPEOptimizer(this.problem, this.seed, this.algorithmConfig);
      this.trials.forEach(t => this.tpeOptimizer!.recordTrial(t));
    } else if (this.algorithm === 'bayesian_optimization' || this.algorithm === 'surrogate_active_learning') {
      this.boOptimizer = new BayesianOptimizer(this.problem, this.seed, this.algorithmConfig);
      this.trials.forEach(t => this.boOptimizer!.recordTrial(t));
    } else if (this.algorithm === 'nsga_ii') {
      this.nsgaOptimizer = new NSGA2Optimizer(this.problem, this.seed, this.algorithmConfig);
      this.trials.forEach(t => this.nsgaOptimizer!.recordTrial(t));
    }
  }

  public getStatus(): RunStatus {
    return this.status;
  }

  public getTrials(): AuditTrialRecord[] {
    return [...this.trials];
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public getMetrics(): ExperimentMetrics {
    return MetricsEngine.computeExperimentMetrics(this.trials, this.problem, this.knownOptimum);
  }

  /**
   * Executes a single discrete optimization step
   */
  public async stepOnce(): Promise<AuditTrialRecord> {
    if (this.currentStep >= this.budget) {
      this.status = 'completed';
      throw new Error(`Budget of ${this.budget} evaluations already reached.`);
    }

    this.status = 'running';
    const nextIter = this.currentStep + 1;

    // 1. Generate next parameter candidate
    let candidateParams: Record<string, number | string>;
    let surrogatePred: any = undefined;

    if (this.rsOptimizer) {
      candidateParams = this.rsOptimizer.generateCandidate();
    } else if (this.deOptimizer) {
      candidateParams = this.deOptimizer.generateCandidate();
    } else if (this.tpeOptimizer) {
      candidateParams = this.tpeOptimizer.generateCandidate();
    } else if (this.boOptimizer) {
      const boCandidate = this.boOptimizer.generateCandidate();
      candidateParams = boCandidate.parameters;
      surrogatePred = boCandidate.prediction;
    } else if (this.nsgaOptimizer) {
      candidateParams = this.nsgaOptimizer.generateCandidate();
    } else {
      candidateParams = new RandomSearchOptimizer(this.problem, this.seed + nextIter).generateCandidate();
    }

    // 2. Evaluate with adapter
    const evalResult = await this.evaluator.evaluate(candidateParams);

    // 3. Construct raw trial
    const rawTrial: Trial = {
      id: `trial_${this.experimentId}_${nextIter}`,
      runId: this.experimentId,
      iteration: nextIter,
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

    // 4. Create cryptographically hashed audit trial
    const previousHash = this.trials.length > 0
      ? this.trials[this.trials.length - 1].trialHash
      : AuditTrailManager.GENESIS_HASH;

    const auditTrial = AuditTrailManager.createAuditTrial(rawTrial, previousHash);

    // 5. Update optimizer state memory
    if (this.deOptimizer) this.deOptimizer.updatePopulation(auditTrial);
    if (this.tpeOptimizer) this.tpeOptimizer.recordTrial(auditTrial);
    if (this.boOptimizer) this.boOptimizer.recordTrial(auditTrial);
    if (this.nsgaOptimizer) this.nsgaOptimizer.recordTrial(auditTrial);

    // 6. Commit to trial history
    this.trials.push(auditTrial);
    this.currentStep = this.trials.length;

    if (this.currentStep >= this.budget) {
      this.status = 'completed';
    } else {
      this.status = 'paused';
    }

    return auditTrial;
  }

  /**
   * Runs the engine until budget is met or stopped
   */
  public async runToCompletion(
    onStep?: (trial: AuditTrialRecord, metrics: ExperimentMetrics) => void
  ): Promise<OptimizationResult> {
    this.status = 'running';
    const startTime = performance.now();

    while (this.currentStep < this.budget && (this.status as RunStatus) !== 'stopped') {
      const trial = await this.stepOnce();
      if (onStep) {
        onStep(trial, this.getMetrics());
      }
      await new Promise(r => setTimeout(r, 2));
    }

    this.status = 'completed';
    const totalDurationMs = performance.now() - startTime;
    return this.synthesizeResult(totalDurationMs);
  }

  public pause(): void {
    this.status = 'paused';
  }

  public stop(): void {
    this.status = 'stopped';
  }

  /**
   * Captures an immutable serializable checkpoint of current experiment state
   */
  public createCheckpoint(): ExperimentCheckpoint {
    const latestHash = this.trials.length > 0
      ? this.trials[this.trials.length - 1].trialHash
      : AuditTrailManager.GENESIS_HASH;

    let algorithmInternalState: Record<string, any> | undefined;
    if (this.deOptimizer) algorithmInternalState = this.deOptimizer.getInternalState();
    else if (this.rsOptimizer) algorithmInternalState = this.rsOptimizer.getInternalState();
    else if (this.tpeOptimizer) algorithmInternalState = this.tpeOptimizer.getInternalState();
    else if (this.boOptimizer) algorithmInternalState = this.boOptimizer.getInternalState();
    else if (this.nsgaOptimizer) algorithmInternalState = this.nsgaOptimizer.getInternalState();

    return {
      checkpointId: `chk_${this.experimentId}_step${this.currentStep}_${Date.now()}`,
      experimentId: this.experimentId,
      stepNumber: this.currentStep,
      problemId: this.problem.id,
      problemDefinitionHash: AuditTrailManager.computeProblemHash(this.problem),
      algorithm: this.algorithm,
      seed: this.seed,
      budget: this.budget,
      algorithmConfig: this.algorithmConfig,
      algorithmInternalState,
      trials: [...this.trials],
      latestTrialHash: latestHash,
      metrics: this.getMetrics(),
      createdAt: new Date().toISOString(),
      status: this.status,
    };
  }

  /**
   * Restores an engine instance from an audit checkpoint
   */
  public static restoreFromCheckpoint(
    checkpoint: ExperimentCheckpoint,
    problem: Problem
  ): ExperimentEngine {
    // 1. Verify schema hash
    const currentProblemHash = AuditTrailManager.computeProblemHash(problem);
    if (currentProblemHash !== checkpoint.problemDefinitionHash) {
      console.warn(`Problem hash mismatch: restored ${checkpoint.problemDefinitionHash}, current ${currentProblemHash}`);
    }

    // 2. Verify trial chain integrity
    const chainVerification = AuditTrailManager.verifyTrialChain(checkpoint.trials);
    if (!chainVerification.isValid) {
      throw new Error(`Cannot restore checkpoint: ${chainVerification.error}`);
    }

    // 3. Recreate Engine
    const engine = new ExperimentEngine({
      experimentId: checkpoint.experimentId,
      problem,
      algorithm: checkpoint.algorithm,
      seed: checkpoint.seed,
      budget: checkpoint.budget,
      algorithmConfig: checkpoint.algorithmConfig,
    });

    engine.trials = [...checkpoint.trials];
    engine.currentStep = checkpoint.trials.length;
    engine.status = checkpoint.status === 'completed' ? 'completed' : 'paused';

    // 4. Re-feed optimizer state memory
    if (checkpoint.algorithmInternalState) {
      if (engine.deOptimizer) engine.deOptimizer.restoreInternalState(checkpoint.algorithmInternalState);
      else if (engine.rsOptimizer) engine.rsOptimizer.restoreInternalState(checkpoint.algorithmInternalState);
      else if (engine.tpeOptimizer) engine.tpeOptimizer.restoreInternalState(checkpoint.algorithmInternalState);
      else if (engine.boOptimizer) engine.boOptimizer.restoreInternalState(checkpoint.algorithmInternalState);
      else if (engine.nsgaOptimizer) engine.nsgaOptimizer.restoreInternalState(checkpoint.algorithmInternalState);
    } else {
      engine.initOptimizer();
    }

    return engine;
  }

  /**
   * Verifies and deterministic re-runs trials against expected hash logs
   */
  public static async replayAndVerify(
    checkpoint: ExperimentCheckpoint,
    problem: Problem
  ): Promise<{
    passed: boolean;
    trialsChecked: number;
    discrepancies: string[];
  }> {
    const discrepancies: string[] = [];
    const chainVerification = AuditTrailManager.verifyTrialChain(checkpoint.trials);
    if (!chainVerification.isValid) {
      discrepancies.push(`Chain verification failed: ${chainVerification.error}`);
    }

    // Replay candidate sequence from identical seed
    const replayEngine = new ExperimentEngine({
      experimentId: `replay_${checkpoint.experimentId}`,
      problem,
      algorithm: checkpoint.algorithm,
      seed: checkpoint.seed,
      budget: checkpoint.trials.length,
      algorithmConfig: checkpoint.algorithmConfig,
    });

    for (let i = 0; i < checkpoint.trials.length; i++) {
      const original = checkpoint.trials[i];
      const replayed = await replayEngine.stepOnce();

      // Check parameter match
      for (const [key, val] of Object.entries(original.parameters)) {
        if (replayed.parameters[key] !== val) {
          discrepancies.push(`Parameter divergence at step ${i + 1} (${key}: expected ${val}, got ${replayed.parameters[key]})`);
        }
      }
    }

    return {
      passed: discrepancies.length === 0,
      trialsChecked: checkpoint.trials.length,
      discrepancies,
    };
  }

  private synthesizeResult(totalDurationMs: number): OptimizationResult {
    const primaryObj = this.problem.objectives[0];
    const isMin = primaryObj ? primaryObj.direction === 'minimize' : true;
    const successful = this.trials.filter(t => t.status === 'successful');
    const feasible = successful.filter(t => t.feasible);

    let bestFeasible: AuditTrialRecord | undefined = undefined;
    if (feasible.length > 0 && primaryObj) {
      bestFeasible = [...feasible].sort((a, b) => {
        const valA = a.objectiveValues[primaryObj.name] ?? 0;
        const valB = b.objectiveValues[primaryObj.name] ?? 0;
        return isMin ? valA - valB : valB - valA;
      })[0];
    }

    const convergenceHistory = this.getMetrics().simpleRegret.map((r, idx) => ({
      iteration: idx + 1,
      bestObjective: r,
    }));

    return {
      bestFeasibleSolution: bestFeasible?.parameters,
      bestObjectiveValues: bestFeasible?.objectiveValues,
      totalEvaluations: this.trials.length,
      feasibleEvaluations: feasible.length,
      failedEvaluations: this.trials.length - successful.length,
      terminationReason: this.currentStep >= this.budget ? 'Budget reached' : 'Execution stopped',
      totalDurationMs: Number(totalDurationMs.toFixed(1)),
      convergenceHistory,
    };
  }
}
