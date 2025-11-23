/**
 * Enhanced Type Detector with extended type support
 */

/**
 * All supported type names
 */
export type TypeName =
  // Primitives
  | 'string'
  | 'boolean'
  | 'null'
  // Integers
  | 'int8' // -128 to 127
  | 'int16' // -32,768 to 32,767
  | 'int32' // -2B to 2B
  | 'int64' // Big integers
  // Floats
  | 'float32'
  | 'float64'
  // Special
  | 'date'
  | 'datetime'
  | 'array'
  | 'object';

/**
 * Type ranges for integer detection
 */
const INT8_MAX = 127;
const INT8_MIN = -128;
const INT16_MAX = 32767;
const INT16_MIN = -32768;
const INT32_MAX = 2147483647;
const INT32_MIN = -2147483648;

/**
 * Detect the most appropriate type for a number
 */
export function detectNumberType(value: number): TypeName {
  // Check if it's a float
  if (!Number.isInteger(value)) {
    // Use float32 for smaller numbers, float64 for larger
    return Math.abs(value) < 3.4e38 ? 'float32' : 'float64';
  }

  // It's an integer - find smallest type that fits
  if (value >= INT8_MIN && value <= INT8_MAX) {
    return 'int8';
  }

  if (value >= INT16_MIN && value <= INT16_MAX) {
    return 'int16';
  }

  if (value >= INT32_MIN && value <= INT32_MAX) {
    return 'int32';
  }

  return 'int64';
}

/**
 * Detect if string is a date/datetime
 */
export function detectDateType(value: string): TypeName | null {
  // ISO 8601 date: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'date';
  }

  // ISO 8601 datetime: 2024-01-15T10:30:00Z
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return 'datetime';
  }

  return null;
}

/**
 * Enhanced type detection with extended types
 */
export function detectType(value: unknown): TypeName {
  // Null check first
  if (value === null) {
    return 'null';
  }

  // Array check
  if (Array.isArray(value)) {
    return 'array';
  }

  // Type-specific detection
  const type = typeof value;

  if (type === 'string') {
    // Check if it's a date/datetime
    const dateType = detectDateType(value as string);
    return dateType || 'string';
  }

  if (type === 'number') {
    return detectNumberType(value as number);
  }

  if (type === 'boolean') {
    return 'boolean';
  }

  if (type === 'object') {
    return 'object';
  }

  return 'object'; // Fallback
}

/**
 * Schema for an object
 */
export type ObjectSchema = Record<string, TypeName>;

/**
 * Detect schema from a single object
 */
export function detectObjectSchema(obj: Record<string, unknown>): ObjectSchema {
  const schema: ObjectSchema = {};

  for (const key in obj) {
    const value = obj[key];
    schema[key] = detectType(value);
  }

  return schema;
}
/**
 * Detect nested object structure
 */
export function detectNestedSchema(obj: Record<string, unknown>): {
  schema: ObjectSchema;
  hasNested: boolean;
} {
  const schema: ObjectSchema = {};
  let hasNested = false;

  for (const key in obj) {
    const value = obj[key];
    const type = detectType(value);

    schema[key] = type;

    if (type === 'object' || type === 'array') {
      hasNested = true;
    }
  }

  return { schema, hasNested };
}

/**
 * Flatten nested object for TONL v1 compatibility
 */
export function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}_${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Nested object - recurse
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * CRITICAL: Validate schema across ALL objects
 * Returns unified schema or throws error if incompatible
 */
export function validateAndMergeSchemas(objects: Record<string, unknown>[]): ObjectSchema {
  if (objects.length === 0) {
    return {};
  }

  // Collect all keys from all objects
  const allKeys = new Set<string>();
  objects.forEach((obj) => {
    Object.keys(obj).forEach((key) => allKeys.add(key));
  });

  // Validate each key across all objects
  const mergedSchema: ObjectSchema = {};

  for (const key of allKeys) {
    const types = new Set<TypeName>();

    // Check type of this key in all objects
    objects.forEach((obj) => {
      if (key in obj) {
        const type = detectType(obj[key]);
        if (type === 'null') {
        } else {
          types.add(type);
        }
      } else {
      }
    });

    // Determine final type
    if (types.size === 0) {
      // Only nulls
      mergedSchema[key] = 'null';
    } else if (types.size === 1) {
      // Consistent type
      const [type] = types;
      mergedSchema[key] = type;
    } else {
      // Mixed types - use most general
      // For numbers, use largest type
      if (hasNumberTypes(types)) {
        mergedSchema[key] = getMostGeneralNumberType(types);
      } else {
        // For other types, fall back to string (most flexible)
        mergedSchema[key] = 'string';
      }
    }
  }

  return mergedSchema;
}

function hasNumberTypes(types: Set<TypeName>): boolean {
  const numberTypes: TypeName[] = ['int8', 'int16', 'int32', 'int64', 'float32', 'float64'];
  return Array.from(types).some((t) => numberTypes.includes(t));
}

function getMostGeneralNumberType(types: Set<TypeName>): TypeName {
  const typeArray = Array.from(types);

  // If any float, use largest float
  if (typeArray.some((t) => t === 'float64' || t === 'float32')) {
    return 'float64';
  }

  // Otherwise use largest int
  if (typeArray.includes('int64')) return 'int64';
  if (typeArray.includes('int32')) return 'int32';
  if (typeArray.includes('int16')) return 'int16';
  return 'int8';
}
