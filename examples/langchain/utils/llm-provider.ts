/**
 * LLM Provider Configuration
 * Supports: Mock, OpenAI, Claude, Gemini, OpenRouter, Ollama
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import 'dotenv/config';

export interface MockLLM {
  invoke: (input: any) => Promise<{ content: string }>;
}

export type LLMInstance = ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI | ChatOllama | MockLLM;

/**
 * Mock LLM for testing without API keys
 */
class MockChatModel implements MockLLM {
  async invoke(input: any): Promise<{ content: string }> {
    // LangChain passes the formatted prompt as a string or message object
    let contextLength = 0;
    
    // Try to extract context length from the input
    if (typeof input === 'string') {
      contextLength = input.length;
    } else if (input && typeof input === 'object') {
      // Check for text/content property
      const text = input.text || input.content || JSON.stringify(input);
      contextLength = text.length;
    }

    const response = `Based on the production RAG architecture documentation (~${Math.round(contextLength / 100)} paragraphs of context), key considerations include:

1. **Architecture Components**: Document ingestion pipeline, embedding generation, vector indexing, query processing, context assembly, and LLM orchestration.

2. **Performance**: Monitor latency at each stage. Target: <100ms retrieval, <2s end-to-end response time.

3. **Quality Metrics**: Track accuracy, relevance scores, and hallucination rates. Implement feedback loops.

4. **Scalability**: Design for horizontal scaling. Consider: connection pooling, caching strategies, and load balancing.

5. **Cost Management**: Monitor token usage, API costs, and infrastructure expenses. Optimize context window usage.

6. **Observability**: Implement comprehensive logging, tracing, and monitoring from day one. Use tools like LangSmith for debugging.

7. **Fault Tolerance**: Handle API failures gracefully, implement retry logic, and provide fallback responses.`;

    return {
      content: response
    };
  }
}

/**
 * Get LLM instance based on environment configuration
 */
export function getLLM(): LLMInstance {
  // Check if mock mode
  if (process.env.USE_MOCK === 'true') {
    console.log('🎭 Using MOCK mode (no API calls)');
    return new MockChatModel();
  }

  // Try OpenAI
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
    console.log('🤖 Using OpenAI:', process.env.OPENAI_MODEL || 'gpt-4o-mini');
    return new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0
    });
  }

  // Try Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('🤖 Using Anthropic Claude:', process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022');
    return new ChatAnthropic({
      modelName: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      temperature: 0
    });
  }

  // Try Google
  if (process.env.GOOGLE_API_KEY) {
    console.log('🤖 Using Google Gemini:', process.env.GOOGLE_MODEL || 'gemini-2.0-flash-exp');
    return new ChatGoogleGenerativeAI({
      modelName: process.env.GOOGLE_MODEL || 'gemini-2.0-flash-exp',
      temperature: 0
    });
  }

  // Try OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    console.log('🤖 Using OpenRouter:', process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet');
    return new ChatOpenAI({
      modelName: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      temperature: 0,
      openAIApiKey: process.env.OPENROUTER_API_KEY,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1'
      }
    });
  }

  // Try Ollama
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) {
    console.log('🤖 Using Ollama:', process.env.OLLAMA_MODEL || 'llama2');
    return new ChatOllama({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2',
      temperature: 0
    });
  }

  // Default to mock
  console.log('⚠️  No API key found. Using MOCK mode.');
  console.log('💡 Set USE_MOCK=false and add an API key in .env to use real LLMs');
  return new MockChatModel();
}

/**
 * Check if we're in mock mode
 */
export function isMockMode(): boolean {
  return process.env.USE_MOCK === 'true' || 
    (!process.env.OPENAI_API_KEY && 
     !process.env.ANTHROPIC_API_KEY && 
     !process.env.GOOGLE_API_KEY && 
     !process.env.OPENROUTER_API_KEY &&
     !process.env.OLLAMA_MODEL);
}
