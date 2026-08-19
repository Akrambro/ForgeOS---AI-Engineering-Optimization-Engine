import assert from 'node:assert/strict';
import { Constraint } from '../../types';
import { EvaluationResult } from '../evaluation/contract';
import { completeTrial, createQueuedTrial, startTrial } from '../runs/trialLifecycle';

const constraints: Constraint[] = [{ id: 'limit', name: 'limit', operator: '<=', threshold: 10, unit: 'dimensionless', description: 'Limit' }];
const success: EvaluationResult = {
  status: 'SUCCEEDED',
  objectives: { loss: 1 },
  constraints: { limit: 8 },
  feasible: 'UNKNOWN',
  durationSeconds: 0.01,
  diagnostics: { solver_converged: true },
};

const queued = createQueuedTrial('trial-1', 'run-1', { x: 0.5 });
assert.equal(queued.status, 'QUEUED');
const running = startTrial(queued);
assert.equal(running.status, 'RUNNING');
const feasible = completeTrial(running, success, constraints);
assert.equal(feasible.status, 'SUCCEEDED');
assert.equal(feasible.feasibility, true);
assert.deepEqual(feasible.objectives, { loss: 1 });

const infeasible = completeTrial(startTrial(createQueuedTrial('trial-2', 'run-1', { x: 2 })), { ...success, constraints: { limit: 12 } }, constraints);
assert.equal(infeasible.status, 'SUCCEEDED');
assert.equal(infeasible.feasibility, false);

const failed = completeTrial(startTrial(createQueuedTrial('trial-3', 'run-1', { x: 3 })), {
  status: 'FAILED', objectives: {}, constraints: {}, feasible: 'UNKNOWN', durationSeconds: 0.02, diagnostics: {}, error: { code: 'EVALUATOR_FAILED', message: 'failed' },
}, constraints);
assert.equal(failed.status, 'FAILED');
assert.equal(failed.feasibility, 'UNKNOWN');
assert.throws(() => startTrial(running), /Cannot start trial/);
assert.throws(() => completeTrial(queued, success, constraints), /Cannot complete trial/);

console.log('Trial lifecycle tests passed.');
