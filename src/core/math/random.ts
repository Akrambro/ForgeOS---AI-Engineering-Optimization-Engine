/**
 * Deterministic Pseudo-Random Number Generator (PRNG) for reproducible scientific optimization.
 * Implements Mulberry32 algorithm + Box-Muller transform for Gaussian sampling.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
    if (this.state === 0) this.state = 1;
  }

  public getState(): number {
    return this.state;
  }

  public setState(state: number): void {
    this.state = state >>> 0;
    if (this.state === 0) this.state = 1;
  }

  /** Returns uniform float in [0, 1) */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns uniform float in [min, max] */
  public uniform(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns uniform integer in [min, max] inclusive */
  public integer(min: number, max: number): number {
    return Math.floor(this.uniform(min, max + 1));
  }

  /** Returns standard normal variable N(mean, std) via Box-Muller transform */
  public normal(mean: number = 0, std: number = 1): number {
    let u1 = this.next();
    let u2 = this.next();
    while (u1 <= 1e-15) u1 = this.next(); // avoid log(0)
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * std;
  }

  /** Alias for normal distribution sampling */
  public gaussian(mean: number = 0, std: number = 1): number {
    return this.normal(mean, std);
  }

  /** Selects random element from array */
  public choice<T>(array: T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  /** Shuffles array in-place */
  public shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
