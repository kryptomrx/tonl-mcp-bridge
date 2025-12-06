# Local ChromaDB with TONL

**Zero Configuration** - No Docker, no cloud, just local vector search with TONL compression.

## 🎯 Perfect For

- ✅ Local LLM applications
- ✅ Prototyping RAG systems
- ✅ Privacy-first applications
- ✅ Offline development
- ✅ Learning vector databases

## 🚀 Quick Start

```bash
# 1. Install (no Docker needed!)
npm install

# 2. Setup environment
cp .env.example .env
# Add your OPENAI_API_KEY

# 3. Seed local database
npm run setup

# 4. Run
npm start
```

That's it! ChromaDB runs entirely on your machine. 🎉

## 💡 Why ChromaDB Local?

**vs Cloud Databases:**
- ✅ No API keys needed (except for embeddings)
- ✅ Zero latency
- ✅ Complete privacy
- ✅ Works offline
- ✅ Free forever

**vs Docker:**
- ✅ No Docker required
- ✅ Faster startup
- ✅ Simpler setup
- ✅ Lower resource usage

## 📁 Project Structure

```
local-chroma/
├── index.js          # Main demo
├── setup.js          # Database seeding
├── chroma_data/      # Local database (auto-created)
└── .env.example      # Environment template
```

## 🔧 How It Works

```javascript
// 1. Initialize local ChromaDB
const vectorStore = new ChromaAdapter({
  path: './chroma_data'  // Local folder!
});

// 2. Search with TONL
const results = await vectorStore.searchToTonl(embedding, {
  limit: 5
});

// Results are 40-60% smaller!
console.log(`Saved ${results.stats.savedTokens} tokens`);
```

## 📊 Performance

**Local ChromaDB:**
- Search latency: <10ms
- No network calls
- Privacy: 100%
- Cost: $0 (except embeddings)

**With TONL Compression:**
- Token reduction: 40-60%
- Faster LLM responses
- Lower costs
- More context window space

## 🎨 What's Included

### Sample Documents
- 20 AI/ML documents pre-loaded
- Topics: RAG, Vector DBs, Embeddings, etc.
- Ready for semantic search

### Interactive Demo
- Ask questions naturally
- See compression stats
- Compare with/without TONL
- Real-time cost savings

### Clean Script
```bash
npm run clean  # Remove database and start fresh
```

## 🔐 Privacy First

Everything stays on your machine:
- ✅ Documents stored locally
- ✅ Vectors stored locally
- ✅ Search happens locally
- ❌ No data sent to cloud (except OpenAI for embeddings)

## 🛠️ Configuration

### Custom Embedding Model

**OpenAI** (default):
```javascript
import { OpenAI } from 'openai';
const openai = new OpenAI();
```

**Local Model** (Ollama):
```javascript
import Ollama from 'ollama';
const ollama = new Ollama();
const embedding = await ollama.embeddings({
  model: 'nomic-embed-text',
  prompt: text
});
```

**HuggingFace**:
```javascript
import { HfInference } from '@huggingface/inference';
const hf = new HfInference(process.env.HF_TOKEN);
```

### Multiple Collections

```javascript
// Create separate collections
const docsStore = new ChromaAdapter({ 
  path: './chroma_data',
  collectionName: 'documents' 
});

const chatStore = new ChromaAdapter({ 
  path: './chroma_data',
  collectionName: 'chat_history' 
});
```

## 📈 Use Cases

### 1. Personal Knowledge Base
Store your notes, articles, bookmarks with semantic search.

### 2. Local RAG for Privacy
Build ChatGPT-like apps without sending data to cloud.

### 3. Offline AI Assistant
Works without internet (with local embeddings).

### 4. Rapid Prototyping
Test vector search ideas without infrastructure.

## 🐛 Troubleshooting

**`chroma_data` folder missing?**
```bash
npm run setup  # Creates it automatically
```

**Want to start fresh?**
```bash
npm run clean  # Deletes database
npm run setup  # Recreates it
```

**Embedding errors?**
Check your `OPENAI_API_KEY` in `.env`

## 🎓 Learn More

- [ChromaDB Docs](https://docs.trychroma.com/)
- [TONL Specification](../../docs/TONL_SPEC.md)
- [Vector Search Guide](../../docs/VECTOR_DB_GUIDE.md)

## 💎 Pro Tips

1. **Batch Inserts**: Insert 100-1000 docs at once for speed
2. **Metadata Filtering**: Use ChromaDB's where filters before vector search
3. **Hybrid Search**: Combine keyword + vector for best results
4. **Regular Backups**: Copy `chroma_data/` folder

## 🤝 Contributing

Found a bug? Want to add features? PRs welcome!

---

**No Docker. No Cloud. Just Works.™** 🚀
