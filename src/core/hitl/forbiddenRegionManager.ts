import { ForbiddenRegion, Problem } from '../../types';

export class ForbiddenRegionManager {
  private regions: ForbiddenRegion[] = [];

  constructor(initialRegions: ForbiddenRegion[] = []) {
    this.regions = [...initialRegions];
  }

  public addRegion(
    center: Record<string, number>,
    radius: number,
    reason: string
  ): ForbiddenRegion {
    const newRegion: ForbiddenRegion = {
      id: `fr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      center: { ...center },
      radius: Math.max(0.01, radius),
      reason,
      createdAt: new Date().toISOString(),
    };
    this.regions.push(newRegion);
    return newRegion;
  }

  public getRegions(): ForbiddenRegion[] {
    return [...this.regions];
  }

  public clear(): void {
    this.regions = [];
  }

  public removeRegion(id: string): boolean {
    const initialLen = this.regions.length;
    this.regions = this.regions.filter(r => r.id !== id);
    return this.regions.length < initialLen;
  }

  /**
   * Computes normalized Euclidean distance from point x to a region center in normalized [0, 1]^D space.
   */
  public getNormalizedDistance(
    point: Record<string, number | string>,
    region: ForbiddenRegion,
    problem: Problem
  ): number {
    let sumSq = 0;
    let dims = 0;

    for (const v of problem.variables) {
      if (v.type === 'continuous' || v.type === 'integer') {
        const span = v.upperBound - v.lowerBound;
        if (span > 0) {
          const rawVal = Number(point[v.name] ?? v.defaultValue ?? v.lowerBound);
          const centerVal = Number(region.center[v.name] ?? (v.lowerBound + span / 2));
          const normPoint = (rawVal - v.lowerBound) / span;
          const normCenter = (centerVal - v.lowerBound) / span;
          sumSq += Math.pow(normPoint - normCenter, 2);
          dims++;
        }
      }
    }

    return dims > 0 ? Math.sqrt(sumSq) : 1.0;
  }

  /**
   * Checks if candidate violates any human-forbidden exclusion zone.
   */
  public isForbidden(point: Record<string, number | string>, problem: Problem): {
    forbidden: boolean;
    violatedRegion?: ForbiddenRegion;
    distanceToClosest: number;
  } {
    if (this.regions.length === 0) {
      return { forbidden: false, distanceToClosest: Infinity };
    }

    let minDistance = Infinity;
    let closestViolated: ForbiddenRegion | undefined;

    for (const region of this.regions) {
      const dist = this.getNormalizedDistance(point, region, problem);
      if (dist < minDistance) {
        minDistance = dist;
      }
      if (dist <= region.radius) {
        closestViolated = region;
      }
    }

    return {
      forbidden: closestViolated !== undefined,
      violatedRegion: closestViolated,
      distanceToClosest: minDistance,
    };
  }

  /**
   * Computes smooth penalty multiplier [0.0, 1.0] for acquisition functions
   * where 0.0 = completely inside forbidden zone, 1.0 = safely outside.
   */
  public computeAcquisitionPenalty(point: Record<string, number | string>, problem: Problem): number {
    if (this.regions.length === 0) return 1.0;

    let minPenalty = 1.0;
    for (const region of this.regions) {
      const dist = this.getNormalizedDistance(point, region, problem);
      if (dist <= region.radius) {
        // Deep inside forbidden zone -> heavy exponential suppression
        return 0.0001;
      } else if (dist < region.radius * 2.0) {
        // Soft boundary transition
        const transition = (dist - region.radius) / region.radius;
        const penalty = Math.sin((transition * Math.PI) / 2);
        if (penalty < minPenalty) {
          minPenalty = penalty;
        }
      }
    }

    return Math.max(0.0001, minPenalty);
  }
}
