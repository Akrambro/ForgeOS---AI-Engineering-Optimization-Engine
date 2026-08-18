import { ExperienceTuple } from '../../types';
import { SeededRandom } from '../math/random';

/**
 * Circular Experience Replay Buffer for Reinforcement Learning
 * Stores transition tuples (s, a, r, s', done) and samples mini-batches uniformly.
 */
export class ExperienceReplayBuffer {
  private buffer: ExperienceTuple[] = [];
  private maxSize: number;
  private pointer: number = 0;
  private rng: SeededRandom;

  constructor(maxSize: number = 10000, seed: number = 42) {
    this.maxSize = maxSize;
    this.rng = new SeededRandom(seed);
  }

  public push(experience: ExperienceTuple): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(experience);
    } else {
      this.buffer[this.pointer] = experience;
    }
    this.pointer = (this.pointer + 1) % this.maxSize;
  }

  public sample(batchSize: number): ExperienceTuple[] {
    const n = this.buffer.length;
    if (n === 0) return [];
    const actualBatchSize = Math.min(batchSize, n);
    const sampled: ExperienceTuple[] = [];

    for (let i = 0; i < actualBatchSize; i++) {
      const randIdx = this.rng.integer(0, n - 1);
      sampled.push(this.buffer[randIdx]);
    }

    return sampled;
  }

  public size(): number {
    return this.buffer.length;
  }

  public clear(): void {
    this.buffer = [];
    this.pointer = 0;
  }

  public getAll(): ExperienceTuple[] {
    return [...this.buffer];
  }
}
