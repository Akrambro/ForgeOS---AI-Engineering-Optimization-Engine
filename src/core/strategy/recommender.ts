import { Problem, AlgorithmRecommendation, AlgorithmType } from '../../types';

/**
 * Deterministic, Explainable Algorithm Strategy Recommender (PRD Section 12)
 */
export function recommendOptimizationStrategy(problem: Problem, budget: number = 50): AlgorithmRecommendation {
  const objCount = problem.objectives.length;
  const isMultiObj = objCount >= 2;
  const hasExpensiveEvaluator = (problem.adapter.simulatedDelayMs ?? 0) >= 200 || problem.adapter.type === 'ev_thermal';
  const hasCategorical = problem.variables.some(v => v.type === 'categorical');
  const continuousCount = problem.variables.filter(v => v.type === 'continuous').length;
  const totalDims = problem.variables.length;

  if (isMultiObj) {
    return {
      recommendedAlgorithm: 'nsga_ii',
      confidence: 0.95,
      reasons: [
        `Problem specifies ${objCount} concurrent objectives (${problem.objectives.map(o => o.name).join(', ')}).`,
        'NSGA-II provides fast non-dominated sorting and crowding distance assignment to map the full Pareto frontier.',
        'Enables trade-off analysis between competing physical metrics without artificial scalar weights.',
      ],
      alternativeAlgorithm: 'random_search',
      tradeoffAnalysis: 'Multi-objective genetic algorithms require slightly higher evaluation budgets (>= 40 trials) to develop crisp Pareto fronts.',
    };
  }

  if (hasExpensiveEvaluator || budget <= 40) {
    return {
      recommendedAlgorithm: 'bayesian_optimization',
      confidence: 0.92,
      reasons: [
        'Evaluation is computationally expensive or budget is tightly constrained (<= 40 trials).',
        'Bayesian Optimization fits a Gaussian Process surrogate with Matérn 5/2 covariance to balance exploration and exploitation.',
        'Expected Improvement (EI) acquisition selects maximally informative experiment candidates.',
      ],
      alternativeAlgorithm: 'tpe',
      tradeoffAnalysis: 'Gaussian Process inversion scales with O(N^3) in number of evaluations, making it ideal for budgets under 250 evaluations.',
    };
  }

  if (hasCategorical || totalDims > 8) {
    return {
      recommendedAlgorithm: 'tpe',
      confidence: 0.88,
      reasons: [
        hasCategorical ? 'Search space contains categorical/discrete choices.' : 'Moderate-to-high dimensionality.',
        'Tree-Structured Parzen Estimator models p(x|y) using Gaussian Mixture / Parzen window densities.',
        'Scales linearly O(N) with evaluations and flexibly handles mixed continuous/categorical spaces.',
      ],
      alternativeAlgorithm: 'differential_evolution',
      tradeoffAnalysis: 'TPE performs well across non-convex spaces without requiring expensive matrix inversions.',
    };
  }

  // Standard continuous single-objective engineering problem
  return {
    recommendedAlgorithm: 'differential_evolution',
    confidence: 0.90,
    reasons: [
      `Single-objective continuous search space (${continuousCount} continuous dimensions).`,
      'Differential Evolution (DE/rand/1/bin) offers superior global convergence on non-linear multimodal fitness landscapes.',
      'Self-adapting vector differences efficiently navigate rugged and constrained design spaces.',
    ],
    alternativeAlgorithm: 'bayesian_optimization',
    tradeoffAnalysis: 'DE requires more function evaluations than Bayesian Optimization, but scales smoothly to higher trial budgets.',
  };
}
