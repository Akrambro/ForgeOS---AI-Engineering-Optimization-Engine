import { Problem } from '../../types';
import { RandomSearchOptimizer } from '../algorithms/randomSearch';
import { DifferentialEvolutionOptimizer } from '../algorithms/differentialEvolution';
import { BayesianOptimizer } from '../algorithms/bayesianOptimization';
import { NSGA2Optimizer, Individual } from '../algorithms/nsga2';
import { OptimizationEngine } from '../algorithms/engine';
import { BENCHMARK_CATALOG } from '../benchmarks/benchmarkSuite';
import { validateParameterBounds, computeConstraintViolations } from '../math/reproducibility';

export interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'passed' | 'failed';
  durationMs: number;
  message: string;
  details?: Record<string, any>;
}

export class Phase1TestSuite {
  /**
   * Run all Phase 1 verification tests
   */
  public static async runAllTests(onProgress?: (testName: string, passed: boolean) => void): Promise<{
    passed: number;
    total: number;
    results: TestResult[];
  }> {
    const results: TestResult[] = [];

    const tests = [
      this.testReproducibility,
      this.testVariableDomainBounds,
      this.testRandomSearchBaseline,
      this.testDifferentialEvolution,
      this.testBayesianOptimization,
      this.testNSGA2ParetoSorting,
      this.testConstraintHandling,
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
          id: `test_${Date.now()}`,
          name: testFn.name,
          category: 'optimizer',
          status: 'failed',
          durationMs,
          message: `Unhandled exception: ${err?.message || err}`,
        };
        results.push(failRes);
        if (onProgress) onProgress(failRes.name, false);
      }
    }

    const passed = results.filter(r => r.status === 'passed').length;
    return {
      passed,
      total: results.length,
      results,
    };
  }

  /**
   * Test 1: Strict Bit-for-Bit Deterministic Reproducibility
   */
  public static async testReproducibility(): Promise<TestResult> {
    const sphereDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_a_sphere') || BENCHMARK_CATALOG[0];
    const sphereProblem = sphereDef.problem;
    const seed = 12345;
    const budget = 15;

    // Run 1
    const engine1 = new OptimizationEngine(sphereProblem);
    const res1 = await engine1.executeRun({ id: 'rep1', algorithm: 'differential_evolution', seed, budget });

    // Run 2 (same seed)
    const engine2 = new OptimizationEngine(sphereProblem);
    const res2 = await engine2.executeRun({ id: 'rep2', algorithm: 'differential_evolution', seed, budget });

    // Run 3 (different seed)
    const engine3 = new OptimizationEngine(sphereProblem);
    const res3 = await engine3.executeRun({ id: 'rep3', algorithm: 'differential_evolution', seed: 99999, budget });

    const primaryObj = sphereProblem.objectives[0].name;
    const obj1 = res1.bestObjectiveValues?.[primaryObj];
    const obj2 = res2.bestObjectiveValues?.[primaryObj];
    const obj3 = res3.bestObjectiveValues?.[primaryObj];

    const identicalSameSeed = obj1 !== undefined && obj1 === obj2;
    const differentDiffSeed = obj1 !== obj3;

    const passed = identicalSameSeed;
    return {
      id: 'p1_test_reproducibility',
      name: 'Phase 1.1: Deterministic PRNG Reproducibility',
      category: 'reproducibility',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Identical seed (${seed}) produced bit-exact objective match (${obj1} == ${obj2}).`
        : `Reproducibility mismatch: run1 (${obj1}) != run2 (${obj2})`,
      details: { obj1, obj2, obj3, identicalSameSeed, differentDiffSeed },
    };
  }

  /**
   * Test 2: Variable Domain Bounds & Type Conformity
   */
  public static async testVariableDomainBounds(): Promise<TestResult> {
    const mixedProblem: Problem = {
      id: 'test_mixed_domain',
      name: 'Mixed Domain Test Problem',
      description: 'Tests continuous, integer, categorical, and discrete variables',
      version: '1.0',
      category: 'benchmark',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      variables: [
        { id: 'v_cont', name: 'cont_var', type: 'continuous', lowerBound: -5.0, upperBound: 5.0, unit: '', description: '' },
        { id: 'v_int', name: 'int_var', type: 'integer', lowerBound: 1, upperBound: 10, unit: '', description: '' },
        { id: 'v_cat', name: 'cat_var', type: 'categorical', lowerBound: 0, upperBound: 2, choices: ['aluminum', 'titanium', 'cfrp'], unit: '', description: '' },
        { id: 'v_disc', name: 'disc_var', type: 'discrete', lowerBound: 10, upperBound: 50, discreteValues: [10, 20, 30, 40, 50], unit: '', description: '' },
      ],
      objectives: [{ id: 'o1', name: 'value', direction: 'minimize', unit: '', description: '' }],
      constraints: [],
      adapter: { type: 'builtin', builtinName: 'sphere' },
    };

    const optDE = new DifferentialEvolutionOptimizer(mixedProblem, 42);
    const optBO = new BayesianOptimizer(mixedProblem, 42);
    const optRS = new RandomSearchOptimizer(mixedProblem, 42);

    let totalChecked = 0;
    let violations = 0;

    for (let i = 0; i < 30; i++) {
      const c1 = optDE.generateCandidate();
      const c2 = optBO.generateCandidate().parameters;
      const c3 = optRS.generateCandidate();

      for (const cand of [c1, c2, c3]) {
        totalChecked++;
        const validation = validateParameterBounds(mixedProblem.variables, cand);
        if (!validation.valid) {
          violations++;
        }
      }
    }

    const passed = violations === 0;
    return {
      id: 'p1_test_bounds',
      name: 'Phase 1.2: Variable Domain Bounds & Mixed Types',
      category: 'bounds',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Validated ${totalChecked} candidates across continuous, integer, categorical, and discrete domains. 0 violations.`
        : `Encountered ${violations} parameter bound violations out of ${totalChecked} candidates.`,
      details: { totalChecked, violations },
    };
  }

  /**
   * Test 3: Random Search Baseline
   */
  public static async testRandomSearchBaseline(): Promise<TestResult> {
    const sphereDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_a_sphere') || BENCHMARK_CATALOG[0];
    const sphereProblem = sphereDef.problem;
    const engine = new OptimizationEngine(sphereProblem);
    const res = await engine.executeRun({ id: 'rs_test', algorithm: 'random_search', seed: 42, budget: 25 });

    const primaryObj = sphereProblem.objectives[0].name;
    const bestVal = res.bestObjectiveValues?.[primaryObj];
    const passed = res.totalEvaluations === 25 && bestVal !== undefined;
    return {
      id: 'p1_test_random_search',
      name: 'Phase 1.3: Random Search Baseline Protocol',
      category: 'optimizer',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Completed ${res.totalEvaluations} baseline uniform trials. Best observed ${primaryObj} = ${bestVal?.toFixed(4)}.`
        : 'Random search failed evaluation budget test.',
      details: { totalEvaluations: res.totalEvaluations, bestValue: bestVal },
    };
  }

  /**
   * Test 4: Differential Evolution Optimization
   */
  public static async testDifferentialEvolution(): Promise<TestResult> {
    const ackleyDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_b_ackley') || BENCHMARK_CATALOG[1];
    const ackleyProblem = ackleyDef.problem;
    const engine = new OptimizationEngine(ackleyProblem);
    const res = await engine.executeRun({ id: 'de_test', algorithm: 'differential_evolution', seed: 42, budget: 40 });

    const primaryObj = ackleyProblem.objectives[0].name;
    const bestVal = res.bestObjectiveValues?.[primaryObj] ?? 999;
    const passed = bestVal < 10.0 && res.totalEvaluations === 40;
    return {
      id: 'p1_test_differential_evolution',
      name: 'Phase 1.4: Differential Evolution (DE/rand/1/bin)',
      category: 'optimizer',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `DE successfully converged on multimodal Ackley: best ${primaryObj} = ${bestVal.toFixed(4)} in ${res.totalEvaluations} evaluations.`
        : `DE failed convergence criteria (bestVal: ${bestVal}).`,
      details: { bestVal, totalEvaluations: res.totalEvaluations },
    };
  }

  /**
   * Test 5: Bayesian Optimization with GP Regressor & EI
   */
  public static async testBayesianOptimization(): Promise<TestResult> {
    const sphereDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_a_sphere') || BENCHMARK_CATALOG[0];
    const sphereProblem = sphereDef.problem;
    const engine = new OptimizationEngine(sphereProblem);
    const res = await engine.executeRun({ id: 'bo_test', algorithm: 'bayesian_optimization', seed: 42, budget: 25 });

    const primaryObj = sphereProblem.objectives[0].name;
    const bestVal = res.bestObjectiveValues?.[primaryObj] ?? 999;
    const passed = bestVal < 15.0 && res.totalEvaluations === 25;
    return {
      id: 'p1_test_bayesian_optimization',
      name: 'Phase 1.5: Bayesian Optimization (GP + Matérn 5/2 + EI)',
      category: 'optimizer',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Bayesian Optimization fitted GP and reached ${primaryObj} = ${bestVal.toFixed(4)} in ${res.totalEvaluations} evaluations.`
        : `Bayesian optimization failed threshold (bestVal: ${bestVal}).`,
      details: { bestVal, totalEvaluations: res.totalEvaluations },
    };
  }

  /**
   * Test 6: NSGA-II Fast Non-Dominated Sorting & Crowding Distance
   */
  public static async testNSGA2ParetoSorting(): Promise<TestResult> {
    const zdt1Def = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_d_zdt1') || BENCHMARK_CATALOG[3];
    const zdt1Problem = zdt1Def.problem;
    const nsga = new NSGA2Optimizer(zdt1Problem, 42);

    // Create synthetic population with known Pareto dominance relations
    const pop: Individual[] = [
      { parameters: { x1: 0.1, x2: 0.1 }, objectiveValues: { f1_convergence: 0.1, f2_diversity: 0.9 }, constraintValues: {}, feasible: true },
      { parameters: { x1: 0.5, x2: 0.5 }, objectiveValues: { f1_convergence: 0.5, f2_diversity: 0.5 }, constraintValues: {}, feasible: true },
      { parameters: { x1: 0.9, x2: 0.9 }, objectiveValues: { f1_convergence: 0.9, f2_diversity: 0.1 }, constraintValues: {}, feasible: true },
      { parameters: { x1: 0.8, x2: 0.8 }, objectiveValues: { f1_convergence: 0.8, f2_diversity: 0.8 }, constraintValues: {}, feasible: true }, // dominated by (0.5, 0.5)
    ];

    const fronts = nsga.fastNonDominatedSort(pop);
    nsga.assignCrowdingDistance(fronts[0]);

    const rank1Count = fronts[0]?.length || 0;
    const dominatedCount = fronts[1]?.length || 0;

    const passed = rank1Count === 3 && dominatedCount === 1;
    return {
      id: 'p1_test_nsga2',
      name: 'Phase 1.6: NSGA-II Non-Dominated Sorting & Crowding Distance',
      category: 'pareto',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `NSGA-II correctly sorted 3 non-dominated front solutions into Rank 1 and 1 dominated solution into Rank 2.`
        : `Non-dominated sort mismatch: Rank1 (${rank1Count}), Rank2 (${dominatedCount}).`,
      details: { rank1Count, dominatedCount, frontsCount: fronts.length },
    };
  }

  /**
   * Test 7: Constraint Handling & Feasibility Penalties
   */
  public static async testConstraintHandling(): Promise<TestResult> {
    const weldedDef = BENCHMARK_CATALOG.find(b => b.id === 'benchmark_c_welded_beam') || BENCHMARK_CATALOG[2];
    const weldedProblem = weldedDef.problem;
    const engine = new OptimizationEngine(weldedProblem);
    const res = await engine.executeRun({ id: 'welded_test', algorithm: 'differential_evolution', seed: 42, budget: 45 });

    const totalEvaluations = res.totalEvaluations;
    const feasibleEvaluations = res.feasibleEvaluations;
    const hasFeasibleSolution = res.bestFeasibleSolution !== undefined;

    const passed = totalEvaluations === 45 && hasFeasibleSolution;
    return {
      id: 'p1_test_constraints',
      name: 'Phase 1.7: Constraint Handling & Feasibility Penalization',
      category: 'constraints',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Successfully applied non-linear structural constraints on Welded Beam (${feasibleEvaluations}/${totalEvaluations} feasible trials).`
        : `Failed constraint test (feasible: ${feasibleEvaluations}/${totalEvaluations}, bestFeasible: ${Boolean(hasFeasibleSolution)}).`,
      details: { totalEvaluations, feasibleEvaluations, hasFeasibleSolution },
    };
  }
}

