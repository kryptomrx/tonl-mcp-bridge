import { describe, it, expect } from 'vitest';
import { detectType, detectObjectSchema } from '../src/core/type-detector';

describe('Type Detector', () => {
  it('should detect string type', () => {
    const result = detectType('hello');
    expect(result).toBe('string');
  });

  it('should detect number type', () => {
    // 1234 fits in int16 range
    const result = detectType(1234);
    expect(result).toBe('int16');
  });

  it('should detect boolean type', () => {
    const result = detectType(true);
    expect(result).toBe('boolean');
  });

  it('should detect null type', () => {
    const result = detectType(null);
    expect(result).toBe('null');
  });

  it('should detect array type', () => {
    const result = detectType([1, 2, 3]);
    expect(result).toBe('array');
  });

  it('should detect object type', () => {
    const result = detectType({ id: 1 });
    expect(result).toBe('object');
  });
});

describe('Object Schema Detector', () => {
  it('should detect schema of simple object', () => {
    const obj = { id: 1, name: 'Alice' };
    const result = detectObjectSchema(obj);

    expect(result).toEqual({
      id: 'int8', // 1 fits in int8
      name: 'string',
    });
  });
});
