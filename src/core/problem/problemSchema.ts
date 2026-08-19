import { Constraint, Objective, Problem, Variable } from '../../types';

export type ProblemSchemaField = 'problem' | 'variable' | 'objective' | 'constraint';

export interface ProblemSchemaError {
  field: ProblemSchemaField;
  path: string;
  message: string;
}

export interface ProblemValidationResult {
  valid: boolean;
  errors: ProblemSchemaError[];
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const requiredText = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;

function validateVariable(variable: Variable, index: number, errors: ProblemSchemaError[]): void {
  const path = `variables[${index}]`;

  if (!requiredText(variable.id)) errors.push({ field: 'variable', path: `${path}.id`, message: 'id is required' });
  if (!requiredText(variable.name)) errors.push({ field: 'variable', path: `${path}.name`, message: 'name is required' });
  if (!['continuous', 'integer'].includes(variable.type)) {
    errors.push({ field: 'variable', path: `${path}.type`, message: 'Phase 01 supports only continuous and integer variables' });
  }
  if (!finite(variable.lowerBound)) errors.push({ field: 'variable', path: `${path}.lowerBound`, message: 'lowerBound must be finite' });
  if (!finite(variable.upperBound)) errors.push({ field: 'variable', path: `${path}.upperBound`, message: 'upperBound must be finite' });
  if (finite(variable.lowerBound) && finite(variable.upperBound) && variable.lowerBound >= variable.upperBound) {
    errors.push({ field: 'variable', path: `${path}.bounds`, message: 'lowerBound must be less than upperBound' });
  }
  if (variable.type === 'integer' && finite(variable.lowerBound) && !Number.isInteger(variable.lowerBound)) {
    errors.push({ field: 'variable', path: `${path}.lowerBound`, message: 'integer variable bounds must be integers' });
  }
  if (variable.type === 'integer' && finite(variable.upperBound) && !Number.isInteger(variable.upperBound)) {
    errors.push({ field: 'variable', path: `${path}.upperBound`, message: 'integer variable bounds must be integers' });
  }
  if (variable.defaultValue !== undefined) {
    if (!finite(variable.defaultValue) || (variable.type === 'integer' && !Number.isInteger(variable.defaultValue))) {
      errors.push({ field: 'variable', path: `${path}.defaultValue`, message: 'defaultValue must be a finite value compatible with the variable type' });
    } else if (finite(variable.lowerBound) && finite(variable.upperBound) && (variable.defaultValue < variable.lowerBound || variable.defaultValue > variable.upperBound)) {
      errors.push({ field: 'variable', path: `${path}.defaultValue`, message: 'defaultValue must be within bounds' });
    }
  }
  if (!requiredText(variable.unit)) errors.push({ field: 'variable', path: `${path}.unit`, message: 'unit is required; use an explicit dimensionless unit when applicable' });
}

function validateObjective(objective: Objective, index: number, errors: ProblemSchemaError[]): void {
  const path = `objectives[${index}]`;
  if (!requiredText(objective.id)) errors.push({ field: 'objective', path: `${path}.id`, message: 'id is required' });
  if (!requiredText(objective.name)) errors.push({ field: 'objective', path: `${path}.name`, message: 'name is required' });
  if (objective.direction !== 'minimize' && objective.direction !== 'maximize') {
    errors.push({ field: 'objective', path: `${path}.direction`, message: 'direction must be minimize or maximize' });
  }
  if (!requiredText(objective.unit)) errors.push({ field: 'objective', path: `${path}.unit`, message: 'unit is required; use an explicit dimensionless unit when applicable' });
}

function validateConstraint(constraint: Constraint, index: number, errors: ProblemSchemaError[]): void {
  const path = `constraints[${index}]`;
  if (!requiredText(constraint.id)) errors.push({ field: 'constraint', path: `${path}.id`, message: 'id is required' });
  if (!requiredText(constraint.name)) errors.push({ field: 'constraint', path: `${path}.name`, message: 'name is required' });
  if (constraint.operator !== '<=' && constraint.operator !== '>=') {
    errors.push({ field: 'constraint', path: `${path}.operator`, message: 'Phase 01 supports only <= and >= constraints' });
  }
  if (!finite(constraint.threshold)) errors.push({ field: 'constraint', path: `${path}.threshold`, message: 'threshold must be finite' });
  if (!requiredText(constraint.unit)) errors.push({ field: 'constraint', path: `${path}.unit`, message: 'unit is required; use an explicit dimensionless unit when applicable' });
}

function validateUniqueIds(items: Array<{ id: string }>, field: ProblemSchemaField, path: string, errors: ProblemSchemaError[]): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (!item.id || seen.has(item.id)) {
      errors.push({ field, path: `${path}[${index}].id`, message: 'id must be unique within its collection' });
    }
    seen.add(item.id);
  });
}

export function validateProblem(problem: Problem): ProblemValidationResult {
  const errors: ProblemSchemaError[] = [];

  if (!problem || typeof problem !== 'object') {
    return { valid: false, errors: [{ field: 'problem', path: 'problem', message: 'problem is required' }] };
  }
  if (!requiredText(problem.id)) errors.push({ field: 'problem', path: 'id', message: 'id is required' });
  if (!requiredText(problem.name)) errors.push({ field: 'problem', path: 'name', message: 'name is required' });
  if (!requiredText(problem.description)) errors.push({ field: 'problem', path: 'description', message: 'description is required' });
  if (!requiredText(problem.version)) errors.push({ field: 'problem', path: 'version', message: 'version is required' });
  if (!Array.isArray(problem.variables) || problem.variables.length === 0) {
    errors.push({ field: 'problem', path: 'variables', message: 'at least one variable is required' });
  } else {
    problem.variables.forEach((variable, index) => validateVariable(variable, index, errors));
    validateUniqueIds(problem.variables, 'variable', 'variables', errors);
    const names = new Set<string>();
    problem.variables.forEach((variable, index) => {
      if (names.has(variable.name)) errors.push({ field: 'variable', path: `variables[${index}].name`, message: 'name must be unique within the problem' });
      names.add(variable.name);
    });
  }
  if (!Array.isArray(problem.objectives) || problem.objectives.length !== 1) {
    errors.push({ field: 'problem', path: 'objectives', message: 'Phase 01 requires exactly one objective' });
  } else {
    validateObjective(problem.objectives[0], 0, errors);
    validateUniqueIds(problem.objectives, 'objective', 'objectives', errors);
  }
  if (!Array.isArray(problem.constraints)) {
    errors.push({ field: 'problem', path: 'constraints', message: 'constraints must be an array' });
  } else {
    problem.constraints.forEach((constraint, index) => validateConstraint(constraint, index, errors));
    validateUniqueIds(problem.constraints, 'constraint', 'constraints', errors);
  }
  if (!problem.adapter || !requiredText(problem.adapter.type)) {
    errors.push({ field: 'problem', path: 'adapter.type', message: 'an evaluation adapter type is required' });
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidProblem(problem: Problem): void {
  const result = validateProblem(problem);
  if (!result.valid) {
    const details = result.errors.map(error => `${error.path}: ${error.message}`).join('; ');
    throw new Error(`Invalid problem schema: ${details}`);
  }
}
