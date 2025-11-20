import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isLargeFile, getFileSizeMB } from '../src/utils/file-helpers';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('File Helpers', () => {
  const smallFile = join(__dirname, 'test-small.json');
  const largeFile = join(__dirname, 'test-large.json');

  beforeEach(() => {
    // Small file (1KB)
    writeFileSync(smallFile, JSON.stringify({ test: 'data' }));

    // Large file (>10MB)
    const largeData = 'x'.repeat(11 * 1024 * 1024); // 11MB
    writeFileSync(largeFile, largeData);
  });

  afterEach(() => {
    try {
      unlinkSync(smallFile);
      unlinkSync(largeFile);
    } catch {}
  });

  describe('isLargeFile', () => {
    it('should return false for small files', () => {
      expect(isLargeFile(smallFile)).toBe(false);
    });

    it('should return true for large files (>10MB)', () => {
      expect(isLargeFile(largeFile)).toBe(true);
    });

    it('should return false for non-existent files', () => {
      expect(isLargeFile('non-existent.json')).toBe(false);
    });
  });

  describe('getFileSizeMB', () => {
    it('should return file size in MB', () => {
      const size = getFileSizeMB(smallFile);
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(1);
    });

    it('should return correct size for large files', () => {
      const size = getFileSizeMB(largeFile);
      expect(size).toBeGreaterThan(10);
    });

    it('should return 0 for non-existent files', () => {
      expect(getFileSizeMB('non-existent.json')).toBe(0);
    });
  });
});