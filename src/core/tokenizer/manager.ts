import type { ITokenizer } from './types.js';
import { TikTokenAdapter } from './tiktoken-adapter.js';

class TokenManager {
  private static instance: TokenManager;
  private activeTokenizer: ITokenizer;

  private constructor() {
    this.activeTokenizer = new TikTokenAdapter();
  }

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  public setTokenizer(tokenizer: ITokenizer): void {
    this.activeTokenizer = tokenizer;
  }

  public async count(text: string, model: string): Promise<number> {
    const result = await this.activeTokenizer.count(text, model);
    return result.count;
  }

  public async countDetailed(text: string, model: string) {
    return await this.activeTokenizer.count(text, model);
  }
}

export const tokenManager = TokenManager.getInstance();