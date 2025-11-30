export interface BaseVectorConfig {
  metadata?: Record<string, any>;
  url?: string;
}

export interface QdrantConfig extends BaseVectorConfig {
  url?: string;
  apiKey?: string;
  https?: boolean;
  port?: number;
  host?: string;
}

export interface MilvusConfig extends BaseVectorConfig {
  address: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  token?: string;
}

export interface PineconeConfig extends BaseVectorConfig {
  apiKey: string;
  environment?: string;
  indexHost?: string;
}

export interface WeaviateConfig extends BaseVectorConfig {
  url?: string;
  apiKey?: string;
  scheme?: 'http' | 'https';
  host?: string;
}

export interface MongoDBConfig extends BaseVectorConfig {
  uri: string;
  database: string;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    connectTimeoutMS?: number;
    retryWrites?: boolean;
    retryReads?: boolean;
    [key: string]: any;
  };
  maxRetries?: number;
  batchSize?: number;
}

export interface VectorSearchOptions {
  limit?: number;
  minScore?: number;
  filter?: Record<string, any>;
  select?: string[];
  includeVector?: boolean;
  // Qdrant specific
  scoreThreshold?: number;
  withPayload?: boolean;
  withVector?: boolean;
  // Pinecone specific
  includeMetadata?: boolean;
  includeValues?: boolean;
  namespace?: string;
  // Milvus specific
  consistencyLevel?: string;
  outputFields?: string[];
}

export interface MongoDBSearchOptions extends VectorSearchOptions {
  numCandidates?: number;
  indexName?: string;
  vectorPath?: string;
  preFilter?: Record<string, any>;
  exact?: boolean;
}

export interface MongoDBInsertOptions {
  batchSize?: number;
  ordered?: boolean;
}

export interface MongoDBHybridSearchOptions extends MongoDBSearchOptions {
  vector?: number[];
  textQuery?: string;
  vectorWeight?: number;
  textWeight?: number;
  textIndexName?: string;
}

export type CollectionTemplate = 
  | 'rag-documents'
  | 'product-catalog'
  | 'user-profiles'
  | 'semantic-cache';

export interface NestedAnalysis {
  hasNested: boolean;
  maxDepth: number;
  additionalSavings: number;
  nestedFields: string[];
}

export interface CostBreakdown {
  costBefore: string;
  costAfter: string;
  monthlySavings: string;
  annualSavings: string;
  percentageSaved: number;
  queriesPerDay: number;
}

export interface IndexRecommendation {
  field: string;
  type: 'vector' | 'filter' | 'text';
  reason: string;
  estimatedSpeedup?: string;
}

export interface VectorValidationOptions {
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
}

export interface CollectionNameValidationOptions {
  maxLength?: number;
  allowSpecialChars?: boolean;
}