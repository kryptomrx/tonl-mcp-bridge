/**
 * Setup Script for Next.js RAG Example
 * 
 * Seeds Qdrant with sample documents about AI/ML topics.
 */

import 'dotenv/config';
import { QdrantClient } from 'qdrant-client';
import { OpenAI } from 'openai';

const COLLECTION_NAME = 'nextjs_docs';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';

// Sample documents
const documents = [
  {
    id: 1,
    content: "RAG (Retrieval Augmented Generation) enhances LLMs by retrieving relevant information from a knowledge base before generating responses. This grounds answers in real data and reduces hallucinations.",
    metadata: { topic: 'rag', difficulty: 'beginner' }
  },
  {
    id: 2,
    content: "Vector embeddings are numerical representations that capture semantic meaning. Similar concepts have similar embeddings, enabling semantic search beyond keyword matching.",
    metadata: { topic: 'embeddings', difficulty: 'beginner' }
  },
  {
    id: 3,
    content: "TONL is a token-optimized format that reduces token usage by 40-60% compared to JSON. It achieves this through concise syntax, type inference, and elimination of redundant characters.",
    metadata: { topic: 'tonl', difficulty: 'intermediate' }
  },
  {
    id: 4,
    content: "Vector databases like Pinecone, Qdrant, and ChromaDB are purpose-built for storing and searching embeddings at scale. They use algorithms like HNSW for fast approximate nearest neighbor search.",
    metadata: { topic: 'vector-db', difficulty: 'intermediate' }
  },
  {
    id: 5,
    content: "Token optimization strategies include: compression formats (TONL), intelligent chunking, metadata pre-filtering, response caching, and model selection. These can reduce costs by 70%+.",
    metadata: { topic: 'optimization', difficulty: 'advanced' }
  },
];

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function setup() {
  console.log('🚀 Next.js RAG Setup\n');

  try {
    // Connect to Qdrant
    console.log('🔌 Connecting to Qdrant...');
    const client = new QdrantClient({ url: QDRANT_URL });
    const collections = await client.getCollections();
    console.log('✅ Connected\n');

    // Delete existing collection
    const exists = collections.collections.find(c => c.name === COLLECTION_NAME);
    if (exists) {
      console.log('🗑️  Deleting existing collection...');
      await client.deleteCollection(COLLECTION_NAME);
      console.log('✅ Deleted\n');
    }

    // Create collection
    console.log('📁 Creating collection:', COLLECTION_NAME);
    await client.createCollection(COLLECTION_NAME, {
      vectors: { size: 1536, distance: 'Cosine' },
    });
    console.log('✅ Created\n');

    // Process documents
    console.log('🔄 Processing documents...');
    const points = [];

    for (const doc of documents) {
      process.stdout.write(`   [${doc.id}/${documents.length}] Embedding...`);
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: doc.content,
      });

      points.push({
        id: doc.id,
        vector: response.data[0].embedding,
        payload: { content: doc.content, metadata: doc.metadata },
      });

      console.log(' ✅');
    }

    // Insert
    console.log('\n💾 Inserting into Qdrant...');
    await client.upsert(COLLECTION_NAME, { wait: true, points });
    console.log('✅ Inserted\n');

    // Verify
    const info = await client.getCollection(COLLECTION_NAME);
    console.log('📊 Collection Info:');
    console.log(`   Name: ${info.name}`);
    console.log(`   Vectors: ${info.points_count}`);
    console.log(`   Status: ${info.status}`);

    console.log('\n🎉 Setup complete!');
    console.log('💡 Next: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

setup();
