import { Problem } from '../../types';
import { MultiObjectiveEngine, ParetoPoint } from '../multi_objective/multiObjectiveEngine';
import { BENCHMARK_CATALOG } from '../benchmarks/benchmarkSuite';
import { TestResult } from './phase1.test';

export class Phase5TestSuite {
  /**
   * Run all Phase 5 Multi-Objective Engineering verification tests
   */
  public static async runAllTests(onProgress?: (testName: string, passed: boolean) => void): Promise<{
    passed: number;
    total: number;
    results: TestResult[];
  }> {
    const results: TestResult[] = [];

    const tests = [
      this.testStrictParetoDominanceLogic,
      this.testFastNonDominatedSortingHierarchy,
      this.testCrowdingDistanceBoundaryPreservation,
      this.testHypervolumeIndicatorConvergence,
      this.testGenerationalAndInvertedGenerationalDistance,
      this.testKneePointTradeoffCurvatureDetection,
      this.testTOPSISMultiCriteriaDecisionMaking,
    ];

    for (const testFn of tests) {
      const start = performance.now();
      try {
        const res = await testFn.call(this);
        const durationMs = Math.round(performance.now() - start);
        const fullRes = { ...res, durationMs };
        results.push(fullRes);
        if (onProgress) onProgress(fullRes.name, fullRes.status === 'passed');
      } catch (err: any) {
        const durationMs = Math.round(performance.now() - start);
        const failRes: TestResult = {
          id: `test_p5_err_${Date.now()}`,
          name: testFn.name,
          category: 'Multi-Objective',
          status: 'failed',
          durationMs,
          message: `Unhandled exception in Phase 5 test: ${err?.message || err}`,
        };
        results.push(failRes);
        if (onProgress) onProgress(failRes.name, false);
      }
    }

    const passed = results.filter(r => r.status === 'passed').length;
    return { passed, total: results.length, results };
  }

  /**
   * Phase 5.1: Strict Pareto Dominance
   * Validates partial order relations: A dominates B iff A_i <= B_i for all i and A_j < B_j for some j.
   */
  public static async testStrictParetoDominanceLogic(): Promise<TestResult> {
    const zdt1 = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_d_zdt1')!;
    const engine = new MultiObjectiveEngine(zdt1.problem);

    const ptA: ParetoPoint = {
      parameters: { x1: 0.1 },
      objectiveValues: { f1: 0.2, f2: 0.5 },
      feasible: true,
    };
    const ptB: ParetoPoint = {
      parameters: { x1: 0.2 },
      objectiveValues: { f1: 0.4, f2: 0.8 },
      feasible: true,
    };
    const ptC: ParetoPoint = {
      parameters: { x1: 0.3 },
      objectiveValues: { f1: 0.1, f2: 0.9 }, // Non-dominated with A
      feasible: true,
    };
    const ptInfeasible: ParetoPoint = {
      parameters: { x1: 0.4 },
      objectiveValues: { f1: 0.05, f2: 0.05 },
      feasible: false,
    };

    const aDominatesB = engine.dominates(ptA, ptB);
    const bDominatesA = engine.dominates(ptB, ptA);
    const aDominatesC = engine.dominates(ptA, ptC);
    const cDominatesA = engine.dominates(ptC, ptA);
    const aDominatesInfeasible = engine.dominates(ptA, ptInfeasible);

    const passed = aDominatesB && !bDominatesA && !aDominatesC && !cDominatesA && aDominatesInfeasible;

    return {
      id: 'phase5_1_dominance',
      name: 'Phase 5.1: Strict Pareto Dominance & Feasibility Partial Ordering',
      category: 'Multi-Objective',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? 'Pareto dominance correctly enforces multi-objective partial ordering & feasibility priority.'
        : 'Pareto dominance relation failed.',
      details: {
        aDominatesB,
        bDominatesA,
        aDominatesC,
        cDominatesA,
        aDominatesInfeasible,
      },
    };
  }

  /**
   * Phase 5.2: Fast Non-Dominated Sorting Hierarchy
   * Validates sorting population into discrete Pareto rank tiers F_1, F_2, F_3 without rank inversions.
   */
  public static async testFastNonDominatedSortingHierarchy(): Promise<TestResult> {
    const zdt1 = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_d_zdt1')!;
    const engine = new MultiObjectiveEngine(zdt1.problem);

    const population: ParetoPoint[] = [
      { parameters: {}, objectiveValues: { f1: 0.1, f2: 0.8 }, feasible: true }, // Rank 1
      { parameters: {}, objectiveValues: { f1: 0.4, f2: 0.3 }, feasible: true }, // Rank 1
      { parameters: {}, objectiveValues: { f1: 0.2, f2: 0.9 }, feasible: true }, // Rank 2 (dominated by 0.1, 0.8)
      { parameters: {}, objectiveValues: { f1: 0.5, f2: 0.4 }, feasible: true }, // Rank 2 (dominated by 0.4, 0.3)
      { parameters: {}, objectiveValues: { f1: 0.9, f2: 0.9 }, feasible: true }, // Rank 3
    ];

    const fronts = engine.fastNonDominatedSort(population);

    const has3Fronts = fronts.length >= 3;
    const rank1Count = fronts[0].length === 2;
    const rank2Count = fronts[1].length === 2;
    const rank3Count = fronts[2].length === 1;

    const passed = has3Fronts && rank1Count && rank2Count && rank3Count;

    return {
      id: 'phase5_2_sorting',
      name: 'Phase 5.2: Fast Non-Dominated Sorting Hierarchy (O(MN²))',
      category: 'Multi-Objective',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Non-dominated sorting partitioned population into ${fronts.length} exact rank fronts (F1: ${fronts[0].length}, F2: ${fronts[1].length}, F3: ${fronts[2].length}).`
        : 'Non-dominated sorting failed front partitioning.',
      details: {
        frontCount: fronts.length,
        f1Size: fronts[0]?.length,
        f2Size: fronts[1]?.length,
        f3Size: fronts[2]?.length,
      },
    };
  }

  /**
   * Phase 5.3: Crowding Distance & Boundary Preservation
   * Verifies infinite crowding distance on extreme boundary points and proportional density spacing for interior points.
   */
  public static async testCrowdingDistanceBoundaryPreservation(): Promise<TestResult> {
    const zdt1 = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_d_zdt1')!;
    const engine = new MultiObjectiveEngine(zdt1.problem);

    const front: ParetoPoint[] = [
      { parameters: {}, objectiveValues: { f1: 0.0, f2: 1.0 }, feasible: true },
      { parameters: {}, objectiveValues: { f1: 0.2, f2: 0.6 }, feasible: true },
      { parameters: {}, objectiveValues: { f1: 0.8, f2: 0.2 }, feasible: true },
      { parameters: {}, objectiveValues: { f1: 1.0, f2: 0.0 }, feasible: true },
    ];

    engine.assignCrowdingDistance(front);

    const boundaryLeftInf = front[0].crowdingDistance === Infinity;
    const boundaryRightInf = front[front.length - 1].crowdingDistance === Infinity;
    const interiorFinite = (front[1].crowdingDistance ?? 0) > 0 && Number.isFinite(front[1].crowdingDistance);

    const passed = boundaryLeftInf && boundaryRightInf && interiorFinite;

    return {
      id: 'phase5_3_crowding',
      name: 'Phase 5.3: Crowding Distance Estimation & Boundary Preservation',
      category: 'Multi-Objective',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? 'Crowding distance properly assigns Infinity to extremal boundaries and normalized spacing metrics to interior members.'
        : 'Crowding distance calculation failed boundary conditions.',
      details: {
        cd0: front[0].crowdingDistance,
        cd1: front[1].crowdingDistance,
        cd2: front[2].crowdingDistance,
        cd3: front[3].crowdingDistance,
      },
    };
  }

  /**
   * Phase 5.4: Hypervolume Indicator Metric
   * Validates exact 2D hypervolume integral over reference point [2.0, 10.0].
   */
  public static async testHypervolumeIndicatorConvergence(): Promise<TestResult> {
    const zdt1 = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_d_zdt1')!;
    const engine = new MultiObjectiveEngine(zdt1.problem);

    const refPoint: [number, number] = [2.0, 10.0];

    // Weak front vs Strong front
    const weakFront: ParetoPoint[] = [
      { parameters: {}, objectiveValues: { f1: 1.5, f2: 8.0 }, feasible: true },
    ];
    const strongFront: ParetoPoint[] = [
      { parameters: {}, objectiveValues: { f1: 0.1, f2: 0.9 }, feasible: true },
      { parameters: {}, objectiveValues: { f1: 0.5, f2: 0.5 }, feasible: true },
      { parameters: {}, objectiveValues: { f1: 0.9, f2: 0.1 }, feasible: true },
    ];

    const hvWeak = engine.calculateHypervolume2D(weakFront, refPoint);
    const hvStrong = engine.calculateHypervolume2D(strongFront, refPoint);

    const passed = hvStrong > hvWeak && hvStrong > 10.0;

    return {
      id: 'phase5_4_hypervolume',
      name: 'Phase 5.4: Exact Hypervolume (HV) Dominated Space Indicator',
      category: 'Multi-Objective',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Hypervolume correctly captures front convergence: HV(Strong)=${hvStrong.toFixed(3)} > HV(Weak)=${hvWeak.toFixed(3)}.`
        : 'Hypervolume calculation failed.',
      details: {
        hvWeak,
        hvStrong,
      },
    };
  }

  /**
   * Phase 5.5: Generational Distance (GD) & Inverted Generational Distance (IGD)
   * Validates GD and IGD convergence metrics against true mathematical Pareto frontier.
   */
  public static async testGenerationalAndInvertedGenerationalDistance(): Promise<TestResult> {
    const zdt1 = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_d_zdt1')!;
    const engine = new MultiObjectiveEngine(zdt1.problem);

    // True Pareto front for ZDT1: f2 = 1 - sqrt(f1)
    const trueFront: { x: number; y: number }[] = [];
    for (let i = 0; i <= 20; i++) {
      const f1 = i / 20;
      const f2 = 1.0 - Math.sqrt(f1);
      trueFront.push({ x: f1, y: f2 });
    }

    // Near front (high quality)
    const nearFront: ParetoPoint[] = trueFront.map(p => ({
      parameters: {},
      objectiveValues: { f1: p.x + 0.01, f2: p.y + 0.01 },
      feasible: true,
    }));

    // Far front (poor quality)
    const farFront: ParetoPoint[] = [
      { parameters: {}, objectiveValues: { f1: 0.8, f2: 0.9 }, feasible: true },
      { parameters: {}, objectiveValues: { f1: 0.9, f2: 0.8 }, feasible: true },
    ];

    const gdNear = engine.calculateGenerationalDistance(nearFront, trueFront);
    const gdFar = engine.calculateGenerationalDistance(farFront, trueFront);

    const igdNear = engine.calculateInvertedGenerationalDistance(nearFront, trueFront);
    const igdFar = engine.calculateInvertedGenerationalDistance(farFront, trueFront);

    const passed = gdNear < gdFar && igdNear < igdFar && gdNear < 0.05;

    return {
      id: 'phase5_5_gd_igd',
      name: 'Phase 5.5: Generational Distance (GD) & Inverted Generational Distance (IGD)',
      category: 'Multi-Objective',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `GD/IGD convergence verified: GD(near)=${gdNear.toFixed(4)} < GD(far)=${gdFar.toFixed(4)}, IGD(near)=${igdNear.toFixed(4)} < IGD(far)=${igdFar.toFixed(4)}.`
        : 'GD/IGD metric validation failed.',
      details: {
        gdNear,
        gdFar,
        igdNear,
        igdFar,
      },
    };
  }

  /**
   * Phase 5.6: Knee Point Curvature & Balanced Compromise Selection
   * Validates automatic detection of maximum trade-off marginal rate on convex Pareto frontiers.
   */
  public static async testKneePointTradeoffCurvatureDetection(): Promise<TestResult> {
    const zdt1 = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_d_zdt1')!;
    const engine = new MultiObjectiveEngine(zdt1.problem);

    const convexFront: ParetoPoint[] = [
      { parameters: {}, objectiveValues: { f1: 0.0, f2: 1.0 }, feasible: true },
      { parameters: {}, objectiveValues: { f1: 0.1, f2: 0.68 }, feasible: true },
      { parameters: {}, objectiveValues: { f1: 0.25, f2: 0.50 }, feasible: true }, // Knee point candidate
      { parameters: {}, objectiveValues: { f1: 0.64, f2: 0.20 }, feasible: true },
      { parameters: {}, objectiveValues: { f1: 1.0, f2: 0.0 }, feasible: true },
    ];

    const knee = engine.findKneePoint(convexFront);

    const passed = knee !== null && knee.objectiveValues.f1 > 0.0 && knee.objectiveValues.f1 < 1.0;

    return {
      id: 'phase5_6_knee_point',
      name: 'Phase 5.6: Knee Point Detection (Maximum Marginal Trade-off Curvature)',
      category: 'Multi-Objective',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Knee point accurately located at compromise coordinate (f1=${knee?.objectiveValues.f1}, f2=${knee?.objectiveValues.f2}).`
        : 'Knee point detection failed.',
      details: {
        kneePoint: knee?.objectiveValues,
      },
    };
  }

  /**
   * Phase 5.7: TOPSIS Multi-Criteria Decision Making (MCDM)
   * Validates ranked compromise selection using distance-to-ideal and distance-to-nadir weighting.
   */
  public static async testTOPSISMultiCriteriaDecisionMaking(): Promise<TestResult> {
    const zdt1 = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_d_zdt1')!;
    const engine = new MultiObjectiveEngine(zdt1.problem);

    const front: ParetoPoint[] = [
      { parameters: { name: 'DesignA' }, objectiveValues: { f1: 0.05, f2: 0.95 }, feasible: true },
      { parameters: { name: 'DesignB_Balanced' }, objectiveValues: { f1: 0.35, f2: 0.35 }, feasible: true },
      { parameters: { name: 'DesignC' }, objectiveValues: { f1: 0.95, f2: 0.05 }, feasible: true },
    ];

    // Equal weights (50% f1, 50% f2)
    const equalRes = engine.rankSolutionsTOPSIS(front, { weights: { f1: 0.5, f2: 0.5 } });

    // Heavily prioritize f1 (90% f1, 10% f2)
    const f1PrioritizedRes = engine.rankSolutionsTOPSIS(front, { weights: { f1: 0.9, f2: 0.1 } });

    const balancedWinsEqual = equalRes.selectedPoint.parameters.name === 'DesignB_Balanced';
    const aWinsF1Heavy = f1PrioritizedRes.selectedPoint.parameters.name === 'DesignA';

    const passed = balancedWinsEqual && aWinsF1Heavy && equalRes.ranking.length === 3;

    return {
      id: 'phase5_7_topsis',
      name: 'Phase 5.7: TOPSIS Multi-Criteria Decision Making & Preference Weighting',
      category: 'Multi-Objective',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `TOPSIS correctly prioritized balanced compromise for equal weights and Design A for 90/10 f1 bias.`
        : 'TOPSIS decision ranking failed to adhere to weight vectors.',
      details: {
        equalWinner: equalRes.selectedPoint.parameters.name,
        f1HeavyWinner: f1PrioritizedRes.selectedPoint.parameters.name,
        idealPoint: equalRes.idealPoint,
        nadirPoint: equalRes.nadirPoint,
      },
    };
  }
}
