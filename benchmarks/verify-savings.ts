#!/usr/bin/env tsx
/**
 * Benchmark Verification Script
 * 
 * Verifies token savings claims by:
 * 1. Counting tokens in original JSON (using GPT-4o tokenizer)
 * 2. Converting to TONL
 * 3. Counting tokens in TONL
 * 4. Verifying lossless conversion (TONL → JSON → Deep Equal)
 * 5. Calculating savings percentage
 * 
 * Usage:
 *   tsx benchmarks/verify-savings.ts
 *   tsx benchmarks/verify-savings.ts --file datasets/users-100.json
 *   tsx benchmarks/verify-savings.ts --csv results.csv
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Command } from 'commander';
import { Tiktoken, encodingForModel } from 'js-tiktoken';
import { jsonToTonl, tonlToJson } from '../src/index.js';
import { platform, cpus, totalmem, release } from 'os';

// ============================================================================
// SYSTEM INFO
// ============================================================================

function getSystemInfo(): string {
  const cpu = cpus()[0].model;
  const ramGB = (totalmem() / (1024 ** 3)).toFixed(0);
  const nodeVersion = process.version;
  const osInfo = `${platform()} ${release()}`;
  
  // Simplify CPU name for readability
  const cpuSimplified = cpu
    .replace(/\(R\)/g, '')
    .replace(/\(TM\)/g, '')
    .replace(/CPU/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return `${cpuSimplified} | ${ramGB}GB RAM | Node ${nodeVersion}`;
}

// ============================================================================
// TOKEN COUNTING
// ============================================================================

let tokenizer: Tiktoken | null = null;

function initTokenizer() {
  if (!tokenizer) {
    // Use cl100k_base encoding (GPT-4o tokenizer)
    tokenizer = encodingForModel('gpt-4o');
  }
  return tokenizer;
}

function countTokens(text: string): number {
  const enc = initTokenizer();
  return enc.encode(text).length;
}

// ============================================================================
// LOSSLESS VERIFICATION
// ============================================================================

function deepEqual(obj1: any, obj2: any): boolean {
  // Handle null/undefined
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;
  
  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((val, idx) => deepEqual(val, obj2[idx]));
  }
  
  // Handle objects
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();
    
    if (keys1.length !== keys2.length) return false;
    if (!keys1.every((key, idx) => key === keys2[idx])) return false;
    
    return keys1.every(key => deepEqual(obj1[key], obj2[key]));
  }
  
  // Primitives
  return obj1 === obj2;
}

function verifyLossless(originalData: any, collectionName: string): boolean {
  try {
    // Convert to TONL
    const tonl = jsonToTonl(originalData, collectionName);
    
    // Convert back to JSON
    const reconstructed = tonlToJson(tonl);
    
    // Deep equality check
    return deepEqual(originalData, reconstructed);
  } catch (error) {
    console.error(`Lossless verification failed: ${error}`);
    return false;
  }
}

// ============================================================================
// DATASET PROCESSING
// ============================================================================

interface BenchmarkResult {
  filename: string;
  jsonTokens: number;
  tonlTokens: number;
  savedTokens: number;
  savingsPercent: number;
  lossless: boolean;
}

function processDataset(filepath: string): BenchmarkResult | null {
  try {
    const filename = filepath.split('/').pop() || filepath;
    const content = readFileSync(filepath, 'utf-8');
    
    // Parse JSON (handle both JSON and NDJSON)
    let data: any;
    if (filename.endsWith('.ndjson')) {
      data = content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    } else {
      data = JSON.parse(content);
    }
    
    // Count JSON tokens
    const jsonStr = JSON.stringify(data);
    const jsonTokens = countTokens(jsonStr);
    
    // Convert to TONL
    const collectionName = filename.replace(/\.(json|ndjson)$/, '').replace(/-\d+$/, '');
    const tonl = jsonToTonl(data, collectionName);
    const tonlTokens = countTokens(tonl);
    
    // Calculate savings
    const savedTokens = jsonTokens - tonlTokens;
    const savingsPercent = ((savedTokens / jsonTokens) * 100);
    
    // Verify lossless
    const lossless = verifyLossless(data, collectionName);
    
    return {
      filename,
      jsonTokens,
      tonlTokens,
      savedTokens,
      savingsPercent,
      lossless
    };
  } catch (error) {
    console.error(`❌ Error processing ${filepath}:`, error);
    return null;
  }
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function formatPercent(num: number): string {
  return `${num.toFixed(1)}%`;
}

function printTable(results: BenchmarkResult[]) {
  console.log('\n📊 BENCHMARK RESULTS\n');
  console.log('═'.repeat(100));
  
  // Table header
  const header = [
    'Dataset'.padEnd(25),
    'JSON Tokens'.padStart(12),
    'TONL Tokens'.padStart(12),
    'Saved'.padStart(12),
    'Reduction'.padStart(10),
    'Lossless?'.padStart(10)
  ].join(' │ ');
  
  console.log(header);
  console.log('─'.repeat(100));
  
  // Table rows
  results.forEach(result => {
    const row = [
      result.filename.padEnd(25),
      formatNumber(result.jsonTokens).padStart(12),
      formatNumber(result.tonlTokens).padStart(12),
      formatNumber(result.savedTokens).padStart(12),
      formatPercent(result.savingsPercent).padStart(10),
      (result.lossless ? '✅' : '❌').padStart(10)
    ].join(' │ ');
    
    console.log(row);
  });
  
  console.log('═'.repeat(100));
  
  // Summary statistics
  const totalJsonTokens = results.reduce((sum, r) => sum + r.jsonTokens, 0);
  const totalTonlTokens = results.reduce((sum, r) => sum + r.tonlTokens, 0);
  const totalSaved = totalJsonTokens - totalTonlTokens;
  const avgSavings = (totalSaved / totalJsonTokens) * 100;
  const allLossless = results.every(r => r.lossless);
  
  console.log('\n📈 SUMMARY');
  console.log(`   Total JSON Tokens:  ${formatNumber(totalJsonTokens)}`);
  console.log(`   Total TONL Tokens:  ${formatNumber(totalTonlTokens)}`);
  console.log(`   Total Saved:        ${formatNumber(totalSaved)} tokens`);
  console.log(`   Average Reduction:  ${formatPercent(avgSavings)}`);
  console.log(`   All Lossless:       ${allLossless ? '✅ Yes' : '❌ No'}\n`);
}

function exportCSV(results: BenchmarkResult[], outputPath: string) {
  const headers = 'Filename,JSON Tokens,TONL Tokens,Saved Tokens,Savings %,Lossless\n';
  const rows = results.map(r => 
    `${r.filename},${r.jsonTokens},${r.tonlTokens},${r.savedTokens},${r.savingsPercent.toFixed(1)},${r.lossless}`
  ).join('\n');
  
  const csv = headers + rows;
  writeFileSync(outputPath, csv);
  console.log(`\n💾 CSV exported to: ${outputPath}\n`);
}

// ============================================================================
// MAIN LOGIC
// ============================================================================

function verifyAll() {
  const datasetsDir = join(process.cwd(), 'benchmarks', 'datasets');
  
  console.log('\n🔍 TONL Token Savings Verification\n');
  console.log('═'.repeat(100));
  console.log(`\n💻 System: ${getSystemInfo()}`);
  console.log(`📂 Datasets: ${datasetsDir}\n`);
  
  // Find all JSON/NDJSON files
  const files = readdirSync(datasetsDir)
    .filter(f => f.endsWith('.json') || f.endsWith('.ndjson'))
    .sort();
  
  if (files.length === 0) {
    console.error('❌ No datasets found!');
    console.log('\n💡 Run this first:');
    console.log('   npm run benchmark:generate -- --all\n');
    process.exit(1);
  }
  
  console.log(`📋 Found ${files.length} dataset(s)\n`);
  
  // Process all datasets
  const results: BenchmarkResult[] = [];
  files.forEach(filename => {
    const filepath = join(datasetsDir, filename);
    console.log(`   Processing: ${filename}...`);
    const result = processDataset(filepath);
    if (result) results.push(result);
  });
  
  // Print results table
  printTable(results);
  
  return results;
}

function verifySingle(filepath: string) {
  console.log('\n🔍 TONL Token Savings Verification\n');
  console.log('═'.repeat(100));
  console.log(`\n💻 System: ${getSystemInfo()}`);
  console.log(`📂 File: ${filepath}\n`);
  
  const result = processDataset(filepath);
  if (result) {
    printTable([result]);
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

const program = new Command();

program
  .name('verify-savings')
  .description('Verify TONL token savings with lossless conversion check')
  .version('1.0.0');

program
  .option('-f, --file <path>', 'Verify single file')
  .option('--csv <output>', 'Export results to CSV')
  .action((options) => {
    let results: BenchmarkResult[];
    
    if (options.file) {
      verifySingle(options.file);
    } else {
      results = verifyAll();
      
      if (options.csv) {
        exportCSV(results, options.csv);
      }
    }
    
    // Force exit after completion
    process.exit(0);
  });

program.parse();
