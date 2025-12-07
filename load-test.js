#!/usr/bin/env node
/**
 * Load Test Script for TONL MCP Server
 * 
 * Only tests streaming endpoint (which works great!)
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.TONL_AUTH_TOKEN;

// Test data
const testData = [
  { id: 1, name: "Alice", email: "alice@example.com", age: 25, active: true },
  { id: 2, name: "Bob", email: "bob@example.com", age: 30, active: true },
  { id: 3, name: "Charlie", email: "charlie@example.com", age: 35, active: false },
  { id: 4, name: "Diana", email: "diana@example.com", age: 28, active: true },
  { id: 5, name: "Eve", email: "eve@example.com", age: 32, active: false },
];

// Generate random data for variety
function generateRandomUser(id) {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack'];
  const domains = ['example.com', 'test.com', 'demo.com', 'mail.com'];
  
  const name = names[Math.floor(Math.random() * names.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  
  return {
    id,
    name: `${name}${id}`,
    email: `${name.toLowerCase()}${id}@${domain}`,
    age: Math.floor(Math.random() * 40) + 20,
    active: Math.random() > 0.3,
    score: Math.random() * 100,
    created: new Date().toISOString(),
  };
}

async function streamConvert(size = 5) {
  // Generate random data
  const data = Array.from({ length: size }, (_, i) => generateRandomUser(i + 1));
  const ndjson = data.map(obj => JSON.stringify(obj)).join('\n');
  
  const headers = {
    'Content-Type': 'application/x-ndjson',
  };
  
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  try {
    const startTime = Date.now();
    const response = await fetch(`${API_URL}/stream/convert?collection=users`, {
      method: 'POST',
      headers,
      body: ndjson
    });

    if (!response.ok) {
      console.error(`❌ Stream failed: ${response.status}`);
      return { success: false, duration: 0 };
    }

    await response.text(); // Consume response
    const duration = Date.now() - startTime;
    
    return { success: true, duration, records: size };
  } catch (error) {
    console.error(`❌ Stream failed: ${error.message}`);
    return { success: false, duration: 0 };
  }
}

async function runLoadTest(duration = 30, requestsPerSecond = 2, recordsPerRequest = 5) {
  console.log('🚀 Starting TONL Load Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📊 Rate: ${requestsPerSecond} requests/s`);
  console.log(`📝 Records: ${recordsPerRequest} per request`);
  console.log(`🎯 Target: ${API_URL}`);
  console.log(`🔒 Auth: ${AUTH_TOKEN ? 'Enabled ✓' : 'Disabled ✗'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const interval = 1000 / requestsPerSecond;
  let requestCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let totalRecords = 0;
  let totalDuration = 0;
  
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  
  const timer = setInterval(async () => {
    if (Date.now() >= endTime) {
      clearInterval(timer);
      
      const totalTime = (Date.now() - startTime) / 1000;
      const avgDuration = successCount > 0 ? totalDuration / successCount : 0;
      const recordsPerSec = totalRecords / totalTime;
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Load Test Complete!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`⏱️  Total Time: ${totalTime.toFixed(1)}s`);
      console.log(`📤 Total Requests: ${requestCount}`);
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Errors: ${errorCount}`);
      console.log(`📈 Success Rate: ${((successCount / requestCount) * 100).toFixed(1)}%`);
      console.log(`📝 Total Records: ${totalRecords}`);
      console.log(`⚡ Records/sec: ${recordsPerSec.toFixed(1)}`);
      console.log(`⏱️  Avg Latency: ${avgDuration.toFixed(0)}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      process.exit(0);
      return;
    }
    
    requestCount++;
    
    try {
      const result = await streamConvert(recordsPerRequest);
      
      if (result.success) {
        successCount++;
        totalRecords += result.records;
        totalDuration += result.duration;
        
        // Show success with timing
        const emoji = result.duration < 50 ? '⚡' : result.duration < 100 ? '✅' : '🐢';
        process.stdout.write(`${emoji} `);
      } else {
        errorCount++;
        process.stdout.write('❌ ');
      }
      
    } catch (error) {
      errorCount++;
      process.stdout.write('❌ ');
    }
    
    // Progress update every 10 requests
    if (requestCount % 10 === 0) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const recordsPerSec = totalRecords / elapsed;
      console.log(`\n📊 ${elapsed}s | Reqs: ${requestCount} | Success: ${successCount} | Errors: ${errorCount} | Records/s: ${recordsPerSec.toFixed(1)}`);
    }
  }, interval);
}

// Parse command line args
const args = process.argv.slice(2);
const durationArg = args.find(arg => arg.startsWith('--duration='));
const rateArg = args.find(arg => arg.startsWith('--rate='));
const recordsArg = args.find(arg => arg.startsWith('--records='));

const duration = durationArg ? parseInt(durationArg.split('=')[1]) : 30;
const rate = rateArg ? parseInt(rateArg.split('=')[1]) : 2;
const records = recordsArg ? parseInt(recordsArg.split('=')[1]) : 5;

// Show usage
if (args.includes('--help') || args.includes('-h')) {
  console.log('TONL Load Test Script');
  console.log('\nUsage:');
  console.log('  node load-test.js [options]');
  console.log('\nOptions:');
  console.log('  --duration=<seconds>  Test duration (default: 30)');
  console.log('  --rate=<req/s>        Requests per second (default: 2)');
  console.log('  --records=<n>         Records per request (default: 5)');
  console.log('\nEnvironment:');
  console.log('  API_URL              Server URL (default: http://localhost:3000)');
  console.log('  TONL_AUTH_TOKEN      Auth token (optional)');
  console.log('\nExamples:');
  console.log('  node load-test.js');
  console.log('  node load-test.js --duration=60 --rate=5');
  console.log('  node load-test.js --rate=10 --records=50');
  console.log('  TONL_AUTH_TOKEN=abc123 node load-test.js --rate=10');
  console.log('\nWatch live metrics:');
  console.log('  Terminal 1: npm run mcp:start');
  console.log('  Terminal 2: node dist/cli/index.js top');
  console.log('  Terminal 3: node load-test.js --rate=5');
  process.exit(0);
}

runLoadTest(duration, rate, records);
