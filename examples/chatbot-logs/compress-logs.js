/**
 * Compress Logs with TONL Transform Stream
 * 
 * Demonstrates real-time NDJSON → TONL compression using Node.js streams.
 * Handles unlimited file sizes with constant memory usage.
 * 
 * Run: npm run compress
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT_FILE = path.join(__dirname, 'logs', 'chatbot.ndjson');
const OUTPUT_FILE = path.join(__dirname, 'logs', 'chatbot.tonl');
const BATCH_SIZE = 100; // Process 100 logs at a time

/**
 * TONL Transform Stream
 * 
 * Converts NDJSON logs to TONL format line-by-line.
 * Uses batching for efficiency while maintaining streaming.
 */
class TONLTransform extends Transform {
  constructor(options = {}) {
    super({ objectMode: true });
    this.batchSize = options.batchSize || BATCH_SIZE;
    this.batch = [];
    this.processedCount = 0;
    this.originalBytes = 0;
    this.compressedBytes = 0;
  }

  /**
   * Convert JSON object to TONL format
   */
  jsonToTONL(obj, indent = 0) {
    const prefix = '  '.repeat(indent);
    const lines = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        lines.push(`${prefix}${key}: null`);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        lines.push(`${prefix}${key}:`);
        lines.push(this.jsonToTONL(value, indent + 1));
      } else if (Array.isArray(value)) {
        lines.push(`${prefix}${key}: [${value.join(', ')}]`);
      } else if (typeof value === 'string') {
        // Escape quotes and newlines
        const escaped = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        lines.push(`${prefix}${key}: "${escaped}"`);
      } else {
        lines.push(`${prefix}${key}: ${value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Process a batch of logs
   */
  processBatch() {
    if (this.batch.length === 0) return;

    // Convert each log to TONL
    const tonlLogs = this.batch.map(log => {
      const json = JSON.parse(log);
      const tonl = this.jsonToTONL(json);
      
      // Track sizes
      this.originalBytes += log.length;
      this.compressedBytes += tonl.length;
      
      return tonl;
    });

    // Output batch with separator
    const output = tonlLogs.join('\n---\n') + '\n---\n';
    this.push(output);

    this.processedCount += this.batch.length;
    this.batch = [];
  }

  /**
   * Transform implementation
   */
  _transform(chunk, encoding, callback) {
    const line = chunk.toString().trim();
    
    if (line) {
      this.batch.push(line);
      
      // Process batch when full
      if (this.batch.length >= this.batchSize) {
        this.processBatch();
      }
    }

    callback();
  }

  /**
   * Flush remaining logs
   */
  _flush(callback) {
    this.processBatch();
    callback();
  }

  /**
   * Get compression stats
   */
  getStats() {
    const savedBytes = this.originalBytes - this.compressedBytes;
    const compressionRatio = ((savedBytes / this.originalBytes) * 100).toFixed(1);
    
    return {
      processed: this.processedCount,
      originalBytes: this.originalBytes,
      compressedBytes: this.compressedBytes,
      savedBytes,
      compressionRatio,
    };
  }
}

/**
 * Line splitter transform
 * Converts file stream to line-by-line stream
 */
class LineSplitter extends Transform {
  constructor() {
    super({ objectMode: true });
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    
    // Keep last incomplete line in buffer
    this.buffer = lines.pop() || '';
    
    // Push complete lines
    lines.forEach(line => {
      if (line.trim()) {
        this.push(line + '\n');
      }
    });
    
    callback();
  }

  _flush(callback) {
    if (this.buffer.trim()) {
      this.push(this.buffer);
    }
    callback();
  }
}

/**
 * Progress reporter
 */
class ProgressReporter extends Transform {
  constructor(reportInterval = 1000) {
    super({ objectMode: true });
    this.count = 0;
    this.reportInterval = reportInterval;
    this.startTime = Date.now();
  }

  _transform(chunk, encoding, callback) {
    this.count++;
    
    if (this.count % this.reportInterval === 0) {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      const rate = Math.floor(this.count / (Date.now() - this.startTime) * 1000);
      process.stdout.write(`\r   Processed: ${this.count.toLocaleString()} logs (${rate.toLocaleString()} logs/sec, ${elapsed}s elapsed)`);
    }
    
    this.push(chunk);
    callback();
  }

  _flush(callback) {
    console.log(); // New line after progress
    callback();
  }
}

/**
 * Main compression function
 */
async function compress() {
  console.log('🚀 Chatbot Log Compression\n');

  // Check if input file exists
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('❌ Input file not found:', INPUT_FILE);
    console.log('💡 Run: npm run generate');
    process.exit(1);
  }

  const inputSize = fs.statSync(INPUT_FILE).size;
  const inputSizeMB = (inputSize / 1024 / 1024).toFixed(2);

  console.log('📁 Input:  ', INPUT_FILE);
  console.log('📦 Size:   ', `${inputSizeMB} MB`);
  console.log('📤 Output: ', OUTPUT_FILE);
  console.log('\n🔄 Compressing...\n');

  const startTime = Date.now();

  // Create transform pipeline
  const lineSplitter = new LineSplitter();
  const progressReporter = new ProgressReporter(1000);
  const tonlTransform = new TONLTransform({ batchSize: BATCH_SIZE });

  try {
    // Pipeline: Input → Split Lines → Progress → TONL → Output
    await pipelineAsync(
      fs.createReadStream(INPUT_FILE),
      lineSplitter,
      progressReporter,
      tonlTransform,
      fs.createWriteStream(OUTPUT_FILE)
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const stats = tonlTransform.getStats();
    const outputSize = fs.statSync(OUTPUT_FILE).size;
    const outputSizeMB = (outputSize / 1024 / 1024).toFixed(2);

    console.log('\n✅ Compression Complete!\n');
    console.log('📊 Results:');
    console.log('─'.repeat(50));
    console.log(`   Logs processed:      ${stats.processed.toLocaleString()}`);
    console.log(`   Original size:       ${inputSizeMB} MB`);
    console.log(`   Compressed size:     ${outputSizeMB} MB`);
    console.log(`   Bytes saved:         ${(stats.savedBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Compression ratio:   ${stats.compressionRatio}%`);
    console.log(`   Duration:            ${duration}s`);
    console.log(`   Speed:               ${Math.floor(stats.processed / duration).toLocaleString()} logs/sec`);

    // Cost savings calculation
    const originalTokens = Math.ceil(stats.originalBytes / 4);
    const compressedTokens = Math.ceil(stats.compressedBytes / 4);
    const savedTokens = originalTokens - compressedTokens;
    const costPerMillion = 3; // $3 per 1M tokens (GPT-4)
    const savedCost = (savedTokens / 1000000) * costPerMillion;

    console.log('\n💰 Cost Impact (if used in LLM context):');
    console.log('─'.repeat(50));
    console.log(`   Original tokens:     ${originalTokens.toLocaleString()}`);
    console.log(`   Compressed tokens:   ${compressedTokens.toLocaleString()}`);
    console.log(`   Tokens saved:        ${savedTokens.toLocaleString()}`);
    console.log(`   Cost saved:          $${savedCost.toFixed(4)}`);
    console.log(`   Annual savings:      $${(savedCost * 365).toFixed(2)} (1x/day)`);

    console.log('\n💡 Next steps:');
    console.log('   • Check logs/chatbot.tonl');
    console.log('   • Compare with logs/chatbot.ndjson');
    console.log('   • Run: npm run demo for interactive demo\n');

  } catch (error) {
    console.error('\n❌ Compression failed:', error.message);
    throw error;
  }
}

// Run
compress().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
