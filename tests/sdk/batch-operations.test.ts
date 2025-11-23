import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SQLiteAdapter } from '../../src/sdk/sql/sqlite.js';

describe('Batch Operations', () => {
  let adapter: SQLiteAdapter;

  beforeAll(async () => {
    adapter = new SQLiteAdapter(':memory:');
    await adapter.connect();

    // Setup test data
    await adapter.query('CREATE TABLE users (id INTEGER, name TEXT, age INTEGER)');
    await adapter.query('CREATE TABLE products (id INTEGER, name TEXT, price REAL)');
    await adapter.query(`
      INSERT INTO users VALUES 
        (1, 'Alice', 25), (2, 'Bob', 30), (3, 'Charlie', 35)
    `);
    await adapter.query(`
      INSERT INTO products VALUES 
        (1, 'Laptop', 999.99), (2, 'Mouse', 29.99)
    `);
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it('should execute batch queries', async () => {
    const results = await adapter.batchQuery([
      { sql: 'SELECT * FROM users', name: 'users' },
      { sql: 'SELECT * FROM products', name: 'products' },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].rowCount).toBe(3);
    expect(results[1].rowCount).toBe(2);
  });

  it('should convert batch to TONL', async () => {
    const results = await adapter.batchQueryToTonl([
      { sql: 'SELECT * FROM users', name: 'users' },
      { sql: 'SELECT * FROM products', name: 'products' },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].tonl).toContain('users');
    expect(results[1].tonl).toContain('products');
  });

it('should provide batch stats', async () => {
  const result = await adapter.batchQueryWithStats(
    [
      { sql: 'SELECT * FROM users', name: 'users' },
      { sql: 'SELECT * FROM products', name: 'products' },
    ],
    { model: 'gpt-5' }
  );

  expect(result.results).toHaveLength(2);
  expect(result.aggregate.totalQueries).toBe(2);
  expect(result.aggregate.totalRows).toBe(5);
  expect(typeof result.aggregate.savedTokens).toBe('number');
  expect(typeof result.aggregate.savingsPercent).toBe('number');
});

  it('should calculate correct aggregate stats', async () => {
    const result = await adapter.batchQueryWithStats(
      [
        { sql: 'SELECT * FROM users', name: 'users' },
        { sql: 'SELECT * FROM products', name: 'products' },
      ],
      { model: 'gpt-5' }
    );

    const manualTotal =
      result.results[0].stats!.originalTokens + result.results[1].stats!.originalTokens;

    expect(result.aggregate.totalOriginalTokens).toBe(manualTotal);
  });

  it('should handle empty results', async () => {
    await adapter.query('CREATE TABLE empty (id INTEGER)');

    const result = await adapter.batchQueryWithStats(
      [{ sql: 'SELECT * FROM empty', name: 'empty' }],
      { model: 'gpt-5' }
    );

    expect(result.results).toHaveLength(1);
    expect(result.aggregate.totalRows).toBe(0);
  });
});