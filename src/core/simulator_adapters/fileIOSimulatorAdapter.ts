import { 
  FileIOSimulatorConfig, 
  SimulatorExecutionResult 
} from './simulatorTypes';
import { EvaluationStatus } from '../../types';
import { InputDeckGenerator } from './inputDeckGenerator';
import { OutputParser } from './outputParser';
import { EngineeringVirtualSolvers } from './engineeringVirtualSolvers';

/**
 * File I/O Simulator Adapter
 * Coordinates multi-file engineering simulation workflows:
 * 1. Generates parameterized input decks (OpenFOAM dictionaries, FEA decks, MATLAB scripts, JSON/CSV).
 * 2. Executes simulation solver.
 * 3. Inspects generated output files and extracts metrics via regex/CSV/JSON parsers.
 * 4. Handles file cleanup and error trapping.
 */
export class FileIOSimulatorAdapter {
  private config: FileIOSimulatorConfig;

  constructor(config: FileIOSimulatorConfig) {
    this.config = config;
  }

  /**
   * Previews the input deck content that will be written for a set of parameters
   */
  public generateInputDeck(parameters: Record<string, number | string>): string {
    return InputDeckGenerator.generate(
      this.config.inputFormat,
      parameters,
      this.config.inputDeckTemplate
    );
  }

  /**
   * Executes the file-based simulation workflow
   */
  public async execute(parameters: Record<string, number | string>): Promise<SimulatorExecutionResult> {
    const startTime = performance.now();
    let status: EvaluationStatus = 'successful';
    let error: string | undefined;
    let stdoutLog = '';
    const outputFiles: Record<string, string> = {};

    try {
      // 1. Generate Input Deck
      const inputDeckContent = this.generateInputDeck(parameters);
      stdoutLog += `[File I/O Manager] Generated input deck '${this.config.inputDeckFileName}' (${this.config.inputFormat} format)\n`;

      // 2. Dispatch to virtual solver based on configuration / keywords
      const deckLower = inputDeckContent.toLowerCase() + ' ' + (this.config.inputDeckFileName || '').toLowerCase();

      if (deckLower.includes('airfoil') || deckLower.includes('openfoam') || deckLower.includes('aerodynamics')) {
        const sim = EngineeringVirtualSolvers.solveAirfoilCFD(parameters);
        outputFiles['forces.dat'] = sim.forcesTimeseriesCSV;
        outputFiles['openfoam.log'] = sim.openFoamLog;
        outputFiles['residual.dat'] = sim.residualConvergence.map((r, i) => `${i},${r}`).join('\n');
        stdoutLog += sim.openFoamLog;
      } else if (deckLower.includes('cantilever') || deckLower.includes('calculix') || deckLower.includes('fea') || deckLower.includes('stress')) {
        const sim = EngineeringVirtualSolvers.solveCantileverFEA(parameters);
        outputFiles['nodal_stress.csv'] = sim.nodalStressCSV;
        outputFiles['calculix.log'] = sim.calculixLog;
        stdoutLog += sim.calculixLog;
      } else if (deckLower.includes('thermal') || deckLower.includes('simulink') || deckLower.includes('battery')) {
        const sim = EngineeringVirtualSolvers.solveEVThermal(parameters);
        outputFiles['thermal_history.csv'] = sim.thermalHistoryCSV;
        outputFiles['simulink.log'] = sim.simulinkLog;
        stdoutLog += sim.simulinkLog;
      } else {
        // Generic fallback solver producing JSON and CSV
        const sumSq: number = Object.values(parameters).reduce<number>((acc: number, val: string | number) => {
          const num = typeof val === 'number' ? val : parseFloat(String(val));
          return acc + (isNaN(num) ? 0 : Math.pow(num, 2));
        }, 0);

        outputFiles['summary.json'] = JSON.stringify({
          cost: sumSq,
          metric: Math.sqrt(Number(sumSq)),
          parameters,
        }, null, 2);

        outputFiles['results.csv'] = `step,cost,time\n1,${sumSq},0.01\n`;
        stdoutLog += `[File I/O Simulator] Generic execution completed. Output written to summary.json`;
      }

      // 3. Extract metrics from output files & stdout
      const parsed = OutputParser.extractAll(
        this.config.extractionRules,
        stdoutLog,
        outputFiles
      );

      const objectiveValues = parsed.objectives;
      const constraintValues = parsed.constraints;

      if (parsed.errors.length > 0) {
        error = parsed.errors.join('; ');
      }

      const durationMs = performance.now() - startTime;

      return {
        status: status,
        objectiveValues,
        constraintValues,
        rawOutputLogs: stdoutLog,
        durationMs: Number(durationMs.toFixed(2)),
        filesGenerated: Object.keys(outputFiles),
        error,
      };

    } catch (err: any) {
      status = 'adapter_error';
      error = err.message || 'File I/O simulation failed';
      stdoutLog += `\n[File I/O Error] ${error}`;

      const durationMs = performance.now() - startTime;

      return {
        status,
        objectiveValues: {},
        constraintValues: {},
        rawOutputLogs: stdoutLog,
        durationMs: Number(durationMs.toFixed(2)),
        filesGenerated: Object.keys(outputFiles),
        error,
      };
    }
  }
}
