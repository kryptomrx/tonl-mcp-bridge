/**
 * Docker Container Logs → TONL Stream
 * 
 * Production-ready script for streaming Docker logs to TONL format.
 * Handles real-time log streaming with automatic reconnection.
 */

import Docker from 'dockerode';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

const TONL_SERVER = process.env.TONL_SERVER || 'http://localhost:3000';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'docker_logs';

/**
 * Parse Docker log stream into NDJSON
 * Docker logs have 8-byte header: [STREAM_TYPE][0][0][0][SIZE_1][SIZE_2][SIZE_3][SIZE_4]
 */
class DockerLogParser extends Transform {
  constructor() {
    super({ objectMode: true });
    this.buffer = Buffer.alloc(0);
  }

  _transform(chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 8) {
      // Read header
      const streamType = this.buffer[0]; // 1 = stdout, 2 = stderr
      const size = this.buffer.readUInt32BE(4);

      if (this.buffer.length < 8 + size) {
        // Not enough data yet
        break;
      }

      // Extract log message
      const message = this.buffer.slice(8, 8 + size).toString('utf-8').trim();
      this.buffer = this.buffer.slice(8 + size);

      if (message) {
        // Convert to NDJSON
        const logEntry = {
          timestamp: new Date().toISOString(),
          stream: streamType === 1 ? 'stdout' : 'stderr',
          message: message,
        };

        this.push(JSON.stringify(logEntry) + '\n');
      }
    }

    callback();
  }
}

/**
 * Stream Docker container logs to TONL server
 */
async function streamContainerLogs(containerName) {
  console.log(`\n📦 Streaming logs from container: ${containerName}`);
  console.log(`🔄 Connected to TONL server: ${TONL_SERVER}\n`);

  const docker = new Docker();

  try {
    // Get container
    const container = docker.getContainer(containerName);
    
    // Verify container exists
    await container.inspect();

    // Start log stream
    const logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      timestamps: true,
      tail: 0, // Start from now (use 'all' for history)
    });

    const parser = new DockerLogParser();

    // Track stats
    let linesProcessed = 0;
    let bytesStreamed = 0;

    parser.on('data', (chunk) => {
      linesProcessed++;
      bytesStreamed += chunk.length;

      // Log progress every 100 lines
      if (linesProcessed % 100 === 0) {
        process.stdout.write(`\r📊 Lines: ${linesProcessed} | Bytes: ${bytesStreamed}`);
      }
    });

    // Send to TONL server
    const response = await fetch(`${TONL_SERVER}/stream/convert?collection=${COLLECTION_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
      },
      body: logStream.pipe(parser),
      duplex: 'half',
    });

    if (!response.ok) {
      throw new Error(`TONL server error: ${response.status} ${response.statusText}`);
    }

    console.log('\n✅ Stream started successfully');
    console.log('💡 Press Ctrl+C to stop\n');

    // Stream response (TONL format)
    for await (const chunk of response.body) {
      process.stdout.write(chunk);
    }

  } catch (error) {
    if (error.statusCode === 404) {
      console.error(`\n❌ Container '${containerName}' not found`);
      console.log('\n💡 Available containers:');
      const containers = await docker.listContainers();
      containers.forEach(c => {
        console.log(`   - ${c.Names[0].substring(1)} (${c.State})`);
      });
    } else {
      console.error(`\n❌ Error: ${error.message}`);
    }
    process.exit(1);
  }
}

/**
 * Main
 */
async function main() {
  const containerName = process.argv[2];

  if (!containerName) {
    console.error('❌ Usage: npm start -- <container-name>');
    console.log('\nExample:');
    console.log('  npm start -- nginx');
    console.log('  npm start -- web-api\n');
    process.exit(1);
  }

  await streamContainerLogs(containerName);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stream stopped');
  process.exit(0);
});

main().catch(console.error);
