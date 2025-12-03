import { describe, it, expect } from 'vitest';
import { 
  calculateROI, 
  exportToCSV,
  formatCurrencyWithConversion,
  EXCHANGE_RATES,
  MODEL_PRICING
} from '../src/cli/commands/roi-calculator.js';

describe('ROI Calculator', () => {
  describe('calculateROI', () => {
    it('should calculate correct savings for basic input', () => {
      const result = calculateROI(1000, 600, 'gpt-4o');
      
      expect(result.jsonTokens).toBe(1000);
      expect(result.tonlTokens).toBe(600);
      expect(result.savedTokens).toBe(400);
      expect(result.savingsPercent).toBe(40);
      expect(result.model.name).toBe('GPT-4o');
    });

    it('should calculate costs correctly for GPT-4o', () => {
      const result = calculateROI(1000, 600, 'gpt-4o');
      const model = MODEL_PRICING['gpt-4o'];
      
      // Cost = (tokens / 1M) * price_per_1M
      const expectedJsonCost = (1000 / 1_000_000) * model.inputCost * 1_000_000;
      const expectedTonlCost = (600 / 1_000_000) * model.inputCost * 1_000_000;
      const expectedSavings = expectedJsonCost - expectedTonlCost;
      
      expect(result.costs.json.per1M).toBe(expectedJsonCost);
      expect(result.costs.tonl.per1M).toBe(expectedTonlCost);
      expect(result.costs.savings.per1M).toBe(expectedSavings);
    });

    it('should handle different models', () => {
      const gptResult = calculateROI(1000, 600, 'gpt-4o');
      const claudeResult = calculateROI(1000, 600, 'claude-3.5-sonnet');
      
      expect(gptResult.model.provider).toBe('OpenAI');
      expect(claudeResult.model.provider).toBe('Anthropic');
      expect(gptResult.costs.json.per1M).not.toBe(claudeResult.costs.json.per1M);
    });

    it('should default to gpt-4o for unknown models', () => {
      const result = calculateROI(1000, 600, 'unknown-model');
      expect(result.model.name).toBe('GPT-4o');
    });

    it('should calculate 10M and 100M costs correctly', () => {
      const result = calculateROI(1000, 600, 'gpt-4o');
      
      expect(result.costs.savings.per10M).toBe(result.costs.savings.per1M * 10);
      expect(result.costs.savings.per100M).toBe(result.costs.savings.per1M * 100);
    });
  });

  describe('formatCurrencyWithConversion', () => {
    it('should format USD without conversion', () => {
      const result = formatCurrencyWithConversion(100, 'USD');
      expect(result).toBe('$100.00');
    });

    it('should convert to EUR with default rate', () => {
      const result = formatCurrencyWithConversion(100, 'EUR');
      const expected = 100 * EXCHANGE_RATES.EUR;
      expect(result).toContain('$100.00');
      expect(result).toContain('€');
      expect(result).toContain(expected.toFixed(2));
    });

    it('should use custom exchange rate', () => {
      const result = formatCurrencyWithConversion(100, 'EUR', 0.95);
      expect(result).toContain('$100.00');
      expect(result).toContain('€95.00');
    });

    it('should format JPY without decimals', () => {
      const result = formatCurrencyWithConversion(100, 'JPY');
      const expected = Math.round(100 * EXCHANGE_RATES.JPY);
      expect(result).toContain('¥');
      expect(result).toContain(expected.toLocaleString());
      expect(result).not.toMatch(/¥\d+\.\d+/); // No decimals
    });

    it('should handle all supported currencies', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
      
      currencies.forEach(currency => {
        const result = formatCurrencyWithConversion(100, currency);
        expect(result).toBeTruthy();
        expect(result).toContain('$100.00');
      });
    });
  });

  describe('exportToCSV', () => {
    it('should generate valid CSV with header', () => {
      const calculations = [
        calculateROI(1000, 600, 'gpt-4o')
      ];
      calculations[0].filename = 'test.json';
      
      const csv = exportToCSV(calculations, 'USD');
      const lines = csv.split('\n');
      
      // Should have header + data + trailing newline
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toContain('Timestamp');
      expect(lines[0]).toContain('File');
      expect(lines[0]).toContain('Model');
      expect(lines[0]).toContain('Currency');
      expect(lines[0]).toContain('Recommendation');
    });

    it('should have exactly 12 columns (Smart Enterprise format)', () => {
      const calculations = [
        calculateROI(1000, 600, 'gpt-4o')
      ];
      
      const csv = exportToCSV(calculations, 'USD');
      const header = csv.split('\n')[0];
      const columns = header.split(',');
      
      expect(columns.length).toBe(12);
    });

    it('should include correct recommendation', () => {
      const highSavings = calculateROI(1000, 400, 'gpt-4o'); // 60% savings
      highSavings.filename = 'high.json';
      
      const mediumSavings = calculateROI(1000, 850, 'gpt-4o'); // 15% savings
      mediumSavings.filename = 'medium.json';
      
      const lowSavings = calculateROI(1000, 950, 'gpt-4o'); // 5% savings
      lowSavings.filename = 'low.json';
      
      const csvHigh = exportToCSV([highSavings], 'USD');
      const csvMedium = exportToCSV([mediumSavings], 'USD');
      const csvLow = exportToCSV([lowSavings], 'USD');
      
      expect(csvHigh).toContain('Strong Adopt');
      expect(csvMedium).toContain('Adopt');
      expect(csvLow).toContain('Consider');
    });

    it('should convert currency in CSV data', () => {
      const calculations = [
        calculateROI(1000, 600, 'gpt-4o')
      ];
      calculations[0].filename = 'test.json';
      
      const csvUSD = exportToCSV(calculations, 'USD');
      const csvEUR = exportToCSV(calculations, 'EUR');
      
      expect(csvUSD).toContain('USD');
      expect(csvEUR).toContain('EUR');
      
      // EUR values should be different from USD
      const usdLines = csvUSD.split('\n');
      const eurLines = csvEUR.split('\n');
      expect(usdLines[1]).not.toBe(eurLines[1]);
    });

    it('should end with newline (POSIX compliance)', () => {
      const calculations = [
        calculateROI(1000, 600, 'gpt-4o')
      ];
      
      const csv = exportToCSV(calculations, 'USD');
      expect(csv.endsWith('\n')).toBe(true);
    });

    it('should handle multiple calculations', () => {
      const calculations = [
        calculateROI(1000, 600, 'gpt-4o'),
        calculateROI(2000, 1200, 'claude-3.5-sonnet'),
        calculateROI(500, 300, 'gemini-2.0-flash')
      ];
      
      calculations[0].filename = 'file1.json';
      calculations[1].filename = 'file2.json';
      calculations[2].filename = 'file3.json';
      
      const csv = exportToCSV(calculations, 'USD');
      const lines = csv.split('\n').filter(l => l.trim());
      
      // Header + 3 data rows
      expect(lines.length).toBe(4);
    });

    it('should calculate annual savings correctly', () => {
      const calculations = [
        calculateROI(1000, 600, 'gpt-4o')
      ];
      calculations[0].filename = 'test.json';
      
      const csv = exportToCSV(calculations, 'USD');
      const lines = csv.split('\n');
      const dataLine = lines[1].split(',');
      
      // Annual savings at 1K/day is in column 11 (0-indexed column 10)
      const annualSavings = parseFloat(dataLine[10]);
      const expectedAnnual = (calculations[0].costs.savings.per1M / 1000) * 365;
      
      expect(annualSavings).toBeCloseTo(expectedAnnual, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero savings', () => {
      const result = calculateROI(1000, 1000, 'gpt-4o');
      
      expect(result.savedTokens).toBe(0);
      expect(result.savingsPercent).toBe(0);
      expect(result.costs.savings.per1M).toBe(0);
    });

    it('should handle very small token counts', () => {
      const result = calculateROI(10, 5, 'gpt-4o');
      
      expect(result.savingsPercent).toBe(50);
      expect(result.costs.json.per1M).toBeGreaterThan(0);
    });

    it('should handle very large token counts', () => {
      const result = calculateROI(1_000_000, 400_000, 'gpt-4o');
      
      expect(result.savedTokens).toBe(600_000);
      expect(result.savingsPercent).toBe(60);
    });
  });
});
