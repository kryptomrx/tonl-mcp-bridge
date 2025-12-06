import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { pipeline } from 'stream/promises';
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
  recordDataSize,
  recordError,
  setBuildInfo
} from './metrics.js';
import { NdjsonParse, TonlTransform } from '../core/streams/index.js';

// --- SECURITY CONFIGURATION ---
const AUTH_TOKEN = process.env.TONL_AUTH_TOKEN;

// --- AUTH MIDDLEWARE ---
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip auth if no token is configured (development mode)
  if (!AUTH_TOKEN) return next();

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    recordError('auth');
    res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  
  if (token !== AUTH_TOKEN) {
    recordError('auth');
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

// --- LIVE METRICS STREAM (SSE) ---
/**
 * GET /metrics/live - Server-Sent Events stream for real-time monitoring
 * 
 * Provides live metrics updates for the CLI 'tonl top' command.
 * Works seamlessly with remote servers (cloud deployments).
 * 
 * Headers:
 *   Authorization: Bearer <token> (if TONL_AUTH_TOKEN is set)
 * 
 * Example:
 *   curl -N -H "Authorization: Bearer $TOKEN" http://localhost:3000/metrics/live
 */
app.get('/metrics/live', authMiddleware, async (req, res) => {
  // SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx compatibility

  console.log('📊 Live metrics stream connected');

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  // Stream metrics every second
  const interval = setInterval(async () => {
    try {
      const metricsText = await getMetricsRegistry().metrics();
      
      // Parse and send as JSON for easier CLI consumption
      const snapshot = {
        type: 'metrics',
        timestamp: Date.now(),
        data: metricsText,
      };
      
      res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    } catch (error) {
      console.error('Error streaming metrics:', error);
    }
  }, 1000);

  // Cleanup on disconnect
  req.on('close', () => {
    console.log('📊 Live metrics stream disconnected');
    clearInterval(interval);
    res.end();
  });
});

// --- STREAMING ENDPOINT ---
/**
 * POST /stream/convert - Convert NDJSON stream to TONL stream
 * 
 * High-performance streaming conversion for log files.
 * Supports gigabyte-sized files with constant memory usage.
 * 
 * Headers:
 *   Content-Type: application/x-ndjson
 *   Authorization: Bearer <token> (optional)
 * 
 * Query params:
 *   collection: Collection name (default: 'data')
 *   skipInvalid: Skip invalid JSON lines (default: true)
 * 
 * Example:
 *   curl -X POST http://localhost:3000/stream/convert?collection=logs \
 *        -H "Content-Type: application/x-ndjson" \
 *        --data-binary @logs.ndjson
 */
app.post('/stream/convert', async (req, res) => {
  const collectionName = (req.query.collection as string) || 'data';
  const skipInvalid = req.query.skipInvalid !== 'false';
  
  // Validate Content-Type
  const contentType = req.headers['content-type'];
  if (contentType && !contentType.includes('ndjson') && !contentType.includes('json')) {
    res.status(400).json({ 
      error: 'Invalid Content-Type',
      expected: 'application/x-ndjson or application/json'
    });
    return;
  }

  // Set response headers for streaming
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Collection-Name', collectionName);

  const startTime = Date.now();
  let linesProcessed = 0;
  let bytesIn = 0;
  let bytesOut = 0;

  try {
    const parser = new NdjsonParse({ skipInvalid });
    const transform = new TonlTransform({ collectionName, skipInvalid });

    // Track metrics
    req.on('data', (chunk) => {
      bytesIn += chunk.length;
    });

    transform.on('data', (chunk) => {
      bytesOut += chunk.length;
    });

    // Pipeline: Request → NDJSON Parser → TONL Transform → Response
    await pipeline(
      req,
      parser,
      transform,
      res
    );

    linesProcessed = transform.getRowCount();
    const duration = (Date.now() - startTime) / 1000;
    
    // Log stats
    console.log(`Stream completed: ${linesProcessed} lines, ${bytesIn}→${bytesOut} bytes, ${duration.toFixed(2)}s`);
    
    // Record metrics
    recordDataSize(bytesIn, 'json_input');
    recordDataSize(bytesOut, 'tonl_output');
    
  } catch (error) {
    recordError('stream');
    console.error('Stream error:', error);
    
    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Stream processing failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
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
          recordError('validation');
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
          recordError('validation');
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
          recordError('validation');
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
    recordError('internal');
    console.error('Transport error:', err);
    // Don't decrement here - the 'close' handler will do it
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
    recordError('internal');
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
  // Set build info on startup
  setBuildInfo('1.0.0');
  
  const server = app.listen(port, () => {
    console.log(`🚀 TONL MCP Server listening on port ${port}`);
    console.log(`   - SSE Stream: http://localhost:${port}/mcp`);
    console.log(`   - Log Stream: http://localhost:${port}/stream/convert`);
    console.log(`   - Metrics: http://localhost:${port}/metrics`);
    console.log(`   - Live Monitor: http://localhost:${port}/metrics/live`);
    
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