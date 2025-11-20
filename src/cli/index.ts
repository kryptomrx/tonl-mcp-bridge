#!/usr/bin/env node

/**
 * TONL CLI Tool
 * Convert between JSON, YAML, and TONL formats
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { jsonToTonl } from '../core/json-to-tonl.js';
import { tonlToJson } from '../core/tonl-to-json.js';
import { estimateTokens, calculateSavings } from '../utils/token-counter.js';
import { yamlToTonl } from '../core/yaml-to-tonl.js';
import { tonlToYaml } from '../core/tonl-to-yaml.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

const program = new Command();

program
  .name('tonl')
  .description('Convert between JSON, YAML, and TONL formats for token optimization')
  .version(packageJson.version);

program
  .command('convert')
  .argument('<input>', 'Input file path')
  .argument('[output]', 'Output file path (optional, auto-generated if not provided)')
  .option('-s, --stats', 'Show token savings statistics')
  .option('-n, --name <name>', 'Collection name for TONL output (default: "data")')
  .action(async (input: string, output: string | undefined, options: any) => {
    try {
      // Read input file
      const inputContent = readFileSync(input, 'utf-8');

      // Detect format based on file extension
      const isJsonInput = input.endsWith('.json');
      const isTonlInput = input.endsWith('.tonl');
      const isYamlInput = input.endsWith('.yaml') || input.endsWith('.yml');

      if (!isJsonInput && !isTonlInput && !isYamlInput) {
        console.error('❌ Error: Input file must be .json, .yaml, .yml, or .tonl');
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
      } else if (isYamlInput) {
        // YAML → TONL
        const collectionName = options.name || 'data';
        outputContent = yamlToTonl(inputContent, collectionName);
        outputPath = output || input.replace(/\.ya?ml$/, '.tonl');

        console.log('📄 Converting YAML → TONL...');
      } else {
        // TONL → JSON or YAML
        const jsonData = tonlToJson(inputContent);

        // Determine output format from output filename
        const wantsYaml = output && (output.endsWith('.yaml') || output.endsWith('.yml'));

        if (wantsYaml) {
          outputContent = tonlToYaml(inputContent);
          outputPath = output;
          console.log('📄 Converting TONL → YAML...');
        } else {
          outputContent = JSON.stringify(jsonData, null, 2) + '\n';
          outputPath = output || input.replace('.tonl', '.json');
          console.log('📄 Converting TONL → JSON...');
        }
      }

      // Write output file
      writeFileSync(outputPath, outputContent, 'utf-8');
      console.log(`✅ Converted successfully!`);
      console.log(`📁 Output: ${outputPath}`);

      // Show stats if requested
      if (options.stats) {
        try {
          // Default model (can be changed with --model flag later)
          const model = 'gpt-5';
          const savings = calculateRealSavings(inputContent, outputContent, model);

          // Display model name in output
          const displayModel = model.toUpperCase().replace(/-/g, ' ');
          console.log(`\n📊 Token Statistics (${displayModel} Tokenizer):`);

          console.log(`   Input:  ${savings.originalTokens} tokens`);
          console.log(`   Output: ${savings.compressedTokens} tokens`);
          console.log(`   Saved:  ${savings.savedTokens} tokens (${savings.savingsPercent}%)`);

          // Add note about tokenizer approximation
          if (!model.startsWith('gpt')) {
            console.log(`   Note: Using GPT-5 tokenizer as approximation for ${displayModel}`);
          }
        } catch {
          console.log('⚠️  Tokenizer unavailable, using estimation');

          // Fallback to naive estimation
          const inputTokens = estimateTokens(inputContent);
          const outputTokens = estimateTokens(outputContent);

          console.log('\n📊 Token Statistics (Estimated):');
          console.log(`   Input:  ${inputTokens} tokens`);
          console.log(`   Output: ${outputTokens} tokens`);

          if (isJsonInput || isYamlInput) {
            const savings = calculateSavings(inputContent, outputContent);
            console.log(`   Saved:  ${savings.savedTokens} tokens (${savings.savingsPercent}%)`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
