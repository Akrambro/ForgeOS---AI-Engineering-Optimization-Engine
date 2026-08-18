import { Problem } from '../../types';

export interface ObjectiveEvaluation {
  name: string;
  value: number;
}

export interface Candidate {
  id: string;
  parameters: Record<string, number | string>;
  objectives: ObjectiveEvaluation[];
  feasible: boolean;
  evaluatedAt: number;
  constraintViolations?: { name: string; violationAmount: number }[];
}

export interface Trial {
  trialId: string;
  experimentId: string;
  iterationNumber: number;
  candidate: Candidate;
  evaluationDurationMs: number;
  timestamp: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PRUNED';
}

export enum PipelineStageType {
  EXPLORATION = 'EXPLORATION',
  SURROGATE_BOOTSTRAP = 'SURROGATE_BOOTSTRAP',
  ACTIVE_LEARNING_EXPLOITATION = 'ACTIVE_LEARNING_EXPLOITATION',
  MULTI_OBJECTIVE_PARETO_REFINEMENT = 'MULTI_OBJECTIVE_PARETO_REFINEMENT',
  CONVERGENCE_ASSESSMENT = 'CONVERGENCE_ASSESSMENT',
  ANOMALY_RECOVERY = 'ANOMALY_RECOVERY',
  DECISION_SYNTHESIS = 'DECISION_SYNTHESIS',
}

export interface StageExecutionResult {
  stage: PipelineStageType;
  startTime: number;
  endTime: number;
  durationMs: number;
  trialsEvaluated: number;
  bestObjectiveScore: number;
  hypervolume?: number;
  message: string;
  success: boolean;
}

export interface AnomalyEvent {
  id: string;
  stage: PipelineStageType;
  iteration: number;
  timestamp: number;
  type: 'SIMULATOR_TIMEOUT' | 'NAN_GRADIENT' | 'CONSTRAINT_VIOLATION' | 'SURROGATE_ILL_CONDITIONED' | 'PREMATURE_STAGNATION';
  description: string;
  recoveryAction: string;
  resolved: boolean;
}

export interface ConvergenceReport {
  isConverged: boolean;
  hypervolumeDelta: number;
  relativeObjectiveChange: number;
  populationDiversity: number;
  feasibleFraction: number;
  stationarityScore: number; // 0 to 1, higher = stationary / converged
  reason: string;
}

export interface ParameterSensitivity {
  parameterName: string;
  firstOrderIndex: number; // 0 to 1
  totalIndex: number;      // 0 to 1
  impactLevel: 'CRITICAL' | 'MODERATE' | 'NEGLIGIBLE';
}

export interface SynthesizedReport {
  id: string;
  timestamp: string;
  problemName: string;
  merkleRootHash: string;
  executiveSummary: string;
  totalIterations: number;
  totalDurationMs: number;
  stagesCompleted: PipelineStageType[];
  recommendedCandidate: Candidate;
  paretoFrontSize: number;
  finalHypervolume: number;
  topsisDecisionScore: number;
  sensitivities: ParameterSensitivity[];
  anomaliesEncountered: AnomalyEvent[];
  engineeringInsights: string[];
  recommendedNextSteps: string[];
  source: 'gemini-3.7-flash' | 'deterministic_engine' | 'fallback_engine';
}

export interface AutonomousPipelineConfig {
  problem: Problem;
  maxTotalEvaluations: number;
  explorationBudget: number;      // e.g. 15 evaluations
  activeLearningBudget: number;   // e.g. 20 evaluations
  paretoRefinementGenerations: number; // e.g. 15 generations
  convergenceWindow: number;      // e.g. 5 iterations
  hypervolumeTolerance: number;   // e.g. 0.005
  relativeObjTolerance: number;   // e.g. 0.002
  enableAutoRecovery: boolean;
  useGeminiSynthesis: boolean;
  seed: number;
}

export interface AutonomousRunState {
  currentStage: PipelineStageType;
  stageHistory: StageExecutionResult[];
  evaluatedTrials: Trial[];
  paretoFront: Candidate[];
  bestCandidate: Candidate | null;
  anomalies: AnomalyEvent[];
  convergenceMetrics: {
    iteration: number;
    hypervolume: number;
    bestObjective: number;
    diversity: number;
  }[];
  isComplete: boolean;
  report: SynthesizedReport | null;
}
