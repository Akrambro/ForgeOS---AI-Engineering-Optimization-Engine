import { 
  Problem, 
  EvaluationResult, 
  EvaluationStatus, 
  Constraint 
} from '../../types';
import { evaluateEvThermal } from './evThermalModel';
import { 
  evaluateSphere, 
  evaluateAckley, 
  evaluateRastrigin, 
  evaluateWeldedBeam, 
  evaluateZdt1, 
  evaluateExpensiveAero 
} from './benchmarkFunctions';
import { SimulatorAdapterRegistry } from '../simulator_adapters/simulatorAdapterRegistry';

/**
 * Universal Evaluation Engine adhering to the abstract EvaluationAdapter contract.
 * Guarantees that the optimizer never directly couples to simulator internals.
 */
export class UniversalEvaluator {
  private problem: Problem;

  constructor(problem: Problem) {
    this.problem = problem;
  }

  /**
   * Static evaluation convenience helper.
   */
  public static async evaluate(
    problem: Problem,
    parameters: Record<string, number | string>
  ): Promise<EvaluationResult> {
    return new UniversalEvaluator(problem).evaluate(parameters);
  }

  /**
   * Executes a candidate evaluation and computes objectives, constraints, feasibility, duration.
   */
  public async evaluate(parameters: Record<string, number | string>): Promise<EvaluationResult> {
    const startTime = performance.now();
    let status: EvaluationStatus = 'successful';
    let error: string | undefined;
    let rawObjectives: Record<string, number> = {};
    let rawConstraints: Record<string, number> = {};

    try {
      // 1. Input parameter validation
      for (const variable of this.problem.variables) {
        const val = parameters[variable.name];
        if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) {
          status = 'invalid_input';
          throw new Error(`Missing or invalid parameter '${variable.name}'`);
        }
        if (typeof val === 'number') {
          if (!isFinite(val)) {
            status = 'numerical_failure';
            throw new Error(`Non-finite parameter value for '${variable.name}': ${val}`);
          }
        }
      }

      // 2. Simulated Delay if configured (for expensive simulator experiments)
      if (this.problem.adapter.simulatedDelayMs && this.problem.adapter.simulatedDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.problem.adapter.simulatedDelayMs));
      }

      // 3. Simulated Stochastics / Failures if enabled
      if (this.problem.adapter.failureRate && Math.random() < this.problem.adapter.failureRate) {
        status = 'failed';
        throw new Error('Simulated external simulator crash / convergence failure');
      }

      // 4. Dispatch to appropriate adapter
      if (this.problem.adapter.type === 'ev_thermal') {
        const out = evaluateEvThermal(parameters);
        rawObjectives = out.objectives;
        rawConstraints = out.constraints;
      } else if (this.problem.adapter.type === 'builtin') {
        const name = this.problem.adapter.builtinName || 'sphere';
        if (name === 'sphere') {
          const out = evaluateSphere(parameters);
          rawObjectives = out.objectives;
          rawConstraints = out.constraints;
        } else if (name === 'ackley') {
          const out = evaluateAckley(parameters);
          rawObjectives = out.objectives;
          rawConstraints = out.constraints;
        } else if (name === 'rastrigin') {
          const out = evaluateRastrigin(parameters);
          rawObjectives = out.objectives;
          rawConstraints = out.constraints;
        } else if (name === 'welded_beam') {
          const out = evaluateWeldedBeam(parameters);
          rawObjectives = out.objectives;
          rawConstraints = out.constraints;
        } else if (name === 'zdt1') {
          const out = evaluateZdt1(parameters);
          rawObjectives = out.objectives;
          rawConstraints = out.constraints;
        } else if (name === 'expensive_aero') {
          const out = evaluateExpensiveAero(parameters);
          rawObjectives = out.objectives;
          rawConstraints = out.constraints;
        } else {
          const out = evaluateSphere(parameters);
          rawObjectives = out.objectives;
          rawConstraints = out.constraints;
        }
      } else if (
        this.problem.adapter.type === 'python' || 
        this.problem.adapter.type === 'command' ||
        this.problem.adapter.type === 'cli' ||
        this.problem.adapter.type === 'file_io' ||
        this.problem.adapter.type === 'cfd' ||
        this.problem.adapter.type === 'fea' ||
        this.problem.adapter.type === 'matlab'
      ) {
        const simRes = await SimulatorAdapterRegistry.evaluate(this.problem, parameters);
        rawObjectives = simRes.objectiveValues;
        rawConstraints = simRes.constraintValues;
        status = simRes.status;
        if (simRes.error) {
          error = simRes.error;
        }
      }

      // Check for NaN or Infinity in outputs
      for (const [k, v] of Object.entries(rawObjectives)) {
        if (!isFinite(v) || isNaN(v)) {
          status = 'numerical_failure';
          throw new Error(`Non-finite objective value returned for '${k}': ${v}`);
        }
      }

    } catch (e: any) {
      if (status === 'successful') status = 'failed';
      error = e.message || 'Unknown evaluation failure';
    }

    // 5. Evaluate Constraints & Feasibility
    const isFeasible = this.checkFeasibility(rawConstraints, this.problem.constraints);
    if (!isFeasible && status === 'successful') {
      // Note: constraint violation is still a valid evaluated point in history, but marked not feasible
    }

    const durationMs = performance.now() - startTime;

    return {
      objectiveValues: rawObjectives,
      constraintValues: rawConstraints,
      feasible: isFeasible && status === 'successful',
      durationMs: Number(durationMs.toFixed(2)),
      status,
      error,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  private checkFeasibility(
    constraintValues: Record<string, number>, 
    constraints: Constraint[]
  ): boolean {
    if (!constraints || constraints.length === 0) return true;

    for (const c of constraints) {
      const val = constraintValues[c.name];
      if (val === undefined) continue;

      if (c.operator === '<=') {
        if (val > c.threshold + 1e-6) return false;
      } else if (c.operator === '>=') {
        if (val < c.threshold - 1e-6) return false;
      } else if (c.operator === '==') {
        const tol = c.tolerance ?? 1e-3;
        if (Math.abs(val - c.threshold) > tol) return false;
      }
    }
    return true;
  }
}
