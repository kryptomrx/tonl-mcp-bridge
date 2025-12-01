# LangChain + TONL Integration Examples

Reduce your RAG token costs by 30-60% without changing your LLM or prompts.

## 🎯 Why This Matters

In RAG systems, you send retrieved documents as context to your LLM. With JSON formatting, this context consumes a lot of tokens. **TONL format reduces these tokens by 30-60%**, directly cutting your API costs.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd examples/langchain
npm install
```

### 2. Configure LLM Provider

Copy the example env file:
```bash
cp .env.example .env
```

Choose ONE option:

#### Option A: Mock Mode (No API Key Needed) ✅ DEFAULT

```bash
# In .env
USE_MOCK=true
```

Perfect for:
- Testing token comparison without API costs
- Learning TONL concepts
- CI/CD pipelines

#### Option B: OpenAI

```bash
# In .env
USE_MOCK=false
OPENAI_API_KEY=sk-proj-your-key-here
```

#### Option C: Anthropic Claude

```bash
# In .env
USE_MOCK=false
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

#### Option D: Google Gemini

```bash
# In .env
USE_MOCK=false
GOOGLE_API_KEY=your-key-here
```

#### Option E: OpenRouter (Multi-Model)

```bash
# In .env
USE_MOCK=false
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

#### Option F: Ollama (Local/Free)

```bash
# First, install Ollama: https://ollama.ai
# Then pull a model: ollama pull llama2

# In .env
USE_MOCK=false
OLLAMA_MODEL=llama2
```

### 3. Run Examples

```bash
# Basic RAG comparison (start here!)
npm run basic-rag

# TONL Retriever
npm run retriever

# Conversational RAG
npm run conversational
```

## 📊 Expected Results

When you run `01-basic-rag.ts`, you'll see:

```
🚀 RAG Token Optimization with TONL

💡 Running in MOCK mode (no real API calls)
   Token comparison is real, responses are simulated

📚 Retrieved Documents: 5
❓ User Query: What are the key considerations for building a production RAG system?

🔵 STANDARD RAG (JSON Context)
────────────────────────────────────────────────────────────
📝 Answer: [Response based on context]

🟢 TONL RAG (TONL Context)
────────────────────────────────────────────────────────────
📝 Answer: [Same quality response]

============================================================
📊 TOKEN COMPARISON: Retrieved Documents Context
============================================================
JSON format:  1,247 tokens
TONL format:  623 tokens
────────────────────────────────────────────────────────────
✅ Saved:      624 tokens (50.0%)

💰 Cost Savings per 1M tokens:
   GPT-4o:     $1.5600
   Claude:     $1.8720
   Gemini:     $0.7800
============================================================

💡 Scaling Impact:
────────────────────────────────────────────────────────────
At 1,000 queries/day:
   Tokens saved: 624,000/day
   Monthly savings (GPT-4o): $46.80
   Annual savings: $561.60
============================================================

✅ Both approaches produce the same quality answers!
⚡ TONL simply uses 50.0% fewer tokens.
```

## 📚 Examples

### 1. Basic RAG (`01-basic-rag.ts`) ⭐ START HERE

**The "Aha Moment"** - Compare JSON vs TONL context side-by-side.

Shows:
- Standard RAG with JSON context
- TONL RAG with compressed context
- Exact token savings
- Cost impact at scale
- Works in MOCK mode (no API key needed)

**Run it:**
```bash
npm run basic-rag
```

### 2. TONL Retriever (`02-tonl-retriever.ts`)

Simple retriever that wraps any LangChain vector store and returns TONL-formatted context.

**Run it:**
```bash
npm run retriever
```

### 3. Conversational RAG (`03-conversational-rag.ts`)

RAG with conversation memory - shows cumulative token savings across multiple turns.

**Run it:**
```bash
npm run conversational
```

## 🔧 Integration with Your Code

### Option 1: Use TONL Retriever (Simplest)

```typescript
import { TonlRetriever } from './02-tonl-retriever';
import { QdrantAdapter } from 'tonl-mcp-bridge';

// Wrap your existing vector store
const vectorStore = new QdrantAdapter({ url: 'http://localhost:6333' });
const retriever = new TonlRetriever(vectorStore);

// Use it in your RAG chain
const context = await retriever.retrieve(query, { limit: 5 });
// context is now in TONL format, ready for your LLM
```

### Option 2: Manual Conversion

```typescript
import { jsonToTonl } from 'tonl-mcp-bridge';

// After retrieving documents from your vector store
const docs = await vectorStore.search(query);

// Convert to TONL
const tonlContext = jsonToTonl(docs, 'context');

// Use in your prompt
const prompt = `Context: ${tonlContext}\n\nQuestion: ${query}`;
```

## 💡 Tips

1. **Start with Mock Mode** - See token savings without API costs
2. **TONL works with any LLM** - GPT-4, Claude, Gemini, local models
3. **No fine-tuning needed** - LLMs understand TONL format naturally
4. **Combine with other optimizations** - TONL stacks with prompt engineering, caching, etc.
5. **Try Ollama for free testing** - Run models locally with no API costs

## 🤖 Supported LLM Providers

| Provider | Setup | Cost | Best For |
|----------|-------|------|----------|
| **Mock** | `USE_MOCK=true` | Free | Testing, CI/CD |
| **OpenAI** | API Key | Paid | Production, best quality |
| **Claude** | API Key | Paid | Long context, reasoning |
| **Gemini** | API Key | Paid | Cost-effective, fast |
| **OpenRouter** | API Key | Paid | Multi-model access |
| **Ollama** | Local install | Free | Local, privacy, testing |

## 📖 Learn More

- [TONL Documentation](https://tonl-mcp-bridge-docs.vercel.app/)
- [LangChain Documentation](https://js.langchain.com/docs/)
- [RAG Guide](https://python.langchain.com/docs/tutorials/rag/)
- [Ollama](https://ollama.ai/)

## 🤝 Contributing

Found a bug or have an improvement? Open an issue or PR in the main repo!

## 📄 License

MIT - See main repo LICENSE file
