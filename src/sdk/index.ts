export { BaseAdapter } from './adapters/base.js';
export { PostgresAdapter } from './sql/index.js';
export { SQLiteAdapter, type SQLiteConfig } from './sql/index.js';
export { MySQLAdapter } from './sql/index.js';
export type {
  DatabaseConfig,
  QueryResult,
  TonlResult,
  StatsResult,
  ModelName,
} from './adapters/types.js';
export { DatabaseError } from './adapters/types.js';

// Vector databases
export { QdrantAdapter } from './vector/qdrant.js';
export { BaseVectorAdapter } from './vector/base-vector.js';
export type {
  QdrantConfig,
  VectorSearchOptions,
} from './vector/types.js';