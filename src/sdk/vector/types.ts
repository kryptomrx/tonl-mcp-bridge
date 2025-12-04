/**
 * Base configuration for all vector database adapters
 */
export interface BaseVectorConfig {
  /** Optional metadata to attach to the connection */
  metadata?: Record<string, any>;
  /** Database server URL */
  url?: string;
}

/**
 * Qdrant Vector Database Configuration
 * 
 * Qdrant is a high-performance vector similarity search engine with a convenient API.
 * 
 * @example
 * ```typescript
 * // Local instance
 * const config: QdrantConfig = {
 *   url: 'http://localhost:6333'
 * };
 * 
 * // Cloud instance with API key
 * const cloudConfig: QdrantConfig = {
 *   url: 'https://xyz-example.qdrant.tech',
 *   apiKey: process.env.QDRANT_API_KEY
 * };
 * 
 * // Custom host and port
 * const customConfig: QdrantConfig = {
 *   host: 'my-qdrant-server.com',
 *   port: 6334,
 *   https: true,
 *   apiKey: 'your-api-key'
 * };
 * ```
 */
export interface QdrantConfig extends BaseVectorConfig {
  /** 
   * Full URL to Qdrant instance (e.g., 'http://localhost:6333')
   * @default 'http://localhost:6333'
   */
  url?: string;
  
  /** 
   * API key for authentication (required for Qdrant Cloud)
   * @example 'qdr_abc123xyz...'
   */
  apiKey?: string;
  
  /** 
   * Use HTTPS connection
   * @default false
   */
  https?: boolean;
  
  /** 
   * Port number
   * @default 6333
   */
  port?: number;
  
  /** 
   * Host address (alternative to url)
   * @example 'localhost' or 'my-qdrant.example.com'
   */
  host?: string;
}

/**
 * Milvus Vector Database Configuration
 * 
 * Milvus is an open-source vector database built for scalable similarity search 
 * and AI applications. Can handle billions of vectors.
 * 
 * @example
 * ```typescript
 * // Local standalone instance
 * const config: MilvusConfig = {
 *   address: 'localhost:19530'
 * };
 * 
 * // With authentication
 * const secureConfig: MilvusConfig = {
 *   address: 'milvus.example.com:19530',
 *   username: 'admin',
 *   password: process.env.MILVUS_PASSWORD,
 *   ssl: true
 * };
 * 
 * // Using token authentication
 * const tokenConfig: MilvusConfig = {
 *   address: 'cloud.milvus.io:19530',
 *   token: process.env.MILVUS_TOKEN,
 *   ssl: true
 * };
 * ```
 */
export interface MilvusConfig extends BaseVectorConfig {
  /** 
   * Milvus server address in format 'host:port'
   * @example 'localhost:19530' or 'milvus.example.com:443'
   */
  address: string;
  
  /** 
   * Username for authentication (required for secured instances)
   * @default undefined
   */
  username?: string;
  
  /** 
   * Password for authentication
   * Store securely, preferably in environment variables
   */
  password?: string;
  
  /** 
   * Enable SSL/TLS connection
   * @default false
   */
  ssl?: boolean;
  
  /** 
   * Authentication token (alternative to username/password)
   * Used for cloud instances
   */
  token?: string;
}

/**
 * Pinecone Vector Database Configuration
 * 
 * Pinecone is a managed vector database service optimized for ML applications.
 * No infrastructure management needed.
 * 
 * @example
 * ```typescript
 * // Standard configuration
 * const config: PineconeConfig = {
 *   apiKey: process.env.PINECONE_API_KEY!,
 *   environment: 'us-east-1-aws'
 * };
 * 
 * // Using index host directly
 * const indexConfig: PineconeConfig = {
 *   apiKey: process.env.PINECONE_API_KEY!,
 *   indexHost: 'my-index-abc123.svc.us-east-1-aws.pinecone.io'
 * };
 * ```
 */
export interface PineconeConfig extends BaseVectorConfig {
  /** 
   * Pinecone API key (required)
   * Get from https://app.pinecone.io/
   * @example 'pcsk_abc123_xyz...'
   */
  apiKey: string;
  
  /** 
   * Cloud environment (deprecated in newer Pinecone versions)
   * @deprecated Use indexHost instead
   * @example 'us-east-1-aws' or 'gcp-starter'
   */
  environment?: string;
  
  /** 
   * Direct index host URL
   * Format: 'index-name-abc123.svc.region.pinecone.io'
   * @example 'my-index-abc123.svc.us-east-1-aws.pinecone.io'
   */
  indexHost?: string;
}

/**
 * Weaviate Vector Database Configuration
 * 
 * Weaviate is an open-source vector search engine with built-in modules 
 * for vectorization, QnA, classification, and more.
 * 
 * @example
 * ```typescript
 * // Local instance
 * const config: WeaviateConfig = {
 *   url: 'http://localhost:8080'
 * };
 * 
 * // Weaviate Cloud Services (WCS)
 * const wcsConfig: WeaviateConfig = {
 *   url: 'https://my-cluster-abc123.weaviate.network',
 *   apiKey: process.env.WEAVIATE_API_KEY
 * };
 * 
 * // Custom scheme and host
 * const customConfig: WeaviateConfig = {
 *   scheme: 'https',
 *   host: 'weaviate.example.com',
 *   apiKey: 'your-api-key'
 * };
 * ```
 */
export interface WeaviateConfig extends BaseVectorConfig {
  /** 
   * Full URL to Weaviate instance
   * @default 'http://localhost:8080'
   * @example 'https://my-cluster.weaviate.network'
   */
  url?: string;
  
  /** 
   * API key for authentication (required for WCS)
   * @example 'wv_abc123xyz...'
   */
  apiKey?: string;
  
  /** 
   * Connection scheme
   * @default 'http'
   */
  scheme?: 'http' | 'https';
  
  /** 
   * Host address (alternative to url)
   * @example 'localhost' or 'weaviate.example.com'
   */
  host?: string;
}

/**
 * ChromaDB Vector Database Configuration
 * 
 * ChromaDB is an AI-native open-source embedding database.
 * Perfect for local development and prototyping with LLMs.
 * 
 * @example
 * ```typescript
 * // In-memory (for testing)
 * const memoryConfig: ChromaConfig = {};
 * 
 * // Persistent local storage (DuckDB backend)
 * const localConfig: ChromaConfig = {
 *   path: './chroma_data'
 * };
 * 
 * // Remote server
 * const serverConfig: ChromaConfig = {
 *   url: 'http://localhost:8000'
 * };
 * 
 * // Chroma Cloud
 * const cloudConfig: ChromaConfig = {
 *   url: 'https://api.trychroma.com',
 *   apiKey: process.env.CHROMA_API_KEY!,
 *   tenant: 'my-tenant',
 *   database: 'my-database'
 * };
 * ```
 */
export interface ChromaConfig extends BaseVectorConfig {
  /** 
   * Server URL for remote ChromaDB instance
   * @default 'http://localhost:8000'
   * @example 'http://localhost:8000' or 'https://api.trychroma.com'
   */
  url?: string;
  
  /** 
   * Local filesystem path for persistent storage (DuckDB backend)
   * Creates a local database that persists between sessions
   * @example './chroma_data' or '/var/lib/chroma'
   */
  path?: string;
  
  /** 
   * API key for Chroma Cloud authentication
   * Get from https://www.trychroma.com/
   */
  apiKey?: string;
  
  /** 
   * Tenant name for multi-tenancy in Chroma Cloud
   * @default 'default'
   */
  tenant?: string;
  
  /** 
   * Database name within tenant
   * @default 'default'
   */
  database?: string;
}

/**
 * Redis Vector Database Configuration
 * 
 * Redis Stack with RediSearch module provides vector similarity search.
 * Great for real-time applications with sub-millisecond latency.
 * 
 * @example
 * ```typescript
 * // Local instance
 * const config: RedisConfig = {
 *   host: 'localhost',
 *   port: 6379
 * };
 * 
 * // With authentication
 * const secureConfig: RedisConfig = {
 *   url: 'redis://redis.example.com:6379',
 *   password: process.env.REDIS_PASSWORD,
 *   database: 0
 * };
 * 
 * // Redis Cloud
 * const cloudConfig: RedisConfig = {
 *   url: 'redis://default:password@redis-12345.cloud.redislabs.com:12345',
 *   indexPrefix: 'myapp:'
 * };
 * ```
 */
export interface RedisConfig extends BaseVectorConfig {
  /** 
   * Full Redis connection URL
   * Format: 'redis://[[username:]password@]host[:port][/database]'
   * @example 'redis://localhost:6379' or 'redis://:password@redis.example.com:6379/0'
   */
  url?: string;
  
  /** 
   * Redis server host
   * @default 'localhost'
   */
  host?: string;
  
  /** 
   * Redis server port
   * @default 6379
   */
  port?: number;
  
  /** 
   * Authentication password
   * Store securely in environment variables
   */
  password?: string;
  
  /** 
   * Database number (0-15 by default)
   * @default 0
   */
  database?: number;
  
  /** 
   * Username for ACL authentication (Redis 6+)
   * @default undefined
   */
  username?: string;
  
  /** 
   * Prefix for index names to avoid collisions
   * @example 'myapp:' or 'prod:vectors:'
   */
  indexPrefix?: string;
}

/**
 * MongoDB Atlas Vector Search Configuration
 * 
 * MongoDB Atlas provides vector search capabilities on existing MongoDB collections.
 * No separate vector database needed if you're already using MongoDB.
 * 
 * @example
 * ```typescript
 * // Basic configuration
 * const config: MongoDBConfig = {
 *   uri: process.env.MONGODB_URI!,
 *   database: 'myapp'
 * };
 * 
 * // With connection options
 * const advancedConfig: MongoDBConfig = {
 *   uri: 'mongodb+srv://user:pass@cluster.mongodb.net/',
 *   database: 'production',
 *   options: {
 *     maxPoolSize: 50,
 *     minPoolSize: 10,
 *     retryWrites: true,
 *     retryReads: true
 *   },
 *   maxRetries: 3,
 *   batchSize: 1000
 * };
 * ```
 */
export interface MongoDBConfig extends BaseVectorConfig {
  /** 
   * MongoDB connection URI (required)
   * Format: 'mongodb://...' or 'mongodb+srv://...'
   * @example 'mongodb+srv://user:password@cluster.mongodb.net/'
   */
  uri: string;
  
  /** 
   * Database name to use for vector search
   * @example 'myapp' or 'production'
   */
  database: string;
  
  /** 
   * MongoDB connection options
   * Fine-tune connection pooling, timeouts, and behavior
   */
  options?: {
    /** Maximum number of connections in pool @default 100 */
    maxPoolSize?: number;
    /** Minimum number of connections in pool @default 0 */
    minPoolSize?: number;
    /** Timeout for server selection in ms @default 30000 */
    serverSelectionTimeoutMS?: number;
    /** Socket timeout in ms @default 0 (no timeout) */
    socketTimeoutMS?: number;
    /** Connection timeout in ms @default 30000 */
    connectTimeoutMS?: number;
    /** Enable automatic retry of write operations @default true */
    retryWrites?: boolean;
    /** Enable automatic retry of read operations @default true */
    retryReads?: boolean;
    /** Additional MongoDB driver options */
    [key: string]: any;
  };
  
  /** 
   * Maximum retry attempts for failed operations
   * @default 3
   */
  maxRetries?: number;
  
  /** 
   * Batch size for bulk operations
   * @default 100
   */
  batchSize?: number;
}

/**
 * Vector Search Options
 * 
 * Common search parameters across all vector databases.
 * Database-specific options are also supported.
 * 
 * @example
 * ```typescript
 * // Basic search
 * const options: VectorSearchOptions = {
 *   limit: 10,
 *   scoreThreshold: 0.7
 * };
 * 
 * // With metadata filter
 * const filteredOptions: VectorSearchOptions = {
 *   limit: 5,
 *   filter: { category: 'technical', year: 2024 }
 * };
 * 
 * // Pinecone with namespace
 * const pineconeOptions: VectorSearchOptions = {
 *   limit: 20,
 *   namespace: 'production',
 *   includeMetadata: true
 * };
 * ```
 */
export interface VectorSearchOptions {
  /** 
   * Maximum number of results to return
   * @default 10
   */
  limit?: number;
  
  /** 
   * Minimum similarity score (0-1)
   * Results below this score are filtered out
   * @default undefined (no filtering)
   */
  minScore?: number;
  
  /** 
   * Metadata filter conditions
   * Filter results based on stored metadata
   * @example { category: 'tech', status: 'active' }
   */
  filter?: Record<string, any>;
  
  /** 
   * Fields to include in results
   * @example ['id', 'title', 'content']
   */
  select?: string[];
  
  /** 
   * Include vector embeddings in results
   * Warning: Increases response size significantly
   * @default false
   */
  includeVector?: boolean;
  
  // Qdrant specific
  /** 
   * [Qdrant] Minimum similarity score threshold
   * Alternative to minScore for Qdrant
   */
  scoreThreshold?: number;
  
  /** 
   * [Qdrant] Include payload (metadata) in results
   * @default true
   */
  withPayload?: boolean;
  
  /** 
   * [Qdrant] Include vector in results
   * @default false
   */
  withVector?: boolean;
  
  // Pinecone specific
  /** 
   * [Pinecone] Include metadata in results
   * @default true
   */
  includeMetadata?: boolean;
  
  /** 
   * [Pinecone] Include vector values in results
   * @default false
   */
  includeValues?: boolean;
  
  /** 
   * [Pinecone] Namespace to search within
   * Pinecone uses namespaces to partition vectors
   * @example 'production' or 'user-123'
   */
  namespace?: string;
  
  // Milvus specific
  /** 
   * [Milvus] Consistency level for search
   * @default 'Bounded'
   */
  consistencyLevel?: string;
  
  /** 
   * [Milvus] Fields to return in output
   * @example ['id', 'title', 'embedding']
   */
  outputFields?: string[];
}

/**
 * MongoDB Atlas Vector Search Options
 * 
 * Extended options specific to MongoDB Atlas vector search.
 * 
 * @example
 * ```typescript
 * const options: MongoDBSearchOptions = {
 *   limit: 10,
 *   numCandidates: 100,
 *   indexName: 'vector_index',
 *   vectorPath: 'embedding',
 *   preFilter: { status: 'published' },
 *   exact: false
 * };
 * ```
 */
export interface MongoDBSearchOptions extends VectorSearchOptions {
  /** 
   * Number of candidates to consider before applying limit
   * Higher values = better accuracy, slower search
   * @default limit * 10
   * @example 100
   */
  numCandidates?: number;
  
  /** 
   * Name of the vector index to use
   * @default 'vector_index'
   */
  indexName?: string;
  
  /** 
   * Field path to the vector in documents
   * @default 'embedding'
   * @example 'vectors.content' or 'embedding'
   */
  vectorPath?: string;
  
  /** 
   * Pre-filter to apply before vector search
   * Can improve performance by reducing search space
   * @example { category: 'tech', published: true }
   */
  preFilter?: Record<string, any>;
  
  /**
  * Use exact k-NN search instead of approximate
  * More accurate but much slower
  * @default false
  */
  exact?: boolean;
}

/**
 * MongoDB Hybrid Search Options
 */
export interface MongoDBHybridSearchOptions extends MongoDBSearchOptions {
  vector?: number[];
  vectorWeight?: number;
  textWeight?: number;
  textQuery?: string;
  textPath?: string;
}

/**
 * MongoDB Insert Options
 */
export interface MongoDBInsertOptions {
  ordered?: boolean;
  bypassDocumentValidation?: boolean;
  batchSize?: number;
}

/**
 * Collection Template Types
 */
export type CollectionTemplate = 
  | 'rag-documents'
  | 'embeddings'
  | 'chat-history'
  | 'knowledge-base'
  | 'product-catalog'
  | 'user-profiles'
  | 'semantic-cache'
  | 'custom';

/**
 * Nested Analysis Result
 */
export interface NestedAnalysis {
  depth?: number;
  paths?: string[];
  complexity?: number;
  hasNested: boolean;
  maxDepth: number;
  additionalSavings: number;
  nestedFields: string[];
}

/**
 * Cost Breakdown for Operations
 */
export interface CostBreakdown {
  storage?: number;
  query?: number;
  index?: number;
  total?: number;
  currency?: string;
  costBefore?: string;
  costAfter?: string;
  monthlySavings?: string;
  annualSavings?: string;
  percentageSaved?: number;
  queriesPerDay?: number;
}

/**
 * Index Recommendation
 */
export interface IndexRecommendation {
  field: string;
  type: string;
  improvement?: string;
  reason: string;
  estimatedSpeedup?: string;
}

/**
 * Redis Search Options
 */
export interface RedisSearchOptions extends VectorSearchOptions {
  returnFields?: string[];
  scoreField?: string;
  dialect?: number;
  textQuery?: string;
  numericFilters?: Record<string, any>;
  tagFilters?: string[];
  geoFilter?: any;
  useSemanticCache?: boolean;
  cacheTTL?: number;
  similarityThreshold?: number;
}

/**
 * Redis Index Options
 */
export interface RedisIndexOptions {
  vectorAlgorithm?: 'FLAT' | 'HNSW';
  distance?: 'COSINE' | 'L2' | 'IP';
  initialCapacity?: number;
  blockSize?: number;
  m?: number;
  efConstruction?: number;
  efRuntime?: number;
  dimensions: number;
  algorithm?: string;
  distanceMetric?: string;
  quantization?: string;
  textFields?: string[];
  numericFields?: string[];
  tagFields?: string[];
  geoFields?: string[];
}
