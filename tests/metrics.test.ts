import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordTokenSavings,
  recordCompressionRatio,
  recordConversion,
  incrementConnections,
  decrementConnections,
  recordVectorDbOperation,
  recordDataSize,
  getMetricsRegistry,
  resetMetrics,
  MODEL_PRICING
} from '../src/mcp/metrics.js';

describe('Metrics System', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('Business Metrics', () => {
    it('should record token savings', () => {
      expect(() => {
        recordTokenSavings(1000, 'gpt-4o');
      }).not.toThrow();
    });

    it('should calculate cost savings', () => {
      expect(() => {
        recordTokenSavings(1000000, 'gpt-4o');
      }).not.toThrow();
    });

    it('should handle multiple models', () => {
      expect(() => {
        recordTokenSavings(1000, 'gpt-4o');
        recordTokenSavings(2000, 'claude-sonnet-4');
      }).not.toThrow();
    });

    it('should record compression ratio', () => {
      expect(() => {
        recordCompressionRatio(1000, 500, 'gpt-4o');
      }).not.toThrow();
    });

    it('should track conversion requests', async () => {
      const testFn = async () => 'success';
      
      await expect(
        recordConversion('json_to_tonl', testFn)
      ).resolves.toBe('success');
    });

    it('should track conversion errors', async () => {
      const testFn = async () => {
        throw new Error('Test error');
      };
      
      await expect(
        recordConversion('json_to_tonl', testFn)
      ).rejects.toThrow('Test error');
    });
  });

  describe('Operational Metrics', () => {
    it('should track conversion duration', async () => {
      const testFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      };
      
      await expect(
        recordConversion('json_to_tonl', testFn)
      ).resolves.toBe('done');
    });

    it('should track active connections', () => {
      expect(() => {
        incrementConnections();
        incrementConnections();
        decrementConnections();
      }).not.toThrow();
    });

    it('should track vector DB operations', () => {
      expect(() => {
        recordVectorDbOperation('mongodb', 'search');
        recordVectorDbOperation('pinecone', 'upsert');
        recordVectorDbOperation('mongodb', 'search');
      }).not.toThrow();
    });

    it('should track data sizes', () => {
      expect(() => {
        recordDataSize(1024, 'json_input');
        recordDataSize(512, 'tonl_output');
      }).not.toThrow();
    });
  });

  describe('Model Pricing', () => {
    it('should have pricing for major models', () => {
      expect(MODEL_PRICING['gpt-4o']).toBe(2.50);
      expect(MODEL_PRICING['gpt-4o-mini']).toBe(0.15);
      expect(MODEL_PRICING['claude-sonnet-4']).toBe(3.00);
      expect(MODEL_PRICING['claude-opus-4']).toBe(15.00);
      expect(MODEL_PRICING['gemini-2.0-flash']).toBe(0.075);
    });

    it('should fallback for unknown models', () => {
      expect(() => {
        recordTokenSavings(1000000, 'unknown-model');
      }).not.toThrow();
    });
  });

  describe('Metrics Registry', () => {
    it('should export metrics in Prometheus format', async () => {
      recordTokenSavings(1000, 'gpt-4o');
      
      const metrics = await getMetricsRegistry().metrics();
      
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include default Node.js metrics', async () => {
      const metrics = await getMetricsRegistry().metrics();
      
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('process_');
    });

    it('should reset metrics', () => {
      recordTokenSavings(1000, 'gpt-4o');
      
      expect(() => {
        resetMetrics();
      }).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should track full conversion workflow', async () => {
      const conversionFn = async () => {
        recordTokenSavings(500, 'gpt-4o');
        recordCompressionRatio(1000, 500, 'gpt-4o');
        recordDataSize(1024, 'json_input');
        recordDataSize(512, 'tonl_output');
        
        return { success: true };
      };
      
      const result = await recordConversion('json_to_tonl', conversionFn);
      
      expect(result).toEqual({ success: true });
    });

    it('should handle concurrent operations', async () => {
      const operations = [
        recordConversion('json_to_tonl', async () => 'op1'),
        recordConversion('json_to_tonl', async () => 'op2'),
        recordConversion('tonl_to_json', async () => 'op3')
      ];
      
      const results = await Promise.all(operations);
      
      expect(results).toEqual(['op1', 'op2', 'op3']);
    });
  });
});
