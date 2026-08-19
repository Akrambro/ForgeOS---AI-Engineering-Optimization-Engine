import { Constraint } from '../../types';
import { CandidateParameters } from '../candidate';
import { EvaluationResult, EvaluationStatus } from '../evaluation/contract';

export type TrialStatus = 'QUEUED' | 'RUNNING' | EvaluationStatus;
export type TrialFeasibility = boolean | 'UNKNOWN';

export interface TrialRecord {
  id: string;
  runId: string;
  candidate: CandidateParameters;
  status: TrialStatus;
  objectives: Record<string, number>;
  constraints: Record<string, number>;
  feasibility: TrialFeasibility;
  durationSeconds: number;
  diagnostics: Record<string, unknown>;
  error?: { code: string; message: string };
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export function createQueuedTrial(id: string, runId: string, candidate: CandidateParameters): TrialRecord {
  return {
    id,
    runId,
    candidate: { ...candidate },
    status: 'QUEUED',
    objectives: {},
    constraints: {},
    feasibility: 'UNKNOWN',
    durationSeconds: 0,
    diagnostics: {},
    queuedAt: new Date().toISOString(),
  };
}

export function startTrial(trial: TrialRecord): TrialRecord {
  if (trial.status !== 'QUEUED') throw new Error(`Cannot start trial in ${trial.status} state`);
  return { ...trial, status: 'RUNNING', startedAt: new Date().toISOString() };
}

export function completeTrial(trial: TrialRecord, result: EvaluationResult, constraints: Constraint[]): TrialRecord {
  if (trial.status !== 'RUNNING') throw new Error(`Cannot complete trial in ${trial.status} state`);
  const feasibility = result.status === 'SUCCEEDED'
    ? classifyFeasibility(result.constraints, constraints)
    : 'UNKNOWN';
  return {
    ...trial,
    status: result.status,
    objectives: { ...result.objectives },
    constraints: { ...result.constraints },
    feasibility,
    durationSeconds: result.durationSeconds,
    diagnostics: { ...result.diagnostics },
    error: result.error,
    completedAt: new Date().toISOString(),
  };
}

export function classifyFeasibility(values: Record<string, number>, constraints: Constraint[]): boolean {
  return constraints.every(constraint => {
    const value = values[constraint.name];
    if (value === undefined || !Number.isFinite(value)) return false;
    if (constraint.operator === '<=') return value <= constraint.threshold;
    if (constraint.operator === '>=') return value >= constraint.threshold;
    throw new Error(`Unsupported Phase 01 constraint operator: ${constraint.operator}`);
  });
}
