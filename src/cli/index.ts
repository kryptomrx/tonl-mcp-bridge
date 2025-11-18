#!/usr/bin/env node

/**
 * TONL CLI Tool
 * Convert between JSON and TONL formats
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { jsonToTonl } from '../core/json-to-tonl';
import { tonlToJson } from '../core/tonl-to-json';
import { estimateTokens, calculateSavings } from '../utils/token-counter';

const program = new Command();

program
  .name('tonl')
  .description('Convert between JSON and TONL formats for token optimization')
  .version('0.1.0');

program
  .command('convert')
  .description('Convert file between JSON and TONL formats')
  .argument('<input>', 'Input file path')
  .argument('[output]', 'Output file path (optional, auto-generated if not provided)')
  .option('-s, --stats', 'Show token savings statistics')
  .option('-n, --name <name>', 'Collection name for TONL output (default: "data")')
  .action((input: string, output: string | undefined, options: { stats?: boolean; name?: string }) => {
    try {
      // Read input file
      const inputContent = readFileSync(input, 'utf-8');
      
      // Detect format based on file extension
      const isJsonInput = input.endsWith('.json');
      const isTonlInput = input.endsWith('.tonl');
      
      if (!isJsonInput && !isTonlInput) {
        console.error('❌ Error: Input file must be .json or .tonl');
        process.exit(1);
      }
      
      let outputContent: string;
      let outputPath: string;
      
      if (isJsonInput) {
        // JSON → TONL
        const jsonData = JSON.parse(inputContent);
        
        if (!Array.isArray(jsonData)) {
          console.error('❌ Error: JSON must be an array of objects');
          process.exit(1);
        }
        
        const collectionName = options.name || 'data';
        outputContent = jsonToTonl(jsonData, collectionName);
        outputPath = output || input.replace('.json', '.tonl');
        
        console.log('📄 Converting JSON → TONL...');
      } else {
        // TONL → JSON
        const jsonData = tonlToJson(inputContent);
        outputContent = JSON.stringify(jsonData, null, 2) + '\n';
        outputPath = output || input.replace('.tonl', '.json');
        
        console.log('📄 Converting TONL → JSON...');
      }
      
      // Write output file
      writeFileSync(outputPath, outputContent, 'utf-8');
      console.log(`✅ Converted successfully!`);
      console.log(`📁 Output: ${outputPath}`);
      
      // Show stats if requested
      if (options.stats) {
        const inputTokens = estimateTokens(inputContent);
        const outputTokens = estimateTokens(outputContent);
        
        console.log('\n📊 Token Statistics:');
        console.log(`   Input:  ${inputTokens} tokens`);
        console.log(`   Output: ${outputTokens} tokens`);
        
        if (isJsonInput) {
          const savings = calculateSavings(inputContent, outputContent);
          console.log(`   Saved:  ${savings.savedTokens} tokens (${savings.savingsPercent}%)`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();