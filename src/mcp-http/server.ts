import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { jsonToTonl } from '../core/json-to-tonl.js';
import { tonlToJson } from '../core/tonl-to-json.js';
import { calculateRealSavings } from '../utils/token-counter.js';
import type { ModelName } from '../utils/tokenizer.js';

console.log("Starting TONL MCP Server...");

const app = express();
// Increase limit for large payloads
app.use(express.json({ limit: '50mb' }));

const VALID_MODELS: ModelName[] = [
  'gpt-5', 'gpt-4', 'gpt-3.5-turbo',
  'claude-4-opus', 'claude-4-sonnet', 'claude-sonnet-4.5',
  'gemini-2.5-pro', 'gemini-2.5-flash'
];

// Store active transports to handle POST requests
const transports: Record<string, SSEServerTransport> = {};

/**
 * Create a new MCP server instance with all tools registered
 */
function createMcpServer(): McpServer {
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
      try {
        const collectionName = name || 'data';
        const tonlOutput = jsonToTonl(data, collectionName);
        const jsonStr = JSON.stringify(data);
        // Default to gpt-5 if context prevents passing model
        const stats = calculateRealSavings(jsonStr, tonlOutput, 'gpt-5');
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ tonl: tonlOutput, stats }, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${String(error)}` }]
        };
      }
    }
  );

  server.tool(
    'parse_tonl',
    'Parse TONL back to JSON',
    {
      tonl: z.string()
    },
    async ({ tonl }) => {
      try {
        const parsed = tonlToJson(tonl);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(parsed, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${String(error)}` }]
        };
      }
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
      try {
        const stats = calculateRealSavings(jsonData, tonlData, model);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(stats, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${String(error)}` }]
        };
      }
    }
  );

  return server;
}

/**
 * GET /mcp -> Start SSE connection
 */
app.get('/mcp', async (req, res) => {
  // Use provided sessionId or default to new one (needed for manual curl testing)
  const sessionId = (req.query.sessionId as string) || 'default-session';
  
  console.log(`-> New SSE connection: ${sessionId}`);

  // Create transport attached to this response
  // The endpoint path is used by the client to know where to send POSTs
  const transport = new SSEServerTransport('/mcp', res);
  const server = createMcpServer();

  // Store transport for the POST handler
  transports[sessionId] = transport;

  // Clean up on close
  req.on('close', () => {
    console.log(`<- Connection closed: ${sessionId}`);
    delete transports[sessionId];
  });

  try {
    await server.connect(transport);
    // This starts the SSE stream and sends headers
    await transport.start();
  } catch (err) {
    console.error('Transport error:', err);
  }
});

/**
 * POST /mcp -> Handle JSON-RPC messages
 */
app.post('/mcp', async (req, res) => {
  const sessionId = (req.query.sessionId as string) || (req.headers['mcp-session-id'] as string);

  if (!sessionId || !transports[sessionId]) {
    res.status(404).send('Session not found');
    return;
  }

  const transport = transports[sessionId];
  
  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('Error handling POST:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Error' });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});