import { Problem } from '../../types';
import { HumanApprovalGate } from '../hitl/approvalGate';
import { ExpertSteeringController } from '../hitl/expertSteering';
import { ForbiddenRegionManager } from '../hitl/forbiddenRegionManager';
import { GaussianProcessRegressor } from '../algorithms/gaussianProcess';
import { UniversalEvaluator } from '../evaluators/evaluator';
import { DifferentialEvolutionOptimizer } from '../algorithms/differentialEvolution';
import { TestResult } from './phase1.test';

export class Phase7TestSuite {
  public static async runAllTests(
    onProgress?: (testName: string, passed: boolean) => void
  ): Promise<{ results: TestResult[]; passed: number; total: number }> {
    const results: TestResult[] = [];

    const tests = [
      { name: 'Phase 7.1: Approval Gate Policy Evaluation & Dispatch Control', fn: this.testApprovalGatePolicies },
      { name: 'Phase 7.2: Multi-Factor Risk Assessment & Surrogate Uncertainty Gating', fn: this.testRiskAssessmentAndUncertaintyGating },
      { name: 'Phase 7.3: Human Candidate Modification & Provenance Audit Trail', fn: this.testCandidateModificationAndAudit },
      { name: 'Phase 7.4: Expert Rejection & Forbidden Exclusion Zone Generation', fn: this.testRejectionAndForbiddenZonePenalty },
      { name: 'Phase 7.5: Intuition-Driven Manual Candidate Injection & Surrogate Update', fn: this.testManualCandidateInjection },
      { name: 'Phase 7.6: Dynamic Constraint Adjustment & Region of Interest (ROI) Zoom', fn: this.testDynamicConstraintAndRoiSteering },
      { name: 'Phase 7.7: End-to-End Human-in-the-Loop Optimization Simulation', fn: this.testEndToEndHitlOptimizationLoop },
    ];

    for (const t of tests) {
      const startTime = performance.now();
      try {
        await t.fn();
        const duration = Math.round(performance.now() - startTime);
        results.push({ 
          id: t.name, 
          name: t.name, 
          category: 'hitl', 
          status: 'passed', 
          durationMs: duration, 
          message: 'Passed successfully' 
        });
        onProgress?.(t.name, true);
      } catch (err: any) {
        const duration = Math.round(performance.now() - startTime);
        results.push({
          id: t.name,
          name: t.name,
          category: 'hitl',
          status: 'failed',
          durationMs: duration,
          message: err?.message || String(err),
        });
        onProgress?.(t.name, false);
      }
    }

    const passed = results.filter(r => r.status === 'passed').length;
    return { results, passed, total: results.length };
  }

  private static getBenchmarkProblem(): Problem {
    return {
      id: 'turbine_blade_hitl',
      name: 'Turbine Blade Cooling Optimization (HITL Testing)',
      description: 'Optimizes film cooling geometry with expert human steering and risk gates',
      version: '1.0.0',
      variables: [
        { id: 'v1', name: 'hole_diameter', type: 'continuous', lowerBound: 0.5, upperBound: 2.5, defaultValue: 1.2, unit: 'mm', description: 'Film hole drill diameter' },
        { id: 'v2', name: 'inclination_angle', type: 'continuous', lowerBound: 20.0, upperBound: 60.0, defaultValue: 35.0, unit: 'deg', description: 'Injection angle' },
        { id: 'v3', name: 'blowing_ratio', type: 'continuous', lowerBound: 0.5, upperBound: 3.0, defaultValue: 1.5, unit: '', description: 'Mass flux ratio' },
      ],
      objectives: [
        { id: 'peak_temp', name: 'peak_metal_temp', direction: 'minimize', unit: 'K', description: 'Peak metal temperature' },
        { id: 'coolant_flow', name: 'coolant_flow', direction: 'minimize', unit: 'kg/s', description: 'Coolant mass flow' },
      ],
      constraints: [
        { id: 'c1', name: 'max_stress', operator: '<=', threshold: 2.8, unit: 'Kt', description: 'Stress concentration factor <= 2.8' },
        { id: 'c2', name: 'min_cooling_eff', operator: '>=', threshold: 0.50, unit: 'eta', description: 'Cooling effectiveness >= 0.50' },
      ],
      adapter: {
        type: 'python',
        code: `
          const d = Number(params.hole_diameter ?? 1.2);
          const angle = Number(params.inclination_angle ?? 35);
          const M = Number(params.blowing_ratio ?? 1.5);
          
          const eta = Math.min(0.85, 0.45 * Math.pow(M, 0.7) * Math.cos(angle * Math.PI / 180) * Math.sqrt(d / 1.5));
          const peak_temp = 1450.0 - 450.0 * eta;
          const coolant = (Math.PI * Math.pow(d / 1000, 2) / 4) * M * 1.8 * 1000;
          const stress = 2.0 + 0.4 * (d / 1.0) + 0.015 * Math.pow(angle - 30, 2) / 10;

          return {
            objectives: {
              peak_metal_temp: Number(peak_temp.toFixed(1)),
              coolant_flow: Number(coolant.toFixed(3)),
            },
            constraints: {
              max_stress: Number(stress.toFixed(2)),
              min_cooling_eff: Number(eta.toFixed(3)),
            }
          };
        `,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Test 7.1: Approval Gate Policy Evaluation & Dispatch Control
   */
  public static async testApprovalGatePolicies(): Promise<void> {
    const problem = Phase7TestSuite.getBenchmarkProblem();
    const candidate = { hole_diameter: 1.2, inclination_angle: 35.0, blowing_ratio: 1.5 };

    // 1. Policy: Disabled -> should never gate
    const gateDisabled = new HumanApprovalGate({ policy: 'disabled' });
    const decDisabled = gateDisabled.shouldGate(candidate, problem, 1);
    if (decDisabled.requiresReview) {
      throw new Error('Policy "disabled" failed: Expected auto-dispatch without gating');
    }

    // 2. Policy: Always -> should always gate
    const gateAlways = new HumanApprovalGate({ policy: 'always' });
    const decAlways = gateAlways.shouldGate(candidate, problem, 1);
    if (!decAlways.requiresReview) {
      throw new Error('Policy "always" failed: Expected candidate to be gated for human review');
    }

    // 3. Policy: Cost-Gated -> gate only when cost > maxAutoCost
    const gateCost = new HumanApprovalGate({ policy: 'cost_gated', maxAutoCost: 50 });
    const lowCostCheck = gateCost.shouldGate(candidate, problem, 1, undefined, 20);
    const highCostCheck = gateCost.shouldGate(candidate, problem, 1, undefined, 100);

    if (lowCostCheck.requiresReview) {
      throw new Error('Policy "cost_gated" failed: Low cost candidate ($20 <= $50) should auto-approve');
    }
    if (!highCostCheck.requiresReview) {
      throw new Error('Policy "cost_gated" failed: High cost candidate ($100 > $50) must be gated');
    }

    // 4. Policy: Periodic Batch -> gate only at batch intervals (e.g. every 5th iteration)
    const gateBatch = new HumanApprovalGate({ policy: 'periodic_batch', batchInterval: 5 });
    const iter3Check = gateBatch.shouldGate(candidate, problem, 3);
    const iter5Check = gateBatch.shouldGate(candidate, problem, 5);
    const iter10Check = gateBatch.shouldGate(candidate, problem, 10);

    if (iter3Check.requiresReview) {
      throw new Error('Policy "periodic_batch" failed: Iteration 3 should not be gated (batch interval = 5)');
    }
    if (!iter5Check.requiresReview || !iter10Check.requiresReview) {
      throw new Error('Policy "periodic_batch" failed: Iterations 5 and 10 must trigger batch review');
    }
  }

  /**
   * Test 7.2: Multi-Factor Candidate Risk Assessment & Surrogate Uncertainty Gating
   */
  public static async testRiskAssessmentAndUncertaintyGating(): Promise<void> {
    const problem = Phase7TestSuite.getBenchmarkProblem();
    const gate = new HumanApprovalGate({ policy: 'high_risk_uncertainty', uncertaintyThreshold: 0.30 });

    // 1. Safe, center-domain candidate
    const safeCandidate = { hole_diameter: 1.5, inclination_angle: 40.0, blowing_ratio: 1.8 };
    const safeAssessment = gate.assessCandidateRisk(safeCandidate, problem);
    if (safeAssessment.riskScore > 0.20) {
      throw new Error(`Expected safe candidate risk < 0.20, got ${safeAssessment.riskScore}`);
    }

    // 2. Candidate operating near physical boundary (hole_diameter = 2.49 close to upperBound 2.5)
    const boundaryCandidate = { hole_diameter: 2.49, inclination_angle: 40.0, blowing_ratio: 1.8 };
    const boundaryAssessment = gate.assessCandidateRisk(boundaryCandidate, problem);
    if (boundaryAssessment.riskScore <= safeAssessment.riskScore) {
      throw new Error('Boundary proximity candidate must produce higher risk score than safe candidate');
    }
    if (!boundaryAssessment.riskFactors.some(rf => rf.includes('limit') || rf.includes('boundary') || rf.includes('hole_diameter'))) {
      throw new Error('Risk factors must clearly explain physical limit proximity');
    }

    // 3. Candidate evaluated with GP surrogate having high epistemic uncertainty in unexplored region
    const trainingX = [
      [0.8, 25.0, 1.0],
      [1.0, 30.0, 1.2],
      [1.2, 35.0, 1.5],
    ];
    const trainingY = [1200.0, 1150.0, 1100.0];
    const gp = new GaussianProcessRegressor('matern52', 1.0, 1e-4);
    gp.fit(trainingX, trainingY);

    const unexploredCandidate = { hole_diameter: 2.4, inclination_angle: 58.0, blowing_ratio: 2.9 };
    const surrogateAssessment = gate.assessCandidateRisk(
      unexploredCandidate,
      problem,
      { peak_metal_temp: gp }
    );

    if (surrogateAssessment.riskScore < 0.30) {
      throw new Error(`Expected high uncertainty candidate risk >= 0.30, got ${surrogateAssessment.riskScore}`);
    }
    if (!surrogateAssessment.riskFactors.some(rf => rf.includes('uncertainty'))) {
      throw new Error('Expected risk factor to flag high surrogate predictive uncertainty');
    }
  }

  /**
   * Test 7.3: Human Candidate Modification & Provenance Audit Trail
   */
  public static async testCandidateModificationAndAudit(): Promise<void> {
    const controller = new ExpertSteeringController('exp_turbine_mod_01');
    const problem = Phase7TestSuite.getBenchmarkProblem();

    // Enqueue an AI-proposed continuous candidate with arbitrary decimal precision
    const rawCandidate = { hole_diameter: 1.3412, inclination_angle: 37.89, blowing_ratio: 1.62 };
    const reviewItem = controller.getApprovalGate().enqueue(rawCandidate, problem, 1, undefined, 0.85);

    if (reviewItem.status !== 'pending') {
      throw new Error(`Expected new review item status 'pending', got ${reviewItem.status}`);
    }

    // Human expert modifies hole_diameter to standard manufacturing tool size (1.50 mm)
    const modifiedParams = { hole_diameter: 1.50, inclination_angle: 38.0, blowing_ratio: 1.60 };
    const resolved = controller.modifyCandidate(
      reviewItem.id,
      modifiedParams,
      'Snapped hole diameter to standard 1.5mm carbide drill tooling spec',
      'senior_mfg_engineer_42'
    );

    if (!resolved) {
      throw new Error('Failed to resolve review item with modifications');
    }
    if (resolved.status !== 'modified') {
      throw new Error(`Expected status 'modified', got ${resolved.status}`);
    }
    if (resolved.parameters.hole_diameter !== 1.50) {
      throw new Error(`Expected modified hole_diameter 1.50, got ${resolved.parameters.hole_diameter}`);
    }
    if (resolved.originalParameters?.hole_diameter !== 1.3412) {
      throw new Error(`Expected originalParameters to preserve 1.3412, got ${resolved.originalParameters?.hole_diameter}`);
    }

    // Verify Audit Trail Log
    const logs = controller.getInterventionLogs();
    if (logs.length !== 1) {
      throw new Error(`Expected exactly 1 intervention log entry, found ${logs.length}`);
    }
    const log = logs[0];
    if (log.action !== 'modify') {
      throw new Error(`Expected log action 'modify', got ${log.action}`);
    }
    if (log.actor !== 'senior_mfg_engineer_42') {
      throw new Error(`Expected actor 'senior_mfg_engineer_42', got ${log.actor}`);
    }
    if (!log.details.reason?.includes('carbide drill')) {
      throw new Error('Intervention log must preserve expert engineering rationale');
    }
  }

  /**
   * Test 7.4: Expert Rejection & Forbidden Exclusion Zone Generation
   */
  public static async testRejectionAndForbiddenZonePenalty(): Promise<void> {
    const controller = new ExpertSteeringController('exp_turbine_reject_01');
    const problem = Phase7TestSuite.getBenchmarkProblem();

    // Enqueue candidate that violates internal cooling baffle packaging
    const badCandidate = { hole_diameter: 2.2, inclination_angle: 55.0, blowing_ratio: 2.8 };
    const reviewItem = controller.getApprovalGate().enqueue(badCandidate, problem, 2);

    // Human expert rejects candidate and flags forbidden exclusion zone
    const { item, forbiddenRegion } = controller.rejectCandidate(
      reviewItem.id,
      'Internal rib clearance clash with cooling core baffle',
      'thermal_aero_lead',
      true,
      0.10 // 10% normalized radius
    );

    if (!item || item.status !== 'rejected') {
      throw new Error('Expected candidate review item to be marked as "rejected"');
    }
    if (!forbiddenRegion) {
      throw new Error('Expected a ForbiddenRegion to be automatically created upon rejection');
    }

    const forbiddenManager = controller.getForbiddenManager();
    const regions = forbiddenManager.getRegions();
    if (regions.length !== 1) {
      throw new Error(`Expected 1 active forbidden region, found ${regions.length}`);
    }

    // Point exactly at rejected location must be detected as forbidden
    const testPointInside = { hole_diameter: 2.2, inclination_angle: 55.0, blowing_ratio: 2.8 };
    const checkInside = forbiddenManager.isForbidden(testPointInside, problem);
    if (!checkInside.forbidden) {
      throw new Error('Point at rejected center must be flagged as forbidden');
    }

    // Penalty on acquisition function inside forbidden zone must be heavily suppressed (<= 0.001)
    const penaltyInside = forbiddenManager.computeAcquisitionPenalty(testPointInside, problem);
    if (penaltyInside > 0.001) {
      throw new Error(`Expected heavy acquisition penalty <= 0.001 inside forbidden zone, got ${penaltyInside}`);
    }

    // Point far away must NOT be forbidden and penalty should be 1.0 (no suppression)
    const testPointSafe = { hole_diameter: 0.8, inclination_angle: 25.0, blowing_ratio: 1.0 };
    const checkSafe = forbiddenManager.isForbidden(testPointSafe, problem);
    if (checkSafe.forbidden) {
      throw new Error('Safe point far from rejected center should not be forbidden');
    }
    const penaltySafe = forbiddenManager.computeAcquisitionPenalty(testPointSafe, problem);
    if (penaltySafe < 0.99) {
      throw new Error(`Expected full acquisition penalty (1.0) for safe point, got ${penaltySafe}`);
    }
  }

  /**
   * Test 7.5: Intuition-Driven Manual Candidate Injection & Surrogate Update
   */
  public static async testManualCandidateInjection(): Promise<void> {
    const controller = new ExpertSteeringController('exp_manual_inject_01');
    const problem = Phase7TestSuite.getBenchmarkProblem();

    // Expert injects a proprietary baseline geometry from previous flight testing
    const expertCandidate = { hole_diameter: 1.15, inclination_angle: 32.5, blowing_ratio: 1.45 };
    const injected = controller.injectCandidate(
      expertCandidate,
      'Pre-validated baseline geometry from Gen-3 engine hot-section rig tests',
      'chief_aerodynamicist'
    );

    if (injected.hole_diameter !== 1.15) {
      throw new Error('Manual injection parameter value mismatch');
    }

    // Evaluate injected candidate through UniversalEvaluator
    const evalResult = await UniversalEvaluator.evaluate(problem, injected);
    if (evalResult.status !== 'successful') {
      throw new Error(`Evaluation of manually injected candidate failed: ${evalResult.error}`);
    }
    if (!evalResult.objectiveValues.peak_metal_temp || evalResult.objectiveValues.peak_metal_temp <= 0) {
      throw new Error('Evaluation did not yield valid objective outputs');
    }

    // Fit GP surrogate with initial baseline + injected candidate
    const datasetX = [
      [0.6, 22.0, 0.8],
      [1.8, 50.0, 2.2],
      [1.15, 32.5, 1.45], // Injected point
    ];
    const datasetY = [1350.0, 1180.0, evalResult.objectiveValues.peak_metal_temp];

    const gp = new GaussianProcessRegressor('matern52', 1.0, 1e-4);
    gp.fit(datasetX, datasetY);

    // Predict at injected point -> predicted mean should closely match actual evaluated value
    const predAtInjected = gp.predict([1.15, 32.5, 1.45]);
    const error = Math.abs(predAtInjected.mean - evalResult.objectiveValues.peak_metal_temp);
    if (error > 10.0) {
      throw new Error(`GP prediction error (${error.toFixed(2)} K) at injected candidate is too high`);
    }
  }

  /**
   * Test 7.6: Dynamic Constraint Adjustment & Region of Interest (ROI) Zoom
   */
  public static async testDynamicConstraintAndRoiSteering(): Promise<void> {
    const controller = new ExpertSteeringController('exp_roi_steering_01');
    const baseProblem = Phase7TestSuite.getBenchmarkProblem();

    // 1. Expert dynamically tightens max stress constraint from 2.8 to 2.5
    const constraintUpdated = controller.adjustConstraintThreshold(
      baseProblem,
      'c1',
      2.5,
      'Structural safety factor increased by lead stress analyst',
      'lead_stress_analyst'
    );
    if (!constraintUpdated) {
      throw new Error('Failed to adjust constraint threshold');
    }

    // 2. Expert restricts search space to high-efficiency Region of Interest
    controller.setRegionOfInterest(
      {
        hole_diameter: { lower: 1.0, upper: 1.8 },
        inclination_angle: { lower: 30.0, upper: 45.0 },
      },
      'Zoom into high film-effectiveness sweet-spot identified during wind tunnel sweep',
      'experimental_lead'
    );

    // 3. Generate steered problem specification
    const steeredProblem = controller.applySteeringToProblem(baseProblem);

    // Verify updated constraint threshold
    const stressConstraint = steeredProblem.constraints.find(c => c.id === 'c1');
    if (!stressConstraint || stressConstraint.threshold !== 2.5) {
      throw new Error(`Expected steered constraint threshold 2.5, got ${stressConstraint?.threshold}`);
    }

    // Verify updated ROI bounds on hole_diameter and inclination_angle
    const dVar = steeredProblem.variables.find(v => v.name === 'hole_diameter');
    const angleVar = steeredProblem.variables.find(v => v.name === 'inclination_angle');
    const blowingVar = steeredProblem.variables.find(v => v.name === 'blowing_ratio');

    if (!dVar || dVar.lowerBound !== 1.0 || dVar.upperBound !== 1.8) {
      throw new Error(`Steered hole_diameter bounds mismatch: expected [1.0, 1.8], got [${dVar?.lowerBound}, ${dVar?.upperBound}]`);
    }
    if (!angleVar || angleVar.lowerBound !== 30.0 || angleVar.upperBound !== 45.0) {
      throw new Error(`Steered inclination_angle bounds mismatch: expected [30.0, 45.0], got [${angleVar?.lowerBound}, ${angleVar?.upperBound}]`);
    }
    // Blowing ratio should remain at base bounds [0.5, 3.0]
    if (!blowingVar || blowingVar.lowerBound !== 0.5 || blowingVar.upperBound !== 3.0) {
      throw new Error('Unmodified variable bounds must remain unchanged');
    }
  }

  /**
   * Test 7.7: End-to-End Human-in-the-Loop Optimization Simulation
   */
  public static async testEndToEndHitlOptimizationLoop(): Promise<void> {
    const controller = new ExpertSteeringController('exp_hitl_e2e_01', {
      policy: 'high_risk_uncertainty',
      uncertaintyThreshold: 0.35,
    });
    const problem = Phase7TestSuite.getBenchmarkProblem();
    const optimizer = new DifferentialEvolutionOptimizer(problem, 42, {
      populationSize: 8,
      mutationFactorF: 0.6,
      crossoverRateCR: 0.8,
    });

    const evaluatedTrials: any[] = [];
    let gatedCount = 0;
    let autoApprovedCount = 0;
    let modifiedCount = 0;

    // Run 15 optimization steps with human-in-the-loop gating simulation
    for (let step = 0; step < 15; step++) {
      const candidate = optimizer.generateCandidate();
      const gateCheck = controller.getApprovalGate().shouldGate(candidate, problem, step);

      let finalCandidate = { ...candidate };

      if (gateCheck.requiresReview) {
        gatedCount++;
        const reviewItem = controller.getApprovalGate().enqueue(candidate, problem, step);

        if (step % 2 === 0) {
          // Simulation of Expert modifying parameter
          const modified = { ...candidate, hole_diameter: Number(Number(candidate.hole_diameter).toFixed(2)) };
          controller.modifyCandidate(reviewItem.id, modified, 'Rounded to drill tolerance', 'expert_1');
          finalCandidate = modified;
          modifiedCount++;
        } else {
          // Simulation of Expert approving candidate
          controller.approveCandidate(reviewItem.id, 'expert_1', 'Looks safe for evaluation');
        }
      } else {
        autoApprovedCount++;
      }

      // Evaluate the candidate
      const evalResult = await UniversalEvaluator.evaluate(problem, finalCandidate);
      if (evalResult.status === 'successful') {
        const trialObj = {
          id: `trial_${step}`,
          runId: 'exp_hitl_e2e_01',
          iteration: step + 1,
          parameters: finalCandidate,
          objectiveValues: evalResult.objectiveValues,
          constraintValues: evalResult.constraintValues,
          feasible: evalResult.feasible,
          status: evalResult.status,
          timestamp: new Date().toISOString(),
          evaluationDurationMs: evalResult.durationMs,
        };

        evaluatedTrials.push(trialObj);
        optimizer.recordTrial(trialObj);
      }
    }

    if (evaluatedTrials.length !== 15) {
      throw new Error(`Expected 15 evaluated trials, got ${evaluatedTrials.length}`);
    }

    const state = controller.getState();
    if (state.interventionLogs.length !== gatedCount) {
      throw new Error(`Audit log count (${state.interventionLogs.length}) does not match gated count (${gatedCount})`);
    }

    // Verify feasible solutions discovered in the loop
    const feasibleCount = evaluatedTrials.filter(t => t.feasible).length;
    if (feasibleCount === 0) {
      throw new Error('HITL optimization loop failed to discover feasible solutions');
    }
  }
}
