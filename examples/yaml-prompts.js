/**
 * YAML Prompts Example
 * Shows YAML → TONL for prompt libraries
 */

import { yamlToTonl, tonlToYaml, calculateRealSavings } from 'tonl-mcp-bridge';

// Prompt library in YAML
const promptsYaml = `
- role: storyteller
  context: fantasy_world
  tone: dramatic
  setting: dark_forest
  goal: create_mystery

- role: companion
  context: modern_city
  tone: casual
  setting: coffee_shop
  goal: provide_advice

- role: teacher
  context: classroom
  tone: encouraging
  setting: university
  goal: explain_concept

- role: detective
  context: crime_scene
  tone: analytical
  setting: abandoned_warehouse
  goal: solve_mystery
`.trim();

console.log('📝 Original YAML Prompts:\n');
console.log(promptsYaml);
console.log(`\n💾 Size: ${promptsYaml.length} chars\n`);

// Convert to TONL
const tonl = yamlToTonl(promptsYaml, 'prompts');

console.log('🔄 TONL Format:\n');
console.log(tonl);
console.log(`💾 Size: ${tonl.length} chars\n`);

// Token savings
const savings = calculateRealSavings(promptsYaml, tonl, 'gpt-4');

console.log('📊 Token Statistics (GPT-4):');
console.log(`   YAML: ${savings.originalTokens} tokens`);
console.log(`   TONL: ${savings.compressedTokens} tokens`);
console.log(`   Saved: ${savings.savedTokens} tokens (${savings.savingsPercent}%)\n`);

// Convert back to verify
const reconstructed = tonlToYaml(tonl);

console.log('✅ Round-trip successful!');
console.log('🔍 Data preserved:', promptsYaml === reconstructed);
