# Streaming Pipeline Tests

Comprehensive edge case tests for the TONL streaming pipeline.

## Test Coverage

### 1. NdjsonParse Tests (`ndjson-parse.test.ts`)
- ✅ Chunk boundary handling
- ✅ Invalid JSON handling  
- ✅ Whitespace and empty lines
- ✅ DOS protection (maxLineLength)
- ✅ Unicode and special characters
- ✅ Edge case data types
- ✅ Stream ending conditions
- ✅ Line counting
- ✅ Performance & memory

### 2. TonlTransform Tests (`tonl-transform.test.ts`)
- ✅ Schema inference edge cases
- ✅ Type handling and mismatches
- ✅ String edge cases (escape, Unicode, long strings)
- ✅ Collection name validation
- ✅ Invalid input handling
- ✅ Empty and edge objects
- ✅ Streaming performance
- ✅ Row counting
- ✅ Backpressure handling

### 3. Pipeline Integration Tests (`pipeline-integration.test.ts`)
- ✅ Real-world scenarios (Docker, K8s, databases)
- ✅ Mixed valid/invalid data
- ✅ Large data handling
- ✅ Special characters & encoding
- ✅ Chunking & buffering
- ✅ Error recovery
- ✅ Production log samples
- ✅ Memory & performance

### 4. HTTP Endpoint Tests (`http-endpoint.test.ts`)
- ✅ Basic functionality
- ✅ Content-Type validation
- ✅ Large requests (1MB, 10MB)
- ✅ Concurrent requests
- ✅ Error handling
- ✅ Streaming behavior
- ✅ Metrics integration
- ✅ Connection handling

## Running Tests

```bash
# No extra dependencies needed! Vitest is already installed.

# Run all streaming tests
npm test tests/streams/

# Run specific test file
npm test tests/streams/ndjson-parse.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode (UI)
npm test -- --ui
```

## Edge Cases Covered

### Input Edge Cases
- Incomplete JSON at chunk boundaries
- Invalid JSON mixed with valid
- Empty lines and whitespace
- Very large lines (DOS protection)
- Unicode and special characters
- Malformed objects
- Type mismatches
- Missing/extra keys
- Nested objects and arrays

### Output Edge Cases
- Empty streams
- Single object streams
- Very wide objects (100+ columns)
- Very long string values
- Schema inconsistencies
- Collection name validation

### Performance Edge Cases
- 10k+ lines
- 1MB+ payloads
- Byte-by-byte chunking
- Large concurrent requests
- Memory leaks
- Backpressure handling

### Error Edge Cases
- Abrupt stream endings
- Client disconnects
- Invalid Content-Types
- Invalid collection names
- Completely malformed data

## Test Statistics

**Total Tests:** 100+  
**Edge Cases:** 80+  
**Real-World Scenarios:** 10+  
**Performance Tests:** 15+

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Streaming Tests
  run: npm test -- --run --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Performance Benchmarks

Expected performance on standard hardware:

| Metric | Target | Actual |
|--------|--------|--------|
| 10k lines | < 2s | ✅ |
| 1MB payload | < 5s | ✅ |
| Memory growth (100k lines) | < 50MB | ✅ |
| Concurrent streams (10x) | No errors | ✅ |

## Known Limitations

1. **Max Line Length:** Default 10MB per line (configurable)
2. **Backpressure:** highWaterMark=16 (configurable)
3. **Schema Lock:** First object determines schema
4. **Type Coercion:** No automatic type conversion

## Contributing

When adding new features, ensure:
- [ ] Add edge case tests
- [ ] Test with real-world data
- [ ] Test error conditions
- [ ] Test performance at scale
- [ ] Document limitations
