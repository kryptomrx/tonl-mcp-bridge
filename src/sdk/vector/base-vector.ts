import type { VectorDBConfig } from './types.js';

export abstract class BaseVectorAdapter {
  protected connected = false;
  protected config: VectorDBConfig;

  constructor(config: VectorDBConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  getConfig(): VectorDBConfig {
    return { ...this.config };
  }
}