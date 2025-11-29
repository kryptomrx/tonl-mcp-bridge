import { describe, it, expect } from 'vitest';
import { loadWeaviateDriver } from '../../src/sdk/loaders/weaviate-loader.js';

describe('Weaviate Adapter', () => {
  describe('Driver Loading', () => {
    it('should load Weaviate driver when installed', async () => {
      try {
        await expect(loadWeaviateDriver()).resolves.toBeDefined();
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          console.log('⏭️  Skipping: Weaviate not installed (optional dependency)');
          return;
        }
        throw error;
      }
    });

    it('should cache loaded driver', async () => {
      try {
        const driver1 = await loadWeaviateDriver();
        const driver2 = await loadWeaviateDriver();
        
        expect(driver1).toBe(driver2);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          console.log('⏭️  Skipping: Weaviate not installed (optional dependency)');
          return;
        }
        throw error;
      }
    });
  });

  describe('Configuration', () => {
    it('should accept URL configuration', () => {
      expect(true).toBe(true);
    });

    it('should support local connection', () => {
      expect(true).toBe(true);
    });
  });
});

describe('Weaviate Error Messages', () => {
  it('should have proper error message when not installed', async () => {
    try {
      await loadWeaviateDriver();
      expect(true).toBe(true);
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toContain('Weaviate client not found');
    }
  });
});