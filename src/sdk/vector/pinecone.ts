import { createPineconeClient } from '../loaders/pinecone-loader.js';
import { BaseVectorAdapter } from './base-vector.js';
import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import type { PineconeConfig, VectorSearchOptions } from './types.js';
import type { VectorQueryResult, VectorTonlResult, VectorStatsResult } from './qdrant.js';
import type { ModelName } from '../../utils/tokenizer.js';

/**
 * Pinecone Vector Database Adapter
 * 
 * Pinecone is a fully managed vector database that makes it easy to build 
 * high-performance vector search applications. No infrastructure to manage.
 * 
 * **Key Features:**
 * - Serverless architecture with automatic scaling
 * - Sub-50ms p95 query latency
 * - Built-in metadata filtering
 * - Namespaces for data isolation
 * - TONL conversion for 40-60% token savings
 * 
 * **Use Cases:**
 * - Semantic search and similarity matching
 * - Recommendation systems
 * - RAG (Retrieval-Augmented Generation)
 * - Anomaly detection
 * - Question answering systems
 * 
 * @example
 * ```typescript
 * import { PineconeAdapter } from 'tonl-mcp-bridge';
 * 
 * // Initialize adapter
 * const pinecone = new PineconeAdapter({
 *   apiKey: process.env.PINECONE_API_KEY!
 * });
 * 
 * await pinecone.connect();
 * 
 * // Search with automatic TONL conversion
 * const result = await pinecone.searchToTonl('my-index', queryEmbedding, {
 *   limit: 10,
 *   namespace: 'production',
 *   filter: { category: 'technical' }
 * });
 * 
 * console.log(result.tonl); // Compressed format
 * console.log(`Saved ${result.stats.savingsPercent}% tokens`);
 * ```
 */
export class PineconeAdapter extends BaseVectorAdapter {
  private client: any = null;
  protected declare config: PineconeConfig;

  /**
   * Create a new Pinecone adapter instance
   * 
   * @param config - Pinecone configuration with API key
   * 
   * @example
   * ```typescript
   * const adapter = new PineconeAdapter({
   *   apiKey: process.env.PINECONE_API_KEY!
   * });
   * ```
   */
  constructor(config: PineconeConfig) {
    super(config);
    this.config = config;
  }

  /**
   * Connect to Pinecone
   * 
   * Establishes connection and validates API key by listing indexes.
   * 
   * @throws {Error} If API key is invalid or connection fails
   * 
   * @example
   * ```typescript
   * await pinecone.connect();
   * console.log('Connected to Pinecone');
   * ```
   */
  async connect(): Promise<void> {
    try {
      this.client = await createPineconeClient({
        apiKey: this.config.apiKey,
      });

      await this.client.listIndexes();
      this.connected = true;
    } catch (error) {
      throw new Error(
        `Failed to connect to Pinecone: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from Pinecone
   * 
   * Cleans up client connection. Safe to call multiple times.
   * 
   * @example
   * ```typescript
   * await pinecone.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
  }

  /**
   * Get index reference
   * 
   * @private
   * @param indexName - Name of the index
   * @returns Index instance
   * @throws {Error} If not connected
   */
  private getIndex(indexName: string): any {
    if (!this.client) throw new Error('Not connected');
    return this.client.index(indexName);
  }

  /**
   * Search for similar vectors
   * 
   * Performs k-NN vector similarity search in the specified index.
   * Returns results with similarity scores and metadata.
   * 
   * @param indexName - Name of the Pinecone index
   * @param vector - Query vector (embedding)
   * @param options - Search options (limit, filter, namespace, etc.)
   * @returns Search results with scores and metadata
   * 
   * @example
   * ```typescript
   * // Basic search
   * const results = await pinecone.search('my-index', queryEmbedding, {
   *   limit: 10
   * });
   * 
   * // Search with metadata filter
   * const filtered = await pinecone.search('my-index', queryEmbedding, {
   *   limit: 5,
   *   filter: { category: 'tech', year: { $gte: 2020 } }
   * });
   * 
   * // Search in specific namespace
   * const namespaced = await pinecone.search('my-index', queryEmbedding, {
   *   limit: 10,
   *   namespace: 'production',
   *   includeMetadata: true
   * });
   * 
   * results.data.forEach(doc => {
   *   console.log(`${doc.id}: ${doc.score}`);
   * });
   * ```
   */
  async search(
    indexName: string,
    vector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorQueryResult> {
    if (!this.client || !this.connected) {
      throw new Error('Database not connected');
    }

    const index = this.getIndex(indexName);

    const queryOptions: any = {
      vector,
      topK: options.limit || 10,
      includeMetadata: options.includeMetadata ?? options.withPayload ?? true,
      includeValues: options.includeValues ?? options.withVector ?? false,
    };

    if (options.namespace) {
      queryOptions.namespace = options.namespace;
    }

    if (options.filter && typeof options.filter === 'object') {
      queryOptions.filter = options.filter;
    }

    const response = await index.query(queryOptions);

    const data = response.matches?.map((match: any) => ({
      id: match.id,
      score: match.score,
      ...(match.metadata || {}),
    })) || [];

    return {
      data,
      rowCount: data.length,
    };
  }

  /**
   * Search and convert results to TONL format
   * 
   * Performs vector search and automatically converts results to TONL,
   * achieving 40-60% token savings compared to JSON.
   * 
   * **Perfect for:**
   * - Reducing LLM context size
   * - Lowering API costs
   * - Faster token processing
   * 
   * @param indexName - Name of the index
   * @param vector - Query vector
   * @param options - Search options
   * @returns Search results in TONL format with original data
   * 
   * @example
   * ```typescript
   * const result = await pinecone.searchToTonl('docs', embedding, {
   *   limit: 5,
   *   filter: { status: 'published' }
   * });
   * 
   * console.log(result.tonl);
   * // docs[5]{id:str,score:float,title:str,content:str}:
   * //   "doc1", 0.95, "Getting Started", "..."
   * //   "doc2", 0.87, "Advanced Guide", "..."
   * 
   * // Send to LLM with much fewer tokens
   * const llmResponse = await openai.chat.completions.create({
   *   messages: [
   *     { role: 'system', content: 'You are a helpful assistant.' },
   *     { role: 'user', content: `Context:\n${result.tonl}\n\nQuestion: ...` }
   *   ]
   * });
   * ```
   */
  async searchToTonl(
    indexName: string,
    vector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorTonlResult> {
    const result = await this.search(indexName, vector, options);
    const tonl = jsonToTonl(result.data, indexName);

    return {
      tonl,
      data: result.data,
      rowCount: result.rowCount,
    };
  }

  /**
   * Search with token savings statistics
   * 
   * Performs search, converts to TONL, and calculates token savings.
   * Useful for cost analysis and optimization.
   * 
   * @param indexName - Name of the index
   * @param vector - Query vector
   * @param options - Search options with optional model selection
   * @returns Search results with detailed token statistics
   * 
   * @example
   * ```typescript
   * const result = await pinecone.searchWithStats('docs', embedding, {
   *   limit: 10,
   *   model: 'gpt-4o',
   *   filter: { category: 'technical' }
   * });
   * 
   * console.log(`Original: ${result.stats.originalTokens} tokens`);
   * console.log(`TONL: ${result.stats.compressedTokens} tokens`);
   * console.log(`Saved: ${result.stats.savedTokens} tokens (${result.stats.savingsPercent}%)`);
   * 
   * // Example output:
   * // Original: 2450 tokens
   * // TONL: 980 tokens
   * // Saved: 1470 tokens (60%)
   * ```
   */
  async searchWithStats(
    indexName: string,
    vector: number[],
    options: VectorSearchOptions & { model?: ModelName } = {}
  ): Promise<VectorStatsResult> {
    const result = await this.search(indexName, vector, options);
    const tonl = jsonToTonl(result.data, indexName);
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
   * Create a new Pinecone index
   * 
   * Creates a serverless index with the specified dimension and metric.
   * Index creation is asynchronous and may take a few minutes.
   * 
   * @param name - Index name (must be unique)
   * @param dimension - Vector dimension (e.g., 1536 for OpenAI ada-002)
   * @param metric - Distance metric for similarity
   * 
   * @example
   * ```typescript
   * // Create index for OpenAI embeddings
   * await pinecone.createIndex('my-docs', 1536, 'cosine');
   * 
   * // Wait for index to be ready
   * await new Promise(resolve => setTimeout(resolve, 60000));
   * 
   * console.log('Index ready for use');
   * ```
   */
  async createIndex(
    name: string,
    dimension: number,
    metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    await this.client.createIndex({
      name,
      dimension,
      metric,
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });
  }

  /**
   * Insert or update vectors
   * 
   * Upserts vectors into the index. If a vector with the same ID exists,
   * it will be updated. Otherwise, a new vector is inserted.
   * 
   * **Performance Tips:**
   * - Batch upserts in groups of 100-1000 for best performance
   * - Use namespaces to organize vectors by tenant/environment
   * 
   * @param indexName - Name of the index
   * @param vectors - Array of vectors with IDs, values, and optional metadata
   * @param namespace - Optional namespace for data isolation
   * 
   * @example
   * ```typescript
   * // Upsert single vector
   * await pinecone.upsert('my-index', [
   *   {
   *     id: 'doc1',
   *     values: [0.1, 0.2, ...], // 1536 dimensions
   *     metadata: {
   *       title: 'Getting Started',
   *       category: 'tutorial',
   *       url: 'https://example.com/docs/getting-started'
   *     }
   *   }
   * ]);
   * 
   * // Batch upsert with namespace
   * await pinecone.upsert('my-index', [
   *   { id: 'doc1', values: embedding1, metadata: { title: 'Doc 1' } },
   *   { id: 'doc2', values: embedding2, metadata: { title: 'Doc 2' } },
   *   { id: 'doc3', values: embedding3, metadata: { title: 'Doc 3' } }
   * ], 'production');
   * ```
   */
  async upsert(
    indexName: string,
    vectors: Array<{
      id: string;
      values: number[];
      metadata?: Record<string, unknown>;
    }>,
    namespace?: string
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    const index = this.getIndex(indexName);
    
    await index.upsert(vectors, { namespace });
  }

  /**
   * Delete vectors by IDs
   * 
   * Removes vectors from the index. Deletion is permanent.
   * 
   * @param indexName - Name of the index
   * @param ids - Array of vector IDs to delete
   * @param namespace - Optional namespace
   * 
   * @example
   * ```typescript
   * // Delete specific vectors
   * await pinecone.deleteVectors('my-index', ['doc1', 'doc2', 'doc3']);
   * 
   * // Delete from namespace
   * await pinecone.deleteVectors('my-index', ['user1-doc1'], 'user-data');
   * ```
   */
  async deleteVectors(
    indexName: string,
    ids: string[],
    namespace?: string
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    const index = this.getIndex(indexName);
    
    await index.deleteMany(ids, namespace);
  }

  /**
   * Delete an entire index
   * 
   * Permanently deletes the index and all its data.
   * This operation cannot be undone.
   * 
   * @param name - Name of the index to delete
   * 
   * @example
   * ```typescript
   * // Delete index
   * await pinecone.deleteIndex('old-index');
   * console.log('Index deleted permanently');
   * ```
   */
  async deleteIndex(name: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.deleteIndex(name);
  }

  /**
   * List all indexes
   * 
   * Returns names of all indexes in your Pinecone project.
   * 
   * @returns Array of index names
   * 
   * @example
   * ```typescript
   * const indexes = await pinecone.listIndexes();
   * console.log('Available indexes:', indexes);
   * // ['my-docs', 'user-embeddings', 'products']
   * ```
   */
  async listIndexes(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected');
    
    const indexes = await this.client.listIndexes();
    return indexes.indexes?.map((idx: any) => idx.name) || [];
  }
}
