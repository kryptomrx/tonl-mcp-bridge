import type { BaseVectorConfig } from './types.js';

export abstract class BaseVectorAdapter {
  protected connected = false;
  protected config: BaseVectorConfig;

  constructor(config: BaseVectorConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  getConfig(): BaseVectorConfig {
    return { ...this.config };
  }
}