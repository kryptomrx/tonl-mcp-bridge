export interface QdrantConfig {
  url?: string;
  apiKey?: string;
  host?: string;
  port?: number;
}

export interface VectorSearchOptions {
  limit?: number;
  scoreThreshold?: number;
  filter?: Record<string, unknown>;
  withPayload?: boolean;
  withVector?: boolean;
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