import { spawn } from 'node:child_process';
import { CandidateParameters } from '../candidate';
import {
  EvaluationAdapter,
  EvaluationResult,
  PythonFunctionAdapterOptions,
} from './contract';

export class PythonFunctionAdapter implements EvaluationAdapter {
  private readonly options: Required<Omit<PythonFunctionAdapterOptions, 'constraintNames'>> & Pick<PythonFunctionAdapterOptions, 'constraintNames'>;

  constructor(options: PythonFunctionAdapterOptions) {
    this.options = {
      timeoutMs: 10_000,
      evaluatorVersion: 'unversioned',
      constraintNames: [],
      ...options,
    };
  }

  public evaluate(candidate: CandidateParameters): Promise<EvaluationResult> {
    const startedAt = performance.now();

    return new Promise(resolve => {
      const child = spawn('python3', [this.options.scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
      });
      let stdout = '';
      let stderr = '';
      let settled = false;
      const finish = (result: EvaluationResult): void => {
        if (settled) return;
        settled = true;
        resolve({
          ...result,
          durationSeconds: Number(((performance.now() - startedAt) / 1000).toFixed(6)),
          diagnostics: {
            ...result.diagnostics,
            evaluatorVersion: this.options.evaluatorVersion,
            stdout,
            stderr,
          },
        });
      };
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        finish(this.failure('TIMEOUT', 'EVALUATOR_TIMEOUT', `Python evaluator exceeded ${this.options.timeoutMs}ms`));
      }, this.options.timeoutMs);

      child.stdout.on('data', chunk => { stdout += String(chunk); });
      child.stderr.on('data', chunk => { stderr += String(chunk); });
      child.on('error', error => {
        clearTimeout(timer);
        finish(this.failure('FAILED', 'EVALUATOR_PROCESS_ERROR', error.message));
      });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        if (settled) return;
        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          finish(this.failure('CANCELLED', 'EVALUATOR_CANCELLED', `Python evaluator stopped by ${signal}`));
          return;
        }
        if (code !== 0) {
          finish(this.failure('FAILED', 'EVALUATOR_FAILED', stderr.trim() || `Python evaluator exited with code ${code}`));
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          const result = this.validateOutput(parsed);
          finish(result);
        } catch (error) {
          finish(this.failure('FAILED', 'INVALID_EVALUATOR_OUTPUT', error instanceof Error ? error.message : String(error)));
        }
      });

      child.stdin.end(JSON.stringify(candidate));
    });
  }

  private validateOutput(output: unknown): EvaluationResult {
    if (!output || typeof output !== 'object') throw new Error('Evaluator output must be a JSON object');
    const record = output as Record<string, unknown>;
    const objectives = this.numericRecord(record.objectives, 'objectives');
    const constraints = this.numericRecord(record.constraints ?? {}, 'constraints');
    for (const name of this.options.objectiveNames) {
      if (!(name in objectives)) throw new Error(`Missing objective '${name}'`);
    }
    for (const name of this.options.constraintNames ?? []) {
      if (!(name in constraints)) throw new Error(`Missing constraint '${name}'`);
    }
    return {
      status: 'SUCCEEDED',
      objectives,
      constraints,
      feasible: 'UNKNOWN',
      durationSeconds: 0,
      diagnostics: typeof record.diagnostics === 'object' && record.diagnostics !== null ? record.diagnostics as Record<string, unknown> : {},
    };
  }

  private numericRecord(value: unknown, label: string): Record<string, number> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
    const result: Record<string, number> = {};
    for (const [name, raw] of Object.entries(value)) {
      if (typeof raw !== 'number' || !Number.isFinite(raw)) throw new Error(`${label}.${name} must be finite`);
      result[name] = raw;
    }
    return result;
  }

  private failure(status: 'FAILED' | 'TIMEOUT' | 'CANCELLED', code: string, message: string): EvaluationResult {
    return {
      status,
      objectives: {},
      constraints: {},
      feasible: 'UNKNOWN',
      durationSeconds: 0,
      diagnostics: {},
      error: { code, message },
    };
  }
}
