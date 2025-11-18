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