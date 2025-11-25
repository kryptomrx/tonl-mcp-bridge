import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MilvusAdapter } from '../../src/sdk/vector/milvus.js';

// Configurable via ENV vars for Remote Testing
const MILVUS_HOST = process.env.MILVUS_HOST || 'localhost';
const MILVUS_PORT = parseInt(process.env.MILVUS_PORT || '19530');
const MILVUS_AVAILABLE = process.env.MILVUS_AVAILABLE === 'true';

describe.skipIf(!MILVUS_AVAILABLE)('MilvusAdapter Integration', () => {
  let adapter: MilvusAdapter;
  const COLLECTION_NAME = 'tonl_test_collection_' + Date.now(); // Unique name to avoid conflicts
  const DIMENSION = 4;

  beforeAll(async () => {
    console.log(`Connecting to Milvus at ${MILVUS_HOST}:${MILVUS_PORT}...`);
    adapter = new MilvusAdapter({
      address: `${MILVUS_HOST}:${MILVUS_PORT}`,
      username: process.env.MILVUS_USER || 'root',
      password: process.env.MILVUS_PASSWORD || 'Milvus',
    });
    await adapter.connect();
  });

  afterAll(async () => {
    if (adapter && adapter.isConnected()) {
      // Clean up: Drop collection after test
      // Note: We rely on client internal access or manual cleanup if drop isn't exposed
      // For this test run, we just disconnect.
      await adapter.disconnect();
    }
  });

  it('should connect successfully', () => {
    expect(adapter.isConnected()).toBe(true);
  });

  it('should create a collection', async () => {
    await adapter.createCollection(COLLECTION_NAME, DIMENSION);
  }, 10000); // Increase timeout for remote ops

  it('should insert data', async () => {
    const data = [
      { vector: [0.1, 0.2, 0.3, 0.4], title: 'Doc 1', category: 'finance' },
      { vector: [0.2, 0.3, 0.4, 0.5], title: 'Doc 2', category: 'tech' },
      { vector: [0.9, 0.8, 0.7, 0.6], title: 'Doc 3', category: 'finance' },
    ];

    await adapter.insert(COLLECTION_NAME, data);
    
    // Wait for indexing/segment flush on remote server
    await new Promise(r => setTimeout(r, 2000));
  });

  it('should search and return TONL', async () => {
    await adapter.client['loadCollectionSync']({ collection_name: COLLECTION_NAME }); // Ensure loaded before search

    const queryVector = [0.1, 0.2, 0.3, 0.4];
    
    const result = await adapter.searchToTonl(COLLECTION_NAME, queryVector, {
      limit: 2,
      outputFields: ['title', 'category']
    });

    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.tonl).toContain('tonl_test_collection');
  });

  it('should calculate savings', async () => {
    const queryVector = [0.1, 0.2, 0.3, 0.4];
    
    const result = await adapter.searchWithStats(COLLECTION_NAME, queryVector, {
      limit: 2,
      model: 'gpt-5'
    });

    console.log('Milvus Savings:', result.stats.savingsPercent + '%');
    expect(typeof result.stats.savingsPercent).toBe('number');
  });
});