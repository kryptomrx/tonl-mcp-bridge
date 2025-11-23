import { describe, it, expect } from 'vitest';
import { convertToTonlHandler } from '../../src/mcp/tools/convert';
import { parseTonlHandler } from '../../src/mcp/tools/parse';
import { calculateSavingsHandler } from '../../src/mcp/tools/calculate-savings';

describe('MCP Tools', () => {
  describe('convertToTonlHandler', () => {
    it('should convert simple JSON to TONL', async () => {
      const input = {
        data: [{ id: 1, name: 'Alice' }],
        name: 'users',
        options: {
          optimize: true,
          flattenNested: false,
          includeStats: true,
        },
      };

      const result = await convertToTonlHandler(input);

      expect(result.success).toBe(true);
      expect(result.data?.tonl).toContain('users[1]');
      expect(result.data?.tonl).toContain('id:i8');
      expect(result.data?.tonl).toContain('name:str');
      expect(result.stats).toBeDefined();
    });

    it('should handle single object', async () => {
      const input = {
        data: { id: 1, name: 'Alice' },
        name: 'user',
        options: {
          optimize: true,
          flattenNested: false,
          includeStats: false,
        },
      };

      const result = await convertToTonlHandler(input);

      expect(result.success).toBe(true);
      expect(result.data?.tonl).toContain('user[1]');
    });

    it('should handle errors gracefully', async () => {
      const input = {
        data: null as any,
        name: 'test',
        options: {
          optimize: true,
          flattenNested: false,
          includeStats: false,
        },
      };

      const result = await convertToTonlHandler(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('parseTonlHandler', () => {
    it('should parse TONL back to JSON', async () => {
      const tonl = `users[2]{id:i8,name:str}:
  1, Alice
  2, Bob`;

      const input = {
        tonl,
        validateSchema: false,
      };

      const result = await parseTonlHandler(input);

      expect(result.success).toBe(true);
      expect(result.data?.json).toHaveLength(2);
      expect(result.data?.json[0]).toEqual({ id: 1, name: 'Alice' });
    });

    it('should handle parse errors', async () => {
      const input = {
        tonl: 'invalid tonl format',
        validateSchema: false,
      };

      const result = await parseTonlHandler(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('calculateSavingsHandler', () => {
    it('should calculate token savings correctly', async () => {
      // Use enough data to show actual savings
      const data = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `User${i + 1}`,
        age: 20 + i,
        active: i % 2 === 0,
      }));

      const jsonData = JSON.stringify(data);
      const tonlData = `users[10]{id:i8,name:str,age:i8,active:bool}:
  1, User1, 20, true
  2, User2, 21, false
  3, User3, 22, true
  4, User4, 23, false
  5, User5, 24, true
  6, User6, 25, false
  7, User7, 26, true
  8, User8, 27, false
  9, User9, 28, true
  10, User10, 29, false`;

      const input = {
        jsonData,
        tonlData,
        model: 'gpt-5' as const,
      };

      const result = await calculateSavingsHandler(input);

      expect(result.success).toBe(true);
      expect(result.data?.originalTokens).toBeGreaterThan(0);
      expect(result.data?.compressedTokens).toBeGreaterThan(0);
      expect(result.data?.compressedTokens).toBeLessThan(result.data?.originalTokens);
      expect(result.data?.model).toBe('gpt-5');
    });
  });
  describe('convertToTonlHandler - Edge Cases', () => {
    it('should handle nested objects', async () => {
      const input = {
        data: [
          {
            id: 1,
            user: { name: 'Alice', email: 'alice@example.com' },
            tags: ['dev', 'typescript'],
          },
        ],
        name: 'users',
        options: {
          optimize: true,
          flattenNested: false,
          includeStats: false,
        },
      };

      const result = await convertToTonlHandler(input);

      expect(result.success).toBe(true);
      expect(result.data?.tonl).toContain('user:obj');
      expect(result.data?.tonl).toContain('tags:arr');
    });

    it('should handle empty array', async () => {
      const input = {
        data: [],
        name: 'empty',
        options: {
          optimize: true,
          flattenNested: false,
          includeStats: false,
        },
      };

      const result = await convertToTonlHandler(input);

      expect(result.success).toBe(true);
      expect(result.data?.tonl).toBeDefined();
    });

    it('should flatten nested objects when option is true', async () => {
      const input = {
        data: [
          {
            id: 1,
            profile: { name: 'Alice', age: 25 },
          },
        ],
        name: 'users',
        options: {
          optimize: true,
          flattenNested: true,
          includeStats: false,
        },
      };

      const result = await convertToTonlHandler(input);

      expect(result.success).toBe(true);
      // Should NOT contain 'obj' type when flattened
      expect(result.data?.tonl).not.toContain(':obj');
    });
  });
});
