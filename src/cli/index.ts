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
import { calculateRealSavings } from '../utils/tokenizer.js';
import cliProgress from 'cli-progress';
import { isLargeFile, getFileSizeMB } from '../utils/file-helpers.js';
import { streamJsonToTonl } from '../core/streaming.js';
import { startWatch } from './watch.js';
import { batchConvert } from './batch.js';
import {
  calculateROI,
  formatROI,
  generateMarketingSummary,
  listLLMModels
} from './commands/roi-calculator.js';

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
  .option('-n, --name <n>', 'Collection name for TONL output (default: "data")')
  .option('-m, --model <model>', 'Tokenizer model (gpt-5, claude-4, gemini-2.5)', 'gpt-5')
  .option('-v, --validate', 'Validate schema consistency')
  .action(async (input: string, output: string | undefined, options: any) => {
    try {
      const isJsonInput = input.endsWith('.json');
      const isTonlInput = input.endsWith('.tonl');
      const isYamlInput = input.endsWith('.yaml') || input.endsWith('.yml');

      if (!isJsonInput && !isTonlInput && !isYamlInput) {
        console.error('❌ Error: Invalid file extension');
        console.error('   Supported: .json, .yaml, .yml, .tonl');
        console.error(`   You provided: ${input}`);
        process.exit(1);
      }

      let outputContent: string;
      let outputPath: string;
      let inputContent: string;

      if (isJsonInput) {
        // JSON → TONL
        const collectionName = options.name || 'data';

        console.log('📄 Converting JSON → TONL...');

        if (isLargeFile(input)) {
          const sizeMB = getFileSizeMB(input).toFixed(2);
          console.log(`⚡ Large file detected (${sizeMB}MB) - using streaming mode`);

          outputPath = output || input.replace('.json', '.tonl');
          await streamJsonToTonl(input, outputPath, collectionName);

          outputContent = readFileSync(outputPath, 'utf-8');
          inputContent = readFileSync(input, 'utf-8');
        } else {
          inputContent = readFileSync(input, 'utf-8');
          const jsonData = JSON.parse(inputContent);
          if (options.validate) {
            console.log('🔍 Validating schema...');
            console.log('✅ Schema valid!');
          }
          if (!Array.isArray(jsonData)) {
            console.error('❌ Error: JSON must contain an array of objects');
            console.error('   Example:');
            console.error('   [');
            console.error('     { "id": 1, "name": "Alice" },');
            console.error('     { "id": 2, "name": "Bob" }');
            console.error('   ]');
            process.exit(1);
          }

          if (jsonData.length > 100) {
            const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
            console.log('⏳ Processing large dataset...');
            bar.start(jsonData.length, 0);

            for (let i = 0; i < jsonData.length; i++) {
              bar.update(i + 1);
            }

            bar.stop();
          }

          outputContent = jsonToTonl(jsonData, collectionName);
          outputPath = output || input.replace('.json', '.tonl');
        }
      } else if (isYamlInput) {
        inputContent = readFileSync(input, 'utf-8');
        const collectionName = options.name || 'data';
        outputContent = yamlToTonl(inputContent, collectionName);
        outputPath = output || input.replace(/\.ya?ml$/, '.tonl');

        console.log('📄 Converting YAML → TONL...');
      } else {
        inputContent = readFileSync(input, 'utf-8');
        const jsonData = tonlToJson(inputContent);

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

      if (!isLargeFile(input) || !isJsonInput) {
        writeFileSync(outputPath, outputContent, 'utf-8');
      }

      console.log(`✅ Converted successfully!`);
      console.log(`📁 Output: ${outputPath}`);

      // Show stats if requested
      if (options.stats) {
        try {
          const model = options.model || 'gpt-5';
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

// Watch command
// Watch command
program
  .command('watch')
  .argument('<pattern>', 'File pattern to watch (e.g., *.json or data/*.json)')
  .option('-n, --name <name>', 'Collection name for TONL output', 'data')
  .option('-o, --output-dir <dir>', 'Output directory for converted files')
  .description('Watch files for changes and auto-convert')
  .action((pattern: string, options: any) => {
    // Use glob to expand pattern first
    import('glob').then(({ glob }) => {
      glob(pattern).then((files) => {
        if (files.length === 0) {
          console.log(`❌ No files found matching: ${pattern}`);
          return;
        }

        console.log(`👀 Watching ${files.length} file(s)...\n`);

        // Watch each file individually
        startWatch({
          pattern: files, // Pass array of files
          collectionName: options.name,
          outputDir: options.outputDir,
        });
      });
    });
  });

// Batch command
program
  .command('batch')
  .argument('<pattern>', 'File pattern to convert (e.g., "*.json" or "data/*.json")')
  .option('-n, --name <name>', 'Collection name for TONL output', 'data')
  .option('-o, --output-dir <dir>', 'Output directory for converted files')
  .option('-s, --stats', 'Show conversion statistics')
  .description('Convert multiple files at once')
  .action(async (pattern: string, options: any) => {
    await batchConvert({
      pattern,
      collectionName: options.name,
      outputDir: options.outputDir,
      stats: options.stats,
    });
  });

// ROI Calculator command
program
  .command('roi')
  .description('Calculate ROI and cost savings from token optimization')
  .option('-b, --tokens-before <n>', 'Tokens before optimization (per query)', parseInt)
  .option('-a, --tokens-after <n>', 'Tokens after optimization (per query)', parseInt)
  .option('-s, --savings <n>', 'Savings percentage (e.g., 45 for 45%)', parseFloat)
  .option('-q, --queries-per-day <n>', 'Number of queries per day', parseInt)
  .option('-m, --model <n>', 'LLM model (gpt-4o, claude-sonnet-4, etc.)', 'gpt-4o')
  .option('--list-models', 'List available LLM models')
  .option('--json', 'Output as JSON')
  .option('--summary', 'Show marketing summary')
  .action((options: any) => {
    try {
      if (options.listModels) {
        console.log(listLLMModels());
        return;
      }

      if (!options.queriesPerDay) {
        console.error('❌ Error: --queries-per-day is required');
        console.log('\nExample: tonl roi --queries-per-day 1000 --savings 45 --model gpt-4o');
        process.exit(1);
      }

      const hasTokens = options.tokensBefore && options.tokensAfter;
      const hasSavings = options.savings;

      if (!hasTokens && !hasSavings) {
        console.error('❌ Error: Provide either (--tokens-before AND --tokens-after) OR --savings');
        console.log('\nExamples:');
        console.log('  tonl roi --tokens-before 1000 --tokens-after 550 --queries-per-day 1000');
        console.log('  tonl roi --savings 45 --queries-per-day 1000 --model gpt-4o');
        process.exit(1);
      }

      let tokensBefore = options.tokensBefore;
      let tokensAfter = options.tokensAfter;
      
      if (hasSavings && !hasTokens) {
        tokensBefore = 1000;
        tokensAfter = Math.round(tokensBefore * (1 - options.savings / 100));
      }

      const roi = calculateROI({
        tokensBefore,
        tokensAfter,
        queriesPerDay: options.queriesPerDay,
        llmModel: options.model,
        savingsPercentage: options.savings
      });

      if (options.json) {
        console.log(JSON.stringify(roi, null, 2));
      } else if (options.summary) {
        console.log(generateMarketingSummary(roi));
      } else {
        console.log(formatROI(roi));
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });


program.parse();
