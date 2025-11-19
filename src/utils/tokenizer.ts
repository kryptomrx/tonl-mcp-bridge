/**
 * Real Tokenizer Integration
 * Uses js-tiktoken for accurate token counting
 */

import { encodingForModel } from 'js-tiktoken';

/**
 * Supported models for token counting
 */
export type ModelName = 
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'claude-3-opus'
  | 'claude-3-sonnet';

/**
 * Count tokens using real tokenizer
 */
/**
 * Count tokens using real tokenizer
 */
export function countTokens(text: string, model: ModelName = 'gpt-4'): number {
  try {
    const encodingModel = model.startsWith('claude') ? 'gpt-4' : model;
    
    const enc = encodingForModel(encodingModel as any);
    const tokens = enc.encode(text);
    
    // ✅ GEÄNDERT: Kein .free() mehr nötig (automatische garbage collection)
    return tokens.length;
  } catch (error) {
    console.warn('Tokenizer failed, using naive estimation:', error);
    return Math.ceil(text.length / 4);
  }
}

/**
 * Calculate savings with real tokenizer
 */
export function calculateRealSavings(
  original: string,
  compressed: string,
  model: ModelName = 'gpt-4'
): {
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  savingsPercent: number;
  model: string;
} {
  const originalTokens = countTokens(original, model);
  const compressedTokens = countTokens(compressed, model);
  const savedTokens = originalTokens - compressedTokens;
  const savingsPercent = (savedTokens / originalTokens) * 100;
  
  return {
    originalTokens,
    compressedTokens,
    savedTokens,
    savingsPercent: Math.round(savingsPercent * 10) / 10,
    model
  };
}