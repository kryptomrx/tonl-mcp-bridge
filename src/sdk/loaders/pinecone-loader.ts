let pineconeModule: any = null;

export async function loadPineconeDriver(): Promise<any> {
  if (pineconeModule) return pineconeModule;

  try {
    // @ts-ignore - Optional peer dependency
    pineconeModule = await import('@pinecone-database/pinecone');
    return pineconeModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Pinecone client not found. Install with: npm install @pinecone-database/pinecone\nDetails: ${message}`
    );
  }
}

export async function createPineconeClient(config: {
  apiKey?: string;
}): Promise<any> {
  const apiKey = config.apiKey || process.env.PINECONE_API_KEY;
  
  if (!apiKey) {
    throw new Error('Pinecone API key is required. Provide via config.apiKey or PINECONE_API_KEY env var');
  }

  const module = await loadPineconeDriver();
  
  try {
    return new module.Pinecone({ apiKey });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create Pinecone client: ${message}`);
  }
}