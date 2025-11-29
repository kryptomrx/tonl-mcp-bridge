import { createWeaviateClient } from '../loaders/weaviate-loader.js';
import { BaseVectorAdapter } from './base-vector.js';
import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import type { WeaviateConfig, VectorSearchOptions } from './types.js';
import type { VectorQueryResult, VectorTonlResult, VectorStatsResult } from './qdrant.js';
import type { ModelName } from '../../utils/tokenizer.js';

export class WeaviateAdapter extends BaseVectorAdapter {
  private client: any = null;
  protected declare config: WeaviateConfig;

  constructor(config: WeaviateConfig) {
    super(config);
    this.config = config;
  }

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

  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
  }

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

  async insert(
    collectionName: string,
    objects: Array<Record<string, unknown>>
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    const collection = this.client.collections.get(collectionName);
    await collection.data.insertMany(objects);
  }

  async deleteCollection(name: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.collections.delete(name);
  }

  async listCollections(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected');

    const collections = await this.client.collections.listAll();
    return Object.keys(collections);
  }

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