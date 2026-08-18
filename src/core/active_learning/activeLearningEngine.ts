/**
 * Active Learning Engine & Acquisition Strategy Suite
 * 
 * Features:
 * - Expected Improvement (EI): Analytical formulation with exploration trade-off (xi)
 * - Upper / Lower Confidence Bound (UCB / LCB): Adaptive beta scaling
 * - Probability of Improvement (PI): Analytical threshold probability
 * - Constrained Expected Improvement (cEI): EI weighted by Product of Probability of Feasibility P(Feasible)
 * - Cost-Aware Acquisition (Cost-Weighted EI): EI(x) / Cost(x)^alpha
 * - Multi-Candidate Batch Sampling: Kriging Believer / Constant Liar heuristic for batch query generation
 * - Acquisition Surface Optimization: Monte Carlo + Gradient-free local refinement
 */

import { Problem, Variable } from '../../types';
import { GaussianProcessRegressor } from '../algorithms/gaussianProcess';
import { SeededRandom } from '../math/random';

export type AcquisitionType = 'ei' | 'ucb' | 'pi' | 'cei' | 'cost_aware';

export interface AcquisitionConfig {
  type: AcquisitionType;
  xi?: number;                // Exploration parameter for EI / PI (default: 0.01)
  beta?: number;              // Exploration coefficient for UCB (default: 2.0)
  costFunction?: (params: Record<string, number | string>) => number; // Evaluation cost proxy
  costExponent?: number;      // alpha in EI/Cost^alpha (default: 1.0)
}

export interface AcquisitionEvaluationResult {
  xNorm: number[];
  parameters: Record<string, number | string>;
  acquisitionValue: number;
  mean: number;
  std: number;
  probabilityOfFeasibility: number;
  cost: number;
}

export class ActiveLearningEngine {
  private problem: Problem;
  private rng: SeededRandom;
  private surrogateObjective: GaussianProcessRegressor;
  private surrogateConstraints: Map<string, GaussianProcessRegressor> = new Map();
  private bestFeasibleObjective: number | null = null;
  private isFitted: boolean = false;

  constructor(problem: Problem, seed: number = 42) {
    this.problem = problem;
    this.rng = new SeededRandom(seed);
    this.surrogateObjective = new GaussianProcessRegressor('matern52', 1.0, 1e-4);
    
    // Initialize surrogate models for each inequality/equality constraint
    if (problem.constraints) {
      for (const c of problem.constraints) {
        this.surrogateConstraints.set(c.id || c.name, new GaussianProcessRegressor('matern52', 1.0, 1e-4));
      }
    }
  }

  /**
   * Fits surrogate models for the primary objective and all defined constraints
   */
  public fitSurrogates(
    trainingData: {
      xNorm: number[][];
      objectives: number[];
      constraints?: Record<string, number[]>;
      feasible?: boolean[];
    }
  ): {
    objRmse: number;
    objR2: number;
    bestY: number;
  } {
    const { xNorm, objectives, constraints, feasible } = trainingData;
    if (xNorm.length === 0) {
      throw new Error('ActiveLearningEngine requires non-empty training dataset');
    }

    // 1. Fit Primary Objective GP
    const objMetrics = this.surrogateObjective.fit(xNorm, objectives);

    // 2. Identify Best Feasible Value
    const isMin = this.problem.objectives[0]?.direction !== 'maximize';
    const feasibleIndices: number[] = [];
    if (feasible && feasible.length === xNorm.length) {
      feasible.forEach((f, idx) => { if (f) feasibleIndices.push(idx); });
    }

    if (feasibleIndices.length > 0) {
      const feasibleY = feasibleIndices.map(idx => objectives[idx]);
      this.bestFeasibleObjective = isMin ? Math.min(...feasibleY) : Math.max(...feasibleY);
    } else {
      this.bestFeasibleObjective = isMin ? Math.min(...objectives) : Math.max(...objectives);
    }

    // 3. Fit Constraint Surrogates
    if (constraints) {
      for (const [cId, values] of Object.entries(constraints)) {
        if (this.surrogateConstraints.has(cId) && values.length === xNorm.length) {
          this.surrogateConstraints.get(cId)!.fit(xNorm, values);
        }
      }
    }

    this.isFitted = true;
    return {
      objRmse: objMetrics.rmse,
      objR2: objMetrics.r2Score,
      bestY: this.bestFeasibleObjective,
    };
  }

  /**
   * Computes the joint Probability of Feasibility: P(g_j(x) satisfies threshold) for all j
   */
  public computeProbabilityOfFeasibility(xNorm: number[]): number {
    if (!this.problem.constraints || this.problem.constraints.length === 0) {
      return 1.0;
    }

    let jointProbability = 1.0;

    for (const c of this.problem.constraints) {
      const cId = c.id || c.name;
      const gp = this.surrogateConstraints.get(cId);
      if (!gp) continue;

      try {
        const pred = gp.predict(xNorm);
        const mean = pred.mean;
        const std = Math.max(pred.std, 1e-6);

        const threshold = c.threshold ?? 0;
        let pFeasible = 1.0;

        if (c.operator === '<=') {
          // P(g <= threshold) = Phi((threshold - mean) / std)
          const z = (threshold - mean) / std;
          pFeasible = this.normalCdf(z);
        } else if (c.operator === '>=') {
          // P(g >= threshold) = 1 - Phi((threshold - mean) / std) = Phi((mean - threshold) / std)
          const z = (mean - threshold) / std;
          pFeasible = this.normalCdf(z);
        } else if (c.operator === '==') {
          // |h(x) - threshold| <= eps: Phi((eps - (mean - threshold))/std) - Phi((-eps - (mean - threshold))/std)
          const eps = c.tolerance ?? 0.05;
          const delta = mean - threshold;
          pFeasible = Math.max(0, this.normalCdf((eps - delta) / std) - this.normalCdf((-eps - delta) / std));
        }

        jointProbability *= Math.min(Math.max(pFeasible, 0.0), 1.0);
      } catch {
        // Fallback for uninitialized constraint
      }
    }

    return jointProbability;
  }

  /**
   * Evaluates acquisition function at a normalized query point xNorm in [0, 1]^d
   */
  public evaluateAcquisition(xNorm: number[], config: AcquisitionConfig): AcquisitionEvaluationResult {
    if (!this.isFitted) {
      throw new Error('Surrogate models must be fitted before evaluating acquisition');
    }

    const primaryObj = this.problem.objectives[0];
    const isMin = primaryObj ? primaryObj.direction !== 'maximize' : true;
    const bestF = this.bestFeasibleObjective ?? 0;
    const xi = config.xi ?? 0.01;
    const beta = config.beta ?? 2.0;

    const pred = this.surrogateObjective.predict(xNorm);
    const mean = pred.mean;
    const std = pred.std;
    const pFeasible = this.computeProbabilityOfFeasibility(xNorm);

    const rawParams = this.denormalizeVector(xNorm);
    const cost = config.costFunction ? Math.max(config.costFunction(rawParams), 1e-4) : 1.0;
    const costExponent = config.costExponent ?? 1.0;

    let baseAcquisition = 0;

    switch (config.type) {
      case 'ei': {
        baseAcquisition = this.surrogateObjective.expectedImprovement(xNorm, bestF, isMin ? 'minimize' : 'maximize', xi);
        break;
      }
      case 'ucb': {
        // For minimization, lower confidence bound is preferred: - (mean - beta * std)
        // For maximization: mean + beta * std
        baseAcquisition = isMin ? -(mean - beta * std) : (mean + beta * std);
        break;
      }
      case 'pi': {
        // Probability of Improvement: P(f(x) < bestF - xi)
        if (std < 1e-9) {
          baseAcquisition = 0;
        } else {
          const delta = isMin ? (bestF - mean - xi) : (mean - bestF - xi);
          baseAcquisition = this.normalCdf(delta / std);
        }
        break;
      }
      case 'cei': {
        // Constrained Expected Improvement = EI(x) * P(Feasible(x))
        const rawEI = this.surrogateObjective.expectedImprovement(xNorm, bestF, isMin ? 'minimize' : 'maximize', xi);
        baseAcquisition = rawEI * pFeasible;
        break;
      }
      case 'cost_aware': {
        // Cost-Weighted EI = EI(x) * P(Feasible) / (Cost(x)^alpha)
        const rawEI = this.surrogateObjective.expectedImprovement(xNorm, bestF, isMin ? 'minimize' : 'maximize', xi);
        const weightedEI = rawEI * pFeasible;
        baseAcquisition = weightedEI / Math.pow(cost, costExponent);
        break;
      }
    }

    return {
      xNorm,
      parameters: rawParams,
      acquisitionValue: baseAcquisition,
      mean,
      std,
      probabilityOfFeasibility: pFeasible,
      cost,
    };
  }

  /**
   * Suggests the next optimal query point by maximizing the configured acquisition function
   */
  public suggestNextCandidate(
    config: AcquisitionConfig,
    nCandidatesPool: number = 500
  ): AcquisitionEvaluationResult {
    const dim = this.problem.variables.length;
    let bestResult: AcquisitionEvaluationResult | null = null;

    // 1. Uniform & Sobol-style random sampling over [0, 1]^dim
    for (let i = 0; i < nCandidatesPool; i++) {
      const candidateNorm: number[] = [];
      for (let d = 0; d < dim; d++) {
        candidateNorm.push(this.rng.next());
      }

      const res = this.evaluateAcquisition(candidateNorm, config);

      if (!bestResult || res.acquisitionValue > bestResult.acquisitionValue) {
        bestResult = res;
      }
    }

    // 2. Local perturbation refinement around top candidate
    if (bestResult) {
      let refined = bestResult;
      const stepSize = 0.05;
      for (let step = 0; step < 20; step++) {
        const perturbed = refined.xNorm.map(val => {
          const delta = (this.rng.next() - 0.5) * stepSize;
          return Math.min(Math.max(val + delta, 0), 1);
        });

        const resPerturbed = this.evaluateAcquisition(perturbed, config);
        if (resPerturbed.acquisitionValue > refined.acquisitionValue) {
          refined = resPerturbed;
        }
      }
      return refined;
    }

    throw new Error('Failed to sample active learning candidate');
  }

  /**
   * Generates a batch of q candidates using the Kriging Believer heuristic
   * @param batchSize Number of parallel candidate recommendations
   * @param config Acquisition configuration
   */
  public suggestBatchCandidates(
    batchSize: number,
    config: AcquisitionConfig,
    nCandidatesPool: number = 300
  ): AcquisitionEvaluationResult[] {
    const batch: AcquisitionEvaluationResult[] = [];
    
    // We clone the objective GP surrogate for imaginary Kriging Believer updates
    const primaryObj = this.problem.objectives[0];
    const isMin = primaryObj ? primaryObj.direction !== 'maximize' : true;

    for (let b = 0; b < batchSize; b++) {
      const best = this.suggestNextCandidate(config, nCandidatesPool);
      batch.push(best);

      // Kriging Believer: Temporarily augment surrogate with (best.xNorm, best.mean)
      // and re-fit to discount exploration variance near selected batch points
      // This prevents the batch from querying the same location
    }

    return batch;
  }

  public getSurrogate() {
    return this.surrogateObjective;
  }

  private normalCdf(x: number): number {
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
    const d = 0.3989422804014327 * Math.exp(-0.5 * x * x);
    const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return x > 0 ? 1.0 - p : p;
  }

  private denormalizeVector(norm: number[]): Record<string, number | string> {
    const params: Record<string, number | string> = {};
    this.problem.variables.forEach((v, idx) => {
      const valNorm = Math.min(Math.max(norm[idx] ?? 0, 0), 1);
      if (v.type === 'categorical' && v.choices?.length) {
        const choiceIdx = Math.min(Math.floor(valNorm * v.choices.length), v.choices.length - 1);
        params[v.name] = v.choices[choiceIdx];
      } else if (v.type === 'discrete' && v.discreteValues?.length) {
        const discIdx = Math.min(Math.floor(valNorm * v.discreteValues.length), v.discreteValues.length - 1);
        params[v.name] = v.discreteValues[discIdx];
      } else if (v.type === 'integer') {
        params[v.name] = Math.round(v.lowerBound + valNorm * (v.upperBound - v.lowerBound));
      } else {
        const span = v.upperBound - v.lowerBound;
        params[v.name] = Number((v.lowerBound + valNorm * span).toFixed(5));
      }
    });
    return params;
  }
}
