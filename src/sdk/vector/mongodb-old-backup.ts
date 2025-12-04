import { BaseVectorAdapter } from './base.js';
import { createMongoDBClient, loadMongoDBDriver } from '../loaders/mongodb-loader.js';
import { jsonToTonl } from '../../core/json-to-tonl.js';
import { countTokens } from '../../utils/token-counter.js';
import type {
  MongoDBConfig,
  MongoDBSearchOptions,
  MongoDBHybridSearchOptions,
  CollectionTemplate,
  NestedAnalysis,
  CostBreakdown,
  IndexRecommendation
} from './types.js';

const COLLECTION_TEMPLATES: Partial<Record<CollectionTemplate, any>> = {
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

export class MongoDBAdapter extends BaseVectorAdapter {
  private client: any = null;
  private db: any = null;
  private config: MongoDBConfig;
  private queryStats = new Map<string, { count: number; totalTime: number; avgTime: number }>();

  constructor(config: MongoDBConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      this.client = await createMongoDBClient(this.config.uri, this.config.options);
      this.db = this.client.db(this.config.database);
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to MongoDB: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.connected = false;
    }
  }

  async search(
    collectionName: string,
    vector: number[],
    options: MongoDBSearchOptions = {}
  ): Promise<any[]> {
    this.ensureConnected();

    const startTime = Date.now();
    const collection = this.db!.collection(collectionName);

    const {
      limit = 10,
      numCandidates = limit * 10,
      indexName = 'vector_index',
      vectorPath = 'embedding',
      preFilter,
      exact = false,
      select
    } = options;

    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: indexName,
          path: vectorPath,
          queryVector: vector,
          numCandidates: exact ? limit : numCandidates,
          limit,
          ...(preFilter && { filter: preFilter })
        }
      }
    ];

    pipeline.push({
      $addFields: {
        score: { $meta: 'vectorSearchScore' }
      }
    });

    if (select && select.length > 0) {
      const projection: any = { score: 1 };
      select.forEach((field: string) => {
        projection[field] = 1;
      });
      pipeline.push({ $project: projection });
    }

    const results = await collection.aggregate(pipeline).toArray();
    this.updateQueryStats(collectionName, Date.now() - startTime);

    return results;
  }

  async hybridSearch(
    collectionName: string,
    options: MongoDBHybridSearchOptions
  ): Promise<any[]> {
    this.ensureConnected();

    const {
      vector,
      textQuery,
      vectorWeight = 0.7,
      textWeight = 0.3,
      limit = 10
    } = options as any;

    const collection = this.db!.collection(collectionName);

    if (!vector && !textQuery) {
      throw new Error('Either vector or textQuery must be provided for hybrid search');
    }

    if (vector && !textQuery) {
      return this.search(collectionName, vector, options);
    }

    if (!vector && textQuery) {
      return collection
        .find({ $text: { $search: textQuery } })
        .limit(limit)
        .toArray();
    }

    const vectorResults = vector 
      ? await this.search(collectionName, vector, { ...options, limit: limit * 2 })
      : [];

    const textResults = textQuery
      ? await collection
          .find({ $text: { $search: textQuery } })
          .limit(limit * 2)
          .toArray()
      : [];

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
      .slice(0, limit)
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

    const originalTokens = countTokens(JSON.stringify(results));
    const tonlTokens = countTokens(tonl);
    const baseSavingsPercentage = ((originalTokens - tonlTokens) / originalTokens) * 100;

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
        savingsPercentage: baseSavingsPercentage,
        totalSavings,
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
    const monthlyQueries = queriesPerDay * 30;
    const monthlyTokensBefore = stats.originalTokens * monthlyQueries;
    const monthlyTokensAfter = stats.tonlTokens * monthlyQueries;

    const costBefore = (monthlyTokensBefore / 1_000_000) * tokenCostPer1M;
    const costAfter = (monthlyTokensAfter / 1_000_000) * tokenCostPer1M;
    const monthlySavings = costBefore - costAfter;
    const annualSavings = monthlySavings * 12;

    return {
      costBefore: `$${costBefore.toFixed(2)}/month`,
      costAfter: `$${costAfter.toFixed(2)}/month`,
      monthlySavings: `$${monthlySavings.toFixed(2)}/month`,
      annualSavings: `$${annualSavings.toFixed(2)}/year`,
      percentageSaved: stats.savingsPercentage,
      queriesPerDay
    };
  }

  async createFromTemplate(
    collectionName: string,
    template: CollectionTemplate
  ): Promise<void> {
    this.ensureConnected();

    const templateDef = COLLECTION_TEMPLATES[template];
    if (!templateDef) {
      throw new Error(`Unknown template: ${template}`);
    }

    const collection = this.db!.collection(collectionName);
    const { field, dimensions, similarity } = templateDef.vectorIndex;
    
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
  }

  static getTemplates(): Partial<Record<CollectionTemplate, any>> {
    return COLLECTION_TEMPLATES;
  }

  async suggestIndexes(collectionName: string): Promise<IndexRecommendation[]> {
    this.ensureConnected();

    const collection = this.db!.collection(collectionName);
    const samples = await collection.find().limit(100).toArray();
    
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
        
        if (Array.isArray(value) && typeof value[0] === 'number' && value.length > 100) {
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

  async insert(collectionName: string, documents: any[]): Promise<void> {
    this.ensureConnected();
    const collection = this.db!.collection(collectionName);
    
    const batchSize = 1000;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await collection.insertMany(batch);
    }
  }

  async insertBatch(
    collectionName: string,
    documents: any[],
    onProgress?: (percent: number) => void
  ): Promise<void> {
    this.ensureConnected();
    const collection = this.db!.collection(collectionName);
    
    const batchSize = 1000;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await collection.insertMany(batch);
      
      if (onProgress) {
        const percent = Math.round(((i + batch.length) / documents.length) * 100);
        onProgress(percent);
      }
    }
  }

  async deleteCollection(collectionName: string): Promise<void> {
    this.ensureConnected();
    await this.db!.collection(collectionName).drop();
  }

  async listCollections(): Promise<string[]> {
    this.ensureConnected();
    const collections = await this.db!.listCollections().toArray();
    return collections.map((c: any) => c.name);
  }

  async getCollectionStats(collectionName: string): Promise<any> {
    this.ensureConnected();
    return this.db!.collection(collectionName).stats();
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
    return this.queryStats;
  }

  async analyzeCollection(collectionName: string): Promise<{
    vectorFields: string[];
    textFields: string[];
    metadataFields: string[];
    suggestedTonlFields: string[];
    estimatedSavings: number;
    indexRecommendations: IndexRecommendation[];
  }> {
    this.ensureConnected();

    const collection = this.db!.collection(collectionName);
    const sample = await collection.findOne();

    if (!sample) {
      throw new Error(`Collection '${collectionName}' is empty`);
    }

    const vectorFields: string[] = [];
    const textFields: string[] = [];
    const metadataFields: string[] = [];

    Object.entries(sample).forEach(([key, value]) => {
      if (key === '_id') return;

      if (Array.isArray(value) && typeof value[0] === 'number' && value.length > 100) {
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