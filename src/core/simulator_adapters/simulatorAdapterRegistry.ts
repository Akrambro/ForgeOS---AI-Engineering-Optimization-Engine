import { Problem, EvaluationResult, EvaluationStatus } from '../../types';
import { 
  FileIOSimulatorConfig, 
  CLIProcessConfig, 
  PythonScriptConfig,
  OutputExtractionRule 
} from './simulatorTypes';
import { PythonSimulatorAdapter } from './pythonSimulatorAdapter';
import { CLISimulatorAdapter } from './cliSimulatorAdapter';
import { FileIOSimulatorAdapter } from './fileIOSimulatorAdapter';

/**
 * Registry and factory for creating and dispatching real simulator adapters
 */
export class SimulatorAdapterRegistry {
  /**
   * Dispatches simulation evaluation based on problem adapter configuration
   */
  public static async evaluate(
    problem: Problem,
    parameters: Record<string, number | string>
  ): Promise<EvaluationResult> {
    const adapterConfig = problem.adapter;
    const adapterType = adapterConfig.type as string;

    if (adapterType === 'python') {
      const pyAdapter = new PythonSimulatorAdapter({
        scriptCode: adapterConfig.code || '',
        entryMode: 'function_call',
        timeoutMs: 10000,
      });

      const res = await pyAdapter.execute(parameters);
      return {
        objectiveValues: res.objectiveValues,
        constraintValues: res.constraintValues,
        feasible: res.status === 'successful',
        durationMs: res.durationMs,
        status: res.status,
        error: res.error,
        metadata: {
          logs: res.rawOutputLogs,
          files: res.filesGenerated,
        },
      };
    }

    if (adapterType === 'cli' || adapterType === 'command') {
      // Build extraction rules from problem objectives and constraints
      const rules: OutputExtractionRule[] = [];
      
      for (const obj of problem.objectives) {
        rules.push({
          target: 'objective',
          name: obj.name,
          parserType: 'regex',
          pattern: `${obj.name}\\s*[:=]\\s*([0-9\\.\\-eE]+)`,
          defaultValue: 0,
        });
      }

      for (const con of problem.constraints) {
        rules.push({
          target: 'constraint',
          name: con.name,
          parserType: 'regex',
          pattern: `${con.name}\\s*[:=]\\s*([0-9\\.\\-eE]+)`,
          defaultValue: 0,
        });
      }

      const cliAdapter = new CLISimulatorAdapter({
        commandTemplate: adapterConfig.commandTemplate || 'eval_sim.exe --params={{parameters}}',
        timeoutMs: 15000,
      }, rules);

      const res = await cliAdapter.execute(parameters);
      return {
        objectiveValues: res.objectiveValues,
        constraintValues: res.constraintValues,
        feasible: res.status === 'successful',
        durationMs: res.durationMs,
        status: res.status,
        error: res.error,
        metadata: {
          logs: res.rawOutputLogs,
          files: res.filesGenerated,
        },
      };
    }

    if (adapterType === 'file_io' || adapterType === 'cfd' || adapterType === 'fea' || adapterType === 'matlab') {
      // Formulate File I/O configuration
      const rules: OutputExtractionRule[] = [];

      for (const obj of problem.objectives) {
        rules.push({
          target: 'objective',
          name: obj.name,
          parserType: 'regex',
          pattern: `${obj.name}\\s*[:=]\\s*([0-9\\.\\-eE]+)`,
          defaultValue: 0,
        });
      }

      for (const con of problem.constraints) {
        rules.push({
          target: 'constraint',
          name: con.name,
          parserType: 'regex',
          pattern: `${con.name}\\s*[:=]\\s*([0-9\\.\\-eE]+)`,
          defaultValue: 0,
        });
      }

      const fileAdapter = new FileIOSimulatorAdapter({
        inputDeckTemplate: adapterConfig.code || '',
        inputDeckFileName: 'input_deck.dat',
        inputFormat: 'template',
        expectedOutputFiles: ['results.csv'],
        extractionRules: rules,
      });

      const res = await fileAdapter.execute(parameters);
      return {
        objectiveValues: res.objectiveValues,
        constraintValues: res.constraintValues,
        feasible: res.status === 'successful',
        durationMs: res.durationMs,
        status: res.status,
        error: res.error,
        metadata: {
          logs: res.rawOutputLogs,
          files: res.filesGenerated,
        },
      };
    }

    throw new Error(`Unsupported simulator adapter type: ${adapterType}`);
  }
}
