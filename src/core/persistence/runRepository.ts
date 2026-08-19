import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Problem } from '../../types';
import { TrialRecord } from '../runs/trialLifecycle';

export interface Phase01RunRecord {
  id: string;
  problemId: string;
  problemVersion: string;
  algorithm: string;
  algorithmConfig: Record<string, unknown>;
  seed: number;
  evaluationBudget: number;
  evaluatorVersion: string;
  codeVersion: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  trials: TrialRecord[];
  createdAt: string;
  completedAt?: string;
}

interface RepositoryData {
  problems: Problem[];
  runs: Phase01RunRecord[];
}

const emptyData = (): RepositoryData => ({ problems: [], runs: [] });

export class JsonRunRepository {
  constructor(private readonly filePath: string) {}

  public async saveProblem(problem: Problem): Promise<void> {
    const data = await this.read();
    const index = data.problems.findIndex(item => item.id === problem.id);
    if (index === -1) data.problems.push(structuredClone(problem));
    else data.problems[index] = structuredClone(problem);
    await this.write(data);
  }

  public async getProblem(id: string): Promise<Problem | undefined> {
    const data = await this.read();
    const problem = data.problems.find(item => item.id === id);
    return problem ? structuredClone(problem) : undefined;
  }

  public async listProblems(): Promise<Problem[]> {
    const data = await this.read();
    return structuredClone(data.problems);
  }

  public async saveRun(run: Phase01RunRecord): Promise<void> {
    const data = await this.read();
    const index = data.runs.findIndex(item => item.id === run.id);
    if (index === -1) data.runs.push(structuredClone(run));
    else data.runs[index] = structuredClone(run);
    await this.write(data);
  }

  public async appendTrial(runId: string, trial: TrialRecord): Promise<void> {
    const data = await this.read();
    const run = data.runs.find(item => item.id === runId);
    if (!run) throw new Error(`Run '${runId}' not found`);
    if (run.trials.some(item => item.id === trial.id)) throw new Error(`Trial '${trial.id}' already exists`);
    run.trials.push(structuredClone(trial));
    await this.write(data);
  }

  public async getRun(id: string): Promise<Phase01RunRecord | undefined> {
    const data = await this.read();
    const run = data.runs.find(item => item.id === id);
    return run ? structuredClone(run) : undefined;
  }

  public async listRuns(): Promise<Phase01RunRecord[]> {
    const data = await this.read();
    return structuredClone(data.runs);
  }

  private async read(): Promise<RepositoryData> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as RepositoryData;
      return { problems: parsed.problems ?? [], runs: parsed.runs ?? [] };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return emptyData();
      throw error;
    }
  }

  private async write(data: RepositoryData): Promise<void> {
    const temporaryPath = join(dirname(this.filePath), `.${this.filePath.split('/').pop()}.tmp`);
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, this.filePath);
  }
}
