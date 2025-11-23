/**
 * MCP Tool: calculate_savings
 * Calculate token savings between JSON and TONL formats
 */

import { calculateRealSavings, ModelName } from '../../utils/tokenizer.js';
import { CalculateSavingsInput, ToolResponse } from '../types.js';

export const CALCULATE_SAVINGS_TOOL = {
  name: 'calculate_savings',
  description:
    'Calculate token savings and cost impact when using TONL vs JSON format. Uses real tokenizers for accurate results.',
  inputSchema: {
    type: 'object',
    properties: {
      jsonData: {
        type: 'string',
        description: 'JSON formatted data (as string)',
      },
      tonlData: {
        type: 'string',
        description: 'TONL formatted data (as string)',
      },
      model: {
        type: 'string',
        enum: [
          'gpt-5',
          'gpt-4',
          'gpt-3.5-turbo',
          'claude-4-opus',
          'claude-4-sonnet',
          'claude-sonnet-4.5',
          'gemini-2.5-pro',
          'gemini-2.5-flash',
        ],
        description: 'LLM model to use for token counting',
        default: 'gpt-5',
      },
    },
    required: ['jsonData', 'tonlData'],
  },
};

export async function calculateSavingsHandler(input: CalculateSavingsInput): Promise<
  ToolResponse<{
    originalTokens: number;
    compressedTokens: number;
    savedTokens: number;
    savingsPercent: number;
    model: string;
  }>
> {
  try {
    const { jsonData, tonlData, model } = input;

    // Calculate savings
    const savings = calculateRealSavings(jsonData, tonlData, model as ModelName);

    return {
      success: true,
      data: {
        originalTokens: savings.originalTokens,
        compressedTokens: savings.compressedTokens,
        savedTokens: savings.savedTokens,
        savingsPercent: savings.savingsPercent,
        model,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during calculation',
    };
  }
}
