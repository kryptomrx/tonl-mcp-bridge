/**
 * Batch Processing for TONL CLI
 * Convert multiple files at once
 */

import { glob } from 'glob';
import { readFileSync, writeFileSync } from 'fs';
import { jsonToTonl } from '../core/json-to-tonl.js';
import { yamlToTonl } from '../core/yaml-to-tonl.js';

export interface BatchOptions {
  pattern: string;
  collectionName?: string;
  outputDir?: string;
  stats?: boolean;
}

export async function batchConvert(options: BatchOptions): Promise<void> {
  console.log(`🔍 Finding files matching: ${options.pattern}\n`);

  const files = await glob(options.pattern, {
    ignore: ['node_modules/**', 'dist/**', '*.tonl'],
  });

  if (files.length === 0) {
    console.log('❌ No files found matching pattern');
    return;
  }

  console.log(`📦 Found ${files.length} file(s)\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const filepath of files) {
    try {
      const content = readFileSync(filepath, 'utf-8');
      const isJson = filepath.endsWith('.json');
      const isYaml = filepath.endsWith('.yaml') || filepath.endsWith('.yml');

      if (!isJson && !isYaml) {
        console.log(`⚠️  Skipping ${filepath} (not JSON/YAML)`);
        continue;
      }

      const collectionName = options.collectionName || 'data';
      let tonl: string;

      if (isJson) {
        const data = JSON.parse(content);
        if (!Array.isArray(data)) {
          console.log(`⚠️  Skipping ${filepath} (not an array)`);
          continue;
        }
        tonl = jsonToTonl(data, collectionName);
      } else {
        tonl = yamlToTonl(content, collectionName);
      }

      // Determine output path
      const outputPath = options.outputDir
        ? `${options.outputDir}/${filepath.split('/').pop()?.replace(/\.(json|ya?ml)$/, '.tonl')}`
        : filepath.replace(/\.(json|ya?ml)$/, '.tonl');

      writeFileSync(outputPath, tonl, 'utf-8');
      
      if (options.stats) {
        const savings = Math.round((1 - tonl.length / content.length) * 100);
        console.log(`✅ ${filepath} → ${outputPath} (${savings}% savings)`);
      } else {
        console.log(`✅ ${filepath} → ${outputPath}`);
      }

      successCount++;
    } catch (error) {
      console.error(`❌ ${filepath}:`, error instanceof Error ? error.message : String(error));
      errorCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed`);
}