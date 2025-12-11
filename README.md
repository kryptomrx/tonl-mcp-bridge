# TONL-MCP Bridge

> Reduce LLM token costs by 40-60% with TONL format (Optimized for high-volume logs and repetitive data structures)

[![npm version](https://img.shields.io/npm/v/tonl-mcp-bridge.svg)](https://www.npmjs.com/package/tonl-mcp-bridge)
[![npm downloads](https://img.shields.io/npm/dm/tonl-mcp-bridge.svg)](https://www.npmjs.com/package/tonl-mcp-bridge)
[![Tests](https://img.shields.io/badge/tests-385%20passing-brightgreen)](https://github.com/kryptomrx/tonl-mcp-bridge)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/npm/l/tonl-mcp-bridge.svg)](https://github.com/kryptomrx/tonl-mcp-bridge/blob/main/LICENSE)

## Overview

TONL-MCP Bridge is a production-grade TypeScript library and CLI tool that converts JSON/YAML data to TONL (Token Optimized Natural Language) format. By eliminating JSON's structural overhead, TONL reduces token usage for Large Language Model context windows—translating directly to lower costs and improved performance.

### Primary Use Cases

- **RAG Systems**: Optimize retrieval-augmented generation pipelines
- **Vector Databases**: Reduce token overhead for Milvus, Qdrant, and ChromaDB queries
- **MCP Servers**: Build efficient Model Context Protocol integrations
- **Real-time Streaming**: Process logs and event streams with constant memory
- **Enterprise Compliance**: GDPR/HIPAA-ready data anonymization

### When TONL Excels

✅ **Tabular/structured data** (logs, events, analytics)  
✅ **Repeated field structures** (API responses, database queries)  
✅ **Large datasets** (100+ records with consistent schema)  
✅ **High field density** (>10 fields per record)

### When to Use JSON Instead

❌ **Single-object conversions** (header overhead > savings)  
❌ **Highly heterogeneous data** (many optional fields lead to sparse tables)  
❌ **Deeply nested trees** (configuration files with complex hierarchies)  
❌ **Small payloads** (<1KB where overhead dominates)

[Read full documentation](https://tonl-mcp-bridge-docs.vercel.app/)

## The Problem

LLMs charge per token. JSON's verbosity directly impacts costs:

```json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "age": 25,
    "email": "alice@example.com",
    "active": true
  },
  {
    "id": 2,
    "name": "Bob Smith",
    "age": 30,
    "email": "bob@example.com",
    "active": false
  }
]
```

**Cost: 118 tokens**

## The Solution

TONL format maintains structure while eliminating redundancy:

```tonl
data[2]{id:i32,name:str,age:i32,email:str,active:bool}:
  1, "Alice Johnson", 25, alice@example.com, true
  2, "Bob Smith", 30, bob@example.com, false
```

**Cost: 75 tokens (36.4% reduction)**

The savings scale with data volume—reaching 50-60% for datasets with 100+ records and consistent schemas.

## Token Savings (Verified by Benchmarks)

TONL is architected for **structure reduction**. Savings correlate directly with the ratio of field names (structure) to values (content).

| Use Case | Typical Savings | Best For... |
|----------|-----------------|-------------|
| **Enterprise Logs** | **40-50%** | Kubernetes, CloudWatch, Audit Logs (Verbose Keys) |
| **Tabular Data** | **15-25%** | SQL Exports, User Lists, CSV-style Data |
| **Document / RAG** | **5-10%** | Unstructured Text, Articles (Content dominates) |

### Benchmark Results (v1.1.0)

*Verified on Apple M4 / Node v25.2.1 using `cl100k_base` tokenizer (GPT-4o).*

| Dataset Type | Records | JSON Tokens | TONL Tokens | Reduction | Lossless? |
|--------------|---------|-------------|-------------|-----------|-----------|
| **Enterprise Logs (Verbose)** | 1,000   | 172,603     | 92,054      | **46.7%** | ✅ Yes    |
| **Users (Simple)** | 1,000   | 28,848      | 22,754      | **21.1%** | ✅ Yes    |
| **RAG (Mixed)** | 200     | 43,997      | 41,343      | **6.0%**  | ✅ Yes    |

> **Pro Tip:** To maximize savings, use TONL for data with repetitive, verbose keys (e.g., `http_request_duration_ms`, `kubernetes_pod_name_identifier`). For raw text-heavy payloads, standard JSON or Markdown is sufficient.

**Why the variation?**
- **Enterprise logs** have 15+ verbose field names repeated across thousands of records
- **Tabular data** has moderate field names (5-10 fields) with simple values
- **RAG documents** are content-heavy where structure is <10% of total tokens

### Real-World Impact

**Example: Mid-Scale Logging Infrastructure**

*Pricing based on GPT-4o ($2.50 per 1M input tokens, as of December 2024)*

**Scenario:** Cloud observability platform processing Kubernetes logs
- 100,000 log events/day
- 15 fields per event (verbose keys like `distributed_trace_correlation_id`)
- JSON payload: ~170 tokens per event

**Before (JSON):**
- Daily tokens: 17M tokens (100K × 170)
- Cost per day: $42.50 ($2.50 × 17)
- Monthly cost: ~$1,275

**After (TONL - 47% reduction):**
- Daily tokens: 9M tokens (100K × 90)
- Cost per day: $22.50 ($2.50 × 9)
- Monthly cost: ~$675
- **Monthly savings: $600**

**At 1M events/day scale:** **$6,000/month saved**

*Run your own benchmarks: `npm run benchmark` (see [benchmarks/README.md](./benchmarks/README.md))*

## Key Features

### Core Functionality

**Bidirectional Conversion**
- JSON to TONL and back (lossless)
- YAML to TONL and back
- Automatic schema detection
- Smart quoting (only when necessary)

**Type System**
- Optimized numeric types (i8, i16, i32, f32)
- Native support for strings, booleans, null
- Nested object handling via dot-notation
- Array type preservation

### Production Features (v1.0.0)

**Streaming Pipeline**
- Process gigabyte-scale files with constant memory
- 250,000 lines/second throughput (measured on M1 MacBook Pro, 100-byte lines)
- HTTP endpoint for NDJSON to TONL conversion
- Backpressure handling and error recovery

**Privacy & Compliance**
- Smart masking (email, SSN, credit card, phone)
- Nested field anonymization
- GDPR/HIPAA compliance support
- Configurable redaction strategies

**Observability**
- Prometheus metrics (business and operational)
- Live monitoring dashboard (`tonl top` command)
- Health check endpoints for Kubernetes
- Grafana dashboard templates

**Security**
- Rate limiting (configurable per-IP)
- Security headers via Helmet
- Bearer token authentication (or auto-generated session tokens)
- Graceful shutdown with connection draining

### Vector Database Integration

Native adapters for:
- **Milvus**: Automatic TONL conversion for search results
- **Qdrant**: Optimized query formatting
- **ChromaDB**: Collection discovery and similarity search

Each adapter includes built-in token statistics and savings calculations.

## Limitations & Edge Cases

### Sparse Data / Union Schemas

When records have varying fields, TONL uses union schemas:

```typescript
// Heterogeneous data
const data = [
  { type: "user", name: "Alice", age: 30 },
  { type: "product", name: "Widget", price: 9.99 }
];

// TONL handles via union schema
// @items|type:s,name:s,age:n?,price:n?
// user|Alice|30|null
// product|Widget|null|9.99
```

- Optional fields marked with `?` suffix
- Missing values represented as `null`
- Token savings reduced but still present (typically 20-30%)

### Performance Considerations

- **Schema inference overhead:** ~1-2ms for first batch
- **Type detection cost:** Increases with mixed-type fields
- **Header size:** Proportional to field count (10 fields ≈ 50 tokens)
- **Memory:** Constant usage regardless of file size

For complete technical details, see [LIMITATIONS.md](./LIMITATIONS.md)

## Installation

### CLI Tool (Global)

```bash
npm install -g tonl-mcp-bridge
```

### Library (Local Project)

```bash
npm install tonl-mcp-bridge
```

### MCP Server

**stdio mode (for Claude Desktop):**
```bash
npm install -g tonl-mcp-bridge

# Configure in claude_desktop_config.json:
# {
#   "mcpServers": {
#     "tonl": {
#       "command": "npx",
#       "args": ["-y", "tonl-mcp-stdio"]
#     }
#   }
# }
```

**HTTP/SSE mode (for remote/Docker):**
```bash
# With permanent token (production)
export TONL_AUTH_TOKEN=your-secure-token
npx tonl-mcp-server

# Without token (development)
# Server auto-generates session tokens (valid for 1 hour)
npx tonl-mcp-server
```

### Docker

```bash
docker run -d \
  -p 3000:3000 \
  -e TONL_AUTH_TOKEN=your-token \
  ghcr.io/kryptomrx/tonl-mcp-bridge:latest

# Verify health
curl http://localhost:3000/health
```

## Quick Start

### CLI Usage

```bash
# Basic conversion
tonl convert data.json

# With token statistics
tonl convert data.json -s

# Show all commands
tonl help

# Monitor server metrics
tonl top --url https://your-server.com

# Convert with anonymization
tonl convert users.json --anonymize email,ssn
```

### Programmatic Usage

```typescript
import { jsonToTonl, tonlToJson } from 'tonl-mcp-bridge';

// Convert to TONL
const data = [
  { id: 1, name: "Alice", age: 25 },
  { id: 2, name: "Bob", age: 30 }
];

const tonl = jsonToTonl(data, "users");
// users[2]{id:i32,name:str,age:i32}:
//   1, Alice, 25
//   2, Bob, 30

// Convert back to JSON
const json = tonlToJson(tonl);
```

### Streaming

```typescript
import { pipeline } from 'stream/promises';
import { NdjsonParse, TonlTransform } from 'tonl-mcp-bridge/streams';
import { createReadStream, createWriteStream } from 'fs';

await pipeline(
  createReadStream('logs.ndjson'),
  new NdjsonParse(),
  new TonlTransform({ collectionName: 'logs' }),
  createWriteStream('logs.tonl')
);
```

### Privacy & Anonymization

```typescript
import { jsonToTonl } from 'tonl-mcp-bridge';

const users = [
  { 
    id: 1, 
    name: 'Alice', 
    email: 'alice@company.com',
    ssn: '123-45-6789' 
  }
];

// Smart masking (preserves format context)
const masked = jsonToTonl(users, 'users', {
  anonymize: ['email', 'ssn'],
  mask: true
});
// Output: a***@company.com, ***-**-6789

// Simple redaction
const redacted = jsonToTonl(users, 'users', {
  anonymize: ['email', 'ssn']
});
// Output: [REDACTED], [REDACTED]
```

## Architecture

### Components

**Core Library**
- Type detection and optimization
- Schema inference
- Bidirectional conversion engine
- Token counting with js-tiktoken

**Streaming Pipeline**
- NDJSON parser with error recovery
- Transform streams for conversion
- HTTP endpoints for remote processing

**Privacy Module**
- Pattern-based field detection
- Configurable masking strategies
- Deep cloning (no side effects)
- Nested object support

**Observability**
- Prometheus metrics collection
- Real-time dashboard
- Health endpoints
- Graceful shutdown

### Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3
- **Testing**: Vitest (385 tests passing)
- **HTTP Framework**: Express 5
- **Security**: Helmet, Express Rate Limit
- **Metrics**: prom-client
- **Tokenizer**: js-tiktoken (GPT-4o tokenizer)
- **Protocols**: MCP, SSE, HTTP

## Production Deployment

### Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  tonl-server:
    image: ghcr.io/kryptomrx/tonl-mcp-bridge:latest
    ports:
      - "3000:3000"
    environment:
      - TONL_AUTH_TOKEN=${TONL_AUTH_TOKEN}
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tonl-mcp-bridge
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: tonl-server
        image: ghcr.io/kryptomrx/tonl-mcp-bridge:latest
        ports:
        - containerPort: 3000
        env:
        - name: TONL_AUTH_TOKEN
          valueFrom:
            secretKeyRef:
              name: tonl-secrets
              key: auth-token
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Documentation

Comprehensive documentation available at [tonl-mcp-bridge-docs.vercel.app](https://tonl-mcp-bridge-docs.vercel.app/)

**Guides**
- [Getting Started](https://tonl-mcp-bridge-docs.vercel.app/guide/getting-started)
- [Commands Reference](https://tonl-mcp-bridge-docs.vercel.app/guide/commands)
- [Streaming](https://tonl-mcp-bridge-docs.vercel.app/guide/streaming)
- [Privacy & Compliance](https://tonl-mcp-bridge-docs.vercel.app/guide/privacy)
- [Live Monitoring](https://tonl-mcp-bridge-docs.vercel.app/guide/monitoring)
- [MCP Server](https://tonl-mcp-bridge-docs.vercel.app/guide/mcp-server)
- [Vector Databases](https://tonl-mcp-bridge-docs.vercel.app/guide/milvus)

**API Reference**
- [Core API](https://tonl-mcp-bridge-docs.vercel.app/api/core)
- [Streaming API](https://tonl-mcp-bridge-docs.vercel.app/api/streaming)
- [Privacy API](https://tonl-mcp-bridge-docs.vercel.app/api/privacy)
- [Server API](https://tonl-mcp-bridge-docs.vercel.app/api/server)

## Development

```bash
# Clone repository
git clone https://github.com/kryptomrx/tonl-mcp-bridge.git
cd tonl-mcp-bridge

# Install dependencies
npm install

# Run tests (385 passing)
npm test

# Build
npm run build

# Run local server
npm run mcp:start
```

## Roadmap

**Completed (v1.0.0)**
- Core conversion engine with type optimization
- MCP Server integration with auto-generated session tokens
- Vector database adapters (Milvus, Qdrant, ChromaDB)
- Streaming pipeline (250k lines/sec)
- Privacy & anonymization with smart masking
- Production observability (Prometheus, health checks)
- Security (rate limiting, Helmet, graceful shutdown)
- Comprehensive CLI with `tonl help` command

**Planned (Post v1.0.0)**
- LangChain integration
- LlamaIndex plugin
- VS Code extension
- Serverless deployment templates (AWS Lambda, Cloudflare Workers)
- Additional vector database adapters (Pinecone, Weaviate)

[View detailed roadmap](https://tonl-mcp-bridge-docs.vercel.app/roadmap)

## Contributing

Contributions are welcome. Please submit issues and pull requests via GitHub.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT License - see [LICENSE](./LICENSE) for details

## Links

- **npm**: https://www.npmjs.com/package/tonl-mcp-bridge
- **GitHub**: https://github.com/kryptomrx/tonl-mcp-bridge
- **Documentation**: https://tonl-mcp-bridge-docs.vercel.app/
- **Commands**: https://github.com/kryptomrx/tonl-mcp-bridge/blob/main/COMMANDS.md
- **Issues**: https://github.com/kryptomrx/tonl-mcp-bridge/issues

---

*Pricing information verified December 11, 2025. Token calculations based on GPT-4o tokenizer (js-tiktoken). Benchmark data from [benchmarks/README.md](./benchmarks/README.md).*

Built by developers tired of paying for JSON's verbosity. If this saved your organization money, consider starring the project on GitHub.
