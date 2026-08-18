import { EvaluationStatus } from '../../types';

export type SimulatorAdapterType = 
  | 'python' 
  | 'cli' 
  | 'file_io' 
  | 'matlab' 
  | 'cfd' 
  | 'fea' 
  | 'builtin' 
  | 'ev_thermal';

export type InputDeckFormat = 
  | 'template' 
  | 'json' 
  | 'csv' 
  | 'namelist' 
  | 'key_value';

export type OutputParserType = 
  | 'regex' 
  | 'json_path' 
  | 'csv_column' 
  | 'last_line_scalar' 
  | 'key_value_pair';

export type OutputMetricReduction = 
  | 'raw' 
  | 'last' 
  | 'first' 
  | 'max' 
  | 'min' 
  | 'mean' 
  | 'integral';

export interface OutputExtractionRule {
  target: 'objective' | 'constraint';
  name: string;
  parserType: OutputParserType;
  fileName?: string; // If parsing specific output file; if blank, parses stdout
  pattern?: string; // Regex pattern with capture group (e.g. "Drag Coefficient\s*:\s*([0-9\.\-eE]+)")
  jsonKey?: string; // Dot-separated key path (e.g. "results.stress.max_von_mises")
  csvColumn?: string | number; // Header name or zero-based column index
  reduction?: OutputMetricReduction; // For timeseries/tabular data (default 'last')
  scaleMultiplier?: number; // Optional unit conversion factor (e.g. Pa to MPa: 1e-6)
  offset?: number;
  defaultValue?: number;
}

export interface FileIOSimulatorConfig {
  inputDeckTemplate: string;
  inputDeckFileName: string;
  inputFormat: InputDeckFormat;
  expectedOutputFiles: string[];
  extractionRules: OutputExtractionRule[];
  cleanupWorkingDir?: boolean;
}

export interface CLIProcessConfig {
  commandTemplate: string; // e.g. "solver.exe --mesh={{mesh_file}} --vel={{velocity}} --output={{out_dir}}/res.dat"
  workingDir?: string;
  timeoutMs?: number;
  environmentVariables?: Record<string, string>;
  shell?: boolean;
}

export interface PythonScriptConfig {
  scriptCode: string; // Python code
  functionName?: string; // e.g. "evaluate_candidate"
  entryMode: 'json_stdin' | 'cli_args' | 'function_call';
  timeoutMs?: number;
}

export interface SimulatorExecutionContext {
  workingDirectory: string;
  candidateParameters: Record<string, number | string>;
  iteration: number;
  runId: string;
  generatedFiles: Record<string, string>;
  stdoutLog: string;
  stderrLog: string;
  exitCode: number;
  durationMs: number;
}

export interface SimulatorExecutionResult {
  status: EvaluationStatus;
  objectiveValues: Record<string, number>;
  constraintValues: Record<string, number>;
  rawOutputLogs: string;
  durationMs: number;
  filesGenerated: string[];
  error?: string;
  telemetry?: {
    memoryUsedMb?: number;
    cpuTimeMs?: number;
    exitCode?: number;
  };
}
