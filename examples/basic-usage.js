/**
 * Basic TONL Usage Example
 * Shows simple JSON → TONL → JSON conversion
 */

import { jsonToTonl, tonlToJson } from 'tonl-mcp-bridge';

// Sample data
const users = [
  { id: 1, name: "Alice", age: 25, active: true },
  { id: 2, name: "Bob", age: 30, active: false },
  { id: 3, name: "Charlie", age: 35, active: true }
];

console.log('📊 Original JSON:');
console.log(JSON.stringify(users, null, 2));
console.log(`\n💾 Size: ${JSON.stringify(users).length} chars\n`);

// Convert to TONL
const tonl = jsonToTonl(users, 'users');

console.log('🔄 TONL Format:');
console.log(tonl);
console.log(`💾 Size: ${tonl.length} chars`);
console.log(`✨ Savings: ${Math.round((1 - tonl.length / JSON.stringify(users).length) * 100)}%\n`);

// Convert back to JSON
const reconstructed = tonlToJson(tonl);

console.log('✅ Reconstructed JSON:');
console.log(JSON.stringify(reconstructed, null, 2));

// Verify lossless conversion
console.log('\n🔍 Lossless?', JSON.stringify(users) === JSON.stringify(reconstructed));