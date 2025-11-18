/**
 * Token Counter Utility
 * Estimates tokens for given text (used for benchmarking)
 */

/**
 * Naive token estimation based on character count
 * Rule of thumb: ~4 characters ≈ 1 token (for GPT models)
 * 
 * @param text - The text to estimate tokens for
 * @returns Estimated number of tokens
 * 
 * @example
 * estimateTokens("Hello World")  // Returns: 3
 * estimateTokens("A")            // Returns: 1
 */
export function estimateTokens(text: string): number {
  // Remove leading/trailing whitespace
  const cleaned = text.trim();
  
  // Count characters
  const charCount = cleaned.length;
  
  // Average: ~4 characters per token
  // Math.ceil rounds up (e.g., 3.2 → 4)
  const tokenCount = Math.ceil(charCount / 4);
  
  return tokenCount;
}

/**
 * Calculate token savings between original and compressed text
 * 
 * @param original - Original text (e.g., JSON)
 * @param compressed - Compressed text (e.g., TONL)
 * @returns Statistics about token savings
 * 
 * @example
 * const result = calculateSavings(jsonText, tonlText);
 * console.log(`Saved ${result.savingsPercent}% tokens!`);
 */
export function calculateSavings(
  original: string, 
  compressed: string
): {
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  savingsPercent: number;
} {
  // Calculate tokens for both versions
  const originalTokens = estimateTokens(original);
  const compressedTokens = estimateTokens(compressed);
  
  // Calculate savings
  const savedTokens = originalTokens - compressedTokens;
  const savingsPercent = (savedTokens / originalTokens) * 100;
  
  return {
    originalTokens,
    compressedTokens,
    savedTokens,
    // Round to 1 decimal place (e.g., 60.9%)
    savingsPercent: Math.round(savingsPercent * 10) / 10,
  };
}