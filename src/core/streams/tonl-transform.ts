import { Transform, TransformCallback } from 'stream';
import { validateAndMergeSchemas, TypeName } from '../type-detector.js';
import { typeNameToTonl, formatValue } from '../json-to-tonl.js';
import { TonlValidationError } from '../../utils/errors.js';

export interface TonlTransformOptions {
  collectionName?: string;
  skipInvalid?: boolean;
  flattenNested?: boolean;
  highWaterMark?: number;
}

/**
 * Transform Stream: JSON Objects → TONL Lines
 * 
 * Optimized for streaming large log files without buffering.
 * Handles NDJSON input line-by-line and outputs TONL format.
 * 
 * Usage:
 * ```typescript
 * import { pipeline } from 'stream/promises';
 * import ndjson from 'ndjson';
 * 
 * await pipeline(
 *   fs.createReadStream('logs.ndjson'),
 *   ndjson.parse(),
 *   new TonlTransform({ collectionName: 'logs' }),
 *   fs.createWriteStream('logs.tonl')
 * );
 * ```
 */
export class TonlTransform extends Transform {
  private schema: Record<string, TypeName> | null = null;
  private headerWritten = false;
  private collectionName: string;
  private skipInvalid: boolean;
  private flattenNested: boolean;
  private rowCount = 0;

  constructor(options: TonlTransformOptions = {}) {
    super({
      objectMode: true,
      highWaterMark: options.highWaterMark || 16
    });
    
    this.collectionName = options.collectionName || 'data';
    this.skipInvalid = options.skipInvalid ?? true;
    this.flattenNested = options.flattenNested ?? false;
    
    // Validate collection name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.collectionName)) {
      throw new TonlValidationError(
        `Invalid collection name: "${this.collectionName}". Must start with letter/underscore.`
      );
    }
  }

  _transform(chunk: any, encoding: string, callback: TransformCallback): void {
    try {
      // Skip non-objects
      if (!chunk || typeof chunk !== 'object' || Array.isArray(chunk)) {
        if (this.skipInvalid) {
          callback();
          return;
        }
        callback(new TonlValidationError('Invalid chunk: expected object'));
        return;
      }

      // First chunk: Generate header
      if (!this.headerWritten) {
        try {
          this.schema = validateAndMergeSchemas([chunk]);
          const schemaEntries = Object.entries(this.schema)
            .map(([key, type]) => `${key}:${typeNameToTonl(type)}`)
            .join(',');
          
          // Stream mode: empty brackets [] = unknown count
          const header = `${this.collectionName}[]{${schemaEntries}}:\n`;
          this.push(header);
          this.headerWritten = true;
        } catch (error) {
          if (this.skipInvalid) {
            callback();
            return;
          }
          callback(error as Error);
          return;
        }
      }

      // Format row values
      try {
        if (!this.schema) {
          callback(new Error('Schema not initialized'));
          return;
        }

        const values = Object.keys(this.schema).map((key) => {
          const value = chunk[key];
          return formatValue(value);
        });

        const row = '  ' + values.join(', ') + '\n';
        this.rowCount++;
        this.push(row);
        callback();
      } catch (error) {
        if (this.skipInvalid) {
          callback();
          return;
        }
        callback(error as Error);
      }
    } catch (error) {
      callback(error as Error);
    }
  }

  _flush(callback: TransformCallback): void {
    // Optional: Could push a trailer with actual count
    // this.push(`\n// Total rows: ${this.rowCount}\n`);
    callback();
  }

  /**
   * Get the total number of rows processed
   */
  getRowCount(): number {
    return this.rowCount;
  }
}
