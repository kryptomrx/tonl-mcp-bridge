#!/usr/bin/env node
/**
 * TONL MCP Server CLI Entry Point
 * Starts the HTTP/SSE MCP server with graceful shutdown support.
 * Optimized for Docker and production environments.
 */

import { startHttpServer } from './server.js';
import { getAvailablePort } from './utils/port.js';
import crypto from 'crypto';

async function main() {
  // 1. Preferred port from env or default
  const preferredPort = parseInt(process.env.PORT || '3000', 10);
  
  try {
    // 2. Port Hunting: Find an available port
    const PORT = await getAvailablePort(preferredPort);

    // 3. Warning if we had to use a different port
    if (PORT !== preferredPort) {
      console.log(`\n⚠️  Port ${preferredPort} was busy, using available port ${PORT} instead.\n`);
    }

    // --- 🔐 ZERO-CONFIG SECURITY FEATURE ---
    // If no token is set, generate one automatically for this session
    if (!process.env.TONL_AUTH_TOKEN) {
      const generatedToken = crypto.randomUUID();
      process.env.TONL_AUTH_TOKEN = generatedToken;

      // Beautiful box output for maximum visibility (no external dependencies)
      console.log('\n┌──────────────────────────────────────────────────────────────────────┐');
      console.log('│  🔐  NO TOKEN FOUND - AUTO-GENERATED FOR SESSION                     │');
      console.log('├──────────────────────────────────────────────────────────────────────┤');
      console.log('│                                                                      │');
      console.log(`│  Token: ${generatedToken}  │`);
      console.log('│                                                                      │');
      console.log('├──────────────────────────────────────────────────────────────────────┤');
      console.log('│  👉 Copy this to your Claude Desktop / Cursor Config                 │');
      console.log('│  💡 To persist: export TONL_AUTH_TOKEN=<token>                       │');
      console.log('│  ⚠️  This token is valid ONLY for this running session               │');
      console.log('└──────────────────────────────────────────────────────────────────────┘\n');
    }
    // ---------------------------------------

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
      if ('closeAllConnections' in server) {
        setTimeout(() => {
          console.log('⏱️  Closing remaining connections...');
          (server as any).closeAllConnections();
        }, 5000);
      }
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
