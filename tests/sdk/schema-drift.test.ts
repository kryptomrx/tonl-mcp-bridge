import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SQLiteAdapter } from '../../src/sdk/sql/sqlite.js';
import fs from 'fs/promises';

describe('Schema Drift Monitoring', () => {
  let adapter: SQLiteAdapter;
  const schemaDir = '.tonl-schemas';

  beforeAll(async () => {
    adapter = new SQLiteAdapter(':memory:');
    await adapter.connect();
  });

  afterAll(async () => {
    await adapter.disconnect();
    // Cleanup schema files
    try {
      await fs.rm(schemaDir, { recursive: true });
    } catch (e) {
      // Directory might not exist
    }
  });

  beforeEach(async () => {
    // Create fresh table for each test
    try {
      await adapter.query('DROP TABLE IF EXISTS test_table');
    } catch (e) {
      // Table might not exist
    }
    
    await adapter.query(`
      CREATE TABLE test_table (
        id INTEGER,
        name TEXT,
        age INTEGER
      )
    `);
    
    await adapter.query(`
      INSERT INTO test_table VALUES 
        (1, 'Alice', 25),
        (2, 'Bob', 30),
        (3, 'Charlie', 35)
    `);
  });

  it('should track schema baseline', async () => {
    await adapter.trackSchema('test_table');
    
    const drift = await adapter.detectSchemaDrift('test_table');
    expect(drift.hasChanged).toBe(false);
  });

  it('should detect new columns', async () => {
    await adapter.trackSchema('test_table');
    
    // Add column
    await adapter.query('ALTER TABLE test_table ADD COLUMN email TEXT');
    
    const drift = await adapter.detectSchemaDrift('test_table');
    expect(drift.hasChanged).toBe(true);
    expect(drift.newColumns).toContain('email');
    expect(drift.removedColumns).toHaveLength(0);
  });

  it('should detect removed columns', async () => {
    await adapter.trackSchema('test_table');
    
    // Recreate table without 'age' column (SQLite doesn't support DROP COLUMN)
    await adapter.query('DROP TABLE test_table');
    await adapter.query('CREATE TABLE test_table (id INTEGER, name TEXT)');
    await adapter.query("INSERT INTO test_table VALUES (1, 'Alice')");
    
    const drift = await adapter.detectSchemaDrift('test_table');
    expect(drift.hasChanged).toBe(true);
    expect(drift.removedColumns).toContain('age');
  });

  it('should provide recommendations', async () => {
    await adapter.trackSchema('test_table');
    
    const drift = await adapter.detectSchemaDrift('test_table');
    expect(drift.recommendation).toBe('Schema unchanged');
    
    // Add column
    await adapter.query('ALTER TABLE test_table ADD COLUMN status TEXT');
    const driftAfter = await adapter.detectSchemaDrift('test_table');
    expect(driftAfter.recommendation).toContain('Schema change');
  });

  it('should update baseline', async () => {
    await adapter.trackSchema('test_table');
    await adapter.query('ALTER TABLE test_table ADD COLUMN status TEXT');
    
    let drift = await adapter.detectSchemaDrift('test_table');
    expect(drift.hasChanged).toBe(true);
    
    await adapter.updateSchemaBaseline('test_table');
    
    drift = await adapter.detectSchemaDrift('test_table');
    expect(drift.hasChanged).toBe(false);
  });

  it('should throw if no baseline exists', async () => {
    await expect(
      adapter.detectSchemaDrift('nonexistent_table')
    ).rejects.toThrow('No baseline found');
  });

  it('should track row count changes', async () => {
    await adapter.trackSchema('test_table');
    
    await adapter.query("INSERT INTO test_table VALUES (4, 'Diana', 28)");
    
    const drift = await adapter.detectSchemaDrift('test_table');
    expect(drift.rowCountChange).toBeGreaterThan(0);
  });
});