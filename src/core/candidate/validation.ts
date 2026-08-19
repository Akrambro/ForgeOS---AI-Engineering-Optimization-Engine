import { Variable } from '../../types';
import { CandidateParameters } from './index';

export interface CandidateValidationError {
  path: string;
  message: string;
}

export interface CandidateValidationResult {
  valid: boolean;
  errors: CandidateValidationError[];
}

export function validateCandidate(
  variables: Variable[],
  candidate: Record<string, unknown>,
): CandidateValidationResult {
  const errors: CandidateValidationError[] = [];
  const variableNames = new Set(variables.map(variable => variable.name));

  for (const variable of variables) {
    const value = candidate[variable.name];
    const path = `candidate.${variable.name}`;

    if (value === undefined) {
      errors.push({ path, message: 'required parameter is missing' });
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push({ path, message: 'parameter must be a finite number' });
      continue;
    }
    if (variable.type === 'integer' && !Number.isInteger(value)) {
      errors.push({ path, message: 'integer parameter must be an integer' });
    }
    if (value < variable.lowerBound || value > variable.upperBound) {
      errors.push({ path, message: `parameter must be within [${variable.lowerBound}, ${variable.upperBound}]` });
    }
  }

  for (const name of Object.keys(candidate)) {
    if (!variableNames.has(name)) {
      errors.push({ path: `candidate.${name}`, message: 'parameter is not defined by the problem' });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidCandidate(
  variables: Variable[],
  candidate: Record<string, unknown>,
): asserts candidate is CandidateParameters {
  const result = validateCandidate(variables, candidate);
  if (!result.valid) {
    const details = result.errors.map(error => `${error.path}: ${error.message}`).join('; ');
    throw new Error(`Invalid candidate: ${details}`);
  }
}
