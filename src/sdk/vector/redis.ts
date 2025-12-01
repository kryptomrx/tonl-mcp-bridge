import { BaseVectorAdapter } from './base-vector.js';
import { loadRedis } from '../loaders/redis-loader.js';
import { jsonToTonl } from '../../core/json-to-tonl.js';
import { calculateSavings } from '../../utils/token-counter.js';
import type {
  RedisConfig,
  RedisSearchOptions,
  RedisIndexOptions
} from './types.js';

export interface VectorQueryResult {
  data: Array<{
    id: string | number;
    score: number;
    payload?: Record<string, unknown>;
  }>;
  rowCount: number;
}

export interface VectorTonlResult {
  tonl: string;
  data: Array<{
    id: string | number;
    score: number;
    payload?: Record<string, unknown>;
  }>;
  rowCount: number;
}

export interface VectorStatsResult extends VectorTonlResult {
  stats: {
    originalTokens: number;
    compressedTokens: number;
    savedTokens: number;
    savingsPercent: number;
    nestedSavings?: number;
    totalSavings?: number;
  };
}

function validateVector(vector: number[], fieldName: string = 'vector'): void {
  if (!Array.isArray(vector)) {
    throw new Error(`${fieldName} must be an array`);
  }
  if (vector.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  if (!vector.every(n => typeof n === 'number' && !isNaN(n) && isFinite(n))) {
    throw new Error(`${fieldName} must contain only valid numbers`);
  }
}

function validateIndexName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Index name must be a non-empty string');
  }
  if (name.length > 100) {
    throw new Error('Index name must be less than 100 characters');
  }
}

function validateLimit(limit: number | undefined, maxLimit: number = 1000): number {
  if (limit === undefined) return 10;
  if (typeof limit !== 'number' || limit < 1 || !Number.isInteger(limit)) {
    throw new Error('Limit must be a positive integer');
  }
  if (limit > maxLimit) {
    throw new Error(`Limit cannot exceed ${maxLimit}`);
  }
  return limit;
}

export class RedisAdapter extends BaseVectorAdapter {
  private client: any = null;
  private hasJSON: boolean = false;
  private hasSearch: boolean = false;
  private indexPrefix: string;
  private semanticCache = new Map<string, { 
    result: VectorQueryResult; 
    timestamp: number; 
    ttl: number 
  }>();

  constructor(config: RedisConfig = {}) {
    super(config);
    this.indexPrefix = config.indexPrefix || 'tonl:vector';
  }

  async connect(): Promise<void> {
    const result = await loadRedis({
      url: this.config.url,
      host: (this.config as RedisConfig).host,
      port: (this.config as RedisConfig).port,
      password: (this.config as RedisConfig).password,
      database: (this.config as RedisConfig).database,
      username: (this.config as RedisConfig).username,
    });
    
    this.client = result.client;
    this.hasJSON = result.moduleInfo.hasJSON;
    this.hasSearch = result.moduleInfo.hasSearch;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        // Ignore
      }
    }
    this.client = null;
    this.connected = false;
  }

  async createIndex(
    indexName: string,
    options: RedisIndexOptions
  ): Promise<void> {
    if (!this.client || !this.connected) {
      throw new Error('Redis not connected');
    }

    validateIndexName(indexName);

    const {
      dimensions,
      algorithm = 'HNSW',
      distanceMetric = 'COSINE',
      m = 16,
      efConstruction = 200,
      quantization = 'NONE',
      textFields = [],
      numericFields = [],
      tagFields = [],
      geoFields = []
    } = options;

    const schema: string[] = [];

    const vectorParams: Record<string, string | number> = {
      TYPE: 'FLOAT32',
      DIM: dimensions,
      DISTANCE_METRIC: distanceMetric
    };

    if (algorithm === 'HNSW') {
      vectorParams.M = m;
      vectorParams.EF_CONSTRUCTION = efConstruction;
    }

    if (quantization === 'BINARY') {
      vectorParams.QUANTIZATION = 'BINARY';
    } else if (quantization === 'SCALAR') {
      vectorParams.QUANTIZATION = 'SCALAR_8BIT';
    }

    schema.push(
      '$.vector',
      'VECTOR',
      algorithm,
      String(Object.keys(vectorParams).length * 2),
      ...Object.entries(vectorParams).flat().map(String),
      'AS',
      'vector'
    );

    textFields.forEach((field: string) => {
      schema.push(`$.${field}`, 'TEXT', 'AS', field);
    });

    numericFields.forEach((field: string) => {
      schema.push(`$.${field}`, 'NUMERIC', 'AS', field);
    });

    tagFields.forEach((field: string) => {
      schema.push(`$.${field}`, 'TAG', 'AS', field);
    });

    geoFields.forEach((field: string) => {
      schema.push(`$.${field}`, 'GEO', 'AS', field);
    });

    await this.client.sendCommand([
      'FT.CREATE',
      `${this.indexPrefix}:${indexName}`,
      'ON', 'JSON',
      'PREFIX', '1', `${this.indexPrefix}:${indexName}:`,
      'SCHEMA',
      ...schema
    ]);
  }

  async search(
    indexName: string,
    vector: number[],
    options: RedisSearchOptions = {}
  ): Promise<VectorQueryResult> {
    if (!this.client || !this.connected) {
      throw new Error('Redis not connected');
    }

    validateIndexName(indexName);
    validateVector(vector);

    const limit = validateLimit(options.limit);
    const {
      textQuery,
      numericFilters,
      tagFilters,
      geoFilter,
      returnFields = [],
      useSemanticCache = false,
      cacheTTL = 3600,
      similarityThreshold = 0.95
    } = options;

    if (useSemanticCache) {
      const cached = this.checkSemanticCache(vector, similarityThreshold);
      if (cached) {
        return cached;
      }
    }

    const filters: string[] = [];

    if (textQuery) {
      filters.push(textQuery);
    }

    if (numericFilters) {
      Object.entries(numericFilters).forEach(([field, range]) => {
        const min = (range as { min?: number; max?: number }).min ?? '-inf';
        const max = (range as { min?: number; max?: number }).max ?? '+inf';
        filters.push(`@${field}:[${min} ${max}]`);
      });
    }

    if (tagFilters) {
      Object.entries(tagFilters).forEach(([field, value]) => {
        const values = Array.isArray(value) ? value : [value];
        filters.push(`@${field}:{${values.join('|')}}`);
      });
    }

    if (geoFilter) {
      const { field, latitude, longitude, radius, unit = 'km' } = geoFilter;
      filters.push(`@${field}:[${longitude} ${latitude} ${radius} ${unit}]`);
    }

    const baseQuery = filters.length > 0 ? `(${filters.join(' ')})` : '*';
    const vectorQuery = `${baseQuery}=>[KNN ${limit} @vector $BLOB AS vector_score]`;

    const vectorBuffer = Buffer.from(new Float32Array(vector).buffer);

    const results = await this.client.ft.search(
      `${this.indexPrefix}:${indexName}`,
      vectorQuery,
      {
        PARAMS: {
          BLOB: vectorBuffer
        },
        SORTBY: {
          BY: 'vector_score',
          DIRECTION: 'ASC'
        },
        LIMIT: {
          from: 0,
          size: limit
        },
        DIALECT: 2,
        RETURN: returnFields.length > 0 ? returnFields : undefined
      }
    );

    const formatted = this.formatSearchResults(results);

    if (useSemanticCache && formatted.data.length > 0) {
      this.addToSemanticCache(vector, formatted, cacheTTL);
    }

    return formatted;
  }

  async insert(
    indexName: string,
    id: string,
    data: Record<string, any>,
    vector: number[]
  ): Promise<void> {
    if (!this.client || !this.connected) {
      throw new Error('Redis not connected');
    }

    validateIndexName(indexName);
    validateVector(vector);

    const document = {
      ...data,
      vector
    };

    if (this.hasJSON) {
      const nestedDepth = this.detectNestingDepth(data);
      if (nestedDepth > 1) {
        const additionalSavings = (nestedDepth - 1) * 15;
        console.log(
          `Nested object detected (depth: ${nestedDepth}), ` +
          `additional TONL savings: ~${additionalSavings}%`
        );
      }
    }

    await this.client.json.set(
      `${this.indexPrefix}:${indexName}:${id}`,
      '$',
      document as any
    );
  }

  async insertBatch(
    indexName: string,
    documents: Array<{ id: string; data: Record<string, any>; vector: number[] }>
  ): Promise<void> {
    if (!this.client || !this.connected) {
      throw new Error('Redis not connected');
    }

    validateIndexName(indexName);

    const pipeline = this.client.multi();

    for (const doc of documents) {
      validateVector(doc.vector);
      
      const document = {
        ...doc.data,
        vector: doc.vector
      };

      pipeline.json.set(
        `${this.indexPrefix}:${indexName}:${doc.id}`,
        '$',
        document as any
      );
    }

    await pipeline.exec();
  }

  async searchToTonl(
    indexName: string,
    vector: number[],
    options: RedisSearchOptions = {}
  ): Promise<VectorTonlResult> {
    const results = await this.search(indexName, vector, options);
    
    const data = results.data.map(r => ({
      id: r.id,
      score: r.score,
      ...r.payload
    }));

    const tonl = jsonToTonl(data, indexName);

    return {
      tonl,
      data: results.data,
      rowCount: results.rowCount
    };
  }

  async searchWithStats(
    indexName: string,
    vector: number[],
    options: RedisSearchOptions = {}
  ): Promise<VectorStatsResult> {
    const results = await this.search(indexName, vector, options);
    
    const data = results.data.map(r => ({
      id: r.id,
      score: r.score,
      ...r.payload
    }));

    const tonl = jsonToTonl(data, indexName);
    const json = JSON.stringify(data);

    const savings = calculateSavings(json, tonl);

    let nestedSavings = 0;
    if (this.hasJSON && data.length > 0) {
      const avgDepth = data.reduce((sum, item) => 
        sum + this.detectNestingDepth(item), 0) / data.length;
      if (avgDepth > 1) {
        nestedSavings = (avgDepth - 1) * 15;
      }
    }

    const totalSavings = savings.savingsPercent + nestedSavings;

    return {
      tonl,
      data: results.data,
      rowCount: results.rowCount,
      stats: {
        originalTokens: savings.originalTokens,
        compressedTokens: savings.compressedTokens,
        savedTokens: savings.savedTokens,
        savingsPercent: savings.savingsPercent,
        nestedSavings,
        totalSavings
      }
    };
  }

  private formatSearchResults(results: any): VectorQueryResult {
    if (!results.documents || results.documents.length === 0) {
      return { data: [], rowCount: 0 };
    }

    const data = results.documents.map((doc: any) => ({
      id: doc.id.replace(`${this.indexPrefix}:`, '').split(':').pop() || doc.id,
      score: parseFloat(doc.value?.vector_score || '0'),
      payload: doc.value
    }));

    return {
      data,
      rowCount: results.total
    };
  }

  private checkSemanticCache(
    vector: number[],
    threshold: number
  ): VectorQueryResult | null {
    for (const [cachedVector, entry] of this.semanticCache) {
      if (Date.now() - entry.timestamp > entry.ttl * 1000) {
        this.semanticCache.delete(cachedVector);
        continue;
      }

      const similarity = this.cosineSimilarity(
        vector,
        JSON.parse(cachedVector)
      );
      
      if (similarity >= threshold) {
        return entry.result;
      }
    }
    return null;
  }

  private addToSemanticCache(
    vector: number[],
    result: VectorQueryResult,
    ttl: number
  ): void {
    const key = JSON.stringify(vector);
    this.semanticCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl
    });

    if (this.semanticCache.size > 1000) {
      const firstKey = this.semanticCache.keys().next().value;
      if (firstKey) {
        this.semanticCache.delete(firstKey);
      }
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magA === 0 || magB === 0) return 0;
    
    return dotProduct / (magA * magB);
  }

  private detectNestingDepth(obj: any, depth: number = 0): number {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return depth;
    }
    
    let maxDepth = depth;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const childDepth = this.detectNestingDepth(value, depth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }
    return maxDepth;
  }
}
