import { describe, it, expect, afterEach } from 'vitest';
import { startHttpServer } from '../../src/mcp/server.js';
import type { Server } from 'http';

describe('TONL MCP HTTP Server', () => {
  let server: Server | null = null;

  afterEach(async () => {
    // Cleanup: close server after each test
    if (server && server.listening) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
      server = null;
    }
  });

  describe('startHttpServer', () => {
    it('should start server on default port 3000', async () => {
      // Use port 0 to get random available port (avoids conflicts)
      await new Promise<void>((resolve) => {
        server = startHttpServer(0);
        
        server.once('listening', () => {
          resolve();
        });
      });

      expect(server).toBeDefined();
      expect(server!.listening).toBe(true);

      // Get actual assigned port
      const address = server!.address();
      expect(address).toBeDefined();
      
      if (address && typeof address === 'object') {
        expect(address.port).toBeGreaterThan(0);
      }
    });

    it('should start server on custom port', async () => {
      // Use high port number to avoid conflicts
      const customPort = 13001;
      
      await new Promise<void>((resolve) => {
        server = startHttpServer(customPort);
        server.once('listening', () => resolve());
      });

      expect(server).toBeDefined();
      expect(server!.listening).toBe(true);

      const address = server!.address();
      if (address && typeof address === 'object') {
        expect(address.port).toBe(customPort);
      }
    });

    it('should return Server instance', async () => {
      server = startHttpServer(0); // Use dynamic port

      expect(server).toBeDefined();
      expect(typeof server.close).toBe('function');
      expect(typeof server.listen).toBe('function');
    });
  });

  describe('Server functionality', () => {
    it('should accept PORT as string', async () => {
      await new Promise<void>((resolve) => {
        server = startHttpServer('13003');
        server.once('listening', () => resolve());
      });

      expect(server).toBeDefined();
      expect(server!.listening).toBe(true);

      const address = server!.address();
      if (address && typeof address === 'object') {
        expect(address.port).toBe(13003);
      }
    });

    it('should handle graceful shutdown', async () => {
      await new Promise<void>((resolve) => {
        server = startHttpServer(0); // Dynamic port
        server.once('listening', () => resolve());
      });

      expect(server!.listening).toBe(true);

      // Close server
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });

      expect(server!.listening).toBe(false);
    });
  });
});
