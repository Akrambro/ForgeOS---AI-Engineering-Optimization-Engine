import { Problem } from '../../types';
import { MultiObjectiveEngine } from '../multi_objective/multiObjectiveEngine';
import { Candidate, ObjectiveEvaluation, ConvergenceReport, AnomalyEvent, PipelineStageType } from './types';

/**
 * Diagnostic and Convergence engine for autonomous engineering optimization.
 */
export class ConvergenceDiagnosticEngine {
  /**
   * Evaluates multi-criteria convergence criteria over a sliding historical window.
   */
  public static evaluateConvergence(
    problem: Problem,
    history: Candidate[],
    hypervolumeHistory: number[],
    windowSize: number = 5,
    hvTolerance: number = 0.005,
    relTolerance: number = 0.002
  ): ConvergenceReport {
    if (history.length < windowSize) {
      return {
        isConverged: false,
        hypervolumeDelta: 1.0,
        relativeObjectiveChange: 1.0,
        populationDiversity: 1.0,
        feasibleFraction: 1.0,
        stationarityScore: 0.0,
        reason: `Gathering baseline data (${history.length}/${windowSize} window)`
      };
    }

    // 1. Hypervolume change over window
    const currentHV = hypervolumeHistory.length > 0 ? hypervolumeHistory[hypervolumeHistory.length - 1] : 0;
    const pastHV = hypervolumeHistory.length >= windowSize ? hypervolumeHistory[hypervolumeHistory.length - windowSize] : 0;
    const deltaHV = Math.abs(currentHV - pastHV);

    // 2. Relative objective change of best candidate
    const recentCandidates = history.slice(-windowSize);
    const primaryObj = problem.objectives[0];
    const getScore = (c: Candidate) => {
      const obj = c.objectives.find(o => o.name === primaryObj.name);
      return obj ? obj.value : 0;
    };

    const bestRecent = Math.min(...recentCandidates.map(getScore));
    const earliestRecent = getScore(recentCandidates[0]);
    const denominator = Math.max(Math.abs(bestRecent), 1e-6);
    const relObjChange = Math.abs(bestRecent - earliestRecent) / denominator;

    // 3. Population diversity (standard deviation across normalized parameters)
    let totalVar = 0;
    for (const v of problem.variables) {
      const min = v.lowerBound !== undefined ? v.lowerBound : ((v as any).min ?? 0);
      const max = v.upperBound !== undefined ? v.upperBound : ((v as any).max ?? 1);

      if (v.type === 'continuous' || v.type === 'integer') {
        const values = recentCandidates.map(c => {
          const raw = Number(c.parameters[v.name]) || 0;
          return (raw - min) / Math.max(max - min, 1e-6);
        });
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        totalVar += variance;
      }
    }
    const diversity = Math.sqrt(totalVar / Math.max(problem.variables.length, 1));

    // 4. Feasibility fraction
    const feasibleCount = recentCandidates.filter(c => c.feasible).length;
    const feasibleFraction = feasibleCount / recentCandidates.length;

    // 5. Stationarity score
    const isHVStationary = deltaHV <= hvTolerance;
    const isObjStationary = relObjChange <= relTolerance;
    const isLowDiversity = diversity < 0.05;
    const stationarityScore = (isHVStationary ? 0.4 : 0) + (isObjStationary ? 0.4 : 0) + (isLowDiversity ? 0.2 : 0);

    const isConverged = (isHVStationary || isObjStationary) && feasibleFraction >= 0.8;

    let reason = 'Active optimization in progress';
    if (isConverged) {
      reason = `Stationary convergence reached: ΔHV=${deltaHV.toFixed(4)} (tol=${hvTolerance}), Δf_rel=${relObjChange.toFixed(4)} (tol=${relTolerance})`;
    }

    return {
      isConverged,
      hypervolumeDelta: deltaHV,
      relativeObjectiveChange: relObjChange,
      populationDiversity: diversity,
      feasibleFraction,
      stationarityScore,
      reason
    };
  }

  /**
   * Inspects a candidate evaluation for physical anomalies, simulator crashes, or out-of-bounds metrics.
   */
  public static detectAnomaly(
    stage: PipelineStageType,
    iteration: number,
    candidate: Candidate
  ): AnomalyEvent | null {
    // Check for NaN or Inf in objective values
    for (const obj of candidate.objectives) {
      if (isNaN(obj.value) || !isFinite(obj.value)) {
        return {
          id: `anomaly-${iteration}-${Date.now()}`,
          stage,
          iteration,
          timestamp: Date.now(),
          type: 'NAN_GRADIENT',
          description: `Objective '${obj.name}' produced non-finite value: ${obj.value}`,
          recoveryAction: 'Clamp evaluation to worst-case penalty bound and jitter parameters',
          resolved: false,
        };
      }
    }

    // Check for extreme constraint violation magnitude
    if (!candidate.feasible && candidate.constraintViolations && candidate.constraintViolations.length > 0) {
      const maxViolation = Math.max(...candidate.constraintViolations.map(c => c.violationAmount));
      if (maxViolation > 1e4) {
        return {
          id: `anomaly-${iteration}-${Date.now()}`,
          stage,
          iteration,
          timestamp: Date.now(),
          type: 'CONSTRAINT_VIOLATION',
          description: `Severe constraint boundary violation: amount = ${maxViolation.toFixed(2)}`,
          recoveryAction: 'Apply exponential penalty contraction and contract active search box',
          resolved: false,
        };
      }
    }

    return null;
  }

  /**
   * Applies automated recovery procedures for detected anomalies.
   */
  public static applyRecovery(
    anomaly: AnomalyEvent,
    candidate: Candidate,
    problem: Problem
  ): { candidate: Candidate; adjustedNugget?: number } {
    const fixedCandidate = { ...candidate };

    if (anomaly.type === 'NAN_GRADIENT') {
      fixedCandidate.objectives = fixedCandidate.objectives.map(o => ({
        ...o,
        value: isNaN(o.value) || !isFinite(o.value) ? 1e6 : o.value,
      }));
      fixedCandidate.feasible = false;
      anomaly.resolved = true;
      return { candidate: fixedCandidate, adjustedNugget: 1e-3 };
    }

    if (anomaly.type === 'CONSTRAINT_VIOLATION') {
      fixedCandidate.feasible = false;
      anomaly.resolved = true;
      return { candidate: fixedCandidate };
    }

    if (anomaly.type === 'SURROGATE_ILL_CONDITIONED') {
      anomaly.resolved = true;
      return { candidate: fixedCandidate, adjustedNugget: 1e-2 };
    }

    anomaly.resolved = true;
    return { candidate: fixedCandidate };
  }
}
