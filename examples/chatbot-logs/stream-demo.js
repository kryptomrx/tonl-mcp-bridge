/**
 * Interactive Stream Demo
 * 
 * Shows TONL compression in real-time with visual feedback.
 * Perfect for understanding how streaming compression works!
 * 
 * Run: npm run demo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Transform } from 'stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = path.join(__dirname, 'logs', 'chatbot.ndjson');

/**
 * Visual TONL Transform with real-time output
 */
class VisualTONLTransform extends Transform {
  constructor() {
    super({ objectMode: true });
    this.count = 0;
    this.totalOriginal = 0;
    this.totalCompressed = 0;
  }

  jsonToTONL(obj) {
    const lines = [];
    for (const [key, value] of Object.entries(obj)) {
      if (value === null) continue;
      if (typeof value === 'object' && !Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const [k, v] of Object.entries(value)) {
          lines.push(`  ${k}: ${v}`);
        }
      } else {
        const val = typeof value === 'string' ? `"${value}"` : value;
        lines.push(`${key}: ${val}`);
      }
    }
    return lines.join('\n');
  }

  _transform(chunk, encoding, callback) {
    const line = chunk.toString().trim();
    if (!line) return callback();

    try {
      const json = JSON.parse(line);
      const tonl = this.jsonToTONL(json);
      
      this.count++;
      this.totalOriginal += line.length;
      this.totalCompressed += tonl.length;

      // Show individual log compression
      if (this.count <= 5) {
        console.log('\n' + '─'.repeat(60));
        console.log(`📝 Log #${this.count}: ${json.id}`);
        console.log('─'.repeat(60));
        
        console.log('\n🔵 Original JSON:');
        console.log(JSON.stringify(json, null, 2).substring(0, 200) + '...');
        console.log(`   Size: ${line.length} chars`);
        
        console.log('\n🟢 TONL Format:');
        console.log(tonl.substring(0, 200) + '...');
        console.log(`   Size: ${tonl.length} chars`);
        
        const saved = line.length - tonl.length;
        const ratio = ((saved / line.length) * 100).toFixed(1);
        console.log(`\n💰 Saved: ${saved} chars (${ratio}%)`);
      }

      this.push(tonl + '\n---\n');
      callback();

    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    // Final summary
    const saved = this.totalOriginal - this.totalCompressed;
    const ratio = ((saved / this.totalOriginal) * 100).toFixed(1);

    console.log('\n\n' + '='.repeat(60));
    console.log('📊 FINAL STATS');
    console.log('='.repeat(60));
    console.log(`Logs processed:    ${this.count.toLocaleString()}`);
    console.log(`Original size:     ${this.totalOriginal.toLocaleString()} chars`);
    console.log(`Compressed size:   ${this.totalCompressed.toLocaleString()} chars`);
    console.log(`Bytes saved:       ${saved.toLocaleString()} chars`);
    console.log(`Compression:       ${ratio}%`);
    
    console.log('\n💡 Key Insight:');
    console.log(`   Every log is ~${ratio}% smaller with TONL!`);
    console.log(`   That's ${ratio}% less tokens = ${ratio}% lower LLM costs!\n`);
    
    callback();
  }
}

/**
 * Line splitter
 */
class LineSplitter extends Transform {
  constructor() {
    super({ objectMode: true });
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    lines.forEach(line => line.trim() && this.push(line + '\n'));
    callback();
  }

  _flush(callback) {
    if (this.buffer.trim()) this.push(this.buffer);
    callback();
  }
}

/**
 * Interactive demo
 */
async function demo() {
  console.clear();
  console.log('🎬 TONL Transform Stream - Interactive Demo');
  console.log('='.repeat(60));
  console.log('\nThis demo shows REAL-TIME compression of chatbot logs.');
  console.log('Watch how JSON transforms to TONL format!\n');
  
  // Check for input file
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('❌ No logs found!');
    console.log('💡 First run: npm run generate\n');
    process.exit(1);
  }

  console.log('📂 Source:', INPUT_FILE);
  console.log('🎯 Processing first 5 logs in detail...\n');
  
  await new Promise((resolve, reject) => {
    let count = 0;
    const maxLogs = 100; // Process 100 logs for demo

    const input = fs.createReadStream(INPUT_FILE);
    const splitter = new LineSplitter();
    const transform = new VisualTONLTransform();

    input.pipe(splitter).pipe(transform);

    transform.on('data', () => {
      count++;
      if (count >= maxLogs) {
        input.destroy();
        transform.end();
      }
    });

    transform.on('end', resolve);
    transform.on('error', reject);
  });

  console.log('✨ Demo complete!\n');
  console.log('Want to process ALL logs?');
  console.log('   Run: npm run compress\n');
}

// Run
demo().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
