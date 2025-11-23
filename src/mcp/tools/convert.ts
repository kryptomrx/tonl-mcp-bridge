/**
 * MCP Tool: convert_to_tonl
 * Converts JSON data to TONL format with token statistics
 */

import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import { ConvertToTonlInput, ToolResponse } from '../types.js';

export const CONVERT_TO_TONL_TOOL = {
  name: 'convert_to_tonl',
  description:
    'Convert JSON data to TONL (Token Optimized Natural Language) format. Reduces token usage by 30-60% for LLM context windows.',
  inputSchema: {
    type: 'object',
    properties: {
      data: {
        type: ['array', 'object'],
        description: 'JSON data to convert (array of objects or single object)',
      },
      name: {
        type: 'string',
        description: 'Collection name for the TONL output',
        default: 'data',
      },
      options: {
        type: 'object',
        properties: {
          optimize: {
            type: 'boolean',
            description: 'Enable type optimization (e.g., i8 instead of i32)',
            default: true,
          },
          flattenNested: {
            type: 'boolean',
            description: 'Flatten nested objects into flat structure',
            default: false,
          },
          includeStats: {
            type: 'boolean',
            description: 'Include token savings statistics in response',
            default: true,
          },
        },
        default: {},
      },
    },
    required: ['data'],
  },
};

export async function convertToTonlHandler(
  input: ConvertToTonlInput
): Promise<ToolResponse<{ tonl: string }>> {
  try {
    const { data, name, options } = input;

    const dataArray = Array.isArray(data) ? data : [data];

    const tonl = jsonToTonl(dataArray, name, {
      flattenNested: options?.flattenNested || false,
    });
    // Calculate stats if requested
    let stats;
    if (options?.includeStats) {
      const jsonStr = JSON.stringify(data);
      const savings = calculateRealSavings(jsonStr, tonl, 'gpt-5');
      stats = {
        originalTokens: savings.originalTokens,
        compressedTokens: savings.compressedTokens,
        savedTokens: savings.savedTokens,
        savingsPercent: savings.savingsPercent,
      };
    }

    return {
      success: true,
      data: { tonl },
      stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during conversion',
    };
  }
}
