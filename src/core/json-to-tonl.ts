/**
 * JSON to TONL Converter
 * Converts JSON arrays to TONL format for token optimization
 */

import { detectObjectSchema, TypeName } from './type-detector';

/**
 * Map TypeScript/JS types to TONL type names
 */
export function typeNameToTonl(type: TypeName): string {
  const typeMap: Record<TypeName, string> = {
    string: 'str',
    number: 'i32',
    boolean: 'bool',
    null: 'null',
    array: 'arr',
    object: 'obj'
  };
  
  return typeMap[type];
}

/**
 * Build TONL header from schema
 * 
 * @example
 * buildHeader("users", 2, { id: "number", name: "string" })
 * // Returns: "users[2]{id:i32,name:str}"
 */
export function buildTonlHeader(
  name: string,
  count: number,
  schema: Record<string, TypeName>
): string {
  // Build schema part: {id:i32,name:str,age:i32}
  const schemaEntries = Object.entries(schema)
    .map(([key, type]) => `${key}:${typeNameToTonl(type)}`)
    .join(',');
  
  // Combine: name[count]{schema}
  return `${name}[${count}]{${schemaEntries}}`;
}

/**
 * Format a value for TONL output
 */
export function formatValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  
  if (typeof value === 'string') {
    // If string contains comma or space, wrap in quotes
    if (value.includes(',') || value.includes(' ')) {
      return `"${value}"`;
    }
    return value;
  }
  
  if (typeof value === 'boolean') {
    return value.toString();
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (Array.isArray(value)) {
    return `[${value.join(',')}]`;
  }
  
  // Object: JSON stringify as fallback
  return JSON.stringify(value);
}

/**
 * Convert JSON array to TONL format
 * 
 * @param data - Array of objects to convert
 * @param name - Name for the data collection (default: "data")
 * @returns TONL formatted string
 * 
 * @example
 * const users = [
 *   { id: 1, name: "Alice" },
 *   { id: 2, name: "Bob" }
 * ];
 * 
 * jsonToTonl(users, "users")
 * // Returns:
 * // users[2]{id:i32,name:str}:
 * //   1, Alice
 * //   2, Bob
 */
export function jsonToTonl(
  data: Record<string, unknown>[],
  name: string = 'data'
): string {
  // Handle empty array
  if (data.length === 0) {
    return `${name}[0]{}:\n`;
  }
  
  // 1. Detect schema from first object
  const schema = detectObjectSchema(data[0]);
  
  // 2. Build header
  const header = buildTonlHeader(name, data.length, schema);
  
  // 3. Build rows
  const rows = data.map(obj => {
    // Get values in same order as schema keys
    const values = Object.keys(schema).map(key => formatValue(obj[key]));
    return '  ' + values.join(', ');
  });
  
  // 4. Combine header + rows
  return `${header}:\n${rows.join('\n')}`;
}