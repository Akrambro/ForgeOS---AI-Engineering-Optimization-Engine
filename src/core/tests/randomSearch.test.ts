import assert from 'node:assert/strict';
import { Problem } from '../../types';
import { EvaluationAdapter } from '../evaluation/contract';
import { Phase01RandomSearch } from '../optimization/randomSearch';

const problem: Problem = {
  id: 'sphere', name: 'Sphere', description: 'Test problem', version: '1.0.0',
  variables: [
    { id: 'x', name: 'x', type: 'continuous', lowerBound: -5, upperBound: 5, unit: 'dimensionless', description: 'x' },
    { id: 'count', name: 'count', type: 'integer', lowerBound: 1, upperBound: 3, unit: 'count', description: 'count' },
  ],
  objectives: [{ id: 'loss', name: 'loss', direction: 'minimize', unit: 'dimensionless', description: 'loss' }],
  constraints: [], adapter: { type: 'python' }, createdAt: 'now', updatedAt: 'now',
};

const adapter: EvaluationAdapter = {
  async evaluate(candidate) {
    return {
      status: 'SUCCEEDED', objectives: { loss: Number(candidate.x) ** 2 }, constraints: {}, feasible: 'UNKNOWN',
      durationSeconds: 0, diagnostics: {},
    };
  },
};

const first = new Phase01RandomSearch(problem, 42).generateCandidate();
const second = new Phase01RandomSearch(problem, 42).generateCandidate();
assert.deepEqual(first, second);

void (async () => {
  const result = await new Phase01RandomSearch(problem, 42).execute(adapter, 'run-1', 12);
  assert.equal(result.trials.length, 12);
  assert.ok(result.trials.every(trial => trial.status === 'SUCCEEDED'));
  assert.ok(result.bestFeasibleTrial);
  assert.equal(result.bestFeasibleTrial?.feasibility, true);
  await assert.rejects(() => new Phase01RandomSearch(problem, 42).execute(adapter, 'run-2', 0), /positive integer/);

  console.log('Random search tests passed.');
})();
