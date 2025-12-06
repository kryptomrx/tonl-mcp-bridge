/**
 * Generate Sample Chatbot Logs
 * 
 * Creates realistic NDJSON logs for testing TONL compression.
 * Run: npm run generate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, 'logs', 'chatbot.ndjson');
const LOG_COUNT = 10000; // Change this for more/fewer logs

// Sample data pools
const users = ['user123', 'user456', 'user789', 'alice', 'bob', 'charlie', 'diana', 'eve'];
const topics = [
  { query: 'What is RAG?', response: 'RAG stands for Retrieval Augmented Generation. It enhances LLMs by retrieving relevant information from a knowledge base before generating responses.' },
  { query: 'How do vector databases work?', response: 'Vector databases store embeddings and enable semantic search by finding similar vectors using distance metrics like cosine similarity.' },
  { query: 'Explain embeddings', response: 'Embeddings are numerical representations of text that capture semantic meaning. Similar concepts have similar embeddings.' },
  { query: 'What is TONL?', response: 'TONL is a token-optimized format that reduces token usage by 40-60% compared to JSON, making LLM applications more cost-effective.' },
  { query: 'How to optimize tokens?', response: 'Token optimization strategies include compression formats like TONL, intelligent chunking, caching, and using cheaper models when appropriate.' },
  { query: 'Best vector database?', response: 'The best choice depends on your needs: Pinecone for managed simplicity, Qdrant for speed, ChromaDB for local dev, Weaviate for hybrid search.' },
  { query: 'What is semantic search?', response: 'Semantic search finds results based on meaning rather than exact keyword matches, powered by vector embeddings and similarity calculations.' },
  { query: 'How much does it cost?', response: 'Costs vary by provider. OpenAI embeddings cost $0.02/1M tokens. Vector databases range from free (ChromaDB) to usage-based (Pinecone).' },
  { query: 'Can I run this locally?', response: 'Yes! ChromaDB runs entirely locally without Docker. Perfect for development, privacy-sensitive apps, or offline use.' },
  { query: 'What about production?', response: 'For production, consider managed services like Pinecone or self-hosted solutions like Qdrant. Always implement error handling, monitoring, and caching.' },
];

const statuses = ['success', 'success', 'success', 'error', 'timeout'];
const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet'];

/**
 * Generate a random log entry
 */
function generateLog(index) {
  const user = users[Math.floor(Math.random() * users.length)];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const model = models[Math.floor(Math.random() * models.length)];
  
  const timestamp = new Date(
    Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000 // Last 7 days
  ).toISOString();

  const queryTokens = Math.floor(topic.query.length / 4);
  const responseTokens = Math.floor(topic.response.length / 4);
  const totalTokens = queryTokens + responseTokens;

  const log = {
    id: `log_${index}`,
    timestamp,
    user,
    session: `session_${Math.floor(index / 10)}`, // Group into sessions
    query: topic.query,
    response: status === 'success' ? topic.response : null,
    status,
    model,
    metrics: {
      queryTokens,
      responseTokens,
      totalTokens,
      latencyMs: Math.floor(Math.random() * 2000) + 500,
      cost: (totalTokens / 1000000) * 3, // $3 per 1M tokens
    },
    metadata: {
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (compatible; ChatBot/1.0)',
      region: ['us-east', 'eu-west', 'ap-south'][Math.floor(Math.random() * 3)],
    },
  };

  return log;
}

/**
 * Main generation function
 */
async function generate() {
  console.log('🚀 Generating Chatbot Logs\n');
  console.log(`📝 Creating ${LOG_COUNT.toLocaleString()} log entries...`);
  console.log(`📁 Output: ${OUTPUT_FILE}\n`);

  // Create logs directory if it doesn't exist
  const logsDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Open file for writing
  const stream = fs.createWriteStream(OUTPUT_FILE);

  let written = 0;
  const startTime = Date.now();

  // Generate logs
  for (let i = 0; i < LOG_COUNT; i++) {
    const log = generateLog(i);
    stream.write(JSON.stringify(log) + '\n');
    written++;

    // Progress indicator
    if (written % 1000 === 0) {
      const progress = ((written / LOG_COUNT) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r   Progress: ${written.toLocaleString()}/${LOG_COUNT.toLocaleString()} (${progress}%) - ${elapsed}s elapsed`);
    }
  }

  stream.end();

  // Wait for stream to finish
  await new Promise((resolve) => stream.on('finish', resolve));

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const fileSize = fs.statSync(OUTPUT_FILE).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

  console.log('\n\n✅ Generation Complete!\n');
  console.log('📊 Stats:');
  console.log(`   Logs created: ${LOG_COUNT.toLocaleString()}`);
  console.log(`   File size: ${fileSizeMB} MB`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   Speed: ${Math.floor(LOG_COUNT / duration).toLocaleString()} logs/sec`);
  
  console.log('\n💡 Next steps:');
  console.log('   1. Run: npm run compress');
  console.log('   2. See the compression magic!');
  console.log('   3. Compare file sizes in logs/ folder\n');
}

// Run
generate().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
