import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import type {
  DatabaseConfig,
  QueryResult,
  TonlResult,
  StatsResult,
  ModelName,          
  BatchQuery,
  BatchTonlResult,
  BatchStatsResult,
  BatchOptions,
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

  // Batch operations
  async batchQuery(queries: BatchQuery[]): Promise<QueryResult[]> {
    const results = await Promise.all(
      queries.map((q) => this.query(q.sql))
    );
    return results;
  }

  async batchQueryToTonl(
    queries: BatchQuery[],
    options: BatchOptions = {}
  ): Promise<BatchTonlResult[]> {
    const results = await this.batchQuery(queries);

    return results.map((result, index) => ({
      tonl: jsonToTonl(result.data as Record<string, unknown>[], queries[index].name),
      rowCount: result.rowCount,
    }));
  }

  async batchQueryWithStats(
    queries: BatchQuery[],
    options: BatchOptions = {}
  ): Promise<BatchStatsResult> {
    const results = await this.batchQuery(queries);
    const model = options.model || 'gpt-5';

    const batchResults: BatchTonlResult[] = results.map((result, index) => {
      const tonl = jsonToTonl(result.data as Record<string, unknown>[], queries[index].name);
      const jsonStr = JSON.stringify(result.data);
      const stats = calculateRealSavings(jsonStr, tonl, model);

      return {
        tonl,
        rowCount: result.rowCount,
        stats,
      };
    });

    // Calculate aggregate stats
    const aggregate = {
      totalQueries: queries.length,
      totalRows: batchResults.reduce((sum, r) => sum + r.rowCount, 0),
      totalOriginalTokens: batchResults.reduce(
        (sum, r) => sum + (r.stats?.originalTokens || 0),
        0
      ),
      totalCompressedTokens: batchResults.reduce(
        (sum, r) => sum + (r.stats?.compressedTokens || 0),
        0
      ),
      savedTokens: 0,
      savingsPercent: 0,
    };

    aggregate.savedTokens =
      aggregate.totalOriginalTokens - aggregate.totalCompressedTokens;
    aggregate.savingsPercent =
      aggregate.totalOriginalTokens > 0
        ? (aggregate.savedTokens / aggregate.totalOriginalTokens) * 100
        : 0;

    return {
      results: batchResults,
      aggregate,
    };
  }
}
