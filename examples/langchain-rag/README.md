# LangChain RAG with TONL

**Copy-Paste Ready** - LangChain RAG with 40-60% token savings using TONL compression.

## 🎯 What You Get

- ✅ LangChain integration with TONL
- ✅ Qdrant vector store
- ✅ 40-60% token reduction
- ✅ Real cost savings calculation
- ✅ 3 minutes to run

## 🚀 Quick Start

```bash
# 1. Install
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

# 3. Start Qdrant (Docker)
docker run -p 6333:6333 qdrant/qdrant

# 4. Seed data
npm run setup

# 5. Run
npm start
```

## 💰 Cost Savings Example

```
Question: "What is vector search?"

WITHOUT TONL:
├─ Retrieved docs: 2,400 tokens
├─ LLM input: 2,500 tokens
└─ Cost: $0.0075

WITH TONL:
├─ Retrieved docs: 960 tokens (TONL)
├─ LLM input: 1,060 tokens
└─ Cost: $0.0032

SAVINGS: 57.3% = $0.0043 per query
         At 1000 queries/day: $1,569/year saved! 💰
```

## 📁 Files

- `index.js` - Main RAG implementation
- `setup.js` - Database seeding
- `.env.example` - Environment template

## 🔧 How It Works

```javascript
// 1. Search with TONL compression
const results = await vectorStore.searchToTonl(query, { limit: 5 });

// 2. Use compressed context
const response = await chain.invoke({
  context: results.tonl,  // 60% smaller!
  question: query
});

// 3. See savings
console.log(`Saved ${results.stats.savedTokens} tokens`);
```

## 🎓 What You Learn

- How to integrate TONL with LangChain
- Vector search best practices
- Token optimization techniques
- Production-ready patterns

## 🐛 Troubleshooting

**Qdrant not running?**
```bash
docker ps | grep qdrant
docker run -p 6333:6333 qdrant/qdrant
```

**No data?**
```bash
npm run setup
```

## 📚 Next Steps

- Try with your own documents
- Switch to Pinecone/Weaviate
- Add streaming responses
- Implement caching

---

**Questions?** Open an issue or PR!
