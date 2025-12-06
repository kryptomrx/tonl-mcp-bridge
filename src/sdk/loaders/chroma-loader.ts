/**
 * ChromaDB Client Loader
 * 
 * Lazy loads ChromaDB as an optional dependency.
 * Provides helpful error messages if package is not installed.
 */

export async function createChromaClient(config?: {
  path?: string;
  url?: string;
  apiKey?: string;
  tenant?: string;
  database?: string;
}) {
  try {
    const { ChromaClient } = await import('chromadb');

    // Create client based on config
    if (config?.path) {
      // Persistent client with DuckDB backend
      return new ChromaClient({
        path: config.path,
      });
    } else if (config?.apiKey) {
      // Chroma Cloud client
      return new ChromaClient({
        auth: {
          provider: 'token',
          credentials: config.apiKey,
        },
        tenant: config.tenant || 'default',
        database: config.database || 'default',
      });
    } else {
      // Remote server or in-memory
      return new ChromaClient({
        path: config?.url || 'http://localhost:8000',
      });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(
        'ChromaDB is not installed. Install it with: npm install chromadb\n' +
        'Or add to your package.json:\n' +
        '  "dependencies": { "chromadb": "^1.9.0" }\n\n' +
        'ChromaDB is the perfect choice for:\n' +
        '  - Local LLM development (Ollama, LM Studio)\n' +
        '  - RAG prototyping and testing\n' +
        '  - Cost-conscious production deployments\n' +
        '  - LangChain/LlamaIndex integration\n\n' +
        'Learn more: https://docs.trychroma.com'
      );
    }
    throw error;
  }
}
