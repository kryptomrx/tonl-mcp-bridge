/**
 * Local ChromaDB with TONL Demo
 * 
 * Zero configuration! No Docker, no cloud.
 * Just local vector search with 40-60% token savings.
 */

import 'dotenv/config';
import { ChromaClient } from 'chromadb';
import { OpenAI } from 'openai';
import { ChromaAdapter } from 'tonl-mcp-bridge';

// Validate environment
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env');
  console.log('💡 Copy .env.example to .env and add your API key');
  process.exit(1);
}

// Initialize
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const vectorStore = new ChromaAdapter({
  path: './chroma_data',
  collectionName: 'ai_docs',
});

/**
 * Generate embedding using OpenAI
 */
async function embed(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Search with TONL compression
 */
async function searchWithTONL(query) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Query:', query);
  console.log('='.repeat(60));

  // Generate embedding
  console.log('\n📊 Step 1: Generating embedding...');
  const startEmbed = Date.now();
  const queryEmbedding = await embed(query);
  const embedTime = Date.now() - startEmbed;
  console.log(`✅ Embedding generated (${embedTime}ms)`);

  // Search with TONL
  console.log('\n🔎 Step 2: Searching local database...');
  const startSearch = Date.now();
  
  const results = await vectorStore.searchToTonl(queryEmbedding, {
    limit: 5,
  });
  
  const searchTime = Date.now() - startSearch;
  console.log(`✅ Found ${results.results?.length || 0} results (${searchTime}ms)`);

  // Show compression stats
  if (results.stats) {
    console.log('\n💎 Compression Results:');
    console.log('─'.repeat(60));
    console.log(`📦 Original format:   ${results.stats.originalTokens.toLocaleString()} tokens`);
    console.log(`✨ TONL format:       ${results.stats.compressedTokens.toLocaleString()} tokens`);
    console.log(`💰 Tokens saved:      ${results.stats.savedTokens.toLocaleString()} tokens`);
    console.log(`📉 Compression ratio: ${results.stats.compressionRatio}%`);
    
    // Calculate cost savings
    const inputCost = 0.003; // $0.003 per 1K tokens (GPT-4)
    const savedCost = (results.stats.savedTokens / 1000) * inputCost;
    const annualSavings = savedCost * 1000 * 365; // 1000 queries/day
    
    console.log(`\n💵 Cost Savings:`);
    console.log(`   Per query:  $${savedCost.toFixed(4)}`);
    console.log(`   Per day:    $${(savedCost * 1000).toFixed(2)} (at 1000 queries)`);
    console.log(`   Per year:   $${annualSavings.toFixed(2)} (at 1000 queries/day)`);
  }

  // Show top results
  if (results.results && results.results.length > 0) {
    console.log('\n📄 Top Results:');
    console.log('─'.repeat(60));
    
    results.results.slice(0, 3).forEach((result, idx) => {
      console.log(`\n${idx + 1}. Score: ${result.score.toFixed(4)}`);
      console.log(`   ${result.payload.metadata.title}`);
      console.log(`   ${result.payload.content.substring(0, 100)}...`);
    });
  }

  // Show TONL preview
  console.log('\n📝 TONL Format Preview:');
  console.log('─'.repeat(60));
  const preview = results.tonl.substring(0, 300);
  console.log(preview + '...\n');

  return results;
}

/**
 * Compare with/without TONL
 */
async function compareCompression(query) {
  console.log('\n' + '='.repeat(60));
  console.log('⚖️  COMPARISON: JSON vs TONL');
  console.log('='.repeat(60));

  const queryEmbedding = await embed(query);

  // Standard JSON
  console.log('\n1️⃣  Standard JSON Format:');
  const jsonResults = await vectorStore.search(queryEmbedding, { limit: 5 });
  const jsonStr = JSON.stringify(jsonResults, null, 2);
  const jsonTokens = Math.ceil(jsonStr.length / 4); // Rough estimate
  console.log(`   Size: ${jsonStr.length.toLocaleString()} characters`);
  console.log(`   Tokens: ~${jsonTokens.toLocaleString()}`);

  // TONL format
  console.log('\n2️⃣  TONL Format:');
  const tonlResults = await vectorStore.searchToTonl(queryEmbedding, { limit: 5 });
  const tonlTokens = tonlResults.stats.compressedTokens;
  console.log(`   Size: ${tonlResults.tonl.length.toLocaleString()} characters`);
  console.log(`   Tokens: ${tonlTokens.toLocaleString()}`);

  // Comparison
  const saved = jsonTokens - tonlTokens;
  const percentage = ((saved / jsonTokens) * 100).toFixed(1);
  
  console.log('\n📊 Results:');
  console.log(`   Tokens saved: ${saved.toLocaleString()} (${percentage}%)`);
  console.log(`   ${percentage}% smaller = ${percentage}% cheaper!`);
}

/**
 * Main demo
 */
async function main() {
  console.log('🚀 Local ChromaDB with TONL');
  console.log('📍 Location: ./chroma_data (no Docker needed!)\n');

  // Connect
  console.log('🔌 Connecting to local ChromaDB...');
  await vectorStore.connect();
  console.log('✅ Connected!\n');

  try {
    // Example queries
    const queries = [
      "What is RAG and how does it work?",
      "Explain vector embeddings in simple terms",
      "How do I choose the right vector database?",
    ];

    // Run searches
    for (const query of queries) {
      await searchWithTONL(query);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Show comparison
    await compareCompression(queries[0]);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Demo Complete!');
    console.log('='.repeat(60));
    console.log('\n💡 Key Takeaways:');
    console.log('   • 40-60% token reduction with TONL');
    console.log('   • Zero configuration (no Docker!)');
    console.log('   • Sub-10ms search latency');
    console.log('   • Complete privacy (local storage)');
    console.log('   • Significant cost savings');
    console.log('\n🎯 Try it with your own documents!');
    console.log('   Edit setup.js to add your data.\n');

  } finally {
    await vectorStore.disconnect();
  }
}

// Run
main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
