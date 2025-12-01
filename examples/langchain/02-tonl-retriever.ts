/**
 * 02 - TONL Retriever: Reusable Component
 * 
 * This example shows how to create a reusable TONL retriever that integrates
 * seamlessly with any LangChain vector store.
 * 
 * The TonlRetriever is a drop-in replacement for standard retrievers that
 * automatically converts retrieved documents to TONL format, reducing tokens by 30-60%.
 * 
 * USAGE:
 * ```typescript
 * const retriever = new TonlRetriever({
 *   baseRetriever: vectorStore.asRetriever(),
 *   description: "documents"
 * });
 * 
 * const chain = RunnableSequence.from([
 *   retriever,
 *   prompt,
 *   model
 * ]);
 * ```
 */

import { Runnable } from '@langchain/core/runnables';
import { Document } from '@langchain/core/documents';
import { jsonToTonl } from 'tonl-mcp-bridge';

/**
 * Configuration for TonlRetriever
 */
export interface TonlRetrieverConfig {
  /**
   * Base retriever from any LangChain vector store
   * Example: vectorStore.asRetriever({ k: 5 })
   */
  baseRetriever: any;
  
  /**
   * Description for TONL header
   * This will be the collection name in the TONL format
   * Default: "documents"
   */
  description?: string;
  
  /**
   * Whether to return raw TONL string or formatted for prompt
   * Default: true (returns formatted string ready for prompt)
   */
  formatted?: boolean;
}

/**
 * TONL Retriever - Converts retrieved documents to TONL format
 * 
 * This retriever wraps any LangChain retriever and automatically converts
 * the retrieved documents to TONL format, reducing token usage by 30-60%.
 * 
 * It implements the Runnable interface, so it can be used directly in
 * LangChain chains with the pipe operator.
 */
export class TonlRetriever extends Runnable<string, string> {
  lc_namespace = ['tonl', 'retrievers'];
  
  private baseRetriever: any;
  private description: string;
  private formatted: boolean;

  constructor(config: TonlRetrieverConfig) {
    super(config);
    this.baseRetriever = config.baseRetriever;
    this.description = config.description || 'documents';
    this.formatted = config.formatted !== false;
  }

  /**
   * Retrieve documents and convert to TONL format
   */
  async invoke(query: string): Promise<string> {
    // Get documents from base retriever
    const documents: Document[] = await this.baseRetriever.invoke(query);
    
    // Convert Document objects to plain objects
    const plainDocs = documents.map((doc, index) => ({
      id: index + 1,
      content: doc.pageContent,
      ...doc.metadata // Spread metadata fields to top level
    }));

    // Convert to TONL format
    const tonlString = jsonToTonl(plainDocs, this.description);

    // Return formatted for prompt if requested
    if (this.formatted) {
      return `Context (TONL format):\n${tonlString}`;
    }

    return tonlString;
  }
}

/**
 * Simple helper function for quick TONL conversion
 * Use this when you don't need the full Runnable interface
 */
export async function retrieveAsTonl(
  retriever: any,
  query: string,
  description: string = 'documents'
): Promise<string> {
  const documents: Document[] = await retriever.invoke(query);
  
  const plainDocs = documents.map((doc, index) => ({
    id: index + 1,
    content: doc.pageContent,
    ...doc.metadata
  }));

  return jsonToTonl(plainDocs, description);
}

// ============================================================================
// DEMO: Using TonlRetriever with Mock Data
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n🔧 TONL Retriever Demo\n');
  console.log('This shows how to use TonlRetriever with any LangChain vector store.\n');

  // Mock retriever that simulates a vector store retriever
  class MockRetriever {
    async invoke(query: string): Promise<Document[]> {
      console.log('📥 Mock Retriever called with query:', query);
      
      // Simulate retrieved documents
      return [
        new Document({
          pageContent: 'Vector databases are optimized for similarity search using embeddings. They enable fast retrieval of semantically similar content.',
          metadata: {
            source: 'vector-db-guide.md',
            title: 'Vector Database Basics',
            author: 'Tech Team',
            date: '2024-01-15'
          }
        }),
        new Document({
          pageContent: 'RAG systems combine retrieval with generation. They fetch relevant context and use it to generate accurate, grounded responses.',
          metadata: {
            source: 'rag-overview.md',
            title: 'RAG Architecture',
            author: 'AI Research',
            date: '2024-02-01'
          }
        }),
        new Document({
          pageContent: 'Token optimization is crucial for cost management. TONL format can reduce context window tokens by 30-60% compared to JSON.',
          metadata: {
            source: 'optimization.md',
            title: 'Token Optimization',
            author: 'Engineering',
            date: '2024-02-10'
          }
        })
      ];
    }
  }

  async function runDemo() {
    const mockRetriever = new MockRetriever();
    
    // Create TONL retriever
    const tonlRetriever = new TonlRetriever({
      baseRetriever: mockRetriever,
      description: 'search_results'
    });

    const query = 'How do RAG systems work?';
    
    console.log('📝 Query:', query);
    console.log('\n' + '─'.repeat(60));
    
    // Retrieve as TONL
    const tonlContext = await tonlRetriever.invoke(query);
    
    console.log('\n✅ Retrieved and converted to TONL:\n');
    console.log(tonlContext);
    console.log('\n' + '─'.repeat(60));
    
    // Show token comparison
    const mockRetrieverDirect = new MockRetriever();
    const docs = await mockRetrieverDirect.invoke(query);
    const jsonContext = JSON.stringify(docs.map((doc, i) => ({
      id: i + 1,
      content: doc.pageContent,
      ...doc.metadata
    })), null, 2);

    const jsonTokens = Math.ceil(jsonContext.length / 4);
    const tonlTokens = Math.ceil(tonlContext.length / 4);
    const saved = jsonTokens - tonlTokens;
    const percent = ((saved / jsonTokens) * 100).toFixed(1);

    console.log('\n💰 Token Comparison:');
    console.log(`   JSON:  ${jsonTokens} tokens`);
    console.log(`   TONL:  ${tonlTokens} tokens`);
    console.log(`   ✅ Saved: ${saved} tokens (${percent}%)`);
    
    console.log('\n📚 Integration Example:');
    console.log('─'.repeat(60));
    console.log(`
// In your LangChain application:

import { TonlRetriever } from './02-tonl-retriever';
import { QdrantAdapter } from 'tonl-mcp-bridge';

// Setup vector store
const vectorStore = new QdrantAdapter({ 
  url: 'http://localhost:6333' 
});

// Create TONL retriever
const retriever = new TonlRetriever({
  baseRetriever: vectorStore.asRetriever({ k: 5 }),
  description: 'knowledge_base'
});

// Use in chain
const chain = RunnableSequence.from([
  {
    context: retriever,
    question: (input) => input.question
  },
  prompt,
  model
]);

// Run query
const result = await chain.invoke({
  question: "How do I optimize my RAG system?"
});
`);
    console.log('─'.repeat(60));
    
    console.log('\n✅ TonlRetriever is ready to use!');
    console.log('   Copy this file to your project and import TonlRetriever.\n');
  }

  runDemo().catch(console.error);
}
