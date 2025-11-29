export abstract class BaseVectorAdapter {
  protected connected: boolean = false;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract search(collectionName: string, vector: number[], options?: any): Promise<any[]>;

  protected ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Not connected to vector database. Call connect() first.');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}