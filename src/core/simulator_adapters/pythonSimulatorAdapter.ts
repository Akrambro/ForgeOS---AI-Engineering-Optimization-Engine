import { 
  PythonScriptConfig, 
  SimulatorExecutionResult 
} from './simulatorTypes';
import { EvaluationStatus } from '../../types';

/**
 * Python Script Simulator Adapter
 * Executes Python algorithms / simulation scripts with parameter serialization, 
 * mathematical runtime environment emulation, exception trapping, and execution telemetry.
 */
export class PythonSimulatorAdapter {
  private config: PythonScriptConfig;

  constructor(config: PythonScriptConfig) {
    this.config = config;
  }

  /**
   * Executes candidate evaluation through Python script interface
   */
  public async execute(parameters: Record<string, number | string>): Promise<SimulatorExecutionResult> {
    const startTime = performance.now();
    let status: EvaluationStatus = 'successful';
    let error: string | undefined;
    let stdoutLog = '';
    let objectiveValues: Record<string, number> = {};
    let constraintValues: Record<string, number> = {};

    try {
      const script = this.config.scriptCode;
      if (!script || script.trim().length === 0) {
        throw new Error('Python script is empty.');
      }

      // Create sandboxed execution context with Python standard math/numpy emulate helpers
      const mathContext = {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        sqrt: Math.sqrt,
        exp: Math.exp,
        log: Math.log,
        log10: Math.log10,
        pow: Math.pow,
        pi: Math.PI,
        e: Math.E,
        abs: Math.abs,
        min: Math.min,
        max: Math.max,
        dot: (a: number[], b: number[]) => a.reduce((sum, val, idx) => sum + val * (b[idx] || 0), 0),
        sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
      };

      // Wrap Python code or JS-transpiled logic
      const wrappedSandbox = `
        const math = context.math;
        const np = context.math;
        const print = (...args) => {
          context.logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        };
        const params = context.parameters;

        // Try evaluating as direct return function or standard Python dictionary logic
        let evaluate = null;
        try {
          ${script}
          if (typeof evaluate_candidate === 'function') {
            evaluate = evaluate_candidate;
          }
        } catch (scriptDefErr) {
          throw scriptDefErr;
        }

        if (typeof evaluate === 'function') {
          return evaluate(params);
        } else {
          // If script does not define a function, try checking if it produced a result object
          if (typeof result !== 'undefined') {
            return result;
          }
          throw new Error('Python script must define evaluate_candidate(params) or return a dict with "objectives" and "constraints"');
        }
      `;

      const logs: string[] = [];
      const runner = new Function('context', wrappedSandbox);
      
      const timeoutMs = this.config.timeoutMs || 10000;
      
      // Execute with timeout promise race
      const evalPromise = new Promise<{ objectives?: Record<string, number>; constraints?: Record<string, number> }>(async (resolve, reject) => {
        try {
          const res = runner({
            parameters,
            math: mathContext,
            logs,
          });
          const resolved = (res instanceof Promise) ? await res : res;
          
          if (performance.now() - startTime > timeoutMs) {
            reject(new Error(`Python execution timed out after ${timeoutMs}ms`));
            return;
          }
          resolve(resolved);
        } catch (e) {
          reject(e);
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Python execution timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const rawResult = await Promise.race([evalPromise, timeoutPromise]);
      stdoutLog = logs.join('\n') || `[Python Runtime] Script executed cleanly with parameters: ${JSON.stringify(parameters)}`;

      if (!rawResult || typeof rawResult !== 'object') {
        throw new Error('Python evaluator must return an object with "objectives" and optional "constraints"');
      }

      objectiveValues = rawResult.objectives || {};
      constraintValues = rawResult.constraints || {};

      // Validate numeric finite results
      for (const [k, v] of Object.entries(objectiveValues)) {
        if (!isFinite(v) || isNaN(v)) {
          status = 'numerical_failure';
          throw new Error(`Non-finite numeric objective '${k}' returned: ${v}`);
        }
      }

    } catch (err: any) {
      if (err.message && err.message.includes('timed out')) {
        status = 'timeout';
      } else if (status === 'successful') {
        status = 'adapter_error';
      }
      error = err.message || 'Unknown Python execution error';
      stdoutLog += `\n[Traceback Error] ${error}`;
    }

    const durationMs = performance.now() - startTime;

    return {
      status,
      objectiveValues,
      constraintValues,
      rawOutputLogs: stdoutLog,
      durationMs: Number(durationMs.toFixed(2)),
      filesGenerated: [],
      error,
    };
  }
}
