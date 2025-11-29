/**
 * MongoDB Driver Loader
 * Dynamically loads the MongoDB driver as an optional dependency
 */

let mongodbModule: any = null;

export async function loadMongoDBDriver(): Promise<any> {
  if (mongodbModule) {
    return mongodbModule;
  }

  try {
    // @ts-ignore - Optional peer dependency
    mongodbModule = await import('mongodb');
    return mongodbModule;
  } catch (error) {
    throw new Error(
      'MongoDB driver not found. Install: npm install mongodb'
    );
  }
}

/**
 * Create MongoDB client with connection string
 */
export async function createMongoDBClient(uri: string, options?: any): Promise<any> {
  const mongodb = await loadMongoDBDriver();
  const { MongoClient } = mongodb;
  
  const client = new MongoClient(uri, options);
  await client.connect();
  
  return client;
}