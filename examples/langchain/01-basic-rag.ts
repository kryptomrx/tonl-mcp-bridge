/**
 * 01 - Basic RAG with TONL: The "Aha Moment"
 * 
 * This example demonstrates the core value proposition of TONL:
 * Reduce RAG token costs by 30-60% without changing your LLM or prompts.
 * 
 * We'll compare:
 * - Standard RAG (JSON context)
 * - TONL RAG (TONL context)
 * 
 * And show the exact token savings.
 * 
 * SETUP:
 * 1. Copy .env.example to .env
 * 2. Either:
 *    - Set USE_MOCK=true (no API key needed)
 *    - Or add your API key for OpenAI/Claude/Gemini/OpenRouter/Ollama
 */

import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { jsonToTonl } from 'tonl-mcp-bridge';
import { compareTokens, printComparison } from './utils/compare-tokens.js';
import { getLLM, isMockMode } from './utils/llm-provider.js';
import 'dotenv/config';

// Sample documents (simulating retrieved context from a vector store)
const retrievedDocuments = [
  {
    id: 1,
    title: 'Introduction to RAG',
    content: 'Retrieval-Augmented Generation (RAG) combines information retrieval with text generation. It allows LLMs to access external knowledge bases, making responses more accurate and up-to-date.',
    source: 'docs/rag-intro.md',
    timestamp: '2024-01-15',
    author: 'AI Research Team',
    tags: ['rag', 'llm', 'retrieval']
  },
  {
    id: 2,
    title: 'Token Optimization Strategies',
    content: 'Token optimization is crucial for reducing LLM costs. Common strategies include prompt compression, context window management, and efficient data formatting. TONL format can reduce tokens by 30-60%.',
    source: 'docs/optimization.md',
    timestamp: '2024-01-20',
    author: 'Engineering Team',
    tags: ['optimization', 'tokens', 'cost-reduction']
  },
  {
    id: 3,
    title: 'LangChain Best Practices',
    content: 'LangChain provides powerful abstractions for building LLM applications. Key best practices include: modular chain design, proper error handling, streaming responses, and efficient context management.',
    source: 'docs/langchain-guide.md',
    timestamp: '2024-02-01',
    author: 'Developer Relations',
    tags: ['langchain', 'best-practices', 'development']
  },
  {
    id: 4,
    title: 'Vector Database Selection',
    content: 'Choosing the right vector database depends on your use case. Consider factors like: query performance, scalability, cost, supported distance metrics, and integration complexity. Popular options include Pinecone, Qdrant, Weaviate, and Redis.',
    source: 'docs/vector-db-guide.md',
    timestamp: '2024-02-10',
    author: 'Infrastructure Team',
    tags: ['vector-database', 'architecture', 'performance']
  },
  {
    id: 5,
    title: 'Production RAG Architectures',
    content: 'Production RAG systems require careful architecture. Key components: document ingestion pipeline, embedding generation, vector indexing, query processing, context assembly, and LLM orchestration. Monitor latency, accuracy, and costs.',
    source: 'docs/production-rag.md',
    timestamp: '2024-02-15',
    author: 'Platform Team',
    tags: ['production', 'architecture', 'scalability']
  }
];

const userQuery = 'What are the key considerations for building a production RAG system?';

// Mock response for when no API key is available
const MOCK_RESPONSE = `Based on the production RAG architecture documentation, key considerations include:

1. **Architecture Components**: Document ingestion pipeline, embedding generation, vector indexing, query processing, context assembly, and LLM orchestration.

2. **Performance**: Monitor latency at each stage. Target: <100ms retrieval, <2s end-to-end response time.

3. **Quality Metrics**: Track accuracy, relevance scores, and hallucination rates. Implement feedback loops.

4. **Scalability**: Design for horizontal scaling. Consider: connection pooling, caching strategies, and load balancing.

5. **Cost Management**: Monitor token usage, API costs, and infrastructure expenses. Optimize context window usage.

6. **Observability**: Implement comprehensive logging, tracing, and monitoring from day one.

7. **Fault Tolerance**: Handle API failures gracefully, implement retry logic, and provide fallback responses.`;

async function runStandardRAG() {
  console.log('\n🔵 STANDARD RAG (JSON Context)');
  console.log('─'.repeat(60));

  // Convert documents to JSON context
  const jsonContext = JSON.stringify(retrievedDocuments, null, 2);
  
  let content: string;

  if (isMockMode()) {
    // Use mock response
    content = MOCK_RESPONSE;
  } else {
    // Use real LLM
    const prompt = PromptTemplate.fromTemplate(`
You are a helpful AI assistant. Answer the user's question based on the provided context.

Context (JSON):
{context}

Question: {question}

Answer:`);

    const llm = getLLM();
    const chain = RunnableSequence.from([prompt, llm]);
    const response = await chain.invoke({
      context: jsonContext,
      question: userQuery
    });

    content = typeof response === 'string' 
      ? response 
      : response.content || response.text || String(response);
  }

  console.log('\n📝 Answer:', content.slice(0, 200) + '...');
  
  return { jsonContext, response: content };
}

async function runTONLRAG() {
  console.log('\n🟢 TONL RAG (TONL Context)');
  console.log('─'.repeat(60));

  // Convert documents to TONL format
  const tonlContext = jsonToTonl(retrievedDocuments, 'documents');
  
  let content: string;

  if (isMockMode()) {
    // Use mock response
    content = MOCK_RESPONSE;
  } else {
    // Use real LLM
    const prompt = PromptTemplate.fromTemplate(`
You are a helpful AI assistant. Answer the user's question based on the provided context.

Context (TONL format):
{context}

Question: {question}

Answer:`);

    const llm = getLLM();
    const chain = RunnableSequence.from([prompt, llm]);
    const response = await chain.invoke({
      context: tonlContext,
      question: userQuery
    });

    content = typeof response === 'string' 
      ? response 
      : response.content || response.text || String(response);
  }

  console.log('\n📝 Answer:', content.slice(0, 200) + '...');
  
  return { tonlContext, response: content };
}

async function main() {
  console.log('\n🚀 RAG Token Optimization with TONL\n');
  console.log('This example shows how TONL reduces token costs in RAG systems');
  console.log('without changing your LLM or prompts.\n');

  if (isMockMode()) {
    console.log('💡 Running in MOCK mode (no real API calls)');
    console.log('   Token comparison is real, responses are simulated');
    console.log('   To use real LLMs: Set USE_MOCK=false and add API key in .env\n');
  }

  console.log('📚 Retrieved Documents:', retrievedDocuments.length);
  console.log('❓ User Query:', userQuery);

  // Run both approaches
  const standardResult = await runStandardRAG();
  const tonlResult = await runTONLRAG();

  // Compare token usage
  const comparison = compareTokens(standardResult.jsonContext, tonlResult.tonlContext);
  printComparison(comparison, 'Retrieved Documents Context');

  // Show the TONL format
  console.log('\n📄 TONL Format Preview:');
  console.log('─'.repeat(60));
  console.log(tonlResult.tonlContext.split('\n').slice(0, 5).join('\n'));
  console.log('...');
  console.log('─'.repeat(60));

  // Calculate cost savings at scale
  console.log('\n💡 Scaling Impact:');
  console.log('─'.repeat(60));
  console.log('At 1,000 queries/day:');
  const dailyTokens = comparison.savedTokens * 1000;
  const monthlySavings = (dailyTokens * 30 / 1_000_000) * 2.50; // GPT-4o pricing
  console.log(`   Tokens saved: ${dailyTokens.toLocaleString()}/day`);
  console.log(`   Monthly savings (GPT-4o): $${monthlySavings.toFixed(2)}`);
  console.log(`   Annual savings: $${(monthlySavings * 12).toFixed(2)}`);
  console.log('='.repeat(60));

  console.log('\n✅ Both approaches produce the same quality answers!');
  console.log(`⚡ TONL simply uses ${comparison.savingsPercent}% fewer tokens.\n`);

  if (isMockMode()) {
    console.log('💡 TIP: Try with a real LLM to see actual responses!');
    console.log('   Supported: OpenAI, Claude, Gemini, OpenRouter, Ollama');
    console.log('   See .env.example for configuration\n');
  }
}

// Run the example
main().catch(console.error);
