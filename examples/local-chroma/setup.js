/**
 * Setup Script - Seeds local ChromaDB with AI/ML documents
 * 
 * This creates a local database with sample documents about:
 * - RAG (Retrieval Augmented Generation)
 * - Vector databases
 * - Embeddings
 * - AI/ML concepts
 */

import 'dotenv/config';
import { ChromaClient } from 'chromadb';
import { OpenAI } from 'openai';

const COLLECTION_NAME = 'ai_docs';
const DB_PATH = './chroma_data';

// Sample documents about AI/ML
const documents = [
  {
    id: 'doc1',
    content: "RAG (Retrieval Augmented Generation) is a technique that enhances LLMs by retrieving relevant information from a knowledge base before generating responses. This grounds the model's answers in real data and reduces hallucinations. The process involves: 1) Converting queries to embeddings, 2) Searching a vector database for relevant documents, 3) Passing retrieved context to the LLM, 4) Generating a response based on that context.",
    metadata: { title: 'What is RAG?', category: 'fundamentals', difficulty: 'beginner' }
  },
  {
    id: 'doc2',
    content: "Vector embeddings are numerical representations of text that capture semantic meaning. Similar concepts have similar embeddings, enabling semantic search. Embeddings are typically 384-1536 dimensions. Common models include OpenAI's text-embedding-3, Cohere's embed models, and open-source options like sentence-transformers. The choice depends on your use case, cost constraints, and performance requirements.",
    metadata: { title: 'Understanding Embeddings', category: 'fundamentals', difficulty: 'beginner' }
  },
  {
    id: 'doc3',
    content: "Choosing a vector database depends on several factors: 1) Scale - How many vectors? 2) Latency - Do you need sub-millisecond search? 3) Features - Hybrid search, filtering, multi-tenancy? 4) Cost - Cloud vs self-hosted? 5) Ecosystem - Does it integrate with your stack? Popular options: Pinecone (managed, easy), Qdrant (fast, self-hosted), Weaviate (hybrid search), ChromaDB (local, simple), Milvus (scalable).",
    metadata: { title: 'Choosing a Vector Database', category: 'databases', difficulty: 'intermediate' }
  },
  {
    id: 'doc4',
    content: "Semantic search finds results based on meaning, not just keywords. Unlike traditional search that matches exact terms, semantic search understands intent and context. Example: Searching for 'happy' might also return documents about 'joyful', 'delighted', or 'pleased'. This is powered by vector embeddings and similarity search (cosine, dot product, or Euclidean distance).",
    metadata: { title: 'Semantic Search Explained', category: 'fundamentals', difficulty: 'beginner' }
  },
  {
    id: 'doc5',
    content: "Hybrid search combines keyword search (BM25) with vector search for best results. Keyword search is precise for exact matches, while vector search handles semantic similarity. Hybrid search typically: 1) Performs both searches in parallel, 2) Normalizes scores to 0-1 range, 3) Combines scores with weights (e.g., 0.7 * vector + 0.3 * keyword), 4) Returns merged results. This approach captures both exact matches and semantic relevance.",
    metadata: { title: 'Hybrid Search Strategy', category: 'advanced', difficulty: 'intermediate' }
  },
  {
    id: 'doc6',
    content: "Token optimization is crucial for LLM cost management. Strategies include: 1) Compression - Use TONL or similar formats (40-60% savings), 2) Chunking - Split documents intelligently, 3) Filtering - Pre-filter before vector search, 4) Caching - Store responses for common queries, 5) Model selection - Use cheaper models when possible, 6) Summarization - Condense long contexts. A well-optimized RAG system can reduce costs by 70%+.",
    metadata: { title: 'Token Optimization Strategies', category: 'optimization', difficulty: 'advanced' }
  },
  {
    id: 'doc7',
    content: "Chunking strategies affect RAG quality significantly. Options include: 1) Fixed size (e.g., 512 tokens) - Simple but may split mid-sentence, 2) Sentence-based - Respects natural boundaries, 3) Paragraph-based - Maintains context better, 4) Semantic chunking - Groups related sentences, 5) Overlap - Include previous/next chunks for continuity. Best practice: 300-800 tokens per chunk with 50-100 token overlap.",
    metadata: { title: 'Document Chunking Guide', category: 'implementation', difficulty: 'intermediate' }
  },
  {
    id: 'doc8',
    content: "Metadata filtering pre-filters documents before vector search, dramatically improving relevance and speed. Instead of searching all 1M documents, filter to 10K first (by date, category, author, etc.), then vector search those 10K. This is 100x faster and more accurate. Most vector databases support metadata filters: Qdrant has 'filter', Pinecone has 'where', Weaviate has 'where', ChromaDB has 'where'.",
    metadata: { title: 'Metadata Filtering Benefits', category: 'optimization', difficulty: 'intermediate' }
  },
  {
    id: 'doc9',
    content: "Production RAG systems need: 1) Error handling - Graceful degradation when search fails, 2) Rate limiting - Prevent abuse and cost overruns, 3) Caching - Semantic cache for common queries, 4) Monitoring - Track latency, costs, quality, 5) Versioning - Manage embedding model changes, 6) Testing - Diverse test cases and edge cases, 7) Fallbacks - Default responses when confidence is low. These patterns separate prototypes from production.",
    metadata: { title: 'Production RAG Checklist', category: 'best-practices', difficulty: 'advanced' }
  },
  {
    id: 'doc10',
    content: "Embedding model selection impacts cost, quality, and speed. OpenAI text-embedding-3-small: Fast, cheap ($0.02/1M tokens), 1536 dims. OpenAI text-embedding-3-large: Better quality, pricier ($0.13/1M tokens), 3072 dims. Cohere embed-v3: Multilingual, good quality. Open-source (sentence-transformers): Free, self-hosted, many options. For most use cases, text-embedding-3-small offers the best cost/performance ratio.",
    metadata: { title: 'Embedding Model Comparison', category: 'models', difficulty: 'intermediate' }
  },
  {
    id: 'doc11',
    content: "ChromaDB is perfect for local development and small-scale applications. Advantages: 1) Zero configuration - No Docker or cloud setup, 2) Embedded mode - Runs in-process, 3) Fast startup - Ready in milliseconds, 4) Privacy - Data stays local, 5) Free - No usage costs. Limitations: Single-machine only, limited scalability, no built-in authentication. Ideal for: Prototypes, local LLMs, privacy-sensitive apps, offline applications.",
    metadata: { title: 'ChromaDB for Local Dev', category: 'databases', difficulty: 'beginner' }
  },
  {
    id: 'doc12',
    content: "Distance metrics affect search results significantly. Cosine similarity: Measures angle between vectors, range [-1, 1], most common for text. Euclidean (L2): Measures straight-line distance, sensitive to magnitude. Dot product: Fastest but assumes normalized vectors. For text embeddings, use cosine similarity. For image embeddings, try L2. Always normalize embeddings to unit length for consistent results across metrics.",
    metadata: { title: 'Distance Metrics Guide', category: 'fundamentals', difficulty: 'intermediate' }
  },
  {
    id: 'doc13',
    content: "Reranking improves initial search results by re-scoring with a more sophisticated model. Process: 1) Vector search returns top 50 candidates (fast, approximate), 2) Reranker model scores all 50 (slower, accurate), 3) Return top 5 reranked results. This two-stage approach balances speed and quality. Popular rerankers: Cohere rerank, cross-encoders, or LLMs as judges. Reranking typically improves relevance by 10-20%.",
    metadata: { title: 'Reranking for Better Results', category: 'advanced', difficulty: 'advanced' }
  },
  {
    id: 'doc14',
    content: "Context window management is critical for long conversations. Strategies: 1) Sliding window - Keep last N messages, 2) Summarization - Compress old messages, 3) Retrieval - Store all history in vector DB, retrieve relevant parts, 4) Hierarchical - Different resolutions for recent vs old context. Most production systems use a hybrid: Full recent context + summarized history + relevant retrieved context. This maximizes both recency and relevance.",
    metadata: { title: 'Managing Context Windows', category: 'implementation', difficulty: 'advanced' }
  },
  {
    id: 'doc15',
    content: "Evaluation metrics for RAG systems include: 1) Relevance - Are retrieved docs actually relevant? (precision@k), 2) Coverage - Did we retrieve all relevant docs? (recall@k), 3) Latency - How fast is end-to-end response?, 4) Answer quality - Is the final answer correct? (human eval or LLM-as-judge), 5) Cost - Tokens used per query. Track these metrics over time and A/B test changes. Good RAG: >90% precision, <100ms retrieval, <2s total.",
    metadata: { title: 'RAG Evaluation Metrics', category: 'best-practices', difficulty: 'advanced' }
  },
  {
    id: 'doc16',
    content: "Multi-tenancy in vector databases isolates data between customers. Approaches: 1) Collections per tenant - Simple but doesn't scale beyond 1000s, 2) Namespace per tenant - Better scaling, 3) Metadata filtering - Single collection with tenant_id filter. Consider: Isolation requirements, scale (how many tenants?), query patterns, cost implications. For B2B SaaS with 1000+ customers, use metadata filtering for best cost/performance.",
    metadata: { title: 'Multi-Tenancy Strategies', category: 'architecture', difficulty: 'advanced' }
  },
  {
    id: 'doc17',
    content: "Cold start problems in RAG: What if the vector DB is empty? Solutions: 1) Seed data - Pre-populate with documentation, FAQs, 2) Fallback - Use web search or general knowledge, 3) Graceful degradation - Inform user and offer alternatives, 4) Learning mode - Save Q&A pairs for future retrieval. For new deployments, always include seed data and fallback mechanisms. A RAG system with no data is worse than no RAG at all.",
    metadata: { title: 'Handling Cold Start', category: 'implementation', difficulty: 'intermediate' }
  },
  {
    id: 'doc18',
    content: "Incremental updates vs full reindex: When document content changes, you can: 1) Update in place - Fast but embeddings might drift, 2) Delete + reinsert - Clean but higher latency, 3) Full reindex - Most accurate but expensive. Best practice: Update in place for minor changes, reindex periodically (weekly/monthly) for consistency. Track version numbers to know what needs reindexing. Some systems support automatic reindexing on content change.",
    metadata: { title: 'Update Strategies', category: 'implementation', difficulty: 'intermediate' }
  },
  {
    id: 'doc19',
    content: "Debugging RAG systems: Common issues include: 1) No results - Check embedding model matches, verify data was inserted, 2) Irrelevant results - Tune score threshold, improve chunking, try reranking, 3) High latency - Add caching, optimize index, reduce k, 4) High costs - Implement TONL compression, cache aggressively, use cheaper models. Always log: Query, retrieved docs, scores, tokens used. This telemetry is essential for optimization.",
    metadata: { title: 'Debugging RAG Systems', category: 'troubleshooting', difficulty: 'intermediate' }
  },
  {
    id: 'doc20',
    content: "The future of RAG includes: 1) Multi-modal - Images, audio, video alongside text, 2) Agentic RAG - LLMs decide what to retrieve and when, 3) Real-time updates - Streaming data into vector stores, 4) Cross-lingual - Query in one language, retrieve in another, 5) Personalization - Per-user embeddings and preferences, 6) Graph RAG - Combining knowledge graphs with vector search. The core concept remains: Ground LLMs in real data. But the implementations are rapidly evolving.",
    metadata: { title: 'Future of RAG', category: 'trends', difficulty: 'advanced' }
  }
];

// Initialize
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function setup() {
  console.log('🚀 Local ChromaDB Setup\n');

  try {
    // Create client
    console.log('📦 Initializing ChromaDB client...');
    const client = new ChromaClient({ path: DB_PATH });
    console.log('✅ Client created\n');

    // Delete collection if exists
    console.log('🔍 Checking for existing collection...');
    try {
      await client.deleteCollection({ name: COLLECTION_NAME });
      console.log('🗑️  Deleted existing collection\n');
    } catch (e) {
      console.log('ℹ️  No existing collection found\n');
    }

    // Create collection
    console.log('📁 Creating collection:', COLLECTION_NAME);
    const collection = await client.createCollection({
      name: COLLECTION_NAME,
      metadata: { description: 'AI/ML documentation with TONL compression' },
    });
    console.log('✅ Collection created\n');

    // Process documents
    console.log('🔄 Embedding and inserting documents...');
    console.log(`   Total: ${documents.length} documents\n`);

    const ids = [];
    const embeddings = [];
    const metadatas = [];
    const documentTexts = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const progress = `[${i + 1}/${documents.length}]`;
      
      process.stdout.write(`   ${progress} ${doc.metadata.title}...`);

      // Generate embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: doc.content,
      });

      ids.push(doc.id);
      embeddings.push(response.data[0].embedding);
      metadatas.push(doc.metadata);
      documentTexts.push(doc.content);

      console.log(' ✅');

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Batch insert
    console.log('\n💾 Inserting batch into ChromaDB...');
    await collection.add({
      ids,
      embeddings,
      metadatas,
      documents: documentTexts,
    });
    console.log('✅ Batch inserted\n');

    // Verify
    const count = await collection.count();
    console.log('📊 Database Info:');
    console.log(`   Location: ${DB_PATH}`);
    console.log(`   Collection: ${COLLECTION_NAME}`);
    console.log(`   Documents: ${count}`);
    console.log(`   Categories: ${new Set(documents.map(d => d.metadata.category)).size}`);

    console.log('\n🎉 Setup complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npm start');
    console.log('   2. Try different queries');
    console.log('   3. See TONL compression in action\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run
setup().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
