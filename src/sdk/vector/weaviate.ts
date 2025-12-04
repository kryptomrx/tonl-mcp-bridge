import { createWeaviateClient } from '../loaders/weaviate-loader.js';
import { BaseVectorAdapter } from './base-vector.js';
import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import type { WeaviateConfig, VectorSearchOptions } from './types.js';
import type { VectorQueryResult, VectorTonlResult, VectorStatsResult } from './qdrant.js';
import type { ModelName } from '../../utils/tokenizer.js';

/**
 * Weaviate Vector Database Adapter
 * 
 * Weaviate is an open-source vector search engine with built-in modules for
 * vectorization, semantic search, and AI-powered data operations.
 * 
 * **Key Features:**
 * - Built-in vectorization modules (OpenAI, Cohere, etc.)
 * - Hybrid search (vector + keyword)
 * - GraphQL API for flexible queries
 * - Multi-tenancy support
 * - TONL conversion for 40-60% token savings
 * - Automatic schema generation
 * 
 * **Use Cases:**
 * - Semantic search with automatic vectorization
 * - Knowledge graphs with vector search
 * - Multi-modal search (text, images)
 * - Question answering systems
 * - Content recommendation
 * 
 * @example
 * ```typescript
 * import { WeaviateAdapter } from 'tonl-mcp-bridge';
 * 
 * // Local instance
 * const weaviate = new WeaviateAdapter({
 *   url: 'http://localhost:8080'
 * });
 * 
 * await weaviate.connect();
 * 
 * // Hybrid search (vector + text)
 * const result = await weaviate.hybridSearch(
 *   'Articles',
 *   'machine learning',
 *   queryEmbedding,
 *   { limit: 10 }
 * );
 * 
 * console.log(result.tonl); // Compressed results
 * ```
 */
export class WeaviateAdapter extends BaseVectorAdapter {
  private client: any = null;
  protected declare config: WeaviateConfig;

  /**
   * Create a new Weaviate adapter instance
   * 
   * @param config - Weaviate configuration
   * 
   * @example
   * ```typescript
   * // Local instance
   * const adapter = new WeaviateAdapter({
   *   url: 'http://localhost:8080'
   * });
   * 
   * // Weaviate Cloud Services (WCS)
   * const wcsAdapter = new WeaviateAdapter({
   *   url: 'https://my-cluster.weaviate.network',
   *   apiKey: process.env.WEAVIATE_API_KEY
   * });
   * 
   * // Custom scheme and host
   * const customAdapter = new WeaviateAdapter({
   *   scheme: 'https',
   *   host: 'weaviate.example.com',
   *   apiKey: 'your-api-key'
   * });
   * ```
   */
  constructor(config: WeaviateConfig) {
    super(config);
    this.config = config;
  }

  /**
   * Connect to Weaviate
   * 
   * Establishes connection and validates readiness.
   * 
   * @throws {Error} If connection fails or instance is not ready
   * 
   * @example
   * ```typescript
   * await weaviate.connect();
   * console.log('Connected to Weaviate');
   * ```
   */
  async connect(): Promise<void> {
    try {
      this.client = await createWeaviateClient({
        url: this.config.url,
        apiKey: this.config.apiKey,
        scheme: this.config.scheme,
        host: this.config.host,
      });

      await this.client.isReady();
      this.connected = true;
    } catch (error) {
      throw new Error(
        `Failed to connect to Weaviate: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from Weaviate
   * 
   * Cleans up client connection.
   * 
   * @example
   * ```typescript
   * await weaviate.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
  }

  /**
   * Search for similar vectors
   * 
   * Performs nearVector search using cosine distance.
   * Automatically converts distance to similarity score (1 - distance).
   * 
   * @param collectionName - Name of the collection (class)
   * @param vector - Query vector (embedding)
   * @param options - Search options
   * @returns Search results with scores and properties
   * 
   * @example
   * ```typescript
   * // Basic vector search
   * const results = await weaviate.search('Articles', embedding, {
   *   limit: 10
   * });
   * 
   * results.data.forEach(doc => {
   *   console.log(`${doc.id}: ${doc.score} - ${doc.title}`);
   * });
   * 
   * // With filtering (Weaviate uses GraphQL-style filters)
   * const filtered = await weaviate.search('Products', embedding, {
   *   limit: 5,
   *   filter: {
   *     where: {
   *       path: ['category'],
   *       operator: 'Equal',
   *       valueString: 'electronics'
   *     }
   *   }
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

    const collection = this.client.collections.get(collectionName);

    const response = await collection.query.nearVector(vector, {
      limit: options.limit || 10,
      returnMetadata: ['distance'],
    });

    const data = response.objects.map((obj: any) => ({
      id: obj.uuid,
      score: 1 - (obj.metadata?.distance || 0),
      ...obj.properties,
    }));

    return {
      data,
      rowCount: data.length,
    };
  }

  /**
   * Search and convert results to TONL format
   * 
   * Performs vector search and converts to TONL for 40-60% token savings.
   * 
   * @param collectionName - Name of the collection
   * @param vector - Query vector
   * @param options - Search options
   * @returns Search results in TONL format
   * 
   * @example
   * ```typescript
   * const result = await weaviate.searchToTonl('Articles', embedding, {
   *   limit: 5
   * });
   * 
   * console.log(result.tonl);
   * // Articles[5]{id:str,score:float,title:str,content:str}:
   * //   "uuid-1", 0.95, "AI Overview", "Artificial intelligence..."
   * //   "uuid-2", 0.88, "ML Basics", "Machine learning is..."
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
   * Performs search and provides detailed token analysis.
   * 
   * @param collectionName - Name of the collection
   * @param vector - Query vector
   * @param options - Search options with model selection
   * @returns Results with token statistics
   * 
   * @example
   * ```typescript
   * const result = await weaviate.searchWithStats('Articles', embedding, {
   *   limit: 10,
   *   model: 'gpt-4o'
   * });
   * 
   * console.log(`JSON: ${result.stats.originalTokens} tokens`);
   * console.log(`TONL: ${result.stats.compressedTokens} tokens`);
   * console.log(`Saved: ${result.stats.savingsPercent}%`);
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
   * Create a new collection (class)
   * 
   * Creates a collection with optional property definitions.
   * Weaviate uses "class" terminology but we call it collection for consistency.
   * 
   * @param name - Collection name (must start with capital letter)
   * @param properties - Optional property definitions
   * 
   * @example
   * ```typescript
   * // Simple collection
   * await weaviate.createCollection('Articles');
   * 
   * // With property definitions
   * await weaviate.createCollection('Products', [
   *   { name: 'title', dataType: 'text' },
   *   { name: 'price', dataType: 'number' },
   *   { name: 'inStock', dataType: 'boolean' }
   * ]);
   * ```
   */
  async createCollection(
    name: string,
    properties?: Array<{ name: string; dataType: string }>
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    await this.client.collections.create({
      name,
      ...(properties && { properties }),
    });
  }

  /**
   * Insert objects into collection
   * 
   * Inserts multiple objects. Weaviate can auto-generate vectors
   * if vectorization module is configured.
   * 
   * @param collectionName - Name of the collection
   * @param objects - Array of objects to insert
   * 
   * @example
   * ```typescript
   * // Weaviate auto-generates vectors if module configured
   * await weaviate.insert('Articles', [
   *   {
   *     title: 'Getting Started',
   *     content: 'This is an introduction...',
   *     category: 'tutorial'
   *   },
   *   {
   *     title: 'Advanced Guide',
   *     content: 'Deep dive into...',
   *     category: 'advanced'
   *   }
   * ]);
   * ```
   */
  async insert(
    collectionName: string,
    objects: Array<Record<string, unknown>>
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    const collection = this.client.collections.get(collectionName);
    await collection.data.insertMany(objects);
  }

  /**
   * Delete a collection
   * 
   * Permanently deletes the collection and all its data.
   * 
   * @param name - Name of the collection to delete
   * 
   * @example
   * ```typescript
   * await weaviate.deleteCollection('OldArticles');
   * console.log('Collection deleted');
   * ```
   */
  async deleteCollection(name: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.collections.delete(name);
  }

  /**
   * List all collections
   * 
   * Returns names of all collections (classes) in the database.
   * 
   * @returns Array of collection names
   * 
   * @example
   * ```typescript
   * const collections = await weaviate.listCollections();
   * console.log('Available collections:', collections);
   * // ['Articles', 'Products', 'Users']
   * ```
   */
  async listCollections(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected');

    const collections = await this.client.collections.listAll();
    return Object.keys(collections);
  }

  /**
   * Hybrid search (vector + keyword)
   * 
   * Combines vector similarity search with keyword search (BM25).
   * Weaviate automatically weights and fuses both result sets.
   * 
   * **Best for:**
   * - Finding results that match both semantically AND lexically
   * - When exact keyword matches are important
   * - Improving recall with fallback to keyword search
   * 
   * @param collectionName - Name of the collection
   * @param query - Text query for keyword search
   * @param vector - Query vector for semantic search
   * @param options - Search options
   * @returns Combined search results
   * 
   * @example
   * ```typescript
   * // Hybrid search finds semantically similar + keyword matches
   * const results = await weaviate.hybridSearch(
   *   'Articles',
   *   'machine learning algorithms',
   *   queryEmbedding,
   *   { limit: 10 }
   * );
   * 
   * // Results contain both:
   * // - Articles semantically similar to the query
   * // - Articles with exact keyword matches
   * results.data.forEach(doc => {
   *   console.log(`${doc.title}: ${doc.score}`);
   * });
   * ```
   */
  async hybridSearch(
    collectionName: string,
    query: string,
    vector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorQueryResult> {
    if (!this.client || !this.connected) {
      throw new Error('Database not connected');
    }

    const collection = this.client.collections.get(collectionName);

    const response = await collection.query.hybrid(query, {
      vector,
      limit: options.limit || 10,
      returnMetadata: ['score'],
    });

    const data = response.objects.map((obj: any) => ({
      id: obj.uuid,
      score: obj.metadata?.score || 0,
      ...obj.properties,
    }));

    return {
      data,
      rowCount: data.length,
    };
  }
}
