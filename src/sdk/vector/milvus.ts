import type { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { DataType, ConsistencyLevelEnum } from '@zilliz/milvus2-sdk-node';
import { createMilvusClient } from '../loaders/milvus-loader.js';
import { BaseVectorAdapter } from './base-vector.js';
import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import type { MilvusConfig, VectorSearchOptions } from './types.js';
import type { VectorQueryResult, VectorTonlResult, VectorStatsResult } from './qdrant.js';
import type { ModelName } from '../../utils/tokenizer.js';

/**
 * Milvus Vector Database Adapter
 * 
 * Milvus is an open-source vector database built for scalable similarity search
 * and AI applications. Can handle billions of vectors with high performance.
 * 
 * **Key Features:**
 * - Horizontal scalability (distributed architecture)
 * - Handles billions+ vectors
 * - Multiple index types (IVF, HNSW, ANNOY, etc.)
 * - Rich filtering with expressions
 * - TONL conversion for 40-60% token savings
 * - Strong consistency guarantees
 * - Cloud-native design
 * 
 * **Use Cases:**
 * - Large-scale semantic search (>100M vectors)
 * - Production recommendation systems
 * - Enterprise RAG applications
 * - Image/video similarity at scale
 * - Fraud detection and anomaly detection
 * 
 * @example
 * ```typescript
 * import { MilvusAdapter } from 'tonl-mcp-bridge';
 * 
 * // Connect to Milvus
 * const milvus = new MilvusAdapter({
 *   address: 'localhost:19530',
 *   username: 'admin',
 *   password: process.env.MILVUS_PASSWORD
 * });
 * 
 * await milvus.connect();
 * 
 * // Search with filtering
 * const result = await milvus.searchToTonl('products', embedding, {
 *   limit: 20,
 *   filter: 'price > 100 && category == "electronics"',
 *   outputFields: ['name', 'price', 'description'],
 *   consistencyLevel: 'Strong'
 * });
 * 
 * console.log(result.tonl); // Compressed results
 * ```
 */
export class MilvusAdapter extends BaseVectorAdapter {
  private client: MilvusClient | null = null;
  protected declare config: MilvusConfig;

  /**
   * Create a new Milvus adapter instance
   * 
   * @param config - Milvus connection configuration
   * 
   * @example
   * ```typescript
   * // Local instance
   * const adapter = new MilvusAdapter({
   *   address: 'localhost:19530'
   * });
   * 
   * // With authentication
   * const secureAdapter = new MilvusAdapter({
   *   address: 'milvus.example.com:19530',
   *   username: 'admin',
   *   password: process.env.MILVUS_PASSWORD,
   *   ssl: true
   * });
   * 
   * // Zilliz Cloud (managed Milvus)
   * const cloudAdapter = new MilvusAdapter({
   *   address: 'https://in01-abc123.aws-us-west-2.vectordb.zillizcloud.com:19530',
   *   token: process.env.ZILLIZ_TOKEN,
   *   ssl: true
   * });
   * ```
   */
  constructor(config: MilvusConfig) {
    super(config);
    this.config = config;
  }

  /**
   * Connect to Milvus
   * 
   * Establishes connection and validates health status.
   * 
   * @throws {Error} If connection fails or credentials are invalid
   * 
   * @example
   * ```typescript
   * await milvus.connect();
   * console.log('Connected to Milvus');
   * ```
   */
  async connect(): Promise<void> {
    try {
      this.client = await createMilvusClient({
        address: this.config.address,
        username: this.config.username,
        password: this.config.password,
        token: this.config.token,
      });

      await this.client.checkHealth();
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to Milvus: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from Milvus
   * 
   * Closes the connection and cleans up resources.
   * 
   * @example
   * ```typescript
   * await milvus.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.closeConnection();
      this.client = null;
    }
    this.connected = false;
  }

  /**
   * Search for similar vectors
   * 
   * Performs ANN (Approximate Nearest Neighbor) search with optional filtering.
   * Milvus uses expression-based filters similar to SQL WHERE clauses.
   * 
   * **Filter Expression Examples:**
   * - `'age > 25 && city == "NYC"'`
   * - `'price >= 100 and price <= 500'`
   * - `'category in ["tech", "science"]'`
   * - `'published == true && views > 1000'`
   * 
   * @param collectionName - Name of the collection
   * @param vector - Query vector (embedding)
   * @param options - Search options with filters
   * @returns Search results with scores and fields
   * 
   * @example
   * ```typescript
   * // Basic search
   * const results = await milvus.search('documents', embedding, {
   *   limit: 10,
   *   outputFields: ['title', 'content', 'category']
   * });
   * 
   * // Search with filter expression
   * const filtered = await milvus.search('products', embedding, {
   *   limit: 20,
   *   filter: 'price > 50 && category == "electronics"',
   *   outputFields: ['name', 'price', 'rating'],
   *   consistencyLevel: 'Strong'
   * });
   * 
   * // Complex filter
   * const complex = await milvus.search('articles', embedding, {
   *   limit: 10,
   *   filter: '(published == true && views > 1000) || featured == true',
   *   outputFields: ['*'], // All fields
   *   consistencyLevel: 'Bounded'
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

    let consistencyLevel = ConsistencyLevelEnum.Bounded;
    if (options.consistencyLevel === 'Strong') consistencyLevel = ConsistencyLevelEnum.Strong;
    if (options.consistencyLevel === 'Session') consistencyLevel = ConsistencyLevelEnum.Session;
    if (options.consistencyLevel === 'Eventually') consistencyLevel = ConsistencyLevelEnum.Eventually;

    const filterExpr = typeof options.filter === 'string' ? options.filter : undefined;

    const searchParams = {
      collection_name: collectionName,
      data: [vector],
      limit: options.limit || 10,
      output_fields: options.outputFields || ['*'],
      filter: filterExpr,
      consistency_level: consistencyLevel,
    };

    const response = await this.client.search(searchParams);

    if (response.status.error_code !== 'Success') {
      throw new Error(`Milvus search failed: ${response.status.reason}`);
    }

    const data = response.results.map((hit) => {
      const { id, score, ...payload } = hit;
      return {
        id,
        score,
        ...payload,
      };
    });

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
   * const result = await milvus.searchToTonl('products', embedding, {
   *   limit: 10,
   *   filter: 'in_stock == true && price < 1000',
   *   outputFields: ['name', 'price', 'description']
   * });
   * 
   * console.log(result.tonl);
   * // products[10]{id:i64,score:float,name:str,price:float,description:str}:
   * //   12345, 0.94, "Laptop Pro", 899.99, "High-performance laptop..."
   * //   67890, 0.91, "Desktop Elite", 799.99, "Powerful desktop..."
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
   * Performs search and provides detailed token analysis for cost optimization.
   * 
   * @param collectionName - Name of the collection
   * @param vector - Query vector
   * @param options - Search options with model selection
   * @returns Results with token statistics
   * 
   * @example
   * ```typescript
   * const result = await milvus.searchWithStats('docs', embedding, {
   *   limit: 50,
   *   model: 'gpt-4o',
   *   filter: 'category == "technical"'
   * });
   * 
   * console.log(`JSON: ${result.stats.originalTokens} tokens`);
   * console.log(`TONL: ${result.stats.compressedTokens} tokens`);
   * console.log(`Savings: ${result.stats.savingsPercent}%`);
   * 
   * // With 50 results:
   * // JSON: 8500 tokens
   * // TONL: 3400 tokens
   * // Savings: 60%
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
   * Creates a collection with vector field and automatic indexing.
   * Milvus automatically generates an optimized index (AUTOINDEX).
   * 
   * @param name - Collection name
   * @param dim - Vector dimension (e.g., 1536 for OpenAI ada-002)
   * @param metricType - Distance metric ('L2', 'IP', or 'COSINE')
   * 
   * @example
   * ```typescript
   * // For OpenAI embeddings (1536 dimensions)
   * await milvus.createCollection('my_docs', 1536, 'COSINE');
   * 
   * // For custom embeddings with L2 distance
   * await milvus.createCollection('custom_vectors', 768, 'L2');
   * 
   * // Inner product (for normalized vectors)
   * await milvus.createCollection('normalized_vecs', 512, 'IP');
   * 
   * console.log('Collection created and loaded');
   * ```
   */
  async createCollection(
    name: string,
    dim: number,
    metricType: string = 'L2'
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    await this.client.createCollection({
      collection_name: name,
      fields: [
        {
          name: 'id',
          description: 'ID field',
          data_type: DataType.Int64,
          is_primary_key: true,
          autoID: true,
        },
        {
          name: 'vector',
          description: 'Vector field',
          data_type: DataType.FloatVector,
          dim: dim,
        },
      ],
      enable_dynamic_field: true,
    });

    await this.client.createIndex({
      collection_name: name,
      field_name: 'vector',
      index_type: 'AUTOINDEX',
      metric_type: metricType,
    });
    
    await this.client.loadCollectionSync({ collection_name: name });
  }

  /**
   * Insert data into collection
   * 
   * Inserts vectors and metadata into the collection.
   * IDs are auto-generated. Dynamic fields are supported.
   * 
   * **Performance Tips:**
   * - Batch inserts for better performance (1000-10000 entities)
   * - Flush after large inserts for persistence
   * - Use consistent field names across entities
   * 
   * @param collectionName - Name of the collection
   * @param data - Array of entities with vectors and metadata
   * 
   * @example
   * ```typescript
   * // Insert single entity
   * await milvus.insert('documents', [
   *   {
   *     vector: [0.1, 0.2, ...], // 1536 dimensions
   *     title: 'Getting Started',
   *     category: 'tutorial',
   *     published: true,
   *     views: 1500
   *   }
   * ]);
   * 
   * // Batch insert
   * const entities = documents.map(doc => ({
   *   vector: doc.embedding,
   *   title: doc.title,
   *   content: doc.content,
   *   metadata: doc.metadata
   * }));
   * 
   * await milvus.insert('documents', entities);
   * console.log(`Inserted ${entities.length} documents`);
   * ```
   */
  async insert(
    collectionName: string,
    data: Array<Record<string, any>>
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    await this.client.insert({
      collection_name: collectionName,
      data: data,
    });
  }
}
