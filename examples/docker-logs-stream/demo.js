/**
 * Interactive Demo
 * 
 * Creates a test container and streams its logs to TONL.
 * Perfect for testing the streaming pipeline.
 */

import Docker from 'dockerode';
import { spawn } from 'child_process';

const docker = new Docker();
const CONTAINER_NAME = 'tonl-demo-app';

async function demo() {
  console.log('🎬 TONL Docker Log Streaming Demo\n');

  try {
    // Check if TONL server is running
    console.log('1️⃣  Checking TONL server...');
    const serverCheck = await fetch('http://localhost:3000/metrics').catch(() => null);
    
    if (!serverCheck) {
      console.error('❌ TONL server not running!');
      console.log('💡 Start it with: npm run mcp:start\n');
      process.exit(1);
    }
    console.log('✅ TONL server is running\n');

    // Create demo container
    console.log('2️⃣  Creating demo container...');
    
    // Cleanup old container if exists
    try {
      const oldContainer = docker.getContainer(CONTAINER_NAME);
      await oldContainer.remove({ force: true });
    } catch (e) {
      // Container doesn't exist, that's fine
    }

    // Create nginx container (generates logs)
    const container = await docker.createContainer({
      Image: 'nginx:alpine',
      name: CONTAINER_NAME,
      ExposedPorts: { '80/tcp': {} },
      HostConfig: {
        PortBindings: { '80/tcp': [{ HostPort: '8080' }] },
      },
    });

    await container.start();
    console.log('✅ Container started\n');

    // Wait a moment for container to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate some traffic (creates logs)
    console.log('3️⃣  Generating traffic (creates logs)...');
    for (let i = 0; i < 5; i++) {
      await fetch('http://localhost:8080').catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log('✅ Traffic generated\n');

    // Stream logs to TONL
    console.log('4️⃣  Streaming logs to TONL...');
    console.log('────────────────────────────────────────\n');

    const streamer = spawn('node', ['stream-docker-logs.js', CONTAINER_NAME], {
      stdio: 'inherit',
    });

    // Stop after 10 seconds
    setTimeout(async () => {
      console.log('\n────────────────────────────────────────');
      console.log('✅ Demo complete!\n');

      streamer.kill('SIGINT');

      // Cleanup
      console.log('🧹 Cleaning up...');
      await container.stop();
      await container.remove();
      console.log('✅ Container removed\n');

      console.log('💡 Try it with your own containers:');
      console.log('   npm start -- <container-name>\n');

      process.exit(0);
    }, 10000);

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

demo();
