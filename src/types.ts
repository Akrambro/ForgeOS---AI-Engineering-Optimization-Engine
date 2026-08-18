export type VariableType = 'continuous' | 'integer' | 'categorical' | 'discrete';

export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  lowerBound: number;
  upperBound: number;
  defaultValue?: number | string;
  choices?: string[]; // for categorical
  discreteValues?: number[]; // for discrete scalar sets
  step?: number;
  unit: string;
  description: string;
}

export type ObjectiveDirection = 'minimize' | 'maximize';

export interface Objective {
  id: string;
  name: string;
  direction: ObjectiveDirection;
  unit: string;
  description: string;
  weight?: number;
  target?: number;
}

export type ConstraintOperator = '<=' | '>=' | '==';

export interface Constraint {
  id: string;
  name: string;
  operator: ConstraintOperator;
  threshold: number;
  unit: string;
  description: string;
  tolerance?: number; // for equality constraints
  penaltyWeight?: number;
}

export interface OptimizationBudget {
  maxEvaluations: number;
  maxWallClockMs?: number;
  maxCost?: number;
}

export interface ReproducibilityContract {
  seed: number;
  algorithm: string;
  algorithmParameters: Record<string, any>;
  problemDefinitionHash: string;
  codeVersion: string;
  datasetVersion?: string;
}

export type AdapterType = 
  | 'python' 
  | 'command' 
  | 'builtin' 
  | 'ev_thermal' 
  | 'cli' 
  | 'file_io' 
  | 'cfd' 
  | 'fea' 
  | 'matlab';

export interface EvaluationAdapterConfig {
  type: AdapterType;
  code?: string;
  commandTemplate?: string;
  builtinName?: string;
  simulatedDelayMs?: number;
  noiseStd?: number;
  failureRate?: number;
}

export interface Problem {
  id: string;
  name: string;
  description: string;
  version: string;
  variables: Variable[];
  objectives: Objective[];
  constraints: Constraint[];
  adapter: EvaluationAdapterConfig;
  category?: 'mechanical' | 'thermal' | 'aerodynamics' | 'benchmark' | 'custom';
  createdAt: string;
  updatedAt: string;
}

export type EvaluationStatus = 
  | 'successful' 
  | 'failed' 
  | 'timeout' 
  | 'constraint_violation' 
  | 'invalid_input' 
  | 'numerical_failure' 
  | 'adapter_error';

export interface EvaluationResult {
  objectiveValues: Record<string, number>;
  constraintValues: Record<string, number>;
  feasible: boolean;
  metadata?: Record<string, any>;
  durationMs: number;
  status: EvaluationStatus;
  error?: string;
}

export type AlgorithmType = 
  | 'random_search' 
  | 'differential_evolution' 
  | 'tpe' 
  | 'bayesian_optimization' 
  | 'nsga_ii' 
  | 'surrogate_active_learning';

export type RunStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';

export interface Trial {
  id: string;
  runId: string;
  iteration: number;
  parameters: Record<string, number | string>;
  objectiveValues: Record<string, number>;
  constraintValues: Record<string, number>;
  feasible: boolean;
  evaluationDurationMs: number;
  status: EvaluationStatus;
  error?: string;
  timestamp: string;
  surrogatePrediction?: {
    mean: Record<string, number>;
    std: Record<string, number>;
    acquisitionValue?: number;
  };
  paretoRank?: number;
  crowdingDistance?: number;
}

export interface OptimizationResult {
  bestFeasibleSolution?: Record<string, number | string>;
  bestObjectiveValues?: Record<string, number>;
  paretoFront?: Trial[];
  totalEvaluations: number;
  feasibleEvaluations: number;
  failedEvaluations: number;
  terminationReason: string;
  totalDurationMs: number;
  convergenceHistory: {
    iteration: number;
    bestObjective: number;
    feasibleBestObjective?: number;
    hypervolume?: number;
  }[];
}

export interface OptimizationRun {
  id: string;
  problemId: string;
  problemName: string;
  algorithm: AlgorithmType;
  algorithmConfig: Record<string, any>;
  seed: number;
  budget: number;
  status: RunStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  currentIteration: number;
  trials: Trial[];
  result?: OptimizationResult;
}

export interface AlgorithmRecommendation {
  recommendedAlgorithm: AlgorithmType;
  confidence: number;
  reasons: string[];
  alternativeAlgorithm?: AlgorithmType;
  tradeoffAnalysis: string;
}

export interface GaussianProcessModel {
  mean: number;
  variance: number;
  kernel: 'rbf' | 'matern52';
  lengthScale: number[];
  noiseVariance: number;
  trainingPointsCount: number;
  rmse: number;
  r2Score: number;
}

export interface ActiveLearningIteration {
  iteration: number;
  candidate: Record<string, number>;
  prediction: number;
  uncertainty: number;
  acquisitionScore: number;
  actualResult?: number;
  predictionError?: number;
}

export interface AuditTrialRecord extends Trial {
  trialHash: string;
  previousTrialHash: string;
  merkleRoot?: string;
  executionTimestamp: number;
}

export interface ExperimentMetrics {
  simpleRegret: number[];
  cumulativeRegret: number[];
  hypervolumeTrajectory?: number[];
  feasibilityRatioTrajectory: number[];
  averageConstraintViolation: number[];
  parameterDiversityIndex: number[];
  currentBestValue?: number;
  currentBestFeasibleValue?: number;
  evaluationsToReachOptimum?: number;
}

export interface ExperimentCheckpoint {
  checkpointId: string;
  experimentId: string;
  stepNumber: number;
  problemId: string;
  problemDefinitionHash: string;
  algorithm: AlgorithmType;
  seed: number;
  budget: number;
  algorithmConfig: Record<string, any>;
  algorithmInternalState?: Record<string, any>;
  trials: AuditTrialRecord[];
  latestTrialHash: string;
  metrics: ExperimentMetrics;
  createdAt: string;
  status: RunStatus;
}

export interface RunDiffReport {
  runAId: string;
  runBId: string;
  algorithmA: string;
  algorithmB: string;
  evaluationsA: number;
  evaluationsB: number;
  bestObjectiveA?: number;
  bestObjectiveB?: number;
  objectiveImprovementDelta: number;
  feasibleRateA: number;
  feasibleRateB: number;
  parameterSpreadDiff: Record<string, { minA: number; maxA: number; minB: number; maxB: number }>;
  fasterConvergenceWinner: 'A' | 'B' | 'TIED';
  hypervolumeDelta?: number;
}

export interface BenchmarkReport {
  benchmarkId: string;
  benchmarkName: string;
  description: string;
  knownOptimum?: {
    parameters: Record<string, number>;
    objectives: Record<string, number>;
  };
  results: {
    algorithm: AlgorithmType;
    algorithmName: string;
    seed: number;
    budget: number;
    evaluationsCompleted: number;
    bestObjective: number;
    bestFeasibleObjective?: number;
    constraintViolations: number;
    executionTimeMs: number;
    convergenceRate: number; // iterations to reach 95% of optimum
    surrogateRmse?: number;
    hypervolume?: number;
    successRate: number;
  }[];
}

// ==========================================
// PHASE 7: HUMAN-IN-THE-LOOP & EXPERT STEERING TYPES
// ==========================================

export type ApprovalPolicyType = 
  | 'always' 
  | 'high_risk_uncertainty' 
  | 'cost_gated' 
  | 'periodic_batch' 
  | 'disabled';

export interface ApprovalGateConfig {
  policy: ApprovalPolicyType;
  uncertaintyThreshold?: number; // Normalized sigma > threshold triggers human review (e.g. 0.35)
  feasibilityRiskThreshold?: number; // P(feasible) < threshold triggers human review (e.g. 0.80)
  maxAutoCost?: number; // Cost > max triggers human review
  batchInterval?: number; // e.g. every 5 iterations trigger batch review
  autoApproveSafeCandidates?: boolean;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'modified' | 'evaluated';

export interface CandidateReviewItem {
  id: string;
  candidateIndex: number;
  parameters: Record<string, number | string>;
  originalParameters?: Record<string, number | string>;
  surrogatePrediction?: {
    mean: Record<string, number>;
    std: Record<string, number>;
    probabilityFeasible?: number;
  };
  acquisitionScore?: number;
  estimatedCost?: number;
  estimatedDurationMs?: number;
  riskScore: number; // 0.0 (safe) to 1.0 (critical risk)
  riskFactors: string[];
  status: ReviewStatus;
  reviewNotes?: string;
  reviewerId?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type InterventionActionType = 
  | 'approve' 
  | 'reject' 
  | 'modify' 
  | 'inject_candidate' 
  | 'adjust_constraint' 
  | 'set_roi'
  | 'set_policy';

export interface HumanInterventionLog {
  id: string;
  experimentId: string;
  action: InterventionActionType;
  actor: string;
  timestamp: string;
  details: {
    candidateId?: string;
    originalParams?: Record<string, number | string>;
    modifiedParams?: Record<string, number | string>;
    reason?: string;
    constraintId?: string;
    oldThreshold?: number;
    newThreshold?: number;
    roiBounds?: Record<string, { lower: number; upper: number }>;
    forbiddenRegionId?: string;
    policyConfig?: ApprovalGateConfig;
  };
}

export interface RegionOfInterest {
  variableId: string;
  lowerBound: number;
  upperBound: number;
}

export interface ForbiddenRegion {
  id: string;
  center: Record<string, number>;
  radius: number; // In normalized [0, 1] parameter space
  reason: string;
  createdAt: string;
}

export interface ExpertSteeringState {
  approvalGateConfig: ApprovalGateConfig;
  pendingReviews: CandidateReviewItem[];
  reviewHistory: CandidateReviewItem[];
  interventionLogs: HumanInterventionLog[];
  forbiddenRegions: ForbiddenRegion[];
  activeRegionsOfInterest: Record<string, { lower: number; upper: number }>;
  manuallyInjectedCandidates: Record<string, number | string>[];
}

// ==========================================
// PHASE 8: REINFORCEMENT LEARNING TYPES
// ==========================================

export type RLAlgorithmType = 
  | 'q_learning' 
  | 'dqn' 
  | 'actor_critic' 
  | 'meta_rl';

export type RLEnvironmentType = 
  | 'ev_thermal_dynamic' 
  | 'cstr_chemical_reactor' 
  | 'inverted_pendulum_actuator';

export interface RLStateSpace {
  dim: number;
  labels: string[];
  bounds: { lower: number[]; upper: number[] };
}

export interface RLActionSpace {
  type: 'discrete' | 'continuous';
  dim: number;
  labels: string[];
  discreteCount?: number;
  bounds?: { lower: number[]; upper: number[] };
}

export interface RLStepResult {
  state: number[];
  reward: number;
  done: boolean;
  truncated?: boolean;
  info: Record<string, any>;
}

export interface ExperienceTuple {
  state: number[];
  action: number | number[];
  reward: number;
  nextState: number[];
  done: boolean;
}

export interface RLTrainingConfig {
  algorithm: RLAlgorithmType;
  episodes: number;
  maxStepsPerEpisode: number;
  learningRate: number;
  discountFactorGamma: number;
  explorationEpsilon?: number;
  epsilonMin?: number;
  epsilonDecay?: number;
  batchSize?: number;
  replayBufferSize?: number;
  targetUpdateInterval?: number;
  actorLearningRate?: number;
  criticLearningRate?: number;
  seed?: number;
}

export interface RLTrainingMetrics {
  episode: number;
  totalReward: number;
  episodeLength: number;
  meanLoss: number;
  epsilon?: number;
  metrics: Record<string, number>;
}

export interface RLTrajectoryPoint {
  step: number;
  state: Record<string, number>;
  action: Record<string, number> | number;
  reward: number;
  cumulativeReward: number;
  info?: Record<string, any>;
}

export interface RLPolicyCheckpoint {
  id: string;
  envType: RLEnvironmentType;
  algorithm: RLAlgorithmType;
  weights: any;
  config: RLTrainingConfig;
  trainedEpisodes: number;
  meanReward: number;
  createdAt: string;
}


