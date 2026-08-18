import { Problem, BenchmarkReport, AlgorithmType } from '../../types';
import { OptimizationEngine } from '../algorithms/engine';

export interface BenchmarkDefinition {
  id: string;
  name: string;
  category: 'A_convex' | 'B_non_convex' | 'C_constrained' | 'D_multi_objective' | 'E_expensive' | 'EV_thermal';
  description: string;
  problem: Problem;
  knownOptimum?: {
    parameters: Record<string, number>;
    objectives: Record<string, number>;
  };
  recommendedBudget: number;
}

export const BENCHMARK_CATALOG: BenchmarkDefinition[] = [
  {
    id: 'benchmark_a_sphere',
    name: 'Benchmark A: Convex Sphere Function',
    category: 'A_convex',
    description: 'Continuous smooth convex quadratic bowl f(x) = sum(x_i^2) across 4 dimensions. Known global minimum at origin x* = 0, f(0) = 0.',
    recommendedBudget: 35,
    knownOptimum: {
      parameters: { x1: 0, x2: 0, x3: 0, x4: 0 },
      objectives: { value: 0 },
    },
    problem: {
      id: 'prob_bench_a',
      name: 'Benchmark A: 4D Sphere Function',
      description: 'Convex quadratic bowl benchmark testing basic optimization convergence rate.',
      version: '1.0',
      category: 'benchmark',
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-18T00:00:00Z',
      variables: [
        { id: 'v1', name: 'x1', type: 'continuous', lowerBound: -5.0, upperBound: 5.0, unit: '', description: 'Dimension 1' },
        { id: 'v2', name: 'x2', type: 'continuous', lowerBound: -5.0, upperBound: 5.0, unit: '', description: 'Dimension 2' },
        { id: 'v3', name: 'x3', type: 'continuous', lowerBound: -5.0, upperBound: 5.0, unit: '', description: 'Dimension 3' },
        { id: 'v4', name: 'x4', type: 'continuous', lowerBound: -5.0, upperBound: 5.0, unit: '', description: 'Dimension 4' },
      ],
      objectives: [
        { id: 'obj1', name: 'value', direction: 'minimize', unit: '', description: 'Sphere scalar objective' }
      ],
      constraints: [],
      adapter: { type: 'builtin', builtinName: 'sphere' },
    },
  },
  {
    id: 'benchmark_b_ackley',
    name: 'Benchmark B: Multimodal Ackley Function',
    category: 'B_non_convex',
    description: 'Rugged non-convex landscape with exponential envelope and deep sinusoidal local minima traps. Global minimum f(0) = 0.',
    recommendedBudget: 50,
    knownOptimum: {
      parameters: { x1: 0, x2: 0, x3: 0 },
      objectives: { value: 0 },
    },
    problem: {
      id: 'prob_bench_b',
      name: 'Benchmark B: 3D Ackley Function',
      description: 'Rugged non-convex landscape testing resistance to premature local-optima convergence.',
      version: '1.0',
      category: 'benchmark',
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-18T00:00:00Z',
      variables: [
        { id: 'v1', name: 'x1', type: 'continuous', lowerBound: -5.0, upperBound: 5.0, unit: '', description: 'Dimension 1' },
        { id: 'v2', name: 'x2', type: 'continuous', lowerBound: -5.0, upperBound: 5.0, unit: '', description: 'Dimension 2' },
        { id: 'v3', name: 'x3', type: 'continuous', lowerBound: -5.0, upperBound: 5.0, unit: '', description: 'Dimension 3' },
      ],
      objectives: [
        { id: 'obj1', name: 'value', direction: 'minimize', unit: '', description: 'Ackley scalar objective' }
      ],
      constraints: [],
      adapter: { type: 'builtin', builtinName: 'ackley' },
    },
  },
  {
    id: 'benchmark_c_welded_beam',
    name: 'Benchmark C: Welded Beam Design (Constrained)',
    category: 'C_constrained',
    description: 'Classic mechanical structural engineering problem. Minimizes welding & bar fabrication cost subject to shear stress, normal stress, deflection, and buckling load constraints.',
    recommendedBudget: 60,
    knownOptimum: {
      parameters: { h: 0.244, l: 6.218, t: 8.291, b: 0.244 },
      objectives: { fabrication_cost: 1.7248 },
    },
    problem: {
      id: 'prob_bench_c',
      name: 'Benchmark C: Welded Beam Design',
      description: 'Structural engineering optimization under shear stress, bending stress, and buckling load constraints.',
      version: '1.0',
      category: 'mechanical',
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-18T00:00:00Z',
      variables: [
        { id: 'v1', name: 'h', type: 'continuous', lowerBound: 0.125, upperBound: 2.0, unit: 'in', description: 'Weld thickness' },
        { id: 'v2', name: 'l', type: 'continuous', lowerBound: 0.1, upperBound: 10.0, unit: 'in', description: 'Weld length' },
        { id: 'v3', name: 't', type: 'continuous', lowerBound: 0.1, upperBound: 10.0, unit: 'in', description: 'Bar height' },
        { id: 'v4', name: 'b', type: 'continuous', lowerBound: 0.1, upperBound: 2.0, unit: 'in', description: 'Bar thickness' },
      ],
      objectives: [
        { id: 'obj1', name: 'fabrication_cost', direction: 'minimize', unit: '$', description: 'Total beam manufacturing cost' }
      ],
      constraints: [
        { id: 'c1', name: 'shear_stress_limit', operator: '<=', threshold: 13600, unit: 'psi', description: 'Shear stress tau <= 13,600 psi' },
        { id: 'c2', name: 'normal_stress_limit', operator: '<=', threshold: 30000, unit: 'psi', description: 'Bending stress sigma <= 30,000 psi' },
        { id: 'c3', name: 'deflection_limit', operator: '<=', threshold: 0.25, unit: 'in', description: 'Deflection delta <= 0.25 in' },
        { id: 'c4', name: 'buckling_load_limit', operator: '>=', threshold: 6000, unit: 'lb', description: 'Buckling critical load P_c >= 6,000 lb' },
      ],
      adapter: { type: 'builtin', builtinName: 'welded_beam' },
    },
  },
  {
    id: 'benchmark_d_zdt1',
    name: 'Benchmark D: ZDT1 Multi-Objective Front',
    category: 'D_multi_objective',
    description: 'Bi-objective convex Pareto front benchmark. Tests simultaneous convergence to f1 + f2 front and uniform diversity spread.',
    recommendedBudget: 50,
    problem: {
      id: 'prob_bench_d',
      name: 'Benchmark D: ZDT1 Bi-Objective',
      description: 'Standard multi-objective optimization benchmark testing non-dominated front discovery.',
      version: '1.0',
      category: 'benchmark',
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-18T00:00:00Z',
      variables: [
        { id: 'v1', name: 'x1', type: 'continuous', lowerBound: 0.0, upperBound: 1.0, unit: '', description: 'Design Var 1' },
        { id: 'v2', name: 'x2', type: 'continuous', lowerBound: 0.0, upperBound: 1.0, unit: '', description: 'Design Var 2' },
        { id: 'v3', name: 'x3', type: 'continuous', lowerBound: 0.0, upperBound: 1.0, unit: '', description: 'Design Var 3' },
        { id: 'v4', name: 'x4', type: 'continuous', lowerBound: 0.0, upperBound: 1.0, unit: '', description: 'Design Var 4' },
      ],
      objectives: [
        { id: 'obj1', name: 'f1_convergence', direction: 'minimize', unit: '', description: 'Primary objective f1' },
        { id: 'obj2', name: 'f2_diversity', direction: 'minimize', unit: '', description: 'Secondary objective f2' },
      ],
      constraints: [],
      adapter: { type: 'builtin', builtinName: 'zdt1' },
    },
  },
  {
    id: 'benchmark_e_expensive_aero',
    name: 'Benchmark E: Expensive Aerodynamic Airfoil',
    category: 'E_expensive',
    description: 'Synthetic Navier-Stokes CFD proxy with simulated computational latency (30ms per trial). Minimizes inverse Lift-to-Drag ratio and structural weight with stall margin constraints.',
    recommendedBudget: 30,
    problem: {
      id: 'prob_bench_e',
      name: 'Benchmark E: Expensive Airfoil Optimization',
      description: 'Simulated CFD surrogate benchmark testing sample efficiency and active learning.',
      version: '1.0',
      category: 'aerodynamics',
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-18T00:00:00Z',
      variables: [
        { id: 'v1', name: 'camber', type: 'continuous', lowerBound: 0.01, upperBound: 0.08, unit: '', description: 'Airfoil camber ratio' },
        { id: 'v2', name: 'thickness', type: 'continuous', lowerBound: 0.08, upperBound: 0.22, unit: '', description: 'Max thickness ratio' },
        { id: 'v3', name: 'angle_of_attack', type: 'continuous', lowerBound: 1.0, upperBound: 14.0, unit: 'deg', description: 'Angle of Attack' },
        { id: 'v4', name: 'reynolds_scale', type: 'continuous', lowerBound: 0.8, upperBound: 1.8, unit: 'x10^6', description: 'Reynolds number scale' },
      ],
      objectives: [
        { id: 'obj1', name: 'inverse_lift_drag_ratio', direction: 'minimize', unit: '1/(L/D)', description: 'Inverse Aerodynamic Efficiency' },
        { id: 'obj2', name: 'structural_weight', direction: 'minimize', unit: 'kg/m', description: 'Airfoil Section Mass' },
      ],
      constraints: [
        { id: 'c1', name: 'min_stall_margin', operator: '>=', threshold: 0.85, unit: 'C_L', description: 'Minimum lift coefficient >= 0.85' },
        { id: 'c2', name: 'max_drag_coefficient', operator: '<=', threshold: 0.065, unit: 'C_D', description: 'Maximum drag coefficient <= 0.065' },
      ],
      adapter: { type: 'builtin', builtinName: 'expensive_aero', simulatedDelayMs: 25 },
    },
  },
  {
    id: 'benchmark_ev_thermal',
    name: 'EV Powertrain Thermal Management',
    category: 'EV_thermal',
    description: 'Multi-variable physical cooling circuit optimization for EV battery pack and dual inverters. Minimizes peak battery temperature, auxiliary pump/fan energy, and cooling system mass under strict temperature and pressure drop limits.',
    recommendedBudget: 45,
    problem: {
      id: 'prob_ev_thermal_main',
      name: 'EV Powertrain Thermal Management System',
      description: 'Physical co-optimization of radiator size, coolant flow rate, pump speed, fan speed, duct area, and heat exchanger efficiency.',
      version: '1.0',
      category: 'thermal',
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-18T00:00:00Z',
      variables: [
        { id: 'v1', name: 'radiator_area', type: 'continuous', lowerBound: 0.15, upperBound: 0.65, defaultValue: 0.35, unit: 'm²', description: 'Frontal Radiator Core Area' },
        { id: 'v2', name: 'coolant_flow', type: 'continuous', lowerBound: 8.0, upperBound: 45.0, defaultValue: 25.0, unit: 'L/min', description: 'Glycol Coolant Volume Flow Rate' },
        { id: 'v3', name: 'pump_speed', type: 'continuous', lowerBound: 1200, upperBound: 4500, defaultValue: 2800, unit: 'RPM', description: 'Brushless DC Coolant Pump Speed' },
        { id: 'v4', name: 'fan_speed', type: 'continuous', lowerBound: 600, upperBound: 3200, defaultValue: 1800, unit: 'RPM', description: 'Variable-Speed Radiator Fan RPM' },
        { id: 'v5', name: 'duct_area', type: 'continuous', lowerBound: 0.04, upperBound: 0.25, defaultValue: 0.12, unit: 'm²', description: 'Front Bumper Intake Duct Area' },
        { id: 'v6', name: 'heat_exchanger_efficiency', type: 'continuous', lowerBound: 0.65, upperBound: 0.98, defaultValue: 0.85, unit: '', description: 'Plate-Fin Heat Exchanger Effectiveness' },
      ],
      objectives: [
        { id: 'obj1', name: 'peak_temperature', direction: 'minimize', unit: '°C', description: 'Peak Battery/Inverter Steady-State Temperature' },
        { id: 'obj2', name: 'energy_consumption', direction: 'minimize', unit: 'W', description: 'Parasitic Pump & Fan Electrical Power Draw' },
        { id: 'obj3', name: 'system_mass', direction: 'minimize', unit: 'kg', description: 'Total Thermal Subsystem Mass' },
      ],
      constraints: [
        { id: 'c1', name: 'max_temperature_margin', operator: '<=', threshold: 65.0, unit: '°C', description: 'Peak Component Temperature <= 65.0 °C' },
        { id: 'c2', name: 'max_pressure_drop', operator: '<=', threshold: 45.0, unit: 'kPa', description: 'Coolant Loop Hydraulic Pressure Drop <= 45.0 kPa' },
        { id: 'c3', name: 'pump_speed_limit', operator: '<=', threshold: 4500, unit: 'RPM', description: 'Pump Mechanical Speed Limit <= 4500 RPM' },
      ],
      adapter: { type: 'ev_thermal' },
    },
  },
];

/**
 * Executes a side-by-side benchmark comparison for multiple algorithms on a benchmark
 */
export async function runComparativeBenchmark(
  benchDef: BenchmarkDefinition,
  algorithms: AlgorithmType[],
  seed: number = 42,
  budget?: number,
  onProgress?: (alg: AlgorithmType, progress: number) => void
): Promise<BenchmarkReport> {
  const finalBudget = budget || benchDef.recommendedBudget;
  const results: BenchmarkReport['results'] = [];

  for (const alg of algorithms) {
    const engine = new OptimizationEngine(benchDef.problem);
    const runId = `bench_${benchDef.id}_${alg}_${seed}`;

    const res = await engine.executeRun(
      {
        id: runId,
        algorithm: alg,
        seed,
        budget: finalBudget,
      },
      {
        onTrialComplete: (_trial, progress) => {
          if (onProgress) onProgress(alg, progress);
        },
      }
    );

    const primaryObj = benchDef.problem.objectives[0];
    const isMin = primaryObj ? primaryObj.direction === 'minimize' : true;
    const bestObj = res.bestObjectiveValues && primaryObj 
      ? res.bestObjectiveValues[primaryObj.name] 
      : (isMin ? 999999 : -999999);

    const failedCount = res.totalEvaluations - res.feasibleEvaluations;
    const successRate = Number(((res.feasibleEvaluations / Math.max(res.totalEvaluations, 1)) * 100).toFixed(1));

    // Convergence rate (evaluations needed to reach within 10% of final best)
    let convEval = finalBudget;
    for (const pt of res.convergenceHistory) {
      if (pt.feasibleBestObjective !== undefined) {
        if (Math.abs(pt.feasibleBestObjective - bestObj) <= Math.abs(bestObj) * 0.1 + 1e-4) {
          convEval = pt.iteration;
          break;
        }
      }
    }

    const algNames: Record<AlgorithmType, string> = {
      random_search: 'Random Search',
      differential_evolution: 'Differential Evolution',
      tpe: 'Tree-structured Parzen Estimator (TPE)',
      bayesian_optimization: 'Bayesian Optimization (GP)',
      nsga_ii: 'NSGA-II (Pareto)',
      surrogate_active_learning: 'Surrogate Active Learning',
    };

    results.push({
      algorithm: alg,
      algorithmName: algNames[alg] || alg,
      seed,
      budget: finalBudget,
      evaluationsCompleted: res.totalEvaluations,
      bestObjective: bestObj,
      bestFeasibleObjective: bestObj,
      constraintViolations: failedCount,
      executionTimeMs: res.totalDurationMs,
      convergenceRate: convEval,
      successRate,
    });
  }

  return {
    benchmarkId: benchDef.id,
    benchmarkName: benchDef.name,
    description: benchDef.description,
    knownOptimum: benchDef.knownOptimum,
    results,
  };
}
