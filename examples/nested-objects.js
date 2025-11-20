/**
 * Nested Objects Example
 * Shows the power of TONL with complex data structures
 */

import { jsonToTonl, tonlToJson } from '../dist/index.js';

console.log('🔥 TONL Nested Objects Demo\n');

// Complex nested data
const users = [
  {
    id: 1,
    name: 'Alice',
    profile: {
      email: 'alice@example.com',
      age: 25,
      verified: true
    },
    tags: ['developer', 'typescript', 'react'],
    settings: {
      theme: 'dark',
      notifications: true
    }
  },
  {
    id: 2,
    name: 'Bob',
    profile: {
      email: 'bob@example.com',
      age: 30,
      verified: false
    },
    tags: ['designer', 'figma'],
    settings: {
      theme: 'light',
      notifications: false
    }
  }
];

console.log('📊 Original JSON:');
console.log(JSON.stringify(users, null, 2));
console.log(`\n💾 Size: ${JSON.stringify(users).length} chars\n`);

// Convert to TONL (nested)
const tonlNested = jsonToTonl(users, 'users');

console.log('🎯 TONL (Nested):');
console.log(tonlNested);
console.log(`💾 Size: ${tonlNested.length} chars`);
console.log(`✨ Savings: ${Math.round((1 - tonlNested.length / JSON.stringify(users).length) * 100)}%\n`);

// Convert to TONL (flattened)
const tonlFlat = jsonToTonl(users, 'users', { flattenNested: true });

console.log('📏 TONL (Flattened):');
console.log(tonlFlat);
console.log(`💾 Size: ${tonlFlat.length} chars`);
console.log(`✨ Savings: ${Math.round((1 - tonlFlat.length / JSON.stringify(users).length) * 100)}%\n`);

// Round-trip
const reconstructed = tonlToJson(tonlNested);
console.log('✅ Round-trip successful!');
console.log('🔍 Data preserved:', JSON.stringify(users) === JSON.stringify(reconstructed));
console.log('\n✅ Round-trip Verification:');
console.log('Data preserved:', JSON.stringify(users) === JSON.stringify(reconstructed));
console.log('Structure:', reconstructed.length, 'users with', Object.keys(reconstructed[0]).length, 'fields each');
