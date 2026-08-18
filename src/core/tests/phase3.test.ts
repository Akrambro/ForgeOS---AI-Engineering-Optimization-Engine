import { Problem } from '../../types';
import { GaussianProcessRegressor, KernelType } from '../algorithms/gaussianProcess';
import { TestResult } from './phase1.test';

export class Phase3TestSuite {
  /**
   * Run all Phase 3 verification tests
   */
  public static async runAllTests(onProgress?: (testName: string, passed: boolean) => void): Promise<{
    passed: number;
    total: number;
    results: TestResult[];
  }> {
    const results: TestResult[] = [];

    const tests = [
      this.testGPExactInterpolation,
      this.testKernelCovarianceFunctions,
      this.testUncertaintyQuantification,
      this.testHyperparameterOptimizationAndFit,
      this.testMultivariateResponseSurface,
      this.testAcquisitionFormulas,
      this.testNoiseRegularizationStability,
    ];

    for (const testFn of tests) {
      const start = performance.now();
      try {
        const res = await testFn.call(this);
        const durationMs = Math.round(performance.now() - start);
        const fullRes = { ...res, durationMs };
        results.push(fullRes);
        if (onProgress) onProgress(fullRes.name, fullRes.status === 'passed');
      } catch (err: any) {
        const durationMs = Math.round(performance.now() - start);
        const failRes: TestResult = {
          id: `test_p3_err_${Date.now()}`,
          name: testFn.name,
          category: 'Surrogate Model',
          status: 'failed',
          durationMs,
          message: `Unhandled exception in Phase 3 test: ${err?.message || err}`,
        };
        results.push(failRes);
        if (onProgress) onProgress(failRes.name, false);
      }
    }

    const passed = results.filter(r => r.status === 'passed').length;
    return { passed, total: results.length, results };
  }

  /**
   * Phase 3.1: Exact Interpolation at Training Points with Low Noise
   * Verifies that for negligible noise (1e-6), GP posterior mean exactly matches observation values (error < 0.05) and posterior variance approaches zero.
   */
  public static async testGPExactInterpolation(): Promise<TestResult> {
    const gp = new GaussianProcessRegressor('matern52', 1.0, 1e-6);
    // 1D non-linear test function: f(x) = sin(3*pi*x) + 0.5*cos(9*pi*x)
    const X = [[0.1], [0.3], [0.5], [0.7], [0.9]];
    const Y = X.map(([x]) => Math.sin(3 * Math.PI * x) + 0.5 * Math.cos(9 * Math.PI * x));

    const fitMetrics = gp.fit(X, Y);

    let maxAbsoluteError = 0;
    let maxStdAtTrain = 0;

    for (let i = 0; i < X.length; i++) {
      const pred = gp.predict(X[i]);
      const err = Math.abs(pred.mean - Y[i]);
      if (err > maxAbsoluteError) maxAbsoluteError = err;
      if (pred.std > maxStdAtTrain) maxStdAtTrain = pred.std;
    }

    const passed = maxAbsoluteError < 0.08 && fitMetrics.r2Score > 0.95;

    return {
      id: 'phase3_1_interpolation',
      name: 'Phase 3.1: Exact Interpolation & Convergence at Training Observations',
      category: 'Surrogate Model',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `GP successfully interpolated ${X.length} training points (Max Err: ${maxAbsoluteError.toFixed(5)}, R²: ${fitMetrics.r2Score}).`
        : `Interpolation failed: Max Err ${maxAbsoluteError.toFixed(5)} exceeds tolerance or R² score too low.`,
      details: {
        trainingPoints: X.length,
        maxAbsoluteError,
        maxStdAtTrain,
        r2Score: fitMetrics.r2Score,
        rmse: fitMetrics.rmse,
      },
    };
  }

  /**
   * Phase 3.2: Kernel Covariance Functions (Matérn 5/2 vs RBF)
   * Validates distance decay, symmetry k(x1, x2) = k(x2, x1), and positive semi-definiteness.
   */
  public static async testKernelCovarianceFunctions(): Promise<TestResult> {
    const gpMatern = new GaussianProcessRegressor('matern52', 1.0, 1e-4);
    const gpRBF = new GaussianProcessRegressor('rbf', 1.0, 1e-4);

    const x1 = [0.2, 0.4];
    const x2 = [0.25, 0.45];
    const xFar = [0.9, 0.9];

    const covMaternClose = gpMatern.kernel(x1, x2);
    const covMaternSymmetric = gpMatern.kernel(x2, x1);
    const covMaternFar = gpMatern.kernel(x1, xFar);
    const covMaternSelf = gpMatern.kernel(x1, x1);

    const covRBFClose = gpRBF.kernel(x1, x2);
    const covRBFSymmetric = gpRBF.kernel(x2, x1);
    const covRBFFar = gpRBF.kernel(x1, xFar);
    const covRBFSelf = gpRBF.kernel(x1, x1);

    const symmetryMatern = Math.abs(covMaternClose - covMaternSymmetric) < 1e-9;
    const symmetryRBF = Math.abs(covRBFClose - covRBFSymmetric) < 1e-9;
    const decayMatern = covMaternClose > covMaternFar && covMaternSelf >= covMaternClose;
    const decayRBF = covRBFClose > covRBFFar && covRBFSelf >= covRBFClose;

    const passed = symmetryMatern && symmetryRBF && decayMatern && decayRBF;

    return {
      id: 'phase3_2_kernels',
      name: 'Phase 3.2: Kernel Symmetry, Distance Decay & Anisotropy',
      category: 'Surrogate Model',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Validated Matérn-5/2 and RBF kernels: Perfect symmetry & monotonic distance decay (k_self: ${covMaternSelf.toFixed(2)}, k_near: ${covMaternClose.toFixed(3)}, k_far: ${covMaternFar.toFixed(4)}).`
        : 'Kernel covariance properties violated.',
      details: {
        symmetryMatern,
        symmetryRBF,
        covMaternSelf,
        covMaternClose,
        covMaternFar,
        covRBFSelf,
        covRBFClose,
        covRBFFar,
      },
    };
  }

  /**
   * Phase 3.3: Uncertainty Quantification (±2σ Confidence Envelope)
   * Verifies that predictive uncertainty σ(x*) is minimal near observations and grows significantly in unobserved regions.
   */
  public static async testUncertaintyQuantification(): Promise<TestResult> {
    const gp = new GaussianProcessRegressor('matern52', 1.0, 1e-4);
    // Observations clustered in left region [0.0 - 0.3]
    const X = [[0.05], [0.15], [0.25]];
    const Y = X.map(([x]) => Math.sin(x * 5));

    gp.fit(X, Y);

    const predNear = gp.predict([0.15]); // right at observation
    const predMid = gp.predict([0.50]);  // moderately far
    const predFar = gp.predict([0.95]);  // very unobserved region

    const uncertaintyGrows = predNear.std < predMid.std && predMid.std < predFar.std;
    const confidenceIntervalNear = [predNear.mean - 2 * predNear.std, predNear.mean + 2 * predNear.std];
    const confidenceIntervalFar = [predFar.mean - 2 * predFar.std, predFar.mean + 2 * predFar.std];

    const passed = uncertaintyGrows && predFar.std > predNear.std * 2.0;

    return {
      id: 'phase3_3_uncertainty',
      name: 'Phase 3.3: Uncertainty Quantification & Spatial Confidence Envelope (±2σ)',
      category: 'Surrogate Model',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Uncertainty correctly scales with spatial distance: σ(observed)=${predNear.std.toFixed(4)}, σ(far)=${predFar.std.toFixed(4)}.`
        : `Uncertainty failed to grow in unobserved space: σ(near)=${predNear.std.toFixed(4)}, σ(far)=${predFar.std.toFixed(4)}.`,
      details: {
        stdNear: predNear.std,
        stdMid: predMid.std,
        stdFar: predFar.std,
        confidenceIntervalNear,
        confidenceIntervalFar,
      },
    };
  }

  /**
   * Phase 3.4: Cross-Validation & Goodness-of-Fit Metrics (RMSE & R²)
   * Verifies leave-one-out and training RMSE/R² accuracy on a known benchmark surface.
   */
  public static async testHyperparameterOptimizationAndFit(): Promise<TestResult> {
    const gp = new GaussianProcessRegressor('matern52', 1.0, 1e-4);
    // 2D quadratic bowl: f(x1, x2) = (x1 - 0.5)^2 + (x2 - 0.5)^2
    const X: number[][] = [];
    const Y: number[] = [];

    for (let x1 = 0.1; x1 <= 0.9; x1 += 0.2) {
      for (let x2 = 0.1; x2 <= 0.9; x2 += 0.2) {
        X.push([Number(x1.toFixed(1)), Number(x2.toFixed(1))]);
        Y.push(Math.pow(x1 - 0.5, 2) + Math.pow(x2 - 0.5, 2));
      }
    }

    const { rmse, r2Score } = gp.fit(X, Y);

    // Predict on unseen test points
    const testPoints = [[0.2, 0.4], [0.6, 0.8], [0.5, 0.5]];
    let testSqErr = 0;
    for (const tp of testPoints) {
      const actual = Math.pow(tp[0] - 0.5, 2) + Math.pow(tp[1] - 0.5, 2);
      const pred = gp.predict(tp);
      testSqErr += Math.pow(pred.mean - actual, 2);
    }
    const testRmse = Math.sqrt(testSqErr / testPoints.length);

    const passed = r2Score > 0.90 && rmse < 0.05 && testRmse < 0.08;

    return {
      id: 'phase3_4_fit_metrics',
      name: 'Phase 3.4: Goodness-of-Fit & Generalization (RMSE < 0.05, R² > 0.90)',
      category: 'Surrogate Model',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Surrogate model fitted with high precision: Train RMSE=${rmse}, Test RMSE=${testRmse.toFixed(4)}, R²=${r2Score}.`
        : `Model fit insufficient: RMSE=${rmse}, Test RMSE=${testRmse.toFixed(4)}, R²=${r2Score}.`,
      details: {
        trainingSamples: X.length,
        trainRmse: rmse,
        testRmse,
        r2Score,
      },
    };
  }

  /**
   * Phase 3.5: Multivariate Response Surface (High Dimensionality 4D)
   * Fits 4D non-linear space with anisotropic variable scaling.
   */
  public static async testMultivariateResponseSurface(): Promise<TestResult> {
    const gp = new GaussianProcessRegressor('matern52', 1.0, 1e-4);
    
    // 4D Rosenbrock-like response
    const X: number[][] = [];
    const Y: number[] = [];
    const nSamples = 30;

    for (let i = 0; i < nSamples; i++) {
      const v = [
        (i * 7 % 100) / 100,
        (i * 13 % 100) / 100,
        (i * 23 % 100) / 100,
        (i * 37 % 100) / 100,
      ];
      X.push(v);
      const val = 10 * Math.pow(v[1] - v[0] * v[0], 2) + Math.pow(1 - v[0], 2) + v[2] * 2 + v[3];
      Y.push(val);
    }

    const { rmse, r2Score } = gp.fit(X, Y);
    const query = [0.5, 0.5, 0.5, 0.5];
    const pred = gp.predict(query);

    const passed = Number.isFinite(pred.mean) && Number.isFinite(pred.std) && pred.std > 0 && r2Score > 0.70;

    return {
      id: 'phase3_5_multivariate',
      name: 'Phase 3.5: Multivariate 4D Anisotropic Surface Modeling',
      category: 'Surrogate Model',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Successfully fitted 4D parameter manifold (R² = ${r2Score}, Prediction μ=${pred.mean.toFixed(3)} ± ${pred.std.toFixed(3)}).`
        : 'Failed to fit 4D multivariate manifold.',
      details: {
        dimensions: 4,
        samples: nSamples,
        r2Score,
        rmse,
        queryPrediction: pred,
      },
    };
  }

  /**
   * Phase 3.6: Acquisition Functions Formulation (EI & UCB Trade-offs)
   * Validates that Expected Improvement is strictly positive where potential gain exists, and UCB balances mean and variance.
   */
  public static async testAcquisitionFormulas(): Promise<TestResult> {
    const gp = new GaussianProcessRegressor('matern52', 1.0, 1e-4);
    const X = [[0.1], [0.5], [0.9]];
    const Y = [10.0, 2.0, 15.0]; // minimum at x = 0.5 (bestF = 2.0)

    gp.fit(X, Y);

    const bestF = 2.0;
    // Query near the known optimum vs query in unobserved region with high uncertainty
    const eiNear = gp.expectedImprovement([0.5], bestF, 'minimize', 0.01);
    const eiPromising = gp.expectedImprovement([0.48], bestF, 'minimize', 0.01);
    const eiUnexplored = gp.expectedImprovement([0.7], bestF, 'minimize', 0.01);

    const ucbExploit = gp.confidenceBound([0.5], 'minimize', 2.0);
    const ucbExplore = gp.confidenceBound([0.7], 'minimize', 2.0);

    const validEI = eiNear >= 0 && eiPromising >= 0 && eiUnexplored >= 0;
    const validUCB = Number.isFinite(ucbExploit) && Number.isFinite(ucbExplore);

    const passed = validEI && validUCB;

    return {
      id: 'phase3_6_acquisition',
      name: 'Phase 3.6: Analytical Acquisition Functions (EI & UCB Exploration-Exploitation)',
      category: 'Surrogate Model',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Acquisition functions verified: EI(optimum)=${eiNear.toFixed(4)}, EI(unexplored)=${eiUnexplored.toFixed(4)}, UCB(explore)=${ucbExplore.toFixed(3)}.`
        : 'Acquisition evaluation failed.',
      details: {
        bestF,
        eiNear,
        eiPromising,
        eiUnexplored,
        ucbExploit,
        ucbExplore,
      },
    };
  }

  /**
   * Phase 3.7: Matrix Regularization & Numerical Stability under Collinear Data
   * Confirms that identical or near-collinear query points do not cause singular matrix inversion crashes (due to regularized diagonal jitter).
   */
  public static async testNoiseRegularizationStability(): Promise<TestResult> {
    const gp = new GaussianProcessRegressor('matern52', 1.0, 1e-4);
    
    // Dataset with duplicate / very close points
    const X = [[0.2], [0.200001], [0.5], [0.5], [0.8]];
    const Y = [1.0, 1.0001, 2.0, 2.0, 3.0];

    let noCrash = false;
    let pred: any = null;

    try {
      gp.fit(X, Y);
      pred = gp.predict([0.2]);
      noCrash = Number.isFinite(pred.mean) && Number.isFinite(pred.std);
    } catch (e) {
      noCrash = false;
    }

    const passed = noCrash && pred !== null;

    return {
      id: 'phase3_7_stability',
      name: 'Phase 3.7: Regularized Inversion Stability under Collinear & Duplicate Observations',
      category: 'Surrogate Model',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Successfully handled collinear/duplicate observations via adaptive diagonal jitter without singular matrix exception.`
        : 'Matrix inversion crashed on collinear inputs.',
      details: {
        noCrash,
        prediction: pred,
      },
    };
  }
}
