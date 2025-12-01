import { countTokens } from 'tonl-mcp-bridge';

export interface TokenComparison {
  jsonTokens: number;
  tonlTokens: number;
  savedTokens: number;
  savingsPercent: number;
  costSavings: {
    gpt4o: string;
    claude: string;
    gemini: string;
  };
}

export function compareTokens(
  jsonData: string,
  tonlData: string
): TokenComparison {
  const jsonTokens = countTokens(jsonData);
  const tonlTokens = countTokens(tonlData);
  const savedTokens = jsonTokens - tonlTokens;
  const savingsPercent = (savedTokens / jsonTokens) * 100;

  // Cost calculations (input tokens per 1M)
  const gpt4oSavings = (savedTokens / 1_000_000) * 2.50;
  const claudeSavings = (savedTokens / 1_000_000) * 3.00;
  const geminiSavings = (savedTokens / 1_000_000) * 1.25;

  return {
    jsonTokens,
    tonlTokens,
    savedTokens,
    savingsPercent: Math.round(savingsPercent * 10) / 10,
    costSavings: {
      gpt4o: `$${gpt4oSavings.toFixed(4)}`,
      claude: `$${claudeSavings.toFixed(4)}`,
      gemini: `$${geminiSavings.toFixed(4)}`
    }
  };
}

export function printComparison(comparison: TokenComparison, label: string = 'RAG Context'): void {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 TOKEN COMPARISON: ${label}`);
  console.log('='.repeat(60));
  console.log(`JSON format:  ${comparison.jsonTokens.toLocaleString()} tokens`);
  console.log(`TONL format:  ${comparison.tonlTokens.toLocaleString()} tokens`);
  console.log('─'.repeat(60));
  console.log(`✅ Saved:      ${comparison.savedTokens.toLocaleString()} tokens (${comparison.savingsPercent}%)`);
  console.log('\n💰 Cost Savings per 1M tokens:');
  console.log(`   GPT-4o:     ${comparison.costSavings.gpt4o}`);
  console.log(`   Claude:     ${comparison.costSavings.claude}`);
  console.log(`   Gemini:     ${comparison.costSavings.gemini}`);
  console.log('='.repeat(60) + '\n');
}
