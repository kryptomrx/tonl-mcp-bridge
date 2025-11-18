/**
 * YAML to TONL Converter
 * Converts YAML format to TONL via JSON
 */

import yaml from 'js-yaml';
import { jsonToTonl } from './json-to-tonl.js';

/**
 * Convert YAML string to TONL format
 * 
 * @param yamlString - YAML formatted string
 * @param name - Collection name (default: "data")
 * @returns TONL formatted string
 * 
 * @example
 * const yamlStr = `
 * - id: 1
 *   name: Alice
 * - id: 2
 *   name: Bob
 * `;
 * 
 * yamlToTonl(yamlStr, "users")
 * // Returns: users[2]{id:i32,name:str}:
 * //   1, Alice
 * //   2, Bob
 */
export function yamlToTonl(yamlString: string, name: string = 'data'): string {
  // Parse YAML to JSON
  const jsonData = yaml.load(yamlString);
  
  // Validate it's an array
  if (!Array.isArray(jsonData)) {
    throw new Error('YAML must contain an array of objects');
  }
  
  // Convert JSON to TONL (reuse existing function!)
  return jsonToTonl(jsonData, name);
}