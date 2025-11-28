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

export class QdrantAdapter extends BaseVectorAdapter {
  private client: QdrantClient | null = null;
  protected declare config: QdrantConfig;

  constructor(config: QdrantConfig = {}) {
    super({
      url: config.url || `http://${config.host || 'localhost'}:${config.port || 6333}`,
      apiKey: config.apiKey,
    });
    this.config = this.getConfig() as QdrantConfig;
  }

  async connect(): Promise<void> {
    this.client = await createQdrantClient({
      url: this.config.url!,
      apiKey: this.config.apiKey,
    });

    await this.client.getCollections();
    this.connected = true;
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

  async deleteCollection(name: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.deleteCollection(name);
  }
}