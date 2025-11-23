/**
 * Watch Mode for TONL CLI
 * Automatically converts files on change
 */

import chokidar from 'chokidar';
import { readFileSync } from 'fs';
import { jsonToTonl } from '../core/json-to-tonl.js';
import { yamlToTonl } from '../core/yaml-to-tonl.js';
import { writeFileSync } from 'fs';

export interface WatchOptions {
  pattern: string | string[];
  collectionName?: string;
  outputDir?: string;
}

export function startWatch(options: WatchOptions): void {
  console.log(`👀 Watching for changes: ${options.pattern}\n`);

  const watcher = chokidar.watch(options.pattern, {
    persistent: true,
    ignoreInitial: false,
  });

  watcher
    .on('add', (path) => {
      console.log(`📄 New file detected: ${path}`);
      convertFile(path, options);
    })
    .on('change', (path) => {
      console.log(`🔄 File changed: ${path}`);
      convertFile(path, options);
    })
    .on('error', (error) => {
      console.error(`❌ Watcher error: ${error}`);
    });

  console.log('Press Ctrl+C to stop watching...\n');
}

function convertFile(filepath: string, options: WatchOptions): void {
  try {
    const content = readFileSync(filepath, 'utf-8');
    const isJson = filepath.endsWith('.json');
    const isYaml = filepath.endsWith('.yaml') || filepath.endsWith('.yml');

    if (!isJson && !isYaml) {
      console.log(`⚠️  Skipping ${filepath} (not JSON/YAML)`);
      return;
    }

    const collectionName = options.collectionName || 'data';
    let tonl: string;

    if (isJson) {
      const data = JSON.parse(content);
      if (!Array.isArray(data)) {
        console.log(`⚠️  Skipping ${filepath} (not an array)`);
        return;
      }
      tonl = jsonToTonl(data, collectionName);
    } else {
      tonl = yamlToTonl(content, collectionName);
    }

    // Determine output path
    const outputPath = options.outputDir
      ? `${options.outputDir}/${filepath.replace(/\.(json|ya?ml)$/, '.tonl')}`
      : filepath.replace(/\.(json|ya?ml)$/, '.tonl');

    writeFileSync(outputPath, tonl, 'utf-8');
    console.log(`✅ Converted: ${filepath} → ${outputPath}\n`);
  } catch (error) {
    console.error(
      `❌ Error converting ${filepath}:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}
