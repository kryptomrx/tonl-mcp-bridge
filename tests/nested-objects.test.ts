import { describe, it, expect } from 'vitest';
import { jsonToTonl } from '../src/core/json-to-tonl';
import { tonlToJson } from '../src/core/tonl-to-json';

describe('Nested Objects Support', () => {
  it('should handle nested objects', () => {
    const data = [
      {
        id: 1,
        user: {
          name: 'Alice',
          email: 'alice@example.com',
        },
      },
    ];

    const tonl = jsonToTonl(data, 'users');

    expect(tonl).toContain('users[1]');
    expect(tonl).toContain('user:obj');
    expect(tonl).toContain('{name:Alice,email:alice@example.com}');
  });

  it('should handle nested arrays', () => {
    const data = [
      {
        id: 1,
        tags: ['typescript', 'nodejs'],
      },
    ];

    const tonl = jsonToTonl(data);

    expect(tonl).toContain('tags:arr');
    expect(tonl).toContain('[typescript,nodejs]');
  });

  it('should handle complex nested structures', () => {
    const data = [
      {
        id: 1,
        user: {
          name: 'Alice',
          age: 25,
        },
        tags: ['dev', 'typescript'],
        metadata: {
          created: '2024-01-01',
          updated: '2024-01-02',
        },
      },
    ];

    const tonl = jsonToTonl(data, 'complex');

    expect(tonl).toContain('complex[1]');
    expect(tonl).toContain('user:obj');
    expect(tonl).toContain('tags:arr');
    expect(tonl).toContain('metadata:obj');
  });

  it('should flatten nested objects when option is set', () => {
    const data = [
      {
        id: 1,
        user: {
          name: 'Alice',
          email: 'alice@example.com',
        },
      },
    ];

    const tonl = jsonToTonl(data, 'users', { flattenNested: true });

    expect(tonl).toContain('user_name:str');
    expect(tonl).toContain('user_email:str');
    expect(tonl).not.toContain('user:obj');
  });

  it('should handle deeply nested objects', () => {
    const data = [
      {
        level1: {
          level2: {
            level3: 'deep',
          },
        },
      },
    ];

    const tonl = jsonToTonl(data, 'deep', { flattenNested: true });

    expect(tonl).toContain('level1_level2_level3');
    expect(tonl).toContain('deep');
  });
});
