/**
 * ROI Calculator - Convert token savings to real money
 * Zero external dependencies, pure math
 */

export interface LLMPricing {
  name: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  contextWindow: number;
}

export const LLM_PRICING: Record<string, LLMPricing> = {
  'gpt-4o': {
    name: 'GPT-4o',
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    contextWindow: 128000
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    contextWindow: 128000
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    inputCostPer1M: 10.00,
    outputCostPer1M: 30.00,
    contextWindow: 128000
  },
  'claude-opus-4': {
    name: 'Claude Opus 4',
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00,
    contextWindow: 200000
  },
  'claude-sonnet-4': {
    name: 'Claude Sonnet 4',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    contextWindow: 200000
  },
  'claude-haiku-4': {
    name: 'Claude Haiku 4',
    inputCostPer1M: 0.25,
    outputCostPer1M: 1.25,
    contextWindow: 200000
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.00,
    contextWindow: 2000000
  },
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    contextWindow: 1000000
  }
};

export interface ROICalculation {
  // Input
  tokensBefore: number;
  tokensAfter: number;
  savingsPercentage: number;
  queriesPerDay: number;
  llmModel: string;
  
  // Calculations
  dailyTokensBefore: number;
  dailyTokensAfter: number;
  dailyTokensSaved: number;
  
  monthlyTokensBefore: number;
  monthlyTokensAfter: number;
  monthlyTokensSaved: number;
  
  annualTokensBefore: number;
  annualTokensAfter: number;
  annualTokensSaved: number;
  
  // Costs
  dailyCostBefore: number;
  dailyCostAfter: number;
  dailySavings: number;
  
  monthlyCostBefore: number;
  monthlyCostAfter: number;
  monthlySavings: number;
  
  annualCostBefore: number;
  annualCostAfter: number;
  annualSavings: number;
  
  // Metadata
  pricing: LLMPricing;
  calculatedAt: Date;
}

export interface ROICalculatorOptions {
  tokensBefore: number;
  tokensAfter: number;
  queriesPerDay: number;
  llmModel?: string;
  savingsPercentage?: number;
}

/**
 * Calculate ROI from token savings
 */
export function calculateROI(options: ROICalculatorOptions): ROICalculation {
  const {
    tokensBefore,
    tokensAfter,
    queriesPerDay,
    llmModel = 'gpt-4o',
    savingsPercentage
  } = options;

  // Validation
  if (tokensBefore <= 0) {
    throw new Error('tokensBefore must be greater than 0');
  }
  if (tokensAfter < 0) {
    throw new Error('tokensAfter cannot be negative');
  }
  if (queriesPerDay <= 0) {
    throw new Error('queriesPerDay must be greater than 0');
  }
  if (tokensAfter > tokensBefore) {
    throw new Error('tokensAfter cannot be greater than tokensBefore');
  }

  const pricing = LLM_PRICING[llmModel];
  if (!pricing) {
    throw new Error(
      `Unknown LLM model: ${llmModel}. Available: ${Object.keys(LLM_PRICING).join(', ')}`
    );
  }

  // Calculate savings percentage if not provided
  const actualSavingsPercentage = savingsPercentage !== undefined
    ? savingsPercentage
    : ((tokensBefore - tokensAfter) / tokensBefore) * 100;

  // Daily calculations
  const dailyTokensBefore = tokensBefore * queriesPerDay;
  const dailyTokensAfter = tokensAfter * queriesPerDay;
  const dailyTokensSaved = dailyTokensBefore - dailyTokensAfter;

  // Monthly calculations (30 days)
  const monthlyTokensBefore = dailyTokensBefore * 30;
  const monthlyTokensAfter = dailyTokensAfter * 30;
  const monthlyTokensSaved = dailyTokensSaved * 30;

  // Annual calculations (365 days)
  const annualTokensBefore = dailyTokensBefore * 365;
  const annualTokensAfter = dailyTokensAfter * 365;
  const annualTokensSaved = dailyTokensSaved * 365;

  // Cost calculations (using input cost for context)
  const costPer1M = pricing.inputCostPer1M;

  const dailyCostBefore = (dailyTokensBefore / 1_000_000) * costPer1M;
  const dailyCostAfter = (dailyTokensAfter / 1_000_000) * costPer1M;
  const dailySavings = dailyCostBefore - dailyCostAfter;

  const monthlyCostBefore = (monthlyTokensBefore / 1_000_000) * costPer1M;
  const monthlyCostAfter = (monthlyTokensAfter / 1_000_000) * costPer1M;
  const monthlySavings = monthlyCostBefore - monthlyCostAfter;

  const annualCostBefore = (annualTokensBefore / 1_000_000) * costPer1M;
  const annualCostAfter = (annualTokensAfter / 1_000_000) * costPer1M;
  const annualSavings = annualCostBefore - annualCostAfter;

  return {
    tokensBefore,
    tokensAfter,
    savingsPercentage: actualSavingsPercentage,
    queriesPerDay,
    llmModel,

    dailyTokensBefore,
    dailyTokensAfter,
    dailyTokensSaved,

    monthlyTokensBefore,
    monthlyTokensAfter,
    monthlyTokensSaved,

    annualTokensBefore,
    annualTokensAfter,
    annualTokensSaved,

    dailyCostBefore,
    dailyCostAfter,
    dailySavings,

    monthlyCostBefore,
    monthlyCostAfter,
    monthlySavings,

    annualCostBefore,
    annualCostAfter,
    annualSavings,

    pricing,
    calculatedAt: new Date()
  };
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Format ROI calculation as readable text
 */
export function formatROI(roi: ROICalculation): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('              💰 TONL ROI CALCULATOR 💰              ');
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('');
  
  lines.push('📊 INPUT PARAMETERS:');
  lines.push(`   LLM Model:          ${roi.pricing.name}`);
  lines.push(`   Queries/Day:        ${formatNumber(roi.queriesPerDay)}`);
  lines.push(`   Tokens Before:      ${formatNumber(roi.tokensBefore)} tokens/query`);
  lines.push(`   Tokens After:       ${formatNumber(roi.tokensAfter)} tokens/query`);
  lines.push(`   Token Savings:      ${roi.savingsPercentage.toFixed(1)}%`);
  lines.push('');

  lines.push('💵 DAILY SAVINGS:');
  lines.push(`   Cost Before:        ${formatCurrency(roi.dailyCostBefore)}/day`);
  lines.push(`   Cost After:         ${formatCurrency(roi.dailyCostAfter)}/day`);
  lines.push(`   ➜ YOU SAVE:         ${formatCurrency(roi.dailySavings)}/day`);
  lines.push('');

  lines.push('💰 MONTHLY SAVINGS:');
  lines.push(`   Cost Before:        ${formatCurrency(roi.monthlyCostBefore)}/month`);
  lines.push(`   Cost After:         ${formatCurrency(roi.monthlyCostAfter)}/month`);
  lines.push(`   ➜ YOU SAVE:         ${formatCurrency(roi.monthlySavings)}/month`);
  lines.push('');

  lines.push('🎯 ANNUAL SAVINGS:');
  lines.push(`   Cost Before:        ${formatCurrency(roi.annualCostBefore)}/year`);
  lines.push(`   Cost After:         ${formatCurrency(roi.annualCostAfter)}/year`);
  lines.push(`   ➜ YOU SAVE:         ${formatCurrency(roi.annualSavings)}/year`);
  lines.push('');

  lines.push('📈 TOKEN USAGE:');
  lines.push(`   Daily:              ${formatNumber(roi.dailyTokensSaved)} tokens saved`);
  lines.push(`   Monthly:            ${formatNumber(roi.monthlyTokensSaved)} tokens saved`);
  lines.push(`   Annual:             ${formatNumber(roi.annualTokensSaved)} tokens saved`);
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════');
  lines.push(`   Calculated at: ${roi.calculatedAt.toLocaleString()}`);
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate marketing summary
 */
export function generateMarketingSummary(roi: ROICalculation): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('🚀 TONL SAVINGS SUMMARY');
  lines.push('');
  
  if (roi.annualSavings >= 100000) {
    lines.push(`Save over ${formatCurrency(roi.annualSavings)} per year with TONL! 🎉`);
  } else if (roi.annualSavings >= 10000) {
    lines.push(`Save ${formatCurrency(roi.annualSavings)} annually with TONL! 💰`);
  } else if (roi.annualSavings >= 1000) {
    lines.push(`Reduce costs by ${formatCurrency(roi.annualSavings)}/year! 💸`);
  } else {
    lines.push(`Save ${formatCurrency(roi.monthlySavings)}/month with TONL! ⚡`);
  }

  lines.push('');
  lines.push(`📉 ${roi.savingsPercentage.toFixed(1)}% token reduction`);
  lines.push(`💵 ${formatCurrency(roi.monthlySavings)}/month savings`);
  lines.push(`🎯 ${formatCurrency(roi.annualSavings)}/year savings`);
  lines.push('');

  return lines.join('\n');
}

/**
 * List available LLM models
 */
export function listLLMModels(): string {
  const lines: string[] = [];
  
  lines.push('');
  lines.push('Available LLM Models:');
  lines.push('');
  
  Object.entries(LLM_PRICING).forEach(([key, pricing]) => {
    lines.push(`  ${key.padEnd(20)} ${pricing.name.padEnd(25)} $${pricing.inputCostPer1M}/1M input tokens`);
  });
  
  lines.push('');
  
  return lines.join('\n');
}
