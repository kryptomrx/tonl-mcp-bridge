# Prometheus Metrics

The TONL MCP Bridge exposes Prometheus-compatible metrics for monitoring token savings, cost reduction, and operational health.

## Quick Start

### 1. Start the Server

```bash
npm run mcp:start
```

The metrics endpoint is now available at `http://localhost:3000/metrics`

### 2. Test the Endpoint

```bash
curl http://localhost:3000/metrics
```

### 3. Start Monitoring Stack (Optional)

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

This starts:
- TONL MCP Server on port 3000
- Prometheus on port 9090  
- Grafana on port 3001 (admin/admin)

## Available Metrics

### Business Metrics

**tonl_tokens_saved_total**
- Type: Counter
- Labels: `model`
- Total tokens saved by TONL conversion

**tonl_estimated_cost_savings_usd**
- Type: Counter
- Labels: `model`  
- Estimated cost savings in USD

**tonl_compression_ratio**
- Type: Histogram
- Labels: `model`
- Compression ratio (TONL/JSON size)

**tonl_conversion_requests_total**
- Type: Counter
- Labels: `operation`, `status`
- Total conversion requests

### Operational Metrics

**tonl_conversion_duration_seconds**
- Type: Histogram
- Labels: `operation`
- Conversion operation duration

**tonl_active_connections**
- Type: Gauge
- Number of active SSE connections

**tonl_vector_db_operations_total**
- Type: Counter
- Labels: `database`, `operation`
- Vector database operations

**tonl_data_size_bytes**
- Type: Histogram
- Labels: `type`
- Data size in bytes

## Prometheus Configuration

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'tonl-mcp-bridge'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /metrics
```

## Grafana Dashboard

Import the included dashboard:

1. Open Grafana at http://localhost:3001
2. Login (admin/admin)
3. Navigate to Dashboards
4. The TONL dashboard should be auto-provisioned

The dashboard shows:
- Cost savings in USD
- Total tokens saved
- Compression ratio
- Request rate
- Conversion latency
- Error rate
- Active connections

## Query Examples

```promql
# Total cost savings
sum(tonl_estimated_cost_savings_usd)

# Average compression ratio
avg(tonl_compression_ratio)

# Request rate per second
rate(tonl_conversion_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(tonl_conversion_duration_seconds_bucket[5m]))

# Error percentage
100 * (
  sum(rate(tonl_conversion_requests_total{status="error"}[5m])) 
  / 
  sum(rate(tonl_conversion_requests_total[5m]))
)
```

## Model Pricing

Cost calculations use these prices (per 1M tokens):

**OpenAI:**
- gpt-4o: $2.50
- gpt-4o-mini: $0.15
- gpt-4-turbo: $10.00
- o1: $15.00
- o1-mini: $3.00

**Anthropic:**
- claude-opus-4: $15.00
- claude-sonnet-4: $3.00
- claude-sonnet-3.5: $3.00
- claude-haiku-4: $0.25

**Google:**
- gemini-2.0-flash: $0.075
- gemini-1.5-pro: $1.25
- gemini-1.5-flash: $0.075

## Security

The `/metrics` endpoint is public by default. For production:

1. Restrict to internal network via firewall
2. Use reverse proxy with authentication
3. Configure network-level security

Example nginx config:
```nginx
location /metrics {
    allow 10.0.0.0/8;  # Internal network only
    deny all;
    proxy_pass http://tonl-server:3000;
}
```

## Testing

Run the metrics tests:

```bash
npm test tests/metrics.test.ts
```

## Next Steps

- Configure Prometheus scraping
- Import Grafana dashboard
- Set up alerting rules
- Monitor business metrics
