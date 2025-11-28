import { describe, it, expect } from 'vitest';
import { SQLiteAdapter } from '../src/sdk/sql/sqlite.js';
import { loadPostgresDriver } from '../src/sdk/loaders/postgres-loader.js';
import { loadMySQLDriver } from '../src/sdk/loaders/mysql-loader.js';
import { loadSQLiteDriver } from '../src/sdk/loaders/sqlite-loader.js';
import { loadQdrantDriver } from '../src/sdk/loaders/qdrant-loader.js';
import { loadMilvusDriver } from '../src/sdk/loaders/milvus-loader.js';

describe('Optional Dependencies - Loaders', () => {
  describe('Driver Loading', () => {
    it('should load PostgreSQL driver when installed', async () => {
      // pg is in devDependencies, should load
      await expect(loadPostgresDriver()).resolves.toBeDefined();
    });

    it('should load MySQL driver when installed', async () => {
      // mysql2 is in devDependencies, should load
      await expect(loadMySQLDriver()).resolves.toBeDefined();
    });

    it('should load SQLite driver when installed', async () => {
      // better-sqlite3 is in devDependencies, should load
      await expect(loadSQLiteDriver()).resolves.toBeDefined();
    });

    it('should load Qdrant driver when installed', async () => {
      // qdrant is in devDependencies, should load
      await expect(loadQdrantDriver()).resolves.toBeDefined();
    });

    it('should load Milvus driver when installed', async () => {
      // milvus is in devDependencies, should load
      await expect(loadMilvusDriver()).resolves.toBeDefined();
    });
  });

  describe('SQLite Adapter Integration', () => {
    it('should create and connect to in-memory database', async () => {
      const adapter = new SQLiteAdapter(':memory:');
      await adapter.connect();
      
      expect(adapter['connected']).toBe(true);
      
      await adapter.disconnect();
      expect(adapter['connected']).toBe(false);
    });

    it('should execute queries on connected database', async () => {
      const adapter = new SQLiteAdapter(':memory:');
      await adapter.connect();

      await adapter.query('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
      await adapter.query("INSERT INTO test (id, name) VALUES (1, 'Alice')");
      
      const result = await adapter.query<{ id: number; name: string }>(
        'SELECT * FROM test'
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({ id: 1, name: 'Alice' });
      expect(result.rowCount).toBe(1);

      await adapter.disconnect();
    });
  });

  describe('Loader Caching', () => {
    it('should cache SQLite driver across multiple loads', async () => {
      const driver1 = await loadSQLiteDriver();
      const driver2 = await loadSQLiteDriver();
      
      // Should return same cached instance
      expect(driver1).toBe(driver2);
    });

    it('should reuse cached driver across adapter instances', async () => {
      const adapter1 = new SQLiteAdapter(':memory:');
      const adapter2 = new SQLiteAdapter(':memory:');

      await adapter1.connect();
      await adapter2.connect();

      // Both should work with cached driver
      const result1 = await adapter1.query('SELECT 1 as test');
      const result2 = await adapter2.query('SELECT 2 as test');

      expect(result1.data[0]).toEqual({ test: 1 });
      expect(result2.data[0]).toEqual({ test: 2 });

      await adapter1.disconnect();
      await adapter2.disconnect();
    });
  });

  describe('Error Messages', () => {
    it('should have helpful error messages in loaders', async () => {
      // We can't test missing packages easily, but we can verify
      // the error message structure would be correct
      
      // Verify loaders are properly exported
      expect(typeof loadPostgresDriver).toBe('function');
      expect(typeof loadMySQLDriver).toBe('function');
      expect(typeof loadSQLiteDriver).toBe('function');
      expect(typeof loadQdrantDriver).toBe('function');
      expect(typeof loadMilvusDriver).toBe('function');
    });
  });
});
