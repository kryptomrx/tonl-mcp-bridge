export interface TokenizerResult {
  count: number;
  modelUsed: string;
  method: 'exact' | 'estimated' | 'remote';
}

export interface ITokenizer {

  count(text: string, model?: string): Promise<TokenizerResult> | TokenizerResult;

  name: string;

  supports(model: string): boolean;
}