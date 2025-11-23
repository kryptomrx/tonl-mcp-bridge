import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SQLiteAdapter } from '../../src/sdk/sql/sqlite.js';

describe('Query Analyzer', () => {
  let adapter: SQLiteAdapter;

  beforeAll(async () => {
    adapter = new SQLiteAdapter(':memory:');
    await adapter.connect();

    await adapter.query('CREATE TABLE users (id INTEGER, name TEXT, age INTEGER)');
    await adapter.query(`
      INSERT INTO users VALUES 
        (1, 'Alice', 25), (2, 'Bob', 30), (3, 'Charlie', 35),
        (4, 'Diana', 28), (5, 'Eve', 32), (6, 'Frank', 45),
        (7, 'Grace', 29), (8, 'Henry', 38), (9, 'Iris', 27),
        (10, 'Jack', 41)
    `);
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

it('should analyze query with good savings', async () => {
  const analysis = await adapter.analyzeQuery('SELECT * FROM users', 'users', {
    model: 'gpt-5',
  });

  expect(analysis.estimatedRows).toBe(10);
  expect(analysis.estimatedJsonTokens).toBeGreaterThan(0);
  expect(analysis.estimatedTonlTokens).toBeGreaterThan(0);
  expect(analysis.estimatedTonlTokens).toBeLessThan(analysis.estimatedJsonTokens);
  expect(analysis.potentialSavings).toBeGreaterThan(0);
  expect(['use-tonl', 'marginal']).toContain(analysis.recommendation);
});

  it('should handle empty results', async () => {
    await adapter.query('CREATE TABLE empty (id INTEGER)');
    
    const analysis = await adapter.analyzeQuery('SELECT * FROM empty', 'empty');

    expect(analysis.estimatedRows).toBe(0);
    expect(analysis.estimatedJsonTokens).toBe(0);
    expect(analysis.estimatedTonlTokens).toBe(0);
    expect(analysis.recommendation).toBe('use-json');
  });

  it('should provide cost impact', async () => {
    const analysis = await adapter.analyzeQuery('SELECT * FROM users', 'users');

    expect(analysis.costImpact).toMatch(/^\$\d+\.\d{6}$/);
    expect(parseFloat(analysis.costImpact.slice(1))).toBeGreaterThan(0);
  });

  it('should work with different models', async () => {
    const analysisGpt = await adapter.analyzeQuery('SELECT * FROM users', 'users', {
      model: 'gpt-5',
    });
    const analysisClaude = await adapter.analyzeQuery('SELECT * FROM users', 'users', {
      model: 'claude-4-opus',
    });

    expect(analysisGpt.estimatedRows).toBe(analysisClaude.estimatedRows);
  });

  it('should recommend json for small datasets', async () => {
    await adapter.query('CREATE TABLE tiny (id INTEGER)');
    await adapter.query('INSERT INTO tiny VALUES (1)');

    const analysis = await adapter.analyzeQuery('SELECT * FROM tiny', 'tiny');

    expect(analysis.recommendation).toMatch(/use-json|marginal/);
  });
});