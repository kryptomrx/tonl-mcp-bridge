#!/usr/bin/env node
/**
 * TONL MCP Server - stdio mode for Claude Desktop
 * This version uses stdio transport for direct integration with Claude Desktop
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ConvertToTonlSchema,
  ParseTonlSchema,
  CalculateSavingsSchema,
} from './types.js';
import { convertToTonlHandler } from './tools/convert.js';
import { parseTonlHandler } from './tools/parse.js';
import { calculateSavingsHandler } from './tools/calculate-savings.js';

/**
 * Create MCP server with all tools
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

/**
 * Start stdio server
 */
async function main() {
  const transport = new StdioServerTransport();
  const server = createMcpServer();

  await server.connect(transport);
  
  // Log to stderr (stdout is used for MCP protocol)
  console.error('TONL MCP Server (stdio) started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
