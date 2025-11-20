import { describe, it, expect } from 'vitest';
import {
  TonlError,
  TonlParseError,
  TonlValidationError,
  TonlSchemaError,
  TonlTypeError,
  createDetailedError,
} from '../src/utils/errors';

describe('Error Classes', () => {
  describe('TonlError', () => {
    it('should create base error', () => {
      const error = new TonlError('Test error', 'TEST_CODE');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('TonlError');
    });

    it('should include details', () => {
      const error = new TonlError('Test', 'CODE', { foo: 'bar' });
      expect(error.details).toEqual({ foo: 'bar' });
    });
  });

  describe('TonlParseError', () => {
    it('should create parse error', () => {
      const error = new TonlParseError('Parse failed');
      
      expect(error.message).toBe('Parse failed');
      expect(error.code).toBe('PARSE_ERROR');
      expect(error.name).toBe('TonlParseError');
    });
  });

  describe('TonlValidationError', () => {
    it('should create validation error', () => {
      const error = new TonlValidationError('Invalid input');
      
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('TonlValidationError');
    });
  });

  describe('TonlSchemaError', () => {
    it('should create schema error', () => {
      const error = new TonlSchemaError('Schema mismatch');
      
      expect(error.code).toBe('SCHEMA_ERROR');
      expect(error.name).toBe('TonlSchemaError');
    });
  });

  describe('TonlTypeError', () => {
    it('should create type error', () => {
      const error = new TonlTypeError('Type mismatch');
      
      expect(error.code).toBe('TYPE_ERROR');
      expect(error.name).toBe('TonlTypeError');
    });
  });

  describe('createDetailedError', () => {
    it('should create detailed error message', () => {
      const message = createDetailedError('Test error', {
        line: 10,
        column: 5,
        expected: 'string',
        received: 'number',
      });

      expect(message).toContain('Test error');
      expect(message).toContain('line 10');
      expect(message).toContain('column 5');
      expect(message).toContain('Expected: string');
      expect(message).toContain('Received: number');
    });

    it('should include input preview', () => {
      const message = createDetailedError('Error', {
        input: 'some long input text',
      });

      expect(message).toContain('Input:');
    });
  });
});