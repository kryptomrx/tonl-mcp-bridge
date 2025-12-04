import type { QdrantClient } from '@qdrant/js-client-rest';
import { createQdrantClient } from '../loaders/qdrant-loader.js';
import { BaseVectorAdapter } from './base-vector.js';
import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import type { QdrantConfig, VectorSearchOptions } from './types.js';
import type { ModelName } from '../../utils/tokenizer.js';

export interface VectorQueryResult {
  data: Array<Record<string, unknown>>;
  rowCount: number;
}

export interface VectorTonlResult {
  tonl: string;
  data: Array<Record<string, unknown>>;
  rowCount: number;
}

export interface VectorStatsResult extends VectorTonlResult {
  stats: {
    originalTokens: number;
    compressedTokens: number;
    savedTokens: number;
    savingsPercent: number;
    model: string;
  };
}

/**
 * Qdrant Vector Database Adapter
 * 
 * Qdrant is a high-performance, open-source vector similarity search engine 
 * written in Rust. Designed for production-ready applications with billions of vectors.
 * 
 * **Key Features:**
 * - Fast and memory-efficient (Rust-based)
 * - Rich filtering capabilities
 * - Horizontal scaling support
 * - Real-time updates
 * - TONL conversion for 40-60% token savings
 * - Self-hosted or cloud options
 * 
 * **Use Cases:**
 * - Semantic search at scale
 * - Recommendation engines
 * - Anomaly detection
 * - Image/video similarity
 * - RAG systems with complex filtering
 * 
 * @example
 * ```typescript
 * import { QdrantAdapter } from 'tonl-mcp-bridge';
 * 
 * // Local instance
 * const qdrant = new QdrantAdapter({
 *   url: 'http://localhost:6333'
 * });
 * 
 * await qdrant.connect();
 * 
 * // Search with metadata filtering
 * const result = await qdrant.searchToTonl('my_collection', embedding, {
 *   limit: 10,
 *   filter: {
 *     must: [
 *       { key: 'category', match: { value: 'technical' } },
 *       { key: 'year', range: { gte: 2020 } }
 *     ]
 *   },
 *   scoreThreshold: 0.7
 * });
 * 
 * console.log(result.tonl); // Compressed TONL format
 * ```
 */
export class QdrantAdapter extends BaseVectorAdapter {
  private client: QdrantClient | null = null;
  protected declare config: QdrantConfig;

  /**
   * Create a new Qdrant adapter instance
   * 
   * @param config - Qdrant configuration (URL or host/port)
   * 
   * @example
   * ```typescript
   * // Using URL
   * const adapter = new QdrantAdapter({
   *   url: 'http://localhost:6333'
   * });
   * 
   * // Using host and port
   * const adapter2 = new QdrantAdapter({
   *   host: 'qdrant.example.com',
   *   port: 6334,
   *   https: true,
   *   apiKey: process.env.QDRANT_API_KEY
   * });
   * ```
   */
  constructor(config: QdrantConfig) {
    const url = config.url || `http://${config.host || 'localhost'}:${config.port || 6333}`;
    super({
      ...config,
      url,
    });
    this.config = { ...config, url };
  }

  /**
   * Connect to Qdrant
   * 
   * Establishes connection and validates by fetching collections list.
   * 
   * @throws {Error} If connection fails or API key is invalid
   * 
   * @example
   * ```typescript
   * await qdrant.connect();
   * console.log('Connected to Qdrant');
   * ```
   */
  async connect(): Promise<void> {
    this.client = await createQdrantClient({
      url: this.config.url!,
      apiKey: this.config.apiKey,
    });

    await this.client.getCollections();
    this.connected = true;
  }

  /**
   * Disconnect from Qdrant
   * 
   * Cleans up client connection.
   * 
   * @example
   * ```typescript
   * await qdrant.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
  }

  /**
   * Search for similar vectors
   * 
   * Performs vector similarity search with optional filtering.
   * Qdrant supports rich filter queries with must/should/must_not conditions.
   * 
   * @param collectionName - Name of the collection
   * @param vector - Query vector (embedding)
   * @param options - Search options with filters
   * @returns Search results with scores and payloads
   * 
   * @example
   * ```typescript
   * // Basic search
   * const results = await qdrant.search('documents', embedding, {
   *   limit: 10,
   *   scoreThreshold: 0.7
   * });
   * 
   * // Search with simple filter
   * const filtered = await qdrant.search('documents', embedding, {
   *   limit: 5,
   *   filter: {
   *     must: [
   *       { key: 'category', match: { value: 'tech' } }
   *     ]
   *   }
   * });
   * 
   * // Advanced filtering
   * const advanced = await qdrant.search('documents', embedding, {
   *   limit: 10,
   *   filter: {
   *     must: [
   *       { key: 'status', match: { value: 'published' } },
   *       { key: 'views', range: { gte: 1000 } }
   *     ],
   *     should: [
   *       { key: 'featured', match: { value: true } }
   *     ]
   *   },
   *   withPayload: true,
   *   scoreThreshold: 0.6
   * });
   * 
   * results.data.forEach(doc => {
   *   console.log(`${doc.id}: ${doc.score} - ${doc.title}`);
   * });
   * ```
   */
  async search(
    collectionName: string,
    vector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorQueryResult> {
    if (!this.client || !this.connected) {
      throw new Error('Database not connected');
    }

    const filterObj = typeof options.filter === 'object' ? options.filter : undefined;

    const searchResult = await this.client.search(collectionName, {
      vector,
      limit: options.limit || 10,
      score_threshold: options.scoreThreshold,
      filter: filterObj,
      with_payload: options.withPayload !== false,
      with_vector: options.withVector || false,
    });

    const data = searchResult.map((point) => ({
      id: point.id,
      score: point.score,
      ...(point.payload || {}),
    }));

    return {
      data,
      rowCount: data.length,
    };
  }

  /**
   * Search and convert results to TONL format
   * 
   * Performs vector search and automatically converts to TONL,
   * achieving 40-60% token savings for LLM context.
   * 
   * @param collectionName - Name of the collection
   * @param vector - Query vector
   * @param options - Search options
   * @returns Search results in TONL format
   * 
   * @example
   * ```typescript
   * const result = await qdrant.searchToTonl('articles', embedding, {
   *   limit: 5,
   *   filter: {
   *     must: [{ key: 'published', match: { value: true } }]
   *   }
   * });
   * 
   * console.log(result.tonl);
   * // articles[5]{id:str,score:float,title:str,summary:str}:
   * //   "art1", 0.92, "Vector Databases", "Introduction to..."
   * //   "art2", 0.88, "Semantic Search", "How to implement..."
   * 
   * // Use in LLM prompt
   * const response = await llm.complete({
   *   prompt: `Based on these articles:\n${result.tonl}\n\nAnswer: ${question}`
   * });
   * ```
   */
  async searchToTonl(
    collectionName: string,
    vector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorTonlResult> {
    const result = await this.search(collectionName, vector, options);
    const tonl = jsonToTonl(result.data, collectionName);

    return {
      tonl,
      data: result.data,
      rowCount: result.rowCount,
    };
  }

  /**
   * Search with token savings statistics
   * 
   * Performs search, converts to TONL, and provides detailed token analysis.
   * Perfect for cost optimization and monitoring.
   * 
   * @param collectionName - Name of the collection
   * @param vector - Query vector
   * @param options - Search options with model selection
   * @returns Results with token statistics
   * 
   * @example
   * ```typescript
   * const result = await qdrant.searchWithStats('docs', embedding, {
   *   limit: 10,
   *   model: 'gpt-4o',
   *   filter: { must: [{ key: 'type', match: { value: 'guide' } }] }
   * });
   * 
   * console.log(`JSON would use: ${result.stats.originalTokens} tokens`);
   * console.log(`TONL uses: ${result.stats.compressedTokens} tokens`);
   * console.log(`You save: ${result.stats.savedTokens} tokens (${result.stats.savingsPercent}%)`);
   * 
   * // Example output:
   * // JSON would use: 3200 tokens
   * // TONL uses: 1280 tokens
   * // You save: 1920 tokens (60%)
   * ```
   */
  async searchWithStats(
    collectionName: string,
    vector: number[],
    options: VectorSearchOptions & { model?: ModelName } = {}
  ): Promise<VectorStatsResult> {
    const result = await this.search(collectionName, vector, options);
    const tonl = jsonToTonl(result.data, collectionName);
    const jsonStr = JSON.stringify(result.data);

    const stats = calculateRealSavings(
      jsonStr,
      tonl,
      (options.model || 'gpt-5') as ModelName
    );

    return {
      tonl,
      data: result.data,
      rowCount: result.rowCount,
      stats,
    };
  }

  /**
   * Create a new collection
   * 
   * Creates a collection with specified vector size and distance metric.
   * 
   * @param name - Collection name
   * @param vectorSize - Dimension of vectors (e.g., 1536 for OpenAI ada-002)
   * @param distance - Distance metric for similarity calculation
   * 
   * @example
   * ```typescript
   * // For OpenAI embeddings (1536 dimensions)
   * await qdrant.createCollection('my_docs', 1536, 'Cosine');
   * 
   * // For custom embeddings with Euclidean distance
   * await qdrant.createCollection('custom_vectors', 768, 'Euclid');
   * 
   * console.log('Collection created successfully');
   * ```
   */
  async createCollection(
    name: string,
    vectorSize: number,
    distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    await this.client.createCollection(name, {
      vectors: {
        size: vectorSize,
        distance,
      },
    });
  }

  /**
   * Insert or update vectors
   * 
   * Upserts points into the collection. If a point with the same ID exists,
   * it will be updated. Qdrant waits for indexing by default.
   * 
   * **Performance Tips:**
   * - Batch upserts for better performance (100-1000 points)
   * - Use numeric IDs when possible (faster)
   * - Keep payloads small for faster searches
   * 
   * @param collectionName - Name of the collection
   * @param points - Array of points with IDs, vectors, and payloads
   * 
   * @example
   * ```typescript
   * // Single point
   * await qdrant.upsert('documents', [
   *   {
   *     id: 'doc1',
   *     vector: [0.1, 0.2, ...], // 1536 dimensions
   *     payload: {
   *       title: 'Getting Started',
   *       category: 'tutorial',
   *       published: true,
   *       views: 1500
   *     }
   *   }
   * ]);
   * 
   * // Batch upsert with numeric IDs
   * await qdrant.upsert('documents', [
   *   { id: 1, vector: embedding1, payload: { title: 'Doc 1' } },
   *   { id: 2, vector: embedding2, payload: { title: 'Doc 2' } },
   *   { id: 3, vector: embedding3, payload: { title: 'Doc 3' } }
   * ]);
   * ```
   */
  async upsert(
    collectionName: string,
    points: Array<{
      id: string | number;
      vector: number[];
      payload?: Record<string, unknown>;
    }>
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    await this.client.upsert(collectionName, {
      wait: true,
      points,
    });
  }

  /**
   * Delete a collection
   * 
   * Permanently deletes the collection and all its data.
   * This operation cannot be undone.
   * 
   * @param name - Name of the collection to delete
   * 
   * @example
   * ```typescript
   * await qdrant.deleteCollection('old_collection');
   * console.log('Collection deleted');
   * ```
   */
  async deleteCollection(name: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.deleteCollection(name);
  }
}
