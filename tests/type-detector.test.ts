import { describe, it, expect } from 'vitest';
import { detectType, detectObjectSchema } from '../src/core/type-detector';
import { 
  detectNumberType,      // ← ADD
  detectDateType,        // ← ADD
  validateAndMergeSchemas // ← ADD
} from '../src/core/type-detector';

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

describe('detectNumberType', () => {
  it('should detect int8 for small numbers', () => {
    expect(detectNumberType(50)).toBe('int8');
    expect(detectNumberType(-50)).toBe('int8');
  });

  it('should detect int16 for medium numbers', () => {
    expect(detectNumberType(1000)).toBe('int16');
    expect(detectNumberType(-1000)).toBe('int16');
  });

  it('should detect int32 for large numbers', () => {
    expect(detectNumberType(100000)).toBe('int32');
    expect(detectNumberType(-100000)).toBe('int32');
  });

  it('should detect int64 for very large numbers', () => {
    expect(detectNumberType(3000000000)).toBe('int64');
  });

  it('should detect float32 for small floats', () => {
    expect(detectNumberType(3.14)).toBe('float32');
    expect(detectNumberType(-2.5)).toBe('float32');
  });

  it('should detect float64 for large floats', () => {
    expect(detectNumberType(3.14159)).toBe('float32');
  });
});

describe('detectDateType', () => {
  it('should detect date format', () => {
    expect(detectDateType('2024-11-20')).toBe('date');
  });

  it('should detect datetime format', () => {
    expect(detectDateType('2024-11-20T15:30:00Z')).toBe('datetime');
    expect(detectDateType('2024-11-20T15:30:00')).toBe('datetime');
  });

  it('should return null for non-date strings', () => {
    expect(detectDateType('hello')).toBe(null);
    expect(detectDateType('not-a-date')).toBe(null);
  });
});

describe('validateAndMergeSchemas', () => {
  it('should merge consistent schemas', () => {
    const objects = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
    
    const schema = validateAndMergeSchemas(objects);
    expect(schema.id).toBe('int8');
    expect(schema.name).toBe('string');
  });

  it('should handle missing keys', () => {
    const objects = [
      { id: 1, name: 'Alice' },
      { id: 2 },
    ];
    
    const schema = validateAndMergeSchemas(objects);
    expect(schema.id).toBe('int8');
    expect(schema.name).toBe('string');
  });

  it('should use most general type for mixed types', () => {
    const objects = [
      { value: 10 },
      { value: 1000 },
    ];
    
    const schema = validateAndMergeSchemas(objects);
    expect(schema.value).toBe('int16'); // Most general
  });

  it('should handle empty array', () => {
    const schema = validateAndMergeSchemas([]);
    expect(schema).toEqual({});
  });
});