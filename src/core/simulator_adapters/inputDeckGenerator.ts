import { InputDeckFormat } from './simulatorTypes';

/**
 * Generates engineering input decks and configuration files from candidate parameters.
 * Supports template substitution (e.g. OpenFOAM, CalculiX, MATLAB), JSON, CSV, INI/Namelists, and Key-Value.
 */
export class InputDeckGenerator {
  /**
   * Main entry point to format parameters into an input deck string.
   */
  public static generate(
    format: InputDeckFormat,
    parameters: Record<string, number | string>,
    templateContent?: string
  ): string {
    switch (format) {
      case 'template':
        return this.generateFromTemplate(templateContent || '', parameters);
      case 'json':
        return this.generateJSON(parameters);
      case 'csv':
        return this.generateCSV(parameters);
      case 'namelist':
        return this.generateFortranNamelist(parameters);
      case 'key_value':
        return this.generateKeyValue(parameters);
      default:
        return this.generateFromTemplate(templateContent || '', parameters);
    }
  }

  /**
   * Template interpolation supporting {{variable_name}}, ${variable_name}, and format specifiers like {{x | .4f}}
   */
  public static generateFromTemplate(
    template: string, 
    parameters: Record<string, number | string>
  ): string {
    if (!template) return '';

    let result = template;

    // Handle {{param}} and {{param | format}}
    result = result.replace(/\{\{\s*([a-zA-Z0-9_\-]+)(\s*\|\s*([^}]+))?\s*\}\}/g, (match, key, _, formatSpec) => {
      if (parameters[key] !== undefined) {
        const val = parameters[key];
        return this.formatScalar(val, formatSpec);
      }
      return match; // Keep unresolved tags intact
    });

    // Handle ${param}
    result = result.replace(/\$\{([a-zA-Z0-9_\-]+)\}/g, (match, key) => {
      if (parameters[key] !== undefined) {
        return String(parameters[key]);
      }
      return match;
    });

    return result;
  }

  /**
   * JSON formatted deck (pretty-printed with 2 space indentation)
   */
  public static generateJSON(parameters: Record<string, number | string>): string {
    return JSON.stringify(parameters, null, 2);
  }

  /**
   * CSV formatted input deck with header row and single values row
   */
  public static generateCSV(parameters: Record<string, number | string>): string {
    const keys = Object.keys(parameters);
    const headers = keys.join(',');
    const values = keys.map(k => {
      const val = parameters[k];
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`;
      }
      return String(val);
    }).join(',');
    return `${headers}\n${values}\n`;
  }

  /**
   * Key-Value configuration lines (e.g. INI or config file)
   */
  public static generateKeyValue(parameters: Record<string, number | string>): string {
    return Object.entries(parameters)
      .map(([k, v]) => `${k} = ${v}`)
      .join('\n') + '\n';
  }

  /**
   * Fortran / CFD / FEA Namelist input deck format (&SIM_PARAMS ... /)
   */
  public static generateFortranNamelist(
    parameters: Record<string, number | string>,
    namelistName: string = 'SIMULATION_PARAMS'
  ): string {
    const lines = [`&${namelistName}`];
    for (const [k, v] of Object.entries(parameters)) {
      if (typeof v === 'string') {
        lines.push(`  ${k} = '${v}'`);
      } else {
        lines.push(`  ${k} = ${v}`);
      }
    }
    lines.push('/');
    return lines.join('\n') + '\n';
  }

  /**
   * Formats numbers according to format specifier (e.g. .4f, .2e, int)
   */
  private static formatScalar(val: number | string, formatSpec?: string): string {
    if (formatSpec && typeof val === 'number') {
      const spec = formatSpec.trim();
      if (spec.startsWith('.')) {
        const type = spec.slice(-1);
        const precision = parseInt(spec.slice(1, -1), 10);
        if (!isNaN(precision)) {
          if (type === 'f') return val.toFixed(precision);
          if (type === 'e') return val.toExponential(precision);
          if (type === 'g') return val.toPrecision(precision);
        }
      } else if (spec === 'int' || spec === 'd') {
        return String(Math.round(val));
      }
    }
    return String(val);
  }
}
