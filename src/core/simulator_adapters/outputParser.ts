import { OutputExtractionRule, OutputMetricReduction } from './simulatorTypes';

/**
 * Universal Engineering Output Parser for extracting scalar objectives and constraints
 * from raw simulator outputs (terminal stdout logs, CSV timeseries, JSON results, key-value files).
 */
export class OutputParser {
  /**
   * Applies all extraction rules across generated output files and stdout log.
   */
  public static extractAll(
    rules: OutputExtractionRule[],
    stdoutLog: string,
    outputFiles: Record<string, string>
  ): {
    objectives: Record<string, number>;
    constraints: Record<string, number>;
    errors: string[];
  } {
    const objectives: Record<string, number> = {};
    const constraints: Record<string, number> = {};
    const errors: string[] = [];

    for (const rule of rules) {
      try {
        const textContent = rule.fileName 
          ? (outputFiles[rule.fileName] || '') 
          : stdoutLog;

        if (!textContent && rule.fileName) {
          throw new Error(`Expected output file '${rule.fileName}' was not found or is empty.`);
        }

        const rawValue = this.extractValue(rule, textContent);
        if (rawValue === null || rawValue === undefined || isNaN(rawValue) || !isFinite(rawValue)) {
          if (rule.defaultValue !== undefined) {
            if (rule.target === 'objective') objectives[rule.name] = rule.defaultValue;
            else constraints[rule.name] = rule.defaultValue;
          } else {
            throw new Error(`Failed to extract numeric metric for '${rule.name}' using ${rule.parserType} parser.`);
          }
          continue;
        }

        // Apply scale multiplier and offset (e.g. converting Pa -> MPa, Kelvin -> Celsius)
        let scaledValue = rawValue;
        if (rule.scaleMultiplier !== undefined) scaledValue *= rule.scaleMultiplier;
        if (rule.offset !== undefined) scaledValue += rule.offset;

        if (rule.target === 'objective') {
          objectives[rule.name] = scaledValue;
        } else {
          constraints[rule.name] = scaledValue;
        }
      } catch (err: any) {
        errors.push(`Rule '${rule.name}' error: ${err.message}`);
      }
    }

    return { objectives, constraints, errors };
  }

  /**
   * Extracts a single numeric value based on the specified parser type.
   */
  public static extractValue(rule: OutputExtractionRule, content: string): number | null {
    switch (rule.parserType) {
      case 'regex':
        return this.parseRegex(content, rule.pattern);
      case 'json_path':
        return this.parseJSONPath(content, rule.jsonKey);
      case 'csv_column':
        return this.parseCSVColumn(content, rule.csvColumn, rule.reduction || 'last');
      case 'key_value_pair':
        return this.parseKeyValuePair(content, rule.name);
      case 'last_line_scalar':
        return this.parseLastLineScalar(content);
      default:
        return this.parseRegex(content, rule.pattern);
    }
  }

  /**
   * Regex extraction: searches for a capturing group matching floating point or scientific notation numbers.
   * e.g. "Drag Coefficient\s*[:=]\s*([0-9\.\-eE]+)"
   */
  public static parseRegex(content: string, pattern?: string): number | null {
    if (!pattern || !content) return null;

    try {
      const regex = new RegExp(pattern, 'm');
      const match = content.match(regex);
      if (match && match[1]) {
        const parsed = parseFloat(match[1].trim());
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * JSON dot-notation path extraction: e.g. "solver.summary.max_stress"
   */
  public static parseJSONPath(content: string, jsonKey?: string): number | null {
    if (!content || !jsonKey) return null;

    try {
      const parsedJSON = JSON.parse(content);
      const keys = jsonKey.split('.');
      let current: any = parsedJSON;
      for (const k of keys) {
        if (current === undefined || current === null) return null;
        current = current[k];
      }
      const num = typeof current === 'number' ? current : parseFloat(current);
      return isNaN(num) ? null : num;
    } catch {
      return null;
    }
  }

  /**
   * CSV tabular data parsing with aggregation/reduction across timeseries steps
   */
  public static parseCSVColumn(
    content: string, 
    colIdentifier?: string | number, 
    reduction: OutputMetricReduction = 'last'
  ): number | null {
    if (!content || colIdentifier === undefined) return null;

    const lines = content.trim().split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));
    if (lines.length === 0) return null;

    // Header line detection
    const firstLine = lines[0].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    let colIndex = -1;

    if (typeof colIdentifier === 'number') {
      colIndex = colIdentifier;
    } else {
      colIndex = firstLine.findIndex(h => h.toLowerCase() === colIdentifier.toLowerCase());
      if (colIndex === -1 && !isNaN(Number(colIdentifier))) {
        colIndex = Number(colIdentifier);
      }
    }

    if (colIndex < 0) return null;

    // Data rows
    const dataStartIdx = isNaN(Number(firstLine[colIndex])) ? 1 : 0;
    const series: number[] = [];

    for (let i = dataStartIdx; i < lines.length; i++) {
      const cols = lines[i].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (cols.length > colIndex) {
        const val = parseFloat(cols[colIndex]);
        if (!isNaN(val) && isFinite(val)) {
          series.push(val);
        }
      }
    }

    if (series.length === 0) return null;

    return this.reduceSeries(series, reduction);
  }

  /**
   * Key-value line search: looks for "key = value" or "key: value"
   */
  public static parseKeyValuePair(content: string, keyName: string): number | null {
    if (!content || !keyName) return null;
    const escapedKey = keyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^\\s*${escapedKey}\\s*[:=]\\s*([0-9\\.\\-eE]+)`, 'mi');
    const match = content.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      return isNaN(val) ? null : val;
    }
    return null;
  }

  /**
   * Last line scalar parser (for solvers that output final objective on terminal stdout last line)
   */
  public static parseLastLineScalar(content: string): number | null {
    if (!content) return null;
    const lines = content.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return null;
    const lastLine = lines[lines.length - 1].trim();
    // Try to extract first float in last line
    const match = lastLine.match(/([0-9\.\-eE]+)/);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      return isNaN(val) ? null : val;
    }
    return null;
  }

  /**
   * Applies mathematical timeseries reduction (last, max, min, mean, integral, etc.)
   */
  private static reduceSeries(series: number[], reduction: OutputMetricReduction): number {
    switch (reduction) {
      case 'first':
        return series[0];
      case 'last':
      case 'raw':
        return series[series.length - 1];
      case 'max':
        return Math.max(...series);
      case 'min':
        return Math.min(...series);
      case 'mean':
        return series.reduce((a, b) => a + b, 0) / series.length;
      case 'integral':
        // Trapezoidal integration assuming uniform dt=1
        if (series.length <= 1) return series[0] || 0;
        let sum = 0;
        for (let i = 0; i < series.length - 1; i++) {
          sum += (series[i] + series[i + 1]) / 2;
        }
        return sum;
      default:
        return series[series.length - 1];
    }
  }
}
