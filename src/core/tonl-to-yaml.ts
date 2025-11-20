/**
 * TONL to YAML Converter
 * Converts TONL format to YAML via JSON
 */

import yaml from 'js-yaml';
import { tonlToJson } from './tonl-to-json.js';

/**
 * Convert TONL string to YAML format
 *
 * @param tonlString - TONL formatted string
 * @returns YAML formatted string
 *
 * @example
 * const tonl = `users[2]{id:i32,name:str}:
 *   1, Alice
 *   2, Bob`;
 *
 * tonlToYaml(tonl)
 * // Returns:
 * // - id: 1
 * //   name: Alice
 * // - id: 2
 * //   name: Bob
 */
export function tonlToYaml(tonlString: string): string {
  // Parse TONL to JSON
  const jsonData = tonlToJson(tonlString);

  // Convert JSON to YAML
  return yaml.dump(jsonData, {
    indent: 2,
    lineWidth: -1, // No line wrapping
    noRefs: true, // Don't use anchors/aliases
  });
}
