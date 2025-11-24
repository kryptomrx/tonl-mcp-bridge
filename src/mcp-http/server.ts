import crypto from 'crypto';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { jsonToTonl } from '../core/json-to-tonl.js';
import { tonlToJson } from '../core/tonl-to-json.js';
import { calculateRealSavings } from '../utils/token-counter.js';
import type { ModelName } from '../utils/tokenizer.js';

const app = express();
app.use(express.json());

const VALID_MODELS: ModelName[] = [
  'gpt-5', 'gpt-4', 'gpt-3.5-turbo',
  'claude-4-opus', 'claude-4-sonnet', 'claude-sonnet-4.5',
  'gemini-2.5-pro', 'gemini-2.5-flash'
];

const server = new McpServer({
  name: 'tonl-mcp-bridge',
  version: '0.9.0'
});

// Store active transports by session
const transports: Record<string, StreamableHTTPServerTransport> = {};

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

// Streamable HTTP endpoint (2025-03-26 spec)
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const isInitialize = req.body?.method === 'initialize';
  
  let transport: StreamableHTTPServerTransport;
  
  if (!isInitialize && sessionId && transports[sessionId]) {
    // Reuse existing
    transport = transports[sessionId];
  } else {
    // Create new
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID()
    });
    
    // Connect and wait
    await server.connect(transport);
    
    // Store for later
    if (transport.sessionId) {
      transports[transport.sessionId] = transport;
      console.log('Created session:', transport.sessionId);
    }
  }
  
  // Handle the request
  await transport.handleRequest(req, res, req.body);
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Missing or invalid session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`TONL MCP Server (Streamable HTTP): http://localhost:${PORT}/mcp`);
});