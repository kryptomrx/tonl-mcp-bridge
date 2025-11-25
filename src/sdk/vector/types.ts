// Qdrant Configuration
export interface QdrantConfig {
  url?: string;
  apiKey?: string;
  host?: string;
  port?: number;
}

// Milvus Configuration
export interface MilvusConfig {
  address: string; // e.g. "localhost:19530"
  username?: string;
  password?: string;
  ssl?: boolean;
  token?: string; // Cloud token
}

// Unified Config Type
export type VectorDBConfig = QdrantConfig | MilvusConfig;

export interface VectorSearchOptions {
  limit?: number;
  scoreThreshold?: number;
  /**
   * Filter can be a Qdrant filter object or a Milvus boolean expression string
   * e.g. Qdrant: { must: [{ key: "city", match: { value: "Berlin" } }] }
   * e.g. Milvus: "city == 'Berlin'"
   */
  filter?: Record<string, unknown> | string;
  withPayload?: boolean;
  withVector?: boolean;
  // Milvus specific
  outputFields?: string[]; 
  consistencyLevel?: 'Strong' | 'Session' | 'Bounded' | 'Eventually';
}

export interface VectorPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
  vector?: number[];
}