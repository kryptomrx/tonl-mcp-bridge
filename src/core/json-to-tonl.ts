/**
 * Enhanced JSON to TONL Converter
 * Now with extended type support and proper validation
 */

import { validateAndMergeSchemas, TypeName } from './type-detector.js';
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
 * Enhanced JSON to TONL conversion with validation
 */
export function jsonToTonl(data: Record<string, unknown>[], name: string = 'data'): string {
  // Validate input
  if (!Array.isArray(data)) {
    throw new TonlValidationError('Input must be an array of objects', { received: typeof data });
  }

  // Handle empty array
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
    // CRITICAL: Validate schema across ALL objects
    const schema = validateAndMergeSchemas(data);

    // Build header
    const header = buildTonlHeader(name, data.length, schema);

    // Build rows
    const rows = data.map((obj, index) => {
      try {
        const values = Object.keys(schema).map((key) => formatValue(obj[key]));
        return '  ' + values.join(', ');
      } catch (error) {
        throw new TonlSchemaError(`Error formatting row ${index + 1}`, {
          row: index + 1,
          object: obj,
          error,
        });
      }
    });

    // Combine
    return `${header}:\n${rows.join('\n')}\n`;
  } catch (error) {
    if (error instanceof TonlValidationError || error instanceof TonlSchemaError) {
      throw error;
    }

    throw new TonlSchemaError('Failed to convert JSON to TONL', { originalError: error });
  }
}
