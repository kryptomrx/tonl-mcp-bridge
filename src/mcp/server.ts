/**
 * TONL MCP Server
 * Main server implementation using @modelcontextprotocol/sdk
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import { McpServerConfig } from './types.js';
import {
  CONVERT_TO_TONL_TOOL,
  convertToTonlHandler,
} from './tools/convert.js';
import { PARSE_TONL_TOOL, parseTonlHandler } from './tools/parse.js';
import {
  CALCULATE_SAVINGS_TOOL,
  calculateSavingsHandler,
} from './tools/calculate-savings.js';
import {
  ConvertToTonlSchema,
  ParseTonlSchema,
  CalculateSavingsSchema,
} from './types.js';

export class TonlMcpServer {
  private server: Server;
  private config: McpServerConfig;

  constructor(config: McpServerConfig) {
    this.config = config;

    // Initialize MCP server
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          CONVERT_TO_TONL_TOOL,
          PARSE_TONL_TOOL,
          CALCULATE_SAVINGS_TOOL,
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'convert_to_tonl': {
            const validated = ConvertToTonlSchema.parse(args);
            const result = await convertToTonlHandler(validated);

            if (!result.success) {
              throw new McpError(
                ErrorCode.InternalError,
                result.error || 'Conversion failed',
              );
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      tonl: result.data?.tonl,
                      stats: result.stats,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case 'parse_tonl': {
            const validated = ParseTonlSchema.parse(args);
            const result = await parseTonlHandler(validated);

            if (!result.success) {
              throw new McpError(
                ErrorCode.InternalError,
                result.error || 'Parsing failed',
              );
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result.data?.json, null, 2),
                },
              ],
            };
          }

          case 'calculate_savings': {
            const validated = CalculateSavingsSchema.parse(args);
            const result = await calculateSavingsHandler(validated);

            if (!result.success) {
              throw new McpError(
                ErrorCode.InternalError,
                result.error || 'Calculation failed',
              );
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result.data, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`,
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    });
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error(`${this.config.name} v${this.config.version} started`);
    console.error('Server running on stdio transport');
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    await this.server.close();
    console.error('Server stopped');
  }
}

/**
 * Create and start a TONL MCP server
 */
export async function createTonlMcpServer(
  config: Partial<McpServerConfig> = {},
): Promise<TonlMcpServer> {
  const defaultConfig: McpServerConfig = {
    name: 'tonl-mcp-bridge',
    version: '0.5.0',
    enableResources: false,
    enablePrompts: false,
    ...config,
  };

  const server = new TonlMcpServer(defaultConfig);
  return server;
}