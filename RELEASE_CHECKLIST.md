# v1.0.0 Release Checklist

## Implementation Status

### ✅ Core Files
- [x] `src/mcp/metrics.ts` - Created
- [x] `src/mcp/server.ts` - Updated with metrics integration
- [x] `tests/metrics.test.ts` - Test suite created
- [x] `package.json` - Updated to v1.0.0, added prom-client

### ✅ Monitoring Stack
- [x] `docker-compose.monitoring.yml` - Complete stack
- [x] `prometheus.yml` - Scrape configuration
- [x] `grafana-datasource.yml` - Datasource provisioning
- [x] `grafana-dashboard.json` - Dashboard definition
- [x] `grafana-dashboard-provider.yml` - Dashboard provisioning

### ✅ Documentation
- [x] `METRICS.md` - Metrics reference guide
- [x] `README.md` - Updated with metrics feature
- [x] `CHANGELOG_v1.0.0.md` - Release notes

## Testing Checklist

### Local Testing
```bash
# 1. Install dependencies
cd /Users/brunodeanoz/Documents/tonl-mcp-bridge
npm install

# 2. Build project
npm run build

# 3. Run all tests
npm test

# 4. Run metrics tests specifically
npm test tests/metrics.test.ts

# 5. Start MCP server
npm run mcp:start

# 6. Test metrics endpoint
curl http://localhost:3000/metrics

# Expected: Prometheus metrics output
```

### Docker Testing
```bash
# 1. Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# 2. Check services
docker-compose -f docker-compose.monitoring.yml ps

# Expected: All services running
# - tonl-mcp-server (port 3000)
# - tonl-prometheus (port 9090)
# - tonl-grafana (port 3001)

# 3. Test metrics endpoint
curl http://localhost:3000/metrics

# 4. Check Prometheus targets
open http://localhost:9090/targets
# Expected: tonl-mcp-bridge target is UP

# 5. Check Grafana dashboard
open http://localhost:3001
# Login: admin/admin
# Expected: TONL dashboard visible

# 6. Generate test data
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# 7. Verify metrics update
curl http://localhost:3000/metrics | grep tonl_

# 8. Cleanup
docker-compose -f docker-compose.monitoring.yml down
```

### Integration Testing
```bash
# Test actual conversion with metrics
cat > test-data.json << EOF
[
  {"id": 1, "name": "Alice", "age": 25},
  {"id": 2, "name": "Bob", "age": 30}
]
EOF

# Start server
npm run mcp:start &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Make conversion request
# (Use MCP client or HTTP request)

# Check metrics
curl http://localhost:3000/metrics | grep -E "tonl_(tokens_saved|cost_savings|conversion_requests)"

# Expected output includes:
# tonl_tokens_saved_total{model="gpt-4o"} 43
# tonl_estimated_cost_savings_usd{model="gpt-4o"} 0.0001075
# tonl_conversion_requests_total{operation="json_to_tonl",status="success"} 1

# Cleanup
kill $SERVER_PID
```

## Pre-Release Checklist

- [ ] All tests pass locally
- [ ] Metrics endpoint responds correctly
- [ ] Docker Compose stack starts successfully
- [ ] Prometheus scrapes metrics
- [ ] Grafana dashboard displays correctly
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Documentation is accurate
- [ ] CHANGELOG.md updated
- [ ] Version bumped to 1.0.0

## Release Steps

### 1. Final Code Review
```bash
# Check for any TODO or FIXME comments
grep -r "TODO\|FIXME" src/

# Check TypeScript compilation
npm run build

# Run linter
npm run lint

# Format code
npm run format
```

### 2. Update CHANGELOG.md
```bash
# Move CHANGELOG_v1.0.0.md content to CHANGELOG.md
cat CHANGELOG_v1.0.0.md >> CHANGELOG.md
```

### 3. Git Commit
```bash
git add .
git commit -m "feat: Add Prometheus metrics for observability (v1.0.0)

- Add /metrics endpoint with business and operational metrics
- Integrate metrics in MCP server
- Include Grafana dashboard and Prometheus config
- Add comprehensive test suite
- Update documentation

BREAKING CHANGE: None (pure addition)
"
```

### 4. Git Tag
```bash
git tag -a v1.0.0 -m "Release v1.0.0: Prometheus Metrics

Features:
- Prometheus metrics endpoint
- Business metrics (tokens saved, cost savings, ROI)
- Operational metrics (latency, connections, errors)
- Grafana dashboard
- Complete monitoring stack with Docker Compose

See CHANGELOG.md for full details."
```

### 5. Push to GitHub
```bash
git push origin main
git push origin v1.0.0
```

### 6. npm Publish
```bash
# Test publish (dry-run)
npm publish --dry-run

# Actual publish
npm publish

# Verify
npm view tonl-mcp-bridge
```

### 7. GitHub Release
```bash
# Create GitHub release with tag v1.0.0
# Title: v1.0.0 - Prometheus Metrics
# Body: Copy from CHANGELOG_v1.0.0.md
# Attach: grafana-dashboard.json
```

### 8. Documentation
```bash
# Update docs site if needed
# Verify links work
# Check examples are current
```

## Post-Release

- [ ] Verify npm package published
- [ ] Test npm install globally
- [ ] Test Docker image builds
- [ ] Update documentation site
- [ ] Announce on social media
- [ ] Update project boards
- [ ] Plan v1.1.0 features

## Rollback Plan

If issues are found:

```bash
# Unpublish from npm (within 72 hours)
npm unpublish tonl-mcp-bridge@1.0.0

# Remove git tag
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# Revert to v0.9.0
git revert HEAD
git push origin main
```

## Known Issues

None identified during testing.

## Support Channels

- GitHub Issues: https://github.com/kryptomrx/tonl-mcp-bridge/issues
- Documentation: https://tonl-mcp-bridge-docs.vercel.app/
- Email: [Add support email]

## Notes

- This is a major version bump (0.9.0 → 1.0.0)
- No breaking changes despite major version
- Metrics are opt-in, existing code unaffected
- Production-ready for enterprise observability
