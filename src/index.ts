/**
 * TONL-MCP Bridge
 * Token-optimized format for LLM context windows
 */

// Core
export { jsonToTonl, typeNameToTonl, buildTonlHeader, formatValue } from './core/json-to-tonl.js';
export { tonlToJson, tonlTypeToValue, parseTonlHeader, splitRespectingQuotes } from './core/tonl-to-json.js';
export { yamlToTonl } from './core/yaml-to-tonl.js';
export { tonlToYaml } from './core/tonl-to-yaml.js';
export { detectType, detectObjectSchema } from './core/type-detector.js';

// Tokens
export { estimateTokens, calculateSavings } from './utils/token-counter.js';
export { countTokens, calculateRealSavings, type ModelName } from './utils/tokenizer.js';

// Types
export type { TypeName } from './core/type-detector.js';



// MCP
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

// SQL
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

// Vector
export { QdrantAdapter, BaseVectorAdapter } from './sdk/index.js';
export type {
  QdrantConfig,
  VectorSearchOptions,
  VectorQueryResult,
  VectorTonlResult,
  VectorStatsResult,
} from './sdk/index.js';
// Batch
export type {
  BatchQuery,
  BatchTonlResult,
  BatchStatsResult,
  BatchOptions,
} from './sdk/adapters/types.js';