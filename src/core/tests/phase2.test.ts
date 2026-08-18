import { BENCHMARK_CATALOG } from '../benchmarks/benchmarkSuite';
import { ExperimentEngine } from '../experiment/experimentEngine';
import { AuditTrailManager } from '../experiment/auditTrail';
import { MetricsEngine } from '../experiment/metricsEngine';
import { TestResult } from './phase1.test';
import { Problem, OptimizationRun } from '../../types';

export class Phase2TestSuite {
  /**
   * Test 2.1: Cryptographic Audit Trail Chaining & Tamper Detection
   */
  public static async testAuditTrailIntegrity(): Promise<TestResult> {
    const sphereDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_a_sphere') || BENCHMARK_CATALOG[0];
    const problem = sphereDef.problem;

    const engine = new ExperimentEngine({
      experimentId: 'audit_test_exp',
      problem,
      algorithm: 'differential_evolution',
      seed: 42,
      budget: 8,
    });

    for (let i = 0; i < 8; i++) {
      await engine.stepOnce();
    }

    const originalTrials = engine.getTrials();
    const initialCheck = AuditTrailManager.verifyTrialChain(originalTrials);

    // Tampering test: Modify a value in trial 4
    const tamperedTrials = JSON.parse(JSON.stringify(originalTrials));
    tamperedTrials[3].parameters.x1 = 999.99; // Alter parameter
    const tamperCheck = AuditTrailManager.verifyTrialChain(tamperedTrials);

    const passed = initialCheck.isValid && !tamperCheck.isValid && tamperCheck.brokenAtIteration === 4;

    return {
      id: 'p2_test_audit_trail',
      name: 'Phase 2.1: Audit Trail Hash Chaining & Tamper Detection',
      category: 'Audit & Cryptography',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Successfully validated 8-step Merkle hash chain and caught intentional parameter tampering at iteration 4.`
        : `Audit chain failure: initialCheck (${initialCheck.isValid}), tamperCaught (${!tamperCheck.isValid}).`,
      details: {
        genesisHash: AuditTrailManager.GENESIS_HASH,
        latestHash: originalTrials[originalTrials.length - 1]?.trialHash,
        merkleRoot: AuditTrailManager.computeMerkleRoot(originalTrials),
        tamperCheckError: tamperCheck.error,
      },
    };
  }

  /**
   * Test 2.2: Checkpoint Serialization & Resumption Equivalence
   */
  public static async testCheckpointAndResume(): Promise<TestResult> {
    const sphereDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_a_sphere') || BENCHMARK_CATALOG[0];
    const problem = sphereDef.problem;
    const seed = 1234;

    // Run 1: Continuous uninterrupted run for 12 steps
    const engineUninterrupted = new ExperimentEngine({
      experimentId: 'resumed_exp',
      problem,
      algorithm: 'differential_evolution',
      seed,
      budget: 12,
    });
    for (let i = 0; i < 12; i++) {
      await engineUninterrupted.stepOnce();
    }
    const uninterruptedTrials = engineUninterrupted.getTrials();

    // Run 2: Step 6 times -> Checkpoint -> Restore into new instance -> Step 6 more times
    const enginePart1 = new ExperimentEngine({
      experimentId: 'resumed_exp',
      problem,
      algorithm: 'differential_evolution',
      seed,
      budget: 12,
    });
    for (let i = 0; i < 6; i++) {
      await enginePart1.stepOnce();
    }

    const checkpoint = enginePart1.createCheckpoint();
    const checkpointJSON = JSON.stringify(checkpoint);
    const restoredCheckpoint = JSON.parse(checkpointJSON);

    const engineRestored = ExperimentEngine.restoreFromCheckpoint(restoredCheckpoint, problem);
    for (let i = 6; i < 12; i++) {
      await engineRestored.stepOnce();
    }
    const resumedTrials = engineRestored.getTrials();

    // Verify all 12 steps match bit-for-bit
    let matches = 0;
    for (let i = 0; i < 12; i++) {
      const u = uninterruptedTrials[i];
      const r = resumedTrials[i];
      if (u.trialHash === r.trialHash) {
        matches++;
      }
    }

    const passed = matches === 12 && resumedTrials.length === 12;

    return {
      id: 'p2_test_checkpoint_resume',
      name: 'Phase 2.2: Checkpoint Serialization & Resumption Integrity',
      category: 'State Persistence',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Checkpoint serialized to JSON, restored cleanly, and completed 12/12 matching deterministic iterations.`
        : `Checkpoint resume mismatch: ${matches}/12 matches.`,
      details: {
        checkpointId: checkpoint.checkpointId,
        uninterruptedHash: uninterruptedTrials[11]?.trialHash,
        resumedHash: resumedTrials[11]?.trialHash,
        matches,
      },
    };
  }

  /**
   * Test 2.3: Single-Step Execution Lifecycle
   */
  public static async testStepLifecycle(): Promise<TestResult> {
    const ackleyDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_b_ackley') || BENCHMARK_CATALOG[1];
    const problem = ackleyDef.problem;

    const engine = new ExperimentEngine({
      experimentId: 'lifecycle_test',
      problem,
      algorithm: 'random_search',
      seed: 999,
      budget: 5,
    });

    const statusHistory: string[] = [engine.getStatus()];

    for (let i = 0; i < 5; i++) {
      await engine.stepOnce();
      statusHistory.push(engine.getStatus());
    }

    const finalStatus = engine.getStatus();
    const trials = engine.getTrials();
    const passed = trials.length === 5 && finalStatus === 'completed';

    return {
      id: 'p2_test_step_lifecycle',
      name: 'Phase 2.3: Single-Step Lifecycle & State Transitions',
      category: 'Engine Lifecycle',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Successfully stepped 5 discrete evaluations. Transitioned through state machine to 'completed'.`
        : `Lifecycle state unexpected (final status: ${finalStatus}, trials: ${trials.length}).`,
      details: { statusHistory, finalStatus, totalTrials: trials.length },
    };
  }

  /**
   * Test 2.4: Mathematical Regret & Hypervolume Metrics
   */
  public static async testMetricsCalculation(): Promise<TestResult> {
    const sphereDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_a_sphere') || BENCHMARK_CATALOG[0];
    const zdt1Def = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_d_zdt1') || BENCHMARK_CATALOG[3];

    // 1. Single objective regret metrics on Sphere (optimum = 0.0)
    const sphereEngine = new ExperimentEngine({
      experimentId: 'metrics_sphere',
      problem: sphereDef.problem,
      algorithm: 'differential_evolution',
      seed: 42,
      budget: 15,
      knownOptimum: 0.0,
    });
    for (let i = 0; i < 15; i++) await sphereEngine.stepOnce();

    const sphereMetrics = sphereEngine.getMetrics();
    const simpleRegret = sphereMetrics.simpleRegret;
    const cumulativeRegret = sphereMetrics.cumulativeRegret;

    // Check simple regret monotonic non-increasing property: r_t <= r_{t-1}
    let isMonotonic = true;
    for (let i = 1; i < simpleRegret.length; i++) {
      if (simpleRegret[i] > simpleRegret[i - 1] + 1e-6) {
        isMonotonic = false;
        break;
      }
    }

    // 2. Multi-objective hypervolume on ZDT1
    const zdt1Engine = new ExperimentEngine({
      experimentId: 'metrics_zdt1',
      problem: zdt1Def.problem,
      algorithm: 'nsga_ii',
      seed: 42,
      budget: 15,
    });
    for (let i = 0; i < 15; i++) await zdt1Engine.stepOnce();

    const zdt1Metrics = zdt1Engine.getMetrics();
    const hv = MetricsEngine.calculate2DHypervolume(
      zdt1Engine.getTrials(),
      [2.0, 10.0],
      'f1_convergence',
      'f2_diversity'
    );

    const passed = isMonotonic && cumulativeRegret.length === 15 && hv > 0;

    return {
      id: 'p2_test_metrics_calculation',
      name: 'Phase 2.4: Mathematical Regret & Hypervolume Metrics',
      category: 'Mathematical Metrics',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Validated monotonic simple regret curve (${simpleRegret[0]} -> ${simpleRegret[14]}), cumulative regret, and 2D Hypervolume (${hv}).`
        : `Metrics assertion failure: isMonotonic (${isMonotonic}), hv (${hv}).`,
      details: {
        initialSimpleRegret: simpleRegret[0],
        finalSimpleRegret: simpleRegret[simpleRegret.length - 1],
        cumulativeRegretTotal: cumulativeRegret[cumulativeRegret.length - 1],
        hypervolume: hv,
      },
    };
  }

  /**
   * Test 2.5: Multi-Run Comparative Diffing Engine
   */
  public static async testRunDiffing(): Promise<TestResult> {
    const ackleyDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_b_ackley') || BENCHMARK_CATALOG[1];
    const problem = ackleyDef.problem;

    const engineA = new ExperimentEngine({
      experimentId: 'run_de',
      problem,
      algorithm: 'differential_evolution',
      seed: 42,
      budget: 20,
    });
    for (let i = 0; i < 20; i++) await engineA.stepOnce();

    const engineB = new ExperimentEngine({
      experimentId: 'run_rs',
      problem,
      algorithm: 'random_search',
      seed: 42,
      budget: 20,
    });
    for (let i = 0; i < 20; i++) await engineB.stepOnce();

    const mockRunA: OptimizationRun = {
      id: 'run_de',
      problemId: problem.id,
      problemName: problem.name,
      algorithm: 'differential_evolution',
      algorithmConfig: {},
      seed: 42,
      budget: 20,
      status: 'completed',
      progress: 1,
      currentIteration: 20,
      trials: engineA.getTrials(),
      result: {
        bestObjectiveValues: { value: engineA.getMetrics().currentBestValue ?? 0 },
        totalEvaluations: 20,
        feasibleEvaluations: 20,
        failedEvaluations: 0,
        terminationReason: 'Budget reached',
        totalDurationMs: 100,
        convergenceHistory: [],
      },
    };

    const mockRunB: OptimizationRun = {
      id: 'run_rs',
      problemId: problem.id,
      problemName: problem.name,
      algorithm: 'random_search',
      algorithmConfig: {},
      seed: 42,
      budget: 20,
      status: 'completed',
      progress: 1,
      currentIteration: 20,
      trials: engineB.getTrials(),
      result: {
        bestObjectiveValues: { value: engineB.getMetrics().currentBestValue ?? 0 },
        totalEvaluations: 20,
        feasibleEvaluations: 20,
        failedEvaluations: 0,
        terminationReason: 'Budget reached',
        totalDurationMs: 100,
        convergenceHistory: [],
      },
    };

    const diff = MetricsEngine.computeRunDiff(mockRunA, mockRunB, problem);
    const passed = diff.evaluationsA === 20 && diff.evaluationsB === 20 && diff.parameterSpreadDiff.x1 !== undefined;

    return {
      id: 'p2_test_run_diffing',
      name: 'Phase 2.5: Multi-Run Comparative Diffing Engine',
      category: 'Run Comparison & Diff',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Successfully computed comparative diff between DE and Random Search (Winner: Algorithm ${diff.fasterConvergenceWinner}, Delta: ${diff.objectiveImprovementDelta}).`
        : `Run diffing computation error.`,
      details: {
        winner: diff.fasterConvergenceWinner,
        bestA: diff.bestObjectiveA,
        bestB: diff.bestObjectiveB,
        delta: diff.objectiveImprovementDelta,
        spread: diff.parameterSpreadDiff,
      },
    };
  }

  /**
   * Test 2.6: Deterministic Experiment Replay & Verification
   */
  public static async testDeterministicReplay(): Promise<TestResult> {
    const sphereDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_a_sphere') || BENCHMARK_CATALOG[0];
    const problem = sphereDef.problem;

    const engine = new ExperimentEngine({
      experimentId: 'orig_replay_exp',
      problem,
      algorithm: 'differential_evolution',
      seed: 777,
      budget: 10,
    });
    for (let i = 0; i < 10; i++) await engine.stepOnce();

    const checkpoint = engine.createCheckpoint();
    const replayResult = await ExperimentEngine.replayAndVerify(checkpoint, problem);

    const passed = replayResult.passed && replayResult.trialsChecked === 10 && replayResult.discrepancies.length === 0;

    return {
      id: 'p2_test_replay_verify',
      name: 'Phase 2.6: Deterministic Experiment Replay & Verification',
      category: 'Audit & Cryptography',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Replayed 10 historical trials through simulator with zero parameter or output discrepancies.`
        : `Replay verification encountered ${replayResult.discrepancies.length} discrepancies.`,
      details: {
        trialsChecked: replayResult.trialsChecked,
        discrepancies: replayResult.discrepancies,
      },
    };
  }

  /**
   * Test 2.7: Constraint Feasibility Tracking & Metrics
   */
  public static async testConstraintFeasibilityTracking(): Promise<TestResult> {
    const weldedDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_c_welded_beam') || BENCHMARK_CATALOG[2];
    const problem = weldedDef.problem;

    const engine = new ExperimentEngine({
      experimentId: 'welded_audit',
      problem,
      algorithm: 'differential_evolution',
      seed: 42,
      budget: 25,
    });
    for (let i = 0; i < 25; i++) await engine.stepOnce();

    const metrics = engine.getMetrics();
    const feasibilityTimeline = metrics.feasibilityRatioTrajectory;
    const constraintViolations = metrics.averageConstraintViolation;

    const passed = feasibilityTimeline.length === 25 && constraintViolations.length === 25;

    return {
      id: 'p2_test_constraint_metrics',
      name: 'Phase 2.7: Constraint Feasibility Tracking & Penalty Metrics',
      category: 'Mathematical Metrics',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Tracked cumulative feasibility ratio (${feasibilityTimeline[feasibilityTimeline.length - 1] * 100}% feasible) and violation magnitudes across 25 evaluations.`
        : `Constraint metrics timeline mismatch.`,
      details: {
        finalFeasibilityRatio: feasibilityTimeline[feasibilityTimeline.length - 1],
        avgViolationAtLastStep: constraintViolations[constraintViolations.length - 1],
      },
    };
  }

  /**
   * Master execution runner for Phase 2 test suite
   */
  public static async runAllTests(
    onProgress?: (testName: string, passed: boolean) => void
  ): Promise<{ results: TestResult[]; passed: number; total: number }> {
    const tests = [
      Phase2TestSuite.testAuditTrailIntegrity,
      Phase2TestSuite.testCheckpointAndResume,
      Phase2TestSuite.testStepLifecycle,
      Phase2TestSuite.testMetricsCalculation,
      Phase2TestSuite.testRunDiffing,
      Phase2TestSuite.testDeterministicReplay,
      Phase2TestSuite.testConstraintFeasibilityTracking,
    ];

    const results: TestResult[] = [];
    let passedCount = 0;

    for (const testFn of tests) {
      const startTime = performance.now();
      try {
        const result = await testFn();
        result.durationMs = Math.round(performance.now() - startTime);
        if (result.status === 'passed') passedCount++;
        results.push(result);
        if (onProgress) onProgress(result.name, result.status === 'passed');
      } catch (err: any) {
        results.push({
          id: `p2_error_${Date.now()}`,
          name: testFn.name,
          category: 'Error',
          status: 'failed',
          durationMs: Math.round(performance.now() - startTime),
          message: `Unhandled exception during test: ${err?.message || err}`,
          details: { error: String(err) },
        });
        if (onProgress) onProgress(testFn.name, false);
      }
    }

    return {
      results,
      passed: passedCount,
      total: tests.length,
    };
  }
}
