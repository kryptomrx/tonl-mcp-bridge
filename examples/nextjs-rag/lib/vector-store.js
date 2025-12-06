/**
 * Vector Store with TONL Integration
 * 
 * Wraps Qdrant with TONL compression for 40-60% token savings.
 */

import { QdrantClient } from 'qdrant-client';
import { QdrantAdapter } from 'tonl-mcp-bridge';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const vectorStore = new QdrantAdapter({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  collectionName: 'nextjs_docs',
});

// Initialize connection
let isConnected = false;

export async function ensureConnection() {
  if (!isConnected) {
    await vectorStore.connect();
    isConnected = true;
  }
}

/**
 * Generate embedding for text
 */
export async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Search with TONL compression
 */
export async function searchWithTONL(query, options = {}) {
  await ensureConnection();
  
  // Generate embedding
  const embedding = await generateEmbedding(query);
  
  // Search with TONL
  const results = await vectorStore.searchToTonl(embedding, {
    limit: options.limit || 5,
    scoreThreshold: options.scoreThreshold || 0.7,
  });
  
  return results;
}

/**
 * Search without TONL (for comparison)
 */
export async function searchWithoutTONL(query, options = {}) {
  await ensureConnection();
  
  const embedding = await generateEmbedding(query);
  const results = await vectorStore.search(embedding, {
    limit: options.limit || 5,
    scoreThreshold: options.scoreThreshold || 0.7,
  });
  
  return results;
}

export { vectorStore };
