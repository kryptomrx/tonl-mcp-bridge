import { Transform, TransformCallback } from 'stream';

export interface NdjsonParseOptions {
  skipInvalid?: boolean;
  maxLineLength?: number;
  highWaterMark?: number;
}

/**
 * Transform Stream: NDJSON Text → JSON Objects
 * 
 * Parses newline-delimited JSON without external dependencies.
 * Handles incomplete lines at chunk boundaries correctly.
 * 
 * Usage:
 * ```typescript
 * import { pipeline } from 'stream/promises';
 * 
 * await pipeline(
 *   fs.createReadStream('data.ndjson'),
 *   new NdjsonParse(),
 *   // ... further processing
 * );
 * ```
 */
export class NdjsonParse extends Transform {
  private buffer = '';
  private skipInvalid: boolean;
  private maxLineLength: number;
  private lineCount = 0;

  constructor(options: NdjsonParseOptions = {}) {
    super({
      readableObjectMode: true,
      highWaterMark: options.highWaterMark || 16
    });
    
    this.skipInvalid = options.skipInvalid ?? true;
    this.maxLineLength = options.maxLineLength || 10 * 1024 * 1024; // 10MB default
  }

  _transform(chunk: any, encoding: string, callback: TransformCallback): void {
    try {
      // Add chunk to buffer
      this.buffer += chunk.toString();
      
      // Split by newlines
      const lines = this.buffer.split('\n');
      
      // Keep last (potentially incomplete) line in buffer
      this.buffer = lines.pop() || '';
      
      // Check buffer size (DOS protection)
      if (this.buffer.length > this.maxLineLength) {
        callback(new Error(`Line exceeds max length (${this.maxLineLength} bytes)`));
        return;
      }

      // Process complete lines
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines
        if (!trimmed) continue;
        
        // Parse JSON
        try {
          const obj = JSON.parse(trimmed);
          this.lineCount++;
          this.push(obj);
        } catch (error) {
          if (this.skipInvalid) {
            // Silent skip of invalid lines
            continue;
          }
          callback(new Error(`Invalid JSON at line ${this.lineCount + 1}: ${(error as Error).message}`));
          return;
        }
      }
      
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }

  _flush(callback: TransformCallback): void {
    // Process remaining buffer
    if (this.buffer.trim()) {
      try {
        const obj = JSON.parse(this.buffer);
        this.lineCount++;
        this.push(obj);
      } catch (error) {
        if (!this.skipInvalid) {
          callback(new Error(`Invalid JSON at end of stream: ${(error as Error).message}`));
          return;
        }
      }
    }
    callback();
  }

  /**
   * Get the total number of lines parsed
   */
  getLineCount(): number {
    return this.lineCount;
  }
}
