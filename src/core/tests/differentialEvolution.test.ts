import assert from 'node:assert/strict';
import { Problem } from '../../types';
import { EvaluationAdapter } from '../evaluation/contract';
import { Phase01DifferentialEvolution } from '../optimization/differentialEvolution';

const problem: Problem = {
  id: 'sphere', name: 'Sphere', description: 'Test problem', version: '1.0.0',
  variables: [
    { id: 'x', name: 'x', type: 'continuous', lowerBound: -5, upperBound: 5, unit: 'dimensionless', description: 'x' },
    { id: 'y', name: 'y', type: 'continuous', lowerBound: -5, upperBound: 5, unit: 'dimensionless', description: 'y' },
  ],
  objectives: [{ id: 'loss', name: 'loss', direction: 'minimize', unit: 'dimensionless', description: 'loss' }],
  constraints: [], adapter: { type: 'python' }, createdAt: 'now', updatedAt: 'now',
};

const adapter: EvaluationAdapter = {
  async evaluate(candidate) {
    return {
      status: 'SUCCEEDED', objectives: { loss: Number(candidate.x) ** 2 + Number(candidate.y) ** 2 }, constraints: {}, feasible: 'UNKNOWN',
      durationSeconds: 0, diagnostics: {},
    };
  },
};

void (async () => {
  const first = await new Phase01DifferentialEvolution(problem, 42, { populationSize: 4 }).execute(adapter, 'run-1', 24);
  const second = await new Phase01DifferentialEvolution(problem, 42, { populationSize: 4 }).execute(adapter, 'run-2', 24);
  assert.equal(first.trials.length, 24);
  assert.ok(first.bestFeasibleTrial);
  assert.deepEqual(first.trials.map(trial => trial.candidate), second.trials.map(trial => trial.candidate));
  assert.ok((first.bestFeasibleTrial?.objectives.loss ?? Infinity) <= (first.trials[0].objectives.loss));
  assert.throws(() => new Phase01DifferentialEvolution(problem, 42, { populationSize: 3 }), /populationSize/);

  console.log('Differential Evolution tests passed.');
})();
