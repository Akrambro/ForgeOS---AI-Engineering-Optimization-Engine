import express, { Request, Response, Router } from 'express';
import { Problem } from '../types';
import { validateProblem } from '../core/problem/problemSchema';
import { EvaluationAdapter } from '../core/evaluation/contract';
import { Phase01RandomSearch } from '../core/optimization/randomSearch';
import { Phase01DifferentialEvolution } from '../core/optimization/differentialEvolution';
import { JsonRunRepository, Phase01RunRecord } from '../core/persistence/runRepository';

interface ProblemRequest {
  problem?: Problem;
  evaluatorId?: string;
  [key: string]: unknown;
}

export function createPhase01Api(repository: JsonRunRepository, evaluators: Map<string, EvaluationAdapter>): Router {
  const router = express.Router();

  router.post('/problems', asyncHandler(async (request, response) => {
    const body = request.body as ProblemRequest;
    const problem = body?.problem && typeof body.problem === 'object' ? body.problem : body as unknown as Problem;
    const validation = validateProblem(problem);
    if (!validation.valid) {
      response.status(400).json({ error: 'INVALID_PROBLEM', details: validation.errors });
      return;
    }
    await repository.saveProblem(problem);
    if (body.evaluatorId && !evaluators.has(body.evaluatorId)) {
      response.status(400).json({ error: 'UNKNOWN_EVALUATOR', evaluatorId: body.evaluatorId });
      return;
    }
    response.status(201).json(problem);
  }));

  router.get('/problems', asyncHandler(async (_request, response) => {
    response.json(await listProblems(repository));
  }));

  router.get('/problems/:id', asyncHandler(async (request, response) => {
    const problem = await repository.getProblem(request.params.id);
    if (!problem) { response.status(404).json({ error: 'PROBLEM_NOT_FOUND' }); return; }
    response.json(problem);
  }));

  router.post('/runs', asyncHandler(async (request, response) => {
    const { problemId, evaluatorId, algorithm = 'random_search', algorithmConfig = {}, seed, budget } = request.body || {};
    const problem = await repository.getProblem(problemId);
    const adapter = evaluatorId ? evaluators.get(evaluatorId) : undefined;
    if (!problem) { response.status(404).json({ error: 'PROBLEM_NOT_FOUND' }); return; }
    if (!adapter) { response.status(400).json({ error: 'UNKNOWN_EVALUATOR' }); return; }
    if (!Number.isInteger(seed) || !Number.isInteger(budget) || budget <= 0) {
      response.status(400).json({ error: 'INVALID_RUN_CONFIGURATION', message: 'seed and positive integer budget are required' });
      return;
    }
    if (algorithm !== 'random_search' && algorithm !== 'differential_evolution') {
      response.status(400).json({ error: 'UNSUPPORTED_ALGORITHM', message: 'Phase 01 supports random_search and differential_evolution' });
      return;
    }

    const run: Phase01RunRecord = {
      id: `run_${Date.now()}`,
      problemId: problem.id,
      problemVersion: problem.version,
      algorithm,
      algorithmConfig,
      seed,
      evaluationBudget: budget,
      evaluatorVersion: String(adapter.constructor.name),
      codeVersion: 'phase01',
      status: 'RUNNING',
      trials: [],
      createdAt: new Date().toISOString(),
    };
    await repository.saveRun(run);

    const execution = algorithm === 'random_search'
      ? await new Phase01RandomSearch(problem, seed).execute(adapter, run.id, budget)
      : await new Phase01DifferentialEvolution(problem, seed, algorithmConfig).execute(adapter, run.id, budget);
    for (const trial of execution.trials) await repository.appendTrial(run.id, trial);
    const completedRun = await repository.getRun(run.id);
    const finalRun: Phase01RunRecord = { ...completedRun!, status: 'COMPLETED', completedAt: new Date().toISOString() };
    await repository.saveRun(finalRun);
    response.status(201).json(finalRun);
  }));

  router.get('/runs', asyncHandler(async (_request, response) => {
    response.json(await listRuns(repository));
  }));

  router.get('/runs/:id', asyncHandler(async (request, response) => {
    const run = await repository.getRun(request.params.id);
    if (!run) { response.status(404).json({ error: 'RUN_NOT_FOUND' }); return; }
    response.json(run);
  }));

  router.get('/runs/:id/trials', asyncHandler(async (request, response) => {
    const run = await repository.getRun(request.params.id);
    if (!run) { response.status(404).json({ error: 'RUN_NOT_FOUND' }); return; }
    response.json(run.trials);
  }));

  router.get('/runs/:id/result', asyncHandler(async (request, response) => {
    const run = await repository.getRun(request.params.id);
    if (!run) { response.status(404).json({ error: 'RUN_NOT_FOUND' }); return; }
    const successful = run.trials.filter(trial => trial.status === 'SUCCEEDED');
    const feasible = successful.filter(trial => trial.feasibility === true);
    const objective = feasible[0] && Object.keys(feasible[0].objectives)[0];
    const best = objective ? feasible.reduce((current, trial) => trial.objectives[objective] < current.objectives[objective] ? trial : current, feasible[0]) : undefined;
    response.json({
      runId: run.id,
      attempted: run.trials.length,
      succeeded: successful.length,
      failed: run.trials.filter(trial => trial.status === 'FAILED').length,
      timedOut: run.trials.filter(trial => trial.status === 'TIMEOUT').length,
      bestFeasible: best ? { candidate: best.candidate, objectives: best.objectives } : undefined,
    });
  }));

  return router;
}

async function listProblems(repository: JsonRunRepository): Promise<Problem[]> {
  return repository.listProblems();
}

async function listRuns(repository: JsonRunRepository): Promise<Phase01RunRecord[]> {
  return repository.listRuns();
}

function asyncHandler(handler: (request: Request, response: Response) => Promise<void>) {
  return (request: Request, response: Response, next: (error?: unknown) => void): void => {
    handler(request, response).catch(next);
  };
}
