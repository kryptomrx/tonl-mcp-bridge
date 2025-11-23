/**
 * MCP Tool: parse_tonl
 * Parses TONL format back to JSON
 */

import { tonlToJson } from '../../core/tonl-to-json.js';
import { ParseTonlInput, ToolResponse } from '../types.js';

export const PARSE_TONL_TOOL = {
  name: 'parse_tonl',
  description:
    'Parse TONL (Token Optimized Natural Language) format back to JSON. Supports lossless round-trip conversion.',
  inputSchema: {
    type: 'object',
    properties: {
      tonl: {
        type: 'string',
        description: 'TONL formatted string to parse',
      },
      validateSchema: {
        type: 'boolean',
        description: 'Validate schema consistency during parsing',
        default: false,
      },
    },
    required: ['tonl'],
  },
};

export async function parseTonlHandler(
  input: ParseTonlInput
): Promise<ToolResponse<{ json: unknown }>> {
  try {
    const { tonl } = input;

    // Parse TONL to JSON
    const json = tonlToJson(tonl);

    return {
      success: true,
      data: { json },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during parsing',
    };
  }
}
