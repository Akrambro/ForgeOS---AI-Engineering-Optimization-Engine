import { Problem, Trial, OptimizationRun, Constraint, Variable, RunDiffReport, ExperimentMetrics } from '../../types';

export class MetricsEngine {
  /**
   * Simple Regret at step t: r_t = |f_best(t) - f*|
   */
  public static calculateSimpleRegret(
    trials: Trial[],
    optimumValue: number,
    isMin: boolean = true,
    objectiveName: string = 'value'
  ): number[] {
    const regretCurve: number[] = [];
    let bestSoFar = isMin ? Infinity : -Infinity;

    for (const t of trials) {
      if (t.status !== 'successful') {
        regretCurve.push(regretCurve.length > 0 ? regretCurve[regretCurve.length - 1] : Math.abs(100 - optimumValue));
        continue;
      }
      const val = t.objectiveValues[objectiveName] ?? 0;
      if (isMin) {
        if (val < bestSoFar) bestSoFar = val;
      } else {
        if (val > bestSoFar) bestSoFar = val;
      }
      const currentRegret = Math.max(0, isMin ? (bestSoFar - optimumValue) : (optimumValue - bestSoFar));
      regretCurve.push(Number(currentRegret.toFixed(5)));
    }

    return regretCurve;
  }

  /**
   * Cumulative Regret at step T: R_T = \sum_{t=1}^T (f(x_t) - f*)
   */
  public static calculateCumulativeRegret(
    trials: Trial[],
    optimumValue: number,
    isMin: boolean = true,
    objectiveName: string = 'value'
  ): number[] {
    const cumulativeCurve: number[] = [];
    let runningSum = 0;

    for (const t of trials) {
      const val = t.status === 'successful' ? (t.objectiveValues[objectiveName] ?? optimumValue + 10) : optimumValue + 10;
      const stepRegret = Math.max(0, isMin ? (val - optimumValue) : (optimumValue - val));
      runningSum += stepRegret;
      cumulativeCurve.push(Number(runningSum.toFixed(4)));
    }

    return cumulativeCurve;
  }

  /**
   * Exact 2D Hypervolume Calculation for multi-objective optimization against a reference point
   * (assuming minimization of both objectives obj1 and obj2 bounded by refPoint)
   */
  public static calculate2DHypervolume(
    trials: Trial[],
    refPoint: [number, number] = [2.0, 10.0],
    obj1Name: string = 'f1_convergence',
    obj2Name: string = 'f2_diversity'
  ): number {
    const validTrials = trials.filter(t => t.status === 'successful' && t.feasible);
    if (validTrials.length === 0) return 0;

    // Filter points strictly dominating reference point
    const points: [number, number][] = validTrials
      .map(t => [t.objectiveValues[obj1Name] ?? refPoint[0], t.objectiveValues[obj2Name] ?? refPoint[1]] as [number, number])
      .filter(([p1, p2]) => p1 <= refPoint[0] && p2 <= refPoint[1]);

    if (points.length === 0) return 0;

    // Sort by first objective ascending
    points.sort((a, b) => a[0] - b[0]);

    // Filter non-dominated points
    const nonDominated: [number, number][] = [];
    let currentMinY = Infinity;

    for (const [x, y] of points) {
      if (y < currentMinY) {
        nonDominated.push([x, y]);
        currentMinY = y;
      }
    }

    if (nonDominated.length === 0) return 0;

    // Compute Hypervolume via rectangular decomposition
    let hypervolume = 0;
    for (let i = 0; i < nonDominated.length; i++) {
      const xLeft = nonDominated[i][0];
      const xRight = (i + 1 < nonDominated.length) ? nonDominated[i + 1][0] : refPoint[0];
      const width = Math.max(0, xRight - xLeft);
      const height = Math.max(0, refPoint[1] - nonDominated[i][1]);
      hypervolume += width * height;
    }

    return Number(Math.max(0, hypervolume).toFixed(6));
  }

  /**
   * Tracks hypervolume progress over evaluation steps
   */
  public static computeHypervolumeTrajectory(
    trials: Trial[],
    refPoint: [number, number] = [2.0, 10.0],
    obj1Name: string = 'f1_convergence',
    obj2Name: string = 'f2_diversity'
  ): number[] {
    const trajectory: number[] = [];
    const subset: Trial[] = [];

    for (const t of trials) {
      subset.push(t);
      const hv = MetricsEngine.calculate2DHypervolume(subset, refPoint, obj1Name, obj2Name);
      trajectory.push(hv);
    }
    return trajectory;
  }

  /**
   * Tracks cumulative feasibility ratio timeline [CR_1, CR_2, ..., CR_T]
   */
  public static calculateFeasibilityTimeline(trials: Trial[]): number[] {
    const timeline: number[] = [];
    let feasibleCount = 0;

    for (let i = 0; i < trials.length; i++) {
      if (trials[i].feasible && trials[i].status === 'successful') {
        feasibleCount++;
      }
      timeline.push(Number((feasibleCount / (i + 1)).toFixed(3)));
    }
    return timeline;
  }

  /**
   * Average constraint violation magnitude for infeasible trials
   */
  public static calculateAverageConstraintViolations(
    trials: Trial[],
    constraints: Constraint[]
  ): number[] {
    const trajectory: number[] = [];

    for (const t of trials) {
      if (t.feasible || !t.constraintValues) {
        trajectory.push(0);
        continue;
      }

      let totalViolation = 0;
      let count = 0;

      for (const c of constraints) {
        const val = t.constraintValues[c.name];
        if (val !== undefined) {
          if (c.operator === '<=' && val > c.threshold) {
            totalViolation += val - c.threshold;
            count++;
          } else if (c.operator === '>=' && val < c.threshold) {
            totalViolation += c.threshold - val;
            count++;
          }
        }
      }

      trajectory.push(count > 0 ? Number((totalViolation / count).toFixed(4)) : 0);
    }

    return trajectory;
  }

  /**
   * Calculates parameter diversity index (normalized average pairwise distance in [0, 1])
   */
  public static calculateParameterDiversity(
    trials: Trial[],
    variables: Variable[]
  ): number[] {
    const numericVars = variables.filter(v => v.type === 'continuous' || v.type === 'integer');
    if (numericVars.length === 0) return trials.map(() => 1.0);

    const diversityHistory: number[] = [];
    const window: Record<string, number>[] = [];

    for (const t of trials) {
      const numParams: Record<string, number> = {};
      for (const v of numericVars) {
        const raw = Number(t.parameters[v.name] ?? v.lowerBound);
        const norm = (raw - v.lowerBound) / (v.upperBound - v.lowerBound || 1);
        numParams[v.name] = Math.max(0, Math.min(1, norm));
      }
      window.push(numParams);

      if (window.length < 2) {
        diversityHistory.push(1.0);
        continue;
      }

      // Compute mean pairwise distance across the recent history
      const recentWindow = window.slice(-10);
      let totalDist = 0;
      let pairs = 0;

      for (let i = 0; i < recentWindow.length; i++) {
        for (let j = i + 1; j < recentWindow.length; j++) {
          let distSq = 0;
          for (const v of numericVars) {
            const diff = recentWindow[i][v.name] - recentWindow[j][v.name];
            distSq += diff * diff;
          }
          totalDist += Math.sqrt(distSq / numericVars.length);
          pairs++;
        }
      }

      const avgDist = pairs > 0 ? totalDist / pairs : 0;
      diversityHistory.push(Number(avgDist.toFixed(4)));
    }

    return diversityHistory;
  }

  /**
   * Generates comprehensive mathematical metrics for a set of trials
   */
  public static computeExperimentMetrics(
    trials: Trial[],
    problem: Problem,
    knownOptimumValue?: number
  ): ExperimentMetrics {
    const primaryObj = problem.objectives[0];
    const objName = primaryObj ? primaryObj.name : 'value';
    const isMin = primaryObj ? primaryObj.direction === 'minimize' : true;
    const optVal = knownOptimumValue ?? 0;

    const simpleRegret = MetricsEngine.calculateSimpleRegret(trials, optVal, isMin, objName);
    const cumulativeRegret = MetricsEngine.calculateCumulativeRegret(trials, optVal, isMin, objName);
    const feasibilityRatioTrajectory = MetricsEngine.calculateFeasibilityTimeline(trials);
    const averageConstraintViolation = MetricsEngine.calculateAverageConstraintViolations(trials, problem.constraints);
    const parameterDiversityIndex = MetricsEngine.calculateParameterDiversity(trials, problem.variables);

    let hypervolumeTrajectory: number[] | undefined = undefined;
    if (problem.objectives.length >= 2) {
      hypervolumeTrajectory = MetricsEngine.computeHypervolumeTrajectory(
        trials,
        [2.0, 10.0],
        problem.objectives[0].name,
        problem.objectives[1].name
      );
    }

    const successfulTrials = trials.filter(t => t.status === 'successful');
    const feasibleTrials = successfulTrials.filter(t => t.feasible);

    let currentBestValue: number | undefined = undefined;
    let currentBestFeasibleValue: number | undefined = undefined;

    if (successfulTrials.length > 0) {
      const sorted = [...successfulTrials].sort((a, b) => {
        const valA = a.objectiveValues[objName] ?? 0;
        const valB = b.objectiveValues[objName] ?? 0;
        return isMin ? valA - valB : valB - valA;
      });
      currentBestValue = sorted[0].objectiveValues[objName];
    }

    if (feasibleTrials.length > 0) {
      const sortedFeasible = [...feasibleTrials].sort((a, b) => {
        const valA = a.objectiveValues[objName] ?? 0;
        const valB = b.objectiveValues[objName] ?? 0;
        return isMin ? valA - valB : valB - valA;
      });
      currentBestFeasibleValue = sortedFeasible[0].objectiveValues[objName];
    }

    return {
      simpleRegret,
      cumulativeRegret,
      hypervolumeTrajectory,
      feasibilityRatioTrajectory,
      averageConstraintViolation,
      parameterDiversityIndex,
      currentBestValue,
      currentBestFeasibleValue,
    };
  }

  /**
   * Performs deep comparative diffing between two runs on the same problem
   */
  public static computeRunDiff(
    runA: OptimizationRun,
    runB: OptimizationRun,
    problem: Problem
  ): RunDiffReport {
    const primaryObj = problem.objectives[0];
    const objName = primaryObj ? primaryObj.name : 'value';
    const isMin = primaryObj ? primaryObj.direction === 'minimize' : true;

    const trialsA = runA.trials || [];
    const trialsB = runB.trials || [];

    const bestA = runA.result?.bestObjectiveValues?.[objName] ?? (isMin ? Infinity : -Infinity);
    const bestB = runB.result?.bestObjectiveValues?.[objName] ?? (isMin ? Infinity : -Infinity);

    const feasibleRateA = trialsA.length > 0 ? trialsA.filter(t => t.feasible).length / trialsA.length : 0;
    const feasibleRateB = trialsB.length > 0 ? trialsB.filter(t => t.feasible).length / trialsB.length : 0;

    const delta = isMin ? (bestA - bestB) : (bestB - bestA);

    // Compute parameter coverage spreads
    const parameterSpreadDiff: Record<string, { minA: number; maxA: number; minB: number; maxB: number }> = {};
    for (const v of problem.variables) {
      if (v.type === 'continuous' || v.type === 'integer') {
        const valsA = trialsA.map(t => Number(t.parameters[v.name] ?? v.lowerBound)).filter(n => !isNaN(n));
        const valsB = trialsB.map(t => Number(t.parameters[v.name] ?? v.lowerBound)).filter(n => !isNaN(n));

        parameterSpreadDiff[v.name] = {
          minA: valsA.length > 0 ? Math.min(...valsA) : v.lowerBound,
          maxA: valsA.length > 0 ? Math.max(...valsA) : v.upperBound,
          minB: valsB.length > 0 ? Math.min(...valsB) : v.lowerBound,
          maxB: valsB.length > 0 ? Math.max(...valsB) : v.upperBound,
        };
      }
    }

    let winner: 'A' | 'B' | 'TIED' = 'TIED';
    if (isMin) {
      if (bestA < bestB - 1e-6) winner = 'A';
      else if (bestB < bestA - 1e-6) winner = 'B';
    } else {
      if (bestA > bestB + 1e-6) winner = 'A';
      else if (bestB > bestA + 1e-6) winner = 'B';
    }

    let hypervolumeDelta: number | undefined = undefined;
    if (problem.objectives.length >= 2) {
      const hvA = MetricsEngine.calculate2DHypervolume(trialsA, [1.1, 1.1], problem.objectives[0].name, problem.objectives[1].name);
      const hvB = MetricsEngine.calculate2DHypervolume(trialsB, [1.1, 1.1], problem.objectives[0].name, problem.objectives[1].name);
      hypervolumeDelta = Number((hvA - hvB).toFixed(6));
    }

    return {
      runAId: runA.id,
      runBId: runB.id,
      algorithmA: runA.algorithm,
      algorithmB: runB.algorithm,
      evaluationsA: trialsA.length,
      evaluationsB: trialsB.length,
      bestObjectiveA: isFinite(bestA) ? bestA : undefined,
      bestObjectiveB: isFinite(bestB) ? bestB : undefined,
      objectiveImprovementDelta: Number(delta.toFixed(5)),
      feasibleRateA: Number(feasibleRateA.toFixed(3)),
      feasibleRateB: Number(feasibleRateB.toFixed(3)),
      parameterSpreadDiff,
      fasterConvergenceWinner: winner,
      hypervolumeDelta,
    };
  }
}
