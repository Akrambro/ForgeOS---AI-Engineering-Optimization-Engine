import { 
  ApprovalGateConfig, 
  CandidateReviewItem, 
  HumanInterventionLog, 
  Problem, 
  ExpertSteeringState,
  ForbiddenRegion
} from '../../types';
import { HumanApprovalGate } from './approvalGate';
import { ForbiddenRegionManager } from './forbiddenRegionManager';

export class ExpertSteeringController {
  private approvalGate: HumanApprovalGate;
  private forbiddenManager: ForbiddenRegionManager;
  private logs: HumanInterventionLog[] = [];
  private activeRoi: Record<string, { lower: number; upper: number }> = {};
  private dynamicConstraintOverrides: Record<string, number> = {};
  private manualInjections: Record<string, number | string>[] = [];
  private experimentId: string;

  constructor(
    experimentId: string = 'exp_default',
    initialConfig?: ApprovalGateConfig,
    initialForbidden?: ForbiddenRegion[]
  ) {
    this.experimentId = experimentId;
    this.forbiddenManager = new ForbiddenRegionManager(initialForbidden);
    this.approvalGate = new HumanApprovalGate(initialConfig, this.forbiddenManager);
  }

  public getApprovalGate(): HumanApprovalGate {
    return this.approvalGate;
  }

  public getForbiddenManager(): ForbiddenRegionManager {
    return this.forbiddenManager;
  }

  public getInterventionLogs(): HumanInterventionLog[] {
    return [...this.logs];
  }

  public getManualInjections(): Record<string, number | string>[] {
    return [...this.manualInjections];
  }

  public getActiveRoi(): Record<string, { lower: number; upper: number }> {
    return { ...this.activeRoi };
  }

  public getConstraintOverrides(): Record<string, number> {
    return { ...this.dynamicConstraintOverrides };
  }

  public getState(): ExpertSteeringState {
    return {
      approvalGateConfig: this.approvalGate.getConfig(),
      pendingReviews: this.approvalGate.getPendingQueue(),
      reviewHistory: this.approvalGate.getReviewHistory(),
      interventionLogs: [...this.logs],
      forbiddenRegions: this.forbiddenManager.getRegions(),
      activeRegionsOfInterest: { ...this.activeRoi },
      manuallyInjectedCandidates: [...this.manualInjections],
    };
  }

  /**
   * Approves a candidate in the gate queue.
   */
  public approveCandidate(
    reviewId: string,
    reviewerId: string = 'engineer_1',
    notes?: string
  ): CandidateReviewItem | null {
    const item = this.approvalGate.resolveReview(reviewId, 'approved', reviewerId, notes);
    if (!item) return null;

    this.logIntervention({
      action: 'approve',
      actor: reviewerId,
      details: {
        candidateId: reviewId,
        originalParams: item.parameters,
        reason: notes || 'Approved by human expert without modifications',
      },
    });

    return item;
  }

  /**
   * Rejects a candidate in the gate queue, optionally creating a forbidden exclusion zone.
   */
  public rejectCandidate(
    reviewId: string,
    reason: string,
    reviewerId: string = 'engineer_1',
    createForbiddenRegion: boolean = true,
    exclusionRadius: number = 0.08
  ): { item: CandidateReviewItem | null; forbiddenRegion?: ForbiddenRegion } {
    const item = this.approvalGate.resolveReview(reviewId, 'rejected', reviewerId, reason);
    if (!item) return { item: null };

    let forbiddenRegion: ForbiddenRegion | undefined;
    if (createForbiddenRegion) {
      // Cast numerical parameters to center
      const center: Record<string, number> = {};
      for (const [k, v] of Object.entries(item.parameters)) {
        if (typeof v === 'number') {
          center[k] = v;
        }
      }
      forbiddenRegion = this.forbiddenManager.addRegion(center, exclusionRadius, reason);
    }

    this.logIntervention({
      action: 'reject',
      actor: reviewerId,
      details: {
        candidateId: reviewId,
        originalParams: item.parameters,
        reason,
        forbiddenRegionId: forbiddenRegion?.id,
      },
    });

    return { item, forbiddenRegion };
  }

  /**
   * Modifies candidate parameter values (e.g. snapping to standard drill sizes or expert intuition).
   */
  public modifyCandidate(
    reviewId: string,
    modifiedParams: Record<string, number | string>,
    reason: string,
    reviewerId: string = 'engineer_1'
  ): CandidateReviewItem | null {
    const item = this.approvalGate.resolveReview(reviewId, 'modified', reviewerId, reason, modifiedParams);
    if (!item) return null;

    this.logIntervention({
      action: 'modify',
      actor: reviewerId,
      details: {
        candidateId: reviewId,
        originalParams: item.originalParameters,
        modifiedParams,
        reason,
      },
    });

    return item;
  }

  /**
   * Injects an intuition-driven candidate into the experiment.
   */
  public injectCandidate(
    params: Record<string, number | string>,
    reason: string,
    actor: string = 'expert_engineer'
  ): Record<string, number | string> {
    this.manualInjections.push({ ...params });

    this.logIntervention({
      action: 'inject_candidate',
      actor,
      details: {
        modifiedParams: params,
        reason,
      },
    });

    return { ...params };
  }

  /**
   * Dynamically adjusts a constraint threshold on-the-fly.
   */
  public adjustConstraintThreshold(
    problem: Problem,
    constraintId: string,
    newThreshold: number,
    reason: string,
    actor: string = 'lead_designer'
  ): boolean {
    const c = problem.constraints.find(item => item.id === constraintId || item.name === constraintId);
    if (!c) return false;

    const oldThreshold = c.threshold;
    this.dynamicConstraintOverrides[constraintId] = newThreshold;

    this.logIntervention({
      action: 'adjust_constraint',
      actor,
      details: {
        constraintId,
        oldThreshold,
        newThreshold,
        reason,
      },
    });

    return true;
  }

  /**
   * Restricts search space to a Region of Interest (ROI) / Trust Region.
   */
  public setRegionOfInterest(
    roi: Record<string, { lower: number; upper: number }>,
    reason: string,
    actor: string = 'expert_analyst'
  ): void {
    this.activeRoi = { ...roi };

    this.logIntervention({
      action: 'set_roi',
      actor,
      details: {
        roiBounds: { ...roi },
        reason,
      },
    });
  }

  /**
   * Updates approval policy configuration.
   */
  public setPolicy(config: Partial<ApprovalGateConfig>, actor: string = 'admin'): void {
    this.approvalGate.updateConfig(config);
    this.logIntervention({
      action: 'set_policy',
      actor,
      details: {
        policyConfig: this.approvalGate.getConfig(),
      },
    });
  }

  /**
   * Transforms problem specification applying all dynamic expert modifications (ROI and constraints).
   */
  public applySteeringToProblem(baseProblem: Problem): Problem {
    const updatedVariables = baseProblem.variables.map(v => {
      if (this.activeRoi[v.name] || this.activeRoi[v.id]) {
        const roi = this.activeRoi[v.name] || this.activeRoi[v.id];
        return {
          ...v,
          lowerBound: Math.max(v.lowerBound, roi.lower),
          upperBound: Math.min(v.upperBound, roi.upper),
        };
      }
      return { ...v };
    });

    const updatedConstraints = baseProblem.constraints.map(c => {
      if (this.dynamicConstraintOverrides[c.id] !== undefined) {
        return {
          ...c,
          threshold: this.dynamicConstraintOverrides[c.id],
        };
      }
      if (this.dynamicConstraintOverrides[c.name] !== undefined) {
        return {
          ...c,
          threshold: this.dynamicConstraintOverrides[c.name],
        };
      }
      return { ...c };
    });

    return {
      ...baseProblem,
      variables: updatedVariables,
      constraints: updatedConstraints,
    };
  }

  private logIntervention(entry: Omit<HumanInterventionLog, 'id' | 'experimentId' | 'timestamp'>): void {
    const log: HumanInterventionLog = {
      id: `hitl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      experimentId: this.experimentId,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.logs.push(log);
  }
}
