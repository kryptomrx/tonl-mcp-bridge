#!/usr/bin/env node
/**
 * TONL MCP Server CLI Entry Point
 * Starts the HTTP/SSE MCP server with graceful shutdown support.
 * Optimized for Docker and production environments.
 */

import { startHttpServer } from './server.js';

async function main() {
  const PORT = process.env.PORT || 3000;
  
  try {
    const server = startHttpServer(PORT);

    // Graceful Shutdown Logic (Critical for Docker!)
    // Handles SIGINT (Ctrl+C) and SIGTERM (Docker stop, Kubernetes, etc.)
    const shutdown = (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      
      // Set a timeout to force exit if server doesn't close in time
      const forceTimeout = setTimeout(() => {
        console.error('⚠️  Force shutdown (server did not close in 10s)');
        process.exit(1);
      }, 10000);
      
      server.close(() => {
        clearTimeout(forceTimeout);
        console.log('✅ Server stopped cleanly.');
        process.exit(0);
      });
      
      // Also close any active connections after timeout
      setTimeout(() => {
        console.log('⏱️  Closing remaining connections...');
        server.closeAllConnections?.(); // Node 18.2+ feature
      }, 5000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    console.log('💡 Press Ctrl+C to stop the server gracefully');

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unhandled error in main():', error);
  process.exit(1);
});