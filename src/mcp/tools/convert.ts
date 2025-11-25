import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import { ConvertToTonlInput, ToolResponse } from '../types.js';

export const CONVERT_TO_TONL_TOOL = {
  name: 'convert_to_tonl',
  description:
    'Convert JSON data to TONL format. Supports nesting, optimization, and automatic data anonymization.',
  inputSchema: {
    type: 'object',
    properties: {
      data: {
        type: ['array', 'object'],
        description: 'JSON data to convert',
      },
      name: {
        type: 'string',
        description: 'Collection name',
        default: 'data',
      },
      options: {
        type: 'object',
        properties: {
          optimize: { type: 'boolean' },
          flattenNested: { type: 'boolean' },
          includeStats: { type: 'boolean' },
          // NEU: Dokumentation für das Feature
          anonymize: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of keys to redact (e.g. ["email", "password"])'
          }
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
      // NEU: Durchreichen der Option
      anonymize: options?.anonymize, 
    });

    // Calculate stats if requested
    let stats;
    if (options?.includeStats) {
      const jsonStr = JSON.stringify(data);
      // Wir nutzen standardmäßig gpt-5 für die Stats, wenn nichts anderes da ist
      // In einem echten Setup könnte man das Modell auch durchreichen
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