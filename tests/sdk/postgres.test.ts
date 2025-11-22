import { describe, it, expect } from 'vitest';
import { PostgresAdapter } from '../../src/sdk/sql/postgres';

describe('PostgresAdapter', () => {
  it('should create instance', () => {
    const adapter = new PostgresAdapter({
      host: 'localhost',
      database: 'test',
      user: 'test',
      password: 'test',
    });

    expect(adapter).toBeDefined();
    expect(adapter.isConnected()).toBe(false);
  });

  it('should have query methods', () => {
    const adapter = new PostgresAdapter({
      host: 'localhost',
      database: 'test',
      user: 'test',
      password: 'test',
    });

    expect(adapter.query).toBeDefined();
    expect(adapter.queryToTonl).toBeDefined();
    expect(adapter.queryWithStats).toBeDefined();
  });
});