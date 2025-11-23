import mysql from 'mysql2/promise';
import { BaseAdapter } from '../adapters/base.js';
import { DatabaseConfig, QueryResult, DatabaseError } from '../adapters/types.js';

export class MySQLAdapter extends BaseAdapter {
  private pool: mysql.Pool | null = null;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port || 3306,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        waitForConnections: true,
        connectionLimit: 10,
      });

      await this.pool.query('SELECT 1');
      this.connected = true;
    } catch (error) {
      throw new DatabaseError(
        'Failed to connect to MySQL',
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
        'Failed to disconnect from MySQL',
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
      const [rows] = await this.pool.query(sql);

      if (Array.isArray(rows)) {
        return {
          data: rows as T[],
          rowCount: rows.length,
        };
      }

      return {
        data: [] as T[],
        rowCount: 0,
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
