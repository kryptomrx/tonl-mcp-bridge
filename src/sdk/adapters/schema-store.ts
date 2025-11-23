import fs from 'fs/promises';
import path from 'path';
import type { SchemaBaseline } from './types.js';

const SCHEMA_DIR = '.tonl-schemas';

export class SchemaStore {
  private async ensureDir(): Promise<void> {
    await fs.mkdir(SCHEMA_DIR, { recursive: true });
    }

  private getFilePath(tableName: string): string {
    return path.join(SCHEMA_DIR, `${tableName}.json`);
  }

  async save(baseline: SchemaBaseline): Promise<void> {
    await this.ensureDir();
    const filePath = this.getFilePath(baseline.tableName);
    await fs.writeFile(filePath, JSON.stringify(baseline, null, 2));
  }

  async load(tableName: string): Promise<SchemaBaseline | null> {
    try {
      const filePath = this.getFilePath(tableName);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async exists(tableName: string): Promise<boolean> {
    const baseline = await this.load(tableName);
    return baseline !== null;
  }

  async delete(tableName: string): Promise<void> {
    try {
      const filePath = this.getFilePath(tableName);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }
}