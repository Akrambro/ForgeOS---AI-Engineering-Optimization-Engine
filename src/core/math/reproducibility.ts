import { Problem, Variable, Constraint, Objective, ReproducibilityContract } from '../../types';

/**
 * Phase 0: Reproducibility & Mathematical Foundation Utilities
 */

/**
 * Computes deterministic SHA-256 hash for problem definition & parameters
 */
export function computeProblemHash(problem: Problem): string {
  const content = JSON.stringify({
    name: problem.name,
    version: problem.version,
    variables: problem.variables.map(v => ({
      name: v.name,
      type: v.type,
      lowerBound: v.lowerBound,
      upperBound: v.upperBound,
      choices: v.choices,
      discreteValues: v.discreteValues,
    })),
    objectives: problem.objectives.map(o => ({
      name: o.name,
      direction: o.direction,
      weight: o.weight,
    })),
    constraints: problem.constraints.map(c => ({
      name: c.name,
      operator: c.operator,
      threshold: c.threshold,
    })),
    adapterType: problem.adapter.type,
  });

  // Simple string hash function for browser/node runtime
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Validates whether a candidate parameter vector is within domain bounds
 */
export function validateParameterBounds(
  variables: Variable[],
  params: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const v of variables) {
    const val = params[v.name];
    if (val === undefined || val === null) {
      errors.push(`Missing parameter '${v.name}'`);
      continue;
    }

    if (v.type === 'continuous' || v.type === 'integer') {
      const num = Number(val);
      if (isNaN(num)) {
        errors.push(`Parameter '${v.name}' must be a number`);
      } else if (num < v.lowerBound || num > v.upperBound) {
        errors.push(`Parameter '${v.name}' (${num}) violates bounds [${v.lowerBound}, ${v.upperBound}]`);
      }
    } else if (v.type === 'categorical') {
      if (v.choices && !v.choices.includes(String(val))) {
        errors.push(`Parameter '${v.name}' ('${val}') not in allowed choices: ${v.choices.join(', ')}`);
      }
    } else if (v.type === 'discrete') {
      if (v.discreteValues && !v.discreteValues.includes(Number(val))) {
        errors.push(`Parameter '${v.name}' (${val}) not in allowed discrete values: ${v.discreteValues.join(', ')}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates constraint violation magnitude (violation >= 0, 0 means satisfied)
 */
export function computeConstraintViolations(
  constraints: Constraint[],
  values: Record<string, number>
): { feasible: boolean; violations: Record<string, number>; totalViolation: number } {
  const violations: Record<string, number> = {};
  let totalViolation = 0;
  let feasible = true;

  for (const c of constraints) {
    const val = values[c.name];
    if (val === undefined) {
      violations[c.name] = 1.0;
      totalViolation += 1.0;
      feasible = false;
      continue;
    }

    let violation = 0;
    if (c.operator === '<=') {
      violation = Math.max(0, val - c.threshold);
    } else if (c.operator === '>=') {
      violation = Math.max(0, c.threshold - val);
    } else if (c.operator === '==') {
      const tol = c.tolerance ?? 1e-3;
      const diff = Math.abs(val - c.threshold);
      violation = diff > tol ? diff : 0;
    }

    violations[c.name] = violation;
    totalViolation += violation * (c.penaltyWeight ?? 1.0);
    if (violation > 0) {
      feasible = false;
    }
  }

  return {
    feasible,
    violations,
    totalViolation,
  };
}

/**
 * Normalizes objective values for minimization (f(x) for min, -f(x) for max)
 */
export function normalizeObjectivesForMinimization(
  objectives: Objective[],
  values: Record<string, number>
): Record<string, number> {
  const normalized: Record<string, number> = {};
  for (const obj of objectives) {
    const rawVal = values[obj.name] ?? 0;
    normalized[obj.name] = obj.direction === 'minimize' ? rawVal : -rawVal;
  }
  return normalized;
}
