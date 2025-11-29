let pineconeModule: any = null;

export async function loadPineconeDriver(): Promise<any> {
  if (pineconeModule) return pineconeModule;

  try {
    // @ts-ignore - Optional peer dependency, may not be installed
    pineconeModule = await import('@pinecone-database/pinecone');
    return pineconeModule;
  } catch {
    throw new Error('Pinecone client not found. Install: npm install @pinecone-database/pinecone');
  }
}

export async function createPineconeClient(config: {
  apiKey?: string;
}): Promise<any> {
  const module = await loadPineconeDriver();
  return new module.Pinecone({
    apiKey: config.apiKey || process.env.PINECONE_API_KEY,
  });
}