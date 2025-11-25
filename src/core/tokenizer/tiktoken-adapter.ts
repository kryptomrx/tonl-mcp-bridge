import { encodingForModel, type TiktokenModel } from 'js-tiktoken';
import type { ITokenizer, TokenizerResult } from './types.js';

export class TikTokenAdapter implements ITokenizer {
  readonly name = 'js-tiktoken';

  supports(model: string): boolean {
    return true;
  }

  count(text: string, model: string = 'gpt-5'): TokenizerResult {
    try {
      let encodingModel = model;

      const isAnthropic = model.startsWith('claude');
      const isGoogle = model.startsWith('gemini');
      const isGPT5 = model === 'gpt-5';
      
      // Mappe ALLE Claude/Gemini Varianten auf gpt-4o (o200k_base)
      if (isAnthropic || isGoogle || isGPT5) {
        encodingModel = 'gpt-4o'; 
      }

      const enc = encodingForModel(encodingModel as TiktokenModel);
      const tokens = enc.encode(text);

      return {
        count: tokens.length,
        modelUsed: encodingModel,
        method: model === encodingModel ? 'exact' : 'estimated',
      };
    } catch {
      return {
        count: Math.ceil(text.length / 4),
        modelUsed: 'naive-char-count',
        method: 'estimated',
      };
    }
  }
}