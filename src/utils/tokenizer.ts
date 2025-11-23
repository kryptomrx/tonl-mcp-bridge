import { encodingForModel } from 'js-tiktoken';

export type ModelName =
  | 'gpt-5'
  | 'gpt-5.1'
  | 'gpt-5-thinking'
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'claude-4-opus'
  | 'claude-4-sonnet'
  | 'claude-sonnet-4.5'
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-pro'
  | 'grok-3'
  | 'deepseek-r1'
  | 'llama-4';

export function countTokens(text: string, model: ModelName = 'gpt-5'): number {
  try {
    let encodingModel = model;

    if (model.startsWith('claude') || model.startsWith('gemini') || 
        model.startsWith('grok') || model.startsWith('deepseek') || 
        model.startsWith('llama') || model.startsWith('gpt-5')) {
      encodingModel = 'gpt-4';
    }

    const enc = encodingForModel(encodingModel as any);
    const tokens = enc.encode(text);

    return tokens.length;
  } catch (error) {
    console.warn('Tokenizer failed, using fallback:', error);
    return Math.ceil(text.length / 4);
  }
}

export function calculateRealSavings(
  original: string,
  compressed: string,
  model: ModelName = 'gpt-5'
): {
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  savingsPercent: number;
  model: string;
} {
  const originalTokens = countTokens(original, model);
  const compressedTokens = countTokens(compressed, model);
  const savedTokens = originalTokens - compressedTokens;
  const savingsPercent = savedTokens > 0 ? (savedTokens / originalTokens) * 100 : 0;

  return {
    originalTokens,
    compressedTokens,
    savedTokens,
    savingsPercent: Math.round(savingsPercent * 10) / 10,
    model
  };
}