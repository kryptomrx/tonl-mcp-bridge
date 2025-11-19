import { describe, it, expect } from 'vitest';
import { countTokens, calculateRealSavings } from '../src/utils/tokenizer';

describe('Real Tokenizer', () => {
  
  it('should count tokens for simple text', () => {
    const text = 'Hello World';
    const tokens = countTokens(text, 'gpt-4');
    
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(10);
  });
  
  it('should count tokens for JSON', () => {
    const json = '{"id": 1, "name": "Alice"}';
    const tokens = countTokens(json, 'gpt-4');
    
    expect(tokens).toBeGreaterThan(0);
  });
  
it('should calculate real savings with multiple items', () => {
  // Bei mehreren Items sieht man echte Savings!
  const json = JSON.stringify([
    { id: 1, name: "Alice", age: 25 },
    { id: 2, name: "Bob", age: 30 },
    { id: 3, name: "Charlie", age: 35 }
  ], null, 2);
  
  const tonl = `data[3]{id:i8,name:str,age:i8}:
  1, Alice, 25
  2, Bob, 30
  3, Charlie, 35`;
  
  const savings = calculateRealSavings(json, tonl, 'gpt-4');
  
  // Mit mehreren Items sollte TONL besser sein
  expect(savings.originalTokens).toBeGreaterThan(savings.compressedTokens);
  expect(savings.savedTokens).toBeGreaterThan(0);
  expect(savings.savingsPercent).toBeGreaterThan(0);
  expect(savings.model).toBe('gpt-4');
});

it('should handle single item (might not save)', () => {
  // Bei nur 1 Item kann TONL auch länger sein!
  const json = '{"id": 1, "name": "Alice"}';
  const tonl = 'data[1]{id:i8,name:str}:\n  1, Alice';
  
  const savings = calculateRealSavings(json, tonl, 'gpt-4');
  
  // Wir erwarten einfach nur dass es funktioniert
  expect(typeof savings.originalTokens).toBe('number');
  expect(typeof savings.compressedTokens).toBe('number');
  expect(typeof savings.savingsPercent).toBe('number');
  
  // Savings können auch negativ sein bei single items!
});
  
  it('should handle different models', () => {
    const text = 'Test';
    
    const gpt4Tokens = countTokens(text, 'gpt-4');
    const gpt35Tokens = countTokens(text, 'gpt-3.5-turbo');
    
    expect(gpt4Tokens).toBeGreaterThan(0);
    expect(gpt35Tokens).toBeGreaterThan(0);
  });
  
});