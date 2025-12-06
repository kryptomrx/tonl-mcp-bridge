import { validateAndMergeSchemas, TypeName, flattenObject } from './type-detector.js';
import { TonlValidationError, TonlSchemaError } from '../utils/errors.js';
import { anonymizeData, AnonymizeMode } from './privacy.js';

export function typeNameToTonl(type: TypeName): string {
  const typeMap: Record<TypeName, string> = {
    string: 'str',
    boolean: 'bool',
    null: 'null',
    int8: 'i8',
    int16: 'i16',
    int32: 'i32',
    int64: 'i64',
    float32: 'f32',
    float64: 'f64',
    date: 'date',
    datetime: 'datetime',
    array: 'arr',
    object: 'obj',
  };
  return typeMap[type] || 'str';
}

export function buildTonlHeader(
  name: string,
  count: number,
  schema: Record<string, TypeName>
): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new TonlValidationError(
      `Invalid collection name: "${name}". Must start with letter/underscore.`
    );
  }
  const schemaEntries = Object.entries(schema)
    .map(([key, type]) => `${key}:${typeNameToTonl(type)}`)
    .join(',');

  return `${name}[${count}]{${schemaEntries}}`;
}

export function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    if (escaped.includes(',') || escaped.includes(' ') || escaped !== value) {
      return `"${escaped}"`;
    }
    return escaped;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => formatValue(v)).join(',')}]`;
  }
  return JSON.stringify(value);
}

function formatNestedValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object' && !Array.isArray(value)) {
     const entries = Object.entries(value as Record<string, unknown>);
     const formatted = entries.map(([k, v]) => `${k}:${formatNestedValue(v)}`);
     return `{${formatted.join(',')}}`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(v => formatNestedValue(v)).join(',')}]`;
  }
  return formatValue(value).replace(/"/g, '');
}

export interface JsonToTonlOptions {
  /** Flatten nested objects into dot-notation keys */
  flattenNested?: boolean;
  /** Field names to anonymize (supports nested paths like 'user.email') */
  anonymize?: string[];
  /** Anonymization mode: 'redact' (default) or 'mask' (smart masking) */
  mask?: boolean;
}

export function jsonToTonl(
  data: Record<string, unknown>[],
  name: string = 'data',
  options: JsonToTonlOptions = {}
): string {
  if (!Array.isArray(data)) {
    throw new TonlValidationError('Input must be an array of objects');
  }
  if (data.length === 0) {
    return `${name}[0]{}:\n`;
  }

  try {
    // Step 1: Flatten first (if needed) so anonymization can match flattened keys
    let processedData = data;
    if (options.flattenNested) {
      processedData = processedData.map((obj) => flattenObject(obj));
    }
    
    // Step 2: Privacy preprocessing 🛡️
    if (options.anonymize && options.anonymize.length > 0) {
      const mode: AnonymizeMode = options.mask ? 'mask' : 'redact';
      processedData = anonymizeData(processedData, {
        fields: options.anonymize,
        mode
      });
    }
    
    // Step 3: Build TONL
    const schema = validateAndMergeSchemas(processedData);
    const header = buildTonlHeader(name, processedData.length, schema);

    const rows = processedData.map((obj, index) => {
      try {
        const values = Object.keys(schema).map((key) => {
          const value = obj[key];
          const type = schema[key];
          
          if (type === 'object' || type === 'array') {
             return formatNestedValue(value);
          }
          return formatValue(value);
        });
        return '  ' + values.join(', ');
      } catch (error) {
        throw new TonlSchemaError(`Error formatting row ${index + 1}`, { error });
      }
    });

    return `${header}:\n${rows.join('\n')}\n`;
  } catch (error) {
    if (error instanceof TonlValidationError || error instanceof TonlSchemaError) throw error;
    throw new TonlSchemaError('Failed to convert JSON to TONL', { originalError: error });
  }
}