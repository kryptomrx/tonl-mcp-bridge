import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisAdapter } from '../../src/sdk/vector/redis.js';

describe('Redis Adapter', () => {
  let adapter: RedisAdapter;
  const testIndexName = 'test_products';

  const isRedisAvailable = async (): Promise<boolean> => {
    try {
      const testAdapter = new RedisAdapter({
        host: 'localhost',
        port: 6379
      });
      await testAdapter.connect();
      await testAdapter.disconnect();
      return true;
    } catch {
      return false;
    }
  };

  beforeAll(async () => {
    const available = await isRedisAvailable();
    if (!available) {
      console.log('Skipping: Redis Stack not available');
      return;
    }

    adapter = new RedisAdapter({
      host: 'localhost',
      port: 6379,
      indexPrefix: 'test'
    });

    await adapter.connect();

    try {
      await (adapter as any).client.sendCommand([
        'FT.DROPINDEX',
        `test:${testIndexName}`,
        'DD'
      ]);
    } catch {
      // Index doesn't exist
    }
  });

  afterAll(async () => {
    if (adapter && adapter.isConnected()) {
      try {
        await (adapter as any).client.sendCommand([
          'FT.DROPINDEX',
          `test:${testIndexName}`,
          'DD'
        ]);
      } catch {
        // Ignore
      }

      await adapter.disconnect();
    }
  });

  describe('Driver Loading', () => {
    it('should load Redis driver when installed', async () => {
      if (!(await isRedisAvailable())) {
        console.log('Skipping: Redis not installed');
        return;
      }

      const testAdapter = new RedisAdapter({
        host: 'localhost',
        port: 6379
      });

      await testAdapter.connect();
      expect(testAdapter.isConnected()).toBe(true);
      await testAdapter.disconnect();
    });

    it('should detect RediSearch module', async () => {
      if (!(await isRedisAvailable())) {
        console.log('Skipping: Redis not installed');
        return;
      }

      const testAdapter = new RedisAdapter({
        host: 'localhost',
        port: 6379
      });

      await expect(testAdapter.connect()).resolves.not.toThrow();
      await testAdapter.disconnect();
    });
  });

  describe('Index Creation', () => {
    it('should create vector index with HNSW algorithm', async () => {
      if (!(await isRedisAvailable())) {
        console.log('Skipping: Redis not available');
        return;
      }

      await adapter.createIndex(testIndexName, {
        dimensions: 384,
        algorithm: 'HNSW',
        distanceMetric: 'COSINE',
        m: 16,
        efConstruction: 200
      });

      const indices = await (adapter as any).client.sendCommand(['FT._LIST']);
      expect(indices).toContain(`test:${testIndexName}`);
    });

    it('should create index with hybrid search fields', async () => {
      if (!(await isRedisAvailable())) {
        console.log('Skipping: Redis not available');
        return;
      }

      const hybridIndex = `${testIndexName}_hybrid`;

      await adapter.createIndex(hybridIndex, {
        dimensions: 384,
        textFields: ['title', 'description'],
        numericFields: ['price', 'rating'],
        tagFields: ['category', 'brand']
      });

      try {
        await (adapter as any).client.sendCommand([
          'FT.DROPINDEX',
          `test:${hybridIndex}`,
          'DD'
        ]);
      } catch {
        // Ignore
      }
    });
  });

  describe('Vector Insert', () => {
    it('should insert document with vector', async () => {
      if (!(await isRedisAvailable())) {
        console.log('Skipping: Redis not available');
        return;
      }

      const vector = Array(384).fill(0).map(() => Math.random());

      await adapter.insert(testIndexName, '1', {
        title: 'Test Product',
        description: 'A test product description',
        price: 99.99
      }, vector);

      const doc = await (adapter as any).client.json.get(`test:${testIndexName}:1`);
      expect(doc).toBeDefined();
      expect(doc.title).toBe('Test Product');
    });

    it('should batch insert documents', async () => {
      if (!(await isRedisAvailable())) {
        console.log('Skipping: Redis not available');
        return;
      }

      const documents = [
        {
          id: '3',
          data: { title: 'Product 3', price: 29.99 },
          vector: Array(384).fill(0).map(() => Math.random())
        },
        {
          id: '4',
          data: { title: 'Product 4', price: 39.99 },
          vector: Array(384).fill(0).map(() => Math.random())
        }
      ];

      await adapter.insertBatch(testIndexName, documents);

      const doc3 = await (adapter as any).client.json.get(`test:${testIndexName}:3`);
      expect(doc3).toBeDefined();
      expect(doc3.title).toBe('Product 3');
    });
  });

  describe('Vector Search', () => {
    it('should search for similar vectors', async () => {
      if (!(await isRedisAvailable())) {
        console.log('Skipping: Redis not available');
        return;
      }

      const queryVector = Array(384).fill(0).map(() => Math.random());

      const results = await adapter.search(testIndexName, queryVector, {
        limit: 3
      });

      expect(results.data).toBeDefined();
      expect(Array.isArray(results.data)).toBe(true);
      expect(results.rowCount).toBeGreaterThanOrEqual(0);
    });

    it('should use semantic cache for repeated queries', async () => {
      if (!(await isRedisAvailable())) {
        console.log('Skipping: Redis not available');
        return;
      }

      const queryVector = Array(384).fill(0).map(() => Math.random());

      const result1 = await adapter.search(testIndexName, queryVector, {
        limit: 3,
        useSemanticCache: true,
        cacheTTL: 60
      });

      const result2 = await adapter.search(testIndexName, queryVector, {
        limit: 3,
        useSemanticCache: true
      });

      expect(result1.rowCount).toBe(result2.rowCount);
    });
  });

  describe('TONL Conversion', () => {
    it('should convert search results to TONL', async () => {
      if (!(await isRedisAvailable())) {
        console.log('Skipping: Redis not available');
        return;
      }

      const queryVector = Array(384).fill(0).map(() => Math.random());

      const results = await adapter.searchToTonl(testIndexName, queryVector, {
        limit: 3
      });

      expect(results.tonl).toBeDefined();
      expect(typeof results.tonl).toBe('string');
      expect(results.tonl.length).toBeGreaterThan(0);
    });

    it('should calculate token savings statistics', async () => {
      if (!(await isRedisAvailable())) {
        console.log('Skipping: Redis not available');
        return;
      }

      const queryVector = Array(384).fill(0).map(() => Math.random());

      const results = await adapter.searchWithStats(testIndexName, queryVector, {
        limit: 3
      });

      expect(results.stats).toBeDefined();
      expect(results.stats.originalTokens).toBeGreaterThan(0);
      expect(results.stats.compressedTokens).toBeGreaterThan(0);
      expect(results.stats.savingsPercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const badAdapter = new RedisAdapter({
        host: 'nonexistent.host',
        port: 9999
      });

      await expect(badAdapter.connect()).rejects.toThrow();
    });

    it('should throw error when searching without connection', async () => {
      const disconnectedAdapter = new RedisAdapter();
      const queryVector = Array(384).fill(0).map(() => Math.random());

      await expect(
        disconnectedAdapter.search('test', queryVector)
      ).rejects.toThrow('Redis not connected');
    });
  });
});
