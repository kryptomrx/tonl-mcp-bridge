import { describe, it, expect } from 'vitest';
import { estimateTokens, calculateSavings } from '../src/utils/token-counter';

describe('Token Counter', () => {
  it('should estimate tokens correctly', () => {
    const text = 'Hello World';
    const tokens = estimateTokens(text);
    expect(tokens).toBe(3);
  });

  it('should calculate savings', () => {
    const original = 'This is a very long JSON string with lots of structure';
    const compressed = 'Short TONL';
    const result = calculateSavings(original, compressed);

    expect(result.originalTokens).toBeGreaterThan(result.compressedTokens);
    expect(result.savedTokens).toBeGreaterThan(0);
    expect(result.savingsPercent).toBeGreaterThan(0);
  });
});
