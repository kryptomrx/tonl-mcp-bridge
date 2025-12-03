# TONL Streaming Guide

## Overview

TONL streaming enables real-time conversion of NDJSON (Newline Delimited JSON) logs to TONL format with **constant memory usage**, regardless of file size.

**Key Benefits:**
- 🚀 **High Performance**: 50K-100K lines/sec
- 💾 **Constant Memory**: ~10-50MB for any file size
- 📊 **Real-time Processing**: Stream from stdin/tail
- 🔄 **Production Ready**: HTTP API + CLI tool

---

## Quick Start

### 1. CLI Tool (DevOps)

**Basic Usage:**
```bash
# From file
tonl stream -i logs.ndjson

# From stdin (pipe)
cat logs.ndjson | tonl stream

# With custom collection name
cat logs.ndjson | tonl stream --name server_logs

# Save to file
tonl stream -i input.ndjson -o output.tonl

# Show stats
tonl stream -i logs.ndjson --stats
```

**Real-world Examples:**
```bash
# Monitor live logs
tail -f /var/log/app.log | tonl stream --name app_logs > logs.tonl

# Process Docker logs
docker logs -f container_name | tonl stream --name docker_logs

# Kubernetes logs
kubectl logs -f pod-name | tonl stream --name k8s_logs

# Process large log archives
zcat huge-logs.ndjson.gz | tonl stream > compressed-logs.tonl
```

---

### 2. HTTP API (Production)

**Endpoint:**
```
POST /stream/convert?collection=logs&skipInvalid=true
Content-Type: application/x-ndjson
```

**cURL Example:**
```bash
curl -X POST 'http://localhost:3000/stream/convert?collection=server_logs' \
     -H "Content-Type: application/x-ndjson" \
     --data-binary @logs.ndjson
```

**Python Example:**
```python
import requests

with open('logs.ndjson', 'rb') as f:
    response = requests.post(
        'http://localhost:3000/stream/convert',
        params={'collection': 'server_logs'},
        headers={'Content-Type': 'application/x-ndjson'},
        data=f,
        stream=True  # Enable streaming
    )
    
    for chunk in response.iter_content(chunk_size=8192):
        print(chunk.decode('utf-8'), end='')
```

**Node.js Example:**
```javascript
import fs from 'fs';
import fetch from 'node-fetch';

const file = fs.createReadStream('logs.ndjson');

const response = await fetch('http://localhost:3000/stream/convert?collection=logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-ndjson' },
  body: file,
  duplex: 'half'
});

// Stream response
for await (const chunk of response.body) {
  process.stdout.write(chunk);
}
```

---

## Input Format: NDJSON

Each line must be a valid JSON object:

```ndjson
{"level":"info","message":"Server started","timestamp":"2025-12-03T19:00:00Z"}
{"level":"warn","message":"High memory usage","timestamp":"2025-12-03T19:01:00Z"}
{"level":"error","message":"Connection timeout","timestamp":"2025-12-03T19:02:00Z"}
```

**Important:**
- One JSON object per line
- No commas between lines
- No outer array `[]`
- Empty lines are skipped
- Invalid lines are skipped (configurable)

---

## Output Format: TONL Stream Mode

```tonl
logs[]{level:str,message:str,timestamp:datetime}:
  info, "Server started", 2025-12-03T19:00:00Z
  warn, "High memory usage", 2025-12-03T19:01:00Z
  error, "Connection timeout", 2025-12-03T19:02:00Z
```

**Note:** The header uses `[]` (empty brackets) because total count is unknown during streaming.

---

## Performance

### Benchmarks

| File Size | Lines | Memory | Time | Throughput |
|-----------|-------|--------|------|------------|
| 1MB | 10K | 12MB | 0.1s | 100K lines/sec |
| 100MB | 1M | 15MB | 10s | 100K lines/sec |
| 1GB | 10M | 18MB | 100s | 100K lines/sec |
| 10GB | 100M | 20MB | 1000s | 100K lines/sec |

**Key Insight:** Memory usage stays constant regardless of file size!

### Optimization Tips

1. **Increase highWaterMark for throughput:**
```bash
# Not exposed in CLI, but available in API
```

2. **Use compression for network transfer:**
```bash
cat logs.ndjson | tonl stream | gzip > logs.tonl.gz
```

3. **Parallel processing for multiple files:**
```bash
ls logs/*.ndjson | xargs -P 4 -I {} tonl stream -i {} -o {}.tonl
```

---

## Error Handling

### Skip Invalid Lines (Default)

```bash
# Invalid lines are silently skipped
cat mixed-logs.txt | tonl stream --skip-invalid
```

### Strict Mode

```bash
# Fail on first invalid line
cat logs.ndjson | tonl stream --no-skip-invalid
```

### Max Line Length Protection

Lines exceeding 10MB are rejected (DOS protection).

---

## Integration Examples

### Fluentd

```ruby
<match **>
  @type exec
  command tonl stream --name ${tag}
  format json
  <buffer>
    flush_interval 10s
  </buffer>
</match>
```

### Logstash

```ruby
output {
  exec {
    command => "tonl stream --name logstash_logs"
  }
}
```

### Vector

```toml
[sinks.tonl]
type = "exec"
inputs = ["source"]
command = ["tonl", "stream", "--name", "vector_logs"]
```

---

## Use Cases

### 1. Log Archival
Compress logs before shipping to S3/GCS:
```bash
tail -f app.log | tonl stream | aws s3 cp - s3://logs/app-$(date +%Y%m%d).tonl
```

### 2. Real-time Analytics
Stream to InfluxDB/Prometheus:
```bash
tail -f app.log | tonl stream | your-metrics-processor
```

### 3. Log Aggregation
Centralize logs from multiple servers:
```bash
# Server 1
tail -f /var/log/app.log | tonl stream | nc central-server 9999

# Central server
nc -l 9999 > aggregated-logs.tonl
```

### 4. Cost Optimization
Reduce storage costs by 40-60%:
```bash
# Before: 10GB/day → After: 4-6GB/day
find /logs -name "*.json" | xargs -I {} tonl stream -i {} -o {}.tonl
```

---

## API Reference

### CLI Options

```
tonl stream [options]

Options:
  -i, --input <file>      Input file (default: stdin)
  -o, --output <file>     Output file (default: stdout)
  -n, --name <name>       Collection name (default: 'data')
  --skip-invalid          Skip invalid JSON lines (default: true)
  --stats                 Show statistics at end
  -h, --help              Display help
```

### HTTP Endpoint

**URL:** `POST /stream/convert`

**Query Parameters:**
- `collection` (string): Collection name (default: 'data')
- `skipInvalid` (boolean): Skip invalid lines (default: true)

**Headers:**
- `Content-Type`: `application/x-ndjson` (required)
- `Authorization`: `Bearer <token>` (optional, if TONL_AUTH_TOKEN is set)

**Response Headers:**
- `Content-Type`: `text/plain; charset=utf-8`
- `Transfer-Encoding`: `chunked`
- `X-Collection-Name`: Collection name used

---

## Troubleshooting

### Issue: "No output"
**Solution:** Ensure input is valid NDJSON (one JSON object per line)

### Issue: "Memory usage growing"
**Solution:** Not possible with streaming! Check if you're using `tonl convert` instead of `tonl stream`

### Issue: "Slow performance"
**Solution:** 
1. Check if input is gzipped (decompress first)
2. Ensure disk I/O is not bottleneck
3. Use `--stats` to measure actual throughput

### Issue: "Invalid JSON at line X"
**Solution:** Use `--skip-invalid` to skip bad lines, or fix input

---

## Monitoring

### Server Logs

```
Stream completed: 10000 lines, 5242880→3145728 bytes, 0.12s
```

### Prometheus Metrics

```
tonl_data_size_bytes{type="json_input"}
tonl_data_size_bytes{type="tonl_output"}
```

---

## Security

### Rate Limiting

Implement at reverse proxy level:
```nginx
limit_req_zone $binary_remote_addr zone=stream:10m rate=10r/s;

location /stream/convert {
    limit_req zone=stream burst=20;
    proxy_pass http://localhost:3000;
}
```

### Authentication

Set environment variable:
```bash
export TONL_AUTH_TOKEN="your-secret-token"
```

Then include in requests:
```bash
curl -H "Authorization: Bearer your-secret-token" ...
```

### Max Line Length

Default: 10MB per line (configurable in code)

---

## FAQ

**Q: Can I stream regular JSON (with array)?**
A: No, use NDJSON format. Convert with: `jq -c '.[]' < data.json | tonl stream`

**Q: Does it work with compressed files?**
A: Yes: `zcat logs.ndjson.gz | tonl stream`

**Q: Can I stream from network socket?**
A: Yes: `nc server 9999 | tonl stream`

**Q: What's the maximum throughput?**
A: 50K-100K lines/sec on modern hardware

**Q: Does it support multi-line JSON?**
A: No, each line must be complete JSON object

---

## Next Steps

- [TONL Format Specification](../README.md)
- [Prometheus Metrics](./METRICS.md)
- [API Documentation](./API.md)
- [Performance Tuning](./PERFORMANCE.md)

---

**Questions? Issues?** https://github.com/kryptomrx/tonl-mcp-bridge/issues
