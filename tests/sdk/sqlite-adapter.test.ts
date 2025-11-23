import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteAdapter } from '../../src/sdk/sql/sqlite';
import { unlink } from 'fs/promises';

describe('SQLiteAdapter', () => {
  const testDbFile = './test-sqlite.db';
  let adapter: SQLiteAdapter;

  afterEach(async () => {
    if (adapter?.isConnected()) {
      await adapter.disconnect();
    }
    try {
      await unlink(testDbFile);
    } catch {
      // File might not exist
    }
  });

  describe('constructor', () => {
    it('should create instance with string config', () => {
      adapter = new SQLiteAdapter(':memory:');
      expect(adapter).toBeDefined();
      expect(adapter.isConnected()).toBe(false);
    });

    it('should create instance with object config', () => {
      adapter = new SQLiteAdapter({
        filename: ':memory:',
        readonly: false,
      });
      expect(adapter).toBeDefined();
    });
  });

  describe('in-memory database', () => {
    beforeEach(async () => {
      adapter = new SQLiteAdapter(':memory:');
      await adapter.connect();
    });

    it('should connect to in-memory database', async () => {
      expect(adapter.isConnected()).toBe(true);
    });

    it('should create table and insert data', async () => {
      await adapter.query(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name TEXT,
          age INTEGER
        )
      `);

      await adapter.query(`
        INSERT INTO users (name, age) VALUES 
        ('Alice', 25),
        ('Bob', 30)
      `);

      const result = await adapter.query('SELECT * FROM users');

      expect(result.rowCount).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('should use queryToTonl', async () => {
      await adapter.query(`
        CREATE TABLE products (id INTEGER, name TEXT, price REAL)
      `);
      await adapter.query(`
        INSERT INTO products VALUES (1, 'Laptop', 999.99)
      `);

      const result = await adapter.queryToTonl('SELECT * FROM products', 'products');

      expect(result.tonl).toContain('products[1]');
      expect(result.data).toHaveLength(1);
      expect(result.rowCount).toBe(1);
    });

    it('should use queryWithStats', async () => {
      await adapter.query(`CREATE TABLE test (id INTEGER, value TEXT)`);
      await adapter.query(`INSERT INTO test VALUES (1, 'test')`);

      const result = await adapter.queryWithStats('SELECT * FROM test', 'test');

      expect(result.stats).toBeDefined();
      expect(result.stats.originalTokens).toBeGreaterThan(0);
      expect(result.stats.compressedTokens).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should throw error on query without connection', async () => {
      adapter = new SQLiteAdapter(':memory:');

      await expect(adapter.query('SELECT 1')).rejects.toThrow('Database not connected');
    });

    it('should throw error on invalid SQL', async () => {
      adapter = new SQLiteAdapter(':memory:');
      await adapter.connect();

      await expect(adapter.query('INVALID SQL')).rejects.toThrow();
    });

    it('should handle disconnect on non-connected adapter', async () => {
      adapter = new SQLiteAdapter(':memory:');
      await expect(adapter.disconnect()).resolves.not.toThrow();
    });
  });

  describe('methods', () => {
    it('should have all required methods', () => {
      adapter = new SQLiteAdapter(':memory:');

      expect(adapter.connect).toBeDefined();
      expect(adapter.disconnect).toBeDefined();
      expect(adapter.query).toBeDefined();
      expect(adapter.queryToTonl).toBeDefined();
      expect(adapter.queryWithStats).toBeDefined();
      expect(adapter.isConnected).toBeDefined();
    });
  });
});
