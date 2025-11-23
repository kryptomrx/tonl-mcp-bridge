import { describe, it, expect, beforeEach } from 'vitest';
import { BaseAdapter } from '../../src/sdk/adapters/base';
import type { DatabaseConfig, QueryResult } from '../../src/sdk/adapters/types';

class MockAdapter extends BaseAdapter {
  private mockData: unknown[] = [];

  setMockData(data: unknown[]) {
    this.mockData = data;
    this.connected = true;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async query<T = unknown>(sql: string): Promise<QueryResult<T>> {
    this.ensureConnected(); // ← HINZUFÜGEN
    return {
      data: this.mockData as T[],
      rowCount: this.mockData.length,
    };
  }
}
describe('BaseAdapter', () => {
  let adapter: MockAdapter;
  const config: DatabaseConfig = {
    host: 'localhost',
    database: 'test',
    user: 'test',
    password: 'test',
  };

  beforeEach(() => {
    adapter = new MockAdapter(config);
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      expect(adapter.isConnected()).toBe(false);
    });

    it('should return true after connect', async () => {
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });

    it('should return false after disconnect', async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('queryToTonl', () => {
    it('should convert query results to TONL', async () => {
      const mockData = [
        { id: 1, name: 'Alice', age: 25 },
        { id: 2, name: 'Bob', age: 30 },
      ];
      adapter.setMockData(mockData);

      const result = await adapter.queryToTonl('SELECT * FROM users', 'users');

      expect(result.tonl).toContain('users[2]');
      expect(result.tonl).toContain('id:i8');
      expect(result.tonl).toContain('name:str');
      expect(result.tonl).toContain('age:i8');
      expect(result.data).toEqual(mockData);
      expect(result.rowCount).toBe(2);
    });

    it('should use default collection name', async () => {
      const mockData = [{ id: 1 }];
      adapter.setMockData(mockData);

      const result = await adapter.queryToTonl('SELECT * FROM test');

      expect(result.tonl).toContain('data[1]');
    });

    it('should handle empty results', async () => {
      adapter.setMockData([]);

      const result = await adapter.queryToTonl('SELECT * FROM empty', 'empty');

      expect(result.data).toEqual([]);
      expect(result.rowCount).toBe(0);
      expect(result.tonl).toContain('empty[0]');
    });
  });

  describe('queryWithStats', () => {
    it('should return token statistics', async () => {
      const mockData = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      adapter.setMockData(mockData);

      const result = await adapter.queryWithStats('SELECT * FROM users', 'users');

      expect(result.stats).toBeDefined();
      expect(result.stats.originalTokens).toBeGreaterThan(0);
      expect(result.stats.compressedTokens).toBeGreaterThan(0);
      expect(result.stats.savedTokens).toBeDefined();
      expect(result.stats.savingsPercent).toBeDefined();
    });

    it('should use specified model', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      adapter.setMockData(mockData);

      const result = await adapter.queryWithStats('SELECT * FROM test', 'test', {
        model: 'claude-4-sonnet',
      });

      expect(result.stats).toBeDefined();
    });

    it('should default to gpt-5 model', async () => {
      const mockData = [{ id: 1 }];
      adapter.setMockData(mockData);

      const result = await adapter.queryWithStats('SELECT * FROM test', 'test');

      expect(result.stats).toBeDefined();
    });
  });

  describe('ensureConnected', () => {
    it('should throw error when not connected', async () => {
      await expect(adapter.queryToTonl('SELECT * FROM test')).rejects.toThrow(
        'Database not connected'
      );
    });

    it('should not throw when connected', async () => {
      await adapter.connect();
      adapter.setMockData([{ id: 1 }]);

      await expect(adapter.queryToTonl('SELECT * FROM test')).resolves.toBeDefined();
    });
  });
});
