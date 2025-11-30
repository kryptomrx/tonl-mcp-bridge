/**
 * MongoDB Driver Loader
 * Dynamically loads the MongoDB driver as an optional dependency
 */

let mongodbModule: any = null;

/**
 * Load MongoDB driver with proper error handling
 */
export async function loadMongoDBDriver(): Promise<any> {
  if (mongodbModule) {
    return mongodbModule;
  }

  try {
    // @ts-ignore - Optional peer dependency
    mongodbModule = await import('mongodb');
    return mongodbModule;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `MongoDB driver not found. Install with: npm install mongodb\nDetails: ${errorMessage}`
    );
  }
}

export interface MongoDBClientOptions {
  maxPoolSize?: number;
  minPoolSize?: number;
  serverSelectionTimeoutMS?: number;
  socketTimeoutMS?: number;
  connectTimeoutMS?: number;
  retryWrites?: boolean;
  retryReads?: boolean;
  [key: string]: any;
}

/**
 * Create MongoDB client with connection string and retry logic
 */
export async function createMongoDBClient(
  uri: string,
  options?: MongoDBClientOptions,
  maxRetries: number = 3
): Promise<any> {
  if (!uri || typeof uri !== 'string') {
    throw new Error('MongoDB URI must be a non-empty string');
  }

  const mongodb = await loadMongoDBDriver();
  const { MongoClient } = mongodb;

  const defaultOptions: MongoDBClientOptions = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
    ...options
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = new MongoClient(uri, defaultOptions);
      await client.connect();
      
      // Verify connection
      await client.db('admin').command({ ping: 1 });
      
      return client;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to connect to MongoDB after ${maxRetries} attempts. ` +
    `Last error: ${lastError?.message || 'Unknown error'}`
  );
}