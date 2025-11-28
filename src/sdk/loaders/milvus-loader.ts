import type { MilvusClient } from '@zilliz/milvus2-sdk-node';

let milvusModule: typeof import('@zilliz/milvus2-sdk-node') | null = null;

export async function loadMilvusDriver(): Promise<typeof import('@zilliz/milvus2-sdk-node')> {
  if (milvusModule) return milvusModule;

  try {
    milvusModule = await import('@zilliz/milvus2-sdk-node');
    return milvusModule;
  } catch {
    throw new Error('Milvus client not found. Install: npm install @zilliz/milvus2-sdk-node');
  }
}

export async function createMilvusClient(config: {
  address: string;
  username?: string;
  password?: string;
  token?: string;
}): Promise<MilvusClient> {
  const milvus = await loadMilvusDriver();
  return new milvus.MilvusClient(config);
}