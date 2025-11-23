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
  QueryAnalysis,
  SchemaBaseline,
  SchemaDrift,
  SchemaColumn,
  TypeChange,
} from './types.js';
import { SchemaStore } from './schema-store.js';

export abstract class BaseAdapter {
  protected config: DatabaseConfig;
  protected connected: boolean = false;
  protected schemaStore = new SchemaStore();
  
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

  async batchQuery(queries: BatchQuery[]): Promise<QueryResult[]> {
    const results = await Promise.all(queries.map((q) => this.query(q.sql)));
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

    aggregate.savedTokens = aggregate.totalOriginalTokens - aggregate.totalCompressedTokens;
    aggregate.savingsPercent =
      aggregate.totalOriginalTokens > 0
        ? (aggregate.savedTokens / aggregate.totalOriginalTokens) * 100
        : 0;

    return {
      results: batchResults,
      aggregate,
    };
  }

  async analyzeQuery(
    sql: string,
    name: string = 'data',
    options: { model?: ModelName } = {}
  ): Promise<QueryAnalysis> {
    const result = await this.query(sql);
    const rowCount = result.rowCount;
    
    if (rowCount === 0) {
      return {
        estimatedRows: 0,
        estimatedJsonTokens: 0,
        estimatedTonlTokens: 0,
        potentialSavings: 0,
        potentialSavingsPercent: 0,
        recommendation: 'use-json',
        costImpact: '$0.00',
      };
    }

    const jsonStr = JSON.stringify(result.data);
    const tonlStr = jsonToTonl(result.data as Record<string, unknown>[], name);
    
    const model = options.model || 'gpt-5';
    const stats = calculateRealSavings(jsonStr, tonlStr, model);

    let recommendation: 'use-tonl' | 'use-json' | 'marginal';
    if (stats.savingsPercent > 30) {
      recommendation = 'use-tonl';
    } else if (stats.savingsPercent < 10) {
      recommendation = 'use-json';
    } else {
      recommendation = 'marginal';
    }

    const costPerToken = 3 / 1_000_000;
    const costSaved = stats.savedTokens * costPerToken;

    return {
      estimatedRows: rowCount,
      estimatedJsonTokens: stats.originalTokens,
      estimatedTonlTokens: stats.compressedTokens,
      potentialSavings: stats.savedTokens,
      potentialSavingsPercent: stats.savingsPercent,
      recommendation,
      costImpact: `$${costSaved.toFixed(6)}`,
    };
  }

  async trackSchema(tableName: string): Promise<void> {
    const sampleResult = await this.query(`SELECT * FROM ${tableName} LIMIT 1`);
    const columns = this.extractSchema(sampleResult.data);
    
    const countResult = await this.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    const rowCount = (countResult.data[0] as { count: number }).count;
    
    const baseline: SchemaBaseline = {
      tableName,
      columns,
      rowCount,
      capturedAt: new Date().toISOString(),
    };

    await this.schemaStore.save(baseline);
  }

  async detectSchemaDrift(tableName: string): Promise<SchemaDrift> {
    const baseline = await this.schemaStore.load(tableName);
    
    if (!baseline) {
      throw new Error(`No baseline found for table ${tableName}. Run trackSchema() first.`);
    }

    const sampleResult = await this.query(`SELECT * FROM ${tableName} LIMIT 1`);
    const currentColumns = this.extractSchema(sampleResult.data);

    const countResult = await this.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    const currentRowCount = (countResult.data[0] as { count: number }).count;

    const baselineNames = new Set(baseline.columns.map((c: SchemaColumn) => c.name));
    const currentNames = new Set(currentColumns.map((c: SchemaColumn) => c.name));

    const newColumns = currentColumns
      .filter(c => !baselineNames.has(c.name))
      .map(c => c.name);

    const removedColumns = baseline.columns
      .filter((c: SchemaColumn) => !currentNames.has(c.name))
      .map((c: SchemaColumn) => c.name);

    const typeChanges: TypeChange[] = [];
    for (const current of currentColumns) {
      const base = baseline.columns.find((c: SchemaColumn) => c.name === current.name);
      if (base && base.type !== current.type) {
        typeChanges.push({
          column: current.name,
          oldType: base.type,
          newType: current.type,
        });
      }
    }

    const hasChanged = newColumns.length > 0 || 
                       removedColumns.length > 0 || 
                       typeChanges.length > 0;

    let savingsImpact = 0;
    if (hasChanged) {
      const oldAnalysis = await this.analyzeBaseline(baseline);
      const newAnalysis = await this.analyzeQuery(`SELECT * FROM ${tableName}`, tableName);
      savingsImpact = newAnalysis.potentialSavingsPercent - oldAnalysis;
    }

    let recommendation = 'Schema unchanged';
    if (hasChanged) {
      if (savingsImpact < -10) {
        recommendation = 'Schema change reduced savings significantly. Consider optimization.';
      } else if (savingsImpact > 10) {
        recommendation = 'Schema change improved savings. Update baseline.';
      } else {
        recommendation = 'Schema changed but savings impact is minimal.';
      }
    }

    return {
      hasChanged,
      newColumns,
      removedColumns,
      typeChanges,
      rowCountChange: currentRowCount - baseline.rowCount,
      savingsImpact,
      recommendation,
    };
  }

  async updateSchemaBaseline(tableName: string): Promise<void> {
    await this.trackSchema(tableName);
  }

  private extractSchema(data: unknown[]): SchemaColumn[] {
    if (data.length === 0) return [];
    
    const sample = data[0] as Record<string, unknown>;
    return Object.entries(sample).map(([name, value]) => ({
      name,
      type: typeof value,
      nullable: value === null,
    }));
  }

  private async analyzeBaseline(baseline: SchemaBaseline): Promise<number> {
    const rowCount = baseline.rowCount;
    
    if (rowCount < 5) return 0;
    if (rowCount < 10) return 20;
    return 40;
  }
}