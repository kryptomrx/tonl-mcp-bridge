import type Database from 'better-sqlite3';
import { createSQLiteDatabase } from '../loaders/sqlite-loader.js';
import { BaseAdapter } from '../adapters/base.js';
import { DatabaseConfig, QueryResult, DatabaseError } from '../adapters/types.js';

export interface SQLiteConfig {
  filename: string;
  readonly?: boolean;
  memory?: boolean;
}

export class SQLiteAdapter extends BaseAdapter {
  private db: Database.Database | null = null;
  private sqliteConfig: SQLiteConfig;

  constructor(config: SQLiteConfig | string) {
    const filename = typeof config === 'string' ? config : config.filename;

    super({
      host: 'localhost',
      database: filename,
      user: '',
      password: '',
    });

    this.sqliteConfig = typeof config === 'string' ? { filename: config } : config;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      this.db = await createSQLiteDatabase(
        this.sqliteConfig.filename,
        {
          readonly: this.sqliteConfig.readonly || false,
        }
      );
      this.connected = true;
    } catch (error) {
      throw new DatabaseError(
        'Failed to connect to SQLite',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this.db) return;

    try {
      this.db.close();
      this.connected = false;
      this.db = null;
    } catch (error) {
      throw new DatabaseError(
        'Failed to close SQLite connection',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async query<T = unknown>(sql: string): Promise<QueryResult<T>> {
    this.ensureConnected();

    if (!this.db) {
      throw new DatabaseError('Database not initialized');
    }

    try {
      const trimmedSql = sql.trim().toUpperCase();

      if (trimmedSql.startsWith('SELECT')) {
        const rows = this.db.prepare(sql).all();
        return {
          data: rows as T[],
          rowCount: rows.length,
        };
      }

      const info = this.db.prepare(sql).run();
      return {
        data: [] as T[],
        rowCount: info.changes || 0,
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