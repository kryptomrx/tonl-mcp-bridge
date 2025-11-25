import { MilvusClient, DataType, ConsistencyLevelEnum } from '@zilliz/milvus2-sdk-node';
import { BaseVectorAdapter } from './base-vector.js';
import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateRealSavings } from '../../utils/tokenizer.js';
import type { MilvusConfig, VectorSearchOptions } from './types.js';
import type { VectorQueryResult, VectorTonlResult, VectorStatsResult } from './qdrant.js';
import type { ModelName } from '../adapters/types.js';

export class MilvusAdapter extends BaseVectorAdapter {
  private client: MilvusClient | null = null;
  protected declare config: MilvusConfig;

  constructor(config: MilvusConfig) {
    super(config);
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      this.client = new MilvusClient({
        address: this.config.address,
        username: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl,
        token: this.config.token,
      });

      await this.client.checkHealth();
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to Milvus: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.closeConnection();
      this.client = null;
    }
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

    // FIX: Map string option to Milvus Enum
    let consistencyLevel = ConsistencyLevelEnum.Bounded;
    if (options.consistencyLevel === 'Strong') consistencyLevel = ConsistencyLevelEnum.Strong;
    if (options.consistencyLevel === 'Session') consistencyLevel = ConsistencyLevelEnum.Session;
    if (options.consistencyLevel === 'Eventually') consistencyLevel = ConsistencyLevelEnum.Eventually;

    const filterExpr = typeof options.filter === 'string' ? options.filter : undefined;

    const searchParams = {
      collection_name: collectionName,
      // FIX: Wrap vector in array for batch compatibility
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