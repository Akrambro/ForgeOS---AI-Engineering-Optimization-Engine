import { OptimizationRun, Problem, Trial } from '../types';

interface Phase01RemoteRun {
  id: string;
  problemId: string;
  problemVersion: string;
  algorithm: string;
  algorithmConfig: Record<string, unknown>;
  seed: number;
  evaluationBudget: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  trials: Array<{
    id: string;
    runId: string;
    candidate: Record<string, number>;
    status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';
    objectives: Record<string, number>;
    constraints: Record<string, number>;
    feasibility: boolean | 'UNKNOWN';
    durationSeconds: number;
    diagnostics: Record<string, unknown>;
    error?: { code: string; message: string };
    queuedAt: string;
    completedAt?: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

const runStatus: Record<Phase01RemoteRun['status'], OptimizationRun['status']> = {
  PENDING: 'pending', RUNNING: 'running', COMPLETED: 'completed', FAILED: 'failed', CANCELLED: 'stopped',
};

const trialStatus: Record<Phase01RemoteRun['trials'][number]['status'], Trial['status']> = {
  QUEUED: 'failed', RUNNING: 'failed', SUCCEEDED: 'successful', FAILED: 'failed', TIMEOUT: 'timeout', CANCELLED: 'failed',
};

export async function fetchPhase01State(): Promise<{ problems: Problem[]; runs: OptimizationRun[] }> {
  const [problemsResponse, runsResponse] = await Promise.all([
    fetch('/api/phase01/problems'),
    fetch('/api/phase01/runs'),
  ]);
  if (!problemsResponse.ok || !runsResponse.ok) throw new Error('Phase 01 API unavailable');
  const problems = await problemsResponse.json() as Problem[];
  const remoteRuns = await runsResponse.json() as Phase01RemoteRun[];
  return { problems, runs: remoteRuns.map(toOptimizationRun) };
}

function toOptimizationRun(run: Phase01RemoteRun): OptimizationRun {
  const trials: Trial[] = run.trials.map(trial => ({
    id: trial.id,
    runId: trial.runId,
    iteration: Number(trial.id.split('-').pop() || 0),
    parameters: trial.candidate,
    objectiveValues: trial.objectives,
    constraintValues: trial.constraints,
    feasible: trial.feasibility === true,
    evaluationDurationMs: Math.round(trial.durationSeconds * 1000),
    status: trialStatus[trial.status],
    error: trial.error?.message,
    timestamp: trial.completedAt || trial.queuedAt,
  }));
  const successful = trials.filter(trial => trial.status === 'successful');
  const feasible = successful.filter(trial => trial.feasible);
  const objectiveName = feasible[0] ? Object.keys(feasible[0].objectiveValues)[0] : undefined;
  const best = objectiveName ? feasible.reduce((current, trial) => trial.objectiveValues[objectiveName] < current.objectiveValues[objectiveName] ? trial : current, feasible[0]) : undefined;

  return {
    id: run.id,
    problemId: run.problemId,
    problemName: run.problemId,
    algorithm: run.algorithm as OptimizationRun['algorithm'],
    algorithmConfig: run.algorithmConfig,
    seed: run.seed,
    budget: run.evaluationBudget,
    status: runStatus[run.status],
    progress: run.evaluationBudget > 0 ? Math.round((trials.length / run.evaluationBudget) * 100) : 0,
    startedAt: run.createdAt,
    completedAt: run.completedAt,
    currentIteration: trials.length,
    trials,
    result: {
      bestFeasibleSolution: best?.parameters,
      bestObjectiveValues: best?.objectiveValues,
      totalEvaluations: trials.length,
      feasibleEvaluations: feasible.length,
      failedEvaluations: trials.filter(trial => trial.status !== 'successful').length,
      terminationReason: run.status === 'COMPLETED' ? 'budget_exhausted' : run.status.toLowerCase(),
      totalDurationMs: trials.reduce((sum, trial) => sum + trial.evaluationDurationMs, 0),
      convergenceHistory: [],
    },
  };
}
