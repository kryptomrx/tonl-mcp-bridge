/**
 * LangChain RAG with TONL Compression
 * 
 * This example shows how to integrate TONL with LangChain for:
 * - 40-60% token reduction
 * - Real cost savings
 * - Production-ready RAG
 */

import 'dotenv/config';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { QdrantClient } from 'qdrant-client';
import { QdrantAdapter } from 'tonl-mcp-bridge';

// Validate environment
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env');
  process.exit(1);
}

// Initialize components
const llm = new ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.7,
});

const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small',
});

const vectorStore = new QdrantAdapter({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  collectionName: 'langchain_docs',
});

// Create RAG prompt
const promptTemplate = PromptTemplate.fromTemplate(`
You are a helpful AI assistant. Use the following context to answer the question.
If you don't know the answer, say so - don't make up information.

Context (TONL format):
{context}

Question: {question}

Answer:`);

// Create chain
const outputParser = new StringOutputParser();
const chain = promptTemplate.pipe(llm).pipe(outputParser);

/**
 * Main RAG function with TONL compression
 */
async function askQuestion(question) {
  console.log('\n' + '='.repeat(60));
  console.log('❓ Question:', question);
  console.log('='.repeat(60));

  try {
    // 1. Generate embedding
    console.log('\n🔍 Step 1: Generating embedding...');
    const questionEmbedding = await embeddings.embedQuery(question);
    console.log(`✅ Embedding: ${questionEmbedding.length} dimensions`);

    // 2. Search with TONL compression
    console.log('\n🔍 Step 2: Searching vector database...');
    const startSearch = Date.now();
    
    const results = await vectorStore.searchToTonl(
      questionEmbedding,
      {
        limit: 5,
        scoreThreshold: 0.7,
      }
    );
    
    const searchTime = Date.now() - startSearch;
    console.log(`✅ Found ${results.results?.length || 0} results in ${searchTime}ms`);

    // 3. Show compression stats
    if (results.stats) {
      console.log('\n📊 Compression Stats:');
      console.log(`   Original:   ${results.stats.originalTokens} tokens`);
      console.log(`   Compressed: ${results.stats.compressedTokens} tokens`);
      console.log(`   Saved:      ${results.stats.savedTokens} tokens (${results.stats.compressionRatio}%)`);
      
      const costSaved = (results.stats.savedTokens / 1000000) * 3; // $3 per 1M tokens
      console.log(`   💰 Cost saved: $${costSaved.toFixed(4)} per query`);
      console.log(`   💰 Annual savings (1000 queries/day): $${(costSaved * 1000 * 365).toFixed(2)}`);
    }

    // 4. Generate answer
    console.log('\n🤖 Step 3: Generating answer...');
    const startLLM = Date.now();
    
    const answer = await chain.invoke({
      context: results.tonl,
      question: question,
    });
    
    const llmTime = Date.now() - startLLM;

    // 5. Display answer
    console.log('\n✅ Answer:');
    console.log('─'.repeat(60));
    console.log(answer);
    console.log('─'.repeat(60));
    console.log(`\n⏱️  Total time: ${searchTime + llmTime}ms (search: ${searchTime}ms, LLM: ${llmTime}ms)`);

    return {
      question,
      answer,
      stats: results.stats,
      totalTime: searchTime + llmTime,
    };

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

/**
 * Run example questions
 */
async function main() {
  console.log('🚀 LangChain RAG with TONL Compression');
  console.log('📚 Collection: langchain_docs\n');

  // Connect to vector store
  console.log('🔌 Connecting to Qdrant...');
  await vectorStore.connect();
  console.log('✅ Connected!\n');

  // Example questions
  const questions = [
    "What is LangChain and what are its main features?",
    "How do I create a custom chain in LangChain?",
    "What are the benefits of using vector databases?",
  ];

  let totalSaved = 0;
  const results = [];

  for (const question of questions) {
    const result = await askQuestion(question);
    results.push(result);
    
    if (result.stats) {
      totalSaved += result.stats.savedTokens;
    }

    // Wait a bit between questions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Questions answered: ${results.length}`);
  console.log(`Total tokens saved: ${totalSaved}`);
  console.log(`Average savings per query: ${Math.round(totalSaved / results.length)} tokens`);
  
  const totalCostSaved = (totalSaved / 1000000) * 3;
  console.log(`💰 Total cost saved: $${totalCostSaved.toFixed(4)}`);
  console.log(`💰 Projected annual savings (1000 queries/day): $${(totalCostSaved * 1000 * 365 / results.length).toFixed(2)}`);
  
  // Disconnect
  await vectorStore.disconnect();
  console.log('\n✅ Done!');
}

// Run
main().catch(console.error);
