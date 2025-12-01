/**
 * ROI Calculator for TONL
 * Calculate cost savings across different LLM providers
 */

export interface ModelPricing {
  name: string;
  inputCost: number;  // Cost per 1M input tokens in USD
  outputCost: number; // Cost per 1M output tokens in USD
  provider: string;
}

/**
 * Currency exchange rates (updated periodically)
 * Base: USD
 */
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,  // ~1 USD = 0.92 EUR (as of Jan 2025)
  GBP: 0.79,  // ~1 USD = 0.79 GBP
  JPY: 149.5, // ~1 USD = 149.5 JPY
  CHF: 0.88,  // ~1 USD = 0.88 CHF
  CAD: 1.35,  // ~1 USD = 1.35 CAD
  AUD: 1.52,  // ~1 USD = 1.52 AUD
};

/**
 * Format currency with optional conversion
 * Shows USD base price with optional conversion: "$100.00" or "$100.00 (~€95.00)"
 * 
 * @param amountUSD - Amount in USD
 * @param targetCurrency - Target currency code (USD, EUR, GBP, etc.)
 * @param customRate - Optional custom exchange rate (overrides default)
 * @returns Formatted string with USD and optional converted amount
 */
export function formatCurrencyWithConversion(
  amountUSD: number,
  targetCurrency: string = 'USD',
  customRate?: number
): string {
  // Always show USD base amount
  const usdStr = `$${amountUSD.toFixed(2)}`;
  
  // If USD, just return that
  if (targetCurrency === 'USD') {
    return usdStr;
  }
  
  // Determine exchange rate (custom or default)
  const rate = customRate !== undefined ? customRate : (EXCHANGE_RATES[targetCurrency] || 1.0);
  
  // Convert to target currency
  const converted = amountUSD * rate;
  
  // Get currency symbol
  const symbol = targetCurrency === 'EUR' ? '€' : 
                 targetCurrency === 'GBP' ? '£' : 
                 targetCurrency === 'JPY' ? '¥' :
                 targetCurrency === 'CHF' ? 'CHF ' :
                 targetCurrency === 'CAD' ? 'CA$' :
                 targetCurrency === 'AUD' ? 'A$' :
                 targetCurrency;
  
  // Format with proper decimals (JPY has no decimals)
  const convertedStr = targetCurrency === 'JPY' ? 
    Math.round(converted).toLocaleString() : 
    converted.toFixed(2);
  
  return `${usdStr} (~${symbol}${convertedStr})`;
}

/**
 * LLM Model Pricing (as of January 2025)
 * All prices are per 1 million tokens
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Models
  'gpt-4o': {
    name: 'GPT-4o',
    inputCost: 2.50,
    outputCost: 10.00,
    provider: 'OpenAI'
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    inputCost: 0.15,
    outputCost: 0.60,
    provider: 'OpenAI'
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    inputCost: 10.00,
    outputCost: 30.00,
    provider: 'OpenAI'
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    inputCost: 0.50,
    outputCost: 1.50,
    provider: 'OpenAI'
  },

  // Anthropic Models
  'claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    inputCost: 3.00,
    outputCost: 15.00,
    provider: 'Anthropic'
  },
  'claude-3-opus': {
    name: 'Claude 3 Opus',
    inputCost: 15.00,
    outputCost: 75.00,
    provider: 'Anthropic'
  },
  'claude-3-sonnet': {
    name: 'Claude 3 Sonnet',
    inputCost: 3.00,
    outputCost: 15.00,
    provider: 'Anthropic'
  },
  'claude-3-haiku': {
    name: 'Claude 3 Haiku',
    inputCost: 0.25,
    outputCost: 1.25,
    provider: 'Anthropic'
  },

  // Google Models
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    inputCost: 0.075,
    outputCost: 0.30,
    provider: 'Google'
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    inputCost: 1.25,
    outputCost: 5.00,
    provider: 'Google'
  },
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    inputCost: 0.075,
    outputCost: 0.30,
    provider: 'Google'
  },

  // Generic aliases
  'gpt-5': {
    name: 'GPT-4o',
    inputCost: 2.50,
    outputCost: 10.00,
    provider: 'OpenAI'
  },
  'claude-4': {
    name: 'Claude 3.5 Sonnet',
    inputCost: 3.00,
    outputCost: 15.00,
    provider: 'Anthropic'
  },
  'gemini-2.5': {
    name: 'Gemini 2.0 Flash',
    inputCost: 0.075,
    outputCost: 0.30,
    provider: 'Google'
  }
};

export interface ROICalculation {
  model: ModelPricing;
  jsonTokens: number;
  tonlTokens: number;
  savedTokens: number;
  savingsPercent: number;
  filename?: string;
  costs: {
    json: {
      per1M: number;
      per10M: number;
      per100M: number;
    };
    tonl: {
      per1M: number;
      per10M: number;
      per100M: number;
    };
    savings: {
      per1M: number;
      per10M: number;
      per100M: number;
    };
  };
}

/**
 * Calculate ROI for TONL vs JSON
 */
export function calculateROI(
  jsonTokens: number,
  tonlTokens: number,
  modelKey: string = 'gpt-4o'
): ROICalculation {
  const model = MODEL_PRICING[modelKey] || MODEL_PRICING['gpt-4o'];
  const savedTokens = jsonTokens - tonlTokens;
  const savingsPercent = (savedTokens / jsonTokens) * 100;

  // Calculate costs per request
  const jsonCostPerRequest = (jsonTokens / 1_000_000) * model.inputCost;
  const tonlCostPerRequest = (tonlTokens / 1_000_000) * model.inputCost;
  const savingsPerRequest = jsonCostPerRequest - tonlCostPerRequest;

  return {
    model,
    jsonTokens,
    tonlTokens,
    savedTokens,
    savingsPercent,
    costs: {
      json: {
        per1M: jsonCostPerRequest * 1_000_000,
        per10M: jsonCostPerRequest * 10_000_000,
        per100M: jsonCostPerRequest * 100_000_000
      },
      tonl: {
        per1M: tonlCostPerRequest * 1_000_000,
        per10M: tonlCostPerRequest * 10_000_000,
        per100M: tonlCostPerRequest * 100_000_000
      },
      savings: {
        per1M: savingsPerRequest * 1_000_000,
        per10M: savingsPerRequest * 10_000_000,
        per100M: savingsPerRequest * 100_000_000
      }
    }
  };
}

/**
 * Format ROI calculation for CLI output
 */
export function formatROI(
  roi: ROICalculation, 
  filename: string = 'data.json',
  currency: string = 'USD',
  customRate?: number
): string {
  const lines: string[] = [];
  
  lines.push('');
  lines.push('📊 Analysis for ' + filename);
  lines.push('');
  lines.push(`Model:           ${roi.model.name} (${roi.model.provider})`);
  lines.push(`Input Cost:      $${roi.model.inputCost}/1M tokens`);
  lines.push('');
  lines.push('Token Usage:');
  lines.push(`  JSON:          ${roi.jsonTokens.toLocaleString()} tokens`);
  lines.push(`  TONL:          ${roi.tonlTokens.toLocaleString()} tokens`);
  lines.push(`  ✅ Saved:       ${roi.savedTokens.toLocaleString()} tokens (${roi.savingsPercent.toFixed(1)}%)`);
  lines.push('');
  lines.push('Costs (per 1M requests):');
  lines.push(`  ❌ JSON:        ${formatCurrencyWithConversion(roi.costs.json.per1M, currency, customRate)}`);
  lines.push(`  ✅ TONL:        ${formatCurrencyWithConversion(roi.costs.tonl.per1M, currency, customRate)}`);
  lines.push('  ' + '─'.repeat(30));
  lines.push(`  💰 Savings:     ${formatCurrencyWithConversion(roi.costs.savings.per1M, currency, customRate)} (${roi.savingsPercent.toFixed(1)}%)`);
  lines.push('');

  // Show scaling impact if savings are significant
  if (roi.savingsPercent > 10) {
    lines.push('At Scale:');
    lines.push(`  10M requests:  Save ${formatCurrencyWithConversion(roi.costs.savings.per10M, currency, customRate)}`);
    lines.push(`  100M requests: Save ${formatCurrencyWithConversion(roi.costs.savings.per100M, currency, customRate)}`);
    lines.push('');
  }

  // Recommendation
  if (roi.savingsPercent >= 20) {
    lines.push('👉 Recommended: STRONGLY USE TONL');
  } else if (roi.savingsPercent >= 10) {
    lines.push('👉 Recommended: USE TONL');
  } else if (roi.savingsPercent > 0) {
    lines.push('👉 Recommended: Consider TONL');
  } else {
    lines.push('👉 Note: TONL may not provide significant savings for this data structure');
  }
  
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate marketing-friendly summary
 */
export function generateMarketingSummary(
  roi: ROICalculation,
  currency: string = 'USD',
  customRate?: number
): string {
  const annualSavingsAt1KPerDay = (roi.costs.savings.per1M / 1000) * 365;
  const annualSavingsAt10KPerDay = (roi.costs.savings.per1M / 100) * 365;

  const lines: string[] = [];
  lines.push('');
  lines.push('💡 Business Impact:');
  lines.push('');
  lines.push('  If you run:');
  lines.push(`    1,000 queries/day  → Save ${formatCurrencyWithConversion(annualSavingsAt1KPerDay, currency, customRate)}/year`);
  lines.push(`    10,000 queries/day → Save ${formatCurrencyWithConversion(annualSavingsAt10KPerDay, currency, customRate)}/year`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Get currency symbol for CSV export
 */
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CHF: 'CHF',
    CAD: 'CA$',
    AUD: 'A$'
  };
  return symbols[currency] || currency;
}

/**
 * Convert USD amount to target currency
 */
function convertCurrency(amountUSD: number, currency: string, customRate?: number): number {
  if (currency === 'USD') return amountUSD;
  const rate = customRate !== undefined ? customRate : (EXCHANGE_RATES[currency] || 1.0);
  return amountUSD * rate;
}

/**
 * Export ROI data as CSV - Smart Enterprise Format
 * 12 columns: Context (4) + Hard Facts (5) + Money Shot (3)
 */
export function exportToCSV(
  calculations: ROICalculation[], 
  currency: string = 'USD',
  customRate?: number
): string {
  const lines: string[] = [];
  const currencySymbol = getCurrencySymbol(currency);
  
  // Header - The Smart Enterprise Version
  lines.push([
    // Context (4 columns)
    'Timestamp',
    'File',
    'Model',
    'Currency',
    // Hard Facts (5 columns)
    'Original Tokens',
    'TONL Tokens',
    'Savings %',
    `Cost per 1K Requests JSON (${currencySymbol})`,
    `Cost per 1K Requests TONL (${currencySymbol})`,
    // Money Shot (3 columns)
    `Net Savings per 1M Requests (${currencySymbol})`,
    `Projected Annual Savings at 1K/day (${currencySymbol})`,
    'Recommendation'
  ].join(','));
  
  // Data rows
  const timestamp = new Date().toISOString();
  
  for (const calc of calculations) {
    // Calculate costs per 1K requests (more standard than 1M for readability)
    const jsonCostPer1K = convertCurrency((calc.costs.json.per1M / 1000), currency, customRate);
    const tonlCostPer1K = convertCurrency((calc.costs.tonl.per1M / 1000), currency, customRate);
    
    // Net savings per 1M requests
    const netSavingsPer1M = convertCurrency(calc.costs.savings.per1M, currency, customRate);
    
    // Annual savings at 1K queries/day
    const annualSavingsAt1K = convertCurrency((calc.costs.savings.per1M / 1000) * 365, currency, customRate);
    
    // Recommendation
    let recommendation: string;
    if (calc.savingsPercent >= 20) {
      recommendation = 'Strong Adopt';
    } else if (calc.savingsPercent >= 10) {
      recommendation = 'Adopt';
    } else if (calc.savingsPercent > 0) {
      recommendation = 'Consider';
    } else {
      recommendation = 'Limited Value';
    }
    
    lines.push([
      timestamp,
      calc.filename || 'N/A',
      calc.model.name,
      currency,
      calc.jsonTokens,
      calc.tonlTokens,
      calc.savingsPercent.toFixed(1),
      jsonCostPer1K.toFixed(4),
      tonlCostPer1K.toFixed(4),
      netSavingsPer1M.toFixed(2),
      annualSavingsAt1K.toFixed(2),
      recommendation
    ].join(','));
  }
  
  // Add trailing newline to prevent shell % artifact
  return lines.join('\n') + '\n';
}

/**
 * Format aggregate results for batch analysis
 */
export function formatBatchROI(
  calculations: ROICalculation[],
  currency: string = 'USD',
  customRate?: number
): string {
  const lines: string[] = [];
  
  // Calculate totals
  const totalJsonTokens = calculations.reduce((sum, c) => sum + c.jsonTokens, 0);
  const totalTonlTokens = calculations.reduce((sum, c) => sum + c.tonlTokens, 0);
  const totalSaved = totalJsonTokens - totalTonlTokens;
  const avgSavingsPercent = (totalSaved / totalJsonTokens) * 100;
  
  // Use first model for cost calculations
  const model = calculations[0].model;
  const totalCostSavings = (totalSaved / 1_000_000) * model.inputCost * 1_000_000;
  const annualSavings = (totalCostSavings / 1000) * 365;
  
  lines.push('');
  lines.push(`📊 Batch Analysis: ${calculations.length} file(s)`);
  lines.push('─'.repeat(50));
  lines.push('');
  lines.push(`Total JSON Tokens:  ${totalJsonTokens.toLocaleString()}`);
  lines.push(`Total TONL Tokens:  ${totalTonlTokens.toLocaleString()}`);
  lines.push(`Total Saved:        ${totalSaved.toLocaleString()} tokens (${avgSavingsPercent.toFixed(1)}%)`);
  lines.push('');
  lines.push(`Cost Savings (per 1M requests):`);
  lines.push(`  ${model.name}:  ${formatCurrencyWithConversion(totalCostSavings, currency, customRate)}`);
  lines.push('');
  lines.push(`💰 Projected Annual Savings:`);
  lines.push(`  At 1,000 queries/day: ${formatCurrencyWithConversion(annualSavings, currency, customRate)}/year`);
  lines.push(`  At 10,000 queries/day: ${formatCurrencyWithConversion(annualSavings * 10, currency, customRate)}/year`);
  lines.push('');
  
  // Top files by savings
  const sorted = [...calculations].sort((a, b) => b.savedTokens - a.savedTokens);
  lines.push('🏆 Top Files by Token Savings:');
  sorted.slice(0, 5).forEach((calc, i) => {
    const filename = calc.filename || 'Unknown';
    lines.push(`  ${i + 1}. ${filename.padEnd(30)} ${calc.savedTokens} tokens (${calc.savingsPercent.toFixed(1)}%)`);
  });
  lines.push('');
  
  if (avgSavingsPercent >= 20) {
    lines.push('👉 Recommended: STRONGLY ADOPT TONL');
  } else if (avgSavingsPercent >= 10) {
    lines.push('👉 Recommended: ADOPT TONL');
  } else {
    lines.push('👉 Note: Limited savings for this dataset');
  }
  lines.push('');
  
  return lines.join('\n');
}

/**
 * List all available models
 */
export function listLLMModels(): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('Available Models:');
  lines.push('');

  const grouped = new Map<string, ModelPricing[]>();
  for (const [key, model] of Object.entries(MODEL_PRICING)) {
    if (!grouped.has(model.provider)) {
      grouped.set(model.provider, []);
    }
    if (!grouped.get(model.provider)!.find(m => m.name === model.name)) {
      grouped.get(model.provider)!.push(model);
    }
  }

  for (const [provider, models] of grouped) {
    lines.push(`${provider}:`);
    for (const model of models) {
      const keys = Object.keys(MODEL_PRICING).filter(k => 
        MODEL_PRICING[k].name === model.name && 
        MODEL_PRICING[k].provider === provider
      );
      lines.push(`  ${model.name.padEnd(25)} $${model.inputCost}/1M  (${keys[0]})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
