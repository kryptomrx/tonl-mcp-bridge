import { describe, it, expect } from 'vitest';
import { TonlMcpServer, createTonlMcpServer } from '../../src/mcp/server';

describe('TONL MCP Server', () => {
  describe('createTonlMcpServer', () => {
    it('should create server with default config', async () => {
      const server = await createTonlMcpServer();
      
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(TonlMcpServer);
    });

    it('should create server with custom config', async () => {
      const server = await createTonlMcpServer({
        name: 'test-server',
        version: '0.0.1',
      });
      
      expect(server).toBeDefined();
    });
  });
});
