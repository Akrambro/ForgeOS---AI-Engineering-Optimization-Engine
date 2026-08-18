import { TestResult } from './phase1.test';
import { AutonomousPipelineEngine } from '../autonomous/autonomousPipeline';
import { ConvergenceDiagnosticEngine } from '../autonomous/convergenceDiagnostic';
import { SensitivityAnalysisEngine } from '../autonomous/sensitivityAnalysis';
import { ReportSynthesizer } from '../autonomous/reportSynthesizer';
import { PipelineStageType, AnomalyEvent, Candidate } from '../autonomous/types';
import { BENCHMARK_CATALOG } from '../benchmarks/benchmarkSuite';
import { Problem } from '../../types';

export class Phase9TestSuite {
  /**
   * Test 9.1: Multi-Stage Autonomous Pipeline Stage Transitions & State Machine
   */
  public static async testStageTransitions(): Promise<void> {
    const problem = BENCHMARK_CATALOG[0].problem; // Sphere benchmark
    const engine = new AutonomousPipelineEngine({
      problem,
      maxTotalEvaluations: 30,
      explorationBudget: 8,
      activeLearningBudget: 10,
      paretoRefinementGenerations: 5,
      convergenceWindow: 4,
      hypervolumeTolerance: 0.01,
      relativeObjTolerance: 0.01,
      enableAutoRecovery: true,
      useGeminiSynthesis: false,
      seed: 42,
    });

    const recordedStages: PipelineStageType[] = [];
    await engine.executePipeline(
      (params) => {
        const x = Number(params['x0']) || 0;
        const y = Number(params['x1']) || 0;
        return [x * x + y * y];
      },
      (state) => {
        if (!recordedStages.includes(state.currentStage)) {
          recordedStages.push(state.currentStage);
        }
      }
    );

    const requiredStages = [
      PipelineStageType.EXPLORATION,
      PipelineStageType.SURROGATE_BOOTSTRAP,
      PipelineStageType.ACTIVE_LEARNING_EXPLOITATION,
      PipelineStageType.MULTI_OBJECTIVE_PARETO_REFINEMENT,
      PipelineStageType.CONVERGENCE_ASSESSMENT,
      PipelineStageType.DECISION_SYNTHESIS,
    ];

    for (const req of requiredStages) {
      if (!recordedStages.includes(req)) {
        throw new Error(`Missing expected pipeline stage: ${req}`);
      }
    }

    const state = engine.getState();
    if (!state.isComplete) {
      throw new Error('Pipeline failed to mark completion flag');
    }
  }

  /**
   * Test 9.2: Convergence Diagnostics (Hypervolume Stagnation & Relative Tolerance)
   */
  public static async testConvergenceDiagnostics(): Promise<void> {
    const problem = BENCHMARK_CATALOG[0].problem;
    const dummyCandidates: Candidate[] = [
      { id: '1', parameters: { x0: 0.01, x1: 0.02 }, objectives: [{ name: 'f1', value: 0.0005 }], feasible: true, evaluatedAt: 1 },
      { id: '2', parameters: { x0: 0.011, x1: 0.021 }, objectives: [{ name: 'f1', value: 0.00052 }], feasible: true, evaluatedAt: 2 },
      { id: '3', parameters: { x0: 0.0105, x1: 0.0205 }, objectives: [{ name: 'f1', value: 0.00051 }], feasible: true, evaluatedAt: 3 },
      { id: '4', parameters: { x0: 0.0102, x1: 0.0201 }, objectives: [{ name: 'f1', value: 0.000505 }], feasible: true, evaluatedAt: 4 },
      { id: '5', parameters: { x0: 0.0101, x1: 0.0202 }, objectives: [{ name: 'f1', value: 0.000508 }], feasible: true, evaluatedAt: 5 },
    ];

    const hvHistory = [0.820, 0.821, 0.8215, 0.8216, 0.8218];

    const report = ConvergenceDiagnosticEngine.evaluateConvergence(
      problem,
      dummyCandidates,
      hvHistory,
      4,
      0.005,
      0.05
    );

    if (!report.isConverged) {
      throw new Error(`Expected convergence report to signal convergence, got false (${report.reason})`);
    }

    if (report.hypervolumeDelta > 0.005) {
      throw new Error(`Expected delta HV <= 0.005, got ${report.hypervolumeDelta}`);
    }

    if (report.feasibleFraction !== 1.0) {
      throw new Error(`Expected 100% feasibility, got ${report.feasibleFraction}`);
    }
  }

  /**
   * Test 9.3: Anomaly Detection & Simulator Failure Auto-Recovery
   */
  public static async testAnomalyDetectionAndRecovery(): Promise<void> {
    const problem = BENCHMARK_CATALOG[0].problem;
    
    // Candidate with NaN objective (e.g. simulator failure)
    const nanCandidate: Candidate = {
      id: 'nan-test',
      parameters: { x0: 1.0, x1: 2.0 },
      objectives: [{ name: 'f1', value: NaN }],
      feasible: true,
      evaluatedAt: Date.now(),
    };

    const anomaly = ConvergenceDiagnosticEngine.detectAnomaly(
      PipelineStageType.ACTIVE_LEARNING_EXPLOITATION,
      15,
      nanCandidate
    );

    if (!anomaly) {
      throw new Error('Failed to detect NaN gradient anomaly in candidate evaluation');
    }

    if (anomaly.type !== 'NAN_GRADIENT') {
      throw new Error(`Expected anomaly type NAN_GRADIENT, got ${anomaly.type}`);
    }

    // Apply automated recovery
    const recovery = ConvergenceDiagnosticEngine.applyRecovery(anomaly, nanCandidate, problem);
    if (!anomaly.resolved) {
      throw new Error('Recovery engine failed to resolve the anomaly');
    }

    if (isNaN(recovery.candidate.objectives[0].value) || !isFinite(recovery.candidate.objectives[0].value)) {
      throw new Error('Recovery engine failed to replace NaN objective with penalty value');
    }

    if (recovery.candidate.feasible) {
      throw new Error('Recovered anomaly candidate should be marked as non-feasible');
    }
  }

  /**
   * Test 9.4: Sensitivity Analysis & Parameter Importance Ranking
   */
  public static async testSensitivityAnalysis(): Promise<void> {
    const problem: Problem = {
      id: 'sensitivity-test-prob',
      name: 'Nonlinear Sensitivity Test',
      description: 'Test problem with high sensitivity in x0 and low sensitivity in x1',
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adapter: { type: 'builtin' },
      variables: [
        { id: 'v1', name: 'x0', type: 'continuous', lowerBound: 0, upperBound: 10, unit: '', description: 'x0' },
        { id: 'v2', name: 'x1', type: 'continuous', lowerBound: 0, upperBound: 10, unit: '', description: 'x1' },
      ],
      objectives: [
        { id: 'o1', name: 'f', direction: 'minimize', weight: 1.0, unit: '', description: 'f' },
      ],
      constraints: [],
    };

    // f(x0, x1) = 100 * x0^2 + 0.01 * x1 (x0 is vastly more sensitive)
    const evaluator = (params: Record<string, number | string>) => {
      const x0 = Number(params['x0']) || 0;
      const x1 = Number(params['x1']) || 0;
      return 100 * x0 * x0 + 0.01 * x1;
    };

    const sensitivities = SensitivityAnalysisEngine.computeSensitivities(problem, evaluator, 20);

    if (sensitivities.length !== 2) {
      throw new Error(`Expected 2 parameter sensitivities, got ${sensitivities.length}`);
    }

    const topParam = sensitivities[0];
    if (topParam.parameterName !== 'x0') {
      throw new Error(`Expected x0 to be top sensitive parameter, got ${topParam.parameterName}`);
    }

    if (topParam.impactLevel !== 'CRITICAL') {
      throw new Error(`Expected x0 impact level to be CRITICAL, got ${topParam.impactLevel}`);
    }

    if (topParam.firstOrderIndex < 0.8) {
      throw new Error(`Expected x0 first order sensitivity >= 0.8, got ${topParam.firstOrderIndex}`);
    }
  }

  /**
   * Test 9.5: Automated TOPSIS Decision Synthesis & Recommended Design Selection
   */
  public static async testTopsisDecisionSynthesis(): Promise<void> {
    const candidates: Candidate[] = [
      { id: 'c1', parameters: { x: 1 }, objectives: [{ name: 'f1', value: 10 }, { name: 'f2', value: 100 }], feasible: true, evaluatedAt: 1 },
      { id: 'c2', parameters: { x: 2 }, objectives: [{ name: 'f1', value: 50 }, { name: 'f2', value: 50 }], feasible: true, evaluatedAt: 2 }, // Balanced knee
      { id: 'c3', parameters: { x: 3 }, objectives: [{ name: 'f1', value: 100 }, { name: 'f2', value: 10 }], feasible: true, evaluatedAt: 3 },
    ];

    const problem: Problem = {
      id: 'topsis-test',
      name: 'TOPSIS Bi-Objective Problem',
      description: '',
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adapter: { type: 'builtin' },
      variables: [{ id: 'v1', name: 'x', type: 'continuous', lowerBound: 1, upperBound: 3, unit: '', description: 'x' }],
      objectives: [
        { id: 'o1', name: 'f1', direction: 'minimize', weight: 0.5, unit: '', description: 'f1' },
        { id: 'o2', name: 'f2', direction: 'minimize', weight: 0.5, unit: '', description: 'f2' },
      ],
      constraints: [],
    };

    const report = await ReportSynthesizer.generateReport({
      problem,
      merkleRootHash: 'a1b2c3d4e5f6',
      totalIterations: 3,
      totalDurationMs: 120,
      stages: [],
      paretoFront: candidates,
      recommendedCandidate: candidates[1],
      hypervolume: 0.78,
      topsisScore: 0.88,
      sensitivities: [{ parameterName: 'x', firstOrderIndex: 0.95, totalIndex: 0.98, impactLevel: 'CRITICAL' }],
      anomalies: [],
      useGeminiSynthesis: false,
    });

    if (report.recommendedCandidate.id !== 'c2') {
      throw new Error(`Expected candidate c2 recommended, got ${report.recommendedCandidate.id}`);
    }

    if (report.topsisDecisionScore !== 0.88) {
      throw new Error(`Expected TOPSIS score 0.88, got ${report.topsisDecisionScore}`);
    }

    if (report.executiveSummary.length < 20) {
      throw new Error('Executive summary is too short or empty');
    }
  }

  /**
   * Test 9.6: Full End-to-End Autonomous Pipeline Execution & Merkle Verification
   */
  public static async testEndToEndPipelineExecution(): Promise<void> {
    const problem: Problem = {
      id: 'rosenbrock-auto-test',
      name: 'Rosenbrock 2D Benchmark',
      description: 'Rosenbrock banana valley benchmark for autonomous pipeline',
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adapter: { type: 'builtin' },
      variables: [
        { id: 'v1', name: 'x0', type: 'continuous', lowerBound: -2.0, upperBound: 2.0, unit: '', description: 'x0' },
        { id: 'v2', name: 'x1', type: 'continuous', lowerBound: -1.0, upperBound: 3.0, unit: '', description: 'x1' },
      ],
      objectives: [
        { id: 'obj1', name: 'f', direction: 'minimize', unit: '', description: 'Rosenbrock objective' },
      ],
      constraints: [],
    };

    const engine = new AutonomousPipelineEngine({
      problem,
      maxTotalEvaluations: 25,
      explorationBudget: 8,
      activeLearningBudget: 12,
      paretoRefinementGenerations: 5,
      convergenceWindow: 4,
      hypervolumeTolerance: 0.01,
      relativeObjTolerance: 0.01,
      enableAutoRecovery: true,
      useGeminiSynthesis: false,
      seed: 123,
    });

    const report = await engine.executePipeline((params) => {
      const x0 = Number(params['x0']) || 0;
      const x1 = Number(params['x1']) || 0;
      const rosenbrock = Math.pow(1 - x0, 2) + 100 * Math.pow(x1 - x0 * x0, 2);
      return [rosenbrock];
    });

    const auditChain = engine.getAuditChain();
    const isChainValid = auditChain.verifyChainIntegrity();

    if (!isChainValid) {
      throw new Error('Merkle audit chain verification failed during autonomous pipeline execution');
    }

    if (auditChain.getLength() !== 20) { // 8 exploration + 12 active learning = 20
      throw new Error(`Expected 20 audited trials, got ${auditChain.getLength()}`);
    }

    if (!report.merkleRootHash || report.merkleRootHash.length < 10) {
      throw new Error(`Invalid Merkle root hash: ${report.merkleRootHash}`);
    }

    if (report.paretoFrontSize < 1) {
      throw new Error('Pareto front size is 0');
    }
  }

  /**
   * Test 9.7: Automated Technical Report Generation & Cryptographic Signature Seal
   */
  public static async testTechnicalReportStructure(): Promise<void> {
    const problem = BENCHMARK_CATALOG[1].problem; // Ackley
    const report = await ReportSynthesizer.generateReport({
      problem,
      merkleRootHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      totalIterations: 50,
      totalDurationMs: 850,
      stages: [
        {
          stage: PipelineStageType.EXPLORATION,
          startTime: 100,
          endTime: 300,
          durationMs: 200,
          trialsEvaluated: 15,
          bestObjectiveScore: 4.2,
          message: 'Exploration done',
          success: true,
        },
        {
          stage: PipelineStageType.DECISION_SYNTHESIS,
          startTime: 300,
          endTime: 850,
          durationMs: 550,
          trialsEvaluated: 35,
          bestObjectiveScore: 0.12,
          message: 'Decision done',
          success: true,
        },
      ],
      paretoFront: [{ id: 'opt1', parameters: { x0: 0.05, x1: -0.02 }, objectives: [{ name: 'f1', value: 0.12 }], feasible: true, evaluatedAt: 1 }],
      recommendedCandidate: { id: 'opt1', parameters: { x0: 0.05, x1: -0.02 }, objectives: [{ name: 'f1', value: 0.12 }], feasible: true, evaluatedAt: 1 },
      hypervolume: 0.9421,
      topsisScore: 0.985,
      sensitivities: [
        { parameterName: 'x0', firstOrderIndex: 0.52, totalIndex: 0.58, impactLevel: 'CRITICAL' },
        { parameterName: 'x1', firstOrderIndex: 0.48, totalIndex: 0.51, impactLevel: 'CRITICAL' },
      ],
      anomalies: [],
      useGeminiSynthesis: false,
    });

    if (!report.executiveSummary.includes(problem.name)) {
      throw new Error(`Executive summary did not reference problem name "${problem.name}"`);
    }

    if (report.engineeringInsights.length < 2) {
      throw new Error('Expected at least 2 engineering insights');
    }

    if (report.recommendedNextSteps.length < 2) {
      throw new Error('Expected at least 2 recommended next steps');
    }

    if (!report.merkleRootHash.startsWith('e3b0c442')) {
      throw new Error('Cryptographic signature seal mismatch');
    }
  }

  /**
   * Master Runner for Phase 9 Test Suite
   */
  public static async runAllTests(onProgress?: (testName: string) => void): Promise<{ passed: number; total: number; results: TestResult[] }> {
    const tests = [
      { name: 'Phase 9.1: Multi-Stage Autonomous Pipeline Stage Transitions & State Machine', fn: this.testStageTransitions },
      { name: 'Phase 9.2: Convergence Diagnostics (Hypervolume Stagnation & Relative Tolerance)', fn: this.testConvergenceDiagnostics },
      { name: 'Phase 9.3: Anomaly Detection & Simulator Failure Auto-Recovery', fn: this.testAnomalyDetectionAndRecovery },
      { name: 'Phase 9.4: Sensitivity Analysis & Parameter Importance Ranking', fn: this.testSensitivityAnalysis },
      { name: 'Phase 9.5: Automated TOPSIS Decision Synthesis & Recommended Design Selection', fn: this.testTopsisDecisionSynthesis },
      { name: 'Phase 9.6: Full End-to-End Autonomous Pipeline Execution & Merkle Verification', fn: this.testEndToEndPipelineExecution },
      { name: 'Phase 9.7: Automated Technical Report Generation & Cryptographic Signature Seal', fn: this.testTechnicalReportStructure },
    ];

    const results: TestResult[] = [];
    let passed = 0;

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      if (onProgress) onProgress(t.name);
      const start = performance.now();
      try {
        await t.fn.call(this);
        const durationMs = performance.now() - start;
        results.push({
          id: `phase9_test_${i + 1}`,
          name: t.name,
          category: 'Phase 9: Autonomous Loop',
          status: 'passed',
          message: 'Passed successfully',
          durationMs,
        });
        passed++;
      } catch (err: any) {
        const durationMs = performance.now() - start;
        results.push({
          id: `phase9_test_${i + 1}`,
          name: t.name,
          category: 'Phase 9: Autonomous Loop',
          status: 'failed',
          message: err?.message || String(err),
          durationMs,
        });
      }
    }

    return { passed, total: tests.length, results };
  }
}
