import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { streamJsonToTonl } from '../src/core/streaming';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Streaming', () => {
  const testInput = join(__dirname, 'test-stream-input.json');
  const testOutput = join(__dirname, 'test-stream-output.tonl');

  beforeEach(() => {
    // Create test file
    const data = [
      { id: 1, name: 'Alice', age: 25 },
      { id: 2, name: 'Bob', age: 30 },
      { id: 3, name: 'Charlie', age: 35 },
    ];
    writeFileSync(testInput, JSON.stringify(data, null, 2));
  });

  afterEach(() => {
    // Cleanup
    try {
      unlinkSync(testInput);
      unlinkSync(testOutput);
    } catch {}
  });

  it('should stream JSON to TONL', async () => {
    await streamJsonToTonl(testInput, testOutput, 'users');

    const result = readFileSync(testOutput, 'utf-8');
    
    expect(result).toContain('users[3]');
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
    expect(result).toContain('Charlie');
  });

  it('should handle custom collection name', async () => {
    await streamJsonToTonl(testInput, testOutput, 'people');

    const result = readFileSync(testOutput, 'utf-8');
    expect(result).toContain('people[3]');
  });
});