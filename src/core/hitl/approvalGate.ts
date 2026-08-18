import { 
  ApprovalGateConfig, 
  CandidateReviewItem, 
  Problem, 
  ReviewStatus 
} from '../../types';
import { GaussianProcessRegressor } from '../algorithms/gaussianProcess';
import { ForbiddenRegionManager } from './forbiddenRegionManager';

export interface RiskAssessmentDetails {
  riskScore: number; // [0, 1]
  riskFactors: string[];
  uncertaintyRatio: number;
  probabilityFeasible: number;
  boundaryProximity: number;
  forbiddenRegionProximity: number;
  estimatedCost: number;
  estimatedDurationMs: number;
}

export class HumanApprovalGate {
  private config: ApprovalGateConfig;
  private forbiddenManager: ForbiddenRegionManager;
  private pendingQueue: CandidateReviewItem[] = [];
  private reviewHistory: CandidateReviewItem[] = [];
  private candidateCounter = 0;

  constructor(
    config: ApprovalGateConfig = { policy: 'high_risk_uncertainty', uncertaintyThreshold: 0.35, feasibilityRiskThreshold: 0.80 },
    forbiddenManager?: ForbiddenRegionManager
  ) {
    this.config = { ...config };
    this.forbiddenManager = forbiddenManager || new ForbiddenRegionManager();
  }

  public updateConfig(newConfig: Partial<ApprovalGateConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): ApprovalGateConfig {
    return { ...this.config };
  }

  public getPendingQueue(): CandidateReviewItem[] {
    return [...this.pendingQueue];
  }

  public getReviewHistory(): CandidateReviewItem[] {
    return [...this.reviewHistory];
  }

  public clearQueue(): void {
    this.pendingQueue = [];
  }

  /**
   * Assesses risk for a given candidate parameters vector against problem and optional GP surrogate.
   */
  public assessCandidateRisk(
    candidate: Record<string, number | string>,
    problem: Problem,
    surrogates?: Record<string, GaussianProcessRegressor>,
    estimatedCost: number = 10,
    estimatedDurationMs: number = 100
  ): RiskAssessmentDetails {
    const riskFactors: string[] = [];
    let riskScore = 0.0;

    // 1. Check boundary proximity (within 2.5% of lower/upper bounds)
    let minBoundaryMargin = 1.0;
    for (const v of problem.variables) {
      if (v.type === 'continuous' || v.type === 'integer') {
        const val = Number(candidate[v.name] ?? v.defaultValue ?? v.lowerBound);
        const span = v.upperBound - v.lowerBound;
        if (span > 0) {
          const lowerMargin = (val - v.lowerBound) / span;
          const upperMargin = (v.upperBound - val) / span;
          const margin = Math.min(lowerMargin, upperMargin);
          if (margin < minBoundaryMargin) {
            minBoundaryMargin = margin;
          }
          if (margin <= 0.02) {
            riskFactors.push(`Parameter '${v.name}' operating near physical limit (${val.toFixed(3)} [${v.lowerBound}, ${v.upperBound}])`);
            riskScore += 0.25;
          }
        }
      }
    }

    // 2. Check forbidden region exclusion zones
    const forbiddenCheck = this.forbiddenManager.isForbidden(candidate, problem);
    if (forbiddenCheck.forbidden) {
      riskFactors.push(`Candidate falls inside Human Forbidden Zone: "${forbiddenCheck.violatedRegion?.reason}"`);
      riskScore += 0.60;
    } else if (forbiddenCheck.distanceToClosest < 0.15) {
      riskFactors.push(`Proximity warning: Close to rejected design zone (dist: ${forbiddenCheck.distanceToClosest.toFixed(3)})`);
      riskScore += 0.20;
    }

    // 3. Check Surrogate Model Uncertainty & Constraint Feasibility
    let maxUncertaintyRatio = 0.0;
    let minProbFeasible = 1.0;

    if (surrogates && Object.keys(surrogates).length > 0) {
      for (const [name, gp] of Object.entries(surrogates)) {
        const numericVec: number[] = [];
        for (const v of problem.variables) {
          if (v.type === 'continuous' || v.type === 'integer') {
            numericVec.push(Number(candidate[v.name] ?? v.defaultValue ?? v.lowerBound));
          }
        }

        const pred = gp.predict(numericVec);
        const stdScale = typeof (gp as any).stdY === 'number' && (gp as any).stdY > 0 ? (gp as any).stdY : 1.0;
        const normSigma = Math.min(1.0, pred.std / stdScale);
        if (normSigma > maxUncertaintyRatio) {
          maxUncertaintyRatio = normSigma;
        }

        const threshold = this.config.uncertaintyThreshold ?? 0.35;
        if (normSigma > threshold || pred.std > threshold * stdScale) {
          riskFactors.push(`High surrogate predictive uncertainty on '${name}' (sigma: ${pred.std.toFixed(3)}, normalized: ${(normSigma * 100).toFixed(1)}%)`);
          riskScore += 0.35;
        }
      }
    }

    // 4. Check Cost / Duration Thresholds
    if (this.config.maxAutoCost && estimatedCost > this.config.maxAutoCost) {
      riskFactors.push(`High evaluation cost ($${estimatedCost} > limit $${this.config.maxAutoCost})`);
      riskScore += 0.30;
    }

    const clampedRisk = Math.min(1.0, Math.max(0.0, Number(riskScore.toFixed(3))));

    return {
      riskScore: clampedRisk,
      riskFactors,
      uncertaintyRatio: maxUncertaintyRatio,
      probabilityFeasible: minProbFeasible,
      boundaryProximity: minBoundaryMargin,
      forbiddenRegionProximity: forbiddenCheck.distanceToClosest,
      estimatedCost,
      estimatedDurationMs,
    };
  }

  /**
   * Determines if a candidate should be gated for human review or automatically approved.
   */
  public shouldGate(
    candidate: Record<string, number | string>,
    problem: Problem,
    currentIteration: number,
    surrogates?: Record<string, GaussianProcessRegressor>,
    estimatedCost: number = 10
  ): {
    requiresReview: boolean;
    reason: string;
    riskAssessment: RiskAssessmentDetails;
  } {
    const assessment = this.assessCandidateRisk(candidate, problem, surrogates, estimatedCost);

    switch (this.config.policy) {
      case 'disabled':
        return { requiresReview: false, reason: 'Approval Gate is disabled (auto-dispatch)', riskAssessment: assessment };

      case 'always':
        return { requiresReview: true, reason: 'Human approval policy set to ALWAYS pause', riskAssessment: assessment };

      case 'cost_gated':
        if (this.config.maxAutoCost && estimatedCost > this.config.maxAutoCost) {
          return { requiresReview: true, reason: `Estimated cost ($${estimatedCost}) exceeds auto-approval ceiling`, riskAssessment: assessment };
        }
        return { requiresReview: false, reason: 'Cost within auto-approval allowance', riskAssessment: assessment };

      case 'periodic_batch':
        const interval = this.config.batchInterval ?? 5;
        if (currentIteration > 0 && currentIteration % interval === 0) {
          return { requiresReview: true, reason: `Periodic batch review checkpoint reached at iteration ${currentIteration}`, riskAssessment: assessment };
        }
        return { requiresReview: false, reason: 'Iteration within batch processing window', riskAssessment: assessment };

      case 'high_risk_uncertainty':
      default:
        // Gate if risk score exceeds 0.30 or if any critical risk factor is present
        if (assessment.riskScore >= 0.30 || assessment.riskFactors.length > 0) {
          return { 
            requiresReview: true, 
            reason: `Risk score (${assessment.riskScore}) triggered gate: ${assessment.riskFactors[0] || 'High risk profile'}`, 
            riskAssessment: assessment 
          };
        }
        return { requiresReview: false, reason: 'Candidate evaluated as low-risk; safe for auto-dispatch', riskAssessment: assessment };
    }
  }

  /**
   * Enqueues a candidate for human expert review.
   */
  public enqueue(
    candidate: Record<string, number | string>,
    problem: Problem,
    iteration: number,
    surrogates?: Record<string, GaussianProcessRegressor>,
    acquisitionScore?: number,
    estimatedCost: number = 10,
    estimatedDurationMs: number = 100
  ): CandidateReviewItem {
    this.candidateCounter++;
    const assessment = this.assessCandidateRisk(candidate, problem, surrogates, estimatedCost, estimatedDurationMs);

    // Build surrogate predictions if available
    const surrogatePreds: { mean: Record<string, number>; std: Record<string, number>; probabilityFeasible?: number } = {
      mean: {},
      std: {},
    };

    if (surrogates) {
      const numericVec: number[] = [];
      for (const v of problem.variables) {
        if (v.type === 'continuous' || v.type === 'integer') {
          numericVec.push(Number(candidate[v.name] ?? v.defaultValue ?? v.lowerBound));
        }
      }
      for (const [name, gp] of Object.entries(surrogates)) {
        const p = gp.predict(numericVec);
        surrogatePreds.mean[name] = Number(p.mean.toFixed(4));
        surrogatePreds.std[name] = Number(p.std.toFixed(4));
      }
    }

    const reviewItem: CandidateReviewItem = {
      id: `rev_${Date.now()}_${this.candidateCounter}`,
      candidateIndex: iteration,
      parameters: { ...candidate },
      originalParameters: { ...candidate },
      surrogatePrediction: Object.keys(surrogatePreds.mean).length > 0 ? surrogatePreds : undefined,
      acquisitionScore,
      estimatedCost,
      estimatedDurationMs,
      riskScore: assessment.riskScore,
      riskFactors: assessment.riskFactors,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.pendingQueue.push(reviewItem);
    return reviewItem;
  }

  /**
   * Resolves a pending review item.
   */
  public resolveReview(
    reviewId: string,
    status: ReviewStatus,
    reviewerId: string,
    notes?: string,
    modifiedParams?: Record<string, number | string>
  ): CandidateReviewItem | null {
    const itemIndex = this.pendingQueue.findIndex(r => r.id === reviewId);
    if (itemIndex === -1) return null;

    const item = this.pendingQueue[itemIndex];
    item.status = status;
    item.reviewerId = reviewerId;
    item.reviewNotes = notes;
    item.reviewedAt = new Date().toISOString();

    if (status === 'modified' && modifiedParams) {
      item.originalParameters = { ...item.parameters };
      item.parameters = { ...modifiedParams };
    }

    // Move to history
    this.pendingQueue.splice(itemIndex, 1);
    this.reviewHistory.push(item);

    return item;
  }
}
