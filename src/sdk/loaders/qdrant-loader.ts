import type { QdrantClient } from '@qdrant/js-client-rest';

let qdrantModule: typeof import('@qdrant/js-client-rest') | null = null;

export async function loadQdrantDriver(): Promise<typeof import('@qdrant/js-client-rest')> {
  if (qdrantModule) return qdrantModule;

  try {
    qdrantModule = await import('@qdrant/js-client-rest');
    return qdrantModule;
  } catch {
    throw new Error('Qdrant client not found. Install: npm install @qdrant/js-client-rest');
  }
}

export async function createQdrantClient(config: {
  url: string;
  apiKey?: string;
}): Promise<QdrantClient> {
  const qdrant = await loadQdrantDriver();
  return new qdrant.QdrantClient(config);
}