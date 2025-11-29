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
  BatchQuery,
  BatchTonlResult,
  BatchStatsResult,
  BatchOptions,
  QueryAnalysis,
  SchemaBaseline,
  SchemaDrift,
  SchemaColumn,
  TypeChange,
} from './adapters/types.js';
export { DatabaseError } from './adapters/types.js';

// Vector databases
export { QdrantAdapter } from './vector/qdrant.js';
export { MilvusAdapter } from './vector/milvus.js';
export { BaseVectorAdapter } from './vector/base-vector.js';
export type {
  QdrantConfig,
  MilvusConfig, 
  VectorSearchOptions,
} from './vector/types.js';
export type {
  VectorQueryResult,
  VectorTonlResult,
  VectorStatsResult,
} from './vector/qdrant.js';

export { PineconeAdapter } from './vector/index.js';
export type { PineconeConfig } from './vector/types.js';

export { WeaviateAdapter } from './vector/index.js';
export type { WeaviateConfig } from './vector/types.js';

export { MongoDBAdapter } from './vector/index.js';
export type {
  MongoDBConfig,
  MongoDBSearchOptions,
  MongoDBHybridSearchOptions,
  CollectionTemplate,
  NestedAnalysis,
  CostBreakdown,
  IndexRecommendation
} from './vector/types.js';