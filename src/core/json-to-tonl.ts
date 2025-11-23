/**
 * Enhanced JSON to TONL Converter
 * Now with extended type support and nested objects
 */

import { validateAndMergeSchemas, TypeName, flattenObject } from './type-detector.js';
import { TonlValidationError, TonlSchemaError } from '../utils/errors.js';

/**
 * Map TypeScript/JS types to TONL type names
 */
export function typeNameToTonl(type: TypeName): string {
  const typeMap: Record<TypeName, string> = {
    // Primitives
    string: 'str',
    boolean: 'bool',
    null: 'null',
    // Integers
    int8: 'i8',
    int16: 'i16',
    int32: 'i32',
    int64: 'i64',
    // Floats
    float32: 'f32',
    float64: 'f64',
    // Special
    date: 'date',
    datetime: 'datetime',
    array: 'arr',
    object: 'obj',
  };

  return typeMap[type];
}

/**
 * Build TONL header from schema
 */
export function buildTonlHeader(
  name: string,
  count: number,
  schema: Record<string, TypeName>
): string {
  // Validate name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new TonlValidationError(
      `Invalid collection name: "${name}". Must start with letter/underscore and contain only alphanumeric characters.`
    );
  }

  // Build schema part
  const schemaEntries = Object.entries(schema)
    .map(([key, type]) => `${key}:${typeNameToTonl(type)}`)
    .join(',');

  return `${name}[${count}]{${schemaEntries}}`;
}

/**
 * Enhanced value formatting with proper escaping
 */
export function formatValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    // Escape special characters
    const escaped = value
      .replace(/\\/g, '\\\\') // Backslash
      .replace(/"/g, '\\"') // Quote
      .replace(/\n/g, '\\n') // Newline
      .replace(/\r/g, '\\r') // Carriage return
      .replace(/\t/g, '\\t'); // Tab

    // Quote if contains comma, space, or special chars
    if (escaped.includes(',') || escaped.includes(' ') || escaped !== value) {
      return `"${escaped}"`;
    }
    return escaped;
  }

  if (typeof value === 'boolean') {
    return value.toString();
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return `[${value.map((v) => formatValue(v)).join(',')}]`;
  }

  // Object: JSON stringify as fallback
  return JSON.stringify(value);
}

/**
 * Format nested object inline
 */
export function formatNestedObject(value: unknown): string {
  if (value === null) return 'null';

  if (Array.isArray(value)) {
    const items = value.map((v) => formatNestedValue(v));
    return `[${items.join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const formatted = entries.map(([k, v]) => `${k}:${formatNestedValue(v)}`);
    return `{${formatted.join(',')}}`;
  }

  return formatValue(value);
}

/**
 * Format value for nested structures (no quotes on simple strings)
 */
function formatNestedValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();

  if (Array.isArray(value)) {
    return `[${value.map((v) => formatNestedValue(v)).join(',')}]`;
  }

  if (typeof value === 'object') {
    return formatNestedObject(value);
  }

  return String(value);
}

/**
 * Enhanced JSON to TONL conversion with nested object support
 */
export function jsonToTonl(
  data: Record<string, unknown>[],
  name: string = 'data',
  options: { flattenNested?: boolean } = {}
): string {
  // Validate input
  if (!Array.isArray(data)) {
    throw new TonlValidationError('Input must be an array of objects', { received: typeof data });
  }

  if (data.length === 0) {
    return `${name}[0]{}:\n`;
  }

  // Validate all items are objects
  const nonObjects = data.filter(
    (item) => typeof item !== 'object' || item === null || Array.isArray(item)
  );

  if (nonObjects.length > 0) {
    throw new TonlValidationError('All array items must be objects', {
      nonObjectCount: nonObjects.length,
      example: nonObjects[0],
    });
  }

  try {
    // Check if we should flatten (default: keep nested)
    const processedData = options.flattenNested ? data.map((obj) => flattenObject(obj)) : data;

    // Validate schema
    const schema = validateAndMergeSchemas(processedData);

    // Build header
    const header = buildTonlHeader(name, data.length, schema);

    // Build rows with nested support
    const rows = processedData.map((obj, index) => {
      try {
        const values = Object.keys(schema).map((key) => {
          const value = obj[key];
          const type = schema[key];

          // Use nested formatting for objects and arrays
          if (type === 'object' || type === 'array') {
            return formatNestedObject(value);
          }

          return formatValue(value);
        });
        return values.join(',');
      } catch (error) {
        throw new TonlSchemaError(`Error formatting row ${index + 1}`, {
          row: index + 1,
          object: obj,
          error,
        });
      }
    });

    return `${header}:\n${rows.join('\n')}\n`;
  } catch (error) {
    if (error instanceof TonlValidationError || error instanceof TonlSchemaError) {
      throw error;
    }

    throw new TonlSchemaError('Failed to convert JSON to TONL', { originalError: error });
  }
}
