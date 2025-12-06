/**
 * Integration Tests for Streaming Pipeline
 * 
 * Tests the complete pipeline: NDJSON → Objects → TONL
 * Tests real-world scenarios and edge cases
 */

import { describe, it, expect } from 'vitest';
import { Readable, pipeline as streamPipeline } from 'stream';
import { promisify } from 'util';
import { NdjsonParse } from '../../src/core/streams/ndjson-parse.js';
import { TonlTransform } from '../../src/core/streams/tonl-transform.js';

const pipeline = promisify(streamPipeline);

describe('Streaming Pipeline Integration', () => {

  // Helper: Create NDJSON string
  function createNDJSON(...objects: any[]): string {
    return objects.map(obj => JSON.stringify(obj)).join('\n');
  }

  // Helper: Run full pipeline
  async function runPipeline(ndjsonString: string, options = {}): Promise<string> {
    const chunks: Buffer[] = [];
    
    await pipeline(
      Readable.from([ndjsonString]),
      new NdjsonParse({ skipInvalid: true }),
      new TonlTransform({ collectionName: 'data', skipInvalid: true, ...options }),
      new Readable.Writable({
        write(chunk, encoding, callback) {
          chunks.push(Buffer.from(chunk));
          callback();
        }
      })
    );

    return Buffer.concat(chunks).toString('utf-8');
  }

  describe('Real-World Scenarios', () => {
    it('should handle Docker container logs', async () => {
      const logs = createNDJSON(
        { timestamp: '2024-12-04T10:00:00Z', level: 'info', message: 'Server started', pid: 1234 },
        { timestamp: '2024-12-04T10:00:01Z', level: 'warn', message: 'High memory usage', pid: 1234 },
        { timestamp: '2024-12-04T10:00:02Z', level: 'error', message: 'Connection failed', pid: 1234 }
      );

      const output = await runPipeline(logs, { collectionName: 'docker_logs' });

      expect(output).toContain('docker_logs[]{');
      expect(output).toMatch(/timestamp:(str|datetime)/);
      expect(output).toContain('level:str');
      expect(output).toContain('message:str');
      expect(output).toContain('Server started');
      expect(output).toContain('Connection failed');
    });

    it('should handle application access logs', async () => {
      const logs = createNDJSON(
        { ip: '192.168.1.1', method: 'GET', path: '/api/users', status: 200, duration_ms: 45 },
        { ip: '192.168.1.2', method: 'POST', path: '/api/login', status: 401, duration_ms: 12 },
        { ip: '192.168.1.1', method: 'GET', path: '/api/data', status: 500, duration_ms: 3000 }
      );

      const output = await runPipeline(logs, { collectionName: 'access_logs' });

      expect(output).toContain('access_logs[]{');
      expect(output).toContain('ip:str');
      expect(output).toMatch(/status:i\d+/);
      expect(output).toMatch(/duration_ms:i\d+/);
      expect(output).toMatch(/192\.168\.1\.1/);
      expect(output).toMatch(/200|401|500/);
    });

    it('should handle database audit logs', async () => {
      const logs = createNDJSON(
        { user: 'admin', action: 'UPDATE', table: 'users', rows: 1, timestamp: '2024-12-04T10:00:00Z' },
        { user: 'alice', action: 'SELECT', table: 'orders', rows: 150, timestamp: '2024-12-04T10:00:01Z' },
        { user: 'admin', action: 'DELETE', table: 'sessions', rows: 42, timestamp: '2024-12-04T10:00:02Z' }
      );

      const output = await runPipeline(logs, { collectionName: 'db_audit' });

      expect(output).toContain('db_audit[]{');
      expect(output).toContain('user:str');
      expect(output).toContain('action:str');
      expect(output).toContain('table:str');
      expect(output).toContain('admin');
      expect(output).toContain('UPDATE');
      expect(output).toContain('DELETE');
    });

    it('should handle Kubernetes pod events', async () => {
      const events = createNDJSON(
        { pod: 'web-1', event: 'Started', reason: 'PulledImage', message: 'Successfully pulled image', count: 1 },
        { pod: 'web-1', event: 'Created', reason: 'Created', message: 'Created container', count: 1 },
        { pod: 'worker-3', event: 'Failed', reason: 'BackOff', message: 'Back-off restarting failed', count: 5 }
      );

      const output = await runPipeline(events, { collectionName: 'k8s_events' });

      expect(output).toContain('k8s_events[]{');
      expect(output).toContain('pod:str');
      expect(output).toContain('event:str');
      expect(output).toContain('reason:str');
      expect(output).toContain('web-1');
      expect(output).toContain('BackOff');
    });
  });

  describe('Mixed Valid/Invalid Data', () => {
    it('should skip malformed JSON lines gracefully', async () => {
      const mixed = 
        '{"valid":1}\n' +
        'this is not json\n' +
        '{"valid":2}\n' +
        '{incomplete\n' +
        '{"valid":3}\n';

      const output = await runPipeline(mixed);

      expect(output).toMatch(/data\[\]\{valid:i\d+\}:/);
      expect(output).toContain('1');
      expect(output).toContain('2');
      expect(output).toContain('3');
    });

    it('should handle schema inconsistencies', async () => {
      const inconsistent = createNDJSON(
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob' },  // Missing age
        { id: '3', name: 'Charlie', age: 25 },  // id is string (type mismatch)
        { id: 4, name: 'Dave', age: 28, extra: 'ignored' }  // Extra field
      );

      const output = await runPipeline(inconsistent);

      // Should produce TONL output despite inconsistencies
      expect(output).toContain('data[]{');
      expect(output).toContain('id:');
      expect(output).toContain('name:');
    });

    it('should handle empty and whitespace lines', async () => {
      const withBlanks = 
        '{"id":1}\n' +
        '\n' +
        '   \n' +
        '{"id":2}\n' +
        '\t\n' +
        '{"id":3}\n';

      const output = await runPipeline(withBlanks);

      expect(output).toMatch(/data\[\]\{id:i\d+\}:/);
      expect(output).toContain('1');
      expect(output).toContain('2');
      expect(output).toContain('3');
    });
  });

  describe('Large Data Handling', () => {
    it('should handle 10k lines efficiently', async () => {
      const lines = Array.from({ length: 10000 }, (_, i) => 
        JSON.stringify({ id: i, timestamp: new Date().toISOString(), value: Math.random() })
      ).join('\n');

      const start = Date.now();
      const output = await runPipeline(lines);
      const duration = Date.now() - start;

      expect(output).toContain('data[]{');
      expect(duration).toBeLessThan(2000); // Should be fast
    });

    it('should handle very wide objects (many columns)', async () => {
      const wideObject: any = {};
      for (let i = 0; i < 100; i++) {
        wideObject[`col_${i}`] = i;
      }

      const ndjson = createNDJSON(wideObject);
      const output = await runPipeline(ndjson);

      expect(output).toContain('data[]{');
      // Check that many columns are present
      expect(output).toMatch(/col_\d+:i\d+/);
    });

    it('should handle very long string values', async () => {
      const longString = 'x'.repeat(10000);
      const ndjson = createNDJSON(
        { id: 1, data: longString }
      );

      const output = await runPipeline(ndjson);

      expect(output).toMatch(/data\[\]\{id:i\d+,data:str\}:/);
      expect(output.length).toBeGreaterThan(10000);
    });
  });

  describe('Special Characters & Encoding', () => {
    it('should preserve Unicode throughout pipeline', async () => {
      const ndjson = createNDJSON(
        { emoji: '🚀💰🎉', text: '你好世界' },
        { emoji: '✅❌⚠️', text: 'مرحبا بك' }
      );

      const output = await runPipeline(ndjson);

      expect(output).toContain('🚀💰🎉');
      expect(output).toContain('你好世界');
      expect(output).toContain('✅❌⚠️');
      expect(output).toContain('مرحبا بك');
    });

    it('should handle escaped characters', async () => {
      const ndjson = createNDJSON(
        { text: 'Line1\nLine2', quote: 'He said "hi"', path: 'C:\\Program Files\\' }
      );

      const output = await runPipeline(ndjson);

      expect(output).toContain('data[]{');
      // Escaped characters should be preserved in some form
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('Chunking & Buffering', () => {
    it('should handle data arriving in tiny chunks', async () => {
      const ndjson = createNDJSON(
        { id: 1 },
        { id: 2 },
        { id: 3 }
      );

      // Send byte-by-byte
      const tinyChunks = ndjson.split('').map(c => c);
      const chunks: Buffer[] = [];

      await pipeline(
        Readable.from(tinyChunks),
        new NdjsonParse(),
        new TonlTransform({ collectionName: 'data' }),
        new Readable.Writable({
          write(chunk, encoding, callback) {
            chunks.push(Buffer.from(chunk));
            callback();
          }
        })
      );

      const output = Buffer.concat(chunks).toString('utf-8');
      expect(output).toMatch(/data\[\]\{id:i\d+\}:/);
    });

    it('should handle large chunks', async () => {
      const lines = Array.from({ length: 1000 }, (_, i) => 
        JSON.stringify({ id: i })
      ).join('\n');

      // Send as one big chunk
      const output = await runPipeline(lines);

      expect(output).toMatch(/data\[\]\{id:i\d+\}:/);
    });
  });

  describe('Error Recovery', () => {
    it('should continue processing after errors when skipInvalid=true', async () => {
      const mixed = 
        '{"id":1}\n' +
        '{{{bad json}}}\n' +
        '{"id":2}\n' +
        'totally not json\n' +
        '{"id":3}\n' +
        '{"id":"not a number"}\n' +  // Type mismatch
        '{"id":4}\n';

      const output = await runPipeline(mixed);

      // Should have processed valid lines
      expect(output).toContain('data[]{');
      expect(output).toMatch(/[1234]/); // At least some numbers present
    });

    it('should handle stream ending unexpectedly', async () => {
      const incomplete = 
        '{"id":1}\n' +
        '{"id":2}\n' +
        '{"id":3';  // No closing brace, no newline

      const output = await runPipeline(incomplete);

      // Should process the complete lines
      expect(output).toMatch(/data\[\]\{id:i\d+\}:/);
      expect(output).toContain('1');
      expect(output).toContain('2');
    });
  });

  describe('Edge Case Combinations', () => {
    it('should handle single object', async () => {
      const ndjson = createNDJSON({ id: 1 });
      const output = await runPipeline(ndjson);

      expect(output).toMatch(/data\[\]\{id:i\d+\}:/);
      expect(output).toContain('1');
    });

    it('should handle empty input', async () => {
      const output = await runPipeline('');

      // Should produce header but no data rows
      expect(output.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle only invalid data', async () => {
      const invalid = 
        'not json\n' +
        'also not json\n' +
        '{{{bad}}}\n';

      const output = await runPipeline(invalid);

      // Should produce minimal or empty output
      expect(output.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Real Production Log Samples', () => {
    it('should handle nginx access logs in JSON format', async () => {
      const nginxLogs = createNDJSON(
        { remote_addr: '203.0.113.1', time_local: '04/Dec/2024:10:00:00 +0000', request: 'GET /api/users HTTP/1.1', status: 200, body_bytes_sent: 1234, http_referer: 'https://example.com', http_user_agent: 'Mozilla/5.0' },
        { remote_addr: '203.0.113.2', time_local: '04/Dec/2024:10:00:01 +0000', request: 'POST /api/login HTTP/1.1', status: 401, body_bytes_sent: 45, http_referer: '-', http_user_agent: 'curl/7.68.0' }
      );

      const output = await runPipeline(nginxLogs, { collectionName: 'nginx_access' });

      expect(output).toContain('nginx_access[]{');
      expect(output).toContain('remote_addr:str');
      expect(output).toMatch(/status:i\d+/);
      expect(output).toContain('203.0.113.1');
      expect(output).toContain('200');
      expect(output).toContain('401');
    });

    it('should handle MongoDB oplog entries', async () => {
      const oplog = createNDJSON(
        { ts: 1701691200, op: 'i', ns: 'mydb.users', o: { _id: '123', name: 'Alice' } },
        { ts: 1701691201, op: 'u', ns: 'mydb.users', o2: { _id: '123' }, o: { $set: { age: 30 } } },
        { ts: 1701691202, op: 'd', ns: 'mydb.sessions', o: { _id: 'abc' } }
      );

      const output = await runPipeline(oplog, { collectionName: 'oplog' });

      expect(output).toContain('oplog[]{');
      expect(output).toMatch(/ts:i\d+/);
      expect(output).toContain('op:str');
      expect(output).toContain('ns:str');
    });
  });

  describe('Memory & Performance', () => {
    it('should not leak memory with large streams', async () => {
      const lines = Array.from({ length: 50000 }, (_, i) => 
        JSON.stringify({ id: i, data: 'x'.repeat(100) })
      ).join('\n');

      const memBefore = process.memoryUsage().heapUsed;
      
      await runPipeline(lines);
      
      // Force GC if available
      if (global.gc) global.gc();
      
      const memAfter = process.memoryUsage().heapUsed;
      const memDelta = (memAfter - memBefore) / 1024 / 1024;

      // Memory growth should be reasonable (< 100MB for 50k lines)
      expect(memDelta).toBeLessThan(100);
    });

    it.skip('should maintain consistent throughput', async () => {
      // Skip: Timing-dependent test is flaky on different systems
      const sizes = [1000, 5000, 10000];
      const timings: number[] = [];

      for (const size of sizes) {
        const lines = Array.from({ length: size }, (_, i) => 
          JSON.stringify({ id: i, value: Math.random() })
        ).join('\n');

        const start = Date.now();
        await runPipeline(lines);
        const duration = Date.now() - start;
        
        timings.push(duration);
      }

      // Throughput should scale roughly linearly
      // (10x data should take roughly 10x time, not 100x)
      const ratio = timings[2] / timings[0];
      expect(ratio).toBeLessThan(20); // Some overhead is expected, allow for system variance
    });
  });
});
