import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ConvertToTonlSchema,
  ParseTonlSchema,
  CalculateSavingsSchema,
  VALID_MODELS
} from './types.js';
import { convertToTonlHandler } from './tools/convert.js';
import { parseTonlHandler } from './tools/parse.js';
import { calculateSavingsHandler } from './tools/calculate-savings.js';

console.log("Starting TONL MCP Server (HTTP/SSE)...");

const app = express();
// Increase limit for large batch payloads
app.use(express.json({ limit: '50mb' }));

// --- SECURITY CONFIGURATION ---
const AUTH_TOKEN = process.env.TONL_AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.warn('⚠️  WARNING: No TONL_AUTH_TOKEN set in environment. Server is unsecured!');
}

// --- AUTH MIDDLEWARE ---
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip auth if no token is configured (development mode)
  if (!AUTH_TOKEN) return next();

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  
  if (token !== AUTH_TOKEN) {
    res.status(403).json({ error: 'Forbidden: Invalid token' });
    return;
  }

  next();
};

// Apply auth to all MCP routes
app.use('/mcp', authMiddleware);

// --- SERVER SETUP ---

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

  // Tool: convert_to_tonl
  server.tool(
    'convert_to_tonl',
    'Convert JSON data to TONL format. Reduces token usage by 30-60%.',
    ConvertToTonlSchema.shape, // Use Zod shape from types.ts
    async (args) => {
      // Validate args using the schema (double check)
      const validated = ConvertToTonlSchema.parse(args);
      const result = await convertToTonlHandler(validated);
      
      if (!result.success) {
        return {
          isError: true,
          content: [{ type: 'text', text: result.error || 'Conversion failed' }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ tonl: result.data?.tonl, stats: result.stats }, null, 2)
        }]
      };
    }
  );

  // Tool: parse_tonl
  server.tool(
    'parse_tonl',
    'Parse TONL format back to JSON.',
    ParseTonlSchema.shape,
    async (args) => {
      const validated = ParseTonlSchema.parse(args);
      const result = await parseTonlHandler(validated);

      if (!result.success) {
        return {
          isError: true,
          content: [{ type: 'text', text: result.error || 'Parsing failed' }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result.data?.json, null, 2)
        }]
      };
    }
  );

  // Tool: calculate_savings
  server.tool(
    'calculate_savings',
    'Calculate token savings between JSON and TONL formats.',
    CalculateSavingsSchema.shape,
    async (args) => {
      const validated = CalculateSavingsSchema.parse(args);
      const result = await calculateSavingsHandler(validated);

      if (!result.success) {
        return {
          isError: true,
          content: [{ type: 'text', text: result.error || 'Calculation failed' }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result.data, null, 2)
        }]
      };
    }
  );

  return server;
}

// --- ROUTES ---

/**
 * GET /mcp -> Start SSE connection
 */
app.get('/mcp', async (req, res) => {
  // Use provided sessionId or generate new one
  const sessionId = (req.query.sessionId as string) || crypto.randomUUID();
  
  console.log(`-> New SSE connection: ${sessionId}`);

  const transport = new SSEServerTransport('/mcp', res);
  const server = createMcpServer();

  transports[sessionId] = transport;

  req.on('close', () => {
    console.log(`<- Connection closed: ${sessionId}`);
    delete transports[sessionId];
  });

  try {
    await server.connect(transport);
    await transport.start();
  } catch (err) {
    console.error('Transport error:', err);
    if (!res.headersSent) res.status(500).end();
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
  console.log(`🚀 TONL MCP Server listening on port ${PORT}`);
  console.log(`   - SSE Stream: http://localhost:${PORT}/mcp`);
  if (AUTH_TOKEN) {
    console.log(`   🔒 Security: Enabled (Bearer Token required)`);
  } else {
    console.log(`   ⚠️ Security: Disabled`);
  }
});