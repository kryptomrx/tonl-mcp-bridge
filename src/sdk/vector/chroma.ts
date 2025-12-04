import type { ChromaClient, Collection } from 'chromadb';
import { BaseVectorAdapter } from './base-vector.js';
import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import type { ChromaConfig, VectorSearchOptions } from './types.js';
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
 * ChromaDB Vector Database Adapter
 * 
 * The "Local Hero" - perfect for developers using local LLMs (Ollama, etc.)
 * and open-source embedding models. Extremely popular in the Python community.
 * 
 * **Key Features:**
 * - In-memory or persistent storage
 * - Automatic embedding generation (optional)
 * - Built-in metadata filtering
 * - DuckDB or ClickHouse backends
 * - Zero configuration for quick start
 * 
 * **Use Cases:**
 * - RAG with local LLMs (Ollama, LM Studio)
 * - Prototyping and development
 * - Cost-conscious production deployments
 * - LangChain/LlamaIndex integration
 * 
 * @example
 * ```typescript
 * // Quick start (in-memory)
 * const chroma = new ChromaAdapter();
 * await chroma.connect();
 * 
 * // With persistence
 * const chroma = new ChromaAdapter({
 *   path: './chroma_data'
 * });
 * await chroma.connect();
 * 
 * // With Chroma Cloud
 * const chroma = new ChromaAdapter({
 *   url: 'https://api.trychroma.com',
 *   apiKey: process.env.CHROMA_API_KEY,
 *   tenant: 'default',
 *   database: 'default'
 * });
 * await chroma.connect();
 * ```
 */
export class ChromaAdapter extends BaseVectorAdapter {
  private client: ChromaClient | null = null;
  protected declare config: ChromaConfig;

  /**
   * Create ChromaDB adapter
   * 
   * @param config - ChromaDB configuration
   * 
   * @example
   * ```typescript
   * // In-memory (default)
   * const chroma = new ChromaAdapter();
   * 
   * // Persistent storage
   * const chroma = new ChromaAdapter({
   *   path: './chroma_db'
   * });
   * 
   * // Remote server
   * const chroma = new ChromaAdapter({
   *   url: 'http://localhost:8000'
   * });
   * ```
   */
  constructor(config: ChromaConfig = {}) {
    const url = config.url || 'http://localhost:8000';
    super({
      ...config,
      url,
    });
    this.config = { ...config, url };
  }

  /**
   * Connect to ChromaDB
   * 
   * Establishes connection and validates it by calling heartbeat.
   * 
   * @throws {Error} If connection fails
   * 
   * @example
   * ```typescript
   * const chroma = new ChromaAdapter();
   * await chroma.connect();
   * console.log('Connected to ChromaDB');
   * ```
   */
  async connect(): Promise<void> {
    // Lazy load chromadb package (optional dependency)
    const { createChromaClient } = await import('../loaders/chroma-loader.js');

    this.client = await createChromaClient({
      path: this.config.path,
      url: this.config.url,
      apiKey: this.config.apiKey,
      tenant: this.config.tenant,
      database: this.config.database,
    });

    // Validate connection
    await this.client.heartbeat();
    this.connected = true;
  }

  /**
   * Disconnect from ChromaDB
   * 
   * @example
   * ```typescript
   * await chroma.disconnect();
   * console.log('Disconnected from ChromaDB');
   * ```
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
  }

  /**
   * Search for similar vectors
   * 
   * Performs cosine similarity search and returns matching documents with metadata.
   * 
   * @param collectionName - Name of collection to search
   * @param vector - Query vector (embedding)
   * @param options - Search options (limit, filter, etc.)
   * @returns Search results with scores and metadata
   * 
   * @example
   * ```typescript
   * const results = await chroma.search('documents', queryEmbedding, {
   *   limit: 10,
   *   filter: { category: 'technical' },
   *   scoreThreshold: 0.7
   * });
   * 
   * console.log(`Found ${results.rowCount} results`);
   * results.data.forEach(doc => {
   *   console.log(doc.id, doc.score, doc.title);
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

    // Import DefaultEmbeddingFunction dynamically
    const { DefaultEmbeddingFunction } = await import('chromadb');
    const embedder = new DefaultEmbeddingFunction();

    // Get collection with embedding function
    const collection = await this.client.getCollection({
      name: collectionName,
      embeddingFunction: embedder,
    });

    // Convert filter to Chroma format (where clause)
    const where = this.convertFilterToWhere(options.filter);

    // Query collection
    const queryResult = await collection.query({
      queryEmbeddings: [vector],
      nResults: options.limit || 10,
      where,
      include: ['metadatas' as any, 'documents' as any, 'distances' as any],
    });

    // Transform results to standard format
    const data: Array<Record<string, unknown>> = [];
    const ids = queryResult.ids[0] || [];
    const distances = queryResult.distances?.[0] || [];
    const metadatas = queryResult.metadatas?.[0] || [];
    const documents = queryResult.documents?.[0] || [];

    for (let i = 0; i < ids.length; i++) {
      // Convert distance to score (1 - distance for cosine)
      const score = distances[i] !== undefined ? 1 - distances[i] : undefined;

      // Apply score threshold if specified
      if (options.scoreThreshold && score !== undefined && score < options.scoreThreshold) {
        continue;
      }

      data.push({
        id: ids[i],
        score,
        document: documents[i],
        ...(metadatas[i] || {}),
      });
    }

    return {
      data,
      rowCount: data.length,
    };
  }

  /**
   * Search and convert results to TONL format
   * 
   * Performs vector search and automatically converts results to TONL,
   * achieving 40-60% token savings.
   * 
   * @param collectionName - Name of collection to search
   * @param vector - Query vector
   * @param options - Search options
   * @returns Search results in TONL format
   * 
   * @example
   * ```typescript
   * const result = await chroma.searchToTonl('documents', embedding, {
   *   limit: 5
   * });
   * 
   * console.log(result.tonl);
   * // documents[5]{id:str,score:float,title:str,content:str}:
   * //   "doc1", 0.95, "Getting Started", "..."
   * //   "doc2", 0.87, "Advanced Guide", "..."
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
   * Performs search, converts to TONL, and calculates token savings
   * compared to JSON. Useful for cost analysis and optimization.
   * 
   * @param collectionName - Name of collection
   * @param vector - Query vector
   * @param options - Search options with optional model selection
   * @returns Search results with token statistics
   * 
   * @example
   * ```typescript
   * const result = await chroma.searchWithStats('documents', embedding, {
   *   limit: 10,
   *   model: 'gpt-4o'
   * });
   * 
   * console.log(`Original: ${result.stats.originalTokens} tokens`);
   * console.log(`TONL: ${result.stats.compressedTokens} tokens`);
   * console.log(`Saved: ${result.stats.savedTokens} tokens (${result.stats.savingsPercent}%)`);
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
   * Creates a vector collection with optional embedding function.
   * If no embedding function is provided, Chroma uses default
   * sentence-transformers model.
   * 
   * @param name - Collection name
   * @param metadata - Optional collection metadata
   * @returns Created collection
   * 
   * @example
   * ```typescript
   * // Simple creation
   * await chroma.createCollection('my_documents');
   * 
   * // With metadata
   * await chroma.createCollection('technical_docs', {
   *   description: 'Technical documentation embeddings',
   *   embedding_model: 'all-MiniLM-L6-v2'
   * });
   * ```
   */
  async createCollection(
    name: string,
    metadata?: Record<string, unknown>
  ): Promise<Collection> {
    if (!this.client) throw new Error('Not connected');

    return await this.client.createCollection({
      name,
      metadata,
    });
  }

  /**
   * Get or create collection
   * 
   * Returns existing collection or creates new one if it doesn't exist.
   * Idempotent operation.
   * 
   * @param name - Collection name
   * @param metadata - Optional metadata (only used if creating)
   * @returns Collection instance
   * 
   * @example
   * ```typescript
   * const collection = await chroma.getOrCreateCollection('documents');
   * console.log('Collection ready:', collection.name);
   * ```
   */
  async getOrCreateCollection(
    name: string,
    metadata?: Record<string, unknown>
  ): Promise<Collection> {
    if (!this.client) throw new Error('Not connected');

    return await this.client.getOrCreateCollection({
      name,
      metadata,
    });
  }

  /**
   * Add or update vectors
   * 
   * Inserts new vectors or updates existing ones. Supports both
   * direct embeddings and automatic embedding generation from documents.
   * 
   * @param collectionName - Name of collection
   * @param points - Data to upsert
   * @returns Void
   * 
   * @example
   * ```typescript
   * // With pre-computed embeddings
   * await chroma.upsert('documents', [
   *   {
   *     id: 'doc1',
   *     vector: [0.1, 0.2, ...],
   *     metadata: { title: 'Getting Started' }
   *   }
   * ]);
   * 
   * // Let Chroma generate embeddings
   * await chroma.upsert('documents', [
   *   {
   *     id: 'doc2',
   *     document: 'This is the document text',
   *     metadata: { category: 'tutorial' }
   *   }
   * ]);
   * ```
   */
  async upsert(
    collectionName: string,
    points: Array<{
      id: string;
      vector?: number[];
      document?: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    // Import DefaultEmbeddingFunction dynamically
    const { DefaultEmbeddingFunction } = await import('chromadb');
    const embedder = new DefaultEmbeddingFunction();

    const collection = await this.client.getCollection({
      name: collectionName,
      embeddingFunction: embedder,
    });

    // Separate points with embeddings vs documents
    const withEmbeddings = points.filter(p => p.vector);
    const withDocuments = points.filter(p => p.document && !p.vector);

    // Add points with embeddings
    if (withEmbeddings.length > 0) {
      await collection.add({
        ids: withEmbeddings.map(p => p.id),
        embeddings: withEmbeddings.map(p => p.vector!),
        metadatas: withEmbeddings.map(p => p.metadata || {}) as any,
      });
    }

    // Add points with documents (Chroma will embed)
    if (withDocuments.length > 0) {
      await collection.add({
        ids: withDocuments.map(p => p.id),
        documents: withDocuments.map(p => p.document!),
        metadatas: withDocuments.map(p => p.metadata || {}) as any,
      });
    }
  }

  /**
   * Delete a collection
   * 
   * Permanently removes collection and all its data.
   * 
   * @param name - Collection name to delete
   * 
   * @example
   * ```typescript
   * await chroma.deleteCollection('old_data');
   * console.log('Collection deleted');
   * ```
   */
  async deleteCollection(name: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.deleteCollection({ name });
  }

  /**
   * List all collections
   * 
   * Returns metadata about all collections in the database.
   * 
   * @returns Array of collection information
   * 
   * @example
   * ```typescript
   * const collections = await chroma.listCollections();
   * collections.forEach(col => {
   *   console.log(col.name, col.metadata);
   * });
   * ```
   */
  async listCollections(): Promise<Array<{ name: string; metadata?: Record<string, unknown> }>> {
    if (!this.client) throw new Error('Not connected');
    const collections = await this.client.listCollections();
    return collections.map((c: any) => ({
      name: c.name,
      metadata: c.metadata,
    }));
  }

  /**
   * Get collection by name
   * 
   * @param name - Collection name
   * @returns Collection instance
   * 
   * @example
   * ```typescript
   * const collection = await chroma.getCollection('documents');
   * const count = await collection.count();
   * console.log(`Collection has ${count} items`);
   * ```
   */
  async getCollection(name: string): Promise<Collection> {
    if (!this.client) throw new Error('Not connected');
    
    // Import DefaultEmbeddingFunction dynamically
    const { DefaultEmbeddingFunction } = await import('chromadb');
    const embedder = new DefaultEmbeddingFunction();
    
    return await this.client.getCollection({
      name,
      embeddingFunction: embedder,
    });
  }

  /**
   * Convert filter to Chroma where clause
   * 
   * @private
   * @param filter - Filter object or string
   * @returns Chroma where clause or undefined
   */
  private convertFilterToWhere(filter: unknown): Record<string, unknown> | undefined {
    if (!filter || typeof filter !== 'object') {
      return undefined;
    }

    // Chroma uses simple key-value filters
    // For complex filters, user should pass Chroma-native format
    return filter as Record<string, unknown>;
  }
}
