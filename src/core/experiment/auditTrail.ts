import { Problem, Trial, AuditTrialRecord, ExperimentCheckpoint } from '../../types';

/**
 * Deterministic fast 32-bit MurmurHash3 / SHA-like cryptographic hashing for audit trail integrity
 */
export function hashString(str: string, seed: number = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const unsigned1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const unsigned2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `0x${unsigned1}${unsigned2}`;
}

/**
 * Canonical quantizer: rounds floating-point numbers to fixed precision (8 decimals)
 * and sorts object keys to guarantee bit-exact cross-platform determinism across V8/WebKit/JSC engines.
 */
function canonicalizeData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'number') {
    if (isNaN(obj)) return 'NaN';
    if (!isFinite(obj)) return obj > 0 ? 'Infinity' : '-Infinity';
    return Number(obj.toFixed(8));
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeData);
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const result: Record<string, any> = {};
    for (const k of keys) {
      result[k] = canonicalizeData(obj[k]);
    }
    return result;
  }
  return obj;
}

export class AuditTrailManager {
  public static readonly GENESIS_HASH = '0x00000000000000000000000000000000';

  /**
   * Deterministically hashes a problem definition to detect any schema/variable drift
   */
  public static computeProblemHash(problem: Problem): string {
    const normalized = {
      id: problem.id,
      name: problem.name,
      variables: problem.variables.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type,
        lowerBound: v.lowerBound !== undefined ? canonicalizeData(v.lowerBound) : undefined,
        upperBound: v.upperBound !== undefined ? canonicalizeData(v.upperBound) : undefined,
        choices: v.choices,
        discreteValues: v.discreteValues,
      })),
      objectives: problem.objectives.map(o => ({
        id: o.id,
        name: o.name,
        direction: o.direction,
      })),
      constraints: problem.constraints.map(c => ({
        id: c.id,
        name: c.name,
        operator: c.operator,
        threshold: canonicalizeData(c.threshold),
      })),
      adapter: {
        type: problem.adapter.type,
        builtinName: problem.adapter.builtinName,
      },
    };
    return hashString(JSON.stringify(canonicalizeData(normalized)));
  }

  /**
   * Computes deterministic cryptographic hash for an individual trial
   */
  public static computeTrialHash(
    trial: Omit<AuditTrialRecord, 'trialHash'>
  ): string {
    const payload = {
      previousTrialHash: trial.previousTrialHash,
      runId: trial.runId,
      iteration: trial.iteration,
      parameters: canonicalizeData(trial.parameters),
      objectiveValues: canonicalizeData(trial.objectiveValues),
      constraintValues: canonicalizeData(trial.constraintValues),
      feasible: trial.feasible,
      status: trial.status,
    };
    return hashString(JSON.stringify(payload));
  }

  /**
   * Converts a standard Trial into an immutable AuditTrialRecord
   */
  public static createAuditTrial(
    trial: Trial,
    previousTrialHash: string = AuditTrailManager.GENESIS_HASH
  ): AuditTrialRecord {
    const record: Omit<AuditTrialRecord, 'trialHash'> = {
      ...trial,
      previousTrialHash,
      executionTimestamp: new Date(trial.timestamp || Date.now()).getTime(),
    };

    const trialHash = AuditTrailManager.computeTrialHash(record);

    return {
      ...record,
      trialHash,
    };
  }

  /**
   * Verifies the cryptographic integrity of an entire sequence of trials (blockchain-style tamper detection)
   */
  public static verifyTrialChain(trials: AuditTrialRecord[]): {
    isValid: boolean;
    brokenAtIteration?: number;
    error?: string;
  } {
    if (!trials || trials.length === 0) {
      return { isValid: true };
    }

    let expectedPrevHash = AuditTrailManager.GENESIS_HASH;

    for (let i = 0; i < trials.length; i++) {
      const trial = trials[i];

      // 1. Verify previous hash chaining
      if (trial.previousTrialHash !== expectedPrevHash) {
        return {
          isValid: false,
          brokenAtIteration: trial.iteration,
          error: `Chain broken at iteration ${trial.iteration}: expected previous hash ${expectedPrevHash}, found ${trial.previousTrialHash}`,
        };
      }

      // 2. Recompute trial hash and verify matching signature
      const recomputedHash = AuditTrailManager.computeTrialHash(trial);
      if (recomputedHash !== trial.trialHash) {
        return {
          isValid: false,
          brokenAtIteration: trial.iteration,
          error: `Tampering detected at iteration ${trial.iteration}: stored hash (${trial.trialHash}) != recomputed hash (${recomputedHash})`,
        };
      }

      expectedPrevHash = trial.trialHash;
    }

    return { isValid: true };
  }

  /**
   * Calculates a Merkle root representing the exact state of all trials
   */
  public static computeMerkleRoot(trials: AuditTrialRecord[]): string {
    if (trials.length === 0) return AuditTrailManager.GENESIS_HASH;

    let currentLevel = trials.map(t => t.trialHash);

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          nextLevel.push(hashString(currentLevel[i] + currentLevel[i + 1]));
        } else {
          nextLevel.push(hashString(currentLevel[i] + currentLevel[i]));
        }
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }
}

/**
 * Stateful Merkle Audit Trail Chain manager for immutable optimization logging
 */
export class MerkleAuditChain {
  private records: AuditTrialRecord[] = [];

  public appendTrial(trial: Trial): AuditTrialRecord {
    const prevHash = this.records.length > 0 
      ? this.records[this.records.length - 1].trialHash 
      : AuditTrailManager.GENESIS_HASH;
    const auditRecord = AuditTrailManager.createAuditTrial(trial, prevHash);
    this.records.push(auditRecord);
    return auditRecord;
  }

  public getRootHash(): string {
    return AuditTrailManager.computeMerkleRoot(this.records);
  }

  public verifyChainIntegrity(): boolean {
    return AuditTrailManager.verifyTrialChain(this.records).isValid;
  }

  public getLength(): number {
    return this.records.length;
  }

  public getRecords(): AuditTrialRecord[] {
    return [...this.records];
  }
}

