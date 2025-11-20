import { statSync } from 'fs';

/**
 * Check if file is large (>10MB)
 */
export function isLargeFile(filepath: string): boolean {
  try {
    const stats = statSync(filepath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    return fileSizeInMB > 10;
  } catch {
    return false;
  }
}

/**
 * Get file size in MB
 */
export function getFileSizeMB(filepath: string): number {
  try {
    const stats = statSync(filepath);
    return stats.size / (1024 * 1024);
  } catch {
    return 0;
  }
}