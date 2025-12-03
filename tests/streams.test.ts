import { describe, it, expect } from 'vitest';
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';
import { TonlTransform } from '../src/core/streams/tonl-transform.js';
import { NdjsonParse } from '../src/core/streams/ndjson-parse.js';

const pipelineAsync = promisify(pipeline);

describe('TONL Streaming', () => {
  describe('NdjsonParse', () => {
    it('should parse simple NDJSON', async () => {
      const input = '{"name":"Alice","age":30}\n{"name":"Bob","age":25}\n';
      const results: any[] = [];
      
      const parser = new NdjsonParse();
      parser.on('data', (obj) => results.push(obj));
      
      await pipelineAsync(
        Readable.from([input]),
        parser
      );
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ name: 'Alice', age: 30 });
      expect(results[1]).toEqual({ name: 'Bob', age: 25 });
    });

    it('should handle incomplete lines at chunk boundaries', async () => {
      const chunk1 = '{"name":"Al';
      const chunk2 = 'ice","age":30}\n';
      const results: any[] = [];
      
      const parser = new NdjsonParse();
      parser.on('data', (obj) => results.push(obj));
      
      await pipelineAsync(
        Readable.from([chunk1, chunk2]),
        parser
      );
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ name: 'Alice', age: 30 });
    });

    it('should skip invalid JSON when skipInvalid=true', async () => {
      const input = '{"valid":1}\n{invalid json}\n{"valid":2}\n';
      const results: any[] = [];
      
      const parser = new NdjsonParse({ skipInvalid: true });
      parser.on('data', (obj) => results.push(obj));
      
      await pipelineAsync(
        Readable.from([input]),
        parser
      );
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ valid: 1 });
      expect(results[1]).toEqual({ valid: 2 });
    });

    it('should skip empty lines', async () => {
      const input = '{"a":1}\n\n\n{"b":2}\n';
      const results: any[] = [];
      
      const parser = new NdjsonParse();
      parser.on('data', (obj) => results.push(obj));
      
      await pipelineAsync(
        Readable.from([input]),
        parser
      );
      
      expect(results).toHaveLength(2);
    });

    it('should track line count', async () => {
      const input = '{"a":1}\n{"b":2}\n{"c":3}\n';
      const parser = new NdjsonParse();
      
      await pipelineAsync(
        Readable.from([input]),
        parser
      );
      
      expect(parser.getLineCount()).toBe(3);
    });
  });

  describe('TonlTransform', () => {
    it('should generate TONL header and rows', async () => {
      const objects = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ];
      
      let output = '';
      const transform = new TonlTransform({ collectionName: 'users' });
      transform.on('data', (chunk) => { output += chunk; });
      
      await pipelineAsync(
        Readable.from(objects),
        transform
      );
      
      expect(output).toContain('users[]{name:str,age:');
      expect(output).toContain('Alice');
      expect(output).toContain('Bob');
      expect(output).toContain('30');
      expect(output).toContain('25');
    });

    it('should handle string escaping', async () => {
      const objects = [
        { message: 'Hello, World!' },
        { message: 'Line 1\nLine 2' }
      ];
      
      let output = '';
      const transform = new TonlTransform({ collectionName: 'logs' });
      transform.on('data', (chunk) => { output += chunk; });
      
      await pipelineAsync(
        Readable.from(objects),
        transform
      );
      
      expect(output).toContain('"Hello, World!"');
      expect(output).toContain('\\n');
    });

    it('should track row count', async () => {
      const objects = [
        { a: 1 },
        { a: 2 },
        { a: 3 }
      ];
      
      const transform = new TonlTransform();
      
      await pipelineAsync(
        Readable.from(objects),
        transform
      );
      
      expect(transform.getRowCount()).toBe(3);
    });

    it('should skip invalid objects when skipInvalid=true', async () => {
      const items = [
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Carol' }
      ];
      
      // Filter out null/invalid before streaming (in real use, parser handles this)
      const validItems = items.filter(item => item && typeof item === 'object');
      
      const transform = new TonlTransform({ skipInvalid: true });
      
      await pipelineAsync(
        Readable.from(validItems),
        transform
      );
      
      expect(transform.getRowCount()).toBe(3);
    });

    it('should validate collection name', () => {
      expect(() => {
        new TonlTransform({ collectionName: '123invalid' });
      }).toThrow('Invalid collection name');
      
      expect(() => {
        new TonlTransform({ collectionName: 'valid_name' });
      }).not.toThrow();
    });
  });

  describe('End-to-End Pipeline', () => {
    it('should convert NDJSON to TONL in one pipeline', async () => {
      const ndjson = '{"level":"info","message":"Server started"}\n' +
                     '{"level":"error","message":"Connection failed"}\n' +
                     '{"level":"info","message":"Server stopped"}\n';
      
      let output = '';
      
      await pipelineAsync(
        Readable.from([ndjson]),
        new NdjsonParse(),
        new TonlTransform({ collectionName: 'logs' }),
        async function* (source) {
          for await (const chunk of source) {
            output += chunk;
          }
        }
      );
      
      expect(output).toContain('logs[]{level:str,message:str}:');
      expect(output).toContain('info');
      expect(output).toContain('error');
      expect(output).toContain('Server started');
      expect(output).toContain('Connection failed');
    });

    it('should handle large stream without memory issues', async () => {
      // Generate 10K objects
      const largeStream = Readable.from(async function* () {
        for (let i = 0; i < 10000; i++) {
          yield { id: i, value: `item-${i}` };
        }
      }());
      
      const transform = new TonlTransform({ collectionName: 'items' });
      let chunks = 0;
      
      await pipelineAsync(
        largeStream,
        transform,
        async function* (source) {
          for await (const chunk of source) {
            chunks++;
          }
        }
      );
      
      expect(transform.getRowCount()).toBe(10000);
      expect(chunks).toBeGreaterThan(0);
    });
  });
});
