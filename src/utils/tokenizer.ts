/**
 * Real Tokenizer Integration
 * Uses js-tiktoken for accurate token counting
 */

import { encodingForModel } from 'js-tiktoken';

/**
 * Supported models for token counting
 * Updated for 2025 models
 */
export type ModelName = 
  // OpenAI (2025)
  | 'gpt-5'
  | 'gpt-5.1'
  | 'gpt-5-thinking'
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  // Anthropic (2025)
  | 'claude-4-opus'
  | 'claude-4-sonnet'
  | 'claude-sonnet-4.5'
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  // Google (2025)
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-pro'
  // Other Models
  | 'grok-3'
  | 'deepseek-r1'
  | 'llama-4';

/**
 * Count tokens using real tokenizer
 */
/**
 * Count tokens using real tokenizer
 */
export function countTokens(text: string, model: ModelName = 'gpt-5'): number {
  try {
    // Map newer models to compatible tokenizer
    let encodingModel = model;
    
    // Claude models use GPT-4 tokenizer as approximation
    if (model.startsWith('claude')) {
      encodingModel = 'gpt-4';
    }
    
    // Gemini models use GPT-4 tokenizer as approximation
    if (model.startsWith('gemini')) {
      encodingModel = 'gpt-4';
    }
    
    // Grok/DeepSeek/Llama use GPT-4 tokenizer as approximation
    if (model.startsWith('grok') || model.startsWith('deepseek') || model.startsWith('llama')) {
      encodingModel = 'gpt-4';
    }
    
    // GPT-5 uses GPT-4 tokenizer (same family)
    if (model.startsWith('gpt-5')) {
      encodingModel = 'gpt-4';
    }
    
    const enc = encodingForModel(encodingModel as any);
    const tokens = enc.encode(text);
    
    return tokens.length;
  } catch (error) {
    console.warn('Tokenizer failed, using naive estimation:', error);
    return Math.ceil(text.length / 4);
  }
}

/**
 * Calculate savings with real tokenizer
 */
/**
 * Calculate savings with real tokenizer
 */
export function calculateRealSavings(
  original: string,
  compressed: string,
  model: ModelName = 'gpt-5'  // ← Changed from 'gpt-4'
): {
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  savingsPercent: number;
  model: string;
} {
  // ... rest bleibt gleich{
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