import { Problem, Variable, Objective, Constraint } from '../../types';
import { TestResult } from './phase1.test';
import { InputDeckGenerator } from '../simulator_adapters/inputDeckGenerator';
import { OutputParser } from '../simulator_adapters/outputParser';
import { PythonSimulatorAdapter } from '../simulator_adapters/pythonSimulatorAdapter';
import { CLISimulatorAdapter } from '../simulator_adapters/cliSimulatorAdapter';
import { FileIOSimulatorAdapter } from '../simulator_adapters/fileIOSimulatorAdapter';
import { EngineeringVirtualSolvers } from '../simulator_adapters/engineeringVirtualSolvers';
import { UniversalEvaluator } from '../evaluators/evaluator';
import { DifferentialEvolutionOptimizer } from '../algorithms/differentialEvolution';
import { OutputExtractionRule } from '../simulator_adapters/simulatorTypes';

export class Phase6TestSuite {
  /**
   * Run all Phase 6 Real Simulator Adapter verification tests
   */
  public static async runAllTests(onProgress?: (testName: string, passed: boolean) => void): Promise<{
    passed: number;
    total: number;
    results: TestResult[];
  }> {
    const results: TestResult[] = [];

    const tests = [
      this.testPythonScriptAdapterExecution,
      this.testCLIArgumentTemplateInterpolation,
      this.testMultiFormatInputDeckGeneration,
      this.testEngineeringOutputParsingAndExtraction,
      this.testTimeoutEnforcementAndFailureResilience,
      this.testPhysicsBasedCFDAndFEAVirtualSolvers,
      this.testEndToEndSimulatorOptimizationPipeline,
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
          id: `test_p6_err_${Date.now()}`,
          name: testFn.name,
          category: 'Simulator Adapter',
          status: 'failed',
          durationMs,
          message: `Unhandled exception in Phase 6 test: ${err?.message || err}`,
        };
        results.push(failRes);
        if (onProgress) onProgress(failRes.name, false);
      }
    }

    const passed = results.filter(r => r.status === 'passed').length;
    return { passed, total: results.length, results };
  }

  /**
   * Phase 6.1: Python Script Adapter Execution & Structured Protocol
   */
  public static async testPythonScriptAdapterExecution(): Promise<TestResult> {
    const pythonCode = `
      function evaluate_candidate(params) {
        const x1 = params['x1'];
        const x2 = params['x2'];
        // Nonlinear Branin-like aerodynamic surrogate model
        const f = Math.pow(x2 - (5.1 / (4 * Math.pow(Math.PI, 2))) * Math.pow(x1, 2) + (5 / Math.PI) * x1 - 6, 2) + 10 * (1 - 1 / (8 * Math.PI)) * Math.cos(x1) + 10;
        const g1 = x1 + x2 - 5.0; // Constraint: x1 + x2 <= 5.0

        return {
          objectives: {
            branin_loss: Number(f.toFixed(4)),
          },
          constraints: {
            sum_limit: Number(g1.toFixed(4)),
          }
        };
      }
    `;

    const adapter = new PythonSimulatorAdapter({
      scriptCode: pythonCode,
      entryMode: 'function_call',
      timeoutMs: 5000,
    });

    const res1 = await adapter.execute({ x1: 3.14159, x2: 2.275 });
    const res2 = await adapter.execute({ x1: 9.42478, x2: 2.475 });

    const p1Passed = res1.status === 'successful' && Math.abs(res1.objectiveValues['branin_loss'] - 0.3979) < 0.05;
    const p2Passed = res2.status === 'successful' && Math.abs(res2.objectiveValues['branin_loss'] - 0.3979) < 0.05;
    const constraintsPassed = res1.constraintValues['sum_limit'] !== undefined;

    const passed = p1Passed && p2Passed && constraintsPassed;

    return {
      id: 'test_p6_1',
      name: 'Phase 6.1: Python Script Adapter Execution & JSON Protocol',
      category: 'Simulator Adapter',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? 'Python script executed deterministically with math sandbox, structured returns, and constraint metrics.'
        : `Python execution mismatch: res1=${JSON.stringify(res1.objectiveValues)}, res2=${JSON.stringify(res2.objectiveValues)}`,
      details: { res1, res2 },
    };
  }

  /**
   * Phase 6.2: CLI Process Adapter & Argument Template Interpolation
   */
  public static async testCLIArgumentTemplateInterpolation(): Promise<TestResult> {
    const rules: OutputExtractionRule[] = [
      {
        target: 'objective',
        name: 'Cl',
        parserType: 'regex',
        pattern: 'Cl \\(Lift Coefficient\\)\\s*=\\s*([0-9\\.\\-eE]+)',
      },
      {
        target: 'objective',
        name: 'Cd',
        parserType: 'regex',
        pattern: 'Cd \\(Drag Coefficient\\)\\s*=\\s*([0-9\\.\\-eE]+)',
      },
      {
        target: 'constraint',
        name: 'Separation_Margin',
        parserType: 'regex',
        pattern: 'Separation Margin\\s*=\\s*([0-9\\.\\-eE]+)',
      },
    ];

    const cliAdapter = new CLISimulatorAdapter({
      commandTemplate: 'openfoam_airfoil --camber={{camber | .4f}} --thickness={{thickness | .4f}} --aoa={{aoa | .2f}} --mach=${mach}',
      timeoutMs: 8000,
    }, rules);

    const formatted = cliAdapter.formatCommand({
      camber: 0.04123,
      thickness: 0.12000,
      aoa: 5.5,
      mach: 0.3,
    });

    const expectedCmd = 'openfoam_airfoil --camber=0.0412 --thickness=0.1200 --aoa=5.50 --mach=0.3';
    const formatValid = formatted === expectedCmd;

    const execResult = await cliAdapter.execute({
      camber: 0.04,
      thickness: 0.12,
      aoa: 4.0,
      mach: 0.25,
    });

    const executionValid = execResult.status === 'successful' &&
      execResult.objectiveValues['Cl'] > 0 &&
      execResult.objectiveValues['Cd'] > 0 &&
      execResult.constraintValues['Separation_Margin'] > 0 &&
      execResult.filesGenerated.includes('forces.dat');

    const passed = formatValid && executionValid;

    return {
      id: 'test_p6_2',
      name: 'Phase 6.2: CLI Process Adapter & Argument Template Interpolation',
      category: 'Simulator Adapter',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? 'CLI argument templating with precision specifiers and simulated process dispatch passed.'
        : `Formatting or execution mismatch: formatted="${formatted}", expected="${expectedCmd}", status=${execResult.status}`,
      details: { formatted, expectedCmd, execResult },
    };
  }

  /**
   * Phase 6.3: Multi-Format Input Deck Generation (Template, JSON, CSV, Namelist)
   */
  public static async testMultiFormatInputDeckGeneration(): Promise<TestResult> {
    const params = {
      beam_width: 0.05,
      beam_height: 0.12,
      tip_load_kn: 25.0,
      material: 'titanium',
    };

    // 1. Template-based Deck (CalculiX / ANSYS format)
    const feaTemplate = `
*HEADING
Model: Cantilever Beam Optimization
*NODE
1, 0.0, 0.0, 0.0
2, 2.0, {{beam_width | .4f}}, {{beam_height | .4f}}
*MATERIAL, NAME={{material}}
*CLOAD
2, 3, -{{tip_load_kn | .1f}}E3
*END STEP
    `.trim();

    const generatedTemplate = InputDeckGenerator.generate('template', params, feaTemplate);
    const hasWidth = generatedTemplate.includes('0.0500');
    const hasHeight = generatedTemplate.includes('0.1200');
    const hasLoad = generatedTemplate.includes('-25.0E3');
    const hasMaterial = generatedTemplate.includes('NAME=titanium');

    // 2. JSON Deck
    const jsonDeck = InputDeckGenerator.generate('json', params);
    const parsedJSON = JSON.parse(jsonDeck);
    const jsonValid = parsedJSON.beam_width === 0.05 && parsedJSON.material === 'titanium';

    // 3. CSV Deck
    const csvDeck = InputDeckGenerator.generate('csv', params);
    const csvLines = csvDeck.trim().split('\n');
    const csvValid = csvLines.length === 2 && csvLines[0].includes('beam_width') && csvLines[1].includes('0.05');

    // 4. Fortran Namelist
    const namelistDeck = InputDeckGenerator.generate('namelist', params);
    const namelistValid = namelistDeck.includes('&SIMULATION_PARAMS') && namelistDeck.includes("material = 'titanium'");

    const passed = hasWidth && hasHeight && hasLoad && hasMaterial && jsonValid && csvValid && namelistValid;

    return {
      id: 'test_p6_3',
      name: 'Phase 6.3: Multi-Format Input Deck Generation (Template, JSON, CSV, Namelist)',
      category: 'Simulator Adapter',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? 'Generated compliant FEA decks, JSON payloads, CSV parameter matrices, and Fortran Namelists.'
        : 'Failed multi-format input deck validation assertions.',
      details: { generatedTemplate, jsonDeck, csvDeck, namelistDeck },
    };
  }

  /**
   * Phase 6.4: Engineering Output Parsing & Multi-Modal Extraction
   */
  public static async testEngineeringOutputParsingAndExtraction(): Promise<TestResult> {
    const rawStdout = `
 solver: simpleFoam steady-state
 Iteration 150
 Continuity error: 1.25e-6
 Cl (Lift Coefficient) = 0.84520
 Cd (Drag Coefficient) = 0.02140
 L/D Aerodynamic Ratio = 39.495
 Peak Temperature: 328.45 K
    `;

    const forcesCSV = `
Iteration,TimeStep,Cl,Cd,Cm,L_D
1,0.01,0.12,0.08,-0.01,1.5
50,0.50,0.75,0.025,-0.03,30.0
100,1.00,0.84,0.022,-0.04,38.1
150,1.50,0.85,0.021,-0.04,40.4
    `.trim();

    const summaryJSON = JSON.stringify({
      simulation: {
        mesh: { elements: 150000 },
        results: {
          stress: { max_von_mises: 214500000 }, // in Pa
          safety_factor: 1.85,
        }
      }
    });

    const rules: OutputExtractionRule[] = [
      // 1. Regex parser on stdout with unit conversion (Kelvin to Celsius: offset -273.15)
      {
        target: 'objective',
        name: 'peak_temp_c',
        parserType: 'regex',
        pattern: 'Peak Temperature:\\s*([0-9\\.\\-eE]+)',
        offset: -273.15,
      },
      // 2. CSV Column with 'max' reduction
      {
        target: 'objective',
        name: 'max_lift_to_drag',
        parserType: 'csv_column',
        fileName: 'forces.csv',
        csvColumn: 'L_D',
        reduction: 'max',
      },
      // 3. CSV Column with 'last' reduction
      {
        target: 'objective',
        name: 'final_cd',
        parserType: 'csv_column',
        fileName: 'forces.csv',
        csvColumn: 'Cd',
        reduction: 'last',
      },
      // 4. JSON path parser with scale multiplier (Pa -> MPa: 1e-6)
      {
        target: 'constraint',
        name: 'max_stress_mpa',
        parserType: 'json_path',
        fileName: 'summary.json',
        jsonKey: 'simulation.results.stress.max_von_mises',
        scaleMultiplier: 1e-6,
      },
      // 5. JSON path direct float
      {
        target: 'constraint',
        name: 'safety_factor',
        parserType: 'json_path',
        fileName: 'summary.json',
        jsonKey: 'simulation.results.safety_factor',
      },
    ];

    const extracted = OutputParser.extractAll(rules, rawStdout, {
      'forces.csv': forcesCSV,
      'summary.json': summaryJSON,
    });

    const tempValid = Math.abs(extracted.objectives['peak_temp_c'] - 55.3) < 0.1;
    const maxLdValid = extracted.objectives['max_lift_to_drag'] === 40.4;
    const finalCdValid = extracted.objectives['final_cd'] === 0.021;
    const stressValid = extracted.constraints['max_stress_mpa'] === 214.5;
    const sfValid = extracted.constraints['safety_factor'] === 1.85;

    const passed = tempValid && maxLdValid && finalCdValid && stressValid && sfValid && extracted.errors.length === 0;

    return {
      id: 'test_p6_4',
      name: 'Phase 6.4: Engineering Output Parsing & Multi-Modal Extraction',
      category: 'Simulator Adapter',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? 'Verified regex extraction with unit offsets, CSV timeseries max/last aggregations, and scaled JSON dot-paths.'
        : `Extraction mismatch: ${JSON.stringify(extracted)}`,
      details: extracted,
    };
  }

  /**
   * Phase 6.5: Timeout Enforcement & Process Failure Resilience
   */
  public static async testTimeoutEnforcementAndFailureResilience(): Promise<TestResult> {
    // 1. Timeout Test (simulate long async evaluation with tight 40ms timeout)
    const longRunningScript = `
      async function evaluate_candidate(params) {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { objectives: { val: 1 } };
      }
    `;

    const timeoutAdapter = new PythonSimulatorAdapter({
      scriptCode: longRunningScript,
      entryMode: 'function_call',
      timeoutMs: 40, // Strict 40ms timeout limit
    });

    const timeoutRes = await timeoutAdapter.execute({ x: 1 });
    const isTimeoutHandled = timeoutRes.status === 'timeout';

    // 2. Syntax/Runtime Error Test
    const brokenScript = `
      function evaluate_candidate(params) {
        throw new Error("CFD Mesh divergence at cell 42918");
      }
    `;

    const errorAdapter = new PythonSimulatorAdapter({
      scriptCode: brokenScript,
      entryMode: 'function_call',
      timeoutMs: 2000,
    });

    const errorRes = await errorAdapter.execute({ x: 1 });
    const isErrorHandled = errorRes.status === 'adapter_error' && (errorRes.error?.includes('Mesh divergence') || false);

    const passed = isTimeoutHandled && isErrorHandled;

    return {
      id: 'test_p6_5',
      name: 'Phase 6.5: Timeout Enforcement & Process Failure Resilience',
      category: 'Simulator Adapter',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? 'Verified timeout termination and solver convergence crash recovery without hanging optimizer.'
        : `Failure handling issue: timeout=${timeoutRes.status}, error=${errorRes.status}`,
      details: { timeoutRes, errorRes },
    };
  }

  /**
   * Phase 6.6: Physics-Based CFD and FEA Virtual Solvers
   */
  public static async testPhysicsBasedCFDAndFEAVirtualSolvers(): Promise<TestResult> {
    // 1. Aerodynamic CFD: Angle of attack vs Lift
    const aero0 = EngineeringVirtualSolvers.solveAirfoilCFD({ camber: 0.02, thickness: 0.12, aoa: 0.0 });
    const aero8 = EngineeringVirtualSolvers.solveAirfoilCFD({ camber: 0.02, thickness: 0.12, aoa: 8.0 });
    const aero25 = EngineeringVirtualSolvers.solveAirfoilCFD({ camber: 0.02, thickness: 0.12, aoa: 25.0 }); // Stalled

    const clIncreasesWithAoa = aero8.liftCoefficient > aero0.liftCoefficient;
    const stallsAtHighAoa = aero25.isStalled === true;

    // 2. Cantilever Beam FEA: Height vs Bending Stress (sigma = 6 P L / (b h^2))
    const feaThin = EngineeringVirtualSolvers.solveCantileverFEA({ width: 0.05, height: 0.08, length: 2.0, tip_load_kn: 20.0 });
    const feaThick = EngineeringVirtualSolvers.solveCantileverFEA({ width: 0.05, height: 0.16, length: 2.0, tip_load_kn: 20.0 });

    // Doubling height should reduce stress by factor of ~4
    const stressRatio = feaThin.maxStressMPa / feaThick.maxStressMPa;
    const stressReductionValid = Math.abs(stressRatio - 4.0) < 0.2;
    const deflectionReductionValid = feaThick.tipDeflectionMm < feaThin.tipDeflectionMm;

    const passed = clIncreasesWithAoa && stallsAtHighAoa && stressReductionValid && deflectionReductionValid;

    return {
      id: 'test_p6_6',
      name: 'Phase 6.6: Physics-Based CFD and FEA Virtual Solvers',
      category: 'Simulator Adapter',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Airfoil CFD lift slope verified (0°->8°->stall) and Cantilever FEA bending scaling verified (h double => stress ratio ${stressRatio.toFixed(2)}x).`
        : `Physics validation failed: cl0=${aero0.liftCoefficient}, cl8=${aero8.liftCoefficient}, stressRatio=${stressRatio}`,
      details: { aero0, aero8, aero25, feaThin, feaThick, stressRatio },
    };
  }

  /**
   * Phase 6.7: Full Optimization Pipeline Execution via Simulator Adapter
   */
  public static async testEndToEndSimulatorOptimizationPipeline(): Promise<TestResult> {
    const simulatorProblem: Problem = {
      id: 'cantilever_fea_opt',
      name: 'Cantilever Beam Weight & Stress Optimization (FEA Adapter)',
      description: 'Minimizes structural mass subject to max stress and deflection limits',
      version: '1.0.0',
      variables: [
        { id: 'v1', name: 'width', type: 'continuous', lowerBound: 0.03, upperBound: 0.10, defaultValue: 0.05, unit: 'm', description: 'Beam width' },
        { id: 'v2', name: 'height', type: 'continuous', lowerBound: 0.06, upperBound: 0.25, defaultValue: 0.10, unit: 'm', description: 'Beam height' },
        { id: 'v3', name: 'length', type: 'continuous', lowerBound: 1.5, upperBound: 2.5, defaultValue: 2.0, unit: 'm', description: 'Beam length' },
      ],
      objectives: [
        { id: 'mass', name: 'mass_kg', direction: 'minimize', unit: 'kg', description: 'Total beam mass' }
      ],
      constraints: [
        { id: 'c1', name: 'max_stress_mpa', operator: '<=', threshold: 200.0, unit: 'MPa', description: 'Max Von Mises stress' },
        { id: 'c2', name: 'tip_deflection_mm', operator: '<=', threshold: 15.0, unit: 'mm', description: 'Max tip deflection' }
      ],
      adapter: {
        type: 'fea',
        code: 'Cantilever FEA Solver',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const evaluator = new UniversalEvaluator(simulatorProblem);
    const optimizer = new DifferentialEvolutionOptimizer(simulatorProblem, 42, {
      populationSize: 10,
      crossoverRateCR: 0.7,
      mutationFactorF: 0.6,
      strategy: 'rand/1/bin',
    });

    const trials: any[] = [];
    let bestFeasibleMass = Infinity;

    for (let iter = 1; iter <= 25; iter++) {
      const candidateParams = optimizer.generateCandidate();
      const evalRes = await evaluator.evaluate(candidateParams);

      const trial = {
        id: `trial_${iter}`,
        runId: 'p6_sim_run',
        iteration: iter,
        parameters: candidateParams,
        objectiveValues: evalRes.objectiveValues,
        constraintValues: evalRes.constraintValues,
        feasible: evalRes.feasible,
        evaluationDurationMs: evalRes.durationMs,
        status: evalRes.status,
        timestamp: new Date().toISOString(),
      };

      trials.push(trial);
      optimizer.updatePopulation(trial);

      if (evalRes.feasible) {
        const mass = evalRes.objectiveValues['mass_kg'] ?? evalRes.objectiveValues['massKg'] ?? 100;
        if (mass < bestFeasibleMass) {
          bestFeasibleMass = mass;
        }
      }
    }

    const successfulTrials = trials.filter(t => t.status === 'successful');
    const feasibleTrials = trials.filter(t => t.feasible);
    const passed = successfulTrials.length === 25 && feasibleTrials.length > 0 && isFinite(bestFeasibleMass);

    return {
      id: 'test_p6_7',
      name: 'Phase 6.7: Full Optimization Pipeline Execution via Simulator Adapter',
      category: 'Simulator Adapter',
      status: passed ? 'passed' : 'failed',
      durationMs: 0,
      message: passed
        ? `Successfully drove 25 iterations through FEA Simulator Adapter (${feasibleTrials.length} feasible candidates found, best mass = ${bestFeasibleMass.toFixed(2)} kg).`
        : `Pipeline failed: successful=${successfulTrials.length}, feasible=${feasibleTrials.length}`,
      details: { totalTrials: trials.length, feasibleCount: feasibleTrials.length, bestFeasibleMass },
    };
  }
}
