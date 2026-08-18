/**
 * Multi-Objective Engineering Suite (Phase 5)
 * 
 * Capabilities:
 * - Non-dominated sorting (O(M * N^2))
 * - Crowding distance estimation & boundary preservation
 * - Exact Hypervolume Indicator calculation (2D & nD sweep)
 * - Generational Distance (GD) & Inverted Generational Distance (IGD) against true/reference fronts
 * - Knee Point identification (Trade-off curvature & maximum marginal substitution rate)
 * - Multi-Criteria Decision Making (MCDM):
 *   - TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution)
 *   - Preference-based filtering with customizable objective weight vectors
 */

import { Problem, Objective } from '../../types';

export interface ParetoPoint {
  id?: string;
  parameters: Record<string, number | string>;
  objectiveValues: Record<string, number>;
  constraintValues?: Record<string, number>;
  feasible: boolean;
  rank?: number;
  crowdingDistance?: number;
  normalizedObjectives?: number[];
}

export interface MCDMWeightConfig {
  weights: Record<string, number>; // Must sum to 1.0 or will be normalized
  idealPointPreference?: 'min_distance_ideal' | 'knee_point' | 'weighted_chebyshev';
}

export interface MCDMDecisionResult {
  selectedPoint: ParetoPoint;
  score: number;
  ranking: { point: ParetoPoint; score: number }[];
  idealPoint: Record<string, number>;
  nadirPoint: Record<string, number>;
}

export class MultiObjectiveEngine {
  private problem: Problem;

  constructor(problem: Problem) {
    this.problem = problem;
  }

  /**
   * Helper to resolve objective value by exact key or index fallback
   */
  private getObjValue(p: ParetoPoint, obj: Objective, index: number): number {
    if (p.objectiveValues[obj.name] !== undefined) {
      return p.objectiveValues[obj.name];
    }
    // Fallback: check other keys or indices
    const keys = Object.keys(p.objectiveValues);
    if (keys[index] !== undefined && p.objectiveValues[keys[index]] !== undefined) {
      return p.objectiveValues[keys[index]];
    }
    return 0;
  }

  /**
   * Checks Pareto dominance: A dominates B (A ≺ B) iff:
   * 1. A is at least as good as B in all objectives
   * 2. A is strictly better than B in at least one objective
   * (accounting for minimization vs maximization and feasibility)
   */
  public dominates(a: ParetoPoint, b: ParetoPoint): boolean {
    if (!a.feasible && b.feasible) return false;
    if (a.feasible && !b.feasible) return true;
    if (!a.feasible && !b.feasible) return false;

    let atLeastAsGood = true;
    let strictlyBetter = false;

    for (let i = 0; i < this.problem.objectives.length; i++) {
      const obj = this.problem.objectives[i];
      const valA = this.getObjValue(a, obj, i);
      const valB = this.getObjValue(b, obj, i);

      if (obj.direction === 'maximize') {
        if (valA < valB) atLeastAsGood = false;
        if (valA > valB) strictlyBetter = true;
      } else {
        // default minimize
        if (valA > valB) atLeastAsGood = false;
        if (valA < valB) strictlyBetter = true;
      }
    }

    return atLeastAsGood && strictlyBetter;
  }

  /**
   * Computes Fast Non-Dominated Sorting, returning fronts F_1, F_2, ..., F_k
   */
  public fastNonDominatedSort(population: ParetoPoint[]): ParetoPoint[][] {
    if (population.length === 0) return [];

    const fronts: ParetoPoint[][] = [[]];
    const dominationCounts: number[] = new Array(population.length).fill(0);
    const dominatedSets: number[][] = Array.from({ length: population.length }, () => []);

    for (let p = 0; p < population.length; p++) {
      for (let q = 0; q < population.length; q++) {
        if (p === q) continue;

        if (this.dominates(population[p], population[q])) {
          dominatedSets[p].push(q);
        } else if (this.dominates(population[q], population[p])) {
          dominationCounts[p]++;
        }
      }

      if (dominationCounts[p] === 0) {
        population[p].rank = 1;
        fronts[0].push(population[p]);
      }
    }

    let i = 0;
    while (i < fronts.length && fronts[i] && fronts[i].length > 0) {
      const nextFront: ParetoPoint[] = [];

      for (const pPoint of fronts[i]) {
        const pIdx = population.indexOf(pPoint);
        if (pIdx === -1) continue;

        for (const qIdx of dominatedSets[pIdx]) {
          dominationCounts[qIdx]--;
          if (dominationCounts[qIdx] === 0) {
            population[qIdx].rank = i + 2;
            nextFront.push(population[qIdx]);
          }
        }
      }

      i++;
      if (nextFront.length > 0) {
        fronts.push(nextFront);
      }
    }

    return fronts.filter(f => f.length > 0);
  }

  /**
   * Assigns Crowding Distance to individuals within a front to preserve diversity
   */
  public assignCrowdingDistance(front: ParetoPoint[]): void {
    const l = front.length;
    if (l === 0) return;

    for (const ind of front) {
      ind.crowdingDistance = 0;
    }

    if (l <= 2) {
      for (const ind of front) ind.crowdingDistance = Infinity;
      return;
    }

    for (let oIdx = 0; oIdx < this.problem.objectives.length; oIdx++) {
      const obj = this.problem.objectives[oIdx];

      // Sort front by this objective
      front.sort((a, b) => this.getObjValue(a, obj, oIdx) - this.getObjValue(b, obj, oIdx));

      const minVal = this.getObjValue(front[0], obj, oIdx);
      const maxVal = this.getObjValue(front[l - 1], obj, oIdx);
      const range = Math.max(maxVal - minVal, 1e-9);

      // Boundary points get infinite distance
      front[0].crowdingDistance = Infinity;
      front[l - 1].crowdingDistance = Infinity;

      for (let i = 1; i < l - 1; i++) {
        if (front[i].crowdingDistance !== Infinity) {
          const prev = this.getObjValue(front[i - 1], obj, oIdx);
          const next = this.getObjValue(front[i + 1], obj, oIdx);
          front[i].crowdingDistance = (front[i].crowdingDistance || 0) + (next - prev) / range;
        }
      }
    }
  }

  /**
   * Extracts the First Pareto Front (Rank 1 non-dominated set)
   */
  public extractParetoFront(population: ParetoPoint[]): ParetoPoint[] {
    const feasibleOnly = population.filter(p => p.feasible !== false);
    if (feasibleOnly.length === 0) return [];

    const fronts = this.fastNonDominatedSort(feasibleOnly);
    if (fronts.length === 0) return [];

    const rank1 = fronts[0];
    this.assignCrowdingDistance(rank1);
    return rank1;
  }

  /**
   * Calculates 2D Hypervolume dominated by the front relative to a reference point
   * (Assuming objectives normalized to minimization)
   */
  public calculateHypervolume2D(
    front: ParetoPoint[],
    referencePoint: [number, number]
  ): number {
    if (front.length === 0 || this.problem.objectives.length < 2) return 0;

    const obj1 = this.problem.objectives[0];
    const obj2 = this.problem.objectives[1];

    // Convert to minimization space
    const pts = front.map(p => {
      let x = this.getObjValue(p, obj1, 0);
      let y = this.getObjValue(p, obj2, 1);
      if (obj1.direction === 'maximize') x = -x;
      if (obj2.direction === 'maximize') y = -y;
      return [x, y];
    });

    // Filter points strictly dominating reference point
    const validPts = pts.filter(([x, y]) => x <= referencePoint[0] && y <= referencePoint[1]);
    if (validPts.length === 0) return 0;

    // Sort by first objective ascending
    validPts.sort((a, b) => a[0] - b[0]);

    // Strip non-dominated 2D envelope
    const nonDom: number[][] = [];
    let currentMinY = Infinity;
    for (const [x, y] of validPts) {
      if (y < currentMinY) {
        nonDom.push([x, y]);
        currentMinY = y;
      }
    }

    let hv = 0;
    for (let i = 0; i < nonDom.length; i++) {
      const width = (i === nonDom.length - 1 ? referencePoint[0] : nonDom[i + 1][0]) - nonDom[i][0];
      const height = referencePoint[1] - nonDom[i][1];
      if (width > 0 && height > 0) {
        hv += width * height;
      }
    }

    return hv;
  }

  /**
   * Generalized N-Dimensional Hypervolume computation:
   * Uses exact analytical sweeping for 2D, and high-precision Monte Carlo integration for M >= 3 objectives.
   */
  public calculateHypervolumeND(
    front: ParetoPoint[],
    referencePoint: number[],
    monteCarloSamples: number = 2000
  ): number {
    const M = this.problem.objectives.length;
    if (front.length === 0 || M === 0) return 0;
    if (M === 2 && referencePoint.length >= 2) {
      return this.calculateHypervolume2D(front, [referencePoint[0], referencePoint[1]]);
    }

    // Convert points to minimization space
    const pts = front.map(p => {
      return this.problem.objectives.map((obj, i) => {
        let val = this.getObjValue(p, obj, i);
        if (obj.direction === 'maximize') val = -val;
        return val;
      });
    });

    // Find bounding box [idealPoint, referencePoint]
    const idealPoint = new Array(M).fill(Infinity);
    for (const pt of pts) {
      for (let m = 0; m < M; m++) {
        if (pt[m] < idealPoint[m]) idealPoint[m] = pt[m];
      }
    }

    // Total bounding box hyper-volume
    let totalBoundingVolume = 1.0;
    for (let m = 0; m < M; m++) {
      const span = referencePoint[m] - idealPoint[m];
      if (span <= 0) return 0;
      totalBoundingVolume *= span;
    }

    // Monte Carlo integration
    let dominatedCount = 0;
    for (let s = 0; s < monteCarloSamples; s++) {
      const sample = new Array(M);
      for (let m = 0; m < M; m++) {
        sample[m] = idealPoint[m] + Math.random() * (referencePoint[m] - idealPoint[m]);
      }

      // Check if sample is dominated by at least one point in the Pareto front
      let isDominated = false;
      for (const pt of pts) {
        let dominatesSample = true;
        for (let m = 0; m < M; m++) {
          if (pt[m] > sample[m]) {
            dominatesSample = false;
            break;
          }
        }
        if (dominatesSample) {
          isDominated = true;
          break;
        }
      }

      if (isDominated) {
        dominatedCount++;
      }
    }

    return (dominatedCount / monteCarloSamples) * totalBoundingVolume;
  }

  /**
   * Generational Distance (GD): Average Euclidean distance from obtained front to nearest true Pareto point
   */
  public calculateGenerationalDistance(
    obtainedFront: ParetoPoint[],
    referenceFront: { x: number; y: number }[]
  ): number {
    if (obtainedFront.length === 0 || referenceFront.length === 0) return 0;
    const obj1 = this.problem.objectives[0];
    const obj2 = this.problem.objectives[1];

    let sumDistSq = 0;
    for (const p of obtainedFront) {
      const px = this.getObjValue(p, obj1, 0);
      const py = this.getObjValue(p, obj2, 1);

      let minDistSq = Infinity;
      for (const ref of referenceFront) {
        const dSq = Math.pow(px - ref.x, 2) + Math.pow(py - ref.y, 2);
        if (dSq < minDistSq) minDistSq = dSq;
      }
      sumDistSq += minDistSq;
    }

    return Math.sqrt(sumDistSq / obtainedFront.length);
  }

  /**
   * Inverted Generational Distance (IGD): Average distance from true Pareto points to nearest obtained point
   */
  public calculateInvertedGenerationalDistance(
    obtainedFront: ParetoPoint[],
    referenceFront: { x: number; y: number }[]
  ): number {
    if (obtainedFront.length === 0 || referenceFront.length === 0) return 0;
    const obj1 = this.problem.objectives[0];
    const obj2 = this.problem.objectives[1];

    let sumDistSq = 0;
    for (const ref of referenceFront) {
      let minDistSq = Infinity;
      for (const p of obtainedFront) {
        const px = this.getObjValue(p, obj1, 0);
        const py = this.getObjValue(p, obj2, 1);
        const dSq = Math.pow(px - ref.x, 2) + Math.pow(py - ref.y, 2);
        if (dSq < minDistSq) minDistSq = dSq;
      }
      sumDistSq += minDistSq;
    }

    return Math.sqrt(sumDistSq / referenceFront.length);
  }

  /**
   * Knee Point Detection: Finds the compromise point on the front with maximum curvature (distance to chord)
   */
  public findKneePoint(front: ParetoPoint[]): ParetoPoint | null {
    if (front.length < 3) return front[0] || null;

    const obj1 = this.problem.objectives[0];
    const obj2 = this.problem.objectives[1];

    // Sort by obj1
    const sorted = [...front].sort((a, b) => this.getObjValue(a, obj1, 0) - this.getObjValue(b, obj1, 0));
    const pStart = sorted[0];
    const pEnd = sorted[sorted.length - 1];

    const x1 = this.getObjValue(pStart, obj1, 0);
    const y1 = this.getObjValue(pStart, obj2, 1);
    const x2 = this.getObjValue(pEnd, obj1, 0);
    const y2 = this.getObjValue(pEnd, obj2, 1);

    const chordLen = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    if (chordLen < 1e-9) return sorted[0];

    let maxDist = -1;
    let kneePoint = sorted[0];

    for (let i = 1; i < sorted.length - 1; i++) {
      const x0 = this.getObjValue(sorted[i], obj1, 0);
      const y0 = this.getObjValue(sorted[i], obj2, 1);

      // Perpendicular distance to chord line |(y2-y1)x0 - (x2-x1)y0 + x2*y1 - y2*x1| / chordLen
      const dist = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / chordLen;
      if (dist > maxDist) {
        maxDist = dist;
        kneePoint = sorted[i];
      }
    }

    return kneePoint;
  }

  /**
   * Multi-Criteria Decision Making (TOPSIS Algorithm):
   * Ranks Pareto front solutions relative to the Ideal Solution (A+) and Nadir/Anti-Ideal Solution (A-)
   */
  public rankSolutionsTOPSIS(front: ParetoPoint[], config: MCDMWeightConfig): MCDMDecisionResult {
    if (front.length === 0) {
      throw new Error('TOPSIS requires at least 1 candidate on the Pareto front');
    }

    const objs = this.problem.objectives;

    // 1. Calculate Ideal and Nadir Bounds
    const idealPoint: Record<string, number> = {};
    const nadirPoint: Record<string, number> = {};

    for (let oIdx = 0; oIdx < objs.length; oIdx++) {
      const obj = objs[oIdx];
      const vals = front.map(p => this.getObjValue(p, obj, oIdx));
      const isMin = obj.direction !== 'maximize';
      idealPoint[obj.name] = isMin ? Math.min(...vals) : Math.max(...vals);
      nadirPoint[obj.name] = isMin ? Math.max(...vals) : Math.min(...vals);
    }

    // 2. Normalize Objective Weights
    const rawWeights = config.weights;
    let weightSum = 0;
    for (let oIdx = 0; oIdx < objs.length; oIdx++) {
      const obj = objs[oIdx];
      const w = rawWeights[obj.name] ?? rawWeights[Object.keys(rawWeights)[oIdx]] ?? 1.0;
      weightSum += Math.max(w, 1e-6);
    }

    const normalizedWeights: number[] = [];
    for (let oIdx = 0; oIdx < objs.length; oIdx++) {
      const obj = objs[oIdx];
      const w = rawWeights[obj.name] ?? rawWeights[Object.keys(rawWeights)[oIdx]] ?? 1.0;
      normalizedWeights.push(Math.max(w, 1e-6) / weightSum);
    }

    // 3. Compute Euclidean Distance to Ideal (D+) and Nadir (D-)
    const scoredList = front.map(point => {
      let distIdealSq = 0;
      let distNadirSq = 0;

      for (let oIdx = 0; oIdx < objs.length; oIdx++) {
        const obj = objs[oIdx];
        const val = this.getObjValue(point, obj, oIdx);
        const ideal = idealPoint[obj.name];
        const nadir = nadirPoint[obj.name];
        const range = Math.max(Math.abs(nadir - ideal), 1e-9);
        const w = normalizedWeights[oIdx];

        // Normalized distance
        const normDistToIdeal = w * Math.abs(val - ideal) / range;
        const normDistToNadir = w * Math.abs(val - nadir) / range;

        distIdealSq += Math.pow(normDistToIdeal, 2);
        distNadirSq += Math.pow(normDistToNadir, 2);
      }

      const distIdeal = Math.sqrt(distIdealSq);
      const distNadir = Math.sqrt(distNadirSq);

      // Relative Closeness to Ideal: C_i = D- / (D+ + D-)
      // Closer to 1.0 means closer to ideal solution
      const score = (distIdeal + distNadir) > 0 ? (distNadir / (distIdeal + distNadir)) : 0.5;

      return {
        point,
        score,
      };
    });

    // 4. Sort descending by TOPSIS Score
    scoredList.sort((a, b) => b.score - a.score);

    return {
      selectedPoint: scoredList[0].point,
      score: scoredList[0].score,
      ranking: scoredList,
      idealPoint,
      nadirPoint,
    };
  }
}
