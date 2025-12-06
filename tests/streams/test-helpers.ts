/**
 * Test Helpers for TONL Type Matching
 * 
 * TONL uses optimized types (i8, i16, f32, etc.) instead of generic types.
 * These helpers make tests flexible to accept the actual optimized output.
 */

// Type families that TONL might use
export const INT_TYPES = ['int', 'i8', 'i16', 'i32', 'i64'];
export const FLOAT_TYPES = ['float', 'f32', 'f64'];
export const STRING_TYPES = ['str', 'string'];
export const DATETIME_TYPES = ['str', 'datetime', 'timestamp'];

/**
 * Create regex to match any type from a family
 */
export function matchAnyType(types: string[]): RegExp {
  return new RegExp(types.join('|'));
}

/**
 * Check if output contains a field with any of the given types
 */
export function expectFieldWithType(
  output: string,
  fieldName: string,
  types: string[]
): void {
  const pattern = new RegExp(`${fieldName}:(${types.join('|')})`);
  if (!pattern.test(output)) {
    throw new Error(
      `Expected field '${fieldName}' with types [${types.join(', ')}] but not found in output`
    );
  }
}

/**
 * Flexible matchers for common patterns
 */
export const matchers = {
  /** Matches any integer type (int, i8, i16, i32, i64) */
  anyInt: /:(int|i8|i16|i32|i64)/,
  
  /** Matches any float type (float, f32, f64) */
  anyFloat: /:(float|f32|f64)/,
  
  /** Matches any string-like type (str, datetime) */
  anyString: /:(str|string|datetime|timestamp)/,
  
  /** Matches any boolean */
  anyBool: /:bool/,
  
  /** Matches any null */
  anyNull: /:null/,
};

/**
 * Create a flexible schema matcher
 * 
 * @example
 * expectSchema(output, 'users', {
 *   id: INT_TYPES,
 *   name: STRING_TYPES,
 *   age: INT_TYPES
 * });
 */
export function expectSchema(
  output: string,
  collection: string,
  schema: Record<string, string[]>
): void {
  // Check collection exists
  if (!output.includes(`${collection}[]{`)) {
    throw new Error(`Collection '${collection}' not found in output`);
  }

  // Check each field
  for (const [field, types] of Object.entries(schema)) {
    expectFieldWithType(output, field, types);
  }
}
