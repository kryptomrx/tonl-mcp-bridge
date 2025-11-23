import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { jsonToTonl } from '../core/json-to-tonl.js';
import { tonlToJson } from '../core/tonl-to-json.js';
import { calculateRealSavings, countTokens } from '../utils/token-counter.js';
import type { ModelName } from '../utils/tokenizer.js';

const app = express();

const server = new Server(
  {
    name: 'tonl-mcp-bridge',
    version: '0.9.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const VALID_MODELS: ModelName[] = [
  'gpt-5', 'gpt-4', 'gpt-3.5-turbo',
  'claude-4-opus', 'claude-4-sonnet', 'claude-sonnet-4.5',
  'gemini-2.5-pro', 'gemini-2.5-flash'
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'convert_to_tonl',
      description: 'Convert JSON data to TONL format',
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { type: 'object' } },
          name: { type: 'string' }
        },
        required: ['data']
      }
    },
    {
      name: 'parse_tonl',
      description: 'Parse TONL back to JSON',
      inputSchema: {
        type: 'object',
        properties: {
          tonl: { type: 'string' }
        },
        required: ['tonl']
      }
    },
    {
      name: 'calculate_savings',
      description: 'Calculate token savings',
      inputSchema: {
        type: 'object',
        properties: {
          jsonData: { type: 'string' },
          tonlData: { type: 'string' },
          model: { 
            type: 'string',
            enum: VALID_MODELS,
            default: 'gpt-5'
          }
        },
        required: ['jsonData', 'tonlData']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!args) {
    throw new Error('Missing arguments');
  }
  
  switch (name) {
    case 'convert_to_tonl': {
      let data: Record<string, unknown>[];
      let collectionName: string;
      
      if ((!args.data || (Array.isArray(args.data) && args.data.length === 0)) && 
          args.name && typeof args.name === 'string') {
        try {
          const parsed = JSON.parse(args.name);
          if (parsed.data && Array.isArray(parsed.data)) {
            data = parsed.data;
            collectionName = parsed.name || 'data';
          } else {
            throw new Error('Invalid structure');
          }
        } catch (e) {
          throw new Error('Could not parse input');
        }
      } else if (Array.isArray(args)) {
        data = args;
        collectionName = 'data';
      } else if (args.data && Array.isArray(args.data)) {
        data = args.data;
        collectionName = (args.name as string) || 'data';
      } else {
        throw new Error('Invalid input format');
      }
      
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
    
    case 'parse_tonl': {
      const tonlInput = args.tonl as string;
      const parsed = tonlToJson(tonlInput);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(parsed, null, 2)
        }]
      };
    }
    
    case 'calculate_savings': {
      const jsonData = args.jsonData as string;
      const tonlData = args.tonlData as string;
      const modelInput = (args.model as string) || 'gpt-5';
      
      const model = VALID_MODELS.includes(modelInput as ModelName) 
        ? (modelInput as ModelName) 
        : 'gpt-5';
      
      const stats = calculateRealSavings(jsonData, tonlData, model);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(stats, null, 2)
        }]
      };
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

let transport: SSEServerTransport | null = null;

app.get('/sse', (req, res) => {
  transport = new SSEServerTransport('/messages', res);
  server.connect(transport);
});

app.post('/messages', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`MCP Server: http://localhost:${PORT}/sse`);
});