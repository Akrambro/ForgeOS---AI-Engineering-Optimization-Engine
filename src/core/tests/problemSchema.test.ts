import assert from 'node:assert/strict';
import { Constraint, Objective, Problem, Variable } from '../../types';
import { assertValidProblem, validateProblem } from '../problem/problemSchema';

const variable = (overrides: Partial<Variable> = {}): Variable => ({
  id: 'temperature',
  name: 'temperature',
  type: 'continuous',
  lowerBound: 0,
  upperBound: 100,
  defaultValue: 20,
  unit: 'degC',
  description: 'Design temperature',
  ...overrides,
});

const objective = (overrides: Partial<Objective> = {}): Objective => ({
  id: 'cost',
  name: 'cost',
  direction: 'minimize',
  unit: 'dimensionless',
  description: 'Scalar objective',
  ...overrides,
});

const constraint = (overrides: Partial<Constraint> = {}): Constraint => ({
  id: 'temperature_limit',
  name: 'temperature_limit',
  operator: '<=',
  threshold: 80,
  unit: 'degC',
  description: 'Maximum temperature',
  ...overrides,
});

const validProblem = (overrides: Partial<Problem> = {}): Problem => ({
  id: 'problem-1',
  name: 'Thermal sizing',
  description: 'A deterministic sizing problem.',
  version: '1.0.0',
  variables: [variable()],
  objectives: [objective()],
  constraints: [constraint()],
  adapter: { type: 'python' },
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
  ...overrides,
});

const valid = validateProblem(validProblem());
assert.equal(valid.valid, true);
assert.deepEqual(valid.errors, []);
assert.doesNotThrow(() => assertValidProblem(validProblem()));

const invalidBounds = validateProblem(validProblem({
  variables: [variable({ lowerBound: 100, upperBound: 0, defaultValue: 50 })],
}));
assert.equal(invalidBounds.valid, false);
assert.ok(invalidBounds.errors.some(error => error.path === 'variables[0].bounds'));

const invalidDefault = validateProblem(validProblem({
  variables: [variable({ defaultValue: 101 })],
}));
assert.ok(invalidDefault.errors.some(error => error.path === 'variables[0].defaultValue'));

const invalidNumber = validateProblem(validProblem({
  variables: [variable({ lowerBound: Number.NaN })],
}));
assert.ok(invalidNumber.errors.some(error => error.path === 'variables[0].lowerBound'));

const invalidPhaseScope = validateProblem(validProblem({
  variables: [variable({ type: 'categorical', choices: ['A', 'B'] })],
  objectives: [objective(), objective({ id: 'cost-2', name: 'mass' })],
  constraints: [constraint({ operator: '==' })],
}));
assert.equal(invalidPhaseScope.valid, false);
assert.ok(invalidPhaseScope.errors.some(error => error.path === 'variables[0].type'));
assert.ok(invalidPhaseScope.errors.some(error => error.path === 'objectives'));
assert.ok(invalidPhaseScope.errors.some(error => error.path === 'constraints[0].operator'));

const duplicateIds = validateProblem(validProblem({
  variables: [variable(), variable({ name: 'pressure' })],
}));
assert.ok(duplicateIds.errors.some(error => error.path === 'variables[1].id'));

assert.throws(() => assertValidProblem(validProblem({ name: '' })), /Invalid problem schema/);

console.log('Problem schema validation tests passed.');
