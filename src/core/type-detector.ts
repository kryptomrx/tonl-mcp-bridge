/**
 * Type Detector
 * Detects the type of a JavaScript value
 */

/**
 * Type names we support
 */
export type TypeName = 
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "array"
  | "object";

/**
 * Detect the type of a value
 * 
 * @param value - Any JavaScript value
 * @returns The type name as string
 */
export function detectType(value: unknown): TypeName {
  // 1. Check null first (wegen typeof bug)
  if (value === null) {
    return "null";
  }
  
  // 2. Check array (before object!)
  if (Array.isArray(value)) {
    return "array";
  }
  
  // 3. Use typeof for rest
  const type = typeof value;
  
  if (type === "string") {
    return "string";
  }

  if (type === "number") {
    return "number";
  }

  if (type === "boolean") {
    return "boolean";
  }

  if (type === "object") {
    return "object";
  }
  
  // Fallback (should never reach here)
  return "object";
}

/**
 * Schema for an object (maps property names to types)
 */
export type ObjectSchema = Record<string, TypeName>;

/**
 * Detect the schema of an object
 * 
 * @param obj - The object to analyze
 * @returns Schema mapping property names to types
 * 
 * @example
 * detectObjectSchema({ id: 1, name: "Alice" })
 * // Returns: { id: "number", name: "string" }
 */
export function detectObjectSchema(obj: Record<string, unknown>): ObjectSchema {
  const schema: ObjectSchema = {};
  
  // Loop through all properties
  for (const key in obj) {
    const value = obj[key];
    
    // Detect type of value using our detectType function
    const valueType = detectType(value);
    
    // Save in schema object
    schema[key] = valueType;
  }
  
  return schema;
}