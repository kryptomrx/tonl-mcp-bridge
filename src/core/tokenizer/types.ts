export interface TokenizerResult {
  count: number;
  modelUsed: string;
  method: 'exact' | 'estimated' | 'remote';
}

export interface ITokenizer {
  /**
   * Count tokens for the given text using the specified model strategy.
   */
  count(text: string, model?: string): Promise<TokenizerResult> | TokenizerResult;

  /**
   * Identifier for the tokenizer implementation.
   */
  name: string;

  /**
   * Check if this tokenizer supports the requested model.
   */
  supports(model: string): boolean;
}