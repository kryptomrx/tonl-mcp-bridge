import { encodingForModel, type TiktokenModel } from 'js-tiktoken';
import type { ITokenizer, TokenizerResult } from './types.js';

export class TikTokenAdapter implements ITokenizer {
  readonly name = 'js-tiktoken';

  supports(model: string): boolean {
    // We support everything by falling back to GPT-4o/5 encoding approximation
    return true;
  }

  count(text: string, model: string = 'gpt-5'): TokenizerResult {
    try {
      let encodingModel = model;

      // --- Smart Mapping for Modern Models ---
      // js-tiktoken expects OpenAI model names.
      // We map new models to their closest OpenAI equivalent.
      
      const isAnthropic = model.startsWith('claude');
      const isGoogle = model.startsWith('gemini');
      const isGPT5 = model === 'gpt-5';
      
      // Use GPT-4o tokenizer (o200k_base) for all modern high-efficiency models
      // This is more accurate for 2025-era models than the old cl100k_base
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
      // Fallback if specific encoding fails
      return {
        count: Math.ceil(text.length / 4),
        modelUsed: 'naive-char-count',
        method: 'estimated',
      };
    }
  }
}