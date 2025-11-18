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
      expect(typeNameToTonl('number')).toBe('i32');
      expect(typeNameToTonl('boolean')).toBe('bool');
      expect(typeNameToTonl('null')).toBe('null');
      expect(typeNameToTonl('array')).toBe('arr');
      expect(typeNameToTonl('object')).toBe('obj');
    });
  });

  describe('buildTonlHeader', () => {
    it('should build correct header', () => {
      const schema = { id: 'number' as const, name: 'string' as const };
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
      
      const expected = `users[2]{id:i32,name:str}:
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