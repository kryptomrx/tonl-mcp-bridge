import { createPineconeClient } from '../loaders/pinecone-loader.js';
import { BaseVectorAdapter } from './base-vector.js';
import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import type { PineconeConfig, VectorSearchOptions } from './types.js';
import type { VectorQueryResult, VectorTonlResult, VectorStatsResult } from './qdrant.js';
import type { ModelName } from '../../utils/tokenizer.js';

export class PineconeAdapter extends BaseVectorAdapter {
  private client: any = null;
  protected declare config: PineconeConfig;

  constructor(config: PineconeConfig) {
    super(config);
    this.config = config;
  }

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

  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
  }

  private getIndex(indexName: string): any {
    if (!this.client) throw new Error('Not connected');
    return this.client.index(indexName);
  }

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

  async deleteVectors(
    indexName: string,
    ids: string[],
    namespace?: string
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    const index = this.getIndex(indexName);
    
    await index.deleteMany(ids, namespace);
  }

  async deleteIndex(name: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.deleteIndex(name);
  }

  async listIndexes(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected');
    
    const indexes = await this.client.listIndexes();
    return indexes.indexes?.map((idx: any) => idx.name) || [];
  }
}