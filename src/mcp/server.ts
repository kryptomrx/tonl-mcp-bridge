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
import { fileURLToPath } from 'url';
import {
  getMetricsRegistry,
  incrementConnections,
  decrementConnections,
  recordConversion,
  recordTokenSavings,
  recordCompressionRatio,
  recordDataSize
} from './metrics.js';

// --- SECURITY CONFIGURATION ---
const AUTH_TOKEN = process.env.TONL_AUTH_TOKEN;

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

const app = express();

app.use(express.json({ limit: '50mb' }));

// --- ROUTES (before middleware) ---

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', getMetricsRegistry().contentType);
    const metrics = await getMetricsRegistry().metrics();
    res.end(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).end('Error generating metrics');
  }
});

app.use('/mcp', authMiddleware);

// --- MCP SERVER SETUP ---

// Store active transports to handle POST requests
const transports: Record<string, SSEServerTransport> = {};

/**
 * Create a new MCP server instance with all tools registered
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'tonl-mcp-bridge',
    version: '1.0.0'
  });

  // Tool: convert_to_tonl
  server.tool(
    'convert_to_tonl',
    'Convert JSON data to TONL format. Reduces token usage by 30-60%.',
    ConvertToTonlSchema.shape, 
    async (args) => {
      return await recordConversion('json_to_tonl', async () => {
        const validated = ConvertToTonlSchema.parse(args);
        
        // Record input data size
        const inputSize = JSON.stringify(validated.data).length;
        recordDataSize(inputSize, 'json_input');
        
        const result = await convertToTonlHandler(validated);
        
        if (!result.success) {
          return {
            isError: true,
            content: [{ type: 'text', text: result.error || 'Conversion failed' }]
          };
        }

        // Record metrics
        if (result.stats && result.data?.tonl) {
          const model = 'gpt-4o'; // Default model for MCP conversions
          
          // Record token savings (with null check)
          if (result.stats.savedTokens) {
            recordTokenSavings(result.stats.savedTokens, model);
          }
          
          // Record compression ratio (with null checks)
          if (result.stats.originalTokens && result.stats.compressedTokens) {
            recordCompressionRatio(
              result.stats.originalTokens,
              result.stats.compressedTokens,
              model
            );
          }
          
          // Record output size
          const outputSize = result.data.tonl.length;
          recordDataSize(outputSize, 'tonl_output');
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ tonl: result.data?.tonl, stats: result.stats }, null, 2)
          }]
        };
      });
    }
  );

  // Tool: parse_tonl
  server.tool(
    'parse_tonl',
    'Parse TONL format back to JSON.',
    ParseTonlSchema.shape,
    async (args) => {
      return await recordConversion('tonl_to_json', async () => {
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
      });
    }
  );

  // Tool: calculate_savings
  server.tool(
    'calculate_savings',
    'Calculate token savings between JSON and TONL formats.',
    CalculateSavingsSchema.shape,
    async (args) => {
      return await recordConversion('calculate_savings', async () => {
        const validated = CalculateSavingsSchema.parse(args);
        const result = await calculateSavingsHandler(validated);

        if (!result.success) {
          return {
            isError: true,
            content: [{ type: 'text', text: result.error || 'Calculation failed' }]
          };
        }

        // Record savings if available
        if (result.data) {
          const model = validated.model || 'gpt-5';
          
          // Record with null checks
          if (result.data.savedTokens) {
            recordTokenSavings(result.data.savedTokens, model);
          }
          
          if (result.data.originalTokens && result.data.compressedTokens) {
            recordCompressionRatio(
              result.data.originalTokens,
              result.data.compressedTokens,
              model
            );
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result.data, null, 2)
          }]
        };
      });
    }
  );

  return server;
}

// --- MCP ROUTES ---

app.get('/mcp', async (req, res) => {
  // Use provided sessionId or generate new one
  const sessionId = (req.query.sessionId as string) || crypto.randomUUID();
  
  console.log(`-> New SSE connection: ${sessionId}`);
  
  // Track connection
  incrementConnections();

  const transport = new SSEServerTransport('/mcp', res);
  const server = createMcpServer();

  transports[sessionId] = transport;

  req.on('close', () => {
    console.log(`<- Connection closed: ${sessionId}`);
    decrementConnections();
    delete transports[sessionId];
  });

  try {
    await server.connect(transport);
    await transport.start();
  } catch (err) {
    console.error('Transport error:', err);
    decrementConnections();
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

/**
 * Starts the HTTP server.
 * This function allows the server to be started programmatically (e.g. from index.ts).
 */
export function startHttpServer(port: number | string = 3000) {
  const server = app.listen(port, () => {
    console.log(`🚀 TONL MCP Server listening on port ${port}`);
    console.log(`   - SSE Stream: http://localhost:${port}/mcp`);
    console.log(`   - Metrics: http://localhost:${port}/metrics`);
    
    if (process.env.TONL_AUTH_TOKEN) {
      console.log(`   🔒 Security: Enabled (Bearer Token required for /mcp)`);
    } else {
      console.warn(`   ⚠️  Security: Disabled (No TONL_AUTH_TOKEN set)`);
    }
  });

  return server;
}

// --- AUTO-START (Only if run directly) ---
// This allows `node dist/mcp/server.js` to work as expected,
// while `import { startHttpServer }` behaves as a library.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startHttpServer(process.env.PORT || 3000);
}