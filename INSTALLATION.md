# Installation & Setup Guide for v1.0.0

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Git
- Docker and Docker Compose (optional, for monitoring stack)

## Step-by-Step Installation

### 1. Navigate to Project
```bash
cd /Users/brunodeanoz/Documents/tonl-mcp-bridge
```

### 2. Install Dependencies

**Critical:** Install `prom-client` dependency:
```bash
npm install
```

This will install all dependencies including the newly added `prom-client@^15.1.3`.

### 3. Build Project
```bash
npm run build
```

Expected output:
```
> tonl-mcp-bridge@1.0.0 build
> tsc

[No errors should appear]
```

### 4. Run Tests
```bash
npm test
```

Expected output:
```
 ✓ tests/metrics.test.ts (XX tests)
 ✓ tests/roi-calculator.test.ts
 ✓ [other test files]

Test Files  XX passed (XX)
     Tests  196+ passed (196+)
```

### 5. Start MCP Server
```bash
npm run mcp:start
```

Expected output:
```
🚀 TONL MCP Server listening on port 3000
   - SSE Stream: http://localhost:3000/mcp
   - Metrics: http://localhost:3000/metrics
   ⚠️  Security: Disabled (No TONL_AUTH_TOKEN set)
```

### 6. Test Metrics Endpoint
```bash
# In another terminal
curl http://localhost:3000/metrics
```

Expected output (sample):
```
# HELP tonl_tokens_saved_total Total number of tokens saved...
# TYPE tonl_tokens_saved_total counter
tonl_tokens_saved_total{model="gpt-4o"} 0

# HELP tonl_estimated_cost_savings_usd Estimated cost savings...
# TYPE tonl_estimated_cost_savings_usd counter
tonl_estimated_cost_savings_usd{model="gpt-4o"} 0

# HELP tonl_conversion_requests_total Total number of TONL conversion requests
# TYPE tonl_conversion_requests_total counter

# HELP tonl_active_connections Number of active SSE connections
# TYPE tonl_active_connections gauge
tonl_active_connections 0

[... more metrics ...]
```

## Troubleshooting

### Error: Cannot find module 'prom-client'

**Problem:** `prom-client` not installed

**Solution:**
```bash
npm install prom-client
# Or install all dependencies
npm install
```

### TypeScript Errors

**Problem:** Build fails with TypeScript errors

**Solution:**
```bash
# Clean build directory
rm -rf dist/

# Reinstall dependencies
rm -rf node_modules/
npm install

# Rebuild
npm run build
```

### Port Already in Use

**Problem:** Port 3000 already in use

**Solution:**
```bash
# Use different port
PORT=3001 npm run mcp:start

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Tests Failing

**Problem:** Some tests fail

**Solution:**
```bash
# Run tests in verbose mode
npm test -- --reporter=verbose

# Run specific test file
npm test tests/metrics.test.ts

# Check for outdated dependencies
npm outdated
```

## Docker Monitoring Stack

### 1. Start the Stack
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Verify Services
```bash
docker-compose -f docker-compose.monitoring.yml ps
```

Expected output:
```
NAME                STATUS              PORTS
tonl-mcp-server    Up                 0.0.0.0:3000->3000/tcp
tonl-prometheus    Up                 0.0.0.0:9090->9090/tcp
tonl-grafana       Up                 0.0.0.0:3001->3000/tcp
```

### 3. Access Services

**TONL MCP Server:**
- URL: http://localhost:3000
- Metrics: http://localhost:3000/metrics

**Prometheus:**
- URL: http://localhost:9090
- Targets: http://localhost:9090/targets (verify tonl-mcp-bridge is UP)

**Grafana:**
- URL: http://localhost:3001
- Login: admin / admin (change on first login)
- Dashboard: Should be auto-provisioned

### 4. Stop the Stack
```bash
docker-compose -f docker-compose.monitoring.yml down

# Remove volumes (clean start)
docker-compose -f docker-compose.monitoring.yml down -v
```

## Environment Variables

Create a `.env` file:
```env
# MCP Server
PORT=3000
TONL_AUTH_TOKEN=your-super-secret-token-here

# Grafana
GRAFANA_PASSWORD=secure-admin-password
```

## Verification Checklist

After installation, verify:

- [ ] `npm install` completes without errors
- [ ] `npm run build` compiles successfully
- [ ] `npm test` shows all tests passing
- [ ] Server starts without errors
- [ ] `/metrics` endpoint returns Prometheus format
- [ ] Docker Compose stack starts (if using)
- [ ] Prometheus scrapes metrics successfully
- [ ] Grafana dashboard loads correctly

## Next Steps

1. **Development:**
   - Run `npm run dev` for watch mode
   - Make changes to `src/`
   - Tests run automatically

2. **Testing:**
   - Add new tests to `tests/`
   - Run `npm test -- --watch` for TDD

3. **Deployment:**
   - Follow `RELEASE_CHECKLIST.md`
   - Tag and publish to npm
   - Deploy Docker image

4. **Documentation:**
   - Update `METRICS.md` if adding metrics
   - Update `README.md` for features
   - Keep examples current

## Getting Help

- **Documentation:** [METRICS.md](./METRICS.md)
- **Release Notes:** [CHANGELOG_v1.0.0.md](./CHANGELOG_v1.0.0.md)
- **Checklist:** [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
- **Issues:** https://github.com/kryptomrx/tonl-mcp-bridge/issues

## Quick Commands Reference

```bash
# Install
npm install

# Build
npm run build

# Test
npm test

# Start server
npm run mcp:start

# Start with auth
TONL_AUTH_TOKEN=secret npm run mcp:start

# Docker monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Check metrics
curl http://localhost:3000/metrics

# Clean build
rm -rf dist/ && npm run build

# Fresh install
rm -rf node_modules/ && npm install
```
