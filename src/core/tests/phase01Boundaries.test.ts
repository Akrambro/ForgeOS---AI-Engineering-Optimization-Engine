import assert from 'node:assert/strict';
import type { CandidateParameters } from '../candidate';
import type { EvaluationLifecycleStatus } from '../evaluation';
import type { PersistenceBoundary } from '../persistence';
import type { RunLifecycleStatus } from '../runs';
import type { ApiBoundary } from '../../../apps/api';

const candidate: CandidateParameters = { x: 0.5 };
const evaluationStatus: EvaluationLifecycleStatus = 'QUEUED';
const runStatus: RunLifecycleStatus = 'PENDING';
const persistence: PersistenceBoundary = { name: 'phase01-local-persistence' };
const api: ApiBoundary = { name: 'phase01-api' };

assert.deepEqual(candidate, { x: 0.5 });
assert.equal(evaluationStatus, 'QUEUED');
assert.equal(runStatus, 'PENDING');
assert.equal(persistence.name, 'phase01-local-persistence');
assert.equal(api.name, 'phase01-api');

console.log('Phase 01 repository boundaries passed.');
