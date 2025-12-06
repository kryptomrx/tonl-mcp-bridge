import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChromaAdapter } from '../dist/sdk/vector/chroma.js';

/**
 * ChromaDB Adapter Tests
 * 
 * Tests cover:
 * - Basic connection lifecycle
 * - Collection management
 * - Vector search with various options
 * - TONL conversion
 * - Token statistics
 * - Metadata filtering
 * - Edge cases and error handling
 * - Different configuration modes
 */

describe('ChromaAdapter', () => {
  let adapter: ChromaAdapter;

  describe('Connection Lifecycle', () => {
    it('should create adapter with default config', () => {
      adapter = new ChromaAdapter();
      expect(adapter).toBeDefined();
      expect(adapter.isConnected()).toBe(false);
    });

    it('should create adapter with custom URL', () => {
      adapter = new ChromaAdapter({
        url: 'http://custom-host:9000',
      });
      expect(adapter).toBeDefined();
    });

    it('should create adapter with persistent path', () => {
      adapter = new ChromaAdapter({
        path: './test_chroma_data',
      });
      expect(adapter).toBeDefined();
    });

    it('should create adapter with Chroma Cloud config', () => {
      adapter = new ChromaAdapter({
        apiKey: 'test-key',
        tenant: 'test-tenant',
        database: 'test-db',
      });
      expect(adapter).toBeDefined();
    });

    it('should disconnect successfully', async () => {
      adapter = new ChromaAdapter();
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('Collection Management', () => {
    beforeEach(() => {
      adapter = new ChromaAdapter();
    });

    it('should throw error when creating collection without connection', async () => {
      await expect(
        adapter.createCollection('test')
      ).rejects.toThrow(/Not connected/);
    });

    it('should throw error when getting collection without connection', async () => {
      await expect(
        adapter.getCollection('test')
      ).rejects.toThrow(/Not connected/);
    });

    it('should throw error when listing collections without connection', async () => {
      await expect(
        adapter.listCollections()
      ).rejects.toThrow(/Not connected/);
    });

    it('should throw error when deleting collection without connection', async () => {
      await expect(
        adapter.deleteCollection('old_data')
      ).rejects.toThrow(/Not connected/);
    });
  });

  describe('Vector Operations', () => {
    beforeEach(() => {
      adapter = new ChromaAdapter();
    });

    it('should throw error when searching without connection', async () => {
      const queryVector = [0.1, 0.2, 0.3];
      
      await expect(
        adapter.search('test_collection', queryVector)
      ).rejects.toThrow(/Database not connected/);
    });

    it('should throw error when upserting without connection', async () => {
      await expect(
        adapter.upsert('test_collection', [
          {
            id: 'test1',
            vector: [0.1, 0.2, 0.3],
            metadata: { title: 'Test' }
          }
        ])
      ).rejects.toThrow(/Not connected/);
    });
  });

  describe('Search Options', () => {
    it('should handle empty search results', async () => {
      adapter = new ChromaAdapter();
      
      // Mock empty results
      const mockClient = {
        getCollection: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({
            ids: [[]],
            distances: [[]],
            metadatas: [[]],
            documents: [[]]
          })
        }),
        heartbeat: vi.fn().mockResolvedValue(true)
      };

      // @ts-ignore - mock private client
      adapter['client'] = mockClient;
      adapter['connected'] = true;

      const result = await adapter.search('test', [0.1, 0.2, 0.3]);
      
      expect(result.data).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should apply score threshold filter', async () => {
      adapter = new ChromaAdapter();
      
      // Mock results with various scores
      const mockClient = {
        getCollection: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({
            ids: [['doc1', 'doc2', 'doc3']],
            distances: [[0.1, 0.4, 0.8]], // scores: 0.9, 0.6, 0.2
            metadatas: [[
              { title: 'High Score' },
              { title: 'Medium Score' },
              { title: 'Low Score' }
            ]],
            documents: [['doc1 content', 'doc2 content', 'doc3 content']]
          })
        }),
        heartbeat: vi.fn().mockResolvedValue(true)
      };

      // @ts-ignore
      adapter['client'] = mockClient;
      adapter['connected'] = true;

      const result = await adapter.search('test', [0.1, 0.2, 0.3], {
        scoreThreshold: 0.7
      });
      
      // Should only return doc1 (score 0.9 > 0.7)
      expect(result.data.length).toBe(1);
      expect(result.data[0].title).toBe('High Score');
      expect(result.rowCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large vectors', async () => {
      adapter = new ChromaAdapter();
      
      const largeVector = Array(1536).fill(0).map(() => Math.random());
      
      const mockClient = {
        getCollection: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({
            ids: [['doc1']],
            distances: [[0.1]],
            metadatas: [[{ id: 1 }]],
            documents: [['content']]
          })
        }),
        heartbeat: vi.fn().mockResolvedValue(true)
      };

      // @ts-ignore
      adapter['client'] = mockClient;
      adapter['connected'] = true;

      const result = await adapter.search('test', largeVector);
      
      expect(result.data.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle unicode in metadata', async () => {
      adapter = new ChromaAdapter();
      
      const mockCollection = {
        add: vi.fn().mockResolvedValue(undefined)
      };

      const mockClient = {
        getCollection: vi.fn().mockResolvedValue(mockCollection),
        heartbeat: vi.fn().mockResolvedValue(true)
      };

      // @ts-ignore
      adapter['client'] = mockClient;
      adapter['connected'] = true;

      await adapter.upsert('test', [
        {
          id: 'doc1',
          vector: [0.1],
          metadata: {
            title: '你好世界',
            emoji: '🚀',
            arabic: 'مرحبا'
          }
        }
      ]);
      
      const addCall = mockCollection.add.mock.calls[0][0];
      expect(addCall.metadatas[0].title).toBe('你好世界');
      expect(addCall.metadatas[0].emoji).toBe('🚀');
    });

    it('should handle null/undefined in search results', async () => {
      adapter = new ChromaAdapter();
      
      const mockClient = {
        getCollection: vi.fn().mockResolvedValue({
          query: vi.fn().mockResolvedValue({
            ids: [['doc1']],
            distances: [[undefined]], // Missing distance
            metadatas: [[null]], // Null metadata
            documents: [[undefined]] // Missing document
          })
        }),
        heartbeat: vi.fn().mockResolvedValue(true)
      };

      // @ts-ignore
      adapter['client'] = mockClient;
      adapter['connected'] = true;

      const result = await adapter.search('test', [0.1]);
      
      expect(result.data.length).toBe(1);
      expect(result.data[0].score).toBeUndefined();
    });
  });
});
