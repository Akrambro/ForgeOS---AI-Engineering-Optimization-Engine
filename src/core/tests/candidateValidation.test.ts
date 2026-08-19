import assert from 'node:assert/strict';
import { Variable } from '../../types';
import { assertValidCandidate, validateCandidate } from '../candidate/validation';

const variables: Variable[] = [
  { id: 'x', name: 'x', type: 'continuous', lowerBound: -1, upperBound: 1, unit: 'dimensionless', description: 'Continuous variable' },
  { id: 'count', name: 'count', type: 'integer', lowerBound: 1, upperBound: 5, unit: 'count', description: 'Integer variable' },
];

assert.equal(validateCandidate(variables, { x: 0.25, count: 3 }).valid, true);
assert.doesNotThrow(() => assertValidCandidate(variables, { x: 0.25, count: 3 }));

const missing = validateCandidate(variables, { x: 0.25 });
assert.ok(missing.errors.some(error => error.path === 'candidate.count'));

const extra = validateCandidate(variables, { x: 0.25, count: 3, pressure: 2 });
assert.ok(extra.errors.some(error => error.path === 'candidate.pressure'));

const nonfinite = validateCandidate(variables, { x: Number.POSITIVE_INFINITY, count: 3 });
assert.ok(nonfinite.errors.some(error => error.path === 'candidate.x'));

const outOfBounds = validateCandidate(variables, { x: 2, count: 3 });
assert.ok(outOfBounds.errors.some(error => error.path === 'candidate.x'));

const nonInteger = validateCandidate(variables, { x: 0.25, count: 2.5 });
assert.ok(nonInteger.errors.some(error => error.path === 'candidate.count'));

assert.throws(() => assertValidCandidate(variables, { x: 0.25 }), /Invalid candidate/);

console.log('Candidate validation tests passed.');
