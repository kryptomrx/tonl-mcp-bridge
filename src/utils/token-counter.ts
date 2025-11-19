/**
 * Token Counter Utility
 * Estimates tokens for given text
 */

/**
 * Naive token estimation (4 chars ≈ 1 token)
 * Good enough for initial benchmarks
 */
export function estimateTokens(text: string): number {
  // Remove extra whitespace
  const cleaned = text.trim();
  
  // Average: ~4 characters per token
  const charCount = cleaned.length;
  const tokenCount = Math.ceil(charCount / 4);
  
  return tokenCount;
}

/**
 * Calculate token savings between two texts
 */
export function calculateSavings(original: string, compressed: string): {
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  savingsPercent: number;
} {
  const originalTokens = estimateTokens(original);
  const compressedTokens = estimateTokens(compressed);
  const savedTokens = originalTokens - compressedTokens;
  const savingsPercent = (savedTokens / originalTokens) * 100;
  
  return {
    originalTokens,
    compressedTokens,
    savedTokens,
    savingsPercent: Math.round(savingsPercent * 10) / 10, // 1 decimal place
  };
}
// Re-export new tokenizer functions
export { countTokens, calculateRealSavings, type ModelName } from './tokenizer.js';