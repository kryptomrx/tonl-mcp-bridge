import { describe, it, expect } from 'vitest';
import {
  tonlTypeToValue,
  parseTonlHeader,
  splitRespectingQuotes,
  tonlToJson
} from '../src/core/tonl-to-json';

describe('TONL to JSON Parser', () => {
  
  describe('tonlTypeToValue', () => {
    it('should convert i32 to number', () => {
      expect(tonlTypeToValue('25', 'i32')).toBe(25);
      expect(tonlTypeToValue('100', 'i32')).toBe(100);
    });
    
    it('should convert bool to boolean', () => {
      expect(tonlTypeToValue('true', 'bool')).toBe(true);
      expect(tonlTypeToValue('false', 'bool')).toBe(false);
    });
    
    it('should keep string as string', () => {
      expect(tonlTypeToValue('Alice', 'str')).toBe('Alice');
    });
    
    it('should handle quoted strings', () => {
      expect(tonlTypeToValue('"Bob Smith"', 'str')).toBe('Bob Smith');
    });
    
    it('should convert null', () => {
      expect(tonlTypeToValue('null', 'null')).toBe(null);
    });
  });

  describe('parseTonlHeader', () => {
    it('should parse simple header', () => {
      const result = parseTonlHeader('users[2]{id:i32,name:str}');
      
      expect(result.name).toBe('users');
      expect(result.count).toBe(2);
      expect(result.schema).toEqual({
        id: 'i32',
        name: 'str'
      });
    });
    
    it('should parse header with multiple types', () => {
      const result = parseTonlHeader('data[3]{id:i32,name:str,age:i32,active:bool}');
      
      expect(result.count).toBe(3);
      expect(result.schema).toEqual({
        id: 'i32',
        name: 'str',
        age: 'i32',
        active: 'bool'
      });
    });
  });

  describe('splitRespectingQuotes', () => {
    it('should split simple values', () => {
      const result = splitRespectingQuotes('1, Alice, 25');
      expect(result).toEqual(['1', 'Alice', '25']);
    });
    
    it('should respect quoted strings with commas', () => {
      const result = splitRespectingQuotes('1, "Smith, Bob", 25');
      expect(result).toEqual(['1', '"Smith, Bob"', '25']);
    });
    
    it('should handle multiple quoted strings', () => {
      const result = splitRespectingQuotes('"Hello, World", "Foo, Bar"');
      expect(result).toEqual(['"Hello, World"', '"Foo, Bar"']);
    });
  });

  describe('tonlToJson', () => {
    it('should convert simple TONL to JSON', () => {
      const tonl = `users[2]{id:i32,name:str}:
  1, Alice
  2, Bob`;
      
      const result = tonlToJson(tonl);
      
      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]);
    });
    
    it('should handle multiple types', () => {
      const tonl = `data[2]{id:i32,name:str,age:i32,active:bool}:
  1, Alice, 25, true
  2, Bob, 30, false`;
      
      const result = tonlToJson(tonl);
      
      expect(result).toEqual([
        { id: 1, name: 'Alice', age: 25, active: true },
        { id: 2, name: 'Bob', age: 30, active: false }
      ]);
    });
    
    it('should handle quoted strings with commas', () => {
      const tonl = `users[2]{id:i32,name:str}:
  1, "Smith, Alice"
  2, "Brown, Bob"`;
      
      const result = tonlToJson(tonl);
      
      expect(result).toEqual([
        { id: 1, name: 'Smith, Alice' },
        { id: 2, name: 'Brown, Bob' }
      ]);
    });
    
    it('should handle empty TONL', () => {
      const result = tonlToJson('');
      expect(result).toEqual([]);
    });
  });

});