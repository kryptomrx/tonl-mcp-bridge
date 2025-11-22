#!/usr/bin/env node
/**
 * TONL MCP Server CLI Entry Point
 * Start the MCP server from command line
 */

import { createTonlMcpServer } from './server.js';

async function main() {
  try {
    const server = await createTonlMcpServer({
      name: 'tonl-mcp-bridge',
      version: '0.5.0',
    });

    await server.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('\nShutting down server...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('\nShutting down server...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();