import type { Pool, PoolConfig } from 'pg';

let pgModule: typeof import('pg') | null = null;

export async function loadPostgresDriver(): Promise<typeof import('pg')> {
  if (pgModule) return pgModule;

  try {
    pgModule = await import('pg');
    return pgModule;
  } catch {
    throw new Error('PostgreSQL driver not found. Install: npm install pg');
  }
}

export async function createPostgresPool(config: PoolConfig): Promise<Pool> {
  const pg = await loadPostgresDriver();
  return new pg.Pool(config);
}