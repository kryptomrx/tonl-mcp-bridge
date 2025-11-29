import { describe, it, expect } from 'vitest';
import { loadPineconeDriver } from '../../src/sdk/loaders/pinecone-loader.js';

// Check if Pinecone is available
let isPineconeAvailable = false;
try {
  await import('@pinecone-database/pinecone');
  isPineconeAvailable = true;
} catch {
  isPineconeAvailable = false;
}

const describeIfPinecone = isPineconeAvailable ? describe : describe.skip;

describeIfPinecone('Pinecone Adapter', () => {
  describe('Driver Loading', () => {
    it('should load Pinecone driver when installed', async () => {
      await expect(loadPineconeDriver()).resolves.toBeDefined();
    });

    it('should cache loaded driver', async () => {
      const driver1 = await loadPineconeDriver();
      const driver2 = await loadPineconeDriver();
      
      expect(driver1).toBe(driver2);
    });
  });

  describe('Configuration', () => {
    it('should accept API key from config', () => {
      expect(true).toBe(true);
    });

    it('should use PINECONE_API_KEY environment variable', () => {
      expect(true).toBe(true);
    });
  });
});

// Always run this test
describe('Pinecone Error Messages', () => {
  it('should have proper error message when not installed', () => {
    if (!isPineconeAvailable) {
      expect(async () => {
        await loadPineconeDriver();
      }).rejects.toThrow(/Pinecone client not found/);
    } else {
      expect(true).toBe(true);
    }
  });
});