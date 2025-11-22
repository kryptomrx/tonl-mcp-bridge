import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import type {
  DatabaseConfig,
  QueryResult,
  TonlResult,
  StatsResult,
  ModelName,
  DatabaseError,
} from './types.js';

export abstract class BaseAdapter {
  protected config: DatabaseConfig;
  protected connected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract query<T = unknown>(sql: string): Promise<QueryResult<T>>;

  async queryToTonl(sql: string, name?: string): Promise<TonlResult> {
    const result = await this.query(sql);
    const collectionName = name || 'data';
    const tonl = jsonToTonl(result.data as Record<string, unknown>[], collectionName);

    return {
      tonl,
      data: result.data,
      rowCount: result.rowCount,
    };
  }

  async queryWithStats(
    sql: string,
    name?: string,
    options?: { model?: ModelName }
  ): Promise<StatsResult> {
    const result = await this.query(sql);
    const collectionName = name || 'data';
    const tonl = jsonToTonl(result.data as Record<string, unknown>[], collectionName);

    const jsonStr = JSON.stringify(result.data);
    const model = options?.model || 'gpt-5';
    const savings = calculateRealSavings(jsonStr, tonl, model);

    return {
      tonl,
      data: result.data,
      rowCount: result.rowCount,
      stats: {
        originalTokens: savings.originalTokens,
        compressedTokens: savings.compressedTokens,
        savedTokens: savings.savedTokens,
        savingsPercent: savings.savingsPercent,
      },
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  protected ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }
}