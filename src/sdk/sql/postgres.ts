import { Pool } from 'pg';
import { BaseAdapter } from '../adapters/base.js';
import { DatabaseConfig, QueryResult, DatabaseError } from '../adapters/types.js';

export class PostgresAdapter extends BaseAdapter {
  private pool: Pool | null = null;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
      });

      await this.pool.query('SELECT 1');
      this.connected = true;
    } catch (error) {
      throw new DatabaseError(
        'Failed to connect to PostgreSQL',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this.pool) {
      return;
    }

    try {
      await this.pool.end();
      this.connected = false;
      this.pool = null;
    } catch (error) {
      throw new DatabaseError(
        'Failed to disconnect from PostgreSQL',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async query<T = unknown>(sql: string): Promise<QueryResult<T>> {
    this.ensureConnected();

    if (!this.pool) {
      throw new DatabaseError('Pool not initialized');
    }

    try {
      const result = await this.pool.query(sql);
      return {
        data: result.rows as T[],
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      throw new DatabaseError(
        'Query execution failed',
        sql,
        error instanceof Error ? error : undefined
      );
    }
  }
}