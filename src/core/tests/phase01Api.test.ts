import assert from 'node:assert/strict';
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPhase01Api } from '../../api/phase01Api';
import { EvaluationAdapter } from '../evaluation/contract';
import { JsonRunRepository } from '../persistence/runRepository';

void (async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forgeos-phase01-api-'));
  const server = createServer();
  try {
  const repository = new JsonRunRepository(join(directory, 'state.json'));
  const evaluators = new Map<string, EvaluationAdapter>([['sphere', {
    async evaluate(candidate) {
      return { status: 'SUCCEEDED', objectives: { loss: Number(candidate.x) ** 2 }, constraints: {}, feasible: 'UNKNOWN', durationSeconds: 0, diagnostics: {} };
    },
  }]]);
  const app = express();
  app.use(express.json());
  app.use('/api/phase01', createPhase01Api(repository, evaluators));
  server.on('request', app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}/api/phase01`;
  const problem = {
    id: 'sphere-api', name: 'Sphere API', description: 'API problem', version: '1.0.0',
    variables: [{ id: 'x', name: 'x', type: 'continuous', lowerBound: -1, upperBound: 1, unit: 'dimensionless', description: 'x' }],
    objectives: [{ id: 'loss', name: 'loss', direction: 'minimize', unit: 'dimensionless', description: 'loss' }],
    constraints: [], adapter: { type: 'python' }, createdAt: 'now', updatedAt: 'now',
  };
  const problemResponse = await fetch(`${baseUrl}/problems`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ problem, evaluatorId: 'sphere' }) });
  assert.equal(problemResponse.status, 201);
  const runResponse = await fetch(`${baseUrl}/runs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ problemId: problem.id, evaluatorId: 'sphere', algorithm: 'random_search', seed: 42, budget: 6 }) });
  assert.equal(runResponse.status, 201);
  const run = await runResponse.json() as { id: string; trials: unknown[] };
  assert.equal(run.trials.length, 6);
  const trialsResponse = await fetch(`${baseUrl}/runs/${run.id}/trials`);
  assert.equal(trialsResponse.status, 200);
  assert.equal((await trialsResponse.json() as unknown[]).length, 6);
  const resultResponse = await fetch(`${baseUrl}/runs/${run.id}/result`);
  assert.equal(resultResponse.status, 200);
  assert.equal((await resultResponse.json() as { attempted: number }).attempted, 6);
  console.log('Phase 01 API lifecycle tests passed.');
  } finally {
    server.close();
    await rm(directory, { recursive: true, force: true });
  }
})();
