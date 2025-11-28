import type mysql from 'mysql2/promise';

let mysqlModule: typeof import('mysql2/promise') | null = null;

export async function loadMySQLDriver(): Promise<typeof import('mysql2/promise')> {
  if (mysqlModule) return mysqlModule;

  try {
    mysqlModule = await import('mysql2/promise');
    return mysqlModule;
  } catch {
    throw new Error('MySQL driver not found. Install: npm install mysql2');
  }
}

export async function createMySQLPool(config: mysql.PoolOptions): Promise<mysql.Pool> {
  const mysql = await loadMySQLDriver();
  return mysql.createPool(config);
}