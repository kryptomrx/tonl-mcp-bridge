import type { QdrantConfig } from './types.js';

export abstract class BaseVectorAdapter {
  protected connected = false;
  protected config: QdrantConfig;

  constructor(config: QdrantConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  getConfig(): QdrantConfig {
    return { ...this.config };
  }
}