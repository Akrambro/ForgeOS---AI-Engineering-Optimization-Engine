import { CandidateParameters } from '../candidate';

export type EvaluationStatus = 'SUCCEEDED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';

export interface EvaluationResult {
  status: EvaluationStatus;
  objectives: Record<string, number>;
  constraints: Record<string, number>;
  feasible: boolean | 'UNKNOWN';
  durationSeconds: number;
  diagnostics: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
}

export interface EvaluationAdapter {
  evaluate(candidate: CandidateParameters): Promise<EvaluationResult>;
}

export interface PythonFunctionAdapterOptions {
  scriptPath: string;
  objectiveNames: string[];
  constraintNames?: string[];
  timeoutMs?: number;
  evaluatorVersion?: string;
}
