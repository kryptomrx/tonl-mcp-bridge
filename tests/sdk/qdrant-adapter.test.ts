import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { QdrantAdapter } from '../../src/sdk/vector/qdrant.js';

const QDRANT_AVAILABLE = !!process.env.QDRANT_URL;

describe.skipIf(!QDRANT_AVAILABLE)('QdrantAdapter', () => {
  let adapter: QdrantAdapter;
  const testCollection = 'test_collection_' + Date.now();

  beforeAll(async () => {
    adapter = new QdrantAdapter({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
    });
    await adapter.connect();
  });

  afterAll(async () => {
    try {
      await adapter.deleteCollection(testCollection);
    } catch (e) {
      // Collection might not exist
    }
    await adapter.disconnect();
  });

  it('should connect to Qdrant', () => {
    expect(adapter.isConnected()).toBe(true);
  });

  it('should create collection', async () => {
    await adapter.createCollection(testCollection, 4);
  });

  it('should upsert points', async () => {
    const points = [
      { id: 1, vector: [0.1, 0.2, 0.3, 0.4], payload: { city: 'Berlin' } },
      { id: 2, vector: [0.2, 0.3, 0.4, 0.5], payload: { city: 'London' } },
      { id: 3, vector: [0.3, 0.4, 0.5, 0.6], payload: { city: 'Paris' } },
    ];

    await adapter.upsert(testCollection, points);
  });

  it('should search vectors', async () => {
    const result = await adapter.search(testCollection, [0.15, 0.25, 0.35, 0.45], {
      limit: 2,
    });

    expect(result.data.length).toBe(2);
    expect(result.rowCount).toBe(2);
    expect(result.data[0]).toHaveProperty('id');
    expect(result.data[0]).toHaveProperty('score');
  });

  it('should convert to TONL', async () => {
    const result = await adapter.searchToTonl(
      testCollection,
      [0.15, 0.25, 0.35, 0.45],
      { limit: 2 }
    );

    expect(result.tonl).toBeDefined();
    expect(result.tonl).toContain(testCollection);
    expect(result.rowCount).toBe(2);
  });

  it('should provide token stats', async () => {
    const result = await adapter.searchWithStats(
      testCollection,
      [0.15, 0.25, 0.35, 0.45],
      { limit: 2, model: 'gpt-5' }
    );

    expect(result.stats).toBeDefined();
    expect(result.stats.originalTokens).toBeGreaterThan(0);
    expect(result.stats.compressedTokens).toBeGreaterThan(0);
    expect(typeof result.stats.savingsPercent).toBe('number');
  });

  it('should handle filters', async () => {
    await adapter.upsert(testCollection, [
      { id: 10, vector: [0.5, 0.5, 0.5, 0.5], payload: { city: 'Munich', country: 'Germany' } },
    ]);

    const result = await adapter.search(testCollection, [0.5, 0.5, 0.5, 0.5], {
      limit: 5,
      filter: {
        must: [{ key: 'country', match: { value: 'Germany' } }],
      },
    });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((item: any) => item.payload?.country === 'Germany')).toBe(true);
  });

  it('should delete collection', async () => {
    await adapter.deleteCollection(testCollection);
  });

  it('should throw when not connected', async () => {
    const newAdapter = new QdrantAdapter();
    await expect(
      newAdapter.search('test', [0.1, 0.2, 0.3, 0.4])
    ).rejects.toThrow('Database not connected');
  });
});