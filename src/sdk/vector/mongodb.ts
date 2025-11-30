import { BaseVectorAdapter } from './base.js';
import { createMongoDBClient } from '../loaders/mongodb-loader.js';
import { jsonToTonl } from '../../core/json-to-tonl.js';
import { countTokens } from '../../utils/token-counter.js';
import type {
  MongoDBConfig,
  MongoDBSearchOptions,
  MongoDBHybridSearchOptions,
  MongoDBInsertOptions,
  CollectionTemplate,
  NestedAnalysis,
  CostBreakdown,
  IndexRecommendation
} from './types.js';

const COLLECTION_TEMPLATES: Record<CollectionTemplate, any> = {
  'rag-documents': {
    description: 'RAG (Retrieval-Augmented Generation) document storage',
    fields: {
      content: { type: 'string', description: 'Document text content' },
      embedding: { type: 'vector', description: 'Vector embedding of content' },
      metadata: { type: 'object', description: 'Document metadata' },
      timestamp: { type: 'date', description: 'Creation timestamp' },
      source: { type: 'string', description: 'Document source' }
    },
    vectorIndex: {
      field: 'embedding',
      dimensions: 1536,
      similarity: 'cosine'
    },
    indexes: [
      { field: 'timestamp', type: 'filter' },
      { field: 'source', type: 'filter' }
    ]
  },
  'product-catalog': {
    description: 'E-commerce product catalog with semantic search',
    fields: {
      name: { type: 'string', description: 'Product name' },
      description: { type: 'string', description: 'Product description' },
      embedding: { type: 'vector', description: 'Product embedding' },
      price: { type: 'number', description: 'Product price' },
      category: { type: 'string', description: 'Product category' },
      inStock: { type: 'boolean', description: 'Availability status' }
    },
    vectorIndex: {
      field: 'embedding',
      dimensions: 768,
      similarity: 'cosine'
    },
    indexes: [
      { field: 'category', type: 'filter' },
      { field: 'price', type: 'filter' },
      { field: 'inStock', type: 'filter' }
    ]
  },
  'user-profiles': {
    description: 'User profiles with preference embeddings',
    fields: {
      userId: { type: 'string', description: 'Unique user ID' },
      preferences: { type: 'object', description: 'User preferences' },
      embedding: { type: 'vector', description: 'User preference embedding' },
      tags: { type: 'array', description: 'User interest tags' },
      createdAt: { type: 'date', description: 'Profile creation date' }
    },
    vectorIndex: {
      field: 'embedding',
      dimensions: 512,
      similarity: 'dotProduct'
    },
    indexes: [
      { field: 'userId', type: 'unique' },
      { field: 'tags', type: 'filter' }
    ]
  },
  'semantic-cache': {
    description: 'Semantic caching for LLM responses',
    fields: {
      query: { type: 'string', description: 'Original query' },
      embedding: { type: 'vector', description: 'Query embedding' },
      response: { type: 'string', description: 'Cached response' },
      metadata: { type: 'object', description: 'Cache metadata' },
      hits: { type: 'number', description: 'Cache hit count' },
      lastAccessed: { type: 'date', description: 'Last access time' }
    },
    vectorIndex: {
      field: 'embedding',
      dimensions: 1536,
      similarity: 'cosine'
    },
    indexes: [
      { field: 'lastAccessed', type: 'filter' }
    ]
  }
};

/**
 * Validation helpers
 */
function validateCollectionName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Collection name must be a non-empty string');
  }
  if (name.length > 120) {
    throw new Error('Collection name must be less than 120 characters');
  }
  if (name.startsWith('system.')) {
    throw new Error('Collection name cannot start with "system."');
  }
  if (name.includes('$')) {
    throw new Error('Collection name cannot contain "$"');
  }
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

export class MongoDBAdapter extends BaseVectorAdapter {
  private client: any = null;
  private db: any = null;
  private config: MongoDBConfig;
  private queryStats = new Map<string, { count: number; totalTime: number; avgTime: number }>();
  private readonly defaultBatchSize: number;
  private readonly maxRetries: number;

  constructor(config: MongoDBConfig) {
    super();
    this.config = config;
    this.defaultBatchSize = config.batchSize || 1000;
    this.maxRetries = config.maxRetries || 3;
    
    if (!config.uri || typeof config.uri !== 'string') {
      throw new Error('MongoDB URI is required and must be a string');
    }
    if (!config.database || typeof config.database !== 'string') {
      throw new Error('Database name is required and must be a string');
    }
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      this.client = await createMongoDBClient(
        this.config.uri,
        this.config.options,
        this.maxRetries
      );
      this.db = this.client.db(this.config.database);
      this.connected = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to MongoDB: ${message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.close();
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    } finally {
      this.connected = false;
      this.client = null;
      this.db = null;
    }
  }

  private getCollection(name: string): any {
    this.ensureConnected();
    validateCollectionName(name);
    return this.db!.collection(name);
  }

  async search(
    collectionName: string,
    vector: number[],
    options: MongoDBSearchOptions = {}
  ): Promise<any[]> {
    validateVector(vector, 'query vector');
    
    const startTime = Date.now();
    const collection = this.getCollection(collectionName);

    const limit = validateLimit(options.limit, 1000);
    const numCandidates = options.numCandidates || Math.min(limit * 10, 10000);
    const indexName = options.indexName || 'vector_index';
    const vectorPath = options.vectorPath || 'embedding';
    const exact = options.exact || false;

    if (numCandidates < limit) {
      throw new Error('numCandidates must be greater than or equal to limit');
    }

    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: indexName,
          path: vectorPath,
          queryVector: vector,
          numCandidates: exact ? limit : numCandidates,
          limit,
          ...(options.preFilter && { filter: options.preFilter })
        }
      }
    ];

    pipeline.push({
      $addFields: {
        score: { $meta: 'vectorSearchScore' }
      }
    });

    if (options.select && options.select.length > 0) {
      const projection: any = { score: 1 };
      options.select.forEach((field: string) => {
        projection[field] = 1;
      });
      pipeline.push({ $project: projection });
    }

    try {
      const results = await collection.aggregate(pipeline).toArray();
      this.updateQueryStats(collectionName, Date.now() - startTime);
      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Vector search failed: ${message}`);
    }
  }

  async hybridSearch(
    collectionName: string,
    options: MongoDBHybridSearchOptions
  ): Promise<any[]> {
    const { vector, textQuery, vectorWeight = 0.7, textWeight = 0.3, limit = 10 } = options;

    if (vectorWeight < 0 || vectorWeight > 1) {
      throw new Error('vectorWeight must be between 0 and 1');
    }
    if (textWeight < 0 || textWeight > 1) {
      throw new Error('textWeight must be between 0 and 1');
    }
    if (Math.abs(vectorWeight + textWeight - 1) > 0.01) {
      throw new Error('vectorWeight + textWeight should equal 1.0');
    }

    if (!vector && !textQuery) {
      throw new Error('Either vector or textQuery must be provided for hybrid search');
    }

    if (vector && !textQuery) {
      return this.search(collectionName, vector, options);
    }

    const collection = this.getCollection(collectionName);

    if (!vector && textQuery) {
      try {
        return await collection
          .find({ $text: { $search: textQuery } })
          .limit(validateLimit(limit))
          .toArray();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Text search failed: ${message}`);
      }
    }

    const searchLimit = validateLimit(limit * 2, 2000);

    const [vectorResults, textResults] = await Promise.all([
      vector ? this.search(collectionName, vector, { ...options, limit: searchLimit }) : Promise.resolve([]),
      textQuery ? collection.find({ $text: { $search: textQuery } }).limit(searchLimit).toArray() : Promise.resolve([])
    ]);

    const combinedScores = new Map<string, { doc: any; score: number }>();

    vectorResults.forEach((doc: any) => {
      const id = doc._id.toString();
      combinedScores.set(id, {
        doc,
        score: (doc.score || 0) * vectorWeight
      });
    });

    textResults.forEach((doc: any) => {
      const id = doc._id.toString();
      const existing = combinedScores.get(id);
      const textScore = (doc.score || 0.5) * textWeight;

      if (existing) {
        existing.score += textScore;
      } else {
        combinedScores.set(id, {
          doc: { ...doc, score: textScore },
          score: textScore
        });
      }
    });

    return Array.from(combinedScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, validateLimit(limit))
      .map((item: any) => ({
        ...item.doc,
        hybridScore: item.score,
        vectorWeight,
        textWeight
      }));
  }

  async searchToTonl(
    collectionName: string,
    vector: number[],
    options: MongoDBSearchOptions = {}
  ): Promise<string> {
    const results = await this.search(collectionName, vector, options);
    return jsonToTonl(results);
  }

  private detectNestedObjects(results: any[]): NestedAnalysis {
    if (results.length === 0) {
      return {
        hasNested: false,
        maxDepth: 0,
        additionalSavings: 0,
        nestedFields: []
      };
    }

    let maxDepth = 0;
    const nestedFields = new Set<string>();

    const calculateDepth = (obj: any, currentDepth = 0, path = ''): number => {
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return currentDepth;
      }

      let depth = currentDepth;
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          nestedFields.add(currentPath);
          const childDepth = calculateDepth(value, currentDepth + 1, currentPath);
          depth = Math.max(depth, childDepth);
        }
      }

      return depth;
    };

    results.forEach((result: any) => {
      const depth = calculateDepth(result);
      maxDepth = Math.max(maxDepth, depth);
    });

    const additionalSavings = maxDepth * 15;

    return {
      hasNested: maxDepth > 0,
      maxDepth,
      additionalSavings,
      nestedFields: Array.from(nestedFields)
    };
  }

  async searchWithStats(
    collectionName: string,
    vector: number[],
    options: MongoDBSearchOptions = {}
  ): Promise<{
    results: any[];
    tonl: string;
    stats: {
      originalTokens: number;
      tonlTokens: number;
      savingsPercentage: number;
      totalSavings: number;
      nestedAnalysis: NestedAnalysis;
      message?: string;
    };
  }> {
    const results = await this.search(collectionName, vector, options);
    const tonl = jsonToTonl(results);

    const originalJson = JSON.stringify(results);
    const originalTokens = countTokens(originalJson);
    const tonlTokens = countTokens(tonl);
    
    // Safe division
    const baseSavingsPercentage = originalTokens > 0 
      ? ((originalTokens - tonlTokens) / originalTokens) * 100
      : 0;

    const nestedAnalysis = this.detectNestedObjects(results);
    const totalSavings = baseSavingsPercentage + nestedAnalysis.additionalSavings;

    let message: string | undefined;
    if (nestedAnalysis.hasNested) {
      message = `🎯 Nested objects detected! ${nestedAnalysis.additionalSavings}% extra savings from ${nestedAnalysis.maxDepth}-level nesting!`;
    }

    return {
      results,
      tonl,
      stats: {
        originalTokens,
        tonlTokens,
        savingsPercentage: Math.max(0, baseSavingsPercentage),
        totalSavings: Math.max(0, totalSavings),
        nestedAnalysis,
        message
      }
    };
  }

  calculateMonthlyCost(
    stats: { originalTokens: number; tonlTokens: number; savingsPercentage: number },
    queriesPerDay: number,
    tokenCostPer1M: number = 3.0
  ): CostBreakdown {
    if (queriesPerDay < 0 || !Number.isFinite(queriesPerDay)) {
      throw new Error('queriesPerDay must be a positive finite number');
    }
    if (tokenCostPer1M < 0 || !Number.isFinite(tokenCostPer1M)) {
      throw new Error('tokenCostPer1M must be a positive finite number');
    }

    const monthlyQueries = queriesPerDay * 30;
    const monthlyTokensBefore = stats.originalTokens * monthlyQueries;
    const monthlyTokensAfter = stats.tonlTokens * monthlyQueries;

    const costBefore = (monthlyTokensBefore / 1_000_000) * tokenCostPer1M;
    const costAfter = (monthlyTokensAfter / 1_000_000) * tokenCostPer1M;
    const monthlySavings = Math.max(0, costBefore - costAfter);
    const annualSavings = monthlySavings * 12;

    return {
      costBefore: `$${costBefore.toFixed(2)}/month`,
      costAfter: `$${costAfter.toFixed(2)}/month`,
      monthlySavings: `$${monthlySavings.toFixed(2)}/month`,
      annualSavings: `$${annualSavings.toFixed(2)}/year`,
      percentageSaved: Math.max(0, stats.savingsPercentage),
      queriesPerDay
    };
  }

  async createFromTemplate(
    collectionName: string,
    template: CollectionTemplate
  ): Promise<void> {
    validateCollectionName(collectionName);

    const templateDef = COLLECTION_TEMPLATES[template];
    if (!templateDef) {
      throw new Error(`Unknown template: ${template}. Available templates: ${Object.keys(COLLECTION_TEMPLATES).join(', ')}`);
    }

    const collection = this.getCollection(collectionName);
    const { field, dimensions, similarity } = templateDef.vectorIndex;

    try {
      await collection.createSearchIndex({
        name: 'vector_index',
        type: 'vectorSearch',
        definition: {
          fields: [
            {
              type: 'vector',
              path: field,
              numDimensions: dimensions,
              similarity
            },
            ...templateDef.indexes
              .filter((idx: any) => idx.type === 'filter')
              .map((idx: any) => ({
                type: 'filter',
                path: idx.field
              }))
          ]
        }
      });

      console.log(`✅ Created collection '${collectionName}' from template '${template}'`);
      console.log(`   Vector index: ${field} (${dimensions} dimensions, ${similarity})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create collection from template: ${message}`);
    }
  }

  static getTemplates(): Record<CollectionTemplate, any> {
    return COLLECTION_TEMPLATES;
  }

  async suggestIndexes(collectionName: string, sampleSize: number = 100): Promise<IndexRecommendation[]> {
    if (sampleSize < 1 || sampleSize > 1000) {
      throw new Error('sampleSize must be between 1 and 1000');
    }

    const collection = this.getCollection(collectionName);

    let samples: any[];
    try {
      samples = await collection.find().limit(sampleSize).toArray();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch samples: ${message}`);
    }

    if (samples.length === 0) {
      return [];
    }

    const recommendations: IndexRecommendation[] = [];
    const fieldTypes = new Map<string, Set<string>>();

    samples.forEach((doc: any) => {
      Object.entries(doc).forEach(([key, value]) => {
        if (!fieldTypes.has(key)) {
          fieldTypes.set(key, new Set());
        }

        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number' && value.length > 100) {
          fieldTypes.get(key)!.add('vector');
        } else if (typeof value === 'string') {
          fieldTypes.get(key)!.add('text');
        } else {
          fieldTypes.get(key)!.add(typeof value);
        }
      });
    });

    fieldTypes.forEach((types, field) => {
      if (field === '_id') return;

      if (types.has('vector')) {
        recommendations.push({
          field,
          type: 'vector',
          reason: 'Detected vector field - enable semantic search',
          estimatedSpeedup: '10-100x faster than full scan'
        });
      } else if (types.has('string')) {
        const sampleValues = samples.map((s: any) => s[field]).filter(Boolean);
        if (sampleValues.length === 0) return;
        
        const uniqueRatio = new Set(sampleValues).size / sampleValues.length;

        if (uniqueRatio > 0.7) {
          recommendations.push({
            field,
            type: 'filter',
            reason: 'High cardinality field - good for filtering',
            estimatedSpeedup: '5-20x faster queries'
          });
        } else if (uniqueRatio < 0.3) {
          recommendations.push({
            field,
            type: 'filter',
            reason: 'Low cardinality field - good for grouping/filtering',
            estimatedSpeedup: '3-10x faster queries'
          });
        }
      }
    });

    return recommendations;
  }

  async insert(
    collectionName: string,
    documents: any[],
    options: MongoDBInsertOptions = {}
  ): Promise<void> {
    if (!Array.isArray(documents)) {
      throw new Error('Documents must be an array');
    }
    if (documents.length === 0) {
      return;
    }

    const collection = this.getCollection(collectionName);
    const batchSize = options.batchSize || this.defaultBatchSize;

    try {
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        await collection.insertMany(batch, { ordered: options.ordered !== false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Insert failed: ${message}`);
    }
  }

  async insertBatch(
    collectionName: string,
    documents: any[],
    onProgress?: (percent: number) => void,
    options: MongoDBInsertOptions = {}
  ): Promise<void> {
    if (!Array.isArray(documents)) {
      throw new Error('Documents must be an array');
    }
    if (documents.length === 0) {
      return;
    }

    const collection = this.getCollection(collectionName);
    const batchSize = options.batchSize || this.defaultBatchSize;

    try {
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        await collection.insertMany(batch, { ordered: options.ordered !== false });

        if (onProgress) {
          const percent = Math.round(((i + batch.length) / documents.length) * 100);
          onProgress(Math.min(100, percent));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Batch insert failed at batch ${Math.floor(documents.length / batchSize)}: ${message}`);
    }
  }

  async deleteCollection(collectionName: string): Promise<void> {
    const collection = this.getCollection(collectionName);
    
    try {
      await collection.drop();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('ns not found')) {
        return; // Collection doesn't exist, that's fine
      }
      throw new Error(`Failed to delete collection: ${message}`);
    }
  }

  async listCollections(): Promise<string[]> {
    this.ensureConnected();
    
    try {
      const collections = await this.db!.listCollections().toArray();
      return collections.map((c: any) => c.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list collections: ${message}`);
    }
  }

  async getCollectionStats(collectionName: string): Promise<any> {
    const collection = this.getCollection(collectionName);
    
    try {
      return await collection.stats();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get collection stats: ${message}`);
    }
  }

  private updateQueryStats(collectionName: string, duration: number): void {
    const current = this.queryStats.get(collectionName) || {
      count: 0,
      totalTime: 0,
      avgTime: 0
    };

    current.count++;
    current.totalTime += duration;
    current.avgTime = current.totalTime / current.count;

    this.queryStats.set(collectionName, current);

    if (duration > 1000) {
      console.warn(
        `⚠️  Slow query on '${collectionName}' (${duration}ms). ` +
        `Consider adding vector index or optimizing filters.`
      );
    }
  }

  getQueryStats(): Map<string, { count: number; totalTime: number; avgTime: number }> {
    return new Map(this.queryStats);
  }

  clearQueryStats(): void {
    this.queryStats.clear();
  }

  async analyzeCollection(collectionName: string): Promise<{
    vectorFields: string[];
    textFields: string[];
    metadataFields: string[];
    suggestedTonlFields: string[];
    estimatedSavings: number;
    indexRecommendations: IndexRecommendation[];
  }> {
    const collection = this.getCollection(collectionName);

    let sample: any;
    try {
      sample = await collection.findOne();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to analyze collection: ${message}`);
    }

    if (!sample) {
      throw new Error(`Collection '${collectionName}' is empty`);
    }

    const vectorFields: string[] = [];
    const textFields: string[] = [];
    const metadataFields: string[] = [];

    Object.entries(sample).forEach(([key, value]) => {
      if (key === '_id') return;

      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number' && value.length > 100) {
        vectorFields.push(key);
      } else if (typeof value === 'string') {
        textFields.push(key);
      } else if (typeof value === 'object' && value !== null) {
        metadataFields.push(key);
      }
    });

    const suggestedTonlFields = [...textFields, ...metadataFields];
    const estimatedSavings = suggestedTonlFields.length > 0 ? 35 : 0;

    const indexRecommendations = await this.suggestIndexes(collectionName);

    return {
      vectorFields,
      textFields,
      metadataFields,
      suggestedTonlFields,
      estimatedSavings,
      indexRecommendations
    };
  }
}
