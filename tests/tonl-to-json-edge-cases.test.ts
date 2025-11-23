import { describe, it, expect } from 'vitest';
import { tonlTypeToValue, tonlToJson } from '../src/core/tonl-to-json';

describe('TONL to JSON - Edge Cases', () => {
  describe('tonlTypeToValue - numeric types', () => {
    it('should handle i8 (small integers)', () => {
      expect(tonlTypeToValue('5', 'i8')).toBe(5);
      expect(tonlTypeToValue('-10', 'i8')).toBe(-10);
      expect(tonlTypeToValue('127', 'i8')).toBe(127);
    });

    it('should handle i16 (medium integers)', () => {
      expect(tonlTypeToValue('1000', 'i16')).toBe(1000);
      expect(tonlTypeToValue('-5000', 'i16')).toBe(-5000);
    });

    it('should handle i64 (large integers)', () => {
      expect(tonlTypeToValue('999999', 'i64')).toBe(999999);
    });

    it('should handle f32 (floats)', () => {
      expect(tonlTypeToValue('19.99', 'f32')).toBe(19.99);
      expect(tonlTypeToValue('-3.14', 'f32')).toBe(-3.14);
    });

    it('should handle f64 (doubles)', () => {
      expect(tonlTypeToValue('3.14159265359', 'f64')).toBe(3.14159265359);
    });
  });

  describe('tonlTypeToValue - special types', () => {
    it('should handle date strings', () => {
      expect(tonlTypeToValue('2024-01-15', 'date')).toBe('2024-01-15');
    });

    it('should handle datetime strings', () => {
      expect(tonlTypeToValue('2024-01-15T10:30:00Z', 'datetime')).toBe('2024-01-15T10:30:00Z');
    });

    it('should handle empty strings', () => {
      expect(tonlTypeToValue('', 'str')).toBe('');
      expect(tonlTypeToValue('""', 'str')).toBe('');
    });
  });

  describe('tonlToJson - complete conversions', () => {
    it('should handle all integer types together', () => {
      const tonl = `data[1]{a:i8,b:i16,c:i32,d:i64}:
  5, 1000, 50000, 999999`;
      const result = tonlToJson(tonl);
      expect(result).toEqual([{ a: 5, b: 1000, c: 50000, d: 999999 }]);
    });

    it('should handle float types', () => {
      const tonl = `data[1]{price:f32,score:f64}:
  19.99, 3.14159265359`;
      const result = tonlToJson(tonl);
      expect(result[0].price).toBeCloseTo(19.99);
      expect(result[0].score).toBeCloseTo(3.14159265359);
    });

    it('should handle negative numbers', () => {
      const tonl = `data[1]{temp:i16,balance:f32}:
  -15, -299.99`;
      const result = tonlToJson(tonl);
      expect(result).toEqual([{ temp: -15, balance: -299.99 }]);
    });

    it('should handle mixed types', () => {
      const tonl = `data[1]{id:i32,name:str,score:f32,active:bool,created:date}:
  1, Alice, 95.5, true, 2024-01-15`;
      const result = tonlToJson(tonl);
      expect(result).toEqual([
        { id: 1, name: 'Alice', score: 95.5, active: true, created: '2024-01-15' },
      ]);
    });
  });
});
