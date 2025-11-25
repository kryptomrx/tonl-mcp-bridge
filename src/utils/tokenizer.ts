// FIX: Use static import instead of require for ESM compatibility
import { TikTokenAdapter } from '../core/tokenizer/tiktoken-adapter.js';
import { tokenManager } from '../core/tokenizer/manager.js';

export type ModelName =
  // OpenAI
  | 'gpt-5'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  // Anthropic - Variations to satisfy compiler and user inputs
  | 'claude-3-opus'
  | 'claude-opus-4'
  | 'claude-4-opus'
  | 'claude-opus-4.1'
  | 'claude-opus-4.5'
  | 'claude-sonnet-3.5'
  | 'claude-3.5-sonnet'
  | 'claude-sonnet-4.5'
  | 'claude-4-sonnet'
  // Google
  | 'gemini-3-pro-preview'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash';

/**
 * @deprecated Use tokenManager directly for new implementations
 */
export function countTokens(text: string, model: ModelName = 'gpt-5'): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate savings between original and compressed text
 */
export function calculateRealSavings(
  original: string,
  compressed: string,
  model: ModelName = 'gpt-5'
): {
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  savingsPercent: number;
  model: string;
} {
  const adapter = new TikTokenAdapter();

  const originalResult = adapter.count(original, model);
  const compressedResult = adapter.count(compressed, model);

  const originalTokens = originalResult.count;
  const compressedTokens = compressedResult.count;
  const savedTokens = originalTokens - compressedTokens;

  const savingsPercent =
    originalTokens > 0 ? (savedTokens / originalTokens) * 100 : 0;

  return {
    originalTokens,
    compressedTokens,
    savedTokens,
    savingsPercent: Math.round(savingsPercent * 10) / 10,
    model,
  };
}