/**
 * Setup Script - Seeds Qdrant with LangChain documentation
 * 
 * Run this once to populate your vector database with sample data.
 */

import 'dotenv/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantClient } from 'qdrant-client';

const COLLECTION_NAME = 'langchain_docs';

// Sample LangChain documentation chunks
const documents = [
  {
    id: 1,
    content: "LangChain is a framework for developing applications powered by language models. It enables applications that are context-aware and can reason about how to answer based on provided context. The main value props of LangChain are: Components for working with language models, Off-the-shelf chains for common applications, and Easy deployment to production.",
    metadata: { source: 'intro.md', topic: 'overview' }
  },
  {
    id: 2,
    content: "LangChain provides standard, extendable interfaces for the following components: Model I/O (prompts, language models, output parsers), Data connection (document loaders, text splitters, embedding models, vector stores), Chains (constructing sequences of calls), Agents (letting chains choose which tools to use), Memory (persisting application state between runs), and Callbacks (logging and streaming).",
    metadata: { source: 'components.md', topic: 'architecture' }
  },
  {
    id: 3,
    content: "To create a custom chain in LangChain, you use the LCEL (LangChain Expression Language). Start with a PromptTemplate, pipe it to a language model, and then to an output parser. Example: chain = prompt | model | parser. This creates a runnable sequence that you can invoke with input variables.",
    metadata: { source: 'chains.md', topic: 'tutorial' }
  },
  {
    id: 4,
    content: "Vector databases store embeddings and enable semantic search. Unlike traditional databases that match exact keywords, vector databases find semantically similar content. They're essential for RAG (Retrieval Augmented Generation) applications. Popular options include Pinecone, Weaviate, Qdrant, and Chroma.",
    metadata: { source: 'vectorstores.md', topic: 'databases' }
  },
  {
    id: 5,
    content: "RAG (Retrieval Augmented Generation) combines information retrieval with text generation. The process: 1) Convert user query to embedding, 2) Search vector database for relevant docs, 3) Pass retrieved docs as context to LLM, 4) LLM generates answer based on context. This grounds responses in your data and reduces hallucinations.",
    metadata: { source: 'rag.md', topic: 'patterns' }
  },
  {
    id: 6,
    content: "LangChain agents can dynamically choose which tools to use based on user input. Tools can be search engines, calculators, APIs, or custom functions. The agent uses an LLM to reason about which tool to call and with what arguments. Use ReAct agents for general reasoning or Plan-and-Execute for complex multi-step tasks.",
    metadata: { source: 'agents.md', topic: 'advanced' }
  },
  {
    id: 7,
    content: "Memory in LangChain allows you to persist state between chain runs. Types include: ConversationBufferMemory (stores all messages), ConversationSummaryMemory (stores a summary), ConversationBufferWindowMemory (stores last N messages), and VectorStoreMemory (stores in vector database for semantic retrieval).",
    metadata: { source: 'memory.md', topic: 'state-management' }
  },
  {
    id: 8,
    content: "Best practices for production LangChain apps: 1) Use streaming for better UX, 2) Implement error handling and retries, 3) Monitor token usage and costs, 4) Cache embeddings and responses, 5) Use batch operations for efficiency, 6) Implement rate limiting, 7) Test with diverse inputs.",
    metadata: { source: 'production.md', topic: 'best-practices' }
  },
  {
    id: 9,
    content: "LangChain supports multiple LLM providers including OpenAI, Anthropic, Cohere, HuggingFace, and local models. You can easily swap providers using the same interface. For cost optimization, use cheaper models for simple tasks and reserve expensive models for complex reasoning.",
    metadata: { source: 'models.md', topic: 'configuration' }
  },
  {
    id: 10,
    content: "Document loaders in LangChain can ingest data from various sources: PDFs, Word docs, websites, APIs, databases, and more. Text splitters then chunk documents intelligently, respecting sentence and paragraph boundaries. This ensures embeddings capture complete thoughts rather than cutting mid-sentence.",
    metadata: { source: 'loaders.md', topic: 'data-ingestion' }
  }
];

async function setup() {
  console.log('🚀 LangChain RAG Setup Script\n');

  // Initialize clients
  console.log('📦 Initializing clients...');
  const embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
  });

  const client = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
  });

  try {
    // Check connection
    console.log('🔌 Connecting to Qdrant...');
    const collections = await client.getCollections();
    console.log('✅ Connected to Qdrant\n');

    // Delete collection if exists
    const existingCollection = collections.collections.find(c => c.name === COLLECTION_NAME);
    if (existingCollection) {
      console.log('🗑️  Deleting existing collection...');
      await client.deleteCollection(COLLECTION_NAME);
      console.log('✅ Collection deleted\n');
    }

    // Create collection
    console.log('📁 Creating collection:', COLLECTION_NAME);
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 1536, // text-embedding-3-small dimension
        distance: 'Cosine',
      },
    });
    console.log('✅ Collection created\n');

    // Generate embeddings and insert
    console.log('🔄 Processing documents...');
    const points = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      process.stdout.write(`   [${i + 1}/${documents.length}] Embedding: ${doc.metadata.topic}...`);
      
      const embedding = await embeddings.embedQuery(doc.content);
      
      points.push({
        id: doc.id,
        vector: embedding,
        payload: {
          content: doc.content,
          metadata: doc.metadata,
        },
      });

      console.log(' ✅');
    }

    // Insert all points
    console.log('\n💾 Inserting into Qdrant...');
    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points: points,
    });
    console.log(`✅ Inserted ${points.length} documents\n`);

    // Verify
    const collectionInfo = await client.getCollection(COLLECTION_NAME);
    console.log('📊 Collection Info:');
    console.log(`   Name: ${collectionInfo.name}`);
    console.log(`   Vectors: ${collectionInfo.points_count}`);
    console.log(`   Status: ${collectionInfo.status}`);

    console.log('\n🎉 Setup complete! Run "npm start" to try it out.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run
setup().catch(console.error);
