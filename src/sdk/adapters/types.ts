export interface DatabaseConfig {
  host: string;
  port?: number;
  database: string;
  user: string;
  password: string;
}

export interface QueryResult<T = unknown> {
  data: T[];
  rowCount: number;
}

export interface TonlResult {
  tonl: string;
  data: unknown[];
  rowCount: number;
}

export interface StatsResult extends TonlResult {
  stats: {
    originalTokens: number;
    compressedTokens: number;
    savedTokens: number;
    savingsPercent: number;
  };
}

export type ModelName = 'gpt-5' | 'gpt-4' | 'claude-4-opus' | 'claude-4-sonnet' | 'gemini-2.5-pro';

export class DatabaseError extends Error {
  constructor(
    message: string,
    public query?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Batch query types
export interface BatchQuery {
  sql: string;
  name: string;
}

export interface BatchTonlResult {
  tonl: string;
  rowCount: number;
  stats?: {
    originalTokens: number;
    compressedTokens: number;
    savedTokens: number;
    savingsPercent: number;
  };
}

export interface BatchStatsResult {
  results: BatchTonlResult[];
  aggregate: {
    totalQueries: number;
    totalRows: number;
    totalOriginalTokens: number;
    totalCompressedTokens: number;
    savedTokens: number;
    savingsPercent: number;
  };
}

export interface BatchOptions {
  model?: ModelName;
  parallel?: boolean; // default: true
}

// Query Analysis
export interface QueryAnalysis {
  estimatedRows: number;
  estimatedJsonTokens: number;
  estimatedTonlTokens: number;
  potentialSavings: number;
  potentialSavingsPercent: number;
  recommendation: 'use-tonl' | 'use-json' | 'marginal';
  costImpact: string;
}