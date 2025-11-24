import express from 'express';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { jsonToTonl } from '../core/json-to-tonl.js';
import { tonlToJson } from '../core/tonl-to-json.js';
import { calculateRealSavings } from '../utils/token-counter.js';
import type { ModelName } from '../utils/tokenizer.js';

const app = express();
app.use(express.json()); // ← KEEP IT!

const VALID_MODELS: ModelName[] = [
  'gpt-5', 'gpt-4', 'gpt-3.5-turbo',
  'claude-4-opus', 'claude-4-sonnet', 'claude-sonnet-4.5',
  'gemini-2.5-pro', 'gemini-2.5-flash'
];

const transports: Record<string, StreamableHTTPServerTransport> = {};

function getServer(): McpServer {
  const server = new McpServer({
    name: 'tonl-mcp-bridge',
    version: '0.9.0'
  });

  server.tool(
    'convert_to_tonl',
    'Convert JSON data to TONL format',
    {
      data: z.array(z.record(z.unknown())),
      name: z.string().optional()
    },
    async ({ data, name }) => {
      const collectionName = name || 'data';
      const tonlOutput = jsonToTonl(data, collectionName);
      const jsonStr = JSON.stringify(data);
      const stats = calculateRealSavings(jsonStr, tonlOutput, 'gpt-5');
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ tonl: tonlOutput, stats }, null, 2)
        }]
      };
    }
  );

  server.tool(
    'parse_tonl',
    'Parse TONL back to JSON',
    {
      tonl: z.string()
    },
    async ({ tonl }) => {
      const parsed = tonlToJson(tonl);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(parsed, null, 2)
        }]
      };
    }
  );

  server.tool(
    'calculate_savings',
    'Calculate token savings',
    {
      jsonData: z.string(),
      tonlData: z.string(),
      model: z.enum(VALID_MODELS as [ModelName, ...ModelName[]]).default('gpt-5')
    },
    async ({ jsonData, tonlData, model }) => {
      const stats = calculateRealSavings(jsonData, tonlData, model);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(stats, null, 2)
        }]
      };
    }
  );

  return server;
}

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          console.log(`✓ Session initialized: ${sid}`);
          transports[sid] = transport;
        }
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          console.log(`✗ Session closed: ${transport.sessionId}`);
          delete transports[transport.sessionId];
        }
      };

      const server = getServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return; // Already handled
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided'
        },
        id: null
      });
      return;
    }

    // Handle with existing transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 TONL MCP Server (Streamable HTTP)`);
  console.log(`   http://localhost:${PORT}/mcp`);
  console.log(`   Protocol: 2025-03-26`);
});