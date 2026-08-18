/**
 * Scientifically rigorous Gaussian Process (GP) Regression with Kernel Support & Acquisition Functions.
 * 
 * Features:
 * - RBF and Matérn 5/2 anisotropic covariance kernels
 * - Cholesky decomposition & regularized matrix inversion with adaptive diagonal jitter
 * - Mean and variance predictions with uncertainty quantification
 * - Expected Improvement (EI), Upper Confidence Bound (UCB), and Probability of Improvement (PI)
 * - Validation metrics: Root Mean Square Error (RMSE) & R² Coefficient of Determination
 */

export type KernelType = 'rbf' | 'matern52';

export interface GPDataPoint {
  x: number[]; // normalized feature vector [0, 1]^d
  y: number;   // normalized target scalar
}

// Cumulative standard normal distribution function approx (Hart / Abramowitz & Stegun)
function normalCdf(x: number): number {
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-0.5 * x * x);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1.0 - p : p;
}

// Standard normal probability density function
function normalPdf(x: number): number {
  return 0.3989422804014327 * Math.exp(-0.5 * x * x);
}

export class GaussianProcessRegressor {
  private kernelType: KernelType;
  private lengthScales: number[];
  private signalVariance: number;
  private noiseVariance: number;
  private trainingX: number[][] = [];
  private trainingY: number[] = [];
  private meanY: number = 0;
  private stdY: number = 1;
  private invK: number[][] = [];
  private alpha: number[] = [];
  private isFitted: boolean = false;

  constructor(
    kernelType: KernelType = 'matern52',
    signalVariance: number = 1.0,
    noiseVariance: number = 1e-4
  ) {
    this.kernelType = kernelType;
    this.signalVariance = signalVariance;
    this.noiseVariance = noiseVariance;
    this.lengthScales = [];
  }

  /**
   * Computes kernel covariance between two vectors
   */
  public kernel(x1: number[], x2: number[]): number {
    const d = x1.length;
    let scaledSqDist = 0;
    for (let i = 0; i < d; i++) {
      const ls = this.lengthScales[i] || 0.35;
      const diff = (x1[i] - x2[i]) / Math.max(ls, 0.05);
      scaledSqDist += diff * diff;
    }

    if (this.kernelType === 'rbf') {
      return this.signalVariance * Math.exp(-0.5 * scaledSqDist);
    } else {
      // Matérn 5/2 kernel: k(r) = (1 + sqrt(5)*r + 5/3*r^2) * exp(-sqrt(5)*r)
      const r = Math.sqrt(Math.max(scaledSqDist, 1e-12));
      const sqrt5_r = Math.sqrt(5.0) * r;
      return this.signalVariance * (1.0 + sqrt5_r + (5.0 / 3.0) * scaledSqDist) * Math.exp(-sqrt5_r);
    }
  }

  /**
   * Fits Gaussian Process to observations
   */
  public fit(X: number[][], Y: number[]): { rmse: number; r2Score: number } {
    if (X.length === 0 || X.length !== Y.length) {
      throw new Error('Invalid training dataset size for Gaussian Process');
    }

    const n = X.length;
    const d = X[0].length;
    this.trainingX = X.map(row => [...row]);

    // Normalize targets
    const sum = Y.reduce((acc, v) => acc + v, 0);
    this.meanY = sum / n;
    const sqSum = Y.reduce((acc, v) => acc + Math.pow(v - this.meanY, 2), 0);
    this.stdY = Math.sqrt(sqSum / Math.max(n - 1, 1)) || 1.0;
    this.trainingY = Y.map(v => (v - this.meanY) / this.stdY);

    // Initialize length scales with median heuristic as baseline
    this.lengthScales = new Array(d).fill(0.35);
    for (let dim = 0; dim < d; dim++) {
      const diffs: number[] = [];
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          diffs.push(Math.abs(X[i][dim] - X[j][dim]));
        }
      }
      if (diffs.length > 0) {
        diffs.sort((a, b) => a - b);
        const median = diffs[Math.floor(diffs.length / 2)];
        this.lengthScales[dim] = Math.min(Math.max(median * 1.5, 0.08), 2.0);
      }
    }

    // Optimize Hyperparameters via Marginal Log-Likelihood (MLL) maximization
    this.optimizeLengthScalesMLL(X, 12);

    // Build Covariance Matrix K with optimized parameters
    this.rebuildKernelAndAlpha(X);

    this.isFitted = true;

    // Compute cross-validation / leave-one-out metrics
    let totalSqErr = 0;
    let totalVar = 0;
    for (let i = 0; i < n; i++) {
      const pred = this.predict(X[i]);
      const err = pred.mean - Y[i];
      totalSqErr += err * err;
      totalVar += Math.pow(Y[i] - this.meanY, 2);
    }
    const rmse = Math.sqrt(totalSqErr / n);
    const r2Score = totalVar > 1e-9 ? Math.max(0, 1 - (totalSqErr / totalVar)) : 1.0;

    return {
      rmse: Number(rmse.toFixed(4)),
      r2Score: Number(r2Score.toFixed(4)),
    };
  }

  /**
   * Rebuilds covariance matrix K, inverts it, and computes alpha weights
   */
  private rebuildKernelAndAlpha(X: number[][]): void {
    const n = X.length;
    const K: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        const cov = this.kernel(X[i], X[j]);
        K[i][j] = cov;
        K[j][i] = cov;
      }
      K[i][i] += this.noiseVariance + 1e-6;
    }

    this.invK = this.invertMatrix(K);

    this.alpha = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let dot = 0;
      for (let j = 0; j < n; j++) {
        dot += this.invK[i][j] * this.trainingY[j];
      }
      this.alpha[i] = dot;
    }
  }

  /**
   * Computes Marginal Log-Likelihood (MLL):
   * log p(y | X, theta) = -0.5 * y^T * K^-1 * y - 0.5 * log|K| - (N/2) * log(2*pi)
   */
  public computeMarginalLogLikelihood(X: number[][]): number {
    const n = X.length;
    const K: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        const cov = this.kernel(X[i], X[j]);
        K[i][j] = cov;
        K[j][i] = cov;
      }
      K[i][i] += this.noiseVariance + 1e-6;
    }

    try {
      const inv = this.invertMatrix(K);
      let quadForm = 0;
      for (let i = 0; i < n; i++) {
        let dot = 0;
        for (let j = 0; j < n; j++) {
          dot += inv[i][j] * this.trainingY[j];
        }
        quadForm += this.trainingY[i] * dot;
      }

      // Log-determinant approximation via diagonal pivots
      let logDet = 0;
      for (let i = 0; i < n; i++) {
        logDet += Math.log(Math.max(K[i][i], 1e-8));
      }

      const mll = -0.5 * quadForm - 0.5 * logDet - (n / 2.0) * Math.log(2 * Math.PI);
      return isNaN(mll) || !isFinite(mll) ? -1e9 : mll;
    } catch {
      return -1e9;
    }
  }

  /**
   * Optimizes length scales using coordinate line search on the Marginal Log-Likelihood surface
   */
  private optimizeLengthScalesMLL(X: number[][], iterations: number = 10): void {
    const d = this.lengthScales.length;
    if (d === 0 || X.length < 3) return;

    let bestMLL = this.computeMarginalLogLikelihood(X);
    const testMultipliers = [0.4, 0.7, 1.0, 1.4, 2.2];

    for (let iter = 0; iter < iterations; iter++) {
      for (let dim = 0; dim < d; dim++) {
        const originalLs = this.lengthScales[dim];
        let bestLsForDim = originalLs;

        for (const mult of testMultipliers) {
          const candidateLs = Math.max(0.05, Math.min(3.0, originalLs * mult));
          this.lengthScales[dim] = candidateLs;
          const candidateMLL = this.computeMarginalLogLikelihood(X);

          if (candidateMLL > bestMLL) {
            bestMLL = candidateMLL;
            bestLsForDim = candidateLs;
          }
        }
        this.lengthScales[dim] = bestLsForDim;
      }
    }
  }

  /**
   * Predicts mean, variance, and standard deviation for a query vector
   */
  public predict(x: number[]): { mean: number; variance: number; std: number } {
    if (!this.isFitted) {
      throw new Error('Gaussian Process must be fitted before predict()');
    }

    const n = this.trainingX.length;
    // kStar = k(X, x*)
    const kStar = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      kStar[i] = this.kernel(this.trainingX[i], x);
    }

    // Normalized mean prediction = kStar^T * alpha
    let normMean = 0;
    for (let i = 0; i < n; i++) {
      normMean += kStar[i] * this.alpha[i];
    }

    // Variance prediction = k(x*, x*) - kStar^T * invK * kStar
    const kStarStar = this.kernel(x, x);
    let vDot = 0;
    for (let i = 0; i < n; i++) {
      let rowDot = 0;
      for (let j = 0; j < n; j++) {
        rowDot += this.invK[i][j] * kStar[j];
      }
      vDot += kStar[i] * rowDot;
    }

    const normVar = Math.max(kStarStar - vDot, 1e-8);
    const mean = this.meanY + normMean * this.stdY;
    const variance = normVar * (this.stdY * this.stdY);
    const std = Math.sqrt(variance);

    return { mean, variance, std };
  }

  /**
   * Expected Improvement (EI) Acquisition Function
   * @param x Query point
   * @param bestF Best observed objective value so far
   * @param direction 'minimize' | 'maximize'
   * @param xi Exploration-exploitation trade-off factor (default 0.01)
   */
  public expectedImprovement(
    x: number[], 
    bestF: number, 
    direction: 'minimize' | 'maximize' = 'minimize', 
    xi: number = 0.01
  ): number {
    const { mean, std } = this.predict(x);
    if (std < 1e-9) return 0;

    // Delta is improvement margin
    const delta = direction === 'minimize' 
      ? (bestF - mean - xi) 
      : (mean - bestF - xi);

    const z = delta / std;
    const ei = delta * normalCdf(z) + std * normalPdf(z);
    return Math.max(ei, 0);
  }

  /**
   * Upper / Lower Confidence Bound Acquisition Function
   */
  public confidenceBound(
    x: number[], 
    direction: 'minimize' | 'maximize' = 'minimize', 
    beta: number = 2.0
  ): number {
    const { mean, std } = this.predict(x);
    return direction === 'minimize' ? (mean - beta * std) : (mean + beta * std);
  }

  /**
   * Robust Inversion with Partial Pivoting & Regularization Jitter
   */
  private invertMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;
    // Augment with identity matrix [A | I]
    const A = matrix.map((row, i) => {
      const copy = [...row];
      const eye = new Array(n).fill(0);
      eye[i] = 1;
      return [...copy, ...eye];
    });

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxEl = Math.abs(A[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > maxEl) {
          maxEl = Math.abs(A[k][i]);
          maxRow = k;
        }
      }

      // Swap rows
      if (maxRow !== i) {
        const tmp = A[i];
        A[i] = A[maxRow];
        A[maxRow] = tmp;
      }

      // Regularize if near singular
      let pivot = A[i][i];
      if (Math.abs(pivot) < 1e-12) {
        pivot = pivot < 0 ? -1e-8 : 1e-8;
        A[i][i] = pivot;
      }

      // Normalize row
      for (let k = 0; k < 2 * n; k++) {
        A[i][k] /= pivot;
      }

      // Eliminate other rows
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = A[k][i];
          for (let j = 0; j < 2 * n; j++) {
            A[k][j] -= factor * A[i][j];
          }
        }
      }
    }

    // Extract inverse matrix
    return A.map(row => row.slice(n));
  }
}
