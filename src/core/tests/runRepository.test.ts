import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Problem } from '../../types';
import { JsonRunRepository, Phase01RunRecord } from '../persistence/runRepository';
import { createQueuedTrial } from '../runs/trialLifecycle';

void (async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forgeos-phase01-repository-'));
  try {
  const filePath = join(directory, 'state.json');
  const repository = new JsonRunRepository(filePath);
  const problem: Problem = {
    id: 'problem-1', name: 'Sphere', description: 'Test problem', version: '1.0.0',
    variables: [{ id: 'x', name: 'x', type: 'continuous', lowerBound: -1, upperBound: 1, unit: 'dimensionless', description: 'x' }],
    objectives: [{ id: 'loss', name: 'loss', direction: 'minimize', unit: 'dimensionless', description: 'loss' }],
    constraints: [], adapter: { type: 'python' }, createdAt: 'now', updatedAt: 'now',
  };
  const run: Phase01RunRecord = {
    id: 'run-1', problemId: problem.id, problemVersion: problem.version, algorithm: 'random_search',
    algorithmConfig: {}, seed: 42, evaluationBudget: 3, evaluatorVersion: 'test', codeVersion: 'test',
    status: 'PENDING', trials: [], createdAt: 'now',
  };

  await repository.saveProblem(problem);
  await repository.saveRun(run);
  await repository.appendTrial(run.id, createQueuedTrial('trial-1', run.id, { x: 0.25 }));
  const reloaded = new JsonRunRepository(filePath);
  assert.deepEqual(await reloaded.getProblem(problem.id), problem);
  const persistedRun = await reloaded.getRun(run.id);
  assert.equal(persistedRun?.trials.length, 1);
  assert.deepEqual(persistedRun?.trials[0].candidate, { x: 0.25 });
  assert.match(await readFile(filePath, 'utf8'), /"problemVersion": "1\.0\.0"/);

  await assert.rejects(() => reloaded.appendTrial(run.id, createQueuedTrial('trial-1', run.id, { x: 0.5 })), /already exists/);
    console.log('Run repository tests passed.');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
})();
