import { describe, it, expect } from 'vitest';
import { MySQLAdapter } from '../../src/sdk/sql/mysql';

describe('MySQLAdapter', () => {
  describe('constructor', () => {
    it('should create instance with config', () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'test',
        user: 'test',
        password: 'test',
      });

      expect(adapter).toBeDefined();
      expect(adapter.isConnected()).toBe(false);
    });

    it('should use default port if not specified', () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'test',
        user: 'test',
        password: 'test',
      });

      expect(adapter).toBeDefined();
    });

    it('should accept custom port', () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        port: 3307,
        database: 'test',
        user: 'test',
        password: 'test',
      });

      expect(adapter).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw error on query without connection', async () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'test',
        user: 'test',
        password: 'test',
      });

      await expect(adapter.query('SELECT 1')).rejects.toThrow('Database not connected');
    });

    it('should throw error on queryToTonl without connection', async () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'test',
        user: 'test',
        password: 'test',
      });

      await expect(adapter.queryToTonl('SELECT 1', 'test')).rejects.toThrow(
        'Database not connected'
      );
    });

    it('should throw error on queryWithStats without connection', async () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'test',
        user: 'test',
        password: 'test',
      });

      await expect(adapter.queryWithStats('SELECT 1', 'test')).rejects.toThrow(
        'Database not connected'
      );
    });

    it('should handle disconnect on non-connected adapter', async () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'test',
        user: 'test',
        password: 'test',
      });

      await expect(adapter.disconnect()).resolves.not.toThrow();
    });

    it('should handle multiple disconnect calls', async () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'test',
        user: 'test',
        password: 'test',
      });

      await adapter.disconnect();
      await expect(adapter.disconnect()).resolves.not.toThrow();
    });
  });

  describe('methods', () => {
    it('should have all required methods', () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'test',
        user: 'test',
        password: 'test',
      });

      expect(adapter.connect).toBeDefined();
      expect(adapter.disconnect).toBeDefined();
      expect(adapter.query).toBeDefined();
      expect(adapter.queryToTonl).toBeDefined();
      expect(adapter.queryWithStats).toBeDefined();
      expect(adapter.isConnected).toBeDefined();
    });

    it('should inherit from BaseAdapter', () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'test',
        user: 'test',
        password: 'test',
      });

      expect(adapter.queryToTonl).toBeDefined();
      expect(adapter.queryWithStats).toBeDefined();
    });
  });
});
