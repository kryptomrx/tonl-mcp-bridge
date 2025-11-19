/**
 * Real Tokenizer Example
 * Shows actual GPT-4 token counting
 */

import { jsonToTonl, calculateRealSavings } from 'tonl-mcp-bridge';

// Larger dataset
const products = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  price: 19.99 + i,
  stock: 100 - i,
  active: i % 2 === 0
}));

console.log('📦 Dataset: 50 products\n');

// Original JSON
const jsonStr = JSON.stringify(products);
console.log('📄 JSON:');
console.log(`   Size: ${jsonStr.length} chars`);

// Convert to TONL
const tonlStr = jsonToTonl(products, 'products');
console.log('\n🔄 TONL:');
console.log(`   Size: ${tonlStr.length} chars`);

// Calculate with REAL GPT-4 tokenizer
console.log('\n🤖 Real GPT-4 Token Counts:\n');

const savings = calculateRealSavings(jsonStr, tonlStr, 'gpt-4');

console.log(`   JSON:  ${savings.originalTokens} tokens`);
console.log(`   TONL:  ${savings.compressedTokens} tokens`);
console.log(`   Saved: ${savings.savedTokens} tokens (${savings.savingsPercent}%)`);

// Cost calculation
const costPer1k = 0.03; // GPT-4 input pricing
const moneySaved = (savings.savedTokens / 1000) * costPer1k;

console.log(`\n💰 Cost Impact (at $${costPer1k}/1K tokens):`);
console.log(`   JSON:  $${(savings.originalTokens / 1000 * costPer1k).toFixed(4)}`);
console.log(`   TONL:  $${(savings.compressedTokens / 1000 * costPer1k).toFixed(4)}`);
console.log(`   Saved: $${moneySaved.toFixed(4)} per request`);
console.log(`   \n   At 1M requests/month: $${(moneySaved * 1000000).toFixed(2)} saved! 🔥`);