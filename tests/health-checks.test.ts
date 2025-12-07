/**
 * Health Check Endpoints Tests
 * 
 * Tests /health and /ready endpoints for Kubernetes/Docker compatibility
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHttpServer } from '../src/mcp/server.js';
import type { Server } from 'http';

describe('Health Check Endpoints', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    // Start server on random port
    port = 0; // OS will assign available port
    server = startHttpServer(port);
    
    // Get actual assigned port
    const address = server.address();
    if (address && typeof address === 'object') {
      port = address.port;
    }
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await fetch(`http://localhost:${port}/health`);
      expect(response.status).toBe(200);
    });

    it('should return JSON with status "healthy"', async () => {
      const response = await fetch(`http://localhost:${port}/health`);
      const data = await response.json();
      
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('timestamp');
    });

    it('should return uptime as a number', async () => {
      const response = await fetch(`http://localhost:${port}/health`);
      const data = await response.json();
      
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThan(0);
    });

    it('should return valid ISO timestamp', async () => {
      const response = await fetch(`http://localhost:${port}/health`);
      const data = await response.json();
      
      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
      
      // Timestamp should be recent (within last 5 seconds)
      const now = new Date();
      const diff = now.getTime() - timestamp.getTime();
      expect(diff).toBeLessThan(5000);
    });

    it('should work without authentication', async () => {
      // Health checks should not require auth token
      const response = await fetch(`http://localhost:${port}/health`);
      expect(response.status).toBe(200);
    });

    it('should have correct content-type', async () => {
      const response = await fetch(`http://localhost:${port}/health`);
      const contentType = response.headers.get('content-type');
      
      expect(contentType).toContain('application/json');
    });
  });

  describe('GET /ready', () => {
    it('should return 200 OK when server is ready', async () => {
      const response = await fetch(`http://localhost:${port}/ready`);
      expect(response.status).toBe(200);
    });

    it('should return JSON with status "ready"', async () => {
      const response = await fetch(`http://localhost:${port}/ready`);
      const data = await response.json();
      
      expect(data).toHaveProperty('status', 'ready');
      expect(data).toHaveProperty('timestamp');
    });

    it('should return valid ISO timestamp', async () => {
      const response = await fetch(`http://localhost:${port}/ready`);
      const data = await response.json();
      
      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('should work without authentication', async () => {
      // Readiness checks should not require auth token
      const response = await fetch(`http://localhost:${port}/ready`);
      expect(response.status).toBe(200);
    });

    it('should have correct content-type', async () => {
      const response = await fetch(`http://localhost:${port}/ready`);
      const contentType = response.headers.get('content-type');
      
      expect(contentType).toContain('application/json');
    });
  });

  describe('Kubernetes Compatibility', () => {
    it('/health should be suitable for liveness probe', async () => {
      // Kubernetes liveness probe requirements:
      // - Fast response (< 1s)
      // - Returns 200 OK
      // - No dependencies on external services
      
      const start = Date.now();
      const response = await fetch(`http://localhost:${port}/health`);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    it('/ready should be suitable for readiness probe', async () => {
      // Kubernetes readiness probe requirements:
      // - Fast response (< 1s)
      // - Returns 200 OK when ready, 503 when not ready
      // - Can check dependencies (future enhancement)
      
      const start = Date.now();
      const response = await fetch(`http://localhost:${port}/ready`);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    it('should handle multiple concurrent health checks', async () => {
      // Simulate load balancer health checking
      const requests = Array(10).fill(null).map(() => 
        fetch(`http://localhost:${port}/health`)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle multiple concurrent readiness checks', async () => {
      const requests = Array(10).fill(null).map(() => 
        fetch(`http://localhost:${port}/ready`)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Docker Compatibility', () => {
    it('should work with Docker HEALTHCHECK instruction', async () => {
      // Docker HEALTHCHECK uses curl or wget
      // Test that endpoint is accessible via simple HTTP GET
      
      const response = await fetch(`http://localhost:${port}/health`);
      expect(response.ok).toBe(true);
    });

    it('should return quickly for Docker health checks', async () => {
      // Docker has default timeout of 30s, but good practice is < 5s
      const start = Date.now();
      await fetch(`http://localhost:${port}/health`);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Load Balancer Compatibility', () => {
    it('should handle health checks from load balancers', async () => {
      // Load balancers typically check health every 10-30 seconds
      // Ensure endpoint is consistently available
      
      const checks = [];
      for (let i = 0; i < 5; i++) {
        const response = await fetch(`http://localhost:${port}/health`);
        checks.push(response.status);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      expect(checks.every(status => status === 200)).toBe(true);
    });
  });

  describe('Uptime Tracking', () => {
    it('should show increasing uptime over time', async () => {
      const response1 = await fetch(`http://localhost:${port}/health`);
      const data1 = await response1.json();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response2 = await fetch(`http://localhost:${port}/health`);
      const data2 = await response2.json();
      
      expect(data2.uptime).toBeGreaterThan(data1.uptime);
    });

    it('should return uptime in seconds', async () => {
      const response = await fetch(`http://localhost:${port}/health`);
      const data = await response.json();
      
      // Uptime should be reasonable (< 1 hour for test)
      expect(data.uptime).toBeLessThan(3600);
    });
  });

  describe('Response Format', () => {
    it('/health should return consistent schema', async () => {
      const response = await fetch(`http://localhost:${port}/health`);
      const data = await response.json();
      
      // Ensure all required fields are present
      const requiredFields = ['status', 'uptime', 'timestamp'];
      requiredFields.forEach(field => {
        expect(data).toHaveProperty(field);
      });
      
      // Ensure no unexpected fields
      const actualFields = Object.keys(data);
      expect(actualFields.sort()).toEqual(requiredFields.sort());
    });

    it('/ready should return consistent schema', async () => {
      const response = await fetch(`http://localhost:${port}/ready`);
      const data = await response.json();
      
      const requiredFields = ['status', 'timestamp'];
      requiredFields.forEach(field => {
        expect(data).toHaveProperty(field);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      // Test with invalid methods
      const response = await fetch(`http://localhost:${port}/health`, {
        method: 'POST'
      });
      
      // Should still respond (Express handles this)
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should not crash on repeated requests', async () => {
      // Stress test with many requests
      const requests = Array(100).fill(null).map(() => 
        fetch(`http://localhost:${port}/health`)
      );
      
      const responses = await Promise.all(requests);
      
      // All should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });
});
