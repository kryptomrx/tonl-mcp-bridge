import { describe, it, expect } from 'vitest';
import { 
  typeNameToTonl, 
  buildTonlHeader, 
  formatValue, 
  jsonToTonl 
} from '../src/core/json-to-tonl';

describe('JSON to TONL Converter', () => {
  
  describe('typeNameToTonl', () => {
    it('should convert type names correctly', () => {
      expect(typeNameToTonl('string')).toBe('str');
      expect(typeNameToTonl('int8')).toBe('i8');
      expect(typeNameToTonl('int16')).toBe('i16');
      expect(typeNameToTonl('int32')).toBe('i32');
      expect(typeNameToTonl('int64')).toBe('i64');
      expect(typeNameToTonl('float32')).toBe('f32');
      expect(typeNameToTonl('float64')).toBe('f64');
      expect(typeNameToTonl('boolean')).toBe('bool');
      expect(typeNameToTonl('null')).toBe('null');
      expect(typeNameToTonl('array')).toBe('arr');
      expect(typeNameToTonl('object')).toBe('obj');
    });
  });

  describe('buildTonlHeader', () => {
    it('should build correct header', () => {
      const schema = { id: 'int32' as const, name: 'string' as const };
      const result = buildTonlHeader('users', 2, schema);
      
      expect(result).toBe('users[2]{id:i32,name:str}');
    });
  });

  describe('formatValue', () => {
    it('should format string without quotes', () => {
      expect(formatValue('Alice')).toBe('Alice');
    });
    
    it('should format string with spaces in quotes', () => {
      expect(formatValue('Alice Smith')).toBe('"Alice Smith"');
    });
    
    it('should format number', () => {
      expect(formatValue(123)).toBe('123');
    });
    
    it('should format boolean', () => {
      expect(formatValue(true)).toBe('true');
      expect(formatValue(false)).toBe('false');
    });
    
    it('should format null', () => {
      expect(formatValue(null)).toBe('null');
    });
  });

  describe('jsonToTonl', () => {
    it('should convert simple array to TONL', () => {
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ];
      
      const result = jsonToTonl(data, 'users');
      
      // id=1,2 fits in int8
      const expected = `users[2]{id:i8,name:str}:
  1, Alice
  2, Bob
`;
      
      expect(result).toBe(expected);
    });
    
    it('should handle empty array', () => {
      const result = jsonToTonl([], 'empty');
      expect(result).toBe('empty[0]{}:\n');
    });
    
    it('should use default name "data"', () => {
      const data = [{ id: 1 }];
      const result = jsonToTonl(data);
      
      expect(result).toContain('data[1]');
    });
  });

});