import { Problem, OptimizationRun, BenchmarkReport } from '../types';
import { BENCHMARK_CATALOG } from '../core/benchmarks/benchmarkSuite';

const PROBLEMS_KEY = 'ai_opt_engine_problems_v1';
const RUNS_KEY = 'ai_opt_engine_runs_v1';
const BENCHMARKS_KEY = 'ai_opt_engine_benchmarks_v1';

export class LocalDatabase {
  public static getProblems(): Problem[] {
    try {
      const stored = localStorage.getItem(PROBLEMS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load problems from storage', e);
    }
    // Default initial catalog
    const initial = BENCHMARK_CATALOG.map(b => b.problem);
    this.saveProblems(initial);
    return initial;
  }

  public static saveProblems(problems: Problem[]): void {
    try {
      localStorage.setItem(PROBLEMS_KEY, JSON.stringify(problems));
    } catch (e) {
      console.error('Failed to persist problems', e);
    }
  }

  public static getProblemById(id: string): Problem | undefined {
    return this.getProblems().find(p => p.id === id);
  }

  public static saveProblem(problem: Problem): void {
    const problems = this.getProblems();
    const idx = problems.findIndex(p => p.id === problem.id);
    if (idx >= 0) {
      problems[idx] = { ...problem, updatedAt: new Date().toISOString() };
    } else {
      problems.unshift({
        ...problem,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    this.saveProblems(problems);
  }

  public static deleteProblem(id: string): void {
    const problems = this.getProblems().filter(p => p.id !== id);
    this.saveProblems(problems);
  }

  public static getRuns(): OptimizationRun[] {
    try {
      const stored = localStorage.getItem(RUNS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load runs', e);
    }
    return [];
  }

  public static saveRuns(runs: OptimizationRun[]): void {
    try {
      localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
    } catch (e) {
      console.error('Failed to persist runs', e);
    }
  }

  public static getRunById(id: string): OptimizationRun | undefined {
    return this.getRuns().find(r => r.id === id);
  }

  public static saveRun(run: OptimizationRun): void {
    const runs = this.getRuns();
    const idx = runs.findIndex(r => r.id === run.id);
    if (idx >= 0) {
      runs[idx] = run;
    } else {
      runs.unshift(run);
    }
    // Keep max 50 runs to preserve local storage limits
    if (runs.length > 50) {
      runs.splice(50);
    }
    this.saveRuns(runs);
  }

  public static deleteRun(id: string): void {
    const runs = this.getRuns().filter(r => r.id !== id);
    this.saveRuns(runs);
  }

  public static getBenchmarkReports(): BenchmarkReport[] {
    try {
      const stored = localStorage.getItem(BENCHMARKS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load benchmark reports', e);
    }
    return [];
  }

  public static saveBenchmarkReport(report: BenchmarkReport): void {
    const reports = this.getBenchmarkReports();
    const idx = reports.findIndex(r => r.benchmarkId === report.benchmarkId);
    if (idx >= 0) {
      reports[idx] = report;
    } else {
      reports.unshift(report);
    }
    try {
      localStorage.setItem(BENCHMARKS_KEY, JSON.stringify(reports));
    } catch (e) {
      console.error('Failed to persist benchmark reports', e);
    }
  }

  public static resetToDefaults(): void {
    localStorage.removeItem(PROBLEMS_KEY);
    localStorage.removeItem(RUNS_KEY);
    localStorage.removeItem(BENCHMARKS_KEY);
  }
}
