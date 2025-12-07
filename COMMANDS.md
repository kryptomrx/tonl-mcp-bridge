# TONL-MCP Bridge - Commands Reference

Complete command reference for CLI and server usage.

## CLI Commands

### Global Options

Available for all commands:
```
--help, -h     Show help
--version, -v  Show version
```

---

## File Conversion

### Basic Conversion

```bash
# Convert JSON to TONL
tonl convert data.json

# Convert YAML to TONL
tonl convert config.yaml

# Convert TONL back to JSON
tonl convert data.tonl

# Convert TONL to YAML
tonl convert data.tonl output.yaml
```

### Conversion Options

```bash
tonl convert <input> [output] [options]

Options:
  -s, --stats              Show token statistics
  -n, --name <name>        Collection name (default: 'data')
  --anonymize <fields>     Comma-separated fields to anonymize
  --mask                   Use smart masking (preserves format)
  -m, --model <model>      LLM model for token counting
                           (gpt-4o, gpt-4, claude-4, gemini-1.5)
```

### Examples

```bash
# With statistics
tonl convert users.json -s

# Custom collection name
tonl convert products.json --name products

# Anonymize sensitive fields
tonl convert users.json --anonymize email,ssn,card

# Smart masking
tonl convert users.json --anonymize email,ssn --mask

# Specify output path
tonl convert input.json output.tonl

# Multiple options
tonl convert data.json result.tonl -s --name mydata --model gpt-4o
```

---

## Live Monitoring

### Monitor Server Metrics

```bash
# Monitor local server
tonl top

# Monitor remote server
tonl top --url https://api.example.com

# With custom authentication
tonl top --url https://api.example.com --token your-token

# Change refresh interval (default: 2s)
tonl top --interval 5
```

### Keyboard Shortcuts

While monitoring:
```
q  - Quit
r  - Refresh now
c  - Clear screen
↑↓ - Scroll (if applicable)
```

---

## ROI Calculator

### Calculate Token Savings

```bash
# Basic ROI calculation
tonl roi --savings 45 --queries-per-day 1000

# With specific model
tonl roi --savings 45 --queries-per-day 1000 --model gpt-4o

# With currency
tonl roi --savings 45 --queries-per-day 1000 --currency EUR

# Full example
tonl roi \
  --savings 45 \
  --queries-per-day 10000 \
  --model gpt-4o \
  --currency USD \
  --verbose
```

### Options

```bash
Options:
  --savings <percent>        Token savings percentage (0-100)
  --queries-per-day <count>  Daily query volume
  --model <model>            LLM model (default: gpt-4o)
  --currency <code>          Currency code (USD, EUR, GBP, etc.)
  --verbose                  Detailed output
```

---

## Analysis Commands

### Analyze Files

```bash
# Analyze single file
tonl analyze data.json

# With visual output
tonl analyze data.json --visual

# Multiple formats
tonl analyze data.json --format json
tonl analyze data.json --format markdown
tonl analyze data.json --format csv

# Export to file
tonl analyze data.json --export report.csv

# Batch analysis
tonl analyze data/*.json --format markdown > report.md
```

### Analysis Options

```bash
Options:
  --visual                Show visual dashboard
  --format <type>         Output format (json, markdown, csv)
  --export <file>         Export to file
  --currency <code>       Display costs in currency
  --model <model>         LLM model for calculations
```

---

## MCP Server Commands

### Start Server

```bash
# Start with environment token
export TONL_AUTH_TOKEN=your-secure-token
tonl-mcp-server

# Start on custom port
PORT=8080 tonl-mcp-server

# With inline token (not recommended for production)
TONL_AUTH_TOKEN=test tonl-mcp-server
```

### Server Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Readiness check
curl http://localhost:3000/ready

# Prometheus metrics
curl http://localhost:3000/metrics

# Live metrics stream (requires auth)
curl -N -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/metrics/live

# Streaming conversion
curl -X POST http://localhost:3000/stream/convert \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @logs.ndjson

# MCP endpoint
curl -N -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/mcp
```

---

## Streaming Operations

### Stream Conversion

```bash
# Basic streaming
cat logs.ndjson | curl -X POST http://localhost:3000/stream/convert \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @-

# With collection name
curl -X POST "http://localhost:3000/stream/convert?collection=logs" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @logs.ndjson

# Skip invalid lines (default: true)
curl -X POST "http://localhost:3000/stream/convert?skipInvalid=false" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @logs.ndjson
```

### Query Parameters

```
collection=<name>     Collection name (default: 'data')
skipInvalid=<bool>    Skip invalid JSON lines (default: true)
```

---

## Programmatic Usage

### Node.js API

```javascript
import { jsonToTonl, tonlToJson, calculateSavings } from 'tonl-mcp-bridge';

// Convert JSON to TONL
const tonl = jsonToTonl(data, 'users');

// Parse TONL back to JSON
const json = tonlToJson(tonl);

// Calculate savings
const stats = calculateSavings(jsonStr, tonlStr, 'gpt-4o');
console.log(`Saved ${stats.savingsPercent}% tokens`);
```

### TypeScript

```typescript
import { 
  jsonToTonl, 
  tonlToJson, 
  calculateSavings,
  type TonlOptions 
} from 'tonl-mcp-bridge';

const options: TonlOptions = {
  anonymize: ['email', 'ssn'],
  mask: true
};

const tonl = jsonToTonl(data, 'users', options);
```

### Streaming API

```typescript
import { pipeline } from 'stream/promises';
import { NdjsonParse, TonlTransform } from 'tonl-mcp-bridge/streams';
import { createReadStream, createWriteStream } from 'fs';

await pipeline(
  createReadStream('input.ndjson'),
  new NdjsonParse({ skipInvalid: true }),
  new TonlTransform({ collectionName: 'logs' }),
  createWriteStream('output.tonl')
);
```

---

## Environment Variables

### Server Configuration

```bash
# Required (production)
TONL_AUTH_TOKEN=your-secure-token

# Optional
PORT=3000                    # Server port
NODE_ENV=production          # Environment mode
DEBUG=tonl:*                 # Enable debug logs
```

### Usage Examples

```bash
# Production setup
export TONL_AUTH_TOKEN=$(openssl rand -hex 32)
export NODE_ENV=production
export PORT=8080
tonl-mcp-server

# Development setup
tonl-mcp-server
# Auto-generates session tokens, no auth required
```

---

## Docker Commands

### Run Server

```bash
# Basic
docker run -d \
  -p 3000:3000 \
  -e TONL_AUTH_TOKEN=your-token \
  ghcr.io/kryptomrx/tonl-mcp-bridge:latest

# With custom port
docker run -d \
  -p 8080:8080 \
  -e PORT=8080 \
  -e TONL_AUTH_TOKEN=your-token \
  ghcr.io/kryptomrx/tonl-mcp-bridge:latest

# With health check
docker run -d \
  --name tonl-server \
  -p 3000:3000 \
  -e TONL_AUTH_TOKEN=your-token \
  --health-cmd='curl -f http://localhost:3000/health' \
  --health-interval=30s \
  --health-timeout=5s \
  --health-retries=3 \
  ghcr.io/kryptomrx/tonl-mcp-bridge:latest
```

### Docker Compose

```yaml
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
```

---

## Kubernetes Commands

### Deploy

```bash
# Create secret
kubectl create secret generic tonl-secrets \
  --from-literal=auth-token=your-secure-token

# Apply deployment
kubectl apply -f deployment.yaml

# Check status
kubectl get pods -l app=tonl-mcp-bridge

# View logs
kubectl logs -f deployment/tonl-mcp-bridge

# Port forward for local access
kubectl port-forward deployment/tonl-mcp-bridge 3000:3000
```

### Health Checks

```bash
# Test liveness probe
kubectl exec deployment/tonl-mcp-bridge -- curl -f http://localhost:3000/health

# Test readiness probe
kubectl exec deployment/tonl-mcp-bridge -- curl -f http://localhost:3000/ready
```

---

## Testing & Development

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific test file
npm test tests/health-checks.test.ts
```

### Build

```bash
# Build TypeScript
npm run build

# Clean build
rm -rf dist && npm run build

# Lint
npm run lint

# Format
npm run format
```

### Local Development

```bash
# Start dev server with watch
npm run dev

# Start MCP server locally
npm run mcp:start

# Test CLI locally
npm run cli convert test.json
```

---

## Advanced Usage

### Batch Operations

```bash
# Convert multiple files
for file in data/*.json; do
  tonl convert "$file" -s
done

# Glob pattern
tonl convert data/**/*.json --export results.csv

# Parallel processing
find data -name "*.json" | xargs -P 4 -I {} tonl convert {}
```

### CI/CD Integration

```bash
# GitHub Actions
- name: Analyze tokens
  run: tonl analyze data.json --format markdown > report.md

- name: Comment PR
  uses: actions/github-script@v6
  with:
    script: |
      const report = require('fs').readFileSync('report.md', 'utf8');
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        body: report
      });
```

### Monitoring Setup

```bash
# Prometheus scrape config
cat >> prometheus.yml <<EOF
scrape_configs:
  - job_name: 'tonl-mcp-bridge'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
EOF

# Grafana datasource
curl -X POST http://admin:admin@localhost:3000/api/datasources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://prometheus:9090",
    "access": "proxy"
  }'
```

---

## Troubleshooting Commands

### Debug Server

```bash
# Enable debug logs
DEBUG=tonl:* tonl-mcp-server

# Check if server is running
curl http://localhost:3000/health

# Test streaming endpoint
echo '{"test":1}' | curl -X POST http://localhost:3000/stream/convert \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @-

# Monitor logs
docker logs -f tonl-server

# Check resource usage
docker stats tonl-server
```

### Network Diagnostics

```bash
# Test connectivity
telnet localhost 3000

# Check open ports
netstat -an | grep 3000

# Test with verbose curl
curl -v http://localhost:3000/health

# Test authentication
curl -H "Authorization: Bearer test" http://localhost:3000/mcp
```

---

## Quick Reference

### Most Common Commands

```bash
# Convert file
tonl convert data.json

# Monitor server
tonl top

# Start server
tonl-mcp-server

# Calculate ROI
tonl roi --savings 45 --queries-per-day 1000

# Health check
curl http://localhost:3000/health
```

### Most Common Options

```bash
-s, --stats              # Show statistics
-n, --name <name>        # Collection name
--anonymize <fields>     # Anonymize fields
--mask                   # Smart masking
-m, --model <model>      # LLM model
--url <url>              # Server URL
--token <token>          # Auth token
```

---

## Getting Help

```bash
# General help
tonl --help

# Command help
tonl convert --help
tonl analyze --help
tonl roi --help
tonl top --help

# Version
tonl --version

# GitHub issues
open https://github.com/kryptomrx/tonl-mcp-bridge/issues

# Documentation
open https://tonl-mcp-bridge-docs.vercel.app/
```

---

*Last updated: December 6, 2025 - v1.0.0*

*For detailed documentation, visit: https://tonl-mcp-bridge-docs.vercel.app/*
