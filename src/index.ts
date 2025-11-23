/**
 * TONL-MCP Bridge
 * Token-optimized format for LLM context windows
 * @packageDocumentation
 */

// Core converters
export { jsonToTonl, typeNameToTonl, buildTonlHeader, formatValue } from './core/json-to-tonl.js';

export {
  tonlToJson,
  tonlTypeToValue,
  parseTonlHeader,
  splitRespectingQuotes,
} from './core/tonl-to-json.js';

export { yamlToTonl } from './core/yaml-to-tonl.js';
export { tonlToYaml } from './core/tonl-to-yaml.js';

// Type detection
export { detectType, detectObjectSchema } from './core/type-detector.js';

// Token utilities
export { estimateTokens, calculateSavings } from './utils/token-counter.js';
// Re-export tokenizer utilities and types
export { countTokens, calculateRealSavings, type ModelName } from './utils/tokenizer.js';
// Types
export type { TypeName } from './core/type-detector.js';

// MCP Server
export {
  TonlMcpServer,
  createTonlMcpServer,
  type McpServerConfig,
  type ToolResponse,
  type ConvertToTonlInput,
  type ParseTonlInput,
  type ValidateSchemaInput,
  type CalculateSavingsInput,
} from './mcp/index-exports.js';

// SDK
export {
  BaseAdapter,
  PostgresAdapter,
  SQLiteAdapter,
  MySQLAdapter,
  DatabaseError,
  type DatabaseConfig,
  type SQLiteConfig,
  type QueryResult,
  type TonlResult,
  type StatsResult,
} from './sdk/index.js';

// Vector database adapters (v0.8.0)
export { QdrantAdapter } from './sdk/vector/qdrant.js';
export { BaseVectorAdapter } from './sdk/vector/base-vector.js';
export type {
  QdrantConfig,
  VectorSearchOptions,
} from './sdk/vector/types.js';
export type {
  VectorQueryResult,
  VectorTonlResult,
  VectorStatsResult,
} from './sdk/vector/qdrant.js';